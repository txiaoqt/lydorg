-- ==============================================================================
-- Migration: 20260929170000_complete_renewal_test_account_profile.sql
-- Description: Completes the Renewal Test Account with a fully populated,
--              realistic organization profile using authoritative database fields.
--
-- Authoritative Schema Fields Populated:
-- 1. representative_name -> 'Renewal Test President' (Head of Organization)
-- 2. adviser_name -> 'Renewal Test Adviser' (Adviser)
-- 3. address -> '101 Test Center Way, Barangay Kapitolyo, Pasig City' (Office Address)
-- 4. major_classification -> 'Youth Organization' (Major Classification)
-- 5. sub_classification -> 'community-based' (Sub Classification, renders 'Community-based')
-- 6. advocacies -> ARRAY['education', 'governance', 'active citizenship']::text[] (CYP)
-- 7. facebook_page_url -> 'https://facebook.com/ytrace.renewal.test' (Public Social URL)
--
-- Security & Isolation:
-- - strictly restricted to is_renewal_test_account = true
-- - guarded by validate_admin_session_token and is_development_or_test_environment()
-- - does not modify any real organization or normal registration/profile workflows
-- ==============================================================================

-- 1. Create admin_ensure_renewal_test_account_profile RPC
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
    representative_name = CASE 
      WHEN representative_name IS NULL OR trim(representative_name) = '' THEN 'Renewal Test President' 
      ELSE representative_name 
    END,
    adviser_name = CASE 
      WHEN adviser_name IS NULL OR trim(adviser_name) = '' THEN 'Renewal Test Adviser' 
      ELSE adviser_name 
    END,
    address = CASE 
      WHEN address IS NULL OR trim(address) = '' THEN '101 Test Center Way, Barangay Kapitolyo, Pasig City' 
      ELSE address 
    END,
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
    'Ensured complete representative organization profile data for Y-TRACE Renewal Test Account.'
  );

  -- 6. Return resulting profile information
  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'organizationName', _org.organization_name,
    'representativeName', _org.representative_name,
    'adviserName', _org.adviser_name,
    'address', _org.address,
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

GRANT EXECUTE ON FUNCTION public.admin_ensure_renewal_test_account_profile(text) TO anon, authenticated, service_role;


-- 2. Update admin_get_or_create_renewal_test_account to atomically populate full profile on creation/access
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
      representative_name,
      adviser_name,
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
      'Renewal Test President',
      'Renewal Test Adviser',
      '101 Test Center Way, Barangay Kapitolyo, Pasig City',
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
      'Administrator initialized dedicated Y-TRACE Renewal Test Account with full profile.'
    );
  ELSE
    -- Ensure test flag, user_id, and complete profile data are maintained
    UPDATE public.organization_profiles
    SET
      is_renewal_test_account = true,
      user_id = _user_id,
      organization_email = 'renewal.test@pasigcity.gov.ph',
      representative_name = CASE 
        WHEN representative_name IS NULL OR trim(representative_name) = '' THEN 'Renewal Test President' 
        ELSE representative_name 
      END,
      adviser_name = CASE 
        WHEN adviser_name IS NULL OR trim(adviser_name) = '' THEN 'Renewal Test Adviser' 
        ELSE adviser_name 
      END,
      address = CASE 
        WHEN address IS NULL OR trim(address) = '' THEN '101 Test Center Way, Barangay Kapitolyo, Pasig City' 
        ELSE address 
      END,
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
      'adviserName', _org.adviser_name,
      'address', _org.address,
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

GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text) TO anon, authenticated, service_role;


-- 3. Immediate update for existing Renewal Test Account in dev/test environment
DO $$
BEGIN
  IF public.is_development_or_test_environment() THEN
    UPDATE public.organization_profiles
    SET
      representative_name = CASE 
        WHEN representative_name IS NULL OR trim(representative_name) = '' THEN 'Renewal Test President' 
        ELSE representative_name 
      END,
      adviser_name = CASE 
        WHEN adviser_name IS NULL OR trim(adviser_name) = '' THEN 'Renewal Test Adviser' 
        ELSE adviser_name 
      END,
      address = CASE 
        WHEN address IS NULL OR trim(address) = '' THEN '101 Test Center Way, Barangay Kapitolyo, Pasig City' 
        ELSE address 
      END,
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
    WHERE is_renewal_test_account = true
      AND organization_email = 'renewal.test@pasigcity.gov.ph';
  END IF;
END $$;
