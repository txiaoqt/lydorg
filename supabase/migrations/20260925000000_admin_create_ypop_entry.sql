-- Migration: 20260925000000_admin_create_ypop_entry.sql
-- Description: Provide a secure SECURITY DEFINER RPC for administrators to materialize
-- or initialize YPOP qualification entries with session-token authorization and idempotency.

create or replace function public.admin_create_ypop_entry(
  _session_token text,
  _organization_id uuid,
  _semester text,
  _semester_label text,
  _points_earned integer default 0,
  _points_required integer default 70,
  _total_points integer default 100,
  _status text default 'draft',
  _admin_remarks text default '',
  _submission_note text default '',
  _validation_deadline timestamptz default null,
  _submitted_at timestamptz default null,
  _validated_at timestamptz default null,
  _revision_history jsonb default '[]'::jsonb,
  _org_led_project_count integer default 0,
  _city_led_attendance jsonb default '[]'::jsonb
)
returns setof public.ypop_entries
language plpgsql
security definer
set search_path = public, extensions
as $$
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
$$;

grant execute on function public.admin_create_ypop_entry to authenticated, anon;
