-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.normalize_organization_identity_name(_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'pg_catalog'
AS $function$
  select trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(lower(normalize(_value, NFKC)), '[^[:alnum:]]+', ' ', 'g'),
    '\morg\M', 'organization', 'g'), '\massoc\M', 'association', 'g'),
    '\minc\M', 'incorporated', 'g'), '\s+', ' ', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.normalize_pasig_barangay_name(_barangay text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  _clean text;
begin
  if _barangay is null or trim(_barangay) = '' then
    return null;
  end if;
  _clean := lower(trim(_barangay));
  _clean := trim(regexp_replace(_clean, '^(barangay|brgy\.?)\s+', '', 'i'));
  _clean := regexp_replace(_clean, '^santa\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^sta\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^santo\s+', 'sto. ', 'i');
  _clean := regexp_replace(_clean, '^sto\s+', 'sto. ', 'i');
  return _clean;
end;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_urn(_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
RETURN upper(regexp_replace(btrim(COALESCE(_value, ''::text)), '[[:blank:]]+'::text, ' '::text, 'g'::text));

CREATE OR REPLACE FUNCTION public.notify_budget_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
BEGIN
  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF new.status IN ('approved_for_ftf_green', 'budget_released') THEN
    notif_type := CASE WHEN new.status = 'budget_released' THEN 'budget_released' ELSE 'budget_go_signal' END;
    notif_title := CASE WHEN new.status = 'budget_released' THEN 'Budget released' ELSE 'Budget go signal issued' END;
    notif_message := CASE
      WHEN new.status = 'budget_released' THEN 'Your budget has been released.'
      ELSE 'Your soft copy requirements have been pre-checked. You may now submit the hard copies face-to-face.'
    END;

    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, notif_title, notif_message, notif_type, 'budget_request', new.id);
  ELSIF new.status = 'needs_revision' THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, 'Budget revision requested', 'Your budget request has been marked needs revision.', 'budget_revision', 'budget_request', new.id);
  ELSIF new.status = 'rejected_red' THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, 'Budget request rejected', 'Your budget request has been marked rejected.', 'document_red', 'budget_request', new.id);
  END IF;

  INSERT INTO public.activity_logs (actor_user_id, organization_id, action, related_type, related_id, description)
  VALUES (NULL, new.organization_id, 'reviewed_budget_request', 'budget_request', new.id, COALESCE(new.remarks, 'Budget request status changed.'));

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_budget_request_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  IF coalesce(new.is_seeded_sample_data, false) THEN
    RETURN new;
  END IF;

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

  IF new.status IN ('awaiting_release', 'approved_for_ftf_green', 'budget_released') THEN
    IF org_user_id IS NOT NULL AND _notify_approved THEN
      notif_type := CASE WHEN new.status = 'budget_released' THEN 'budget_released' ELSE 'budget_go_signal' END;
      notif_title := CASE
        WHEN new.status = 'budget_released' THEN 'Budget released'
        WHEN new.status = 'awaiting_release' THEN 'Budget request approved'
        ELSE 'Budget go signal issued'
      END;
      notif_message := CASE
        WHEN new.status = 'budget_released' THEN 'Your budget has been released.'
        WHEN new.status = 'awaiting_release' THEN 'Your budget request has been approved and is awaiting fund release.'
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_inquiry_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
  clean_subject text;
  allow_in_app boolean;
BEGIN
  -- 1. Guard against non-status updates
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  -- 2. Check setting: notifications.new_inquiry.in_app (or workflow status update)
  allow_in_app := public.get_system_setting_bool('notifications.new_inquiry.in_app', true);
  IF NOT allow_in_app THEN
    RETURN new;
  END IF;

  -- 3. Derive authoritative recipient user ID (profile owner or submitter)
  SELECT op.user_id INTO target_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF target_user_id IS NULL THEN
    target_user_id := new.submitted_by;
  END IF;

  IF target_user_id IS NULL THEN
    RETURN new;
  END IF;

  clean_subject := COALESCE(NULLIF(TRIM(new.subject), ''), 'General Inquiry');

  -- 4. Match status transitions
  IF new.status IN ('reviewed', 'responded') THEN
    notif_type := 'inquiry_responded';
    notif_title := 'Inquiry responded';
    notif_message := 'An administrator has responded to your inquiry: ' || clean_subject || '.';
  ELSIF new.status IN ('closed', 'resolved') THEN
    notif_type := 'inquiry_closed';
    notif_title := 'Inquiry closed';
    notif_message := 'Your inquiry ''' || clean_subject || ''' has been marked as closed by the LYDO.';
  ELSE
    -- Other status transitions do not generate user notifications
    RETURN new;
  END IF;

  -- 5. Insert authoritative notification
  INSERT INTO public.notifications (
    user_id,
    organization_id,
    title,
    message,
    type,
    related_type,
    related_id
  ) VALUES (
    target_user_id,
    new.organization_id,
    notif_title,
    notif_message,
    notif_type,
    'inquiry',
    new.id
  );

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_liquidation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_user_id uuid;
  _notify_approved boolean;
  _notify_revision boolean;
BEGIN
  IF coalesce(new.is_seeded_sample_data, false) THEN
    RETURN new;
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.notify_organization_profile_review_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if old.profile_status is not distinct from new.profile_status then
    return new;
  end if;

  if new.profile_status = 'verified' then
    -- Prevent duplicate verification notification
    if not exists (
      select 1 from public.notifications
      where organization_id = new.id
        and type = 'completed'
        and related_type = 'organization_profile'
    ) then
      insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      values (
        new.user_id,
        new.id,
        'Registration verified',
        case
          when new.urn is not null and trim(new.urn) <> ''
            then format('The admin verified your organization registration. Official URN: %s.', new.urn)
          else 'The admin verified your organization registration.'
        end,
        'completed',
        'organization_profile',
        new.id
      );
    end if;
  elsif new.profile_status = 'needs_update' then
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      new.user_id,
      new.id,
      'Registration needs update',
      'The admin reviewed your organization profile and requested updates before verification.',
      'document_revision',
      'organization_profile',
      new.id
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_organization_profile_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _notify_approved boolean;
  _notify_revision boolean;
BEGIN
  -- Strict suppression for test-seeded sample data
  IF coalesce(new.is_seeded_sample_data, false) THEN
    RETURN new;
  END IF;

  IF old.profile_status IS NOT DISTINCT FROM new.profile_status THEN
    RETURN new;
  END IF;

  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);

  IF new.profile_status = 'verified' AND _notify_approved THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE organization_id = new.id
        AND type IN ('completed', 'registration_approved')
        AND related_type = 'organization_profile'
    ) THEN
      INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
      VALUES (
        new.user_id,
        new.id,
        'Registration verified',
        CASE
          WHEN new.urn IS NOT NULL AND trim(new.urn) <> ''
            THEN format('The admin verified your organization registration. Official URN: %s.', new.urn)
          ELSE 'The admin verified your organization registration.'
        END,
        'completed',
        'organization_profile',
        new.id
      );
    END IF;
  ELSIF new.profile_status = 'needs_update' AND _notify_revision THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (
      new.user_id,
      new.id,
      'Registration needs update',
      'The admin reviewed your organization profile and requested updates before verification.',
      'warning',
      'organization_profile',
      new.id
    );
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_submission_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
begin
  select op.user_id into org_user_id
  from public.organization_profiles op
  where op.id = new.organization_id;

  if org_user_id is null then
    return new;
  end if;

  if new.status = 'needs_revision' then
    notif_type := 'document_revision';
    notif_title := 'Document revision requested';
    notif_message := 'Your document submission has been marked needs revision.';
  elsif new.status = 'approved_green' then
    notif_type := 'document_green';
    notif_title := 'Document submission approved';
    notif_message := 'Your document submission has been marked approved.';
  elsif new.status = 'rejected_red' then
    notif_type := 'document_red';
    notif_title := 'Document submission rejected';
    notif_message := 'Your document submission has been marked rejected.';
  else
    return new;
  end if;

  insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
  values (org_user_id, new.organization_id, notif_title, notif_message, notif_type, 'document_submission', new.id);

  insert into public.activity_logs (actor_user_id, organization_id, action, related_type, related_id, description)
  values (coalesce(new.reviewed_by, auth.uid()), new.organization_id, 'reviewed_documents', 'document_submission', new.id, notif_message);

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_urn_review_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _title text;
  _message text;
  _type public.notification_type;
begin
  if old.urn_review_status is not distinct from new.urn_review_status then return new; end if;
  _title := case new.urn_review_status
    when 'pending' then 'URN submitted for review'
    when 'needs_correction' then 'Your URN needs correction'
    when 'verified' then 'Registration verified'
    when 'rejected' then 'URN verification was unsuccessful'
    else 'URN status updated' end;
  _message := case new.urn_review_status
    when 'pending' then 'LYDO / PCYDO will check your registration number against its official record.'
    when 'needs_correction' then 'Review the admin feedback and update the submitted number.'
    when 'verified' then 'Your organization was verified through its Unique Registration Number.'
    when 'rejected' then 'Review the admin feedback or contact LYDO / PCYDO.'
    else 'Your registration status was updated.' end;
  _type := case new.urn_review_status
    when 'verified' then 'completed'::public.notification_type
    when 'rejected' then 'document_red'::public.notification_type
    else 'document_revision'::public.notification_type end;
  insert into public.notifications(user_id,organization_id,title,message,type,related_type,related_id)
  values(new.user_id,new.id,_title,_message,_type,'organization_profile',new.id);
  return new;
end $function$;

RESET check_function_bodies;

