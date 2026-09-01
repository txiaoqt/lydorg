-- Run this in the Supabase SQL editor.
-- Adds each admin's role label to the Activity Logs "Actor" lookup, so the
-- Actor column can show "Role - First Name" (e.g. "Super Admin - Jane")
-- instead of just the full display name.

drop function if exists public.list_admin_accounts_for_admin_portal(text);

create function public.list_admin_accounts_for_admin_portal(_session_token text)
returns table (id uuid, display_name text, email text, role_label text)
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
  select admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, roles.label
  from public.admin_accounts
  left join public.roles on roles.id = admin_accounts.role_id;
end;
$$;
