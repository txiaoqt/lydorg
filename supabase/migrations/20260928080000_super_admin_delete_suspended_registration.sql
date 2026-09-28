-- Migration: 20260928080000_super_admin_delete_suspended_registration.sql
-- Purpose:
--   Enables Super Admin deletion of permanently suspended registration accounts
--   (profile_status = 'suspended_inactive') for fresh re-registration, while
--   strictly verifying caller role is 'super_admin' at the database/RPC level.
--   Preserves verification guard (verified organizations cannot be deleted from Registrations workflow).

create or replace function public.delete_unverified_registration_account_canonical(
  _session_token text,
  _organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin_id uuid;
  _is_super_admin boolean := false;
  _org public.organization_profiles%rowtype;
  _user_id uuid;
  _has_accreditation boolean;
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

  -- Verify if caller is super_admin
  select exists (
    select 1
    from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and r.code = 'super_admin'
  ) into _is_super_admin;

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
    where ur.user_id = _user_id and r.code::text in ('admin', 'super_admin')
  )) then
    return jsonb_build_object(
      'success', false,
      'is_protected', true,
      'stage', 'protection_check',
      'error', 'Administrator accounts cannot be deleted.'
    );
  end if;

  -- 4. Registration Eligibility Check:
  -- - Verified organizations cannot be deleted from Registrations workflow
  -- - Suspended organizations (suspended_inactive) can ONLY be deleted by Super Admin
  -- - Unverified active registration stages (incomplete, pending_review, needs_update) are allowed
  if _org.profile_status = 'verified' then
    return jsonb_build_object(
      'success', false,
      'stage', 'registration_eligibility',
      'error', 'Verified organizations cannot be deleted from the Registrations workflow. Manage the organization through the YORP Registry instead.'
    );
  end if;

  if _org.profile_status = 'suspended_inactive' then
    if not _is_super_admin then
      return jsonb_build_object(
        'success', false,
        'stage', 'authorization',
        'error', 'Only super administrators may delete permanently suspended registrations.'
      );
    end if;
  elsif _org.profile_status not in ('incomplete', 'pending_review', 'needs_update') then
    return jsonb_build_object(
      'success', false,
      'stage', 'registration_eligibility',
      'error', 'Only unverified registration-stage organizations (Pending Review or Needs Revision) can be deleted from the Registrations workflow.'
    );
  end if;

  -- 5. Safeguard for existing_urn / existing accreditation linkage
  -- If local accreditation record exists for this organization, block registration deletion
  select exists (
    select 1 from public.organization_accreditations
    where organization_id = _organization_id
  ) into _has_accreditation;

  if _has_accreditation then
    return jsonb_build_object(
      'success', false,
      'stage', 'accreditation_safeguard',
      'error', 'This registration cannot be permanently deleted from the Registration workflow because an accreditation record is already associated with this account. Manage the organization through the YORP Registry/accreditation workflow instead.'
    );
  end if;

  -- Also check if current_accreditation_id or renewal links exist in organization_renewals
  if exists (
    select 1 from public.organization_renewals
    where organization_id = _organization_id and current_accreditation_id is not null
  ) then
    return jsonb_build_object(
      'success', false,
      'stage', 'accreditation_safeguard',
      'error', 'This registration cannot be permanently deleted from the Registration workflow because an accreditation record is already associated with this account.'
    );
  end if;

  -- 6. Invoke the existing canonical cleanup RPC
  return public.delete_organization_account_canonical(_session_token, _organization_id);
end;
$$;
