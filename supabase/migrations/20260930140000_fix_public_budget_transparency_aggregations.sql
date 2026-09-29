-- Correct public Budget Transparency aggregations without changing budget records.
-- This supersedes the Top 5 + Other Programs RPC and exposes district_allocations,
-- the key consumed by the public client. District I/II come from the authoritative
-- headquarters Barangay through the same resolver used by the profile trigger.

CREATE OR REPLACE FUNCTION public.resolve_pasig_district_from_barangay(_barangay_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _barangay text;
BEGIN
  _barangay := lower(regexp_replace(trim(coalesce(_barangay_name, '')), '^(barangay|brgy\.?)\s+', '', 'i'));
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
    RETURN 'District I';
  ELSIF _barangay IN (
    'dela paz', 'manggahan', 'maybunga', 'pinagbuhatan', 'rosario', 'san miguel',
    'sta. lucia', 'santolan'
  ) THEN
    RETURN 'District II';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_pasig_district_from_barangay(text) FROM PUBLIC;

-- Keep the legacy District projection synchronized from the headquarters Barangay.
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

  IF TG_OP = 'UPDATE'
     AND auth.uid() = OLD.user_id
     AND NEW.address_barangay IS DISTINCT FROM coalesce(nullif(trim(OLD.address_barangay), ''), nullif(trim(OLD.barangay), '')) THEN
    RAISE EXCEPTION 'Headquarters Barangay changes must be made through the administrative location update process.';
  END IF;

  NEW.address_barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  NEW.barangay := NEW.address_barangay;
  NEW.district := _district;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_public_budget_monitoring_summary(_fiscal_year integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_fy integer;
  _allocation record;
  _approved_budget numeric := 0;
  _released_budget numeric := 0;
  _liquidated_budget numeric := 0;
  _remaining_headroom numeric := 0;
  _percent_committed numeric := 0;
  _percent_released numeric := 0;
  _is_deficit boolean := false;
  _deficit_amount numeric := 0;
  _total_requests integer := 0;
  _purpose_categories jsonb := '[]'::jsonb;
  _district_breakdown jsonb := '[]'::jsonb;
  _unmapped_purpose_amount numeric := 0;
  _unassigned_district_amount numeric := 0;
  _available_fys jsonb := '[]'::jsonb;
  _last_updated timestamptz;
  _is_configured boolean := false;
  _annual_budget numeric := 0;
BEGIN
  IF _fiscal_year IS NOT NULL THEN
    _target_fy := _fiscal_year;
  ELSE
    SELECT COALESCE(
      (SELECT fiscal_year FROM public.annual_budget_allocations WHERE is_active = true ORDER BY fiscal_year DESC LIMIT 1),
      (SELECT fiscal_year FROM public.annual_budget_allocations ORDER BY fiscal_year DESC LIMIT 1),
      (SELECT fiscal_year FROM public.budget_requests WHERE fiscal_year IS NOT NULL ORDER BY fiscal_year DESC LIMIT 1),
      EXTRACT(YEAR FROM CURRENT_DATE)::integer
    ) INTO _target_fy;
  END IF;

  SELECT *
  INTO _allocation
  FROM public.annual_budget_allocations
  WHERE fiscal_year = _target_fy
  LIMIT 1;

  IF FOUND THEN
    _is_configured := true;
    _annual_budget := _allocation.total_amount;
  ELSE
    _is_configured := false;
    _annual_budget := NULL;
  END IF;

  -- 3. Aggregate approved grants belonging to this fiscal year
  -- Allowed approved statuses: 'awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed'
  SELECT
    COALESCE(SUM(COALESCE(approved_amount, requested_amount, 0)), 0),
    COUNT(*)
  INTO _approved_budget, _total_requests
  FROM public.budget_requests
  WHERE fiscal_year = _target_fy
    AND status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed');

  -- 4. Aggregate released grants belonging to this fiscal year
  SELECT
    COALESCE(SUM(COALESCE(released_amount, 0)), 0)
  INTO _released_budget
  FROM public.budget_requests
  WHERE fiscal_year = _target_fy
    AND status IN ('budget_released', 'completed');

  -- 5. Aggregate liquidated and audited grants belonging to this fiscal year
  SELECT
    COALESCE(SUM(COALESCE(br.released_amount, 0)), 0)
  INTO _liquidated_budget
  FROM public.liquidation_reports lr
  JOIN public.budget_requests br ON lr.budget_request_id = br.id
  WHERE br.fiscal_year = _target_fy
    AND lr.status = 'completed_liquidated';

  -- 6. Headroom & Deficit Calculation
  IF _is_configured THEN
    _remaining_headroom := _annual_budget - _approved_budget;
    IF _remaining_headroom < 0 THEN
      _is_deficit := true;
      _deficit_amount := ABS(_remaining_headroom);
    ELSE
      _is_deficit := false;
      _deficit_amount := 0;
    END IF;
  ELSE
    _remaining_headroom := NULL;
    _is_deficit := false;
    _deficit_amount := 0;
  END IF;

  -- 7. Progression percentages
  IF _is_configured AND _annual_budget > 0 THEN
    _percent_committed := ROUND((_approved_budget / _annual_budget * 100)::numeric, 1);
  ELSE
    _percent_committed := NULL;
  END IF;

  IF _approved_budget > 0 THEN
    _percent_released := ROUND((_released_budget / _approved_budget * 100)::numeric, 1);
  ELSE
    _percent_released := 0;
  END IF;

  -- 8. All purpose categories attached to each organization's selected CYP values.
  -- Requests that do not match their organization's selected CYP are reported as an
  -- aggregate integrity gap, never as an invented category label.
  WITH approved_requests AS (
    SELECT br.purpose_category, br.approved_amount, br.requested_amount, op.advocacies
    FROM public.budget_requests br
    LEFT JOIN public.organization_profiles op ON op.id = br.organization_id
    WHERE br.fiscal_year = _target_fy
      AND br.status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
  ),
  category_totals AS (
    SELECT selected_cyp.category AS cat_name,
           SUM(COALESCE(r.approved_amount, r.requested_amount, 0)) AS cat_amount
    FROM approved_requests r
    CROSS JOIN LATERAL (
      SELECT DISTINCT trim(cyp) AS category
      FROM unnest(COALESCE(r.advocacies, ARRAY[]::text[])) AS cyp
      WHERE trim(cyp) <> ''
        AND lower(trim(cyp)) = lower(trim(COALESCE(r.purpose_category, '')))
    ) selected_cyp
    GROUP BY selected_cyp.category
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', cat_name,
          'amount', cat_amount,
          'percentage', CASE
            WHEN _approved_budget > 0 THEN ROUND((cat_amount / _approved_budget * 100)::numeric, 1)
            ELSE 0
          END
        ) ORDER BY cat_amount DESC, cat_name ASC
      )
      FROM category_totals
      WHERE cat_amount > 0
    ), '[]'::jsonb),
    COALESCE((
      SELECT SUM(COALESCE(r.approved_amount, r.requested_amount, 0))
      FROM approved_requests r
      WHERE NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(r.advocacies, ARRAY[]::text[])) AS cyp
        WHERE trim(cyp) <> ''
          AND lower(trim(cyp)) = lower(trim(COALESCE(r.purpose_category, '')))
      )
    ), 0)
  INTO _purpose_categories, _unmapped_purpose_amount;

-- 9. Resolve allocation directly from the authoritative headquarters Barangay.
  -- Emit only the two canonical Pasig districts; keep missing/invalid mappings in a
  -- separate aggregate so district totals can be reconciled without inventing a district.
  WITH district_rows AS (
    SELECT
      public.resolve_pasig_district_from_barangay(
        COALESCE(NULLIF(TRIM(op.address_barangay), ''), NULLIF(TRIM(op.barangay), ''))
      ) AS district,
      COALESCE(br.approved_amount, br.requested_amount, 0) AS amount
    FROM public.budget_requests br
    LEFT JOIN public.organization_profiles op ON br.organization_id = op.id
    WHERE br.fiscal_year = _target_fy
      AND br.status IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
  ),
  district_totals AS (
    SELECT district, SUM(amount) AS dist_amount
    FROM district_rows
    WHERE district IS NOT NULL
    GROUP BY district
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'district', district,
          'amount', dist_amount,
          'percentage', CASE
            WHEN _approved_budget > 0 THEN ROUND((dist_amount / _approved_budget * 100)::numeric, 1)
            ELSE 0
          END
        ) ORDER BY district ASC
      )
      FROM district_totals
      WHERE dist_amount > 0
    ), '[]'::jsonb),
    COALESCE((SELECT SUM(amount) FROM district_rows WHERE district IS NULL), 0)
  INTO _district_breakdown, _unassigned_district_amount;
  -- 10. Available Fiscal Years
  WITH all_fys AS (
    SELECT fiscal_year AS fy FROM public.annual_budget_allocations
    UNION
    SELECT fiscal_year AS fy FROM public.budget_requests WHERE fiscal_year IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(fy ORDER BY fy DESC), '[]'::jsonb)
  INTO _available_fys
  FROM all_fys;

  -- 11. Freshness timestamp
  SELECT GREATEST(
    (SELECT MAX(updated_at) FROM public.annual_budget_allocations WHERE fiscal_year = _target_fy),
    (SELECT MAX(updated_at) FROM public.budget_requests WHERE fiscal_year = _target_fy),
    (SELECT MAX(lr.updated_at) FROM public.liquidation_reports lr JOIN public.budget_requests br ON lr.budget_request_id = br.id WHERE br.fiscal_year = _target_fy)
  ) INTO _last_updated;

  RETURN jsonb_build_object(
    'fiscal_year', _target_fy,
    'is_configured', _is_configured,
    'annual_budget', _annual_budget,
    'approved_budget', _approved_budget,
    'released_budget', _released_budget,
    'liquidated_budget', _liquidated_budget,
    'pending_disbursement', CASE
      WHEN _approved_budget >= _released_budget THEN _approved_budget - _released_budget
      ELSE 0
    END,
    'remaining_headroom', _remaining_headroom,
    'is_deficit', _is_deficit,
    'deficit_amount', _deficit_amount,
    'total_requests', _total_requests,
    'percent_committed', _percent_committed,
    'percent_released', _percent_released,
    'purpose_categories', _purpose_categories,
    'unmapped_purpose_amount', _unmapped_purpose_amount,
    'district_allocations', _district_breakdown,
    'district_breakdown', _district_breakdown,
    'unassigned_district_amount', _unassigned_district_amount,
    'available_fiscal_years', _available_fys,
    'last_updated', COALESCE(_last_updated, now())
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_budget_monitoring_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_budget_monitoring_summary(integer) TO anon, authenticated;
