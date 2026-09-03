-- Run this in the Supabase SQL editor.
--
-- Switches "Add Administrator" from an admin-set password to a real invite
-- email sent through Supabase Auth's own Invite user flow (SMTP already
-- configured with Brevo). The account is created in a pending state with a
-- random, unusable placeholder password (so the existing login RPC blocks
-- it automatically — no changes needed there). The admin-invite Edge
-- Function calls supabase.auth.admin.inviteUserByEmail() using the service
-- role key, which only it can hold — this SQL file only prepares the
-- admin_accounts side.
--
-- set_initial_admin_password below is deliberately NOT session-token-gated
-- the way every other admin RPC is: the caller isn't logged into the admin
-- portal yet. Instead it trusts auth.uid(), resolved from the Supabase Auth
-- session the invited administrator holds after clicking their real invite
-- link and landing on /admin/create-password — that session is itself proof
-- they control the invited inbox, so no separate custom token is needed.

alter table public.admin_accounts
  add column if not exists is_password_set boolean not null default true;

-- create_admin_account's signature is changing (dropping _password) —
-- CREATE OR REPLACE can't change parameters, so drop the old version first.
drop function if exists public.create_admin_account(text, text, text, text, text, smallint, smallint);

create function public.create_admin_account(
  _session_token text,
  _display_name text,
  _email text,
  _username text,
  _role_id smallint,
  _unit_id smallint
)
returns table (
  id uuid,
  display_name text,
  email text,
  username text,
  role_id smallint,
  unit_id smallint,
  is_active boolean,
  is_password_set boolean
)
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
  insert into public.admin_accounts (
    display_name, email, username, password_hash, role_id, unit_id, is_password_set
  )
  values (
    trim(_display_name),
    trim(_email),
    trim(_username),
    crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
    _role_id,
    _unit_id,
    false
  )
  returning
    admin_accounts.id,
    admin_accounts.display_name,
    admin_accounts.email::text,
    admin_accounts.username::text,
    admin_accounts.role_id,
    admin_accounts.unit_id,
    admin_accounts.is_active,
    admin_accounts.is_password_set;
end;
$$;

create or replace function public.set_initial_admin_password(
  _new_password text
)
returns table (id uuid, username text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _caller_email text;
  _matched_id uuid;
  _matched_username text;
begin
  select email into _caller_email from auth.users where auth.users.id = auth.uid();

  if _caller_email is null then
    raise exception 'This invite link is invalid or has expired.';
  end if;

  select admin_accounts.id, admin_accounts.username
    into _matched_id, _matched_username
  from public.admin_accounts
  where lower(admin_accounts.email) = lower(_caller_email)
    and admin_accounts.is_password_set = false;

  if _matched_id is null then
    raise exception 'This invite link is invalid or has expired.';
  end if;

  update public.admin_accounts
  set
    password_hash = crypt(_new_password, gen_salt('bf')),
    is_password_set = true,
    updated_at = now()
  where admin_accounts.id = _matched_id;

  return query select _matched_id, _matched_username;
end;
$$;

create or replace function public.get_pending_administrator_email(
  _session_token text,
  _admin_id_to_invite uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _target_email text;
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

  select admin_accounts.email into _target_email
  from public.admin_accounts
  where admin_accounts.id = _admin_id_to_invite
    and admin_accounts.is_password_set = false;

  if _target_email is null then
    raise exception 'This administrator has already set their password.';
  end if;

  return _target_email;
end;
$$;

-- list_administrators_for_admin_portal's return columns are changing (adding
-- is_password_set) — drop first, same reason as create_admin_account above.
drop function if exists public.list_administrators_for_admin_portal(text);

create function public.list_administrators_for_admin_portal(_session_token text)
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
  is_password_set boolean,
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
    aa.is_password_set,
    (select max(s.last_used_at) from public.admin_sessions s where s.admin_id = aa.id)
  from public.admin_accounts aa
  left join public.roles r on r.id = aa.role_id
  left join public.units u on u.id = aa.unit_id
  order by aa.display_name asc;
end;
$$;
