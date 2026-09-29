-- ==============================================================================
-- Migration: 20260929180000_standardize_person_and_address_structure.sql
-- Description: System-wide standardization of person names (Head of Organization &
--              Adviser) and organization physical addresses.
--
-- Adds structured columns to public.organization_profiles:
-- - Head of Organization: representative_first_name, representative_middle_name,
--                         representative_last_name, representative_suffix
-- - Adviser: adviser_first_name, adviser_middle_name, adviser_last_name, adviser_suffix
-- - Address: address_unit_building, address_street, address_subdivision,
--            address_barangay, address_city, address_province, address_zip_code
--
-- Automatically syncs legacy columns (representative_name, adviser_name, address)
-- via a BEFORE INSERT OR UPDATE trigger so all historical queries, RPCs, and
-- reports remain 100% backward compatible without data desynchronization.
-- ==============================================================================

-- 1. Add structured person name and address columns
ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS representative_first_name text,
  ADD COLUMN IF NOT EXISTS representative_middle_name text,
  ADD COLUMN IF NOT EXISTS representative_last_name text,
  ADD COLUMN IF NOT EXISTS representative_suffix text,
  ADD COLUMN IF NOT EXISTS adviser_first_name text,
  ADD COLUMN IF NOT EXISTS adviser_middle_name text,
  ADD COLUMN IF NOT EXISTS adviser_last_name text,
  ADD COLUMN IF NOT EXISTS adviser_suffix text,
  ADD COLUMN IF NOT EXISTS address_unit_building text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_subdivision text,
  ADD COLUMN IF NOT EXISTS address_barangay text,
  ADD COLUMN IF NOT EXISTS address_city text DEFAULT 'Pasig City',
  ADD COLUMN IF NOT EXISTS address_province text DEFAULT 'Metro Manila',
  ADD COLUMN IF NOT EXISTS address_zip_code text;

-- 2. Trigger function to synchronize structured fields with legacy fields
CREATE OR REPLACE FUNCTION public.sync_organization_profile_structured_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Normalize and sync Head of Organization (Representative)
  IF NEW.representative_first_name IS NOT NULL OR NEW.representative_last_name IS NOT NULL THEN
    NEW.representative_first_name := nullif(trim(NEW.representative_first_name), '');
    NEW.representative_middle_name := nullif(trim(NEW.representative_middle_name), '');
    NEW.representative_last_name := nullif(trim(NEW.representative_last_name), '');
    NEW.representative_suffix := nullif(trim(NEW.representative_suffix), '');

    IF NEW.representative_first_name IS NOT NULL AND NEW.representative_last_name IS NOT NULL THEN
      NEW.representative_name := trim(concat_ws(' ',
        NEW.representative_first_name,
        NEW.representative_middle_name,
        NEW.representative_last_name,
        NEW.representative_suffix
      ));
    END IF;
  END IF;

  -- Normalize and sync Adviser
  IF NEW.adviser_first_name IS NOT NULL OR NEW.adviser_last_name IS NOT NULL THEN
    NEW.adviser_first_name := nullif(trim(NEW.adviser_first_name), '');
    NEW.adviser_middle_name := nullif(trim(NEW.adviser_middle_name), '');
    NEW.adviser_last_name := nullif(trim(NEW.adviser_last_name), '');
    NEW.adviser_suffix := nullif(trim(NEW.adviser_suffix), '');

    IF NEW.adviser_first_name IS NOT NULL AND NEW.adviser_last_name IS NOT NULL THEN
      NEW.adviser_name := trim(concat_ws(' ',
        NEW.adviser_first_name,
        NEW.adviser_middle_name,
        NEW.adviser_last_name,
        NEW.adviser_suffix
      ));
    END IF;
  END IF;

  -- Normalize and sync structured address
  IF NEW.address_street IS NOT NULL OR NEW.address_barangay IS NOT NULL OR NEW.address_unit_building IS NOT NULL THEN
    NEW.address_unit_building := nullif(trim(NEW.address_unit_building), '');
    NEW.address_street := nullif(trim(NEW.address_street), '');
    NEW.address_subdivision := nullif(trim(NEW.address_subdivision), '');
    NEW.address_barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
    NEW.address_city := coalesce(nullif(trim(NEW.address_city), ''), 'Pasig City');
    NEW.address_province := coalesce(nullif(trim(NEW.address_province), ''), 'Metro Manila');
    NEW.address_zip_code := nullif(trim(NEW.address_zip_code), '');

    IF NEW.address_barangay IS NOT NULL THEN
      NEW.barangay := NEW.address_barangay;
    END IF;

    IF NEW.address_street IS NOT NULL THEN
      NEW.address := trim(concat_ws(', ',
        NEW.address_unit_building,
        NEW.address_street,
        NEW.address_subdivision,
        NEW.address_barangay,
        NEW.address_city,
        NEW.address_province,
        NEW.address_zip_code
      ));
    END IF;
  ELSIF NEW.barangay IS NOT NULL AND (NEW.address_barangay IS NULL OR trim(NEW.address_barangay) = '') THEN
    NEW.address_barangay := trim(NEW.barangay);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Bind trigger to organization_profiles
DROP TRIGGER IF EXISTS trg_sync_organization_profile_structured_fields ON public.organization_profiles;
CREATE TRIGGER trg_sync_organization_profile_structured_fields
BEFORE INSERT OR UPDATE ON public.organization_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_organization_profile_structured_fields();

-- 4. Update admin_ensure_renewal_test_account_profile RPC to populate structured fields
CREATE OR REPLACE FUNCTION public.admin_ensure_renewal_test_account_profile(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org record;
BEGIN
  -- 1. Validate Admin Authorization
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 2. Reject if in production
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Renewal Test Environment is disabled in production.';
  END IF;

  -- 3. Locate only the dedicated Renewal Test Account
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account = true
     OR organization_email = 'renewal.test@pasigcity.gov.ph'
  LIMIT 1;

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Renewal Test Organization does not exist. Please create it first.';
  END IF;

  IF _org.is_renewal_test_account IS NOT TRUE THEN
    RAISE EXCEPTION 'Target organization is not designated as a Renewal Test Account.';
  END IF;

  -- 4. Idempotently populate missing / empty profile fields
  UPDATE public.organization_profiles
  SET
    representative_first_name = CASE 
      WHEN representative_first_name IS NULL OR trim(representative_first_name) = '' THEN 'Juan' 
      ELSE representative_first_name 
    END,
    representative_middle_name = CASE 
      WHEN representative_middle_name IS NULL OR trim(representative_middle_name) = '' THEN 'Crisostomo' 
      ELSE representative_middle_name 
    END,
    representative_last_name = CASE 
      WHEN representative_last_name IS NULL OR trim(representative_last_name) = '' THEN 'Ibarra' 
      ELSE representative_last_name 
    END,
    representative_suffix = CASE 
      WHEN representative_suffix IS NULL OR trim(representative_suffix) = '' THEN 'Jr.' 
      ELSE representative_suffix 
    END,
    representative_name = 'Juan Crisostomo Ibarra Jr.',

    adviser_first_name = CASE 
      WHEN adviser_first_name IS NULL OR trim(adviser_first_name) = '' THEN 'Maria' 
      ELSE adviser_first_name 
    END,
    adviser_middle_name = CASE 
      WHEN adviser_middle_name IS NULL OR trim(adviser_middle_name) = '' THEN 'Clara' 
      ELSE adviser_middle_name 
    END,
    adviser_last_name = CASE 
      WHEN adviser_last_name IS NULL OR trim(adviser_last_name) = '' THEN 'delos Santos' 
      ELSE adviser_last_name 
    END,
    adviser_suffix = NULL,
    adviser_name = 'Maria Clara delos Santos',

    address_unit_building = CASE 
      WHEN address_unit_building IS NULL OR trim(address_unit_building) = '' THEN 'Room 201, Youth Hub Building' 
      ELSE address_unit_building 
    END,
    address_street = CASE 
      WHEN address_street IS NULL OR trim(address_street) = '' THEN '101 Test Center Way' 
      ELSE address_street 
    END,
    address_subdivision = NULL,
    address_barangay = 'Kapitolyo',
    address_city = 'Pasig City',
    address_province = 'Metro Manila',
    address_zip_code = CASE 
      WHEN address_zip_code IS NULL OR trim(address_zip_code) = '' THEN '1603' 
      ELSE address_zip_code 
    END,
    address = 'Room 201, Youth Hub Building, 101 Test Center Way, Kapitolyo, Pasig City, Metro Manila, 1603',

    major_classification = CASE 
      WHEN major_classification IS NULL OR trim(major_classification) = '' THEN 'Youth Organization' 
      ELSE major_classification 
    END,
    sub_classification = CASE 
      WHEN sub_classification IS NULL OR trim(sub_classification) = '' THEN 'community-based' 
      ELSE sub_classification 
    END,
    advocacies = CASE 
      WHEN advocacies IS NULL OR cardinality(advocacies) = 0 THEN ARRAY['education', 'governance', 'active citizenship']::text[] 
      ELSE advocacies 
    END,
    facebook_page_url = CASE 
      WHEN facebook_page_url IS NULL OR trim(facebook_page_url) = '' THEN 'https://facebook.com/ytrace.renewal.test' 
      ELSE facebook_page_url 
    END,
    updated_at = clock_timestamp()
  WHERE id = _org.id
  RETURNING * INTO _org;

  -- 5. Write an administrative audit log entry
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _admin_id,
    _org.id,
    'ensured_renewal_test_account_profile',
    'organization',
    _org.id,
    'Ensured complete representative organization profile data with structured fields for Y-TRACE Renewal Test Account.'
  );

  -- 6. Return resulting profile information
  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'organizationName', _org.organization_name,
    'representativeName', _org.representative_name,
    'representativeFirstName', _org.representative_first_name,
    'representativeMiddleName', _org.representative_middle_name,
    'representativeLastName', _org.representative_last_name,
    'representativeSuffix', _org.representative_suffix,
    'adviserName', _org.adviser_name,
    'adviserFirstName', _org.adviser_first_name,
    'adviserMiddleName', _org.adviser_middle_name,
    'adviserLastName', _org.adviser_last_name,
    'adviserSuffix', _org.adviser_suffix,
    'address', _org.address,
    'addressUnitBuilding', _org.address_unit_building,
    'addressStreet', _org.address_street,
    'addressSubdivision', _org.address_subdivision,
    'addressBarangay', _org.address_barangay,
    'addressCity', _org.address_city,
    'addressProvince', _org.address_province,
    'addressZipCode', _org.address_zip_code,
    'majorClassification', _org.major_classification,
    'subClassification', _org.sub_classification,
    'advocacies', to_jsonb(_org.advocacies),
    'facebookPageUrl', _org.facebook_page_url,
    'district', _org.district,
    'barangay', _org.barangay,
    'urn', _org.urn,
    'profileStatus', _org.profile_status
  );
END;
$$;

-- 5. Update admin_get_or_create_renewal_test_account RPC to initialize structured fields
CREATE OR REPLACE FUNCTION public.admin_get_or_create_renewal_test_account(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org record;
  _user_id uuid;
  _acc record;
  _renewal record;
  _submission_id uuid;
  _is_new boolean := false;
  _now timestamptz := clock_timestamp();
  _today date := current_date;
  _window_status text;
  _can_draft boolean;
  _can_submit boolean;
  _days_diff integer;
  _days_remaining integer;
BEGIN
  -- 1. Validate Admin Authorization
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 2. Reject if in production
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Renewal Test Environment is disabled in production.';
  END IF;

  -- 3. Check for existing test organization
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account = true
     OR organization_email = 'renewal.test@pasigcity.gov.ph'
  LIMIT 1;

  -- 4. Check / ensure auth user and identities exist
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = 'renewal.test@pasigcity.gov.ph'
  LIMIT 1;

  IF _user_id IS NULL THEN
    _user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'renewal.test@pasigcity.gov.ph',
      extensions.crypt('RenewalTest2026!', extensions.gen_salt('bf')),
      _now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"organization_name":"Y-TRACE Renewal Test Organization","is_test_account":true}'::jsonb,
      _now,
      _now
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt('RenewalTest2026!', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, _now),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"organization_name":"Y-TRACE Renewal Test Organization","is_test_account":true}'::jsonb
    WHERE id = _user_id;
  END IF;

  -- Ensure auth.identities has entry
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    _user_id,
    _user_id,
    jsonb_build_object('sub', _user_id::text, 'email', 'renewal.test@pasigcity.gov.ph'),
    'email',
    _user_id::text,
    _now,
    _now,
    _now
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET
    identity_data = jsonb_build_object('sub', _user_id::text, 'email', 'renewal.test@pasigcity.gov.ph'),
    updated_at = _now;

  -- Ensure user profile exists
  INSERT INTO public.user_profiles (
    user_id,
    email,
    display_name,
    full_name,
    contact_number
  ) VALUES (
    _user_id,
    'renewal.test@pasigcity.gov.ph',
    'Y-TRACE Renewal Test Account',
    'Y-TRACE Renewal Test Officer',
    '09170000000'
  ) ON CONFLICT (user_id) DO UPDATE
  SET
    email = 'renewal.test@pasigcity.gov.ph',
    display_name = 'Y-TRACE Renewal Test Account';

  -- Create organization profile if not exists
  IF _org.id IS NULL THEN
    _is_new := true;

    INSERT INTO public.organization_profiles (
      user_id,
      organization_name,
      organization_email,
      contact_number,
      district,
      barangay,
      is_existing_organization,
      is_renewal_test_account,
      profile_status,
      urn,
      urn_normalized,
      urn_review_status,
      registration_type,
      verified_at,
      accreditation_start_date,
      accreditation_expires_at,
      representative_first_name,
      representative_middle_name,
      representative_last_name,
      representative_suffix,
      representative_name,
      adviser_first_name,
      adviser_middle_name,
      adviser_last_name,
      adviser_suffix,
      adviser_name,
      address_unit_building,
      address_street,
      address_subdivision,
      address_barangay,
      address_city,
      address_province,
      address_zip_code,
      address,
      major_classification,
      sub_classification,
      advocacies,
      facebook_page_url
    ) VALUES (
      _user_id,
      'Y-TRACE Renewal Test Organization',
      'renewal.test@pasigcity.gov.ph',
      '09170000000',
      'District 1',
      'Kapitolyo',
      false,
      true,
      'verified',
      '01-23-999',
      '01-23-999',
      'verified',
      'new_organization',
      _now - interval '3 years',
      (_today - interval '3 years')::date,
      (_today + interval '30 days')::timestamptz,
      'Juan',
      'Crisostomo',
      'Ibarra',
      'Jr.',
      'Juan Crisostomo Ibarra Jr.',
      'Maria',
      'Clara',
      'delos Santos',
      NULL,
      'Maria Clara delos Santos',
      'Room 201, Youth Hub Building',
      '101 Test Center Way',
      NULL,
      'Kapitolyo',
      'Pasig City',
      'Metro Manila',
      '1603',
      'Room 201, Youth Hub Building, 101 Test Center Way, Kapitolyo, Pasig City, Metro Manila, 1603',
      'Youth Organization',
      'community-based',
      ARRAY['education', 'governance', 'active citizenship']::text[],
      'https://facebook.com/ytrace.renewal.test'
    ) RETURNING * INTO _org;

    -- Create initial Term 1 accreditation inside renewal window (+30 days)
    INSERT INTO public.organization_accreditations (
      organization_id,
      term_number,
      start_date,
      end_date,
      certificate_urn,
      status,
      approved_by,
      approved_at
    ) VALUES (
      _org.id,
      1,
      (_today - interval '3 years')::date,
      (_today + interval '30 days')::date,
      '01-23-999',
      'active',
      _admin_id,
      _now - interval '3 years'
    ) RETURNING * INTO _acc;

    -- Update organization current accreditation reference
    UPDATE public.organization_profiles
    SET current_accreditation_id = _acc.id
    WHERE id = _org.id;

    -- Insert activity log
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    ) VALUES (
      _admin_id,
      _org.id,
      'created_renewal_test_account',
      'organization',
      _org.id,
      'Administrator initialized dedicated Y-TRACE Renewal Test Account with structured profile.'
    );
  ELSE
    -- Ensure test flag, user_id, and complete profile data are maintained
    UPDATE public.organization_profiles
    SET
      is_renewal_test_account = true,
      user_id = _user_id,
      organization_email = 'renewal.test@pasigcity.gov.ph',
      representative_first_name = CASE 
        WHEN representative_first_name IS NULL OR trim(representative_first_name) = '' THEN 'Juan' 
        ELSE representative_first_name 
      END,
      representative_middle_name = CASE 
        WHEN representative_middle_name IS NULL OR trim(representative_middle_name) = '' THEN 'Crisostomo' 
        ELSE representative_middle_name 
      END,
      representative_last_name = CASE 
        WHEN representative_last_name IS NULL OR trim(representative_last_name) = '' THEN 'Ibarra' 
        ELSE representative_last_name 
      END,
      representative_suffix = CASE 
        WHEN representative_suffix IS NULL OR trim(representative_suffix) = '' THEN 'Jr.' 
        ELSE representative_suffix 
      END,
      representative_name = 'Juan Crisostomo Ibarra Jr.',

      adviser_first_name = CASE 
        WHEN adviser_first_name IS NULL OR trim(adviser_first_name) = '' THEN 'Maria' 
        ELSE adviser_first_name 
      END,
      adviser_middle_name = CASE 
        WHEN adviser_middle_name IS NULL OR trim(adviser_middle_name) = '' THEN 'Clara' 
        ELSE adviser_middle_name 
      END,
      adviser_last_name = CASE 
        WHEN adviser_last_name IS NULL OR trim(adviser_last_name) = '' THEN 'delos Santos' 
        ELSE adviser_last_name 
      END,
      adviser_suffix = NULL,
      adviser_name = 'Maria Clara delos Santos',

      address_unit_building = CASE 
        WHEN address_unit_building IS NULL OR trim(address_unit_building) = '' THEN 'Room 201, Youth Hub Building' 
        ELSE address_unit_building 
      END,
      address_street = CASE 
        WHEN address_street IS NULL OR trim(address_street) = '' THEN '101 Test Center Way' 
        ELSE address_street 
      END,
      address_subdivision = NULL,
      address_barangay = 'Kapitolyo',
      address_city = 'Pasig City',
      address_province = 'Metro Manila',
      address_zip_code = CASE 
        WHEN address_zip_code IS NULL OR trim(address_zip_code) = '' THEN '1603' 
        ELSE address_zip_code 
      END,
      address = 'Room 201, Youth Hub Building, 101 Test Center Way, Kapitolyo, Pasig City, Metro Manila, 1603',

      major_classification = CASE 
        WHEN major_classification IS NULL OR trim(major_classification) = '' THEN 'Youth Organization' 
        ELSE major_classification 
      END,
      sub_classification = CASE 
        WHEN sub_classification IS NULL OR trim(sub_classification) = '' THEN 'community-based' 
        ELSE sub_classification 
      END,
      advocacies = CASE 
        WHEN advocacies IS NULL OR cardinality(advocacies) = 0 THEN ARRAY['education', 'governance', 'active citizenship']::text[] 
        ELSE advocacies 
      END,
      facebook_page_url = CASE 
        WHEN facebook_page_url IS NULL OR trim(facebook_page_url) = '' THEN 'https://facebook.com/ytrace.renewal.test' 
        ELSE facebook_page_url 
      END
    WHERE id = _org.id
    RETURNING * INTO _org;

    -- Fetch active accreditation
    SELECT * INTO _acc
    FROM public.organization_accreditations
    WHERE organization_id = _org.id
      AND status = 'active'
    ORDER BY term_number DESC
    LIMIT 1;
  END IF;

  -- Check current renewal application
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE organization_id = _org.id
    AND status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted')
  ORDER BY cycle_number DESC
  LIMIT 1;

  IF _renewal.id IS NOT NULL THEN
    SELECT id INTO _submission_id
    FROM public.document_submissions
    WHERE renewal_id = _renewal.id
    LIMIT 1;
  END IF;

  -- Calculate eligibility metrics
  IF _acc.id IS NOT NULL THEN
    _days_diff := _acc.end_date - _today;
    _days_remaining := GREATEST(0, _days_diff);

    IF _days_diff > 90 THEN
      _window_status := 'too_early';
      _can_draft := false;
      _can_submit := false;
    ELSIF _days_diff >= 0 THEN
      _window_status := 'open';
      _can_draft := true;
      _can_submit := true;
    ELSIF ABS(_days_diff) <= 180 THEN
      _window_status := 'late_open';
      _can_draft := true;
      _can_submit := true;
    ELSE
      _window_status := 'cutoff_exceeded';
      _can_draft := false;
      _can_submit := false;
    END IF;
  ELSE
    _window_status := 'no_accreditation';
    _can_draft := false;
    _can_submit := false;
    _days_remaining := 0;
  END IF;

  RETURN jsonb_build_object(
    'isNew', _is_new,
    'organization', jsonb_build_object(
      'id', _org.id,
      'userId', _org.user_id,
      'name', _org.organization_name,
      'email', _org.organization_email,
      'contactNumber', _org.contact_number,
      'district', _org.district,
      'barangay', _org.barangay,
      'profileStatus', _org.profile_status,
      'urn', coalesce(_org.urn, '01-23-999'),
      'isRenewalTestAccount', true,
      'representativeName', _org.representative_name,
      'representativeFirstName', _org.representative_first_name,
      'representativeMiddleName', _org.representative_middle_name,
      'representativeLastName', _org.representative_last_name,
      'representativeSuffix', _org.representative_suffix,
      'adviserName', _org.adviser_name,
      'adviserFirstName', _org.adviser_first_name,
      'adviserMiddleName', _org.adviser_middle_name,
      'adviserLastName', _org.adviser_last_name,
      'adviserSuffix', _org.adviser_suffix,
      'address', _org.address,
      'addressUnitBuilding', _org.address_unit_building,
      'addressStreet', _org.address_street,
      'addressSubdivision', _org.address_subdivision,
      'addressBarangay', _org.address_barangay,
      'addressCity', _org.address_city,
      'addressProvince', _org.address_province,
      'addressZipCode', _org.address_zip_code,
      'majorClassification', _org.major_classification,
      'subClassification', _org.sub_classification,
      'advocacies', to_jsonb(_org.advocacies),
      'facebookPageUrl', _org.facebook_page_url
    ),
    'credentials', jsonb_build_object(
      'email', 'renewal.test@pasigcity.gov.ph',
      'temporaryPassword', 'RenewalTest2026!'
    ),
    'accreditation', CASE WHEN _acc.id IS NOT NULL THEN jsonb_build_object(
      'id', _acc.id,
      'termNumber', _acc.term_number,
      'startDate', _acc.start_date,
      'endDate', _acc.end_date,
      'status', _acc.status,
      'certificateUrn', _acc.certificate_urn,
      'derivedStatus', public.derive_accreditation_status(_acc.status, _acc.end_date, _today)
    ) ELSE NULL END,
    'eligibility', jsonb_build_object(
      'canDraft', _can_draft,
      'canSubmit', _can_submit,
      'windowStatus', _window_status,
      'daysRemaining', _days_remaining,
      'expiresAt', _acc.end_date
    ),
    'activeRenewal', CASE WHEN _renewal.id IS NOT NULL THEN jsonb_build_object(
      'id', _renewal.id,
      'cycleNumber', _renewal.cycle_number,
      'status', _renewal.status,
      'adminRemarks', _renewal.admin_remarks,
      'submittedAt', _renewal.submitted_at,
      'submissionId', _submission_id
    ) ELSE NULL END
  );
END;
$$;

-- 6. Immediate backfill for dev/test environment
DO $$
BEGIN
  IF public.is_development_or_test_environment() THEN
    UPDATE public.organization_profiles
    SET
      representative_first_name = 'Juan',
      representative_middle_name = 'Crisostomo',
      representative_last_name = 'Ibarra',
      representative_suffix = 'Jr.',
      representative_name = 'Juan Crisostomo Ibarra Jr.',
      adviser_first_name = 'Maria',
      adviser_middle_name = 'Clara',
      adviser_last_name = 'delos Santos',
      adviser_suffix = NULL,
      adviser_name = 'Maria Clara delos Santos',
      address_unit_building = 'Room 201, Youth Hub Building',
      address_street = '101 Test Center Way',
      address_subdivision = NULL,
      address_barangay = 'Kapitolyo',
      address_city = 'Pasig City',
      address_province = 'Metro Manila',
      address_zip_code = '1603',
      address = 'Room 201, Youth Hub Building, 101 Test Center Way, Kapitolyo, Pasig City, Metro Manila, 1603'
    WHERE is_renewal_test_account = true
       OR organization_email = 'renewal.test@pasigcity.gov.ph';
  END IF;
END $$;
