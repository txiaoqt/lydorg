-- Migration: 20260905203000_add_draft_to_ypop_event_participation_status.sql
-- Description: Add 'draft' value to ypop_event_participation_status enum so that
-- initial proof uploads persist in draft state without automatically submitting
-- for admin review.

ALTER TYPE public.ypop_event_participation_status ADD VALUE IF NOT EXISTS 'draft';
