-- =============================================================================
-- Migration: 20260927190000_budget_request_awaiting_release_lifecycle.sql
-- Description:
--   1. Add 'awaiting_release' to public.budget_request_status enum.
--   2. Update notify_budget_request_change trigger function to handle
--      'awaiting_release' with clean "Awaiting Release" messaging
--      (without onsite / face-to-face hardcopy instructions).
--   3. Preserve historical 'approved_for_ftf_green' and 'hard_copy_submitted'
--      status handling for backward compatibility.
-- =============================================================================

-- 1. Safely expand budget_request_status enum
ALTER TYPE public.budget_request_status ADD VALUE IF NOT EXISTS 'awaiting_release';

-- 2. Update notify_budget_request_change trigger function
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
$$;
