-- Period-scoped reporting rows, with bounded responses and no attachment data.
CREATE OR REPLACE FUNCTION public.admin_get_budget_monitoring_page(
  _session_token text,
  _fiscal_year integer DEFAULT 2026,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _after_created_at timestamptz DEFAULT NULL,
  _after_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permissions text[];
  _result jsonb;
BEGIN
  SELECT v.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
  INTO _admin_id, _role_code, _permissions
  FROM public.validate_admin_session_token(_session_token) v
  JOIN public.admin_accounts a ON a.id = v.admin_id AND a.is_active
  JOIN public.roles r ON r.id = a.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('budget_monitoring_view' = ANY(_permissions)) THEN
    RAISE EXCEPTION 'You do not have permission to view Budget Monitoring.';
  END IF;
  IF _fiscal_year IS NULL OR _fiscal_year NOT BETWEEN 2000 AND 2100
    OR ((_start_date IS NULL) <> (_end_date IS NULL))
    OR _start_date > _end_date
    OR ((_after_created_at IS NULL) <> (_after_id IS NULL)) THEN
    RAISE EXCEPTION 'Invalid Budget Monitoring period or cursor.';
  END IF;

  WITH candidates AS MATERIALIZED (
    SELECT br.* FROM public.budget_requests br
    WHERE br.status <> 'draft'
      AND CASE WHEN _start_date IS NOT NULL THEN
        COALESCE(br.activity_date, br.release_date) BETWEEN _start_date AND _end_date
      ELSE COALESCE(br.fiscal_year, EXTRACT(YEAR FROM COALESCE(br.activity_date, br.created_at::date))::integer) = _fiscal_year END
      AND (_after_created_at IS NULL OR (br.created_at, br.id) < (_after_created_at, _after_id))
    ORDER BY br.created_at DESC, br.id DESC LIMIT 251
  ), page AS MATERIALIZED (
    SELECT * FROM candidates ORDER BY created_at DESC, id DESC LIMIT 250
  ), latest_reports AS (
    SELECT DISTINCT ON (lr.budget_request_id) lr.*
    FROM public.liquidation_reports lr JOIN page p ON p.id = lr.budget_request_id
    ORDER BY lr.budget_request_id, COALESCE(lr.updated_at, lr.created_at) DESC, lr.id DESC
  )
  SELECT jsonb_build_object(
    'budget_requests', COALESCE((SELECT jsonb_agg(to_jsonb(p) - ARRAY['revision_history', 'activity_description', 'user_note', 'admin_remarks'] ORDER BY p.created_at DESC, p.id DESC) FROM page p), '[]'::jsonb),
    'organization_profiles', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', op.id, 'organization_name', op.organization_name, 'urn', op.urn,
      'district', op.district, 'barangay', op.barangay, 'address_barangay', op.address_barangay,
      'major_classification', op.major_classification, 'verified_at', op.verified_at,
      'created_at', op.created_at, 'updated_at', op.updated_at, 'profile_status', op.profile_status
    )) FROM public.organization_profiles op WHERE EXISTS (SELECT 1 FROM page p WHERE p.organization_id = op.id)), '[]'::jsonb),
    'liquidation_reports', COALESCE((SELECT jsonb_agg(to_jsonb(lr)) FROM latest_reports lr), '[]'::jsonb),
    'next_cursor', CASE WHEN (SELECT COUNT(*) FROM candidates) > 250 THEN
      (SELECT jsonb_build_object('created_at', created_at, 'id', id) FROM page ORDER BY created_at ASC, id ASC LIMIT 1)
      ELSE NULL END,
    'fiscal_years', CASE WHEN _after_id IS NULL THEN (SELECT COALESCE(jsonb_agg(fy ORDER BY fy DESC), '[]'::jsonb) FROM (
      SELECT DISTINCT COALESCE(fiscal_year, EXTRACT(YEAR FROM COALESCE(activity_date, created_at::date))::integer) AS fy
      FROM public.budget_requests WHERE status::text <> 'draft'
    ) years) ELSE '[]'::jsonb END
  ) INTO _result;
  RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_budget_monitoring_page(text, integer, date, date, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_page(text, integer, date, date, timestamptz, uuid) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS budget_requests_monitoring_period_idx
  ON public.budget_requests (fiscal_year, created_at DESC, id DESC) WHERE status <> 'draft';
CREATE INDEX IF NOT EXISTS liquidation_reports_monitoring_latest_idx
  ON public.liquidation_reports (budget_request_id, updated_at DESC, created_at DESC);
