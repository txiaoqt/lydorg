-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_role_permissions(_session_token text, _role_id smallint, _permission_codes text[])
 RETURNS TABLE(id smallint, code text, permission_codes text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _target_role_code text;
  _target_role_label text;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_accounts a
    JOIN public.roles r ON r.id = a.role_id
    WHERE a.id = _admin_id AND r.code = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super administrators may manage role permissions.';
  END IF;

  SELECT roles.code, roles.label INTO _target_role_code, _target_role_label
  FROM public.roles
  WHERE roles.id = _role_id;

  IF _target_role_code = 'super_admin' THEN
    RAISE EXCEPTION 'Super Admin permissions cannot be modified.';
  END IF;

  UPDATE public.roles
  SET permission_codes = _permission_codes
  WHERE roles.id = _role_id;

  IF public.is_audit_logging_enabled('permission') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    )
    VALUES (
      _admin_id,
      NULL,
      'updated_role_permissions',
      'role',
      NULL,
      'Updated permissions for role "' || coalesce(_target_role_label, _target_role_code) || '" (' || coalesce(array_length(_permission_codes, 1), 0) || ' permissions assigned).',
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN QUERY
  SELECT roles.id, roles.code::text, roles.permission_codes
  FROM public.roles
  WHERE roles.id = _role_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_replace_document_submission_file(_file_id uuid, _new_file_url text, _new_file_name text, _new_file_type text, _new_file_size numeric DEFAULT NULL::numeric, _submit_for_review boolean DEFAULT true)
 RETURNS document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    admin_status = CASE
      WHEN _submit_for_review THEN 'submitted'::public.document_submission_status
      ELSE 'draft'::public.document_submission_status
    END,
    admin_remarks = NULL,
    reviewed_at = NULL,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  WHERE id = _file_id
  RETURNING * INTO _updated_row;

  RETURN _updated_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_resubmit_renewal(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.user_resubmit_renewal_application(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _renewal public.organization_renewals%rowtype;
  _now timestamptz := clock_timestamp();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  SELECT id INTO _org_id
  FROM public.organization_profiles
  WHERE user_id = _user_id AND id = _renewal.organization_id;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'You are not authorized to resubmit this renewal application.';
  END IF;

  IF _renewal.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  END IF;

  -- Server-side deadline and lock enforcement
  IF (_renewal.revision_locked = true OR (_renewal.revision_due_at IS NOT NULL AND _now >= _renewal.revision_due_at AND _renewal.revision_unlocked_at IS NULL)) THEN
    UPDATE public.organization_renewals
    SET revision_locked = true,
        revision_locked_at = COALESCE(revision_locked_at, _now)
    WHERE id = p_renewal_id;

    RAISE EXCEPTION 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.document_submissions ds
    JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
    WHERE ds.renewal_id = p_renewal_id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'Please replace all files marked for revision before resubmitting.';
  END IF;

  UPDATE public.organization_renewals
  SET
    status = 'resubmitted',
    submitted_at = _now,
    reviewed_by = null,
    reviewed_at = null,
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _now
  WHERE id = p_renewal_id;

  UPDATE public.document_submissions
  SET
    status = 'under_admin_review',
    reviewed_by = null,
    reviewed_at = null,
    overall_remarks = 'Renewal packet resubmitted for admin review.',
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _now
  WHERE renewal_id = p_renewal_id;

  -- Authoritative in-app acknowledgement if workflow.notify_org_on_resubmitted is ON
  IF public.get_system_setting_bool('workflow.notify_org_on_resubmitted', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _user_id,
      _org_id,
      'Renewal Resubmission Received',
      format('Your resubmitted renewal application for Cycle %s has been received and is queued for admin review.', _renewal.cycle_number),
      'renewal_submitted',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Activity logging remains unconditional
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _user_id,
    _org_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id::text,
    format('Organization resubmitted renewal application for Cycle %s.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'resubmitted'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_start_or_get_renewal_draft(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.user_submit_additional_renewal_documents(p_renewal_id uuid, p_file_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _updated_count integer;
  _requested_count integer;
BEGIN
  _requested_count := coalesce(cardinality(p_file_ids), 0);
  IF _requested_count = 0 THEN
    RAISE EXCEPTION 'Select at least one renewal document to submit.';
  END IF;

  IF (SELECT count(DISTINCT requested.file_id) FROM unnest(p_file_ids) AS requested(file_id)) <> _requested_count THEN
    RAISE EXCEPTION 'A renewal document was selected more than once.';
  END IF;

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

  IF _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Additional documents cannot be submitted from renewal status "%".', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No renewal document submission found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_file_ids) AS requested(file_id)
    LEFT JOIN public.document_submission_files dsf
      ON dsf.id = requested.file_id
     AND dsf.submission_id = _submission.id
    LEFT JOIN public.required_document_types rdt
      ON rdt.id = dsf.document_type_id
    WHERE dsf.id IS NULL
      OR dsf.admin_status <> 'draft'
      OR nullif(trim(dsf.file_url), '') IS NULL
      OR rdt.id IS NULL
      OR rdt.is_active IS DISTINCT FROM true
      OR coalesce(rdt.is_required, true) IS DISTINCT FROM true
      OR rdt.scope NOT IN ('renewal', 'both')
      OR rdt.template_scope <> 'document_submission'
  ) THEN
    RAISE EXCEPTION 'Only saved draft files for required renewal documents can be submitted.';
  END IF;

  UPDATE public.document_submission_files
  SET admin_status = 'under_admin_review', reviewed_at = NULL, updated_at = _now
  WHERE submission_id = _submission.id
    AND id = ANY(p_file_ids)
    AND admin_status = 'draft';
  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  IF _updated_count <> _requested_count THEN
    RAISE EXCEPTION 'Not all selected renewal documents could be sent for review.';
  END IF;

  UPDATE public.document_submissions
  SET updated_at = _now
  WHERE id = _submission.id;

  UPDATE public.organization_renewals
  SET updated_at = _now
  WHERE id = p_renewal_id;

  INSERT INTO public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_documents_submitted',
    'renewal',
    p_renewal_id,
    format('Organization submitted %s additional renewal document(s) for Cycle %s.', _updated_count, _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'submitted_count', _updated_count,
    'submitted_at', _now
  );
END;
$function$;

RESET check_function_bodies;

