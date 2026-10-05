DO $$
DECLARE _definition text;
BEGIN
  SELECT pg_get_functiondef('public.update_admin_liquidation_report(text,uuid,public.liquidation_report_status,text,timestamptz,timestamptz,timestamptz,timestamptz)'::regprocedure) INTO _definition;
  IF strpos(_definition, 'from public.liquidation_reports where id=_liquidation_report_id') = 0 THEN
    RAISE EXCEPTION 'Unexpected liquidation draft review guard definition';
  END IF;
  _definition := replace(_definition,
    'from public.liquidation_reports where id=_liquidation_report_id for update',
    'from public.liquidation_reports lr where lr.id=_liquidation_report_id for update');
  _definition := replace(_definition,
    'from public.liquidation_reports where id=_liquidation_report_id and status::text = ''draft''',
    'from public.liquidation_reports lr where lr.id=_liquidation_report_id and lr.status::text = ''draft''');
  EXECUTE _definition;
END;
$$;
