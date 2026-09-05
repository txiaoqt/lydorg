-- Migration: 20260905_ypop_workflow_closure_evaluation.sql
-- Description: Implement atomic semester closure and batch final evaluation for YPOP validation periods.
-- When an admin closes a semester, this evaluates all participating organizations, calculates final scores
-- (City-Led % + Organization-Led PPA bonus), sets qualification state (>= 70% -> qualified, < 70% -> not_qualified),
-- and timestamps validated_at.

create or replace function public.admin_close_ypop_semester_and_evaluate(
  _session_token text,
  _period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;
