-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_user_has_any_role(array['admin']::public.app_role_code[]);
$function$;

CREATE OR REPLACE FUNCTION public.deactivate_admin_template_document(_session_token text, _template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  update public.required_document_types
  set
    is_active = false,
    updated_at = now()
  where id = _template_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_admin_account(_session_token text, _admin_id_to_delete uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_accounts a
    JOIN public.roles r ON r.id = a.role_id
    WHERE a.id = _admin_id AND 'administrators_management' = ANY(r.permission_codes)
  ) THEN
    RAISE EXCEPTION 'You do not have permission to manage admin accounts.';
  END IF;

  IF _admin_id = _admin_id_to_delete THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  -- 1. Explicitly purge all active admin sessions for this deleted administrator
  DELETE FROM public.admin_sessions WHERE admin_id = _admin_id_to_delete;

  -- 2. Delete the administrator account record
  DELETE FROM public.admin_accounts WHERE id = _admin_id_to_delete;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_admin_inquiry(_session_token text, _inquiry_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _inquiry public.inquiries%rowtype;
BEGIN
  -- 1. Authorize active admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin account is not authorized.'
    );
  END IF;

  -- 2. Find and lock the target inquiry
  SELECT *
  INTO _inquiry
  FROM public.inquiries
  WHERE id = _inquiry_id
  FOR UPDATE;

  IF _inquiry.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Inquiry not found.'
    );
  END IF;

  -- 3. Delete the inquiry
  DELETE FROM public.inquiries
  WHERE id = _inquiry_id;

  -- 4. Record the deletion in public.activity_logs if enabled
  IF public.is_audit_logging_enabled('deletion') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    )
    VALUES (
      _admin_id,
      _inquiry.organization_id,
      'delete_inquiry',
      'inquiry',
      _inquiry.id,
      'Deleted inquiry "' || coalesce(_inquiry.subject, 'General Inquiry') || '".',
      public.extract_audit_request_metadata()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', _inquiry_id,
    'deleted_subject', _inquiry.subject
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_admin_news_category(_session_token text, _category_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _cat public.news_categories%rowtype;
  _usage_count integer := 0;
begin
  -- 1. Authorize admin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Admin account is not authorized.'
    );
  end if;

  -- 2. Lock & load target category
  select *
  into _cat
  from public.news_categories
  where id = _category_id
  for update;

  if _cat.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Category not found.'
    );
  end if;

  -- 3. Reject system categories
  if _cat.is_system then
    return jsonb_build_object(
      'success', false,
      'error', 'System categories cannot be deleted.'
    );
  end if;

  -- 4. Re-check usage in news_releases (any status counts as usage)
  select count(*)
  into _usage_count
  from public.news_releases
  where lower(trim(regexp_replace(category, '\s+', ' ', 'g'))) = _cat.normalized_name;

  if _usage_count > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot delete "' || _cat.name || '" because it is currently used by ' || _usage_count || ' news release(s).'
    );
  end if;

  -- 5. Perform safe delete (no news release records deleted)
  delete from public.news_categories
  where id = _category_id;

  return jsonb_build_object(
    'success', true,
    'deleted_id', _category_id,
    'deleted_name', _cat.name
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_admin_news_release(_session_token text, _news_release_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  delete from public.news_releases
  where id = _news_release_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_admin_transparency_post(_session_token text, _post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  delete from public.transparency_posts
  where id = _post_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_organization_account_canonical(_session_token text, _organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    where ur.user_id = _user_id and r.code::text in ('admin', 'super_admin')
  )) then
    return jsonb_build_object(
      'success', false,
      'is_protected', true,
      'stage', 'protection_check',
      'error', 'Administrator accounts cannot be deleted from the YORP Registry.'
    );
  end if;

  perform ytrace_identity.authorize_reviewer(_session_token);
  if ytrace_identity.has_retained_history(_organization_id) then
    raise exception 'Official organization history is retained. Request an authorized archival/retention review before permanent deletion.';
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

    update public.ypop_org_activities
    set submitted_by = null
    where submitted_by = _user_id;

    -- Clean user specific auxiliary records
    delete from public.user_policy_acceptance where user_id = _user_id;
    delete from public.user_roles where user_id = _user_id;
    delete from public.user_profiles where user_id = _user_id;
  end if;

  -- 6. Clean accreditation and renewal hierarchies safely
  update public.organization_renewals
  set current_accreditation_id = null
  where organization_id = _organization_id;

  delete from public.organization_renewals
  where organization_id = _organization_id;

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
  delete from public.ypop_org_activities where organization_id = _organization_id;
  delete from public.ypop_event_participations where organization_id = _organization_id;
  delete from public.ypop_entries where organization_id = _organization_id;

  -- 9. Clean notifications, compliance remarks, inquiries
  delete from public.notifications where organization_id = _organization_id;
  delete from public.compliance_remarks where organization_id = _organization_id;
  delete from public.inquiries where organization_id = _organization_id;

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
$function$;

CREATE OR REPLACE FUNCTION public.delete_unverified_registration_account_canonical(_session_token text, _organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.derive_accreditation_status(_status text, _end_date date, _eval_date date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when _status = 'revoked' then 'revoked'
    when _status = 'superseded' then 'superseded'
    when _eval_date > _end_date then 'expired'
    when (_end_date - _eval_date) <= 90 then 'expiring_soon'
    else 'active'
  end;
$function$;

RESET check_function_bodies;

