-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.notify_ypop_activity_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_ypop_entry_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_ypop_event_participation_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_ypop_org_activity_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.organization_identity_name_anchor(_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select split_part(public.normalize_organization_identity_name(_value),' ',1) || ' ' ||
    split_part(public.normalize_organization_identity_name(_value),' ',2);
$function$;

CREATE OR REPLACE FUNCTION public.promote_renewal_submission_files_for_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.submission_scope = 'renewal'
    AND NEW.status::text IN ('submitted', 'resubmitted')
    AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.document_submission_files
    SET
      admin_status = 'under_admin_review',
      reviewed_at = NULL,
      updated_at = clock_timestamp()
    WHERE submission_id = NEW.id
      AND admin_status = 'draft'
      AND NULLIF(trim(file_url), '') IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_urn_review_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() = old.user_id and current_setting('app.urn_server_transition', true) <> 'on' then
    if new.urn_review_status is distinct from old.urn_review_status
      or new.urn_admin_remarks is distinct from old.urn_admin_remarks
      or new.urn_reviewed_by is distinct from old.urn_reviewed_by
      or new.urn_reviewed_at is distinct from old.urn_reviewed_at
      or new.verification_method is distinct from old.verification_method
      or new.verified_at is distinct from old.verified_at
      or new.profile_status is distinct from old.profile_status
    then raise exception 'URN review fields can only be changed by an authorized server transition';
    end if;
    if (new.registration_type is distinct from old.registration_type or new.urn is distinct from old.urn)
      and not (old.registration_type = 'existing_urn' and old.urn_review_status in ('needs_correction','rejected'))
    then raise exception 'Registration type or URN cannot be changed in its current state';
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.reactivate_admin_template_document(_session_token text, _template_id uuid)
 RETURNS SETOF required_document_types
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
  update public.required_document_types
  set is_active = true
  where required_document_types.id = _template_id
  returning required_document_types.*;
end;
$function$;

RESET check_function_bodies;

