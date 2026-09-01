-- Run this in the Supabase SQL editor, after setup_administrators_page.sql
-- and setup_role_permissions.sql.
--
-- Switches the four admin-ACCOUNT-management RPCs (create/update/suspend/
-- delete an admin_accounts row) from checking the caller's literal
-- role.code = 'super_admin' to checking whether 'administrators_management'
-- is present in the caller's role.permission_codes. This makes the
-- "Administrators Management" checkbox in the Roles & Permissions screen
-- functionally real: granting it to the Admin role immediately lets Admin
-- accounts perform these actions; revoking it immediately blocks them.
--
-- update_role_permissions itself (the RPC that edits a role's permission
-- list) is DELIBERATELY NOT changed here — it stays hardcoded to
-- role.code = 'super_admin'. If it were switched to the same permission
-- check, an Admin account holding 'administrators_management' could use
-- it to grant the Admin role anything else in the catalog, a
-- self-amplifying escalation loop. Only its array_remove() line is
-- updated below, so the checkbox can actually be saved.

create or replace function public.create_admin_account(
  _session_token text,
  _display_name text,
  _email text,
  _username text,
  _password text,
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

  return query
  insert into public.admin_accounts (display_name, email, username, password_hash, role_id, unit_id)
  values (
    trim(_display_name),
    trim(_email),
    trim(_username),
    crypt(_password, gen_salt('bf')),
    _role_id,
    _unit_id
  )
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$$;

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

  if _admin_id = _admin_id_to_update and _role_id is distinct from (select role_id from public.admin_accounts where id = _admin_id) then
    raise exception 'You cannot change your own role.';
  end if;

  return query
  update public.admin_accounts
  set
    display_name = trim(_display_name),
    email = trim(_email),
    username = trim(_username),
    role_id = _role_id,
    unit_id = _unit_id,
    updated_at = now()
  where admin_accounts.id = _admin_id_to_update
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$$;

create or replace function public.set_admin_account_active(
  _session_token text,
  _admin_id_to_update uuid,
  _is_active boolean
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

  if _admin_id = _admin_id_to_update and not _is_active then
    raise exception 'You cannot suspend your own account.';
  end if;

  return query
  update public.admin_accounts
  set is_active = _is_active, updated_at = now()
  where admin_accounts.id = _admin_id_to_update
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$$;

create or replace function public.delete_admin_account(
  _session_token text,
  _admin_id_to_delete uuid
)
returns void
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

  if _admin_id = _admin_id_to_delete then
    raise exception 'You cannot delete your own account.';
  end if;

  delete from public.admin_accounts where admin_accounts.id = _admin_id_to_delete;
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

  select code into _target_role_code from public.roles where id = _role_id;

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
