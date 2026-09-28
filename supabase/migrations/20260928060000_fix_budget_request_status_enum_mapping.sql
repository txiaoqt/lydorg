-- Migration: 20260928060000_fix_budget_request_status_enum_mapping.sql
-- Description: Supports flexible status parameter (text -> budget_request_status) in update_admin_budget_request
--              mapping 'approved' / 'awaiting_release' to 'approved_for_ftf_green' and 'rejected' to 'rejected_red'.

CREATE OR REPLACE FUNCTION public.update_admin_budget_request(
  _session_token text,
  _budget_request_id uuid,
  _status text DEFAULT NULL::text,
  _approved_amount numeric DEFAULT NULL::numeric,
  _released_amount numeric DEFAULT NULL::numeric,
  _release_date date DEFAULT NULL::date,
  _remarks text DEFAULT NULL::text,
  _admin_remarks text DEFAULT NULL::text,
  _go_signal_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _hard_copy_submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _user_note text DEFAULT NULL::text,
  _revision_history jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  submitted_by uuid,
  activity_title text,
  activity_description text,
  activity_date date,
  venue text,
  requested_amount numeric,
  approved_amount numeric,
  released_amount numeric,
  release_date date,
  purpose_category text,
  status public.budget_request_status,
  remarks text,
  admin_remarks text,
  go_signal_at timestamp with time zone,
  hard_copy_submitted_at timestamp with time zone,
  user_note text,
  revision_history jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
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
    IF _status IN ('approved', 'awaiting_release', 'approved_green', 'approved_for_ftf_green') THEN
      _mapped_status := 'approved_for_ftf_green'::public.budget_request_status;
    ELSIF _status IN ('rejected', 'rejected_red') THEN
      _mapped_status := 'rejected_red'::public.budget_request_status;
    ELSE
      _mapped_status := _status::public.budget_request_status;
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

GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(
  text,
  uuid,
  text,
  numeric,
  numeric,
  date,
  text,
  text,
  timestamp with time zone,
  timestamp with time zone,
  text,
  jsonb
) TO anon, authenticated, service_role;

-- Also update lifecycle trigger to match valid enum values
CREATE OR REPLACE FUNCTION public.enforce_budget_request_resubmission_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent transition from needs_revision to submitted, under_review, or approved_for_ftf_green
  -- unless a replacement proposal file with uploaded_at > revision_requested_at exists.
  IF OLD.status = 'needs_revision' AND NEW.status IN ('submitted', 'under_review', 'approved_for_ftf_green') THEN
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
