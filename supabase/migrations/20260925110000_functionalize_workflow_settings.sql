-- Migration: 20260925110000_functionalize_workflow_settings.sql
-- Purpose: Authoritatively functionalize all 8 Workflow settings in Admin System Settings:
--          1. workflow.notify_org_on_approved
--          2. workflow.notify_org_on_needs_revision
--          3. workflow.notify_org_on_rejected
--          4. workflow.notify_org_on_resubmitted
--          across Renewals, YPOP, Budget Requests, Liquidation, and Document Resubmission.

-- -----------------------------------------------------------------------------
-- 1. YPOP Notifications (Activities, Events, Entries): Gated by Settings
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_ypop_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_user_id uuid;
  notif_title text;
  notif_message text;
  notif_type public.notification_type;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF org_user_id IS NULL THEN
    org_user_id := new.submitted_by;
  END IF;

  IF org_user_id IS NULL THEN
    RETURN new;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  IF (new.status::text IN ('verified', 'qualified', 'approved')) AND _notify_approved THEN
    notif_title := 'PPA verified';
    notif_message := format('Your organization-led activity ''%s'' has been verified by the admin.', COALESCE(new.activity_name, 'Activity'));
    notif_type := 'completed';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_org_activity',
      new.id
    );
  ELSIF (new.status::text = 'needs_revision') AND _notify_revision THEN
    notif_title := 'PPA needs revision';
    notif_message := format(
      'The admin requested revisions for your organization-led activity ''%s''.%s',
      COALESCE(new.activity_name, 'Activity'),
      CASE
        WHEN new.admin_remarks IS NOT NULL AND TRIM(new.admin_remarks) <> ''
          THEN ' Remarks: ' || new.admin_remarks
        ELSE ''
      END
    );
    notif_type := 'document_revision';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_org_activity',
      new.id
    );
  ELSIF (new.status::text IN ('not_qualified', 'rejected')) AND _notify_rejected THEN
    notif_title := 'PPA not qualified';
    notif_message := format(
      'Your organization-led activity ''%s'' was marked not qualified.%s',
      COALESCE(new.activity_name, 'Activity'),
      CASE
        WHEN new.admin_remarks IS NOT NULL AND TRIM(new.admin_remarks) <> ''
          THEN ' Remarks: ' || new.admin_remarks
        ELSE ''
      END
    );
    notif_type := 'rejected';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_org_activity',
      new.id
    );
  END IF;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ypop_event_participation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_user_id uuid;
  notif_title text;
  notif_message text;
  notif_type public.notification_type;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF org_user_id IS NULL THEN
    org_user_id := new.submitted_by;
  END IF;

  IF org_user_id IS NULL THEN
    RETURN new;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  IF (new.status::text IN ('verified', 'qualified', 'approved')) AND _notify_approved THEN
    notif_title := 'Event attendance verified';
    notif_message := 'Your attendance proof for the city-led event has been verified by the admin.';
    notif_type := 'completed';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_event_participation',
      new.id
    );
  ELSIF (new.status::text = 'needs_revision') AND _notify_revision THEN
    notif_title := 'Event proof needs revision';
    notif_message := format(
      'The admin requested revisions for your event attendance proof.%s',
      CASE
        WHEN new.admin_remarks IS NOT NULL AND TRIM(new.admin_remarks) <> ''
          THEN ' Remarks: ' || new.admin_remarks
        ELSE ''
      END
    );
    notif_type := 'document_revision';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_event_participation',
      new.id
    );
  ELSIF (new.status::text IN ('rejected', 'not_qualified')) AND _notify_rejected THEN
    notif_title := 'Event proof rejected';
    notif_message := format(
      'Your attendance proof for the city-led event was rejected.%s',
      CASE
        WHEN new.admin_remarks IS NOT NULL AND TRIM(new.admin_remarks) <> ''
          THEN ' Remarks: ' || new.admin_remarks
        ELSE ''
      END
    );
    notif_type := 'rejected';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_event_participation',
      new.id
    );
  END IF;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ypop_entry_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_user_id uuid;
  notif_title text;
  notif_message text;
  notif_type public.notification_type;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF org_user_id IS NULL THEN
    org_user_id := new.submitted_by;
  END IF;

  IF org_user_id IS NULL THEN
    RETURN new;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  IF (new.status::text IN ('qualified', 'approved')) AND _notify_approved THEN
    notif_title := 'YPOP semester entry qualified';
    notif_message := format(
      'Your YPOP entry for %s has been evaluated and qualified! Points earned: %s.',
      COALESCE(new.semester_label, 'semester'),
      COALESCE(new.points_earned::text, '0')
    );
    notif_type := 'completed';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_entry',
      new.id
    );
  ELSIF (new.status::text IN ('not_qualified', 'rejected')) AND _notify_rejected THEN
    notif_title := 'YPOP semester entry not qualified';
    notif_message := format(
      'Your YPOP entry for %s was evaluated as not qualified.%s',
      COALESCE(new.semester_label, 'semester'),
      CASE
        WHEN new.admin_remarks IS NOT NULL AND TRIM(new.admin_remarks) <> ''
          THEN ' Remarks: ' || new.admin_remarks
        ELSE ''
      END
    );
    notif_type := 'rejected';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_entry',
      new.id
    );
  ELSIF (new.status::text = 'needs_revision') AND _notify_revision THEN
    notif_title := 'YPOP semester entry needs revision';
    notif_message := format(
      'The admin requested revisions for your YPOP entry (%s).%s',
      COALESCE(new.semester_label, 'semester'),
      CASE
        WHEN new.admin_remarks IS NOT NULL AND TRIM(new.admin_remarks) <> ''
          THEN ' Remarks: ' || new.admin_remarks
        ELSE ''
      END
    );
    notif_type := 'document_revision';

    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      org_user_id,
      new.organization_id,
      notif_title,
      notif_message,
      notif_type,
      'ypop_entry',
      new.id
    );
  END IF;

  RETURN new;
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Renewal Workflow RPCs: Respect Approval, Revision, & Rejection Settings
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_approve_renewal_in_supabase(
  p_session_token text,
  p_renewal_id uuid,
  p_certificate_urn text,
  p_admin_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _admin_email text;
  _admin_name text;
  _admin_role text;
  _renewal public.organization_renewals%rowtype;
  _submission public.document_submissions%rowtype;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _valid_until timestamptz;
BEGIN
  -- Authenticate & authorize admin session
  SELECT vat.admin_id, vat.email, vat.display_name, vat.role_code
  INTO _admin_id, _admin_email, _admin_name, _admin_role
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
    RAISE EXCEPTION 'You do not have permission to approve renewal applications.';
  END IF;

  IF p_certificate_urn IS NULL OR trim(p_certificate_urn) = '' THEN
    RAISE EXCEPTION 'Certificate URN is required to approve renewal.';
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

  _valid_until := _now + interval '1 year';

  UPDATE public.organization_renewals
  SET
    status = 'approved',
    reviewed_at = _now,
    reviewed_by = _admin_id,
    admin_remarks = p_admin_remarks,
    certificate_urn = trim(p_certificate_urn),
    updated_at = _now
  WHERE id = p_renewal_id;

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

  UPDATE public.organization_profiles
  SET
    profile_status = 'verified',
    urn = trim(p_certificate_urn),
    valid_until = _valid_until,
    verified_at = _now,
    updated_at = _now
  WHERE id = _renewal.organization_id;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _renewal.organization_id;

  -- Gated organization notification based on workflow.notify_org_on_approved
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
      format('Your organization renewal for Cycle %s has been approved! URN: %s', _renewal.cycle_number, trim(p_certificate_urn)),
      'renewal_approved',
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
    'renewal_approved',
    'renewal',
    p_renewal_id::text,
    format('Approved renewal application for Cycle %s (URN: %s) by admin %s.', _renewal.cycle_number, trim(p_certificate_urn), _admin_email),
    _now
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'approved',
    'certificate_urn', trim(p_certificate_urn),
    'valid_until', _valid_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_request_renewal_revision_in_supabase(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_renewal_in_supabase(
  p_session_token text,
  p_renewal_id uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;


-- -----------------------------------------------------------------------------
-- 3. Budget & Liquidation Triggers: Respect Workflow Notification Settings
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_budget_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF org_user_id IS NULL THEN
    org_user_id := new.submitted_by;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  IF new.status IN ('approved_for_ftf_green', 'budget_released') THEN
    IF org_user_id IS NOT NULL AND _notify_approved THEN
      notif_type := CASE WHEN new.status = 'budget_released' THEN 'budget_released' ELSE 'budget_go_signal' END;
      notif_title := CASE WHEN new.status = 'budget_released' THEN 'Budget released' ELSE 'Budget go signal issued' END;
      notif_message := CASE
        WHEN new.status = 'budget_released' THEN 'Your budget has been released.'
        ELSE 'Your soft copy requirements have been pre-checked. You may now submit the hard copies face-to-face.'
      END;

      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, notif_title, notif_message, notif_type, 'budget_request', new.id);
    END IF;
  ELSIF new.status = 'needs_revision' THEN
    IF org_user_id IS NOT NULL AND _notify_revision THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, 'Budget revision requested', COALESCE(new.remarks, 'Your budget request has been marked needs revision.'), 'budget_revision', 'budget_request', new.id);
    END IF;
  ELSIF new.status = 'rejected_red' THEN
    IF org_user_id IS NOT NULL AND _notify_rejected THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, 'Budget request rejected', COALESCE(new.remarks, 'Your budget request has been marked rejected.'), 'document_red', 'budget_request', new.id);
    END IF;
  END IF;

  -- Always log activity record
  INSERT INTO public.activity_logs (actor_user_id, organization_id, action, related_type, related_id, description)
  VALUES (NULL, new.organization_id, 'reviewed_budget_request', 'budget_request', new.id, COALESCE(new.remarks, 'Budget request status changed.'));

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_liquidation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_user_id uuid;
  _notify_approved boolean;
  _notify_revision boolean;
BEGIN
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF org_user_id IS NULL THEN
    org_user_id := new.submitted_by;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);

  IF new.status = 'approved_for_ftf_green' THEN
    IF new.go_signal_at IS NOT NULL THEN
      new.deadline_at := new.go_signal_at + INTERVAL '1 month';
    END IF;
    IF org_user_id IS NOT NULL AND _notify_approved THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, 'Liquidation go signal issued', 'Your liquidation soft copies have been pre-checked. You may now submit the hard copies face-to-face.', 'liquidation_go_signal', 'liquidation_report', new.id);
    END IF;
  ELSIF new.status = 'needs_revision' THEN
    IF org_user_id IS NOT NULL AND _notify_revision THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, 'Liquidation revision requested', COALESCE(new.remarks, 'Admin requested corrections for your liquidation report.'), 'liquidation_revision', 'liquidation_report', new.id);
    END IF;
  ELSIF new.status = 'overdue' THEN
    IF org_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, 'Liquidation overdue', 'Your liquidation submission is overdue.', 'overdue', 'liquidation_report', new.id);
    END IF;
  ELSIF new.status = 'completed_liquidated' THEN
    new.completed_at := COALESCE(new.completed_at, now());
    IF org_user_id IS NOT NULL AND _notify_approved THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (org_user_id, new.organization_id, 'Liquidation completed', 'Your liquidation record has been completed.', 'completed', 'liquidation_report', new.id);
    END IF;
  END IF;

  -- Always log activity record
  INSERT INTO public.activity_logs (actor_user_id, organization_id, action, related_type, related_id, description)
  VALUES (NULL, new.organization_id, 'reviewed_liquidation_report', 'liquidation_report', new.id, COALESCE(new.remarks, 'Liquidation status updated.'));

  RETURN new;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. Resubmission Acknowledgement Notifications: workflow.notify_org_on_resubmitted
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.replace_organization_document_file(
  _file_id uuid,
  _document_type_id uuid,
  _expected_updated_at timestamp with time zone,
  _file_url text,
  _file_name text,
  _file_type text,
  _file_size bigint
)
RETURNS setof public.document_submission_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path to 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _file public.document_submission_files%rowtype;
  _submission public.document_submissions%rowtype;
  _organization public.organization_profiles%rowtype;
  _document_name text;
  _submitted_at timestamptz := clock_timestamp();
  _overall_status public.document_submission_status;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in with your organization account first.';
  END IF;

  SELECT * INTO _file
  FROM public.document_submission_files
  WHERE id = _file_id
  FOR UPDATE;
  IF _file.id IS NULL THEN RAISE EXCEPTION 'Document file not found.'; END IF;

  SELECT * INTO _submission FROM public.document_submissions WHERE id = _file.submission_id FOR UPDATE;
  SELECT * INTO _organization FROM public.organization_profiles WHERE id = _submission.organization_id;

  IF _organization.user_id IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'You are not authorized to replace this document.';
  END IF;
  IF _file.document_type_id IS DISTINCT FROM _document_type_id THEN
    RAISE EXCEPTION 'The selected file does not match this document requirement.';
  END IF;
  IF _file.admin_status NOT IN ('needs_revision', 'rejected_red') THEN
    RAISE EXCEPTION 'This document is no longer open for correction. Refresh the page to see its current status.';
  END IF;

  -- Server-side deadline and lock enforcement
  IF (_submission.revision_locked = true OR (_submission.revision_due_at IS NOT NULL AND _submitted_at >= _submission.revision_due_at AND _submission.revision_unlocked_at IS NULL)) THEN
    UPDATE public.document_submissions
    SET revision_locked = true,
        revision_locked_at = COALESCE(revision_locked_at, _submitted_at)
    WHERE id = _submission.id;

    RAISE EXCEPTION 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  END IF;

  IF (_file.revision_locked = true OR (_file.revision_due_at IS NOT NULL AND _submitted_at >= _file.revision_due_at AND _file.revision_unlocked_at IS NULL)) THEN
    RAISE EXCEPTION 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  END IF;

  IF _file.updated_at IS DISTINCT FROM _expected_updated_at THEN
    RAISE EXCEPTION 'This document changed after the page was opened. Refresh before uploading again.';
  END IF;
  IF _file_size <= 0 OR _file_size > 10485760 THEN
    RAISE EXCEPTION 'The replacement file must be between 1 byte and 10 MB.';
  END IF;
  IF nullif(trim(_file_name), '') IS NULL OR length(_file_name) > 180
     OR _file_name ~ '[\\/[:cntrl:]]' THEN
    RAISE EXCEPTION 'The replacement file name is not allowed.';
  END IF;
  IF _file_url NOT LIKE
    'storage://organization-documents/' || _organization.id::text || '/' ||
    _document_type_id::text || '/revisions/%' THEN
    RAISE EXCEPTION 'The replacement file location is not allowed.';
  END IF;
  IF NOT (
    lower(_file_name) ~ '\.pdf$'
    OR (
      lower(_file_name) ~ '\.(xls|xlsx)$'
      AND EXISTS (
        SELECT 1 FROM public.required_document_types
        WHERE id = _document_type_id
          AND lower(name) LIKE '%yorp list of members in good standing%'
      )
    )
  ) THEN
    RAISE EXCEPTION 'The replacement file format is not allowed for this requirement.';
  END IF;

  SELECT name INTO _document_name FROM public.required_document_types WHERE id = _document_type_id;

  UPDATE public.document_submission_files
  SET
    revision_history = COALESCE(revision_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'resubmitted',
        'previousStatus', _file.admin_status,
        'adminRemarks', COALESCE(_file.admin_remarks, ''),
        'reviewedAt', _file.reviewed_at,
        'previousFileName', _file.file_name,
        'previousFileUrl', _file.file_url,
        'previousFileType', _file.file_type,
        'previousFileSize', _file.file_size,
        'uploadedAt', _file.uploaded_at,
        'changedAt', _submitted_at,
        'revisionDueAt', _file.revision_due_at
      )
    ),
    file_url = _file_url,
    file_name = _file_name,
    file_type = COALESCE(nullif(trim(_file_type), ''), 'application/octet-stream'),
    file_size = _file_size,
    validation_status = 'correct',
    admin_status = 'under_admin_review',
    admin_remarks = _file.admin_remarks,
    uploaded_at = _submitted_at,
    reviewed_at = null,
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _submitted_at
  WHERE id = _file_id;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.document_submission_files
      WHERE submission_id = _submission.id AND admin_status = 'rejected_red'
    ) THEN 'rejected_red'::public.document_submission_status
    WHEN EXISTS (
      SELECT 1 FROM public.document_submission_files
      WHERE submission_id = _submission.id AND admin_status = 'needs_revision'
    ) THEN 'needs_revision'::public.document_submission_status
    WHEN EXISTS (
      SELECT 1 FROM public.document_submission_files WHERE submission_id = _submission.id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.document_submission_files
      WHERE submission_id = _submission.id AND admin_status <> 'approved_green'
    ) THEN 'approved_green'::public.document_submission_status
    ELSE 'under_admin_review'::public.document_submission_status
  END INTO _overall_status;

  UPDATE public.document_submissions
  SET status = _overall_status,
      user_confirmed = true,
      submitted_at = COALESCE(_submission.submitted_at, _submitted_at),
      reviewed_by = null,
      reviewed_at = null,
      overall_remarks = format('Corrected file resubmitted for %s.', COALESCE(_document_name, _file_name)),
      revision_requested_at = CASE WHEN _overall_status = 'needs_revision' THEN revision_requested_at ELSE null END,
      revision_due_at = CASE WHEN _overall_status = 'needs_revision' THEN revision_due_at ELSE null END,
      revision_locked = false,
      revision_locked_at = null,
      updated_at = _submitted_at
  WHERE id = _submission.id;

  -- Authoritative in-app acknowledgement if workflow.notify_org_on_resubmitted is ON
  IF public.get_system_setting_bool('workflow.notify_org_on_resubmitted', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _user_id,
      _organization.id,
      'Document Resubmission Received',
      format('Your corrected document for %s has been received and is queued for admin review.', COALESCE(_document_name, _file_name)),
      'document_submitted',
      'document_submission_file',
      _file_id
    );
  END IF;

  -- Activity logging remains unconditional
  INSERT INTO public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) VALUES (
    _user_id, _organization.id, 'Resubmitted Document',
    'document_submission_file', _file_id,
    format('Resubmitted %s after admin review.', COALESCE(_document_name, _file_name))
  );

  RETURN QUERY
  SELECT *
  FROM public.document_submission_files
  WHERE document_submission_files.id = _file_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_resubmit_renewal_application(
  p_renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _renewal public.organization_renewals%rowtype;
  _now timestamptz := clock_timestamp();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  SELECT id INTO _org_id
  FROM public.organization_profiles
  WHERE user_id = _user_id AND id = _renewal.organization_id;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'You are not authorized to resubmit this renewal application.';
  END IF;

  IF _renewal.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  END IF;

  -- Server-side deadline and lock enforcement
  IF (_renewal.revision_locked = true OR (_renewal.revision_due_at IS NOT NULL AND _now >= _renewal.revision_due_at AND _renewal.revision_unlocked_at IS NULL)) THEN
    UPDATE public.organization_renewals
    SET revision_locked = true,
        revision_locked_at = COALESCE(revision_locked_at, _now)
    WHERE id = p_renewal_id;

    RAISE EXCEPTION 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.document_submissions ds
    JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
    WHERE ds.renewal_id = p_renewal_id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'Please replace all files marked for revision before resubmitting.';
  END IF;

  UPDATE public.organization_renewals
  SET
    status = 'resubmitted',
    submitted_at = _now,
    reviewed_by = null,
    reviewed_at = null,
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _now
  WHERE id = p_renewal_id;

  UPDATE public.document_submissions
  SET
    status = 'under_admin_review',
    reviewed_by = null,
    reviewed_at = null,
    overall_remarks = 'Renewal packet resubmitted for admin review.',
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _now
  WHERE renewal_id = p_renewal_id;

  -- Authoritative in-app acknowledgement if workflow.notify_org_on_resubmitted is ON
  IF public.get_system_setting_bool('workflow.notify_org_on_resubmitted', true) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id
    ) VALUES (
      _user_id,
      _org_id,
      'Renewal Resubmission Received',
      format('Your resubmitted renewal application for Cycle %s has been received and is queued for admin review.', _renewal.cycle_number),
      'renewal_submitted',
      'renewal',
      p_renewal_id::text
    );
  END IF;

  -- Activity logging remains unconditional
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    _user_id,
    _org_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id::text,
    format('Organization resubmitted renewal application for Cycle %s.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'status', 'resubmitted'
  );
END;
$$;
