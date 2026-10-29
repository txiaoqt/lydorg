-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_portal_section_state(_session_token text, _section text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _required_permission text;
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

  _required_permission := CASE _section
    WHEN 'renewals' THEN 'registrations_management'
    WHEN 'budget-utilization' THEN 'budget_requests_review'
    WHEN 'liquidation-monitoring' THEN 'liquidation_reports_review'
    WHEN 'budget-monitoring' THEN 'budget_monitoring_view'
    WHEN 'news-releases' THEN 'news_releases_management'
    WHEN 'templates' THEN 'forms_templates_management'
    WHEN 'yorp-registry' THEN 'yorp_registry_view'
    WHEN 'ypop-validation' THEN 'ypop_validation_review'
    ELSE NULL
  END;

  IF _required_permission IS NULL THEN
    RAISE EXCEPTION 'Unsupported Admin Portal section.';
  END IF;

  IF _role_code <> 'super_admin'
     AND NOT (_required_permission = ANY(_permission_codes))
     AND NOT (_section = 'renewals' AND 'renewals_manage' = ANY(_permission_codes))
     AND NOT (_section = 'templates' AND (
       'registrations_management' = ANY(_permission_codes)
       OR 'renewals_manage' = ANY(_permission_codes)
     )) THEN
    RAISE EXCEPTION 'You do not have permission to view this Admin Portal section.';
  END IF;

  IF _section = 'templates' THEN
    RETURN jsonb_build_object(
      'templates', COALESCE((
        SELECT jsonb_agg(to_jsonb(rdt) ORDER BY rdt.sort_order ASC, rdt.id ASC)
        FROM public.required_document_types rdt
      ), '[]'::jsonb)
    );
  ELSIF _section = 'news-releases' THEN
    RETURN jsonb_build_object(
      'news_releases', COALESCE((
        SELECT jsonb_agg(to_jsonb(nr) ORDER BY nr.date_posted DESC, nr.created_at DESC)
        FROM public.news_releases nr
      ), '[]'::jsonb),
      'news_categories', COALESCE((
        SELECT jsonb_agg(to_jsonb(nc) ORDER BY nc.is_system DESC, nc.name ASC)
        FROM public.news_categories nc
      ), '[]'::jsonb)
    );
  ELSIF _section = 'renewals' THEN
    RETURN jsonb_build_object(
      'organization_profiles', COALESCE((
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
        WHERE EXISTS (
          SELECT 1 FROM public.organization_renewals renewal
          WHERE renewal.organization_id = op.id
        )
      ), '[]'::jsonb),
      'document_submissions', COALESCE((
        SELECT jsonb_agg(to_jsonb(ds) ORDER BY ds.created_at DESC)
        FROM public.document_submissions ds
        WHERE ds.submission_scope::text = 'renewal' OR ds.renewal_id IS NOT NULL
      ), '[]'::jsonb),
      'document_submission_files', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', dsf.id,
          'submission_id', dsf.submission_id,
          'document_type_id', dsf.document_type_id,
          'file_url', dsf.file_url,
          'file_name', dsf.file_name,
          'file_type', dsf.file_type,
          'file_size', dsf.file_size,
          'validation_status', dsf.validation_status,
          'admin_status', dsf.admin_status,
          'admin_remarks', dsf.admin_remarks,
          'revision_history', dsf.revision_history,
          'uploaded_at', dsf.uploaded_at,
          'reviewed_at', dsf.reviewed_at,
          'revision_requested_at', dsf.revision_requested_at,
          'revision_due_at', dsf.revision_due_at,
          'revision_locked', dsf.revision_locked,
          'revision_unlocked_at', dsf.revision_unlocked_at,
          'revision_unlocked_by', dsf.revision_unlocked_by,
          'created_at', dsf.created_at,
          'updated_at', dsf.updated_at,
          'required_document_types', (
            SELECT jsonb_build_object('id', rdt.id, 'name', rdt.name)
            FROM public.required_document_types rdt
            WHERE rdt.id = dsf.document_type_id
            LIMIT 1
          )
        ) ORDER BY dsf.created_at DESC)
        FROM public.document_submission_files dsf
        JOIN public.document_submissions ds ON ds.id = dsf.submission_id
        WHERE ds.submission_scope::text = 'renewal' OR ds.renewal_id IS NOT NULL
      ), '[]'::jsonb),
      'templates', COALESCE((
        SELECT jsonb_agg(to_jsonb(rdt) ORDER BY rdt.sort_order ASC, rdt.id ASC)
        FROM public.required_document_types rdt
        WHERE rdt.is_active = true
      ), '[]'::jsonb)
    );
  ELSIF _section = 'budget-utilization' THEN
    RETURN jsonb_build_object(
      'organization_profiles', COALESCE((
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
        WHERE EXISTS (
          SELECT 1 FROM public.budget_requests br
          WHERE br.organization_id = op.id AND br.status::text <> 'draft'
        )
      ), '[]'::jsonb),
      'budget_requests', COALESCE((
        SELECT jsonb_agg(to_jsonb(br) ORDER BY br.created_at DESC)
        FROM public.budget_requests br
        WHERE br.status::text <> 'draft'
      ), '[]'::jsonb),
      'budget_request_files', COALESCE((
        SELECT jsonb_agg(to_jsonb(brf) ORDER BY brf.created_at DESC)
        FROM public.budget_request_files brf
        JOIN public.budget_requests br ON br.id = brf.budget_request_id
        WHERE br.status::text <> 'draft'
      ), '[]'::jsonb)
    );
  ELSIF _section = 'budget-monitoring' THEN
    RETURN jsonb_build_object(
      'organization_profiles', COALESCE((
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
        WHERE EXISTS (
          SELECT 1 FROM public.budget_requests br
          WHERE br.organization_id = op.id AND br.status::text <> 'draft'
        )
      ), '[]'::jsonb),
      'budget_requests', COALESCE((
        SELECT jsonb_agg(to_jsonb(br) ORDER BY br.created_at DESC)
        FROM public.budget_requests br
        WHERE br.status::text <> 'draft'
      ), '[]'::jsonb),
      'budget_request_files', COALESCE((
        SELECT jsonb_agg(to_jsonb(brf) ORDER BY brf.created_at DESC)
        FROM public.budget_request_files brf
        JOIN public.budget_requests br ON br.id = brf.budget_request_id
        WHERE br.status::text <> 'draft'
      ), '[]'::jsonb),
      'liquidation_reports', COALESCE((
        SELECT jsonb_agg(to_jsonb(lr) ORDER BY lr.created_at DESC)
        FROM public.liquidation_reports lr
        WHERE lr.status::text <> 'draft' AND EXISTS (
          SELECT 1 FROM public.budget_requests br
          WHERE br.id = lr.budget_request_id AND br.status::text <> 'draft'
        )
      ), '[]'::jsonb),
      'transparency_posts', COALESCE((
        SELECT jsonb_agg(to_jsonb(tp) ORDER BY tp.post_date DESC, tp.created_at DESC)
        FROM public.transparency_posts tp
      ), '[]'::jsonb),
      'compliance_remarks', COALESCE((
        SELECT jsonb_agg(to_jsonb(cr) ORDER BY cr.created_at DESC)
        FROM public.compliance_remarks cr
      ), '[]'::jsonb)
    );
  ELSIF _section = 'liquidation-monitoring' THEN
    RETURN jsonb_build_object(
      'organization_profiles', COALESCE((
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
        WHERE EXISTS (
          SELECT 1 FROM public.liquidation_reports lr
          WHERE lr.organization_id = op.id
        )
      ), '[]'::jsonb),
      'budget_requests', COALESCE((
        SELECT jsonb_agg(to_jsonb(br) ORDER BY br.created_at DESC)
        FROM public.budget_requests br
        WHERE EXISTS (
          SELECT 1 FROM public.liquidation_reports lr WHERE lr.budget_request_id = br.id
        )
      ), '[]'::jsonb),
      'budget_request_files', COALESCE((
        SELECT jsonb_agg(to_jsonb(brf) ORDER BY brf.created_at DESC)
        FROM public.budget_request_files brf
        JOIN public.liquidation_reports lr ON lr.budget_request_id = brf.budget_request_id
        JOIN public.budget_requests br ON br.id = lr.budget_request_id
        WHERE br.status::text <> 'draft' AND lr.status::text <> 'draft'
      ), '[]'::jsonb),
      'liquidation_reports', COALESCE((
        SELECT jsonb_agg(to_jsonb(lr) ORDER BY lr.created_at DESC)
        FROM public.liquidation_reports lr
        JOIN public.budget_requests br ON br.id = lr.budget_request_id
        WHERE br.status::text <> 'draft' AND lr.status::text <> 'draft'
      ), '[]'::jsonb),
      'liquidation_report_files', COALESCE((
        SELECT jsonb_agg(to_jsonb(lrf) ORDER BY lrf.created_at DESC)
        FROM public.liquidation_report_files lrf
        JOIN public.liquidation_reports lr ON lr.id = lrf.liquidation_report_id
        JOIN public.budget_requests br ON br.id = lr.budget_request_id
        WHERE br.status::text <> 'draft' AND lr.status::text <> 'draft' AND lr.status::text NOT IN ('not_started','pending_activity_completion')
      ), '[]'::jsonb)
    );
  ELSIF _section = 'yorp-registry' THEN
    RETURN jsonb_build_object(
      'organization_profiles', COALESCE((
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
        WHERE op.profile_status::text = 'verified' OR op.yorp_registered_year IS NOT NULL
      ), '[]'::jsonb),
      'ypop_periods', COALESCE((
        SELECT jsonb_agg(to_jsonb(yp) ORDER BY yp.created_at DESC)
        FROM public.ypop_periods yp
      ), '[]'::jsonb),
      'ypop_entries', COALESCE((
        SELECT jsonb_agg(to_jsonb(ye) ORDER BY ye.created_at DESC)
        FROM public.ypop_entries ye
        WHERE EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = ye.organization_id
            AND (op.profile_status::text = 'verified' OR op.yorp_registered_year IS NOT NULL)
        )
      ), '[]'::jsonb)
    );
  ELSIF _section = 'ypop-validation' THEN
    RETURN jsonb_build_object(
      'organization_profiles', COALESCE((
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
        WHERE EXISTS (SELECT 1 FROM public.ypop_entries ye WHERE ye.organization_id = op.id)
           OR EXISTS (SELECT 1 FROM public.ypop_event_participations yep WHERE yep.organization_id = op.id AND yep.status::text <> 'draft')
           OR EXISTS (SELECT 1 FROM public.ypop_org_activities yoa WHERE yoa.organization_id = op.id AND yoa.status::text <> 'draft')
      ), '[]'::jsonb)
    );
  END IF;

  RAISE EXCEPTION 'Unsupported Admin Portal section.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_recent_notifications(_session_token text, _limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _safe_limit integer := LEAST(GREATEST(COALESCE(_limit, 25), 1), 50);
  _rows jsonb;
  _unread_count bigint;
BEGIN
  SELECT vat.admin_id
    INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  SELECT count(*) INTO _unread_count
  FROM public.notifications n
  WHERE n.user_id::text IN (_admin_id::text, 'admin') AND n.is_read = false;

  SELECT COALESCE(jsonb_agg(to_jsonb(recent) ORDER BY recent.created_at DESC, recent.id DESC), '[]'::jsonb)
    INTO _rows
  FROM (
    SELECT n.*
    FROM public.notifications n
    WHERE n.user_id::text IN (_admin_id::text, 'admin')
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT _safe_limit
  ) recent;

  RETURN jsonb_build_object('unreadCount', _unread_count, 'notifications', _rows);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_registration_detail(_session_token text, _organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _profile jsonb;
  _submission jsonb;
  _files jsonb;
  _activity jsonb;
  _templates jsonb;
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
  IF _role_code <> 'super_admin' AND NOT ('registrations_management' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to review registrations.';
  END IF;

  SELECT to_jsonb(op) INTO _profile
  FROM public.organization_profiles op
  WHERE op.id = _organization_id;
  IF _profile IS NULL THEN
    RAISE EXCEPTION 'Registration was not found.';
  END IF;

  SELECT to_jsonb(ds) INTO _submission
  FROM public.document_submissions ds
  WHERE ds.organization_id = _organization_id
    AND COALESCE(ds.submission_scope::text, 'registration') = 'registration'
    AND ds.renewal_id IS NULL
  ORDER BY ds.updated_at DESC, ds.created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    to_jsonb(dsf) || jsonb_build_object(
      'required_document_types', CASE WHEN rdt.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', rdt.id, 'name', rdt.name) END
    ) ORDER BY dsf.created_at DESC, dsf.id ASC
  ), '[]'::jsonb)
  INTO _files
  FROM public.document_submission_files dsf
  LEFT JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
  WHERE _submission IS NOT NULL
    AND dsf.submission_id = (_submission ->> 'id')::uuid;

  SELECT COALESCE(jsonb_agg(to_jsonb(log) ORDER BY log.created_at DESC, log.id DESC), '[]'::jsonb)
  INTO _activity
  FROM (
    SELECT al.*
    FROM public.activity_logs al
    WHERE al.organization_id = _organization_id
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT 20
  ) log;

  SELECT COALESCE(jsonb_agg(to_jsonb(rdt) ORDER BY rdt.sort_order ASC, rdt.name ASC), '[]'::jsonb)
    INTO _templates
  FROM public.required_document_types rdt
  WHERE rdt.is_active = true;

  RETURN jsonb_build_object(
    'profile', _profile,
    'submission', _submission,
    'files', _files,
    'activity', _activity,
    'templates', _templates
  );
END;
$function$;

RESET check_function_bodies;

