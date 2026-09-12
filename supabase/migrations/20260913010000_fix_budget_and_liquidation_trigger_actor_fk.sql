-- Migration: 20260913010000_fix_budget_and_liquidation_trigger_actor_fk.sql
-- Purpose: Fix notification trigger actor identity foreign-key mismatch for Budget Requests and Liquidation Reports.
--
-- In this application, administrator accounts reside in public.admin_accounts.
-- The activity_logs.actor_user_id column is constrained to reference public.admin_accounts(id).
-- The notification triggers notify_budget_change() and notify_liquidation_change()
-- previously attempted to assign coalesce(auth.uid(), new.submitted_by) to actor_user_id.
-- Because new.submitted_by is an auth.users(id) belonging to the organization submitter,
-- and auth.uid() is null during admin token-authenticated RPC execution,
-- PostgreSQL threw foreign key violation code 23503 and rolled back parent lifecycle updates.
--
-- This migration updates notify_budget_change() and notify_liquidation_change() to record
-- actor_user_id as NULL for trigger-generated activity records, while preserving all
-- organization user notifications and entity lifecycle updates. The authentic admin actor
-- continues to be explicitly recorded via the application's audit logging infrastructure.

-- 1. Defensive clean-up of any orphaned actor IDs in activity_logs
UPDATE public.activity_logs
SET actor_user_id = NULL
WHERE actor_user_id IS NOT NULL
  AND actor_user_id NOT IN (
    SELECT id
    FROM public.admin_accounts
  );

-- 2. Redefine notify_budget_change() with safe NULL actor_user_id
CREATE OR REPLACE FUNCTION public.notify_budget_change()
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
$$;

-- 3. Redefine notify_liquidation_change() with safe NULL actor_user_id
CREATE OR REPLACE FUNCTION public.notify_liquidation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_user_id uuid;
BEGIN
  SELECT op.user_id INTO org_user_id
  FROM public.organization_profiles op
  WHERE op.id = new.organization_id;

  IF new.status = 'approved_for_ftf_green' THEN
    IF new.go_signal_at IS NOT NULL THEN
      new.deadline_at := new.go_signal_at + INTERVAL '1 month';
    END IF;
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, 'Liquidation go signal issued', 'Your liquidation soft copies have been pre-checked. You may now submit the hard copies face-to-face.', 'liquidation_go_signal', 'liquidation_report', new.id);
  ELSIF new.status = 'needs_revision' THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, 'Liquidation revision requested', 'Admin requested corrections for your liquidation report.', 'liquidation_revision', 'liquidation_report', new.id);
  ELSIF new.status = 'overdue' THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, 'Liquidation overdue', 'Your liquidation submission is overdue.', 'overdue', 'liquidation_report', new.id);
  ELSIF new.status = 'completed_liquidated' THEN
    new.completed_at := now();
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    VALUES (org_user_id, new.organization_id, 'Liquidation completed', 'Your liquidation record has been completed.', 'completed', 'liquidation_report', new.id);
  END IF;

  INSERT INTO public.activity_logs (actor_user_id, organization_id, action, related_type, related_id, description)
  VALUES (NULL, new.organization_id, 'reviewed_liquidation_report', 'liquidation_report', new.id, COALESCE(new.remarks, 'Liquidation status updated.'));

  RETURN new;
END;
$$;
