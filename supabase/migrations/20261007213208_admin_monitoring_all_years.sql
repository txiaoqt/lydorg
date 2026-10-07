-- All-year monitoring remains cursor paged, permission scoped and draft free.
DO $migration$
DECLARE
  _definition text;
  _needle text;
BEGIN
  _definition := replace(pg_get_functiondef('public.admin_get_budget_monitoring_page(text,integer,date,date,timestamptz,uuid)'::regprocedure), chr(13), '');
  IF strpos(_definition, 'validate_admin_session_token') = 0
    OR strpos(_definition, 'budget_monitoring_view') = 0
    OR strpos(_definition, 'a.is_active') = 0
    OR strpos(_definition, 'LIMIT 251') = 0
    OR strpos(_definition, 'LIMIT 250') = 0 THEN
    RAISE EXCEPTION 'Unexpected monitoring authorization or pagination';
  END IF;
  _needle := '_after_id uuid DEFAULT NULL::uuid)';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected monitoring signature'; END IF;
  _definition := replace(_definition, _needle, '_after_id uuid DEFAULT NULL::uuid, _quarter integer DEFAULT NULL::integer)');
  _definition := replace(_definition, 'SET search_path TO ''public''', 'SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''');
  _needle := 'IF _fiscal_year IS NULL OR _fiscal_year NOT BETWEEN 2000 AND 2100';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected monitoring validation'; END IF;
  _definition := replace(_definition, _needle, 'IF (_fiscal_year IS NOT NULL AND _fiscal_year NOT BETWEEN 2000 AND 2100) OR (_quarter IS NOT NULL AND _quarter NOT BETWEEN 1 AND 4)');
  _needle := 'ELSE COALESCE(br.fiscal_year, EXTRACT(YEAR FROM COALESCE(br.activity_date, br.created_at::date))::integer) = _fiscal_year END';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected monitoring year predicate'; END IF;
  _definition := replace(_definition, _needle, 'ELSE (_fiscal_year IS NULL OR COALESCE(br.fiscal_year, EXTRACT(YEAR FROM COALESCE(br.activity_date, br.created_at::date))::integer) = _fiscal_year) END' || E'\n      AND (_quarter IS NULL OR EXTRACT(QUARTER FROM COALESCE(br.activity_date, br.release_date)) = _quarter)');
  EXECUTE _definition;
  DROP FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamptz,uuid);
  REVOKE ALL ON FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamptz,uuid,integer) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamptz,uuid,integer) TO anon, authenticated, service_role;
END;
$migration$;
NOTIFY pgrst, 'reload schema';
