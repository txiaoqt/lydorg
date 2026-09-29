-- ==============================================================================
-- Migration: 20260929020000_renewal_test_environment_rpcs.sql
-- Description:
-- 1. Adds is_renewal_test_account marker column on public.organization_profiles.
-- 2. Updates enforce_accreditation_immutability() and enforce_renewal_terminal_immutability()
--    to safely support test scenario preparation strictly for the designated test organization.
-- 3. Provides public.is_development_or_test_environment() guard function.
-- 4. Canonical RPCs for Renewal Test Environment:
--    - public.admin_get_or_create_renewal_test_account(text)
--    - public.admin_prepare_renewal_test_scenario(text, integer, date)
--    - public.admin_restore_renewal_test_scenario(text)
--    - public.admin_reset_renewal_test_scenario(text)
-- ==============================================================================

-- 1. ADD TEST MARKER COLUMN
ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS is_renewal_test_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_org_profiles_renewal_test_account
  ON public.organization_profiles (is_renewal_test_account)
  WHERE is_renewal_test_account = true;

-- 2. ENVIRONMENT GUARD FUNCTION
CREATE OR REPLACE FUNCTION public.is_development_or_test_environment()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _env text;
BEGIN
  SELECT coalesce(value_json->>'environment', value_json::text, 'development')
  INTO _env
  FROM public.admin_system_settings
  WHERE setting_key = 'general.environment'
  LIMIT 1;

  IF _env IS NULL THEN
    _env := 'development';
  END IF;

  _env := lower(trim(_env, '" '));
  RETURN _env NOT IN ('production', 'prod');
END;
$$;

-- 3. CONTROLLED IMMUTABILITY OVERRIDES
CREATE OR REPLACE FUNCTION public.enforce_accreditation_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'UPDATE' THEN
    -- Core historical term attributes must never be altered
    IF old.term_number IS DISTINCT FROM new.term_number
       OR old.start_date IS DISTINCT FROM new.start_date
       OR old.end_date IS DISTINCT FROM new.end_date
       OR old.certificate_urn IS DISTINCT FROM new.certificate_urn
       OR old.approved_by IS DISTINCT FROM new.approved_by
       OR old.approved_at IS DISTINCT FROM new.approved_at
       OR old.created_at IS DISTINCT FROM new.created_at
       OR old.is_legacy_inferred IS DISTINCT FROM new.is_legacy_inferred THEN
      -- Controlled exception: permit date adjustments for the designated renewal test account in non-production
      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
        IF EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = old.organization_id
            AND (op.is_renewal_test_account = true OR op.organization_email = 'renewal.test@lydo-connect.local')
        ) THEN
          RETURN new;
        END IF;
      END IF;

      RAISE EXCEPTION 'Historical accreditation term fields are immutable.';
    END IF;

    -- Revocation immutability rules:
    IF old.revoked_at IS NOT NULL AND new.revoked_at IS DISTINCT FROM old.revoked_at THEN
      RAISE EXCEPTION 'Accreditation revocation timestamp is immutable once set.';
    END IF;

    IF old.revocation_reason IS NOT NULL AND new.revocation_reason IS DISTINCT FROM old.revocation_reason THEN
      RAISE EXCEPTION 'Accreditation revocation reason is immutable once set.';
    END IF;

    IF new.status <> 'revoked' AND new.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Non-revoked accreditation terms cannot have a revocation timestamp.';
    END IF;

    -- Valid status transitions only:
    IF old.status = 'superseded' AND new.status <> 'superseded' THEN
      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
        IF EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = old.organization_id
            AND (op.is_renewal_test_account = true OR op.organization_email = 'renewal.test@lydo-connect.local')
        ) THEN
          RETURN new;
        END IF;
      END IF;
      RAISE EXCEPTION 'A superseded accreditation term cannot be reactivated or altered.';
    END IF;

    IF old.status = 'revoked' AND new.status <> 'revoked' THEN
      RAISE EXCEPTION 'A revoked accreditation term cannot be reactivated.';
    END IF;

    IF old.status <> 'revoked' AND new.status = 'revoked' THEN
      IF new.revoked_at IS NULL THEN
        new.revoked_at := clock_timestamp();
      END IF;
    END IF;

    RETURN new;
  END IF;

  IF tg_op = 'DELETE' THEN
    IF current_setting('app.allow_org_deletion', true) = 'true' THEN
      RETURN old;
    END IF;
    IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
      IF EXISTS (
        SELECT 1 FROM public.organization_profiles op
        WHERE op.id = old.organization_id
          AND (op.is_renewal_test_account = true OR op.organization_email = 'renewal.test@lydo-connect.local')
      ) THEN
        RETURN old;
      END IF;
    END IF;
    RAISE EXCEPTION 'Accreditation terms in the authoritative ledger cannot be deleted.';
  END IF;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_renewal_terminal_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'UPDATE' THEN
    IF old.status IN ('approved', 'rejected') THEN
      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
        IF EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = old.organization_id
            AND (op.is_renewal_test_account = true OR op.organization_email = 'renewal.test@lydo-connect.local')
        ) THEN
          RETURN new;
        END IF;
      END IF;
      RAISE EXCEPTION 'Terminal renewal records cannot be modified.';
    END IF;
    RETURN new;
  END IF;

  IF tg_op = 'DELETE' THEN
    IF current_setting('app.allow_org_deletion', true) = 'true' THEN
      RETURN old;
    END IF;
    IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
      IF EXISTS (
        SELECT 1 FROM public.organization_profiles op
        WHERE op.id = old.organization_id
          AND (op.is_renewal_test_account = true OR op.organization_email = 'renewal.test@lydo-connect.local')
      ) THEN
        RETURN old;
      END IF;
    END IF;
    IF old.status IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Terminal renewal records cannot be deleted.';
    END IF;
    RETURN old;
  END IF;

  RETURN new;
END;
$$;

-- ==============================================================================
-- 4. RPC: GET OR CREATE RENEWAL TEST ACCOUNT
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
  _submission record;
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

  -- 4. Create test account and organization if not exists
  IF _org.id IS NULL THEN
    _is_new := true;

    -- Look for existing auth user
    SELECT id INTO _user_id
    FROM auth.users
    WHERE email = 'renewal.test@lydo-connect.local'
    LIMIT 1;

    -- Create auth user if not present
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
    END IF;

    -- Create user profile if not present
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
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Create organization profile
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
      _org.id::text,
      'Administrator initialized dedicated Y-TRACE Renewal Test Account.'
    );
  ELSE
    -- Ensure test flag is true
    IF NOT _org.is_renewal_test_account THEN
      UPDATE public.organization_profiles
      SET is_renewal_test_account = true
      WHERE id = _org.id;
    END IF;

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
    SELECT * INTO _submission
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
      'submissionId', _submission.id
    ) ELSE NULL END
  );
END;
$$;

-- ==============================================================================
-- 5. RPC: PREPARE RENEWAL TEST SCENARIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_prepare_renewal_test_scenario(
  p_session_token text,
  p_target_expiration_days integer DEFAULT 30,
  p_custom_expiration_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org record;
  _acc record;
  _target_end_date date;
  _today date := current_date;
  _days_diff integer;
  _window_status text;
  _can_draft boolean;
  _can_submit boolean;
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

  -- 3. Target strictly the designated renewal test account
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account = true
     OR organization_email = 'renewal.test@lydo-connect.local'
  LIMIT 1;

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Renewal Test Organization does not exist. Please create it first.';
  END IF;

  -- 4. Calculate target expiration date
  IF p_custom_expiration_date IS NOT NULL THEN
    _target_end_date := p_custom_expiration_date;
  ELSE
    _target_end_date := _today + (coalesce(p_target_expiration_days, 30) || ' days')::interval;
  END IF;

  -- 5. Enable transaction-scoped test scenario prep override
  PERFORM set_config('app.allow_test_scenario_prep', 'true', true);

  -- 6. Lock and update current active accreditation
  SELECT * INTO _acc
  FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND status = 'active'
  ORDER BY term_number DESC
  LIMIT 1
  FOR UPDATE;

  IF _acc.id IS NULL THEN
    -- If no active accreditation exists, create Term 1
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
      _target_end_date,
      '01-23-999',
      'active',
      _admin_id,
      clock_timestamp() - interval '3 years'
    ) RETURNING * INTO _acc;
  ELSE
    UPDATE public.organization_accreditations
    SET end_date = _target_end_date
    WHERE id = _acc.id;
  END IF;

  -- 7. Sync profile projection
  UPDATE public.organization_profiles
  SET
    current_accreditation_id = _acc.id,
    accreditation_expires_at = _target_end_date::timestamptz,
    profile_status = 'verified'
  WHERE id = _org.id;

  -- 8. Record Activity Log
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
    'prepared_renewal_test_scenario',
    'organization',
    _org.id::text,
    format('Prepared renewal test scenario with target expiration date: %s (%s days from today).', _target_end_date, _target_end_date - _today)
  );

  -- 9. Evaluate eligibility
  _days_diff := _target_end_date - _today;
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

  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'accreditationId', _acc.id,
    'startDate', _acc.start_date,
    'endDate', _target_end_date,
    'daysRemaining', GREATEST(0, _days_diff),
    'derivedStatus', public.derive_accreditation_status('active', _target_end_date, _today),
    'eligibility', jsonb_build_object(
      'canDraft', _can_draft,
      'canSubmit', _can_submit,
      'windowStatus', _window_status,
      'daysUntilOpen', CASE WHEN _days_diff > 90 THEN _days_diff - 90 ELSE NULL END,
      'daysPastExpiry', CASE WHEN _days_diff < 0 THEN ABS(_days_diff) ELSE NULL END
    )
  );
END;
$$;

-- ==============================================================================
-- 6. RPC: RESTORE RENEWAL TEST SCENARIO (Pre-test normal 3-year term)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_restore_renewal_test_scenario(
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
  _acc record;
  _restored_end_date date;
  _today date := current_date;
BEGIN
  -- 1. Validate Admin Authorization
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Renewal Test Environment is disabled in production.';
  END IF;

  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account = true
     OR organization_email = 'renewal.test@lydo-connect.local'
  LIMIT 1;

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Renewal Test Organization does not exist.';
  END IF;

  -- Enable test override
  PERFORM set_config('app.allow_test_scenario_prep', 'true', true);

  SELECT * INTO _acc
  FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND status = 'active'
  ORDER BY term_number DESC
  LIMIT 1
  FOR UPDATE;

  IF _acc.id IS NOT NULL THEN
    -- Restore to standard 3-year term from start date
    _restored_end_date := (_acc.start_date + interval '3 years')::date;

    UPDATE public.organization_accreditations
    SET end_date = _restored_end_date
    WHERE id = _acc.id;

    UPDATE public.organization_profiles
    SET accreditation_expires_at = _restored_end_date::timestamptz
    WHERE id = _org.id;
  END IF;

  -- Record Activity Log
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
    'restored_renewal_test_scenario',
    'organization',
    _org.id::text,
    'Restored renewal test scenario to default 3-year term.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'endDate', _restored_end_date,
    'derivedStatus', public.derive_accreditation_status('active', _restored_end_date, _today)
  );
END;
$$;

-- ==============================================================================
-- 7. RPC: RESET RENEWAL TEST SCENARIO (Clean state for fresh Cycle 2 run)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_renewal_test_scenario(
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
  _term1 record;
  _target_end_date date;
  _today date := current_date;
BEGIN
  -- 1. Validate Admin Authorization
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Renewal Test Environment is disabled in production.';
  END IF;

  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account = true
     OR organization_email = 'renewal.test@lydo-connect.local'
  LIMIT 1;

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Renewal Test Organization does not exist.';
  END IF;

  -- Enable test override
  PERFORM set_config('app.allow_test_scenario_prep', 'true', true);

  -- 1. Clean up test document submissions and files
  DELETE FROM public.document_submission_files
  WHERE submission_id IN (
    SELECT id FROM public.document_submissions
    WHERE organization_id = _org.id AND submission_scope = 'renewal'
  );

  DELETE FROM public.document_submissions
  WHERE organization_id = _org.id AND submission_scope = 'renewal';

  -- 2. Clean up test renewal applications
  DELETE FROM public.organization_renewals
  WHERE organization_id = _org.id;

  -- 3. Clean up test notifications
  DELETE FROM public.notifications
  WHERE organization_id = _org.id
    AND related_type = 'renewal';

  -- 4. Clean up any terms > 1 generated from previous approval tests
  DELETE FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND term_number > 1;

  -- 5. Reactivate Term 1 and place it inside the renewal window (+30 days)
  _target_end_date := (_today + interval '30 days')::date;

  SELECT * INTO _term1
  FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND term_number = 1
  LIMIT 1;

  IF _term1.id IS NOT NULL THEN
    UPDATE public.organization_accreditations
    SET
      status = 'active',
      end_date = _target_end_date,
      certificate_urn = '01-23-999'
    WHERE id = _term1.id;
  ELSE
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
      _target_end_date,
      '01-23-999',
      'active',
      _admin_id,
      clock_timestamp() - interval '3 years'
    ) RETURNING * INTO _term1;
  END IF;

  -- 6. Update profile projection
  UPDATE public.organization_profiles
  SET
    current_accreditation_id = _term1.id,
    urn = '01-23-999',
    urn_normalized = '01-23-999',
    accreditation_start_date = _term1.start_date,
    accreditation_expires_at = _target_end_date::timestamptz,
    profile_status = 'verified'
  WHERE id = _org.id;

  -- Record Activity Log
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
    'reset_renewal_test_scenario',
    'organization',
    _org.id::text,
    'Reset renewal test scenario to fresh Cycle 2 test state.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'termNumber', 1,
    'endDate', _target_end_date,
    'derivedStatus', 'expiring_soon',
    'eligibility', jsonb_build_object(
      'canDraft', true,
      'canSubmit', true,
      'windowStatus', 'open',
      'daysRemaining', 30
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_development_or_test_environment() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_prepare_renewal_test_scenario(text, integer, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_renewal_test_scenario(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO anon, authenticated, service_role;
