-- Forward-only extension of the current paged RPCs. Preserve their complete
-- authorization, reference numbering, projections, filters and draft guards.
-- Fail atomically if the predecessor shape is unexpected; never guess around drift.
DO $migration$
DECLARE
  _name text;
  _definition text;
  _old_signature text;
  _new_signature text;
  _needle text;
BEGIN
  FOREACH _name IN ARRAY ARRAY['admin_get_review_resource_page', 'admin_get_portal_list_page'] LOOP
    _old_signature := format('public.%I(text,text,integer,integer,text,text,text,text,text,text,text)', _name);
    _new_signature := format('public.%I(text,text,integer,integer,text,text,text,text,text,text,text,date,date)', _name);
    _definition := replace(pg_get_functiondef(_old_signature::regprocedure), chr(13), '');
    IF strpos(_definition, 'validate_admin_session_token') = 0
      OR strpos(_definition, 'aa.is_active = true') = 0
      OR strpos(_definition, '_required_permission') = 0
      OR strpos(_definition, 'SECURITY DEFINER') = 0
      OR strpos(_definition, '_safe_page_size') = 0 THEN
      RAISE EXCEPTION 'Unexpected authorization or pagination in %', _name;
    END IF;
    _needle := '_sort text DEFAULT ''newest''::text)';
    IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected signature in %', _name; END IF;
    _definition := replace(_definition, _needle,
      '_sort text DEFAULT ''newest''::text, _start_date date DEFAULT NULL::date, _end_date_exclusive date DEFAULT NULL::date)');
    -- Harden the older list RPC's search_path while retaining qualified tables.
    _definition := replace(_definition, 'SET search_path TO ''public''', 'SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''');
    _needle := E'BEGIN\n';
    _definition := replace(_definition, _needle, _needle || E'  IF ((_start_date IS NULL) <> (_end_date_exclusive IS NULL)) OR _start_date >= _end_date_exclusive THEN\n    RAISE EXCEPTION ''Invalid reporting period.'';\n  END IF;\n');
    IF _name = 'admin_get_review_resource_page' THEN
      _needle := E'WHERE br.status::text <> ''draft''\n        AND (_search_term';
      IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected budget filtering'; END IF;
      _definition := replace(_definition, _needle,
        E'WHERE br.status::text <> ''draft''\n        AND (_start_date IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE ''Asia/Manila'')::date) >= _start_date)\n        AND (_end_date_exclusive IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE ''Asia/Manila'')::date) < _end_date_exclusive)\n        AND (_search_term');
      -- No submitted_at exists. Use report creation, never completed_at.
      _needle := E'AND lr.status::text <> ''draft''\n        AND (_search_term';
      IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation draft guard'; END IF;
      _definition := replace(_definition, _needle,
        E'AND lr.status::text <> ''draft''\n        AND (_start_date IS NULL OR lr.created_at >= (_start_date::timestamp AT TIME ZONE ''Asia/Manila''))\n        AND (_end_date_exclusive IS NULL OR lr.created_at < (_end_date_exclusive::timestamp AT TIME ZONE ''Asia/Manila''))\n        AND (_search_term');
    ELSE
      _needle := 'AND (_status IS NULL OR _status = ''all'' OR l.related_type = _status)';
      IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected activity-log filtering'; END IF;
      _definition := replace(_definition, _needle, _needle ||
        E'\n        AND (_start_date IS NULL OR l.created_at >= (_start_date::timestamp AT TIME ZONE ''Asia/Manila''))\n        AND (_end_date_exclusive IS NULL OR l.created_at < (_end_date_exclusive::timestamp AT TIME ZONE ''Asia/Manila''))');
    END IF;
    EXECUTE _definition;
    -- Avoid PostgREST ambiguity between two overloads with default parameters.
    -- No CASCADE: unexpected dependent objects must fail instead of being removed.
    EXECUTE 'DROP FUNCTION ' || _old_signature;
    EXECUTE 'REVOKE ALL ON FUNCTION ' || _new_signature || ' FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || _new_signature || ' TO anon, authenticated, service_role';
  END LOOP;
END;
$migration$;
NOTIFY pgrst, 'reload schema';
