-- ==============================================================================
-- Migration: 20260925080000_audit_records_hardening.sql
-- Description: Full implementation hardening of Admin System Settings -> Audit & Records
--              1. Adds metadata jsonb column to public.activity_logs.
--              2. Introduces public.is_audit_logging_enabled(_category text) helper.
--              3. Introduces public.extract_audit_request_metadata() helper.
--              4. Updates create_admin_activity_log with explicit category & metadata.
--              5. Hardens authenticate_admin_account and revoke_admin_session_token for login/logout auditing.
--              6. Hardens update_role_permissions with role permission change auditing.
--              7. Hardens delete_admin_inquiry & admin_bulk_delete_budget_requests with server-side deletion gating.
--              8. Hardens renewal and YPOP review RPCs with server-side approval gating.
--              9. Hardens YPOP database triggers with server-side update gating.
-- ==============================================================================

-- 1. Add metadata column to public.activity_logs if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activity_logs'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 1.1 Migrate legacy default Reply-To email to lydo@pasigcity.gov.ph
INSERT INTO public.admin_system_settings (
  setting_key,
  category,
  value_json,
  data_type,
  description,
  is_sensitive,
  is_editable
)
VALUES (
  'email.reply_to_email',
  'email',
  '"lydo@pasigcity.gov.ph"'::jsonb,
  'string',
  'Default reply-to email address on outgoing system communications',
  false,
  true
)
ON CONFLICT (setting_key) DO UPDATE
SET value_json = '"lydo@pasigcity.gov.ph"'::jsonb,
    updated_at = now()
WHERE admin_system_settings.value_json IN (
  '"support@lydo.pasigcity.gov.ph"'::jsonb,
  '"support@lydo.pasig.gov.ph"'::jsonb,
  '""'::jsonb,
  'null'::jsonb
)
OR admin_system_settings.value_json IS NULL;

UPDATE public.admin_system_settings
SET value_json = '"lydo@pasigcity.gov.ph"'::jsonb,
    updated_at = now()
WHERE setting_key = 'general.support_email'
  AND value_json IN (
    '"support@lydo.pasigcity.gov.ph"'::jsonb,
    '"support@lydo.pasig.gov.ph"'::jsonb
  );

-- 2. Server-side audit logging evaluation helper
CREATE OR REPLACE FUNCTION public.is_audit_logging_enabled(_category text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _setting_key text;
  _val jsonb;
BEGIN
  CASE lower(trim(coalesce(_category, '')))
    WHEN 'login' THEN _setting_key := 'audit.log_admin_login';
    WHEN 'logout' THEN _setting_key := 'audit.log_admin_logout';
    WHEN 'create' THEN _setting_key := 'audit.log_record_creation';
    WHEN 'update' THEN _setting_key := 'audit.log_record_updates';
    WHEN 'approval' THEN _setting_key := 'audit.log_approvals_rejections';
    WHEN 'deletion' THEN _setting_key := 'audit.log_deletions';
    WHEN 'permission' THEN _setting_key := 'audit.log_permission_changes';
    WHEN 'config' THEN _setting_key := 'audit.log_config_changes';
    WHEN 'metadata_user_agent' THEN _setting_key := 'audit.include_user_agent';
    WHEN 'metadata_ip' THEN _setting_key := 'audit.include_ip_metadata';
    ELSE
      RETURN true;
  END CASE;

  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _setting_key;

  IF _val IS NULL THEN
    IF _setting_key = 'audit.include_ip_metadata' THEN
      RETURN false;
    ELSE
      RETURN true;
    END IF;
  END IF;

  RETURN coalesce((_val)::boolean, true);
END;
$$;

-- 3. Server-side metadata extraction helper
CREATE OR REPLACE FUNCTION public.extract_audit_request_metadata()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _headers jsonb;
  _meta jsonb := '{}'::jsonb;
  _ua text;
  _ip text;
BEGIN
  BEGIN
    _headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    _headers := NULL;
  END;

  IF _headers IS NOT NULL THEN
    -- User-Agent
    IF public.is_audit_logging_enabled('metadata_user_agent') THEN
      _ua := coalesce(_headers->>'user-agent', _headers->>'User-Agent');
      IF _ua IS NOT NULL AND trim(_ua) <> '' THEN
        _meta := _meta || jsonb_build_object('user_agent', trim(_ua));
      END IF;
    END IF;

    -- Client IP (reads standard proxy headers forwarded by Supabase / Cloudflare)
    IF public.is_audit_logging_enabled('metadata_ip') THEN
      _ip := coalesce(
        _headers->>'x-forwarded-for',
        _headers->>'cf-connecting-ip',
        _headers->>'x-real-ip'
      );
      IF _ip IS NOT NULL AND trim(_ip) <> '' THEN
        _ip := trim(split_part(_ip, ',', 1));
        _meta := _meta || jsonb_build_object('ip_address', _ip);
      END IF;
    END IF;
  END IF;

  RETURN _meta;
END;
$$;

-- 4. Update create_admin_activity_log with category evaluation and metadata capture
DROP FUNCTION IF EXISTS public.create_admin_activity_log(text, uuid, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.create_admin_activity_log(text, uuid, text, text, uuid, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.create_admin_activity_log(
  _session_token text,
  _organization_id uuid,
  _action text,
  _related_type text,
  _related_id uuid,
  _description text,
  _category text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  actor_user_id uuid,
  organization_id uuid,
  action text,
  related_type text,
  related_id uuid,
  description text,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _effective_category text;
  _final_meta jsonb;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  _effective_category := lower(trim(coalesce(_category, '')));
  IF _effective_category = '' THEN
    IF _action ILIKE '%login%' OR _action ILIKE '%sign_in%' THEN _effective_category := 'login';
    ELSIF _action ILIKE '%logout%' OR _action ILIKE '%sign_out%' THEN _effective_category := 'logout';
    ELSIF _action ILIKE '%delete%' OR _action ILIKE '%remove%' OR _action ILIKE '%purge%' THEN _effective_category := 'deletion';
    ELSIF _action ILIKE '%permission%' OR _action ILIKE '%role%' THEN _effective_category := 'permission';
    ELSIF _action ILIKE '%setting%' OR _action ILIKE '%config%' THEN _effective_category := 'config';
    ELSIF _action ILIKE '%approve%' OR _action ILIKE '%reject%' OR _action ILIKE '%decision%' OR _action ILIKE '%review%' THEN _effective_category := 'approval';
    ELSIF _action ILIKE '%create%' OR _action ILIKE '%add%' OR _action ILIKE '%new%' THEN _effective_category := 'create';
    ELSE _effective_category := 'update';
    END IF;
  END IF;

  -- If the audit category is disabled, safely return empty set without failing the operation
  IF NOT public.is_audit_logging_enabled(_effective_category) THEN
    RETURN;
  END IF;

  _final_meta := coalesce(_metadata, '{}'::jsonb) || public.extract_audit_request_metadata();

  RETURN QUERY
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
    _admin_id,
    _organization_id,
    trim(_action),
    trim(_related_type),
    _related_id,
    _description,
    _final_meta
  )
  RETURNING
    activity_logs.id,
    activity_logs.actor_user_id,
    activity_logs.organization_id,
    activity_logs.action,
    activity_logs.related_type,
    activity_logs.related_id,
    activity_logs.description,
    activity_logs.created_at,
    activity_logs.metadata;
END;
$$;

-- 5. Harden authenticate_admin_account to audit login events
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

  -- Authoritative Administrator Email Verification Resolution
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

  IF _is_email_verified IS NULL THEN
    _is_email_verified := true;
  END IF;

  -- Load dynamic session timeout setting (default 30 minutes)
  SELECT coalesce((s.value_json)::integer, 30)
  INTO _timeout_mins
  FROM public.admin_system_settings s
  WHERE s.setting_key = 'security.admin_session_timeout_minutes';

  IF _timeout_mins IS NULL OR _timeout_mins < 5 THEN
    _timeout_mins := 30;
  END IF;

  _session_token := encode(extensions.gen_random_bytes(32), 'hex');
  _expires_at := now() + (_timeout_mins || ' minutes')::interval;

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

  -- Record Administrator Sign-In Audit if enabled
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

-- 6. Harden revoke_admin_session_token to audit logout events
CREATE OR REPLACE FUNCTION public.revoke_admin_session_token(_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _admin_name text;
BEGIN
  SELECT s.admin_id, a.display_name INTO _admin_id, _admin_name
  FROM public.admin_sessions s
  JOIN public.admin_accounts a ON a.id = s.admin_id
  WHERE s.token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
  LIMIT 1;

  UPDATE public.admin_sessions
  SET revoked_at = now()
  WHERE token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    AND revoked_at IS NULL;

  IF _admin_id IS NOT NULL AND public.is_audit_logging_enabled('logout') THEN
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
      _admin_id,
      NULL,
      'admin_sign_out',
      'admin_session',
      _admin_id,
      'Administrator signed out: ' || coalesce(_admin_name, 'Admin User'),
      public.extract_audit_request_metadata()
    );
  END IF;
END;
$$;

-- 7. Harden update_role_permissions to audit permission changes
CREATE OR REPLACE FUNCTION public.update_role_permissions(
  _session_token text,
  _role_id smallint,
  _permission_codes text[]
)
RETURNS TABLE (id smallint, code text, permission_codes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _target_role_code text;
  _target_role_label text;
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
    WHERE a.id = _admin_id AND r.code = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super administrators may manage role permissions.';
  END IF;

  SELECT roles.code, roles.label INTO _target_role_code, _target_role_label
  FROM public.roles
  WHERE roles.id = _role_id;

  IF _target_role_code = 'super_admin' THEN
    RAISE EXCEPTION 'Super Admin permissions cannot be modified.';
  END IF;

  UPDATE public.roles
  SET permission_codes = _permission_codes
  WHERE roles.id = _role_id;

  IF public.is_audit_logging_enabled('permission') THEN
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
      _admin_id,
      NULL,
      'updated_role_permissions',
      'role',
      NULL,
      'Updated permissions for role "' || coalesce(_target_role_label, _target_role_code) || '" (' || coalesce(array_length(_permission_codes, 1), 0) || ' permissions assigned).',
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN QUERY
  SELECT roles.id, roles.code::text, roles.permission_codes
  FROM public.roles
  WHERE roles.id = _role_id;
END;
$$;

-- 8. Harden delete_admin_inquiry with deletion audit gating
CREATE OR REPLACE FUNCTION public.delete_admin_inquiry(
  _session_token text,
  _inquiry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _inquiry public.inquiries%rowtype;
BEGIN
  -- 1. Authorize active admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin account is not authorized.'
    );
  END IF;

  -- 2. Find and lock the target inquiry
  SELECT *
  INTO _inquiry
  FROM public.inquiries
  WHERE id = _inquiry_id
  FOR UPDATE;

  IF _inquiry.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Inquiry not found.'
    );
  END IF;

  -- 3. Delete the inquiry
  DELETE FROM public.inquiries
  WHERE id = _inquiry_id;

  -- 4. Record the deletion in public.activity_logs if enabled
  IF public.is_audit_logging_enabled('deletion') THEN
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
      _admin_id,
      _inquiry.organization_id,
      'delete_inquiry',
      'inquiry',
      _inquiry.id,
      'Deleted inquiry "' || coalesce(_inquiry.subject, 'General Inquiry') || '".',
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', _inquiry_id,
    'deleted_subject', _inquiry.subject
  );
END;
$$;

-- 9. Harden admin_bulk_delete_budget_requests with deletion audit gating
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
$$;

-- 10. Harden renewal decision RPCs with approval audit gating
DROP FUNCTION IF EXISTS public.admin_approve_renewal(text, uuid, text, text);
CREATE OR REPLACE FUNCTION public.admin_approve_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_certificate_urn text,
  p_admin_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _now timestamptz := now();
  _renewal record;
  _submission record;
  _owner_id uuid;
  _valid_until timestamptz;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF p_certificate_urn IS NULL OR trim(p_certificate_urn) = '' THEN
    RAISE EXCEPTION 'Certificate URN is required for approval.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Renewal is not in a reviewable status: %', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  _valid_until := _now + interval '1 year';

  UPDATE public.organization_renewals
  SET
    status = 'approved',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = p_admin_remarks,
    certificate_urn = trim(p_certificate_urn),
    updated_at = _now
  WHERE id = p_renewal_id;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'approved',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = p_admin_remarks,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  UPDATE public.organization_profiles
  SET
    profile_status = 'verified',
    urn = trim(p_certificate_urn),
    valid_until = _valid_until,
    verified_at = _now,
    updated_at = _now
  WHERE id = _renewal.organization_id;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Approved',
      format('Your organization renewal for Cycle %s has been approved! URN: %s', _renewal.cycle_number, trim(p_certificate_urn)),
      'renewal_approved',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Insert approval activity log if enabled
  IF public.is_audit_logging_enabled('approval') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _renewal.organization_id,
      'renewal_approved',
      'renewal',
      p_renewal_id,
      format('Admin approved renewal Cycle %s with URN %s.', _renewal.cycle_number, trim(p_certificate_urn)),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'certificate_urn', trim(p_certificate_urn),
    'valid_until', _valid_until,
    'approved_at', _now
  );
END;
$$;

DROP FUNCTION IF EXISTS public.admin_request_renewal_revision(text, uuid, text);
CREATE OR REPLACE FUNCTION public.admin_request_renewal_revision(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _now timestamptz := now();
  _renewal record;
  _submission record;
  _owner_id uuid;
  _remarks text;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  _remarks := trim(coalesce(p_admin_remarks, ''));
  IF _remarks = '' THEN
    RAISE EXCEPTION 'Admin remarks are required when requesting revisions.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Renewal is not in a state that can request revisions: %', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.organization_renewals
  SET
    status = 'needs_revision',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = _remarks,
    updated_at = _now
  WHERE id = p_renewal_id;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'needs_revision',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = _remarks,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  UPDATE public.organization_profiles
  SET
    profile_status = 'needs_update',
    updated_at = _now
  WHERE id = _renewal.organization_id;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Revision Requested',
      format('Revisions requested for renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
      'document_revision',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Insert revision request activity log if enabled
  IF public.is_audit_logging_enabled('approval') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _renewal.organization_id,
      'renewal_needs_revision',
      'renewal',
      p_renewal_id,
      format('Admin requested revisions for renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'requested_at', _now,
    'admin_remarks', _remarks
  );
END;
$$;

DROP FUNCTION IF EXISTS public.admin_reject_renewal(text, uuid, text);
CREATE OR REPLACE FUNCTION public.admin_reject_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _now timestamptz := now();
  _renewal record;
  _submission record;
  _owner_id uuid;
  _remarks text;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  _remarks := trim(coalesce(p_admin_remarks, ''));
  IF _remarks = '' THEN
    RAISE EXCEPTION 'Admin remarks are required when rejecting a renewal.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'needs_revision') THEN
    RAISE EXCEPTION 'Renewal is not in a rejectable status: %', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.organization_renewals
  SET
    status = 'rejected',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = _remarks,
    updated_at = _now
  WHERE id = p_renewal_id;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'rejected',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = _remarks,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  UPDATE public.organization_profiles
  SET
    profile_status = 'suspended_inactive',
    updated_at = _now
  WHERE id = _renewal.organization_id;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Rejected',
      format('Your organization renewal for Cycle %s was rejected: %s', _renewal.cycle_number, _remarks),
      'renewal_rejected',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Insert rejection activity log if enabled
  IF public.is_audit_logging_enabled('approval') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _renewal.organization_id,
      'renewal_rejected',
      'renewal',
      p_renewal_id,
      format('Admin rejected renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'rejected_at', _now,
    'admin_remarks', _remarks
  );
END;
$$;

-- 11. Harden admin_unlock_submission_revision with update audit gating
CREATE OR REPLACE FUNCTION public.admin_unlock_submission_revision(
  _session_token text,
  _entity_type text,
  _entity_id uuid,
  _remarks text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _unlocked_at timestamptz := now();
  _org_id uuid;
  _existing_due_at timestamptz;
  _entity_found boolean := false;
BEGIN
  -- 1. Validate Admin Session
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 2. Switch on entity type and perform atomic unlock
  IF _entity_type = 'document_submission' THEN
    SELECT organization_id, revision_due_at INTO _org_id, _existing_due_at
    FROM public.document_submissions
    WHERE id = _entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Document submission was not found.';
    END IF;

    UPDATE public.document_submissions
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE id = _entity_id;

    UPDATE public.document_submission_files
    SET
      revision_locked = false,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE submission_id = _entity_id;

    _entity_found := true;

  ELSIF _entity_type = 'renewal' THEN
    SELECT organization_id, revision_due_at INTO _org_id, _existing_due_at
    FROM public.organization_renewals
    WHERE id = _entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Renewal was not found.';
    END IF;

    UPDATE public.organization_renewals
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE id = _entity_id;

    UPDATE public.document_submissions
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE renewal_id = _entity_id;

    UPDATE public.document_submission_files
    SET
      revision_locked = false,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE submission_id IN (SELECT id FROM public.document_submissions WHERE renewal_id = _entity_id);

    _entity_found := true;

  ELSIF _entity_type = 'budget_request' THEN
    SELECT organization_id, revision_due_at INTO _org_id, _existing_due_at
    FROM public.budget_requests
    WHERE id = _entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Budget request was not found.';
    END IF;

    UPDATE public.budget_requests
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE id = _entity_id;

    _entity_found := true;

  ELSIF _entity_type = 'liquidation_report' THEN
    SELECT organization_id, revision_due_at INTO _org_id, _existing_due_at
    FROM public.liquidation_reports
    WHERE id = _entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Liquidation report was not found.';
    END IF;

    UPDATE public.liquidation_reports
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE id = _entity_id;

    _entity_found := true;

  ELSIF _entity_type IN ('ypop_event_participation', 'ypop_event') THEN
    SELECT organization_id, revision_due_at INTO _org_id, _existing_due_at
    FROM public.ypop_event_participations
    WHERE id = _entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'YPOP event participation was not found.';
    END IF;

    UPDATE public.ypop_event_participations
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE id = _entity_id;

    _entity_found := true;

  ELSIF _entity_type IN ('ypop_org_activity', 'ypop_ppa') THEN
    SELECT organization_id, revision_due_at INTO _org_id, _existing_due_at
    FROM public.ypop_org_activities
    WHERE id = _entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'YPOP org activity was not found.';
    END IF;

    UPDATE public.ypop_org_activities
    SET
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    WHERE id = _entity_id;

    _entity_found := true;

  ELSE
    RAISE EXCEPTION 'Unsupported entity type "%" for revision unlock.', _entity_type;
  END IF;

  -- 3. Insert audit log record if enabled
  IF _org_id IS NOT NULL AND public.is_audit_logging_enabled('update') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _org_id,
      'revision_unlocked',
      _entity_type,
      _entity_id,
      coalesce(_remarks, format('Admin unlocked %s (original deadline: %s) for resubmission.', _entity_type, coalesce(_existing_due_at::text, 'None'))),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', _entity_type,
    'entity_id', _entity_id,
    'revision_locked', false,
    'revision_unlocked_at', _unlocked_at,
    'revision_due_at', _existing_due_at
  );
END;
$$;

-- 12. Harden YPOP Admin review RPCs with approval audit gating
CREATE OR REPLACE FUNCTION public.admin_update_ypop_org_activity(
  _session_token text,
  _activity_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _approved_at timestamptz default null,
  _revision_history jsonb default null
)
RETURNS setof public.ypop_org_activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.ypop_org_activities
  WHERE id = _activity_id;

  IF _org_id IS NOT NULL AND public.is_audit_logging_enabled('approval') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _org_id,
      'reviewed_ypop_org_activity',
      'ypop_org_activity',
      _activity_id,
      COALESCE(_admin_remarks, 'YPOP organization-led activity status updated.'),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_org_activities
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_org_activity_status
      ELSE ypop_org_activities.status
    END,
    admin_remarks = COALESCE(_admin_remarks, ypop_org_activities.admin_remarks),
    approved_at = CASE
      WHEN _status = 'approved' AND _approved_at IS NULL THEN now()
      ELSE COALESCE(_approved_at, ypop_org_activities.approved_at)
    END,
    revision_history = COALESCE(_revision_history, ypop_org_activities.revision_history),
    updated_at = now()
  WHERE ypop_org_activities.id = _activity_id
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_event_participation(
  _session_token text,
  _participation_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _proof_submitted_at timestamptz default null,
  _verified_at timestamptz default null,
  _revision_history jsonb default null
)
RETURNS setof public.ypop_event_participations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.ypop_event_participations
  WHERE id = _participation_id;

  IF _org_id IS NOT NULL AND public.is_audit_logging_enabled('approval') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _org_id,
      'reviewed_ypop_event_participation',
      'ypop_event_participation',
      _participation_id,
      COALESCE(_admin_remarks, 'YPOP event participation status updated.'),
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_event_participations
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_event_participation_status
      ELSE ypop_event_participations.status
    END,
    admin_remarks = COALESCE(_admin_remarks, ypop_event_participations.admin_remarks),
    proof_submitted_at = COALESCE(_proof_submitted_at, ypop_event_participations.proof_submitted_at),
    verified_at = CASE
      WHEN _status = 'verified' AND _verified_at IS NULL THEN now()
      ELSE COALESCE(_verified_at, ypop_event_participations.verified_at)
    END,
    revision_history = COALESCE(_revision_history, ypop_event_participations.revision_history),
    updated_at = now()
  WHERE ypop_event_participations.id = _participation_id
  RETURNING *;
END;
$$;

-- 13. Execution Permissions
GRANT EXECUTE ON FUNCTION public.is_audit_logging_enabled(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extract_audit_request_metadata() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_activity_log(text, uuid, text, text, uuid, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authenticate_admin_account(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_admin_session_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_role_permissions(text, smallint, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_admin_inquiry(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_budget_requests(text, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text, uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision(text, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal(text, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unlock_submission_revision(text, text, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_org_activity(text, uuid, text, text, timestamptz, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_event_participation(text, uuid, text, text, timestamptz, timestamptz, jsonb) TO anon, authenticated, service_role;

