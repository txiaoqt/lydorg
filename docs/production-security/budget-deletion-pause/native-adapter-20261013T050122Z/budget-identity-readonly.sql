-- Fixed identity, privilege, TLS and quiescence verifier for the budget pause.
-- It returns no query text, row contents, credentials, tokens or personal data.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
SELECT jsonb_build_object(
  'transaction_read_only',current_setting('transaction_read_only'),
  'default_transaction_read_only',current_setting('default_transaction_read_only'),
  'database',current_database(),'current_user',current_user,'session_user',session_user,
  'server_version_num',current_setting('server_version_num')::integer,'server_port',current_setting('port')::integer,
  'application_name',current_setting('application_name'),
  'backend_pid',pg_backend_pid(),
  'backend_start',(SELECT a.backend_start FROM pg_stat_activity a WHERE a.pid=pg_backend_pid()),
  'tls',(SELECT s.ssl FROM pg_stat_ssl s WHERE s.pid=pg_backend_pid()),
  'tls_version',(SELECT s.version FROM pg_stat_ssl s WHERE s.pid=pg_backend_pid()),
  'database_connect',has_database_privilege(current_user,current_database(),'CONNECT'),
  'owns_target_function',(SELECT pg_get_userbyid(p.proowner)=current_user FROM pg_proc p WHERE p.oid=to_regprocedure('public.admin_bulk_delete_budget_requests(text,uuid[])')),
  'public_usage',has_schema_privilege(current_user,'public','USAGE'),
  'public_create',has_schema_privilege(current_user,'public','CREATE'),
  'plpgsql_usage',has_language_privilege(current_user,'plpgsql','USAGE'),
  'text_type_usage',has_type_privilege(current_user,'text'::regtype,'USAGE'),
  'uuid_array_type_usage',has_type_privilege(current_user,'uuid[]'::regtype,'USAGE'),
  'jsonb_type_usage',has_type_privilege(current_user,'jsonb'::regtype,'USAGE'),
  'all_eight_protected_relations_selectable',(
    SELECT count(*)=8 AND bool_and(has_table_privilege(current_user,rel,'SELECT'))
    FROM unnest(ARRAY[
      'public.budget_requests','public.budget_request_files',
      'public.liquidation_reports','public.liquidation_report_files',
      'public.notifications','public.activity_logs','public.admin_sessions','storage.objects'
    ]::text[]) AS x(rel)
  ),
  'pg_read_all_stats',pg_has_role(current_user,'pg_read_all_stats','member') OR current_user='postgres',
  'active_budget_deletion_calls',(
    SELECT count(*) FROM pg_stat_activity a
    WHERE a.pid<>pg_backend_pid() AND a.state='active'
      AND position('admin_bulk_delete_budget_requests' in lower(coalesce(a.query,'')))>0
  ),
  'other_budget_install_sessions',(
    SELECT count(*) FROM pg_stat_activity a
    WHERE a.pid<>pg_backend_pid() AND a.application_name LIKE 'ytrace-budget-pause-i-%'
  )
) AS native_identity;
ROLLBACK;
