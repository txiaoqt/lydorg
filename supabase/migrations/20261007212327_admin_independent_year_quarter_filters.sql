-- Optional recurring quarter filter; existing callers retain date-range defaults.
DO $migration$
DECLARE
  _name text;
  _definition text;
  _old_signature text;
  _new_signature text;
  _needle text;
  _predicate text;
BEGIN
  FOREACH _name IN ARRAY ARRAY['admin_get_review_resource_page', 'admin_get_portal_list_page'] LOOP
    _old_signature := format('public.%I(text,text,integer,integer,text,text,text,text,text,text,text,date,date)', _name);
    _new_signature := format('public.%I(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer)', _name);
    _definition := replace(pg_get_functiondef(_old_signature::regprocedure), chr(13), '');
    IF strpos(_definition, 'validate_admin_session_token') = 0
      OR strpos(_definition, 'aa.is_active = true') = 0
      OR strpos(_definition, '_required_permission') = 0
      OR strpos(_definition, '_safe_page_size') = 0 THEN
      RAISE EXCEPTION 'Unexpected authorization or pagination in %', _name;
    END IF;
    _needle := '_end_date_exclusive date DEFAULT NULL::date)';
    IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected signature in %', _name; END IF;
    _definition := replace(_definition, _needle, '_end_date_exclusive date DEFAULT NULL::date, _quarter integer DEFAULT NULL::integer)');
    _definition := replace(_definition, E'BEGIN\n', E'BEGIN\n  IF _quarter IS NOT NULL AND _quarter NOT BETWEEN 1 AND 4 THEN\n    RAISE EXCEPTION ''Invalid reporting quarter.'';\n  END IF;\n');
    IF _name = 'admin_get_review_resource_page' THEN
      _needle := 'AND (_start_date IS NULL OR COALESCE(br.activity_date';
      _predicate := 'AND (_quarter IS NULL OR EXTRACT(QUARTER FROM COALESCE(br.activity_date, (br.created_at AT TIME ZONE ''Asia/Manila'')::date)) = _quarter)';
      IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected budget date filter'; END IF;
      _definition := replace(_definition, _needle, _predicate || E'\n        ' || _needle);
      _needle := 'AND (_start_date IS NULL OR lr.created_at';
      _predicate := 'AND (_quarter IS NULL OR EXTRACT(QUARTER FROM (lr.created_at AT TIME ZONE ''Asia/Manila'')) = _quarter)';
      IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation date filter'; END IF;
      _definition := replace(_definition, _needle, _predicate || E'\n        ' || _needle);
    ELSE
      _needle := 'AND (_start_date IS NULL OR l.created_at';
      _predicate := 'AND (_quarter IS NULL OR EXTRACT(QUARTER FROM (l.created_at AT TIME ZONE ''Asia/Manila'')) = _quarter)';
      IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected log date filter'; END IF;
      _definition := replace(_definition, _needle, _predicate || E'\n        ' || _needle);
    END IF;
    EXECUTE _definition;
    EXECUTE 'DROP FUNCTION ' || _old_signature;
    EXECUTE 'REVOKE ALL ON FUNCTION ' || _new_signature || ' FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || _new_signature || ' TO anon, authenticated, service_role';
  END LOOP;
END;
$migration$;
NOTIFY pgrst, 'reload schema';
