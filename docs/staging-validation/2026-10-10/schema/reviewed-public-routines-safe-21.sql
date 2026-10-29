-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.evaluate_and_apply_automatic_registration_verification(_organization_id uuid, _admin_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(verified boolean, urn text, already_verified boolean, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select coalesce(array_agg(rdt.id), '{}'::uuid[])
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

  -- Fallback if no specific registration tags are set
  if array_length(_required_type_ids, 1) is null or array_length(_required_type_ids, 1) = 0 then
    select coalesce(array_agg(rdt.id), '{}'::uuid[])
    into _required_type_ids
    from public.required_document_types rdt
    where rdt.is_active = true;
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

  -- 7. Update organization profile with official verified status and assigned URN (using actual schema)
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

  -- 9. Canonical Activity Log
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
    'Verified organization registration',
    'organization_profile',
    _organization_id,
    format('Organization registration verified automatically upon approval of all required documents. Assigned URN: %s (Valid until %s).', _official_urn, _end_date),
    _effective_verified_at
  );

  -- 10. Gated In-App Notification based on workflow.notify_org_on_approved
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  if _target_org.user_id is not null and _notify_approved then
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
      format('Congratulations! Your organization registration has been approved and verified. Your official URN is %s.', _official_urn),
      'completed',
      'organization_profile',
      _organization_id,
      _effective_verified_at
    );
  end if;

  return query select true, _official_urn, false, 'Registration successfully verified.';
end;
$function$;

CREATE OR REPLACE FUNCTION public.extract_audit_request_metadata()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _headers jsonb;
  _meta jsonb := '{}'::jsonb;
  _ua text;
  _ip text;
BEGIN
  BEGIN
    _headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    _headers := NULL;
  END;

  IF _headers IS NOT NULL THEN
    -- User-Agent
    IF public.is_audit_logging_enabled('metadata_user_agent') THEN
      _ua := coalesce(_headers->>'user-agent', _headers->>'User-Agent');
      IF _ua IS NOT NULL AND trim(_ua) <> '' THEN
        _meta := _meta || jsonb_build_object('user_agent', trim(_ua));
      END IF;
    END IF;

    -- Client IP (reads standard proxy headers forwarded by Supabase / Cloudflare)
    IF public.is_audit_logging_enabled('metadata_ip') THEN
      _ip := coalesce(
        _headers->>'x-forwarded-for',
        _headers->>'cf-connecting-ip',
        _headers->>'x-real-ip'
      );
      IF _ip IS NOT NULL AND trim(_ip) <> '' THEN
        _ip := trim(split_part(_ip, ',', 1));
        _meta := _meta || jsonb_build_object('ip_address', _ip);
      END IF;
    END IF;
  END IF;

  RETURN _meta;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_organization_reference_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _year text;
  _sequence int;
  _candidate text;
begin
  -- If reference_id is already explicitly assigned, keep it
  if new.reference_id is not null and trim(new.reference_id) <> '' then
    return new;
  end if;

  _year := to_char(coalesce(new.created_at, now()), 'YYYY');

  -- Atomically increment and lock the year counter
  insert into public.organization_reference_counters (year, last_value)
  values (_year, (
    select coalesce(max(substring(reference_id from 'REG-[0-9]{4}-([0-9]+)')::int), 0) + 1
    from public.organization_profiles
    where reference_id like 'REG-' || _year || '-%'
  ))
  on conflict (year) do update
  set last_value = greatest(
    organization_reference_counters.last_value + 1,
    coalesce((
      select max(substring(reference_id from 'REG-[0-9]{4}-([0-9]+)')::int) + 1
      from public.organization_profiles
      where reference_id like 'REG-' || excluded.year || '-%'
    ), organization_reference_counters.last_value + 1)
  )
  returning last_value into _sequence;

  -- Collision avoidance loop against any manually inserted or anomalous existing IDs
  loop
    _candidate := 'REG-' || _year || '-' || lpad(_sequence::text, 4, '0');
    exit when not exists (
      select 1 from public.organization_profiles where reference_id = _candidate
    );
    _sequence := _sequence + 1;
    update public.organization_reference_counters
    set last_value = _sequence
    where year = _year;
  end loop;

  new.reference_id := _candidate;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_unique_urn(_barangay text, _effective_verified_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _bb text;
  _yy text;
  _full_year text;
  _sequence int;
  _candidate text;
BEGIN
  -- 1. Resolve 2-digit barangay ordinal BB (01-30)
  _bb := public.get_pasig_barangay_ordinal(_barangay);

  -- 2. Derive approval year YY (2 digits) and full year YYYY (4 digits)
  _yy := to_char(coalesce(_effective_verified_at, now()), 'YY');
  _full_year := to_char(coalesce(_effective_verified_at, now()), 'YYYY');

  -- 3. Atomically increment and lock the global annual counter
  INSERT INTO public.organization_urn_counters (year, last_value)
  VALUES (_full_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET last_value = public.organization_urn_counters.last_value + 1
  RETURNING last_value INTO _sequence;

  -- 4. Format BB-YY-NNN and ensure absolute uniqueness against profile and ledger records
  LOOP
    _candidate := _bb || '-' || _yy || '-' || lpad(_sequence::text, 3, '0');

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.organization_profiles
      WHERE urn_normalized = public.normalize_urn(_candidate)
         OR upper(trim(coalesce(organization_identifier_number, ''))) = public.normalize_urn(_candidate)
         OR upper(trim(coalesce(urn, ''))) = public.normalize_urn(_candidate)
    ) AND NOT EXISTS (
      SELECT 1 FROM public.organization_accreditations
      WHERE upper(trim(certificate_urn)) = public.normalize_urn(_candidate)
    );

    _sequence := _sequence + 1;
    UPDATE public.organization_urn_counters
    SET last_value = _sequence
    WHERE year = _full_year;
  END LOOP;

  RETURN _candidate;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_inquiries(_session_token text)
 RETURNS TABLE(id uuid, organization_id uuid, submitted_by uuid, submitter_name text, organization_name text, email citext, subject text, description text, status inquiry_status, admin_remarks text, reviewed_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
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

  return query
  select
    i.id,
    i.organization_id,
    i.submitted_by,
    i.submitter_name,
    i.organization_name,
    i.email,
    i.subject,
    i.description,
    i.status,
    i.admin_remarks,
    i.reviewed_at,
    i.created_at,
    i.updated_at
  from public.inquiries i
  order by i.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_permission_context(_session_token text)
 RETURNS TABLE(role_code text, role_label text, permission_codes text[])
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

  return query
  select r.code::text, r.label, r.permission_codes
  from public.admin_accounts a
  join public.roles r on r.id = a.role_id
  where a.id = _admin_id;
end;
$function$;

RESET check_function_bodies;

