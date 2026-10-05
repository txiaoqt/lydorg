-- Include attachment metadata for reviewable Organization-led activities in the
-- entry-scoped YPOP review response so the Document Queue is accurate before a
-- reviewer selects an activity. File contents and signed preview URLs remain
-- loaded only for the selected activity through admin_get_ypop_review_files.
CREATE OR REPLACE FUNCTION public.admin_get_ypop_entry_review_detail(_session_token text, _entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _entry public.ypop_entries%ROWTYPE;
  _period public.ypop_periods%ROWTYPE;
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
  IF _role_code <> 'super_admin' AND NOT ('ypop_validation_review' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to review YPOP validation.';
  END IF;

  SELECT * INTO _entry FROM public.ypop_entries WHERE id = _entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'YPOP entry was not found.';
  END IF;
  SELECT * INTO _period
  FROM public.ypop_periods
  WHERE semester_key = _entry.semester
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'entry', to_jsonb(_entry),
    'organization', (SELECT to_jsonb(op) FROM public.organization_profiles op WHERE op.id = _entry.organization_id),
    'period', CASE WHEN _period.id IS NULL THEN NULL ELSE to_jsonb(_period) END,
    'city_activities', (
      SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at, a.id), '[]'::jsonb)
      FROM public.ypop_city_activities a
      WHERE a.semester_key = _entry.semester
    ),
    'event_participations', (
      SELECT COALESCE(jsonb_agg(to_jsonb(ep) ORDER BY ep.created_at, ep.id), '[]'::jsonb)
      FROM public.ypop_event_participations ep
      JOIN public.ypop_city_activities a ON a.id = ep.activity_id
      WHERE ep.organization_id = _entry.organization_id
        AND a.semester_key = _entry.semester
        AND ep.status::text <> 'draft'
    ),
    'event_files', (
      SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.uploaded_at, f.id), '[]'::jsonb)
      FROM public.ypop_event_files f
      JOIN public.ypop_event_participations ep ON ep.id = f.participation_id
      JOIN public.ypop_city_activities a ON a.id = ep.activity_id
      WHERE ep.organization_id = _entry.organization_id
        AND a.semester_key = _entry.semester
        AND ep.status::text <> 'draft'
    ),
    'org_activities', (
      SELECT COALESCE(jsonb_agg(to_jsonb(oa) ORDER BY oa.created_at, oa.id), '[]'::jsonb)
      FROM public.ypop_org_activities oa
      WHERE oa.ypop_entry_id = _entry.id
        AND oa.status::text <> 'draft'
    ),
    'org_activity_files', (
      SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.uploaded_at, f.id), '[]'::jsonb)
      FROM public.ypop_org_activity_files f
      JOIN public.ypop_org_activities oa ON oa.id = f.org_activity_id
      WHERE oa.ypop_entry_id = _entry.id
        AND oa.status::text <> 'draft'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ypop_entry_review_detail(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entry_review_detail(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
