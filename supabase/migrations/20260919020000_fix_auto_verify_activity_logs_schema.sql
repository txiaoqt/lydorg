-- Migration: 20260919020000_fix_auto_verify_activity_logs_schema.sql
-- Purpose:
--   Fix public.evaluate_and_apply_automatic_registration_verification to use
--   the canonical activity_logs schema (column 'description' instead of obsolete 'details').
--   This resolves the "column details of relation activity_logs does not exist" error
--   when approving registration documents.

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

  -- Edge Case: Required documents = 0 must NOT automatically verify
  if _required_count = 0 then
    return query select false, null::text, false, 'No active required registration document types are configured in the system.';
    return;
  end if;

  -- 7. Count how many distinct required document types have an active approved file
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

  -- 11. Record verification in public.activity_logs using canonical schema (column 'description')
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

  return query select true, _official_urn, false, 'Organization automatically verified successfully.';
end;
$$;

comment on function public.evaluate_and_apply_automatic_registration_verification(uuid, uuid) is
  'Evaluates dynamic required document completeness for new registrations. If all required documents are approved, atomically sets profile_status = verified, generates the deterministic URN, creates Term 1 accreditation, and logs activity with canonical schema.';

grant execute on function public.evaluate_and_apply_automatic_registration_verification(uuid, uuid) to anon, authenticated, service_role;
