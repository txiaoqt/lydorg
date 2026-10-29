CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_admin_name text;
  v_rec record;
  v_audit_desc text;
  v_liq_ids uuid[];
  v_deleted_count int;
BEGIN
  SELECT vat.admin_id INTO v_admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin account is not authorized.');
  END IF;

  SELECT display_name INTO v_admin_name
  FROM public.admin_accounts
  WHERE id = v_admin_id;

  IF v_admin_name IS NULL THEN
    v_admin_name := 'Admin';
  END IF;

  IF _request_ids IS NULL OR array_length(_request_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No request IDs provided.');
  END IF;

  SELECT array_agg(id) INTO v_liq_ids
  FROM public.liquidation_reports
  WHERE budget_request_id = ANY(_request_ids);

  -- Log audit entries for deleted records if enabled
  IF public.is_audit_logging_enabled('deletion') THEN
    FOR v_rec IN
      SELECT id, organization_id, activity_title, status, requested_amount, approved_amount, released_amount
      FROM public.budget_requests
      WHERE id = ANY(_request_ids)
    LOOP
      IF v_rec.status IN ('budget_released', 'completed') THEN
        v_audit_desc := format(
          'Admin %s permanently deleted budget request "%s" (Status: %s, Requested: ₱%s, Approved: ₱%s, Released: ₱%s). Note: This later-stage financial record and its associated liquidation reports/files were intentionally deleted.',
          v_admin_name,
          v_rec.activity_title,
          v_rec.status,
          to_char(COALESCE(v_rec.requested_amount, 0), 'FM999,999,999,990.00'),
          to_char(COALESCE(v_rec.approved_amount, 0), 'FM999,999,999,990.00'),
          to_char(COALESCE(v_rec.released_amount, 0), 'FM999,999,999,990.00')
        );
      ELSE
        v_audit_desc := format(
          'Admin %s deleted budget request "%s" (Amount: ₱%s, Lifecycle: %s).',
          v_admin_name,
          v_rec.activity_title,
          to_char(COALESCE(v_rec.requested_amount, 0), 'FM999,999,999,990.00'),
          v_rec.status
        );
      END IF;

      INSERT INTO public.activity_logs (
        actor_user_id,
        organization_id,
        action,
        related_type,
        related_id,
        description,
        metadata
      ) VALUES (
        v_admin_id,
        v_rec.organization_id,
        'deleted_budget_request',
        'budget_request',
        v_rec.id,
        v_audit_desc,
        public.extract_audit_request_metadata()
      );
    END LOOP;
  END IF;

  DELETE FROM public.notifications
  WHERE (related_type = 'budget_request' AND related_id = ANY(_request_ids))
     OR (v_liq_ids IS NOT NULL AND related_type = 'liquidation_report' AND related_id = ANY(v_liq_ids));

  DELETE FROM public.budget_requests
  WHERE id = ANY(_request_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'deleted_ids', _request_ids
  );
END;
$function$

