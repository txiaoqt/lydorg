-- ==============================================================================
-- Migration: 20260927180000_renewal_authoritative_urn_lifecycle.sql
-- Description: Authoritative Server-Side URN Generation on YORP Renewal Approval
--
-- 1. Authoritative URN Generation on Renewal:
--    When an organization renewal is approved, the system generates a new official
--    deterministic URN (BB-YY-NNN) using public.generate_unique_urn(_barangay, _now).
--    - BB: Barangay code
--    - YY: Year of approval / new accreditation term
--    - NNN: Atomic annual sequence counter
--
-- 2. Immutability & Safety:
--    - Old URN is preserved on the superseded historical accreditation term.
--    - New URN is assigned to the new active accreditation term and projected to organization_profiles.urn.
--    - The client/admin UI cannot manually enter or override the renewal URN.
--    - No URN is consumed or generated on draft, submission, revision, or rejection.
-- ==============================================================================

-- 1. Ensure generate_unique_urn checks against both organization_profiles and organization_accreditations
CREATE OR REPLACE FUNCTION public.generate_unique_urn(
  _barangay text,
  _effective_verified_at timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION public.generate_unique_urn(text, timestamptz) IS
  'Generates the official deterministic PCYDO URN in the format BB-YY-NNN using canonical barangay ordinal and atomic city-wide annual sequencing.';

-- 2. Update public.admin_approve_renewal to generate new official URN server-side
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

  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = _admin_id
      AND au.is_active = true
      AND (au.role_code = 'super_admin' OR 'renewals_manage' = ANY(au.permission_codes))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to approve renewal applications.';
  END IF;

  -- Lock Renewal Record
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

  -- Authoritatively generate NEW official deterministic URN for the renewal term
  _official_urn := public.generate_unique_urn(_target_org.barangay, _now);

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
      status = 'approved',
      reviewed_at = _now,
      reviewed_by = _admin_id,
      admin_remarks = p_admin_remarks,
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

  -- Send notification to organization owner if setting enabled
  IF _owner_id IS NOT NULL AND public.get_system_setting_bool('workflow.notify_org_on_approved', true) THEN
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
      'Renewal Approved',
      format('Your organization renewal for Cycle %s has been approved! Your new official URN is %s.', _renewal.cycle_number, _official_urn),
      'renewal_approved',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Insert approval activity log with URN transition metadata
  IF public.is_audit_logging_enabled('approval') THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      metadata
    ) VALUES (
      _admin_id,
      _renewal.organization_id,
      'renewal_approved',
      'renewal',
      p_renewal_id,
      format('Admin approved renewal Cycle %s with newly generated URN %s (previous URN: %s).', _renewal.cycle_number, _official_urn, coalesce(nullif(_old_urn, ''), 'None')),
      jsonb_build_object(
        'previous_urn', _old_urn,
        'new_urn', _official_urn,
        'renewal_id', p_renewal_id,
        'organization_id', _renewal.organization_id,
        'cycle_number', _renewal.cycle_number,
        'term_number', _renewal.cycle_number,
        'start_date', _start_date,
        'end_date', _end_date
      )
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
    'previous_urn', _old_urn,
    'valid_until', (_end_date::timestamptz),
    'approved_at', _now
  );
END;
$$;

-- 3. Update public.admin_approve_renewal_in_supabase synonym RPC
CREATE OR REPLACE FUNCTION public.admin_approve_renewal_in_supabase(
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
BEGIN
  RETURN public.admin_approve_renewal(p_session_token, p_renewal_id, p_certificate_urn, p_admin_remarks);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text, uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal_in_supabase(text, uuid, text, text) TO anon, authenticated, service_role;
