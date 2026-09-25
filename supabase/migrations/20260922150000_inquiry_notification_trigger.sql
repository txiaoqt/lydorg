-- Migration: 20260922150000_inquiry_notification_trigger.sql
-- Purpose: Implement server-side notification trigger for inquiry status transitions (responded, closed).

-- 1. Safely expand notification_type enum with inquiry-specific notification types
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'inquiry_responded';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'inquiry_closed';

-- 2. Define notify_inquiry_change() trigger function
CREATE OR REPLACE FUNCTION public.notify_inquiry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  notif_type public.notification_type;
  notif_title text;
  notif_message text;
  clean_subject text;
BEGIN
  -- 1. Guard against non-status updates
  IF old.status IS NOT DISTINCT FROM new.status THEN
    RETURN new;
  END IF;

  -- 2. Derive authoritative recipient user ID (profile owner or submitter)
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

  -- 3. Match status transitions
  IF new.status IN ('reviewed', 'responded') THEN
    notif_type := 'inquiry_responded';
    notif_title := 'Inquiry responded';
    notif_message := 'An administrator has responded to your inquiry: ' || clean_subject || '.';
  ELSIF new.status IN ('closed', 'resolved') THEN
    notif_type := 'inquiry_closed';
    notif_title := 'Inquiry closed';
    notif_message := 'Your inquiry ''' || clean_subject || ''' has been marked as closed by the LYDO.';
  ELSE
    -- Other status transitions (e.g. pending_review) do not generate user notifications
    RETURN new;
  END IF;

  -- 4. Insert authoritative notification
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
$$;

-- 3. Attach trigger to public.inquiries
DROP TRIGGER IF EXISTS trg_inquiry_notify ON public.inquiries;
CREATE TRIGGER trg_inquiry_notify
  AFTER UPDATE OF status ON public.inquiries
  FOR EACH ROW
  WHEN (old.status IS DISTINCT FROM new.status)
  EXECUTE FUNCTION public.notify_inquiry_change();
