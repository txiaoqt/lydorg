-- Run this in the Supabase SQL editor.
--
-- Fixes "function gen_salt(unknown) does not exist" when creating an
-- administrator. Supabase installs extensions like pgcrypto into a
-- dedicated `extensions` schema, not `public` — create_admin_account's
-- `set search_path = public` never included it, so crypt()/gen_salt()
-- couldn't be found even though pgcrypto was already installed.

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
set search_path = public, extensions
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
