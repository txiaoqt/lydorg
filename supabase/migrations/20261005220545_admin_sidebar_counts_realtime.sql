CREATE OR REPLACE FUNCTION public.admin_get_sidebar_counts(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permissions text[];
BEGIN
  SELECT vat.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
  INTO _admin_id, _role_code, _permissions
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active
  JOIN public.roles r ON r.id = aa.role_id
  LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'pendingProfiles', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permissions)
      THEN (SELECT count(*) FROM public.organization_profiles WHERE profile_status::text IN ('pending_review','incomplete')) END,
    'pendingRenewals', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permissions)
      THEN (SELECT count(*) FROM public.organization_renewals WHERE status::text <> 'approved') END,
    'pendingBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permissions)
      THEN (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('submitted','under_review')) END,
    'pendingLiquidation', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permissions)
      THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text IN ('submitted','under_review')) END,
    'overdueLiquidation', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permissions)
      THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text = 'overdue') END,
    'pendingInquiries', CASE WHEN _role_code = 'super_admin' OR 'inquiries_management' = ANY(_permissions)
      THEN (SELECT count(*) FROM public.inquiries WHERE status::text = 'pending_review') END,
    'pendingYpop', CASE WHEN _role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permissions) THEN
      (SELECT count(*) FROM public.ypop_event_participations WHERE status::text IN ('pending_evaluation','pending_verification')) +
      (SELECT count(*) FROM public.ypop_org_activities WHERE status::text IN ('pending_evaluation','submitted','under_review')) END
  ));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_sidebar_counts(text) FROM PUBLIC;
-- Custom admin sessions are validated inside the RPC, as with existing admin APIs.
GRANT EXECUTE ON FUNCTION public.admin_get_sidebar_counts(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_broadcast_sidebar_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Public channel is a content-free invalidation hint because custom admin
  -- sessions are not Supabase Auth JWTs. Counts and records stay behind the RPC.
  PERFORM realtime.send('{}'::jsonb, 'counts-changed', 'admin-sidebar-refresh', false);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_broadcast_sidebar_refresh() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_admin_sidebar_version_refresh
AFTER UPDATE ON public.admin_portal_change_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.admin_broadcast_sidebar_refresh();

-- Inquiries are not tracked by the existing workflow change-version table.
CREATE TRIGGER trg_admin_sidebar_inquiry_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.inquiries
FOR EACH STATEMENT EXECUTE FUNCTION public.admin_broadcast_sidebar_refresh();

NOTIFY pgrst, 'reload schema';
