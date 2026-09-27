-- Migration: 20260928000000_organization_rejection_suspension.sql
-- Purpose:
--   Enforce permanent organization account suspension whenever any registration document
--   is marked as rejected ('rejected_red') by an administrator.
--   1. Atomically update document_submission_files, document_submissions, and set
--      organization_profiles.profile_status = 'suspended_inactive'.
--   2. Record canonical activity log and account suspension notification.
--   3. Harden replace_organization_document_file RPC to block any replacements on
--      suspended accounts or rejected files.

-- ==============================================================================
-- 1. HARDEN ADMIN DOCUMENT REVIEW RPC (Atomic Rejection -> Permanent Suspension)
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
  _org_user_id uuid;
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

  -- Resolve parent submission details and organization owner
  select ds.organization_id, ds.renewal_id
  into _org_id, _renewal_id
  from public.document_submissions ds
  where ds.id = _submission_id;

  if _org_id is not null then
    select op.user_id
    into _org_user_id
    from public.organization_profiles op
    where op.id = _org_id;
  end if;

  -- Update the individual document file review record
  update public.document_submission_files
  set
    admin_status = _status,
    admin_remarks = coalesce(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    revision_requested_at = case when _status = 'needs_revision' then _reviewed_at else null end,
    revision_due_at = case when _status = 'needs_revision' then _revision_due else null end,
    revision_locked = case when _status = 'rejected_red' then true else false end,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _reviewed_at
  where document_submission_files.id = _file_id;

  -- If parent submission is tied to a renewal packet, handle renewal state transition
  if _renewal_id is not null then
    update public.organization_renewals
    set
      status = case
        when _status = 'rejected_red' then 'rejected'::public.renewal_application_status
        when _status = 'needs_revision' then 'needs_revision'::public.renewal_application_status
        else 'under_review'::public.renewal_application_status
      end,
      admin_remarks = case when _status in ('needs_revision', 'rejected_red') then coalesce(_admin_remarks, organization_renewals.admin_remarks) else organization_renewals.admin_remarks end,
      reviewed_by = _admin_id,
      reviewed_at = _reviewed_at,
      revision_requested_at = case when _status = 'needs_revision' then _reviewed_at else organization_renewals.revision_requested_at end,
      revision_due_at = case when _status = 'needs_revision' then _revision_due else organization_renewals.revision_due_at end,
      revision_locked = case when _status = 'rejected_red' then true else false end,
      revision_locked_at = case when _status = 'rejected_red' then _reviewed_at else null end,
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
    revision_requested_at = case when _overall_status = 'needs_revision' then _reviewed_at else null end,
    revision_due_at = case when _overall_status = 'needs_revision' then _revision_due else null end,
    revision_locked = case when _overall_status = 'rejected_red' then true else false end,
    revision_locked_at = case when _overall_status = 'rejected_red' then _reviewed_at else null end,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id;

  -- ============================================================================
  -- ATOMIC REJECTION RULE:
  -- When any registration document (renewal_id is null) is marked as rejected,
  -- PERMANENTLY SUSPEND the organization account.
  -- ============================================================================
  if _renewal_id is null and _status = 'rejected_red' and _org_id is not null then
    -- 1. Permanently suspend the organization profile
    update public.organization_profiles
    set
      profile_status = 'suspended_inactive'::public.profile_status,
      updated_at = _reviewed_at
    where id = _org_id;

    -- 2. Insert canonical activity log
    insert into public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      created_at
    ) values (
      _admin_id,
      _org_id,
      'Suspended organization',
      'organization_profile',
      _org_id,
      format('Organization account permanently suspended due to rejected registration document: %s.', _document_name),
      _reviewed_at
    );

    -- 3. Insert notification for organization user
    if _org_user_id is not null then
      insert into public.notifications (
        user_id,
        organization_id,
        title,
        message,
        type,
        related_type,
        related_id,
        created_at
      ) values (
        _org_user_id,
        _org_id,
        'Account Suspended',
        'Your Y-TRACE organization account has been permanently suspended because a submitted registration document was marked as rejected.',
        'document_red',
        'organization_profile',
        _org_id,
        _reviewed_at
      );
    end if;
  end if;

  -- AUTOMATIC REGISTRATION VERIFICATION TRIGGER (for approved documents)
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
-- 2. HARDEN DOCUMENT REPLACEMENT RPC (Block Suspended Orgs & Rejected Files)
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

  -- PERMANENT SUSPENSION GUARD
  if _organization.profile_status = 'suspended_inactive' then
    raise exception 'This organization account is permanently suspended. Document replacement is not permitted.';
  end if;

  if _file.document_type_id is distinct from _document_type_id then
    raise exception 'The selected file does not match this document requirement.';
  end if;

  -- TERMINAL REJECTION GUARD
  if _file.admin_status = 'rejected_red' or _submission.status = 'rejected_red' then
    raise exception 'This rejected document cannot be replaced. The organization account is permanently suspended.';
  end if;

  if _file.admin_status <> 'needs_revision' then
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
    _document_type_id::text || '/revisions/%'
     and _file_url not like
    'https://' || '%' || '/storage/v1/object/public/organization-documents/' ||
    _organization.id::text || '/' || _document_type_id::text || '/revisions/%'
     and _file_url not like
    'http://' || '%' || '/storage/v1/object/public/organization-documents/' ||
    _organization.id::text || '/' || _document_type_id::text || '/revisions/%'
  then
    raise exception 'The uploaded file path is invalid.';
  end if;

  select coalesce(required_document_types.name, _file.file_name)
  into _document_name
  from public.required_document_types
  where id = _document_type_id;

  update public.document_submission_files
  set
    file_url = _file_url,
    file_name = _file_name,
    file_type = _file_type,
    file_size = _file_size,
    validation_status = 'correct',
    admin_status = 'under_admin_review',
    admin_remarks = null,
    uploaded_at = _submitted_at,
    reviewed_at = null,
    revision_history = coalesce(revision_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'replaced',
        'file_name', _file_name,
        'replaced_at', _submitted_at,
        'previous_file_url', _file.file_url,
        'previous_admin_remarks', _file.admin_remarks
      )
    ),
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _submitted_at
  where id = _file.id;

  select
    case
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status = 'rejected_red'
      ) then 'rejected_red'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status = 'needs_revision'
      ) then 'needs_revision'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
      ) and not exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status <> 'approved_green'
      ) then 'approved_green'::public.document_submission_status
      else 'under_admin_review'::public.document_submission_status
    end
  into _overall_status;

  update public.document_submissions
  set
    status = _overall_status,
    updated_at = _submitted_at,
    revision_requested_at = case when _overall_status = 'needs_revision' then revision_requested_at else null end,
    revision_due_at = case when _overall_status = 'needs_revision' then revision_due_at else null end,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null
  where id = _submission.id;

  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    created_at
  ) values (
    _user_id,
    _organization.id,
    'Replaced document',
    'document_submission_file',
    _file.id,
    format('Uploaded a corrected version of %s.', coalesce(_document_name, _file_name)),
    _submitted_at
  );

  return query
  select *
  from public.document_submission_files
  where id = _file.id;
end;
$function$;

grant execute on function public.replace_organization_document_file(uuid, uuid, timestamptz, text, text, text, bigint) to authenticated, service_role;
