-- Fix YPOP paged submission IDs for organizations with City-led submissions but no ypop_entries row.
-- COALESCE requires compatible argument types; entry IDs are UUIDs while virtual IDs are text.
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
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) TO anon, authenticated, service_role;

