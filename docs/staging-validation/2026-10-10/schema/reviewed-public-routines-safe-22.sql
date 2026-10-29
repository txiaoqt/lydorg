-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_admin_portal_snapshot(_session_token text)
 RETURNS jsonb
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
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN jsonb_build_object(
    'organization_profiles',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
      ),
      '[]'::jsonb
    ),
    'organization_contacts',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(oc) ORDER BY oc.organization_id, oc.contact_type, oc.display_order)
        FROM public.organization_contacts oc
      ),
      '[]'::jsonb
    ),
    'document_submissions',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(ds) ORDER BY ds.created_at DESC)
        FROM public.document_submissions ds
      ),
      '[]'::jsonb
    ),
    'document_submission_files',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dsf.id,
            'submission_id', dsf.submission_id,
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
            'document_type_id', dsf.document_type_id,
            'required_document_types', (
              SELECT jsonb_build_object('id', rdt.id, 'name', rdt.name)
              FROM public.required_document_types rdt
              WHERE rdt.id = dsf.document_type_id
              LIMIT 1
            )
          )
          ORDER BY dsf.created_at DESC
        )
        FROM public.document_submission_files dsf
      ),
      '[]'::jsonb
    ),
    'budget_requests',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(br) ORDER BY br.created_at DESC)
        FROM public.budget_requests br
        WHERE br.status <> 'draft'
      ),
      '[]'::jsonb
    ),
    'budget_request_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(brf) ORDER BY brf.created_at DESC)
        FROM public.budget_request_files brf
      ),
      '[]'::jsonb
    ),
    'liquidation_reports',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(lr) ORDER BY lr.created_at DESC)
        FROM public.liquidation_reports lr
        WHERE lr.status::text <> 'draft'
      ),
      '[]'::jsonb
    ),
    'liquidation_report_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(lrf) ORDER BY lrf.created_at DESC)
        FROM public.liquidation_report_files lrf
        WHERE EXISTS (SELECT 1 FROM public.liquidation_reports lr WHERE lr.id=lrf.liquidation_report_id AND lr.status::text NOT IN ('draft','not_started','pending_activity_completion'))
      ),
      '[]'::jsonb
    ),
    'news_releases',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(nr) ORDER BY nr.date_posted DESC, nr.created_at DESC)
        FROM public.news_releases nr
      ),
      '[]'::jsonb
    ),
    'news_categories',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(nc) ORDER BY nc.is_system DESC, nc.name ASC)
        FROM public.news_categories nc
      ),
      '[]'::jsonb
    ),
    'transparency_posts',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(tp) ORDER BY tp.post_date DESC, tp.created_at DESC)
        FROM public.transparency_posts tp
      ),
      '[]'::jsonb
    ),
    'compliance_remarks',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(cr) ORDER BY cr.created_at DESC)
        FROM public.compliance_remarks cr
      ),
      '[]'::jsonb
    ),
    'notifications',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC)
        FROM public.notifications n
      ),
      '[]'::jsonb
    ),
    'activity_logs',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(al) ORDER BY al.created_at DESC)
        FROM public.activity_logs al
      ),
      '[]'::jsonb
    ),
    'templates',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(rdt) ORDER BY rdt.sort_order ASC)
        FROM public.required_document_types rdt
      ),
      '[]'::jsonb
    ),
    'ypop_periods',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yp) ORDER BY yp.created_at DESC)
        FROM public.ypop_periods yp
      ),
      '[]'::jsonb
    ),
    'ypop_city_activities',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yca) ORDER BY yca.created_at DESC)
        FROM public.ypop_city_activities yca
      ),
      '[]'::jsonb
    ),
    'ypop_entries',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(ye) ORDER BY ye.created_at DESC)
        FROM public.ypop_entries ye
      ),
      '[]'::jsonb
    ),
    'ypop_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yf) ORDER BY yf.uploaded_at DESC)
        FROM public.ypop_files yf
      ),
      '[]'::jsonb
    ),
    'ypop_event_participations',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yep) ORDER BY yep.created_at DESC)
        FROM public.ypop_event_participations yep
      ),
      '[]'::jsonb
    ),
    'ypop_event_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yef) ORDER BY yef.uploaded_at DESC)
        FROM public.ypop_event_files yef
      ),
      '[]'::jsonb
    ),
    'ypop_org_activities',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yoa) ORDER BY yoa.created_at DESC)
        FROM public.ypop_org_activities yoa
      ),
      '[]'::jsonb
    ),
    'ypop_org_activity_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yoaf) ORDER BY yoaf.created_at DESC)
        FROM public.ypop_org_activity_files yoaf
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC)
        FROM public.inquiries i
      ),
      '[]'::jsonb
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_budget_purpose_categories()
 RETURNS SETOF budget_purpose_categories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.budget_purpose_categories
  WHERE is_active = true
  ORDER BY sort_order ASC, name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_organization_portal_dashboard_summary(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.organization_profiles AS profile
    WHERE profile.id = p_organization_id
      AND profile.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Organization dashboard is not authorized.' USING ERRCODE = '42501';
  END IF;

  WITH budget_stats AS (
    SELECT
      count(*) AS total_count,
      count(*) FILTER (WHERE request.status::text = 'budget_released') AS released_count,
      count(*) FILTER (WHERE request.status::text IN ('submitted', 'under_review')) AS under_review_count,
      count(*) FILTER (WHERE request.status::text = 'needs_revision') AS revision_count,
      count(*) FILTER (WHERE request.status::text = 'draft') AS draft_count,
      count(*) FILTER (WHERE request.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted')) AS awaiting_release_count,
      COALESCE(SUM(
        CASE WHEN request.status::text = 'budget_released'
          THEN COALESCE(NULLIF(request.released_amount, 0), NULLIF(request.approved_amount, 0), request.requested_amount, 0)
          ELSE 0
        END
      ), 0) AS released_amount
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
  ),
  eligible_liquidations AS (
    SELECT report.*, budget.activity_title
    FROM public.liquidation_reports AS report
    JOIN public.budget_requests AS budget
      ON budget.id = report.budget_request_id
     AND budget.organization_id = p_organization_id
     AND budget.status::text = 'budget_released'
    WHERE report.organization_id = p_organization_id
  ),
  liquidation_stats AS (
    SELECT
      count(*) AS total_count,
      count(*) FILTER (WHERE report.status::text IN ('completed_liquidated', 'approved')) AS completed_count,
      count(*) FILTER (WHERE report.status::text IN ('submitted', 'under_review', 'hard_copy_submitted', 'approved_for_ftf_green')) AS under_review_count,
      count(*) FILTER (WHERE report.status::text IN ('needs_revision', 'rejected_red')) AS revision_count,
      count(*) FILTER (
        WHERE report.status::text = 'overdue'
          OR (report.status::text IN ('not_started', 'draft', 'needs_revision', 'rejected_red') AND report.deadline_at < now())
      ) AS overdue_count,
      count(*) FILTER (WHERE report.status::text IN ('not_started', 'draft', 'pending_activity_completion')) AS pending_upload_count,
      (
        count(*) FILTER (WHERE report.status::text IN ('not_started', 'draft', 'needs_revision', 'overdue'))
        + (
          SELECT count(*)
          FROM public.budget_requests AS budget
          WHERE budget.organization_id = p_organization_id
            AND budget.status::text = 'budget_released'
            AND NOT EXISTS (
              SELECT 1
              FROM public.liquidation_reports AS missing_report
              WHERE missing_report.budget_request_id = budget.id
                AND missing_report.organization_id = p_organization_id
            )
        )
      ) AS pending_action_count,
      min(report.deadline_at) FILTER (
        WHERE report.status::text IN ('not_started', 'draft', 'needs_revision', 'rejected_red', 'overdue')
          AND report.deadline_at >= now()
      ) AS next_deadline
    FROM eligible_liquidations AS report
  ),
  latest_budget AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
    ORDER BY request.created_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_budget_revision AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
      AND request.status::text = 'needs_revision'
    ORDER BY request.updated_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_awaiting_release_budget AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
      AND request.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted')
    ORDER BY request.updated_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_pending_budget AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
      AND request.status::text IN ('submitted', 'draft')
    ORDER BY request.updated_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_attention_liquidation AS (
    SELECT jsonb_build_object(
      'id', report.id,
      'budget_request_id', report.budget_request_id,
      'activity_title', report.activity_title,
      'status', report.status::text,
      'remarks', report.remarks,
      'deadline_at', report.deadline_at,
      'created_at', report.created_at
    ) AS record
    FROM eligible_liquidations AS report
    WHERE report.status::text IN ('needs_revision', 'rejected_red', 'overdue', 'not_started', 'draft')
    ORDER BY
      CASE WHEN report.status::text IN ('needs_revision', 'rejected_red', 'overdue') THEN 0 ELSE 1 END,
      report.created_at DESC,
      report.id DESC
    LIMIT 1
  ),
  latest_unsubmitted_liquidation AS (
    SELECT jsonb_build_object(
      'budget_request_id', budget.id,
      'activity_title', budget.activity_title,
      'status', 'not_started'
    ) AS record
    FROM public.budget_requests AS budget
    WHERE budget.organization_id = p_organization_id
      AND budget.status::text = 'budget_released'
      AND NOT EXISTS (
        SELECT 1 FROM public.liquidation_reports AS report
        WHERE report.budget_request_id = budget.id
          AND report.organization_id = p_organization_id
      )
    ORDER BY budget.updated_at DESC, budget.id DESC
    LIMIT 1
  ),
  latest_under_review_liquidation AS (
    SELECT jsonb_build_object(
      'id', report.id,
      'budget_request_id', report.budget_request_id,
      'activity_title', report.activity_title,
      'status', report.status::text,
      'remarks', report.remarks,
      'deadline_at', report.deadline_at,
      'created_at', report.created_at
    ) AS record
    FROM eligible_liquidations AS report
    WHERE report.status::text IN ('submitted', 'under_review', 'hard_copy_submitted', 'approved_for_ftf_green')
    ORDER BY report.created_at DESC, report.id DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'budgets', jsonb_build_object(
      'total_count', budget_stats.total_count,
      'released_count', budget_stats.released_count,
      'under_review_count', budget_stats.under_review_count,
      'revision_count', budget_stats.revision_count,
      'draft_count', budget_stats.draft_count,
      'awaiting_release_count', budget_stats.awaiting_release_count,
      'released_amount', budget_stats.released_amount,
      'status_counts', COALESCE((
        SELECT jsonb_object_agg(status_counts.status, status_counts.count)
        FROM (
          SELECT request.status::text AS status, count(*) AS count
          FROM public.budget_requests AS request
          WHERE request.organization_id = p_organization_id
          GROUP BY request.status::text
        ) AS status_counts
      ), '{}'::jsonb)
    ),
    'liquidations', jsonb_build_object(
      'total_count', liquidation_stats.total_count,
      'completed_count', liquidation_stats.completed_count,
      'under_review_count', liquidation_stats.under_review_count,
      'revision_count', liquidation_stats.revision_count,
      'overdue_count', liquidation_stats.overdue_count,
      'pending_upload_count', liquidation_stats.pending_upload_count,
      'pending_action_count', liquidation_stats.pending_action_count,
      'next_deadline', liquidation_stats.next_deadline,
      'status_counts', COALESCE((
        SELECT jsonb_object_agg(status_counts.status, status_counts.count)
        FROM (
          SELECT report.status::text AS status, count(*) AS count
          FROM eligible_liquidations AS report
          GROUP BY report.status::text
        ) AS status_counts
      ), '{}'::jsonb)
    ),
    'latest_budget', (SELECT record FROM latest_budget),
    'latest_budget_revision', (SELECT record FROM latest_budget_revision),
    'latest_awaiting_release_budget', (SELECT record FROM latest_awaiting_release_budget),
    'latest_pending_budget', (SELECT record FROM latest_pending_budget),
    'latest_attention_liquidation', (SELECT record FROM latest_attention_liquidation),
    'latest_unsubmitted_liquidation', (SELECT record FROM latest_unsubmitted_liquidation),
    'latest_under_review_liquidation', (SELECT record FROM latest_under_review_liquidation)
  )
  INTO v_result
  FROM budget_stats
  CROSS JOIN liquidation_stats;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pasig_barangay_ordinal(_barangay text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  _clean text;
begin
  if _barangay is null or trim(_barangay) = '' then
    raise exception 'Barangay is required to resolve official PCYDO URN ordinal.';
  end if;

  -- Normalize whitespace and lower case
  _clean := lower(trim(_barangay));

  -- Strip prefixes: "barangay", "brgy.", "brgy"
  _clean := trim(regexp_replace(_clean, '^(barangay|brgy\.?)\s+', '', 'i'));

  -- Normalize "santa" / "santo" abbreviations
  _clean := regexp_replace(_clean, '^santa\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^sta\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^santo\s+', 'sto. ', 'i');
  _clean := regexp_replace(_clean, '^sto\s+', 'sto. ', 'i');

  -- Match against the 30 canonical Pasig City barangays (alphabetical order 01-30)
  case _clean
    when 'bagong ilog'       then return '01';
    when 'bagong katipunan'  then return '02';
    when 'bambang'           then return '03';
    when 'buting'            then return '04';
    when 'caniogan'          then return '05';
    when 'dela paz'          then return '06';
    when 'kalawaan'          then return '07';
    when 'kapasigan'         then return '08';
    when 'kapitolyo'         then return '09';
    when 'malinao'           then return '10';
    when 'manggahan'         then return '11';
    when 'maybunga'          then return '12';
    when 'oranbo'            then return '13';
    when 'palatiw'           then return '14';
    when 'pinagbuhatan'      then return '15';
    when 'pineda'            then return '16';
    when 'rosario'           then return '17';
    when 'sagad'             then return '18';
    when 'san antonio'       then return '19';
    when 'san joaquin'       then return '20';
    when 'san jose'          then return '21';
    when 'san miguel'        then return '22';
    when 'san nicolas'       then return '23';
    when 'sta. cruz'         then return '24';
    when 'sta. lucia'        then return '25';
    when 'sta. rosa'         then return '26';
    when 'santolan'          then return '27';
    when 'sto. tomas'        then return '28';
    when 'sumilang'          then return '29';
    when 'ugong'             then return '30';
    else
      raise exception 'Invalid Pasig City barangay "%": must be one of the 30 canonical Pasig barangays.', _barangay;
  end case;
end;
$function$;

RESET check_function_bodies;

