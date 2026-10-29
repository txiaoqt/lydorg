-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_admin_budget_request(_session_token text, _budget_request_id uuid, _status text DEFAULT NULL::text, _approved_amount numeric DEFAULT NULL::numeric, _released_amount numeric DEFAULT NULL::numeric, _release_date date DEFAULT NULL::date, _remarks text DEFAULT NULL::text, _admin_remarks text DEFAULT NULL::text, _go_signal_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _hard_copy_submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _user_note text DEFAULT NULL::text, _revision_history jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id uuid, organization_id uuid, submitted_by uuid, activity_title text, activity_description text, activity_date date, venue text, requested_amount numeric, approved_amount numeric, released_amount numeric, release_date date, purpose_category text, status budget_request_status, remarks text, admin_remarks text, go_signal_at timestamp with time zone, hard_copy_submitted_at timestamp with time zone, user_note text, revision_history jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _now timestamptz := clock_timestamp();
  _mapped_status public.budget_request_status := NULL;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF _status IS NOT NULL AND _status <> '' THEN
    IF _status = 'completed' THEN
      RAISE EXCEPTION 'Completed is not a Budget Request status. Use budget_released; liquidation has its own lifecycle.';
    ELSIF _status IN ('approved', 'approved_green', 'approved_for_ftf_green', 'hard_copy_submitted', 'awaiting_release') THEN
      _mapped_status := 'awaiting_release'::public.budget_request_status;
    ELSIF _status IN ('rejected', 'rejected_red') THEN
      _mapped_status := 'rejected_red'::public.budget_request_status;
    ELSIF _status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'budget_released') THEN
      _mapped_status := _status::public.budget_request_status;
    ELSE
      RAISE EXCEPTION 'Invalid Budget Request status: %', _status;
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.budget_requests
  SET
    status = COALESCE(_mapped_status, budget_requests.status),
    approved_amount = COALESCE(_approved_amount, budget_requests.approved_amount),
    released_amount = COALESCE(_released_amount, budget_requests.released_amount),
    release_date = COALESCE(_release_date, budget_requests.release_date),
    remarks = COALESCE(_remarks, budget_requests.remarks),
    admin_remarks = COALESCE(_admin_remarks, budget_requests.admin_remarks),
    go_signal_at = COALESCE(_go_signal_at, budget_requests.go_signal_at),
    hard_copy_submitted_at = COALESCE(_hard_copy_submitted_at, budget_requests.hard_copy_submitted_at),
    user_note = COALESCE(_user_note, budget_requests.user_note),
    revision_history = COALESCE(_revision_history, budget_requests.revision_history),
    revision_requested_at = CASE
      WHEN _mapped_status = 'needs_revision' THEN _now
      ELSE budget_requests.revision_requested_at
    END,
    revision_due_at = CASE
      WHEN _mapped_status = 'needs_revision' THEN _now + interval '5 days'
      ELSE budget_requests.revision_due_at
    END,
    revision_locked = CASE
      WHEN _mapped_status = 'needs_revision' THEN false
      ELSE budget_requests.revision_locked
    END,
    revision_locked_at = CASE
      WHEN _mapped_status = 'needs_revision' THEN NULL
      ELSE budget_requests.revision_locked_at
    END,
    updated_at = _now
  WHERE budget_requests.id = _budget_request_id
  RETURNING
    budget_requests.id,
    budget_requests.organization_id,
    budget_requests.submitted_by,
    budget_requests.activity_title,
    budget_requests.activity_description,
    budget_requests.activity_date,
    budget_requests.venue,
    budget_requests.requested_amount,
    budget_requests.approved_amount,
    budget_requests.released_amount,
    budget_requests.release_date,
    budget_requests.purpose_category,
    budget_requests.status,
    budget_requests.remarks,
    budget_requests.admin_remarks,
    budget_requests.go_signal_at,
    budget_requests.hard_copy_submitted_at,
    budget_requests.user_note,
    budget_requests.revision_history,
    budget_requests.created_at,
    budget_requests.updated_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_document_submission_file_review(_session_token text, _file_id uuid, _status document_submission_status, _admin_remarks text DEFAULT NULL::text)
 RETURNS SETOF document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _submission_id uuid;
  _org_id uuid;
  _org_user_id uuid;
  _renewal_id uuid;
  _document_name text;
  _current_admin_status public.document_submission_status;
  _current_revision_requested_at timestamptz;
  _current_uploaded_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
  _overall_status public.document_submission_status;
  _overall_remarks text;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  -- Validate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Resolve file, current status, timestamps, submission, organization, and document type name
  SELECT
    document_submission_files.submission_id,
    document_submission_files.admin_status,
    document_submission_files.revision_requested_at,
    document_submission_files.uploaded_at,
    COALESCE(required_document_types.name, document_submission_files.file_name)
  INTO
    _submission_id,
    _current_admin_status,
    _current_revision_requested_at,
    _current_uploaded_at,
    _document_name
  FROM public.document_submission_files
  LEFT JOIN public.required_document_types
    ON required_document_types.id = document_submission_files.document_type_id
  WHERE document_submission_files.id = _file_id
  LIMIT 1;

  IF _submission_id IS NULL THEN
    RAISE EXCEPTION 'Document submission file was not found.';
  END IF;

  -- Resolve parent submission details and organization owner
  SELECT ds.organization_id, ds.renewal_id
  INTO _org_id, _renewal_id
  FROM public.document_submissions ds
  WHERE ds.id = _submission_id;

  IF _org_id IS NOT NULL THEN
    SELECT op.user_id
    INTO _org_user_id
    FROM public.organization_profiles op
    WHERE op.id = _org_id;
  END IF;

  -- Guard 1: Permanently suspended organizations cannot have registration review decisions modified
  IF _renewal_id IS NULL AND _org_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_profiles op
    WHERE op.id = _org_id
      AND op.profile_status = 'suspended_inactive'
  ) THEN
    RAISE EXCEPTION 'This organization account is permanently suspended. Review actions cannot be performed.';
  END IF;

  -- Guard 2: Once marked needs_revision, cannot be approved without a genuine new replacement upload
  IF _status = 'approved_green' AND _current_admin_status = 'needs_revision' THEN
    IF _current_uploaded_at IS NULL OR (_current_revision_requested_at IS NOT NULL AND _current_uploaded_at <= _current_revision_requested_at) THEN
      RAISE EXCEPTION 'Cannot approve document file that is awaiting revision without a new upload.';
    END IF;
  END IF;

  -- Fetch workflow notification settings
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  -- Update the individual document file review record
  UPDATE public.document_submission_files
  SET
    admin_status = _status,
    admin_remarks = COALESCE(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    revision_requested_at = CASE WHEN _status = 'needs_revision' THEN _reviewed_at ELSE document_submission_files.revision_requested_at END,
    revision_due_at = CASE WHEN _status = 'needs_revision' THEN _revision_due ELSE NULL END,
    revision_locked = CASE WHEN _status = 'rejected_red' THEN true ELSE false END,
    revision_unlocked_at = NULL,
    revision_unlocked_by = NULL,
    updated_at = _reviewed_at
  WHERE document_submission_files.id = _file_id;

  -- If parent submission is tied to a renewal packet, handle renewal state transition
  IF _renewal_id IS NOT NULL THEN
    UPDATE public.organization_renewals
    SET
      status = CASE
        WHEN _status = 'rejected_red' THEN 'rejected'
        WHEN _status = 'needs_revision' THEN 'needs_revision'
        ELSE 'under_review'
      END,
      admin_remarks = CASE WHEN _status IN ('needs_revision', 'rejected_red') THEN COALESCE(_admin_remarks, organization_renewals.admin_remarks) ELSE organization_renewals.admin_remarks END,
      reviewed_by = _admin_id,
      reviewed_at = _reviewed_at,
      revision_requested_at = CASE WHEN _status = 'needs_revision' THEN _reviewed_at ELSE organization_renewals.revision_requested_at END,
      revision_due_at = CASE WHEN _status = 'needs_revision' THEN _revision_due ELSE organization_renewals.revision_due_at END,
      revision_locked = CASE WHEN _status = 'rejected_red' THEN true ELSE false END,
      revision_locked_at = CASE WHEN _status = 'rejected_red' THEN _reviewed_at ELSE NULL END,
      revision_unlocked_at = NULL,
      revision_unlocked_by = NULL,
      updated_at = _reviewed_at
    WHERE id = _renewal_id;
  END IF;

  -- Recompute overall parent submission status
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status = 'rejected_red'
      ) THEN 'rejected_red'::public.document_submission_status
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status = 'needs_revision'
      ) THEN 'needs_revision'::public.document_submission_status
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
      ) AND NOT EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status <> 'approved_green'
      ) THEN 'approved_green'::public.document_submission_status
      ELSE 'under_admin_review'::public.document_submission_status
    END
  INTO _overall_status;

  _overall_remarks :=
    CASE
      WHEN _status = 'approved_green' THEN format('Admin approved %s.', _document_name)
      WHEN _status = 'needs_revision' THEN format('Admin requested revisions for %s.', _document_name)
      ELSE format('Admin rejected %s.', _document_name)
    END;

  UPDATE public.document_submissions
  SET
    status = _overall_status,
    reviewed_by = _admin_id,
    reviewed_at = _reviewed_at,
    overall_remarks = _overall_remarks,
    revision_requested_at = CASE WHEN _overall_status = 'needs_revision' THEN _reviewed_at ELSE document_submissions.revision_requested_at END,
    revision_due_at = CASE WHEN _overall_status = 'needs_revision' THEN _revision_due ELSE NULL END,
    revision_locked = CASE WHEN _overall_status = 'rejected_red' THEN true ELSE false END,
    revision_locked_at = CASE WHEN _overall_status = 'rejected_red' THEN _reviewed_at ELSE NULL END,
    revision_unlocked_at = NULL,
    revision_unlocked_by = NULL,
    updated_at = _reviewed_at
  WHERE document_submissions.id = _submission_id;

  -- 1. REGISTRATION REVISION NOTIFICATION:
  IF _renewal_id IS NULL AND _status = 'needs_revision' AND _org_id IS NOT NULL AND _org_user_id IS NOT NULL AND _notify_revision THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _org_user_id,
      _org_id,
      'Registration Revision Requested',
      format('The admin requested revisions for %s.%s', _document_name, CASE WHEN _admin_remarks IS NOT NULL AND trim(_admin_remarks) <> '' THEN ' Remarks: ' || trim(_admin_remarks) ELSE '' END),
      'document_revision',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  END IF;

  -- 2. REGISTRATION SINGLE FILE APPROVED NOTIFICATION (when not yet fully verified):
  IF _renewal_id IS NULL AND _status = 'approved_green' AND _overall_status <> 'approved_green' AND _org_id IS NOT NULL AND _org_user_id IS NOT NULL AND _notify_approved THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _org_user_id,
      _org_id,
      'Registration Document Approved',
      format('Your registration document ''%s'' has been approved by the admin.', _document_name),
      'completed',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  END IF;

  -- 3. ATOMIC REJECTION RULE (Permanent Suspension):
  IF _renewal_id IS NULL AND _status = 'rejected_red' AND _org_id IS NOT NULL THEN
    UPDATE public.organization_profiles
    SET
      profile_status = 'suspended_inactive'::public.profile_status,
      updated_at = _reviewed_at
    WHERE id = _org_id;

    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      created_at
    ) VALUES (
      _admin_id,
      _org_id,
      'Suspended organization',
      'organization_profile',
      _org_id,
      format('Organization account permanently suspended due to rejected registration document: %s.', _document_name),
      _reviewed_at
    );

    IF _org_user_id IS NOT NULL AND _notify_rejected THEN
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        title,
        message,
        type,
        related_type,
        related_id,
        created_at
      ) VALUES (
        _org_user_id,
        _org_id,
        'Registration Document Rejected',
        format('Your registration document ''%s'' was rejected.%s Your organization account has been permanently suspended.', _document_name, CASE WHEN _admin_remarks IS NOT NULL AND trim(_admin_remarks) <> '' THEN ' Remarks: ' || trim(_admin_remarks) ELSE '' END),
        'document_red',
        'document_submission',
        _submission_id,
        _reviewed_at
      );
    END IF;
  END IF;

  -- 4. AUTOMATIC REGISTRATION VERIFICATION:
  -- Only evaluate when not suspended, not renewal, and overall submission status reached approved_green
  IF _renewal_id IS NULL AND _org_id IS NOT NULL AND _overall_status = 'approved_green' THEN
    PERFORM public.evaluate_and_apply_automatic_registration_verification(_org_id, _admin_id);
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.document_submission_files
  WHERE id = _file_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_document_submission_review(_session_token text, _submission_id uuid, _status document_submission_status, _overall_remarks text DEFAULT NULL::text, _admin_remarks text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, organization_id uuid, submitted_by uuid, status document_submission_status, user_confirmed boolean, submitted_at timestamp with time zone, reviewed_by uuid, reviewed_at timestamp with time zone, overall_remarks text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _reviewed_at timestamptz := now();
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  update public.document_submission_files
  set
    admin_status = _status,
    admin_remarks = case
      when _status in ('needs_revision', 'rejected_red')
        then coalesce(_admin_remarks, document_submission_files.admin_remarks)
      else null
    end,
    reviewed_at = _reviewed_at,
    updated_at = _reviewed_at
  where submission_id = _submission_id;

  return query
  update public.document_submissions
  set
    status = _status,
    reviewed_by = null,
    reviewed_at = _reviewed_at,
    overall_remarks = coalesce(_overall_remarks, document_submissions.overall_remarks),
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id
  returning
    document_submissions.id,
    document_submissions.organization_id,
    document_submissions.submitted_by,
    document_submissions.status,
    document_submissions.user_confirmed,
    document_submissions.submitted_at,
    document_submissions.reviewed_by,
    document_submissions.reviewed_at,
    document_submissions.overall_remarks,
    document_submissions.created_at,
    document_submissions.updated_at;
end;
$function$;

RESET check_function_bodies;

