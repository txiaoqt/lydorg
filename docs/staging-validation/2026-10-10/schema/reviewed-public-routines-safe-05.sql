-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION public.admin_get_liquidation_report_detail(_session_token text, _report_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _report jsonb; _files jsonb; _budget jsonb;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('liquidation_reports_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to review liquidation reports.'; END IF;
  SELECT jsonb_build_object('id',lr.id,'budget_request_id',lr.budget_request_id,'organization_id',lr.organization_id,
    'submitted_by',lr.submitted_by,'status',lr.status,'remarks',lr.remarks,'go_signal_at',lr.go_signal_at,'deadline_at',lr.deadline_at,
    'hard_copy_submitted_at',lr.hard_copy_submitted_at,'completed_at',lr.completed_at,'revision_requested_at',lr.revision_requested_at,
    'revision_due_at',lr.revision_due_at,'revision_locked',lr.revision_locked,'revision_locked_at',lr.revision_locked_at,
    'revision_unlocked_at',lr.revision_unlocked_at,'revision_unlocked_by',lr.revision_unlocked_by,
    'public_record_code',(SELECT code.public_record_code FROM (
      SELECT l.id,
        'LR-' || to_char((l.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY l.created_at,l.id)::text,2,'0')
            ELSE '' END AS public_record_code
      FROM public.liquidation_reports l JOIN public.budget_requests b ON b.id=l.budget_request_id
      WHERE b.status::text IN ('budget_released','completed')
    ) code WHERE code.id=lr.id),
    'created_at',lr.created_at,'updated_at',lr.updated_at)
  INTO _report FROM public.liquidation_reports lr WHERE lr.id=_report_id;
  IF _report IS NULL THEN RAISE EXCEPTION 'Liquidation report was not found.'; END IF;
  IF _report->>'status' = 'draft' THEN RAISE EXCEPTION 'This liquidation report has not been submitted for review.'; END IF;
  SELECT jsonb_build_object('id',br.id,'organization_id',br.organization_id,'submitted_by',br.submitted_by,'activity_title',br.activity_title,
    'activity_description',br.activity_description,'activity_date',br.activity_date,'venue',br.venue,'requested_amount',br.requested_amount,
    'approved_amount',br.approved_amount,'released_amount',br.released_amount,'release_date',br.release_date,'purpose_category',br.purpose_category,
    'fiscal_year',br.fiscal_year,'status',br.status,'remarks',br.remarks,'admin_remarks',br.admin_remarks,'go_signal_at',br.go_signal_at,
    'hard_copy_submitted_at',br.hard_copy_submitted_at,'user_note',br.user_note,'revision_history',br.revision_history,
    'public_record_code',(SELECT code.public_record_code FROM (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at,b.id)::text,2,'0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b WHERE b.status::text <> 'draft'
    ) code WHERE code.id=br.id),
    'created_at',br.created_at,'updated_at',br.updated_at) INTO _budget
  FROM public.budget_requests br WHERE br.id=(_report->>'budget_request_id')::uuid;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',f.id,'liquidation_report_id',f.liquidation_report_id,'file_url',f.file_url,
    'file_name',f.file_name,'file_type',f.file_type,'file_size',f.file_size,'uploaded_at',f.uploaded_at,'created_at',f.created_at,
    'admin_status',f.admin_status,'admin_remarks',f.admin_remarks) ORDER BY f.created_at DESC),'[]'::jsonb)
  INTO _files FROM public.liquidation_report_files f WHERE f.liquidation_report_id=_report_id AND _report->>'status' NOT IN ('draft','not_started','pending_activity_completion');
  RETURN jsonb_build_object('report',_report,'budget_request',_budget,'files',_files);
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_or_create_renewal_test_account(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_organization_identity_review(_session_token text, _organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
declare _admin uuid; _p public.organization_profiles; _case ytrace_identity.cases; _candidates jsonb; _history jsonb; _related jsonb;
begin
 _admin:=ytrace_identity.authorize_reviewer(_session_token);
 select * into _p from public.organization_profiles where id=_organization_id;
 if not found then raise exception 'Registration not found.'; end if;
 perform ytrace_identity.assess(_p);
 select * into _case from ytrace_identity.cases where organization_id=_organization_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.organization_name,'urn',p.urn,'barangay',p.barangay,'district',p.district,
   'status',p.profile_status,'verifiedAt',p.verified_at,'signals',jsonb_build_object('normalizedName',p.identity_name_key=_p.identity_name_key,
   'sameBarangay',p.barangay=_p.barangay,'sameDistrict',p.district=_p.district,
   'exactUrn',nullif(_p.urn,'') is not null and p.urn_normalized=public.normalize_urn(_p.urn)),
   'hasRetainedHistory',exists(select 1 from public.organization_accreditations h where h.organization_id=p.id)
      or exists(select 1 from public.budget_requests h where h.organization_id=p.id)
      or exists(select 1 from public.liquidation_reports h where h.organization_id=p.id),
   'separateDecision',exists(select 1 from ytrace_identity.decisions d where d.organization_id=_p.id and d.candidate_id=p.id
       and d.decision='confirmed_different' and d.subject_fingerprint=ytrace_identity.fingerprint(_p)
       and d.candidate_fingerprint=ytrace_identity.candidate_fingerprint(p)))),'[]'::jsonb)
 into _candidates from ytrace_identity.candidates(_p.organization_name,_p.barangay,
   case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id) p;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'adminId',admin_id,'candidateId',candidate_id,'decision',decision,'reason',reason,
   'evidenceReference',evidence_reference,'createdAt',created_at) order by created_at desc),'[]'::jsonb) into _history
 from (select * from ytrace_identity.decisions where organization_id=_p.id order by created_at desc limit 50) d;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.organization_name,'urn',p.urn,'status',p.profile_status)),'[]'::jsonb)
 into _related from (select p.id,p.organization_name,p.urn,p.profile_status from ytrace_identity.cases c
   join public.organization_profiles p on p.id=c.organization_id
   where c.canonical_organization_id=coalesce(_case.canonical_organization_id,_p.id)
   order by c.updated_at desc,p.id limit 21) p;
 return jsonb_build_object('outcome',_case.outcome,'version',_case.version,'canonicalOrganizationId',_case.canonical_organization_id,
   'candidates',_candidates,'candidateLimitReached',jsonb_array_length(_candidates)>=21,'history',_history,'historyLimited',true,
   'relatedRegistrations',_related,'relatedLimitReached',jsonb_array_length(_related)>=21);
end $function$;

CREATE OR REPLACE FUNCTION public.admin_get_organization_renewals(_session_token text)
 RETURNS SETOF organization_renewals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_accounts aa
    JOIN public.roles r ON r.id = aa.role_id
    WHERE aa.id = _admin_id
      AND aa.is_active = true
      AND (r.code = 'super_admin' OR 'renewals_manage' = ANY(r.permission_codes))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view renewal applications.';
  END IF;

  RETURN QUERY
  SELECT renewal.*
  FROM public.organization_renewals renewal
  ORDER BY renewal.submitted_at DESC NULLS LAST, renewal.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_portal_change_versions(_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE _admin_id uuid;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  RETURN (SELECT jsonb_object_agg(resource_key, version ORDER BY resource_key)
          FROM public.admin_portal_change_versions);
END;
$function$;

RESET check_function_bodies;

