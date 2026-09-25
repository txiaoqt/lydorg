-- Migration: 20260925070000_ypop_activity_logs_actor_attribution.sql
-- Description: Attribute YPOP Admin review actions in public.activity_logs to the authenticated
--              admin_accounts.id resolved via validate_admin_session_token(_session_token).
--              Removes duplicate anonymous activity log insertion from database triggers
--              while keeping all user in-app notification trigger logic 100% intact.

-- ==============================================================================
-- 1. CANONICAL public.admin_update_ypop_org_activity WITH ACTOR ATTRIBUTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_ypop_org_activity(
  _session_token text,
  _activity_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _approved_at timestamptz default null,
  _revision_history jsonb default null
)
RETURNS setof public.ypop_org_activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.ypop_org_activities
  WHERE id = _activity_id;

  IF _org_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    ) VALUES (
      _admin_id,
      _org_id,
      'reviewed_ypop_org_activity',
      'ypop_org_activity',
      _activity_id,
      COALESCE(_admin_remarks, 'YPOP organization-led activity status updated.')
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_org_activities
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_org_activity_status
      ELSE ypop_org_activities.status
    END,
    admin_remarks = COALESCE(_admin_remarks, ypop_org_activities.admin_remarks),
    approved_at = CASE
      WHEN _status = 'approved' AND _approved_at IS NULL THEN now()
      ELSE COALESCE(_approved_at, ypop_org_activities.approved_at)
    END,
    revision_history = COALESCE(_revision_history, ypop_org_activities.revision_history),
    updated_at = now()
  WHERE ypop_org_activities.id = _activity_id
  RETURNING *;
END;
$$;

-- ==============================================================================
-- 2. CANONICAL public.admin_update_ypop_event_participation WITH ACTOR ATTRIBUTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_ypop_event_participation(
  _session_token text,
  _participation_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _proof_submitted_at timestamptz default null,
  _verified_at timestamptz default null,
  _revision_history jsonb default null
)
RETURNS setof public.ypop_event_participations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.ypop_event_participations
  WHERE id = _participation_id;

  IF _org_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    ) VALUES (
      _admin_id,
      _org_id,
      'reviewed_ypop_event_participation',
      'ypop_event_participation',
      _participation_id,
      COALESCE(_admin_remarks, 'YPOP event participation status updated.')
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_event_participations
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_event_participation_status
      ELSE ypop_event_participations.status
    END,
    admin_remarks = COALESCE(_admin_remarks, ypop_event_participations.admin_remarks),
    proof_submitted_at = COALESCE(_proof_submitted_at, ypop_event_participations.proof_submitted_at),
    verified_at = CASE
      WHEN _status = 'verified' AND _verified_at IS NULL THEN now()
      ELSE COALESCE(_verified_at, ypop_event_participations.verified_at)
    END,
    revision_history = COALESCE(_revision_history, ypop_event_participations.revision_history),
    updated_at = now()
  WHERE ypop_event_participations.id = _participation_id
  RETURNING *;
END;
$$;

-- ==============================================================================
-- 3. CANONICAL public.admin_update_ypop_entry WITH ACTOR ATTRIBUTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_ypop_entry(
  _session_token text,
  _entry_id uuid,
  _status text default null,
  _admin_remarks text default null,
  _points_earned integer default null,
  _org_led_project_count integer default null,
  _city_led_attendance jsonb default null,
  _revision_history jsonb default null,
  _validated_at timestamptz default null,
  _projects_completed integer default null,
  _review_notes text default null,
  _reviewed_by text default null
)
RETURNS setof public.ypop_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _admin_id uuid;
  _org_id uuid;
  _effective_remarks text;
  _effective_org_count integer;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.ypop_entries
  WHERE id = _entry_id;

  _effective_remarks := COALESCE(_admin_remarks, _review_notes);
  _effective_org_count := COALESCE(_org_led_project_count, _projects_completed);

  IF _org_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    ) VALUES (
      _admin_id,
      _org_id,
      'reviewed_ypop_entry',
      'ypop_entry',
      _entry_id,
      COALESCE(_effective_remarks, 'YPOP entry evaluation status updated.')
    );
  END IF;

  RETURN QUERY
  UPDATE public.ypop_entries
  SET
    status = CASE
      WHEN _status IS NOT NULL AND _status <> '' THEN _status::public.ypop_entry_status
      ELSE ypop_entries.status
    END,
    admin_remarks = COALESCE(_effective_remarks, ypop_entries.admin_remarks),
    points_earned = COALESCE(_points_earned, ypop_entries.points_earned),
    org_led_project_count = COALESCE(_effective_org_count, ypop_entries.org_led_project_count),
    city_led_attendance = COALESCE(_city_led_attendance, ypop_entries.city_led_attendance),
    revision_history = COALESCE(_revision_history, ypop_entries.revision_history),
    validated_at = CASE
      WHEN _status IN ('qualified', 'not_qualified') AND _validated_at IS NULL THEN now()
      ELSE COALESCE(_validated_at, ypop_entries.validated_at)
    END,
    updated_at = now()
  WHERE ypop_entries.id = _entry_id
  RETURNING *;
END;
$$;

-- ==============================================================================
-- 4. UPDATE YPOP STATUS TRIGGER FUNCTIONS (USER NOTIFICATIONS PRESERVED)
--    Removes anonymous activity log insertion from triggers.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.notify_ypop_org_activity_status_change()
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
  ELSIF (new.status::text IN ('not_qualified', 'rejected')) THEN
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
  ELSIF (new.status::text IN ('rejected', 'not_qualified')) THEN
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
  ELSIF (new.status::text IN ('not_qualified', 'rejected')) THEN
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
