-- Liquidation placeholders created by the budget lifecycle trigger belong to
-- the same sample batch as their parent budget. Repair only the known pristine
-- placeholders from the current fixture, then keep that relationship for future
-- seeded budgets.
DO $migration$
DECLARE
  _target_orgs integer;
  _liquidations integer;
  _marked_completed integer;
  _pristine_placeholders integer;
  _unexpected integer;
  _renewal_updated_at timestamptz;
  _updated integer;
BEGIN
  SELECT count(*) INTO _target_orgs
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT updated_at INTO _renewal_updated_at
  FROM public.organization_profiles
  WHERE id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND is_renewal_test_account IS TRUE
    AND is_seeded_sample_data IS FALSE
    AND seed_batch IS NULL;

  IF _target_orgs <> 84 OR _renewal_updated_at IS NULL THEN
    RAISE EXCEPTION 'Liquidation marker repair stopped: expected 84 seeded organizations and the protected Renewal Test Organization.';
  END IF;

  SELECT count(*) INTO _liquidations
  FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _marked_completed
  FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  JOIN public.budget_requests br
    ON br.id = lr.budget_request_id
   AND br.organization_id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND lr.status = 'completed_liquidated'
    AND lr.is_seeded_sample_data IS TRUE
    AND lr.seed_batch = 'PCYDO-YORP-2024-2026'
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026';

  SELECT count(*) INTO _pristine_placeholders
  FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  JOIN public.budget_requests br
    ON br.id = lr.budget_request_id
   AND br.organization_id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND br.status = 'budget_released'
    AND lr.status = 'pending_activity_completion'
    AND lr.is_seeded_sample_data IS FALSE
    AND lr.seed_batch IS NULL
    AND lr.submitted_by = br.submitted_by
    AND lr.remarks IS NULL
    AND lr.completed_at IS NULL
    AND lr.hard_copy_submitted_at IS NULL
    AND lr.revision_requested_at IS NULL
    AND lr.revision_due_at IS NULL
    AND lr.revision_unlocked_at IS NULL
    AND lr.revision_unlocked_by IS NULL
    AND lr.revision_locked IS FALSE
    AND lr.revision_locked_at IS NULL
    AND lr.go_signal_at IS NOT NULL
    AND lr.deadline_at = lr.go_signal_at + interval '1 month'
    AND lr.created_at = lr.go_signal_at
    AND lr.updated_at = lr.go_signal_at;

  SELECT count(*) INTO _unexpected
  FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  LEFT JOIN public.budget_requests br
    ON br.id = lr.budget_request_id
   AND br.organization_id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND NOT (
      lr.status = 'completed_liquidated'
      AND lr.is_seeded_sample_data IS TRUE
      AND lr.seed_batch = 'PCYDO-YORP-2024-2026'
      AND br.is_seeded_sample_data IS TRUE
      AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    )
    AND NOT (
      br.status = 'budget_released'
      AND br.is_seeded_sample_data IS TRUE
      AND br.seed_batch = 'PCYDO-YORP-2024-2026'
      AND lr.status = 'pending_activity_completion'
      AND lr.is_seeded_sample_data IS FALSE
      AND lr.seed_batch IS NULL
      AND lr.submitted_by = br.submitted_by
      AND lr.remarks IS NULL
      AND lr.completed_at IS NULL
      AND lr.hard_copy_submitted_at IS NULL
      AND lr.revision_requested_at IS NULL
      AND lr.revision_due_at IS NULL
      AND lr.revision_unlocked_at IS NULL
      AND lr.revision_unlocked_by IS NULL
      AND lr.revision_locked IS FALSE
      AND lr.revision_locked_at IS NULL
      AND lr.go_signal_at IS NOT NULL
      AND lr.deadline_at = lr.go_signal_at + interval '1 month'
      AND lr.created_at = lr.go_signal_at
      AND lr.updated_at = lr.go_signal_at
    );

  IF _liquidations <> 56 OR _marked_completed <> 28
     OR _pristine_placeholders <> 28 OR _unexpected <> 0 THEN
    RAISE EXCEPTION 'Liquidation marker repair stopped: expected 56 linked rows (28 completed, 28 pristine placeholders); found total=%, completed=%, placeholders=%, unexpected=%.',
      _liquidations, _marked_completed, _pristine_placeholders, _unexpected;
  END IF;

  UPDATE public.liquidation_reports lr
  SET is_seeded_sample_data = TRUE,
      seed_batch = 'PCYDO-YORP-2024-2026'
  FROM public.organization_profiles op,
       public.budget_requests br
  WHERE op.id = lr.organization_id
    AND br.id = lr.budget_request_id
    AND br.organization_id = lr.organization_id
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND br.status = 'budget_released'
    AND lr.status = 'pending_activity_completion'
    AND lr.is_seeded_sample_data IS FALSE
    AND lr.seed_batch IS NULL
    AND lr.submitted_by = br.submitted_by
    AND lr.remarks IS NULL
    AND lr.completed_at IS NULL
    AND lr.hard_copy_submitted_at IS NULL
    AND lr.revision_requested_at IS NULL
    AND lr.revision_due_at IS NULL
    AND lr.revision_unlocked_at IS NULL
    AND lr.revision_unlocked_by IS NULL
    AND lr.revision_locked IS FALSE
    AND lr.revision_locked_at IS NULL
    AND lr.go_signal_at IS NOT NULL
    AND lr.deadline_at = lr.go_signal_at + interval '1 month'
    AND lr.created_at = lr.go_signal_at
    AND lr.updated_at = lr.go_signal_at;
  GET DIAGNOSTICS _updated = ROW_COUNT;

  IF _updated <> 28 THEN
    RAISE EXCEPTION 'Liquidation marker repair stopped: expected to mark exactly 28 generated placeholders, updated %.', _updated;
  END IF;
END;
$migration$;

-- Carry the parent budget's sample ownership onto the pending liquidation row
-- created by the normal lifecycle trigger.
CREATE OR REPLACE FUNCTION public.ensure_liquidation_report_for_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status IN ('budget_released', 'completed') THEN
    INSERT INTO public.liquidation_reports (
      budget_request_id,
      organization_id,
      submitted_by,
      status,
      go_signal_at,
      deadline_at,
      created_at,
      updated_at,
      is_seeded_sample_data,
      seed_batch
    )
    VALUES (
      NEW.id,
      NEW.organization_id,
      NEW.submitted_by,
      'pending_activity_completion',
      coalesce(NEW.go_signal_at, now()),
      coalesce(NEW.go_signal_at, now()) + interval '1 month',
      now(),
      now(),
      coalesce(NEW.is_seeded_sample_data, false),
      NEW.seed_batch
    )
    ON CONFLICT (budget_request_id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          submitted_by = EXCLUDED.submitted_by,
          go_signal_at = coalesce(EXCLUDED.go_signal_at, public.liquidation_reports.go_signal_at),
          deadline_at = coalesce(EXCLUDED.deadline_at, public.liquidation_reports.deadline_at),
          is_seeded_sample_data = EXCLUDED.is_seeded_sample_data,
          seed_batch = EXCLUDED.seed_batch,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;
