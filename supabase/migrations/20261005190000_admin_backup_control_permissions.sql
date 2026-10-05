-- Forward-only Phase 2 configuration. No backup registry and no restore implementation.
UPDATE public.roles
SET permission_codes = (
  SELECT array_agg(code ORDER BY first_position)
  FROM (
    SELECT code, min(position) AS first_position
    FROM unnest(coalesce(permission_codes, '{}'::text[]) ||
      ARRAY['backup_recovery_view', 'backup_recovery_manage']) WITH ORDINALITY AS codes(code, position)
    GROUP BY code
  ) unique_codes
)
WHERE code = 'super_admin';

-- A short-lived mutex, not backup history. It closes the check/dispatch race across Edge isolates.
-- This reserved record is not editable through the existing settings RPC/UI.
INSERT INTO public.admin_system_settings
  (setting_key, category, value_json, data_type, description, is_sensitive, is_editable)
VALUES ('backup.dispatch_lease', 'internal', '{}'::jsonb, 'json',
  'Temporary backup dispatch coordination; GitHub remains the backup history source.', false, false)
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_backup_dispatch_guard(
  _session_token text, _operation text, _lease_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _codes text[];
  _lease jsonb;
  _busy boolean;
BEGIN
  IF _operation NOT IN ('read', 'claim', 'release', 'observe') THEN
    RAISE EXCEPTION 'Invalid backup control operation.';
  END IF;
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  SELECT r.code::text, r.permission_codes INTO _role_code, _codes
  FROM public.admin_accounts a JOIN public.roles r ON r.id = a.role_id
  WHERE a.id = _admin_id AND a.is_active;
  IF _role_code IS NULL OR (_role_code <> 'super_admin' AND NOT (
    CASE WHEN _operation IN ('read', 'observe') THEN 'backup_recovery_view'
    ELSE 'backup_recovery_manage' END = ANY(coalesce(_codes, '{}'::text[]))
  )) THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ytrace.backup.dispatch', 0));
  SELECT value_json INTO _lease FROM public.admin_system_settings
  WHERE setting_key = 'backup.dispatch_lease' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Backup control is unavailable.'; END IF;
  _busy := coalesce((_lease->>'expiresAt')::timestamptz > clock_timestamp(), false);
  IF _operation = 'read' THEN RETURN jsonb_build_object('busy', _busy); END IF;
  IF _operation = 'claim' THEN
    IF _busy THEN RETURN jsonb_build_object('acquired', false); END IF;
    IF _lease_id IS NULL THEN RAISE EXCEPTION 'Missing lease identifier.'; END IF;
    UPDATE public.admin_system_settings
    SET value_json = jsonb_build_object('id', _lease_id, 'expiresAt', clock_timestamp() + interval '10 minutes'),
        updated_at = clock_timestamp(), updated_by = _admin_id
    WHERE setting_key = 'backup.dispatch_lease';
    RETURN jsonb_build_object('acquired', true);
  END IF;
  IF _operation = 'observe' OR (_operation = 'release' AND _lease->>'id' = _lease_id::text) THEN
    UPDATE public.admin_system_settings SET value_json = '{}'::jsonb, updated_at = clock_timestamp()
    WHERE setting_key = 'backup.dispatch_lease';
  END IF;
  RETURN jsonb_build_object('released', true);
END;
$$;
-- Only the Edge service may coordinate dispatch; the browser cannot bypass the GitHub checks.
REVOKE ALL ON FUNCTION public.admin_backup_dispatch_guard(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backup_dispatch_guard(text, text, uuid) TO service_role;
