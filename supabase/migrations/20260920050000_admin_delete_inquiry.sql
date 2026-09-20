-- Migration: 20260920050000_admin_delete_inquiry.sql
-- Purpose: Secure Admin RPC to delete inquiries with session validation and activity logging.

create or replace function public.delete_admin_inquiry(
  _session_token text,
  _inquiry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _inquiry public.inquiries%rowtype;
begin
  -- 1. Authorize active admin session
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Admin account is not authorized.'
    );
  end if;

  -- 2. Find and lock the target inquiry
  select *
  into _inquiry
  from public.inquiries
  where id = _inquiry_id
  for update;

  if _inquiry.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Inquiry not found.'
    );
  end if;

  -- 3. Delete the inquiry
  delete from public.inquiries
  where id = _inquiry_id;

  -- 4. Record the deletion in public.activity_logs
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
    _inquiry.organization_id,
    'delete_inquiry',
    'inquiry',
    _inquiry.id,
    'Deleted inquiry "' || coalesce(_inquiry.subject, 'General Inquiry') || '".'
  );

  return jsonb_build_object(
    'success', true,
    'deleted_id', _inquiry_id,
    'deleted_subject', _inquiry.subject
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.delete_admin_inquiry(text, uuid) TO anon, authenticated, service_role;
