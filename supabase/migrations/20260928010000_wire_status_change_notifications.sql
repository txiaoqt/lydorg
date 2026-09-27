-- Migration: 20260928010000_wire_status_change_notifications.sql
-- Purpose:
--   1. Authoritatively wire in-app notifications and workflow settings for ALL registration document review decisions
--      (approved_green, needs_revision, rejected_red, automatic verification) into update_admin_document_submission_file_review
--      and evaluate_and_apply_automatic_registration_verification.
--   2. Wire and enforce workflow notification settings:
--      - workflow.notify_org_on_approved
--      - workflow.notify_org_on_needs_revision
--      - workflow.notify_org_on_rejected
--      - workflow.notify_org_on_resubmitted
--   3. Decouple workflow.notify_org_on_approved from notifications.new_registration.in_app in notify_organization_profile_status_change.
--   4. Ensure replace_organization_document_file includes resubmission acknowledgement gated by workflow.notify_org_on_resubmitted.
--   5. Maintain 100% compatibility with permanent account suspension on rejected registration documents and modern budget awaiting_release lifecycle.

-- ==============================================================================
-- 1. HARDEN & WIRE REGISTRATION & DOCUMENT REVIEW RPC
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
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
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

  -- Guard: Permanently suspended organizations cannot have registration review decisions modified
  if _renewal_id is null and _org_id is not null and exists (
    select 1
    from public.organization_profiles op
    where op.id = _org_id
      and op.profile_status = 'suspended_inactive'
  ) then
    raise exception 'This organization account is permanently suspended. Review actions cannot be performed.';
  end if;

  -- Fetch workflow notification settings
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

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
  -- 1. REGISTRATION REVISION NOTIFICATION:
  -- ============================================================================
  if _renewal_id is null and _status = 'needs_revision' and _org_id is not null and _org_user_id is not null and _notify_revision then
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
      'Registration Revision Requested',
      format('The admin requested revisions for %s.%s', _document_name, case when _admin_remarks is not null and trim(_admin_remarks) <> '' then ' Remarks: ' || trim(_admin_remarks) else '' end),
      'document_revision',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  end if;

  -- ============================================================================
  -- 2. REGISTRATION SINGLE FILE APPROVED NOTIFICATION (when not yet fully verified):
  -- ============================================================================
  if _renewal_id is null and _status = 'approved_green' and _overall_status <> 'approved_green' and _org_id is not null and _org_user_id is not null and _notify_approved then
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
      'Registration Document Approved',
      format('Your registration document ''%s'' has been approved by the admin.', _document_name),
      'completed',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  end if;

  -- ============================================================================
  -- 3. ATOMIC REJECTION RULE (Permanent Suspension):
  -- ============================================================================
  if _renewal_id is null and _status = 'rejected_red' and _org_id is not null then
    -- Permanently suspend the organization profile
    update public.organization_profiles
    set
      profile_status = 'suspended_inactive'::public.profile_status,
      updated_at = _reviewed_at
    where id = _org_id;

    -- Canonical activity log
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

    -- In-app suspension notification (delivered as critical security notice)
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
        format('Your Y-TRACE organization account has been permanently suspended because registration document ''%s'' was rejected.%s', _document_name, case when _admin_remarks is not null and trim(_admin_remarks) <> '' then ' Remarks: ' || trim(_admin_remarks) else '' end),
        'document_red',
        'organization_profile',
        _org_id,
        _reviewed_at
      );
    end if;
  end if;

  -- ============================================================================
  -- 4. AUTOMATIC REGISTRATION VERIFICATION TRIGGER (for fully approved documents)
  -- ============================================================================
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


-- Drop existing function first to allow schema/return-signature updates without 42P13 errors
drop function if exists public.evaluate_and_apply_automatic_registration_verification(uuid, uuid);

create or replace function public.evaluate_and_apply_automatic_registration_verification(
  _organization_id uuid,
  _admin_id uuid default null
)
returns table (
  verified boolean,
  urn text,
  already_verified boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _target_org public.organization_profiles%rowtype;
  _reg_submission_id uuid;
  _required_type_ids uuid[];
  _required_count int;
  _approved_count int;
  _official_urn text;
  _effective_verified_at timestamptz := clock_timestamp();
  _start_date date;
  _end_date date;
  _notify_approved boolean;
begin
  -- 1. Fetch target organization profile
  select *
  into _target_org
  from public.organization_profiles
  where id = _organization_id;

  if _target_org.id is null then
    return query select false, null::text, false, 'Organization profile not found.';
    return;
  end if;

  -- 2. If already verified or suspended, do not re-verify
  if _target_org.profile_status = 'verified' then
    return query select true, _target_org.urn, true, 'Organization is already verified.';
    return;
  end if;

  if _target_org.profile_status = 'suspended_inactive' then
    return query select false, null::text, false, 'Organization is suspended and cannot be verified.';
    return;
  end if;

  -- 3. Resolve parent initial registration document submission (renewal_id is null)
  select id
  into _reg_submission_id
  from public.document_submissions
  where organization_id = _organization_id
    and renewal_id is null
  order by created_at desc
  limit 1;

  if _reg_submission_id is null then
    return query select false, null::text, false, 'No initial registration document submission found.';
    return;
  end if;

  -- 4. Dynamic required document types
  select coalesce(array_agg(id), '{}'::uuid[])
  into _required_type_ids
  from public.required_document_types
  where is_active = true
    and applies_to in ('all', 'registration', 'new_registration');

  -- Fallback if no specific registration tags are set
  if array_length(_required_type_ids, 1) is null or array_length(_required_type_ids, 1) = 0 then
    select coalesce(array_agg(id), '{}'::uuid[])
    into _required_type_ids
    from public.required_document_types
    where is_active = true;
  end if;

  _required_count := coalesce(array_length(_required_type_ids, 1), 0);

  if _required_count = 0 then
    return query select false, null::text, false, 'No active required document types configured in system.';
    return;
  end if;

  -- 5. Count approved files for required document types
  select count(distinct dsf.document_type_id)
  into _approved_count
  from public.document_submission_files dsf
  where dsf.submission_id = _reg_submission_id
    and dsf.document_type_id = any(_required_type_ids)
    and dsf.admin_status = 'approved_green';

  -- If any required document type is not approved, block verification
  if _approved_count < _required_count then
    return query select false, null::text, false,
      format('Incomplete: %s of %s required registration documents approved.', _approved_count, _required_count);
    return;
  end if;

  -- 6. ALL REQUIRED REGISTRATION DOCUMENTS ARE APPROVED -> PROCEED WITH AUTOMATIC VERIFICATION
  _start_date := date(_effective_verified_at);
  _end_date := (_start_date + interval '3 years')::date;

  -- Preserve existing URN if already present, otherwise generate deterministic official URN (BB-YY-NNN)
  if _target_org.urn is not null and trim(_target_org.urn) <> '' then
    _official_urn := trim(_target_org.urn);
  elsif _target_org.is_existing_organization and _target_org.organization_identifier_number is not null and trim(_target_org.organization_identifier_number) <> '' then
    _official_urn := trim(_target_org.organization_identifier_number);
  else
    _official_urn := public.generate_unique_urn(_target_org.barangay, _effective_verified_at);
  end if;

  -- 7. Update organization profile with official verified status and assigned URN
  update public.organization_profiles
  set
    profile_status = 'verified'::public.profile_status,
    verified_at = _effective_verified_at,
    urn = _official_urn,
    urn_normalized = public.normalize_urn(_official_urn),
    organization_identifier_number = _official_urn,
    urn_review_status = 'verified'::public.urn_review_status,
    verification_method = coalesce(_target_org.verification_method, 'documents'::public.verification_method),
    updated_at = _effective_verified_at
  where id = _organization_id;

  -- 8. Create Term 1 accreditation record if not already present
  if not exists (
    select 1 from public.organization_accreditations
    where organization_id = _organization_id and term_number = 1
  ) then
    insert into public.organization_accreditations (
      organization_id,
      term_number,
      start_date,
      end_date,
      certificate_urn,
      status,
      is_legacy_inferred,
      approved_by,
      approved_at,
      created_at
    ) values (
      _organization_id,
      1,
      _start_date,
      _end_date,
      _official_urn,
      'active',
      false,
      _admin_id,
      _effective_verified_at,
      _effective_verified_at
    );
  end if;

  -- 9. Record verification in public.activity_logs
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
    _organization_id,
    'Verified organization',
    'organization_profile',
    _organization_id,
    format('Organization automatically verified after all required registration documents were approved. Official URN: %s.', _official_urn),
    _effective_verified_at
  );

  -- 10. Gated in-app notification based on workflow.notify_org_on_approved
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  if _target_org.user_id is not null and _notify_approved then
    if not exists (
      select 1 from public.notifications
      where organization_id = _organization_id
        and type in ('completed', 'registration_approved')
        and related_type = 'organization_profile'
        and related_id = _organization_id::text
    ) then
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
        _target_org.user_id,
        _organization_id,
        'Registration Approved & Verified',
        format('Congratulations! All registration documents have been approved. Your organization is officially verified with URN: %s.', _official_urn),
        'completed',
        'organization_profile',
        _organization_id::text,
        _effective_verified_at
      );
    end if;
  end if;

  return query select true, _official_urn, false, 'Organization automatically verified successfully.';
end;
$$;

grant execute on function public.evaluate_and_apply_automatic_registration_verification(uuid, uuid) to anon, authenticated, service_role;


-- ==============================================================================
-- 3. DECOUPLE WORKFLOW NOTIFICATION FROM ADMIN INCOMING NOTIFICATION SWITCH
-- ==============================================================================

create or replace function public.notify_organization_profile_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _notify_approved boolean;
  _notify_revision boolean;
begin
  if old.profile_status is not distinct from new.profile_status then
    return new;
  end if;

  -- Decoupled: only reads workflow.notify_org_on_approved and workflow.notify_org_on_needs_revision
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);

  if new.profile_status = 'verified' and _notify_approved then
    -- Prevent duplicate verification notification
    if not exists (
      select 1 from public.notifications
      where organization_id = new.id
        and type in ('completed', 'registration_approved')
        and related_type = 'organization_profile'
    ) then
      insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      values (
        new.user_id,
        new.id,
        'Registration verified',
        case
          when new.urn is not null and trim(new.urn) <> ''
            then format('The admin verified your organization registration. Official URN: %s.', new.urn)
          else 'The admin verified your organization registration.'
        end,
        'completed',
        'organization_profile',
        new.id
      );
    end if;
  elsif new.profile_status = 'needs_update' and _notify_revision then
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      new.user_id,
      new.id,
      'Registration needs update',
      'The admin reviewed your organization profile and requested updates before verification.',
      'document_revision',
      'organization_profile',
      new.id
    );
  end if;

  return new;
end;
$$;


-- ==============================================================================
-- 4. HARDEN DOCUMENT REPLACEMENT WITH RESUBMISSION ACKNOWLEDGEMENT
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
  _notify_resubmitted boolean;
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

  -- Gated resubmission acknowledgement notification based on workflow.notify_org_on_resubmitted
  _notify_resubmitted := public.get_system_setting_bool('workflow.notify_org_on_resubmitted', true);
  if _notify_resubmitted then
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
      _user_id,
      _organization.id,
      'Document Resubmission Confirmed',
      format('Successfully uploaded corrected version of %s.', coalesce(_document_name, _file_name)),
      'document_revision',
      'document_submission',
      _submission.id,
      _submitted_at
    );
  end if;

  return query
  select *
  from public.document_submission_files
  where id = _file.id;
end;
$function$;

grant execute on function public.replace_organization_document_file(uuid, uuid, timestamptz, text, text, text, bigint) to authenticated, service_role;
