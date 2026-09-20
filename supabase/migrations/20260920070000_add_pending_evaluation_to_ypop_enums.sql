-- Migration: 20260920070000_add_pending_evaluation_to_ypop_enums.sql
-- Description: Add 'pending_evaluation' value to ypop_org_activity_status,
--              ypop_event_participation_status, and ypop_entry_status PostgreSQL enums.
--              This enables the canonical initial status 'Pending Evaluation' across
--              Organization-Led PPAs, City-Led activities, and YPOP validation entries.

-- 1. Organization-Led activities status enum
ALTER TYPE public.ypop_org_activity_status ADD VALUE IF NOT EXISTS 'pending_evaluation';

-- 2. City-Led event participations status enum
ALTER TYPE public.ypop_event_participation_status ADD VALUE IF NOT EXISTS 'pending_evaluation';

-- 3. YPOP entries status enum
ALTER TYPE public.ypop_entry_status ADD VALUE IF NOT EXISTS 'pending_evaluation';
