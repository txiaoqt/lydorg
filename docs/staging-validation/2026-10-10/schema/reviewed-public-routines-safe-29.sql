-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.replace_organization_document_file(_file_id uuid, _document_type_id uuid, _expected_updated_at timestamp with time zone, _file_url text, _file_name text, _file_type text, _file_size bigint)
 RETURNS SETOF document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    created_at,
    metadata
  ) values (
    null,
    _organization.id,
    'Replaced document',
    'document_submission_file',
    _file.id,
    format('Uploaded a corrected version of %s.', coalesce(_document_name, _file_name)),
    _submitted_at,
    jsonb_build_object('actor_auth_user_id', _user_id, 'actor_type', 'organization')
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
      'Document Resubmitted',
      format('You have successfully uploaded a corrected version of ''%s''. It is now under review.', coalesce(_document_name, _file_name)),
      'completed',
      'document_submission',
      _submission.id,
      _submitted_at
    );
  end if;

  return query
  select *
  from public.document_submission_files
  where id = _file_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_pasig_district_from_barangay(_barangay_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _barangay text;
BEGIN
  _barangay := lower(regexp_replace(trim(coalesce(_barangay_name, '')), '^(barangay|brgy\.?)\s+', '', 'i'));
  _barangay := regexp_replace(_barangay, '^santa\s+', 'sta. ');
  _barangay := regexp_replace(_barangay, '^sta\s+', 'sta. ');
  _barangay := regexp_replace(_barangay, '^santo\s+', 'sto. ');
  _barangay := regexp_replace(_barangay, '^sto\s+', 'sto. ');

  IF _barangay IN (
    'bagong ilog', 'bagong katipunan', 'bambang', 'buting', 'caniogan', 'kalawaan',
    'kapasigan', 'kapitolyo', 'malinao', 'oranbo', 'palatiw', 'pineda', 'sagad',
    'san antonio', 'san joaquin', 'san jose', 'san nicolas', 'sta. cruz', 'sta. rosa',
    'sto. tomas', 'sumilang', 'ugong'
  ) THEN
    RETURN 'District I';
  ELSIF _barangay IN (
    'dela paz', 'manggahan', 'maybunga', 'pinagbuhatan', 'rosario', 'san miguel',
    'sta. lucia', 'santolan'
  ) THEN
    RETURN 'District II';
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_yorp_sample_activity_category(_activity_title text, _advocacies text[])
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _title text := lower(trim(coalesce(_activity_title, '')));
  _preferred text;
  _resolved text;
BEGIN
  _preferred := CASE
    WHEN _title LIKE '%disaster%' OR _title LIKE '%security%' OR _title LIKE '%first aid%' THEN 'peace building and security'
    WHEN _title LIKE '%leadership%' OR _title LIKE '%governance%' OR _title LIKE '%planning%' THEN 'governance'
    WHEN _title LIKE '%education%' OR _title LIKE '%academic%' OR _title LIKE '%technology%' THEN 'education'
    WHEN _title LIKE '%sport%' OR _title LIKE '%fitness%' OR _title LIKE '%wellness%' THEN 'health'
    WHEN _title LIKE '%environment%' OR _title LIKE '%tree-planting%' OR _title LIKE '%greening%' THEN 'environment'
    WHEN _title LIKE '%community%' OR _title LIKE '%civic%' OR _title LIKE '%outreach%' OR _title LIKE '%clean-up%' THEN 'social inclusion and equity'
    WHEN _title LIKE '%arts%' OR _title LIKE '%culture%' THEN 'education'
    ELSE NULL
  END;
  IF _preferred IS NOT NULL THEN
    SELECT cyp INTO _resolved FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE lower(trim(cyp)) = _preferred LIMIT 1;
  END IF;
  IF _resolved IS NULL THEN
    SELECT cyp INTO _resolved FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE trim(cyp) <> ''
    ORDER BY array_position(coalesce(_advocacies, ARRAY[]::text[]), cyp) LIMIT 1;
  END IF;
  RETURN _resolved;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_yorp_seed_budget_category(_legacy_category text, _advocacies text[])
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _preferred text;
  _resolved text;
BEGIN
  _preferred := CASE
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%leadership%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%governance%' THEN 'governance'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%education%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%technology%' THEN 'education'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%sport%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%fitness%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%health%' THEN 'health'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%environment%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%climate%' THEN 'environment'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%community%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%social inclusion%' THEN 'social inclusion and equity'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%arts%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%culture%' THEN 'education'
    ELSE NULL
  END;

  IF _preferred IS NOT NULL THEN
    SELECT cyp
    INTO _resolved
    FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE lower(trim(cyp)) = _preferred
    LIMIT 1;
  END IF;

  IF _resolved IS NULL THEN
    SELECT cyp
    INTO _resolved
    FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE trim(cyp) <> ''
    ORDER BY array_position(coalesce(_advocacies, ARRAY[]::text[]), cyp)
    LIMIT 1;
  END IF;

  RETURN _resolved;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resubmit_organization_urn(_urn text)
 RETURNS organization_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare _profile public.organization_profiles; _old_status public.urn_review_status;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(public.normalize_urn(_urn)) not between 4 and 80 or _urn ~ '[[:cntrl:]<>]' then
    raise exception 'The URN format could not be accepted';
  end if;
  select * into _profile from public.organization_profiles where user_id = auth.uid() for update;
  if _profile.registration_type <> 'existing_urn' then raise exception 'This organization is not registered through URN'; end if;
  if _profile.urn_review_status not in ('needs_correction','rejected') then raise exception 'The URN cannot be changed in its current state'; end if;
  _old_status := _profile.urn_review_status;
  perform set_config('app.urn_server_transition', 'on', true);
  update public.organization_profiles set urn = _urn, urn_review_status = 'pending',
    urn_admin_remarks = null, urn_reviewed_by = null, urn_reviewed_at = null,
    profile_status = 'pending_review', verification_method = null, verified_at = null
  where id = _profile.id returning * into _profile;
  insert into public.urn_review_history(organization_id,event_type,urn_value,actor_id,previous_status,new_status)
  values (_profile.id,'urn_updated',_profile.urn,auth.uid(),_old_status,'pending');
  return _profile;
end $function$;

CREATE OR REPLACE FUNCTION public.review_organization_urn(_session_token text, _organization_id uuid, _expected_urn text, _decision urn_review_status, _remarks text DEFAULT NULL::text)
 RETURNS organization_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare _admin_id uuid; _profile public.organization_profiles; _old_status public.urn_review_status;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat limit 1;
  if _admin_id is null then raise exception 'Authorized registration reviewer required'; end if;
  if _decision not in ('verified','needs_correction','rejected') then raise exception 'Invalid URN review decision'; end if;
  if _decision in ('needs_correction','rejected') and nullif(btrim(_remarks), '') is null then raise exception 'Admin feedback is required'; end if;
  select * into _profile from public.organization_profiles where id = _organization_id for update;
  if not found or _profile.registration_type <> 'existing_urn' then raise exception 'Existing-URN organization not found'; end if;
  if public.normalize_urn(_expected_urn) <> _profile.urn_normalized then raise exception 'The submitted URN changed; reload before reviewing'; end if;
  if _profile.urn_review_status not in ('pending','needs_correction','rejected') then raise exception 'Invalid URN review transition'; end if;
  if _decision = 'verified' and exists (
    select 1 from public.organization_profiles p where p.id <> _profile.id
      and p.urn_normalized = _profile.urn_normalized and p.urn_review_status = 'verified'
  ) then raise exception 'This URN is already verified for another organization'; end if;
  _old_status := _profile.urn_review_status;
  perform set_config('app.urn_server_transition', 'on', true);
  update public.organization_profiles set urn_review_status = _decision,
    urn_admin_remarks = nullif(btrim(_remarks), ''), urn_reviewed_by = _admin_id, urn_reviewed_at = now(),
    profile_status = case when _decision = 'verified' then 'verified'::public.profile_status else 'needs_update'::public.profile_status end,
    verification_method = case when _decision = 'verified' then 'urn'::public.verification_method else null end,
    verified_at = case when _decision = 'verified' then now() else null end
  where id = _profile.id returning * into _profile;
  insert into public.urn_review_history(organization_id,event_type,urn_value,actor_id,previous_status,new_status,admin_remarks)
  values (_profile.id,case _decision when 'verified' then 'urn_verified' when 'needs_correction' then 'urn_marked_needs_correction' else 'urn_rejected' end,
    _profile.urn,_admin_id,_old_status,_decision,nullif(btrim(_remarks),''));
  return _profile;
end $function$;

CREATE OR REPLACE FUNCTION public.revoke_admin_session_token(_session_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _admin_name text;
BEGIN
  SELECT s.admin_id, a.display_name INTO _admin_id, _admin_name
  FROM public.admin_sessions s
  JOIN public.admin_accounts a ON a.id = s.admin_id
  WHERE s.token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
  LIMIT 1;

  UPDATE public.admin_sessions
  SET revoked_at = now()
  WHERE token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    AND revoked_at IS NULL;

  IF _admin_id IS NOT NULL AND public.is_audit_logging_enabled('logout') THEN
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
      NULL,
      'admin_sign_out',
      'admin_session',
      _admin_id,
      'Administrator signed out: ' || coalesce(_admin_name, 'Admin User'),
      public.extract_audit_request_metadata()
    );
  END IF;
END;
$function$;

RESET check_function_bodies;

