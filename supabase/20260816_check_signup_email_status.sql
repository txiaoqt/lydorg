-- Migration: Expose Auth Confirmation State for Signup Email Validation
-- Date: 2026-08-16
-- Objective: Safely expose whether a signup email is available, unconfirmed (pending verification),
-- or registered (confirmed) without exposing sensitive profile data to anonymous callers.

-- 1. Create check_signup_email_status RPC function
CREATE OR REPLACE FUNCTION public.check_signup_email_status(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_normalized text;
  v_user record;
BEGIN
  v_normalized := lower(trim(_email));
  IF v_normalized IS NULL OR v_normalized = '' THEN
    RETURN 'available';
  END IF;

  SELECT id, email_confirmed_at, confirmed_at
  INTO v_user
  FROM auth.users
  WHERE lower(email) = v_normalized
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'available';
  END IF;

  IF v_user.email_confirmed_at IS NOT NULL OR v_user.confirmed_at IS NOT NULL THEN
    RETURN 'registered';
  ELSE
    RETURN 'unconfirmed';
  END IF;
END;
$$;

-- 2. Grant execute permissions to all roles (including anon for pre-signup checks)
GRANT EXECUTE ON FUNCTION public.check_signup_email_status(text) TO anon, authenticated, service_role;

-- 3. Also update is_signup_email_registered for backward compatibility if desired
CREATE OR REPLACE FUNCTION public.is_signup_email_registered(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_normalized text;
BEGIN
  v_normalized := lower(trim(_email));
  IF v_normalized IS NULL OR v_normalized = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = v_normalized
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_signup_email_registered(text) TO anon, authenticated, service_role;
