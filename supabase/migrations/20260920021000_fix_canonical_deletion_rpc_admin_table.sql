-- Migration: 20260920021000_fix_canonical_deletion_rpc_admin_table.sql
-- Purpose: Corrects the admin table reference from admin_users to admin_accounts in delete_organization_account_canonical()

create or replace function public.delete_organization_account_canonical(
  _session_token text,
  _organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _org public.organization_profiles%rowtype;
  _user_id uuid;
begin
  -- 1. Authorize admin caller
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    return jsonb_build_object(
      'success', false,
      'stage', 'authorization',
      'error', 'You are not authorized to delete organization accounts.'
    );
  end if;

  -- 2. Lock and load target organization profile
  select * into _org
  from public.organization_profiles
  where id = _organization_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'already_deleted', true,
      'stage', 'validation',
      'error', 'Organization profile not found or already deleted.'
    );
  end if;

  _user_id := _org.user_id;

  -- 3. Protection checks: verify target is not an administrator or super admin
  if exists (
    select 1 from public.admin_accounts where lower(trim(email)) = lower(trim(_org.organization_email))
  ) or (_user_id is not null and exists (
    select 1 from public.admin_accounts where id = _user_id
  )) or (_user_id is not null and exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = _user_id and r.code in ('admin', 'super_admin')
  )) then
    return jsonb_build_object(
      'success', false,
      'is_protected', true,
      'stage', 'protection_check',
      'error', 'Administrator accounts cannot be deleted from the YORP Registry.'
    );
  end if;

  -- 4. Activate transaction-local bypass for immutability triggers
  perform set_config('app.allow_org_deletion', 'true', true);

  -- 5. Disassociate and clean direct Auth dependencies
  if _user_id is not null then
    -- Nullify submitted_by on YPOP to preserve organization historical context without blocking FK
    update public.ypop_entries
    set submitted_by = null
    where submitted_by = _user_id;

    update public.ypop_event_participations
    set submitted_by = null
    where submitted_by = _user_id;

    -- Clean user specific auxiliary records
    delete from public.user_policy_acceptance where user_id = _user_id;
    delete from public.user_roles where user_id = _user_id;
    delete from public.user_profiles where id = _user_id;
  end if;

  -- 6. Clean accreditation and renewal hierarchies safely
  update public.organization_renewals
  set current_accreditation_id = null
  where organization_id = _organization_id;

  delete from public.organization_renewal_files
  where renewal_id in (select id from public.organization_renewals where organization_id = _organization_id);

  delete from public.organization_renewals
  where organization_id = _organization_id;

  delete from public.organization_accreditation_files
  where accreditation_id in (select id from public.organization_accreditations where organization_id = _organization_id);

  delete from public.organization_accreditations
  where organization_id = _organization_id;

  -- 7. Clean document submissions, budget requests, and liquidations
  delete from public.document_submission_files
  where submission_id in (select id from public.document_submissions where organization_id = _organization_id);

  delete from public.document_submissions
  where organization_id = _organization_id;

  delete from public.budget_request_files
  where budget_request_id in (select id from public.budget_requests where organization_id = _organization_id);

  delete from public.budget_requests
  where organization_id = _organization_id;

  delete from public.liquidation_report_files
  where liquidation_report_id in (select id from public.liquidation_reports where organization_id = _organization_id);

  delete from public.liquidation_reports
  where organization_id = _organization_id;

  -- 8. Clean move applications, URN history, and YPOP organization activities
  delete from public.move_files where organization_id = _organization_id;
  delete from public.move_applications where organization_id = _organization_id;
  delete from public.urn_review_history where organization_id = _organization_id;

  delete from public.ypop_files where organization_id = _organization_id;
  delete from public.ypop_event_files where organization_id = _organization_id;
  delete from public.ypop_org_activity_files where organization_id = _organization_id;
  delete from public.ypop_organization_activities where organization_id = _organization_id;
  delete from public.ypop_event_participations where organization_id = _organization_id;
  delete from public.ypop_entries where organization_id = _organization_id;

  -- 9. Clean organization members, documents, notifications, inquiries
  delete from public.organization_members where organization_id = _organization_id;
  delete from public.organization_documents where organization_id = _organization_id;
  delete from public.activity_announcement_recipients where organization_id = _organization_id;
  delete from public.notifications where organization_id = _organization_id;
  delete from public.compliance_remarks where organization_id = _organization_id;
  delete from public.inquiries where organization_id = _organization_id;
  delete from public.public_contact_inquiries where organization_id = _organization_id;

  -- 10. Disassociate historical activity logs without deleting audit trail
  update public.activity_logs
  set organization_id = null
  where organization_id = _organization_id;

  -- 11. Delete organization profile
  delete from public.organization_profiles
  where id = _organization_id;

  -- 12. Verify organization profile is removed
  if exists (select 1 from public.organization_profiles where id = _organization_id) then
    raise exception 'Database deletion failed: organization_profiles row could not be removed.';
  end if;

  return jsonb_build_object(
    'success', true,
    'organization_id', _org.id,
    'organization_name', _org.organization_name,
    'organization_email', _org.organization_email,
    'user_id', _user_id,
    'urn', _org.urn
  );
end;
$$;
