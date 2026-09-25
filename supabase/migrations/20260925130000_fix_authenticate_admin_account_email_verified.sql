-- ==============================================================================
-- Migration: 20260925130000_fix_authenticate_admin_account_email_verified.sql
-- Description: Fixes runtime error 'record "admin" has no field "is_email_verified"'
--              in public.authenticate_admin_account(text, text).
--              Calculates authoritative administrator email verification from
--              auth.users instead of referencing a non-existent physical column on
--              public.admin_accounts.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.authenticate_admin_account(text, text);

CREATE OR REPLACE FUNCTION public.authenticate_admin_account(
  _username text,
  _password text
)
RETURNS TABLE (
  admin_id uuid,
  username citext,
  email citext,
  display_name text,
  session_token text,
  expires_at timestamp with time zone,
  is_email_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  _admin public.admin_accounts%rowtype;
  _session_token text;
  _expires_at timestamptz;
  _clean_identifier text;
  _timeout_mins integer := 30;
  _is_email_verified boolean := true;
BEGIN
  _clean_identifier := lower(trim(coalesce(_username, '')));

  SELECT *
  INTO _admin
  FROM public.admin_accounts aa
  WHERE aa.is_active = true
    AND (lower(aa.email::text) = _clean_identifier OR lower(aa.username::text) = _clean_identifier)
    AND aa.password_hash = extensions.crypt(_password, aa.password_hash)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Authoritative Administrator Email Verification Resolution
  -- Checks auth.users for confirmed_at, email_confirmed_at, or email_verified metadata
  SELECT coalesce(
    u.email_confirmed_at IS NOT NULL
    OR u.confirmed_at IS NOT NULL
    OR coalesce((u.raw_user_meta_data->>'email_verified')::boolean, false)
    OR coalesce((u.raw_app_meta_data->>'email_verified')::boolean, false),
    true
  )
  INTO _is_email_verified
  FROM auth.users u
  WHERE u.id = _admin.id OR lower(u.email) = lower(_admin.email::text)
  ORDER BY (u.id = _admin.id) DESC, u.created_at DESC
  LIMIT 1;

  -- If no corresponding auth.users entry exists (e.g. system/seeded admin), default to true
  IF _is_email_verified IS NULL THEN
    _is_email_verified := true;
  END IF;

  -- 2. Load dynamic session timeout setting (default 30 minutes)
  SELECT coalesce((s.value_json)::integer, 30)
  INTO _timeout_mins
  FROM public.admin_system_settings s
  WHERE s.setting_key = 'security.admin_session_timeout_minutes';

  IF _timeout_mins IS NULL OR _timeout_mins < 5 THEN
    _timeout_mins := 30;
  END IF;

  _session_token := encode(extensions.gen_random_bytes(32), 'hex');
  _expires_at := now() + (_timeout_mins || ' minutes')::interval;

  -- 3. Create Admin Session
  INSERT INTO public.admin_sessions (
    admin_id,
    token_hash,
    expires_at
  )
  VALUES (
    _admin.id,
    encode(extensions.digest(_session_token, 'sha256'), 'hex'),
    _expires_at
  );

  -- 4. Record Administrator Sign-In Audit if enabled
  IF public.is_audit_logging_enabled('login') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    )
    VALUES (
      _admin.id,
      NULL,
      'admin_sign_in',
      'admin_session',
      _admin.id,
      'Administrator signed in: ' || coalesce(_admin.display_name, _admin.username::text),
      public.extract_audit_request_metadata()
    );
  END IF;

  -- 5. Return authentication record with computed is_email_verified
  RETURN QUERY
  SELECT
    _admin.id,
    _admin.username,
    _admin.email,
    _admin.display_name,
    _session_token,
    _expires_at,
    _is_email_verified;
END;
$$;
