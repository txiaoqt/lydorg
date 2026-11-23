-- Allow one unresolved budget request per organization. A released budget stays
-- unresolved until its liquidation report reaches completed_liquidated.

CREATE OR REPLACE FUNCTION public.find_budget_request_submission_blocker(_organization_id uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'kind', CASE
      WHEN br.status::text = 'draft' THEN 'draft'
      WHEN br.status::text IN ('budget_released', 'completed') THEN 'pending_liquidation'
      ELSE 'ongoing_budget_request'
    END,
    'budget_request_id', br.id,
    'activity_title', br.activity_title,
    'budget_status', br.status::text,
    'liquidation_report_id', lr.id,
    'liquidation_status', lr.status
  )
  FROM public.budget_requests br
  LEFT JOIN LATERAL (
    SELECT report.id, report.status::text AS status
    FROM public.liquidation_reports report
    WHERE report.budget_request_id = br.id
      AND report.is_seeded_sample_data IS NOT TRUE
    ORDER BY report.updated_at DESC, report.created_at DESC, report.id DESC
    LIMIT 1
  ) lr ON TRUE
  WHERE br.organization_id = _organization_id
    AND br.is_seeded_sample_data IS NOT TRUE
    AND (
      br.status::text IN (
        'draft', 'submitted', 'under_review', 'needs_revision',
        'awaiting_release', 'approved', 'approved_green',
        'approved_for_ftf_green', 'hard_copy_submitted'
      )
      OR (
        br.status::text IN ('budget_released', 'completed')
        AND lr.status IS DISTINCT FROM 'completed_liquidated'
      )
    )
  ORDER BY
    CASE
      WHEN br.status::text = 'draft' THEN 0
      WHEN br.status::text IN ('budget_released', 'completed') THEN 1
      ELSE 2
    END,
    br.created_at DESC,
    br.id DESC
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_budget_request_submission_blocker(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_organization_budget_submission_blocker(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.organization_profiles profile
    WHERE profile.id = _organization_id
      AND profile.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not authorized to check this organization budget request.';
  END IF;

  RETURN public.find_budget_request_submission_blocker(_organization_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_organization_budget_submission_blocker(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organization_budget_submission_blocker(uuid)
  TO authenticated;

-- Organization users cannot mark their own requests as seeded to evade the blocker.
CREATE OR REPLACE FUNCTION public.guard_budget_request_seed_markers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_seeded_sample_data IS TRUE AND EXISTS (
      SELECT 1
      FROM public.organization_profiles profile
      WHERE profile.id = NEW.organization_id
        AND profile.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Organization users cannot mark budget requests as seeded sample data.';
    END IF;
  ELSIF (
    NEW.is_seeded_sample_data IS DISTINCT FROM OLD.is_seeded_sample_data
    OR NEW.seed_batch IS DISTINCT FROM OLD.seed_batch
  ) AND EXISTS (
    SELECT 1
    FROM public.organization_profiles profile
    WHERE profile.id = NEW.organization_id
      AND profile.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Organization users cannot change seeded sample data markers.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_budget_request_seed_markers()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_budget_request_seed_marker_guard ON public.budget_requests;
CREATE TRIGGER trg_budget_request_seed_marker_guard
  BEFORE INSERT OR UPDATE OF is_seeded_sample_data, seed_batch ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_budget_request_seed_markers();

CREATE OR REPLACE FUNCTION public.guard_budget_request_submission_blocker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _blocker jsonb;
  _title text;
BEGIN
  -- Test/sample fixtures are intentionally exempt and must not prevent user submissions.
  IF NEW.is_seeded_sample_data IS TRUE AND NOT EXISTS (
    SELECT 1
    FROM public.organization_profiles profile
    WHERE profile.id = NEW.organization_id
      AND profile.user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  -- Serialize new requests for the same organization before checking for an existing blocker.
  PERFORM 1
  FROM public.organization_profiles profile
  WHERE profile.id = NEW.organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A valid organization profile is required before creating a budget request.';
  END IF;

  _blocker := public.find_budget_request_submission_blocker(NEW.organization_id);
  IF _blocker IS NULL THEN
    RETURN NEW;
  END IF;

  _title := COALESCE(NULLIF(_blocker->>'activity_title', ''), 'the existing activity');
  IF _blocker->>'kind' = 'draft' THEN
    RAISE EXCEPTION 'A saved budget request draft already exists for "%". Continue that draft instead of creating another one.', _title;
  ELSIF _blocker->>'kind' = 'pending_liquidation' THEN
    RAISE EXCEPTION 'The released budget for "%" is not fully liquidated. Complete its liquidation before creating a new budget request.', _title;
  ELSE
    RAISE EXCEPTION 'The budget request for "%" is still ongoing. Submit a new request only after it is rejected or its released budget is fully liquidated.', _title;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_budget_request_submission_blocker()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_budget_request_submission_blocker ON public.budget_requests;
CREATE TRIGGER trg_budget_request_submission_blocker
  BEFORE INSERT ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_budget_request_submission_blocker();
