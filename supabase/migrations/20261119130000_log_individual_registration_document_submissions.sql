-- Registration activity only recorded the batch submission. Log each document an
-- organization sends for review: a new upload, or a draft sent for review.
-- Corrected uploads (needs_revision -> review) already log 'Replaced document'.
create or replace function public.log_registration_document_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _submission public.document_submissions%rowtype;
  _document_name text;
begin
  if new.admin_status <> 'under_admin_review' then return new; end if;
  if tg_op = 'UPDATE' and old.admin_status is distinct from 'draft' then return new; end if;

  select * into _submission from public.document_submissions where id = new.submission_id;
  if not found
     or coalesce(_submission.submission_scope, 'registration') <> 'registration'
     or coalesce(_submission.is_seeded_sample_data, false) then
    return new;
  end if;

  select name into _document_name from public.required_document_types where id = new.document_type_id;

  -- actor_user_id references admin_accounts; keep the organization actor in metadata.
  insert into public.activity_logs (actor_user_id, organization_id, action, related_type, related_id, description, metadata)
  values (
    null,
    _submission.organization_id,
    'Submitted document',
    'document_submission_file',
    new.id,
    format('Submitted %s for review.', coalesce(_document_name, new.file_name)),
    jsonb_build_object('actor_auth_user_id', auth.uid(), 'actor_type', 'organization')
  );
  return new;
end;
$$;

revoke all on function public.log_registration_document_submitted() from public, anon, authenticated;

drop trigger if exists trg_log_registration_document_submitted on public.document_submission_files;
create trigger trg_log_registration_document_submitted
  after insert or update of admin_status on public.document_submission_files
  for each row execute function public.log_registration_document_submitted();
