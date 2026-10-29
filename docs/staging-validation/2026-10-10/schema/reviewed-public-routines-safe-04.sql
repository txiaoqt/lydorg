-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_budget_monitoring_page(_session_token text, _fiscal_year integer DEFAULT 2026, _start_date date DEFAULT NULL::date, _end_date date DEFAULT NULL::date, _after_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _after_id uuid DEFAULT NULL::uuid, _quarter integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
  IF (_fiscal_year IS NOT NULL AND _fiscal_year NOT BETWEEN 2000 AND 2100) OR (_quarter IS NOT NULL AND _quarter NOT BETWEEN 1 AND 4)
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
      ELSE (_fiscal_year IS NULL OR COALESCE(br.fiscal_year, EXTRACT(YEAR FROM COALESCE(br.activity_date, br.created_at::date))::integer) = _fiscal_year) END
      AND (_quarter IS NULL OR EXTRACT(QUARTER FROM COALESCE(br.activity_date, br.release_date)) = _quarter)
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_budget_monitoring_summary(_session_token text, _fiscal_year integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _allocation RECORD;
  _total_fy_budget numeric := NULL;
  _statutory_baseline_notes text := NULL;
  _is_configured boolean := false;
  _approved_budget numeric := 0;
  _released_budget numeric := 0;
  _liquidated_budget numeric := 0;
  _pending_disbursement numeric := 0;
  _active_in_field numeric := 0;
  _remaining_headroom numeric := NULL;
  _deficit_amount numeric := 0;
  _is_deficit boolean := false;
  _category_breakdown jsonb := '[]'::jsonb;
  _total_requests integer := 0;
  _released_requests integer := 0;
  _liquidated_requests integer := 0;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 1. Fetch configured annual allocation for the target fiscal year
  SELECT total_amount, statutory_baseline_notes, is_active
  INTO _allocation
  FROM public.annual_budget_allocations
  WHERE fiscal_year = _fiscal_year
  LIMIT 1;

  IF FOUND THEN
    _total_fy_budget := _allocation.total_amount;
    _statutory_baseline_notes := _allocation.statutory_baseline_notes;
    _is_configured := true;
  END IF;

  -- 2. Aggregate approved budget requests belonging to this fiscal year
  -- Allowed approved lifecycle statuses: approved_for_ftf_green, hard_copy_submitted, budget_released, completed
  SELECT
    COALESCE(SUM(COALESCE(approved_amount, requested_amount, 0)), 0),
    COUNT(*)
  INTO _approved_budget, _total_requests
  FROM public.budget_requests
  WHERE fiscal_year = _fiscal_year
    AND status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed');

  -- 3. Aggregate released budget requests belonging to this fiscal year
  SELECT
    COALESCE(SUM(COALESCE(released_amount, 0)), 0),
    COUNT(*)
  INTO _released_budget, _released_requests
  FROM public.budget_requests
  WHERE fiscal_year = _fiscal_year
    AND status IN ('budget_released', 'completed');

  -- 4. Aggregate liquidated budget requests belonging to this fiscal year
  -- Sums the released_amount of budget_requests with completed_liquidated liquidation_reports
  SELECT
    COALESCE(SUM(COALESCE(br.released_amount, 0)), 0),
    COUNT(DISTINCT lr.id)
  INTO _liquidated_budget, _liquidated_requests
  FROM public.liquidation_reports lr
  JOIN public.budget_requests br ON lr.budget_request_id = br.id
  WHERE br.fiscal_year = _fiscal_year
    AND lr.status = 'completed_liquidated';

  -- 5. Derived financial execution metrics
  _pending_disbursement := GREATEST(_approved_budget - _released_budget, 0);
  _active_in_field := GREATEST(_released_budget - _liquidated_budget, 0);

  IF _is_configured THEN
    -- Correct statutory headroom: Total FY Budget - Approved Budget
    _remaining_headroom := _total_fy_budget - _approved_budget;
    IF _remaining_headroom < 0 THEN
      _is_deficit := true;
      _deficit_amount := ABS(_remaining_headroom);
    ELSE
      _is_deficit := false;
      _deficit_amount := 0;
    END IF;
  ELSE
    _remaining_headroom := NULL;
    _is_deficit := false;
    _deficit_amount := 0;
  END IF;

  -- 6. Category breakdown by purpose for this fiscal year
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', cat_row.category,
        'approved_amount', cat_row.cat_approved,
        'released_amount', cat_row.cat_released,
        'request_count', cat_row.req_count
      )
      ORDER BY cat_row.cat_approved DESC, cat_row.category ASC
    ),
    '[]'::jsonb
  )
  INTO _category_breakdown
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(purpose_category), ''), 'General / Uncategorized') AS category,
      SUM(COALESCE(approved_amount, requested_amount, 0)) AS cat_approved,
      SUM(CASE WHEN status IN ('budget_released', 'completed') THEN COALESCE(released_amount, 0) ELSE 0 END) AS cat_released,
      COUNT(*) AS req_count
    FROM public.budget_requests
    WHERE fiscal_year = _fiscal_year
      AND status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
    GROUP BY COALESCE(NULLIF(TRIM(purpose_category), ''), 'General / Uncategorized')
  ) cat_row;

  RETURN jsonb_build_object(
    'fiscal_year', _fiscal_year,
    'is_configured', _is_configured,
    'total_fy_budget', _total_fy_budget,
    'statutory_baseline_notes', _statutory_baseline_notes,
    'approved_budget', _approved_budget,
    'released_budget', _released_budget,
    'liquidated_budget', _liquidated_budget,
    'pending_disbursement', _pending_disbursement,
    'active_in_field', _active_in_field,
    'remaining_headroom', _remaining_headroom,
    'is_deficit', _is_deficit,
    'deficit_amount', _deficit_amount,
    'total_requests', _total_requests,
    'released_requests', _released_requests,
    'liquidated_requests', _liquidated_requests,
    'category_breakdown', _category_breakdown
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_budget_purpose_categories(_session_token text)
 RETURNS SETOF budget_purpose_categories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.budget_purpose_categories
  ORDER BY sort_order ASC, name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_budget_request_detail(_session_token text, _request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
END; $function$;

RESET check_function_bodies;

