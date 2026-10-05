-- Return only the records required by the active Admin Portal section.
-- This replaces client-side hydration through get_admin_portal_snapshot.
ALTER TABLE public.required_document_types
  ADD COLUMN IF NOT EXISTS template_file_size bigint;

COMMENT ON COLUMN public.required_document_types.template_file_size IS
  'Template file size in bytes, copied from Storage object metadata so catalog views do not need to probe files.';

-- One-time backfill for existing templates. This reads Storage metadata from
-- PostgreSQL; it does not download or sign the document objects.
UPDATE public.required_document_types AS rdt
SET template_file_size = (object_row.metadata ->> 'size')::bigint
FROM storage.objects AS object_row
WHERE rdt.template_file_size IS NULL
  AND rdt.template_url LIKE 'storage://template-files/%'
  AND object_row.bucket_id = 'template-files'
  AND object_row.name = regexp_replace(rdt.template_url, '^storage://template-files/', '')
  AND COALESCE(object_row.metadata ->> 'size', '') ~ '^[0-9]+$';

CREATE OR REPLACE FUNCTION public.admin_get_portal_section_state(
  _session_token text,
  _section text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        WHERE EXISTS (
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
        WHERE br.status::text <> 'draft'
      ), '[]'::jsonb),
      'liquidation_reports', COALESCE((
        SELECT jsonb_agg(to_jsonb(lr) ORDER BY lr.created_at DESC)
        FROM public.liquidation_reports lr
        JOIN public.budget_requests br ON br.id = lr.budget_request_id
        WHERE br.status::text <> 'draft'
      ), '[]'::jsonb),
      'liquidation_report_files', COALESCE((
        SELECT jsonb_agg(to_jsonb(lrf) ORDER BY lrf.created_at DESC)
        FROM public.liquidation_report_files lrf
        JOIN public.liquidation_reports lr ON lr.id = lrf.liquidation_report_id
        JOIN public.budget_requests br ON br.id = lr.budget_request_id
        WHERE br.status::text <> 'draft'
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
$$;

CREATE OR REPLACE FUNCTION public.admin_set_template_file_size(
  _session_token text,
  _template_id uuid,
  _file_size bigint
)
RETURNS public.required_document_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
  _updated_template public.required_document_types;
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
  IF _role_code <> 'super_admin' AND NOT ('forms_templates_management' = ANY(_permission_codes)) THEN
    RAISE EXCEPTION 'You do not have permission to update template metadata.';
  END IF;
  IF _file_size IS NULL OR _file_size < 0 THEN
    RAISE EXCEPTION 'Template file size must be zero or greater.';
  END IF;

  UPDATE public.required_document_types
  SET template_file_size = _file_size
  WHERE id = _template_id
  RETURNING * INTO _updated_template;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template document type was not found.';
  END IF;
  RETURN _updated_template;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_portal_section_state(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_portal_section_state(text, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_template_file_size(text, uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_template_file_size(text, uuid, bigint) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
