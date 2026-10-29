-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.revoke_organization_accreditation(_session_token text, _accreditation_id uuid, _revocation_reason text DEFAULT NULL::text, _revoked_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS organization_accreditations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _acc public.organization_accreditations%rowtype;
  _effective_revoked_at timestamptz;
  _trimmed_reason text;
begin
  -- Authorize admin session
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select * into _acc
  from public.organization_accreditations
  where id = _accreditation_id
  for update;

  if not found then
    raise exception 'Accreditation record not found.';
  end if;

  if _acc.status = 'revoked' then
    raise exception 'Accreditation is already revoked.';
  end if;

  if _acc.status = 'superseded' then
    raise exception 'Cannot revoke a superseded historical accreditation term.';
  end if;

  -- HARDENING: Normal administrative revocation strictly assigns server clock_timestamp()
  -- Client-supplied timestamps are ignored to preserve historical ledger integrity.
  _effective_revoked_at := clock_timestamp();
  _trimmed_reason := nullif(trim(_revocation_reason), '');

  -- Atomically update accreditation ledger
  update public.organization_accreditations
  set
    status = 'revoked',
    revoked_at = _effective_revoked_at,
    revocation_reason = _trimmed_reason
  where id = _accreditation_id
  returning * into _acc;

  -- Synchronize organization profile projection to suspended_inactive
  update public.organization_profiles
  set
    profile_status = 'suspended_inactive'::public.profile_status,
    updated_at = now()
  where id = _acc.organization_id;

  -- Write audit log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    _admin_id,
    _acc.organization_id,
    'Revoked Accreditation',
    'organization_accreditation',
    _accreditation_id,
    format('Revoked accreditation term %s. Reason: %s', _acc.term_number, coalesce(_trimmed_reason, 'No reason specified'))
  );

  return _acc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.search_public_organizations()
 RETURNS TABLE(organization_id uuid, organization_name text, profile_image_url text, major_classification text, sub_classification text, district text, barangay text, advocacies text[], facebook_page_url text, verified_at timestamp with time zone, yorp_registered_year smallint, representative_name text, adviser_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_profiles viewer
    where viewer.user_id = auth.uid() and viewer.profile_status = 'verified'
  ) then raise exception 'A verified organization account is required.'; end if;

  return query
  select
    op.id,
    op.organization_name,
    coalesce(op.profile_image_url, ''),
    coalesce(op.major_classification::text, ''),
    coalesce(op.sub_classification::text, ''),
    coalesce(op.district, ''),
    coalesce(op.barangay, ''),
    coalesce(op.advocacies::text[], array[]::text[]),
    coalesce(op.facebook_page_url, ''),
    op.verified_at,
    op.yorp_registered_year,
    case when op.directory_show_representative then coalesce(op.representative_name, '') else '' end,
    case when op.directory_show_adviser then coalesce(op.adviser_name, '') else '' end
  from public.organization_profiles op
  where op.profile_status = 'verified'
    and op.directory_visibility = true
    and op.user_id <> auth.uid()
  order by op.organization_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_admin_account_active(_session_token text, _admin_id_to_update uuid, _is_active boolean)
 RETURNS TABLE(id uuid, display_name text, email text, username text, role_id smallint, unit_id smallint, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to manage admin accounts.';
  end if;

  if _admin_id = _admin_id_to_update and not _is_active then
    raise exception 'You cannot suspend your own account.';
  end if;

  return query
  update public.admin_accounts
  set is_active = _is_active, updated_at = now()
  where admin_accounts.id = _admin_id_to_update
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_budget_request_fiscal_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _default_fy integer;
BEGIN
  IF NEW.fiscal_year IS NULL THEN
    _default_fy := public.get_system_setting_int('budget.default_fiscal_year', EXTRACT(YEAR FROM CURRENT_DATE)::integer);
    NEW.fiscal_year := COALESCE(
      EXTRACT(YEAR FROM NEW.release_date)::integer,
      EXTRACT(YEAR FROM NEW.activity_date)::integer,
      EXTRACT(YEAR FROM NEW.created_at)::integer,
      _default_fy
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_initial_admin_password(_new_password text)
 RETURNS TABLE(id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  _caller_email text;
  _matched_id uuid;
  _matched_username text;
begin
  select email into _caller_email from auth.users where auth.users.id = auth.uid();

  if _caller_email is null then
    raise exception 'This invite link is invalid or has expired.';
  end if;

  select admin_accounts.id, admin_accounts.username
    into _matched_id, _matched_username
  from public.admin_accounts
  where lower(admin_accounts.email) = lower(_caller_email)
    and admin_accounts.is_password_set = false;

  if _matched_id is null then
    raise exception 'This invite link is invalid or has expired.';
  end if;

  update public.admin_accounts
  set
    password_hash = crypt(_new_password, gen_salt('bf')),
    is_password_set = true,
    updated_at = now()
  where admin_accounts.id = _matched_id;

  return query select _matched_id, _matched_username;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_organization_accreditation_projection()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.status = 'active' then
      update public.organization_profiles
      set
        current_accreditation_id = new.id,
        accreditation_start_date = new.start_date,
        accreditation_expires_at = (new.end_date::text || 'T23:59:59+08:00')::timestamptz
      where id = new.organization_id;
    elsif (tg_op = 'UPDATE' and old.status = 'active' and new.status in ('superseded', 'revoked')) then
      -- If active was superseded or revoked, update projection to latest active or keep latest term
      update public.organization_profiles op
      set
        current_accreditation_id = new.id,
        accreditation_start_date = new.start_date,
        accreditation_expires_at = (new.end_date::text || 'T23:59:59+08:00')::timestamptz
      where op.id = new.organization_id
        and op.current_accreditation_id = old.id;
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_organization_contacts_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _item text;
  _order integer := 0;
BEGIN
  -- Remove existing contacts for this organization
  DELETE FROM public.organization_contacts WHERE organization_id = NEW.id;

  -- Insert primary email
  IF NEW.organization_email IS NOT NULL AND trim(NEW.organization_email) <> '' THEN
    INSERT INTO public.organization_contacts (
      organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
    ) VALUES (
      NEW.id, 'email', trim(NEW.organization_email), true, 0, NEW.created_at, clock_timestamp()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Insert additional emails
  IF NEW.additional_emails IS NOT NULL AND array_length(NEW.additional_emails, 1) > 0 THEN
    _order := 0;
    FOREACH _item IN ARRAY NEW.additional_emails LOOP
      _order := _order + 1;
      INSERT INTO public.organization_contacts (
        organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
      ) VALUES (
        NEW.id, 'email', trim(_item), false, _order, clock_timestamp(), clock_timestamp()
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Insert primary phone
  IF NEW.contact_number IS NOT NULL AND trim(NEW.contact_number) <> '' THEN
    INSERT INTO public.organization_contacts (
      organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
    ) VALUES (
      NEW.id, 'phone', trim(NEW.contact_number), true, 0, NEW.created_at, clock_timestamp()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Insert additional phones
  IF NEW.additional_contact_numbers IS NOT NULL AND array_length(NEW.additional_contact_numbers, 1) > 0 THEN
    _order := 0;
    FOREACH _item IN ARRAY NEW.additional_contact_numbers LOOP
      _order := _order + 1;
      INSERT INTO public.organization_contacts (
        organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
      ) VALUES (
        NEW.id, 'phone', trim(_item), false, _order, clock_timestamp(), clock_timestamp()
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_organization_profile_structured_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Normalize and sync Head of Organization (Representative)
  IF NEW.representative_first_name IS NOT NULL OR NEW.representative_last_name IS NOT NULL THEN
    NEW.representative_first_name := nullif(trim(NEW.representative_first_name), '');
    NEW.representative_middle_name := nullif(trim(NEW.representative_middle_name), '');
    NEW.representative_last_name := nullif(trim(NEW.representative_last_name), '');
    NEW.representative_suffix := nullif(trim(NEW.representative_suffix), '');

    IF NEW.representative_first_name IS NOT NULL AND NEW.representative_last_name IS NOT NULL THEN
      NEW.representative_name := trim(concat_ws(' ',
        NEW.representative_first_name,
        NEW.representative_middle_name,
        NEW.representative_last_name,
        NEW.representative_suffix
      ));
    END IF;
  END IF;

  -- Normalize and sync Adviser
  IF NEW.adviser_first_name IS NOT NULL OR NEW.adviser_last_name IS NOT NULL THEN
    NEW.adviser_first_name := nullif(trim(NEW.adviser_first_name), '');
    NEW.adviser_middle_name := nullif(trim(NEW.adviser_middle_name), '');
    NEW.adviser_last_name := nullif(trim(NEW.adviser_last_name), '');
    NEW.adviser_suffix := nullif(trim(NEW.adviser_suffix), '');

    IF NEW.adviser_first_name IS NOT NULL AND NEW.adviser_last_name IS NOT NULL THEN
      NEW.adviser_name := trim(concat_ws(' ',
        NEW.adviser_first_name,
        NEW.adviser_middle_name,
        NEW.adviser_last_name,
        NEW.adviser_suffix
      ));
    END IF;
  END IF;

  -- Normalize and sync structured address
  IF NEW.address_street IS NOT NULL OR NEW.address_barangay IS NOT NULL OR NEW.address_unit_building IS NOT NULL THEN
    NEW.address_unit_building := nullif(trim(NEW.address_unit_building), '');
    NEW.address_street := nullif(trim(NEW.address_street), '');
    NEW.address_subdivision := nullif(trim(NEW.address_subdivision), '');
    NEW.address_barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
    NEW.address_city := coalesce(nullif(trim(NEW.address_city), ''), 'Pasig City');
    NEW.address_province := coalesce(nullif(trim(NEW.address_province), ''), 'Metro Manila');
    NEW.address_zip_code := nullif(trim(NEW.address_zip_code), '');

    IF NEW.address_barangay IS NOT NULL THEN
      NEW.barangay := NEW.address_barangay;
    END IF;

    IF NEW.address_street IS NOT NULL THEN
      NEW.address := trim(concat_ws(', ',
        NEW.address_unit_building,
        NEW.address_street,
        NEW.address_subdivision,
        NEW.address_barangay,
        NEW.address_city,
        NEW.address_province,
        NEW.address_zip_code
      ));
    END IF;
  ELSIF NEW.barangay IS NOT NULL AND (NEW.address_barangay IS NULL OR trim(NEW.address_barangay) = '') THEN
    NEW.address_barangay := trim(NEW.barangay);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_organization_urn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  -- For verified profiles, preserve and synchronize the official URN across all 3 fields
  if new.profile_status = 'verified'::public.profile_status then
    if new.urn is not null and trim(new.urn) <> '' then
      new.urn := btrim(new.urn);
      new.urn_normalized := public.normalize_urn(new.urn);
      new.organization_identifier_number := new.urn;
    elsif new.organization_identifier_number is not null and trim(new.organization_identifier_number) <> '' then
      new.urn := btrim(new.organization_identifier_number);
      new.urn_normalized := public.normalize_urn(new.urn);
      new.organization_identifier_number := new.urn;
    end if;
    return new;
  end if;

  -- For unverified profiles:
  if new.registration_type = 'existing_urn' then
    new.urn := btrim(new.urn);
    new.urn_normalized := public.normalize_urn(new.urn);
    if new.urn_review_status = 'not_applicable' then new.urn_review_status := 'pending'; end if;
    new.is_existing_organization := true;
    new.organization_identifier_number := coalesce(new.urn, '');
  else
    new.urn := null;
    new.urn_normalized := null;
    new.urn_review_status := 'not_applicable';
    new.urn_admin_remarks := null;
    new.urn_reviewed_by := null;
    new.urn_reviewed_at := null;
    new.is_existing_organization := false;
    new.organization_identifier_number := '';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_ypop_city_activity_participations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.ypop_event_participations
  set
    activity_name = new.name,
    activity_date = new.date,
    venue = new.venue,
    updated_at = now()
  where activity_id = new.id
    and (
      activity_name is distinct from new.name
      or activity_date is distinct from new.date
      or venue is distinct from new.venue
    );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_move_application_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_ypop_org_activity_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.try_get_pasig_barangay_ordinal(_barangay text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  return public.get_pasig_barangay_ordinal(_barangay);
exception when others then
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_account(_session_token text, _admin_id_to_update uuid, _display_name text, _email text, _username text, _role_id smallint, _unit_id smallint)
 RETURNS TABLE(id uuid, display_name text, email text, username text, role_id smallint, unit_id smallint, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to manage admin accounts.';
  end if;

  if _admin_id = _admin_id_to_update and _role_id is distinct from (
    select admin_accounts.role_id from public.admin_accounts where admin_accounts.id = _admin_id
  ) then
    raise exception 'You cannot change your own role.';
  end if;

  return query
  update public.admin_accounts
  set
    display_name = trim(_display_name),
    username = trim(_username),
    role_id = _role_id,
    unit_id = _unit_id,
    updated_at = now()
  where admin_accounts.id = _admin_id_to_update
  returning admin_accounts.id, admin_accounts.display_name, admin_accounts.email::text, admin_accounts.username::text, admin_accounts.role_id, admin_accounts.unit_id, admin_accounts.is_active;
end;
$function$;

RESET check_function_bodies;

