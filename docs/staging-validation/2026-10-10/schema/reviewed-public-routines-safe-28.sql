-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rebalance_yorp_seed_reporting_quarters()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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

CREATE OR REPLACE FUNCTION public.repair_yorp_seeded_fixture_relationships(_organization_id uuid, _user_id uuid, _admin_id uuid, _record jsonb, _batch_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'storage', 'extensions'
AS $function$
DECLARE
  _organization public.organization_profiles%ROWTYPE;
  _submission_id uuid;
  _budget_id uuid;
  _required_count integer := 0;
  _asset_count integer := 0;
  _missing text[] := '{}';
  _document record;
  _asset storage.objects%ROWTYPE;
  _file_id uuid;
  _expected_status public.budget_request_status;
  _amount numeric := coalesce((_record->>'b_amt')::numeric, 50000);
  _verified_at timestamptz := (_record->>'v_date')::timestamptz;
BEGIN
  IF _batch_name <> 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Only the designated PCYDO YORP test batch can be repaired.';
  END IF;

  SELECT * INTO _organization
  FROM public.organization_profiles
  WHERE id = _organization_id
    AND user_id = _user_id
    AND is_seeded_sample_data IS TRUE
    AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seed repair refused because the organization is not an eligible generated record.';
  END IF;

  SELECT count(*) INTO _required_count
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _required_count = 0 THEN
    RAISE EXCEPTION 'No active required YORP registration document requirements are configured.';
  END IF;

  SELECT count(*) INTO _asset_count
  FROM public.required_document_types rdt
  JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
  JOIN storage.objects object_row
    ON object_row.bucket_id = asset.bucket_id
   AND object_row.name = asset.object_name
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _asset_count <> _required_count THEN
    SELECT array_agg(rdt.name ORDER BY rdt.sort_order, rdt.name) INTO _missing
    FROM public.required_document_types rdt
    LEFT JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
    LEFT JOIN storage.objects object_row
      ON object_row.bucket_id = asset.bucket_id
     AND object_row.name = asset.object_name
    WHERE rdt.is_active IS TRUE
      AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
      AND object_row.name IS NULL;
    RAISE EXCEPTION 'YORP seed asset mapping is incomplete or points to missing Storage objects. Requirements: %', array_to_string(_missing, ', ');
  END IF;

  SELECT ds.id INTO _submission_id
  FROM public.document_submissions ds
  WHERE ds.organization_id = _organization_id
    AND ds.renewal_id IS NULL
    AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  ORDER BY ds.created_at ASC, ds.id ASC
  LIMIT 1
  FOR UPDATE;

  IF _submission_id IS NULL THEN
    INSERT INTO public.document_submissions (
      organization_id, submitted_by, status, user_confirmed, submitted_at,
      reviewed_by, reviewed_at, submission_scope, renewal_id,
      is_seeded_sample_data, seed_batch, created_at, updated_at
    ) VALUES (
      _organization_id, _user_id, 'approved_green', true, _verified_at,
      _admin_id, _verified_at, 'registration', NULL,
      true, _batch_name, _verified_at, _verified_at
    ) RETURNING id INTO _submission_id;
  ELSE
    UPDATE public.document_submissions
    SET status = 'approved_green', user_confirmed = true,
        submitted_at = coalesce(submitted_at, _verified_at),
        reviewed_by = coalesce(reviewed_by, _admin_id),
        reviewed_at = coalesce(reviewed_at, _verified_at),
        is_seeded_sample_data = true, seed_batch = _batch_name,
        updated_at = clock_timestamp()
    WHERE id = _submission_id;
  END IF;

  -- Collapse duplicates only inside this generated registration packet. No Storage
  -- object is deleted; all file rows point to the immutable shared seed assets.
  UPDATE public.document_submission_files
  SET is_seeded_sample_data = true, seed_batch = _batch_name
  WHERE submission_id = _submission_id;

  DELETE FROM public.document_submission_files duplicate
  USING public.document_submission_files keeper
  WHERE duplicate.submission_id = _submission_id
    AND keeper.submission_id = duplicate.submission_id
    AND keeper.document_type_id = duplicate.document_type_id
    AND keeper.id < duplicate.id;

  DELETE FROM public.document_submission_files obsolete
  WHERE obsolete.submission_id = _submission_id
    AND NOT EXISTS (
      SELECT 1 FROM public.required_document_types rdt
      WHERE rdt.id = obsolete.document_type_id
        AND rdt.is_active IS TRUE
        AND coalesce(rdt.is_required, true) IS TRUE
        AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
        AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
        AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
    );

  FOR _document IN
    SELECT rdt.id, rdt.name, asset.bucket_id, asset.object_name, object_row.metadata
    FROM public.required_document_types rdt
    JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
    JOIN storage.objects object_row
      ON object_row.bucket_id = asset.bucket_id
     AND object_row.name = asset.object_name
    WHERE rdt.is_active IS TRUE
      AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
    ORDER BY rdt.sort_order, rdt.name
  LOOP
    SELECT * INTO _asset FROM storage.objects
    WHERE bucket_id = _document.bucket_id AND name = _document.object_name;

    SELECT id INTO _file_id FROM public.document_submission_files
    WHERE submission_id = _submission_id AND document_type_id = _document.id
    ORDER BY created_at ASC, id ASC LIMIT 1;

    IF _file_id IS NULL THEN
      INSERT INTO public.document_submission_files (
        submission_id, document_type_id, file_url, file_name, file_type,
        file_size, validation_status, admin_status, uploaded_at, reviewed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _submission_id, _document.id,
        'storage://' || _document.bucket_id || '/' || _document.object_name,
        regexp_replace(_document.object_name, '^.*/', ''),
        coalesce(_asset.metadata->>'mimetype', 'application/pdf'),
        coalesce((_asset.metadata->>'size')::bigint, 0),
        'correct', 'approved_green', _verified_at, _verified_at,
        true, _batch_name, _verified_at, _verified_at
      );
    ELSE
      UPDATE public.document_submission_files
      SET file_url = 'storage://' || _document.bucket_id || '/' || _document.object_name,
          file_name = regexp_replace(_document.object_name, '^.*/', ''),
          file_type = coalesce(_asset.metadata->>'mimetype', 'application/pdf'),
          file_size = coalesce((_asset.metadata->>'size')::bigint, 0),
          validation_status = 'correct', admin_status = 'approved_green',
          uploaded_at = coalesce(uploaded_at, _verified_at),
          reviewed_at = coalesce(reviewed_at, _verified_at),
          is_seeded_sample_data = true, seed_batch = _batch_name,
          updated_at = clock_timestamp()
      WHERE id = _file_id;
    END IF;
  END LOOP;

  -- Registration/accreditation state is repaired by the caller from the authoritative
  -- SQL fixture row. This function returns actual requirement counts for validation.
  RETURN jsonb_build_object('submission_id', _submission_id, 'required_documents', _required_count);
END;
$function$;

RESET check_function_bodies;

