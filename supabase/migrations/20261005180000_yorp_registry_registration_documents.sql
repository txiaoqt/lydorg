-- Read one registry organization's registration packet on demand.
-- Registry readers do not need registration-review permissions or a portal snapshot.
CREATE OR REPLACE FUNCTION public.admin_get_yorp_registration_documents(
  _session_token text,
  _organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permissions text[];
  _submission_id uuid;
  _files jsonb;
BEGIN
  SELECT v.admin_id, r.code, COALESCE(r.permission_codes, ARRAY[]::text[])
  INTO _admin_id, _role_code, _permissions
  FROM public.validate_admin_session_token(_session_token) v
  JOIN public.admin_accounts a ON a.id = v.admin_id AND a.is_active
  JOIN public.roles r ON r.id = a.role_id LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.'; END IF;
  IF _role_code <> 'super_admin' AND NOT ('yorp_registry_view' = ANY(_permissions)) THEN
    RAISE EXCEPTION 'You do not have permission to view the YORP Registry.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_profiles op WHERE op.id = _organization_id
      AND (op.profile_status::text = 'verified' OR op.yorp_registered_year IS NOT NULL)
  ) THEN RAISE EXCEPTION 'Registry organization was not found.'; END IF;

  SELECT ds.id INTO _submission_id
  FROM public.document_submissions ds
  WHERE ds.organization_id = _organization_id
    AND COALESCE(ds.submission_scope::text, 'registration') = 'registration'
    AND ds.renewal_id IS NULL
  ORDER BY ds.updated_at DESC, ds.created_at DESC, ds.id DESC LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    (to_jsonb(dsf) - 'revision_history') || jsonb_build_object(
      'required_document_types', CASE WHEN rdt.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', rdt.id, 'name', rdt.name) END
    ) ORDER BY rdt.sort_order ASC NULLS LAST, rdt.name ASC, dsf.id ASC
  ), '[]'::jsonb) INTO _files
  FROM public.document_submission_files dsf
  LEFT JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
  WHERE dsf.submission_id = _submission_id
    AND COALESCE(dsf.admin_status::text, 'submitted') <> 'draft'
    AND NULLIF(btrim(dsf.file_url), '') IS NOT NULL;

  RETURN jsonb_build_object('submission_id', _submission_id, 'files', _files);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_yorp_registration_documents(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registration_documents(text, uuid) TO anon, authenticated, service_role;
