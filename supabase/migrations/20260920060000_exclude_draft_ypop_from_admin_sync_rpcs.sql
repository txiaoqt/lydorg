-- Migration: 20260920060000_exclude_draft_ypop_from_admin_sync_rpcs.sql
-- Description: Update admin YPOP read RPCs to strictly exclude draft event participations,
--              draft organization-led activities (PPAs), and their associated files from
--              the Admin Portal review queue. Drafts are private organization-side
--              working copies and must not appear in Admin review workflows until submitted.

create or replace function public.admin_get_ypop_event_participations(_session_token text)
returns setof public.ypop_event_participations
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
  select * from public.ypop_event_participations
  where status is not null and status <> 'draft'
  order by created_at desc;
end;
$$;

create or replace function public.admin_get_ypop_event_files(_session_token text)
returns setof public.ypop_event_files
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
  select f.* from public.ypop_event_files f
  inner join public.ypop_event_participations p on p.id = f.participation_id
  where p.status is not null and p.status <> 'draft'
  order by f.uploaded_at desc;
end;
$$;

create or replace function public.admin_get_ypop_org_activities(_session_token text)
returns setof public.ypop_org_activities
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
  select * from public.ypop_org_activities
  where status is not null and status <> 'draft'
  order by created_at desc;
end;
$$;

create or replace function public.admin_get_ypop_org_activity_files(_session_token text)
returns setof public.ypop_org_activity_files
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
  select f.* from public.ypop_org_activity_files f
  inner join public.ypop_org_activities a on a.id = f.org_activity_id
  where a.status is not null and a.status <> 'draft'
  order by f.uploaded_at desc;
end;
$$;

grant execute on function public.admin_get_ypop_event_participations(text) to anon, authenticated, service_role;
grant execute on function public.admin_get_ypop_event_files(text) to anon, authenticated, service_role;
grant execute on function public.admin_get_ypop_org_activities(text) to anon, authenticated, service_role;
grant execute on function public.admin_get_ypop_org_activity_files(text) to anon, authenticated, service_role;
