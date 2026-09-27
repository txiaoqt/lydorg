-- Migration: 20260927210000_add_inquiry_reply_email_setting.sql
-- Description: Adds the dedicated 'email.inquiry_reply_email' system setting for official Inquiry replies (starts UNCONFIGURED/EMPTY),
--              ensures proper validation in admin_save_system_settings, and whitelists it in get_public_system_settings.

-- 1. Insert 'email.inquiry_reply_email' initial row (unconfigured empty string by default)
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
  'email.inquiry_reply_email',
  'email',
  '""'::jsonb,
  'string',
  'Email address used as the From address when Y-TRACE sends replies to organization inquiries.',
  false,
  true
)
ON CONFLICT (setting_key) DO UPDATE
SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  data_type = EXCLUDED.data_type,
  is_sensitive = EXCLUDED.is_sensitive,
  is_editable = EXCLUDED.is_editable;

-- 2. Clear any accidental legacy default to ensure unconfigured initial state during testing
UPDATE public.admin_system_settings
SET value_json = '""'::jsonb
WHERE setting_key = 'email.inquiry_reply_email'
  AND (value_json = '"lydo@pasigcity.gov.ph"'::jsonb OR value_json IS NULL);

-- 3. Update get_public_system_settings() to include email.inquiry_reply_email
CREATE OR REPLACE FUNCTION public.get_public_system_settings()
RETURNS TABLE (
  setting_key text,
  category text,
  value_json jsonb,
  data_type text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.setting_key,
    s.category,
    s.value_json,
    s.data_type,
    s.updated_at
  FROM public.admin_system_settings s
  WHERE s.is_sensitive = false
    AND (
      s.category = 'general'
      OR s.setting_key IN (
        'email.reply_to_email',
        'email.inquiry_reply_email',
        'email.sender_name',
        'budget.currency_symbol',
        'budget.currency'
      )
    )
  ORDER BY s.setting_key ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO anon, authenticated, service_role;

-- 4. Update admin_save_system_settings to validate email format
CREATE OR REPLACE FUNCTION public.admin_save_system_settings(
  p_settings jsonb,
  p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE (
  setting_key text,
  category text,
  value_json jsonb,
  data_type text,
  description text,
  is_sensitive boolean,
  is_editable boolean,
  updated_by uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _key text;
  _val jsonb;
  _target_record public.admin_system_settings%rowtype;
  _log_enabled boolean := true;
  _updated_keys text[] := ARRAY[]::text[];
  _val_text text;
BEGIN
  -- Resolve calling administrator
  _admin_id := COALESCE(p_admin_id, auth.uid());

  -- Verify caller has manage_settings permission (or is super_admin)
  IF _admin_id IS NULL OR NOT (
    public.admin_has_permission(_admin_id, 'manage_settings')
    OR public.admin_has_role(_admin_id, 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied. You do not have permission to modify system settings.';
  END IF;

  -- Iterate over settings key-value pairs in the provided JSON object
  FOR _key, _val IN SELECT * FROM jsonb_each(p_settings)
  LOOP
    -- Look up the target setting definition
    SELECT *
    INTO _target_record
    FROM public.admin_system_settings s
    WHERE s.setting_key = _key;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown system setting key: %', _key;
    END IF;

    IF NOT _target_record.is_editable THEN
      RAISE EXCEPTION 'Setting % is marked as read-only and cannot be modified.', _key;
    END IF;

    -- Validate value against data_type constraints
    CASE _target_record.data_type
      WHEN 'boolean' THEN
        IF jsonb_typeof(_val) != 'boolean' THEN
          RAISE EXCEPTION 'Setting % must be a boolean value.', _key;
        END IF;
      WHEN 'number' THEN
        IF jsonb_typeof(_val) != 'number' THEN
          RAISE EXCEPTION 'Setting % must be a numeric value.', _key;
        END IF;
        IF _key = 'security.admin_session_timeout_minutes' THEN
          IF (_val::numeric < 5 OR _val::numeric > 480) THEN
            RAISE EXCEPTION 'Session timeout must be between 5 and 480 minutes.';
          END IF;
        ELSIF _key IN ('workflow.review_reminder_days', 'workflow.escalate_after_days', 'programs.ypop_default_reminder_days') THEN
          IF _val::numeric < 0 THEN
            RAISE EXCEPTION 'Days value for % cannot be negative.', _key;
          END IF;
        END IF;
      WHEN 'string' THEN
        IF jsonb_typeof(_val) != 'string' THEN
          RAISE EXCEPTION 'Setting % must be a string value.', _key;
        END IF;
        _val_text := _val #>> '{}';
        IF _key IN ('general.support_email', 'email.reply_to_email') THEN
          IF NOT (_val_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
            RAISE EXCEPTION 'Invalid email format for %: %', _key, _val_text;
          END IF;
        ELSIF _key = 'email.inquiry_reply_email' THEN
          -- Allow unconfigured empty string, but if non-empty must be a valid email
          IF _val_text != '' AND NOT (_val_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
            RAISE EXCEPTION 'Invalid email format for %: %', _key, _val_text;
          END IF;
        ELSIF _key IN ('general.user_portal_url', 'general.admin_portal_url') THEN
          IF NOT (_val_text ~* '^https?://.+$') THEN
            RAISE EXCEPTION 'Invalid URL format for %: must start with http:// or https://', _key;
          END IF;
        END IF;
      ELSE
        NULL;
    END CASE;

    UPDATE public.admin_system_settings AS s
    SET
      value_json = _val,
      updated_by = _admin_id,
      updated_at = NOW()
    WHERE s.setting_key = _key;

    _updated_keys := array_append(_updated_keys, _key);
  END LOOP;

  -- Check if config logging is enabled
  SELECT COALESCE((s.value_json)::boolean, true)
  INTO _log_enabled
  FROM public.admin_system_settings s
  WHERE s.setting_key = 'audit.log_config_changes';

  IF _log_enabled AND array_length(_updated_keys, 1) > 0 THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    )
    VALUES (
      _admin_id,
      NULL,
      'update_system_settings',
      'system_settings',
      _admin_id::text,
      'Updated system settings: ' || array_to_string(_updated_keys, ', ')
    );
  END IF;

  -- Return the full list of updated setting rows
  RETURN QUERY
  SELECT
    s.setting_key,
    s.category,
    s.value_json,
    s.data_type,
    s.description,
    s.is_sensitive,
    s.is_editable,
    s.updated_by,
    s.updated_at
  FROM public.admin_system_settings s
  ORDER BY s.category, s.setting_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(jsonb, uuid) TO authenticated, service_role;
