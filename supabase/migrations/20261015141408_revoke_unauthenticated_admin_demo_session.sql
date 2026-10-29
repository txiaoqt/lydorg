-- Contain the legacy browser-callable Admin demo-session bridge.
-- The function is intentionally retained for owner-only dependency review;
-- this migration grants EXECUTE to no client or service role.

DO $guard$
DECLARE
  _function_oid oid := pg_catalog.to_regprocedure('public.ensure_admin_demo_session(text,text)');
  _security_definer boolean;
BEGIN
  IF _function_oid IS NULL THEN
    RAISE EXCEPTION 'Expected public.ensure_admin_demo_session(text,text) is missing.';
  END IF;

  SELECT p.prosecdef
  INTO _security_definer
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = _function_oid;

  IF _security_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Unexpected security mode for public.ensure_admin_demo_session(text,text).';
  END IF;
END;
$guard$;

REVOKE EXECUTE ON FUNCTION public.ensure_admin_demo_session(text, text)
FROM PUBLIC, anon, authenticated, service_role;

DO $verify$
DECLARE
  _function_oid oid := pg_catalog.to_regprocedure('public.ensure_admin_demo_session(text,text)');
BEGIN
  IF _function_oid IS NULL THEN
    RAISE EXCEPTION 'Expected public.ensure_admin_demo_session(text,text) disappeared.';
  END IF;

  IF pg_catalog.has_function_privilege('anon', _function_oid, 'EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated', _function_oid, 'EXECUTE')
    OR pg_catalog.has_function_privilege('service_role', _function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Client or service EXECUTE privilege remains on public.ensure_admin_demo_session(text,text).';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) AS acl
    WHERE p.oid = _function_oid
      AND acl.privilege_type = 'EXECUTE'
      AND acl.grantee <> p.proowner
  ) THEN
    RAISE EXCEPTION 'A non-owner EXECUTE grant remains on public.ensure_admin_demo_session(text,text).';
  END IF;
END;
$verify$;
