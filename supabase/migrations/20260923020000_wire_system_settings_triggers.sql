-- Migration: 20260923020000_wire_system_settings_triggers.sql
-- Purpose: Wire admin system settings into PostgreSQL trigger functions and RPC defaults.

-- 1. Helper functions to safely read typed system settings from public.admin_system_settings
CREATE OR REPLACE FUNCTION public.get_system_setting_bool(
  _key text,
  _default boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _val jsonb;
BEGIN
  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _key;

  IF _val IS NULL THEN
    RETURN _default;
  END IF;

  IF jsonb_typeof(_val) = 'boolean' THEN
    RETURN (_val)::boolean;
  END IF;

  RETURN _default;
EXCEPTION
  WHEN OTHERS THEN
    RETURN _default;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_system_setting_text(
  _key text,
  _default text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _val jsonb;
BEGIN
  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _key;

  IF _val IS NULL THEN
    RETURN _default;
  END IF;

  IF jsonb_typeof(_val) = 'string' THEN
    RETURN TRIM(BOTH '"' FROM _val::text);
  END IF;

  RETURN _val::text;
EXCEPTION
  WHEN OTHERS THEN
    RETURN _default;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_system_setting_int(
  _key text,
  _default integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _val jsonb;
BEGIN
  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _key;

  IF _val IS NULL THEN
    RETURN _default;
  END IF;

  IF jsonb_typeof(_val) = 'number' THEN
    RETURN (_val)::integer;
  END IF;

  RETURN _default;
EXCEPTION
  WHEN OTHERS THEN
    RETURN _default;
END;
$$;

-- 2. Update notify_inquiry_change() trigger to respect notifications.new_inquiry.in_app
CREATE OR REPLACE FUNCTION public.notify_inquiry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
  clean_subject text;
  allow_in_app boolean;
BEGIN
  -- 1. Guard against non-status updates
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  -- 2. Check setting: notifications.new_inquiry.in_app (or workflow status update)
  allow_in_app := public.get_system_setting_bool('notifications.new_inquiry.in_app', true);
  IF NOT allow_in_app THEN
    RETURN new;
  END IF;

  -- 3. Derive authoritative recipient user ID (profile owner or submitter)
  SELECT op.user_id INTO target_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF target_user_id IS NULL THEN
    target_user_id := new.submitted_by;
  END IF;

  IF target_user_id IS NULL THEN
    RETURN new;
  END IF;

  clean_subject := COALESCE(NULLIF(TRIM(new.subject), ''), 'General Inquiry');

  -- 4. Match status transitions
  IF new.status IN ('reviewed', 'responded') THEN
    notif_type := 'inquiry_responded';
    notif_title := 'Inquiry responded';
    notif_message := 'An administrator has responded to your inquiry: ' || clean_subject || '.';
  ELSIF new.status IN ('closed', 'resolved') THEN
    notif_type := 'inquiry_closed';
    notif_title := 'Inquiry closed';
    notif_message := 'Your inquiry ''' || clean_subject || ''' has been marked as closed by the LYDO.';
  ELSE
    -- Other status transitions do not generate user notifications
    RETURN new;
  END IF;

  -- 5. Insert authoritative notification
  INSERT INTO public.notifications (
    user_id,
    organization_id,
    title,
    message,
    type,
    related_type,
    related_id
  ) VALUES (
    target_user_id,
    new.organization_id,
    notif_title,
    notif_message,
    notif_type,
    'inquiry',
    new.id
  );

  RETURN new;
END;
$$;

-- 3. Update set_budget_request_fiscal_year() to respect budget.default_fiscal_year setting
CREATE OR REPLACE FUNCTION public.set_budget_request_fiscal_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _default_fy integer;
BEGIN
  IF NEW.fiscal_year IS NULL THEN
    _default_fy := public.get_system_setting_int('budget.default_fiscal_year', EXTRACT(YEAR FROM CURRENT_DATE)::integer);
    NEW.fiscal_year := COALESCE(
      EXTRACT(YEAR FROM NEW.release_date)::integer,
      EXTRACT(YEAR FROM NEW.activity_date)::integer,
      EXTRACT(YEAR FROM NEW.created_at)::integer,
      _default_fy
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Update notify_organization_profile_status_change() to respect registration & workflow notification toggles
CREATE OR REPLACE FUNCTION public.notify_organization_profile_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notify_approved boolean;
  _notify_revision boolean;
BEGIN
  IF old.profile_status IS NOT DISTINCT FROM new.profile_status THEN
    RETURN new;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true) 
                      AND public.get_system_setting_bool('notifications.new_registration.in_app', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);

  IF new.profile_status = 'verified' AND _notify_approved THEN
    -- Prevent duplicate verification notification
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE organization_id = new.id
        AND type = 'completed'
        AND related_type = 'organization_profile'
    ) THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (
        new.user_id,
        new.id,
        'Registration verified',
        CASE
          WHEN new.urn IS NOT NULL AND TRIM(new.urn) <> ''
            THEN format('The admin verified your organization registration. Official URN: %s.', new.urn)
          ELSE 'The admin verified your organization registration.'
        END,
        'completed',
        'organization_profile',
        new.id
      );
    END IF;
  ELSIF new.profile_status = 'needs_update' AND _notify_revision THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (
      new.user_id,
      new.id,
      'Registration needs update',
      'The admin reviewed your organization profile and requested updates before verification.',
      'document_revision',
      'organization_profile',
      new.id
    );
  END IF;

  RETURN new;
END;
$$;

-- 5. Update delete_admin_inquiry() to respect audit.log_deletions setting
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

  -- 4. Record the deletion in public.activity_logs if audit.log_deletions is true
  IF public.get_system_setting_bool('audit.log_deletions', true) THEN
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
      _inquiry.organization_id,
      'delete_inquiry',
      'inquiry',
      _inquiry.id,
      'Deleted inquiry "' || COALESCE(_inquiry.subject, 'General Inquiry') || '".'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', _inquiry_id,
    'deleted_subject', _inquiry.subject
  );
END;
$$;
