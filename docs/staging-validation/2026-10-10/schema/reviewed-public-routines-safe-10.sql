-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_yorp_registration_documents(_session_token text, _organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permissions text[];
  _submission_id uuid;
  _files jsonb;
BEGIN
  SELECT v.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
  INTO _admin_id, _role_code, _permissions
  FROM public.validate_admin_session_token(_session_token) v
  JOIN public.admin_accounts a ON a.id = v.admin_id AND a.is_active
  JOIN public.roles r ON r.id = a.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('yorp_registry_view' = ANY(_permissions)) THEN
    RAISE EXCEPTION 'You do not have permission to view the YORP Registry.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_profiles op WHERE op.id = _organization_id
      AND (op.profile_status::text = 'verified' OR op.yorp_registered_year IS NOT NULL)
  ) THEN RAISE EXCEPTION 'Registry organization was not found.'; END IF;

  SELECT ds.id INTO _submission_id
  FROM public.document_submissions ds
  WHERE ds.organization_id = _organization_id
    AND COALESCE(ds.submission_scope::text, 'registration') = 'registration'
    AND ds.renewal_id IS NULL
  ORDER BY ds.updated_at DESC, ds.created_at DESC, ds.id DESC LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    (to_jsonb(dsf) - 'revision_history') || jsonb_build_object(
      'required_document_types', CASE WHEN rdt.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', rdt.id, 'name', rdt.name) END
    ) ORDER BY rdt.sort_order ASC NULLS LAST, rdt.name ASC, dsf.id ASC
  ), '[]'::jsonb) INTO _files
  FROM public.document_submission_files dsf
  LEFT JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
  WHERE dsf.submission_id = _submission_id
    AND COALESCE(dsf.admin_status::text, 'submitted') <> 'draft'
    AND NULLIF(btrim(dsf.file_url), '') IS NOT NULL;

  RETURN jsonb_build_object('submission_id', _submission_id, 'files', _files);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_yorp_registry_ypop_detail(_session_token text, _organization_id uuid, _semester_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_yorp_sample_dataset_status(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'storage', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _test_environment boolean;
  _organizations integer := 0;
  _year_2024 integer := 0;
  _year_2025 integer := 0;
  _year_2026 integer := 0;
  _awaiting integer := 0;
  _released integer := 0;
  _completed integer := 0;
  _liquidated integer := 0;
  _packets integer := 0;
  _documents integer := 0;
  _complete integer := 0;
  _missing integer := 0;
  _duplicates integer := 0;
  _required integer := 0;
  _mapped integer := 0;
  _last_seeded timestamptz;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Status is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  _test_environment := public.is_development_or_test_environment();

  SELECT count(*), count(*) FILTER (WHERE seed_source_year = 2024),
         count(*) FILTER (WHERE seed_source_year = 2025), count(*) FILTER (WHERE seed_source_year = 2026),
         max(updated_at)
  INTO _organizations, _year_2024, _year_2025, _year_2026, _last_seeded
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) FILTER (WHERE br.status = 'awaiting_release'),
         count(*) FILTER (WHERE br.status = 'budget_released'),
         count(*) FILTER (WHERE br.status = 'completed')
  INTO _awaiting, _released, _completed
  FROM public.budget_requests br
  JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch = _batch_name
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _liquidated
  FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch = _batch_name
    AND lr.status = 'completed_liquidated'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _required
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(*) INTO _mapped
  FROM public.required_document_types rdt
  JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
  JOIN storage.objects object_row ON object_row.bucket_id = asset.bucket_id AND object_row.name = asset.object_name
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  WITH seeded AS (
    SELECT id organization_id FROM public.organization_profiles
    WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
      AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(is_renewal_test_account, false) IS FALSE
  ), required AS (
    SELECT id FROM public.required_document_types rdt
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
  ), packets AS (
    SELECT s.organization_id, ds.id submission_id
    FROM seeded s JOIN public.document_submissions ds ON ds.organization_id = s.organization_id
    WHERE ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  ), counts AS (
    SELECT p.organization_id, r.id document_type_id, count(dsf.id) file_count
    FROM packets p CROSS JOIN required r
    LEFT JOIN public.document_submission_files dsf
      ON dsf.submission_id = p.submission_id AND dsf.document_type_id = r.id
    GROUP BY p.organization_id, r.id
  ), per_org AS (
    SELECT organization_id,
      count(*) FILTER (WHERE file_count = 0) missing_count,
      sum(greatest(file_count - 1, 0)) duplicate_count,
      count(*) FILTER (WHERE file_count = 1) complete_count
    FROM counts GROUP BY organization_id
  )
  SELECT count(*) FILTER (WHERE missing_count = 0 AND duplicate_count = 0 AND complete_count = _required),
         coalesce(sum(missing_count), 0), coalesce(sum(duplicate_count), 0)
  INTO _complete, _missing, _duplicates FROM per_org;

  SELECT count(DISTINCT ds.id), count(dsf.id)
  INTO _packets, _documents
  FROM public.document_submissions ds
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  LEFT JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration');

  RETURN jsonb_build_object(
    'is_development_or_test_environment', _test_environment,
    'seed_batch', _batch_name,
    'total_seeded_organizations', _organizations,
    'expected_total', 84,
    'year_breakdown', jsonb_build_object('2024', _year_2024, '2025', _year_2025, '2026', _year_2026),
    'budget_breakdown', jsonb_build_object('awaiting_release', _awaiting, 'budget_released', _released,
      'completed', _completed, 'liquidated_reports', _liquidated),
    'registration_breakdown', jsonb_build_object(
      'packets', _packets, 'document_records', _documents,
      'required_documents_per_organization', _required,
      'organizations_complete', _complete, 'missing_requirements', _missing,
      'duplicate_requirements', _duplicates,
      'mapped_seed_assets', _mapped,
      'asset_mapping_complete', _required > 0 AND _mapped = _required,
      'renewal_test_organization_excluded', true
    ),
    'last_seeded_at', _last_seeded
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_city_activities(_session_token text)
 RETURNS SETOF ypop_city_activities
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
  select * from public.ypop_city_activities
  order by created_at asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_entries(_session_token text)
 RETURNS SETOF ypop_entries
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
  select * from public.ypop_entries
  order by created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_entry_review_detail(_session_token text, _entry_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_event_files(_session_token text)
 RETURNS SETOF ypop_event_files
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
  select f.* from public.ypop_event_files f
  inner join public.ypop_event_participations p on p.id = f.participation_id
  where p.status is not null and p.status <> 'draft'
  order by f.uploaded_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_event_participations(_session_token text)
 RETURNS SETOF ypop_event_participations
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
  select * from public.ypop_event_participations
  where status is not null and status <> 'draft'
  order by created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_org_activities(_session_token text)
 RETURNS SETOF ypop_org_activities
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
  select * from public.ypop_org_activities
  where status is not null and status <> 'draft'
  order by created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_org_activity_files(_session_token text)
 RETURNS SETOF ypop_org_activity_files
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
  select f.* from public.ypop_org_activity_files f
  inner join public.ypop_org_activities a on a.id = f.org_activity_id
  where a.status is not null and a.status <> 'draft'
  order by f.uploaded_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ypop_period_city_activities(_session_token text, _period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
END; $function$;

RESET check_function_bodies;

