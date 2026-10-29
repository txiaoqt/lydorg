-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.diversify_yorp_seed_projects_and_budgets()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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

CREATE OR REPLACE FUNCTION public.enforce_accreditation_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF tg_op = 'UPDATE' THEN
    IF old.term_number IS DISTINCT FROM new.term_number
       OR old.start_date IS DISTINCT FROM new.start_date
       OR old.end_date IS DISTINCT FROM new.end_date
       OR old.certificate_urn IS DISTINCT FROM new.certificate_urn
       OR old.approved_by IS DISTINCT FROM new.approved_by
       OR old.approved_at IS DISTINCT FROM new.approved_at
       OR old.created_at IS DISTINCT FROM new.created_at
       OR old.is_legacy_inferred IS DISTINCT FROM new.is_legacy_inferred THEN
      -- Controlled exception: permit date adjustments strictly for the designated renewal test account in non-production
      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
        IF EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = old.organization_id
            AND (op.is_renewal_test_account = true)
        ) THEN
          RETURN new;
        END IF;
      END IF;

      RAISE EXCEPTION 'Historical accreditation term fields are immutable.';
    END IF;

    -- Revocation immutability rules:
    IF old.revoked_at IS NOT NULL AND new.revoked_at IS DISTINCT FROM old.revoked_at THEN
      RAISE EXCEPTION 'Accreditation revocation timestamp is immutable once set.';
    END IF;

    IF old.revocation_reason IS NOT NULL AND new.revocation_reason IS DISTINCT FROM old.revocation_reason THEN
      RAISE EXCEPTION 'Accreditation revocation reason is immutable once set.';
    END IF;

    IF new.status <> 'revoked' AND new.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Non-revoked accreditation terms cannot have a revocation timestamp.';
    END IF;

    -- Valid status transitions only:
    IF old.status = 'superseded' AND new.status <> 'superseded' THEN
      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
        IF EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = old.organization_id
            AND (op.is_renewal_test_account = true)
        ) THEN
          RETURN new;
        END IF;
      END IF;
      RAISE EXCEPTION 'A superseded accreditation term cannot be reactivated or altered.';
    END IF;

    IF old.status = 'revoked' AND new.status <> 'revoked' THEN
      RAISE EXCEPTION 'A revoked accreditation term cannot be reactivated.';
    END IF;

    IF old.status <> 'revoked' AND new.status = 'revoked' THEN
      IF new.revoked_at IS NULL THEN
        new.revoked_at := clock_timestamp();
      END IF;
    END IF;

    RETURN new;
  END IF;

  IF tg_op = 'DELETE' THEN
    IF current_setting('app.allow_org_deletion', true) = 'true' THEN
      RETURN old;
    END IF;
    IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
      IF EXISTS (
        SELECT 1 FROM public.organization_profiles op
        WHERE op.id = old.organization_id
          AND (op.is_renewal_test_account = true)
      ) THEN
        RETURN old;
      END IF;
    END IF;
    RAISE EXCEPTION 'Accreditation terms in the authoritative ledger cannot be deleted.';
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_budget_request_file_resubmission_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _parent_status public.budget_request_status;
BEGIN
  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status THEN
    -- Serialize file decisions with parent decisions so an approval cannot
    -- race a revision decision in another admin tab.
    SELECT status INTO _parent_status FROM public.budget_requests
    WHERE id = NEW.budget_request_id FOR UPDATE;
    IF NEW.admin_status IN ('approved_green', 'awaiting_release')
       AND (OLD.admin_status = 'needs_revision' OR _parent_status = 'needs_revision') THEN
      RAISE EXCEPTION 'Resubmission required: replace the flagged proposal and submit it for review before approval.';
    END IF;
    IF NEW.admin_status = 'needs_revision'
       AND _parent_status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed') THEN
      RAISE EXCEPTION 'This budget request has already been approved. Refresh before making another review decision.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_budget_request_purpose_advocacy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _advocacies text[];
  _org_seeded boolean;
  _org_seed_batch text;
  _org_is_renewal boolean;
  _category_changed boolean;
  _canonical_category text;
BEGIN
  SELECT op.advocacies,
         coalesce(op.is_seeded_sample_data, false),
         op.seed_batch,
         coalesce(op.is_renewal_test_account, false)
  INTO _advocacies, _org_seeded, _org_seed_batch, _org_is_renewal
  FROM public.organization_profiles op
  WHERE op.id = NEW.organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget request organization profile was not found.';
  END IF;

  _category_changed := TG_OP = 'INSERT'
    OR lower(trim(coalesce(NEW.purpose_category, ''))) IS DISTINCT FROM lower(trim(coalesce(OLD.purpose_category, '')))
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id;

  IF NOT _category_changed THEN
    RETURN NEW;
  END IF;

  IF cardinality(coalesce(_advocacies, ARRAY[]::text[])) = 0 THEN
    RAISE EXCEPTION 'Select at least one Center of Youth Participation in the organization profile before creating or changing a budget request category.';
  END IF;

  SELECT cyp
  INTO _canonical_category
  FROM unnest(_advocacies) AS cyp
  WHERE lower(trim(cyp)) = lower(trim(coalesce(NEW.purpose_category, '')))
  LIMIT 1;

  IF _canonical_category IS NOT NULL THEN
    NEW.purpose_category := _canonical_category;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     AND NEW.is_seeded_sample_data IS TRUE
     AND NEW.seed_batch = 'PCYDO-YORP-2024-2026'
     AND _org_seeded IS TRUE
     AND _org_seed_batch = 'PCYDO-YORP-2024-2026'
     AND _org_is_renewal IS FALSE THEN
    NEW.purpose_category := public.resolve_yorp_seed_budget_category(NEW.purpose_category, _advocacies);
    IF NEW.purpose_category IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Purpose & Category must match a Center of Youth Participation selected in the organization profile.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_budget_request_resubmission_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _revision_at timestamptz;
BEGIN
  IF NEW.status = 'needs_revision' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.revision_requested_at := clock_timestamp();
    NEW.revision_due_at := NEW.revision_requested_at + interval '5 days';
  END IF;

  IF OLD.status = 'needs_revision' AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('submitted', 'under_review', 'awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed') THEN
    IF NEW.status <> 'submitted' THEN
      RAISE EXCEPTION 'Resubmission required: submit the revised budget proposal for review before approval.';
    END IF;
    -- Legacy rows without a revision timestamp fail closed against the last update.
    _revision_at := COALESCE(OLD.revision_requested_at, OLD.updated_at);
    IF _revision_at IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.budget_request_files f
      WHERE f.budget_request_id = OLD.id AND f.uploaded_at > _revision_at
        AND COALESCE(f.admin_status, '') NOT IN ('needs_revision', 'rejected_red')
    ) THEN
      RAISE EXCEPTION 'A new replacement proposal file is required before resubmitting this budget request.';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
     AND EXISTS (
       SELECT 1 FROM public.budget_request_files f
       WHERE f.budget_request_id = OLD.id AND f.admin_status IN ('needs_revision', 'rejected_red')
     ) THEN
    RAISE EXCEPTION 'Cannot approve or release a budget request with unresolved document revisions or rejected documents.';
  END IF;
  RETURN NEW;
END;
$function$;

RESET check_function_bodies;

