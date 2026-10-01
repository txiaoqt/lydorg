-- Compare lifecycle labels as text so this aggregate supports the admin map's
-- status labels without casting an unavailable label into the database enum.
CREATE OR REPLACE FUNCTION public.get_public_budget_barangay_allocations(_fiscal_year integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_fy integer;
  _allocations jsonb;
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

  WITH canonical_barangays AS (
    SELECT * FROM (VALUES
      ('Bagong Ilog'), ('Bagong Katipunan'), ('Bambang'), ('Buting'), ('Caniogan'),
      ('Dela Paz'), ('Kalawaan'), ('Kapasigan'), ('Kapitolyo'), ('Malinao'),
      ('Manggahan'), ('Maybunga'), ('Oranbo'), ('Palatiw'), ('Pinagbuhatan'),
      ('Pineda'), ('Rosario'), ('Sagad'), ('San Antonio'), ('San Joaquin'),
      ('San Jose'), ('San Miguel'), ('San Nicolas'), ('Sta. Cruz'), ('Sta. Lucia'),
      ('Sta. Rosa'), ('Santolan'), ('Sto. Tomas'), ('Sumilang'), ('Ugong')
    ) AS barangays(name)
  ),
  latest_liquidations AS (
    SELECT DISTINCT ON (lr.budget_request_id)
      lr.budget_request_id,
      lr.status = 'completed_liquidated' AS is_liquidated
    FROM public.liquidation_reports lr
    ORDER BY lr.budget_request_id, COALESCE(lr.updated_at, lr.created_at) DESC
  ),
  request_rows AS (
    SELECT
      op.id AS organization_id,
      public.normalize_pasig_barangay_name(
        COALESCE(NULLIF(TRIM(op.address_barangay), ''), NULLIF(TRIM(op.barangay), ''))
      ) AS normalized_barangay,
      COALESCE(NULLIF(br.approved_amount, 0), br.requested_amount, 0) AS approved_amount,
      CASE WHEN br.status::text IN ('budget_released', 'completed', 'released')
        THEN COALESCE(br.released_amount, 0) ELSE 0 END AS released_amount,
      CASE WHEN ll.is_liquidated
        THEN COALESCE(br.released_amount, 0) ELSE 0 END AS liquidated_amount
    FROM public.budget_requests br
    LEFT JOIN public.organization_profiles op ON op.id = br.organization_id
    LEFT JOIN latest_liquidations ll ON ll.budget_request_id = br.id
    WHERE COALESCE(
        br.fiscal_year,
        EXTRACT(YEAR FROM COALESCE(br.release_date::date, br.activity_date::date, br.created_at::date))::integer,
        EXTRACT(YEAR FROM CURRENT_DATE)::integer
      ) = _target_fy
      AND br.status::text IN (
        'awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted',
        'budget_released', 'completed', 'approved', 'approved_green',
        'conditionally_approved_amber', 'released'
      )
  ),
  totals AS (
    SELECT
      cb.name AS barangay,
      public.resolve_pasig_district_from_barangay(cb.name) AS district,
      COALESCE(SUM(rr.approved_amount), 0) AS approved_amount,
      COALESCE(SUM(rr.released_amount), 0) AS released_amount,
      COALESCE(SUM(rr.liquidated_amount), 0) AS liquidated_amount,
      COUNT(DISTINCT rr.organization_id) AS organization_count,
      COUNT(*) FILTER (WHERE rr.released_amount > 0) AS released_budget_count
    FROM canonical_barangays cb
    LEFT JOIN request_rows rr
      ON rr.normalized_barangay = public.normalize_pasig_barangay_name(cb.name)
    GROUP BY cb.name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'barangay', barangay,
    'district', district,
    'approved_amount', approved_amount,
    'released_amount', released_amount,
    'liquidated_amount', liquidated_amount,
    'organization_count', organization_count,
    'released_budget_count', released_budget_count
  ) ORDER BY barangay), '[]'::jsonb)
  INTO _allocations
  FROM totals;

  RETURN jsonb_build_object('fiscal_year', _target_fy, 'allocations', _allocations);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_budget_barangay_allocations(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_budget_barangay_allocations(integer) TO anon, authenticated;
