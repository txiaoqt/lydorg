-- Allow bypass of accreditation delete immutability in admin_cleanup_yorp_sample_dataset
CREATE OR REPLACE FUNCTION public.admin_cleanup_yorp_sample_dataset(
  _session_token text,
  _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _admin_id uuid;
  _deleted_orgs integer := 0;
  _deleted_budgets integer := 0;
  _deleted_liquidations integer := 0;
  _deleted_users integer := 0;
  _user_ids uuid[];
  _org_ids uuid[];
  _now timestamptz := clock_timestamp();
BEGIN
  -- 1. Validate Admin Session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 2. Strict Production Guard
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Cleanup operation refused: This operation is strictly prohibited in production and requires an explicit test/development environment.';
  END IF;

  IF _batch_name IS NULL OR trim(_batch_name) = '' THEN
    RAISE EXCEPTION 'Invalid seed batch name.';
  END IF;

  -- Identify seeded organizations
  SELECT coalesce(array_agg(id), '{}'), coalesce(array_agg(user_id), '{}')
  INTO _org_ids, _user_ids
  FROM public.organization_profiles
  WHERE is_seeded_sample_data = true
    AND seed_batch = _batch_name;

  IF array_length(_org_ids, 1) > 0 THEN
    -- Activate transaction-local bypass for immutability triggers
    PERFORM set_config('app.allow_org_deletion', 'true', true);

    -- Unlink current_accreditation_id before deleting accreditations
    UPDATE public.organization_profiles
    SET current_accreditation_id = NULL
    WHERE id = ANY(_org_ids);

    -- Delete liquidation reports
    WITH del_lr AS (
      DELETE FROM public.liquidation_reports
      WHERE organization_id = ANY(_org_ids)
         OR (is_seeded_sample_data = true AND seed_batch = _batch_name)
      RETURNING id
    ) SELECT count(*) INTO _deleted_liquidations FROM del_lr;

    -- Delete budget requests
    WITH del_br AS (
      DELETE FROM public.budget_requests
      WHERE organization_id = ANY(_org_ids)
         OR (is_seeded_sample_data = true AND seed_batch = _batch_name)
      RETURNING id
    ) SELECT count(*) INTO _deleted_budgets FROM del_br;

    -- Delete organization contacts
    DELETE FROM public.organization_contacts
    WHERE organization_id = ANY(_org_ids);

    -- Delete organization accreditations
    DELETE FROM public.organization_accreditations
    WHERE organization_id = ANY(_org_ids);

    -- Delete notifications for seeded orgs
    DELETE FROM public.notifications
    WHERE organization_id = ANY(_org_ids)
       OR user_id = ANY(_user_ids);

    -- Delete organization profiles
    WITH del_op AS (
      DELETE FROM public.organization_profiles
      WHERE id = ANY(_org_ids)
      RETURNING id
    ) SELECT count(*) INTO _deleted_orgs FROM del_op;

    -- Delete auth user artifacts
    DELETE FROM public.user_profiles
    WHERE user_id = ANY(_user_ids);

    DELETE FROM auth.identities
    WHERE user_id = ANY(_user_ids);

    WITH del_u AS (
      DELETE FROM auth.users
      WHERE id = ANY(_user_ids)
      RETURNING id
    ) SELECT count(*) INTO _deleted_users FROM del_u;
  END IF;

  -- Log cleanup action in activity logs
  INSERT INTO public.activity_logs (
    actor_user_id,
    action,
    related_type,
    description,
    created_at
  ) VALUES (
    _admin_id,
    'cleaned_yorp_sample_dataset',
    'system_batch',
    format('Administrator cleaned up PCYDO YORP sample dataset: %s organizations, %s budget requests, %s liquidations, %s users removed.', _deleted_orgs, _deleted_budgets, _deleted_liquidations, _deleted_users),
    _now
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_name', _batch_name,
    'deleted_organizations', _deleted_orgs,
    'deleted_budget_requests', _deleted_budgets,
    'deleted_liquidations', _deleted_liquidations,
    'deleted_users', _deleted_users,
    'timestamp', _now
  );
END;
$$;

-- ==============================================================================
-- 8. STATUS / INSPECTION RPC FOR SEEDED DATASET
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_get_yorp_sample_dataset_status(
  _session_token text,
  _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _admin_id uuid;
  _is_test_env boolean;
  _total_seeded integer := 0;
  _count_2024 integer := 0;
  _count_2025 integer := 0;
  _count_2026 integer := 0;
  _count_awaiting integer := 0;
  _count_released integer := 0;
  _count_completed integer := 0;
  _count_liquidated integer := 0;
  _last_seeded timestamptz;
BEGIN
  -- 1. Validate Admin Session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  _is_test_env := public.is_development_or_test_environment();

  SELECT
    count(*),
    count(*) FILTER (WHERE seed_source_year = 2024),
    count(*) FILTER (WHERE seed_source_year = 2025),
    count(*) FILTER (WHERE seed_source_year = 2026),
    max(created_at)
  INTO
    _total_seeded,
    _count_2024,
    _count_2025,
    _count_2026,
    _last_seeded
  FROM public.organization_profiles
  WHERE is_seeded_sample_data = true
    AND seed_batch = _batch_name;

  SELECT
    count(*) FILTER (WHERE status = 'awaiting_release'),
    count(*) FILTER (WHERE status = 'budget_released'),
    count(*) FILTER (WHERE status = 'completed')
  INTO
    _count_awaiting,
    _count_released,
    _count_completed
  FROM public.budget_requests
  WHERE is_seeded_sample_data = true
    AND seed_batch = _batch_name;

  SELECT count(*)
  INTO _count_liquidated
  FROM public.liquidation_reports
  WHERE is_seeded_sample_data = true
    AND seed_batch = _batch_name;

  RETURN jsonb_build_object(
    'is_development_or_test_environment', _is_test_env,
    'seed_batch', _batch_name,
    'total_seeded_organizations', _total_seeded,
    'expected_total', 84,
    'year_breakdown', jsonb_build_object(
      '2024', _count_2024,
      '2025', _count_2025,
      '2026', _count_2026
    ),
    'budget_breakdown', jsonb_build_object(
      'awaiting_release', _count_awaiting,
      'budget_released', _count_released,
      'completed', _count_completed,
      'liquidated_reports', _count_liquidated
    ),
    'last_seeded_at', _last_seeded
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_development_or_test_environment() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text, text) TO authenticated, service_role;