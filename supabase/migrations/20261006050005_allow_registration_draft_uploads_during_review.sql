-- Registration requirements are submitted independently. A pending sibling
-- must not lock a draft, including the draft-to-review step of a bulk upload.
-- Renewal packets retain their existing submission-level lock.
create or replace function public.guard_submitted_registration_document_edits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  _submission_status text;
  _registration_submission boolean;
begin
  -- Admin and correction RPCs run with their validated definer privileges.
  if current_user not in ('authenticated', 'anon')
     or public.current_user_is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select ds.status,
         ds.submission_scope = 'registration' and ds.renewal_id is null
    into _submission_status, _registration_submission
  from public.document_submissions ds
  where ds.id = old.submission_id
  for update;

  if old.admin_status is distinct from 'draft'
     or _submission_status is null
     or not (
       _submission_status in ('draft', 'needs_revision')
       or (
         _registration_submission is true
         and _submission_status in ('under_admin_review', 'submitted', 'ready_for_review')
       )
     ) then
    raise exception 'Submitted documents are locked. Only draft documents can be edited or removed; requested revisions must use the replacement flow.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.guard_submitted_registration_document_edits() from public, anon, authenticated;
