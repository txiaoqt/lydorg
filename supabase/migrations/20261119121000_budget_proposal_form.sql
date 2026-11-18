-- Budget request = the official YPOP Project Proposal template.
-- * proposal_form: the org's saved answers (the PDF is built from them in the browser).
-- * requested_amount must equal the proposal's budget TOTAL and stay within PHP 50,000.
-- * venue is removed from budget requests (the template has no venue). YPOP activity venues are untouched.
-- * Signatories for proposals, certificates and reports live in General settings.

ALTER TABLE public.budget_requests ADD COLUMN IF NOT EXISTS proposal_form jsonb;

-- Must match proposalBudgetTotal() in src/lib/budget-proposal.ts.
CREATE OR REPLACE FUNCTION public.budget_proposal_total(_form jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT coalesce(sum(round((item->>'quantity')::numeric * (item->>'unitCost')::numeric, 2)), 0)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_form->'budgetItems') = 'array' THEN _form->'budgetItems' ELSE '[]'::jsonb END) item
$$;

ALTER TABLE public.budget_requests
  ADD CONSTRAINT budget_requests_proposal_form_object CHECK (proposal_form IS NULL OR jsonb_typeof(proposal_form) = 'object'),
  ADD CONSTRAINT budget_requests_requested_amount_max CHECK (requested_amount <= 50000),
  ADD CONSTRAINT budget_requests_amount_matches_proposal CHECK (proposal_form IS NULL OR requested_amount = public.budget_proposal_total(proposal_form));

-- Sample answers that match each seeded request, so sample requests can be revised like real ones.
CREATE OR REPLACE FUNCTION public.yorp_sample_proposal_form(_org_name text, _barangay text, _title text, _activity_date date, _amount numeric)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'organizationName', _org_name,
    'barangay', _barangay,
    'projectHead', 'Sample Project Head',
    'contactNumber', '0917 000 0000',
    'email', 'sample@ytrace.test',
    'teamMembers', jsonb_build_array(
      jsonb_build_object('name', 'Sample Project Head', 'role', 'Project Head'),
      jsonb_build_object('name', 'Sample Secretary', 'role', 'Secretary'),
      jsonb_build_object('name', 'Sample Treasurer', 'role', 'Treasurer')),
    'aboutOrganization', format('%s is a youth organization serving the young people of Barangay %s, Pasig City.', _org_name, _barangay),
    'projectTitle', _title,
    'implementationDate', to_char(_activity_date, 'YYYY-MM-DD'),
    'startTime', '08:00',
    'endTime', '17:00',
    'projectOverview', format('Official %s activity conducted by %s in Barangay %s.', _title, _org_name, _barangay),
    'rationale', 'Sample rationale for the seeded YORP dataset.',
    'targetParticipants', format('Youth members and residents of Barangay %s.', _barangay),
    'methodology', 'Planning, coordination, implementation and post-activity evaluation.',
    'objectives', 'Participants gain the knowledge and skills covered by the activity.',
    'expectedOutput', 'A completed activity with documented attendance and outputs.',
    'programme', jsonb_build_array(
      jsonb_build_object('time', '8:00-9:00 AM', 'activity', 'Registration and opening program', 'personAssigned', 'Secretariat'),
      jsonb_build_object('time', '9:00 AM-4:00 PM', 'activity', _title, 'personAssigned', 'Project Head'),
      jsonb_build_object('time', '4:00-5:00 PM', 'activity', 'Evaluation and closing', 'personAssigned', 'Secretariat')),
    'budgetItems', jsonb_build_array(jsonb_build_object('description', _title, 'quantity', 1, 'units', 'lot', 'unitCost', _amount)),
    'preparedBy', 'Sample Secretary',
    'notedBy', 'Sample President');
$$;
REVOKE ALL ON FUNCTION public.yorp_sample_proposal_form(text, text, text, date, numeric) FROM PUBLIC, anon, authenticated;

INSERT INTO public.admin_system_settings (setting_key, category, value_json, data_type, description, is_sensitive, is_editable)
VALUES
  ('general.signatory_ydo1_name', 'general', '"ARVIE A. SALOSA"', 'string', 'Reviewer 1 name on proposals, certificates and reports', false, true),
  ('general.signatory_ydo1_position', 'general', '"Youth Development Officer I"', 'string', 'Reviewer 1 position', false, true),
  ('general.signatory_ydo2_name', 'general', '"JOHN STEPHEN G. RAOTRAOT"', 'string', 'Reviewer 2 name on proposals, certificates and reports', false, true),
  ('general.signatory_ydo2_position', 'general', '"Youth Development Officer II"', 'string', 'Reviewer 2 position', false, true),
  ('general.signatory_head_name', 'general', '"COLLEEN GAIL A. DE GUZMAN"', 'string', 'Approving officer name on proposals, certificates and reports', false, true),
  ('general.signatory_head_position', 'general', '"Officer-in-Charge"', 'string', 'Approving officer position', false, true)
ON CONFLICT (setting_key) DO NOTHING;

DROP FUNCTION public.update_admin_budget_request(text, uuid, text, numeric, numeric, date, text, text, timestamp with time zone, timestamp with time zone, text, jsonb);
CREATE OR REPLACE FUNCTION public.update_admin_budget_request(_session_token text, _budget_request_id uuid, _status text DEFAULT NULL::text, _approved_amount numeric DEFAULT NULL::numeric, _released_amount numeric DEFAULT NULL::numeric, _release_date date DEFAULT NULL::date, _remarks text DEFAULT NULL::text, _admin_remarks text DEFAULT NULL::text, _go_signal_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _hard_copy_submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _user_note text DEFAULT NULL::text, _revision_history jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id uuid, organization_id uuid, submitted_by uuid, activity_title text, activity_description text, activity_date date, requested_amount numeric, approved_amount numeric, released_amount numeric, release_date date, purpose_category text, status budget_request_status, remarks text, admin_remarks text, go_signal_at timestamp with time zone, hard_copy_submitted_at timestamp with time zone, user_note text, revision_history jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _now timestamptz := clock_timestamp();
  _mapped_status public.budget_request_status := NULL;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  IF _status IS NOT NULL AND _status <> '' THEN
    IF _status = 'completed' THEN
      RAISE EXCEPTION 'Completed is not a Budget Request status. Use budget_released; liquidation has its own lifecycle.';
    ELSIF _status IN ('approved', 'approved_green', 'approved_for_ftf_green', 'hard_copy_submitted', 'awaiting_release') THEN
      _mapped_status := 'awaiting_release'::public.budget_request_status;
    ELSIF _status IN ('rejected', 'rejected_red') THEN
      _mapped_status := 'rejected_red'::public.budget_request_status;
    ELSIF _status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'budget_released') THEN
      _mapped_status := _status::public.budget_request_status;
    ELSE
      RAISE EXCEPTION 'Invalid Budget Request status: %', _status;
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.budget_requests
  SET
    status = COALESCE(_mapped_status, budget_requests.status),
    approved_amount = COALESCE(_approved_amount, budget_requests.approved_amount),
    released_amount = COALESCE(_released_amount, budget_requests.released_amount),
    release_date = COALESCE(_release_date, budget_requests.release_date),
    remarks = COALESCE(_remarks, budget_requests.remarks),
    admin_remarks = COALESCE(_admin_remarks, budget_requests.admin_remarks),
    go_signal_at = COALESCE(_go_signal_at, budget_requests.go_signal_at),
    hard_copy_submitted_at = COALESCE(_hard_copy_submitted_at, budget_requests.hard_copy_submitted_at),
    user_note = COALESCE(_user_note, budget_requests.user_note),
    revision_history = COALESCE(_revision_history, budget_requests.revision_history),
    revision_requested_at = CASE
      WHEN _mapped_status = 'needs_revision' THEN _now
      ELSE budget_requests.revision_requested_at
    END,
    revision_due_at = CASE
      WHEN _mapped_status = 'needs_revision' THEN _now + interval '5 days'
      ELSE budget_requests.revision_due_at
    END,
    revision_locked = CASE
      WHEN _mapped_status = 'needs_revision' THEN false
      ELSE budget_requests.revision_locked
    END,
    revision_locked_at = CASE
      WHEN _mapped_status = 'needs_revision' THEN NULL
      ELSE budget_requests.revision_locked_at
    END,
    updated_at = _now
  WHERE budget_requests.id = _budget_request_id
  RETURNING
    budget_requests.id,
    budget_requests.organization_id,
    budget_requests.submitted_by,
    budget_requests.activity_title,
    budget_requests.activity_description,
    budget_requests.activity_date,
    budget_requests.requested_amount,
    budget_requests.approved_amount,
    budget_requests.released_amount,
    budget_requests.release_date,
    budget_requests.purpose_category,
    budget_requests.status,
    budget_requests.remarks,
    budget_requests.admin_remarks,
    budget_requests.go_signal_at,
    budget_requests.hard_copy_submitted_at,
    budget_requests.user_note,
    budget_requests.revision_history,
    budget_requests.created_at,
    budget_requests.updated_at;
END;
$function$;


GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(text, uuid, text, numeric, numeric, date, text, text, timestamp with time zone, timestamp with time zone, text, jsonb) TO anon, authenticated;

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
    'activity_description',br.activity_description,'activity_date',br.activity_date,
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
    'activity_description',br.activity_description,'activity_date',br.activity_date,'requested_amount',br.requested_amount,
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


CREATE OR REPLACE FUNCTION public.admin_get_review_resource_page(_session_token text, _resource text, _page integer DEFAULT 0, _page_size integer DEFAULT 20, _search text DEFAULT NULL::text, _status text DEFAULT 'all'::text, _district text DEFAULT 'all'::text, _barangay text DEFAULT 'all'::text, _classification text DEFAULT 'all'::text, _semester text DEFAULT 'all'::text, _sort text DEFAULT 'newest'::text, _start_date date DEFAULT NULL::date, _end_date_exclusive date DEFAULT NULL::date, _quarter integer DEFAULT NULL::integer)
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
  _safe_page bigint := GREATEST(COALESCE(_page, 0), 0)::bigint;
  _safe_page_size integer := LEAST(GREATEST(COALESCE(_page_size, 20), 1), 50);
  _search_term text := NULLIF(btrim(COALESCE(_search, '')), '');
  _rows jsonb := '[]'::jsonb;
  _summary jsonb := '{}'::jsonb;
  _total_count bigint := 0;
BEGIN
  IF _quarter IS NOT NULL AND _quarter NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'Invalid reporting quarter.';
  END IF;
  IF ((_start_date IS NULL) <> (_end_date_exclusive IS NULL)) OR _start_date >= _end_date_exclusive THEN
    RAISE EXCEPTION 'Invalid reporting period.';
  END IF;
  SELECT vat.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
  INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active = true
  JOIN public.roles r ON r.id = aa.role_id
  LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;

  _required_permission := CASE _resource
    WHEN 'budgets' THEN 'budget_requests_review'
    WHEN 'liquidations' THEN 'liquidation_reports_review'
    ELSE NULL
  END;
  IF _required_permission IS NULL THEN RAISE EXCEPTION 'Unsupported Admin review resource.'; END IF;
  IF _role_code <> 'super_admin' AND NOT (_required_permission = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to view this Admin review queue.';
  END IF;

  IF _resource = 'budgets' THEN
    WITH all_budget_codes AS (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at, b.id)::text, 2, '0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b
      WHERE b.status::text <> 'draft'
    ), filtered AS (
      SELECT br.id, br.organization_id, br.activity_title, br.activity_date,
        br.requested_amount, br.approved_amount, br.released_amount, br.release_date, br.status,
        br.revision_due_at, br.revision_locked, br.revision_locked_at,
        br.ypop_entry_id, br.created_at, br.updated_at, bc.public_record_code,
        op.organization_name, op.reference_id, op.urn, op.district, op.barangay, op.major_classification
      FROM public.budget_requests br
      JOIN all_budget_codes bc ON bc.id = br.id
      JOIN public.organization_profiles op ON op.id = br.organization_id
      LEFT JOIN public.ypop_entries ye ON ye.id = br.ypop_entry_id
      WHERE br.status::text <> 'draft'
        AND (_quarter IS NULL OR EXTRACT(QUARTER FROM COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date)) = _quarter)
        AND (_start_date IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date) >= _start_date)
        AND (_end_date_exclusive IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date) < _end_date_exclusive)
        AND (_search_term IS NULL OR br.activity_title ILIKE '%' || _search_term || '%'
          OR op.organization_name ILIKE '%' || _search_term || '%'
          OR br.id::text ILIKE '%' || _search_term || '%' OR bc.public_record_code ILIKE '%' || _search_term || '%')
        AND (_status IS NULL OR _status = 'all'
          OR (_status = 'under_review' AND br.status::text IN ('submitted', 'under_review'))
          OR (_status = 'needs_revision' AND br.status::text = 'needs_revision')
          OR (_status = 'awaiting_release' AND br.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted'))
          OR (_status = 'budget_released' AND br.status::text IN ('budget_released', 'completed')))
        AND (_district IS NULL OR _district = 'all' OR op.district = _district)
        AND (_barangay IS NULL OR _barangay = 'all' OR op.barangay = _barangay)
        AND (_classification IS NULL OR _classification = 'all' OR op.major_classification = _classification)
        AND (_semester IS NULL OR _semester = 'all' OR (
          _semester ~ '^20[0-9]{2}-[12]$' AND (
            (ye.id IS NOT NULL AND (
              ye.semester = _semester OR ye.semester ~ ('^' || split_part(_semester, '-', 1) || '[-_]?' || split_part(_semester, '-', 2) || '$')
              OR lower(ye.semester_label) = lower(split_part(_semester, '-', 1) || ' ' || CASE split_part(_semester, '-', 2) WHEN '1' THEN '1st' ELSE '2nd' END || ' semester')
            )) OR (
              COALESCE(br.activity_date, br.created_at::date) >= make_date(split_part(_semester, '-', 1)::integer, CASE split_part(_semester, '-', 2) WHEN '1' THEN 1 ELSE 7 END, 1)
              AND COALESCE(br.activity_date, br.created_at::date) < make_date(split_part(_semester, '-', 1)::integer, CASE split_part(_semester, '-', 2) WHEN '1' THEN 7 ELSE 1 END, 1) + CASE WHEN split_part(_semester, '-', 2) = '2' THEN interval '1 year' ELSE interval '0' END
            )
          )
        ))
    ), counted AS (SELECT count(*)::bigint AS total_count FROM filtered),
    page_rows AS (
      SELECT * FROM filtered
      ORDER BY CASE WHEN _sort = 'oldest' THEN created_at END ASC,
               CASE WHEN _sort <> 'oldest' THEN created_at END DESC, id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count,
      COALESCE(jsonb_agg(jsonb_build_object(
        'request', jsonb_build_object(
          'id', p.id, 'organization_id', p.organization_id, 'submitted_by', '',
          'activity_title', p.activity_title, 'activity_description', '',
          'activity_date', NULL, 'requested_amount', p.requested_amount,
          'approved_amount', p.approved_amount, 'released_amount', p.released_amount,
          'release_date', p.release_date, 'purpose_category', '', 'fiscal_year', NULL,
          'status', p.status, 'remarks', '', 'admin_remarks', '',
          'go_signal_at', NULL, 'hard_copy_submitted_at', NULL,
          'user_note', '', 'revision_due_at', p.revision_due_at,
          'revision_locked', p.revision_locked, 'revision_locked_at', p.revision_locked_at,
          'revision_history', '[]'::jsonb,
          'public_record_code', p.public_record_code,
          'created_at', p.created_at, 'updated_at', p.updated_at
        ),
        'organization', jsonb_build_object(
          'id', p.organization_id, 'organization_name', p.organization_name,
          'reference_id', p.reference_id, 'urn', p.urn, 'district', p.district,
          'barangay', p.barangay, 'major_classification', p.major_classification
        )
      ) ORDER BY CASE WHEN _sort = 'oldest' THEN p.created_at END ASC,
                 CASE WHEN _sort <> 'oldest' THEN p.created_at END DESC, p.id ASC)
      FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb),
      (SELECT jsonb_build_object(
        'pendingReview', count(*) FILTER (WHERE br.status::text IN ('submitted','under_review')),
        'pendingReviewToday', count(*) FILTER (WHERE br.status::text IN ('submitted','under_review') AND (br.created_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date),
        'approvedTotal', COALESCE(sum(br.approved_amount) FILTER (WHERE br.status::text IN ('awaiting_release','approved_for_ftf_green','hard_copy_submitted','budget_released','completed')), 0),
        'releasedTotal', COALESCE(sum(br.released_amount) FILTER (WHERE br.status::text IN ('budget_released','completed')), 0)
      ) FROM public.budget_requests br
        WHERE br.status::text <> 'draft'
          AND (_quarter IS NULL OR EXTRACT(QUARTER FROM COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date)) = _quarter)
          AND (_start_date IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date) >= _start_date)
          AND (_end_date_exclusive IS NULL OR COALESCE(br.activity_date, (br.created_at AT TIME ZONE 'Asia/Manila')::date) < _end_date_exclusive)
      )
    INTO _total_count, _rows, _summary
    FROM counted LEFT JOIN page_rows p ON true GROUP BY counted.total_count;
  ELSE
    WITH all_liquidation_codes AS (
      SELECT l.id,
        'LR-' || to_char((l.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (l.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY l.created_at, l.id)::text, 2, '0')
            ELSE '' END AS public_record_code
      FROM public.liquidation_reports l
      JOIN public.budget_requests linked_budget ON linked_budget.id = l.budget_request_id
      WHERE linked_budget.status::text IN ('budget_released','completed')
    ), all_budget_codes AS (
      SELECT b.id,
        'BR-' || to_char((b.created_at AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') ||
          CASE WHEN count(*) OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date) > 1
            THEN '-' || lpad(row_number() OVER (PARTITION BY (b.created_at AT TIME ZONE 'Asia/Manila')::date ORDER BY b.created_at, b.id)::text, 2, '0')
            ELSE '' END AS public_record_code
      FROM public.budget_requests b WHERE b.status::text <> 'draft'
    ), filtered AS (
      SELECT lr.id, lr.budget_request_id, lr.organization_id, lr.status,
        lr.deadline_at, lr.revision_due_at, lr.revision_locked, lr.revision_locked_at,
        lr.created_at, lr.updated_at,
        lc.public_record_code, bc.public_record_code AS budget_public_record_code,
        br.activity_title, br.requested_amount, br.approved_amount, br.released_amount,
        br.created_at AS budget_created_at, br.updated_at AS budget_updated_at,
        op.organization_name, op.reference_id, op.urn, op.district, op.barangay, op.major_classification
      FROM public.liquidation_reports lr
      JOIN all_liquidation_codes lc ON lc.id = lr.id
      JOIN public.budget_requests br ON br.id = lr.budget_request_id
      JOIN all_budget_codes bc ON bc.id = br.id
      JOIN public.organization_profiles op ON op.id = lr.organization_id
      WHERE br.status::text IN ('budget_released','completed')
        AND lr.status::text <> 'draft'
        AND (_quarter IS NULL OR EXTRACT(QUARTER FROM (lr.created_at AT TIME ZONE 'Asia/Manila')) = _quarter)
        AND (_start_date IS NULL OR lr.created_at >= (_start_date::timestamp AT TIME ZONE 'Asia/Manila'))
        AND (_end_date_exclusive IS NULL OR lr.created_at < (_end_date_exclusive::timestamp AT TIME ZONE 'Asia/Manila'))
        AND (_search_term IS NULL OR br.activity_title ILIKE '%' || _search_term || '%'
          OR op.organization_name ILIKE '%' || _search_term || '%' OR lr.id::text ILIKE '%' || _search_term || '%'
          OR lc.public_record_code ILIKE '%' || _search_term || '%')
        AND (_status IS NULL OR _status = 'all'
          OR (_status = 'ongoing_activity' AND lr.status::text IN ('pending_activity_completion','not_started','draft','needs_revision','approved_for_ftf_green'))
          OR (_status = 'pending_review' AND lr.status::text IN ('submitted','under_review'))
          OR (_status = 'hardcopy_submitted' AND lr.status::text = 'hard_copy_submitted')
          OR (_status = 'liquidated' AND lr.status::text = 'completed_liquidated')
          OR (_status = 'overdue' AND (lr.status::text = 'overdue' OR (lr.deadline_at < now() AND lr.status::text <> 'completed_liquidated'))))
        AND (_district IS NULL OR _district = 'all' OR op.district = _district)
        AND (_barangay IS NULL OR _barangay = 'all' OR op.barangay = _barangay)
        AND (_classification IS NULL OR _classification = 'all' OR op.major_classification = _classification)
    ), counted AS (SELECT count(*)::bigint AS total_count FROM filtered),
    page_rows AS (
      SELECT * FROM filtered
      ORDER BY CASE WHEN _sort = 'oldest' THEN created_at END ASC,
               CASE WHEN _sort <> 'oldest' THEN created_at END DESC, id ASC
      LIMIT _safe_page_size OFFSET (_safe_page * _safe_page_size)
    )
    SELECT counted.total_count,
      COALESCE(jsonb_agg(jsonb_build_object(
        'report', jsonb_build_object(
          'id', p.id, 'budget_request_id', p.budget_request_id, 'organization_id', p.organization_id,
          'submitted_by', '', 'status', p.status, 'remarks', '',
          'go_signal_at', NULL, 'deadline_at', p.deadline_at,
          'hard_copy_submitted_at', NULL, 'completed_at', NULL,
          'revision_due_at', p.revision_due_at, 'revision_locked', p.revision_locked,
          'revision_locked_at', p.revision_locked_at,
          'public_record_code', p.public_record_code,
          'created_at', p.created_at, 'updated_at', p.updated_at
        ),
        'budget_request', jsonb_build_object(
          'id', p.budget_request_id, 'organization_id', p.organization_id, 'submitted_by', '',
          'activity_title', p.activity_title, 'activity_description', '', 'activity_date', NULL,
          'requested_amount', p.requested_amount, 'approved_amount', p.approved_amount,
          'released_amount', p.released_amount, 'release_date', NULL, 'purpose_category', '',
          'status', 'draft', 'created_at', p.budget_created_at, 'updated_at', p.budget_updated_at,
          'public_record_code', p.budget_public_record_code
        ),
        'organization', jsonb_build_object(
          'id', p.organization_id, 'organization_name', p.organization_name,
          'reference_id', p.reference_id, 'urn', p.urn, 'district', p.district,
          'barangay', p.barangay, 'major_classification', p.major_classification
        )
      ) ORDER BY CASE WHEN _sort = 'oldest' THEN p.created_at END ASC,
                 CASE WHEN _sort <> 'oldest' THEN p.created_at END DESC, p.id ASC)
      FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb),
      jsonb_build_object(
        'pendingReview', (SELECT count(*) FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
          WHERE br.status::text IN ('budget_released','completed') AND lr.status::text IN ('submitted','under_review')),
        'overdue', (SELECT count(*) FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
          WHERE br.status::text IN ('budget_released','completed') AND (lr.status::text = 'overdue' OR (lr.deadline_at < now() AND lr.status::text <> 'completed_liquidated')))
      )
    INTO _total_count, _rows, _summary
    FROM counted LEFT JOIN page_rows p ON true GROUP BY counted.total_count;
  END IF;
  RETURN jsonb_build_object('rows', _rows, 'totalCount', COALESCE(_total_count,0), 'page', _safe_page, 'pageSize', _safe_page_size, 'summary', _summary);
END;
$function$;


CREATE OR REPLACE FUNCTION public.admin_seed_yorp_sample_dataset_core(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _created_count integer := 0;
  _updated_count integer := 0;
  _skipped_count integer := 0;
  _count_2024 integer := 0;
  _count_2025 integer := 0;
  _count_2026 integer := 0;
  _now timestamptz := clock_timestamp();
  _user_id uuid;
  _org_id uuid;
  _acc_id uuid;
  _budget_id uuid;
  _urn text;
  _rec record;
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
    RAISE EXCEPTION 'Seed operation refused: This operation is strictly prohibited in production and requires an explicit test/development environment.';
  END IF;

  IF _batch_name IS NULL OR trim(_batch_name) = '' THEN
    RAISE EXCEPTION 'Invalid seed batch name.';
  END IF;

  -- Create temporary table containing the authoritative 84 sample records
  CREATE TEMP TABLE temp_yorp_seed_dataset (
    record_num int,
    src_year int,
    org_name text,
    brgy text,
    dist text,
    major_class text,
    sub_class text,
    cyp text[],
    email text,
    phone text,
    add_emails text[],
    add_phones text[],
    rep_first text,
    rep_mid text,
    rep_last text,
    rep_full text,
    adv_first text,
    adv_mid text,
    adv_last text,
    adv_full text,
    unit_bldg text,
    street text,
    full_addr text,
    b_year int,
    b_amt numeric,
    b_purpose text,
    b_title text,
    b_status text,
    b_liquidated boolean,
    v_date timestamptz,
    acc_end date
  ) ON COMMIT DROP;

  INSERT INTO temp_yorp_seed_dataset VALUES
    (1, 2024, 'SANTA CRUZ VOLLEYBALL CLUB', 'Sta. Cruz', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'santacruzvolleyballclub.test@pasigyouth.org.ph', '09172400001', ARRAY['santacruzvolleyballclub.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400001']::text[], 'Juan', 'Alcantara', 'Santos', 'Juan Alcantara Santos', 'Patricia', 'Hermosa', 'Flores', 'Patricia Hermosa Flores', 'Unit 101', 'M.H. del Pilar St., Alcalde Jose St.', 'Unit 101, M.H. del Pilar St., Alcalde Jose St., Sta. Cruz, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (2, 2024, 'SIMPLE GROUP', 'Sta. Cruz', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'simplegroup.test@pasigyouth.org.ph', '09172400002', '{}'::text[], '{}'::text[], 'Mark', 'Balagtas', 'Reyes', 'Mark Balagtas Reyes', 'Nicole', 'Ilagan', 'Villanueva', 'Nicole Ilagan Villanueva', 'Unit 102', 'M.H. del Pilar St., Alcalde Jose St.', 'Unit 102, M.H. del Pilar St., Alcalde Jose St., Sta. Cruz, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (3, 2024, 'V-HOOD', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'vhood.test@pasigyouth.org.ph', '09172400003', '{}'::text[], '{}'::text[], 'Joshua', 'Cordero', 'Cruz', 'Joshua Cordero Cruz', 'Clarisse', 'Jacinto', 'Ramos', 'Clarisse Jacinto Ramos', 'Unit 103', 'P. Burgos St., San Jose St.', 'Unit 103, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (4, 2024, 'KABATAANG KALYE ARTISTA', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'kabataangkalyeartista.test@pasigyouth.org.ph', '09172400004', '{}'::text[], '{}'::text[], 'Angelo', 'Dalisay', 'Bautista', 'Angelo Dalisay Bautista', 'Danielle', 'Katigbak', 'Castro', 'Danielle Katigbak Castro', 'Unit 104', 'P. Burgos St., San Jose St.', 'Unit 104, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (5, 2024, 'TEAM YEY', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'teamyey.test@pasigyouth.org.ph', '09172400005', '{}'::text[], '{}'::text[], 'Christian', 'Espiritu', 'Ocampo', 'Christian Espiritu Ocampo', 'Kathryn', 'Lagman', 'Rivera', 'Kathryn Lagman Rivera', 'Unit 105', 'P. Burgos St., San Jose St.', 'Unit 105, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (6, 2024, 'PURE KWATRO', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'purekwatro.test@pasigyouth.org.ph', '09172400006', '{}'::text[], '{}'::text[], 'Daniel', 'Fajardo', 'Garcia', 'Daniel Fajardo Garcia', 'Trisha', 'Magat', 'Aquino', 'Trisha Magat Aquino', 'Unit 106', 'P. Burgos St., San Jose St.', 'Unit 106, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (7, 2024, 'SANTOLAN HIGH SCHOOL SUPREME STUDENT GOVERNMENT', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'santolanhighschoolsupremestu.test@pasigyouth.org.ph', '09172400007', ARRAY['santolanhighschoolsupremestu.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400007']::text[], 'Gabriel', 'Galang', 'Mendoza', 'Gabriel Galang Mendoza', 'Hannah', 'Noble', 'Navarro', 'Hannah Noble Navarro', 'Unit 107', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 107, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (8, 2024, 'SANTOLAN BRASS BAND', 'Santolan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'santolanbrassband.test@pasigyouth.org.ph', '09172400008', '{}'::text[], '{}'::text[], 'John Paul', 'Hermosa', 'Torres', 'John Paul Hermosa Torres', 'Janine', 'Ortega', 'Salazar', 'Janine Ortega Salazar', 'Unit 108', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 108, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (9, 2024, 'OUR LADY OF PERPETUAL HELP SCHOOL, INC. SUPREME STUDENT COUNCIL', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'ourladyofperpetualhelpschool.test@pasigyouth.org.ph', '09172400009', '{}'::text[], '{}'::text[], 'Jian', 'Ilagan', 'Tomas', 'Jian Ilagan Tomas', 'Stephanie', 'Panganiban', 'Mercado', 'Stephanie Panganiban Mercado', 'Unit 109', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 109, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (10, 2024, 'SANTOLAN HIGH SCHOOL RED CROSS YOUTH', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'santolanhighschoolredcrossyo.test@pasigyouth.org.ph', '09172400010', '{}'::text[], '{}'::text[], 'Alden', 'Jacinto', 'Andrada', 'Alden Jacinto Andrada', 'Kirsten', 'Quinto', 'del Rosario', 'Kirsten Quinto del Rosario', 'Unit 110', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 110, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (11, 2024, 'ALLIANCE OF BAGKAT COMMUNITY', 'Bagong Katipunan', 'District I', 'Youth Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'allianceofbagkatcommunity.test@pasigyouth.org.ph', '09172400011', '{}'::text[], '{}'::text[], 'Kenneth', 'Katigbak', 'Castillo', 'Kenneth Katigbak Castillo', 'Andrea', 'Resurreccion', 'de Leon', 'Andrea Resurreccion de Leon', 'Unit 111', 'A. Flores St., Dr. Pilapil St.', 'Unit 111, A. Flores St., Dr. Pilapil St., Bagong Katipunan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (12, 2024, 'MALINAO VOLLEYBALL CLUB', 'Malinao', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'malinaovolleyballclub.test@pasigyouth.org.ph', '09172400012', '{}'::text[], '{}'::text[], 'Rafael', 'Lagman', 'Flores', 'Rafael Lagman Flores', 'Roxanne', 'Samonte', 'Soriano', 'Roxanne Samonte Soriano', 'Unit 112', 'V. Baltazar St., Victorino Cruz St.', 'Unit 112, V. Baltazar St., Victorino Cruz St., Malinao, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (13, 2024, 'DAMAYAN YOUTH ORGANIZATION', 'Maybunga', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'damayanyouthorganization.test@pasigyouth.org.ph', '09172400013', '{}'::text[], '{}'::text[], 'Vincent', 'Magat', 'Villanueva', 'Vincent Magat Villanueva', 'Samantha', 'Tinio', 'Manalo', 'Samantha Tinio Manalo', 'Unit 113', 'C. Raymundo Ave., Stella Maris St.', 'Unit 113, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (14, 2024, 'KABATAAN NG DAMAYAN PH 2', 'Maybunga', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'kabataanngdamayanph2.test@pasigyouth.org.ph', '09172400014', '{}'::text[], '{}'::text[], 'Carlos', 'Noble', 'Ramos', 'Carlos Noble Ramos', 'Bianca', 'Umali', 'Pascual', 'Bianca Umali Pascual', 'Unit 114', 'C. Raymundo Ave., Stella Maris St.', 'Unit 114, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (15, 2024, 'NEW GEN OF SAMAHANG BATANG CONCHA (SBC)', 'Maybunga', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'newgenofsamahangbatangconcha.test@pasigyouth.org.ph', '09172400015', ARRAY['newgenofsamahangbatangconcha.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400015']::text[], 'Matthew', 'Ortega', 'Castro', 'Matthew Ortega Castro', 'Gwen', 'Valenzuela', 'Aguilar', 'Gwen Valenzuela Aguilar', 'Unit 115', 'C. Raymundo Ave., Stella Maris St.', 'Unit 115, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (16, 2024, 'ALLIANCE OF COMPETENT YOUNG MOVERS', 'Pinagbuhatan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'allianceofcompetentyoungmove.test@pasigyouth.org.ph', '09172400016', '{}'::text[], '{}'::text[], 'Jerome', 'Panganiban', 'Rivera', 'Jerome Panganiban Rivera', 'Chloe', 'Yambao', 'Medina', 'Chloe Yambao Medina', 'Unit 116', 'Kenneth Road, M. Eusebio Ave.', 'Unit 116, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (17, 2024, 'KATROPA YOUTH ORGANIZATION', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'katropayouthorganization.test@pasigyouth.org.ph', '09172400017', '{}'::text[], '{}'::text[], 'Francis', 'Quinto', 'Aquino', 'Francis Quinto Aquino', 'Sofia', 'Zamora', 'Guevarra', 'Sofia Zamora Guevarra', 'Unit 117', 'Kenneth Road, M. Eusebio Ave.', 'Unit 117, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (18, 2024, 'PINALAD YOUTH COUNCIL', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pinaladyouthcouncil.test@pasigyouth.org.ph', '09172400018', '{}'::text[], '{}'::text[], 'Elijah', 'Resurreccion', 'Navarro', 'Elijah Resurreccion Navarro', 'Regine', 'Alcantara', 'Valdez', 'Regine Alcantara Valdez', 'Unit 118', 'Kenneth Road, M. Eusebio Ave.', 'Unit 118, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (19, 2024, 'PASIG HABITAT II YOUTH COUNCIL', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pasighabitatiiyouthcouncil.test@pasigyouth.org.ph', '09172400019', '{}'::text[], '{}'::text[], 'Paolo', 'Samonte', 'Salazar', 'Paolo Samonte Salazar', 'Kimberly', 'Balagtas', 'Perez', 'Kimberly Balagtas Perez', 'Unit 119', 'Kenneth Road, M. Eusebio Ave.', 'Unit 119, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (20, 2024, 'SINAG KABATAAN NG PINAGBUHATAN', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'sinagkabataanngpinagbuhatan.test@pasigyouth.org.ph', '09172400020', '{}'::text[], '{}'::text[], 'Lorenzo', 'Tinio', 'Mercado', 'Lorenzo Tinio Mercado', 'Bernadette', 'Cordero', 'Santiago', 'Bernadette Cordero Santiago', 'Unit 120', 'Kenneth Road, M. Eusebio Ave.', 'Unit 120, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (21, 2024, 'PASIG ESPORTS YOUTH ORGANIZATION', 'Kapasigan', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'pasigesportsyouthorganizatio.test@pasigyouth.org.ph', '09172400021', ARRAY['pasigesportsyouthorganizatio.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400021']::text[], 'Nathaniel', 'Umali', 'del Rosario', 'Nathaniel Umali del Rosario', 'Lorraine', 'Dalisay', 'Cortez', 'Lorraine Dalisay Cortez', 'Unit 121', 'A. Mabini St., Plaza Rizal', 'Unit 121, A. Mabini St., Plaza Rizal, Kapasigan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (22, 2024, 'KABATAANG TAMBULI NG PASIG', 'Palatiw', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'kabataangtambulingpasig.test@pasigyouth.org.ph', '09172400022', '{}'::text[], '{}'::text[], 'Dominic', 'Valenzuela', 'de Leon', 'Dominic Valenzuela de Leon', 'Eunice', 'Espiritu', 'Tolentino', 'Eunice Espiritu Tolentino', 'Unit 122', 'Market Ave., M.H. del Pilar St.', 'Unit 122, Market Ave., M.H. del Pilar St., Palatiw, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (23, 2024, 'PASIGLABAN KABATAAN', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pasiglabankabataan.test@pasigyouth.org.ph', '09172400023', '{}'::text[], '{}'::text[], 'Anthony', 'Yambao', 'Soriano', 'Anthony Yambao Soriano', 'Carla', 'Fajardo', 'Morales', 'Carla Fajardo Morales', 'Unit 123', 'Kenneth Road, M. Eusebio Ave.', 'Unit 123, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (24, 2024, 'ROTARACT CLUB OF ORTIGAS CENTER', 'San Antonio', 'District I', 'Youth Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'rotaractclubofortigascenter.test@pasigyouth.org.ph', '09172400024', '{}'::text[], '{}'::text[], 'Miguel', 'Zamora', 'Manalo', 'Miguel Zamora Manalo', 'Shiela', 'Galang', 'Ferrer', 'Shiela Galang Ferrer', 'Unit 124', 'Emerald Ave., San Antonio Ave.', 'Unit 124, Emerald Ave., San Antonio Ave., San Antonio, Pasig City, Metro Manila, 1600', 2024, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (25, 2024, 'PANTHERS VOLLEYBALL CLUB', 'Manggahan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'panthersvolleyballclub.test@pasigyouth.org.ph', '09172400025', '{}'::text[], '{}'::text[], 'Arvin', 'Alcantara', 'Pascual', 'Arvin Alcantara Pascual', 'Maricar', 'Hermosa', 'Domingo', 'Maricar Hermosa Domingo', 'Unit 125', 'Amang Rodriguez Ave., East Bank Road', 'Unit 125, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (26, 2024, 'HILLTOP YOUTH ORGANIZATION', 'Bagong Ilog', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'hilltopyouthorganization.test@pasigyouth.org.ph', '09172400026', '{}'::text[], '{}'::text[], 'Edgar', 'Balagtas', 'Aguilar', 'Edgar Balagtas Aguilar', 'Faith', 'Ilagan', 'Vergara', 'Faith Ilagan Vergara', 'Unit 126', 'Kawilihan Village, C. Santos St.', 'Unit 126, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (27, 2024, 'POSITIBONG PASIGUEÑO', 'Manggahan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'positibongpasigueo.test@pasigyouth.org.ph', '09172400027', '{}'::text[], '{}'::text[], 'Raymart', 'Cordero', 'Medina', 'Raymart Cordero Medina', 'Rochelle', 'Jacinto', 'Mariano', 'Rochelle Jacinto Mariano', 'Unit 127', 'Amang Rodriguez Ave., East Bank Road', 'Unit 127, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (28, 2024, 'PASIG CITY SCIENCE HIGH SCHOOL COORDINATING COUNCIL', 'Maybunga', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'pasigcitysciencehighschoolco.test@pasigyouth.org.ph', '09172400028', ARRAY['pasigcitysciencehighschoolco.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400028']::text[], 'Jayson', 'Dalisay', 'Guevarra', 'Jayson Dalisay Guevarra', 'Maria', 'Katigbak', 'Padilla', 'Maria Katigbak Padilla', 'Unit 128', 'C. Raymundo Ave., Stella Maris St.', 'Unit 128, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (29, 2024, 'PASIG CITY SCIENCE HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Maybunga', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'pasigcitysciencehighschoolsu.test@pasigyouth.org.ph', '09172400029', '{}'::text[], '{}'::text[], 'Leo', 'Espiritu', 'Valdez', 'Leo Espiritu Valdez', 'Angelica', 'Lagman', 'Bernardo', 'Angelica Lagman Bernardo', 'Unit 129', 'C. Raymundo Ave., Stella Maris St.', 'Unit 129, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (30, 2024, 'YOUTH EMPOWERMENT COMMUNITY (YECO)', 'Maybunga', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'youthempowermentcommunity.test@pasigyouth.org.ph', '09172400030', '{}'::text[], '{}'::text[], 'Bryan', 'Fajardo', 'Perez', 'Bryan Fajardo Perez', 'Alyssa', 'Magat', 'Santos', 'Alyssa Magat Santos', 'Unit 130', 'C. Raymundo Ave., Stella Maris St.', 'Unit 130, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (31, 2024, 'ZODIACVILLE YOUTH DEVELOPMENT ORGANIZATION (ZYDO)', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'zodiacvilleyouthdevelopmento.test@pasigyouth.org.ph', '09172400031', '{}'::text[], '{}'::text[], 'Rommel', 'Galang', 'Santiago', 'Rommel Galang Santiago', 'Beatriz', 'Noble', 'Reyes', 'Beatriz Noble Reyes', 'Unit 131', 'Kenneth Road, M. Eusebio Ave.', 'Unit 131, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (32, 2025, 'FAVOR YOUTH PASIG', 'San Antonio', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'favoryouthpasig.test@pasigyouth.org.ph', '09172500032', '{}'::text[], '{}'::text[], 'Dennis', 'Hermosa', 'Cortez', 'Dennis Hermosa Cortez', 'Camille', 'Ortega', 'Cruz', 'Camille Ortega Cruz', 'Unit 132', 'Emerald Ave., San Antonio Ave.', 'Unit 132, Emerald Ave., San Antonio Ave., San Antonio, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (33, 2025, 'YOUTH ON THE ROCK ORGANIZATION INC. PASIG CHAPTER', 'San Nicolas', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'youthontherockorganizationin.test@pasigyouth.org.ph', '09172500033', '{}'::text[], '{}'::text[], 'Juan', 'Ilagan', 'Tolentino', 'Juan Ilagan Tolentino', 'Patricia', 'Panganiban', 'Bautista', 'Patricia Panganiban Bautista', 'Unit 133', 'E. Angeles St., M.H. del Pilar St.', 'Unit 133, E. Angeles St., M.H. del Pilar St., San Nicolas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (34, 2025, 'NAGPAYONG HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Pinagbuhatan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'nagpayonghighschoolsupremese.test@pasigyouth.org.ph', '09172500034', '{}'::text[], '{}'::text[], 'Mark', 'Jacinto', 'Morales', 'Mark Jacinto Morales', 'Nicole', 'Quinto', 'Ocampo', 'Nicole Quinto Ocampo', 'Unit 134', 'Kenneth Road, M. Eusebio Ave.', 'Unit 134, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (35, 2025, 'SUPREME SECONDARY LEARNER GOVERNMENT OF KAPITOLYO HIGH SCHOOL', 'Kapitolyo', 'District I', 'Youth-Serving Organization', 'school-based', ARRAY['education', 'governance']::text[], 'supremesecondarylearnergover.test@pasigyouth.org.ph', '09172500035', ARRAY['supremesecondarylearnergover.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500035']::text[], 'Joshua', 'Katigbak', 'Ferrer', 'Joshua Katigbak Ferrer', 'Clarisse', 'Resurreccion', 'Garcia', 'Clarisse Resurreccion Garcia', 'Unit 135', 'West Capitol Drive, East Capitol Drive', 'Unit 135, West Capitol Drive, East Capitol Drive, Kapitolyo, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (36, 2025, 'BUTING SENIOR HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Buting', 'District I', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'butingseniorhighschoolsuprem.test@pasigyouth.org.ph', '09172500036', '{}'::text[], '{}'::text[], 'Angelo', 'Lagman', 'Domingo', 'Angelo Lagman Domingo', 'Danielle', 'Samonte', 'Mendoza', 'Danielle Samonte Mendoza', 'Unit 136', 'San Guillermo St., M. Almeda St.', 'Unit 136, San Guillermo St., M. Almeda St., Buting, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (37, 2025, 'EUSEBIO HIGH SCHOOL SUPREME SECONDARY LEARNERS GOVERNMENT', 'Rosario', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'eusebiohighschoolsupremeseco.test@pasigyouth.org.ph', '09172500037', '{}'::text[], '{}'::text[], 'Christian', 'Magat', 'Vergara', 'Christian Magat Vergara', 'Kathryn', 'Tinio', 'Torres', 'Kathryn Tinio Torres', 'Unit 137', 'Ortigas Ave. Ext., Bernal St.', 'Unit 137, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (38, 2025, 'UGONG CONVERT FIRE & RESCUE VOLUNTAS BRIGADE INC.', 'Ugong', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'ugongconvertfirerescuevolunt.test@pasigyouth.org.ph', '09172500038', '{}'::text[], '{}'::text[], 'Daniel', 'Noble', 'Mariano', 'Daniel Noble Mariano', 'Trisha', 'Umali', 'Tomas', 'Trisha Umali Tomas', 'Unit 138', 'Lanuza Ave., C-5 Road', 'Unit 138, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (39, 2025, 'SAN LORENZO RUIZ SENIOR HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Manggahan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'sanlorenzoruizseniorhighscho.test@pasigyouth.org.ph', '09172500039', '{}'::text[], '{}'::text[], 'Gabriel', 'Ortega', 'Padilla', 'Gabriel Ortega Padilla', 'Hannah', 'Valenzuela', 'Andrada', 'Hannah Valenzuela Andrada', 'Unit 139', 'Amang Rodriguez Ave., East Bank Road', 'Unit 139, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (40, 2025, 'PINAGBUHATAN EMERGEN-Z RESPONSE TEAM', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'pinagbuhatanemergenzresponse.test@pasigyouth.org.ph', '09172500040', '{}'::text[], '{}'::text[], 'John Paul', 'Panganiban', 'Bernardo', 'John Paul Panganiban Bernardo', 'Janine', 'Yambao', 'Castillo', 'Janine Yambao Castillo', 'Unit 140', 'Kenneth Road, M. Eusebio Ave.', 'Unit 140, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (41, 2025, '1609 ORGANIZATION', 'Rosario', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], '1609organization.test@pasigyouth.org.ph', '09172500041', ARRAY['1609organization.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500041']::text[], 'Jian', 'Quinto', 'Santos', 'Jian Quinto Santos', 'Stephanie', 'Zamora', 'Flores', 'Stephanie Zamora Flores', 'Unit 141', 'Ortigas Ave. Ext., Bernal St.', 'Unit 141, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (42, 2025, 'CFC YOUTH FOR CHRIST - ROSARIO CHAPTER', 'Rosario', 'District II', 'Youth Organization', 'faith-based', ARRAY['social inclusion and equity', 'active citizenship']::text[], 'cfcyouthforchristrosariochap.test@pasigyouth.org.ph', '09172500042', '{}'::text[], '{}'::text[], 'Alden', 'Resurreccion', 'Reyes', 'Alden Resurreccion Reyes', 'Kirsten', 'Alcantara', 'Villanueva', 'Kirsten Alcantara Villanueva', 'Unit 142', 'Ortigas Ave. Ext., Bernal St.', 'Unit 142, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Arts, Culture & Heritage', 'Youth Cultural Heritage Celebration & Arts Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (43, 2025, 'MASSIVE IMPACT', 'Rosario', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'massiveimpact.test@pasigyouth.org.ph', '09172500043', '{}'::text[], '{}'::text[], 'Kenneth', 'Samonte', 'Cruz', 'Kenneth Samonte Cruz', 'Andrea', 'Balagtas', 'Ramos', 'Andrea Balagtas Ramos', 'Unit 143', 'Ortigas Ave. Ext., Bernal St.', 'Unit 143, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (44, 2025, 'EUSEBIO HIGH SCHOOL - SHS SCIENCE CLUB', 'Rosario', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'eusebiohighschoolshssciencec.test@pasigyouth.org.ph', '09172500044', '{}'::text[], '{}'::text[], 'Rafael', 'Tinio', 'Bautista', 'Rafael Tinio Bautista', 'Roxanne', 'Cordero', 'Castro', 'Roxanne Cordero Castro', 'Unit 144', 'Ortigas Ave. Ext., Bernal St.', 'Unit 144, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (45, 2025, 'SAGAD YOUTH VOLUNTEER ALLIANCE (SYVA)', 'Sagad', 'District I', 'Youth Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'sagadyouthvolunteeralliance.test@pasigyouth.org.ph', '09172500045', '{}'::text[], '{}'::text[], 'Vincent', 'Umali', 'Ocampo', 'Vincent Umali Ocampo', 'Samantha', 'Dalisay', 'Rivera', 'Samantha Dalisay Rivera', 'Unit 145', 'Dr. Sixto Antonio Ave., E. Angeles St.', 'Unit 145, Dr. Sixto Antonio Ave., E. Angeles St., Sagad, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (46, 2025, 'ROSARIO - BAYANIHUB', 'Rosario', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'rosariobayanihub.test@pasigyouth.org.ph', '09172500046', '{}'::text[], '{}'::text[], 'Carlos', 'Valenzuela', 'Garcia', 'Carlos Valenzuela Garcia', 'Bianca', 'Espiritu', 'Aquino', 'Bianca Espiritu Aquino', 'Unit 146', 'Ortigas Ave. Ext., Bernal St.', 'Unit 146, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (47, 2025, 'ANONAS DARTERS', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'anonasdarters.test@pasigyouth.org.ph', '09172500047', '{}'::text[], '{}'::text[], 'Matthew', 'Yambao', 'Mendoza', 'Matthew Yambao Mendoza', 'Gwen', 'Fajardo', 'Navarro', 'Gwen Fajardo Navarro', 'Unit 147', 'F. Antonio St., San Agustin St.', 'Unit 147, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (48, 2025, 'ROVER SCOUTS OF THE PHILIPPINES - CIRCLE 34', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'roverscoutsofthephilippinesc.test@pasigyouth.org.ph', '09172500048', '{}'::text[], '{}'::text[], 'Jerome', 'Zamora', 'Torres', 'Jerome Zamora Torres', 'Chloe', 'Galang', 'Salazar', 'Chloe Galang Salazar', 'Unit 148', 'F. Antonio St., San Agustin St.', 'Unit 148, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (49, 2025, 'NEAR APRIL', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'nearapril.test@pasigyouth.org.ph', '09172500049', '{}'::text[], '{}'::text[], 'Francis', 'Alcantara', 'Tomas', 'Francis Alcantara Tomas', 'Sofia', 'Hermosa', 'Mercado', 'Sofia Hermosa Mercado', 'Unit 149', 'F. Antonio St., San Agustin St.', 'Unit 149, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (50, 2025, 'TEAM PHOENIX', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'teamphoenix.test@pasigyouth.org.ph', '09172500050', '{}'::text[], '{}'::text[], 'Elijah', 'Balagtas', 'Andrada', 'Elijah Balagtas Andrada', 'Regine', 'Ilagan', 'del Rosario', 'Regine Ilagan del Rosario', 'Unit 100', 'F. Antonio St., San Agustin St.', 'Unit 100, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (51, 2025, '45 PASIG FIRE & RESCUE VOLUNTEER INC.', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], '45pasigfirerescuevolunteerin.test@pasigyouth.org.ph', '09172500051', ARRAY['45pasigfirerescuevolunteerin.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500051']::text[], 'Paolo', 'Cordero', 'Castillo', 'Paolo Cordero Castillo', 'Kimberly', 'Jacinto', 'de Leon', 'Kimberly Jacinto de Leon', 'Unit 101', 'F. Antonio St., San Agustin St.', 'Unit 101, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (52, 2025, 'MUSLIM YOUTH SOLIDARITY ORGANIZATION', 'Pinagbuhatan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'muslimyouthsolidarityorganiz.test@pasigyouth.org.ph', '09172500052', '{}'::text[], '{}'::text[], 'Lorenzo', 'Dalisay', 'Flores', 'Lorenzo Dalisay Flores', 'Bernadette', 'Katigbak', 'Soriano', 'Bernadette Katigbak Soriano', 'Unit 102', 'Kenneth Road, M. Eusebio Ave.', 'Unit 102, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (53, 2025, 'GALANT ''88 UGONG DRUM AND LYRE CORPS', 'Ugong', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'galant88ugongdrumandlyrecorp.test@pasigyouth.org.ph', '09172500053', '{}'::text[], '{}'::text[], 'Nathaniel', 'Espiritu', 'Villanueva', 'Nathaniel Espiritu Villanueva', 'Lorraine', 'Lagman', 'Manalo', 'Lorraine Lagman Manalo', 'Unit 103', 'Lanuza Ave., C-5 Road', 'Unit 103, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (54, 2025, 'SK UGONG VOLUNTEER GROUP (SKUVG)', 'Ugong', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'skugongvolunteergroup.test@pasigyouth.org.ph', '09172500054', '{}'::text[], '{}'::text[], 'Dominic', 'Fajardo', 'Ramos', 'Dominic Fajardo Ramos', 'Eunice', 'Magat', 'Pascual', 'Eunice Magat Pascual', 'Unit 104', 'Lanuza Ave., C-5 Road', 'Unit 104, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (55, 2025, 'WASH IN SCHOOL (WINS) CLUB', 'Sagad', 'District I', 'Youth Organization', 'community-based', ARRAY['environment', 'active citizenship']::text[], 'washinschoolclub.test@pasigyouth.org.ph', '09172500055', '{}'::text[], '{}'::text[], 'Anthony', 'Galang', 'Castro', 'Anthony Galang Castro', 'Carla', 'Noble', 'Aguilar', 'Carla Noble Aguilar', 'Unit 105', 'Dr. Sixto Antonio Ave., E. Angeles St.', 'Unit 105, Dr. Sixto Antonio Ave., E. Angeles St., Sagad, Pasig City, Metro Manila, 1600', 2025, 50000, 'Environmental Protection & Climate Action', 'Barangay Tree-Planting & Urban Greening Initiative', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (56, 2025, 'MANGGAHAN YOUTH MOVEMENT', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'manggahanyouthmovement.test@pasigyouth.org.ph', '09172500056', '{}'::text[], '{}'::text[], 'Miguel', 'Hermosa', 'Rivera', 'Miguel Hermosa Rivera', 'Shiela', 'Ortega', 'Medina', 'Shiela Ortega Medina', 'Unit 106', 'Amang Rodriguez Ave., East Bank Road', 'Unit 106, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (57, 2025, 'SINTAYAW DANCE TROUPE', 'Dela Paz', 'District II', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'sintayawdancetroupe.test@pasigyouth.org.ph', '09172500057', '{}'::text[], '{}'::text[], 'Arvin', 'Ilagan', 'Aquino', 'Arvin Ilagan Aquino', 'Maricar', 'Panganiban', 'Guevarra', 'Maricar Panganiban Guevarra', 'Unit 107', 'F. Mariano Ave., Marcos Highway', 'Unit 107, F. Mariano Ave., Marcos Highway, Dela Paz, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (58, 2025, 'MINISTRY OF ALTAR SERVERS - NUESTRA SEÑORA DEL ROSARIO', 'Ugong', 'District I', 'Youth Organization', 'faith-based', ARRAY['social inclusion and equity', 'active citizenship']::text[], 'ministryofaltarserversnuestr.test@pasigyouth.org.ph', '09172500058', '{}'::text[], '{}'::text[], 'Edgar', 'Jacinto', 'Navarro', 'Edgar Jacinto Navarro', 'Faith', 'Quinto', 'Valdez', 'Faith Quinto Valdez', 'Unit 108', 'Lanuza Ave., C-5 Road', 'Unit 108, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Arts, Culture & Heritage', 'Youth Cultural Heritage Celebration & Arts Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (59, 2025, 'ANGAT MANGGAHAN', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'angatmanggahan.test@pasigyouth.org.ph', '09172500059', '{}'::text[], '{}'::text[], 'Raymart', 'Katigbak', 'Salazar', 'Raymart Katigbak Salazar', 'Rochelle', 'Resurreccion', 'Perez', 'Rochelle Resurreccion Perez', 'Unit 109', 'Amang Rodriguez Ave., East Bank Road', 'Unit 109, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (60, 2025, 'MANGGAHAN VOLLEYBALL TEAM (MVT)', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'manggahanvolleyballteam.test@pasigyouth.org.ph', '09172500060', ARRAY['manggahanvolleyballteam.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500060']::text[], 'Jayson', 'Lagman', 'Mercado', 'Jayson Lagman Mercado', 'Maria', 'Samonte', 'Santiago', 'Maria Samonte Santiago', 'Unit 110', 'Amang Rodriguez Ave., East Bank Road', 'Unit 110, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (61, 2025, 'BOSS A FIRE AND RESCUE BRIGADE', 'Dela Paz', 'District II', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'bossafireandrescuebrigade.test@pasigyouth.org.ph', '09172500061', '{}'::text[], '{}'::text[], 'Leo', 'Magat', 'del Rosario', 'Leo Magat del Rosario', 'Angelica', 'Tinio', 'Cortez', 'Angelica Tinio Cortez', 'Unit 111', 'F. Mariano Ave., Marcos Highway', 'Unit 111, F. Mariano Ave., Marcos Highway, Dela Paz, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (62, 2025, 'O'' ROYALE SILVERCANE DRUM AND LYRE CORPS', 'Oranbo', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'oroyalesilvercanedrumandlyre.test@pasigyouth.org.ph', '09172500062', '{}'::text[], '{}'::text[], 'Bryan', 'Noble', 'de Leon', 'Bryan Noble de Leon', 'Alyssa', 'Umali', 'Tolentino', 'Alyssa Umali Tolentino', 'Unit 112', 'St. Martin St., Shaw Blvd.', 'Unit 112, St. Martin St., Shaw Blvd., Oranbo, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (63, 2025, 'SANTOLAN YOUTH EMERGENCY RESPONSE AND RESILIENCY TEAM', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'santolanyouthemergencyrespon.test@pasigyouth.org.ph', '09172500063', '{}'::text[], '{}'::text[], 'Rommel', 'Ortega', 'Soriano', 'Rommel Ortega Soriano', 'Beatriz', 'Valenzuela', 'Morales', 'Beatriz Valenzuela Morales', 'Unit 113', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 113, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (64, 2025, 'SANTOLAN GAY ASSOCIATION', 'Santolan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'santolangayassociation.test@pasigyouth.org.ph', '09172500064', '{}'::text[], '{}'::text[], 'Dennis', 'Panganiban', 'Manalo', 'Dennis Panganiban Manalo', 'Camille', 'Yambao', 'Ferrer', 'Camille Yambao Ferrer', 'Unit 114', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 114, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (65, 2025, 'SANTOLAN HIGH SCHOOL PASIG CITY COUNCIL BSP', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'santolanhighschoolpasigcityc.test@pasigyouth.org.ph', '09172500065', '{}'::text[], '{}'::text[], 'Juan', 'Quinto', 'Pascual', 'Juan Quinto Pascual', 'Patricia', 'Zamora', 'Domingo', 'Patricia Zamora Domingo', 'Unit 115', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 115, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (66, 2025, 'THE SANTOLANIAN', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'thesantolanian.test@pasigyouth.org.ph', '09172500066', '{}'::text[], '{}'::text[], 'Mark', 'Resurreccion', 'Aguilar', 'Mark Resurreccion Aguilar', 'Nicole', 'Alcantara', 'Vergara', 'Nicole Alcantara Vergara', 'Unit 116', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 116, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (67, 2025, 'SCIENCE INVESTIGATORY PROJECT - SHS', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'scienceinvestigatoryprojects.test@pasigyouth.org.ph', '09172500067', '{}'::text[], '{}'::text[], 'Joshua', 'Samonte', 'Medina', 'Joshua Samonte Medina', 'Clarisse', 'Balagtas', 'Mariano', 'Clarisse Balagtas Mariano', 'Unit 117', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 117, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (68, 2025, 'ANG SANTOLEÑO', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'angsantoleo.test@pasigyouth.org.ph', '09172500068', '{}'::text[], '{}'::text[], 'Angelo', 'Tinio', 'Guevarra', 'Angelo Tinio Guevarra', 'Danielle', 'Cordero', 'Padilla', 'Danielle Cordero Padilla', 'Unit 118', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 118, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (69, 2025, 'BAGONG ILOG VOLLEYBALL CLUB', 'Bagong Ilog', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'bagongilogvolleyballclub.test@pasigyouth.org.ph', '09172500069', ARRAY['bagongilogvolleyballclub.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500069']::text[], 'Christian', 'Umali', 'Valdez', 'Christian Umali Valdez', 'Kathryn', 'Dalisay', 'Bernardo', 'Kathryn Dalisay Bernardo', 'Unit 119', 'Kawilihan Village, C. Santos St.', 'Unit 119, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (70, 2025, 'YB ORGANIZATION', 'Bagong Ilog', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'yborganization.test@pasigyouth.org.ph', '09172500070', '{}'::text[], '{}'::text[], 'Daniel', 'Valenzuela', 'Perez', 'Daniel Valenzuela Perez', 'Trisha', 'Espiritu', 'Santos', 'Trisha Espiritu Santos', 'Unit 120', 'Kawilihan Village, C. Santos St.', 'Unit 120, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (71, 2025, 'SIKAT KABATAAN MANGGAHAN', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'sikatkabataanmanggahan.test@pasigyouth.org.ph', '09172500071', '{}'::text[], '{}'::text[], 'Gabriel', 'Yambao', 'Santiago', 'Gabriel Yambao Santiago', 'Hannah', 'Fajardo', 'Reyes', 'Hannah Fajardo Reyes', 'Unit 121', 'Amang Rodriguez Ave., East Bank Road', 'Unit 121, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (72, 2025, 'UGONG TEATRO ARAL SA KABATAAN (UTAK)', 'Ugong', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'ugongteatroaralsakabataan.test@pasigyouth.org.ph', '09172500072', '{}'::text[], '{}'::text[], 'John Paul', 'Zamora', 'Cortez', 'John Paul Zamora Cortez', 'Janine', 'Galang', 'Cruz', 'Janine Galang Cruz', 'Unit 122', 'Lanuza Ave., C-5 Road', 'Unit 122, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (73, 2025, 'SAMAHANG DALAGA''T BINATA', 'Sumilang', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'samahangdalagatbinata.test@pasigyouth.org.ph', '09172500073', '{}'::text[], '{}'::text[], 'Jian', 'Alcantara', 'Tolentino', 'Jian Alcantara Tolentino', 'Stephanie', 'Hermosa', 'Bautista', 'Stephanie Hermosa Bautista', 'Unit 123', 'Lopez Jaena St., Dr. Sixto Antonio Ave.', 'Unit 123, Lopez Jaena St., Dr. Sixto Antonio Ave., Sumilang, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (74, 2025, 'MAHARLIKA DANCE ENSEMBLE', 'Sto. Tomas', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'maharlikadanceensemble.test@pasigyouth.org.ph', '09172500074', '{}'::text[], '{}'::text[], 'Alden', 'Balagtas', 'Morales', 'Alden Balagtas Morales', 'Kirsten', 'Ilagan', 'Ocampo', 'Kirsten Ilagan Ocampo', 'Unit 124', 'Caruncho Ave., F. Antonio St.', 'Unit 124, Caruncho Ave., F. Antonio St., Sto. Tomas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (75, 2025, 'MAHARLIKA CULTURE AND ARTS', 'Sto. Tomas', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'maharlikacultureandarts.test@pasigyouth.org.ph', '09172500075', '{}'::text[], '{}'::text[], 'Kenneth', 'Cordero', 'Ferrer', 'Kenneth Cordero Ferrer', 'Andrea', 'Jacinto', 'Garcia', 'Andrea Jacinto Garcia', 'Unit 125', 'Caruncho Ave., F. Antonio St.', 'Unit 125, Caruncho Ave., F. Antonio St., Sto. Tomas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (76, 2025, 'SANTOLAN HIGH SCHOOL BADMINTON TEAM', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['health', 'active citizenship']::text[], 'santolanhighschoolbadmintont.test@pasigyouth.org.ph', '09172500076', '{}'::text[], '{}'::text[], 'Rafael', 'Dalisay', 'Domingo', 'Rafael Dalisay Domingo', 'Roxanne', 'Katigbak', 'Mendoza', 'Roxanne Katigbak Mendoza', 'Unit 126', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 126, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (77, 2025, 'PUROK 7 BASKETBALL - YOUTH SPORTS', 'Sto. Tomas', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'purok7basketballyouthsports.test@pasigyouth.org.ph', '09172500077', '{}'::text[], '{}'::text[], 'Vincent', 'Espiritu', 'Vergara', 'Vincent Espiritu Vergara', 'Samantha', 'Lagman', 'Torres', 'Samantha Lagman Torres', 'Unit 127', 'Caruncho Ave., F. Antonio St.', 'Unit 127, Caruncho Ave., F. Antonio St., Sto. Tomas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (78, 2025, 'YOUTH FOR ENVIRONMENT IN SCHOOLS ORGANIZATIONS', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['environment', 'active citizenship']::text[], 'youthforenvironmentinschools.test@pasigyouth.org.ph', '09172500078', '{}'::text[], '{}'::text[], 'Carlos', 'Fajardo', 'Mariano', 'Carlos Fajardo Mariano', 'Bianca', 'Magat', 'Tomas', 'Bianca Magat Tomas', 'Unit 128', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 128, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Environmental Protection & Climate Action', 'Barangay Tree-Planting & Urban Greening Initiative', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (79, 2026, 'PRIMARY AND SECONDARY ROAD YOUTH ORGANIZATION (PSRYO)', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'primaryandsecondaryroadyouth.test@pasigyouth.org.ph', '09172600079', ARRAY['primaryandsecondaryroadyouth.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182600079']::text[], 'Matthew', 'Galang', 'Padilla', 'Matthew Galang Padilla', 'Gwen', 'Noble', 'Andrada', 'Gwen Noble Andrada', 'Unit 129', 'Kenneth Road, M. Eusebio Ave.', 'Unit 129, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (80, 2026, 'VERACITY PHILIPPINES', 'Pinagbuhatan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'veracityphilippines.test@pasigyouth.org.ph', '09172600080', '{}'::text[], '{}'::text[], 'Jerome', 'Hermosa', 'Bernardo', 'Jerome Hermosa Bernardo', 'Chloe', 'Ortega', 'Castillo', 'Chloe Ortega Castillo', 'Unit 130', 'Kenneth Road, M. Eusebio Ave.', 'Unit 130, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (81, 2026, 'ARBOLEDA''S RECREATIONAL MOVEMENT FOR THE YOUTH ORGANIZATION', 'San Miguel', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'arboledasrecreationalmovemen.test@pasigyouth.org.ph', '09172600081', '{}'::text[], '{}'::text[], 'Francis', 'Ilagan', 'Santos', 'Francis Ilagan Santos', 'Sofia', 'Panganiban', 'Flores', 'Sofia Panganiban Flores', 'Unit 131', 'Dr. Pilapil St., Market Ave.', 'Unit 131, Dr. Pilapil St., Market Ave., San Miguel, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (82, 2026, 'PINAGBUHATAN YOUTH MOVEMENT', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pinagbuhatanyouthmovement.test@pasigyouth.org.ph', '09172600082', '{}'::text[], '{}'::text[], 'Elijah', 'Jacinto', 'Reyes', 'Elijah Jacinto Reyes', 'Regine', 'Quinto', 'Villanueva', 'Regine Quinto Villanueva', 'Unit 132', 'Kenneth Road, M. Eusebio Ave.', 'Unit 132, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (83, 2026, 'ROTARACT CLUB OF PASIG SUNRISE', 'Bagong Ilog', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'rotaractclubofpasigsunrise.test@pasigyouth.org.ph', '09172600083', '{}'::text[], '{}'::text[], 'Paolo', 'Katigbak', 'Cruz', 'Paolo Katigbak Cruz', 'Kimberly', 'Resurreccion', 'Ramos', 'Kimberly Resurreccion Ramos', 'Unit 133', 'Kawilihan Village, C. Santos St.', 'Unit 133, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2026, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'budget_released', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (84, 2026, 'CENTRAL MANGGAHAN FIRE AND RESCUE VOLUNTEER', 'Manggahan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'centralmanggahanfireandrescu.test@pasigyouth.org.ph', '09172600084', ARRAY['centralmanggahanfireandrescu.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182600084']::text[], 'Lorenzo', 'Lagman', 'Bautista', 'Lorenzo Lagman Bautista', 'Bernadette', 'Samonte', 'Castro', 'Bernadette Samonte Castro', 'Unit 134', 'Amang Rodriguez Ave., East Bank Road', 'Unit 134, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'completed', true, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date);

  -- Iterate through temp dataset and seed canonically
  FOR _rec IN SELECT * FROM temp_yorp_seed_dataset ORDER BY record_num ASC LOOP
    -- Track counts by year
    IF _rec.src_year = 2024 THEN _count_2024 := _count_2024 + 1;
    ELSIF _rec.src_year = 2025 THEN _count_2025 := _count_2025 + 1;
    ELSIF _rec.src_year = 2026 THEN _count_2026 := _count_2026 + 1;
    END IF;

    -- Check if already exists in this seed batch
    SELECT id, user_id
    INTO _org_id, _user_id
    FROM public.organization_profiles
    WHERE is_seeded_sample_data IS TRUE
      AND seed_batch = _batch_name
      AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(is_renewal_test_account, false) IS FALSE
      AND seed_source_record_number = _rec.record_num
    LIMIT 1;

    IF _org_id IS NOT NULL THEN
      -- Already seeded, update essential fields idempotently
      UPDATE public.organization_profiles
      SET
        organization_name = _rec.org_name,
        barangay = _rec.brgy,
        district = _rec.dist,
        major_classification = _rec.major_class,
        sub_classification = _rec.sub_class,
        advocacies = _rec.cyp,
        additional_emails = _rec.add_emails,
        additional_contact_numbers = _rec.add_phones,
        representative_first_name = _rec.rep_first,
        representative_middle_name = _rec.rep_mid,
        representative_last_name = _rec.rep_last,
        representative_name = _rec.rep_full,
        adviser_first_name = _rec.adv_first,
        adviser_middle_name = _rec.adv_mid,
        adviser_last_name = _rec.adv_last,
        adviser_name = _rec.adv_full,
        address_unit_building = _rec.unit_bldg,
        address_street = _rec.street,
        address_barangay = _rec.brgy,
        address_city = 'Pasig City',
        address_province = 'Metro Manila',
        address_zip_code = '1600',
        address = _rec.full_addr
      WHERE id = _org_id;

      _updated_count := _updated_count + 1;
    ELSE
      -- Create test auth user
      _user_id := gen_random_uuid();
      _org_id := gen_random_uuid();

      -- 1. Create auth.users record with deterministic test credential
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) VALUES (
        _user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        _rec.email,
        extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        _rec.v_date,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('organization_name', _rec.org_name, 'is_test_account', true, 'seed_batch', _batch_name),
        _rec.v_date,
        _rec.v_date
      );

      -- 2. Create auth.identities
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        _user_id,
        _user_id,
        jsonb_build_object('sub', _user_id::text, 'email', _rec.email),
        'email',
        _user_id::text,
        _rec.v_date,
        _rec.v_date,
        _rec.v_date
      ) ON CONFLICT (provider, provider_id) DO NOTHING;

      -- 3. Create public.user_profiles
      INSERT INTO public.user_profiles (
        user_id, email, display_name, full_name, contact_number
      ) VALUES (
        _user_id,
        _rec.email,
        _rec.org_name,
        _rec.rep_full,
        _rec.phone
      ) ON CONFLICT (user_id) DO UPDATE
      SET email = _rec.email, display_name = _rec.org_name;

      -- 4. Generate Authoritative Deterministic URN
      _urn := public.generate_unique_urn(_rec.brgy, _rec.v_date);

      -- 5. Insert canonical verified organization_profiles record
      INSERT INTO public.organization_profiles (
        id,
        user_id,
        organization_name,
        organization_email,
        contact_number,
        additional_emails,
        additional_contact_numbers,
        district,
        barangay,
        is_existing_organization,
        is_renewal_test_account,
        is_seeded_sample_data,
        seed_batch,
        seed_source_year,
        seed_source_record_number,
        profile_status,
        urn,
        urn_normalized,
        organization_identifier_number,
        urn_review_status,
        registration_type,
        verified_at,
        accreditation_start_date,
        accreditation_expires_at,
        representative_first_name,
        representative_middle_name,
        representative_last_name,
        representative_suffix,
        representative_name,
        adviser_first_name,
        adviser_middle_name,
        adviser_last_name,
        adviser_suffix,
        adviser_name,
        address_unit_building,
        address_street,
        address_barangay,
        address_city,
        address_province,
        address_zip_code,
        address,
        major_classification,
        sub_classification,
        advocacies,
        created_at,
        updated_at
      ) VALUES (
        _org_id,
        _user_id,
        _rec.org_name,
        _rec.email,
        _rec.phone,
        _rec.add_emails,
        _rec.add_phones,
        _rec.dist,
        _rec.brgy,
        false,
        false,
        true,
        _batch_name,
        _rec.src_year,
        _rec.record_num,
        'verified',
        _urn,
        public.normalize_urn(_urn),
        _urn,
        'verified',
        'new_organization',
        _rec.v_date,
        _rec.v_date::date,
        _rec.acc_end,
        _rec.rep_first,
        _rec.rep_mid,
        _rec.rep_last,
        NULL,
        _rec.rep_full,
        _rec.adv_first,
        _rec.adv_mid,
        _rec.adv_last,
        NULL,
        _rec.adv_full,
        _rec.unit_bldg,
        _rec.street,
        _rec.brgy,
        'Pasig City',
        'Metro Manila',
        '1600',
        _rec.full_addr,
        _rec.major_class,
        _rec.sub_class,
        _rec.cyp,
        _rec.v_date,
        _rec.v_date
      );

      -- 6. Insert Term 1 Accreditation record
      _acc_id := gen_random_uuid();
      INSERT INTO public.organization_accreditations (
        id,
        organization_id,
        term_number,
        start_date,
        end_date,
        certificate_urn,
        status,
        approved_by,
        approved_at,
        created_at
      ) VALUES (
        _acc_id,
        _org_id,
        1,
        _rec.v_date::date,
        _rec.acc_end,
        _urn,
        'active',
        _admin_id,
        _rec.v_date,
        _rec.v_date
      );

      -- Link current_accreditation_id
      UPDATE public.organization_profiles
      SET current_accreditation_id = _acc_id
      WHERE id = _org_id;

      -- 7. Insert Budget Request
      _budget_id := gen_random_uuid();
      INSERT INTO public.budget_requests (
        id,
        organization_id,
        submitted_by,
        activity_title,
        activity_description,
        activity_date,
        proposal_form,
        requested_amount,
        approved_amount,
        released_amount,
        release_date,
        purpose_category,
        fiscal_year,
        status,
        is_seeded_sample_data,
        seed_batch,
        admin_remarks,
        user_note,
        created_at,
        updated_at
      ) VALUES (
        _budget_id,
        _org_id,
        _user_id,
        _rec.b_title,
        format('Official %s activity conducted by %s in Barangay %s.', _rec.b_title, _rec.org_name, _rec.brgy),
        _rec.v_date::date + interval '60 days',
        public.yorp_sample_proposal_form(_rec.org_name, _rec.brgy, _rec.b_title, (_rec.v_date::date + interval '60 days')::date, _rec.b_amt),
        _rec.b_amt,
        _rec.b_amt,
        CASE
          WHEN _rec.b_status IN ('budget_released', 'completed') THEN _rec.b_amt
          ELSE 0
        END,
        CASE
          WHEN _rec.b_status IN ('budget_released', 'completed') THEN (_rec.v_date::date + interval '45 days')::timestamptz
          ELSE NULL
        END,
        _rec.b_purpose,
        _rec.b_year,
        _rec.b_status::public.budget_request_status,
        true,
        _batch_name,
        format('Official sample budget request for %s seeded in CY %s.', _rec.org_name, _rec.src_year),
        'Administrative test-seeded budget request.',
        _rec.v_date + interval '30 days',
        _rec.v_date + interval '30 days'
      );

      -- 8. Liquidation Report Handling
      IF _rec.b_liquidated THEN
        INSERT INTO public.liquidation_reports (
          id,
          budget_request_id,
          organization_id,
          submitted_by,
          status,
          remarks,
          go_signal_at,
          deadline_at,
          hard_copy_submitted_at,
          completed_at,
          is_seeded_sample_data,
          seed_batch,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          _budget_id,
          _org_id,
          _user_id,
          'completed_liquidated',
          'Administrative test-seeded verified liquidation report.',
          _rec.v_date + interval '45 days',
          _rec.v_date + interval '90 days',
          _rec.v_date + interval '75 days',
          _rec.v_date + interval '80 days',
          true,
          _batch_name,
          _rec.v_date + interval '75 days',
          _rec.v_date + interval '80 days'
        )
        ON CONFLICT (budget_request_id) DO UPDATE SET
          status = 'completed_liquidated',
          remarks = 'Administrative test-seeded verified liquidation report.',
          go_signal_at = EXCLUDED.go_signal_at,
          deadline_at = EXCLUDED.deadline_at,
          hard_copy_submitted_at = EXCLUDED.hard_copy_submitted_at,
          completed_at = EXCLUDED.completed_at,
          is_seeded_sample_data = true,
          seed_batch = _batch_name,
          updated_at = EXCLUDED.updated_at;
      ELSIF _rec.b_status IN ('budget_released', 'completed') THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, is_seeded_sample_data, seed_batch,
        created_at, updated_at
      ) VALUES (
        _budget_id, _org_id, _user_id, 'overdue',
        'Administrative test-seeded released budget awaiting liquidation.',
        (_rec.v_date::date + interval '45 days')::timestamptz,
        (_rec.v_date::date + interval '45 days' + interval '1 month')::timestamptz,
        true, _batch_name,
        (_rec.v_date::date + interval '45 days')::timestamptz,
        (_rec.v_date::date + interval '45 days')::timestamptz
      ) ON CONFLICT (budget_request_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        submitted_by = EXCLUDED.submitted_by,
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        go_signal_at = EXCLUDED.go_signal_at,
        deadline_at = EXCLUDED.deadline_at,
        hard_copy_submitted_at = NULL,
        completed_at = NULL,
        is_seeded_sample_data = true,
        seed_batch = _batch_name,
        updated_at = EXCLUDED.updated_at;
      ELSE
      DELETE FROM public.liquidation_reports
      WHERE budget_request_id = _budget_id AND organization_id = _org_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
      END IF;

      _created_count := _created_count + 1;
    END IF;
  END LOOP;

  -- 8. Log administrative audit log
  INSERT INTO public.activity_logs (
    actor_user_id,
    action,
    related_type,
    description,
    created_at
  ) VALUES (
    _admin_id,
    'seeded_yorp_sample_dataset',
    'system_batch',
    format('Administrator successfully seeded PCYDO YORP sample dataset: %s created, %s updated (84 total).', _created_count, _updated_count),
    _now
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_name', _batch_name,
    'total_records', 84,
    'created_count', _created_count,
    'updated_count', _updated_count,
    'year_breakdown', jsonb_build_object(
      '2024', _count_2024,
      '2025', _count_2025,
      '2026', _count_2026
    ),
    'timestamp', _now
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.admin_seed_yorp_sample_dataset(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  _admin_id uuid;
  _result jsonb;
  _record record;
  _organization_id uuid;
  _user_id uuid;
  _accreditation_id uuid;
  _budget_id uuid;
  _required integer := 0;
  _organizations integer := 0;
  _registrations integer := 0;
  _documents integer := 0;
  _complete integer := 0;
  _missing integer := 0;
  _duplicates integer := 0;
  _budgets integer := 0;
  _awaiting integer := 0;
  _released integer := 0;
  _liquidated integer := 0;
  _verified_at timestamptz;
  _expected_status public.budget_request_status;
BEGIN
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Seed repair is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Seed operation is available only in an explicitly configured non-production environment.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));

  -- The fixture core and all repairs run in this transaction. Its temporary source
  -- table remains available until the enclosing RPC commits.
  -- Transaction-local: lets the identity guards accept the similarly named fixture organizations.
  PERFORM set_config('app.seeding_sample_dataset', 'true', true);
  _result := public.admin_seed_yorp_sample_dataset_core(_session_token, _batch_name);
  IF to_regclass('pg_temp.temp_yorp_seed_dataset') IS NULL THEN
    RAISE EXCEPTION 'Authoritative SQL fixture rows were not available for post-seed repair.';
  END IF;

  FOR _record IN EXECUTE 'SELECT * FROM pg_temp.temp_yorp_seed_dataset ORDER BY record_num' LOOP
    SELECT op.id, op.user_id, op.verified_at
    INTO _organization_id, _user_id, _verified_at
    FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = _batch_name
      AND op.seed_source_record_number = _record.record_num
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
    FOR UPDATE;

    IF _organization_id IS NULL OR _user_id IS NULL THEN
      RAISE EXCEPTION 'Seeded organization % is missing or is protected; no fixture repair was applied.', _record.record_num;
    END IF;

    INSERT INTO public.user_profiles(user_id, email, display_name, full_name, contact_number)
    SELECT _user_id, op.organization_email, op.organization_name, op.representative_name, op.contact_number
    FROM public.organization_profiles op
    WHERE op.id = _organization_id
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO auth.identities(id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    SELECT _user_id, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', u.email),
      'email', _user_id::text, coalesce(u.created_at, clock_timestamp()), clock_timestamp()
    FROM auth.users u
    WHERE u.id = _user_id
      AND NOT EXISTS (
        SELECT 1 FROM auth.identities i WHERE i.provider = 'email' AND i.provider_id = _user_id::text
      )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- Reconstruct the required term-one accreditation only for this generated row.
    SELECT oa.id INTO _accreditation_id
    FROM public.organization_accreditations oa
    WHERE oa.organization_id = _organization_id AND oa.term_number = 1
    ORDER BY oa.created_at ASC, oa.id ASC LIMIT 1;
    IF _accreditation_id IS NULL THEN
      INSERT INTO public.organization_accreditations (
        organization_id, term_number, start_date, end_date, certificate_urn,
        status, approved_by, approved_at, created_at
      ) VALUES (
        _organization_id, 1, _record.v_date::date, _record.acc_end,
        (SELECT op.urn FROM public.organization_profiles op WHERE op.id = _organization_id),
        'active', _admin_id, _verified_at, _verified_at
      ) RETURNING id INTO _accreditation_id;
    END IF;
    UPDATE public.organization_profiles
    SET current_accreditation_id = _accreditation_id
    WHERE id = _organization_id
      AND is_seeded_sample_data IS TRUE
      AND seed_batch = _batch_name
      AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(is_renewal_test_account, false) IS FALSE;

    _expected_status := CASE
      WHEN _record.b_status = 'completed' THEN 'budget_released'::public.budget_request_status
      ELSE _record.b_status::public.budget_request_status
    END;
    SELECT br.id INTO _budget_id
    FROM public.budget_requests br
    WHERE br.organization_id = _organization_id
      AND br.is_seeded_sample_data IS TRUE
      AND br.seed_batch = _batch_name
    ORDER BY br.created_at ASC, br.id ASC LIMIT 1;

    IF _budget_id IS NULL THEN
      INSERT INTO public.budget_requests (
        organization_id, submitted_by, activity_title, activity_description,
        activity_date, proposal_form, requested_amount, approved_amount, released_amount,
        release_date, purpose_category, fiscal_year, status, is_seeded_sample_data,
        seed_batch, admin_remarks, user_note, created_at, updated_at
      ) VALUES (
        _organization_id, _user_id, _record.b_title,
        format('Official %s activity conducted by %s in Barangay %s.', _record.b_title, _record.org_name, _record.brgy),
        _record.v_date::date + interval '60 days',
        public.yorp_sample_proposal_form(_record.org_name, _record.brgy, _record.b_title, (_record.v_date::date + interval '60 days')::date, _record.b_amt),
        _record.b_amt, _record.b_amt,
        CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN _record.b_amt ELSE 0 END,
        CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN (_record.v_date::date + interval '45 days')::timestamptz ELSE NULL END,
        _record.b_purpose, _record.b_year, _expected_status, true, _batch_name,
        format('Official sample budget request for %s seeded in CY %s.', _record.org_name, _record.src_year),
        'Administrative test-seeded budget request.',
        _record.v_date + interval '30 days', _record.v_date + interval '30 days'
      ) RETURNING id INTO _budget_id;
    ELSE
      UPDATE public.budget_requests
      SET submitted_by = _user_id, activity_title = _record.b_title,
          requested_amount = _record.b_amt, approved_amount = _record.b_amt,
          proposal_form = public.yorp_sample_proposal_form(_record.org_name, _record.brgy, _record.b_title, (_record.v_date::date + interval '60 days')::date, _record.b_amt),
          released_amount = CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN _record.b_amt ELSE 0 END,
          release_date = CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN (_record.v_date::date + interval '45 days')::timestamptz ELSE NULL END,
          purpose_category = public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp), fiscal_year = _record.b_year,
          status = _expected_status, seed_batch = _batch_name,
          is_seeded_sample_data = true, updated_at = clock_timestamp()
      WHERE id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;

    UPDATE public.budget_requests
    SET purpose_category = public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp)
    WHERE id = _budget_id AND organization_id = _organization_id
      AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;

    IF NOT EXISTS (
      SELECT 1 FROM public.organization_profiles op
      WHERE op.id = _organization_id
        AND public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp) = ANY(coalesce(op.advocacies, ARRAY[]::text[]))
    ) THEN
      RAISE EXCEPTION 'Fixture category for source record % does not match its Centers of Youth Participation.', _record.record_num;
    END IF;

    IF _record.b_liquidated IS TRUE THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, hard_copy_submitted_at, completed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _budget_id, _organization_id, _user_id, 'completed_liquidated',
        'Administrative test-seeded verified liquidation report.',
        _record.v_date + interval '45 days', _record.v_date + interval '90 days',
        _record.v_date + interval '75 days', _record.v_date + interval '80 days',
        true, _batch_name, _record.v_date + interval '75 days', _record.v_date + interval '80 days'
      ) ON CONFLICT (budget_request_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        submitted_by = EXCLUDED.submitted_by,
        status = EXCLUDED.status, remarks = EXCLUDED.remarks,
        go_signal_at = EXCLUDED.go_signal_at, deadline_at = EXCLUDED.deadline_at,
        hard_copy_submitted_at = EXCLUDED.hard_copy_submitted_at,
        completed_at = EXCLUDED.completed_at,
        is_seeded_sample_data = true, seed_batch = _batch_name,
        updated_at = EXCLUDED.updated_at;
    ELSIF _record.b_status IN ('budget_released', 'completed') THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, is_seeded_sample_data, seed_batch,
        created_at, updated_at
      ) VALUES (
        _budget_id, _organization_id, _user_id, 'overdue',
        'Administrative test-seeded released budget awaiting liquidation.',
        (_record.v_date::date + interval '45 days')::timestamptz,
        (_record.v_date::date + interval '45 days' + interval '1 month')::timestamptz,
        true, _batch_name,
        (_record.v_date::date + interval '45 days')::timestamptz,
        (_record.v_date::date + interval '45 days')::timestamptz
      ) ON CONFLICT (budget_request_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        submitted_by = EXCLUDED.submitted_by,
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        go_signal_at = EXCLUDED.go_signal_at,
        deadline_at = EXCLUDED.deadline_at,
        hard_copy_submitted_at = NULL,
        completed_at = NULL,
        is_seeded_sample_data = true,
        seed_batch = _batch_name,
        updated_at = EXCLUDED.updated_at;
    ELSE
      DELETE FROM public.liquidation_reports
      WHERE budget_request_id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;

    PERFORM public.repair_yorp_seeded_fixture_relationships(
      _organization_id, _user_id, _admin_id, to_jsonb(_record), _batch_name
    );
  END LOOP;

  SELECT count(*) INTO _organizations FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _required FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(DISTINCT ds.id), count(dsf.id)
  INTO _registrations, _documents
  FROM public.document_submissions ds
  LEFT JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration');

  WITH seeded AS (
    SELECT op.id organization_id
    FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
  ), required AS (
    SELECT id FROM public.required_document_types rdt
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
  ), packets AS (
    SELECT s.organization_id, ds.id submission_id
    FROM seeded s JOIN public.document_submissions ds ON ds.organization_id = s.organization_id
    WHERE ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  ), counts AS (
    SELECT p.organization_id, r.id document_type_id, count(dsf.id) file_count
    FROM packets p CROSS JOIN required r
    LEFT JOIN public.document_submission_files dsf
      ON dsf.submission_id = p.submission_id AND dsf.document_type_id = r.id
    GROUP BY p.organization_id, r.id
  ), per_org AS (
    SELECT organization_id,
      count(*) FILTER (WHERE file_count = 0) missing_count,
      sum(greatest(file_count - 1, 0)) duplicate_count,
      count(*) FILTER (WHERE file_count = 1) complete_count
    FROM counts GROUP BY organization_id
  )
  SELECT count(*) FILTER (WHERE missing_count = 0 AND duplicate_count = 0 AND complete_count = _required),
         coalesce(sum(missing_count), 0), coalesce(sum(duplicate_count), 0)
  INTO _complete, _missing, _duplicates FROM per_org;

  SELECT count(*) FILTER (WHERE br.status = 'awaiting_release'),
         count(*) FILTER (WHERE br.status IN ('budget_released', 'completed')),
         count(*)
  INTO _awaiting, _released, _budgets
  FROM public.budget_requests br JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND br.is_seeded_sample_data IS TRUE AND br.seed_batch = _batch_name
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _liquidated FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND lr.is_seeded_sample_data IS TRUE AND lr.seed_batch = _batch_name
    AND lr.status = 'completed_liquidated'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  IF _organizations <> 84 OR _registrations <> 84 OR _documents <> 84 * _required
     OR _complete <> 84 OR _missing <> 0 OR _duplicates <> 0 OR _budgets <> 84
     OR _awaiting <> 28 OR _released <> 56 OR _liquidated <> 28 THEN
    RAISE EXCEPTION 'YORP fixture validation failed: organizations %, registrations %, documents % (required % each), complete %, missing %, duplicates %, budgets %, awaiting %, released %, liquidated %.',
      _organizations, _registrations, _documents, _required, _complete, _missing,
      _duplicates, _budgets, _awaiting, _released, _liquidated;
  END IF;

  PERFORM public.rebalance_yorp_seed_reporting_quarters();
  PERFORM public.diversify_yorp_seed_projects_and_budgets();
  -- The Renewal Test Organization is part of the sample dataset: (re)create it with its Cycle 1 registration packet.
  PERFORM public.admin_get_or_create_renewal_test_account(_session_token);
  PERFORM public.admin_seed_renewal_test_registration_documents(_session_token);

  RETURN _result || jsonb_build_object(
    'organizations', _organizations,
    'registration_packets', _registrations,
    'document_records', _documents,
    'required_documents_per_organization', _required,
    'organizations_document_complete', _complete,
    'missing_requirements', _missing,
    'duplicate_requirements', _duplicates,
    'budget_requests', _budgets,
    'awaiting_release', _awaiting,
    'released', _released,
    'liquidated', _liquidated,
    'renewal_test_organization_included', true
  );
END;
$function$;


-- Sample amounts stay within the PHP 50,000 cap and keep matching answers.
CREATE OR REPLACE FUNCTION public.diversify_yorp_seed_projects_and_budgets()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _titles text[] := ARRAY[
    'Santa Cruz Youth Volleyball and Wellness League',
    'Simple Group Community Leadership Bootcamp',
    'V-Hood Youth Volunteer Development Forum',
    'Kalye Artista Creative Leadership Academy',
    'Team Yey Youth Project Planning Lab',
    'Pure Kwatro Community Organizing Workshop',
    'Santolan Student Leadership and Study Skills Camp',
    'Santolan Brass Band Peer Mentorship Summit',
    'Perpetual Help Student Council Leadership Retreat',
    'Santolan Red Cross Youth Academic Service Forum',
    'Bagkat Neighborhood Clean Streets Campaign',
    'Malinao Youth Volleyball Skills Festival',
    'Damayan Youth Council Strategic Planning Session',
    'Damayan Phase Two Community Leaders Training',
    'Batang Concha Youth Action Planning Workshop',
    'Young Movers Community Service and Clean-up Day',
    'Katropa Youth Volunteer Coordination Camp',
    'Pinalad Youth Council Capacity Building Forum',
    'Habitat II Youth Leadership and Planning Clinic',
    'Sinag Pinagbuhatan Youth Governance Assembly',
    'Pasig Esports Healthy Gaming and Sports Cup',
    'Tambuli Youth Community Project Design Forum',
    'Pasig laban Youth Organizing and Leadership Camp',
    'Ortigas Rotaract Neighborhood Stewardship Drive',
    'Panthers Youth Volleyball and Fitness Challenge',
    'Hilltop Youth Community Leadership Exchange',
    'Positibong Pasigueño Youth Planning Congress',
    'Science High Student Council Academic Leadership Clinic',
    'Science High Learner Government Peer Leadership Forum',
    'YECO Youth Empowerment and Project Management Camp',
    'Zodiacville Young Leaders Community Planning Day',
    'Favor Youth Volunteer Leadership Academy',
    'Youth on the Rock Community Mobilization Workshop',
    'Nagpayong Student Leaders Learning Support Summit',
    'Kapitolyo High Learner Leadership and Mentoring Camp',
    'Buting Senior High Academic Leadership Forum',
    'Eusebio Learner Government Peer Mentoring Academy',
    'Ugong Community First Aid and Fire Safety Training',
    'San Lorenzo Ruiz Student Leadership Skills Exchange',
    'Pinagbuhatan Youth Emergency Readiness Workshop',
    '1609 Youth Council Governance and Planning Clinic',
    'Rosario Youth Cultural Heritage and Arts Day',
    'Massive Impact Youth Project Development Bootcamp',
    'Eusebio Science Club Student Innovation Leadership Camp',
    'Sagad Youth Neighborhood Care and Clean-up Drive',
    'BayaniHub Rosario Community Organizing Forum',
    'Anonas Youth Darts and Wellness Tournament',
    'Circle 34 Rover Youth Service Leadership Camp',
    'Near April Youth Volunteer Planning Retreat',
    'Team Phoenix Community Leadership Workshop',
    'Pasig 45 Youth Fire Prevention and Rescue Clinic',
    'Muslim Youth Solidarity Community Care Campaign',
    'Galant 88 Youth Mentoring and Leadership Festival',
    'SK Ugong Volunteer Project Coordination Training',
    'WINS School Greening and Tree Care Project',
    'Manggahan Youth Council Development Summit',
    'Sintayaw Youth Arts Leadership and Learning Camp',
    'Rosario Altar Servers Heritage and Creative Arts Workshop',
    'Angat Manggahan Community Leadership Lab',
    'Manggahan Youth Volleyball Development Cup',
    'Boss A Community First Response Training Day',
    'Royale Silvercane Youth Leadership and Mentorship Forum',
    'Santolan Youth Disaster Readiness and First Aid Camp',
    'Santolan Inclusive Youth Governance Dialogue',
    'Santolan Scouts Student Leadership and Service Academy',
    'Santolanian Youth Project Planning and Governance Forum',
    'SHS Young Researchers Academic Leadership Workshop',
    'Ang Santoleño Youth Council Leadership Retreat',
    'Bagong Ilog Youth Volleyball and Active Living Cup',
    'YB Youth Community Action Planning Camp',
    'Sikat Manggahan Youth Volunteer Leadership Exchange',
    'Ugong Teatro Youth Creative Leadership Workshop',
    'Dalaga at Binata Youth Organization Planning Academy',
    'Maharlika Dance Youth Mentorship and Learning Forum',
    'Maharlika Arts Student Leadership and Talent Camp',
    'Santolan Youth Badminton and Fitness Invitational',
    'Purok Seven Youth Basketball Development League',
    'YES-O School Urban Greening and Seedling Project',
    'PSRYO Youth Governance and Community Planning Summit',
    'Veracity Youth Organization Leadership Congress',
    'Arboleda Youth Volunteer and Project Management Workshop',
    'Pinagbuhatan Youth Council Governance Academy',
    'Pasig Sunrise Community Clean-up and Service Day',
    'Central Manggahan Community Rescue and First Aid Bootcamp'
  ];
  _original_guard text;
  _guard text;
  _anchor text;
  _exception text := '(OLD.is_seeded_sample_data IS TRUE AND NEW.is_seeded_sample_data IS TRUE
    AND OLD.seed_batch = ''PCYDO-YORP-2024-2026'' AND NEW.seed_batch = OLD.seed_batch
    AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
    AND EXISTS (SELECT 1 FROM public.organization_profiles op WHERE op.id=NEW.organization_id
      AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=NEW.seed_batch
      AND coalesce(op.is_renewal_test_account,false) IS FALSE))';
  _before jsonb;
  _after jsonb;
  _reports jsonb;
  _count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));
  LOCK TABLE public.budget_requests,public.liquidation_reports IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*),jsonb_agg(jsonb_build_array(br.id,br.organization_id,br.status,br.activity_date,br.fiscal_year,br.created_at,br.release_date) ORDER BY br.id)
  INTO _count,_before FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch
    AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _count<>84 OR cardinality(_titles)<>84 OR (
    SELECT count(DISTINCT op.seed_source_record_number) FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch='PCYDO-YORP-2024-2026'
      AND coalesce(op.is_renewal_test_account,false) IS FALSE AND op.seed_source_record_number BETWEEN 1 AND 84
  )<>84 THEN RAISE EXCEPTION 'Unexpected seed roster; revision stopped'; END IF;
  IF EXISTS (SELECT 1 FROM public.liquidation_reports lr JOIN public.budget_requests br ON br.id=lr.budget_request_id
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND (lr.is_seeded_sample_data IS DISTINCT FROM TRUE OR lr.seed_batch IS DISTINCT FROM br.seed_batch)) THEN
    RAISE EXCEPTION 'Unmarked liquidation linked to fixture; revision stopped';
  END IF;
  SELECT jsonb_agg(to_jsonb(lr)-'updated_at' ORDER BY lr.id) INTO _reports
  FROM public.liquidation_reports lr JOIN public.organization_profiles op ON op.id=lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=lr.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;

  -- Guard changes are transaction-local, restored before return, and restricted
  -- to this validated fixture. Normal financial immutability remains unchanged.
  _original_guard := pg_get_functiondef('public.enforce_budget_request_terminal_status()'::regprocedure);
  _guard := _original_guard;
  FOREACH _anchor IN ARRAY ARRAY['OR NEW.approved_amount IS DISTINCT FROM OLD.approved_amount','OR NEW.released_amount IS DISTINCT FROM OLD.released_amount'] LOOP
    IF strpos(_guard,_anchor)=0 THEN RAISE EXCEPTION 'Unexpected terminal guard definition'; END IF;
    _guard := replace(_guard,_anchor,'OR ('||substr(_anchor,4)||' AND NOT '||_exception||')');
  END LOOP;
  EXECUTE _guard;
  UPDATE public.budget_requests br SET
    activity_title=_titles[op.seed_source_record_number],
    activity_description=format('Youth development project: %s. Organized by %s.',_titles[op.seed_source_record_number],op.organization_name),
    proposal_form=public.yorp_sample_proposal_form(op.organization_name,op.barangay,_titles[op.seed_source_record_number],br.activity_date,20000+(op.seed_source_record_number*37%31)*1000),
    requested_amount=20000+(op.seed_source_record_number*37%31)*1000,
    approved_amount=20000+(op.seed_source_record_number*37%31)*1000-(op.seed_source_record_number%4)*1000,
    released_amount=CASE WHEN br.status::text IN ('budget_released','completed') THEN
      20000+(op.seed_source_record_number*37%31)*1000-(op.seed_source_record_number%4)*1000 ELSE 0 END
  FROM public.organization_profiles op WHERE op.id=br.organization_id
    AND br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  EXECUTE _original_guard;

  -- The existing budget sync trigger touches report deadlines on every budget
  -- update. Retain the previously approved report chronology exactly.
  UPDATE public.liquidation_reports lr SET go_signal_at=s.go_signal_at,deadline_at=s.deadline_at
  FROM jsonb_to_recordset(_reports) AS s(id uuid,go_signal_at timestamptz,deadline_at timestamptz)
  WHERE lr.id=s.id;
  SELECT jsonb_agg(jsonb_build_array(br.id,br.organization_id,br.status,br.activity_date,br.fiscal_year,br.created_at,br.release_date) ORDER BY br.id)
  INTO _after FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=br.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _before IS DISTINCT FROM _after THEN RAISE EXCEPTION 'Fixture identities, statuses or dates changed'; END IF;
  SELECT jsonb_agg(to_jsonb(lr)-'updated_at' ORDER BY lr.id) INTO _after
  FROM public.liquidation_reports lr JOIN public.organization_profiles op ON op.id=lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch='PCYDO-YORP-2024-2026'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch=lr.seed_batch AND coalesce(op.is_renewal_test_account,false) IS FALSE;
  IF _reports IS DISTINCT FROM _after THEN RAISE EXCEPTION 'Linked liquidation data changed'; END IF;
  IF (SELECT count(DISTINCT lower(trim(br.activity_title))) FROM public.budget_requests br JOIN public.organization_profiles op ON op.id=br.organization_id
    WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026' AND coalesce(op.is_renewal_test_account,false) IS FALSE)<>84
    OR EXISTS (SELECT 1 FROM public.budget_requests br WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch='PCYDO-YORP-2024-2026'
      AND (br.released_amount>br.approved_amount OR br.approved_amount>br.requested_amount OR br.approved_amount<=0)) THEN
    RAISE EXCEPTION 'Invalid fixture titles or financial amounts';
  END IF;
END;
$function$;


ALTER TABLE public.budget_requests DROP COLUMN venue;
