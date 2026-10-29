BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
SELECT jsonb_build_object(
 'verified_at',clock_timestamp(),
 'database',current_database(),'current_user',current_user,'session_user',session_user,
 'server_address',inet_server_addr(),'server_port',inet_server_port(),'server_version',current_setting('server_version'),
 'read_only',current_setting('transaction_read_only'),
 'default_privileges',(SELECT coalesce(jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,'<global>'),'object_type',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY coalesce(n.nspname,''),d.defaclobjtype),'[]'::jsonb) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres') AND (d.defaclnamespace=0 OR n.nspname IN ('public','storage'))),
 'unrelated_functions_md5',(SELECT md5(coalesce(string_agg(p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid))||':'||pg_get_userbyid(p.proowner)||':'||p.prosecdef||':'||p.provolatile::text||':'||coalesce(p.proconfig::text,'')||':'||coalesce(p.proacl::text,''),E'\n' ORDER BY p.oid::regprocedure::text),'')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f' AND n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY[
 'public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)',
 'public.replace_organization_document_file(uuid,uuid,timestamptz,text,text,text,bigint)',
 'public.update_admin_document_submission_file_review(text,uuid,public.document_submission_status,text)',
 'public.user_submit_renewal(uuid)','public.user_resubmit_renewal(uuid)',
 'public.guard_direct_document_mutation()','public.guard_document_parent_mutation()',
 'ytrace_document_mutation.guard_file()','ytrace_document_mutation.lock_replacement(uuid)']) AS e(signature) WHERE p.oid=to_regprocedure(e.signature))),
 'all_rls_policies_md5',(SELECT md5(coalesce(string_agg(to_jsonb(p)::text,E'\n' ORDER BY schemaname,tablename,policyname),'')) FROM pg_policies p),
 'table_security_and_structure_md5',(SELECT md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||pg_get_userbyid(c.relowner)||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'')||':'||
 coalesce((SELECT string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),E'\n' ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'')||':'||
 coalesce((SELECT string_agg(con.conname||':'||pg_get_constraintdef(con.oid),E'\n' ORDER BY con.conname) FROM pg_constraint con WHERE con.conrelid=c.oid),''),E'\n' ORDER BY n.nspname,c.relname),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','storage','ytrace_identity')),
 'existing_triggers_md5',(SELECT md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||t.tgname||':'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid,true),E'\n' ORDER BY n.nspname,c.relname,t.tgname),'')) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname IN ('public','storage','ytrace_identity') AND NOT(n.nspname='public' AND ((c.relname='document_submission_files' AND t.tgname IN ('a_document_mutation_guard','b_document_direct_guard')) OR (c.relname='document_submissions' AND t.tgname='a_document_parent_guard')))),
 'schema_grants_md5',(SELECT md5(coalesce(string_agg(n.nspname||':'||pg_get_userbyid(n.nspowner)||':'||coalesce(n.nspacl::text,''),E'\n' ORDER BY n.nspname),'')) FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','ytrace_document_mutation')),
 'active_sessions',(SELECT jsonb_build_object('active_other_sessions',count(*) FILTER(WHERE state='active'),'open_other_transactions',count(*) FILTER(WHERE xact_start IS NOT NULL),'ddl_candidates',count(*) FILTER(WHERE state='active' AND query ~* '(^|[;[:space:]])(alter|create|drop|grant|revoke|truncate|reindex|vacuum[[:space:]]+full)[[:space:]]'),'ddl_lock_waiters',count(*) FILTER(WHERE wait_event_type='Lock')) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend')
) AS safety_verification;
COMMIT;
