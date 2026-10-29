-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_pending_administrator_email(_session_token text, _admin_id_to_invite uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _target_email text;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to manage admin accounts.';
  end if;

  select admin_accounts.email into _target_email
  from public.admin_accounts
  where admin_accounts.id = _admin_id_to_invite
    and admin_accounts.is_password_set = false;

  if _target_email is null then
    raise exception 'This administrator has already set their password.';
  end if;

  return _target_email;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_budget_barangay_allocations(_fiscal_year integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_public_budget_monitoring_summary(_fiscal_year integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_public_organization_profile(_organization_id uuid)
 RETURNS TABLE(organization_id uuid, organization_name text, profile_image_url text, major_classification text, sub_classification text, district text, barangay text, advocacies text[], facebook_page_url text, verified_at timestamp with time zone, yorp_registered_year smallint, representative_name text, adviser_name text, activities jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_profiles viewer
    where viewer.user_id = auth.uid() and viewer.profile_status = 'verified'
  ) then raise exception 'A verified organization account is required.'; end if;

  return query
  select
    op.id,
    op.organization_name,
    coalesce(op.profile_image_url, ''),
    coalesce(op.major_classification::text, ''),
    coalesce(op.sub_classification::text, ''),
    coalesce(op.district, ''),
    coalesce(op.barangay, ''),
    coalesce(op.advocacies::text[], array[]::text[]),
    coalesce(op.facebook_page_url, ''),
    op.verified_at,
    op.yorp_registered_year,
    case when op.directory_show_representative then coalesce(op.representative_name, '') else '' end,
    case when op.directory_show_adviser then coalesce(op.adviser_name, '') else '' end,
    (
      select coalesce(jsonb_agg(activity order by activity ->> 'date' desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', yep.id,
          'name', coalesce(yca.name, yep.activity_name),
          'date', coalesce(yca.date, yep.activity_date),
          'venue', coalesce(yca.venue, yep.venue),
          'kind', 'city_led'
        ) as activity
        from public.ypop_event_participations yep
        left join public.ypop_city_activities yca on yca.id = yep.activity_id
        where yep.organization_id = op.id
          and yep.status = 'verified'
        union all
        select jsonb_build_object(
          'id', yoa.id,
          'name', yoa.activity_name,
          'date', yoa.activity_date,
          'venue', yoa.venue,
          'kind', 'organization_led'
        )
        from public.ypop_org_activities yoa
        where yoa.organization_id = op.id
          and yoa.status = 'approved'
      ) safe_activities
    )
  from public.organization_profiles op
  where op.id = _organization_id
    and op.profile_status = 'verified'
    and op.directory_visibility = true
    and op.user_id <> auth.uid();
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_stats()
 RETURNS TABLE(verified_org_count bigint, activity_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    (select count(*) from public.organization_profiles where profile_status = 'verified'),
    (select count(*) from public.budget_requests) +
    (select count(*) from public.ypop_city_activities);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_system_settings()
 RETURNS TABLE(setting_key text, category text, value_json jsonb, data_type text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    s.setting_key,
    s.category,
    s.value_json,
    s.data_type,
    s.updated_at
  FROM public.admin_system_settings s
  WHERE s.is_sensitive = false
    AND (
      s.category = 'general'
      OR s.setting_key IN (
        'email.reply_to_email',
        'email.sender_name',
        'budget.currency_symbol',
        'budget.currency'
      )
    )
  ORDER BY s.setting_key ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_system_setting_bool(_key text, _default boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _val jsonb;
BEGIN
  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _key;

  IF _val IS NULL THEN
    RETURN _default;
  END IF;

  IF jsonb_typeof(_val) = 'boolean' THEN
    RETURN (_val)::boolean;
  END IF;

  RETURN _default;
EXCEPTION
  WHEN OTHERS THEN
    RETURN _default;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_system_setting_int(_key text, _default integer DEFAULT 0)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _val jsonb;
BEGIN
  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _key;

  IF _val IS NULL THEN
    RETURN _default;
  END IF;

  IF jsonb_typeof(_val) = 'number' THEN
    RETURN (_val)::integer;
  END IF;

  RETURN _default;
EXCEPTION
  WHEN OTHERS THEN
    RETURN _default;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_system_setting_text(_key text, _default text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _val jsonb;
BEGIN
  SELECT value_json INTO _val
  FROM public.admin_system_settings
  WHERE setting_key = _key;

  IF _val IS NULL THEN
    RETURN _default;
  END IF;

  IF jsonb_typeof(_val) = 'string' THEN
    RETURN TRIM(BOTH '"' FROM _val::text);
  END IF;

  RETURN _val::text;
EXCEPTION
  WHEN OTHERS THEN
    RETURN _default;
END;
$function$;

RESET check_function_bodies;

