-- Migration: Implement Approved Y-TRACE Deterministic PCYDO URN Redesign (BB-YY-NNN)
-- File: 20260918000000_pydo_deterministic_urn_redesign.sql
--
-- Business Rules:
-- 1. Format: BB-YY-NNN
--    - BB: 2-digit alphabetical ordinal among the 30 canonical Pasig City barangays (01-30).
--    - YY: 2-digit calendar year of final registration approval (verified_at).
--    - NNN: 3-digit global city-wide annual sequence across ALL organizations approved in Pasig that year.
-- 2. Concurrency: Atomic upsert row-locking on public.organization_urn_counters.
-- 3. Renewal: Preserves existing official URN without renumbering or counter increments.
-- 4. Legacy Migration: Converts dummy verified accounts in chronological verified_at ASC order.
-- 5. Unverified Records: Clears stale URNs so they do not consume sequence numbers.

-- ==============================================================================
-- 1. DEDICATED GLOBAL ANNUAL URN COUNTER TABLE
-- ==============================================================================

create table if not exists public.organization_urn_counters (
  year text primary key,
  last_value integer not null default 0
);

comment on table public.organization_urn_counters is
  'Tracks the latest assigned global city-wide annual sequence number for PCYDO URN generation (BB-YY-NNN) across all Pasig City organizations per year.';

-- ==============================================================================
-- 2. CANONICAL PASIG CITY BARANGAY ORDINAL RESOLUTION (01 - 30)
-- ==============================================================================

create or replace function public.get_pasig_barangay_ordinal(_barangay text)
returns text
language plpgsql
immutable
as $$
declare
  _clean text;
begin
  if _barangay is null or trim(_barangay) = '' then
    raise exception 'Barangay is required to resolve official PCYDO URN ordinal.';
  end if;

  -- Normalize whitespace and lower case
  _clean := lower(trim(_barangay));

  -- Strip prefixes: "barangay", "brgy.", "brgy"
  _clean := trim(regexp_replace(_clean, '^(barangay|brgy\.?)\s+', '', 'i'));

  -- Normalize "santa" / "santo" abbreviations
  _clean := regexp_replace(_clean, '^santa\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^sta\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^santo\s+', 'sto. ', 'i');
  _clean := regexp_replace(_clean, '^sto\s+', 'sto. ', 'i');

  -- Match against the 30 canonical Pasig City barangays (alphabetical order 01-30)
  case _clean
    when 'bagong ilog'       then return '01';
    when 'bagong katipunan'  then return '02';
    when 'bambang'           then return '03';
    when 'buting'            then return '04';
    when 'caniogan'          then return '05';
    when 'dela paz'          then return '06';
    when 'kalawaan'          then return '07';
    when 'kapasigan'         then return '08';
    when 'kapitolyo'         then return '09';
    when 'malinao'           then return '10';
    when 'manggahan'         then return '11';
    when 'maybunga'          then return '12';
    when 'oranbo'            then return '13';
    when 'palatiw'           then return '14';
    when 'pinagbuhatan'      then return '15';
    when 'pineda'            then return '16';
    when 'rosario'           then return '17';
    when 'sagad'             then return '18';
    when 'san antonio'       then return '19';
    when 'san joaquin'       then return '20';
    when 'san jose'          then return '21';
    when 'san miguel'        then return '22';
    when 'san nicolas'       then return '23';
    when 'sta. cruz'         then return '24';
    when 'sta. lucia'        then return '25';
    when 'sta. rosa'         then return '26';
    when 'santolan'          then return '27';
    when 'sto. tomas'        then return '28';
    when 'sumilang'          then return '29';
    when 'ugong'             then return '30';
    else
      raise exception 'Invalid Pasig City barangay "%": must be one of the 30 canonical Pasig barangays.', _barangay;
  end case;
end;
$$;

comment on function public.get_pasig_barangay_ordinal(text) is
  'Resolves an incoming Pasig City barangay name to its official 2-digit zero-padded alphabetical ordinal (01 to 30). Raises an exception if not recognized.';

-- ==============================================================================
-- 3. DETERMINISTIC, ATOMIC OFFICIAL URN GENERATOR (BB-YY-NNN)
-- ==============================================================================

-- Drop legacy zero-argument generator
drop function if exists public.generate_unique_urn();

create or replace function public.generate_unique_urn(
  _barangay text,
  _effective_verified_at timestamptz default null
)
returns text
language plpgsql
as $$
declare
  _bb text;
  _yy text;
  _full_year text;
  _sequence int;
  _candidate text;
begin
  -- 1. Resolve 2-digit barangay ordinal BB (01-30)
  _bb := public.get_pasig_barangay_ordinal(_barangay);

  -- 2. Derive approval year YY (2 digits) and full year YYYY (4 digits)
  _yy := to_char(coalesce(_effective_verified_at, now()), 'YY');
  _full_year := to_char(coalesce(_effective_verified_at, now()), 'YYYY');

  -- 3. Atomically increment and lock the global annual counter
  insert into public.organization_urn_counters (year, last_value)
  values (_full_year, 1)
  on conflict (year) do update
  set last_value = public.organization_urn_counters.last_value + 1
  returning last_value into _sequence;

  -- 4. Format BB-YY-NNN and ensure absolute uniqueness against any existing record
  loop
    _candidate := _bb || '-' || _yy || '-' || lpad(_sequence::text, 3, '0');

    exit when not exists (
      select 1 from public.organization_profiles
      where urn_normalized = public.normalize_urn(_candidate)
         or upper(trim(coalesce(organization_identifier_number, ''))) = public.normalize_urn(_candidate)
         or upper(trim(coalesce(urn, ''))) = public.normalize_urn(_candidate)
    );

    _sequence := _sequence + 1;
    update public.organization_urn_counters
    set last_value = _sequence
    where year = _full_year;
  end loop;

  return _candidate;
end;
$$;

comment on function public.generate_unique_urn(text, timestamptz) is
  'Generates the official deterministic PCYDO URN in the format BB-YY-NNN using canonical barangay ordinal and atomic city-wide annual sequencing.';

-- ==============================================================================
-- 4. TRIGGER & CONSTRAINT SYNCHRONIZATION FOR OFFICIAL URN FIELDS
-- ==============================================================================

-- Drop legacy restrictive check constraint that prevented verified profiles from having urn if registration_type was new_organization
alter table public.organization_profiles drop constraint if exists organization_profiles_urn_required_check;

-- Ensure sync_organization_urn preserves and synchronizes official URN fields on verified profiles
create or replace function public.sync_organization_urn()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- For verified profiles, preserve and synchronize the official URN across all 3 fields
  if new.profile_status = 'verified'::public.profile_status then
    if new.urn is not null and trim(new.urn) <> '' then
      new.urn := btrim(new.urn);
      new.urn_normalized := public.normalize_urn(new.urn);
      new.organization_identifier_number := new.urn;
    elsif new.organization_identifier_number is not null and trim(new.organization_identifier_number) <> '' then
      new.urn := btrim(new.organization_identifier_number);
      new.urn_normalized := public.normalize_urn(new.urn);
      new.organization_identifier_number := new.urn;
    end if;
    return new;
  end if;

  -- For unverified profiles:
  if new.registration_type = 'existing_urn' then
    new.urn := btrim(new.urn);
    new.urn_normalized := public.normalize_urn(new.urn);
    if new.urn_review_status = 'not_applicable' then new.urn_review_status := 'pending'; end if;
    new.is_existing_organization := true;
    new.organization_identifier_number := coalesce(new.urn, '');
  else
    new.urn := null;
    new.urn_normalized := null;
    new.urn_review_status := 'not_applicable';
    new.urn_admin_remarks := null;
    new.urn_reviewed_by := null;
    new.urn_reviewed_at := null;
    new.is_existing_organization := false;
    new.organization_identifier_number := '';
  end if;
  return new;
end;
$$;

-- Align handle_organization_profile_urn_auto_gen with verified lifecycle
create or replace function public.handle_organization_profile_urn_auto_gen()
returns trigger
language plpgsql
as $$
begin
  -- Unverified organizations must never hold an official URN
  if new.registration_type = 'new_organization' or new.is_existing_organization = false then
    if new.profile_status is distinct from 'verified'::public.profile_status then
      new.urn := null;
      new.urn_normalized := null;
      new.organization_identifier_number := '';
      return new;
    end if;
  end if;

  if new.is_existing_organization = true and (new.organization_identifier_number is null or trim(new.organization_identifier_number) = '') then
    if new.urn is not null and trim(new.urn) <> '' then
      new.organization_identifier_number := trim(new.urn);
    end if;
  end if;

  return new;
end;
$$;

-- ==============================================================================
-- 5. FINAL REGISTRATION APPROVAL RPC INTEGRATION
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
      -- Authoritative generation of official deterministic URN (BB-YY-NNN) upon PCYDO approval
      _official_urn := public.generate_unique_urn(_target_org.barangay, _effective_verified_at);
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

-- ==============================================================================
-- 6. DATA MIGRATION: LEGACY DUMMY URNS & UNVERIFIED CLEANUP
-- ==============================================================================

-- A. Sanitize any non-canonical test barangay values on existing verified dummy records
update public.organization_profiles
set barangay = 'San Antonio'
where id = '7dfb6e06-839a-40f9-9db7-7ffd70406c14' and (barangay = 'dyan' or barangay is null);

-- B. Clear stale URN from pending/unverified test record so it does NOT consume a sequence number
update public.organization_profiles
set
  urn = null,
  urn_normalized = null,
  organization_identifier_number = '',
  updated_at = now()
where id = '4fbdf719-6a55-4b73-9537-99001adf0218'
  and profile_status <> 'verified';

-- C. Assign deterministic URNs to existing verified records in chronological verified_at ASC order
-- Temporarily disable immutability trigger for this intentional historical URN migration
alter table public.organization_accreditations disable trigger trg_accreditation_immutability;

do $$
declare
  _rec record;
  _seq int := 0;
  _new_urn text;
  _bb text;
  _yy text;
  _prev_urn text;
begin
  for _rec in
    select id, barangay, verified_at, coalesce(urn, organization_identifier_number) as old_urn
    from public.organization_profiles
    where profile_status = 'verified'
    order by verified_at asc, created_at asc, id asc
  loop
    _seq := _seq + 1;
    _bb := public.get_pasig_barangay_ordinal(_rec.barangay);
    _yy := to_char(_rec.verified_at, 'YY');
    _new_urn := _bb || '-' || _yy || '-' || lpad(_seq::text, 3, '0');
    _prev_urn := _rec.old_urn;

    -- Update organization_profiles
    update public.organization_profiles
    set
      urn = _new_urn,
      urn_normalized = public.normalize_urn(_new_urn),
      organization_identifier_number = _new_urn,
      urn_review_status = 'verified'::public.urn_review_status,
      updated_at = now()
    where id = _rec.id;

    -- Update organization_accreditations
    update public.organization_accreditations
    set certificate_urn = _new_urn
    where organization_id = _rec.id;

    -- Update urn_review_history if previous URN exists
    if _prev_urn is not null and trim(_prev_urn) <> '' then
      update public.urn_review_history
      set urn_value = _new_urn
      where organization_id = _rec.id
        and upper(trim(urn_value)) = upper(trim(_prev_urn));
    end if;
  end loop;

  -- Synchronize the annual counter for 2026 to the max assigned sequence
  insert into public.organization_urn_counters (year, last_value)
  values ('2026', _seq)
  on conflict (year) do update
  set last_value = greatest(public.organization_urn_counters.last_value, excluded.last_value);
end;
$$;

alter table public.organization_accreditations enable trigger trg_accreditation_immutability;
