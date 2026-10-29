-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_track_document_submission_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  old_resource text;
  new_resource text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_resource := CASE WHEN OLD.submission_scope::text = 'renewal' OR OLD.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
    PERFORM public.admin_bump_portal_change_version(old_resource);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_resource := CASE WHEN NEW.submission_scope::text = 'renewal' OR NEW.renewal_id IS NOT NULL THEN 'renewals' ELSE 'registration' END;
    IF new_resource IS DISTINCT FROM old_resource THEN
      PERFORM public.admin_bump_portal_change_version(new_resource);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_liquidation_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN PERFORM public.admin_bump_portal_change_version('liquidations'); IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_organization_profile_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.admin_bump_portal_change_version('registration');
  ELSIF OLD.profile_status IS DISTINCT FROM NEW.profile_status OR OLD.urn IS DISTINCT FROM NEW.urn THEN
    PERFORM public.admin_bump_portal_change_version('registration');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_renewal_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN PERFORM public.admin_bump_portal_change_version('renewals'); IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_child_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.admin_bump_portal_change_version(TG_ARGV[0]);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_city_activity_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.admin_bump_portal_change_version('ypop_city_led');
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_entry_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP IN ('INSERT', 'DELETE') THEN
    PERFORM public.admin_bump_portal_change_version('ypop_city_led');
    PERFORM public.admin_bump_portal_change_version('ypop_org_led');
  ELSE
    IF OLD.status IS DISTINCT FROM NEW.status
      OR OLD.points_earned IS DISTINCT FROM NEW.points_earned
      OR OLD.points_required IS DISTINCT FROM NEW.points_required
      OR OLD.total_points IS DISTINCT FROM NEW.total_points
      OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at
      OR OLD.validated_at IS DISTINCT FROM NEW.validated_at THEN
      PERFORM public.admin_bump_portal_change_version('ypop_city_led');
      PERFORM public.admin_bump_portal_change_version('ypop_org_led');
    ELSE
      IF OLD.city_led_attendance IS DISTINCT FROM NEW.city_led_attendance THEN
        PERFORM public.admin_bump_portal_change_version('ypop_city_led');
      END IF;
      IF OLD.org_led_project_count IS DISTINCT FROM NEW.org_led_project_count THEN
        PERFORM public.admin_bump_portal_change_version('ypop_org_led');
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_track_ypop_period_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.admin_bump_portal_change_version('ypop_city_led');
  PERFORM public.admin_bump_portal_change_version('ypop_org_led');
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_unlock_submission_revision(_session_token text, _entity_type text, _entity_id uuid, _remarks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_budget_request_file_status(_session_token text, _file_id uuid, _admin_status text, _admin_remarks text DEFAULT NULL::text)
 RETURNS SETOF budget_request_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_inquiry(_session_token text, _inquiry_id uuid, _status inquiry_status, _admin_remarks text DEFAULT NULL::text)
 RETURNS SETOF inquiries
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

  update public.inquiries set
    status = _status,
    admin_remarks = coalesce(_admin_remarks, admin_remarks),
    reviewed_at = case
      when _status = 'pending_review' then null
      else coalesce(reviewed_at, now())
    end,
    updated_at = now()
  where id = _inquiry_id;

  if not found then raise exception 'Inquiry not found.'; end if;

  return query select * from public.inquiries where id = _inquiry_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_liquidation_report_file_status(_session_token text, _file_id uuid, _admin_status text, _admin_remarks text DEFAULT NULL::text)
 RETURNS SETOF liquidation_report_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  perform 1 from public.liquidation_reports lr join public.liquidation_report_files f on f.liquidation_report_id=lr.id where f.id=_file_id for update of lr;
  if exists (select 1 from public.liquidation_reports lr join public.liquidation_report_files f on f.liquidation_report_id=lr.id where f.id=_file_id and lr.status::text in ('draft','not_started','pending_activity_completion')) then
    raise exception 'This liquidation report has not been submitted for review.';
  end if;
  return query
  update public.liquidation_report_files
  set
    admin_status = coalesce(_admin_status, liquidation_report_files.admin_status),
    admin_remarks = coalesce(_admin_remarks, liquidation_report_files.admin_remarks)
  where liquidation_report_files.id = _file_id
  returning *;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_move_application(_session_token text, _application_id uuid, _status move_application_status, _admin_remarks text, _approved_assistance_percent numeric, _reviewed_at timestamp with time zone, _completed_at timestamp with time zone, _revision_history jsonb)
 RETURNS SETOF move_applications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  update public.move_applications
  set
    status = coalesce(_status, status),
    admin_remarks = coalesce(_admin_remarks, admin_remarks),
    approved_assistance_percent = coalesce(_approved_assistance_percent, approved_assistance_percent),
    reviewed_at = coalesce(_reviewed_at, reviewed_at),
    completed_at = coalesce(_completed_at, completed_at),
    revision_history = coalesce(_revision_history, revision_history),
    updated_at = timezone('utc', now())
  where id = _application_id;

  return query
  select *
  from public.move_applications
  where id = _application_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_org_yorp_fields(_session_token text, _org_id uuid, _registered_year smallint, _renewed_year smallint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  _admin_id uuid;
begin
  _admin_id := public.validate_admin_session_token(_session_token);
  if _admin_id is null then
    raise exception 'Unauthorized';
  end if;
  update public.organization_profiles
  set yorp_registered_year = _registered_year,
      yorp_renewed_year    = _renewed_year,
      updated_at           = now()
  where id = _org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_city_activity(_session_token text, _activity_id uuid, _name text, _date text, _venue text, _points integer)
 RETURNS SETOF ypop_city_activities
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

  update public.ypop_city_activities set
    name   = coalesce(_name, name),
    date   = coalesce(_date, date),
    venue  = coalesce(_venue, venue),
    points = coalesce(_points, points)
  where id = _activity_id;

  return query select * from public.ypop_city_activities where id = _activity_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_ypop_city_activity(_session_token text, _activity_id uuid, _name text DEFAULT NULL::text, _start_date text DEFAULT NULL::text, _end_date text DEFAULT NULL::text, _venue text DEFAULT NULL::text, _points integer DEFAULT NULL::integer)
 RETURNS SETOF ypop_city_activities
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  update public.ypop_city_activities
  set
    name = coalesce(_name, ypop_city_activities.name),
    date = coalesce(_start_date, ypop_city_activities.date),
    start_date = coalesce(_start_date, ypop_city_activities.start_date),
    end_date = coalesce(_end_date, ypop_city_activities.end_date),
    venue = coalesce(_venue, ypop_city_activities.venue),
    points = coalesce(_points, ypop_city_activities.points)
  where ypop_city_activities.id = _activity_id
  returning *;
end;
$function$;

RESET check_function_bodies;

