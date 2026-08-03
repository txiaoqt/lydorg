-- Migration: Auto-generate URN for new organizations without an existing URN
-- Date: 2026-08-03
-- Objective: Ensure new organizations automatically receive a unique URN in format PCYDO-YYYY-XXXX if not provided.

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
      SELECT 1 FROM public.organization_profiles WHERE organization_identifier_number = v_urn
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_urn;
    END IF;
  END LOOP;
END;
$$;

-- Trigger to automatically set URN for new organization profiles if not provided
CREATE OR REPLACE FUNCTION public.handle_organization_profile_urn_auto_gen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_identifier_number IS NULL OR trim(NEW.organization_identifier_number) = '' THEN
    NEW.organization_identifier_number := public.generate_unique_urn();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_urn ON public.organization_profiles;

CREATE TRIGGER trigger_auto_generate_urn
  BEFORE INSERT ON public.organization_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_organization_profile_urn_auto_gen();
