-- Run this in the Supabase SQL editor.
--
-- Adds a human-friendly "REG-{year}-{sequence}" reference id to
-- organization_profiles for the revamped Registrations table (purely
-- additive — no existing column, enum, trigger, or RPC is touched).

alter table public.organization_profiles
  add column if not exists reference_id text;

create or replace function public.generate_organization_reference_id()
returns trigger
language plpgsql
as $$
declare
  _year text;
  _sequence int;
begin
  if new.reference_id is not null then
    return new;
  end if;

  _year := to_char(coalesce(new.created_at, now()), 'YYYY');

  select count(*) + 1
  into _sequence
  from public.organization_profiles
  where reference_id like 'REG-' || _year || '-%';

  new.reference_id := 'REG-' || _year || '-' || lpad(_sequence::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_generate_organization_reference_id on public.organization_profiles;
create trigger trg_generate_organization_reference_id
before insert on public.organization_profiles
for each row
execute function public.generate_organization_reference_id();

-- Backfill existing rows in created_at order so earlier registrations get
-- earlier sequence numbers within their year.
with ordered as (
  select
    id,
    'REG-' || to_char(created_at, 'YYYY') || '-' || lpad(
      (row_number() over (partition by to_char(created_at, 'YYYY') order by created_at))::text,
      4,
      '0'
    ) as computed_reference_id
  from public.organization_profiles
  where reference_id is null
)
update public.organization_profiles op
set reference_id = ordered.computed_reference_id
from ordered
where op.id = ordered.id;

create unique index if not exists uq_organization_profiles_reference_id
  on public.organization_profiles (reference_id)
  where reference_id is not null;
