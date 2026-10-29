-- Remove direct table privileges from browser-facing roles. Browser Admin session
-- flows use the existing authorized SECURITY DEFINER RPCs; in-repository direct
-- table access uses server-side service_role/operator paths.
-- This migration changes only public.admin_sessions relation ACL entries for
-- anon and authenticated. It does not change ownership, PUBLIC grants, policies,
-- functions, or service_role privileges. Preconditions and postconditions run
-- in one DO statement so any failed assertion aborts the ACL change.
DO $ytrace_admin_sessions_acl$
DECLARE
  v_relid oid;
  v_original_owner oid;
  v_current_owner oid;
  v_postgres_oid oid;
  v_role_oid oid;
  v_role_name text;
  v_privilege text;
  v_grant_count bigint;
  v_column record;
  v_expected_table_privileges CONSTANT text[] :=
    ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']::text[];
  v_checked_column_privileges CONSTANT text[] :=
    ARRAY['SELECT','INSERT','UPDATE','REFERENCES']::text[];
BEGIN
  SELECT c.oid, c.relowner
    INTO v_relid, v_original_owner
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'admin_sessions'
    AND c.relkind IN ('r', 'p');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Precondition failed: public.admin_sessions is missing or is not a table.';
  END IF;

  SELECT r.oid INTO v_postgres_oid
  FROM pg_catalog.pg_roles AS r
  WHERE r.rolname = 'postgres';

  IF v_postgres_oid IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: expected postgres grantor role is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
    WHERE c.oid = v_relid
      AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'Precondition failed: unexpected PUBLIC table ACL entry exists.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
    WHERE a.attrelid = v_relid
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Precondition failed: unexpected explicit column ACL exists.';
  END IF;

  FOR v_role_name IN
    SELECT unnest(ARRAY['anon','authenticated','service_role']::text[])
  LOOP
    SELECT r.oid INTO v_role_oid
    FROM pg_catalog.pg_roles AS r
    WHERE r.rolname = v_role_name;

    IF v_role_oid IS NULL THEN
      RAISE EXCEPTION 'Precondition failed: an expected database role is missing.';
    END IF;

    SELECT count(*) INTO v_grant_count
    FROM pg_catalog.pg_class AS c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
    WHERE c.oid = v_relid
      AND acl.grantee = v_role_oid;

    IF v_grant_count <> cardinality(v_expected_table_privileges) THEN
      RAISE EXCEPTION 'Precondition failed: target role table ACL differs from the reviewed catalog.';
    END IF;

    FOR v_privilege IN
      SELECT unnest(v_expected_table_privileges)
    LOOP
      SELECT count(*) INTO v_grant_count
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
      WHERE c.oid = v_relid
        AND acl.grantee = v_role_oid
        AND acl.grantor = v_postgres_oid
        AND acl.privilege_type = v_privilege
        AND NOT acl.is_grantable;

      IF v_grant_count <> 1 THEN
        RAISE EXCEPTION 'Precondition failed: target role privilege grant differs from the reviewed catalog.';
      END IF;

      IF NOT pg_catalog.has_table_privilege(v_role_name, v_relid, v_privilege) THEN
        RAISE EXCEPTION 'Precondition failed: expected effective target-role privilege is absent.';
      END IF;
    END LOOP;
  END LOOP;

  EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.admin_sessions FROM anon, authenticated';

  FOR v_role_name IN
    SELECT unnest(ARRAY['anon','authenticated']::text[])
  LOOP
    SELECT r.oid INTO v_role_oid
    FROM pg_catalog.pg_roles AS r
    WHERE r.rolname = v_role_name;

    FOR v_privilege IN
      SELECT unnest(v_expected_table_privileges)
    LOOP
      IF pg_catalog.has_table_privilege(v_role_name, v_relid, v_privilege) THEN
        RAISE EXCEPTION 'Postcondition failed: a browser-facing role retains an effective table privilege.';
      END IF;
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
      WHERE c.oid = v_relid
        AND acl.grantee = v_role_oid
    ) THEN
      RAISE EXCEPTION 'Postcondition failed: a direct table ACL entry remains for a browser-facing role.';
    END IF;

    FOR v_column IN
      SELECT a.attnum, a.attname
      FROM pg_catalog.pg_attribute AS a
      WHERE a.attrelid = v_relid
        AND a.attnum > 0
        AND NOT a.attisdropped
    LOOP
      FOR v_privilege IN
        SELECT unnest(v_checked_column_privileges)
      LOOP
        IF pg_catalog.has_column_privilege(v_role_name, v_relid, v_column.attnum, v_privilege) THEN
          RAISE EXCEPTION 'Postcondition failed: a browser-facing role retains an effective column privilege.';
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  SELECT c.relowner INTO v_current_owner
  FROM pg_catalog.pg_class AS c
  WHERE c.oid = v_relid;

  IF v_current_owner IS DISTINCT FROM v_original_owner THEN
    RAISE EXCEPTION 'Postcondition failed: table ownership changed.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
    WHERE c.oid = v_relid
      AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: PUBLIC table ACL changed or appeared.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
    WHERE a.attrelid = v_relid
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: an explicit column ACL appeared.';
  END IF;

  SELECT r.oid INTO v_role_oid
  FROM pg_catalog.pg_roles AS r
  WHERE r.rolname = 'service_role';

  IF v_role_oid IS NULL THEN
    RAISE EXCEPTION 'Postcondition failed: service_role is missing.';
  END IF;

  FOR v_privilege IN
    SELECT unnest(v_expected_table_privileges)
  LOOP
    IF NOT pg_catalog.has_table_privilege('service_role', v_relid, v_privilege) THEN
      RAISE EXCEPTION 'Postcondition failed: service_role lost an effective reviewed table privilege.';
    END IF;

    SELECT count(*) INTO v_grant_count
    FROM pg_catalog.pg_class AS c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
    WHERE c.oid = v_relid
      AND acl.grantee = v_role_oid
      AND acl.grantor = v_postgres_oid
      AND acl.privilege_type = v_privilege
      AND NOT acl.is_grantable;

    IF v_grant_count <> 1 THEN
      RAISE EXCEPTION 'Postcondition failed: service_role direct grant differs from the reviewed catalog.';
    END IF;
  END LOOP;
END;
$ytrace_admin_sessions_acl$;