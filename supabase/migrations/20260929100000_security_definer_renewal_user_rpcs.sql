-- ==============================================================================
-- Migration: 20260929100000_security_definer_renewal_user_rpcs.sql
-- Description: Makes user renewal RPCs SECURITY DEFINER while maintaining strict caller ownership verification
-- ==============================================================================

-- 1. USER RPC: START / GET RENEWAL DRAFT
CREATE OR REPLACE FUNCTION public.user_start_or_get_renewal_draft(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid;
  _profile record;
  _curr_acc record;
  _existing_renewal record;
  _submission record;
  _today date := current_date;
  _end_date date;
  _target_cycle integer;
  _new_renewal record;
  _new_submission record;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  -- Lock organization profile to serialize draft creation
  SELECT op.id, op.user_id, op.profile_status, op.current_accreditation_id, op.accreditation_expires_at
  INTO _profile
  FROM public.organization_profiles op
  WHERE op.id = p_organization_id
  FOR UPDATE;

  IF _profile.id IS NULL THEN
    RAISE EXCEPTION 'Organization profile not found.';
  END IF;

  IF _profile.user_id <> _caller_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _profile.profile_status <> 'verified' THEN
    RAISE EXCEPTION 'Organization must have verified profile status to initiate renewal.';
  END IF;

  -- Resolve authoritative accreditation term
  SELECT oa.*
  INTO _curr_acc
  FROM public.organization_accreditations oa
  WHERE oa.id = _profile.current_accreditation_id
    AND oa.organization_id = p_organization_id
  LIMIT 1;

  IF _curr_acc.id IS NULL THEN
    SELECT oa.*
    INTO _curr_acc
    FROM public.organization_accreditations oa
    WHERE oa.organization_id = p_organization_id
      AND oa.status = 'active'
    ORDER BY oa.term_number DESC
    LIMIT 1;
  END IF;

  IF _curr_acc.id IS NULL THEN
    RAISE EXCEPTION 'No authoritative accreditation term found for this organization.';
  END IF;

  IF _curr_acc.status = 'revoked' THEN
    RAISE EXCEPTION 'Accreditation has been revoked. Organization cannot renew and must contact LYDO.';
  END IF;

  _end_date := _curr_acc.end_date;

  -- Verify renewal window: [end_date - 90 days, end_date + 180 days]
  IF _today < (_end_date - 90) THEN
    RAISE EXCEPTION 'Renewal window is not yet open. Renewals open 90 days prior to expiration (on %).', (_end_date - 90);
  END IF;

  IF _today > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal window has expired (180 days past expiration). Full re-registration is required.';
  END IF;

  -- Check if a non-terminal renewal is already in progress
  SELECT *
  INTO _existing_renewal
  FROM public.organization_renewals
  WHERE organization_id = p_organization_id
    AND status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted')
  ORDER BY cycle_number DESC
  LIMIT 1;

  IF _existing_renewal.id IS NOT NULL THEN
    SELECT * INTO _submission
    FROM public.document_submissions
    WHERE renewal_id = _existing_renewal.id
    LIMIT 1;

    RETURN jsonb_build_object(
      'renewal', row_to_json(_existing_renewal),
      'submission', row_to_json(_submission),
      'is_existing', true
    );
  END IF;

  -- Calculate target cycle number (strictly current_term.term_number + 1)
  _target_cycle := _curr_acc.term_number + 1;

  -- Verify no terminal rejected renewal exists for this cycle
  IF EXISTS (
    SELECT 1 FROM public.organization_renewals
    WHERE organization_id = p_organization_id
      AND cycle_number = _target_cycle
      AND status = 'rejected'
  ) THEN
    RAISE EXCEPTION 'Renewal application for Cycle % was rejected. Organization must contact LYDO directly.', _target_cycle;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_renewals
    WHERE organization_id = p_organization_id
      AND cycle_number = _target_cycle
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Cycle % is already approved.', _target_cycle;
  END IF;

  -- Create single draft renewal application
  INSERT INTO public.organization_renewals (
    organization_id,
    cycle_number,
    current_accreditation_id,
    status
  ) VALUES (
    p_organization_id,
    _target_cycle,
    _curr_acc.id,
    'draft'
  ) RETURNING * INTO _new_renewal;

  -- Create single linked document submission packet
  INSERT INTO public.document_submissions (
    organization_id,
    submitted_by,
    status,
    user_confirmed,
    submission_scope,
    renewal_id
  ) VALUES (
    p_organization_id,
    _caller_id,
    'draft',
    false,
    'renewal',
    _new_renewal.id
  ) RETURNING * INTO _new_submission;

  RETURN jsonb_build_object(
    'renewal', row_to_json(_new_renewal),
    'submission', row_to_json(_new_submission),
    'is_existing', false
  );
END;
$$;

-- 2. USER RPC: SUBMIT RENEWAL
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

  -- Insert activity log with uuid related_id
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    auth.uid(),
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

-- 3. USER RPC: RESUBMIT RENEWAL
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

  -- Insert activity log with uuid related_id
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    auth.uid(),
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

-- 4. USER HELPER: REPLACE DOCUMENT FILE
CREATE OR REPLACE FUNCTION public.user_replace_document_submission_file(
  _file_id uuid,
  _new_file_url text,
  _new_file_name text,
  _new_file_type text,
  _new_file_size numeric DEFAULT NULL
)
RETURNS public.document_submission_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_file record;
  _submission record;
  _owner_id uuid;
  _history jsonb;
  _history_entry jsonb;
  _updated_row public.document_submission_files;
BEGIN
  SELECT * INTO _old_file
  FROM public.document_submission_files
  WHERE id = _file_id;

  IF _old_file.id IS NULL THEN
    RAISE EXCEPTION 'Document file not found.';
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE id = _old_file.submission_id;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'Parent document submission not found.';
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _submission.organization_id;

  IF _owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this submission.';
  END IF;

  -- Build history entry preserving historical evidence
  _history_entry := jsonb_build_object(
    'action', 'replaced',
    'previousFileName', _old_file.file_name,
    'previousFileUrl', _old_file.file_url,
    'previousFileType', _old_file.file_type,
    'previousFileSize', _old_file.file_size,
    'previousStatus', _old_file.admin_status,
    'adminRemarks', _old_file.admin_remarks,
    'reviewedAt', _old_file.reviewed_at,
    'replacedAt', clock_timestamp()
  );

  _history := coalesce(_old_file.revision_history, '[]'::jsonb) || jsonb_build_array(_history_entry);

  UPDATE public.document_submission_files
  SET
    file_url = _new_file_url,
    file_name = _new_file_name,
    file_type = _new_file_type,
    file_size = coalesce(_new_file_size, _old_file.file_size),
    admin_status = 'submitted',
    admin_remarks = NULL,
    reviewed_at = NULL,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  WHERE id = _file_id
  RETURNING * INTO _updated_row;

  RETURN _updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_start_or_get_renewal_draft(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_submit_renewal(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid, text, text, text, numeric) TO authenticated, anon, service_role;
