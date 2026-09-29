-- Migration: 20260929220000_fix_get_admin_portal_snapshot_column_references.sql
-- Description: Fix column reference regressions in get_admin_portal_snapshot:
--              nr.published_at -> nr.date_posted, nr.created_at
--              nc.sort_order -> nc.is_system, nc.name
--              tp.published_at -> tp.post_date, tp.created_at

CREATE OR REPLACE FUNCTION public.get_admin_portal_snapshot(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      ),
      '[]'::jsonb
    ),
    'liquidation_report_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(lrf) ORDER BY lrf.created_at DESC)
        FROM public.liquidation_report_files lrf
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
        SELECT jsonb_agg(to_jsonb(yf) ORDER BY yf.created_at DESC)
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
        SELECT jsonb_agg(to_jsonb(yef) ORDER BY yef.created_at DESC)
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
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_portal_snapshot(text) TO anon, authenticated, service_role;
