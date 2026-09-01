-- Run this in the Supabase SQL editor.
--
-- Adds real start_date/end_date columns to ypop_city_activities so a
-- city-led activity can span multiple days (the admin UI previously only
-- captured a single free-text `date`). This is purely additive:
--   - the legacy `date` column is kept and continues to be written on every
--     create/update (mirrored from start_date), so the existing
--     trg_sync_ypop_city_activity_participations trigger (which watches
--     `UPDATE OF name, date, venue`) keeps firing exactly as it does today
--     — its function body is not touched or reasoned about here.
--   - admin_create_ypop_city_activity / admin_update_ypop_city_activity are
--     redefined to accept _start_date/_end_date in place of _date, following
--     the same session-token-validation template already used by
--     update_admin_document_submission_file_review
--     (see repair_admin_portal_snapshot_and_news.sql).

alter table public.ypop_city_activities
  add column if not exists start_date text,
  add column if not exists end_date text;

update public.ypop_city_activities
set
  start_date = coalesce(start_date, date),
  end_date = coalesce(end_date, date)
where start_date is null or end_date is null;

create or replace function public.admin_create_ypop_city_activity(
  _session_token text,
  _semester_key text,
  _name text,
  _start_date text,
  _end_date text,
  _venue text,
  _points int
)
returns setof public.ypop_city_activities
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.admin_update_ypop_city_activity(
  _session_token text,
  _activity_id uuid,
  _name text default null,
  _start_date text default null,
  _end_date text default null,
  _venue text default null,
  _points int default null
)
returns setof public.ypop_city_activities
language plpgsql
security definer
set search_path = public
as $$
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
$$;
