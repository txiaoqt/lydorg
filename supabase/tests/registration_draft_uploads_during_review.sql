-- Run against a migrated database. All fixtures and mutations roll back.
begin;

create temp table upload_guard_context as
select id as organization_id, user_id
from public.organization_profiles
where user_id is not null and is_seeded_sample_data is not true
limit 1;

do $$ begin
  if not exists (select 1 from upload_guard_context) then
    raise exception 'An organization account is required for this regression test.';
  end if;
end $$;

create temp table upload_guard_submissions (
  id uuid primary key default gen_random_uuid(),
  scope text,
  status public.document_submission_status
);
insert into upload_guard_submissions (scope, status)
select scope, status::public.document_submission_status
from unnest(array['registration', 'renewal']) scope
cross join unnest(array['draft', 'needs_revision', 'under_admin_review', 'submitted', 'ready_for_review', 'approved_green', 'rejected_red']) status;

insert into public.document_submissions (id, organization_id, submitted_by, submission_scope, status)
select fixture.id, context.organization_id, context.user_id, fixture.scope, fixture.status
from upload_guard_submissions fixture cross join upload_guard_context context;

-- Exercise the actual deployed guard on temporary files. No organization PDFs
-- or their metadata are changed, and parent fixtures exist only in this transaction.
create temp table upload_guard_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid,
  admin_status public.document_submission_status,
  file_name text default 'regression.pdf'
);
create trigger upload_guard_regression
before update or delete on upload_guard_files
for each row execute function public.guard_submitted_registration_document_edits();
create temp table upload_guard_results (test text, passed boolean);
grant select on upload_guard_context, upload_guard_submissions to authenticated;
grant all on upload_guard_files, upload_guard_results to authenticated;

select set_config('request.jwt.claim.sub', user_id::text, true) from upload_guard_context;
select set_config('request.jwt.claims', jsonb_build_object('sub', user_id, 'role', 'authenticated')::text, true) from upload_guard_context;
set local role authenticated;

do $$
declare
  parent record;
  file_status text;
  operation text;
  file_id uuid;
  allowed boolean;
  blocked boolean;
  changed integer;
begin
  if public.current_user_is_admin() then
    raise exception 'This regression test must run as a non-admin organization.';
  end if;
  for parent in select * from upload_guard_submissions loop
    for file_status in select unnest(array['draft', 'under_admin_review', 'approved_green', 'needs_revision', 'rejected_red']) loop
      foreach operation in array array['edit', 'delete', 'submit'] loop
        insert into upload_guard_files (submission_id, admin_status)
        values (parent.id, file_status::public.document_submission_status)
        returning id into file_id;
        allowed := file_status = 'draft' and (
          parent.status::text in ('draft', 'needs_revision') or (
            parent.scope = 'registration' and parent.status::text in ('under_admin_review', 'submitted', 'ready_for_review')
          )
        );
        blocked := false;
        begin
          if operation = 'delete' then
            delete from upload_guard_files where id = file_id;
          elsif operation = 'submit' then
            update upload_guard_files set admin_status = 'under_admin_review' where id = file_id;
          else
            update upload_guard_files set file_name = 'edited.pdf' where id = file_id;
          end if;
        exception when raise_exception then
          if sqlerrm not like 'Submitted documents are locked.%' then raise; end if;
          blocked := true;
        end;
        if blocked = allowed then
          raise exception 'Unexpected guard result for scope %, parent %, file %, operation %', parent.scope, parent.status, file_status, operation;
        end if;
        insert into upload_guard_results values (format('%s/%s/%s/%s', parent.scope, parent.status, file_status, operation), true);
      end loop;
    end loop;
  end loop;

  -- A pending sibling remains locked while multiple drafts finalize together.
  select id into file_id from upload_guard_submissions where scope = 'registration' and status = 'under_admin_review';
  insert into upload_guard_files (submission_id, admin_status) values
    (file_id, 'draft'), (file_id, 'draft'), (file_id, 'under_admin_review');
  update upload_guard_files set admin_status = 'under_admin_review'
  where submission_id = file_id and admin_status = 'draft';
  get diagnostics changed = row_count;
  if changed < 2 then raise exception 'Bulk draft finalization did not update both files.'; end if;
  insert into upload_guard_results values ('bulk draft finalization with pending sibling', true);
end $$;

reset role;
select count(*) as passed_checks, bool_and(passed) as all_passed from upload_guard_results;
rollback;
