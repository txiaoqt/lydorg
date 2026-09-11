-- ==============================================================================
-- Migration: 20260910143000_ypop_reliability_fixes.sql
-- Description: Implement missing admin_update_ypop_entry RPC, demo admin session bridge,
-- and YPOP entry status/score persistence synchronization.
--
-- TARGETED OBJECTIVES:
-- 1. Create public.admin_update_ypop_entry SECURITY DEFINER RPC to persist
--    entry status, calculated points, org-led project counts, attendance,
--    and revision history with session validation.
-- 2. Create public.ensure_admin_demo_session SECURITY DEFINER RPC to bridge
--    demo/fallback admin sessions with public.admin_sessions so that
--    validate_admin_session_token successfully authorizes local/demo admin reviews.
-- ==============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. Drop any existing overloaded versions of admin_update_ypop_entry
--    Prevents PostgreSQL 42725 "function name is not unique" errors.
-- ------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select p.oid::regprocedure as func_signature
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where p.proname = 'admin_update_ypop_entry'
      and n.nspname = 'public'
  ) loop
    execute 'drop function if exists ' || r.func_signature || ' cascade;';
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. public.admin_update_ypop_entry RPC
--    Unified contract supporting modern 9-param calls and legacy/prompt 7-param calls.
-- ------------------------------------------------------------------------------
create or replace function public.admin_update_ypop_entry(
  _session_token text,
  _entry_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _points_earned integer default null,
  _org_led_project_count integer default null,
  _city_led_attendance jsonb default null,
  _revision_history jsonb default null,
  _validated_at timestamptz default null,
  _projects_completed integer default null,
  _review_notes text default null,
  _reviewed_by text default null
)
returns setof public.ypop_entries
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin_id uuid;
  _effective_remarks text;
  _effective_org_count integer;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  _effective_remarks := coalesce(_admin_remarks, _review_notes);
  _effective_org_count := coalesce(_org_led_project_count, _projects_completed);

  return query
  update public.ypop_entries
  set
    status = case
      when _status is not null and _status <> '' then _status::public.ypop_entry_status
      else ypop_entries.status
    end,
    admin_remarks = coalesce(_effective_remarks, ypop_entries.admin_remarks),
    points_earned = coalesce(_points_earned, ypop_entries.points_earned),
    org_led_project_count = coalesce(_effective_org_count, ypop_entries.org_led_project_count),
    city_led_attendance = coalesce(_city_led_attendance, ypop_entries.city_led_attendance),
    revision_history = coalesce(_revision_history, ypop_entries.revision_history),
    validated_at = case
      when _status in ('qualified', 'not_qualified') and _validated_at is null then now()
      else coalesce(_validated_at, ypop_entries.validated_at)
    end,
    updated_at = now()
  where ypop_entries.id = _entry_id
  returning *;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Drop any existing overloaded versions of ensure_admin_demo_session
-- ------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select p.oid::regprocedure as func_signature
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where p.proname = 'ensure_admin_demo_session'
      and n.nspname = 'public'
  ) loop
    execute 'drop function if exists ' || r.func_signature || ' cascade;';
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. public.ensure_admin_demo_session RPC
-- ------------------------------------------------------------------------------
create or replace function public.ensure_admin_demo_session(
  _session_token text,
  _username text default 'lydoadmin'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin_id uuid;
  _token_hash text;
  _expires_at timestamptz := now() + interval '7 days';
begin
  if _session_token is null or length(trim(_session_token)) = 0 then
    raise exception 'Session token is required.';
  end if;

  -- Lookup active admin account by username, or default to first active admin
  select id into _admin_id
  from public.admin_accounts
  where lower(username) = lower(coalesce(_username, 'lydoadmin'))
    and is_active = true
  limit 1;

  if _admin_id is null then
    select id into _admin_id
    from public.admin_accounts
    where is_active = true
    order by created_at asc
    limit 1;
  end if;

  if _admin_id is null then
    raise exception 'No active admin account found to bind demo session.';
  end if;

  _token_hash := encode(digest(_session_token, 'sha256'), 'hex');

  -- Insert or update admin session
  insert into public.admin_sessions (
    admin_id,
    token_hash,
    expires_at,
    created_at,
    last_used_at
  ) values (
    _admin_id,
    _token_hash,
    _expires_at,
    now(),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'admin_id', _admin_id,
    'expires_at', _expires_at
  );
end;
$$;
