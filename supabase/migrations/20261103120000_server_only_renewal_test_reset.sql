-- Server-only replacement for the contained admin_reset_renewal_test_scenario.
-- Callable only with the service-role key (scripts/reset-renewal-test.cjs), never from the browser.
-- Hard-wired to the one renewal test organization; refuses anything else.
--
-- Production accreditation terms and finished renewals are immutable, so this never rewrites or
-- deletes history. It cancels an unfinished renewal and appends a fresh active term expiring in
-- p_days, which reopens the renewal window (renewals target current term + 1).

CREATE OR REPLACE FUNCTION public.server_reset_renewal_test_org(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id constant uuid := '8170959f-2bb8-40ea-8ce8-31deb514de17';
  _org record;
  _today date := current_date;
  _end_date date;
  _next_term integer;
  _new_term record;
BEGIN
  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'Days must be between 1 and 365.';
  END IF;
  _end_date := _today + p_days;

  SELECT * INTO _org FROM public.organization_profiles WHERE id = _org_id FOR UPDATE;
  IF _org.id IS NULL
     OR _org.organization_name <> 'Y-TRACE Renewal Test Organization'
     OR _org.is_renewal_test_account IS NOT TRUE THEN
    RAISE EXCEPTION 'Renewal test organization not found or no longer marked as the test account.';
  END IF;

  -- 1. Drop an unfinished renewal (finished ones stay as history).
  DELETE FROM public.document_submission_files
  WHERE submission_id IN (
    SELECT s.id FROM public.document_submissions s
    JOIN public.organization_renewals r ON r.id = s.renewal_id
    WHERE r.organization_id = _org_id
      AND r.status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted')
  );
  DELETE FROM public.document_submissions s
  USING public.organization_renewals r
  WHERE r.id = s.renewal_id
    AND r.organization_id = _org_id
    AND r.status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted');
  DELETE FROM public.organization_renewals
  WHERE organization_id = _org_id
    AND status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted');

  -- 2. Retire the current term and append a fresh one expiring in p_days.
  UPDATE public.organization_accreditations
  SET status = 'superseded'
  WHERE organization_id = _org_id AND status = 'active';

  SELECT COALESCE(MAX(term_number), 0) + 1 INTO _next_term
  FROM public.organization_accreditations WHERE organization_id = _org_id;

  INSERT INTO public.organization_accreditations (
    organization_id, term_number, start_date, end_date, certificate_urn, status, approved_at
  ) VALUES (
    _org_id, _next_term, (_today - interval '3 years')::date, _end_date, '01-23-999', 'active', clock_timestamp()
  ) RETURNING * INTO _new_term;

  INSERT INTO public.activity_logs (organization_id, action, related_type, related_id, description)
  VALUES (
    _org_id, 'reset_renewal_test_scenario', 'organization', _org_id,
    format('Reset renewal test scenario for %s: new test term %s expiring %s (+%s days) via server script.',
      _org.organization_name, _next_term, _end_date, p_days)
  );

  RETURN jsonb_build_object(
    'organizationId', _org_id,
    'termNumber', _next_term,
    'endDate', _end_date,
    'eligibility', public.calculate_organization_renewal_eligibility(_org_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_reset_renewal_test_org(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_reset_renewal_test_org(integer) TO service_role;
