-- ==============================================================================
-- Migration: 20260929070000_fix_identities_id_uuid.sql
-- Description: Inserts auth.identities id as uuid
-- ==============================================================================

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
     OR organization_email = 'renewal.test@lydo-connect.local'
  LIMIT 1;

  -- 4. Check / ensure auth user and identities exist
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = 'renewal.test@lydo-connect.local'
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
      'renewal.test@lydo-connect.local',
      extensions.crypt('RenewalTest2026!', extensions.gen_salt('bf')),
      _now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"organization_name":"Y-TRACE Renewal Test Organization","is_test_account":true}'::jsonb,
      _now,
      _now
    );
  ELSE
    -- Update password in case it needs syncing
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt('RenewalTest2026!', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, _now),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"organization_name":"Y-TRACE Renewal Test Organization","is_test_account":true}'::jsonb
    WHERE id = _user_id;
  END IF;

  -- Ensure auth.identities has entry for GoTrue authentication
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
    jsonb_build_object('sub', _user_id::text, 'email', 'renewal.test@lydo-connect.local'),
    'email',
    _user_id::text,
    _now,
    _now,
    _now
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET
    identity_data = jsonb_build_object('sub', _user_id::text, 'email', 'renewal.test@lydo-connect.local'),
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
    'renewal.test@lydo-connect.local',
    'Y-TRACE Renewal Test Account',
    'Y-TRACE Renewal Test Officer',
    '09170000000'
  ) ON CONFLICT (user_id) DO UPDATE
  SET
    email = 'renewal.test@lydo-connect.local',
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
      accreditation_expires_at
    ) VALUES (
      _user_id,
      'Y-TRACE Renewal Test Organization',
      'renewal.test@lydo-connect.local',
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
      (_today + interval '30 days')::timestamptz
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
      'Administrator initialized dedicated Y-TRACE Renewal Test Account.'
    );
  ELSE
    -- Ensure test flag and user_id are correctly mapped
    UPDATE public.organization_profiles
    SET
      is_renewal_test_account = true,
      user_id = _user_id
    WHERE id = _org.id;

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
      'isRenewalTestAccount', true
    ),
    'credentials', jsonb_build_object(
      'email', 'renewal.test@lydo-connect.local',
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
