-- ==============================================================================
-- Migration: 20260910150000_ypop_resolve_rpc_overload_ambiguity.sql
-- Description: Surgically resolve PostgREST PGRST203 "Multiple Choices" function
-- ambiguity by dropping conflicting overloaded signatures of
-- admin_update_ypop_event_participation and admin_update_ypop_org_activity,
-- and recreating exactly one canonical, unambiguous version of each function.
--
-- TARGETED OBJECTIVES:
-- 1. Drop existing overloaded signatures using exact parameter lists:
--    - admin_update_ypop_event_participation with enum _status
--    - admin_update_ypop_event_participation with text _status
--    - admin_update_ypop_org_activity with enum _status
--    - admin_update_ypop_org_activity with text _status
-- 2. Dynamically verify and drop any other orphaned overloads in schema public.
-- 3. Recreate canonical, security-definer functions with unified text status parameters
--    and explicit type-safe enum casting.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Explicit DROP of conflicting overloaded signatures for
--    admin_update_ypop_event_participation
-- ------------------------------------------------------------------------------
drop function if exists public.admin_update_ypop_event_participation(
  text,
  uuid,
  public.ypop_event_participation_status,
  text,
  timestamptz,
  timestamptz,
  jsonb
);

drop function if exists public.admin_update_ypop_event_participation(
  text,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  jsonb
);

-- ------------------------------------------------------------------------------
-- 2. Explicit DROP of conflicting overloaded signatures for
--    admin_update_ypop_org_activity
-- ------------------------------------------------------------------------------
drop function if exists public.admin_update_ypop_org_activity(
  text,
  uuid,
  public.ypop_org_activity_status,
  text,
  timestamptz,
  jsonb
);

drop function if exists public.admin_update_ypop_org_activity(
  text,
  uuid,
  text,
  text,
  timestamptz,
  jsonb
);

-- ------------------------------------------------------------------------------
-- 3. Dynamic cleanup block to guarantee zero leftover overloads in public schema
-- ------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select p.oid::regprocedure as func_signature
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where p.proname in ('admin_update_ypop_event_participation', 'admin_update_ypop_org_activity')
      and n.nspname = 'public'
  ) loop
    execute 'drop function if exists ' || r.func_signature || ';';
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Canonical public.admin_update_ypop_event_participation
--    Preserves SECURITY DEFINER, session validation, and exact business logic.
-- ------------------------------------------------------------------------------
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
set search_path = public, extensions
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
    status = case
      when _status is not null and _status <> '' then _status::public.ypop_event_participation_status
      else ypop_event_participations.status
    end,
    admin_remarks = coalesce(_admin_remarks, ypop_event_participations.admin_remarks),
    proof_submitted_at = coalesce(_proof_submitted_at, ypop_event_participations.proof_submitted_at),
    verified_at = case
      when _status = 'verified' and _verified_at is null then now()
      else coalesce(_verified_at, ypop_event_participations.verified_at)
    end,
    revision_history = coalesce(_revision_history, ypop_event_participations.revision_history),
    updated_at = now()
  where ypop_event_participations.id = _participation_id
  returning *;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Canonical public.admin_update_ypop_org_activity
--    Preserves SECURITY DEFINER, session validation, and exact business logic.
-- ------------------------------------------------------------------------------
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
set search_path = public, extensions
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
    status = case
      when _status is not null and _status <> '' then _status::public.ypop_org_activity_status
      else ypop_org_activities.status
    end,
    admin_remarks = coalesce(_admin_remarks, ypop_org_activities.admin_remarks),
    approved_at = case
      when _status = 'approved' and _approved_at is null then now()
      else coalesce(_approved_at, ypop_org_activities.approved_at)
    end,
    revision_history = coalesce(_revision_history, ypop_org_activities.revision_history),
    updated_at = now()
  where ypop_org_activities.id = _activity_id
  returning *;
end;
$$;
