-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_close_ypop_semester_and_evaluate(_session_token text, _period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _period record;
  _semester_key text;
  _org_id uuid;
  _city_max_pts numeric := 0;
  _city_earned_pts numeric := 0;
  _city_percent numeric := 0;
  _approved_ppa_count integer := 0;
  _ppa_bonus numeric := 0;
  _total_score numeric := 0;
  _final_status text;
  _evaluated_count integer := 0;
  _now timestamptz := now();
  _tiers jsonb;
  _tier record;
begin
  -- 1. Validate Admin Session
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  -- 2. Fetch Period
  select *
  into _period
  from public.ypop_periods
  where id = _period_id;

  if _period.id is null then
    raise exception 'YPOP period not found.';
  end if;

  _semester_key := _period.semester_key;
  _tiers := coalesce(_period.org_led_tiers, '[
    {"minProjects": 1, "bonus": 10},
    {"minProjects": 4, "bonus": 15},
    {"minProjects": 7, "bonus": 20},
    {"minProjects": 10, "bonus": 25}
  ]'::jsonb);

  -- 3. Close the Period
  update public.ypop_periods
  set status = 'closed',
      updated_at = _now
  where id = _period_id;

  -- 4. Calculate Total City-Led Max Points for Semester
  select coalesce(sum(
    case
      when points is not null and points > 0 then points
      when lower(category) = 'mandatory' then 4
      when lower(category) = 'invitational' then 3
      else 2
    end
  ), 0)
  into _city_max_pts
  from public.ypop_city_activities
  where semester_key = _semester_key;

  -- 5. Find All Relevant Organizations for Semester
  for _org_id in
    select distinct org_id from (
      select organization_id as org_id
      from public.ypop_entries
      where semester = _semester_key
      union
      select p.organization_id as org_id
      from public.ypop_event_participations p
      inner join public.ypop_city_activities a on a.id = p.activity_id
      where a.semester_key = _semester_key
      union
      select o.organization_id as org_id
      from public.ypop_org_activities o
      inner join public.ypop_entries e on e.id = o.ypop_entry_id
      where e.semester = _semester_key
    ) relevant_orgs
  loop
    -- Calculate verified City-Led points for this organization
    select coalesce(sum(
      case
        when a.points is not null and a.points > 0 then a.points
        when lower(a.category) = 'mandatory' then 4
        when lower(a.category) = 'invitational' then 3
        else 2
      end
    ), 0)
    into _city_earned_pts
    from public.ypop_event_participations p
    inner join public.ypop_city_activities a on a.id = p.activity_id
    where a.semester_key = _semester_key
      and p.organization_id = _org_id
      and p.status = 'verified';

    if _city_max_pts > 0 then
      _city_percent := round((_city_earned_pts / _city_max_pts) * 100);
    else
      _city_percent := 0;
    end if;

    -- Count approved PPAs for this organization
    select count(*)
    into _approved_ppa_count
    from public.ypop_org_activities o
    inner join public.ypop_entries e on e.id = o.ypop_entry_id
    where e.semester = _semester_key
      and o.organization_id = _org_id
      and o.status = 'approved';

    -- Compute PPA bonus tier
    _ppa_bonus := 0;
    for _tier in
      select (value->>'minProjects')::int as min_proj, (value->>'bonus')::numeric as b_val
      from jsonb_array_elements(_tiers)
      order by (value->>'minProjects')::int desc
    loop
      if _approved_ppa_count >= _tier.min_proj then
        _ppa_bonus := _tier.b_val;
        exit;
      end if;
    end loop;

    _total_score := round(_city_percent + _ppa_bonus);
    if _total_score >= 70 then
      _final_status := 'qualified';
    else
      _final_status := 'not_qualified';
    end if;

    -- Upsert or Update ypop_entries for this organization
    if exists (select 1 from public.ypop_entries where organization_id = _org_id and semester = _semester_key) then
      update public.ypop_entries
      set points_earned = _total_score,
          points_required = 70,
          total_points = 100,
          status = _final_status::public.ypop_entry_status,
          validated_at = _now,
          org_led_project_count = _approved_ppa_count,
          updated_at = _now,
          revision_history = coalesce(revision_history, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
              'action', _final_status,
              'adminRemarks', 'Final semester evaluation upon period closure.',
              'changedAt', to_char(_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
          )
      where organization_id = _org_id and semester = _semester_key;
    else
      insert into public.ypop_entries (
        id,
        organization_id,
        submitted_by,
        semester,
        semester_label,
        points_earned,
        points_required,
        total_points,
        status,
        admin_remarks,
        submission_note,
        validation_deadline,
        submitted_at,
        validated_at,
        revision_history,
        org_led_project_count,
        city_led_attendance,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        _org_id,
        null,
        _semester_key,
        _period.semester_label,
        _total_score,
        70,
        100,
        _final_status::public.ypop_entry_status,
        '',
        '',
        _period.validation_deadline,
        _now,
        _now,
        jsonb_build_array(
          jsonb_build_object(
            'action', _final_status,
            'adminRemarks', 'Final semester evaluation upon period closure.',
            'changedAt', to_char(_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          )
        ),
        _approved_ppa_count,
        '[]'::jsonb,
        _now,
        _now
      );
    end if;

    _evaluated_count := _evaluated_count + 1;
  end loop;

  return jsonb_build_object(
    'periodId', _period_id,
    'semesterKey', _semester_key,
    'status', 'closed',
    'evaluatedCount', _evaluated_count
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_template_category(_session_token text, _normalized_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _normalized text;
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, true);
  _normalized := lower(regexp_replace(btrim(_normalized_name), '[[:space:]-]+', '_', 'g'));

  IF _normalized IS NULL OR _normalized = '' THEN
    RAISE EXCEPTION 'Category name cannot be empty.';
  END IF;
  IF _normalized IN ('yorp', 'ypop', 'move', 'data_form') THEN
    RAISE EXCEPTION 'System categories cannot be added as custom categories.';
  END IF;

  INSERT INTO public.admin_template_categories (normalized_name)
  VALUES (_normalized)
  ON CONFLICT (normalized_name) DO NOTHING;

  RETURN _normalized;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_ypop_city_activity(_session_token text, _semester_key text, _name text, _date text, _venue text, _points integer)
 RETURNS SETOF ypop_city_activities
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _new_id   uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat limit 1;
  if _admin_id is null then raise exception 'Admin account is not authorized.'; end if;

  insert into public.ypop_city_activities (semester_key, name, date, venue, points)
  values (_semester_key, _name, _date, _venue, coalesce(_points, 5))
  returning id into _new_id;

  return query select * from public.ypop_city_activities where id = _new_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_ypop_city_activity(_session_token text, _semester_key text, _name text, _start_date text, _end_date text, _venue text, _points integer)
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
  insert into public.ypop_city_activities (
    semester_key,
    name,
    date,
    start_date,
    end_date,
    venue,
    points
  )
  values (
    _semester_key,
    _name,
    _start_date,
    _start_date,
    coalesce(_end_date, _start_date),
    _venue,
    coalesce(_points, 5)
  )
  returning *;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_ypop_entry(_session_token text, _organization_id uuid, _semester text, _semester_label text, _points_earned integer DEFAULT 0, _points_required integer DEFAULT 70, _total_points integer DEFAULT 100, _status text DEFAULT 'draft'::text, _admin_remarks text DEFAULT ''::text, _submission_note text DEFAULT ''::text, _validation_deadline timestamp with time zone DEFAULT NULL::timestamp with time zone, _submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _validated_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _revision_history jsonb DEFAULT '[]'::jsonb, _org_led_project_count integer DEFAULT 0, _city_led_attendance jsonb DEFAULT '[]'::jsonb)
 RETURNS SETOF ypop_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  _admin_id uuid;
  _existing_id uuid;
  _new_id uuid;
  _now timestamptz := now();
begin
  -- 1. Validate Admin Session
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  -- 2. Validate parameters
  if _organization_id is null then
    raise exception 'Organization ID is required.';
  end if;

  if _semester is null or trim(_semester) = '' then
    raise exception 'Semester identifier is required.';
  end if;

  -- 3. Idempotency check: if an entry for (organization_id, semester) already exists, return it
  select id
  into _existing_id
  from public.ypop_entries
  where organization_id = _organization_id
    and semester = _semester
  order by created_at desc
  limit 1;

  if _existing_id is not null then
    return query
    select *
    from public.ypop_entries
    where id = _existing_id;
    return;
  end if;

  -- 4. Insert new ypop_entries row
  insert into public.ypop_entries (
    organization_id,
    submitted_by,
    semester,
    semester_label,
    points_earned,
    points_required,
    total_points,
    status,
    admin_remarks,
    submission_note,
    validation_deadline,
    submitted_at,
    validated_at,
    revision_history,
    org_led_project_count,
    city_led_attendance,
    created_at,
    updated_at
  )
  values (
    _organization_id,
    null,
    _semester,
    coalesce(_semester_label, _semester),
    coalesce(_points_earned, 0),
    coalesce(_points_required, 70),
    coalesce(_total_points, 100),
    case
      when _status is not null and _status <> '' then _status::public.ypop_entry_status
      else 'draft'::public.ypop_entry_status
    end,
    coalesce(_admin_remarks, ''),
    coalesce(_submission_note, ''),
    _validation_deadline,
    _submitted_at,
    _validated_at,
    coalesce(_revision_history, '[]'::jsonb),
    coalesce(_org_led_project_count, 0),
    coalesce(_city_led_attendance, '[]'::jsonb),
    _now,
    _now
  )
  returning id into _new_id;

  return query
  select *
  from public.ypop_entries
  where id = _new_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_ypop_period(_session_token text, _semester_key text, _semester_label text, _validation_deadline timestamp with time zone, _status ypop_period_status, _org_led_tiers jsonb)
 RETURNS SETOF ypop_periods
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _new_id   uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat limit 1;
  if _admin_id is null then raise exception 'Admin account is not authorized.'; end if;

  insert into public.ypop_periods
    (semester_key, semester_label, validation_deadline, status, org_led_tiers)
  values
    (_semester_key, _semester_label, _validation_deadline, _status, coalesce(_org_led_tiers, '[]'))
  returning id into _new_id;

  return query select * from public.ypop_periods where id = _new_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_template_category(_session_token text, _normalized_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _normalized text;
  _usage_count bigint;
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, true);
  _normalized := lower(regexp_replace(btrim(_normalized_name), '[[:space:]-]+', '_', 'g'));

  IF _normalized IN ('yorp', 'ypop', 'move', 'data_form') THEN
    RAISE EXCEPTION 'System categories cannot be deleted.';
  END IF;

  -- Serialize category deletion with template writes while the usage check runs.
  LOCK TABLE public.required_document_types IN SHARE ROW EXCLUSIVE MODE;

  PERFORM 1
  FROM public.admin_template_categories AS category
  WHERE category.normalized_name = _normalized
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category was not found.';
  END IF;

  SELECT count(*)
    INTO _usage_count
  FROM public.required_document_types AS document_type
  CROSS JOIN LATERAL unnest(COALESCE(document_type.template_category, ARRAY[]::text[])) AS category(value)
  WHERE lower(regexp_replace(btrim(category.value), '[[:space:]-]+', '_', 'g')) = _normalized;

  IF _usage_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete this category because it is assigned to % template(s).', _usage_count;
  END IF;

  DELETE FROM public.admin_template_categories AS category
  WHERE category.normalized_name = _normalized;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_ypop_city_activity(_session_token text, _activity_id uuid)
 RETURNS void
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

  delete from public.ypop_city_activities where id = _activity_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_ypop_period(_session_token text, _period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _semester_key text;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat limit 1;
  if _admin_id is null then raise exception 'Admin account is not authorized.'; end if;

  select semester_key into _semester_key
  from public.ypop_periods
  where id = _period_id
  for update;

  if _semester_key is null then
    raise exception 'YPOP semester not found.';
  end if;

  delete from public.ypop_entries
  where semester = _semester_key;

  delete from public.ypop_periods where id = _period_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ensure_renewal_test_account_profile(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_activity_announcements(_session_token text, _activity_id uuid)
 RETURNS TABLE(id uuid, activity_id uuid, sent_by uuid, recipient_count integer, successful_count integer, failed_count integer, status text, error_message text, idempotency_key text, created_at timestamp with time zone, sent_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
  select
    aa.id,
    aa.activity_id,
    aa.sent_by,
    aa.recipient_count,
    aa.successful_count,
    aa.failed_count,
    aa.status,
    aa.error_message,
    aa.idempotency_key,
    aa.created_at,
    aa.sent_at
  from public.activity_announcements aa
  where aa.activity_id = _activity_id
  order by aa.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_annual_budget_allocations(_session_token text)
 RETURNS SETOF annual_budget_allocations
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
  SELECT *
  FROM public.annual_budget_allocations
  ORDER BY fiscal_year DESC;
END;
$function$;

RESET check_function_bodies;

