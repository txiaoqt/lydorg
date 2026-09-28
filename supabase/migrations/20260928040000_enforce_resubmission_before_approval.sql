-- Migration: 20260928040000_enforce_resubmission_before_approval.sql
-- Description: Enforces authoritative Revision -> Resubmission -> Review Decision lifecycle hardening
--              across YPOP Validation (City-Led and Org-Led), YORP Registration Document Review, and Budget Requests.
--
-- Core Rule:
-- Once an item is marked "Needs Revision", the organization MUST submit a genuine replacement/revised file
-- (uploaded_at / proof_submitted_at > revision_requested_at) before an administrator can approve or verify it.

-- ==============================================================================
-- 1. HARDEN YORP REGISTRATION DOCUMENT REVIEW RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_admin_document_submission_file_review(
  _session_token text,
  _file_id uuid,
  _status public.document_submission_status,
  _admin_remarks text default null
)
RETURNS setof public.document_submission_files
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
        WHEN _status = 'rejected_red' THEN 'rejected'::public.renewal_application_status
        WHEN _status = 'needs_revision' THEN 'needs_revision'::public.renewal_application_status
        ELSE 'under_review'::public.renewal_application_status
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

GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_file_review(text, uuid, public.document_submission_status, text) TO anon, authenticated, service_role;


-- ==============================================================================
-- 2. HARDEN YPOP VALIDATION RPCs (City-Led & Org-Led)
-- ==============================================================================

-- 2A. Canonical public.admin_update_ypop_event_participation
CREATE OR REPLACE FUNCTION public.admin_update_ypop_event_participation(
  _session_token text,
  _participation_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _proof_submitted_at timestamptz default null,
  _verified_at timestamptz default null,
  _revision_history jsonb default null
)
RETURNS setof public.ypop_event_participations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
  _current_status public.ypop_event_participation_status;
  _current_revision_requested_at timestamptz;
  _current_proof_submitted_at timestamptz;
  _effective_proof_submitted_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT
    organization_id,
    status,
    revision_requested_at,
    proof_submitted_at
  INTO
    _org_id,
    _current_status,
    _current_revision_requested_at,
    _current_proof_submitted_at
  FROM public.ypop_event_participations
  WHERE id = _participation_id;

  IF _participation_id IS NULL OR _current_status IS NULL THEN
    RAISE EXCEPTION 'YPOP event participation was not found.';
  END IF;

  -- Lifecycle Guard: Cannot verify/approve participation in needs_revision without a genuine replacement proof
  IF (_status = 'verified' OR _status = 'approved') AND _current_status = 'needs_revision' THEN
    _effective_proof_submitted_at := COALESCE(_proof_submitted_at, _current_proof_submitted_at);
    IF _current_revision_requested_at IS NOT NULL AND NOT (
      (_effective_proof_submitted_at IS NOT NULL AND _effective_proof_submitted_at > _current_revision_requested_at)
      OR EXISTS (
        SELECT 1
        FROM public.ypop_event_files
        WHERE participation_id = _participation_id
          AND uploaded_at > _current_revision_requested_at
      )
    ) THEN
      RAISE EXCEPTION 'Cannot verify event participation that is awaiting revision without a new proof submission.';
    END IF;
  END IF;

  IF _org_id IS NOT NULL AND public.is_audit_logging_enabled('approval') THEN
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
      _org_id,
      'reviewed_ypop_event_participation',
      'ypop_event_participation',
      _participation_id,
      COALESCE(_admin_remarks, 'YPOP event participation status updated.'),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_event_participations
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_event_participation_status
      ELSE ypop_event_participations.status
    END,
    admin_remarks = COALESCE(_admin_remarks, ypop_event_participations.admin_remarks),
    proof_submitted_at = COALESCE(_proof_submitted_at, ypop_event_participations.proof_submitted_at),
    verified_at = CASE
      WHEN _status = 'verified' AND _verified_at IS NULL THEN now()
      ELSE COALESCE(_verified_at, ypop_event_participations.verified_at)
    END,
    revision_requested_at = CASE
      WHEN _status = 'needs_revision' THEN _reviewed_at
      ELSE ypop_event_participations.revision_requested_at
    END,
    revision_due_at = CASE
      WHEN _status = 'needs_revision' THEN _revision_due
      ELSE ypop_event_participations.revision_due_at
    END,
    revision_locked = CASE
      WHEN _status = 'needs_revision' THEN false
      ELSE ypop_event_participations.revision_locked
    END,
    revision_history = COALESCE(_revision_history, ypop_event_participations.revision_history),
    updated_at = now()
  WHERE ypop_event_participations.id = _participation_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_ypop_event_participation(text, uuid, text, text, timestamptz, timestamptz, jsonb) TO anon, authenticated, service_role;


-- 2B. Canonical public.admin_update_ypop_org_activity
CREATE OR REPLACE FUNCTION public.admin_update_ypop_org_activity(
  _session_token text,
  _activity_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _approved_at timestamptz default null,
  _revision_history jsonb default null
)
RETURNS setof public.ypop_org_activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
  _current_status public.ypop_org_activity_status;
  _current_revision_requested_at timestamptz;
  _current_submitted_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT
    organization_id,
    status,
    revision_requested_at,
    submitted_at
  INTO
    _org_id,
    _current_status,
    _current_revision_requested_at,
    _current_submitted_at
  FROM public.ypop_org_activities
  WHERE id = _activity_id;

  IF _activity_id IS NULL OR _current_status IS NULL THEN
    RAISE EXCEPTION 'YPOP organization activity was not found.';
  END IF;

  -- Lifecycle Guard: Cannot approve activity in needs_revision without a genuine replacement submission
  IF (_status = 'approved' OR _status = 'verified') AND _current_status = 'needs_revision' THEN
    IF _current_revision_requested_at IS NOT NULL AND NOT (
      (_current_submitted_at IS NOT NULL AND _current_submitted_at > _current_revision_requested_at)
      OR EXISTS (
        SELECT 1
        FROM public.ypop_org_activity_files
        WHERE activity_id = _activity_id
          AND uploaded_at > _current_revision_requested_at
      )
    ) THEN
      RAISE EXCEPTION 'Cannot approve organization activity that is awaiting revision without a new submission or replacement file.';
    END IF;
  END IF;

  IF _org_id IS NOT NULL AND public.is_audit_logging_enabled('approval') THEN
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
      _org_id,
      'reviewed_ypop_org_activity',
      'ypop_org_activity',
      _activity_id,
      COALESCE(_admin_remarks, 'YPOP organization-led activity status updated.'),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_org_activities
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_org_activity_status
      ELSE ypop_org_activities.status
    END,
    admin_remarks = COALESCE(_admin_remarks, ypop_org_activities.admin_remarks),
    approved_at = CASE
      WHEN _status = 'approved' AND _approved_at IS NULL THEN now()
      ELSE COALESCE(_approved_at, ypop_org_activities.approved_at)
    END,
    revision_requested_at = CASE
      WHEN _status = 'needs_revision' THEN _reviewed_at
      ELSE ypop_org_activities.revision_requested_at
    END,
    revision_due_at = CASE
      WHEN _status = 'needs_revision' THEN _revision_due
      ELSE ypop_org_activities.revision_due_at
    END,
    revision_locked = CASE
      WHEN _status = 'needs_revision' THEN false
      ELSE ypop_org_activities.revision_locked
    END,
    revision_history = COALESCE(_revision_history, ypop_org_activities.revision_history),
    updated_at = now()
  WHERE ypop_org_activities.id = _activity_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_ypop_org_activity(text, uuid, text, text, timestamptz, jsonb) TO anon, authenticated, service_role;


-- ==============================================================================
-- 3. HARDEN BUDGET REQUEST & BUDGET REQUEST FILES TRANSITIONS
-- ==============================================================================

-- 3A. Trigger on public.budget_requests
CREATE OR REPLACE FUNCTION public.enforce_budget_request_resubmission_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent transition from needs_revision to submitted, under_review, awaiting_release, or approved
  -- unless a replacement proposal file with uploaded_at > revision_requested_at exists.
  IF OLD.status = 'needs_revision' AND NEW.status IN ('submitted', 'under_review', 'approved', 'awaiting_release') THEN
    IF OLD.revision_requested_at IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.budget_request_files
      WHERE budget_request_id = OLD.id
        AND uploaded_at > OLD.revision_requested_at
    ) THEN
      RAISE EXCEPTION 'Cannot transition budget request from needs_revision without a new replacement file upload.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_budget_request_resubmission ON public.budget_requests;
CREATE TRIGGER trg_enforce_budget_request_resubmission
BEFORE UPDATE ON public.budget_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_budget_request_resubmission_lifecycle();

-- 3B. Trigger on public.budget_request_files
CREATE OR REPLACE FUNCTION public.enforce_budget_request_file_resubmission_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent approving a file in needs_revision without a newer upload timestamp
  IF OLD.admin_status = 'needs_revision' AND NEW.admin_status = 'approved_green' THEN
    IF OLD.revision_requested_at IS NOT NULL AND (OLD.uploaded_at IS NULL OR OLD.uploaded_at <= OLD.revision_requested_at) THEN
      RAISE EXCEPTION 'Cannot approve budget request file that is awaiting revision without a new upload.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_budget_request_file_resubmission ON public.budget_request_files;
CREATE TRIGGER trg_enforce_budget_request_file_resubmission
BEFORE UPDATE ON public.budget_request_files
FOR EACH ROW
EXECUTE FUNCTION public.enforce_budget_request_file_resubmission_lifecycle();
