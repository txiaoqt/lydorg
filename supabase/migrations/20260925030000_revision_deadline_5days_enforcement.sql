-- Migration: 20260925030000_revision_deadline_5days_enforcement.sql
-- Purpose:
-- 1. Adds authoritative 5-day resubmission deadline columns (revision_requested_at, revision_due_at, revision_locked_at)
--    across all submission/document tables that can enter the 'needs_revision' status:
--      - document_submissions & document_submission_files
--      - organization_renewals
--      - budget_requests
--      - liquidation_reports
--      - ypop_entries
--      - ypop_event_participations
--      - ypop_org_activities
-- 2. Enforces 5-day deadline atomically on Admin revision requests and blocks file replacements / resubmissions
--    after deadline expiration at the server/database layer.
-- 3. Safely backfills active needs_revision records with reliable existing review/update timestamps.

-- ==============================================================================
-- 1. ADD REVISION DEADLINE COLUMNS
-- ==============================================================================

-- Document Submissions
alter table if exists public.document_submissions
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- Document Submission Files
alter table if exists public.document_submission_files
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null;

-- Organization Renewals
alter table if exists public.organization_renewals
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- Budget Requests
alter table if exists public.budget_requests
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- Liquidation Reports
alter table if exists public.liquidation_reports
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- YPOP Entries
alter table if exists public.ypop_entries
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- YPOP Event Participations
alter table if exists public.ypop_event_participations
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- YPOP Org Activities (PPA)
alter table if exists public.ypop_org_activities
  add column if not exists revision_requested_at timestamptz default null,
  add column if not exists revision_due_at timestamptz default null,
  add column if not exists revision_locked_at timestamptz default null;

-- ==============================================================================
-- 2. BACKFILL EXISTING ACTIVE NEEDS_REVISION RECORDS
-- ==============================================================================

update public.document_submissions
set
  revision_requested_at = coalesce(reviewed_at, updated_at),
  revision_due_at = coalesce(reviewed_at, updated_at) + interval '5 days',
  revision_locked_at = case
    when clock_timestamp() > coalesce(reviewed_at, updated_at) + interval '5 days'
    then coalesce(reviewed_at, updated_at) + interval '5 days'
    else null
  end
where status = 'needs_revision'
  and revision_due_at is null
  and coalesce(reviewed_at, updated_at) is not null;

update public.organization_renewals
set
  revision_requested_at = coalesce(reviewed_at, updated_at),
  revision_due_at = coalesce(reviewed_at, updated_at) + interval '5 days',
  revision_locked_at = case
    when clock_timestamp() > coalesce(reviewed_at, updated_at) + interval '5 days'
    then coalesce(reviewed_at, updated_at) + interval '5 days'
    else null
  end
where status = 'needs_revision'
  and revision_due_at is null
  and coalesce(reviewed_at, updated_at) is not null;

update public.budget_requests
set
  revision_requested_at = updated_at,
  revision_due_at = updated_at + interval '5 days',
  revision_locked_at = case
    when clock_timestamp() > updated_at + interval '5 days'
    then updated_at + interval '5 days'
    else null
  end
where status = 'needs_revision'
  and revision_due_at is null
  and updated_at is not null;

update public.liquidation_reports
set
  revision_requested_at = updated_at,
  revision_due_at = updated_at + interval '5 days',
  revision_locked_at = case
    when clock_timestamp() > updated_at + interval '5 days'
    then updated_at + interval '5 days'
    else null
  end
where status = 'needs_revision'
  and revision_due_at is null
  and updated_at is not null;

update public.ypop_event_participations
set
  revision_requested_at = updated_at,
  revision_due_at = updated_at + interval '5 days',
  revision_locked_at = case
    when clock_timestamp() > updated_at + interval '5 days'
    then updated_at + interval '5 days'
    else null
  end
where status = 'needs_revision'
  and revision_due_at is null
  and updated_at is not null;

update public.ypop_org_activities
set
  revision_requested_at = updated_at,
  revision_due_at = updated_at + interval '5 days',
  revision_locked_at = case
    when clock_timestamp() > updated_at + interval '5 days'
    then updated_at + interval '5 days'
    else null
  end
where status = 'needs_revision'
  and revision_due_at is null
  and updated_at is not null;

-- ==============================================================================
-- 3. HARDEN ADMIN DOCUMENT REVIEW RPC (5-Day Revision Deadline)
-- ==============================================================================

create or replace function public.update_admin_document_submission_file_review(
  _session_token text,
  _file_id uuid,
  _status public.document_submission_status,
  _admin_remarks text default null
)
returns setof public.document_submission_files
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
  _submission_id uuid;
  _renewal_id uuid;
  _org_id uuid;
  _document_name text;
  _overall_status public.document_submission_status;
  _overall_remarks text;
begin
  -- Validate admin session
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  -- Resolve file, submission, organization, and document type name
  select
    document_submission_files.submission_id,
    coalesce(required_document_types.name, document_submission_files.file_name)
  into _submission_id, _document_name
  from public.document_submission_files
  left join public.required_document_types
    on required_document_types.id = document_submission_files.document_type_id
  where document_submission_files.id = _file_id
  limit 1;

  if _submission_id is null then
    raise exception 'Document submission file was not found.';
  end if;

  -- Resolve parent submission details
  select ds.organization_id, ds.renewal_id
  into _org_id, _renewal_id
  from public.document_submissions ds
  where ds.id = _submission_id;

  -- Update the individual document file review record
  update public.document_submission_files
  set
    admin_status = _status,
    admin_remarks = coalesce(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    revision_requested_at = case when _status in ('needs_revision', 'rejected_red') then _reviewed_at else null end,
    revision_due_at = case when _status in ('needs_revision', 'rejected_red') then _revision_due else null end,
    updated_at = _reviewed_at
  where document_submission_files.id = _file_id;

  -- If parent submission is tied to a renewal packet, handle renewal state transition
  if _renewal_id is not null then
    update public.organization_renewals
    set
      status = case when _status in ('needs_revision', 'rejected_red') then 'needs_revision'::public.renewal_application_status else 'under_review'::public.renewal_application_status end,
      admin_remarks = case when _status in ('needs_revision', 'rejected_red') then coalesce(_admin_remarks, organization_renewals.admin_remarks) else organization_renewals.admin_remarks end,
      reviewed_by = _admin_id,
      reviewed_at = _reviewed_at,
      revision_requested_at = case when _status in ('needs_revision', 'rejected_red') then _reviewed_at else organization_renewals.revision_requested_at end,
      revision_due_at = case when _status in ('needs_revision', 'rejected_red') then _revision_due else organization_renewals.revision_due_at end,
      revision_locked_at = case when _status in ('needs_revision', 'rejected_red') then null else organization_renewals.revision_locked_at end,
      updated_at = _reviewed_at
    where id = _renewal_id;
  end if;

  -- Recompute overall parent submission status
  select
    case
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
          and admin_status = 'rejected_red'
      ) then 'rejected_red'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
          and admin_status = 'needs_revision'
      ) then 'needs_revision'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
      ) and not exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
          and admin_status <> 'approved_green'
      ) then 'approved_green'::public.document_submission_status
      else 'under_admin_review'::public.document_submission_status
    end
  into _overall_status;

  _overall_remarks :=
    case
      when _status = 'approved_green' then format('Admin approved %s.', _document_name)
      when _status = 'needs_revision' then format('Admin requested revisions for %s.', _document_name)
      else format('Admin rejected %s.', _document_name)
    end;

  update public.document_submissions
  set
    status = _overall_status,
    reviewed_by = _admin_id,
    reviewed_at = _reviewed_at,
    overall_remarks = _overall_remarks,
    revision_requested_at = case when _overall_status in ('needs_revision', 'rejected_red') then _reviewed_at else null end,
    revision_due_at = case when _overall_status in ('needs_revision', 'rejected_red') then _revision_due else null end,
    revision_locked_at = case when _overall_status in ('needs_revision', 'rejected_red') then null else null end,
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id;

  -- AUTOMATIC REGISTRATION VERIFICATION TRIGGER
  if _renewal_id is null and _status = 'approved_green' and _org_id is not null then
    perform public.evaluate_and_apply_automatic_registration_verification(_org_id, _admin_id);
  end if;

  return query
  select *
  from public.document_submission_files
  where document_submission_files.id = _file_id;
end;
$$;

grant execute on function public.update_admin_document_submission_file_review(text, uuid, public.document_submission_status, text) to anon, authenticated, service_role;

-- ==============================================================================
-- 4. HARDEN DOCUMENT REPLACEMENT RPC (Server-Side Deadline Lock)
-- ==============================================================================

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
  _submitted_at timestamptz := clock_timestamp();
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

  select * into _submission from public.document_submissions where id = _file.submission_id for update;
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

  -- AUTHORITATIVE SERVER-SIDE DEADLINE ENFORCEMENT
  if _submission.revision_due_at is not null and _submitted_at >= _submission.revision_due_at then
    update public.document_submissions
    set revision_locked_at = coalesce(revision_locked_at, _submitted_at)
    where id = _submission.id;

    raise exception 'Revision deadline has expired. This submission is locked and can no longer be resubmitted.';
  end if;

  if _file.revision_due_at is not null and _submitted_at >= _file.revision_due_at then
    raise exception 'Revision deadline has expired. This submission is locked and can no longer be resubmitted.';
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
        'changedAt', _submitted_at,
        'revisionDueAt', _file.revision_due_at
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
    revision_requested_at = null,
    revision_due_at = null,
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
      revision_requested_at = case when _overall_status = 'needs_revision' then revision_requested_at else null end,
      revision_due_at = case when _overall_status = 'needs_revision' then revision_due_at else null end,
      revision_locked_at = null,
      updated_at = _submitted_at
  where id = _submission.id;

  insert into public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) values (
    _user_id, _organization.id, 'Resubmitted Document',
    'document_submission_file', _file_id,
    format('Resubmitted %s after admin review.', coalesce(_document_name, _file_name))
  );

  return query
  select *
  from public.document_submission_files
  where document_submission_files.id = _file_id;
end;
$function$;

grant execute on function public.replace_organization_document_file(uuid, uuid, timestamp with time zone, text, text, text, bigint) to authenticated, service_role;

-- ==============================================================================
-- 5. HARDEN RENEWAL RESUBMIT RPC (Server-Side Deadline Lock)
-- ==============================================================================

create or replace function public.user_resubmit_renewal_application(
  p_renewal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _org_id uuid;
  _renewal public.organization_renewals%rowtype;
  _now timestamptz := clock_timestamp();
begin
  if _user_id is null then
    raise exception 'Please sign in first.';
  end if;

  select * into _renewal
  from public.organization_renewals
  where id = p_renewal_id
  for update;

  if _renewal.id is null then
    raise exception 'Renewal application not found.';
  end if;

  select id into _org_id
  from public.organization_profiles
  where user_id = _user_id and id = _renewal.organization_id;

  if _org_id is null then
    raise exception 'You are not authorized to resubmit this renewal application.';
  end if;

  if _renewal.status <> 'needs_revision' then
    raise exception 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  end if;

  -- AUTHORITATIVE SERVER-SIDE DEADLINE ENFORCEMENT
  if _renewal.revision_due_at is not null and _now >= _renewal.revision_due_at then
    update public.organization_renewals
    set revision_locked_at = coalesce(revision_locked_at, _now)
    where id = p_renewal_id;

    raise exception 'Revision deadline has expired. This renewal is locked and can no longer be resubmitted.';
  end if;

  -- Ensure all files are in under_admin_review or approved_green (no pending revision files)
  if exists (
    select 1
    from public.document_submissions ds
    join public.document_submission_files dsf on dsf.submission_id = ds.id
    where ds.renewal_id = p_renewal_id
      and dsf.admin_status in ('needs_revision', 'rejected_red')
  ) then
    raise exception 'Please replace all files marked for revision before resubmitting.';
  end if;

  -- Update renewal state
  update public.organization_renewals
  set
    status = 'resubmitted',
    submitted_at = _now,
    reviewed_by = null,
    reviewed_at = null,
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked_at = null,
    updated_at = _now
  where id = p_renewal_id;

  -- Update document submissions packet
  update public.document_submissions
  set
    status = 'under_admin_review',
    reviewed_by = null,
    reviewed_at = null,
    overall_remarks = 'Renewal packet resubmitted for admin review.',
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked_at = null,
    updated_at = _now
  where renewal_id = p_renewal_id;

  -- Insert activity log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    _user_id,
    _org_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id::text,
    format('Organization resubmitted renewal application for Cycle %s.', _renewal.cycle_number)
  );

  return jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'resubmitted'
  );
end;
$$;

grant execute on function public.user_resubmit_renewal_application(uuid) to authenticated, service_role;
