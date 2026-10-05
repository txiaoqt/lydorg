-- Keep organization liquidation drafts out of admin review APIs, including
-- direct detail requests and the older snapshot APIs. Preserve reference-code
-- generation over all records so a report keeps its ID when it is submitted.
DO $$
DECLARE
  _definition text;
  _needle text;
BEGIN
  SELECT replace(pg_get_functiondef('public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text)'::regprocedure), chr(13), '') INTO _definition;
  _needle := E'WHERE br.status::text IN (''budget_released'',''completed'')\n        AND (_search_term';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation review-page definition'; END IF;
  _definition := replace(_definition, _needle, E'WHERE br.status::text IN (''budget_released'',''completed'')\n        AND lr.status::text <> ''draft''\n        AND (_search_term');
  EXECUTE _definition;

  SELECT replace(pg_get_functiondef('public.admin_get_liquidation_report_detail(text,uuid)'::regprocedure), chr(13), '') INTO _definition;
  _needle := 'IF _report IS NULL THEN RAISE EXCEPTION ''Liquidation report was not found.''; END IF;';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation detail definition'; END IF;
  _definition := replace(_definition, _needle, _needle || E'\n  IF _report->>''status'' = ''draft'' THEN RAISE EXCEPTION ''This liquidation report has not been submitted for review.''; END IF;');
  _needle := 'INTO _files FROM public.liquidation_report_files f WHERE f.liquidation_report_id=_report_id;';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation detail file query'; END IF;
  _definition := replace(_definition, _needle, 'INTO _files FROM public.liquidation_report_files f WHERE f.liquidation_report_id=_report_id AND _report->>''status'' NOT IN (''draft'',''not_started'',''pending_activity_completion'');');
  EXECUTE _definition;

  SELECT replace(pg_get_functiondef('public.admin_get_portal_section_state(text,text)'::regprocedure), chr(13), '') INTO _definition;
  _needle := E'FROM public.liquidation_reports lr\n        WHERE EXISTS (';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected monitoring snapshot query'; END IF;
  _definition := replace(_definition, _needle, E'FROM public.liquidation_reports lr\n        WHERE lr.status::text <> ''draft'' AND EXISTS (');
  _needle := E'JOIN public.budget_requests br ON br.id = lr.budget_request_id\n        WHERE br.status::text <> ''draft''';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation section query'; END IF;
  _definition := replace(_definition, _needle, _needle || ' AND lr.status::text <> ''draft''');
  _needle := E'FROM public.liquidation_report_files lrf\n        JOIN public.liquidation_reports lr ON lr.id = lrf.liquidation_report_id\n        JOIN public.budget_requests br ON br.id = lr.budget_request_id\n        WHERE br.status::text <> ''draft'' AND lr.status::text <> ''draft''';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation section file query'; END IF;
  _definition := replace(_definition, _needle, _needle || ' AND lr.status::text NOT IN (''not_started'',''pending_activity_completion'')');
  EXECUTE _definition;

  SELECT replace(pg_get_functiondef('public.get_admin_portal_snapshot(text)'::regprocedure), chr(13), '') INTO _definition;
  _needle := E'FROM public.liquidation_reports lr\n      )';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected legacy liquidation snapshot'; END IF;
  _definition := replace(_definition, _needle, E'FROM public.liquidation_reports lr\n        WHERE lr.status::text <> ''draft''\n      )');
  _needle := E'FROM public.liquidation_report_files lrf\n      )';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected legacy liquidation files snapshot'; END IF;
  _definition := replace(_definition, _needle, E'FROM public.liquidation_report_files lrf\n        WHERE EXISTS (SELECT 1 FROM public.liquidation_reports lr WHERE lr.id=lrf.liquidation_report_id AND lr.status::text NOT IN (''draft'',''not_started'',''pending_activity_completion''))\n      )');
  EXECUTE _definition;

  SELECT pg_get_functiondef('public.admin_get_dashboard_summary(text,integer)'::regprocedure) INTO _definition;
  _needle := '(SELECT count(*) FROM public.liquidation_reports)';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected dashboard liquidation count'; END IF;
  _definition := replace(_definition, _needle, '(SELECT count(*) FROM public.liquidation_reports WHERE status::text <> ''draft'')');
  EXECUTE _definition;

  SELECT replace(pg_get_functiondef('public.admin_update_liquidation_report_file_status(text,uuid,text,text)'::regprocedure), chr(13), '') INTO _definition;
  _needle := E'  return query\n  update public.liquidation_report_files';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation file review definition'; END IF;
  _definition := replace(_definition, _needle, E'  perform 1 from public.liquidation_reports lr join public.liquidation_report_files f on f.liquidation_report_id=lr.id where f.id=_file_id for update of lr;\n  if exists (select 1 from public.liquidation_reports lr join public.liquidation_report_files f on f.liquidation_report_id=lr.id where f.id=_file_id and lr.status::text in (''draft'',''not_started'',''pending_activity_completion'')) then\n    raise exception ''This liquidation report has not been submitted for review.'';\n  end if;\n' || _needle);
  EXECUTE _definition;

  SELECT replace(pg_get_functiondef('public.update_admin_liquidation_report(text,uuid,public.liquidation_report_status,text,timestamptz,timestamptz,timestamptz,timestamptz)'::regprocedure), chr(13), '') INTO _definition;
  _needle := E'  return query\n  update public.liquidation_reports';
  IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION 'Unexpected liquidation parent review definition'; END IF;
  _definition := replace(_definition, _needle, E'  perform 1 from public.liquidation_reports where id=_liquidation_report_id for update;\n  if exists (select 1 from public.liquidation_reports where id=_liquidation_report_id and status::text = ''draft'') then\n    raise exception ''This liquidation report has not been submitted for review.'';\n  end if;\n' || _needle);
  EXECUTE _definition;
END;
$$;

NOTIFY pgrst, 'reload schema';
