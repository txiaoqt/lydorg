-- Migration: 20260905_admin_ypop_sync_rpcs.sql
-- Description: Provide authenticated security-definer admin read RPCs for YPOP participations,
-- event files, organization-led activities (PPAs), and PPA files, and ensure admin update
-- mutations reliably return updated records with proper error handling.

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
  select * from public.ypop_event_files
  order by uploaded_at desc;
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
  select * from public.ypop_org_activity_files
  order by uploaded_at desc;
end;
$$;

create or replace function public.admin_update_ypop_event_participation(
  _session_token text,
  _participation_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _proof_submitted_at timestamptz default null,
  _verified_at timestamptz default null,
  _revision_history jsonb default null
)
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
  update public.ypop_event_participations
  set
    status = coalesce(_status, ypop_event_participations.status),
    admin_remarks = coalesce(_admin_remarks, ypop_event_participations.admin_remarks),
    proof_submitted_at = coalesce(_proof_submitted_at, ypop_event_participations.proof_submitted_at),
    verified_at = case when _status = 'verified' and _verified_at is null then now() else coalesce(_verified_at, ypop_event_participations.verified_at) end,
    revision_history = coalesce(_revision_history, ypop_event_participations.revision_history),
    updated_at = now()
  where ypop_event_participations.id = _participation_id
  returning *;
end;
$$;

create or replace function public.admin_update_ypop_org_activity(
  _session_token text,
  _activity_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _approved_at timestamptz default null,
  _revision_history jsonb default null
)
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
  update public.ypop_org_activities
  set
    status = coalesce(_status, ypop_org_activities.status),
    admin_remarks = coalesce(_admin_remarks, ypop_org_activities.admin_remarks),
    approved_at = case when _status = 'approved' and _approved_at is null then now() else coalesce(_approved_at, ypop_org_activities.approved_at) end,
    revision_history = coalesce(_revision_history, ypop_org_activities.revision_history),
    updated_at = now()
  where ypop_org_activities.id = _activity_id
  returning *;
end;
$$;
