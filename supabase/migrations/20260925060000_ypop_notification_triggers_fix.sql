-- Migration: 20260925060000_ypop_notification_triggers_fix.sql
-- Description: Update trigger functions with safe status::text casting for YPOP triggers

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

  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    new.organization_id,
    'reviewed_ypop_org_activity',
    'ypop_org_activity',
    new.id,
    COALESCE(new.admin_remarks, 'YPOP organization-led activity status updated.')
  );

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

  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    new.organization_id,
    'reviewed_ypop_event_participation',
    'ypop_event_participation',
    new.id,
    COALESCE(new.admin_remarks, 'YPOP event participation status updated.')
  );

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

  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    new.organization_id,
    'reviewed_ypop_entry',
    'ypop_entry',
    new.id,
    COALESCE(new.admin_remarks, 'YPOP entry evaluation status updated.')
  );

  RETURN new;
END;
$$;
