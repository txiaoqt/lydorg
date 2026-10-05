-- Targeted status synchronization for organization workflows.
-- Require a currently empty publication at apply time. If any table has been
-- added since the last audit, stop and re-audit publication-wide behavior.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication p
    WHERE p.pubname = 'supabase_realtime'
      AND (p.puballtables OR EXISTS (
        SELECT 1 FROM pg_publication_tables t WHERE t.pubname = p.pubname
      ))
  ) THEN
    RAISE EXCEPTION 'supabase_realtime is no longer empty; re-audit publication-wide behavior before applying status synchronization.';
  END IF;
END;
$$;

-- This publication-wide option is intentional: only row inserts/updates are
-- status notifications. DELETE/TRUNCATE are excluded because Realtime cannot
-- apply row ownership RLS to deleted rows. The guard above requires emptiness.
ALTER PUBLICATION supabase_realtime SET (publish = 'insert, update');
COMMENT ON PUBLICATION supabase_realtime IS
  'Organization status sync publishes INSERT/UPDATE only; DELETE/TRUNCATE are excluded because deleted rows cannot be filtered by RLS. Re-audit before adding unrelated subscriptions.';

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.organization_profiles,
  public.organization_renewals,
  public.organization_accreditations,
  public.document_submissions,
  public.document_submission_files,
  public.budget_requests,
  public.budget_request_files,
  public.liquidation_reports,
  public.liquidation_report_files,
  public.ypop_periods,
  public.ypop_city_activities,
  public.ypop_entries,
  public.ypop_event_participations,
  public.ypop_event_files,
  public.ypop_org_activities,
  public.ypop_org_activity_files;

CREATE TABLE public.admin_portal_change_versions (
  resource_key text PRIMARY KEY CHECK (resource_key IN (
    'registration', 'renewals', 'budgets', 'liquidations', 'ypop_city_led', 'ypop_org_led'
  )),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_portal_change_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_portal_change_versions FROM PUBLIC, anon, authenticated;
INSERT INTO public.admin_portal_change_versions(resource_key)
VALUES ('registration'), ('renewals'), ('budgets'), ('liquidations'), ('ypop_city_led'), ('ypop_org_led')
ON CONFLICT (resource_key) DO NOTHING;
COMMENT ON TABLE public.admin_portal_change_versions IS
  'Admin-only monotonic resource versions used as small freshness signals; no business records are stored here.';

CREATE OR REPLACE FUNCTION public.admin_bump_portal_change_version(_resource_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  UPDATE public.admin_portal_change_versions
  SET version = version + 1, updated_at = now()
  WHERE resource_key = _resource_key;
$$;
REVOKE ALL ON FUNCTION public.admin_bump_portal_change_version(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_track_document_submission_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  old_resource text;
  new_resource text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_resource := CASE WHEN OLD.submission_scope::text = 'renewal' OR OLD.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
    PERFORM public.admin_bump_portal_change_version(old_resource);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_resource := CASE WHEN NEW.submission_scope::text = 'renewal' OR NEW.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
    IF new_resource IS DISTINCT FROM old_resource THEN
      PERFORM public.admin_bump_portal_change_version(new_resource);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_document_file_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  submission_row public.document_submissions%ROWTYPE;
  submission_id uuid;
  resource_key text;
BEGIN
  submission_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END;
  SELECT * INTO submission_row FROM public.document_submissions WHERE id = submission_id;
  IF FOUND THEN
    resource_key := CASE WHEN submission_row.submission_scope::text = 'renewal' OR submission_row.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
    PERFORM public.admin_bump_portal_change_version(resource_key);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.submission_id IS DISTINCT FROM NEW.submission_id THEN
    SELECT * INTO submission_row FROM public.document_submissions WHERE id = OLD.submission_id;
    IF FOUND THEN
      resource_key := CASE WHEN submission_row.submission_scope::text = 'renewal' OR submission_row.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
      PERFORM public.admin_bump_portal_change_version(resource_key);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_renewal_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN PERFORM public.admin_bump_portal_change_version('renewals'); IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_budget_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN PERFORM public.admin_bump_portal_change_version('budgets'); IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_liquidation_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN PERFORM public.admin_bump_portal_change_version('liquidations'); IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_entry_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'DELETE') THEN
    PERFORM public.admin_bump_portal_change_version('ypop_city_led');
    PERFORM public.admin_bump_portal_change_version('ypop_org_led');
  ELSE
    IF OLD.status IS DISTINCT FROM NEW.status
      OR OLD.points_earned IS DISTINCT FROM NEW.points_earned
      OR OLD.points_required IS DISTINCT FROM NEW.points_required
      OR OLD.total_points IS DISTINCT FROM NEW.total_points
      OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at
      OR OLD.validated_at IS DISTINCT FROM NEW.validated_at THEN
      PERFORM public.admin_bump_portal_change_version('ypop_city_led');
      PERFORM public.admin_bump_portal_change_version('ypop_org_led');
    ELSE
      IF OLD.city_led_attendance IS DISTINCT FROM NEW.city_led_attendance THEN
        PERFORM public.admin_bump_portal_change_version('ypop_city_led');
      END IF;
      IF OLD.org_led_project_count IS DISTINCT FROM NEW.org_led_project_count THEN
        PERFORM public.admin_bump_portal_change_version('ypop_org_led');
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_child_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  PERFORM public.admin_bump_portal_change_version(TG_ARGV[0]);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_organization_profile_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.admin_bump_portal_change_version('registration');
  ELSIF OLD.profile_status IS DISTINCT FROM NEW.profile_status OR OLD.urn IS DISTINCT FROM NEW.urn THEN
    PERFORM public.admin_bump_portal_change_version('registration');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_period_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.admin_bump_portal_change_version('ypop_city_led');
  PERFORM public.admin_bump_portal_change_version('ypop_org_led');
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_city_activity_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.admin_bump_portal_change_version('ypop_city_led');
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_track_document_submission_version ON public.document_submissions;
CREATE TRIGGER trg_admin_track_document_submission_version AFTER INSERT OR UPDATE OR DELETE ON public.document_submissions
FOR EACH ROW EXECUTE FUNCTION public.admin_track_document_submission_version();
DROP TRIGGER IF EXISTS trg_admin_track_document_file_version ON public.document_submission_files;
CREATE TRIGGER trg_admin_track_document_file_version AFTER INSERT OR UPDATE OR DELETE ON public.document_submission_files
FOR EACH ROW EXECUTE FUNCTION public.admin_track_document_file_version();
DROP TRIGGER IF EXISTS trg_admin_track_renewal_version ON public.organization_renewals;
CREATE TRIGGER trg_admin_track_renewal_version AFTER INSERT OR UPDATE OR DELETE ON public.organization_renewals
FOR EACH ROW EXECUTE FUNCTION public.admin_track_renewal_version();
DROP TRIGGER IF EXISTS trg_admin_track_accreditation_version ON public.organization_accreditations;
CREATE TRIGGER trg_admin_track_accreditation_version AFTER INSERT OR UPDATE OR DELETE ON public.organization_accreditations
FOR EACH ROW EXECUTE FUNCTION public.admin_track_renewal_version();
DROP TRIGGER IF EXISTS trg_admin_track_budget_version ON public.budget_requests;
CREATE TRIGGER trg_admin_track_budget_version AFTER INSERT OR UPDATE OR DELETE ON public.budget_requests
FOR EACH ROW EXECUTE FUNCTION public.admin_track_budget_version();
DROP TRIGGER IF EXISTS trg_admin_track_budget_file_version ON public.budget_request_files;
CREATE TRIGGER trg_admin_track_budget_file_version AFTER INSERT OR UPDATE OR DELETE ON public.budget_request_files
FOR EACH ROW EXECUTE FUNCTION public.admin_track_budget_version();
DROP TRIGGER IF EXISTS trg_admin_track_liquidation_version ON public.liquidation_reports;
CREATE TRIGGER trg_admin_track_liquidation_version AFTER INSERT OR UPDATE OR DELETE ON public.liquidation_reports
FOR EACH ROW EXECUTE FUNCTION public.admin_track_liquidation_version();
DROP TRIGGER IF EXISTS trg_admin_track_liquidation_file_version ON public.liquidation_report_files;
CREATE TRIGGER trg_admin_track_liquidation_file_version AFTER INSERT OR UPDATE OR DELETE ON public.liquidation_report_files
FOR EACH ROW EXECUTE FUNCTION public.admin_track_liquidation_version();
DROP TRIGGER IF EXISTS trg_admin_track_ypop_entry_version ON public.ypop_entries;
CREATE TRIGGER trg_admin_track_ypop_entry_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_entries
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_entry_version();
DROP TRIGGER IF EXISTS trg_admin_track_ypop_participation_version ON public.ypop_event_participations;
CREATE TRIGGER trg_admin_track_ypop_participation_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_event_participations
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_child_version('ypop_city_led');
DROP TRIGGER IF EXISTS trg_admin_track_ypop_event_file_version ON public.ypop_event_files;
CREATE TRIGGER trg_admin_track_ypop_event_file_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_event_files
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_child_version('ypop_city_led');
DROP TRIGGER IF EXISTS trg_admin_track_ypop_org_activity_version ON public.ypop_org_activities;
CREATE TRIGGER trg_admin_track_ypop_org_activity_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_org_activities
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_child_version('ypop_org_led');
DROP TRIGGER IF EXISTS trg_admin_track_ypop_org_file_version ON public.ypop_org_activity_files;
CREATE TRIGGER trg_admin_track_ypop_org_file_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_org_activity_files
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_child_version('ypop_org_led');
DROP TRIGGER IF EXISTS trg_admin_track_organization_profile_version ON public.organization_profiles;
CREATE TRIGGER trg_admin_track_organization_profile_version AFTER INSERT OR UPDATE ON public.organization_profiles
FOR EACH ROW EXECUTE FUNCTION public.admin_track_organization_profile_version();
DROP TRIGGER IF EXISTS trg_admin_track_ypop_period_version ON public.ypop_periods;
CREATE TRIGGER trg_admin_track_ypop_period_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_periods
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_period_version();
DROP TRIGGER IF EXISTS trg_admin_track_ypop_city_activity_version ON public.ypop_city_activities;
CREATE TRIGGER trg_admin_track_ypop_city_activity_version AFTER INSERT OR UPDATE OR DELETE ON public.ypop_city_activities
FOR EACH ROW EXECUTE FUNCTION public.admin_track_ypop_city_activity_version();

CREATE OR REPLACE FUNCTION public.admin_get_portal_change_versions(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE _admin_id uuid;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  RETURN (SELECT jsonb_object_agg(resource_key, version ORDER BY resource_key)
          FROM public.admin_portal_change_versions);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_portal_change_versions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_portal_change_versions(text) TO anon, authenticated, service_role;

-- Server-side, countable queue pages for the two Admin review lists that were
-- previously hydrated as whole-section arrays. File URLs are intentionally
-- absent from list rows and returned only by the selected-detail RPCs below.
CREATE OR REPLACE FUNCTION public.admin_get_review_resource_page(
  _session_token text,
  _resource text,
  _page integer DEFAULT 0,
  _page_size integer DEFAULT 20,
  _search text DEFAULT NULL,
  _status text DEFAULT 'all',
  _district text DEFAULT 'all',
  _barangay text DEFAULT 'all',
  _classification text DEFAULT 'all',
  _semester text DEFAULT 'all',
  _sort text DEFAULT 'newest'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _required_permission text;
  _safe_page bigint := GREATEST(COALESCE(_page, 0), 0)::bigint;
  _safe_page_size integer := LEAST(GREATEST(COALESCE(_page_size, 20), 1), 50);
  _search_term text := NULLIF(btrim(COALESCE(_search, '')), '');
  _rows jsonb := '[]'::jsonb;
  _summary jsonb := '{}'::jsonb;
  _total_count bigint := 0;
BEGIN
  SELECT vat.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
  INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  JOIN public.roles r ON r.id = aa.role_id
  LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;

  _required_permission := CASE _resource
    WHEN 'budgets' THEN 'budget_requests_review'
    WHEN 'liquidations' THEN 'liquidation_reports_review'
    ELSE NULL
  END;
  IF _required_permission IS NULL THEN RAISE EXCEPTION 'Unsupported Admin review resource.'; END IF;
  IF _role_code <> 'super_admin' AND NOT (_required_permission = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to view this Admin review queue.';
  END IF;

  IF _resource = 'budgets' THEN
    WITH all_budget_codes AS (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at, b.id)::text, 2, '0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b
      WHERE b.status::text <> 'draft'
    ), filtered AS (
      SELECT br.id, br.organization_id, br.activity_title, br.activity_date, br.venue,
        br.requested_amount, br.approved_amount, br.released_amount, br.status,
        br.revision_due_at, br.revision_locked, br.revision_locked_at,
        br.ypop_entry_id, br.created_at, br.updated_at, bc.public_record_code,
        op.organization_name, op.reference_id, op.urn, op.district, op.barangay, op.major_classification
      FROM public.budget_requests br
      JOIN all_budget_codes bc ON bc.id = br.id
      JOIN public.organization_profiles op ON op.id = br.organization_id
      LEFT JOIN public.ypop_entries ye ON ye.id = br.ypop_entry_id
      WHERE br.status::text <> 'draft'
        AND (_search_term IS NULL OR br.activity_title ILIKE '%' || _search_term || '%'
          OR br.venue ILIKE '%' || _search_term || '%' OR op.organization_name ILIKE '%' || _search_term || '%'
          OR br.id::text ILIKE '%' || _search_term || '%' OR bc.public_record_code ILIKE '%' || _search_term || '%')
        AND (_status IS NULL OR _status = 'all'
          OR (_status = 'under_review' AND br.status::text IN ('submitted', 'under_review'))
          OR (_status = 'needs_revision' AND br.status::text = 'needs_revision')
          OR (_status = 'awaiting_release' AND br.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted'))
          OR (_status = 'budget_released' AND br.status::text IN ('budget_released', 'completed')))
        AND (_district IS NULL OR _district = 'all' OR op.district = _district)
        AND (_barangay IS NULL OR _barangay = 'all' OR op.barangay = _barangay)
        AND (_classification IS NULL OR _classification = 'all' OR op.major_classification = _classification)
        AND (_semester IS NULL OR _semester = 'all' OR (
          _semester ~ '^20[0-9]{2}-[12]$' AND (
            (ye.id IS NOT NULL AND (
              ye.semester = _semester OR ye.semester ~ ('^' || split_part(_semester, '-', 1) || '[-_]?' || split_part(_semester, '-', 2) || '$')
              OR lower(ye.semester_label) = lower(split_part(_semester, '-', 1) || ' ' || CASE split_part(_semester, '-', 2) WHEN '1' THEN '1st' ELSE '2nd' END || ' semester')
            )) OR (
              COALESCE(br.activity_date, br.created_at::date) >= make_date(split_part(_semester, '-', 1)::integer, CASE split_part(_semester, '-', 2) WHEN '1' THEN 1 ELSE 7 END, 1)
              AND COALESCE(br.activity_date, br.created_at::date) < make_date(split_part(_semester, '-', 1)::integer, CASE split_part(_semester, '-', 2) WHEN '1' THEN 7 ELSE 1 END, 1) + CASE WHEN split_part(_semester, '-', 2) = '2' THEN interval '1 year' ELSE interval '0' END
            )
          )
        ))
    ), counted AS (SELECT count(*)::bigint AS total_count FROM filtered),
    page_rows AS (
      SELECT * FROM filtered
      ORDER BY CASE WHEN _sort = 'oldest' THEN created_at END ASC,
               CASE WHEN _sort <> 'oldest' THEN created_at END DESC, id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count,
      COALESCE(jsonb_agg(jsonb_build_object(
        'request', jsonb_build_object(
          'id', p.id, 'organization_id', p.organization_id, 'submitted_by', '',
          'activity_title', p.activity_title, 'activity_description', '',
          'activity_date', NULL, 'venue', '', 'requested_amount', p.requested_amount,
          'approved_amount', p.approved_amount, 'released_amount', p.released_amount,
          'release_date', NULL, 'purpose_category', '', 'fiscal_year', NULL,
          'status', p.status, 'remarks', '', 'admin_remarks', '',
          'go_signal_at', NULL, 'hard_copy_submitted_at', NULL,
          'user_note', '', 'revision_due_at', p.revision_due_at,
          'revision_locked', p.revision_locked, 'revision_locked_at', p.revision_locked_at,
          'revision_history', '[]'::jsonb,
          'public_record_code', p.public_record_code,
          'created_at', p.created_at, 'updated_at', p.updated_at
        ),
        'organization', jsonb_build_object(
          'id', p.organization_id, 'organization_name', p.organization_name,
          'reference_id', p.reference_id, 'urn', p.urn, 'district', p.district,
          'barangay', p.barangay, 'major_classification', p.major_classification
        )
      ) ORDER BY CASE WHEN _sort = 'oldest' THEN p.created_at END ASC,
                 CASE WHEN _sort <> 'oldest' THEN p.created_at END DESC, p.id ASC)
      FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb),
      COALESCE(jsonb_build_object(
        'pendingReview', (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('submitted','under_review') AND (_semester = 'all' OR ypop_entry_id IS NULL OR EXISTS (SELECT 1 FROM public.ypop_entries e WHERE e.id=ypop_entry_id AND (e.semester=_semester OR e.semester ~ ('^' || split_part(_semester, '-', 1) || '[-_]?' || split_part(_semester, '-', 2) || '$'))))),
        'pendingReviewToday', (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('submitted','under_review') AND created_at::date = (now() AT TIME ZONE 'Asia/Manila')::date),
        'releasedTotal', (SELECT COALESCE(sum(released_amount),0) FROM public.budget_requests WHERE status::text IN ('budget_released','completed'))
      ), '{}'::jsonb)
    INTO _total_count, _rows, _summary
    FROM counted LEFT JOIN page_rows p ON true GROUP BY counted.total_count;
  ELSE
    WITH all_liquidation_codes AS (
      SELECT l.id,
        'LR-' || to_char((l.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY l.created_at, l.id)::text, 2, '0')
            ELSE '' END AS public_record_code
      FROM public.liquidation_reports l
      JOIN public.budget_requests linked_budget ON linked_budget.id = l.budget_request_id
      WHERE linked_budget.status::text IN ('budget_released','completed')
    ), all_budget_codes AS (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at, b.id)::text, 2, '0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b WHERE b.status::text <> 'draft'
    ), filtered AS (
      SELECT lr.id, lr.budget_request_id, lr.organization_id, lr.status,
        lr.deadline_at, lr.revision_due_at, lr.revision_locked, lr.revision_locked_at,
        lr.created_at, lr.updated_at,
        lc.public_record_code, bc.public_record_code AS budget_public_record_code,
        br.activity_title, br.requested_amount, br.approved_amount, br.released_amount,
        br.created_at AS budget_created_at, br.updated_at AS budget_updated_at,
        op.organization_name, op.reference_id, op.urn, op.district, op.barangay, op.major_classification
      FROM public.liquidation_reports lr
      JOIN all_liquidation_codes lc ON lc.id = lr.id
      JOIN public.budget_requests br ON br.id = lr.budget_request_id
      JOIN all_budget_codes bc ON bc.id = br.id
      JOIN public.organization_profiles op ON op.id = lr.organization_id
      WHERE br.status::text IN ('budget_released','completed')
        AND (_search_term IS NULL OR br.activity_title ILIKE '%' || _search_term || '%'
          OR op.organization_name ILIKE '%' || _search_term || '%' OR lr.id::text ILIKE '%' || _search_term || '%'
          OR lc.public_record_code ILIKE '%' || _search_term || '%')
        AND (_status IS NULL OR _status = 'all'
          OR (_status = 'ongoing_activity' AND lr.status::text IN ('pending_activity_completion','not_started','draft','needs_revision','approved_for_ftf_green'))
          OR (_status = 'pending_review' AND lr.status::text IN ('submitted','under_review'))
          OR (_status = 'hardcopy_submitted' AND lr.status::text = 'hard_copy_submitted')
          OR (_status = 'liquidated' AND lr.status::text = 'completed_liquidated')
          OR (_status = 'overdue' AND (lr.status::text = 'overdue' OR (lr.deadline_at < now() AND lr.status::text <> 'completed_liquidated'))))
        AND (_district IS NULL OR _district = 'all' OR op.district = _district)
        AND (_barangay IS NULL OR _barangay = 'all' OR op.barangay = _barangay)
        AND (_classification IS NULL OR _classification = 'all' OR op.major_classification = _classification)
    ), counted AS (SELECT count(*)::bigint AS total_count FROM filtered),
    page_rows AS (
      SELECT * FROM filtered
      ORDER BY CASE WHEN _sort = 'oldest' THEN created_at END ASC,
               CASE WHEN _sort <> 'oldest' THEN created_at END DESC, id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count,
      COALESCE(jsonb_agg(jsonb_build_object(
        'report', jsonb_build_object(
          'id', p.id, 'budget_request_id', p.budget_request_id, 'organization_id', p.organization_id,
          'submitted_by', '', 'status', p.status, 'remarks', '',
          'go_signal_at', NULL, 'deadline_at', p.deadline_at,
          'hard_copy_submitted_at', NULL, 'completed_at', NULL,
          'revision_due_at', p.revision_due_at, 'revision_locked', p.revision_locked,
          'revision_locked_at', p.revision_locked_at,
          'public_record_code', p.public_record_code,
          'created_at', p.created_at, 'updated_at', p.updated_at
        ),
        'budget_request', jsonb_build_object(
          'id', p.budget_request_id, 'organization_id', p.organization_id, 'submitted_by', '',
          'activity_title', p.activity_title, 'activity_description', '', 'activity_date', NULL, 'venue', '',
          'requested_amount', p.requested_amount, 'approved_amount', p.approved_amount,
          'released_amount', p.released_amount, 'release_date', NULL, 'purpose_category', '',
          'status', 'draft', 'created_at', p.budget_created_at, 'updated_at', p.budget_updated_at,
          'public_record_code', p.budget_public_record_code
        ),
        'organization', jsonb_build_object(
          'id', p.organization_id, 'organization_name', p.organization_name,
          'reference_id', p.reference_id, 'urn', p.urn, 'district', p.district,
          'barangay', p.barangay, 'major_classification', p.major_classification
        )
      ) ORDER BY CASE WHEN _sort = 'oldest' THEN p.created_at END ASC,
                 CASE WHEN _sort <> 'oldest' THEN p.created_at END DESC, p.id ASC)
      FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb),
      jsonb_build_object(
        'pendingReview', (SELECT count(*) FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
          WHERE br.status::text IN ('budget_released','completed') AND lr.status::text IN ('submitted','under_review')),
        'overdue', (SELECT count(*) FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
          WHERE br.status::text IN ('budget_released','completed') AND (lr.status::text = 'overdue' OR (lr.deadline_at < now() AND lr.status::text <> 'completed_liquidated')))
      )
    INTO _total_count, _rows, _summary
    FROM counted LEFT JOIN page_rows p ON true GROUP BY counted.total_count;
  END IF;
  RETURN jsonb_build_object('rows', _rows, 'totalCount', COALESCE(_total_count,0), 'page', _safe_page, 'pageSize', _safe_page_size, 'summary', _summary);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_budget_request_detail(_session_token text, _request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _request jsonb; _files jsonb;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('budget_requests_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to review budget requests.'; END IF;
  SELECT jsonb_build_object(
    'id',br.id,'organization_id',br.organization_id,'submitted_by',br.submitted_by,'activity_title',br.activity_title,
    'activity_description',br.activity_description,'activity_date',br.activity_date,'venue',br.venue,
    'requested_amount',br.requested_amount,'approved_amount',br.approved_amount,'released_amount',br.released_amount,
    'release_date',br.release_date,'purpose_category',br.purpose_category,'fiscal_year',br.fiscal_year,'status',br.status,
    'remarks',br.remarks,'admin_remarks',br.admin_remarks,'go_signal_at',br.go_signal_at,'hard_copy_submitted_at',br.hard_copy_submitted_at,
    'user_note',br.user_note,'revision_requested_at',br.revision_requested_at,'revision_due_at',br.revision_due_at,
    'revision_locked',br.revision_locked,'revision_locked_at',br.revision_locked_at,'revision_unlocked_at',br.revision_unlocked_at,
    'revision_unlocked_by',br.revision_unlocked_by,'revision_history',br.revision_history,'budget_request_type',br.budget_request_type,
    'ypop_entry_id',br.ypop_entry_id,
    'public_record_code',(SELECT code.public_record_code FROM (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at,b.id)::text,2,'0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b WHERE b.status::text <> 'draft'
    ) code WHERE code.id=br.id),
    'created_at',br.created_at,'updated_at',br.updated_at
  ) INTO _request FROM public.budget_requests br WHERE br.id=_request_id;
  IF _request IS NULL THEN RAISE EXCEPTION 'Budget request was not found.'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',f.id,'budget_request_id',f.budget_request_id,'file_url',f.file_url,
    'file_name',f.file_name,'file_type',f.file_type,'file_size',f.file_size,'uploaded_at',f.uploaded_at,'created_at',f.created_at,
    'admin_status',f.admin_status,'admin_remarks',f.admin_remarks) ORDER BY f.created_at DESC),'[]'::jsonb)
  INTO _files FROM public.budget_request_files f WHERE f.budget_request_id=_request_id;
  RETURN jsonb_build_object('request',_request,'files',_files);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_budget_request_detail(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_budget_request_detail(text,uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_liquidation_report_detail(_session_token text, _report_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _report jsonb; _files jsonb; _budget jsonb;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('liquidation_reports_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to review liquidation reports.'; END IF;
  SELECT jsonb_build_object('id',lr.id,'budget_request_id',lr.budget_request_id,'organization_id',lr.organization_id,
    'submitted_by',lr.submitted_by,'status',lr.status,'remarks',lr.remarks,'go_signal_at',lr.go_signal_at,'deadline_at',lr.deadline_at,
    'hard_copy_submitted_at',lr.hard_copy_submitted_at,'completed_at',lr.completed_at,'revision_requested_at',lr.revision_requested_at,
    'revision_due_at',lr.revision_due_at,'revision_locked',lr.revision_locked,'revision_locked_at',lr.revision_locked_at,
    'revision_unlocked_at',lr.revision_unlocked_at,'revision_unlocked_by',lr.revision_unlocked_by,
    'public_record_code',(SELECT code.public_record_code FROM (
      SELECT l.id,
        'LR-' || to_char((l.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY l.created_at,l.id)::text,2,'0')
            ELSE '' END AS public_record_code
      FROM public.liquidation_reports l JOIN public.budget_requests b ON b.id=l.budget_request_id
      WHERE b.status::text IN ('budget_released','completed')
    ) code WHERE code.id=lr.id),
    'created_at',lr.created_at,'updated_at',lr.updated_at)
  INTO _report FROM public.liquidation_reports lr WHERE lr.id=_report_id;
  IF _report IS NULL THEN RAISE EXCEPTION 'Liquidation report was not found.'; END IF;
  SELECT jsonb_build_object('id',br.id,'organization_id',br.organization_id,'submitted_by',br.submitted_by,'activity_title',br.activity_title,
    'activity_description',br.activity_description,'activity_date',br.activity_date,'venue',br.venue,'requested_amount',br.requested_amount,
    'approved_amount',br.approved_amount,'released_amount',br.released_amount,'release_date',br.release_date,'purpose_category',br.purpose_category,
    'fiscal_year',br.fiscal_year,'status',br.status,'remarks',br.remarks,'admin_remarks',br.admin_remarks,'go_signal_at',br.go_signal_at,
    'hard_copy_submitted_at',br.hard_copy_submitted_at,'user_note',br.user_note,'revision_history',br.revision_history,
    'public_record_code',(SELECT code.public_record_code FROM (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at,b.id)::text,2,'0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b WHERE b.status::text <> 'draft'
    ) code WHERE code.id=br.id),
    'created_at',br.created_at,'updated_at',br.updated_at) INTO _budget
  FROM public.budget_requests br WHERE br.id=(_report->>'budget_request_id')::uuid;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',f.id,'liquidation_report_id',f.liquidation_report_id,'file_url',f.file_url,
    'file_name',f.file_name,'file_type',f.file_type,'file_size',f.file_size,'uploaded_at',f.uploaded_at,'created_at',f.created_at,
    'admin_status',f.admin_status,'admin_remarks',f.admin_remarks) ORDER BY f.created_at DESC),'[]'::jsonb)
  INTO _files FROM public.liquidation_report_files f WHERE f.liquidation_report_id=_report_id;
  RETURN jsonb_build_object('report',_report,'budget_request',_budget,'files',_files);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_liquidation_report_detail(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_liquidation_report_detail(text,uuid) TO anon, authenticated, service_role;

-- YPOP reads are split into small period metadata, one paged semester queue,
-- one opened-entry packet, and file metadata for only the selected item.
CREATE OR REPLACE FUNCTION public.admin_get_ypop_validation_periods(_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[];
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('ypop_validation_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to view YPOP validation.'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('period',jsonb_build_object(
      'id',p.id,'semester_key',p.semester_key,'semester_label',p.semester_label,
      'validation_deadline',p.validation_deadline,'status',p.status,'org_led_tiers',p.org_led_tiers,
      'created_at',p.created_at,'updated_at',p.updated_at),
      'submission_count',(SELECT count(*) FROM public.ypop_entries e WHERE e.semester=p.semester_key),
      'activity_count',(SELECT count(*) FROM public.ypop_city_activities a WHERE a.semester_key=p.semester_key))
      ORDER BY p.created_at DESC,p.id)
    FROM public.ypop_periods p
  ),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_ypop_validation_periods(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_validation_periods(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_period_submissions_page(
  _session_token text,_period_id uuid,_page integer DEFAULT 0,_page_size integer DEFAULT 20,
  _search text DEFAULT NULL,_classification text DEFAULT 'all',_qualification_status text DEFAULT 'all'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  _admin_id uuid; _role_code text; _permission_codes text[]; _semester text;
  _safe_page bigint:=GREATEST(COALESCE(_page,0),0)::bigint;
  _safe_size integer:=LEAST(GREATEST(COALESCE(_page_size,20),1),50);
  _search_term text:=NULLIF(btrim(COALESCE(_search,'')),'');
  _rows jsonb; _total bigint; _summary jsonb;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('ypop_validation_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to view YPOP validation.'; END IF;
  SELECT semester_key INTO _semester FROM public.ypop_periods WHERE id=_period_id;
  IF _semester IS NULL THEN RAISE EXCEPTION 'YPOP semester was not found.'; END IF;

  WITH period AS (SELECT * FROM public.ypop_periods WHERE id=_period_id),
  candidate_orgs AS (
    SELECT e.organization_id FROM public.ypop_entries e WHERE e.semester=_semester
    UNION
    SELECT p.organization_id FROM public.ypop_event_participations p
    JOIN public.ypop_city_activities a ON a.id=p.activity_id AND a.semester_key=_semester
    WHERE p.status::text <> 'draft'
  ),
  selected_entries AS (
    SELECT DISTINCT ON (e.organization_id) e.* FROM public.ypop_entries e
    WHERE e.semester=_semester ORDER BY e.organization_id,e.created_at DESC,e.id
  ),
  candidate AS (
    SELECT o.organization_id,op.organization_name,op.reference_id,op.major_classification,
      e.id AS entry_id,e.points_required,e.status AS entry_status,
      e.org_led_project_count,e.city_led_attendance,e.created_at,
      p.status AS period_status,p.org_led_tiers,
      COALESCE((SELECT sum(CASE WHEN a.points>=4 THEN 4 WHEN a.points>=3 THEN 3 ELSE 2 END)
        FROM public.ypop_city_activities a WHERE a.semester_key=_semester),0)::numeric AS city_max,
      COALESCE((SELECT sum(CASE WHEN a.points>=4 THEN 4 WHEN a.points>=3 THEN 3 ELSE 2 END)
        FROM public.ypop_city_activities a
        WHERE a.semester_key=_semester AND (
          EXISTS (SELECT 1 FROM public.ypop_event_participations ep WHERE ep.organization_id=o.organization_id AND ep.activity_id=a.id AND ep.status::text='verified')
          OR (NOT EXISTS (SELECT 1 FROM public.ypop_event_participations ep WHERE ep.organization_id=o.organization_id AND ep.activity_id=a.id)
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(e.city_led_attendance,'[]'::jsonb)) legacy
              WHERE legacy->>'activityId'=a.id::text AND COALESCE((legacy->>'attended')::boolean,false)))
        )),0)::numeric AS city_earned,
      (SELECT count(*) FROM public.ypop_org_activities oa WHERE oa.ypop_entry_id=e.id AND oa.status::text='approved')::integer AS approved_ppa_count,
      (SELECT count(*) FROM public.ypop_event_participations ep JOIN public.ypop_city_activities a ON a.id=ep.activity_id
        WHERE ep.organization_id=o.organization_id AND a.semester_key=_semester AND ep.status::text IN ('pending_evaluation','pending_verification'))
        + (SELECT count(*) FROM public.ypop_org_activities oa WHERE oa.ypop_entry_id=e.id AND oa.status::text IN ('pending_evaluation','submitted','under_review')) AS unreviewed_count,
      (SELECT count(*) FROM public.ypop_event_participations ep JOIN public.ypop_city_activities a ON a.id=ep.activity_id
        WHERE ep.organization_id=o.organization_id AND a.semester_key=_semester AND ep.status::text='needs_revision')
        + (SELECT count(*) FROM public.ypop_org_activities oa WHERE oa.ypop_entry_id=e.id AND oa.status::text='needs_revision') AS revision_count,
      (SELECT count(*) FROM public.ypop_event_participations ep JOIN public.ypop_city_activities a ON a.id=ep.activity_id
        WHERE ep.organization_id=o.organization_id AND a.semester_key=_semester AND ep.status::text <> 'draft')
        + (SELECT count(*) FROM public.ypop_org_activities oa WHERE oa.ypop_entry_id=e.id AND oa.status::text <> 'draft') AS submitted_count,
      (SELECT count(*) FROM public.ypop_org_activities oa WHERE oa.ypop_entry_id=e.id AND oa.status::text<>'draft') AS org_activity_count
    FROM candidate_orgs o
    JOIN public.organization_profiles op ON op.id=o.organization_id
    LEFT JOIN selected_entries e ON e.organization_id=o.organization_id
    CROSS JOIN period p
  ), scored AS (
    SELECT c.*,
      round(CASE WHEN city_max>0 THEN city_earned/city_max*100 ELSE 0 END)
        + COALESCE((SELECT (tier->>'bonus')::integer FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(org_led_tiers)='array' AND jsonb_array_length(org_led_tiers)>0
              THEN org_led_tiers ELSE '[{"minProjects":1,"bonus":10},{"minProjects":4,"bonus":15},{"minProjects":7,"bonus":20},{"minProjects":10,"bonus":25}]'::jsonb END) tier
          WHERE (CASE WHEN org_activity_count=0 THEN COALESCE(org_led_project_count,0) ELSE approved_ppa_count END) >= (tier->>'minProjects')::integer
          ORDER BY (tier->>'minProjects')::integer DESC LIMIT 1),0) AS score,
      CASE WHEN round(CASE WHEN city_max>0 THEN city_earned/city_max*100 ELSE 0 END)
          + COALESCE((SELECT (tier->>'bonus')::integer FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(org_led_tiers)='array' AND jsonb_array_length(org_led_tiers)>0
                THEN org_led_tiers ELSE '[{"minProjects":1,"bonus":10},{"minProjects":4,"bonus":15},{"minProjects":7,"bonus":20},{"minProjects":10,"bonus":25}]'::jsonb END) tier
            WHERE (CASE WHEN org_activity_count=0 THEN COALESCE(org_led_project_count,0) ELSE approved_ppa_count END) >= (tier->>'minProjects')::integer
            ORDER BY (tier->>'minProjects')::integer DESC LIMIT 1),0) >= COALESCE(points_required,70) OR entry_status::text='qualified' THEN 'qualified'
        WHEN period_status::text='closed' THEN 'not_qualified'
        WHEN unreviewed_count>0 OR revision_count>0 THEN 'pending_evaluation'
        WHEN entry_status::text='not_qualified' THEN 'not_qualified'
        WHEN submitted_count=0 OR entry_id IS NULL OR entry_status::text IN ('draft','submitted','under_review','needs_revision') THEN 'pending_evaluation'
        ELSE 'not_qualified' END AS qualification_status
    FROM candidate c
  ), filtered AS (
    SELECT * FROM scored WHERE
      (_search_term IS NULL OR organization_name ILIKE '%'||_search_term||'%' OR COALESCE(reference_id,'') ILIKE '%'||_search_term||'%')
      AND (_classification IS NULL OR _classification='all' OR major_classification=_classification)
      AND (_qualification_status IS NULL OR _qualification_status='all' OR qualification_status=_qualification_status)
  ), counts AS (SELECT count(*)::bigint total_count FROM filtered),
  page_rows AS (SELECT * FROM filtered ORDER BY created_at DESC NULLS LAST,organization_name,organization_id LIMIT _safe_size OFFSET (_safe_page*_safe_size))
  SELECT counts.total_count,
    COALESCE(jsonb_agg(jsonb_build_object(
      'id',COALESCE(p.entry_id,'virtual-'||_semester||'-'||p.organization_id::text),
      'organization_id',p.organization_id,'organization_name',p.organization_name,'reference_id',COALESCE(p.reference_id,''),
      'major_classification',COALESCE(p.major_classification,''),'qualification_status',p.qualification_status
    ) ORDER BY p.created_at DESC NULLS LAST,p.organization_name,p.organization_id) FILTER(WHERE p.organization_id IS NOT NULL),'[]'::jsonb),
    jsonb_build_object(
      'pending_evaluation',(SELECT count(*) FROM scored WHERE qualification_status='pending_evaluation'),
      'qualified',(SELECT count(*) FROM scored WHERE qualification_status='qualified'),
      'not_qualified',(SELECT count(*) FROM scored WHERE qualification_status='not_qualified')
    )
  INTO _total,_rows,_summary FROM counts LEFT JOIN page_rows p ON true GROUP BY counts.total_count;
  RETURN jsonb_build_object('rows',_rows,'totalCount',COALESCE(_total,0),'page',_safe_page,'pageSize',_safe_size,'summary',_summary);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_entry_review_detail(_session_token text,_entry_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _entry public.ypop_entries%ROWTYPE; _period public.ypop_periods%ROWTYPE;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('ypop_validation_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to review YPOP validation.'; END IF;
  SELECT * INTO _entry FROM public.ypop_entries WHERE id=_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'YPOP entry was not found.'; END IF;
  SELECT * INTO _period FROM public.ypop_periods WHERE semester_key=_entry.semester ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'entry',to_jsonb(_entry),
    'organization',(SELECT to_jsonb(op) FROM public.organization_profiles op WHERE op.id=_entry.organization_id),
    'period',CASE WHEN _period.id IS NULL THEN NULL ELSE to_jsonb(_period) END,
    'city_activities',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at,a.id),'[]'::jsonb) FROM public.ypop_city_activities a WHERE a.semester_key=_entry.semester),
    'event_participations',(SELECT COALESCE(jsonb_agg(to_jsonb(ep) ORDER BY ep.created_at,ep.id),'[]'::jsonb)
      FROM public.ypop_event_participations ep JOIN public.ypop_city_activities a ON a.id=ep.activity_id
      WHERE ep.organization_id=_entry.organization_id AND a.semester_key=_entry.semester AND ep.status::text<>'draft'),
    'org_activities',(SELECT COALESCE(jsonb_agg(to_jsonb(oa) ORDER BY oa.created_at,oa.id),'[]'::jsonb)
      FROM public.ypop_org_activities oa WHERE oa.ypop_entry_id=_entry.id AND oa.status::text<>'draft')
  );
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_ypop_entry_review_detail(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entry_review_detail(text,uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_review_files(_session_token text,_lane text,_parent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[];
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('ypop_validation_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to review YPOP validation.'; END IF;
  IF _lane='city_led' THEN
    RETURN COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.uploaded_at DESC,f.id) FROM public.ypop_event_files f WHERE f.participation_id=_parent_id),'[]'::jsonb);
  ELSIF _lane='org_led' THEN
    RETURN COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.uploaded_at DESC,f.id) FROM public.ypop_org_activity_files f WHERE f.org_activity_id=_parent_id),'[]'::jsonb);
  END IF;
  RAISE EXCEPTION 'Unsupported YPOP review lane.';
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_ypop_review_files(text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_review_files(text,text,uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_period_city_activities(_session_token text,_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _semester text;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('ypop_validation_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to edit YPOP periods.'; END IF;
  SELECT semester_key INTO _semester FROM public.ypop_periods WHERE id=_period_id;
  IF _semester IS NULL THEN RAISE EXCEPTION 'YPOP semester was not found.'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id',a.id,'semester_key',a.semester_key,'name',a.name,'date',a.date,'start_date',a.start_date,
    'end_date',a.end_date,'venue',a.venue,'points',a.points,'created_at',a.created_at
  ) ORDER BY a.date,a.id) FROM public.ypop_city_activities a WHERE a.semester_key=_semester),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_ypop_period_city_activities(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_city_activities(text,uuid) TO anon, authenticated, service_role;

-- Renewal list pages carry only the visible queue columns and aggregated
-- document counts. Full organization context and files are fetched only after
-- an Admin opens one renewal.
CREATE OR REPLACE FUNCTION public.admin_get_renewal_queue_page(
  _session_token text, _page integer DEFAULT 0, _page_size integer DEFAULT 20,
  _search text DEFAULT NULL, _status text DEFAULT 'all', _district text DEFAULT 'all',
  _barangay text DEFAULT 'all', _classification text DEFAULT 'all',
  _required_document_type_ids uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  _admin_id uuid; _role_code text; _permission_codes text[];
  _safe_page bigint := GREATEST(COALESCE(_page,0),0)::bigint;
  _safe_size integer := LEAST(GREATEST(COALESCE(_page_size,20),1),50);
  _search_term text := NULLIF(btrim(COALESCE(_search,'')), '');
  _rows jsonb; _total bigint;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[])
  INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin'
     AND NOT ('renewals_manage'=ANY(_permission_codes) OR 'registrations_management'=ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to view renewal applications.';
  END IF;

  WITH queue AS (
    SELECT
      r.id,r.organization_id,r.cycle_number,r.current_accreditation_id,r.certificate_urn,
      r.status,r.submitted_at,r.reviewed_by,r.reviewed_at,r.admin_remarks,
      r.revision_requested_at,r.revision_due_at,r.revision_locked,r.revision_locked_at,
      r.revision_unlocked_at,r.revision_unlocked_by,r.created_at,r.updated_at,
      op.organization_name,op.reference_id,op.urn,op.user_id,op.district,op.barangay,op.major_classification,
      ac.id AS accreditation_id,ac.term_number,ac.start_date,ac.end_date,ac.certificate_urn AS accreditation_urn,
      ac.status AS accreditation_status,ac.is_legacy_inferred,ac.approved_by,ac.approved_at,ac.created_at AS accreditation_created_at,
      packet.submission_id,COALESCE(packet.submitted_count,0)::integer AS submitted_count
    FROM public.organization_renewals r
    JOIN public.organization_profiles op ON op.id=r.organization_id
    LEFT JOIN public.organization_accreditations ac ON ac.id=r.current_accreditation_id
    LEFT JOIN LATERAL (
      SELECT ds.id AS submission_id,
        (SELECT count(DISTINCT f.document_type_id)
         FROM public.document_submission_files f
         WHERE f.submission_id=ds.id AND f.admin_status::text <> 'draft'
           AND f.document_type_id=ANY(COALESCE(_required_document_type_ids,ARRAY[]::uuid[]))) AS submitted_count
      FROM public.document_submissions ds
      WHERE ds.renewal_id=r.id OR (ds.renewal_id IS NULL AND ds.organization_id=r.organization_id AND ds.submission_scope::text='renewal')
      ORDER BY (ds.renewal_id=r.id) DESC, ds.created_at DESC, ds.id
      LIMIT 1
    ) packet ON true
    WHERE (_search_term IS NULL OR op.organization_name ILIKE '%'||_search_term||'%'
      OR COALESCE(op.reference_id,'') ILIKE '%'||_search_term||'%'
      OR COALESCE(op.urn,'') ILIKE '%'||_search_term||'%' OR r.id::text ILIKE '%'||_search_term||'%')
      AND (_status IS NULL OR _status='all'
        OR (_status='approved' AND r.status::text='approved')
        OR (_status='pending_review' AND r.status::text<>'approved'))
      AND (_district IS NULL OR _district='all' OR op.district=_district)
      AND (_barangay IS NULL OR _barangay='all' OR op.barangay=_barangay)
      AND (_classification IS NULL OR _classification='all' OR op.major_classification=_classification)
  ), counted AS (SELECT count(*)::bigint AS total_count FROM queue),
  page_rows AS (
    SELECT * FROM queue
    ORDER BY submitted_at DESC NULLS LAST,created_at DESC,id
    LIMIT _safe_size OFFSET (_safe_page*_safe_size)
  )
  SELECT counted.total_count,
    COALESCE(jsonb_agg(jsonb_build_object(
      'renewal',jsonb_build_object(
        'id',p.id,'organization_id',p.organization_id,'cycle_number',p.cycle_number,
        'current_accreditation_id',p.current_accreditation_id,'certificate_urn',p.certificate_urn,
        'status',p.status,'submitted_at',p.submitted_at,'reviewed_by',p.reviewed_by,'reviewed_at',p.reviewed_at,
        'admin_remarks',p.admin_remarks,'revision_requested_at',p.revision_requested_at,'revision_due_at',p.revision_due_at,
        'revision_locked',p.revision_locked,'revision_locked_at',p.revision_locked_at,
        'revision_unlocked_at',p.revision_unlocked_at,'revision_unlocked_by',p.revision_unlocked_by,
        'created_at',p.created_at,'updated_at',p.updated_at),
      'organization',jsonb_build_object(
        'id',p.organization_id,'reference_id',p.reference_id,'user_id',p.user_id,
        'organization_name',p.organization_name,'urn',p.urn,'district',p.district,
        'barangay',p.barangay,'major_classification',p.major_classification),
      'accreditation',CASE WHEN p.accreditation_id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',p.accreditation_id,'organization_id',p.organization_id,'term_number',p.term_number,
        'start_date',p.start_date,'end_date',p.end_date,'certificate_urn',p.accreditation_urn,
        'status',p.accreditation_status,'is_legacy_inferred',p.is_legacy_inferred,'approved_by',p.approved_by,
        'approved_at',p.approved_at,'created_at',p.accreditation_created_at) END,
      'submitted_document_count',p.submitted_count,'linked_document_submission_id',p.submission_id
    ) ORDER BY p.submitted_at DESC NULLS LAST,p.created_at DESC,p.id)
    FILTER (WHERE p.id IS NOT NULL),'[]'::jsonb)
  INTO _total,_rows FROM counted LEFT JOIN page_rows p ON true GROUP BY counted.total_count;
  RETURN jsonb_build_object('rows',_rows,'totalCount',COALESCE(_total,0),'page',_safe_page,'pageSize',_safe_size,
    'summary',jsonb_build_object('approved',(SELECT count(*) FROM public.organization_renewals WHERE status::text='approved'),
      'pending_review',(SELECT count(*) FROM public.organization_renewals WHERE status::text<>'approved')));
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[]) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.admin_get_renewal_review_context(_session_token text,_renewal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _renewal public.organization_renewals%ROWTYPE;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[])
  INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin'
     AND NOT ('renewals_manage'=ANY(_permission_codes) OR 'registrations_management'=ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to review renewal applications.';
  END IF;
  SELECT * INTO _renewal FROM public.organization_renewals WHERE id=_renewal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Renewal application was not found.'; END IF;
  RETURN jsonb_build_object(
    'renewal',to_jsonb(_renewal),
    'organization',(SELECT to_jsonb(op) FROM public.organization_profiles op WHERE op.id=_renewal.organization_id),
    'accreditation',(SELECT to_jsonb(ac) FROM public.organization_accreditations ac WHERE ac.id=_renewal.current_accreditation_id)
  );
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_renewal_review_context(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_review_context(text,uuid) TO anon,authenticated,service_role;

NOTIFY pgrst, 'reload schema';
