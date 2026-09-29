-- ==============================================================================
-- Migration: 20260929090000_fix_renewal_rpcs_activity_log_uuid.sql
-- Description: Corrects related_id type casting (uuid instead of text) in renewal RPCs
-- ==============================================================================

-- 1. USER RPC: SUBMIT RENEWAL
CREATE OR REPLACE FUNCTION public.user_submit_renewal(
  p_renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
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

-- 2. USER RPC: RESUBMIT RENEWAL
CREATE OR REPLACE FUNCTION public.user_resubmit_renewal(
  p_renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
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

-- 3. ADMIN RPC: REQUEST REVISION
CREATE OR REPLACE FUNCTION public.admin_request_renewal_revision(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _renewal record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text := trim(p_admin_remarks);
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF length(_remarks) < 10 THEN
    RAISE EXCEPTION 'Meaningful revision remarks of at least 10 characters are required.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Revision can only be requested from reviewable status. Current status: "%".', _renewal.status;
  END IF;

  -- Ensure at least one file is marked needs_revision or rejected
  IF NOT EXISTS (
    SELECT 1
    FROM public.document_submissions ds
    JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
    WHERE ds.renewal_id = p_renewal_id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'At least one document file must be marked for revision or rejection before requesting revision.';
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  -- Update renewal state
  UPDATE public.organization_renewals
  SET
    status = 'needs_revision',
    admin_remarks = _remarks,
    reviewed_by = _admin_id,
    reviewed_at = _now,
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update document submission packet state
  UPDATE public.document_submissions
  SET
    status = 'needs_revision',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = _remarks,
    updated_at = _now
  WHERE renewal_id = p_renewal_id;

  -- Send notification with uuid related_id
  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Revision Requested',
      format('Revisions requested for renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
      'document_revision',
      'renewal',
      p_renewal_id
    );
  END IF;

  -- Insert activity log with uuid related_id
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _admin_id,
    _renewal.organization_id,
    'renewal_needs_revision',
    'renewal',
    p_renewal_id,
    format('Admin requested revisions for renewal Cycle %s: %s', _renewal.cycle_number, _remarks)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'needs_revision'
  );
END;
$$;

-- 4. ADMIN RPC: REJECT RENEWAL
CREATE OR REPLACE FUNCTION public.admin_reject_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _renewal record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text := trim(p_admin_remarks);
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF length(_remarks) < 10 THEN
    RAISE EXCEPTION 'Detailed rejection remarks of at least 10 characters are required.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Renewal can only be rejected from a reviewable status. Current status: "%".', _renewal.status;
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  UPDATE public.organization_renewals
  SET
    status = 'rejected',
    admin_remarks = _remarks,
    reviewed_by = _admin_id,
    reviewed_at = _now,
    updated_at = _now
  WHERE id = p_renewal_id;

  UPDATE public.document_submissions
  SET
    status = 'rejected_red',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = _remarks,
    updated_at = _now
  WHERE renewal_id = p_renewal_id;

  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_rejected', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Application Rejected',
      format('Renewal application for Cycle %s was rejected: %s. Please contact the LYDO office directly.', _renewal.cycle_number, _remarks),
      'rejected',
      'renewal',
      p_renewal_id
    );
  END IF;

  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _admin_id,
    _renewal.organization_id,
    'renewal_rejected',
    'renewal',
    p_renewal_id,
    format('Admin rejected renewal application for Cycle %s: %s', _renewal.cycle_number, _remarks)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'rejected'
  );
END;
$$;

-- 5. ADMIN RPC: APPROVE RENEWAL
CREATE OR REPLACE FUNCTION public.admin_approve_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_certificate_urn text DEFAULT NULL,
  p_admin_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _now timestamptz := clock_timestamp();
  _today date := current_date;
  _renewal record;
  _curr_acc record;
  _target_org record;
  _submission record;
  _owner_id uuid;
  _old_urn text;
  _official_urn text;
  _anchor_cutoff date;
  _start_date date;
  _end_date date;
  _new_accreditation_id uuid;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Lock Renewal Record
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Renewal is not in a reviewable status: %', _renewal.status;
  END IF;

  -- Lock Organization Profile
  SELECT * INTO _target_org
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization profile not found.';
  END IF;

  _old_urn := coalesce(_target_org.urn, _target_org.organization_identifier_number, '');

  -- Lock Current Accreditation Record if present
  IF _renewal.current_accreditation_id IS NOT NULL THEN
    SELECT * INTO _curr_acc
    FROM public.organization_accreditations
    WHERE id = _renewal.current_accreditation_id
    FOR UPDATE;
  ELSE
    SELECT * INTO _curr_acc
    FROM public.organization_accreditations
    WHERE organization_id = _renewal.organization_id
      AND status = 'active'
    ORDER BY term_number DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- Compute Term Dates (Standard Continuous Protection Anchor: 3-Year Terms)
  IF _curr_acc.id IS NOT NULL AND _curr_acc.end_date IS NOT NULL THEN
    _anchor_cutoff := (_curr_acc.end_date + 30);
    IF _today <= _anchor_cutoff THEN
      _start_date := _curr_acc.end_date;
      _end_date := (_curr_acc.end_date + interval '3 years')::date;
    ELSE
      _start_date := _today;
      _end_date := (_today + interval '3 years')::date;
    END IF;
  ELSE
    _start_date := _today;
    _end_date := (_today + interval '3 years')::date;
  END IF;

  -- Generate or use URN
  IF p_certificate_urn IS NOT NULL AND trim(p_certificate_urn) <> '' THEN
    _official_urn := trim(p_certificate_urn);
  ELSE
    _official_urn := public.generate_unique_urn(_target_org.barangay, _now);
  END IF;

  IF _official_urn IS NULL OR trim(_official_urn) = '' THEN
    RAISE EXCEPTION 'Failed to generate authoritative URN for renewal approval.';
  END IF;

  -- Supersede previous active accreditation term(s)
  UPDATE public.organization_accreditations
  SET status = 'superseded'
  WHERE organization_id = _renewal.organization_id
    AND status = 'active';

  -- Insert New Authoritative Accreditation Term into the Ledger
  INSERT INTO public.organization_accreditations (
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
  ) VALUES (
    _renewal.organization_id,
    _renewal.cycle_number,
    _start_date,
    _end_date,
    _official_urn,
    'active',
    false,
    _admin_id,
    _now,
    _now
  ) RETURNING id INTO _new_accreditation_id;

  -- Update Renewal Record
  UPDATE public.organization_renewals
  SET
    status = 'approved',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = p_admin_remarks,
    certificate_urn = _official_urn,
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update Document Submission if present
  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'approved',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = p_admin_remarks,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  -- Update Organization Profile to newly assigned URN and validity period
  UPDATE public.organization_profiles
  SET
    profile_status = 'verified',
    urn = _official_urn,
    urn_normalized = public.normalize_urn(_official_urn),
    organization_identifier_number = _official_urn,
    urn_review_status = 'verified',
    current_accreditation_id = _new_accreditation_id,
    accreditation_start_date = _start_date,
    accreditation_expires_at = _end_date,
    valid_until = (_end_date::timestamptz),
    verified_at = _now,
    updated_at = _now
  WHERE id = _renewal.organization_id;

  _owner_id := _target_org.user_id;

  -- Send notification with uuid related_id
  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_approved', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Approved',
      format('Your organization renewal for Cycle %s has been approved! Your new official URN is %s.', _renewal.cycle_number, _official_urn),
      'renewal_approved',
      'renewal',
      p_renewal_id
    );
  END IF;

  -- Insert approval activity log with uuid related_id
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    metadata
  ) VALUES (
    _admin_id,
    _renewal.organization_id,
    'renewal_approved',
    'renewal',
    p_renewal_id,
    format('Admin approved renewal application for Cycle %s. New term %s - %s issued.', _renewal.cycle_number, _start_date, _end_date),
    jsonb_build_object(
      'previous_urn', _old_urn,
      'new_urn', _official_urn,
      'cycle_number', _renewal.cycle_number,
      'start_date', _start_date,
      'end_date', _end_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'cycle_number', _renewal.cycle_number,
    'official_urn', _official_urn,
    'new_accreditation_id', _new_accreditation_id,
    'start_date', _start_date,
    'end_date', _end_date,
    'status', 'approved'
  );
END;
$$;
