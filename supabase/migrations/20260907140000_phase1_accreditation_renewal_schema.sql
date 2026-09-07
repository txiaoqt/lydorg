-- ==============================================================================
-- Migration: 20260907140000_phase1_accreditation_renewal_schema.sql
-- Description: Phase 1 of Y-TRACE Renewal & Accreditation Architecture
-- 
-- 1. Authoritative Accreditation Ledger (public.organization_accreditations)
-- 2. Accreditation Immutability & Status Transition Guard
-- 3. Renewal Application Lifecycle Table (public.organization_renewals)
-- 4. Single Non-Terminal Renewal Concurrency Guard
-- 5. Current-State Projection on public.organization_profiles
-- 6. Canonical Status Derivation Function (public.derive_accreditation_status)
-- 7. Projection Sync Trigger between Ledger and Profiles
-- 8. Row-Level Security (RLS) Foundation
-- 9. Safe Legacy Data Migration (Confirmed vs Inferred vs Unknown)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AUTHORITATIVE ACCREDITATION LEDGER
-- ------------------------------------------------------------------------------

create table if not exists public.organization_accreditations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization_profiles(id) on delete cascade,
  term_number integer not null check (term_number >= 1),
  start_date date not null,
  end_date date not null,
  certificate_urn text not null default '',
  status text not null default 'active' check (status in ('active', 'superseded', 'revoked')),
  is_legacy_inferred boolean not null default false,
  approved_by uuid references public.admin_accounts(id) on delete set null,
  approved_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  constraint chk_accreditation_dates check (end_date > start_date),
  constraint uq_organization_term_number unique (organization_id, term_number)
);

comment on table public.organization_accreditations is
  'Authoritative historical ledger of approved accreditation terms for organizations. One row represents exactly one approved term. Rows are append-only and historical terms are immutable.';

comment on column public.organization_accreditations.term_number is
  'Term sequence number (1 = initial registration accreditation, 2 = first renewal, 3 = second renewal, etc.).';

comment on column public.organization_accreditations.status is
  'Persisted accreditation ledger state. Limited strictly to active, superseded, or revoked. Time-dependent states (expiring_soon, expired) are derived dynamically from end_date.';

comment on column public.organization_accreditations.is_legacy_inferred is
  'Flag indicating whether this historical term was established from confirmed timestamp data (false) or inferred from legacy year-only data (true).';

-- At most ONE active accreditation term per organization at any time
create unique index if not exists idx_org_single_active_accreditation
  on public.organization_accreditations (organization_id)
  where status = 'active';

-- Performance and lookup indexes
create index if not exists idx_accreditations_org_dates
  on public.organization_accreditations (organization_id, start_date, end_date);

create index if not exists idx_accreditations_end_date
  on public.organization_accreditations (end_date);

create index if not exists idx_accreditations_status
  on public.organization_accreditations (status);

-- ------------------------------------------------------------------------------
-- 2. ACCREDITATION LEDGER IMMUTABILITY & TRANSITION GUARD
-- ------------------------------------------------------------------------------

create or replace function public.enforce_accreditation_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- Core historical term attributes must never be altered
    if old.term_number is distinct from new.term_number
       or old.start_date is distinct from new.start_date
       or old.end_date is distinct from new.end_date
       or old.certificate_urn is distinct from new.certificate_urn
       or old.approved_by is distinct from new.approved_by
       or old.approved_at is distinct from new.approved_at
       or old.created_at is distinct from new.created_at
       or old.is_legacy_inferred is distinct from new.is_legacy_inferred then
      raise exception 'Historical accreditation term fields are immutable.';
    end if;

    -- Valid status transitions only:
    -- active -> superseded (when subsequent renewal is approved)
    -- active -> revoked (by formal administrative action)
    if old.status = 'superseded' and new.status <> 'superseded' then
      raise exception 'A superseded accreditation term cannot be reactivated or altered.';
    end if;

    if old.status = 'revoked' and new.status <> 'revoked' then
      raise exception 'A revoked accreditation term cannot be reactivated.';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Accreditation terms in the authoritative ledger cannot be deleted.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accreditation_immutability on public.organization_accreditations;
create trigger trg_accreditation_immutability
before update or delete on public.organization_accreditations
for each row execute function public.enforce_accreditation_immutability();

-- ------------------------------------------------------------------------------
-- 3. RENEWAL APPLICATION LIFECYCLE TABLE
-- ------------------------------------------------------------------------------

create table if not exists public.organization_renewals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization_profiles(id) on delete cascade,
  cycle_number integer not null check (cycle_number >= 2),
  current_accreditation_id uuid not null references public.organization_accreditations(id) on delete restrict,
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted', 'approved', 'rejected')
  ),
  submitted_at timestamptz,
  reviewed_by uuid references public.admin_accounts(id) on delete set null,
  reviewed_at timestamptz,
  admin_remarks text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint uq_organization_renewal_cycle unique (organization_id, cycle_number)
);

comment on table public.organization_renewals is
  'Canonical lifecycle of accreditation renewal applications. Separate from legal accreditation validity.';

comment on column public.organization_renewals.cycle_number is
  'The target accreditation term number being applied for (e.g. Cycle 2 applies for Term 2).';

comment on column public.organization_renewals.current_accreditation_id is
  'References the active/prior accreditation term being renewed.';

-- At most ONE non-terminal renewal application per organization
create unique index if not exists idx_single_active_renewal_per_org
  on public.organization_renewals (organization_id)
  where status in ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted');

create index if not exists idx_renewals_org_status
  on public.organization_renewals (organization_id, status);

create index if not exists idx_renewals_current_accreditation
  on public.organization_renewals (current_accreditation_id);

-- ------------------------------------------------------------------------------
-- 4. CURRENT PROJECTION ON public.organization_profiles
-- ------------------------------------------------------------------------------

alter table public.organization_profiles
  add column if not exists current_accreditation_id uuid references public.organization_accreditations(id) on delete set null,
  add column if not exists accreditation_start_date date,
  add column if not exists accreditation_expires_at timestamptz;

comment on column public.organization_profiles.current_accreditation_id is
  'Current-state projection pointer referencing the active term in public.organization_accreditations. Projection cache only; not authoritative history.';

comment on column public.organization_profiles.accreditation_start_date is
  'Denormalized start date of the current accreditation term for high-performance querying. Authoritative source is organization_accreditations.';

comment on column public.organization_profiles.accreditation_expires_at is
  'Denormalized expiration timestamp of the current accreditation term. Authoritative source is organization_accreditations.';

-- ------------------------------------------------------------------------------
-- 5. CANONICAL STATUS DERIVATION SQL FUNCTION
-- ------------------------------------------------------------------------------

create or replace function public.derive_accreditation_status(
  _status text,
  _end_date date,
  _eval_date date default current_date
)
returns text
language sql
immutable
as $$
  select case
    when _status = 'revoked' then 'revoked'
    when _status = 'superseded' then 'superseded'
    when _eval_date > _end_date then 'expired'
    when (_end_date - _eval_date) <= 90 then 'expiring_soon'
    else 'active'
  end;
$$;

comment on function public.derive_accreditation_status is
  'Canonical accreditation status derivation formula. Consistent across User Portal, PWA, and Admin Portal.';

-- ------------------------------------------------------------------------------
-- 6. PROJECTION SYNC TRIGGER (Ledger -> Organization Profile Projection)
-- ------------------------------------------------------------------------------

create or replace function public.sync_organization_accreditation_projection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.status = 'active' then
      update public.organization_profiles
      set
        current_accreditation_id = new.id,
        accreditation_start_date = new.start_date,
        accreditation_expires_at = (new.end_date::text || 'T23:59:59+08:00')::timestamptz
      where id = new.organization_id;
    elsif (tg_op = 'UPDATE' and old.status = 'active' and new.status in ('superseded', 'revoked')) then
      -- If active was superseded or revoked, update projection to latest active or keep latest term
      update public.organization_profiles op
      set
        current_accreditation_id = new.id,
        accreditation_start_date = new.start_date,
        accreditation_expires_at = (new.end_date::text || 'T23:59:59+08:00')::timestamptz
      where op.id = new.organization_id
        and op.current_accreditation_id = old.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_organization_accreditation_projection on public.organization_accreditations;
create trigger trg_sync_organization_accreditation_projection
after insert or update on public.organization_accreditations
for each row execute function public.sync_organization_accreditation_projection();

-- ------------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY (RLS) FOUNDATION
-- ------------------------------------------------------------------------------

alter table public.organization_accreditations enable row level security;
alter table public.organization_renewals enable row level security;

-- Organization owners can SELECT their own organization's accreditation history
drop policy if exists "organization_accreditations_select_owner" on public.organization_accreditations;
create policy "organization_accreditations_select_owner"
on public.organization_accreditations
for select
using (
  exists (
    select 1 from public.organization_profiles op
    where op.id = organization_accreditations.organization_id
      and op.user_id = auth.uid()
  )
);

-- Public directory and verified previews can read active terms
drop policy if exists "organization_accreditations_select_public_active" on public.organization_accreditations;
create policy "organization_accreditations_select_public_active"
on public.organization_accreditations
for select
using (status = 'active');

-- Organization owners can SELECT their own renewal applications
drop policy if exists "organization_renewals_select_owner" on public.organization_renewals;
create policy "organization_renewals_select_owner"
on public.organization_renewals
for select
using (
  exists (
    select 1 from public.organization_profiles op
    where op.id = organization_renewals.organization_id
      and op.user_id = auth.uid()
  )
);

-- Organization owners can create their own renewal application draft
drop policy if exists "organization_renewals_insert_owner" on public.organization_renewals;
create policy "organization_renewals_insert_owner"
on public.organization_renewals
for insert
with check (
  status = 'draft'
  and exists (
    select 1 from public.organization_profiles op
    where op.id = organization_renewals.organization_id
      and op.user_id = auth.uid()
  )
);

-- Organization owners can update their own draft or needs_revision renewal application
drop policy if exists "organization_renewals_update_owner" on public.organization_renewals;
create policy "organization_renewals_update_owner"
on public.organization_renewals
for update
using (
  status in ('draft', 'needs_revision')
  and exists (
    select 1 from public.organization_profiles op
    where op.id = organization_renewals.organization_id
      and op.user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'submitted', 'resubmitted')
  and exists (
    select 1 from public.organization_profiles op
    where op.id = organization_renewals.organization_id
      and op.user_id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 8. SAFE LEGACY MIGRATION
-- ------------------------------------------------------------------------------

do $$
declare
  _org record;
  _new_accreditation_id uuid;
  _start_date date;
  _end_date date;
  _urn text;
  _is_inferred boolean;
begin
  -- Iterate through verified organizations
  for _org in
    select
      id,
      verified_at,
      yorp_registered_year,
      urn,
      organization_identifier_number,
      created_at
    from public.organization_profiles
    where profile_status = 'verified'
    order by created_at asc
  loop
    -- Check if this organization already has an accreditation record
    if not exists (
      select 1 from public.organization_accreditations
      where organization_id = _org.id and term_number = 1
    ) then
      _urn := coalesce(nullif(trim(_org.urn), ''), nullif(trim(_org.organization_identifier_number), ''), 'LEGACY-ACCREDITED');

      -- CASE 1: CONFIRMED HISTORICAL DATE (verified_at exists and is valid)
      if _org.verified_at is not null then
        _start_date := date(_org.verified_at);
        _end_date := (_start_date + interval '3 years')::date;
        _is_inferred := false;

        insert into public.organization_accreditations (
          organization_id,
          term_number,
          start_date,
          end_date,
          certificate_urn,
          status,
          is_legacy_inferred,
          approved_by,
          approved_at,
          created_at
        ) values (
          _org.id,
          1,
          _start_date,
          _end_date,
          _urn,
          'active',
          _is_inferred,
          null, -- Historical approving admin is null rather than fabricating a fictional admin
          _org.verified_at,
          coalesce(_org.created_at, _org.verified_at)
        )
        returning id into _new_accreditation_id;

      -- CASE 2: INFERRED FROM YEAR-ONLY LEGACY DATA (verified_at IS NULL, yorp_registered_year exists)
      elsif _org.yorp_registered_year is not null and _org.yorp_registered_year between 2000 and 2100 then
        _start_date := make_date(_org.yorp_registered_year, 1, 1);
        _end_date := make_date(_org.yorp_registered_year + 3, 1, 1);
        _is_inferred := true;

        insert into public.organization_accreditations (
          organization_id,
          term_number,
          start_date,
          end_date,
          certificate_urn,
          status,
          is_legacy_inferred,
          approved_by,
          approved_at,
          created_at
        ) values (
          _org.id,
          1,
          _start_date,
          _end_date,
          _urn,
          'active',
          _is_inferred,
          null,
          make_timestamptz(_org.yorp_registered_year, 1, 1, 0, 0, 0, 'Asia/Manila'),
          coalesce(_org.created_at, make_timestamptz(_org.yorp_registered_year, 1, 1, 0, 0, 0, 'Asia/Manila'))
        )
        returning id into _new_accreditation_id;

      -- CASE 3: UNKNOWN (Neither verified_at nor yorp_registered_year exists)
      else
        -- Strictly DO NOT fabricate accreditation terms when legal data is completely missing.
        _new_accreditation_id := null;
      end if;

      -- Synchronize denormalized current-state projection on organization_profiles
      if _new_accreditation_id is not null then
        update public.organization_profiles
        set
          current_accreditation_id = _new_accreditation_id,
          accreditation_start_date = _start_date,
          accreditation_expires_at = (_end_date::text || 'T23:59:59+08:00')::timestamptz
        where id = _org.id;
      end if;
    end if;
  end loop;
end;
$$;
