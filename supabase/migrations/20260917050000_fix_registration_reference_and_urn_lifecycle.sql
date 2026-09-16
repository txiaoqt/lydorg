-- Migration: Fix Registration Reference ID Concurrency and Official URN Lifecycle
-- File: 20260917050000_fix_registration_reference_and_urn_lifecycle.sql
-- Purpose:
--   1. Replace count(*)+1 in generate_organization_reference_id() with an atomic,
--      concurrency-safe yearly counter table with row locking and gap protection.
--   2. Ensure new organizations never receive a premature official URN at signup or onboarding.
--   3. Align official URN issuance with PCYDO admin verification (atomic issuance on approval).
--
-- Safety:
--   - Does NOT renumber or modify existing reference IDs.
--   - Does NOT regenerate existing verified URNs.
--   - Reversible and backward-compatible with existing schema.

-- ==============================================================================
-- 1. DEDICATED REFERENCE ID YEAR COUNTER TABLE (Concurrency & Gap Protection)
-- ==============================================================================

create table if not exists public.organization_reference_counters (
  year text primary key,
  last_value integer not null default 0
);

comment on table public.organization_reference_counters is
  'Tracks the latest assigned sequence number for organization reference IDs per year to ensure atomic, concurrency-safe REG-YYYY-NNNN generation without gaps or collisions.';

-- Seed existing years based on the current maximum numerical sequence in organization_profiles
insert into public.organization_reference_counters (year, last_value)
select
  to_char(coalesce(created_at, now()), 'YYYY') as yr,
  coalesce(max(substring(reference_id from 'REG-[0-9]{4}-([0-9]+)')::int), 0) as max_seq
from public.organization_profiles
where reference_id like 'REG-%'
group by to_char(coalesce(created_at, now()), 'YYYY')
on conflict (year) do update
set last_value = greatest(organization_reference_counters.last_value, excluded.last_value);

-- ==============================================================================
-- 2. ATOMIC, CONCURRENCY-SAFE REFERENCE ID GENERATOR
-- ==============================================================================

create or replace function public.generate_organization_reference_id()
returns trigger
language plpgsql
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

-- ==============================================================================
-- 3. PREVENT PREMATURE URN GENERATION ON NEW ORGANIZATION INSERT
-- ==============================================================================

create or replace function public.handle_organization_profile_urn_auto_gen()
returns trigger
language plpgsql
as $$
begin
  -- New organizations MUST NOT receive an official URN during onboarding or registration draft.
  -- They remain without an official URN until PCYDO verifies all required documents.
  if new.registration_type = 'new_organization' or new.is_existing_organization = false then
    if new.profile_status is distinct from 'verified'::public.profile_status then
      new.urn := null;
      new.urn_normalized := null;
      new.organization_identifier_number := '';
      return new;
    end if;
  end if;

  -- For existing organizations, ensure organization_identifier_number is populated from urn if provided
  if new.is_existing_organization = true and (new.organization_identifier_number is null or trim(new.organization_identifier_number) = '') then
    if new.urn is not null and trim(new.urn) <> '' then
      new.organization_identifier_number := trim(new.urn);
    end if;
  end if;

  return new;
end;
$$;

-- ==============================================================================
-- 4. AUTHORITATIVE OFFICIAL URN ISSUANCE UPON PCYDO ADMIN VERIFICATION
-- ==============================================================================

create or replace function public.update_admin_organization_profile_review(
  _session_token text,
  _organization_profile_id uuid,
  _profile_status public.profile_status,
  _verified_at timestamptz default null
)
returns table (
  id uuid,
  user_id uuid,
  organization_name text,
  organization_email citext,
  contact_number text,
  district text,
  barangay text,
  is_existing_organization boolean,
  organization_identifier_number text,
  major_classification text,
  sub_classification text,
  advocacies text[],
  adviser_name text,
  representative_name text,
  address text,
  facebook_page_url text,
  profile_status public.profile_status,
  verified_at timestamptz,
  internal_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _target_org public.organization_profiles%rowtype;
  _official_urn text;
  _start_date date;
  _end_date date;
  _effective_verified_at timestamptz;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select * into _target_org
  from public.organization_profiles
  where organization_profiles.id = _organization_profile_id
  for update;

  if not found then
    raise exception 'Organization profile not found.';
  end if;

  if _profile_status = 'verified'::public.profile_status then
    _effective_verified_at := coalesce(_verified_at, now());
    _start_date := date(_effective_verified_at);
    _end_date := (_start_date + interval '3 years')::date;

    -- If the organization already has an official URN, preserve it
    if _target_org.urn is not null and trim(_target_org.urn) <> '' then
      _official_urn := trim(_target_org.urn);
    elsif _target_org.is_existing_organization and _target_org.organization_identifier_number is not null and trim(_target_org.organization_identifier_number) <> '' then
      _official_urn := trim(_target_org.organization_identifier_number);
    else
      -- Authoritative generation of official URN exactly once upon PCYDO approval
      _official_urn := public.generate_unique_urn();
    end if;

    -- Update organization profile with official verified status and assigned URN
    update public.organization_profiles
    set
      profile_status = 'verified'::public.profile_status,
      verified_at = _effective_verified_at,
      urn = _official_urn,
      urn_normalized = public.normalize_urn(_official_urn),
      organization_identifier_number = _official_urn,
      urn_review_status = 'verified'::public.urn_review_status,
      verification_method = coalesce(_target_org.verification_method, 'documents'::public.verification_method),
      updated_at = now()
    where organization_profiles.id = _organization_profile_id;

    -- Create Term 1 accreditation record if not already present
    if not exists (
      select 1 from public.organization_accreditations
      where organization_id = _organization_profile_id and term_number = 1
    ) then
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
        _organization_profile_id,
        1,
        _start_date,
        _end_date,
        _official_urn,
        'active',
        false,
        _admin_id,
        _effective_verified_at,
        now()
      );
    end if;

  else
    -- needs_update or incomplete
    update public.organization_profiles
    set
      profile_status = _profile_status,
      verified_at = null,
      updated_at = now()
    where organization_profiles.id = _organization_profile_id;
  end if;

  return query
  select
    op.id,
    op.user_id,
    op.organization_name,
    op.organization_email,
    op.contact_number,
    op.district,
    op.barangay,
    op.is_existing_organization,
    op.organization_identifier_number,
    op.major_classification,
    op.sub_classification,
    op.advocacies,
    op.adviser_name,
    op.representative_name,
    op.address,
    op.facebook_page_url,
    op.profile_status,
    op.verified_at,
    op.internal_notes,
    op.created_at,
    op.updated_at
  from public.organization_profiles op
  where op.id = _organization_profile_id;
end;
$$;
