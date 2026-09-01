-- Run this in the Supabase SQL editor, after the previous three admin/role
-- permission migration files.
--
-- 1. New RPC: get_admin_permission_context — lets the frontend fetch the
--    CALLER's own role code/label/permission_codes right after login and on
--    every session restore, so the client always knows what nav sections
--    and pages the logged-in admin is actually allowed to see.
-- 2. Extends the 'administrators_management' permission gate (already used
--    on create/update/suspend/delete admin_accounts) to the three
--    remaining Administrators-domain read RPCs, for defense in depth.

create or replace function public.get_admin_permission_context(_session_token text)
returns table (role_code text, role_label text, permission_codes text[])
language plpgsql
security definer
set search_path = public
as $$
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
  select r.code::text, r.label, r.permission_codes
  from public.admin_accounts a
  join public.roles r on r.id = a.role_id
  where a.id = _admin_id;
end;
$$;

create or replace function public.list_administrators_for_admin_portal(_session_token text)
returns table (
  id uuid,
  display_name text,
  email text,
  username text,
  role_code text,
  role_label text,
  unit_code text,
  unit_label text,
  is_active boolean,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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
    (select max(s.last_used_at) from public.admin_sessions s where s.admin_id = aa.id)
  from public.admin_accounts aa
  left join public.roles r on r.id = aa.role_id
  left join public.units u on u.id = aa.unit_id
  order by aa.display_name asc;
end;
$$;

create or replace function public.list_roles_for_admin_portal(_session_token text)
returns table (id smallint, code text, label text, permission_codes text[])
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.list_units_for_admin_portal(_session_token text)
returns table (id smallint, code text, label text)
language plpgsql
security definer
set search_path = public
as $$
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
$$;
