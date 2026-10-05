-- Return the selected renewal's submission packet through the custom-session
-- authorized admin RPC. Direct table reads use organization-owner RLS and can
-- silently hide renewal rows from the custom Admin session.
CREATE OR REPLACE FUNCTION public.admin_get_renewal_review_context(
  _session_token text,
  _renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.admin_get_renewal_review_context(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_review_context(text, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
