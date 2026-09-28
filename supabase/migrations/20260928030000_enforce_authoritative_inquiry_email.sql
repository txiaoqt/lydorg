-- Migration: 20260928030000_enforce_authoritative_inquiry_email.sql
-- Purpose: Guarantee at the database level that new inquiries always record the authoritative authenticated account / organization email.

CREATE OR REPLACE FUNCTION public.enforce_inquiry_authoritative_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _org_email text;
  _auth_email text;
BEGIN
  -- 1. Derive authoritative email from organization_profiles if organization_id is set
  IF NEW.organization_id IS NOT NULL THEN
    SELECT op.organization_email INTO _org_email
    FROM public.organization_profiles op
    WHERE op.id = NEW.organization_id;
  END IF;

  -- 2. Derive authoritative email from auth.users if submitted_by is set
  IF NEW.submitted_by IS NOT NULL THEN
    SELECT u.email INTO _auth_email
    FROM auth.users u
    WHERE u.id = NEW.submitted_by;
  END IF;

  -- 3. Overwrite NEW.email with the authoritative account email
  IF _org_email IS NOT NULL AND TRIM(_org_email) <> '' THEN
    NEW.email := TRIM(_org_email);
  ELSIF _auth_email IS NOT NULL AND TRIM(_auth_email) <> '' THEN
    NEW.email := TRIM(_auth_email);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach BEFORE INSERT trigger to public.inquiries
DROP TRIGGER IF EXISTS trg_inquiry_authoritative_email ON public.inquiries;
CREATE TRIGGER trg_inquiry_authoritative_email
  BEFORE INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_inquiry_authoritative_email();
