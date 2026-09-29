-- ==============================================================================
-- Migration: 20260929110000_fix_user_renewal_activity_logs_actor_null.sql
-- Description: Sets actor_user_id to NULL on organization user activity log insertions
-- ==============================================================================

-- 1. USER RPC: SUBMIT RENEWAL
CREATE OR REPLACE FUNCTION public.user_submit_renewal(
  p_renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _req_type record;
  _now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status <> 'draft' THEN
    RAISE EXCEPTION 'Renewal cannot be submitted from status "%". Expected "draft".', _renewal.status;
  END IF;

  -- Check late renewal cutoff (180 days past expiration)
  SELECT oa.end_date INTO _end_date
  FROM public.organization_accreditations oa
  WHERE oa.id = _renewal.current_accreditation_id;

  IF current_date > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal cutoff has passed (180 days past expiration). Application can no longer be submitted.';
  END IF;

  -- Fetch and lock document submission packet
  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No document submission packet found for this renewal.';
  END IF;

  -- Verify all mandatory renewal documents have valid uploaded files
  FOR _req_type IN
    SELECT rdt.id, rdt.name
    FROM public.required_document_types rdt
    WHERE rdt.is_active = true
      AND coalesce(rdt.is_required, true) = true
      AND rdt.scope IN ('renewal', 'both')
      AND rdt.template_scope = 'document_submission'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.document_submission_files dsf
      WHERE dsf.submission_id = _submission.id
        AND dsf.document_type_id = _req_type.id
        AND nullif(trim(dsf.file_url), '') IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Missing required document: %', _req_type.name;
    END IF;
  END LOOP;

  -- Advance renewal status to submitted
  UPDATE public.organization_renewals
  SET
    status = 'submitted',
    submitted_at = _now,
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Advance document submission status to submitted
  UPDATE public.document_submissions
  SET
    status = 'submitted',
    submitted_at = _now,
    updated_at = _now
  WHERE id = _submission.id;

  -- Insert activity log with NULL actor_user_id (org user action)
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_submitted',
    'renewal',
    p_renewal_id,
    format('Organization submitted renewal application for Cycle %s.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'submitted_at', _now
  );
END;
$$;

-- 2. USER RPC: RESUBMIT RENEWAL
CREATE OR REPLACE FUNCTION public.user_resubmit_renewal(
  p_renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  END IF;

  -- Verify within 180-day window
  SELECT oa.end_date INTO _end_date
  FROM public.organization_accreditations oa
  WHERE oa.id = _renewal.current_accreditation_id;

  IF current_date > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal cutoff has passed (180 days past expiration). Resubmission is no longer allowed.';
  END IF;

  -- Verify all flagged documents have been replaced
  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No document submission packet found for this renewal.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.document_submission_files dsf
    WHERE dsf.submission_id = _submission.id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'All documents marked for revision or rejection must be replaced before resubmission.';
  END IF;

  -- Update renewal state to resubmitted
  UPDATE public.organization_renewals
  SET
    status = 'resubmitted',
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update document submission state
  UPDATE public.document_submissions
  SET
    status = 'submitted',
    updated_at = _now
  WHERE id = _submission.id;

  -- Insert activity log with NULL actor_user_id (org user action)
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id,
    format('Organization resubmitted renewal application for Cycle %s after revisions.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'resubmitted_at', _now
  );
END;
$$;
