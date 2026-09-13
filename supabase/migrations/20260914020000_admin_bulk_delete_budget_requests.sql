-- Migration: 20260914020000_admin_bulk_delete_budget_requests.sql
-- Description: Provide an atomic, security-definer administrative RPC to safely bulk-delete budget requests
--              across all lifecycle statuses (including draft, submitted, under_review, needs_revision,
--              rejected_red, approved_for_ftf_green, hard_copy_submitted, budget_released, completed)
--              with full dependency cleanup (files, liquidation reports, notifications),
--              preservation of activity logs with enhanced audit trail for later-stage records.

CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(
  _session_token text,
  _request_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_name text;
  v_missing_ids uuid[];
  v_budget_files text[];
  v_liq_ids uuid[];
  v_liq_files text[];
  v_deleted_count int;
  v_rec record;
  v_audit_desc text;
BEGIN
  -- 1. Authenticate administrative session via canonical session validator
  SELECT vat.admin_id
  INTO v_admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT COALESCE(adm.display_name, adm.username, 'Admin')
  INTO v_admin_name
  FROM public.admin_accounts adm
  WHERE adm.id = v_admin_id
  LIMIT 1;

  IF v_admin_name IS NULL OR trim(v_admin_name) = '' THEN
    v_admin_name := 'Admin';
  END IF;

  -- Return immediately if no request IDs were supplied
  IF _request_ids IS NULL OR array_length(_request_ids, 1) IS NULL OR array_length(_request_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'deleted_count', 0,
      'budget_file_paths', '[]'::jsonb,
      'liquidation_file_paths', '[]'::jsonb,
      'deleted_request_ids', '[]'::jsonb,
      'deleted_liquidation_report_ids', '[]'::jsonb
    );
  END IF;

  -- 2. Verify all requested IDs exist in budget_requests
  SELECT array_agg(req_id)
  INTO v_missing_ids
  FROM unnest(_request_ids) req_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.budget_requests br WHERE br.id = req_id
  );

  IF v_missing_ids IS NOT NULL AND array_length(v_missing_ids, 1) > 0 THEN
    RAISE EXCEPTION 'One or more specified budget request IDs were not found: %', array_to_string(v_missing_ids, ', ');
  END IF;

  -- 3. Collect associated liquidation reports (1:1 relation)
  SELECT array_agg(id)
  INTO v_liq_ids
  FROM public.liquidation_reports
  WHERE budget_request_id = ANY(_request_ids);

  -- 4. Collect file paths/URLs before deleting database rows so Supabase Storage blobs can be cleaned
  SELECT array_agg(file_url)
  INTO v_budget_files
  FROM public.budget_request_files
  WHERE budget_request_id = ANY(_request_ids)
    AND file_url IS NOT NULL
    AND trim(file_url) != '';

  IF v_liq_ids IS NOT NULL AND array_length(v_liq_ids, 1) > 0 THEN
    SELECT array_agg(file_url)
    INTO v_liq_files
    FROM public.liquidation_report_files
    WHERE liquidation_report_id = ANY(v_liq_ids)
      AND file_url IS NOT NULL
      AND trim(file_url) != '';
  END IF;

  -- 5. Preserve audit history by recording deletion activity logs BEFORE removing rows
  FOR v_rec IN
    SELECT id, organization_id, activity_title, requested_amount, approved_amount, released_amount, status
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
      description
    ) VALUES (
      v_admin_id,
      v_rec.organization_id,
      'deleted_budget_request',
      'budget_request',
      v_rec.id,
      v_audit_desc
    );
  END LOOP;

  -- 6. Clean up polymorphic notifications
  DELETE FROM public.notifications
  WHERE (related_type = 'budget_request' AND related_id = ANY(_request_ids))
     OR (v_liq_ids IS NOT NULL AND related_type = 'liquidation_report' AND related_id = ANY(v_liq_ids));

  -- 7. Atomically delete budget requests (foreign keys cascade to budget_request_files,
  --    liquidation_reports, and liquidation_report_files)
  DELETE FROM public.budget_requests
  WHERE id = ANY(_request_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 8. Return response containing file paths for storage cleanup
  RETURN jsonb_build_object(
    'deleted_count', v_deleted_count,
    'budget_file_paths', to_jsonb(COALESCE(v_budget_files, ARRAY[]::text[])),
    'liquidation_file_paths', to_jsonb(COALESCE(v_liq_files, ARRAY[]::text[])),
    'deleted_request_ids', to_jsonb(_request_ids),
    'deleted_liquidation_report_ids', to_jsonb(COALESCE(v_liq_ids, ARRAY[]::uuid[]))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_budget_requests(text, uuid[]) TO anon, authenticated, service_role;
