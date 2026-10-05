-- Renew only a currently valid token. Revoked/expired sessions cannot be revived.
CREATE OR REPLACE FUNCTION public.admin_refresh_session(_session_token text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _timeout_minutes integer;
  _expires_at timestamptz;
BEGIN
  SELECT CASE WHEN value_json::text ~ '^[0-9]+$'
    THEN LEAST(480, GREATEST(5, value_json::text::integer)) ELSE 30 END
    INTO _timeout_minutes
  FROM public.admin_system_settings
  WHERE setting_key = 'security.admin_session_timeout_minutes';

  UPDATE public.admin_sessions s
  SET expires_at = clock_timestamp() + make_interval(mins => COALESCE(_timeout_minutes, 30)),
      last_used_at = clock_timestamp()
  WHERE s.token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
    AND s.expires_at > clock_timestamp()
    AND EXISTS (SELECT 1 FROM public.admin_accounts a WHERE a.id = s.admin_id AND a.is_active)
  RETURNING s.expires_at INTO _expires_at;

  IF _expires_at IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;
  RETURN _expires_at;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_refresh_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_refresh_session(text) TO anon, authenticated, service_role;
