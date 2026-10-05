-- Preserve the stored release date in the paginated Admin budget queue.
-- Export consumes these same bounded rows; no extra detail queries are needed.
-- Existing authorization, filters, pagination, and liquidation projection are preserved.
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
        br.requested_amount, br.approved_amount, br.released_amount, br.release_date, br.status,
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
          'release_date', p.release_date, 'purpose_category', '', 'fiscal_year', NULL,
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

NOTIFY pgrst, 'reload schema';
