-- Migration: Implement Authoritative Automatic Registration Verification on All Required Documents Approved
-- File: 20260918050000_auto_verify_registration_on_required_docs_approved.sql
--
-- Purpose:
--   1. Automatically verify new organization registrations as soon as all dynamic required
--      registration documents have been approved by the Admin.
--   2. Atomically generate the deterministic official URN (BB-YY-NNN) upon verification.
--   3. Create the Term 1 accreditation record, activity log, and notification atomically.
--   4. Prevent premature verification if required documents are incomplete, missing, or rejected.
--   5. Maintain complete idempotency and concurrency safety with row-level locks.
--   6. Strictly distinguish new registrations from renewals (renewals preserve existing URN).

-- ==============================================================================
-- 1. CENTRALIZED AUTOMATIC REGISTRATION VERIFICATION HELPER
-- ==============================================================================

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
  _effective_verified_at timestamptz := clock_timestamp();
  _official_urn text;
  _start_date date;
  _end_date date;
begin
  -- 1. Acquire an exclusive row-level lock on the organization profile to guarantee concurrency safety
  select * into _target_org
  from public.organization_profiles
  where id = _organization_id
  for update;

  if not found then
    return query select false, null::text, false, 'Organization profile not found.';
    return;
  end if;

  -- 2. Idempotency: If the organization is already verified, do not re-verify, re-generate URN, or advance sequence
  if _target_org.profile_status = 'verified'::public.profile_status then
    return query select true, _target_org.urn, true, 'Organization is already verified.';
    return;
  end if;

  -- 3. Only eligible registration review states can transition to verified
  if _target_org.profile_status not in ('pending_review', 'incomplete', 'needs_update') then
    return query select false, null::text, false, format('Organization status "%s" is not eligible for verification.', _target_org.profile_status);
    return;
  end if;

  -- 4. Scope Guard: Organizations with existing URNs follow their own dedicated URN review process
  if _target_org.registration_type = 'existing_urn' then
    return query select false, null::text, false, 'Existing URN registrations follow dedicated URN review workflow.';
    return;
  end if;

  -- 5. Find the authoritative registration document submission (renewal_id IS NULL)
  select ds.id into _reg_submission_id
  from public.document_submissions ds
  where ds.organization_id = _organization_id
    and ds.renewal_id is null
    and (ds.submission_scope is null or ds.submission_scope = 'registration')
  order by ds.created_at desc
  limit 1;

  if _reg_submission_id is null then
    return query select false, null::text, false, 'No active registration document submission found for this organization.';
    return;
  end if;

  -- 6. Dynamically resolve all currently active required registration document types
  select coalesce(array_agg(rdt.id), '{}')
  into _required_type_ids
  from public.required_document_types rdt
  where rdt.is_active = true
    and coalesce(rdt.is_required, true) = true
    and coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    and (rdt.scope is null or rdt.scope in ('registration', 'both'))
    and (
      rdt.template_category is null
      or rdt.template_category = '{}'
      or 'yorp' = any(rdt.template_category)
    );

  _required_count := cardinality(_required_type_ids);

  -- Edge Case 21-A: Required documents = 0 must NOT automatically verify
  if _required_count = 0 then
    return query select false, null::text, false, 'No active required registration document types are configured in the system.';
    return;
  end if;

  -- 7. Count how many distinct required document types have an active approved file
  -- Stale/replaced files in revision_history or rejected/needs_revision files are NOT approved_green
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

  -- 8. ALL REQUIRED REGISTRATION DOCUMENTS ARE APPROVED -> PROCEED WITH AUTOMATIC VERIFICATION
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

  -- 9. Update organization profile with official verified status and assigned URN
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

  -- 10. Create Term 1 accreditation record if not already present
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

  -- 11. Record verification in public.activity_logs
  insert into public.activity_logs (
    actor_user_id,
    action,
    related_type,
    related_id,
    details,
    organization_id,
    created_at
  ) values (
    _admin_id,
    'Verified organization',
    'organization_profile',
    _organization_id,
    format('Organization automatically verified after all required registration documents were approved. Official URN: %s.', _official_urn),
    _organization_id,
    _effective_verified_at
  );

  return query select true, _official_urn, false, 'Organization automatically verified successfully.';
end;
$$;

comment on function public.evaluate_and_apply_automatic_registration_verification(uuid, uuid) is
  'Evaluates dynamic required document completeness for new registrations. If all required documents are approved, atomically sets profile_status = verified, generates the deterministic URN, creates Term 1 accreditation, and logs activity.';

grant execute on function public.evaluate_and_apply_automatic_registration_verification(uuid, uuid) to anon, authenticated, service_role;

-- ==============================================================================
-- 2. INTEGRATE AUTO-VERIFICATION INTO DOCUMENT REVIEW MUTATION RPC
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
    updated_at = _reviewed_at
  where document_submission_files.id = _file_id;

  -- If parent submission is tied to a renewal packet, handle renewal state transition
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
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id;

  -- AUTOMATIC REGISTRATION VERIFICATION TRIGGER:
  -- When an admin approves a document in a registration packet (renewal_id IS NULL),
  -- re-evaluate registration completeness. If all required documents are now approved,
  -- automatically verify the organization, generate deterministic URN, and create accreditation.
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
-- 3. HARDEN MANUAL PROFILE REVIEW RPC (Prevent Incomplete Verification)
-- ==============================================================================

create or replace function public.update_admin_organization_profile_review(
  _session_token text,
  _organization_profile_id uuid,
  _profile_status public.profile_status,
  _verified_at timestamptz default null
)
returns table (
  id uuid,
  user_id uuid,
  organization_name text,
  organization_email citext,
  contact_number text,
  district text,
  barangay text,
  is_existing_organization boolean,
  organization_identifier_number text,
  major_classification text,
  sub_classification text,
  advocacies text[],
  adviser_name text,
  representative_name text,
  address text,
  facebook_page_url text,
  profile_status public.profile_status,
  verified_at timestamptz,
  internal_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _target_org public.organization_profiles%rowtype;
  _auto_res record;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select * into _target_org
  from public.organization_profiles
  where organization_profiles.id = _organization_profile_id
  for update;

  if not found then
    raise exception 'Organization profile not found.';
  end if;

  if _profile_status = 'verified'::public.profile_status then
    -- For new organization registrations, verify that required documents are genuinely complete
    if not _target_org.is_existing_organization or _target_org.registration_type = 'new_organization' then
      select * into _auto_res
      from public.evaluate_and_apply_automatic_registration_verification(_organization_profile_id, _admin_id);

      if not _auto_res.verified then
        raise exception 'Cannot verify organization: %', _auto_res.reason;
      end if;
    else
      -- Existing organization verification fallback
      perform public.evaluate_and_apply_automatic_registration_verification(_organization_profile_id, _admin_id);
    end if;

  else
    -- needs_update or incomplete
    update public.organization_profiles
    set
      profile_status = _profile_status,
      verified_at = null,
      updated_at = now()
    where organization_profiles.id = _organization_profile_id;
  end if;

  return query
  select
    op.id,
    op.user_id,
    op.organization_name,
    op.organization_email,
    op.contact_number,
    op.district,
    op.barangay,
    op.is_existing_organization,
    op.organization_identifier_number,
    op.major_classification,
    op.sub_classification,
    op.advocacies,
    op.adviser_name,
    op.representative_name,
    op.address,
    op.facebook_page_url,
    op.profile_status,
    op.verified_at,
    op.internal_notes,
    op.created_at,
    op.updated_at
  from public.organization_profiles op
  where op.id = _organization_profile_id;
end;
$$;

grant execute on function public.update_admin_organization_profile_review(text, uuid, public.profile_status, timestamptz) to anon, authenticated, service_role;

-- ==============================================================================
-- 4. NOTIFICATION ENHANCEMENT WITH URN
-- ==============================================================================

create or replace function public.notify_organization_profile_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.profile_status is not distinct from new.profile_status then
    return new;
  end if;

  if new.profile_status = 'verified' then
    -- Prevent duplicate verification notification
    if not exists (
      select 1 from public.notifications
      where organization_id = new.id
        and type = 'completed'
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
  elsif new.profile_status = 'needs_update' then
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
