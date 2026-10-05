-- Direct organization writes may edit drafts only. Reviewed corrections use
-- replace_organization_document_file, which checks status, ownership and deadlines.
create or replace function public.guard_submitted_registration_document_edits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  _submission_status text;
begin
  -- Admin and correction RPCs run with their validated definer privileges.
  if current_user not in ('authenticated', 'anon')
     or public.current_user_is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select ds.status into _submission_status
  from public.document_submissions ds
  where ds.id = old.submission_id
  for update;

  if old.admin_status <> 'draft'
     or _submission_status is null
     or _submission_status not in ('draft', 'needs_revision') then
    raise exception 'Submitted documents are locked. Only draft documents can be edited or removed; requested revisions must use the replacement flow.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.guard_submitted_registration_document_edits() from public, anon, authenticated;
create trigger trg_guard_submitted_registration_document_edits
before update or delete on public.document_submission_files
for each row execute function public.guard_submitted_registration_document_edits();
