BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='5s';
SELECT jsonb_build_object(
 'database',current_database(),'current_user',current_user,'session_user',session_user,
 'read_only',current_setting('transaction_read_only'),'server_version_num',current_setting('server_version_num')::int,
 'backend_pid',pg_backend_pid(),'server_port',inet_server_port(),
 'tls',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),
 'tls_version',(SELECT version FROM pg_stat_ssl WHERE pid=pg_backend_pid()),
 'environment_guard',public.is_development_or_test_environment(),
 'database_create',has_database_privilege(current_user,current_database(),'CREATE'),
 'public_create',has_schema_privilege(current_user,'public','CREATE'),
 'browser_service_role_membership',EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated')) browser(role_name) WHERE pg_has_role(browser.role_name,'service_role','MEMBER')),
 'required_roles',(SELECT array_agg(rolname ORDER BY rolname COLLATE "C") FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role')),
 'function_owner_counts',(SELECT jsonb_object_agg(owner,total) FROM (SELECT pg_get_userbyid(p.proowner) AS owner,count(*) AS total FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','ytrace_identity','ytrace_document_mutation','ytrace_production_containment') AND p.prokind='f' AND p.proname<>'admin_authorize_storage_operation' GROUP BY p.proowner) owners),
 'trigger_tables',(SELECT jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),'select',has_table_privilege(current_user,c.oid,'SELECT'),'trigger',has_table_privilege(current_user,c.oid,'TRIGGER')) ORDER BY c.relname COLLATE "C") FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('required_document_types','news_releases','budget_requests','liquidation_reports','ypop_entries','ypop_event_participations','ypop_org_activities','move_applications'))
) AS native_identity;
COMMIT;
