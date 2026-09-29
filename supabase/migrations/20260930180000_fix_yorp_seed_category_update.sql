-- Keep the reconstructable seed wrapper's budget update aligned with the
-- organization's selected Centers of Youth Participation. The core seed insert
-- is normalized by the budget-request trigger; writing the legacy fixture value
-- back before the wrapper's later repair causes that trigger to reject the update.
DO $migration$
DECLARE
  _definition text;
  _updated text;
BEGIN
  _definition := pg_get_functiondef(
    'public.admin_seed_yorp_sample_dataset(text,text)'::regprocedure
  );

  _updated := replace(
    _definition,
    'purpose_category = _record.b_purpose, fiscal_year = _record.b_year,',
    'purpose_category = public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp), fiscal_year = _record.b_year,'
  );

  IF _updated = _definition THEN
    RAISE EXCEPTION 'Could not apply the canonical category update to the YORP sample seed wrapper.';
  END IF;

  EXECUTE _updated;
END;
$migration$;
