-- Enforce document-submission and liquidation attachment workflow rules at the
-- database boundary. Client-side controls are intentionally duplicated here so
-- direct PostgREST requests cannot replace or remove files under review.

create or replace function public.enforce_document_submission_file_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _submission_id uuid;
  _submission_status text;
  _organization_id uuid;
begin
  _submission_id := case when tg_op = 'DELETE' then old.submission_id else new.submission_id end;

  select ds.status::text, ds.organization_id
  into _submission_status, _organization_id
  from public.document_submissions ds
  where ds.id = _submission_id;

  -- Admin review RPCs use the custom admin session and are not tied to the
  -- organization owner in auth.users. Keep their existing review flow intact.
  if auth.uid() is null or not exists (
    select 1
    from public.organization_profiles op
    where op.id = _organization_id and op.user_id = auth.uid()
  ) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if _submission_status not in ('draft', 'needs_revision', 'rejected_red') then
    raise exception 'Document files are locked while the submission is under admin review.';
  end if;

  if tg_op <> 'DELETE' and (new.file_type <> 'application/pdf' or right(lower(new.file_name), 4) <> '.pdf') then
    raise exception 'Only PDF files may be attached to a document submission.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists document_submission_files_workflow_guard on public.document_submission_files;
create trigger document_submission_files_workflow_guard
before insert or update or delete on public.document_submission_files
for each row execute function public.enforce_document_submission_file_workflow();

create or replace function public.enforce_document_submission_status_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.organization_profiles op
    where op.id = new.organization_id and op.user_id = auth.uid()
  ) then
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status::text not in ('draft', 'needs_revision', 'rejected_red')
       or new.status::text not in ('draft', 'under_admin_review') then
      raise exception 'Only an administrator can reopen or change a submitted document workflow status.';
    end if;

    if new.status::text = 'under_admin_review' and not exists (
      select 1
      from public.document_submission_files dsf
      where dsf.submission_id = new.id
        and dsf.file_type = 'application/pdf'
        and right(lower(dsf.file_name), 4) = '.pdf'
    ) then
      raise exception 'Attach a PDF before submitting documents for review.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists document_submissions_workflow_guard on public.document_submissions;
create trigger document_submissions_workflow_guard
before update on public.document_submissions
for each row execute function public.enforce_document_submission_status_workflow();

create or replace function public.enforce_liquidation_file_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _report_id uuid;
  _report_status text;
  _organization_id uuid;
begin
  _report_id := case when tg_op = 'DELETE' then old.liquidation_report_id else new.liquidation_report_id end;

  select lr.status::text, lr.organization_id
  into _report_status, _organization_id
  from public.liquidation_reports lr
  where lr.id = _report_id;

  if auth.uid() is null or not exists (
    select 1
    from public.organization_profiles op
    where op.id = _organization_id and op.user_id = auth.uid()
  ) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if _report_status not in ('pending_activity_completion', 'not_started', 'draft', 'needs_revision', 'overdue', 'rejected_red') then
    raise exception 'Liquidation files are locked while the submission is under review.';
  end if;

  if tg_op <> 'DELETE' and (new.file_type <> 'application/pdf' or right(lower(new.file_name), 4) <> '.pdf') then
    raise exception 'Only PDF files may be attached to a liquidation submission.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists liquidation_report_files_workflow_guard on public.liquidation_report_files;
create trigger liquidation_report_files_workflow_guard
before insert or update or delete on public.liquidation_report_files
for each row execute function public.enforce_liquidation_file_workflow();

create or replace function public.enforce_liquidation_status_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_owner boolean;
begin
  select exists (
    select 1
    from public.organization_profiles op
    where op.id = new.organization_id and op.user_id = auth.uid()
  ) into _is_owner;

  if _is_owner and new.status is distinct from old.status then
    if old.status::text not in ('pending_activity_completion', 'not_started', 'draft', 'needs_revision', 'overdue', 'rejected_red')
       or new.status::text <> 'submitted' then
      raise exception 'Only an administrator can change this liquidation workflow status.';
    end if;
  end if;

  if new.status is distinct from old.status
     and new.status::text in ('submitted', 'under_review', 'approved_for_ftf_green', 'hard_copy_submitted', 'completed_liquidated')
     and not exists (
       select 1
       from public.liquidation_report_files lrf
       where lrf.liquidation_report_id = new.id
         and lrf.file_type = 'application/pdf'
         and right(lower(lrf.file_name), 4) = '.pdf'
     ) then
    raise exception 'Attach a PDF before submitting or advancing this liquidation report.';
  end if;

  return new;
end;
$$;

drop trigger if exists liquidation_reports_workflow_guard on public.liquidation_reports;
create trigger liquidation_reports_workflow_guard
before update on public.liquidation_reports
for each row execute function public.enforce_liquidation_status_workflow();
