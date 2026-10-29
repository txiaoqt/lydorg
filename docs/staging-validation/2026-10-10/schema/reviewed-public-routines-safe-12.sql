-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_reject_renewal_in_supabase(p_session_token text, p_renewal_id uuid, p_admin_remarks text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _admin_email text;
  _renewal public.organization_renewals%rowtype;
  _submission public.document_submissions%rowtype;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id, vat.email
  INTO _admin_id, _admin_email
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = _admin_id
      AND au.is_active = true
      AND (au.role_code = 'super_admin' OR 'renewals_manage' = ANY(au.permission_codes))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to reject renewal applications.';
  END IF;

  _remarks := trim(coalesce(p_admin_remarks, ''));
  IF _remarks = '' THEN
    RAISE EXCEPTION 'Remarks documenting the rejection rationale are mandatory.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'needs_revision') THEN
    RAISE EXCEPTION 'Renewal is not in a rejectable status: %', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.organization_renewals
  SET
    status = 'rejected',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = _remarks,
    updated_at = _now
  WHERE id = p_renewal_id;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'rejected',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = _remarks,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  UPDATE public.organization_profiles
  SET
    profile_status = 'suspended_inactive',
    updated_at = _now
  WHERE id = _renewal.organization_id;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  -- Gated organization notification based on workflow.notify_org_on_rejected
  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_rejected', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Rejected',
      format('Your organization renewal for Cycle %s was rejected: %s', _renewal.cycle_number, _remarks),
      'renewal_rejected',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Activity logging remains unconditional
  INSERT INTO public.activity_logs (
    organization_id,
    actor_user_id,
    action,
    related_type,
    related_id,
    description,
    created_at
  ) VALUES (
    _renewal.organization_id,
    _admin_id,
    'renewal_rejected',
    'renewal',
    p_renewal_id::text,
    format('Rejected renewal application for Cycle %s by admin %s. Remarks: %s', _renewal.cycle_number, _admin_email, _remarks),
    _now
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'rejected'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_request_renewal_revision(p_session_token text, p_renewal_id uuid, p_admin_remarks text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _renewal record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _remarks text := trim(p_admin_remarks);
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF length(_remarks) < 10 THEN
    RAISE EXCEPTION 'Meaningful revision remarks of at least 10 characters are required.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Revision can only be requested from reviewable status. Current status: "%".', _renewal.status;
  END IF;

  -- Ensure at least one file is marked needs_revision or rejected
  IF NOT EXISTS (
    SELECT 1
    FROM public.document_submissions ds
    JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
    WHERE ds.renewal_id = p_renewal_id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'At least one document file must be marked for revision or rejection before requesting revision.';
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  -- Update renewal state
  UPDATE public.organization_renewals
  SET
    status = 'needs_revision',
    admin_remarks = _remarks,
    reviewed_by = _admin_id,
    reviewed_at = _now,
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update document submission packet state
  UPDATE public.document_submissions
  SET
    status = 'needs_revision',
    reviewed_by = _admin_id,
    reviewed_at = _now,
    overall_remarks = _remarks,
    updated_at = _now
  WHERE renewal_id = p_renewal_id;

  -- Send notification with uuid related_id
  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Revision Requested',
      format('Revisions requested for renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
      'document_revision',
      'renewal',
      p_renewal_id
    );
  END IF;

  -- Insert activity log with uuid related_id
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _admin_id,
    _renewal.organization_id,
    'renewal_needs_revision',
    'renewal',
    p_renewal_id,
    format('Admin requested revisions for renewal Cycle %s: %s', _renewal.cycle_number, _remarks)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'needs_revision'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_request_renewal_revision_in_supabase(p_session_token text, p_renewal_id uuid, p_admin_remarks text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _admin_email text;
  _renewal public.organization_renewals%rowtype;
  _submission public.document_submissions%rowtype;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _revision_due timestamptz := _now + interval '5 days';
  _remarks text;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id, vat.email
  INTO _admin_id, _admin_email
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = _admin_id
      AND au.is_active = true
      AND (au.role_code = 'super_admin' OR 'renewals_manage' = ANY(au.permission_codes))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to request renewal revisions.';
  END IF;

  _remarks := trim(coalesce(p_admin_remarks, ''));
  IF _remarks = '' THEN
    RAISE EXCEPTION 'Remarks explaining the required revisions are mandatory.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Renewal is not in a reviewable status: %', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.organization_renewals
  SET
    status = 'needs_revision',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = _remarks,
    revision_requested_at = _now,
    revision_due_at = _revision_due,
    revision_locked = false,
    updated_at = _now
  WHERE id = p_renewal_id;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'needs_revision',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = _remarks,
      revision_requested_at = _now,
      revision_due_at = _revision_due,
      revision_locked = false,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  UPDATE public.organization_profiles
  SET
    profile_status = 'needs_update',
    updated_at = _now
  WHERE id = _renewal.organization_id;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  -- Gated organization notification based on workflow.notify_org_on_needs_revision
  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Renewal Revision Requested',
      format('Revisions requested for renewal Cycle %s: %s', _renewal.cycle_number, _remarks),
      'document_revision',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Activity logging remains unconditional
  INSERT INTO public.activity_logs (
    organization_id,
    actor_user_id,
    action,
    related_type,
    related_id,
    description,
    created_at
  ) VALUES (
    _renewal.organization_id,
    _admin_id,
    'renewal_revision_requested',
    'renewal',
    p_renewal_id::text,
    format('Requested revisions for renewal Cycle %s by admin %s. Remarks: %s', _renewal.cycle_number, _admin_email, _remarks),
    _now
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'needs_revision',
    'revision_due_at', _revision_due
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_renewal_test_scenario(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_restore_renewal_test_scenario(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_organization_identity(_session_token text, _organization_id uuid, _candidate_id uuid, _decision text, _reason text, _evidence_reference text, _expected_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
declare _admin uuid; _p public.organization_profiles; _candidate public.organization_profiles; _case ytrace_identity.cases;
begin
 _admin:=ytrace_identity.authorize_reviewer(_session_token);
 if _decision not in ('confirmed_different','confirmed_existing','more_information','rejected') or _decision is null then raise exception 'Invalid identity decision.'; end if;
 if length(trim(coalesce(_reason,''))) not between 10 and 3000 or length(trim(coalesce(_evidence_reference,''))) not between 5 and 1000 then
   raise exception 'Record the review reason and official verification evidence reference.'; end if;
 select * into _p from public.organization_profiles where id=_organization_id for update;
 if not found then raise exception 'Registration not found.'; end if;
 perform ytrace_identity.assess(_p);
 select * into _case from ytrace_identity.cases where organization_id=_organization_id for update;
 if _expected_version is distinct from _case.version then raise exception 'Identity details changed. Reload before reviewing.'; end if;
 if _case.canonical_organization_id is not null then raise exception 'Confirmed canonical identity cannot be unlinked through registration review.'; end if;
 if _candidate_id is not null then
   select * into _candidate from public.organization_profiles where id=_candidate_id for update;
   if not found or _candidate_id=_organization_id or not exists(select 1 from ytrace_identity.candidates(_p.organization_name,_p.barangay,
      case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id) p where p.id=_candidate_id) then
     raise exception 'Select a current candidate from the reviewed registration.'; end if;
 elsif _decision='confirmed_existing' or (_decision='confirmed_different' and exists(select 1 from ytrace_identity.candidates(_p.organization_name,_p.barangay,
   case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id))) then
   raise exception 'A current candidate is required for an identity determination.';
 end if;
 if _decision='confirmed_existing' and ((not (
    _candidate.profile_status::text='verified' or _candidate.verified_at is not null
    or exists(select 1 from public.organization_accreditations where organization_id=_candidate.id)
    or exists(select 1 from public.organization_renewals where organization_id=_candidate.id)
    or exists(select 1 from public.budget_requests where organization_id=_candidate.id and status::text<>'draft')
    or exists(select 1 from public.liquidation_reports where organization_id=_candidate.id)
    -- An authorized evidence decision may preserve the earlier original pending
    -- registration when both accounts are still pending. This does not verify it.
    or (_candidate.created_at,_candidate.id)<(_p.created_at,_p.id)
   )) or exists(select 1 from ytrace_identity.cases
    where organization_id=_candidate.id and canonical_organization_id is not null)) then
   raise exception 'Select the original verified/retained identity or earlier original pending registration; later applicants cannot become canonical identities.';
 end if;
 if _decision='confirmed_different' and _p.registration_type::text='existing_urn'
    and _candidate.urn_normalized=public.normalize_urn(_p.urn) then raise exception 'An existing official URN cannot be assigned to a different organization.'; end if;
 insert into ytrace_identity.decisions(organization_id,candidate_id,subject_fingerprint,candidate_fingerprint,decision,admin_id,reason,evidence_reference)
 values(_p.id,_candidate.id,ytrace_identity.fingerprint(_p),case when _candidate.id is not null then ytrace_identity.candidate_fingerprint(_candidate) else null end,
   _decision,_admin,trim(_reason),trim(_evidence_reference));
 update ytrace_identity.cases set outcome=case _decision when 'confirmed_existing' then 'CONFIRMED_EXISTING' when 'more_information' then 'MORE_INFORMATION'
   when 'rejected' then 'REJECTED' else 'NO_MATCH' end,
   canonical_organization_id=case when _decision='confirmed_existing' then _candidate.id else null end,
   version=version+1,updated_at=now() where organization_id=_p.id;
 -- This does NOT approve accreditation, transfer ownership, merge records or change financial IDs.
 return public.admin_get_organization_identity_review(_session_token,_p.id);
end $function$;

CREATE OR REPLACE FUNCTION public.admin_save_annual_budget_allocation(_session_token text, _fiscal_year integer, _total_amount numeric, _statutory_baseline_notes text DEFAULT NULL::text, _is_active boolean DEFAULT true)
 RETURNS SETOF annual_budget_allocations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF _total_amount < 0 THEN
    RAISE EXCEPTION 'Total budget allocation amount cannot be negative.';
  END IF;

  IF _fiscal_year < 2000 OR _fiscal_year > 2100 THEN
    RAISE EXCEPTION 'Fiscal year must be between 2000 and 2100.';
  END IF;

  INSERT INTO public.annual_budget_allocations (
    fiscal_year,
    total_amount,
    statutory_baseline_notes,
    is_active,
    updated_at
  )
  VALUES (
    _fiscal_year,
    _total_amount,
    _statutory_baseline_notes,
    COALESCE(_is_active, true),
    now()
  )
  ON CONFLICT (fiscal_year) DO UPDATE
  SET
    total_amount = EXCLUDED.total_amount,
    statutory_baseline_notes = EXCLUDED.statutory_baseline_notes,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.annual_budget_allocations
  WHERE fiscal_year = _fiscal_year;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_budget_purpose_category(_session_token text, _name text, _description text DEFAULT NULL::text, _sort_order integer DEFAULT 0, _is_active boolean DEFAULT true)
 RETURNS SETOF budget_purpose_categories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _trimmed_name text := trim(_name);
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF _trimmed_name = '' THEN
    RAISE EXCEPTION 'Purpose category name cannot be blank.';
  END IF;

  INSERT INTO public.budget_purpose_categories (name, description, sort_order, is_active, updated_at)
  VALUES (_trimmed_name, _description, COALESCE(_sort_order, 0), COALESCE(_is_active, true), now())
  ON CONFLICT (name) DO UPDATE
  SET
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.budget_purpose_categories
  WHERE name = _trimmed_name;
END;
$function$;

RESET check_function_bodies;

