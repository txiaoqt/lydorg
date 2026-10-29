-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_seed_yorp_sample_dataset(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _result jsonb;
  _record record;
  _organization_id uuid;
  _user_id uuid;
  _accreditation_id uuid;
  _budget_id uuid;
  _required integer := 0;
  _organizations integer := 0;
  _registrations integer := 0;
  _documents integer := 0;
  _complete integer := 0;
  _missing integer := 0;
  _duplicates integer := 0;
  _budgets integer := 0;
  _awaiting integer := 0;
  _released integer := 0;
  _liquidated integer := 0;
  _verified_at timestamptz;
  _expected_status public.budget_request_status;
BEGIN
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Seed repair is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Seed operation is available only in an explicitly configured non-production environment.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));

  -- The fixture core and all repairs run in this transaction. Its temporary source
  -- table remains available until the enclosing RPC commits.
  _result := public.admin_seed_yorp_sample_dataset_core(_session_token, _batch_name);
  IF to_regclass('pg_temp.temp_yorp_seed_dataset') IS NULL THEN
    RAISE EXCEPTION 'Authoritative SQL fixture rows were not available for post-seed repair.';
  END IF;

  FOR _record IN EXECUTE 'SELECT * FROM pg_temp.temp_yorp_seed_dataset ORDER BY record_num' LOOP
    SELECT op.id, op.user_id, op.verified_at
    INTO _organization_id, _user_id, _verified_at
    FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = _batch_name
      AND op.seed_source_record_number = _record.record_num
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
    FOR UPDATE;

    IF _organization_id IS NULL OR _user_id IS NULL THEN
      RAISE EXCEPTION 'Seeded organization % is missing or is protected; no fixture repair was applied.', _record.record_num;
    END IF;

    INSERT INTO public.user_profiles(user_id, email, display_name, full_name, contact_number)
    SELECT _user_id, op.organization_email, op.organization_name, op.representative_name, op.contact_number
    FROM public.organization_profiles op
    WHERE op.id = _organization_id
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO auth.identities(id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    SELECT _user_id, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', u.email),
      'email', _user_id::text, coalesce(u.created_at, clock_timestamp()), clock_timestamp()
    FROM auth.users u
    WHERE u.id = _user_id
      AND NOT EXISTS (
        SELECT 1 FROM auth.identities i WHERE i.provider = 'email' AND i.provider_id = _user_id::text
      )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- Reconstruct the required term-one accreditation only for this generated row.
    SELECT oa.id INTO _accreditation_id
    FROM public.organization_accreditations oa
    WHERE oa.organization_id = _organization_id AND oa.term_number = 1
    ORDER BY oa.created_at ASC, oa.id ASC LIMIT 1;
    IF _accreditation_id IS NULL THEN
      INSERT INTO public.organization_accreditations (
        organization_id, term_number, start_date, end_date, certificate_urn,
        status, approved_by, approved_at, created_at
      ) VALUES (
        _organization_id, 1, _record.v_date::date, _record.acc_end,
        (SELECT op.urn FROM public.organization_profiles op WHERE op.id = _organization_id),
        'active', _admin_id, _verified_at, _verified_at
      ) RETURNING id INTO _accreditation_id;
    END IF;
    UPDATE public.organization_profiles
    SET current_accreditation_id = _accreditation_id
    WHERE id = _organization_id
      AND is_seeded_sample_data IS TRUE
      AND seed_batch = _batch_name
      AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(is_renewal_test_account, false) IS FALSE;

    _expected_status := CASE
      WHEN _record.b_status = 'completed' THEN 'budget_released'::public.budget_request_status
      ELSE _record.b_status::public.budget_request_status
    END;
    SELECT br.id INTO _budget_id
    FROM public.budget_requests br
    WHERE br.organization_id = _organization_id
      AND br.is_seeded_sample_data IS TRUE
      AND br.seed_batch = _batch_name
    ORDER BY br.created_at ASC, br.id ASC LIMIT 1;

    IF _budget_id IS NULL THEN
      INSERT INTO public.budget_requests (
        organization_id, submitted_by, activity_title, activity_description,
        activity_date, venue, requested_amount, approved_amount, released_amount,
        release_date, purpose_category, fiscal_year, status, is_seeded_sample_data,
        seed_batch, admin_remarks, user_note, created_at, updated_at
      ) VALUES (
        _organization_id, _user_id, _record.b_title,
        format('Official %s activity conducted by %s in Barangay %s.', _record.b_title, _record.org_name, _record.brgy),
        _record.v_date::date + interval '60 days',
        format('Barangay %s Multi-Purpose Hall, Pasig City', _record.brgy),
        _record.b_amt, _record.b_amt,
        CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN _record.b_amt ELSE 0 END,
        CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN (_record.v_date::date + interval '45 days')::timestamptz ELSE NULL END,
        _record.b_purpose, _record.b_year, _expected_status, true, _batch_name,
        format('Official sample budget request for %s seeded in CY %s.', _record.org_name, _record.src_year),
        'Administrative test-seeded budget request.',
        _record.v_date + interval '30 days', _record.v_date + interval '30 days'
      ) RETURNING id INTO _budget_id;
    ELSE
      UPDATE public.budget_requests
      SET submitted_by = _user_id, activity_title = _record.b_title,
          requested_amount = _record.b_amt, approved_amount = _record.b_amt,
          released_amount = CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN _record.b_amt ELSE 0 END,
          release_date = CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN (_record.v_date::date + interval '45 days')::timestamptz ELSE NULL END,
          purpose_category = public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp), fiscal_year = _record.b_year,
          status = _expected_status, seed_batch = _batch_name,
          is_seeded_sample_data = true, updated_at = clock_timestamp()
      WHERE id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;

    UPDATE public.budget_requests
    SET purpose_category = public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp)
    WHERE id = _budget_id AND organization_id = _organization_id
      AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;

    IF NOT EXISTS (
      SELECT 1 FROM public.organization_profiles op
      WHERE op.id = _organization_id
        AND public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp) = ANY(coalesce(op.advocacies, ARRAY[]::text[]))
    ) THEN
      RAISE EXCEPTION 'Fixture category for source record % does not match its Centers of Youth Participation.', _record.record_num;
    END IF;

    IF _record.b_liquidated IS TRUE THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, hard_copy_submitted_at, completed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _budget_id, _organization_id, _user_id, 'completed_liquidated',
        'Administrative test-seeded verified liquidation report.',
        _record.v_date + interval '45 days', _record.v_date + interval '90 days',
        _record.v_date + interval '75 days', _record.v_date + interval '80 days',
        true, _batch_name, _record.v_date + interval '75 days', _record.v_date + interval '80 days'
      ) ON CONFLICT (budget_request_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        submitted_by = EXCLUDED.submitted_by,
        status = EXCLUDED.status, remarks = EXCLUDED.remarks,
        go_signal_at = EXCLUDED.go_signal_at, deadline_at = EXCLUDED.deadline_at,
        hard_copy_submitted_at = EXCLUDED.hard_copy_submitted_at,
        completed_at = EXCLUDED.completed_at,
        is_seeded_sample_data = true, seed_batch = _batch_name,
        updated_at = EXCLUDED.updated_at;
    ELSIF _record.b_status IN ('budget_released', 'completed') THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, is_seeded_sample_data, seed_batch,
        created_at, updated_at
      ) VALUES (
        _budget_id, _organization_id, _user_id, 'overdue',
        'Administrative test-seeded released budget awaiting liquidation.',
        (_record.v_date::date + interval '45 days')::timestamptz,
        (_record.v_date::date + interval '45 days' + interval '1 month')::timestamptz,
        true, _batch_name,
        (_record.v_date::date + interval '45 days')::timestamptz,
        (_record.v_date::date + interval '45 days')::timestamptz
      ) ON CONFLICT (budget_request_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        submitted_by = EXCLUDED.submitted_by,
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        go_signal_at = EXCLUDED.go_signal_at,
        deadline_at = EXCLUDED.deadline_at,
        hard_copy_submitted_at = NULL,
        completed_at = NULL,
        is_seeded_sample_data = true,
        seed_batch = _batch_name,
        updated_at = EXCLUDED.updated_at;
    ELSE
      DELETE FROM public.liquidation_reports
      WHERE budget_request_id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;

    PERFORM public.repair_yorp_seeded_fixture_relationships(
      _organization_id, _user_id, _admin_id, to_jsonb(_record), _batch_name
    );
  END LOOP;

  SELECT count(*) INTO _organizations FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _required FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(DISTINCT ds.id), count(dsf.id)
  INTO _registrations, _documents
  FROM public.document_submissions ds
  LEFT JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration');

  WITH seeded AS (
    SELECT op.id organization_id
    FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
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

  SELECT count(*) FILTER (WHERE br.status = 'awaiting_release'),
         count(*) FILTER (WHERE br.status IN ('budget_released', 'completed')),
         count(*)
  INTO _awaiting, _released, _budgets
  FROM public.budget_requests br JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND br.is_seeded_sample_data IS TRUE AND br.seed_batch = _batch_name
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _liquidated FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND lr.is_seeded_sample_data IS TRUE AND lr.seed_batch = _batch_name
    AND lr.status = 'completed_liquidated'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  IF _organizations <> 84 OR _registrations <> 84 OR _documents <> 84 * _required
     OR _complete <> 84 OR _missing <> 0 OR _duplicates <> 0 OR _budgets <> 84
     OR _awaiting <> 28 OR _released <> 56 OR _liquidated <> 28 THEN
    RAISE EXCEPTION 'YORP fixture validation failed: organizations %, registrations %, documents % (required % each), complete %, missing %, duplicates %, budgets %, awaiting %, released %, liquidated %.',
      _organizations, _registrations, _documents, _required, _complete, _missing,
      _duplicates, _budgets, _awaiting, _released, _liquidated;
  END IF;

  PERFORM public.rebalance_yorp_seed_reporting_quarters();
  PERFORM public.diversify_yorp_seed_projects_and_budgets();
  RETURN _result || jsonb_build_object(
    'organizations', _organizations,
    'registration_packets', _registrations,
    'document_records', _documents,
    'required_documents_per_organization', _required,
    'organizations_document_complete', _complete,
    'missing_requirements', _missing,
    'duplicate_requirements', _duplicates,
    'budget_requests', _budgets,
    'awaiting_release', _awaiting,
    'released', _released,
    'liquidated', _liquidated,
    'renewal_test_organization_excluded', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_seed_yorp_sample_dataset_core(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_template_file_size(_session_token text, _template_id uuid, _file_size bigint)
 RETURNS required_document_types
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _updated_template public.required_document_types;
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
  IF _role_code <> 'super_admin' AND NOT ('forms_templates_management' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to update template metadata.';
  END IF;
  IF _file_size IS NULL OR _file_size < 0 THEN
    RAISE EXCEPTION 'Template file size must be zero or greater.';
  END IF;

  UPDATE public.required_document_types
  SET template_file_size = _file_size
  WHERE id = _template_id
  RETURNING * INTO _updated_template;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template document type was not found.';
  END IF;
  RETURN _updated_template;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_budget_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN PERFORM public.admin_bump_portal_change_version('budgets'); IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_document_file_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  submission_row public.document_submissions%ROWTYPE;
  submission_id uuid;
  resource_key text;
BEGIN
  submission_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END;
  SELECT * INTO submission_row FROM public.document_submissions WHERE id = submission_id;
  IF FOUND THEN
    resource_key := CASE WHEN submission_row.submission_scope::text = 'renewal' OR submission_row.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
    PERFORM public.admin_bump_portal_change_version(resource_key);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.submission_id IS DISTINCT FROM NEW.submission_id THEN
    SELECT * INTO submission_row FROM public.document_submissions WHERE id = OLD.submission_id;
    IF FOUND THEN
      resource_key := CASE WHEN submission_row.submission_scope::text = 'renewal' OR submission_row.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
      PERFORM public.admin_bump_portal_change_version(resource_key);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

RESET check_function_bodies;

