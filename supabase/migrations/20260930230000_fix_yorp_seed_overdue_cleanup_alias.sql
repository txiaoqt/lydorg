-- Use the seed core's organization variable in the non-liquidated cleanup branch.
DO $migration$
DECLARE
  _definition text;
  _updated text;
  _old_clause text := $old$
      WHERE budget_request_id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
$old$;
  _new_clause text := $new$
      WHERE budget_request_id = _budget_id AND organization_id = _org_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
$new$;
BEGIN
  _definition := replace(
    pg_get_functiondef('public.admin_seed_yorp_sample_dataset_core(text,text)'::regprocedure),
    E'\r\n', E'\n'
  );
  _updated := replace(_definition, _old_clause, _new_clause);
  IF _updated = _definition OR length(_definition) - length(_updated) <> length(_old_clause) - length(_new_clause) THEN
    RAISE EXCEPTION 'Seed cleanup alias correction stopped: expected exactly one undefined _organization_id clause.';
  END IF;
  EXECUTE _updated;
END;
$migration$;
