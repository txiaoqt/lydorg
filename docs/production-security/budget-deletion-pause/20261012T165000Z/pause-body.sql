CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE CALLED ON NULL INPUT SECURITY DEFINER PARALLEL UNSAFE COST 100
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE SQLSTATE 'PT409' USING
    MESSAGE = 'BUDGET_DELETION_PAUSED: Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.';
END;
$function$;
