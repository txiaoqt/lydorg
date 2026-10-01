-- Allow organization owners to update their current headquarters barangay.
-- Keep the barangay validated against Pasig and derive the legacy district
-- projection so budget maps and reports stay consistent. The assigned URN is
-- intentionally left unchanged because it is the organization's registration
-- identifier, not a live address field.
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
  _barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  IF _barangay IS NULL THEN
    RAISE EXCEPTION 'A valid Pasig Barangay is required for the headquarters address.';
  END IF;

  _district := public.resolve_pasig_district_from_barangay(_barangay);
  IF _district IS NULL THEN
    RAISE EXCEPTION 'Barangay "%" is not a recognized Pasig City Barangay.', _barangay;
  END IF;

  -- RLS remains responsible for restricting profile writes to the owner or an
  -- authorized administrator. This trigger only validates and synchronizes
  -- the location fields; it no longer blocks an owner's location correction.
  NEW.address_barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  NEW.barangay := NEW.address_barangay;
  NEW.district := _district;
  RETURN NEW;
END;
$$;
