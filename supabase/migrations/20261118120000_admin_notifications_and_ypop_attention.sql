-- Admin in-app notifications were never stored: notifications.user_id only accepted auth.users ids,
-- but admins live in admin_accounts. Accept either, and keep the cleanup the FK used to provide.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

CREATE OR REPLACE FUNCTION public.guard_notification_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $fn$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.admin_accounts WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Notification recipient % is not an organization user or administrator.', NEW.user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_guard_notification_recipient ON public.notifications;
CREATE TRIGGER trg_guard_notification_recipient BEFORE INSERT OR UPDATE OF user_id ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_recipient();

CREATE OR REPLACE FUNCTION public.delete_recipient_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $fn$
BEGIN
  DELETE FROM public.notifications WHERE user_id = OLD.id;
  RETURN OLD;
END $fn$;
DROP TRIGGER IF EXISTS trg_delete_user_notifications ON auth.users;
CREATE TRIGGER trg_delete_user_notifications AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.delete_recipient_notifications();
DROP TRIGGER IF EXISTS trg_delete_admin_notifications ON public.admin_accounts;
CREATE TRIGGER trg_delete_admin_notifications AFTER DELETE ON public.admin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.delete_recipient_notifications();
REVOKE ALL ON FUNCTION public.guard_notification_recipient() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_recipient_notifications() FROM PUBLIC, anon, authenticated;

-- Needs Attention also lists YPOP items awaiting validation (same statuses the YPOP card counts).
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_summary(_session_token text, _fiscal_year integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _summary jsonb;
  _attention jsonb;
  _recent_activity jsonb;
  _budget_totals jsonb;
BEGIN
  SELECT vat.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
    INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  JOIN public.roles r ON r.id = aa.role_id
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  SELECT jsonb_strip_nulls(jsonb_build_object(
    'organizationsTotal', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_profiles) END,
    'pendingProfiles', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_profiles WHERE profile_status::text IN ('pending_review', 'incomplete')) END,
    'nonCompliant', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_profiles WHERE profile_status::text = 'suspended_inactive') END,
    'pendingDocuments', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.document_submissions WHERE status::text IN ('submitted', 'under_admin_review')) END,
    'revisions', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.document_submissions WHERE status::text = 'needs_revision') END,
    'approvedDocs', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.document_submissions WHERE status::text = 'approved_green') END,
    'pendingRenewals', CASE WHEN _role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.organization_renewals WHERE status::text <> 'approved') END,
    'budgetRequestsTotal', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text <> 'draft') END,
    'pendingBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('submitted', 'under_review')) END,
    'approvedBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted')) END,
    'releasedBudget', CASE WHEN _role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.budget_requests WHERE status::text = 'budget_released') END,
    'liquidationsTotal', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text <> 'draft') END,
    'pendingLiquidation', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text IN ('submitted', 'under_review')) END,
    'overdueLiquidation', CASE WHEN _role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.liquidation_reports WHERE status::text = 'overdue') END,
    'inquiriesTotal', CASE WHEN _role_code = 'super_admin' OR 'inquiries_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.inquiries) END,
    'pendingInquiries', CASE WHEN _role_code = 'super_admin' OR 'inquiries_management' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.inquiries WHERE status::text = 'pending_review') END,
    'ypopEntriesTotal', CASE WHEN _role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permission_codes) THEN (SELECT count(*) FROM public.ypop_entries) END,
    'pendingYpop', CASE WHEN _role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permission_codes) THEN
      (SELECT count(*) FROM public.ypop_event_participations WHERE status::text IN ('pending_evaluation', 'pending_verification')) +
      (SELECT count(*) FROM public.ypop_org_activities WHERE status::text IN ('pending_evaluation', 'submitted', 'under_review')) END
  )) INTO _summary;

  _budget_totals := NULL;
  IF _role_code = 'super_admin' OR 'budget_monitoring_view' = ANY(_permission_codes) THEN
    SELECT jsonb_build_object(
      'approved', COALESCE(sum(CASE WHEN br.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted', 'budget_released', 'completed', 'approved', 'approved_green', 'conditionally_approved_amber') THEN COALESCE(br.approved_amount, br.requested_amount, 0) ELSE 0 END), 0),
      'released', COALESCE(sum(CASE WHEN br.status::text IN ('budget_released', 'completed', 'released') THEN COALESCE(br.released_amount, 0) ELSE 0 END), 0),
      'liquidated', COALESCE(sum(CASE WHEN latest_report.status::text = 'completed_liquidated' THEN COALESCE(br.released_amount, 0) ELSE 0 END), 0)
    ) INTO _budget_totals
    FROM public.budget_requests br
    LEFT JOIN LATERAL (
      SELECT lr.status
      FROM public.liquidation_reports lr
      WHERE lr.budget_request_id = br.id
      ORDER BY lr.updated_at DESC, lr.id DESC
      LIMIT 1
    ) latest_report ON true
    WHERE _fiscal_year IS NULL OR br.fiscal_year = _fiscal_year;
  END IF;

  WITH attention AS (
    SELECT 'registration'::text AS kind, op.id, op.organization_name AS organization_name,
      'Submitted registration profile · Review registration'::text AS action_text,
      'Submitted'::text AS verb, op.updated_at AS created_at
    FROM public.organization_profiles op
    WHERE (_role_code = 'super_admin' OR 'registrations_management' = ANY(_permission_codes))
      AND op.profile_status::text IN ('pending_review', 'incomplete')
    UNION ALL
    SELECT 'budget', br.id, op.organization_name,
      br.activity_title || ' · Review budget request', 'Submitted', br.created_at
    FROM public.budget_requests br
    JOIN public.organization_profiles op ON op.id = br.organization_id
    WHERE (_role_code = 'super_admin' OR 'budget_requests_review' = ANY(_permission_codes))
      AND br.status::text IN ('submitted', 'under_review')
    UNION ALL
    SELECT 'liquidation', lr.id, op.organization_name,
      COALESCE(br.activity_title, 'Liquidation report') || ' · Review liquidation', 'Submitted', lr.created_at
    FROM public.liquidation_reports lr
    JOIN public.organization_profiles op ON op.id = lr.organization_id
    LEFT JOIN public.budget_requests br ON br.id = lr.budget_request_id
    WHERE (_role_code = 'super_admin' OR 'liquidation_reports_review' = ANY(_permission_codes))
      AND lr.status::text IN ('submitted', 'under_review', 'overdue')
    UNION ALL
    SELECT 'inquiry', i.id, COALESCE(NULLIF(i.organization_name, ''), i.submitter_name),
      i.subject || ' · Review inquiry', 'Received', i.created_at
    FROM public.inquiries i
    WHERE (_role_code = 'super_admin' OR 'inquiries_management' = ANY(_permission_codes))
      AND i.status::text = 'pending_review'
    UNION ALL
    SELECT 'ypop', ep.id, op.organization_name,
      COALESCE(NULLIF(ep.activity_name, ''), 'City-led activity') || ' · Validate YPOP proof', 'Submitted',
      COALESCE(ep.proof_submitted_at, ep.updated_at)
    FROM public.ypop_event_participations ep
    JOIN public.organization_profiles op ON op.id = ep.organization_id
    WHERE (_role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permission_codes))
      AND ep.status::text IN ('pending_evaluation', 'pending_verification')
    UNION ALL
    SELECT 'ypop', oa.id, op.organization_name,
      COALESCE(NULLIF(oa.activity_name, ''), 'Organization-led activity') || ' · Validate YPOP activity', 'Submitted',
      COALESCE(oa.submitted_at, oa.updated_at)
    FROM public.ypop_org_activities oa
    JOIN public.organization_profiles op ON op.id = oa.organization_id
    WHERE (_role_code = 'super_admin' OR 'ypop_validation_review' = ANY(_permission_codes))
      AND oa.status::text IN ('pending_evaluation', 'submitted', 'under_review')
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', kind || '-' || id,
    'kind', kind,
    'organizationName', organization_name,
    'actionText', action_text,
    'verb', verb,
    'timestamp', created_at
  ) ORDER BY created_at DESC, id DESC), '[]'::jsonb)
  INTO _attention
  FROM (SELECT * FROM attention ORDER BY created_at DESC, id DESC LIMIT 5) recent_attention;

  _recent_activity := '[]'::jsonb;
  IF _role_code = 'super_admin' OR 'activity_logs_view' = ANY(_permission_codes) THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', logs.id,
      'action', logs.action,
      'description', logs.description,
      'createdAt', logs.created_at
    ) ORDER BY logs.created_at DESC, logs.id DESC), '[]'::jsonb)
    INTO _recent_activity
    FROM (
      SELECT id, action, description, created_at
      FROM public.activity_logs
      ORDER BY created_at DESC, id DESC
      LIMIT 4
    ) logs;
  END IF;

  RETURN jsonb_build_object(
    'summary', _summary,
    'budgetTotals', _budget_totals,
    'needsAttention', _attention,
    'recentActivity', _recent_activity
  );
END;
$function$;
