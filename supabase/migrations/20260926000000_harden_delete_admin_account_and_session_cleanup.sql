-- Migration: Harden delete_admin_account with explicit admin session revocation
-- Ensures that when a Super Admin deletes an administrator account:
-- 1. All active admin sessions in public.admin_sessions are purged immediately.
-- 2. The admin_accounts record is removed.
-- 3. Former administrators can never retain or regain admin access with stale session tokens.

CREATE OR REPLACE FUNCTION public.delete_admin_account(
  _session_token text,
  _admin_id_to_delete uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_accounts a
    JOIN public.roles r ON r.id = a.role_id
    WHERE a.id = _admin_id AND 'administrators_management' = ANY(r.permission_codes)
  ) THEN
    RAISE EXCEPTION 'You do not have permission to manage admin accounts.';
  END IF;

  IF _admin_id = _admin_id_to_delete THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  -- 1. Explicitly purge all active admin sessions for this deleted administrator
  DELETE FROM public.admin_sessions WHERE admin_id = _admin_id_to_delete;

  -- 2. Delete the administrator account record
  DELETE FROM public.admin_accounts WHERE id = _admin_id_to_delete;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_admin_account(text, uuid) TO anon, authenticated, service_role;
