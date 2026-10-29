-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_approve_renewal(p_session_token text, p_renewal_id uuid, p_certificate_urn text DEFAULT NULL::text, p_admin_remarks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _now timestamptz := clock_timestamp();
  _today date := current_date;
  _renewal record;
  _curr_acc record;
  _target_org record;
  _submission record;
  _owner_id uuid;
  _old_urn text;
  _official_urn text;
  _anchor_cutoff date;
  _start_date date;
  _end_date date;
  _new_accreditation_id uuid;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Lock Renewal Record
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal record not found: %', p_renewal_id;
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Renewal is not in a reviewable status: %', _renewal.status;
  END IF;

  -- Lock Organization Profile
  SELECT * INTO _target_org
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization profile not found.';
  END IF;

  _old_urn := coalesce(_target_org.urn, _target_org.organization_identifier_number, '');

  -- Lock Current Accreditation Record if present
  IF _renewal.current_accreditation_id IS NOT NULL THEN
    SELECT * INTO _curr_acc
    FROM public.organization_accreditations
    WHERE id = _renewal.current_accreditation_id
    FOR UPDATE;
  ELSE
    SELECT * INTO _curr_acc
    FROM public.organization_accreditations
    WHERE organization_id = _renewal.organization_id
      AND status = 'active'
    ORDER BY term_number DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- Compute Term Dates (Standard Continuous Protection Anchor: 3-Year Terms)
  IF _curr_acc.id IS NOT NULL AND _curr_acc.end_date IS NOT NULL THEN
    _anchor_cutoff := (_curr_acc.end_date + 30);
    IF _today <= _anchor_cutoff THEN
      _start_date := _curr_acc.end_date;
      _end_date := (_curr_acc.end_date + interval '3 years')::date;
    ELSE
      _start_date := _today;
      _end_date := (_today + interval '3 years')::date;
    END IF;
  ELSE
    _start_date := _today;
    _end_date := (_today + interval '3 years')::date;
  END IF;

  -- Generate or use URN
  IF p_certificate_urn IS NOT NULL AND trim(p_certificate_urn) <> '' THEN
    _official_urn := trim(p_certificate_urn);
  ELSE
    _official_urn := public.generate_unique_urn(_target_org.barangay, _now);
  END IF;

  IF _official_urn IS NULL OR trim(_official_urn) = '' THEN
    RAISE EXCEPTION 'Failed to generate authoritative URN for renewal approval.';
  END IF;

  -- Supersede previous active accreditation term(s)
  UPDATE public.organization_accreditations
  SET status = 'superseded'
  WHERE organization_id = _renewal.organization_id
    AND status = 'active';

  -- Insert New Authoritative Accreditation Term into the Ledger
  INSERT INTO public.organization_accreditations (
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
  ) VALUES (
    _renewal.organization_id,
    _renewal.cycle_number,
    _start_date,
    _end_date,
    _official_urn,
    'active',
    false,
    _admin_id,
    _now,
    _now
  ) RETURNING id INTO _new_accreditation_id;

  -- Update Renewal Record
  UPDATE public.organization_renewals
  SET
    status = 'approved',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = p_admin_remarks,
    certificate_urn = _official_urn,
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update Document Submission if present
  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF _submission.id IS NOT NULL THEN
    UPDATE public.document_submissions
    SET
      status = 'approved_green'::public.document_submission_status,
      reviewed_at = _now,
      reviewed_by = _admin_id,
      overall_remarks = p_admin_remarks,
      updated_at = _now
    WHERE id = _submission.id;
  END IF;

  -- Update Organization Profile to newly assigned URN and validity period
  UPDATE public.organization_profiles
  SET
    profile_status = 'verified',
    urn = _official_urn,
    urn_normalized = public.normalize_urn(_official_urn),
    organization_identifier_number = _official_urn,
    urn_review_status = 'verified',
    current_accreditation_id = _new_accreditation_id,
    accreditation_start_date = _start_date,
    accreditation_expires_at = (_end_date::text || 'T23:59:59+08:00')::timestamptz,
    verified_at = _now,
    updated_at = _now
  WHERE id = _renewal.organization_id;

  _owner_id := _target_org.user_id;

  -- Write Activity Log with actor_user_id = _admin_id
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    metadata,
    created_at
  ) VALUES (
    _admin_id,
    _renewal.organization_id,
    'approved_renewal',
    'organization_renewal',
    p_renewal_id,
    format('Accreditation Renewal Cycle %s approved for %s. New URN: %s, Term: %s to %s',
      _renewal.cycle_number, _target_org.organization_name, _official_urn, _start_date, _end_date),
    jsonb_build_object(
      'renewal_id', p_renewal_id,
      'term_number', _renewal.cycle_number,
      'previous_urn', _old_urn,
      'new_urn', _official_urn,
      'start_date', _start_date,
      'end_date', _end_date
    ),
    _now
  );

  -- Notify Organization Owner
  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _owner_id,
      _renewal.organization_id,
      'Accreditation Renewal Approved',
      format('Congratulations! Your accreditation renewal has been approved with URN %s, valid until %s.', _official_urn, to_char(_end_date, 'Mon DD, YYYY')),
      'completed',
      'organization_renewal',
      p_renewal_id,
      _now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'accreditation_id', _new_accreditation_id,
    'term_number', _renewal.cycle_number,
    'start_date', _start_date,
    'end_date', _end_date,
    'certificate_urn', _official_urn,
    'approved_at', _now
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_renewal_in_supabase(p_session_token text, p_renewal_id uuid, p_certificate_urn text DEFAULT NULL::text, p_admin_remarks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.admin_approve_renewal(p_session_token, p_renewal_id, p_certificate_urn, p_admin_remarks);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_backup_dispatch_guard(_session_token text, _operation text, _lease_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _codes text[];
  _lease jsonb;
  _busy boolean;
BEGIN
  IF _operation NOT IN ('read', 'claim', 'release', 'observe') THEN
    RAISE EXCEPTION 'Invalid backup control operation.';
  END IF;
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  SELECT r.code::text, r.permission_codes INTO _role_code, _codes
  FROM public.admin_accounts a JOIN public.roles r ON r.id = a.role_id
  WHERE a.id = _admin_id AND a.is_active;
  IF _role_code IS NULL OR (_role_code <> 'super_admin' AND NOT (
    CASE WHEN _operation IN ('read', 'observe') THEN 'backup_recovery_view'
    ELSE 'backup_recovery_manage' END = ANY(coalesce(_codes, '{}'::text[]))
  )) THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ytrace.backup.dispatch', 0));
  SELECT value_json INTO _lease FROM public.admin_system_settings
  WHERE setting_key = 'backup.dispatch_lease' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Backup control is unavailable.'; END IF;
  _busy := coalesce((_lease->>'expiresAt')::timestamptz > clock_timestamp(), false);
  IF _operation = 'read' THEN RETURN jsonb_build_object('busy', _busy); END IF;
  IF _operation = 'claim' THEN
    IF _busy THEN RETURN jsonb_build_object('acquired', false); END IF;
    IF _lease_id IS NULL THEN RAISE EXCEPTION 'Missing lease identifier.'; END IF;
    UPDATE public.admin_system_settings
    SET value_json = jsonb_build_object('id', _lease_id, 'expiresAt', clock_timestamp() + interval '10 minutes'),
        updated_at = clock_timestamp(), updated_by = _admin_id
    WHERE setting_key = 'backup.dispatch_lease';
    RETURN jsonb_build_object('acquired', true);
  END IF;
  IF _operation = 'observe' OR (_operation = 'release' AND _lease->>'id' = _lease_id::text) THEN
    UPDATE public.admin_system_settings SET value_json = '{}'::jsonb, updated_at = clock_timestamp()
    WHERE setting_key = 'backup.dispatch_lease';
  END IF;
  RETURN jsonb_build_object('released', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_broadcast_sidebar_refresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  -- Public channel is a content-free invalidation hint because custom admin
  -- sessions are not Supabase Auth JWTs. Counts and records stay behind the RPC.
  PERFORM realtime.send('{}'::jsonb, 'counts-changed', 'admin-sidebar-refresh', false);
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_admin_name text;
  v_rec record;
  v_audit_desc text;
  v_liq_ids uuid[];
  v_deleted_count int;
BEGIN
  SELECT vat.admin_id INTO v_admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin account is not authorized.');
  END IF;

  SELECT display_name INTO v_admin_name
  FROM public.admin_accounts
  WHERE id = v_admin_id;

  IF v_admin_name IS NULL THEN
    v_admin_name := 'Admin';
  END IF;

  IF _request_ids IS NULL OR array_length(_request_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No request IDs provided.');
  END IF;

  SELECT array_agg(id) INTO v_liq_ids
  FROM public.liquidation_reports
  WHERE budget_request_id = ANY(_request_ids);

  -- Log audit entries for deleted records if enabled
  IF public.is_audit_logging_enabled('deletion') THEN
    FOR v_rec IN
      SELECT id, organization_id, activity_title, status, requested_amount, approved_amount, released_amount
      FROM public.budget_requests
      WHERE id = ANY(_request_ids)
    LOOP
      IF v_rec.status IN ('budget_released', 'completed') THEN
        v_audit_desc := format(
          'Admin %s permanently deleted budget request "%s" (Status: %s, Requested: ₱%s, Approved: ₱%s, Released: ₱%s). Note: This later-stage financial record and its associated liquidation reports/files were intentionally deleted.',
          v_admin_name,
          v_rec.activity_title,
          v_rec.status,
          to_char(COALESCE(v_rec.requested_amount, 0), 'FM999,999,999,990.00'),
          to_char(COALESCE(v_rec.approved_amount, 0), 'FM999,999,999,990.00'),
          to_char(COALESCE(v_rec.released_amount, 0), 'FM999,999,999,990.00')
        );
      ELSE
        v_audit_desc := format(
          'Admin %s deleted budget request "%s" (Amount: ₱%s, Lifecycle: %s).',
          v_admin_name,
          v_rec.activity_title,
          to_char(COALESCE(v_rec.requested_amount, 0), 'FM999,999,999,990.00'),
          v_rec.status
        );
      END IF;

      INSERT INTO public.activity_logs (
        actor_user_id,
        organization_id,
        action,
        related_type,
        related_id,
        description,
        metadata
      ) VALUES (
        v_admin_id,
        v_rec.organization_id,
        'deleted_budget_request',
        'budget_request',
        v_rec.id,
        v_audit_desc,
        public.extract_audit_request_metadata()
      );
    END LOOP;
  END IF;

  DELETE FROM public.notifications
  WHERE (related_type = 'budget_request' AND related_id = ANY(_request_ids))
     OR (v_liq_ids IS NOT NULL AND related_type = 'liquidation_report' AND related_id = ANY(v_liq_ids));

  DELETE FROM public.budget_requests
  WHERE id = ANY(_request_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'deleted_ids', _request_ids
  );
END;
$function$;

RESET check_function_bodies;

