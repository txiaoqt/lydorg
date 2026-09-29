-- The wrapper runs after the core seed and was deleting every non-liquidated
-- report created by the core. Keep released fixture reports overdue in both paths.
DO $function_fix$
DECLARE
  _definition text;
  _updated text;
  _old_branch text := $old$
    ELSE
      DELETE FROM public.liquidation_reports
      WHERE budget_request_id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;
$old$;
  _new_branch text := $new$
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
$new$;
BEGIN
  _definition := replace(
    pg_get_functiondef('public.admin_seed_yorp_sample_dataset(text,text)'::regprocedure),
    E'\r\n', E'\n'
  );
  _updated := replace(_definition, _old_branch, _new_branch);
  IF _updated = _definition OR length(_definition) - length(_updated) <> length(_old_branch) - length(_new_branch) THEN
    RAISE EXCEPTION 'Seed liquidation preservation stopped: expected exactly one wrapper deletion branch.';
  END IF;
  EXECUTE _updated;
END;
$function_fix$;

-- Repair only the 28 released PCYDO rows with no report. Keep the 28 already
-- completed fixture reports intact; never touch unseeded requests or the renewal
-- test organization. Preconditions make an unexpected dataset shape abort safely.
DO $data_repair$
DECLARE
  _seeded_orgs integer;
  _released integer;
  _completed integer;
  _missing integer;
  _protected_renewal integer;
  _inserted integer;
  _overdue integer;
BEGIN
  SELECT count(*) INTO _seeded_orgs
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) FILTER (WHERE br.status = 'budget_released'),
         count(*) FILTER (WHERE lr.status = 'completed_liquidated'),
         count(*) FILTER (WHERE lr.id IS NULL)
  INTO _released, _completed, _missing
  FROM public.budget_requests br
  JOIN public.organization_profiles op ON op.id = br.organization_id
  LEFT JOIN public.liquidation_reports lr ON lr.budget_request_id = br.id
  WHERE br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.released_amount > 0;

  SELECT count(*) INTO _protected_renewal
  FROM public.organization_profiles
  WHERE id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND is_renewal_test_account IS TRUE
    AND is_seeded_sample_data IS FALSE
    AND seed_batch IS NULL;

  IF _seeded_orgs <> 84 OR _released <> 56 OR _completed <> 28
     OR _missing <> 28 OR _protected_renewal <> 1 THEN
    RAISE EXCEPTION 'Overdue repair stopped: expected 84 seeded orgs, 56 released budgets (28 completed, 28 missing reports), and protected renewal org; found %, %, %, %, %.',
      _seeded_orgs, _released, _completed, _missing, _protected_renewal;
  END IF;

  INSERT INTO public.liquidation_reports (
    budget_request_id, organization_id, submitted_by, status, remarks,
    go_signal_at, deadline_at, is_seeded_sample_data, seed_batch,
    created_at, updated_at
  )
  SELECT br.id, br.organization_id, br.submitted_by, 'overdue',
         'Administrative test-seeded released budget awaiting liquidation.',
         br.release_date, br.release_date + interval '1 month', TRUE,
         'PCYDO-YORP-2024-2026', br.release_date, br.release_date
  FROM public.budget_requests br
  JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.status = 'budget_released'
    AND br.released_amount > 0
    AND br.release_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidation_reports lr WHERE lr.budget_request_id = br.id
    );
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  SELECT count(*) INTO _overdue
  FROM public.liquidation_reports lr
  JOIN public.budget_requests br ON br.id = lr.budget_request_id
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE lr.status = 'overdue'
    AND lr.is_seeded_sample_data IS TRUE
    AND lr.seed_batch = 'PCYDO-YORP-2024-2026'
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  IF _inserted <> 28 OR _overdue <> 28 THEN
    RAISE EXCEPTION 'Overdue repair stopped: expected 28 inserted and present overdue reports; inserted %, present %.', _inserted, _overdue;
  END IF;
END;
$data_repair$;
