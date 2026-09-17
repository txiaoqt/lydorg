-- Migration: 20260918010000_preserve_document_submissions_first_submitted_at.sql
-- Purpose:
-- 1. Preserve public.document_submissions.submitted_at on document resubmission / replacement.
--    In Section 35(b) reporting semantics, an intake application's official receipt event is the
--    FIRST formal submission. Resubmission or replacement after revision requests must NOT overwrite
--    the original receipt timestamp.
-- 2. Cleanly removes legacy OCR column references (ocr_text, ocr_status, ocr_confidence, ocr_metadata)
--    which were dropped in migration 20260911200000_remove_legacy_ocr.sql.

create or replace function public.replace_organization_document_file(
  _file_id uuid,
  _document_type_id uuid,
  _expected_updated_at timestamp with time zone,
  _file_url text,
  _file_name text,
  _file_type text,
  _file_size bigint
)
returns setof public.document_submission_files
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _user_id uuid := auth.uid();
  _file public.document_submission_files%rowtype;
  _submission public.document_submissions%rowtype;
  _organization public.organization_profiles%rowtype;
  _document_name text;
  _submitted_at timestamptz := now();
  _overall_status public.document_submission_status;
begin
  if _user_id is null then
    raise exception 'Please sign in with your organization account first.';
  end if;

  select * into _file
  from public.document_submission_files
  where id = _file_id
  for update;
  if _file.id is null then raise exception 'Document file not found.'; end if;

  select * into _submission from public.document_submissions where id = _file.submission_id;
  select * into _organization from public.organization_profiles where id = _submission.organization_id;

  if _organization.user_id is distinct from _user_id then
    raise exception 'You are not authorized to replace this document.';
  end if;
  if _file.document_type_id is distinct from _document_type_id then
    raise exception 'The selected file does not match this document requirement.';
  end if;
  if _file.admin_status not in ('needs_revision', 'rejected_red') then
    raise exception 'This document is no longer open for correction. Refresh the page to see its current status.';
  end if;
  if _file.updated_at is distinct from _expected_updated_at then
    raise exception 'This document changed after the page was opened. Refresh before uploading again.';
  end if;
  if _file_size <= 0 or _file_size > 10485760 then
    raise exception 'The replacement file must be between 1 byte and 10 MB.';
  end if;
  if nullif(trim(_file_name), '') is null or length(_file_name) > 180
     or _file_name ~ '[\\/[:cntrl:]]' then
    raise exception 'The replacement file name is not allowed.';
  end if;
  if _file_url not like
    'storage://organization-documents/' || _organization.id::text || '/' ||
    _document_type_id::text || '/revisions/%' then
    raise exception 'The replacement file location is not allowed.';
  end if;
  if not (
    lower(_file_name) ~ '\.pdf$'
    or (
      lower(_file_name) ~ '\.(xls|xlsx)$'
      and exists (
        select 1 from public.required_document_types
        where id = _document_type_id
          and lower(name) like '%yorp list of members in good standing%'
      )
    )
  ) then
    raise exception 'The replacement file format is not allowed for this requirement.';
  end if;

  select name into _document_name from public.required_document_types where id = _document_type_id;

  update public.document_submission_files
  set
    revision_history = coalesce(revision_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'resubmitted',
        'previousStatus', _file.admin_status,
        'adminRemarks', coalesce(_file.admin_remarks, ''),
        'reviewedAt', _file.reviewed_at,
        'previousFileName', _file.file_name,
        'previousFileUrl', _file.file_url,
        'previousFileType', _file.file_type,
        'previousFileSize', _file.file_size,
        'uploadedAt', _file.uploaded_at,
        'changedAt', _submitted_at
      )
    ),
    file_url = _file_url,
    file_name = _file_name,
    file_type = coalesce(nullif(trim(_file_type), ''), 'application/octet-stream'),
    file_size = _file_size,
    validation_status = 'correct',
    admin_status = 'under_admin_review',
    admin_remarks = _file.admin_remarks,
    uploaded_at = _submitted_at,
    reviewed_at = null,
    updated_at = _submitted_at
  where id = _file_id;

  select case
    when exists (
      select 1 from public.document_submission_files
      where submission_id = _submission.id and admin_status = 'rejected_red'
    ) then 'rejected_red'::public.document_submission_status
    when exists (
      select 1 from public.document_submission_files
      where submission_id = _submission.id and admin_status = 'needs_revision'
    ) then 'needs_revision'::public.document_submission_status
    when exists (
      select 1 from public.document_submission_files where submission_id = _submission.id
    ) and not exists (
      select 1 from public.document_submission_files
      where submission_id = _submission.id and admin_status <> 'approved_green'
    ) then 'approved_green'::public.document_submission_status
    else 'under_admin_review'::public.document_submission_status
  end into _overall_status;

  -- PRESERVE FIRST FORMAL RECEIPT TIMESTAMP (submitted_at)
  update public.document_submissions
  set status = _overall_status,
      user_confirmed = true,
      submitted_at = coalesce(_submission.submitted_at, _submitted_at),
      reviewed_by = null,
      reviewed_at = null,
      overall_remarks = format('Corrected file resubmitted for %s.', coalesce(_document_name, _file_name)),
      updated_at = _submitted_at
  where id = _submission.id;

  insert into public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) values (
    _user_id, _organization.id, 'Resubmitted Document',
    'document_submission_file', _file_id,
    format('Resubmitted %s after admin review.', coalesce(_document_name, _file_name))
  );

  return query select * from public.document_submission_files where id = _file_id;
end;
$function$;
