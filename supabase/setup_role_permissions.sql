-- Run this in the Supabase SQL editor, after setup_administrators_page.sql.
-- Adds a real, persisted permission list per role (11 stable permission
-- codes across 6 categories), an RPC to read it (extends
-- list_roles_for_admin_portal), and a Super-Admin-only RPC to update it.
--
-- Super Admin's own row is protected from modification (its permissions
-- are always full access and cannot be changed via the RPC).
--
-- NOTE: an earlier version of update_role_permissions (below) also stripped
-- 'administrators_management' from every update as defense in depth. That
-- was deliberately removed in a later migration (update_admin_rpcs_for_
-- permission_codes.sql) so Super Admins can explicitly grant the Admin role
-- that permission via the Roles & Permissions screen — see that file for
-- the current, final version of this function.

alter table public.roles
  add column if not exists permission_codes text[] not null default '{}';

update public.roles
set permission_codes = array[
  'registrations_management',
  'yorp_registry_view',
  'ypop_validation_review',
  'budget_requests_review',
  'liquidation_reports_review',
  'budget_monitoring_view',
  'news_releases_management',
  'forms_templates_management',
  'inquiries_management',
  'administrators_management',
  'activity_logs_view'
]
where code = 'super_admin';

update public.roles
set permission_codes = array[
  'registrations_management',
  'yorp_registry_view',
  'ypop_validation_review',
  'budget_requests_review',
  'liquidation_reports_review',
  'budget_monitoring_view',
  'news_releases_management',
  'forms_templates_management',
  'inquiries_management',
  'activity_logs_view'
]
where code = 'admin';

-- list_roles_for_admin_portal's return columns are changing (adding
-- permission_codes), and Postgres won't let CREATE OR REPLACE change an
-- existing function's return type — drop it first.
drop function if exists public.list_roles_for_admin_portal(text);

create function public.list_roles_for_admin_portal(_session_token text)
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

  return query
  select r.id, r.code::text, r.label, r.permission_codes from public.roles r order by r.id asc;
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
  set permission_codes = array_remove(_permission_codes, 'administrators_management')
  where roles.id = _role_id
  returning roles.id, roles.code::text, roles.permission_codes;
end;
$$;
