-- Run this in the Supabase SQL editor.
--
-- The Edit Administrator overlay now presents email as a read-only
-- identifier ("cannot be altered after account creation to maintain audit
-- logs and security integrity"). This makes that a real backend rule, not
-- just a disabled input someone could bypass by calling the RPC directly:
-- update_admin_account no longer writes to the email column. The _email
-- parameter stays in the signature for compatibility (the frontend still
-- passes the unchanged value) but is ignored.

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
    username = trim(_username),
    role_id = _role_id,
    unit_id = _unit_id,
    updated_at = now()
  where admin_accounts.id = _admin_id_to_update
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$$;
