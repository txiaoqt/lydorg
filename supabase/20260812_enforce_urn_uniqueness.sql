-- Migration: Enforce URN Ownership, Persistence & Uniqueness
-- Date: 2026-08-12
-- Objective: Ensure every organization URN is persistent, tied to its organization,
-- globally unique, and enforced at the database level with safe RPC lookup.

-- 1. Ensure all existing organization profiles have non-empty URNs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organization_profiles 
    WHERE organization_identifier_number IS NULL OR trim(organization_identifier_number) = ''
  ) THEN
    UPDATE public.organization_profiles
    SET organization_identifier_number = public.generate_unique_urn()
    WHERE organization_identifier_number IS NULL OR trim(organization_identifier_number) = '';
  END IF;
END $$;

-- 2. Add Unique Case-Insensitive Index on organization_identifier_number
CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_profiles_urn_normalized
ON public.organization_profiles (upper(trim(organization_identifier_number)))
WHERE organization_identifier_number IS NOT NULL AND trim(organization_identifier_number) <> '';

-- 3. Add Unique Case-Insensitive Index on urn column if it exists and is populated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organization_profiles' 
      AND column_name = 'urn'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_profiles_urn_col_normalized
      ON public.organization_profiles (upper(trim(urn)))
      WHERE urn IS NOT NULL AND trim(urn) <> '''';
    ';
  END IF;
END $$;

-- 4. Secure RPC function to check if a URN is already registered
CREATE OR REPLACE FUNCTION public.is_urn_registered(_urn text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized text;
  v_exists boolean;
BEGIN
  v_normalized := upper(trim(_urn));
  IF v_normalized IS NULL OR v_normalized = '' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_profiles
    WHERE upper(trim(organization_identifier_number)) = v_normalized
       OR (
         EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_schema = 'public' 
             AND table_name = 'organization_profiles' 
             AND column_name = 'urn'
         )
         AND upper(trim(coalesce(urn, ''))) = v_normalized
       )
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_urn_registered(text) TO anon, authenticated, service_role;

-- 5. Updated auto-generate URN trigger to check case-insensitive uniqueness
CREATE OR REPLACE FUNCTION public.generate_unique_urn()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_random TEXT;
  v_urn TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_random := upper(substring(md5(random()::text) from 1 for 4));
    v_urn := 'PCYDO-' || v_year || '-' || v_random;
    
    SELECT EXISTS (
      SELECT 1 
      FROM public.organization_profiles 
      WHERE upper(trim(organization_identifier_number)) = upper(trim(v_urn))
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_urn;
    END IF;
  END LOOP;
END;
$$;
