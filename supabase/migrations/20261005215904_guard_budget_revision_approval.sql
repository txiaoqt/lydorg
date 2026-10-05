-- A replacement upload must be explicitly submitted before admin approval.
-- Enforce this on the tables so stale clients and alternate review actions
-- cannot bypass the lifecycle rules.
CREATE OR REPLACE FUNCTION public.enforce_budget_request_resubmission_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _revision_at timestamptz;
BEGIN
  IF NEW.status = 'needs_revision' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.revision_requested_at := clock_timestamp();
    NEW.revision_due_at := NEW.revision_requested_at + interval '5 days';
  END IF;

  IF OLD.status = 'needs_revision' AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('submitted', 'under_review', 'awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed') THEN
    IF NEW.status <> 'submitted' THEN
      RAISE EXCEPTION 'Resubmission required: submit the revised budget proposal for review before approval.';
    END IF;
    -- Legacy rows without a revision timestamp fail closed against the last update.
    _revision_at := COALESCE(OLD.revision_requested_at, OLD.updated_at);
    IF _revision_at IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.budget_request_files f
      WHERE f.budget_request_id = OLD.id AND f.uploaded_at > _revision_at
        AND COALESCE(f.admin_status, '') NOT IN ('needs_revision', 'rejected_red')
    ) THEN
      RAISE EXCEPTION 'A new replacement proposal file is required before resubmitting this budget request.';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
     AND EXISTS (
       SELECT 1 FROM public.budget_request_files f
       WHERE f.budget_request_id = OLD.id AND f.admin_status IN ('needs_revision', 'rejected_red')
     ) THEN
    RAISE EXCEPTION 'Cannot approve or release a budget request with unresolved document revisions or rejected documents.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_budget_request_file_resubmission_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parent_status public.budget_request_status;
BEGIN
  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status THEN
    -- Serialize file decisions with parent decisions so an approval cannot
    -- race a revision decision in another admin tab.
    SELECT status INTO _parent_status FROM public.budget_requests
    WHERE id = NEW.budget_request_id FOR UPDATE;
    IF NEW.admin_status IN ('approved_green', 'awaiting_release')
       AND (OLD.admin_status = 'needs_revision' OR _parent_status = 'needs_revision') THEN
      RAISE EXCEPTION 'Resubmission required: replace the flagged proposal and submit it for review before approval.';
    END IF;
    IF NEW.admin_status = 'needs_revision'
       AND _parent_status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed') THEN
      RAISE EXCEPTION 'This budget request has already been approved. Refresh before making another review decision.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only functions have no public RPC entry point.
REVOKE ALL ON FUNCTION public.enforce_budget_request_resubmission_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_budget_request_file_resubmission_lifecycle() FROM PUBLIC, anon, authenticated;
