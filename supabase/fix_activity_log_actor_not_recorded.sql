-- Run this in the Supabase SQL editor.
--
-- create_admin_activity_log has always been the only place that writes to
-- activity_logs. It correctly validates the session token and resolves the
-- calling admin's id into _admin_id, but never actually used that variable —
-- it hardcoded actor_user_id to null on every insert. This is why the
-- Activity Logs "Actor" column has always shown "System" for every admin
-- action (Templates, Budget, Liquidation, News, etc.), not just old rows —
-- fresh actions were affected too, since the bug is in the write path itself.
-- This only fixes inserts going forward; already-written rows stay null
-- since the real actor was never recorded for them.

create or replace function public.create_admin_activity_log(
  _session_token text,
  _organization_id uuid,
  _action text,
  _related_type text,
  _related_id uuid,
  _description text
)
returns table (
  id uuid,
  actor_user_id uuid,
  organization_id uuid,
  action text,
  related_type text,
  related_id uuid,
  description text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  )
  values (
    _admin_id,
    _organization_id,
    trim(_action),
    trim(_related_type),
    _related_id,
    _description
  )
  returning
    activity_logs.id,
    activity_logs.actor_user_id,
    activity_logs.organization_id,
    activity_logs.action,
    activity_logs.related_type,
    activity_logs.related_id,
    activity_logs.description,
    activity_logs.created_at;
end;
$$;
