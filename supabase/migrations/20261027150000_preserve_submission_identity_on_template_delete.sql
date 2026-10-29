BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Keep a durable, minimal identity for document types after their active
-- Forms & Templates row is permanently deleted. Submitted file rows retain
-- their original document_type_id and are never rewritten by this migration
-- or by the delete RPC.
DO $gate$
BEGIN
  IF to_regclass('public.required_document_types') IS NULL
     OR to_regclass('public.document_submission_files') IS NULL
     OR to_regclass('public.yorp_sample_document_assets') IS NULL THEN
    RAISE EXCEPTION 'Template deletion preservation prerequisites are missing.';
  END IF;

  IF to_regclass('public.document_type_identities') IS NOT NULL THEN
    RAISE EXCEPTION 'document_type_identities already exists; inspect before applying this migration.';
  END IF;

  IF to_regprocedure('public.sync_document_type_identity()') IS NOT NULL
     OR to_regprocedure('public.guard_new_document_submission_template()') IS NOT NULL THEN
    RAISE EXCEPTION 'A template identity helper already exists; inspect before applying this migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = 'public.document_submission_files'::regclass
      AND constraint_row.conname = 'document_submission_files_document_type_id_fkey'
      AND constraint_row.confrelid = 'public.required_document_types'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confdeltype = 'n'
  ) THEN
    RAISE EXCEPTION 'Expected ON DELETE SET NULL submission-file foreign key was not found.';
  END IF;
  IF (
    SELECT count(*)
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = 'public.document_submission_files'::regclass
      AND constraint_row.confrelid = 'public.required_document_types'::regclass
      AND constraint_row.contype = 'f'
  ) <> 1 THEN
    RAISE EXCEPTION 'Unexpected number of submission-file foreign keys to active templates.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = 'public.yorp_sample_document_assets'::regclass
      AND constraint_row.conname = 'yorp_sample_document_assets_document_type_id_fkey'
      AND constraint_row.confrelid = 'public.required_document_types'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confdeltype = 'c'
  ) THEN
    RAISE EXCEPTION 'Expected cascading sample-asset foreign key was not found.';
  END IF;
  IF (
    SELECT count(*)
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = 'public.yorp_sample_document_assets'::regclass
      AND constraint_row.confrelid = 'public.required_document_types'::regclass
      AND constraint_row.contype = 'f'
  ) <> 1 THEN
    RAISE EXCEPTION 'Unexpected number of sample-asset foreign keys to active templates.';
  END IF;
END;
$gate$;

LOCK TABLE public.required_document_types IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE public.document_type_identities (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.document_type_identities (id, name, created_at)
SELECT id, name, created_at
FROM public.required_document_types;

ALTER TABLE public.document_type_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.document_type_identities FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.document_type_identities TO anon, authenticated, service_role;
CREATE POLICY document_type_identities_read
  ON public.document_type_identities
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.required_document_types active_type
      WHERE active_type.id = document_type_identities.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.document_submission_files visible_file
      WHERE visible_file.document_type_id = document_type_identities.id
    )
  );

-- Keep the human-readable identity current while the active template exists.
-- Once the template is deleted, this identity row is intentionally retained.
CREATE OR REPLACE FUNCTION public.sync_document_type_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.document_type_identities (id, name, created_at)
  VALUES (NEW.id, NEW.name, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_document_type_identity() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER sync_document_type_identity
  AFTER INSERT OR UPDATE ON public.required_document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_document_type_identity();

-- Do not let a stale browser create a brand-new submission row for a template
-- that has already been archived or deleted. Existing file rows may still be
-- revised because their document_type_id is unchanged.
CREATE OR REPLACE FUNCTION public.guard_new_document_submission_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.document_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.document_type_id IS NOT DISTINCT FROM OLD.document_type_id THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM public.required_document_types
  WHERE id = NEW.document_type_id
    AND is_active IS TRUE
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This document template is no longer available for new submissions.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_new_document_submission_template() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER guard_new_document_submission_template
  BEFORE INSERT OR UPDATE ON public.document_submission_files
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_new_document_submission_template();

-- Preserve document-type labels in both section and legacy admin snapshots.
-- The narrow source rewrite adds the retained identity as a fallback while
-- leaving the surrounding, reviewed snapshot contracts unchanged.
DO $history_labels$
DECLARE
  _definition text;
  _match_count integer;
  _pattern text := $pattern$'required_document_types',\s*\(\s*SELECT jsonb_build_object\('id', rdt.id, 'name', rdt.name\)\s*FROM public.required_document_types rdt\s*WHERE rdt.id = dsf.document_type_id\s*LIMIT 1\s*\)$pattern$;
  _replacement text := $replacement$'required_document_types', COALESCE(
    (SELECT jsonb_build_object('id', rdt.id, 'name', rdt.name)
     FROM public.required_document_types rdt
     WHERE rdt.id = dsf.document_type_id
     LIMIT 1),
    (SELECT jsonb_build_object('id', identity_row.id, 'name', identity_row.name)
     FROM public.document_type_identities identity_row
     WHERE identity_row.id = dsf.document_type_id
     LIMIT 1)
  )$replacement$;
BEGIN
  SELECT count(*) INTO _match_count
  FROM regexp_matches(
    pg_get_functiondef('public.admin_get_portal_section_state(text,text)'::regprocedure),
    _pattern,
    'g'
  );
  IF _match_count < 1 THEN
    RAISE EXCEPTION 'Unexpected admin section-state document identity query.';
  END IF;
  SELECT pg_get_functiondef('public.admin_get_portal_section_state(text,text)'::regprocedure)
    INTO _definition;
  _definition := regexp_replace(_definition, _pattern, _replacement, 'g');
  EXECUTE _definition;

  SELECT count(*) INTO _match_count
  FROM regexp_matches(
    pg_get_functiondef('public.get_admin_portal_snapshot(text)'::regprocedure),
    _pattern,
    'g'
  );
  IF _match_count < 1 THEN
    RAISE EXCEPTION 'Unexpected legacy admin snapshot document identity query.';
  END IF;
  SELECT pg_get_functiondef('public.get_admin_portal_snapshot(text)'::regprocedure)
    INTO _definition;
  _definition := regexp_replace(_definition, _pattern, _replacement, 'g');
  EXECUTE _definition;

END;
$history_labels$;

-- The identity table now owns the lifecycle of the document-type key. These
-- constraint changes do not update any existing child rows.
ALTER TABLE public.document_submission_files
  DROP CONSTRAINT document_submission_files_document_type_id_fkey;
ALTER TABLE public.document_submission_files
  ADD CONSTRAINT document_submission_files_document_type_id_fkey
  FOREIGN KEY (document_type_id)
  REFERENCES public.document_type_identities(id)
  ON DELETE RESTRICT;

ALTER TABLE public.yorp_sample_document_assets
  DROP CONSTRAINT yorp_sample_document_assets_document_type_id_fkey;
ALTER TABLE public.yorp_sample_document_assets
  ADD CONSTRAINT yorp_sample_document_assets_document_type_id_fkey
  FOREIGN KEY (document_type_id)
  REFERENCES public.document_type_identities(id)
  ON DELETE RESTRICT;

-- The renewal review packet is a separate custom-session RPC. Preserve its
-- existing authorization and response fields while resolving deleted template
-- labels from the stable identity table.
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
        'required_document_types', CASE
          WHEN COALESCE(rdt.id, identity_row.id) IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', COALESCE(rdt.id, identity_row.id),
            'name', COALESCE(rdt.name, identity_row.name)
          )
        END
      ) ORDER BY dsf.created_at DESC, dsf.id ASC
    ), '[]'::jsonb)
    INTO _files
    FROM public.document_submission_files dsf
    LEFT JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
    LEFT JOIN public.document_type_identities identity_row ON identity_row.id = dsf.document_type_id
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

-- Deleting a template removes only the active catalog row. Historical file
-- rows, object references, review state, remarks, and revision history remain
-- untouched and continue to reference document_type_identities.
CREATE OR REPLACE FUNCTION public.hard_delete_admin_template_document(
  _session_token text,
  _template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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

  PERFORM 1
  FROM public.required_document_types
  WHERE id = _template_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The template no longer exists.';
  END IF;

  DELETE FROM public.required_document_types
  WHERE id = _template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The template could not be deleted.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.hard_delete_admin_template_document(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text, uuid)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
