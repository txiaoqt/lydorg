-- Migration: 20260913020000_annual_budget_allocations_and_fiscal_year.sql
-- Purpose: Authoritative Annual Budget Allocations, Fiscal Year column on budget requests,
--          controlled budget purpose categories, and secure admin aggregation RPCs.

-- 1. Create table public.annual_budget_allocations
CREATE TABLE IF NOT EXISTS public.annual_budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year integer NOT NULL UNIQUE CONSTRAINT check_fiscal_year_range CHECK (fiscal_year >= 2000 AND fiscal_year <= 2100),
  total_amount numeric(14,2) NOT NULL CONSTRAINT check_total_amount_nonnegative CHECK (total_amount >= 0),
  statutory_baseline_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annual_budget_allocations ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anon roles for statutory transparency
DROP POLICY IF EXISTS "Allow read annual_budget_allocations" ON public.annual_budget_allocations;
CREATE POLICY "Allow read annual_budget_allocations"
  ON public.annual_budget_allocations
  FOR SELECT
  USING (true);

-- 2. Create table public.budget_purpose_categories
CREATE TABLE IF NOT EXISTS public.budget_purpose_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_purpose_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read budget_purpose_categories" ON public.budget_purpose_categories;
CREATE POLICY "Allow read budget_purpose_categories"
  ON public.budget_purpose_categories
  FOR SELECT
  USING (true);

-- Seed standard canonical youth advocacy / LYDO purpose categories
INSERT INTO public.budget_purpose_categories (name, description, sort_order)
VALUES
  ('Leadership & Governance', 'Leadership seminars, officer training, institutional development', 1),
  ('Sports, Fitness & Recreation', 'Youth sports leagues, wellness programs, athletic events', 2),
  ('Arts, Culture & Heritage', 'Cultural presentations, historical commemorations, youth arts', 3),
  ('Environmental Protection & Climate Action', 'Tree planting, clean-up drives, recycling, disaster preparedness', 4),
  ('Education, Digital Literacy & Technology', 'Skills training, academic support, STEM, digital capability', 5),
  ('Health, Mental Wellness & Anti-Drug Advocacy', 'Substance abuse awareness, mental health campaigns, nutrition', 6),
  ('Community Outreach & Social Inclusion', 'Vulnerable sector assistance, peace initiatives, civic drives', 7),
  ('Economic Empowerment & Livelihood', 'Youth entrepreneurship, livelihood training, job preparation', 8)
ON CONFLICT (name) DO NOTHING;

-- 3. Add fiscal_year column to budget_requests
ALTER TABLE public.budget_requests
  ADD COLUMN IF NOT EXISTS fiscal_year integer;

-- Backfill existing rows deterministically
UPDATE public.budget_requests
SET fiscal_year = COALESCE(
  EXTRACT(YEAR FROM release_date)::integer,
  EXTRACT(YEAR FROM activity_date)::integer,
  EXTRACT(YEAR FROM created_at)::integer,
  2026
)
WHERE fiscal_year IS NULL;

-- Add check constraint and index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_budget_requests_fiscal_year'
  ) THEN
    ALTER TABLE public.budget_requests
      ADD CONSTRAINT check_budget_requests_fiscal_year
      CHECK (fiscal_year IS NULL OR (fiscal_year >= 2000 AND fiscal_year <= 2100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budget_requests_fiscal_year
  ON public.budget_requests(fiscal_year);

-- Trigger to automatically populate fiscal_year on insert if omitted
CREATE OR REPLACE FUNCTION public.set_budget_request_fiscal_year()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fiscal_year IS NULL THEN
    NEW.fiscal_year := COALESCE(
      EXTRACT(YEAR FROM NEW.release_date)::integer,
      EXTRACT(YEAR FROM NEW.activity_date)::integer,
      EXTRACT(YEAR FROM NEW.created_at)::integer,
      EXTRACT(YEAR FROM CURRENT_DATE)::integer
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_budget_request_fiscal_year ON public.budget_requests;
CREATE TRIGGER trg_set_budget_request_fiscal_year
  BEFORE INSERT ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_budget_request_fiscal_year();

-- 4. Admin RPC: get annual budget allocations
CREATE OR REPLACE FUNCTION public.admin_get_annual_budget_allocations(_session_token text)
RETURNS SETOF public.annual_budget_allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.annual_budget_allocations
  ORDER BY fiscal_year DESC;
END;
$$;

-- 5. Admin RPC: save annual budget allocation
CREATE OR REPLACE FUNCTION public.admin_save_annual_budget_allocation(
  _session_token text,
  _fiscal_year integer,
  _total_amount numeric,
  _statutory_baseline_notes text DEFAULT NULL,
  _is_active boolean DEFAULT true
)
RETURNS SETOF public.annual_budget_allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF _total_amount < 0 THEN
    RAISE EXCEPTION 'Total budget allocation amount cannot be negative.';
  END IF;

  IF _fiscal_year < 2000 OR _fiscal_year > 2100 THEN
    RAISE EXCEPTION 'Fiscal year must be between 2000 and 2100.';
  END IF;

  INSERT INTO public.annual_budget_allocations (
    fiscal_year,
    total_amount,
    statutory_baseline_notes,
    is_active,
    updated_at
  )
  VALUES (
    _fiscal_year,
    _total_amount,
    _statutory_baseline_notes,
    COALESCE(_is_active, true),
    now()
  )
  ON CONFLICT (fiscal_year) DO UPDATE
  SET
    total_amount = EXCLUDED.total_amount,
    statutory_baseline_notes = EXCLUDED.statutory_baseline_notes,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.annual_budget_allocations
  WHERE fiscal_year = _fiscal_year;
END;
$$;

-- 6. Publicly readable purpose categories for User Portal and Admin
CREATE OR REPLACE FUNCTION public.get_budget_purpose_categories()
RETURNS SETOF public.budget_purpose_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.budget_purpose_categories
  WHERE is_active = true
  ORDER BY sort_order ASC, name ASC;
END;
$$;

-- 7. Admin RPC: get purpose categories
CREATE OR REPLACE FUNCTION public.admin_get_budget_purpose_categories(_session_token text)
RETURNS SETOF public.budget_purpose_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.budget_purpose_categories
  ORDER BY sort_order ASC, name ASC;
END;
$$;

-- 8. Admin RPC: save purpose category
CREATE OR REPLACE FUNCTION public.admin_save_budget_purpose_category(
  _session_token text,
  _name text,
  _description text DEFAULT NULL,
  _sort_order integer DEFAULT 0,
  _is_active boolean DEFAULT true
)
RETURNS SETOF public.budget_purpose_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _trimmed_name text := trim(_name);
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF _trimmed_name = '' THEN
    RAISE EXCEPTION 'Purpose category name cannot be blank.';
  END IF;

  INSERT INTO public.budget_purpose_categories (name, description, sort_order, is_active, updated_at)
  VALUES (_trimmed_name, _description, COALESCE(_sort_order, 0), COALESCE(_is_active, true), now())
  ON CONFLICT (name) DO UPDATE
  SET
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.budget_purpose_categories
  WHERE name = _trimmed_name;
END;
$$;

-- 9. Authoritative Server-Side Budget Monitoring Summary RPC
CREATE OR REPLACE FUNCTION public.admin_get_budget_monitoring_summary(
  _session_token text,
  _fiscal_year integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _allocation RECORD;
  _total_fy_budget numeric := NULL;
  _statutory_baseline_notes text := NULL;
  _is_configured boolean := false;
  _approved_budget numeric := 0;
  _released_budget numeric := 0;
  _liquidated_budget numeric := 0;
  _pending_disbursement numeric := 0;
  _active_in_field numeric := 0;
  _remaining_headroom numeric := NULL;
  _deficit_amount numeric := 0;
  _is_deficit boolean := false;
  _category_breakdown jsonb := '[]'::jsonb;
  _total_requests integer := 0;
  _released_requests integer := 0;
  _liquidated_requests integer := 0;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 1. Fetch configured annual allocation for the target fiscal year
  SELECT total_amount, statutory_baseline_notes, is_active
  INTO _allocation
  FROM public.annual_budget_allocations
  WHERE fiscal_year = _fiscal_year
  LIMIT 1;

  IF FOUND THEN
    _total_fy_budget := _allocation.total_amount;
    _statutory_baseline_notes := _allocation.statutory_baseline_notes;
    _is_configured := true;
  END IF;

  -- 2. Aggregate approved budget requests belonging to this fiscal year
  -- Allowed approved lifecycle statuses: approved_for_ftf_green, hard_copy_submitted, budget_released, completed
  SELECT
    COALESCE(SUM(COALESCE(approved_amount, requested_amount, 0)), 0),
    COUNT(*)
  INTO _approved_budget, _total_requests
  FROM public.budget_requests
  WHERE fiscal_year = _fiscal_year
    AND status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed');

  -- 3. Aggregate released budget requests belonging to this fiscal year
  SELECT
    COALESCE(SUM(COALESCE(released_amount, 0)), 0),
    COUNT(*)
  INTO _released_budget, _released_requests
  FROM public.budget_requests
  WHERE fiscal_year = _fiscal_year
    AND status IN ('budget_released', 'completed');

  -- 4. Aggregate liquidated budget requests belonging to this fiscal year
  -- Sums the released_amount of budget_requests with completed_liquidated liquidation_reports
  SELECT
    COALESCE(SUM(COALESCE(br.released_amount, 0)), 0),
    COUNT(DISTINCT lr.id)
  INTO _liquidated_budget, _liquidated_requests
  FROM public.liquidation_reports lr
  JOIN public.budget_requests br ON lr.budget_request_id = br.id
  WHERE br.fiscal_year = _fiscal_year
    AND lr.status = 'completed_liquidated';

  -- 5. Derived financial execution metrics
  _pending_disbursement := GREATEST(_approved_budget - _released_budget, 0);
  _active_in_field := GREATEST(_released_budget - _liquidated_budget, 0);

  IF _is_configured THEN
    -- Correct statutory headroom: Total FY Budget - Approved Budget
    _remaining_headroom := _total_fy_budget - _approved_budget;
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

  -- 6. Category breakdown by purpose for this fiscal year
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', cat_row.category,
        'approved_amount', cat_row.cat_approved,
        'released_amount', cat_row.cat_released,
        'request_count', cat_row.req_count
      )
      ORDER BY cat_row.cat_approved DESC, cat_row.category ASC
    ),
    '[]'::jsonb
  )
  INTO _category_breakdown
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(purpose_category), ''), 'General / Uncategorized') AS category,
      SUM(COALESCE(approved_amount, requested_amount, 0)) AS cat_approved,
      SUM(CASE WHEN status IN ('budget_released', 'completed') THEN COALESCE(released_amount, 0) ELSE 0 END) AS cat_released,
      COUNT(*) AS req_count
    FROM public.budget_requests
    WHERE fiscal_year = _fiscal_year
      AND status IN ('approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed')
    GROUP BY COALESCE(NULLIF(TRIM(purpose_category), ''), 'General / Uncategorized')
  ) cat_row;

  RETURN jsonb_build_object(
    'fiscal_year', _fiscal_year,
    'is_configured', _is_configured,
    'total_fy_budget', _total_fy_budget,
    'statutory_baseline_notes', _statutory_baseline_notes,
    'approved_budget', _approved_budget,
    'released_budget', _released_budget,
    'liquidated_budget', _liquidated_budget,
    'pending_disbursement', _pending_disbursement,
    'active_in_field', _active_in_field,
    'remaining_headroom', _remaining_headroom,
    'is_deficit', _is_deficit,
    'deficit_amount', _deficit_amount,
    'total_requests', _total_requests,
    'released_requests', _released_requests,
    'liquidated_requests', _liquidated_requests,
    'category_breakdown', _category_breakdown
  );
END;
$$;
