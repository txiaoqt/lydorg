-- Migration: Add attendee fields and integrity constraints to ypop_org_activities
-- Preserves all historical records (nullable for legacy rows) and enforces integrity on attendee metrics

ALTER TABLE IF EXISTS public.ypop_org_activities
  ADD COLUMN IF NOT EXISTS total_attendees integer,
  ADD COLUMN IF NOT EXISTS girls_attendees integer,
  ADD COLUMN IF NOT EXISTS boys_attendees integer;

-- Drop existing constraint if it was previously created
ALTER TABLE IF EXISTS public.ypop_org_activities
  DROP CONSTRAINT IF EXISTS chk_ypop_org_activities_attendance;

-- Enforce attendee non-negativity and mathematical integrity (girls + boys = total) when attendee data is provided
ALTER TABLE IF EXISTS public.ypop_org_activities
  ADD CONSTRAINT chk_ypop_org_activities_attendance
  CHECK (
    (total_attendees IS NULL AND girls_attendees IS NULL AND boys_attendees IS NULL)
    OR (
      total_attendees >= 0
      AND girls_attendees >= 0
      AND boys_attendees >= 0
      AND (girls_attendees + boys_attendees = total_attendees)
    )
  );
