-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_renewal_queue_page(_session_token text, _page integer DEFAULT 0, _page_size integer DEFAULT 20, _search text DEFAULT NULL::text, _status text DEFAULT 'all'::text, _district text DEFAULT 'all'::text, _barangay text DEFAULT 'all'::text, _classification text DEFAULT 'all'::text, _required_document_type_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid; _role_code text; _permission_codes text[];
  _safe_page bigint := GREATEST(COALESCE(_page,0),0)::bigint;
  _safe_size integer := LEAST(GREATEST(COALESCE(_page_size,20),1),50);
  _search_term text := NULLIF(btrim(COALESCE(_search,'')), '');
  _rows jsonb; _total bigint;
BEGIN
  SELECT vat.admin_id,r.code,COALESCE(r.permission_codes,ARRAY[]::text[])
  INTO _admin_id,_role_code,_permission_codes
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id=vat.admin_id AND aa.is_active=true
  JOIN public.roles r ON r.id=aa.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin'
     AND NOT ('renewals_manage'=ANY(_permission_codes) OR 'registrations_management'=ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to view renewal applications.';
  END IF;

  WITH queue AS (
    SELECT
      r.id,r.organization_id,r.cycle_number,r.current_accreditation_id,r.certificate_urn,
      r.status,r.submitted_at,r.reviewed_by,r.reviewed_at,r.admin_remarks,
      r.revision_requested_at,r.revision_due_at,r.revision_locked,r.revision_locked_at,
      r.revision_unlocked_at,r.revision_unlocked_by,r.created_at,r.updated_at,
      op.organization_name,op.reference_id,op.urn,op.user_id,op.district,op.barangay,op.major_classification,
      ac.id AS accreditation_id,ac.term_number,ac.start_date,ac.end_date,ac.certificate_urn AS accreditation_urn,
      ac.status AS accreditation_status,ac.is_legacy_inferred,ac.approved_by,ac.approved_at,ac.created_at AS accreditation_created_at,
      packet.submission_id,COALESCE(packet.submitted_count,0)::integer AS submitted_count
    FROM public.organization_renewals r
    JOIN public.organization_profiles op ON op.id=r.organization_id
    LEFT JOIN public.organization_accreditations ac ON ac.id=r.current_accreditation_id
    LEFT JOIN LATERAL (
      SELECT ds.id AS submission_id,
        (SELECT count(DISTINCT f.document_type_id)
         FROM public.document_submission_files f
         WHERE f.submission_id=ds.id AND f.admin_status::text <> 'draft'
           AND f.document_type_id=ANY(COALESCE(_required_document_type_ids,ARRAY[]::uuid[]))) AS submitted_count
      FROM public.document_submissions ds
      WHERE ds.renewal_id=r.id OR (ds.renewal_id IS NULL AND ds.organization_id=r.organization_id AND ds.submission_scope::text='renewal')
      ORDER BY (ds.renewal_id=r.id) DESC, ds.created_at DESC, ds.id
      LIMIT 1
    ) packet ON true
    WHERE (_search_term IS NULL OR op.organization_name ILIKE '%'||_search_term||'%'
      OR COALESCE(op.reference_id,'') ILIKE '%'||_search_term||'%'
      OR COALESCE(op.urn,'') ILIKE '%'||_search_term||'%' OR r.id::text ILIKE '%'||_search_term||'%')
      AND (_status IS NULL OR _status='all'
        OR (_status='approved' AND r.status::text='approved')
        OR (_status='pending_review' AND r.status::text<>'approved'))
      AND (_district IS NULL OR _district='all' OR op.district=_district)
      AND (_barangay IS NULL OR _barangay='all' OR op.barangay=_barangay)
      AND (_classification IS NULL OR _classification='all' OR op.major_classification=_classification)
  ), counted AS (SELECT count(*)::bigint AS total_count FROM queue),
  page_rows AS (
    SELECT * FROM queue
    ORDER BY submitted_at DESC NULLS LAST,created_at DESC,id
    LIMIT _safe_size OFFSET (_safe_page*_safe_size)
  )
  SELECT counted.total_count,
    COALESCE(jsonb_agg(jsonb_build_object(
      'renewal',jsonb_build_object(
        'id',p.id,'organization_id',p.organization_id,'cycle_number',p.cycle_number,
        'current_accreditation_id',p.current_accreditation_id,'certificate_urn',p.certificate_urn,
        'status',p.status,'submitted_at',p.submitted_at,'reviewed_by',p.reviewed_by,'reviewed_at',p.reviewed_at,
        'admin_remarks',p.admin_remarks,'revision_requested_at',p.revision_requested_at,'revision_due_at',p.revision_due_at,
        'revision_locked',p.revision_locked,'revision_locked_at',p.revision_locked_at,
        'revision_unlocked_at',p.revision_unlocked_at,'revision_unlocked_by',p.revision_unlocked_by,
        'created_at',p.created_at,'updated_at',p.updated_at),
      'organization',jsonb_build_object(
        'id',p.organization_id,'reference_id',p.reference_id,'user_id',p.user_id,
        'organization_name',p.organization_name,'urn',p.urn,'district',p.district,
        'barangay',p.barangay,'major_classification',p.major_classification),
      'accreditation',CASE WHEN p.accreditation_id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',p.accreditation_id,'organization_id',p.organization_id,'term_number',p.term_number,
        'start_date',p.start_date,'end_date',p.end_date,'certificate_urn',p.accreditation_urn,
        'status',p.accreditation_status,'is_legacy_inferred',p.is_legacy_inferred,'approved_by',p.approved_by,
        'approved_at',p.approved_at,'created_at',p.accreditation_created_at) END,
      'submitted_document_count',p.submitted_count,'linked_document_submission_id',p.submission_id
    ) ORDER BY p.submitted_at DESC NULLS LAST,p.created_at DESC,p.id)
    FILTER (WHERE p.id IS NOT NULL),'[]'::jsonb)
  INTO _total,_rows FROM counted LEFT JOIN page_rows p ON true GROUP BY counted.total_count;
  RETURN jsonb_build_object('rows',_rows,'totalCount',COALESCE(_total,0),'page',_safe_page,'pageSize',_safe_size,
    'summary',jsonb_build_object('approved',(SELECT count(*) FROM public.organization_renewals WHERE status::text='approved'),
      'pending_review',(SELECT count(*) FROM public.organization_renewals WHERE status::text<>'approved')));
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_renewal_review_context(_session_token text, _renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _renewal public.organization_renewals%ROWTYPE;
  _submission public.document_submissions%ROWTYPE;
  _files jsonb := '[]'::jsonb;
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
  IF _role_code <> 'super_admin'
     AND NOT ('renewals_manage' = ANY(_permission_codes) OR 'registrations_management' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to review renewal applications.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = _renewal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renewal application was not found.';
  END IF;

  -- Match the queue RPC: prefer the canonical renewal_id link, then support
  -- legacy renewal-scoped submissions whose renewal_id was never populated.
  SELECT ds.* INTO _submission
  FROM public.document_submissions ds
  WHERE ds.renewal_id = _renewal.id
     OR (ds.renewal_id IS NULL
         AND ds.organization_id = _renewal.organization_id
         AND ds.submission_scope::text = 'renewal')
  ORDER BY (ds.renewal_id = _renewal.id) DESC, ds.created_at DESC, ds.id
  LIMIT 1;

  IF FOUND THEN
    SELECT COALESCE(jsonb_agg(
      to_jsonb(dsf) || jsonb_build_object(
        'required_document_types', CASE WHEN rdt.id IS NULL THEN NULL
          ELSE jsonb_build_object('id', rdt.id, 'name', rdt.name) END
      ) ORDER BY dsf.created_at DESC, dsf.id ASC
    ), '[]'::jsonb)
    INTO _files
    FROM public.document_submission_files dsf
    LEFT JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
    WHERE dsf.submission_id = _submission.id;
  END IF;

  RETURN jsonb_build_object(
    'renewal', to_jsonb(_renewal),
    'organization', (SELECT to_jsonb(op) FROM public.organization_profiles op WHERE op.id = _renewal.organization_id),
    'accreditation', (SELECT to_jsonb(ac) FROM public.organization_accreditations ac WHERE ac.id = _renewal.current_accreditation_id),
    'submission', CASE WHEN _submission.id IS NULL THEN NULL ELSE to_jsonb(_submission) END,
    'files', _files
  );
END;
$function$;

RESET check_function_bodies;

