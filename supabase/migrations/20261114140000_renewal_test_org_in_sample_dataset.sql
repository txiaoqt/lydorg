-- Renewal Test Organization is part of the PCYDO YORP sample dataset: seeding creates it, cleanup removes it.
-- Its immutable Cycle 1 packet guard now allows deletion during full organization deletion only.
CREATE OR REPLACE FUNCTION public.guard_renewal_test_registration_packet_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _submission_id uuid;
  _is_seeded_registration boolean := false;
BEGIN
  -- Full organization deletion (sample dataset cleanup / canonical delete) may remove the packet.
  IF TG_OP = 'DELETE' AND current_setting('app.allow_org_deletion', true) = 'true' THEN
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME = 'document_submission_files'
     AND TG_OP = 'INSERT'
     AND current_setting('app.seed_renewal_test_registration_documents', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'document_submissions' THEN
    _submission_id := OLD.id;
    _is_seeded_registration :=
      OLD.is_seeded_sample_data IS TRUE
      AND OLD.seed_batch = 'RENEWAL-TEST-REGISTRATION'
      AND OLD.submission_scope = 'registration'
      AND OLD.renewal_id IS NULL;
  ELSE
    IF TG_OP = 'INSERT' THEN
      _submission_id := NEW.submission_id;
    ELSE
      _submission_id := OLD.submission_id;
    END IF;
    SELECT EXISTS (
      SELECT 1
      FROM public.document_submissions submission
      WHERE (submission.id = _submission_id
         OR (TG_OP = 'UPDATE' AND submission.id = NEW.submission_id))
        AND submission.is_seeded_sample_data IS TRUE
        AND submission.seed_batch = 'RENEWAL-TEST-REGISTRATION'
        AND submission.submission_scope = 'registration'
        AND submission.renewal_id IS NULL
    ) INTO _is_seeded_registration;
  END IF;

  IF _is_seeded_registration THEN
    RAISE EXCEPTION 'The Renewal Test Organization registration packet is an immutable Cycle 1 record.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cleanup_yorp_sample_dataset(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _org_ids uuid[] := '{}';
  _user_ids uuid[] := '{}';
  _deleted_orgs integer := 0;
  _deleted_budgets integer := 0;
  _deleted_liquidations integer := 0;
  _deleted_users integer := 0;
  _required_documents integer := 0;
  _mapped_assets integer := 0;
  _now timestamptz := clock_timestamp();
  _renewal record;
  _renewal_result jsonb;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Cleanup is available only in an explicitly configured non-production environment.';
  END IF;
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Cleanup is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));

  SELECT coalesce(array_agg(id), '{}'), coalesce(array_agg(user_id), '{}')
  INTO _org_ids, _user_ids
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT coalesce(array_agg(DISTINCT op.user_id) FILTER (WHERE op.user_id IS NOT NULL), '{}')
  INTO _user_ids
  FROM public.organization_profiles op
  WHERE op.id = ANY(_org_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_profiles renewal
      WHERE renewal.user_id = op.user_id
        AND (renewal.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
          OR coalesce(renewal.is_renewal_test_account, false) IS TRUE)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_profiles related
      WHERE related.user_id = op.user_id
        AND related.id <> ALL(_org_ids)
    );

  IF cardinality(_org_ids) > 0 THEN
    SELECT count(*) INTO _required_documents
    FROM public.required_document_types rdt
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));
    SELECT count(*) INTO _mapped_assets
    FROM public.required_document_types rdt
    JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
    JOIN storage.objects object_row ON object_row.bucket_id = asset.bucket_id AND object_row.name = asset.object_name
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));
    IF _required_documents = 0 OR _mapped_assets <> _required_documents THEN
      RAISE EXCEPTION 'Cleanup stopped because reusable registration seed assets are not mapped for every active YORP requirement. Map % of % requirements before cleanup.', _mapped_assets, _required_documents;
    END IF;

    IF EXISTS (SELECT 1 FROM public.ypop_entries WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have YPOP entries that are not part of the authoritative fixture and would otherwise cascade-delete.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organization_renewals WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have renewal history that this fixture cannot reconstruct.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inquiries WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have inquiry records outside the generated fixture.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.compliance_remarks WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have compliance history outside the generated fixture.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.budget_requests
      WHERE organization_id = ANY(_org_ids)
        AND (is_seeded_sample_data IS DISTINCT FROM TRUE OR seed_batch IS DISTINCT FROM _batch_name)
    ) THEN
      RAISE EXCEPTION 'Cleanup stopped: one or more seeded organizations have budget requests outside the generated fixture.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.liquidation_reports
      WHERE organization_id = ANY(_org_ids)
        AND (is_seeded_sample_data IS DISTINCT FROM TRUE OR seed_batch IS DISTINCT FROM _batch_name)
    ) THEN
      RAISE EXCEPTION 'Cleanup stopped: one or more seeded organizations have liquidation records outside the generated fixture.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.document_submissions ds
      WHERE ds.organization_id = ANY(_org_ids)
        AND (ds.is_seeded_sample_data IS DISTINCT FROM TRUE OR ds.seed_batch IS DISTINCT FROM _batch_name)
    ) THEN
      RAISE EXCEPTION 'Cleanup stopped: one or more seeded organizations have registration packets not tracked as generated fixture data.';
    END IF;

    PERFORM set_config('app.allow_org_deletion', 'true', true);
    UPDATE public.organization_profiles
      SET current_accreditation_id = NULL
      WHERE id = ANY(_org_ids)
        AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
        AND coalesce(is_renewal_test_account, false) IS FALSE;

    WITH deleted AS (
      DELETE FROM public.liquidation_reports
      WHERE organization_id = ANY(_org_ids)
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
      RETURNING id
    ) SELECT count(*) INTO _deleted_liquidations FROM deleted;

    WITH deleted AS (
      DELETE FROM public.budget_requests
      WHERE organization_id = ANY(_org_ids)
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
      RETURNING id
    ) SELECT count(*) INTO _deleted_budgets FROM deleted;

    DELETE FROM public.organization_contacts WHERE organization_id = ANY(_org_ids);
    DELETE FROM public.organization_accreditations WHERE organization_id = ANY(_org_ids);
    DELETE FROM public.notifications
    WHERE organization_id = ANY(_org_ids) OR user_id = ANY(_user_ids);

    -- Preserve organization-linked audit history while clearing the cascading FK.
    UPDATE public.activity_logs
      SET organization_id = NULL
      WHERE organization_id = ANY(_org_ids);

    WITH deleted AS (
      DELETE FROM public.organization_profiles
      WHERE id = ANY(_org_ids)
        AND is_seeded_sample_data IS TRUE
        AND seed_batch = _batch_name
        AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
        AND coalesce(is_renewal_test_account, false) IS FALSE
      RETURNING id
    ) SELECT count(*) INTO _deleted_orgs FROM deleted;

    DELETE FROM public.user_profiles WHERE user_id = ANY(_user_ids);
    DELETE FROM auth.identities WHERE user_id = ANY(_user_ids)
      AND user_id <> ALL(ARRAY(
        SELECT renewal.user_id FROM public.organization_profiles renewal
        WHERE renewal.user_id IS NOT NULL
          AND (renewal.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
            OR coalesce(renewal.is_renewal_test_account, false) IS TRUE)
      ));
    WITH deleted AS (
      DELETE FROM auth.users WHERE id = ANY(_user_ids)
        AND id <> ALL(ARRAY(
          SELECT renewal.user_id FROM public.organization_profiles renewal
          WHERE renewal.user_id IS NOT NULL
            AND (renewal.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
              OR coalesce(renewal.is_renewal_test_account, false) IS TRUE)
        ))
      RETURNING id
    ) SELECT count(*) INTO _deleted_users FROM deleted;
  END IF;

  -- The Renewal Test Organization belongs to the sample dataset: remove it (and its test login) too.
  -- Seeding recreates it through admin_get_or_create_renewal_test_account.
  FOR _renewal IN
    SELECT id, user_id FROM public.organization_profiles
    WHERE is_renewal_test_account IS TRUE OR id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
  LOOP
    _renewal_result := public.delete_organization_account_canonical(_session_token, _renewal.id);
    IF coalesce((_renewal_result->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Cleanup stopped: the Renewal Test Organization could not be removed (%).', coalesce(_renewal_result->>'error', 'unknown error');
    END IF;
    _deleted_orgs := _deleted_orgs + 1;
    IF _renewal.user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.organization_profiles WHERE user_id = _renewal.user_id)
       AND NOT EXISTS (SELECT 1 FROM public.admin_accounts WHERE id = _renewal.user_id) THEN
      DELETE FROM public.notifications WHERE user_id = _renewal.user_id;
      DELETE FROM auth.identities WHERE user_id = _renewal.user_id;
      DELETE FROM auth.users WHERE id = _renewal.user_id;
      _deleted_users := _deleted_users + 1;
    END IF;
  END LOOP;

  INSERT INTO public.activity_logs(actor_user_id, action, related_type, description, created_at)
  VALUES (_admin_id, 'cleaned_yorp_sample_dataset', 'system_batch',
    format('Removed generated PCYDO YORP fixture records (including the Renewal Test Organization): %s organizations, %s budgets, %s liquidations, %s test identities. Reusable Storage seed assets were retained.',
      _deleted_orgs, _deleted_budgets, _deleted_liquidations, _deleted_users), _now);

  RETURN jsonb_build_object(
    'success', true, 'batch_name', _batch_name,
    'deleted_organizations', _deleted_orgs,
    'deleted_budget_requests', _deleted_budgets,
    'deleted_liquidations', _deleted_liquidations,
    'deleted_users', _deleted_users,
    'storage_seed_assets_deleted', 0,
    'renewal_test_organization_included', true,
    'timestamp', _now
  );
END;
$function$;

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
  -- The Renewal Test Organization is part of the sample dataset: (re)create it with its Cycle 1 registration packet.
  PERFORM public.admin_get_or_create_renewal_test_account(_session_token);
  PERFORM public.admin_seed_renewal_test_registration_documents(_session_token);

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
    'renewal_test_organization_included', true
  );
END;
$function$;
