-- The overdue liquidation branch belongs to the seed core, whose fixture record
-- variable is _rec (and organization variable is _org_id). Keep the change narrowly
-- scoped and stop if the deployed function no longer matches the expected branch.
DO $migration$
DECLARE
  _definition text;
  _updated text;
  _broken_branch text := $broken$
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
$broken$;
  _correct_branch text := $correct$
      ELSIF _rec.b_status IN ('budget_released', 'completed') THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, is_seeded_sample_data, seed_batch,
        created_at, updated_at
      ) VALUES (
        _budget_id, _org_id, _user_id, 'overdue',
        'Administrative test-seeded released budget awaiting liquidation.',
        (_rec.v_date::date + interval '45 days')::timestamptz,
        (_rec.v_date::date + interval '45 days' + interval '1 month')::timestamptz,
        true, _batch_name,
        (_rec.v_date::date + interval '45 days')::timestamptz,
        (_rec.v_date::date + interval '45 days')::timestamptz
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
$correct$;
BEGIN
  _definition := replace(
    pg_get_functiondef('public.admin_seed_yorp_sample_dataset_core(text,text)'::regprocedure),
    E'\r\n', E'\n'
  );
  _updated := replace(_definition, _broken_branch, _correct_branch);
  IF _updated = _definition OR length(_definition) - length(_updated) <> length(_broken_branch) - length(_correct_branch) THEN
    RAISE EXCEPTION 'Seed alias correction stopped: expected exactly one known broken overdue branch.';
  END IF;
  EXECUTE _updated;
END;
$migration$;
