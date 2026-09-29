-- Keep the structured headquarters Barangay authoritative and derive the legacy District projection.
-- Existing rows are intentionally not backfilled; the live profile audit found no conflicts.
CREATE OR REPLACE FUNCTION public.enforce_organization_profile_headquarters_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  _barangay text;
  _district text;
BEGIN
  -- The structured address is canonical. On legacy inserts, accept barangay as a fallback.
  _barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  IF _barangay IS NULL THEN
    RAISE EXCEPTION 'A valid Pasig Barangay is required for the headquarters address.';
  END IF;

  _barangay := lower(regexp_replace(_barangay, '^(barangay|brgy\.?)\s+', '', 'i'));
  _barangay := regexp_replace(_barangay, '^santa\s+', 'sta. ');
  _barangay := regexp_replace(_barangay, '^sta\s+', 'sta. ');
  _barangay := regexp_replace(_barangay, '^santo\s+', 'sto. ');
  _barangay := regexp_replace(_barangay, '^sto\s+', 'sto. ');

  IF _barangay IN (
    'bagong ilog', 'bagong katipunan', 'bambang', 'buting', 'caniogan', 'kalawaan',
    'kapasigan', 'kapitolyo', 'malinao', 'oranbo', 'palatiw', 'pineda', 'sagad',
    'san antonio', 'san joaquin', 'san jose', 'san nicolas', 'sta. cruz', 'sta. rosa',
    'sto. tomas', 'sumilang', 'ugong'
  ) THEN
    _district := 'District I';
  ELSIF _barangay IN (
    'dela paz', 'manggahan', 'maybunga', 'pinagbuhatan', 'rosario', 'san miguel',
    'sta. lucia', 'santolan'
  ) THEN
    _district := 'District II';
  ELSE
    RAISE EXCEPTION 'Barangay "%" is not a recognized Pasig City Barangay.', coalesce(NEW.address_barangay, NEW.barangay);
  END IF;

  IF TG_OP = 'UPDATE'
     AND auth.uid() = OLD.user_id
     AND NEW.address_barangay IS DISTINCT FROM coalesce(nullif(trim(OLD.address_barangay), ''), nullif(trim(OLD.barangay), '')) THEN
    RAISE EXCEPTION 'Headquarters Barangay changes must be made through the administrative location update process.';
  END IF;

  -- Compatibility columns remain synchronized for reports, filters, and workflow consumers.
  NEW.address_barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  NEW.barangay := NEW.address_barangay;
  NEW.district := _district;
  RETURN NEW;
END;
$$;

-- Alphabetical trigger order places this after trg_sync_organization_profile_structured_fields.
DROP TRIGGER IF EXISTS trg_z_enforce_organization_profile_headquarters_location ON public.organization_profiles;
CREATE TRIGGER trg_z_enforce_organization_profile_headquarters_location
BEFORE INSERT OR UPDATE ON public.organization_profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_organization_profile_headquarters_location();
