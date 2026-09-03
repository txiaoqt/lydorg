-- Run this in the Supabase SQL editor.
--
-- Fixes "column reference \"role_id\" is ambiguous" when editing an
-- administrator. Both functions below declare RETURNS TABLE columns that
-- share names with real table columns (id, role_id, code, ...) — PL/pgSQL
-- implicitly creates an OUT-parameter variable for each RETURNS TABLE
-- column, so any UNQUALIFIED reference to a same-named column inside the
-- function body is ambiguous between "the OUT parameter" and "the table
-- column." Both fixes below just schema/table-qualify those references.

create or replace function public.update_admin_account(
  _session_token text,
  _admin_id_to_update uuid,
  _display_name text,
  _email text,
  _username text,
  _role_id smallint,
  _unit_id smallint
)
returns table (id uuid, display_name text, email text, username text, role_id smallint, unit_id smallint, is_active boolean)
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
    raise exception 'You do not have permission to manage admin accounts.';
  end if;

  if _admin_id = _admin_id_to_update and _role_id is distinct from (
    select admin_accounts.role_id from public.admin_accounts where admin_accounts.id = _admin_id
  ) then
    raise exception 'You cannot change your own role.';
  end if;

  return query
  update public.admin_accounts
  set
    display_name = trim(_display_name),
    username = trim(_username),
    role_id = _role_id,
    unit_id = _unit_id,
    updated_at = now()
  where admin_accounts.id = _admin_id_to_update
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$$;

create or replace function public.update_role_permissions(
  _session_token text,
  _role_id smallint,
  _permission_codes text[]
)
returns table (id smallint, code text, permission_codes text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _target_role_code text;
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
    where a.id = _admin_id and r.code = 'super_admin'
  ) then
    raise exception 'Only super administrators may manage role permissions.';
  end if;

  select roles.code into _target_role_code from public.roles where roles.id = _role_id;

  if _target_role_code = 'super_admin' then
    raise exception 'Super Admin permissions cannot be modified.';
  end if;

  return query
  update public.roles
  set permission_codes = _permission_codes
  where roles.id = _role_id
  returning roles.id, roles.code::text, roles.permission_codes;
end;
$$;
