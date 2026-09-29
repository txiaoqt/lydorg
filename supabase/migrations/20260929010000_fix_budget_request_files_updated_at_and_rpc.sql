-- ==============================================================================
-- Migration: 20260929010000_fix_budget_request_files_updated_at_and_rpc.sql
-- Description: Ensures updated_at exists on budget_request_files and canonicalizes admin_update_budget_request_file_status
-- ==============================================================================

ALTER TABLE public.budget_request_files
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT clock_timestamp();

CREATE OR REPLACE FUNCTION public.admin_update_budget_request_file_status(
  _session_token text,
  _file_id uuid,
  _admin_status text,
  _admin_remarks text DEFAULT NULL::text
)
RETURNS SETOF public.budget_request_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN QUERY
  UPDATE public.budget_request_files
  SET
    admin_status = COALESCE(_admin_status, budget_request_files.admin_status),
    admin_remarks = COALESCE(_admin_remarks, budget_request_files.admin_remarks),
    updated_at = clock_timestamp()
  WHERE budget_request_files.id = _file_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_budget_request_file_status(
  text,
  uuid,
  text,
  text
) TO anon, authenticated, service_role;
