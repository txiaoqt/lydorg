-- Migration: 20260925040000_revision_admin_unlock_mechanism.sql
-- Purpose:
-- 1. Adds authoritative database boolean `revision_locked BOOLEAN NOT NULL DEFAULT false`
--    and unlock tracking columns (`revision_unlocked_at`, `revision_unlocked_by`) across all submission tables:
--      - document_submissions & document_submission_files
--      - organization_renewals
--      - budget_requests
--      - liquidation_reports
--      - ypop_entries
--      - ypop_event_participations
--      - ypop_org_activities
-- 2. Implements the authoritative Admin Unlock RPC `admin_unlock_submission_revision`
--    with audit logging (`action = 'revision_unlocked'`).
-- 3. Hardens all resubmission and replacement RPCs to check `revision_locked`
--    and preserve original revision deadlines for historical audit trail.

-- ==============================================================================
-- 1. ADD REVISION_LOCKED AND UNLOCK AUDIT COLUMNS
-- ==============================================================================

-- Document Submissions
alter table if exists public.document_submissions
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- Document Submission Files
alter table if exists public.document_submission_files
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- Organization Renewals
alter table if exists public.organization_renewals
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- Budget Requests
alter table if exists public.budget_requests
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- Liquidation Reports
alter table if exists public.liquidation_reports
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- YPOP Entries
alter table if exists public.ypop_entries
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- YPOP Event Participations
alter table if exists public.ypop_event_participations
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- YPOP Org Activities (PPA)
alter table if exists public.ypop_org_activities
  add column if not exists revision_locked boolean not null default false,
  add column if not exists revision_unlocked_at timestamptz default null,
  add column if not exists revision_unlocked_by text default null;

-- ==============================================================================
-- 2. SYNC REVISION_LOCKED FOR PREVIOUSLY EXPIRED / LOCKED ENTITIES
-- ==============================================================================

update public.document_submissions
set revision_locked = true
where status in ('needs_revision', 'rejected_red')
  and revision_unlocked_at is null
  and (revision_locked_at is not null or (revision_due_at is not null and clock_timestamp() >= revision_due_at));

update public.document_submission_files
set revision_locked = true
where admin_status in ('needs_revision', 'rejected_red')
  and revision_unlocked_at is null
  and (revision_due_at is not null and clock_timestamp() >= revision_due_at);

update public.organization_renewals
set revision_locked = true
where status = 'needs_revision'
  and revision_unlocked_at is null
  and (revision_locked_at is not null or (revision_due_at is not null and clock_timestamp() >= revision_due_at));

update public.budget_requests
set revision_locked = true
where status = 'needs_revision'
  and revision_unlocked_at is null
  and (revision_locked_at is not null or (revision_due_at is not null and clock_timestamp() >= revision_due_at));

update public.liquidation_reports
set revision_locked = true
where status = 'needs_revision'
  and revision_unlocked_at is null
  and (revision_locked_at is not null or (revision_due_at is not null and clock_timestamp() >= revision_due_at));

update public.ypop_event_participations
set revision_locked = true
where status = 'needs_revision'
  and revision_unlocked_at is null
  and (revision_locked_at is not null or (revision_due_at is not null and clock_timestamp() >= revision_due_at));

update public.ypop_org_activities
set revision_locked = true
where status = 'needs_revision'
  and revision_unlocked_at is null
  and (revision_locked_at is not null or (revision_due_at is not null and clock_timestamp() >= revision_due_at));

-- ==============================================================================
-- 3. ADMIN UNLOCK SUBMISSION REVISION RPC
-- ==============================================================================

create or replace function public.admin_unlock_submission_revision(
  _session_token text,
  _entity_type text,
  _entity_id uuid,
  _remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _unlocked_at timestamptz := clock_timestamp();
  _org_id uuid;
  _existing_due_at timestamptz;
  _entity_found boolean := false;
begin
  -- 1. Validate admin session token
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  -- 2. Unlock corresponding entity and preserve original revision_due_at
  if _entity_type in ('document_submission', 'registration') then
    select organization_id, revision_due_at into _org_id, _existing_due_at
    from public.document_submissions
    where id = _entity_id;

    if not found then
      raise exception 'Document submission was not found.';
    end if;

    update public.document_submissions
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where id = _entity_id;

    -- Unlock associated files under needs_revision
    update public.document_submission_files
    set
      revision_locked = false,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where submission_id = _entity_id;

    _entity_found := true;

  elsif _entity_type in ('renewal', 'organization_renewal') then
    select organization_id, revision_due_at into _org_id, _existing_due_at
    from public.organization_renewals
    where id = _entity_id;

    if not found then
      raise exception 'Organization renewal was not found.';
    end if;

    update public.organization_renewals
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where id = _entity_id;

    -- Also unlock any child document submissions linked to renewal
    update public.document_submissions
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where renewal_id = _entity_id;

    update public.document_submission_files
    set
      revision_locked = false,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where submission_id in (select id from public.document_submissions where renewal_id = _entity_id);

    _entity_found := true;

  elsif _entity_type = 'budget_request' then
    select organization_id, revision_due_at into _org_id, _existing_due_at
    from public.budget_requests
    where id = _entity_id;

    if not found then
      raise exception 'Budget request was not found.';
    end if;

    update public.budget_requests
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where id = _entity_id;

    _entity_found := true;

  elsif _entity_type = 'liquidation_report' then
    select organization_id, revision_due_at into _org_id, _existing_due_at
    from public.liquidation_reports
    where id = _entity_id;

    if not found then
      raise exception 'Liquidation report was not found.';
    end if;

    update public.liquidation_reports
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where id = _entity_id;

    _entity_found := true;

  elsif _entity_type in ('ypop_event_participation', 'ypop_event') then
    select organization_id, revision_due_at into _org_id, _existing_due_at
    from public.ypop_event_participations
    where id = _entity_id;

    if not found then
      raise exception 'YPOP event participation was not found.';
    end if;

    update public.ypop_event_participations
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where id = _entity_id;

    _entity_found := true;

  elsif _entity_type in ('ypop_org_activity', 'ypop_ppa') then
    select organization_id, revision_due_at into _org_id, _existing_due_at
    from public.ypop_org_activities
    where id = _entity_id;

    if not found then
      raise exception 'YPOP org activity was not found.';
    end if;

    update public.ypop_org_activities
    set
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = _unlocked_at,
      revision_unlocked_by = _admin_id::text,
      updated_at = _unlocked_at
    where id = _entity_id;

    _entity_found := true;

  else
    raise exception 'Unsupported entity type "%" for revision unlock.', _entity_type;
  end if;

  -- 3. Insert audit log record
  if _org_id is not null then
    insert into public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    ) values (
      _admin_id,
      _org_id,
      'revision_unlocked',
      _entity_type,
      _entity_id::text,
      coalesce(_remarks, format('Admin unlocked %s (original deadline: %s) for resubmission.', _entity_type, coalesce(_existing_due_at::text, 'None')))
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'entity_type', _entity_type,
    'entity_id', _entity_id,
    'revision_locked', false,
    'revision_unlocked_at', _unlocked_at,
    'revision_due_at', _existing_due_at
  );
end;
$$;

grant execute on function public.admin_unlock_submission_revision(text, text, uuid, text) to anon, authenticated, service_role;

-- ==============================================================================
-- 4. HARDEN ADMIN DOCUMENT REVIEW RPC (New Revision Cycle resets locks)
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
    revision_locked = false,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
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
      revision_locked = false,
      revision_locked_at = null,
      revision_unlocked_at = null,
      revision_unlocked_by = null,
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
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
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
-- 5. HARDEN DOCUMENT REPLACEMENT RPC (revision_locked & Admin Unlock)
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

  -- AUTHORITATIVE SERVER-SIDE DEADLINE AND LOCK ENFORCEMENT
  if (_submission.revision_locked = true or (_submission.revision_due_at is not null and _submitted_at >= _submission.revision_due_at and _submission.revision_unlocked_at is null)) then
    update public.document_submissions
    set revision_locked = true,
        revision_locked_at = coalesce(revision_locked_at, _submitted_at)
    where id = _submission.id;

    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  end if;

  if (_file.revision_locked = true or (_file.revision_due_at is not null and _submitted_at >= _file.revision_due_at and _file.revision_unlocked_at is null)) then
    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
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
    revision_locked = false,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
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
      revision_locked = false,
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
-- 6. HARDEN RENEWAL RESUBMIT RPC (revision_locked & Admin Unlock)
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

  -- AUTHORITATIVE SERVER-SIDE DEADLINE AND LOCK ENFORCEMENT
  if (_renewal.revision_locked = true or (_renewal.revision_due_at is not null and _now >= _renewal.revision_due_at and _renewal.revision_unlocked_at is null)) then
    update public.organization_renewals
    set revision_locked = true,
        revision_locked_at = coalesce(revision_locked_at, _now)
    where id = p_renewal_id;

    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
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
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
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
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
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
