// Synthetic in-memory PostgreSQL regression test. This test does not connect
// to Supabase, read credentials, or access a configured database.
// Optional local PGlite override: PGLITE_MODULE=file:///.../pglite/dist/index.js
// Run: node --test supabase/tests/template_deletion_preservation.local.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";

const pgliteModule = process.env.PGLITE_MODULE
  ?? new URL("../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url).href;
const { PGlite } = await import(pgliteModule);
const database = new PGlite();
const migration = await readFile(
  new URL("../migrations/20261028093311_preserve_template_submissions_on_delete.sql", import.meta.url),
  "utf8",
);

const ids = {
  template: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  cycleOneSubmission: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  cycleOneFile: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  reviewSubmission: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  reviewFile: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  laterTemplate: "66666666-6666-4666-8666-666666666666",
  laterFile: "77777777-7777-4777-8777-777777777777",
  orphanTemplate: "88888888-8888-4888-8888-888888888888",
};

const query = (sql, params = []) => database.query(sql, params);
const row = async (sql, params = []) => (await query(sql, params)).rows[0];

after(async () => database.close());

test("deleting a template preserves immutable submissions and their reviewable files", async () => {
  await database.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE TABLE public.roles (
      id uuid PRIMARY KEY,
      code text NOT NULL,
      permission_codes text[]
    );
    CREATE TABLE public.admin_accounts (
      id uuid PRIMARY KEY,
      role_id uuid REFERENCES public.roles(id),
      is_active boolean NOT NULL DEFAULT true
    );
    INSERT INTO public.roles VALUES
      ('11111111-1111-4111-8111-111111111111', 'template_manager', ARRAY['forms_templates_management']),
      ('22222222-2222-4222-8222-222222222222', 'viewer', ARRAY['yorp_registry_view']);
    INSERT INTO public.admin_accounts VALUES
      ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', true),
      ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', true);

    CREATE FUNCTION public.validate_admin_session_token(token text)
    RETURNS TABLE(admin_id uuid)
    LANGUAGE sql STABLE
    AS $$
      SELECT CASE token
        WHEN 'manager' THEN '33333333-3333-4333-8333-333333333333'::uuid
        WHEN 'viewer' THEN '44444444-4444-4444-8444-444444444444'::uuid
      END
      WHERE token IN ('manager', 'viewer')
    $$;

    -- Synthetic equivalent of the existing Forms & Templates authorization helper.
    CREATE FUNCTION public.authorize_admin_template_category_registry(
      _session_token text,
      _require_manage_permission boolean DEFAULT false
    ) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
      _admin_id uuid;
      _role_code text;
      _permissions text[];
    BEGIN
      SELECT validated.admin_id, role.code, COALESCE(role.permission_codes, ARRAY[]::text[])
        INTO _admin_id, _role_code, _permissions
      FROM public.validate_admin_session_token(_session_token) validated
      JOIN public.admin_accounts account ON account.id = validated.admin_id AND account.is_active = true
      JOIN public.roles role ON role.id = account.role_id
      LIMIT 1;
      IF _admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin session is invalid or expired.';
      END IF;
      IF _role_code <> 'super_admin' AND (
        (_require_manage_permission AND NOT ('forms_templates_management' = ANY(_permissions)))
        OR (NOT _require_manage_permission AND NOT (
          'forms_templates_management' = ANY(_permissions)
          OR 'registrations_management' = ANY(_permissions)
          OR 'renewals_manage' = ANY(_permissions)
        ))
      ) THEN
        RAISE EXCEPTION 'You do not have permission to manage template categories.' USING ERRCODE = '42501';
      END IF;
      RETURN _admin_id;
    END;
    $$;
    REVOKE ALL ON FUNCTION public.authorize_admin_template_category_registry(text, boolean)
      FROM PUBLIC, anon, authenticated;

    CREATE FUNCTION public.hard_delete_admin_template_document(_session_token text, _template_id uuid)
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$ BEGIN RETURN; END $$;

    CREATE TABLE public.required_document_types (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      is_active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE public.document_submissions (
      id uuid PRIMARY KEY,
      is_seeded_sample_data boolean NOT NULL DEFAULT false,
      seed_batch text,
      submission_scope text,
      renewal_id uuid
    );
    CREATE TABLE public.document_submission_files (
      id uuid PRIMARY KEY,
      submission_id uuid NOT NULL REFERENCES public.document_submissions(id),
      document_type_id uuid REFERENCES public.required_document_types(id) ON DELETE SET NULL,
      file_url text NOT NULL,
      file_name text NOT NULL,
      admin_status text NOT NULL,
      admin_remarks text,
      revision_history jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.yorp_sample_document_assets (
      document_type_id uuid PRIMARY KEY
        CONSTRAINT yorp_sample_document_assets_document_type_id_fkey
        REFERENCES public.required_document_types(id) ON DELETE CASCADE,
      file_url text NOT NULL
    );

    -- Mirrors the existing Cycle 1 guard: any update/delete to the fixture packet fails.
    CREATE FUNCTION public.guard_renewal_test_registration_packet_immutable()
    RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    DECLARE
      _submission_id uuid;
      _is_seeded_registration boolean := false;
    BEGIN
      IF TG_TABLE_NAME = 'document_submission_files'
         AND TG_OP = 'INSERT'
         AND current_setting('app.seed_renewal_test_registration_documents', true) = 'true' THEN
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME = 'document_submissions' THEN
        _submission_id := OLD.id;
        _is_seeded_registration := OLD.is_seeded_sample_data IS TRUE
          AND OLD.seed_batch = 'RENEWAL-TEST-REGISTRATION'
          AND OLD.submission_scope = 'registration'
          AND OLD.renewal_id IS NULL;
      ELSE
        IF TG_OP = 'INSERT' THEN _submission_id := NEW.submission_id;
        ELSE _submission_id := OLD.submission_id;
        END IF;
        SELECT EXISTS (
          SELECT 1 FROM public.document_submissions submission
          WHERE (submission.id = _submission_id OR (TG_OP = 'UPDATE' AND submission.id = NEW.submission_id))
            AND submission.is_seeded_sample_data IS TRUE
            AND submission.seed_batch = 'RENEWAL-TEST-REGISTRATION'
            AND submission.submission_scope = 'registration'
            AND submission.renewal_id IS NULL
        ) INTO _is_seeded_registration;
      END IF;
      IF _is_seeded_registration THEN
        RAISE EXCEPTION 'The Renewal Test Organization registration packet is an immutable Cycle 1 record.';
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER trg_immutable_renewal_test_registration_submission
      BEFORE UPDATE OR DELETE ON public.document_submissions
      FOR EACH ROW EXECUTE FUNCTION public.guard_renewal_test_registration_packet_immutable();
    CREATE TRIGGER trg_immutable_renewal_test_registration_file
      BEFORE INSERT OR UPDATE OR DELETE ON public.document_submission_files
      FOR EACH ROW EXECUTE FUNCTION public.guard_renewal_test_registration_packet_immutable();

    INSERT INTO public.required_document_types(id, name) VALUES
      ('${ids.template}', 'Cycle 1 Packet Template'),
      ('${ids.orphanTemplate}', 'Unused Orphan Template');
    INSERT INTO public.document_submissions(id, is_seeded_sample_data, seed_batch, submission_scope)
      VALUES ('${ids.cycleOneSubmission}', true, 'RENEWAL-TEST-REGISTRATION', 'registration');
    SELECT set_config('app.seed_renewal_test_registration_documents', 'true', false);
    INSERT INTO public.document_submission_files(
      id, submission_id, document_type_id, file_url, file_name, admin_status, admin_remarks, revision_history
    ) VALUES (
      '${ids.cycleOneFile}', '${ids.cycleOneSubmission}', '${ids.template}',
      'storage://organization-docs/cycle1.pdf', 'cycle1.pdf', 'approved', 'preserve this remark', '[{"status":"approved"}]'
    );
    SELECT set_config('app.seed_renewal_test_registration_documents', 'false', false);
    INSERT INTO public.document_submissions(id, submission_scope) VALUES ('${ids.reviewSubmission}', 'registration');
    INSERT INTO public.document_submission_files(
      id, submission_id, document_type_id, file_url, file_name, admin_status, admin_remarks
    ) VALUES (
      '${ids.reviewFile}', '${ids.reviewSubmission}', '${ids.template}',
      'storage://organization-docs/review.pdf', 'review.pdf', 'submitted', 'review later'
    );
    INSERT INTO public.yorp_sample_document_assets(document_type_id, file_url)
      VALUES ('${ids.template}', 'storage://sample/cycle1.pdf');
  `);

  await database.exec(migration);

  const cycleOneBefore = await row("SELECT * FROM public.document_submission_files WHERE id = $1", [ids.cycleOneFile]);
  assert.ok(cycleOneBefore);
  assert.equal(
    (await query("SELECT id FROM public.document_type_identities WHERE id = $1 AND name = 'Cycle 1 Packet Template'", [ids.template])).rows.length,
    1,
    "active document type was backfilled into the stable identity table",
  );
  await query(
    "INSERT INTO public.required_document_types(id, name) VALUES ($1, 'Later Template')",
    [ids.laterTemplate],
  );
  assert.equal(
    (await query("SELECT id FROM public.document_type_identities WHERE id = $1 AND name = 'Later Template'", [ids.laterTemplate])).rows.length,
    1,
    "future templates receive stable identities through the insert trigger",
  );
  await query(
    "INSERT INTO public.document_submission_files(id, submission_id, document_type_id, file_url, file_name, admin_status) VALUES ($1, $2, $3, 'storage://later.pdf', 'later.pdf', 'submitted')",
    [ids.laterFile, ids.reviewSubmission, ids.laterTemplate],
  );
  await query("UPDATE public.required_document_types SET name = 'Renamed Later Template' WHERE id = $1", [ids.laterTemplate]);
  assert.equal(
    (await row("SELECT name FROM public.document_type_identities WHERE id = $1", [ids.laterTemplate])).name,
    "Renamed Later Template",
    "template updates keep the related display identity synchronized",
  );

  await database.exec("SET ROLE authenticated");
  assert.equal(
    (await row("SELECT has_schema_privilege('authenticated', 'ytrace_internal', 'USAGE') AS allowed")).allowed,
    false,
    "authenticated cannot resolve internal policy helpers directly",
  );
  assert.equal(
    (await query("SELECT name FROM public.document_type_identities WHERE id = $1", [ids.template])).rows[0].name,
    "Cycle 1 Packet Template",
    "the app role can read historical template identity metadata",
  );
  await assert.rejects(
    query("SELECT ytrace_internal.can_read_document_type_identity($1)", [ids.template]),
    /permission denied for schema ytrace_internal/,
    "the policy predicate is not directly callable by authenticated users",
  );
  await assert.rejects(
    query("INSERT INTO public.document_type_identities(id, name) VALUES ($1, 'unauthorized')", ["88888888-8888-4888-8888-888888888888"]),
    /permission denied/,
    "the app role cannot write identity records",
  );
  await database.exec("RESET ROLE");
  await database.exec("SET ROLE anon");
  assert.equal(
    (await query("SELECT name FROM public.document_type_identities WHERE id = $1", [ids.template])).rows[0].name,
    "Cycle 1 Packet Template",
    "the anonymous app role can evaluate the stored policy for an active identity",
  );
  await assert.rejects(
    query("SELECT ytrace_internal.can_read_document_type_identity($1)", [ids.template]),
    /permission denied for schema ytrace_internal/,
    "the policy predicate is not directly callable by anonymous users",
  );
  await database.exec("RESET ROLE");
  assert.equal(
    (await row("SELECT to_regprocedure('public.can_read_document_type_identity(uuid)') IS NULL AS absent")).absent,
    true,
    "no public-schema copy of the identity predicate remains",
  );

  // An unreferenced deleted template identity is retained for safety, but is
  // not exposed to app roles once it is neither active nor used by a file.
  await query("DELETE FROM public.required_document_types WHERE id = $1", [ids.orphanTemplate]);
  await database.exec("SET ROLE authenticated");
  assert.equal(
    (await query("SELECT id FROM public.document_type_identities WHERE id = $1", [ids.orphanTemplate])).rows.length,
    0,
    "unreferenced deleted identities are not readable by the app role",
  );
  assert.equal(
    (await query("SELECT id FROM public.document_type_identities WHERE id = $1", [ids.template])).rows.length,
    1,
    "identities still referenced by submitted files remain readable",
  );
  await database.exec("RESET ROLE");

  // Exercise the already-installed identity-state upgrade path and ensure a
  // broader pre-existing SELECT policy is replaced with the reviewed predicate.
  await query("ALTER POLICY document_type_identities_read ON public.document_type_identities USING (true)");
  await database.exec(migration);
  await database.exec("SET ROLE authenticated");
  assert.equal(
    (await query("SELECT id FROM public.document_type_identities WHERE id = $1", [ids.orphanTemplate])).rows.length,
    0,
    "rerunning against complete identity state narrows an overly broad read policy",
  );
  assert.equal(
    (await query("SELECT id FROM public.document_type_identities WHERE id = $1", [ids.template])).rows.length,
    1,
    "the narrowed policy continues to expose retained submission identities",
  );
  await database.exec("RESET ROLE");

  await assert.rejects(
    query("SELECT public.hard_delete_admin_template_document('viewer', $1)", [ids.template]),
    /permission to manage template categories/,
  );
  assert.equal(
    (await query("SELECT id FROM public.required_document_types WHERE id = $1", [ids.template])).rows.length,
    1,
    "unauthorized admin cannot remove the active template",
  );

  await assert.rejects(
    query("UPDATE public.document_submission_files SET admin_status = 'changed' WHERE id = $1", [ids.cycleOneFile]),
    /immutable Cycle 1 record/,
    "the Cycle 1 guard still rejects direct edits",
  );

  await query("SELECT public.hard_delete_admin_template_document('manager', $1)", [ids.template]);
  assert.equal(
    (await query("SELECT id FROM public.required_document_types WHERE id = $1", [ids.template])).rows.length,
    0,
    "authorized delete removes the active Forms & Templates row",
  );
  assert.equal(
    (await query("SELECT id FROM public.document_submissions WHERE id = $1", [ids.cycleOneSubmission])).rows.length,
    1,
    "Cycle 1 submission remains present",
  );
  assert.deepEqual(
    await row("SELECT * FROM public.document_submission_files WHERE id = $1", [ids.cycleOneFile]),
    cycleOneBefore,
    "Cycle 1 submitted file row is unchanged",
  );
  assert.equal(
    (await query("SELECT document_type_id FROM public.yorp_sample_document_assets WHERE document_type_id = $1", [ids.template])).rows.length,
    1,
    "sample asset metadata remains linked to the stable identity",
  );
  assert.equal(
    (await row(
      "SELECT identity_row.name FROM public.document_submission_files file JOIN public.document_type_identities identity_row ON identity_row.id = file.document_type_id WHERE file.id = $1",
      [ids.cycleOneFile],
    )).name,
    "Cycle 1 Packet Template",
    "historical template identity remains resolvable",
  );

  await assert.rejects(
    query(
      "INSERT INTO public.document_submission_files(id, submission_id, document_type_id, file_url, file_name, admin_status) VALUES ($1, $2, $3, 'storage://new.pdf', 'new.pdf', 'submitted')",
      ["99999999-9999-4999-8999-999999999999", ids.reviewSubmission, ids.template],
    ),
    /no longer available for new submissions/,
    "stale clients cannot submit a new file for a deleted template",
  );
  await query(
    "UPDATE public.document_submission_files SET admin_remarks = 'reviewed after template deletion' WHERE id = $1",
    [ids.reviewFile],
  );
  assert.equal(
    (await row("SELECT admin_remarks FROM public.document_submission_files WHERE id = $1", [ids.reviewFile])).admin_remarks,
    "reviewed after template deletion",
    "existing non-Cycle 1 submissions remain reviewable",
  );
});

test("migration fails closed when protected object ownership changes", async () => {
  await query("CREATE ROLE ytrace_test_set_owner NOLOGIN");
  await query("CREATE ROLE ytrace_test_set_member NOLOGIN NOINHERIT");
  await query("GRANT ytrace_test_set_owner TO ytrace_test_set_member WITH INHERIT FALSE, SET TRUE");
  const setRoleMembership = await row(`
    SELECT
      pg_has_role('ytrace_test_set_member', 'ytrace_test_set_owner', 'USAGE') AS inherited,
      pg_has_role('ytrace_test_set_member', 'ytrace_test_set_owner', 'MEMBER') AS member
  `);
  assert.equal(setRoleMembership.inherited, false, "NOINHERIT membership does not grant immediate owner privileges");
  assert.equal(setRoleMembership.member, true, "MEMBER detects an owner role that can be assumed with SET ROLE");
  await query("REVOKE ytrace_test_set_owner FROM ytrace_test_set_member");
  await query("DROP ROLE ytrace_test_set_member");
  await query("DROP ROLE ytrace_test_set_owner");

  await query("CREATE ROLE unexpected_acl_grantee");
  await query("GRANT SELECT ON public.document_type_identities TO unexpected_acl_grantee");
  await assert.rejects(
    database.exec(migration),
    /The document identity table has an unexpected explicit grant/,
    "an unrecognized grantee on the identity table is rejected",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("REVOKE ALL ON public.document_type_identities FROM unexpected_acl_grantee");

  await query("GRANT USAGE ON SCHEMA ytrace_internal TO unexpected_acl_grantee");
  await assert.rejects(
    database.exec(migration),
    /The internal policy schema has an unexpected explicit grant/,
    "an unrecognized grantee on the internal schema is rejected",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("REVOKE ALL ON SCHEMA ytrace_internal FROM unexpected_acl_grantee");

  await query("GRANT EXECUTE ON FUNCTION ytrace_internal.can_read_document_type_identity(uuid) TO unexpected_acl_grantee");
  await assert.rejects(
    database.exec(migration),
    /The identity policy function has an unexpected explicit grant/,
    "an unrecognized grantee on the RLS helper is rejected",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("REVOKE ALL ON FUNCTION ytrace_internal.can_read_document_type_identity(uuid) FROM unexpected_acl_grantee");

  await query("GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text, uuid) TO unexpected_acl_grantee");
  await assert.rejects(
    database.exec(migration),
    /The template deletion function has an unexpected explicit grant/,
    "an unrecognized grantee on the template delete RPC is rejected",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("REVOKE ALL ON FUNCTION public.hard_delete_admin_template_document(text, uuid) FROM unexpected_acl_grantee");

  await query("GRANT EXECUTE ON FUNCTION public.sync_document_type_identity() TO unexpected_acl_grantee");
  await assert.rejects(
    database.exec(migration),
    /A document identity trigger function has an unexpected explicit grant/,
    "an unrecognized grantee on a document identity trigger is rejected",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("REVOKE ALL ON FUNCTION public.sync_document_type_identity() FROM unexpected_acl_grantee");

  await query("ALTER TABLE public.document_type_identities OWNER TO authenticated");
  await assert.rejects(
    database.exec(migration),
    /The document identity table has an unexpected owner/,
    "an app-owned identity table is rejected before migration changes commit",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("ALTER TABLE public.document_type_identities OWNER TO postgres");

  await query("GRANT USAGE, CREATE ON SCHEMA ytrace_internal TO authenticated");
  await query("ALTER FUNCTION ytrace_internal.can_read_document_type_identity(uuid) OWNER TO authenticated");
  await query("REVOKE ALL ON SCHEMA ytrace_internal FROM authenticated");
  await assert.rejects(
    database.exec(migration),
    /An existing document identity security-definer function has an unexpected owner or security mode/,
    "an app-owned SECURITY DEFINER policy helper is rejected before replacement",
  );
  await database.exec("ROLLBACK").catch(() => {});
  await query("DROP ROLE unexpected_acl_grantee");
});
