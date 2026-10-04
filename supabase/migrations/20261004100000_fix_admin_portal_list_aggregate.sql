-- Fix the paged-list aggregate projections so each query groups by its one-row total count.
-- Replaces the RPC installed by 20261003130000_admin_portal_paged_queries.sql.

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
    ) document_counts ON true
    GROUP BY counted.total_count;

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
    FROM counted LEFT JOIN page_rows ON true GROUP BY counted.total_count;

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
    LEFT JOIN public.organization_profiles org ON org.id = page_rows.organization_id
    GROUP BY counted.total_count;
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
NOTIFY pgrst, 'reload schema';
