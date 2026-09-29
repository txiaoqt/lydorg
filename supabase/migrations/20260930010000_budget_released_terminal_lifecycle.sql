-- Budget requests end when funds are released. Liquidation keeps its own status.
-- The enum's historical `completed` value remains for compatibility, but new
-- budget-request writes cannot persist it.

CREATE OR REPLACE FUNCTION public.enforce_budget_request_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Legacy review stages now map to the canonical approval state.
  IF NEW.status IN ('approved_for_ftf_green', 'hard_copy_submitted') THEN
    NEW.status := 'awaiting_release';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'budget_released'
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.approved_amount IS DISTINCT FROM OLD.approved_amount
       OR NEW.released_amount IS DISTINCT FROM OLD.released_amount
       OR NEW.release_date IS DISTINCT FROM OLD.release_date
     ) THEN
    RAISE EXCEPTION 'Budget Released is the terminal Budget Request state. Release data is immutable; continue financial execution in the liquidation workflow.';
  END IF;

  IF NEW.status = 'completed' THEN
    -- Older seed code still emits `completed`; normalize only fully released
    -- records from the explicitly marked PCYDO sample batch.
    IF coalesce(NEW.is_seeded_sample_data, false)
       AND NEW.seed_batch = 'PCYDO-YORP-2024-2026'
       AND coalesce(NEW.released_amount, 0) > 0
       AND NEW.release_date IS NOT NULL THEN
      NEW.status := 'budget_released';
      RETURN NEW;
    END IF;

    -- Allow unrelated edits to a historical row until it is repaired, but do
    -- not permit inserts or transitions into the legacy terminal value.
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Completed is not a Budget Request status. Use budget_released; liquidation has its own lifecycle.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_budget_request_terminal_status ON public.budget_requests;
CREATE TRIGGER trg_enforce_budget_request_terminal_status
BEFORE INSERT OR UPDATE ON public.budget_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_budget_request_terminal_status();

-- Keep the authoritative admin RPC aligned with the UI lifecycle. The trigger
-- remains the backstop for direct writes and other RPCs.
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

GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(
  text, uuid, text, numeric, numeric, date, text, text,
  timestamp with time zone, timestamp with time zone, text, jsonb
) TO anon, authenticated, service_role;

-- Correct only completed requests carrying the exact seeded-data markers and
-- complete release evidence. The deployed sample's associated liquidations
-- remain completed_liquidated and are not modified here.
WITH corrected AS (
  UPDATE public.budget_requests
  SET status = 'budget_released',
      updated_at = clock_timestamp()
  WHERE is_seeded_sample_data = true
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND status = 'completed'
    AND released_amount > 0
    AND release_date IS NOT NULL
  RETURNING id, organization_id
)
INSERT INTO public.activity_logs (
  actor_user_id,
  organization_id,
  action,
  related_type,
  related_id,
  description
)
SELECT
  NULL,
  corrected.organization_id,
  'corrected_seeded_budget_request_status',
  'budget_request',
  corrected.id,
  'System correction: Budget Request status changed from completed to budget_released after confirming the full release amount and release date. The related liquidation remains completed_liquidated.'
FROM corrected;

COMMENT ON FUNCTION public.enforce_budget_request_terminal_status() IS
  'Prevents new Budget Request completed states; normalizes fully released records from the marked PCYDO-YORP-2024-2026 seed batch to budget_released. Liquidation status is independent.';
