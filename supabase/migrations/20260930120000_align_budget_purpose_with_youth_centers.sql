-- Align budget request purposes with the organization's selected Centers of Youth Participation.
-- Historical requests remain intact when their category is unchanged.

CREATE OR REPLACE FUNCTION public.resolve_yorp_seed_budget_category(
  _legacy_category text,
  _advocacies text[]
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _preferred text;
  _resolved text;
BEGIN
  _preferred := CASE
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%leadership%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%governance%' THEN 'governance'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%education%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%technology%' THEN 'education'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%sport%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%fitness%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%health%' THEN 'health'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%environment%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%climate%' THEN 'environment'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%community%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%social inclusion%' THEN 'social inclusion and equity'
    WHEN lower(trim(coalesce(_legacy_category, ''))) LIKE '%arts%'
      OR lower(trim(coalesce(_legacy_category, ''))) LIKE '%culture%' THEN 'education'
    ELSE NULL
  END;

  IF _preferred IS NOT NULL THEN
    SELECT cyp
    INTO _resolved
    FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE lower(trim(cyp)) = _preferred
    LIMIT 1;
  END IF;

  IF _resolved IS NULL THEN
    SELECT cyp
    INTO _resolved
    FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE trim(cyp) <> ''
    ORDER BY array_position(coalesce(_advocacies, ARRAY[]::text[]), cyp)
    LIMIT 1;
  END IF;

  RETURN _resolved;
END;
$$;

DO $$
DECLARE
  _renewal_marker_count integer;
  _target_org_count integer;
  _target_budget_count integer;
  _empty_cyp_count integer;
BEGIN
  SELECT count(*) INTO _renewal_marker_count
  FROM public.organization_profiles
  WHERE id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid;

  IF _renewal_marker_count > 0 AND NOT EXISTS (
    SELECT 1
    FROM public.organization_profiles
    WHERE id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND is_renewal_test_account IS TRUE
      AND is_seeded_sample_data IS FALSE
      AND seed_batch IS NULL
  ) THEN
    RAISE EXCEPTION 'Seeded budget category correction stopped: Renewal Test Organization guard markers have changed.';
  END IF;

  SELECT count(*) INTO _target_org_count
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _target_budget_count
  FROM public.budget_requests br
  JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026';

  SELECT count(*) INTO _empty_cyp_count
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND coalesce(is_renewal_test_account, false) IS FALSE
    AND cardinality(coalesce(advocacies, ARRAY[]::text[])) = 0;

  IF NOT (
    (_target_org_count = 0 AND _target_budget_count = 0 AND _empty_cyp_count = 0)
    OR (_target_org_count = 84 AND _target_budget_count = 84 AND _empty_cyp_count = 0)
  ) THEN
    RAISE EXCEPTION 'Seeded budget category correction stopped: expected 84 organizations and requests with non-empty CYP selections; found orgs=%, requests=%, empty_cyp=%.',
      _target_org_count, _target_budget_count, _empty_cyp_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.budget_requests br
    JOIN public.organization_profiles op ON op.id = br.organization_id
    WHERE op.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = 'PCYDO-YORP-2024-2026'
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND br.is_seeded_sample_data IS TRUE
      AND br.seed_batch = 'PCYDO-YORP-2024-2026'
  ) THEN
    RAISE EXCEPTION 'Seeded budget category correction stopped: the Renewal Test Organization is in the target set.';
  END IF;
END;
$$;

-- Change only purpose_category on the exact synthetic batch rows. Financial and workflow history is preserved.
UPDATE public.budget_requests br
SET purpose_category = public.resolve_yorp_seed_budget_category(br.purpose_category, op.advocacies)
FROM public.organization_profiles op
WHERE op.id = br.organization_id
  AND op.is_seeded_sample_data IS TRUE
  AND op.seed_batch = 'PCYDO-YORP-2024-2026'
  AND coalesce(op.is_renewal_test_account, false) IS FALSE
  AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
  AND br.is_seeded_sample_data IS TRUE
  AND br.seed_batch = 'PCYDO-YORP-2024-2026'
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(coalesce(op.advocacies, ARRAY[]::text[])) AS selected_cyp
    WHERE lower(trim(selected_cyp)) = lower(trim(br.purpose_category))
  );

CREATE OR REPLACE FUNCTION public.enforce_budget_request_purpose_advocacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _advocacies text[];
  _org_seeded boolean;
  _org_seed_batch text;
  _org_is_renewal boolean;
  _category_changed boolean;
  _canonical_category text;
BEGIN
  SELECT op.advocacies,
         coalesce(op.is_seeded_sample_data, false),
         op.seed_batch,
         coalesce(op.is_renewal_test_account, false)
  INTO _advocacies, _org_seeded, _org_seed_batch, _org_is_renewal
  FROM public.organization_profiles op
  WHERE op.id = NEW.organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget request organization profile was not found.';
  END IF;

  _category_changed := TG_OP = 'INSERT'
    OR lower(trim(coalesce(NEW.purpose_category, ''))) IS DISTINCT FROM lower(trim(coalesce(OLD.purpose_category, '')))
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id;

  IF NOT _category_changed THEN
    RETURN NEW;
  END IF;

  IF cardinality(coalesce(_advocacies, ARRAY[]::text[])) = 0 THEN
    RAISE EXCEPTION 'Select at least one Center of Youth Participation in the organization profile before creating or changing a budget request category.';
  END IF;

  SELECT cyp
  INTO _canonical_category
  FROM unnest(_advocacies) AS cyp
  WHERE lower(trim(cyp)) = lower(trim(coalesce(NEW.purpose_category, '')))
  LIMIT 1;

  IF _canonical_category IS NOT NULL THEN
    NEW.purpose_category := _canonical_category;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     AND NEW.is_seeded_sample_data IS TRUE
     AND NEW.seed_batch = 'PCYDO-YORP-2024-2026'
     AND _org_seeded IS TRUE
     AND _org_seed_batch = 'PCYDO-YORP-2024-2026'
     AND _org_is_renewal IS FALSE THEN
    NEW.purpose_category := public.resolve_yorp_seed_budget_category(NEW.purpose_category, _advocacies);
    IF NEW.purpose_category IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Purpose & Category must match a Center of Youth Participation selected in the organization profile.';
END;
$$;

DROP TRIGGER IF EXISTS budget_requests_enforce_purpose_advocacy ON public.budget_requests;
CREATE TRIGGER budget_requests_enforce_purpose_advocacy
BEFORE INSERT OR UPDATE OF organization_id, purpose_category
ON public.budget_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_budget_request_purpose_advocacy();

REVOKE ALL ON FUNCTION public.resolve_yorp_seed_budget_category(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_budget_request_purpose_advocacy() FROM PUBLIC;
