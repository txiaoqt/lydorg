-- Migration: 20260929130000_fix_admin_approve_renewal_schema.sql
-- Description: Adds certificate_urn to organization_renewals and hardens admin_approve_renewal RPC.

ALTER TABLE public.organization_renewals
  ADD COLUMN IF NOT EXISTS certificate_urn text;

CREATE OR REPLACE FUNCTION public.admin_approve_renewal(
  p_session_token text,
  p_renewal_id uuid,
  p_certificate_urn text DEFAULT NULL,
  p_admin_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    accreditation_expires_at = _end_date,
    valid_until = (_end_date::timestamptz),
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
      _renewal.cycle_number, _target_org.name, _official_urn, _start_date, _end_date),
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
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text, uuid, text, text) TO anon, authenticated, service_role;
