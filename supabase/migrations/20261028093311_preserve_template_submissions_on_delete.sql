BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Keep a stable document-type identity separate from the active Forms &
-- Templates row. Historical submission rows keep their original document_type_id
-- and are not updated when an administrator removes the active template.
DO $prerequisites$
DECLARE
  _identity_exists boolean := to_regclass('public.document_type_identities') IS NOT NULL;
BEGIN
  IF to_regclass('public.required_document_types') IS NULL
     OR to_regclass('public.document_submission_files') IS NULL
     OR to_regclass('public.yorp_sample_document_assets') IS NULL THEN
    RAISE EXCEPTION 'Template deletion prerequisites are missing.';
  END IF;

  IF to_regprocedure('public.authorize_admin_template_category_registry(text,boolean)') IS NULL
     OR to_regprocedure('public.hard_delete_admin_template_document(text,uuid)') IS NULL
     OR to_regprocedure('public.guard_renewal_test_registration_packet_immutable()') IS NULL THEN
    RAISE EXCEPTION 'Expected template authorization, delete, or Cycle 1 protection function is missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger trigger_row
    JOIN pg_proc function_row ON function_row.oid = trigger_row.tgfoid
    WHERE trigger_row.tgrelid = 'public.document_submission_files'::regclass
      AND trigger_row.tgname = 'trg_immutable_renewal_test_registration_file'
      AND NOT trigger_row.tgisinternal
      AND trigger_row.tgtype = 31
      AND function_row.oid = 'public.guard_renewal_test_registration_packet_immutable()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Expected Cycle 1 file immutability trigger is missing or changed.';
  END IF;

  IF _identity_exists THEN
    IF to_regprocedure('public.sync_document_type_identity()') IS NULL
       OR to_regprocedure('public.guard_new_document_submission_template()') IS NULL THEN
      RAISE EXCEPTION 'Existing document identity support is incomplete; inspect before applying this migration.';
    END IF;
    IF (
      SELECT count(*)
      FROM pg_attribute
      WHERE attrelid = 'public.document_type_identities'::regclass
        AND attnum > 0
        AND NOT attisdropped
    ) <> 3
       OR NOT EXISTS (
         SELECT 1 FROM pg_attribute
         WHERE attrelid = 'public.document_type_identities'::regclass
           AND attname = 'id' AND atttypid = 'uuid'::regtype AND attnotnull
       )
       OR NOT EXISTS (
         SELECT 1 FROM pg_attribute
         WHERE attrelid = 'public.document_type_identities'::regclass
           AND attname = 'name' AND atttypid = 'text'::regtype AND attnotnull
       )
       OR NOT EXISTS (
         SELECT 1 FROM pg_attribute
         WHERE attrelid = 'public.document_type_identities'::regclass
           AND attname = 'created_at' AND atttypid = 'timestamptz'::regtype AND attnotnull
       )
       OR NOT EXISTS (
         SELECT 1 FROM pg_constraint constraint_row
         WHERE constraint_row.conrelid = 'public.document_type_identities'::regclass
           AND constraint_row.contype = 'p'
           AND constraint_row.conkey = ARRAY[(
             SELECT attribute_row.attnum
             FROM pg_attribute attribute_row
             WHERE attribute_row.attrelid = 'public.document_type_identities'::regclass
               AND attribute_row.attname = 'id'
           )]::smallint[]
       ) THEN
      RAISE EXCEPTION 'Existing document identity table does not match the reviewed schema.';
    END IF;
    IF NOT (
      SELECT relrowsecurity FROM pg_class
      WHERE oid = 'public.document_type_identities'::regclass
    ) THEN
      RAISE EXCEPTION 'Existing document identity table is missing row-level security.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_policy policy_row
      WHERE policy_row.polrelid = 'public.document_type_identities'::regclass
        AND (policy_row.polcmd = '*' OR (policy_row.polcmd = 'r' AND policy_row.polname <> 'document_type_identities_read'))
    ) OR EXISTS (
      SELECT 1 FROM pg_policy policy_row
      WHERE policy_row.polrelid = 'public.document_type_identities'::regclass
        AND policy_row.polcmd IN ('a', 'w', 'd')
    ) THEN
      RAISE EXCEPTION 'Existing document identity table has an unexpected or write policy.';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger trigger_row
      JOIN pg_proc function_row ON function_row.oid = trigger_row.tgfoid
      WHERE trigger_row.tgrelid = 'public.required_document_types'::regclass
        AND trigger_row.tgname = 'sync_document_type_identity'
        AND NOT trigger_row.tgisinternal
        AND trigger_row.tgtype = 21
        AND function_row.oid = 'public.sync_document_type_identity()'::regprocedure
    ) OR NOT EXISTS (
      SELECT 1
      FROM pg_trigger trigger_row
      JOIN pg_proc function_row ON function_row.oid = trigger_row.tgfoid
      WHERE trigger_row.tgrelid = 'public.document_submission_files'::regclass
        AND trigger_row.tgname = 'guard_new_document_submission_template'
        AND NOT trigger_row.tgisinternal
        AND trigger_row.tgtype = 23
        AND function_row.oid = 'public.guard_new_document_submission_template()'::regprocedure
    ) THEN
      RAISE EXCEPTION 'Existing document identity triggers are missing or changed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.required_document_types active_type
      LEFT JOIN public.document_type_identities identity_row ON identity_row.id = active_type.id
      WHERE identity_row.id IS NULL OR identity_row.name IS DISTINCT FROM active_type.name
    ) OR EXISTS (
      SELECT 1
      FROM public.document_submission_files submission_file
      LEFT JOIN public.document_type_identities identity_row ON identity_row.id = submission_file.document_type_id
      WHERE submission_file.document_type_id IS NOT NULL AND identity_row.id IS NULL
    ) OR EXISTS (
      SELECT 1
      FROM public.yorp_sample_document_assets sample_asset
      LEFT JOIN public.document_type_identities identity_row ON identity_row.id = sample_asset.document_type_id
      WHERE identity_row.id IS NULL
    ) THEN
      RAISE EXCEPTION 'Existing document identity rows do not preserve current references.';
    END IF;
  ELSE
    IF to_regprocedure('public.sync_document_type_identity()') IS NOT NULL
       OR to_regprocedure('public.guard_new_document_submission_template()') IS NOT NULL
       OR to_regprocedure('public.can_read_document_type_identity(uuid)') IS NOT NULL
       OR EXISTS (
         SELECT 1 FROM pg_trigger
         WHERE tgname IN ('sync_document_type_identity', 'guard_new_document_submission_template')
           AND NOT tgisinternal
       ) OR EXISTS (
         SELECT 1
         FROM pg_proc function_row
         JOIN pg_namespace schema_row ON schema_row.oid = function_row.pronamespace
         WHERE schema_row.nspname = 'ytrace_internal'
           AND function_row.proname = 'can_read_document_type_identity'
       ) THEN
      RAISE EXCEPTION 'Partial document identity support exists; inspect before applying this migration.';
    END IF;
  END IF;
END;
$prerequisites$;

DO $required_function_owners$
DECLARE
  _current_owner oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = current_user);
  _procedure oid;
  _owner oid;
  _security_definer boolean;
BEGIN
  FOREACH _procedure IN ARRAY ARRAY[
    'public.authorize_admin_template_category_registry(text,boolean)'::regprocedure::oid,
    'public.hard_delete_admin_template_document(text,uuid)'::regprocedure::oid,
    'public.guard_renewal_test_registration_packet_immutable()'::regprocedure::oid
  ] LOOP
    SELECT procedure_row.proowner, procedure_row.prosecdef
      INTO _owner, _security_definer
    FROM pg_proc procedure_row
    WHERE procedure_row.oid = _procedure;
    IF _owner IS DISTINCT FROM _current_owner OR _security_definer IS NOT TRUE THEN
      RAISE EXCEPTION 'A required security-definer function has an unexpected owner or security mode.';
    END IF;
    IF pg_has_role('anon', _owner, 'MEMBER')
       OR pg_has_role('authenticated', _owner, 'MEMBER')
       OR pg_has_role('service_role', _owner, 'MEMBER') THEN
      RAISE EXCEPTION 'An application role inherits a required function owner role.';
    END IF;
  END LOOP;
END;
$required_function_owners$;

LOCK TABLE public.required_document_types,
           public.document_submission_files,
           public.yorp_sample_document_assets
  IN SHARE ROW EXCLUSIVE MODE;

DO $foreign_keys$
DECLARE
  _identity_exists boolean := to_regclass('public.document_type_identities') IS NOT NULL;
BEGIN
  IF (
    SELECT count(*)
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = 'public.document_submission_files'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid IN (
        'public.required_document_types'::regclass,
        to_regclass('public.document_type_identities')
      )
  ) <> 1 THEN
    RAISE EXCEPTION 'Unexpected number of submission-file foreign keys to document types.';
  END IF;
  IF (
    SELECT count(*)
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = 'public.yorp_sample_document_assets'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid IN (
        'public.required_document_types'::regclass,
        to_regclass('public.document_type_identities')
      )
  ) <> 1 THEN
    RAISE EXCEPTION 'Unexpected number of sample-asset foreign keys to document types.';
  END IF;

  IF _identity_exists THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint constraint_row
      WHERE constraint_row.conrelid = 'public.document_submission_files'::regclass
        AND constraint_row.conname = 'document_submission_files_document_type_id_fkey'
        AND constraint_row.confrelid = 'public.document_type_identities'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confdeltype = 'r'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_constraint constraint_row
      WHERE constraint_row.conrelid = 'public.yorp_sample_document_assets'::regclass
        AND constraint_row.conname = 'yorp_sample_document_assets_document_type_id_fkey'
        AND constraint_row.confrelid = 'public.document_type_identities'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confdeltype = 'r'
    ) THEN
      RAISE EXCEPTION 'Existing identity foreign keys do not match the reviewed restricted contract.';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint constraint_row
      WHERE constraint_row.conrelid = 'public.document_submission_files'::regclass
        AND constraint_row.conname = 'document_submission_files_document_type_id_fkey'
        AND constraint_row.confrelid = 'public.required_document_types'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confdeltype = 'n'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_constraint constraint_row
      WHERE constraint_row.conrelid = 'public.yorp_sample_document_assets'::regclass
        AND constraint_row.conname = 'yorp_sample_document_assets_document_type_id_fkey'
        AND constraint_row.confrelid = 'public.required_document_types'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confdeltype = 'c'
    ) THEN
      RAISE EXCEPTION 'Expected legacy SET NULL/CASCADE document-type foreign keys were not found.';
    END IF;
  END IF;
END;
$foreign_keys$;

CREATE TABLE IF NOT EXISTS public.document_type_identities (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

LOCK TABLE public.document_type_identities IN SHARE ROW EXCLUSIVE MODE;

-- Keep the RLS predicate outside PostgREST's exposed public schema. Roles need
-- EXECUTE for the stored policy expression, but no schema USAGE, so they cannot
-- invoke this SECURITY DEFINER predicate directly as an identity oracle.
CREATE SCHEMA IF NOT EXISTS ytrace_internal;
REVOKE ALL ON SCHEMA ytrace_internal FROM PUBLIC, anon, authenticated, service_role;
DO $internal_schema$
DECLARE
  _owner oid;
BEGIN
  SELECT schema_row.nspowner INTO _owner
  FROM pg_namespace schema_row
  WHERE schema_row.nspname = 'ytrace_internal';
  IF _owner IS DISTINCT FROM (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = current_user) THEN
    RAISE EXCEPTION 'The internal policy schema has an unexpected owner.';
  END IF;
  IF pg_has_role('anon', _owner, 'MEMBER')
     OR pg_has_role('authenticated', _owner, 'MEMBER')
     OR pg_has_role('service_role', _owner, 'MEMBER') THEN
    RAISE EXCEPTION 'An API role can assume the internal policy schema owner role.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_namespace schema_row
    CROSS JOIN LATERAL aclexplode(coalesce(schema_row.nspacl, acldefault('n', schema_row.nspowner))) acl
    WHERE schema_row.nspname = 'ytrace_internal'
      AND acl.grantee <> schema_row.nspowner
  ) THEN
    RAISE EXCEPTION 'The internal policy schema has an unexpected explicit grant.';
  END IF;
  IF has_schema_privilege('anon', 'ytrace_internal', 'USAGE')
     OR has_schema_privilege('anon', 'ytrace_internal', 'CREATE')
     OR has_schema_privilege('authenticated', 'ytrace_internal', 'USAGE')
     OR has_schema_privilege('authenticated', 'ytrace_internal', 'CREATE')
     OR has_schema_privilege('service_role', 'ytrace_internal', 'USAGE')
     OR has_schema_privilege('service_role', 'ytrace_internal', 'CREATE') THEN
    RAISE EXCEPTION 'An API role retains access to the internal policy schema.';
  END IF;

  IF (
    SELECT relation_row.relowner
    FROM pg_class relation_row
    WHERE relation_row.oid = 'public.document_type_identities'::regclass
  ) IS DISTINCT FROM (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = current_user) THEN
    RAISE EXCEPTION 'The document identity table has an unexpected owner.';
  END IF;
  IF pg_has_role(
       'anon',
       (SELECT relation_row.relowner FROM pg_class relation_row WHERE relation_row.oid = 'public.document_type_identities'::regclass),
       'MEMBER'
     ) OR pg_has_role(
       'authenticated',
       (SELECT relation_row.relowner FROM pg_class relation_row WHERE relation_row.oid = 'public.document_type_identities'::regclass),
       'MEMBER'
     ) OR pg_has_role(
       'service_role',
       (SELECT relation_row.relowner FROM pg_class relation_row WHERE relation_row.oid = 'public.document_type_identities'::regclass),
       'MEMBER'
     ) THEN
    RAISE EXCEPTION 'An API role can assume the document identity table owner role.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      to_regprocedure('public.sync_document_type_identity()')::oid,
      to_regprocedure('public.guard_new_document_submission_template()')::oid,
      to_regprocedure('public.can_read_document_type_identity(uuid)')::oid,
      to_regprocedure('ytrace_internal.can_read_document_type_identity(uuid)')::oid
    ]) procedure_ref(oid)
    JOIN pg_proc procedure_row ON procedure_row.oid = procedure_ref.oid
    WHERE procedure_row.proowner IS DISTINCT FROM (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = current_user)
       OR procedure_row.prosecdef IS NOT TRUE
       OR pg_has_role('anon', procedure_row.proowner, 'MEMBER')
       OR pg_has_role('authenticated', procedure_row.proowner, 'MEMBER')
       OR pg_has_role('service_role', procedure_row.proowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'An existing document identity security-definer function has an unexpected owner or security mode.';
  END IF;
END;
$internal_schema$;

INSERT INTO public.document_type_identities (id, name, created_at)
SELECT id, name, created_at
FROM public.required_document_types
ON CONFLICT (id) DO NOTHING;

-- Limit app-readable identities to active template rows and types still
-- referenced by a submitted document. The SECURITY DEFINER predicate avoids
-- granting direct access to the underlying submission table just for this RLS check.
CREATE OR REPLACE FUNCTION ytrace_internal.can_read_document_type_identity(_identity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.required_document_types active_type
    WHERE active_type.id = _identity_id
  ) OR EXISTS (
    SELECT 1 FROM public.document_submission_files submitted_file
    WHERE submitted_file.document_type_id = _identity_id
  )
$function$;
REVOKE ALL ON FUNCTION ytrace_internal.can_read_document_type_identity(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ytrace_internal.can_read_document_type_identity(uuid) TO anon, authenticated;
DO $identity_policy_function_acl$
DECLARE
  _owner oid;
  _anon oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'anon');
  _authenticated oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'authenticated');
BEGIN
  SELECT function_row.proowner INTO _owner
  FROM pg_proc function_row
  WHERE function_row.oid = 'ytrace_internal.can_read_document_type_identity(uuid)'::regprocedure;
  IF EXISTS (
    SELECT 1
    FROM pg_proc function_row
    CROSS JOIN LATERAL aclexplode(coalesce(function_row.proacl, acldefault('f', function_row.proowner))) acl
    WHERE function_row.oid = 'ytrace_internal.can_read_document_type_identity(uuid)'::regprocedure
      AND (
        acl.grantee NOT IN (_owner, _anon, _authenticated)
        OR acl.grantee = 0
        OR (acl.grantee IN (_anon, _authenticated)
            AND (acl.privilege_type <> 'EXECUTE' OR acl.is_grantable))
      )
  ) THEN
    RAISE EXCEPTION 'The identity policy function has an unexpected explicit grant.';
  END IF;
END;
$identity_policy_function_acl$;

ALTER TABLE public.document_type_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.document_type_identities FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.document_type_identities TO anon, authenticated, service_role;
DO $identity_table_acl$
DECLARE
  _owner oid;
  _anon oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'anon');
  _authenticated oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'authenticated');
  _service_role oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'service_role');
BEGIN
  SELECT relation_row.relowner INTO _owner
  FROM pg_class relation_row
  WHERE relation_row.oid = 'public.document_type_identities'::regclass;
  IF EXISTS (
    SELECT 1
    FROM pg_class relation_row
    CROSS JOIN LATERAL aclexplode(coalesce(relation_row.relacl, acldefault('r', relation_row.relowner))) acl
    WHERE relation_row.oid = 'public.document_type_identities'::regclass
      AND (
        acl.grantee NOT IN (_owner, _anon, _authenticated, _service_role)
        OR acl.grantee = 0
        OR (acl.grantee IN (_anon, _authenticated, _service_role)
            AND (acl.privilege_type <> 'SELECT' OR acl.is_grantable))
      )
  ) THEN
    RAISE EXCEPTION 'The document identity table has an unexpected explicit grant.';
  END IF;
END;
$identity_table_acl$;
DROP POLICY IF EXISTS document_type_identities_read ON public.document_type_identities;
DROP FUNCTION IF EXISTS public.can_read_document_type_identity(uuid);
CREATE POLICY document_type_identities_read
  ON public.document_type_identities
  FOR SELECT
  TO anon, authenticated
  USING (ytrace_internal.can_read_document_type_identity(id));

CREATE OR REPLACE FUNCTION public.sync_document_type_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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

DROP TRIGGER IF EXISTS sync_document_type_identity ON public.required_document_types;
CREATE TRIGGER sync_document_type_identity
  AFTER INSERT OR UPDATE ON public.required_document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_document_type_identity();

-- Preserve immutable submission rows and sample mappings. The legacy catalog
-- foreign keys are redirected once; an already-reviewed identity FK is retained.
DO $identity_foreign_keys$
DECLARE
  _referenced_table oid;
  _delete_action "char";
BEGIN
  SELECT confrelid, confdeltype INTO _referenced_table, _delete_action
  FROM pg_constraint
  WHERE conrelid = 'public.document_submission_files'::regclass
    AND conname = 'document_submission_files_document_type_id_fkey'
    AND contype = 'f';
  IF _referenced_table = 'public.required_document_types'::regclass AND _delete_action = 'n' THEN
    ALTER TABLE public.document_submission_files
      DROP CONSTRAINT document_submission_files_document_type_id_fkey;
    ALTER TABLE public.document_submission_files
      ADD CONSTRAINT document_submission_files_document_type_id_fkey
      FOREIGN KEY (document_type_id)
      REFERENCES public.document_type_identities(id)
      ON DELETE RESTRICT;
  ELSIF _referenced_table = 'public.document_type_identities'::regclass AND _delete_action = 'r' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Submission-file foreign key changed during migration; stopping.';
  END IF;

  SELECT confrelid, confdeltype INTO _referenced_table, _delete_action
  FROM pg_constraint
  WHERE conrelid = 'public.yorp_sample_document_assets'::regclass
    AND conname = 'yorp_sample_document_assets_document_type_id_fkey'
    AND contype = 'f';
  IF _referenced_table = 'public.required_document_types'::regclass AND _delete_action = 'c' THEN
    ALTER TABLE public.yorp_sample_document_assets
      DROP CONSTRAINT yorp_sample_document_assets_document_type_id_fkey;
    ALTER TABLE public.yorp_sample_document_assets
      ADD CONSTRAINT yorp_sample_document_assets_document_type_id_fkey
      FOREIGN KEY (document_type_id)
      REFERENCES public.document_type_identities(id)
      ON DELETE RESTRICT;
  ELSIF _referenced_table = 'public.document_type_identities'::regclass AND _delete_action = 'r' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'YORP sample-asset foreign key changed during migration; stopping.';
  END IF;
END;
$identity_foreign_keys$;

-- A stale client may still try to submit a new file for a removed template.
-- The identity FK alone would accept that UUID, so new/retargeted submissions
-- must still point at a currently active template. Existing file revisions
-- that keep their original document_type_id remain permitted.
CREATE OR REPLACE FUNCTION public.guard_new_document_submission_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
DROP TRIGGER IF EXISTS guard_new_document_submission_template ON public.document_submission_files;
CREATE TRIGGER guard_new_document_submission_template
  BEFORE INSERT OR UPDATE ON public.document_submission_files
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_new_document_submission_template();
DO $identity_trigger_function_acl$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc function_row
    CROSS JOIN LATERAL aclexplode(coalesce(function_row.proacl, acldefault('f', function_row.proowner))) acl
    WHERE function_row.oid IN (
      'public.sync_document_type_identity()'::regprocedure,
      'public.guard_new_document_submission_template()'::regprocedure
    )
      AND acl.grantee <> function_row.proowner
  ) THEN
    RAISE EXCEPTION 'A document identity trigger function has an unexpected explicit grant.';
  END IF;
END;
$identity_trigger_function_acl$;

-- Preserve the existing RPC name and parameters for the client, but require the
-- same active account and Forms & Templates permission used by the category RPC.
-- Deletion removes only the active catalog row. Submission files and sample
-- asset rows retain their stable identity foreign keys and are not modified.
CREATE OR REPLACE FUNCTION public.hard_delete_admin_template_document(
  _session_token text,
  _template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  _locked_template_id uuid;
  _deleted_template_id uuid;
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, true);

  SELECT id
  INTO _locked_template_id
  FROM public.required_document_types
  WHERE id = _template_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The template no longer exists.';
  END IF;

  DELETE FROM public.required_document_types
  WHERE id = _locked_template_id
  RETURNING id INTO _deleted_template_id;

  IF _deleted_template_id IS NULL THEN
    RAISE EXCEPTION 'The template could not be deleted.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.hard_delete_admin_template_document(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text, uuid)
  TO anon, authenticated, service_role;
DO $template_delete_function_acl$
DECLARE
  _owner oid;
  _anon oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'anon');
  _authenticated oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'authenticated');
  _service_role oid := (SELECT role_row.oid FROM pg_roles role_row WHERE role_row.rolname = 'service_role');
BEGIN
  SELECT function_row.proowner INTO _owner
  FROM pg_proc function_row
  WHERE function_row.oid = 'public.hard_delete_admin_template_document(text,uuid)'::regprocedure;
  IF EXISTS (
    SELECT 1
    FROM pg_proc function_row
    CROSS JOIN LATERAL aclexplode(coalesce(function_row.proacl, acldefault('f', function_row.proowner))) acl
    WHERE function_row.oid = 'public.hard_delete_admin_template_document(text,uuid)'::regprocedure
      AND (
        acl.grantee NOT IN (_owner, _anon, _authenticated, _service_role)
        OR acl.grantee = 0
        OR (acl.grantee IN (_anon, _authenticated, _service_role)
            AND (acl.privilege_type <> 'EXECUTE' OR acl.is_grantable))
      )
  ) THEN
    RAISE EXCEPTION 'The template deletion function has an unexpected explicit grant.';
  END IF;
END;
$template_delete_function_acl$;

NOTIFY pgrst, 'reload schema';
COMMIT;
