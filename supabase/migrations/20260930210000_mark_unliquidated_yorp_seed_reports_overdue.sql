-- Seeded released budgets that are not marked liquidated still need a liquidation
-- report so the admin queue can show them as overdue and future reseeds preserve it.
DO $migration$
DECLARE
  _definition text;
  _updated text;
  _old_branch text := $old$
      ELSE
        -- Remove any non-completed liquidation report row auto-created by triggers
        DELETE FROM public.liquidation_reports
        WHERE budget_request_id = _budget_id;
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
    pg_get_functiondef('public.admin_seed_yorp_sample_dataset_core(text,text)'::regprocedure),
    E'\r\n', E'\n'
  );
  _updated := replace(_definition, _old_branch, _new_branch);
  IF _updated = _definition OR length(_definition) - length(_updated) <> length(_old_branch) - length(_new_branch) THEN
    RAISE EXCEPTION 'Overdue liquidation update stopped: expected exactly one existing non-liquidated fixture branch.';
  END IF;
  EXECUTE _updated;
END;
$migration$;

DO $backfill$
DECLARE
  _target_orgs integer;
  _candidate_count integer;
  _protected_org_count integer;
  _inserted integer;
BEGIN
  SELECT count(*) INTO _target_orgs
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _protected_org_count
  FROM public.organization_profiles
  WHERE id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND is_renewal_test_account IS TRUE
    AND is_seeded_sample_data IS FALSE
    AND seed_batch IS NULL;

  SELECT count(*) INTO _candidate_count
  FROM public.budget_requests br
  JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND br.status = 'budget_released'
    AND br.released_amount > 0
    AND br.release_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidation_reports lr
      WHERE lr.budget_request_id = br.id
    );

  IF _target_orgs <> 84 OR _protected_org_count <> 1 OR _candidate_count <> 28 THEN
    RAISE EXCEPTION 'Overdue liquidation backfill stopped: expected 84 seeded organizations, protected renewal organization, and 28 missing released-budget reports; found %, %, and %.',
      _target_orgs, _protected_org_count, _candidate_count;
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
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND br.status = 'budget_released'
    AND br.released_amount > 0
    AND br.release_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidation_reports lr
      WHERE lr.budget_request_id = br.id
    );
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  IF _inserted <> 28 THEN
    RAISE EXCEPTION 'Overdue liquidation backfill stopped: expected to insert exactly 28 seeded reports, inserted %.', _inserted;
  END IF;
END;
$backfill$;
