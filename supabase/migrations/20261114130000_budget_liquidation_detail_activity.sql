-- Budget and liquidation detail RPCs return their own activity (Recent Activity panels were empty until a full reload).
CREATE OR REPLACE FUNCTION public.admin_get_budget_request_detail(_session_token text, _request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _request jsonb; _files jsonb; _activity jsonb;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[]) INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('budget_requests_review'=ANY(_permission_codes)) THEN RAISE EXCEPTION 'You do not have permission to review budget requests.'; END IF;
  SELECT jsonb_build_object(
    'id',br.id,'organization_id',br.organization_id,'submitted_by',br.submitted_by,'activity_title',br.activity_title,
    'activity_description',br.activity_description,'activity_date',br.activity_date,'venue',br.venue,
    'requested_amount',br.requested_amount,'approved_amount',br.approved_amount,'released_amount',br.released_amount,
    'release_date',br.release_date,'purpose_category',br.purpose_category,'fiscal_year',br.fiscal_year,'status',br.status,
    'remarks',br.remarks,'admin_remarks',br.admin_remarks,'go_signal_at',br.go_signal_at,'hard_copy_submitted_at',br.hard_copy_submitted_at,
    'user_note',br.user_note,'revision_requested_at',br.revision_requested_at,'revision_due_at',br.revision_due_at,
    'revision_locked',br.revision_locked,'revision_locked_at',br.revision_locked_at,'revision_unlocked_at',br.revision_unlocked_at,
    'revision_unlocked_by',br.revision_unlocked_by,'revision_history',br.revision_history,'budget_request_type',br.budget_request_type,
    'ypop_entry_id',br.ypop_entry_id,
    'public_record_code',(SELECT code.public_record_code FROM (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at,b.id)::text,2,'0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b WHERE b.status::text <> 'draft'
    ) code WHERE code.id=br.id),
    'created_at',br.created_at,'updated_at',br.updated_at
  ) INTO _request FROM public.budget_requests br WHERE br.id=_request_id;
  IF _request IS NULL THEN RAISE EXCEPTION 'Budget request was not found.'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',f.id,'budget_request_id',f.budget_request_id,'file_url',f.file_url,
    'file_name',f.file_name,'file_type',f.file_type,'file_size',f.file_size,'uploaded_at',f.uploaded_at,'created_at',f.created_at,
    'admin_status',f.admin_status,'admin_remarks',f.admin_remarks) ORDER BY f.created_at DESC),'[]'::jsonb)
  INTO _files FROM public.budget_request_files f WHERE f.budget_request_id=_request_id;
  -- Recent Activity panel: this record's own log entries, newest first.
  SELECT COALESCE(jsonb_agg(to_jsonb(log) ORDER BY log.created_at DESC, log.id DESC), '[]'::jsonb) INTO _activity
  FROM (SELECT al.* FROM public.activity_logs al WHERE al.related_type = 'budget_request' AND al.related_id = _request_id
        ORDER BY al.created_at DESC, al.id DESC LIMIT 40) log;
  RETURN jsonb_build_object('request',_request,'files',_files,'activity',_activity);
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_liquidation_report_detail(_session_token text, _report_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE _admin_id uuid; _role_code text; _permission_codes text[]; _report jsonb; _files jsonb; _budget jsonb; _activity jsonb;
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
  -- Recent Activity panel: this record's own log entries, newest first.
  SELECT COALESCE(jsonb_agg(to_jsonb(log) ORDER BY log.created_at DESC, log.id DESC), '[]'::jsonb) INTO _activity
  FROM (SELECT al.* FROM public.activity_logs al WHERE al.related_type = 'liquidation_report' AND al.related_id = _report_id
        ORDER BY al.created_at DESC, al.id DESC LIMIT 40) log;
  RETURN jsonb_build_object('report',_report,'budget_request',_budget,'files',_files,'activity',_activity);
END; $function$;
