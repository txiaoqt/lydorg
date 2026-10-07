-- Budget cards cover the selected reporting period, independently of table tabs
-- and pagination. Preserve the current RPC signature, guards and row filters.
DO $migration$
DECLARE
  _definition text;
  _start integer;
  _length integer;
  _tail text;
  _replacement text;
BEGIN
  _definition := replace(pg_get_functiondef('public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer)'::regprocedure), chr(13), '');
  IF strpos(_definition, 'validate_admin_session_token') = 0
    OR strpos(_definition, 'aa.is_active = true') = 0
    OR strpos(_definition, '_required_permission') = 0
    OR strpos(_definition, '_safe_page_size') = 0 THEN
    RAISE EXCEPTION 'Unexpected review RPC authorization or pagination';
  END IF;
  _start := strpos(_definition, E'COALESCE(jsonb_build_object(\n        ''pendingReview'',');
  IF _start = 0 THEN RAISE EXCEPTION 'Budget summary anchor missing'; END IF;
  _tail := substring(_definition FROM _start);
  _length := strpos(_tail, '), ''{}''::jsonb)');
  IF _length = 0 OR strpos(substring(_tail FROM 1 FOR _length), '''releasedTotal''') = 0 THEN
    RAISE EXCEPTION 'Unexpected budget summary shape';
  END IF;
  _length := _length + length('), ''{}''::jsonb)') - 1;
  _replacement := $summary$(SELECT jsonb_build_object(
        'pendingReview', count(*) FILTER (WHERE br.status::text IN ('submitted','under_review')),
        'pendingReviewToday', count(*) FILTER (WHERE br.status::text IN ('submitted','under_review') AND (br.created_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date),
        'approvedTotal', COALESCE(sum(br.approved_amount) FILTER (WHERE br.status::text IN ('awaiting_release','approved_for_ftf_green','hard_copy_submitted','budget_released','completed')), 0),
        'releasedTotal', COALESCE(sum(br.released_amount) FILTER (WHERE br.status::text IN ('budget_released','completed')), 0)
      ) FROM public.budget_requests br
        WHERE br.status::text <> 'draft'
          AND (_quarter IS NULL OR EXTRACT(QUARTER FROM COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date)) = _quarter)
          AND (_start_date IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date) >= _start_date)
          AND (_end_date_exclusive IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date) < _end_date_exclusive)
      )$summary$;
  _definition := overlay(_definition placing _replacement FROM _start FOR _length);
  EXECUTE _definition;
END;
$migration$;
NOTIFY pgrst, 'reload schema';
