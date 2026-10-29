-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_period_submissions_page(_session_token text, _period_id uuid, _page integer DEFAULT 0, _page_size integer DEFAULT 20, _search text DEFAULT NULL::text, _classification text DEFAULT 'all'::text, _qualification_status text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
      'id',COALESCE(p.entry_id::text,'virtual-'||_semester||'-'||p.organization_id::text),
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
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_periods(_session_token text)
 RETURNS SETOF ypop_periods
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  select * from public.ypop_periods
  order by created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_review_files(_session_token text, _lane text, _parent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_validation_periods(_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_mark_notifications_read(_session_token text, _notification_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _updated_count integer;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  UPDATE public.notifications n
  SET is_read = true
  WHERE n.user_id::text IN (_admin_id::text, 'admin')
    AND n.is_read = false
    AND (_notification_id IS NULL OR n.id = _notification_id);
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN _updated_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_prepare_renewal_test_scenario(p_session_token text, p_expiration_days_ahead integer DEFAULT 30, p_custom_expiration_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_refresh_session(_session_token text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _timeout_minutes integer;
  _expires_at timestamptz;
BEGIN
  SELECT CASE WHEN value_json::text ~ '^[0-9]+$'
    THEN LEAST(480, GREATEST(5, value_json::text::integer)) ELSE 30 END
    INTO _timeout_minutes
  FROM public.admin_system_settings
  WHERE setting_key = 'security.admin_session_timeout_minutes';

  UPDATE public.admin_sessions s
  SET expires_at = clock_timestamp() + make_interval(mins => COALESCE(_timeout_minutes, 30)),
      last_used_at = clock_timestamp()
  WHERE s.token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
    AND s.expires_at > clock_timestamp()
    AND EXISTS (SELECT 1 FROM public.admin_accounts a WHERE a.id = s.admin_id AND a.is_active)
  RETURNING s.expires_at INTO _expires_at;

  IF _expires_at IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;
  RETURN _expires_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_renewal(p_session_token text, p_renewal_id uuid, p_admin_remarks text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _renewal record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text := trim(p_admin_remarks);
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF length(_remarks) < 10 THEN
    RAISE EXCEPTION 'Detailed rejection remarks of at least 10 characters are required.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Renewal can only be rejected from a reviewable status. Current status: "%".', _renewal.status;
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  UPDATE public.organization_renewals
  SET
    status = 'rejected',
    admin_remarks = _remarks,
    reviewed_by = _admin_id,
    reviewed_at = _now,
    updated_at = _now
  WHERE id = p_renewal_id;

  UPDATE public.document_submissions
  SET
    status = 'rejected_red',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = _remarks,
    updated_at = _now
  WHERE renewal_id = p_renewal_id;

  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_rejected', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Application Rejected',
      format('Renewal application for Cycle %s was rejected: %s. Please contact the LYDO office directly.', _renewal.cycle_number, _remarks),
      'rejected',
      'renewal',
      p_renewal_id
    );
  END IF;

  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _admin_id,
    _renewal.organization_id,
    'renewal_rejected',
    'renewal',
    p_renewal_id,
    format('Admin rejected renewal application for Cycle %s: %s', _renewal.cycle_number, _remarks)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'rejected'
  );
END;
$function$;

RESET check_function_bodies;

