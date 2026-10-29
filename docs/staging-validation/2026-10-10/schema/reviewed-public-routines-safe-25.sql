-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.guard_renewal_test_registration_packet_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _submission_id uuid;
  _is_seeded_registration boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'document_submission_files'
     AND TG_OP = 'INSERT'
     AND current_setting('app.seed_renewal_test_registration_documents', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'document_submissions' THEN
    _submission_id := OLD.id;
    _is_seeded_registration :=
      OLD.is_seeded_sample_data IS TRUE
      AND OLD.seed_batch = 'RENEWAL-TEST-REGISTRATION'
      AND OLD.submission_scope = 'registration'
      AND OLD.renewal_id IS NULL;
  ELSE
    IF TG_OP = 'INSERT' THEN
      _submission_id := NEW.submission_id;
    ELSE
      _submission_id := OLD.submission_id;
    END IF;
    SELECT EXISTS (
      SELECT 1
      FROM public.document_submissions submission
      WHERE (submission.id = _submission_id
         OR (TG_OP = 'UPDATE' AND submission.id = NEW.submission_id))
        AND submission.is_seeded_sample_data IS TRUE
        AND submission.seed_batch = 'RENEWAL-TEST-REGISTRATION'
        AND submission.submission_scope = 'registration'
        AND submission.renewal_id IS NULL
    ) INTO _is_seeded_registration;
  END IF;

  IF _is_seeded_registration THEN
    RAISE EXCEPTION 'The Renewal Test Organization registration packet is an immutable Cycle 1 record.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_retained_organization_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
begin
 if ytrace_identity.has_retained_history(old.id) then
   raise exception 'Official organization history is retained. Request an authorized archival/retention review before permanent deletion.';
 end if;
 return old;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_submitted_registration_document_edits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _submission_status text;
  _registration_submission boolean;
begin
  -- Admin and correction RPCs run with their validated definer privileges.
  if current_user not in ('authenticated', 'anon')
     or public.current_user_is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select ds.status,
         ds.submission_scope = 'registration' and ds.renewal_id is null
    into _submission_status, _registration_submission
  from public.document_submissions ds
  where ds.id = old.submission_id
  for update;

  if old.admin_status is distinct from 'draft'
     or _submission_status is null
     or not (
       _submission_status in ('draft', 'needs_revision')
       or (
         _registration_submission is true
         and _submission_status in ('under_admin_review', 'submitted', 'ready_for_review')
       )
     ) then
    raise exception 'Submitted documents are locked. Only draft documents can be edited or removed; requested revisions must use the replacement flow.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  default_role_id smallint;
begin
  insert into public.user_profiles (user_id, email, full_name, display_name, contact_number)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@local.invalid'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(trim(new.raw_user_meta_data ->> 'contact_number'), '')
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        display_name = excluded.display_name,
        contact_number = coalesce(excluded.contact_number, user_profiles.contact_number),
        updated_at = now();

  select id into default_role_id from public.roles where code = 'youth' limit 1;
  if default_role_id is not null then
    insert into public.user_roles (user_id, role_id) values (new.id, default_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_organization_profile_urn_auto_gen()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Unverified organizations must never hold an official URN
  if new.registration_type = 'new_organization' or new.is_existing_organization = false then
    if new.profile_status is distinct from 'verified'::public.profile_status then
      new.urn := null;
      new.urn_normalized := null;
      new.organization_identifier_number := '';
      return new;
    end if;
  end if;

  if new.is_existing_organization = true and (new.organization_identifier_number is null or trim(new.organization_identifier_number) = '') then
    if new.urn is not null and trim(new.urn) <> '' then
      new.organization_identifier_number := trim(new.urn);
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.hard_delete_admin_template_document(_session_token text, _template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Ensure any referencing submitted files are safely disassociated (document_type_id set to NULL)
  -- while preserving original file names, file URLs, review statuses, and remarks
  UPDATE public.document_submission_files
  SET document_type_id = NULL
  WHERE document_submission_files.document_type_id = _template_id;

  -- Permanently delete the required document type record
  DELETE FROM public.required_document_types
  WHERE required_document_types.id = _template_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_audit_logging_enabled(_category text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_development_or_test_environment()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _env text;
BEGIN
  SELECT coalesce(value_json->>'environment', value_json::text)
  INTO _env
  FROM public.admin_system_settings
  WHERE setting_key = 'general.environment'
  LIMIT 1;

  -- Strict check: reject null, unknown, unset, or production environments
  IF _env IS NULL THEN
    RETURN false;
  END IF;

  _env := lower(trim(_env, '" '));
  RETURN _env IN ('development', 'dev', 'test', 'testing', 'staging', 'local');
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_signup_email_registered(_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_normalized text;
BEGIN
  v_normalized := lower(trim(_email));
  IF v_normalized IS NULL OR v_normalized = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = v_normalized
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_urn_registered(_urn text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_normalized text;
  v_exists boolean;
BEGIN
  v_normalized := upper(trim(_urn));
  IF v_normalized IS NULL OR v_normalized = '' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_profiles
    WHERE upper(trim(organization_identifier_number)) = v_normalized
       OR (
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'organization_profiles'
             AND column_name = 'urn'
         )
         AND upper(trim(coalesce(urn, ''))) = v_normalized
       )
  ) INTO v_exists;

  RETURN v_exists;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_ypop_city_activity(_activity_id uuid)
 RETURNS SETOF ypop_event_participations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _user_id uuid := auth.uid();
  _organization public.organization_profiles%rowtype;
  _activity public.ypop_city_activities%rowtype;
  _period public.ypop_periods%rowtype;
  _entry public.ypop_entries%rowtype;
  _event_end timestamptz;
  _new_id uuid;
begin
  if _user_id is null then
    raise exception 'Please sign in with your organization account first.';
  end if;

  select * into _organization
  from public.organization_profiles
  where user_id = _user_id
  limit 1;
  if _organization.id is null then raise exception 'Organization profile not found.'; end if;
  if _organization.profile_status <> 'verified' then
    raise exception 'Your organization profile must be verified before joining a YPOP event.';
  end if;

  select * into _activity from public.ypop_city_activities where id = _activity_id limit 1;
  if _activity.id is null then raise exception 'YPOP event not found.'; end if;
  select * into _period from public.ypop_periods where semester_key = _activity.semester_key limit 1;
  if _period.id is null or _period.status <> 'open' or
     (_period.validation_deadline is not null and now() > _period.validation_deadline) then
    raise exception 'Joining is closed for this YPOP period.';
  end if;

  if nullif(trim(_activity.date), '') is not null then
    begin
      if trim(_activity.date) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        _event_end := ((trim(_activity.date)::date + 1)::timestamp at time zone 'Asia/Manila') - interval '1 millisecond';
      elsif trim(_activity.date) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]{1,3})?)?$' then
        _event_end := trim(_activity.date)::timestamp at time zone 'Asia/Manila';
      else
        _event_end := trim(_activity.date)::timestamptz;
      end if;
    exception when others then
      raise exception 'The YPOP event has an invalid event date.';
    end;
    if now() >= _event_end then
      raise exception 'This YPOP event has ended and can no longer be joined.';
    end if;
  end if;

  if exists (
    select 1 from public.ypop_event_participations
    where organization_id = _organization.id and activity_id = _activity.id
  ) then
    raise exception 'Your organization has already joined this YPOP event.';
  end if;

  select * into _entry
  from public.ypop_entries
  where organization_id = _organization.id and semester = _period.semester_key
  order by created_at desc
  limit 1;
  if _entry.id is not null and _entry.status not in ('draft', 'needs_revision') then
    raise exception 'This YPOP submission is locked and cannot join additional events.';
  end if;

  if _entry.id is null then
    insert into public.ypop_entries (
      organization_id, submitted_by, semester, semester_label, points_earned,
      points_required, total_points, status, admin_remarks, submission_note,
      validation_deadline, revision_history, org_led_project_count, city_led_attendance
    ) values (
      _organization.id, _user_id, _period.semester_key, _period.semester_label, 0,
      70, 100, 'draft', '', '', _period.validation_deadline, '[]'::jsonb, 0, '[]'::jsonb
    );
  end if;

  insert into public.ypop_event_participations (
    organization_id, submitted_by, activity_id, activity_name, activity_date,
    venue, status, admin_remarks, joined_at, revision_history
  ) values (
    _organization.id, _user_id, _activity.id, _activity.name, _activity.date,
    _activity.venue, 'pending_verification', '', now(),
    jsonb_build_array(jsonb_build_object(
      'action', 'pending_verification',
      'adminRemarks', 'Organization joined the YPOP event.',
      'changedAt', now()
    ))
  )
  returning id into _new_id;

  insert into public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) values (
    _user_id, _organization.id, 'Joined YPOP event',
    'ypop_event_participation', _new_id,
    format('Joined the city-led YPOP event "%s".', _activity.name)
  );

  return query select * from public.ypop_event_participations where id = _new_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_admin_accounts_for_admin_portal(_session_token text)
 RETURNS TABLE(id uuid, display_name text, email text, role_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  select admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, roles.label
  from public.admin_accounts
  left join public.roles on roles.id = admin_accounts.role_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_administrators_for_admin_portal(_session_token text)
 RETURNS TABLE(id uuid, display_name text, email text, username text, role_code text, role_label text, unit_code text, unit_label text, is_active boolean, is_password_set boolean, last_active_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to view administrator accounts.';
  end if;

  return query
  select
    aa.id,
    aa.display_name,
    aa.email::text,
    aa.username::text,
    r.code::text,
    r.label,
    u.code,
    u.label,
    aa.is_active,
    aa.is_password_set,
    (select max(s.last_used_at) from public.admin_sessions s where s.admin_id = aa.id)
  from public.admin_accounts aa
  left join public.roles r on r.id = aa.role_id
  left join public.units u on u.id = aa.unit_id
  order by aa.display_name asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_roles_for_admin_portal(_session_token text)
 RETURNS TABLE(id smallint, code text, label text, permission_codes text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to view roles.';
  end if;

  return query
  select r.id, r.code::text, r.label, r.permission_codes from public.roles r order by r.id asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_units_for_admin_portal(_session_token text)
 RETURNS TABLE(id smallint, code text, label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to view units.';
  end if;

  return query
  select u.id, u.code, u.label from public.units u order by u.id asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_organization_contact_arrays()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _cleaned_emails text[] := '{}';
  _cleaned_phones text[] := '{}';
  _item text;
  _norm text;
  _seen_emails text[] := '{}';
  _seen_phones text[] := '{}';
  _primary_email_norm text;
  _primary_phone_norm text;
BEGIN
  -- Normalize primary fields
  NEW.organization_email := nullif(trim(NEW.organization_email), '');
  NEW.contact_number := nullif(trim(NEW.contact_number), '');

  _primary_email_norm := lower(coalesce(NEW.organization_email, ''));
  _primary_phone_norm := regexp_replace(coalesce(NEW.contact_number, ''), '\D', '', 'g');

  IF _primary_email_norm <> '' THEN
    _seen_emails := array_append(_seen_emails, _primary_email_norm);
  END IF;

  IF _primary_phone_norm <> '' THEN
    _seen_phones := array_append(_seen_phones, _primary_phone_norm);
  END IF;

  -- Normalize additional emails
  IF NEW.additional_emails IS NOT NULL THEN
    FOREACH _item IN ARRAY NEW.additional_emails LOOP
      _norm := lower(trim(coalesce(_item, '')));
      IF _norm <> '' AND NOT (_norm = ANY(_seen_emails)) THEN
        _seen_emails := array_append(_seen_emails, _norm);
        _cleaned_emails := array_append(_cleaned_emails, trim(_item));
      END IF;
    END LOOP;
  END IF;
  NEW.additional_emails := _cleaned_emails;

  -- Normalize additional contact numbers
  IF NEW.additional_contact_numbers IS NOT NULL THEN
    FOREACH _item IN ARRAY NEW.additional_contact_numbers LOOP
      _norm := regexp_replace(trim(coalesce(_item, '')), '\D', '', 'g');
      IF _norm <> '' AND NOT (_norm = ANY(_seen_phones)) THEN
        _seen_phones := array_append(_seen_phones, _norm);
        _cleaned_phones := array_append(_cleaned_phones, trim(_item));
      END IF;
    END LOOP;
  END IF;
  NEW.additional_contact_numbers := _cleaned_phones;

  RETURN NEW;
END;
$function$;

RESET check_function_bodies;

