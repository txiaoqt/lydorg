-- Migration: 20260929160000_fix_admin_prepare_renewal_test_scenario_param.sql
-- Description: Corrects admin_prepare_renewal_test_scenario parameter name to p_expiration_days_ahead,
--              establishes authoritative calculate_organization_renewal_eligibility function,
--              and prevents overloaded duplicate RPCs.

-- ==============================================================================
-- 1. AUTHORITATIVE RENEWAL ELIGIBILITY CALCULATION FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.calculate_organization_renewal_eligibility(
  _org_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _today date := current_date;
  _org record;
  _acc record;
  _end_date date;
  _days_diff integer;
  _window_status text;
  _can_draft boolean;
  _can_submit boolean;
  _days_until_open integer := NULL;
  _days_past_expiry integer := NULL;
  _reason text;
BEGIN
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE id = _org_id;

  IF _org.id IS NULL THEN
    RETURN jsonb_build_object(
      'canDraft', false,
      'canSubmit', false,
      'windowStatus', 'too_early',
      'reason', 'Organization profile not found.',
      'daysRemaining', NULL,
      'daysUntilOpen', NULL,
      'daysPastExpiry', NULL,
      'expiresAt', NULL
    );
  END IF;

  -- Resolve authoritative active accreditation term
  SELECT * INTO _acc
  FROM public.organization_accreditations
  WHERE organization_id = _org_id
    AND status = 'active'
  ORDER BY term_number DESC
  LIMIT 1;

  IF _acc.id IS NULL THEN
    IF _org.accreditation_expires_at IS NOT NULL THEN
      _end_date := _org.accreditation_expires_at::date;
    ELSE
      RETURN jsonb_build_object(
        'canDraft', false,
        'canSubmit', false,
        'windowStatus', 'too_early',
        'reason', 'No authoritative accreditation expiration date found.',
        'daysRemaining', NULL,
        'daysUntilOpen', NULL,
        'daysPastExpiry', NULL,
        'expiresAt', NULL
      );
    END IF;
  ELSE
    _end_date := _acc.end_date;
  END IF;

  _days_diff := _end_date - _today;

  -- Authoritative Window Rules:
  -- 1. Window opens: 90 calendar days before expiry
  -- 2. Active Window: [end_date - 90, end_date]
  -- 3. Late Renewal (Grace Period): (end_date, end_date + 180]
  -- 4. Cutoff exceeded (Lapsed): > 180 days past expiry
  IF _days_diff > 90 THEN
    _window_status := 'too_early';
    _can_draft := false;
    _can_submit := false;
    _days_until_open := _days_diff - 90;
    _reason := format('Renewal window opens 90 days before expiry (in %s days).', _days_until_open);
  ELSIF _days_diff >= 0 THEN
    _window_status := 'open';
    _can_draft := true;
    _can_submit := true;
    _reason := 'Renewal window is open.';
  ELSIF ABS(_days_diff) <= 180 THEN
    _window_status := 'expired';
    _can_draft := true;
    _can_submit := true;
    _days_past_expiry := ABS(_days_diff);
    _reason := format('Late renewal allowed within 180 days of expiry (%s days expired).', _days_past_expiry);
  ELSE
    _window_status := 'lapsed';
    _can_draft := false;
    _can_submit := false;
    _days_past_expiry := ABS(_days_diff);
    _reason := 'Late renewal window expired (180 days past expiry). Full re-registration is required.';
  END IF;

  RETURN jsonb_build_object(
    'canDraft', _can_draft,
    'canSubmit', _can_submit,
    'windowStatus', _window_status,
    'daysRemaining', GREATEST(0, _days_diff),
    'daysUntilOpen', _days_until_open,
    'daysPastExpiry', _days_past_expiry,
    'expiresAt', _end_date,
    'reason', _reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_organization_renewal_eligibility(uuid) TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. DROP OLD RPC TO PREVENT DUPLICATE OVERLOAD
-- ==============================================================================
DROP FUNCTION IF EXISTS public.admin_prepare_renewal_test_scenario(text, integer, date);

-- ==============================================================================
-- 3. CANONICAL RPC: PREPARE RENEWAL TEST SCENARIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_prepare_renewal_test_scenario(
  p_session_token text,
  p_expiration_days_ahead integer DEFAULT 30,
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
  _eligibility jsonb;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Zero execution in production
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Renewal Test Environment is disabled in production.';
  END IF;

  -- Target ONLY designated renewal test organization
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account = true
     OR organization_email = 'renewal.test@pasigcity.gov.ph'
  LIMIT 1;

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Renewal Test Organization does not exist. Please create it first.';
  END IF;

  -- Target expiration calculation
  IF p_custom_expiration_date IS NOT NULL THEN
    _target_end_date := p_custom_expiration_date;
  ELSE
    _target_end_date := _today + (coalesce(p_expiration_days_ahead, 30) || ' days')::interval;
  END IF;

  -- Allow test mutation through accreditation immutability trigger
  PERFORM set_config('app.allow_test_scenario_prep', 'true', true);

  -- Lock and update active accreditation
  SELECT * INTO _acc
  FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND status = 'active'
  ORDER BY term_number DESC
  LIMIT 1
  FOR UPDATE;

  IF _acc.id IS NULL THEN
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

  -- Synchronize profile projection
  UPDATE public.organization_profiles
  SET
    current_accreditation_id = _acc.id,
    accreditation_expires_at = _target_end_date::timestamptz,
    profile_status = 'verified'
  WHERE id = _org.id;

  -- Log test administration activity
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
    _org.id,
    format('Prepared renewal test scenario with target expiration date: %s (%s days from today).', _target_end_date, _target_end_date - _today)
  );

  -- Authoritative Renewal Eligibility Check
  _eligibility := public.calculate_organization_renewal_eligibility(_org.id);

  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'accreditationId', _acc.id,
    'startDate', _acc.start_date,
    'endDate', _target_end_date,
    'daysRemaining', GREATEST(0, _target_end_date - _today),
    'derivedStatus', public.derive_accreditation_status('active', _target_end_date, _today),
    'eligibility', _eligibility
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_prepare_renewal_test_scenario(text, integer, date) TO anon, authenticated, service_role;

-- ==============================================================================
-- 4. UPDATE GET_OR_CREATE AND RESET TO USE THE SAME AUTHORITATIVE ELIGIBILITY
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
  _term1_acc record;
  _today date := current_date;
  _target_end_date date := _today + interval '30 days';
  _eligibility jsonb;
BEGIN
  -- Authenticate admin session
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
     OR organization_email = 'renewal.test@pasigcity.gov.ph'
  LIMIT 1;

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Renewal Test Organization does not exist. Please create it first.';
  END IF;

  PERFORM set_config('app.allow_test_scenario_prep', 'true', true);

  -- 1. Remove test renewal draft applications and documents
  DELETE FROM public.document_submission_files
  WHERE submission_id IN (
    SELECT id FROM public.document_submissions
    WHERE organization_id = _org.id
      AND submission_scope = 'renewal'
  );

  DELETE FROM public.document_submissions
  WHERE organization_id = _org.id
    AND submission_scope = 'renewal';

  DELETE FROM public.organization_renewals
  WHERE organization_id = _org.id;

  -- 2. Remove accreditation terms > 1 generated during testing
  DELETE FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND term_number > 1;

  -- 3. Lock and reset Term 1 to active with +30 days expiry
  SELECT * INTO _term1_acc
  FROM public.organization_accreditations
  WHERE organization_id = _org.id
    AND term_number = 1
  FOR UPDATE;

  IF _term1_acc.id IS NULL THEN
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
    ) RETURNING * INTO _term1_acc;
  ELSE
    UPDATE public.organization_accreditations
    SET
      status = 'active',
      start_date = (_today - interval '3 years')::date,
      end_date = _target_end_date,
      certificate_urn = '01-23-999'
    WHERE id = _term1_acc.id;
  END IF;

  -- 4. Update Profile
  UPDATE public.organization_profiles
  SET
    current_accreditation_id = _term1_acc.id,
    accreditation_start_date = _term1_acc.start_date,
    accreditation_expires_at = _target_end_date::timestamptz,
    profile_status = 'verified',
    urn = '01-23-999',
    urn_normalized = public.normalize_urn('01-23-999'),
    organization_identifier_number = '01-23-999',
    urn_review_status = 'verified'
  WHERE id = _org.id;

  -- 5. Audit Log
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
    _org.id,
    format('Reset renewal test scenario for %s to Cycle 2 ready state (+30 days expiration: %s).', _org.organization_name, _target_end_date)
  );

  -- 6. Authoritative Renewal Eligibility Check
  _eligibility := public.calculate_organization_renewal_eligibility(_org.id);

  RETURN jsonb_build_object(
    'success', true,
    'organizationId', _org.id,
    'termNumber', 1,
    'endDate', _target_end_date,
    'derivedStatus', public.derive_accreditation_status('active', _target_end_date, _today),
    'eligibility', _eligibility
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO anon, authenticated, service_role;
