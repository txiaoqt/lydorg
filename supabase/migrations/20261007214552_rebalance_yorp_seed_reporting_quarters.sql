-- Rebalance only the marked 84-row PCYDO fixture. Financial values, workflow
-- statuses, identities and accreditation terms remain unchanged.
CREATE OR REPLACE FUNCTION public.rebalance_yorp_seed_reporting_quarters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  _row record;
  _activity date;
  _release timestamptz;
  _before jsonb;
  _after jsonb;
  _reports_before jsonb;
  _reports_after jsonb;
  _org_count integer;
  _budget_count integer;
  _missing integer;
  _terminal_definition text;
  _terminal_anchor text := 'OR NEW.release_date IS DISTINCT FROM OLD.release_date';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));
  LOCK TABLE public.budget_requests, public.liquidation_reports IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*) INTO _org_count FROM public.organization_profiles op
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch='PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account,false) IS FALSE
    AND op.seed_source_year IN (2024,2025,2026) AND op.seed_source_record_number IS NOT NULL;
  SELECT count(*), jsonb_agg(jsonb_build_array(br.id,br.organization_id,br.status,br.requested_amount,br.approved_amount,br.released_amount) ORDER BY br.id)
    INTO _budget_count,_before
  FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _org_count <> 84 OR _budget_count <> 84 THEN
    RAISE EXCEPTION 'Unexpected PCYDO fixture size: organizations %, budgets %',_org_count,_budget_count;
  END IF;
  IF EXISTS (SELECT 1 FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND (coalesce(lr.is_seeded_sample_data,false) IS FALSE OR lr.seed_batch IS DISTINCT FROM br.seed_batch)) THEN
    RAISE EXCEPTION 'Seed budgets have unmarked liquidation reports; automatic date repair stopped';
  END IF;
  SELECT jsonb_agg(jsonb_build_array(lr.id,lr.budget_request_id,lr.organization_id,lr.status) ORDER BY lr.id) INTO _reports_before
  FROM public.liquidation_reports lr JOIN public.organization_profiles op ON op.id=lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=lr.seed_batch
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account,false) IS FALSE;

  -- Only this privileged, transaction-scoped fixture repair may adjust a release
  -- date. Concurrent writes are locked out; amounts/status guards stay active.
  -- Restore the exact original definition before returning. Any failure rolls
  -- back both the function change and all row updates atomically.
  _terminal_definition := pg_get_functiondef('public.enforce_budget_request_terminal_status()'::regprocedure);
  IF strpos(_terminal_definition,_terminal_anchor)=0 THEN
    RAISE EXCEPTION 'Unexpected terminal release guard shape';
  END IF;
  EXECUTE replace(_terminal_definition,_terminal_anchor,
    'OR (NEW.release_date IS DISTINCT FROM OLD.release_date AND NOT (
      OLD.is_seeded_sample_data IS TRUE AND NEW.is_seeded_sample_data IS TRUE
      AND OLD.seed_batch = ''PCYDO-YORP-2024-2026''
      AND NEW.seed_batch = ''PCYDO-YORP-2024-2026''
      AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
    ))');

  FOR _row IN
    SELECT br.id,br.organization_id,op.seed_source_year AS year,
      CASE WHEN op.seed_source_year=2026 THEN 1 ELSE
        ((row_number() OVER (PARTITION BY op.seed_source_year,br.status ORDER BY op.seed_source_record_number,br.id)-1)%4+1)::integer END AS quarter,
      op.seed_source_record_number AS ordinal
    FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account,false) IS FALSE
  LOOP
    _activity := make_date(_row.year,_row.quarter*3,20+(_row.ordinal%3));
    _release := ((_activity-2)::timestamp + interval '9 hours') AT TIME ZONE 'Asia/Manila';
    UPDATE public.budget_requests br SET
      activity_date=_activity,fiscal_year=_row.year,
      created_at=(((_activity-4)::timestamp + interval '9 hours') AT TIME ZONE 'Asia/Manila'),
      release_date=CASE WHEN br.status::text IN ('budget_released','completed') THEN _activity-2 ELSE NULL END,
      go_signal_at=CASE WHEN br.go_signal_at IS NOT NULL THEN _release-interval '2 days'+interval '3 hours' ELSE NULL END,
      hard_copy_submitted_at=CASE WHEN br.hard_copy_submitted_at IS NOT NULL THEN _release-interval '1 day' ELSE NULL END,
      updated_at=clock_timestamp()
    WHERE br.id=_row.id AND br.organization_id=_row.organization_id
      AND br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026';
    UPDATE public.liquidation_reports lr SET
      created_at=(((_activity+1)::timestamp + interval '9 hours') AT TIME ZONE 'Asia/Manila'),
      go_signal_at=_release,deadline_at=_release+interval '30 days',
      hard_copy_submitted_at=CASE WHEN lr.hard_copy_submitted_at IS NOT NULL THEN _release+interval '9 days' ELSE NULL END,
      completed_at=CASE WHEN lr.completed_at IS NOT NULL THEN _release+interval '12 days' ELSE NULL END,
      updated_at=clock_timestamp()
    WHERE lr.budget_request_id=_row.id AND lr.organization_id=_row.organization_id
      AND lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026';
  END LOOP;
  EXECUTE _terminal_definition;

  SELECT jsonb_agg(jsonb_build_array(br.id,br.organization_id,br.status,br.requested_amount,br.approved_amount,br.released_amount) ORDER BY br.id) INTO _after
  FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  SELECT jsonb_agg(jsonb_build_array(lr.id,lr.budget_request_id,lr.organization_id,lr.status) ORDER BY lr.id) INTO _reports_after
  FROM public.liquidation_reports lr JOIN public.organization_profiles op ON op.id=lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=lr.seed_batch
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _before IS DISTINCT FROM _after OR _reports_before IS DISTINCT FROM _reports_after THEN
    RAISE EXCEPTION 'Seed date repair changed financial values, identities or statuses';
  END IF;
  SELECT count(*) INTO _missing FROM (VALUES (2024,1),(2024,2),(2024,3),(2024,4),(2025,1),(2025,2),(2025,3),(2025,4),(2026,1)) periods(year,quarter)
  WHERE NOT EXISTS (SELECT 1 FROM public.budget_requests br
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND br.fiscal_year=periods.year AND extract(quarter FROM br.activity_date)=periods.quarter AND br.released_amount>0);
  IF _missing <> 0 THEN RAISE EXCEPTION 'Missing released-budget coverage in % quarters',_missing; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.rebalance_yorp_seed_reporting_quarters() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rebalance_yorp_seed_reporting_quarters() TO service_role;

-- Keep repair/reseed behavior deterministic without altering the source roster.
DO $wrapper$
DECLARE _definition text; _needle text;
BEGIN
  _definition := replace(pg_get_functiondef('public.admin_seed_yorp_sample_dataset(text,text)'::regprocedure),chr(13),'');
  _needle := 'RETURN _result || jsonb_build_object(';
  IF strpos(_definition,_needle)=0 OR strpos(_definition,'validate_admin_session_token')=0 THEN
    RAISE EXCEPTION 'Unexpected seed wrapper shape';
  END IF;
  _definition := replace(_definition,_needle,'PERFORM public.rebalance_yorp_seed_reporting_quarters();' || E'\n  ' || _needle);
  EXECUTE _definition;
END;
$wrapper$;
SELECT public.rebalance_yorp_seed_reporting_quarters();
NOTIFY pgrst,'reload schema';
