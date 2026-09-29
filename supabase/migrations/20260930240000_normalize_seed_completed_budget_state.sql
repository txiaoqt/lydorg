-- Legacy fixture rows marked `completed` already represent released budgets.
-- Normalize them before the wrapper updates the budget so the terminal-state
-- trigger never sees an attempted transition away from budget_released.
DO $migration$
DECLARE
  _definition text;
  _updated text;
  _old_assignment text := $old$
    _expected_status := _record.b_status::public.budget_request_status;
$old$;
  _new_assignment text := $new$
    _expected_status := CASE
      WHEN _record.b_status = 'completed' THEN 'budget_released'::public.budget_request_status
      ELSE _record.b_status::public.budget_request_status
    END;
$new$;
BEGIN
  _definition := replace(
    pg_get_functiondef('public.admin_seed_yorp_sample_dataset(text,text)'::regprocedure),
    E'\r\n', E'\n'
  );
  _updated := replace(_definition, _old_assignment, _new_assignment);
  IF _updated = _definition OR length(_definition) - length(_updated) <> length(_old_assignment) - length(_new_assignment) THEN
    RAISE EXCEPTION 'Seed budget-state correction stopped: expected exactly one legacy status assignment.';
  END IF;
  EXECUTE _updated;
END;
$migration$;
