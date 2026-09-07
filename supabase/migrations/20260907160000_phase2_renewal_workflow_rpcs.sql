-- ==============================================================================
-- Migration: 20260907160000_phase2_renewal_workflow_rpcs.sql
-- Description: Phase 2 of Y-TRACE Renewal & Accreditation Architecture
-- 
-- 1. Schema Extensions for Scoped Document Requirements & Packets
--    - public.required_document_types (scope: 'registration' | 'renewal' | 'both')
--    - public.document_submissions (submission_scope, renewal_id)
-- 2. User RPC: user_start_or_get_renewal_draft (SECURITY INVOKER)
-- 3. User RPC: user_submit_renewal (SECURITY INVOKER)
-- 4. User RPC: user_resubmit_renewal (SECURITY INVOKER)
-- 5. User Helper: user_replace_document_submission_file (SECURITY INVOKER)
-- 6. Admin Review Transition in update_admin_document_submission_file_review
-- 7. Admin RPC: admin_request_renewal_revision (SECURITY DEFINER)
-- 8. Admin RPC: admin_reject_renewal (SECURITY DEFINER)
-- 9. Admin RPC: admin_approve_renewal (SECURITY DEFINER - Atomic Transaction)
-- 10. Notification Evaluator: evaluate_accreditation_notification_events
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA EXTENSIONS
-- ------------------------------------------------------------------------------

-- Add scope column to required_document_types if not present
alter table public.required_document_types
  add column if not exists scope text not null default 'both'
  check (scope in ('registration', 'renewal', 'both'));

comment on column public.required_document_types.scope is
  'Lifecycle scope of document requirement: registration (initial only), renewal (renewal packets only), or both (both lifecycles).';

-- Add submission_scope and renewal_id to document_submissions
alter table public.document_submissions
  add column if not exists submission_scope text not null default 'registration'
  check (submission_scope in ('registration', 'renewal')),
  add column if not exists renewal_id uuid references public.organization_renewals(id) on delete set null;

comment on column public.document_submissions.submission_scope is
  'Packet scope: registration (initial packet) or renewal (re-accreditation packet).';

comment on column public.document_submissions.renewal_id is
  'References the parent organization_renewals cycle row when submission_scope is renewal.';

create index if not exists idx_document_submissions_renewal_id
  on public.document_submissions (renewal_id);

create unique index if not exists uq_document_submissions_single_renewal
  on public.document_submissions (renewal_id)
  where renewal_id is not null;

-- ------------------------------------------------------------------------------
-- 2. DOCUMENT REPLACEMENT HELPER (Preserves historical evidence in revision_history)
-- ------------------------------------------------------------------------------

create or replace function public.user_replace_document_submission_file(
  _file_id uuid,
  _new_file_url text,
  _new_file_name text,
  _new_file_type text,
  _new_file_size numeric default null
)
returns public.document_submission_files
language plpgsql
security invoker
as $$
declare
  _old_file record;
  _submission record;
  _owner_id uuid;
  _history jsonb;
  _history_entry jsonb;
  _updated_row public.document_submission_files;
begin
  select * into _old_file
  from public.document_submission_files
  where id = _file_id;

  if _old_file.id is null then
    raise exception 'Document file not found.';
  end if;

  select * into _submission
  from public.document_submissions
  where id = _old_file.submission_id;

  if _submission.id is null then
    raise exception 'Parent document submission not found.';
  end if;

  select user_id into _owner_id
  from public.organization_profiles
  where id = _submission.organization_id;

  if _owner_id <> auth.uid() then
    raise exception 'Unauthorized: Caller does not own this submission.';
  end if;

  -- Build history entry preserving historical evidence
  _history_entry := jsonb_build_object(
    'action', 'replaced',
    'previousFileName', _old_file.file_name,
    'previousFileUrl', _old_file.file_url,
    'previousFileType', _old_file.file_type,
    'previousFileSize', _old_file.file_size,
    'previousStatus', _old_file.admin_status,
    'adminRemarks', _old_file.admin_remarks,
    'reviewedAt', _old_file.reviewed_at,
    'replacedAt', clock_timestamp()
  );

  _history := coalesce(_old_file.revision_history, '[]'::jsonb) || jsonb_build_array(_history_entry);

  update public.document_submission_files
  set
    file_url = _new_file_url,
    file_name = _new_file_name,
    file_type = _new_file_type,
    file_size = coalesce(_new_file_size, _old_file.file_size),
    admin_status = 'submitted',
    admin_remarks = null,
    reviewed_at = null,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  where id = _file_id
  returning * into _updated_row;

  return _updated_row;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. USER RPC: START / GET RENEWAL DRAFT
-- ------------------------------------------------------------------------------

create or replace function public.user_start_or_get_renewal_draft(
  p_organization_id uuid
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  _caller_id uuid;
  _profile record;
  _curr_acc record;
  _existing_renewal record;
  _submission record;
  _today date := current_date;
  _end_date date;
  _target_cycle integer;
  _new_renewal record;
  _new_submission record;
begin
  _caller_id := auth.uid();
  if _caller_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  -- Lock organization profile to serialize draft creation
  select op.id, op.user_id, op.profile_status, op.current_accreditation_id, op.accreditation_expires_at
  into _profile
  from public.organization_profiles op
  where op.id = p_organization_id
  for update;

  if _profile.id is null then
    raise exception 'Organization profile not found.';
  end if;

  if _profile.user_id <> _caller_id then
    raise exception 'Unauthorized: Caller does not own this organization.';
  end if;

  if _profile.profile_status <> 'verified' then
    raise exception 'Organization must have verified profile status to initiate renewal.';
  end if;

  -- Resolve authoritative accreditation term
  select oa.*
  into _curr_acc
  from public.organization_accreditations oa
  where oa.id = _profile.current_accreditation_id
    and oa.organization_id = p_organization_id
  limit 1;

  if _curr_acc.id is null then
    select oa.*
    into _curr_acc
    from public.organization_accreditations oa
    where oa.organization_id = p_organization_id
      and oa.status = 'active'
    order by oa.term_number desc
    limit 1;
  end if;

  if _curr_acc.id is null then
    raise exception 'No authoritative accreditation term found for this organization.';
  end if;

  if _curr_acc.status = 'revoked' then
    raise exception 'Accreditation has been revoked. Organization cannot renew and must contact LYDO.';
  end if;

  _end_date := _curr_acc.end_date;

  -- Verify renewal window: [end_date - 90 days, end_date + 180 days]
  if _today < (_end_date - 90) then
    raise exception 'Renewal window is not yet open. Renewals open 90 days prior to expiration (on %).', (_end_date - 90);
  end if;

  if _today > (_end_date + 180) then
    raise exception 'Late renewal window has expired (180 days past expiration). Full re-registration is required.';
  end if;

  -- Check if a non-terminal renewal is already in progress
  select *
  into _existing_renewal
  from public.organization_renewals
  where organization_id = p_organization_id
    and status in ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted')
  order by cycle_number desc
  limit 1;

  if _existing_renewal.id is not null then
    select * into _submission
    from public.document_submissions
    where renewal_id = _existing_renewal.id
    limit 1;

    return jsonb_build_object(
      'renewal', row_to_json(_existing_renewal),
      'submission', row_to_json(_submission),
      'is_existing', true
    );
  end if;

  -- Calculate target cycle number (strictly current_term.term_number + 1)
  _target_cycle := _curr_acc.term_number + 1;

  -- Verify no terminal rejected renewal exists for this cycle
  if exists (
    select 1 from public.organization_renewals
    where organization_id = p_organization_id
      and cycle_number = _target_cycle
      and status = 'rejected'
  ) then
    raise exception 'Renewal application for Cycle % was rejected. Organization must contact LYDO directly.', _target_cycle;
  end if;

  if exists (
    select 1 from public.organization_renewals
    where organization_id = p_organization_id
      and cycle_number = _target_cycle
      and status = 'approved'
  ) then
    raise exception 'Cycle % is already approved.', _target_cycle;
  end if;

  -- Create single draft renewal application
  insert into public.organization_renewals (
    organization_id,
    cycle_number,
    current_accreditation_id,
    status
  ) values (
    p_organization_id,
    _target_cycle,
    _curr_acc.id,
    'draft'
  ) returning * into _new_renewal;

  -- Create single linked document submission packet
  insert into public.document_submissions (
    organization_id,
    submitted_by,
    status,
    user_confirmed,
    submission_scope,
    renewal_id
  ) values (
    p_organization_id,
    _caller_id,
    'draft',
    false,
    'renewal',
    _new_renewal.id
  ) returning * into _new_submission;

  return jsonb_build_object(
    'renewal', row_to_json(_new_renewal),
    'submission', row_to_json(_new_submission),
    'is_existing', false
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. USER RPC: SUBMIT RENEWAL
-- ------------------------------------------------------------------------------

create or replace function public.user_submit_renewal(
  p_renewal_id uuid
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _req_type record;
  _now timestamptz := clock_timestamp();
begin
  select * into _renewal
  from public.organization_renewals
  where id = p_renewal_id
  for update;

  if _renewal.id is null then
    raise exception 'Renewal application not found.';
  end if;

  select op.user_id into _owner_id
  from public.organization_profiles op
  where op.id = _renewal.organization_id;

  if _owner_id <> auth.uid() then
    raise exception 'Unauthorized: Caller does not own this organization.';
  end if;

  if _renewal.status <> 'draft' then
    raise exception 'Renewal cannot be submitted from status "%". Expected "draft".', _renewal.status;
  end if;

  -- Check late renewal cutoff (180 days past expiration)
  select oa.end_date into _end_date
  from public.organization_accreditations oa
  where oa.id = _renewal.current_accreditation_id;

  if current_date > (_end_date + 180) then
    raise exception 'Late renewal cutoff has passed (180 days past expiration). Application can no longer be submitted.';
  end if;

  -- Fetch and lock document submission packet
  select * into _submission
  from public.document_submissions
  where renewal_id = p_renewal_id
  for update;

  if _submission.id is null then
    raise exception 'No document submission packet found for this renewal.';
  end if;

  -- Verify all mandatory renewal documents have valid uploaded files
  for _req_type in
    select rdt.id, rdt.name
    from public.required_document_types rdt
    where rdt.is_active = true
      and coalesce(rdt.is_required, true) = true
      and rdt.scope in ('renewal', 'both')
      and rdt.template_scope = 'document_submission'
  loop
    if not exists (
      select 1
      from public.document_submission_files dsf
      where dsf.submission_id = _submission.id
        and dsf.document_type_id = _req_type.id
        and nullif(trim(dsf.file_url), '') is not null
    ) then
      raise exception 'Missing required document: %', _req_type.name;
    end if;
  end loop;

  -- Advance renewal status to submitted
  update public.organization_renewals
  set
    status = 'submitted',
    submitted_at = _now,
    updated_at = _now
  where id = p_renewal_id;

  -- Advance document submission status to submitted
  update public.document_submissions
  set
    status = 'submitted',
    submitted_at = _now,
    updated_at = _now
  where id = _submission.id;

  -- Insert activity log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    auth.uid(),
    _renewal.organization_id,
    'renewal_submitted',
    'renewal',
    p_renewal_id::text,
    format('Organization submitted renewal application for Cycle %s.', _renewal.cycle_number)
  );

  return jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'submitted_at', _now
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. USER RPC: RESUBMIT RENEWAL
-- ------------------------------------------------------------------------------

create or replace function public.user_resubmit_renewal(
  p_renewal_id uuid
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
begin
  select * into _renewal
  from public.organization_renewals
  where id = p_renewal_id
  for update;

  if _renewal.id is null then
    raise exception 'Renewal application not found.';
  end if;

  select op.user_id into _owner_id
  from public.organization_profiles op
  where op.id = _renewal.organization_id;

  if _owner_id <> auth.uid() then
    raise exception 'Unauthorized: Caller does not own this organization.';
  end if;

  if _renewal.status <> 'needs_revision' then
    raise exception 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  end if;

  -- Verify within 180-day window
  select oa.end_date into _end_date
  from public.organization_accreditations oa
  where oa.id = _renewal.current_accreditation_id;

  if current_date > (_end_date + 180) then
    raise exception 'Late renewal cutoff has passed (180 days past expiration). Resubmission is no longer allowed.';
  end if;

  -- Verify all flagged documents have been replaced
  select * into _submission
  from public.document_submissions
  where renewal_id = p_renewal_id
  for update;

  if _submission.id is null then
    raise exception 'No document submission packet found for this renewal.';
  end if;

  if exists (
    select 1
    from public.document_submission_files dsf
    where dsf.submission_id = _submission.id
      and dsf.admin_status in ('needs_revision', 'rejected_red')
  ) then
    raise exception 'All documents marked for revision or rejection must be replaced before resubmission.';
  end if;

  -- Update renewal state to resubmitted
  update public.organization_renewals
  set
    status = 'resubmitted',
    updated_at = _now
  where id = p_renewal_id;

  -- Update document submission state
  update public.document_submissions
  set
    status = 'submitted',
    updated_at = _now
  where id = _submission.id;

  -- Insert activity log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    auth.uid(),
    _renewal.organization_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id::text,
    format('Organization resubmitted renewal application for Cycle %s after revisions.', _renewal.cycle_number)
  );

  return jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'resubmitted_at', _now
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. ADMIN DOCUMENT REVIEW HOOK (Automatic transition to under_review)
-- ------------------------------------------------------------------------------

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
  _submission_id uuid;
  _renewal_id uuid;
  _document_name text;
  _overall_status public.document_submission_status;
  _overall_remarks text;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

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

  -- Update individual file
  update public.document_submission_files
  set
    admin_status = _status,
    admin_remarks = coalesce(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    updated_at = _reviewed_at
  where document_submission_files.id = _file_id;

  -- Check if parent submission is tied to a renewal packet
  select ds.renewal_id into _renewal_id
  from public.document_submissions ds
  where ds.id = _submission_id;

  -- AUTOMATIC TRANSITION: If parent renewal is submitted or resubmitted, transition to under_review
  if _renewal_id is not null then
    update public.organization_renewals
    set
      status = 'under_review',
      reviewed_by = _admin_id,
      reviewed_at = _reviewed_at,
      updated_at = _reviewed_at
    where id = _renewal_id
      and status in ('submitted', 'resubmitted');
  end if;

  -- Recompute overall submission status
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
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id;

  return query
  select *
  from public.document_submission_files
  where document_submission_files.id = _file_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 7. ADMIN RPC: REQUEST REVISION
-- ------------------------------------------------------------------------------

create or replace function public.admin_request_renewal_revision(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _renewal record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text := trim(p_admin_remarks);
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(p_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if length(_remarks) < 10 then
    raise exception 'Meaningful revision remarks of at least 10 characters are required.';
  end if;

  select * into _renewal
  from public.organization_renewals
  where id = p_renewal_id
  for update;

  if _renewal.id is null then
    raise exception 'Renewal application not found.';
  end if;

  if _renewal.status <> 'under_review' then
    raise exception 'Revision can only be requested from status "under_review". Current status: "%".', _renewal.status;
  end if;

  -- Ensure at least one file is marked needs_revision or rejected
  if not exists (
    select 1
    from public.document_submissions ds
    join public.document_submission_files dsf on dsf.submission_id = ds.id
    where ds.renewal_id = p_renewal_id
      and dsf.admin_status in ('needs_revision', 'rejected_red')
  ) then
    raise exception 'At least one document file must be marked for revision or rejection before requesting revision.';
  end if;

  select user_id into _owner_id
  from public.organization_profiles
  where id = _renewal.organization_id;

  -- Update renewal state
  update public.organization_renewals
  set
    status = 'needs_revision',
    admin_remarks = _remarks,
    reviewed_by = _admin_id,
    reviewed_at = _now,
    updated_at = _now
  where id = p_renewal_id;

  -- Update document submission packet state
  update public.document_submissions
  set
    status = 'needs_revision',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = _remarks,
    updated_at = _now
  where renewal_id = p_renewal_id;

  -- Send notification to organization owner
  insert into public.notifications (
    user_id,
    organization_id,
    title,
    message,
    type,
    related_type,
    related_id
  ) values (
    _owner_id,
    _renewal.organization_id,
    'Renewal Revision Requested',
    format('Revisions requested for renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
    'document_revision',
    'renewal',
    p_renewal_id::text
  );

  -- Insert activity log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    null,
    _renewal.organization_id,
    'renewal_needs_revision',
    'renewal',
    p_renewal_id::text,
    format('Admin requested revisions for renewal Cycle %s: %s', _renewal.cycle_number, _remarks)
  );

  return jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'needs_revision'
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 8. ADMIN RPC: REJECT RENEWAL (Terminal)
-- ------------------------------------------------------------------------------

create or replace function public.admin_reject_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _renewal record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text := trim(p_admin_remarks);
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(p_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if length(_remarks) < 10 then
    raise exception 'Detailed rejection remarks of at least 10 characters are required.';
  end if;

  select * into _renewal
  from public.organization_renewals
  where id = p_renewal_id
  for update;

  if _renewal.id is null then
    raise exception 'Renewal application not found.';
  end if;

  if _renewal.status <> 'under_review' then
    raise exception 'Renewal can only be rejected from status "under_review". Current status: "%".', _renewal.status;
  end if;

  select user_id into _owner_id
  from public.organization_profiles
  where id = _renewal.organization_id;

  -- Update renewal state to terminal rejected
  update public.organization_renewals
  set
    status = 'rejected',
    admin_remarks = _remarks,
    reviewed_by = _admin_id,
    reviewed_at = _now,
    updated_at = _now
  where id = p_renewal_id;

  -- Update document submission packet state
  update public.document_submissions
  set
    status = 'rejected_red',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = _remarks,
    updated_at = _now
  where renewal_id = p_renewal_id;

  -- Send notification to organization owner
  insert into public.notifications (
    user_id,
    organization_id,
    title,
    message,
    type,
    related_type,
    related_id
  ) values (
    _owner_id,
    _renewal.organization_id,
    'Renewal Application Rejected',
    format('Renewal application for Cycle %s was rejected: %s. Please contact the LYDO office directly.', _renewal.cycle_number, _remarks),
    'rejected',
    'renewal',
    p_renewal_id::text
  );

  -- Insert activity log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    null,
    _renewal.organization_id,
    'renewal_rejected',
    'renewal',
    p_renewal_id::text,
    format('Admin rejected renewal application for Cycle %s: %s', _renewal.cycle_number, _remarks)
  );

  return jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'rejected'
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 9. ADMIN RPC: ATOMIC ADMIN APPROVAL
-- ------------------------------------------------------------------------------

create or replace function public.admin_approve_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_certificate_urn text,
  p_admin_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _renewal record;
  _curr_acc record;
  _profile record;
  _submission_id uuid;
  _req_type record;
  _urn text := trim(p_certificate_urn);
  _today date := current_date;
  _anchor_cutoff date;
  _new_start date;
  _new_end date;
  _new_accreditation_id uuid;
  _now timestamptz := clock_timestamp();
begin
  -- 1. Validate Admin Session
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(p_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if _urn is null or length(_urn) < 3 then
    raise exception 'Valid certificate URN is required for accreditation approval.';
  end if;

  -- 2. Lock Renewal Record (Lock hierarchy Order 1)
  select * into _renewal
  from public.organization_renewals
  where id = p_renewal_id
  for update;

  if _renewal.id is null then
    raise exception 'Renewal application not found.';
  end if;

  -- 3. Strict prior status validation: ONLY under_review is permitted!
  if _renewal.status <> 'under_review' then
    raise exception 'Renewal application cannot be approved from status "%". Expected "under_review".', _renewal.status;
  end if;

  -- 4. Lock Current Accreditation Term (Lock hierarchy Order 2)
  select * into _curr_acc
  from public.organization_accreditations
  where id = _renewal.current_accreditation_id
  for update;

  if _curr_acc.id is null then
    raise exception 'Prior accreditation term not found.';
  end if;

  if _curr_acc.status <> 'active' then
    raise exception 'Prior accreditation term is not currently active (status: "%").', _curr_acc.status;
  end if;

  -- 5. Lock Organization Profile (Lock hierarchy Order 3)
  select * into _profile
  from public.organization_profiles
  where id = _renewal.organization_id
  for update;

  if _profile.id is null then
    raise exception 'Organization profile not found.';
  end if;

  -- 6. Verify Cycle Number matches Current Term + 1
  if _renewal.cycle_number <> (_curr_acc.term_number + 1) then
    raise exception 'Cycle number mismatch: Renewal cycle % does not match current term % + 1.', _renewal.cycle_number, _curr_acc.term_number;
  end if;

  -- 7. Verify Document Completeness: All required renewal document types must have approved files
  select id into _submission_id
  from public.document_submissions
  where renewal_id = p_renewal_id
  limit 1;

  if _submission_id is null then
    raise exception 'Document submission packet not found for this renewal.';
  end if;

  for _req_type in
    select rdt.id, rdt.name
    from public.required_document_types rdt
    where rdt.is_active = true
      and coalesce(rdt.is_required, true) = true
      and rdt.scope in ('renewal', 'both')
      and rdt.template_scope = 'document_submission'
  loop
    if not exists (
      select 1
      from public.document_submission_files dsf
      where dsf.submission_id = _submission_id
        and dsf.document_type_id = _req_type.id
        and dsf.admin_status = 'approved_green'
    ) then
      raise exception 'Cannot approve renewal: Required document "%" is not approved.', _req_type.name;
    end if;
  end loop;

  -- 8. Compute Authoritative Term Dates (Standard Continuous Protection Anchor)
  -- anchor_cutoff = previous_accreditation.end_date + 30 calendar days
  _anchor_cutoff := (_curr_acc.end_date + 30);

  if _today <= _anchor_cutoff then
    -- Timely or In-Grace: Continuous protection anchored to previous end date
    _new_start := _curr_acc.end_date;
    _new_end := (_curr_acc.end_date + interval '3 years')::date;
  else
    -- Lapsed Late Renewal: Anchored to approval date
    _new_start := _today;
    _new_end := (_today + interval '3 years')::date;
  end if;

  -- 9. Supersede Previous Active Term
  update public.organization_accreditations
  set status = 'superseded'
  where id = _curr_acc.id;

  -- 10. Insert New Authoritative Accreditation Term
  insert into public.organization_accreditations (
    organization_id,
    term_number,
    start_date,
    end_date,
    certificate_urn,
    status,
    is_legacy_inferred,
    approved_by,
    approved_at
  ) values (
    _renewal.organization_id,
    _renewal.cycle_number,
    _new_start,
    _new_end,
    _urn,
    'active',
    false, -- Fully confirmed legal term
    _admin_id,
    _now
  ) returning id into _new_accreditation_id;

  -- (Note: trg_sync_organization_accreditation_projection fires automatically
  -- and synchronizes organization_profiles projection cache)

  -- 11. Finalize Renewal Application
  update public.organization_renewals
  set
    status = 'approved',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    admin_remarks = coalesce(p_admin_remarks, admin_remarks),
    updated_at = _now
  where id = p_renewal_id;

  -- 12. Finalize Document Submission Packet
  update public.document_submissions
  set
    status = 'approved_green',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = 'All renewal documents approved.',
    updated_at = _now
  where id = _submission_id;

  -- 13. Organization Notification
  insert into public.notifications (
    user_id,
    organization_id,
    title,
    message,
    type,
    related_type,
    related_id
  ) values (
    _profile.user_id,
    _renewal.organization_id,
    'Accreditation Renewed',
    format('Congratulations! Your accreditation renewal for Term %s has been approved. Valid until %s.', _renewal.cycle_number, to_char(_new_end, 'FMMonth DD, YYYY')),
    'completed',
    'accreditation',
    _new_accreditation_id::text
  );

  -- 14. Activity Log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    null,
    _renewal.organization_id,
    'accreditation_renewed',
    'accreditation',
    _new_accreditation_id::text,
    format('Admin approved accreditation renewal for Term %s (URN: %s). Valid: %s to %s.', _renewal.cycle_number, _urn, _new_start, _new_end)
  );

  return jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'accreditation_id', _new_accreditation_id,
    'term_number', _renewal.cycle_number,
    'start_date', _new_start,
    'end_date', _new_end,
    'certificate_urn', _urn
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 10. TIME-DRIVEN NOTIFICATION EVALUATOR (Database-level idempotency)
-- ------------------------------------------------------------------------------

create or replace function public.evaluate_accreditation_notification_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _today date := current_date;
  _opened_count int := 0;
  _urgent_count int := 0;
  _expired_count int := 0;
  _rec record;
begin
  -- 1. renewal_window_opened (90 days before end_date down to 31 days)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and (oa.end_date - _today) <= 90
      and (oa.end_date - _today) > 30
      and not exists (
        select 1 from public.notifications n
        where n.organization_id = oa.organization_id
          and n.type = 'renewal_window_opened'
          and n.related_id = oa.id::text
      )
  loop
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Renewal Window Open',
      format('Your accreditation expires in %s days (%s). You may now prepare and submit your renewal application.', (_rec.end_date - _today), to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'renewal_window_opened',
      'accreditation',
      _rec.accreditation_id::text
    );
    _opened_count := _opened_count + 1;
  end loop;

  -- 2. renewal_window_urgent (30 days before end_date down to 0 days)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and (oa.end_date - _today) <= 30
      and (oa.end_date - _today) >= 0
      and not exists (
        select 1 from public.notifications n
        where n.organization_id = oa.organization_id
          and n.type = 'renewal_window_urgent'
          and n.related_id = oa.id::text
      )
  loop
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Urgent: Accreditation Expiring Soon',
      format('Your accreditation expires in %s days (%s). Please submit your renewal application immediately to prevent service interruptions.', (_rec.end_date - _today), to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'renewal_window_urgent',
      'accreditation',
      _rec.accreditation_id::text
    );
    _urgent_count := _urgent_count + 1;
  end loop;

  -- 3. accreditation_expired (past end_date)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and _today > oa.end_date
      and not exists (
        select 1 from public.notifications n
        where n.organization_id = oa.organization_id
          and n.type = 'accreditation_expired'
          and n.related_id = oa.id::text
      )
  loop
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Accreditation Expired',
      format('Your organization accreditation expired on %s. New budget requests and YPOP activities are paused until renewal approval.', to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'accreditation_expired',
      'accreditation',
      _rec.accreditation_id::text
    );
    _expired_count := _expired_count + 1;
  end loop;

  return jsonb_build_object(
    'opened_count', _opened_count,
    'urgent_count', _urgent_count,
    'expired_count', _expired_count
  );
end;
$$;
