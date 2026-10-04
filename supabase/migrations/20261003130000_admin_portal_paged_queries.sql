-- Replace unbounded admin list reads with session-validated, bounded queries.
-- Every resource has an explicit permission check because these functions run
-- with SECURITY DEFINER and do not rely on caller-side route guards.
CREATE OR REPLACE FUNCTION public.admin_get_portal_list_page(
  _session_token text,
  _resource text,
  _page integer DEFAULT 0,
  _page_size integer DEFAULT 10,
  _search text DEFAULT NULL,
  _status text DEFAULT 'all',
  _district text DEFAULT 'all',
  _barangay text DEFAULT 'all',
  _classification text DEFAULT 'all',
  _date_range text DEFAULT 'all',
  _sort text DEFAULT 'newest'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _required_permission text;
  -- Keep offset multiplication in bigint so an extreme page number cannot overflow int4.
  _safe_page bigint := GREATEST(COALESCE(_page, 0), 0)::bigint;
  _safe_page_size integer := LEAST(GREATEST(COALESCE(_page_size, 10), 1), 50);
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

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  _required_permission := CASE _resource
    WHEN 'registrations' THEN 'registrations_management'
    WHEN 'inquiries' THEN 'inquiries_management'
    WHEN 'activity_logs' THEN 'activity_logs_view'
    ELSE NULL
  END;

  IF _required_permission IS NULL THEN
    RAISE EXCEPTION 'Unsupported admin list resource.';
  END IF;
  IF _role_code <> 'super_admin' AND NOT (_required_permission = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to view this admin list.';
  END IF;

  IF _resource = 'registrations' THEN
    WITH filtered_profiles AS (
      SELECT op.*
      FROM public.organization_profiles op
      WHERE (
          _search_term IS NULL OR
          op.organization_name ILIKE '%' || _search_term || '%' OR
          op.organization_email ILIKE '%' || _search_term || '%' OR
          COALESCE(op.reference_id, '') ILIKE '%' || _search_term || '%' OR
          COALESCE(op.barangay, '') ILIKE '%' || _search_term || '%' OR
          COALESCE(op.district, '') ILIKE '%' || _search_term || '%'
        )
        AND (_status IS NULL OR _status = 'all' OR
          (_status = 'pending_review' AND op.profile_status::text IN ('pending_review', 'incomplete')) OR
          (_status <> 'pending_review' AND op.profile_status::text = _status))
        AND (_district IS NULL OR _district = 'all' OR op.district = _district)
        AND (_barangay IS NULL OR _barangay = 'all' OR op.barangay = _barangay)
        AND (_classification IS NULL OR _classification = 'all' OR op.major_classification = _classification)
    ), counted AS (
      SELECT count(*)::bigint AS total_count FROM filtered_profiles
    ), page_rows AS (
      SELECT op.*
      FROM filtered_profiles op
      ORDER BY
        CASE WHEN _sort = 'oldest' THEN op.created_at END ASC,
        CASE WHEN _sort <> 'oldest' THEN op.created_at END DESC,
        op.id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          -- Keep private registration fields out of a queue response. Detail
          -- data is loaded when an administrator opens an organization.
          'profile', jsonb_build_object(
            'id', page_rows.id,
            'reference_id', page_rows.reference_id,
            'user_id', page_rows.user_id,
            'organization_name', page_rows.organization_name,
            'organization_email', page_rows.organization_email,
            'district', page_rows.district,
            'barangay', page_rows.barangay,
            'is_existing_organization', page_rows.is_existing_organization,
            'organization_identifier_number', page_rows.organization_identifier_number,
            'registration_type', page_rows.registration_type,
            'urn', page_rows.urn,
            'major_classification', page_rows.major_classification,
            'profile_status', page_rows.profile_status,
            'created_at', page_rows.created_at,
            'updated_at', page_rows.updated_at
          ),
          'submitted_document_count', document_counts.submitted_document_count
        ) ORDER BY
          CASE WHEN _sort = 'oldest' THEN page_rows.created_at END ASC,
          CASE WHEN _sort <> 'oldest' THEN page_rows.created_at END DESC,
          page_rows.id ASC
      ) FILTER (WHERE page_rows.id IS NOT NULL), '[]'::jsonb)
    INTO _total_count, _rows
    FROM counted
    LEFT JOIN page_rows ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS submitted_document_count
      FROM public.document_submissions ds
      JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
      WHERE ds.organization_id = page_rows.id
        AND COALESCE(ds.submission_scope::text, 'registration') = 'registration'
        AND dsf.admin_status::text <> 'draft'
        AND dsf.document_type_id IS NOT NULL
    ) document_counts ON true;

    SELECT jsonb_build_object(
      'total', count(*),
      'verified', count(*) FILTER (WHERE profile_status::text = 'verified'),
      'pendingReview', count(*) FILTER (WHERE profile_status::text IN ('pending_review', 'incomplete')),
      'needsRevision', count(*) FILTER (WHERE profile_status::text = 'needs_update'),
      'suspended', count(*) FILTER (WHERE profile_status::text = 'suspended_inactive')
    ) INTO _summary
    FROM public.organization_profiles;

  ELSIF _resource = 'inquiries' THEN
    WITH filtered_inquiries AS (
      SELECT i.*
      FROM public.inquiries i
      WHERE (
          _search_term IS NULL OR
          i.organization_name ILIKE '%' || _search_term || '%' OR
          i.submitter_name ILIKE '%' || _search_term || '%' OR
          i.email::text ILIKE '%' || _search_term || '%' OR
          i.subject ILIKE '%' || _search_term || '%' OR
          i.description ILIKE '%' || _search_term || '%' OR
          i.id::text ILIKE '%' || _search_term || '%'
        )
        AND (_status IS NULL OR _status = 'all' OR i.status::text = _status)
    ), counted AS (
      SELECT count(*)::bigint AS total_count FROM filtered_inquiries
    ), page_rows AS (
      SELECT * FROM filtered_inquiries
      ORDER BY
        CASE WHEN _sort = 'oldest' THEN created_at END ASC,
        CASE WHEN _sort <> 'oldest' THEN created_at END DESC,
        id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count, COALESCE(jsonb_agg(jsonb_build_object(
      'id', page_rows.id,
      'organization_id', page_rows.organization_id,
      'submitted_by', page_rows.submitted_by,
      'submitter_name', page_rows.submitter_name,
      'organization_name', page_rows.organization_name,
      'email', page_rows.email,
      'subject', page_rows.subject,
      'description', page_rows.description,
      'status', page_rows.status,
      'admin_remarks', page_rows.admin_remarks,
      'reviewed_at', page_rows.reviewed_at,
      'created_at', page_rows.created_at,
      'updated_at', page_rows.updated_at
    ) ORDER BY
      CASE WHEN _sort = 'oldest' THEN page_rows.created_at END ASC,
      CASE WHEN _sort <> 'oldest' THEN page_rows.created_at END DESC,
      page_rows.id ASC) FILTER (WHERE page_rows.id IS NOT NULL), '[]'::jsonb)
    INTO _total_count, _rows
    FROM counted LEFT JOIN page_rows ON true;

    SELECT jsonb_build_object(
      'total', count(*),
      'pendingReview', count(*) FILTER (WHERE status::text NOT IN ('reviewed', 'responded', 'in_review', 'closed', 'resolved')),
      'reviewed', count(*) FILTER (WHERE status::text IN ('reviewed', 'responded', 'in_review')),
      'closed', count(*) FILTER (WHERE status::text IN ('closed', 'resolved'))
    ) INTO _summary
    FROM public.inquiries;

  ELSE
    WITH filtered_logs AS (
      SELECT l.*
      FROM public.activity_logs l
      WHERE (
          _search_term IS NULL OR l.action ILIKE '%' || _search_term || '%' OR
          replace(l.action, '_', ' ') ILIKE '%' || _search_term || '%' OR
          l.description ILIKE '%' || _search_term || '%' OR
          l.related_type ILIKE '%' || _search_term || '%' OR
          replace(l.related_type, '_', ' ') ILIKE '%' || _search_term || '%' OR
          l.actor_user_id::text ILIKE '%' || _search_term || '%' OR
          EXISTS (
            SELECT 1 FROM public.admin_accounts aa
            WHERE aa.id = l.actor_user_id
              AND (aa.display_name ILIKE '%' || _search_term || '%'
                OR aa.email ILIKE '%' || _search_term || '%')
          )
        )
        AND (_status IS NULL OR _status = 'all' OR l.related_type = _status)
        AND (
          _date_range IS NULL OR _date_range = 'all' OR
          (_date_range = '7d' AND l.created_at >= now() - interval '7 days') OR
          (_date_range = '30d' AND l.created_at >= now() - interval '30 days') OR
          (_date_range = '90d' AND l.created_at >= now() - interval '90 days')
        )
    ), counted AS (
      SELECT count(*)::bigint AS total_count FROM filtered_logs
    ), page_rows AS (
      SELECT * FROM filtered_logs
      ORDER BY
        CASE WHEN _sort = 'oldest' THEN created_at END ASC,
        CASE WHEN _sort <> 'oldest' THEN created_at END DESC,
        id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count, COALESCE(jsonb_agg(jsonb_build_object(
      'id', page_rows.id,
      'actor_user_id', page_rows.actor_user_id,
      'organization_id', page_rows.organization_id,
      'action', page_rows.action,
      'related_type', page_rows.related_type,
      'related_id', page_rows.related_id,
      'description', page_rows.description,
      'organization_name', org.organization_name,
      'created_at', page_rows.created_at
    ) ORDER BY
      CASE WHEN _sort = 'oldest' THEN page_rows.created_at END ASC,
      CASE WHEN _sort <> 'oldest' THEN page_rows.created_at END DESC,
      page_rows.id ASC) FILTER (WHERE page_rows.id IS NOT NULL), '[]'::jsonb)
    INTO _total_count, _rows
    FROM counted
    LEFT JOIN page_rows ON true
    LEFT JOIN public.organization_profiles org ON org.id = page_rows.organization_id;
  END IF;

  RETURN jsonb_build_object(
    'rows', _rows,
    'summary', _summary,
    'totalCount', COALESCE(_total_count, 0),
    'page', _safe_page,
    'pageSize', _safe_page_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_portal_list_page(text, text, integer, integer, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_portal_list_page(text, text, integer, integer, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- The primary unfiltered orderings used by the registration and activity log
-- queues were missing matching indexes. Existing status/search indexes remain
-- unchanged; no extension or trigram index is added until search plans justify it.
CREATE INDEX IF NOT EXISTS idx_organization_profiles_created_at_desc
  ON public.organization_profiles (created_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc
  ON public.activity_logs (created_at DESC, id ASC);

NOTIFY pgrst, 'reload schema';

-- The global admin shell and notification page need a small recent window and
-- unread count, not every historical notification.
CREATE OR REPLACE FUNCTION public.admin_get_recent_notifications(
  _session_token text,
  _limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _safe_limit integer := LEAST(GREATEST(COALESCE(_limit, 25), 1), 50);
  _rows jsonb;
  _unread_count bigint;
BEGIN
  SELECT vat.admin_id
    INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  SELECT count(*) INTO _unread_count
  FROM public.notifications n
  WHERE n.user_id::text IN (_admin_id::text, 'admin') AND n.is_read = false;

  SELECT COALESCE(jsonb_agg(to_jsonb(recent) ORDER BY recent.created_at DESC, recent.id DESC), '[]'::jsonb)
    INTO _rows
  FROM (
    SELECT n.*
    FROM public.notifications n
    WHERE n.user_id::text IN (_admin_id::text, 'admin')
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT _safe_limit
  ) recent;

  RETURN jsonb_build_object('unreadCount', _unread_count, 'notifications', _rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_recent_notifications(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_notifications(text, integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- The dashboard needs counts and a handful of recent records, not the portal
-- snapshot or complete workflow tables.
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_summary(
  _session_token text,
  _fiscal_year integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _summary jsonb;
  _attention jsonb;
  _recent_activity jsonb;
  _budget_totals jsonb;
BEGIN
  SELECT vat.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
    INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  JOIN public.roles r ON r.id = aa.role_id
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  SELECT jsonb_strip_nulls(jsonb_build_object(
    'organizationsTotal', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_profiles) END,
    'pendingProfiles', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_profiles WHERE profile_status::text IN ('pending_review', 'incomplete')) END,
    'nonCompliant', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_profiles WHERE profile_status::text = 'suspended_inactive') END,
    'pendingDocuments', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.document_submissions WHERE status::text IN ('submitted', 'under_admin_review')) END,
    'revisions', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.document_submissions WHERE status::text = 'needs_revision') END,
    'approvedDocs', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.document_submissions WHERE status::text = 'approved_green') END,
    'pendingRenewals', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_renewals WHERE status::text <> 'approved') END,
    'budgetRequestsTotal', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text <> 'draft') END,
    'pendingBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('submitted', 'under_review')) END,
    'approvedBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted')) END,
    'releasedBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text = 'budget_released') END,
    'liquidationsTotal', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.liquidation_reports) END,
    'pendingLiquidation', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text IN ('submitted', 'under_review')) END,
    'overdueLiquidation', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text = 'overdue') END,
    'inquiriesTotal', CASE WHEN _role_code = 'super_admin' OR 'inquiries_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.inquiries) END,
    'pendingInquiries', CASE WHEN _role_code = 'super_admin' OR 'inquiries_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.inquiries WHERE status::text = 'pending_review') END,
    'ypopEntriesTotal', CASE WHEN _role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.ypop_entries) END,
    'pendingYpop', CASE WHEN _role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permission_codes) THEN
      (SELECT count(*) FROM public.ypop_event_participations WHERE status::text IN ('pending_evaluation', 'pending_verification')) +
      (SELECT count(*) FROM public.ypop_org_activities WHERE status::text IN ('pending_evaluation', 'submitted', 'under_review')) END
  )) INTO _summary;

  _budget_totals := NULL;
  IF _role_code = 'super_admin' OR 'budget_monitoring_view' = ANY(_permission_codes) THEN
    SELECT jsonb_build_object(
      'approved', COALESCE(sum(CASE WHEN br.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed', 'approved', 'approved_green', 'conditionally_approved_amber') THEN COALESCE(br.approved_amount, br.requested_amount, 0) ELSE 0 END), 0),
      'released', COALESCE(sum(CASE WHEN br.status::text IN ('budget_released', 'completed', 'released') THEN COALESCE(br.released_amount, 0) ELSE 0 END), 0),
      'liquidated', COALESCE(sum(CASE WHEN latest_report.status::text = 'completed_liquidated' THEN COALESCE(br.released_amount, 0) ELSE 0 END), 0)
    ) INTO _budget_totals
    FROM public.budget_requests br
    LEFT JOIN LATERAL (
      SELECT lr.status
      FROM public.liquidation_reports lr
      WHERE lr.budget_request_id = br.id
      ORDER BY lr.updated_at DESC, lr.id DESC
      LIMIT 1
    ) latest_report ON true
    WHERE _fiscal_year IS NULL OR br.fiscal_year = _fiscal_year;
  END IF;

  WITH attention AS (
    SELECT 'registration'::text AS kind, op.id, op.organization_name AS organization_name,
      'Submitted registration profile · Review registration'::text AS action_text,
      'Submitted'::text AS verb, op.updated_at AS created_at
    FROM public.organization_profiles op
    WHERE (_role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes))
      AND op.profile_status::text IN ('pending_review', 'incomplete')
    UNION ALL
    SELECT 'budget', br.id, op.organization_name,
      br.activity_title || ' · Review budget request', 'Submitted', br.created_at
    FROM public.budget_requests br
    JOIN public.organization_profiles op ON op.id = br.organization_id
    WHERE (_role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes))
      AND br.status::text IN ('submitted', 'under_review')
    UNION ALL
    SELECT 'liquidation', lr.id, op.organization_name,
      COALESCE(br.activity_title, 'Liquidation report') || ' · Review liquidation', 'Submitted', lr.created_at
    FROM public.liquidation_reports lr
    JOIN public.organization_profiles op ON op.id = lr.organization_id
    LEFT JOIN public.budget_requests br ON br.id = lr.budget_request_id
    WHERE (_role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes))
      AND lr.status::text IN ('submitted', 'under_review', 'overdue')
    UNION ALL
    SELECT 'inquiry', i.id, COALESCE(NULLIF(i.organization_name, ''), i.submitter_name),
      i.subject || ' · Review inquiry', 'Received', i.created_at
    FROM public.inquiries i
    WHERE (_role_code = 'super_admin' OR 'inquiries_management' = ANY(_permission_codes))
      AND i.status::text = 'pending_review'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', kind || '-' || id,
    'kind', kind,
    'organizationName', organization_name,
    'actionText', action_text,
    'verb', verb,
    'timestamp', created_at
  ) ORDER BY created_at DESC, id DESC), '[]'::jsonb)
  INTO _attention
  FROM (SELECT * FROM attention ORDER BY created_at DESC, id DESC LIMIT 5) recent_attention;

  _recent_activity := '[]'::jsonb;
  IF _role_code = 'super_admin' OR 'activity_logs_view' = ANY(_permission_codes) THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', logs.id,
      'action', logs.action,
      'description', logs.description,
      'createdAt', logs.created_at
    ) ORDER BY logs.created_at DESC, logs.id DESC), '[]'::jsonb)
    INTO _recent_activity
    FROM (
      SELECT id, action, description, created_at
      FROM public.activity_logs
      ORDER BY created_at DESC, id DESC
      LIMIT 4
    ) logs;
  END IF;

  RETURN jsonb_build_object(
    'summary', _summary,
    'budgetTotals', _budget_totals,
    'needsAttention', _attention,
    'recentActivity', _recent_activity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_summary(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_summary(text, integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Registration queues return only display-safe columns. Fetch full profile,
-- submitted files, and a bounded decision history after an admin opens a row.
CREATE OR REPLACE FUNCTION public.admin_get_registration_detail(
  _session_token text,
  _organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _profile jsonb;
  _submission jsonb;
  _files jsonb;
  _activity jsonb;
  _templates jsonb;
BEGIN
  SELECT vat.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
    INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  JOIN public.roles r ON r.id = aa.role_id
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;
  IF _role_code <> 'super_admin' AND NOT ('registrations_management' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to review registrations.';
  END IF;

  SELECT to_jsonb(op) INTO _profile
  FROM public.organization_profiles op
  WHERE op.id = _organization_id;
  IF _profile IS NULL THEN
    RAISE EXCEPTION 'Registration was not found.';
  END IF;

  SELECT to_jsonb(ds) INTO _submission
  FROM public.document_submissions ds
  WHERE ds.organization_id = _organization_id
    AND COALESCE(ds.submission_scope::text, 'registration') = 'registration'
    AND ds.renewal_id IS NULL
  ORDER BY ds.updated_at DESC, ds.created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    to_jsonb(dsf) || jsonb_build_object(
      'required_document_types', CASE WHEN rdt.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', rdt.id, 'name', rdt.name) END
    ) ORDER BY dsf.created_at DESC, dsf.id ASC
  ), '[]'::jsonb)
  INTO _files
  FROM public.document_submission_files dsf
  LEFT JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
  WHERE _submission IS NOT NULL
    AND dsf.submission_id = (_submission ->> 'id')::uuid;

  SELECT COALESCE(jsonb_agg(to_jsonb(log) ORDER BY log.created_at DESC, log.id DESC), '[]'::jsonb)
  INTO _activity
  FROM (
    SELECT al.*
    FROM public.activity_logs al
    WHERE al.organization_id = _organization_id
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT 20
  ) log;

  SELECT COALESCE(jsonb_agg(to_jsonb(rdt) ORDER BY rdt.sort_order ASC, rdt.name ASC), '[]'::jsonb)
    INTO _templates
  FROM public.required_document_types rdt
  WHERE rdt.is_active = true;

  RETURN jsonb_build_object(
    'profile', _profile,
    'submission', _submission,
    'files', _files,
    'activity', _activity,
    'templates', _templates
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_registration_detail(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_registration_detail(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
