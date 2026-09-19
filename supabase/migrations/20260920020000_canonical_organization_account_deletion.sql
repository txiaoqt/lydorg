-- Migration: 20260920020000_canonical_organization_account_deletion.sql
-- Purpose:
-- 1. Updates foreign keys (ypop_entries.submitted_by, ypop_event_participations.submitted_by,
--    organization_renewals.current_accreditation_id) with ON DELETE SET NULL to eliminate
--    accidental blocks during user and accreditation cleanup.
-- 2. Enhances enforce_accreditation_immutability() and enforce_renewal_terminal_immutability()
--    with a strictly controlled, transaction-scoped override (app.allow_org_deletion = 'true')
--    reachable exclusively during canonical account deletion.
-- 3. Provides the canonical, transactional PostgreSQL function delete_organization_account_canonical()
--    for atomic database-level organization account removal.

-- 1. Foreign Key Adjustments
alter table public.ypop_entries
  drop constraint if exists ypop_entries_submitted_by_fkey,
  add constraint ypop_entries_submitted_by_fkey
    foreign key (submitted_by) references auth.users(id) on delete set null;

alter table public.ypop_event_participations
  drop constraint if exists ypop_event_participations_submitted_by_fkey,
  add constraint ypop_event_participations_submitted_by_fkey
    foreign key (submitted_by) references auth.users(id) on delete set null;

alter table public.organization_renewals
  drop constraint if exists organization_renewals_current_accreditation_id_fkey,
  add constraint organization_renewals_current_accreditation_id_fkey
    foreign key (current_accreditation_id) references public.organization_accreditations(id) on delete set null;

-- 2. Controlled Immutability Override for Accreditation Ledger
create or replace function public.enforce_accreditation_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- Core historical term attributes must never be altered
    if old.term_number is distinct from new.term_number
       or old.start_date is distinct from new.start_date
       or old.end_date is distinct from new.end_date
       or old.certificate_urn is distinct from new.certificate_urn
       or old.approved_by is distinct from new.approved_by
       or old.approved_at is distinct from new.approved_at
       or old.created_at is distinct from new.created_at
       or old.is_legacy_inferred is distinct from new.is_legacy_inferred then
      raise exception 'Historical accreditation term fields are immutable.';
    end if;

    -- Revocation immutability rules:
    -- A. If previously revoked, revoked_at and revocation_reason cannot be altered
    if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
      raise exception 'Accreditation revocation timestamp is immutable once set.';
    end if;

    if old.revocation_reason is not null and new.revocation_reason is distinct from old.revocation_reason then
      raise exception 'Accreditation revocation reason is immutable once set.';
    end if;

    -- B. Non-revoked terms must never have a revoked_at timestamp
    if new.status <> 'revoked' and new.revoked_at is not null then
      raise exception 'Non-revoked accreditation terms cannot have a revocation timestamp.';
    end if;

    -- Valid status transitions only:
    -- active -> superseded (when subsequent renewal is approved)
    -- active -> revoked (by formal administrative action)
    if old.status = 'superseded' and new.status <> 'superseded' then
      raise exception 'A superseded accreditation term cannot be reactivated or altered.';
    end if;

    if old.status = 'revoked' and new.status <> 'revoked' then
      raise exception 'A revoked accreditation term cannot be reactivated.';
    end if;

    -- When transitioning to revoked, ensure revoked_at is populated
    if old.status <> 'revoked' and new.status = 'revoked' then
      if new.revoked_at is null then
        new.revoked_at := clock_timestamp();
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Controlled exception: allow deletion only during permanent account deletion transaction
    if current_setting('app.allow_org_deletion', true) = 'true' then
      return old;
    end if;
    raise exception 'Accreditation terms in the authoritative ledger cannot be deleted.';
  end if;

  return new;
end;
$$;

-- 3. Controlled Immutability Override for Renewal Applications
create or replace function public.enforce_renewal_terminal_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- A rejected renewal is terminal. It cannot be altered, reopened, or resubmitted.
    if old.status = 'rejected' and new.status <> 'rejected' then
      raise exception 'A rejected renewal application is terminal and cannot be transitioned or reopened.';
    end if;

    -- An approved renewal is terminal.
    if old.status = 'approved' and new.status <> 'approved' then
      raise exception 'An approved renewal application cannot be transitioned or altered.';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Controlled exception: allow deletion only during permanent account deletion transaction
    if current_setting('app.allow_org_deletion', true) = 'true' then
      return old;
    end if;
    if old.status in ('approved', 'rejected') then
      raise exception 'Historical terminal renewal applications cannot be deleted.';
    end if;
  end if;

  return new;
end;
$$;

-- 4. Canonical Database Account Deletion Transaction RPC
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

-- Grant permissions for authenticated and service_role callers (protected by session token internally)
grant execute on function public.delete_organization_account_canonical(text, uuid) to anon, authenticated, service_role;
