-- Authorized fixture-only revision: distinct project titles and varied budgets.
CREATE OR REPLACE FUNCTION public.diversify_yorp_seed_projects_and_budgets()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  _titles text[] := ARRAY[
    'Santa Cruz Youth Volleyball and Wellness League',
    'Simple Group Community Leadership Bootcamp',
    'V-Hood Youth Volunteer Development Forum',
    'Kalye Artista Creative Leadership Academy',
    'Team Yey Youth Project Planning Lab',
    'Pure Kwatro Community Organizing Workshop',
    'Santolan Student Leadership and Study Skills Camp',
    'Santolan Brass Band Peer Mentorship Summit',
    'Perpetual Help Student Council Leadership Retreat',
    'Santolan Red Cross Youth Academic Service Forum',
    'Bagkat Neighborhood Clean Streets Campaign',
    'Malinao Youth Volleyball Skills Festival',
    'Damayan Youth Council Strategic Planning Session',
    'Damayan Phase Two Community Leaders Training',
    'Batang Concha Youth Action Planning Workshop',
    'Young Movers Community Service and Clean-up Day',
    'Katropa Youth Volunteer Coordination Camp',
    'Pinalad Youth Council Capacity Building Forum',
    'Habitat II Youth Leadership and Planning Clinic',
    'Sinag Pinagbuhatan Youth Governance Assembly',
    'Pasig Esports Healthy Gaming and Sports Cup',
    'Tambuli Youth Community Project Design Forum',
    'Pasig laban Youth Organizing and Leadership Camp',
    'Ortigas Rotaract Neighborhood Stewardship Drive',
    'Panthers Youth Volleyball and Fitness Challenge',
    'Hilltop Youth Community Leadership Exchange',
    'Positibong Pasigueño Youth Planning Congress',
    'Science High Student Council Academic Leadership Clinic',
    'Science High Learner Government Peer Leadership Forum',
    'YECO Youth Empowerment and Project Management Camp',
    'Zodiacville Young Leaders Community Planning Day',
    'Favor Youth Volunteer Leadership Academy',
    'Youth on the Rock Community Mobilization Workshop',
    'Nagpayong Student Leaders Learning Support Summit',
    'Kapitolyo High Learner Leadership and Mentoring Camp',
    'Buting Senior High Academic Leadership Forum',
    'Eusebio Learner Government Peer Mentoring Academy',
    'Ugong Community First Aid and Fire Safety Training',
    'San Lorenzo Ruiz Student Leadership Skills Exchange',
    'Pinagbuhatan Youth Emergency Readiness Workshop',
    '1609 Youth Council Governance and Planning Clinic',
    'Rosario Youth Cultural Heritage and Arts Day',
    'Massive Impact Youth Project Development Bootcamp',
    'Eusebio Science Club Student Innovation Leadership Camp',
    'Sagad Youth Neighborhood Care and Clean-up Drive',
    'BayaniHub Rosario Community Organizing Forum',
    'Anonas Youth Darts and Wellness Tournament',
    'Circle 34 Rover Youth Service Leadership Camp',
    'Near April Youth Volunteer Planning Retreat',
    'Team Phoenix Community Leadership Workshop',
    'Pasig 45 Youth Fire Prevention and Rescue Clinic',
    'Muslim Youth Solidarity Community Care Campaign',
    'Galant 88 Youth Mentoring and Leadership Festival',
    'SK Ugong Volunteer Project Coordination Training',
    'WINS School Greening and Tree Care Project',
    'Manggahan Youth Council Development Summit',
    'Sintayaw Youth Arts Leadership and Learning Camp',
    'Rosario Altar Servers Heritage and Creative Arts Workshop',
    'Angat Manggahan Community Leadership Lab',
    'Manggahan Youth Volleyball Development Cup',
    'Boss A Community First Response Training Day',
    'Royale Silvercane Youth Leadership and Mentorship Forum',
    'Santolan Youth Disaster Readiness and First Aid Camp',
    'Santolan Inclusive Youth Governance Dialogue',
    'Santolan Scouts Student Leadership and Service Academy',
    'Santolanian Youth Project Planning and Governance Forum',
    'SHS Young Researchers Academic Leadership Workshop',
    'Ang Santoleño Youth Council Leadership Retreat',
    'Bagong Ilog Youth Volleyball and Active Living Cup',
    'YB Youth Community Action Planning Camp',
    'Sikat Manggahan Youth Volunteer Leadership Exchange',
    'Ugong Teatro Youth Creative Leadership Workshop',
    'Dalaga at Binata Youth Organization Planning Academy',
    'Maharlika Dance Youth Mentorship and Learning Forum',
    'Maharlika Arts Student Leadership and Talent Camp',
    'Santolan Youth Badminton and Fitness Invitational',
    'Purok Seven Youth Basketball Development League',
    'YES-O School Urban Greening and Seedling Project',
    'PSRYO Youth Governance and Community Planning Summit',
    'Veracity Youth Organization Leadership Congress',
    'Arboleda Youth Volunteer and Project Management Workshop',
    'Pinagbuhatan Youth Council Governance Academy',
    'Pasig Sunrise Community Clean-up and Service Day',
    'Central Manggahan Community Rescue and First Aid Bootcamp'
  ];
  _original_guard text;
  _guard text;
  _anchor text;
  _exception text := '(OLD.is_seeded_sample_data IS TRUE AND NEW.is_seeded_sample_data IS TRUE
    AND OLD.seed_batch = ''PCYDO-YORP-2024-2026'' AND NEW.seed_batch = OLD.seed_batch
    AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
    AND EXISTS (SELECT 1 FROM public.organization_profiles op WHERE op.id=NEW.organization_id
      AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=NEW.seed_batch
      AND coalesce(op.is_renewal_test_account,false) IS FALSE))';
  _before jsonb;
  _after jsonb;
  _reports jsonb;
  _count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));
  LOCK TABLE public.budget_requests,public.liquidation_reports IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*),jsonb_agg(jsonb_build_array(br.id,br.organization_id,br.status,br.activity_date,br.fiscal_year,br.created_at,br.release_date) ORDER BY br.id)
  INTO _count,_before FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch
    AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _count<>84 OR cardinality(_titles)<>84 OR (
    SELECT count(DISTINCT op.seed_source_record_number) FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch='PCYDO-YORP-2024-2026'
      AND coalesce(op.is_renewal_test_account,false) IS FALSE AND op.seed_source_record_number BETWEEN 1 AND 84
  )<>84 THEN RAISE EXCEPTION 'Unexpected seed roster; revision stopped'; END IF;
  IF EXISTS (SELECT 1 FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND (lr.is_seeded_sample_data IS DISTINCT FROM TRUE OR lr.seed_batch IS DISTINCT FROM br.seed_batch)) THEN
    RAISE EXCEPTION 'Unmarked liquidation linked to fixture; revision stopped';
  END IF;
  SELECT jsonb_agg(to_jsonb(lr)-'updated_at' ORDER BY lr.id) INTO _reports
  FROM public.liquidation_reports lr JOIN public.organization_profiles op ON op.id=lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=lr.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;

  -- Guard changes are transaction-local, restored before return, and restricted
  -- to this validated fixture. Normal financial immutability remains unchanged.
  _original_guard := pg_get_functiondef('public.enforce_budget_request_terminal_status()'::regprocedure);
  _guard := _original_guard;
  FOREACH _anchor IN ARRAY ARRAY['OR NEW.approved_amount IS DISTINCT FROM OLD.approved_amount','OR NEW.released_amount IS DISTINCT FROM OLD.released_amount'] LOOP
    IF strpos(_guard,_anchor)=0 THEN RAISE EXCEPTION 'Unexpected terminal guard definition'; END IF;
    _guard := replace(_guard,_anchor,'OR ('||substr(_anchor,4)||' AND NOT '||_exception||')');
  END LOOP;
  EXECUTE _guard;
  UPDATE public.budget_requests br SET
    activity_title=_titles[op.seed_source_record_number],
    activity_description=format('Youth development project: %s. Organized by %s.',_titles[op.seed_source_record_number],op.organization_name),
    requested_amount=30000+(op.seed_source_record_number*37%45)*1000,
    approved_amount=30000+(op.seed_source_record_number*37%45)*1000-(op.seed_source_record_number%4)*1000,
    released_amount=CASE WHEN br.status::text IN ('budget_released','completed') THEN
      30000+(op.seed_source_record_number*37%45)*1000-(op.seed_source_record_number%4)*1000 ELSE 0 END
  FROM public.organization_profiles op WHERE op.id=br.organization_id
    AND br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  EXECUTE _original_guard;

  -- The existing budget sync trigger touches report deadlines on every budget
  -- update. Retain the previously approved report chronology exactly.
  UPDATE public.liquidation_reports lr SET go_signal_at=s.go_signal_at,deadline_at=s.deadline_at
  FROM jsonb_to_recordset(_reports) AS s(id uuid,go_signal_at timestamptz,deadline_at timestamptz)
  WHERE lr.id=s.id;
  SELECT jsonb_agg(jsonb_build_array(br.id,br.organization_id,br.status,br.activity_date,br.fiscal_year,br.created_at,br.release_date) ORDER BY br.id)
  INTO _after FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _before IS DISTINCT FROM _after THEN RAISE EXCEPTION 'Fixture identities, statuses or dates changed'; END IF;
  SELECT jsonb_agg(to_jsonb(lr)-'updated_at' ORDER BY lr.id) INTO _after
  FROM public.liquidation_reports lr JOIN public.organization_profiles op ON op.id=lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=lr.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _reports IS DISTINCT FROM _after THEN RAISE EXCEPTION 'Linked liquidation data changed'; END IF;
  IF (SELECT count(DISTINCT lower(trim(br.activity_title))) FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026' AND coalesce(op.is_renewal_test_account,false) IS FALSE)<>84
    OR EXISTS (SELECT 1 FROM public.budget_requests br WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND (br.released_amount>br.approved_amount OR br.approved_amount>br.requested_amount OR br.approved_amount<=0)) THEN
    RAISE EXCEPTION 'Invalid fixture titles or financial amounts';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.diversify_yorp_seed_projects_and_budgets() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.diversify_yorp_seed_projects_and_budgets() TO service_role;

DO $wrapper$
DECLARE _definition text; _anchor text := 'PERFORM public.rebalance_yorp_seed_reporting_quarters();';
BEGIN
  _definition := pg_get_functiondef('public.admin_seed_yorp_sample_dataset(text,text)'::regprocedure);
  IF strpos(_definition,_anchor)=0 OR strpos(_definition,'validate_admin_session_token')=0 THEN
    RAISE EXCEPTION 'Unexpected guarded seed wrapper';
  END IF;
  EXECUTE replace(_definition,_anchor,_anchor||E'\n  PERFORM public.diversify_yorp_seed_projects_and_budgets();');
END;
$wrapper$;
SELECT public.diversify_yorp_seed_projects_and_budgets();
NOTIFY pgrst,'reload schema';
