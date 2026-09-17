-- Migration: Fix Organization Reference Counter Security Definer
-- File: 20260919010000_fix_organization_reference_counter_security_definer.sql
-- Purpose:
--   1. Ensure generate_organization_reference_id() is declared with SECURITY DEFINER
--      and a fixed search_path = public, pg_temp.
--   2. Allow newly authenticated Google and email organization users to trigger atomic
--      reference_id generation (REG-YYYY-NNNN) without violating RLS on the system-controlled
--      organization_reference_counters table.
--   3. Maintain RLS on organization_reference_counters so clients cannot directly insert/update
--      the counter table from REST APIs.
--   4. Preserve concurrency safety, row locking, and collision avoidance.

-- ==============================================================================
-- 1. ENSURE COUNTER TABLE EXISTS & HAS RLS ENABLED
-- ==============================================================================

create table if not exists public.organization_reference_counters (
  year text primary key,
  last_value integer not null default 0
);

alter table public.organization_reference_counters enable row level security;

comment on table public.organization_reference_counters is
  'Tracks the latest assigned sequence number for organization reference IDs per year to ensure atomic, concurrency-safe REG-YYYY-NNNN generation without gaps or collisions.';

-- ==============================================================================
-- 2. UPDATE REFERENCE ID GENERATOR WITH SECURITY DEFINER
-- ==============================================================================

create or replace function public.generate_organization_reference_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _year text;
  _sequence int;
  _candidate text;
begin
  -- If reference_id is already explicitly assigned, keep it
  if new.reference_id is not null and trim(new.reference_id) <> '' then
    return new;
  end if;

  _year := to_char(coalesce(new.created_at, now()), 'YYYY');

  -- Atomically increment and lock the year counter
  insert into public.organization_reference_counters (year, last_value)
  values (_year, (
    select coalesce(max(substring(reference_id from 'REG-[0-9]{4}-([0-9]+)')::int), 0) + 1
    from public.organization_profiles
    where reference_id like 'REG-' || _year || '-%'
  ))
  on conflict (year) do update
  set last_value = greatest(
    organization_reference_counters.last_value + 1,
    coalesce((
      select max(substring(reference_id from 'REG-[0-9]{4}-([0-9]+)')::int) + 1
      from public.organization_profiles
      where reference_id like 'REG-' || excluded.year || '-%'
    ), organization_reference_counters.last_value + 1)
  )
  returning last_value into _sequence;

  -- Collision avoidance loop against any manually inserted or anomalous existing IDs
  loop
    _candidate := 'REG-' || _year || '-' || lpad(_sequence::text, 4, '0');
    exit when not exists (
      select 1 from public.organization_profiles where reference_id = _candidate
    );
    _sequence := _sequence + 1;
    update public.organization_reference_counters
    set last_value = _sequence
    where year = _year;
  end loop;

  new.reference_id := _candidate;
  return new;
end;
$$;

-- Ensure trigger is active BEFORE INSERT on organization_profiles
drop trigger if exists trg_generate_organization_reference_id on public.organization_profiles;
create trigger trg_generate_organization_reference_id
before insert on public.organization_profiles
for each row
execute function public.generate_organization_reference_id();

-- Explicitly grant execute privilege on the generator function
grant execute on function public.generate_organization_reference_id() to authenticated, anon, service_role;
