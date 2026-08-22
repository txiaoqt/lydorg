-- Migration: Eliminate Account Enumeration RPC Functions
-- Date: 2026-08-22
-- Objective: Drop public RPC functions that expose auth.users account existence
-- to eliminate email enumeration at the database level.

-- 1. Drop check_signup_email_status function if exists
DROP FUNCTION IF EXISTS public.check_signup_email_status(text);

-- 2. Drop is_signup_email_registered function if exists
DROP FUNCTION IF EXISTS public.is_signup_email_registered(text);
