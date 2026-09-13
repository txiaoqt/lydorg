-- Migration: 20260914010000_public_budget_transparency_summary.sql
-- Purpose: Secure, public-facing read-only aggregation RPC for Budget Transparency.
--          Provides a sanitized financial data contract across the Public Portal,
--          authenticated User Portal, and Admin Public Preview without exposing
--          internal workflow statuses, admin remarks, organization identities,
--          or sensitive financial transaction details.

CREATE OR REPLACE FUNCTION public.get_public_budget_monitoring_summary(_fiscal_year integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_fy integer;
  _allocation RECORD;
  _is_configured boolean := false;
  _annual_budget numeric := NULL;
  _approved_budget numeric := 0;
  _released_budget numeric := 0;
  _liquidated_budget numeric := 0;
  _remaining_headroom numeric := NULL;
  _is_deficit boolean := false;
  _deficit_amount numeric := 0;
  _percent_committed numeric := NULL;
  _percent_released numeric := NULL;
  _percent_liquidated numeric := NULL;
  _purpose_categories jsonb := '[]'::jsonb;
  _district_allocations jsonb := '[]'::jsonb;
  _available_fys jsonb := '[]'::jsonb;
  _last_updated text := NULL;
  _total_requests integer := 0;
BEGIN
  -- 1. Determine target fiscal year
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

  -- 2. Fetch statutory annual budget allocation baseline
  SELECT total_amount, is_active, updated_at
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
  -- Allowed approved statuses matching authoritative admin monitoring:
  -- 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed'
  SELECT
    COALESCE(SUM(COALESCE(approved_amount, requested_amount, 0)), 0),
    COUNT(*)
  INTO _approved_budget, _total_requests
  FROM public.budget_requests
  WHERE fiscal_year = _target_fy
    AND status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed');

  -- 4. Aggregate released grants belonging to this fiscal year
  -- Statuses: 'budget_released', 'completed'
  SELECT
    COALESCE(SUM(COALESCE(released_amount, 0)), 0)
  INTO _released_budget
  FROM public.budget_requests
  WHERE fiscal_year = _target_fy
    AND status IN ('budget_released', 'completed');

  -- 5. Aggregate liquidated and audited grants belonging to this fiscal year
  -- Sums released_amount for budget requests with completed_liquidated liquidation report
  SELECT
    COALESCE(SUM(COALESCE(br.released_amount, 0)), 0)
  INTO _liquidated_budget
  FROM public.liquidation_reports lr
  JOIN public.budget_requests br ON lr.budget_request_id = br.id
  WHERE br.fiscal_year = _target_fy
    AND lr.status = 'completed_liquidated';

  -- 6. Authoritative Headroom & Deficit Calculation
  -- Formula: Annual Budget - Approved Budget (NOT released)
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

  IF _released_budget > 0 THEN
    _percent_liquidated := ROUND((_liquidated_budget / _released_budget * 100)::numeric, 1);
  ELSE
    _percent_liquidated := 0;
  END IF;

  -- 8. Purpose Categories: Server-Side Top 5 + Consolidated Other Programs
  WITH raw_categories AS (
    SELECT
      COALESCE(NULLIF(TRIM(purpose_category), ''), 'Other Community Programs') AS cat_name,
      SUM(COALESCE(approved_amount, requested_amount, 0)) AS cat_amount
    FROM public.budget_requests
    WHERE fiscal_year = _target_fy
      AND status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
    GROUP BY COALESCE(NULLIF(TRIM(purpose_category), ''), 'Other Community Programs')
  ),
  ranked_categories AS (
    SELECT
      cat_name,
      cat_amount,
      ROW_NUMBER() OVER (ORDER BY cat_amount DESC, cat_name ASC) AS rank_num
    FROM raw_categories
    WHERE cat_amount > 0
  ),
  split_categories AS (
    SELECT
      cat_name,
      cat_amount,
      rank_num
    FROM ranked_categories
    WHERE rank_num <= 5
    UNION ALL
    SELECT
      'Other Programs' AS cat_name,
      COALESCE(SUM(cat_amount), 0) AS cat_amount,
      6 AS rank_num
    FROM ranked_categories
    WHERE rank_num > 5
    HAVING COALESCE(SUM(cat_amount), 0) > 0
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', cat_name,
        'amount', cat_amount,
        'percentage', CASE
          WHEN _approved_budget > 0 THEN ROUND((cat_amount / _approved_budget * 100)::numeric, 1)
          ELSE 0
        END
      )
      ORDER BY rank_num ASC
    ),
    '[]'::jsonb
  )
  INTO _purpose_categories
  FROM split_categories;

  -- 9. District-Level Safe Aggregations (District 1 vs District 2)
  WITH district_raw AS (
    SELECT
      CASE
        WHEN LOWER(TRIM(COALESCE(op.district, ''))) IN ('district 1', 'district i', 'dist 1', 'd1') THEN 'District 1'
        WHEN LOWER(TRIM(COALESCE(op.district, ''))) IN ('district 2', 'district ii', 'dist 2', 'd2') THEN 'District 2'
        ELSE 'Citywide / Unassigned'
      END AS normalized_district,
      SUM(COALESCE(br.approved_amount, br.requested_amount, 0)) AS dist_amount
    FROM public.budget_requests br
    LEFT JOIN public.organization_profiles op ON br.organization_id = op.id
    WHERE br.fiscal_year = _target_fy
      AND br.status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
    GROUP BY 1
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'district', normalized_district,
        'amount', dist_amount,
        'percentage', CASE
          WHEN _approved_budget > 0 THEN ROUND((dist_amount / _approved_budget * 100)::numeric, 1)
          ELSE 0
        END
      )
      ORDER BY dist_amount DESC, normalized_district ASC
    ),
    '[]'::jsonb
  )
  INTO _district_allocations
  FROM district_raw
  WHERE dist_amount > 0;

  -- 10. Available Fiscal Years for interactive public selection
  SELECT COALESCE(
    jsonb_agg(fy ORDER BY fy DESC),
    '[]'::jsonb
  )
  INTO _available_fys
  FROM (
    SELECT fiscal_year AS fy FROM public.annual_budget_allocations
    UNION
    SELECT fiscal_year AS fy FROM public.budget_requests WHERE fiscal_year IS NOT NULL
  ) u;

  -- 11. Last Updated Timestamp across authoritative tables
  SELECT COALESCE(
    TO_CHAR(
      GREATEST(
        (SELECT MAX(updated_at) FROM public.annual_budget_allocations WHERE fiscal_year = _target_fy),
        (SELECT MAX(updated_at) FROM public.budget_requests WHERE fiscal_year = _target_fy),
        (SELECT MAX(lr.updated_at) FROM public.liquidation_reports lr JOIN public.budget_requests br ON lr.budget_request_id = br.id WHERE br.fiscal_year = _target_fy)
      ),
      'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ),
    TO_CHAR(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ) INTO _last_updated;

  -- 12. Return sanitized public JSON contract (both camelCase and snake_case for universal consumption)
  RETURN jsonb_build_object(
    'fiscalYear', _target_fy,
    'fiscal_year', _target_fy,
    'isConfigured', _is_configured,
    'is_configured', _is_configured,
    'annualBudget', _annual_budget,
    'annual_budget', _annual_budget,
    'approvedBudget', _approved_budget,
    'approved_budget', _approved_budget,
    'releasedBudget', _released_budget,
    'released_budget', _released_budget,
    'liquidatedBudget', _liquidated_budget,
    'liquidated_budget', _liquidated_budget,
    'remainingHeadroom', _remaining_headroom,
    'remaining_headroom', _remaining_headroom,
    'isDeficit', _is_deficit,
    'is_deficit', _is_deficit,
    'deficitAmount', _deficit_amount,
    'deficit_amount', _deficit_amount,
    'percentCommitted', _percent_committed,
    'percent_committed', _percent_committed,
    'percentReleased', _percent_released,
    'percent_released', _percent_released,
    'percentLiquidated', _percent_liquidated,
    'percent_liquidated', _percent_liquidated,
    'purposeCategories', _purpose_categories,
    'purpose_categories', _purpose_categories,
    'districtAllocations', _district_allocations,
    'district_allocations', _district_allocations,
    'availableFiscalYears', _available_fys,
    'available_fiscal_years', _available_fys,
    'lastUpdated', _last_updated,
    'last_updated', _last_updated
  );
END;
$$;

-- Explicitly revoke public execution and grant only to anon and authenticated
REVOKE ALL ON FUNCTION public.get_public_budget_monitoring_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_budget_monitoring_summary(integer) TO anon, authenticated;
