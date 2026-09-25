-- ==============================================================================
-- Migration: Allow Email Address for Administrator Authentication
-- Description: Updates public.authenticate_admin_account so administrators
--              can sign in using their full email address (or username fallback).
-- ==============================================================================

create or replace function public.authenticate_admin_account(
  _username text,
  _password text
)
returns table (
  admin_id uuid,
  username citext,
  email citext,
  display_name text,
  session_token text,
  expires_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin public.admin_accounts%rowtype;
  _session_token text;
  _expires_at timestamptz;
  _clean_identifier text;
begin
  _clean_identifier := lower(trim(coalesce(_username, '')));

  select *
  into _admin
  from public.admin_accounts aa
  where aa.is_active = true
    and (lower(aa.email::text) = _clean_identifier or lower(aa.username::text) = _clean_identifier)
    and aa.password_hash = extensions.crypt(_password, aa.password_hash)
  limit 1;

  if not found then
    return;
  end if;

  _session_token := encode(extensions.gen_random_bytes(32), 'hex');
  _expires_at := now() + interval '12 hours';

  insert into public.admin_sessions (
    admin_id,
    token_hash,
    expires_at
  )
  values (
    _admin.id,
    encode(extensions.digest(_session_token, 'sha256'), 'hex'),
    _expires_at
  );

  return query
  select
    _admin.id,
    _admin.username,
    _admin.email,
    _admin.display_name,
    _session_token,
    _expires_at;
end;
$$;
