-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_entry(_session_token text, _entry_id uuid, _status text DEFAULT NULL::text, _admin_remarks text DEFAULT NULL::text, _points_earned integer DEFAULT NULL::integer, _org_led_project_count integer DEFAULT NULL::integer, _city_led_attendance jsonb DEFAULT NULL::jsonb, _revision_history jsonb DEFAULT NULL::jsonb, _validated_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _projects_completed integer DEFAULT NULL::integer, _review_notes text DEFAULT NULL::text, _reviewed_by text DEFAULT NULL::text)
 RETURNS SETOF ypop_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _org_id uuid;
  _effective_remarks text;
  _effective_org_count integer;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.ypop_entries
  WHERE id = _entry_id;

  _effective_remarks := COALESCE(_admin_remarks, _review_notes);
  _effective_org_count := COALESCE(_org_led_project_count, _projects_completed);

  IF _org_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    ) VALUES (
      _admin_id,
      _org_id,
      'reviewed_ypop_entry',
      'ypop_entry',
      _entry_id,
      COALESCE(_effective_remarks, 'YPOP entry evaluation status updated.')
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_entries
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_entry_status
      ELSE ypop_entries.status
    END,
    admin_remarks = COALESCE(_effective_remarks, ypop_entries.admin_remarks),
    points_earned = COALESCE(_points_earned, ypop_entries.points_earned),
    org_led_project_count = COALESCE(_effective_org_count, ypop_entries.org_led_project_count),
    city_led_attendance = COALESCE(_city_led_attendance, ypop_entries.city_led_attendance),
    revision_history = COALESCE(_revision_history, ypop_entries.revision_history),
    validated_at = CASE
      WHEN _status IN ('qualified', 'not_qualified') AND _validated_at IS NULL THEN now()
      ELSE COALESCE(_validated_at, ypop_entries.validated_at)
    END,
    updated_at = now()
  WHERE ypop_entries.id = _entry_id
  RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_event_participation(_session_token text, _participation_id uuid, _status text DEFAULT NULL::text, _admin_remarks text DEFAULT NULL::text, _proof_submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _verified_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _revision_history jsonb DEFAULT NULL::jsonb)
 RETURNS SETOF ypop_event_participations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _org_id uuid;
  _current_status public.ypop_event_participation_status;
  _current_revision_requested_at timestamptz;
  _current_proof_submitted_at timestamptz;
  _effective_proof_submitted_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT
    organization_id,
    status,
    revision_requested_at,
    proof_submitted_at
  INTO
    _org_id,
    _current_status,
    _current_revision_requested_at,
    _current_proof_submitted_at
  FROM public.ypop_event_participations
  WHERE id = _participation_id;

  IF _participation_id IS NULL OR _current_status IS NULL THEN
    RAISE EXCEPTION 'YPOP event participation was not found.';
  END IF;

  -- Lifecycle Guard: Cannot verify/approve participation in needs_revision without a genuine replacement proof
  IF (_status = 'verified' OR _status = 'approved') AND _current_status = 'needs_revision' THEN
    _effective_proof_submitted_at := COALESCE(_proof_submitted_at, _current_proof_submitted_at);
    IF _current_revision_requested_at IS NOT NULL AND NOT (
      (_effective_proof_submitted_at IS NOT NULL AND _effective_proof_submitted_at > _current_revision_requested_at)
      OR EXISTS (
        SELECT 1
        FROM public.ypop_event_files
        WHERE participation_id = _participation_id
          AND uploaded_at > _current_revision_requested_at
      )
    ) THEN
      RAISE EXCEPTION 'Cannot verify event participation that is awaiting revision without a new proof submission.';
    END IF;
  END IF;

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
    revision_requested_at = CASE
      WHEN _status = 'needs_revision' THEN _reviewed_at
      ELSE ypop_event_participations.revision_requested_at
    END,
    revision_due_at = CASE
      WHEN _status = 'needs_revision' THEN _revision_due
      ELSE ypop_event_participations.revision_due_at
    END,
    revision_locked = CASE
      WHEN _status = 'needs_revision' THEN false
      ELSE ypop_event_participations.revision_locked
    END,
    revision_history = COALESCE(_revision_history, ypop_event_participations.revision_history),
    updated_at = now()
  WHERE ypop_event_participations.id = _participation_id
  RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_org_activity(_session_token text, _activity_id uuid, _status text DEFAULT NULL::text, _admin_remarks text DEFAULT NULL::text, _approved_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _revision_history jsonb DEFAULT NULL::jsonb)
 RETURNS SETOF ypop_org_activities
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _org_id uuid;
  _current_status public.ypop_org_activity_status;
  _current_revision_requested_at timestamptz;
  _current_submitted_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT
    organization_id,
    status,
    revision_requested_at,
    submitted_at
  INTO
    _org_id,
    _current_status,
    _current_revision_requested_at,
    _current_submitted_at
  FROM public.ypop_org_activities
  WHERE id = _activity_id;

  IF _activity_id IS NULL OR _current_status IS NULL THEN
    RAISE EXCEPTION 'YPOP organization activity was not found.';
  END IF;

  -- Lifecycle Guard: Cannot approve activity in needs_revision without a genuine replacement submission
  IF (_status = 'approved' OR _status = 'verified') AND _current_status = 'needs_revision' THEN
    IF _current_revision_requested_at IS NOT NULL AND NOT (
      (_current_submitted_at IS NOT NULL AND _current_submitted_at > _current_revision_requested_at)
      OR EXISTS (
        SELECT 1
        FROM public.ypop_org_activity_files
        WHERE activity_id = _activity_id
          AND uploaded_at > _current_revision_requested_at
      )
    ) THEN
      RAISE EXCEPTION 'Cannot approve organization activity that is awaiting revision without a new submission or replacement file.';
    END IF;
  END IF;

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
    revision_requested_at = CASE
      WHEN _status = 'needs_revision' THEN _reviewed_at
      ELSE ypop_org_activities.revision_requested_at
    END,
    revision_due_at = CASE
      WHEN _status = 'needs_revision' THEN _revision_due
      ELSE ypop_org_activities.revision_due_at
    END,
    revision_locked = CASE
      WHEN _status = 'needs_revision' THEN false
      ELSE ypop_org_activities.revision_locked
    END,
    revision_history = COALESCE(_revision_history, ypop_org_activities.revision_history),
    updated_at = now()
  WHERE ypop_org_activities.id = _activity_id
  RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_period(_session_token text, _period_id uuid, _semester_label text, _validation_deadline timestamp with time zone, _status ypop_period_status, _org_led_tiers jsonb)
 RETURNS SETOF ypop_periods
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat limit 1;
  if _admin_id is null then raise exception 'Admin account is not authorized.'; end if;

  update public.ypop_periods set
    semester_label      = coalesce(_semester_label, semester_label),
    validation_deadline = coalesce(_validation_deadline, validation_deadline),
    status              = coalesce(_status, status),
    org_led_tiers       = coalesce(_org_led_tiers, org_led_tiers),
    updated_at          = now()
  where id = _period_id;

  return query select * from public.ypop_periods where id = _period_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.authenticate_admin_account(_username text, _password text)
 RETURNS TABLE(admin_id uuid, username citext, email citext, display_name text, session_token text, expires_at timestamp with time zone, is_email_verified boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.authorize_admin_template_category_registry(_session_token text, _require_manage_permission boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
BEGIN
  SELECT validated.admin_id, role.code, COALESCE(role.permission_codes, ARRAY[]::text[])
    INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) AS validated
  JOIN public.admin_accounts AS account
    ON account.id = validated.admin_id
   AND account.is_active = true
  JOIN public.roles AS role ON role.id = account.role_id
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  IF _role_code <> 'super_admin' AND (
    (_require_manage_permission AND NOT ('forms_templates_management' = ANY(_permission_codes)))
    OR (NOT _require_manage_permission AND NOT (
      'forms_templates_management' = ANY(_permission_codes)
      OR 'registrations_management' = ANY(_permission_codes)
      OR 'renewals_manage' = ANY(_permission_codes)
    ))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to manage template categories.' USING ERRCODE = '42501';
  END IF;

  RETURN _admin_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_organization_renewal_eligibility(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  _today date := current_date;
  _org record;
  _acc record;
  _end_date date;
  _days_diff integer;
  _window_status text;
  _can_draft boolean;
  _can_submit boolean;
  _days_until_open integer := NULL;
  _days_past_expiry integer := NULL;
  _reason text;
BEGIN
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE id = _org_id;

  IF _org.id IS NULL THEN
    RETURN jsonb_build_object(
      'canDraft', false,
      'canSubmit', false,
      'windowStatus', 'too_early',
      'reason', 'Organization profile not found.',
      'daysRemaining', NULL,
      'daysUntilOpen', NULL,
      'daysPastExpiry', NULL,
      'expiresAt', NULL
    );
  END IF;

  -- Resolve authoritative active accreditation term
  SELECT * INTO _acc
  FROM public.organization_accreditations
  WHERE organization_id = _org_id
    AND status = 'active'
  ORDER BY term_number DESC
  LIMIT 1;

  IF _acc.id IS NULL THEN
    IF _org.accreditation_expires_at IS NOT NULL THEN
      _end_date := _org.accreditation_expires_at::date;
    ELSE
      RETURN jsonb_build_object(
        'canDraft', false,
        'canSubmit', false,
        'windowStatus', 'too_early',
        'reason', 'No authoritative accreditation expiration date found.',
        'daysRemaining', NULL,
        'daysUntilOpen', NULL,
        'daysPastExpiry', NULL,
        'expiresAt', NULL
      );
    END IF;
  ELSE
    _end_date := _acc.end_date;
  END IF;

  _days_diff := _end_date - _today;

  -- Authoritative Window Rules:
  -- 1. Window opens: 90 calendar days before expiry
  -- 2. Active Window: [end_date - 90, end_date]
  -- 3. Late Renewal (Grace Period): (end_date, end_date + 180]
  -- 4. Cutoff exceeded (Lapsed): > 180 days past expiry
  IF _days_diff > 90 THEN
    _window_status := 'too_early';
    _can_draft := false;
    _can_submit := false;
    _days_until_open := _days_diff - 90;
    _reason := format('Renewal window opens 90 days before expiry (in %s days).', _days_until_open);
  ELSIF _days_diff >= 0 THEN
    _window_status := 'open';
    _can_draft := true;
    _can_submit := true;
    _reason := 'Renewal window is open.';
  ELSIF ABS(_days_diff) <= 180 THEN
    _window_status := 'expired';
    _can_draft := true;
    _can_submit := true;
    _days_past_expiry := ABS(_days_diff);
    _reason := format('Late renewal allowed within 180 days of expiry (%s days expired).', _days_past_expiry);
  ELSE
    _window_status := 'lapsed';
    _can_draft := false;
    _can_submit := false;
    _days_past_expiry := ABS(_days_diff);
    _reason := 'Late renewal window expired (180 days past expiry). Full re-registration is required.';
  END IF;

  RETURN jsonb_build_object(
    'canDraft', _can_draft,
    'canSubmit', _can_submit,
    'windowStatus', _window_status,
    'daysRemaining', GREATEST(0, _days_diff),
    'daysUntilOpen', _days_until_open,
    'daysPastExpiry', _days_past_expiry,
    'expiresAt', _end_date,
    'reason', _reason
  );
END;
$function$;

RESET check_function_bodies;

