BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='5s';
SELECT jsonb_build_object(
 'database',current_database(),'current_user',current_user,'session_user',session_user,
 'read_only',current_setting('transaction_read_only'),
 'functions',(SELECT jsonb_agg(jsonb_build_object(
   'signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
   'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,
   'acl',p.proacl::text,'source_md5',md5(p.prosrc),'definition',pg_get_functiondef(p.oid)
 ) ORDER BY p.oid::regprocedure::text COLLATE "C")
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('validate_admin_session_token','get_admin_permission_context')),
 'private_schema_grants',(SELECT jsonb_object_agg(role_name,jsonb_build_object(
    'usage',has_schema_privilege(role_name,'ytrace_storage_private','USAGE'),
    'create',has_schema_privilege(role_name,'ytrace_storage_private','CREATE')))
  FROM (VALUES ('anon'),('authenticated'),('service_role')) roles(role_name)),
 'browser_service_role_membership',EXISTS(SELECT 1 FROM (VALUES ('anon'),('authenticated')) roles(role_name)
   WHERE pg_has_role(role_name,'service_role','MEMBER'))
) AS gateway_dependencies;
COMMIT;
