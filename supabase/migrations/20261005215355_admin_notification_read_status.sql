-- Use the same recipient scope as admin_get_recent_notifications. The caller
-- supplies only a session token, never an administrator recipient ID.
CREATE OR REPLACE FUNCTION public.admin_mark_notifications_read(
  _session_token text,
  _notification_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _admin_id uuid;
  _updated_count integer;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  UPDATE public.notifications n
  SET is_read = true
  WHERE n.user_id::text IN (_admin_id::text, 'admin')
    AND n.is_read = false
    AND (_notification_id IS NULL OR n.id = _notification_id);
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN _updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_notifications_read(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_notifications_read(text, uuid) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
