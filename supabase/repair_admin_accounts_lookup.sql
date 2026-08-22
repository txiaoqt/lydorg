-- Run this in the Supabase SQL editor.
-- Adds a safe, session-gated way to look up admin display names/emails for the
-- Activity Logs "Actor" column. admin_accounts stores password_hash, so this is
-- a security-definer RPC (never returns password_hash, requires a valid admin
-- session token) rather than a direct client-side table read.

create or replace function public.list_admin_accounts_for_admin_portal(_session_token text)
returns table (id uuid, display_name text, email text)
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
  select admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text
  from public.admin_accounts;
end;
$$;
