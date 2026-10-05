-- Keep the YORP Registry detail drawer's YPOP view scoped to one organization
-- and semester while authorizing through the registry-view permission.
CREATE OR REPLACE FUNCTION public.admin_get_yorp_registry_ypop_detail(
  _session_token text,
  _organization_id uuid,
  _semester_key text
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
  IF _role_code <> 'super_admin' AND NOT ('yorp_registry_view' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to view the YORP Registry.';
  END IF;
  IF _organization_id IS NULL OR NULLIF(btrim(_semester_key), '') IS NULL THEN
    RAISE EXCEPTION 'Organization and semester are required.';
  END IF;

  RETURN jsonb_build_object(
    'city_activities', (
      SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.date NULLS LAST, a.created_at, a.id), '[]'::jsonb)
      FROM public.ypop_city_activities a
      WHERE a.semester_key = _semester_key
    ),
    'event_participations', (
      SELECT COALESCE(jsonb_agg(to_jsonb(ep) ORDER BY ep.created_at DESC, ep.id), '[]'::jsonb)
      FROM public.ypop_event_participations ep
      JOIN public.ypop_city_activities a ON a.id = ep.activity_id
      WHERE ep.organization_id = _organization_id
        AND a.semester_key = _semester_key
        AND ep.status::text <> 'draft'
    ),
    'org_activities', (
      SELECT COALESCE(jsonb_agg(to_jsonb(oa) ORDER BY oa.created_at DESC, oa.id), '[]'::jsonb)
      FROM public.ypop_org_activities oa
      JOIN public.ypop_entries ye ON ye.id = oa.ypop_entry_id
      WHERE ye.organization_id = _organization_id
        AND ye.semester = _semester_key
        AND oa.status::text <> 'draft'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_yorp_registry_ypop_detail(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registry_ypop_detail(text, uuid, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
