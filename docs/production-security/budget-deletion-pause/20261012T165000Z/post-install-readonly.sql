-- READ-ONLY post-installation verifier. Does not invoke any business or session RPC.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
WITH c AS(SELECT jsonb_build_object(
 'captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'database',current_database(),'current_user',current_user,'session_user',session_user,
 'migration_history',(SELECT jsonb_build_object('count',count(*),'latest',max(version),'complete_md5',md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY version),'[]'::jsonb)::text)) FROM supabase_migrations.schema_migrations m),
 'foundation_present',to_regnamespace('ytrace_storage_private') IS NOT NULL,
 'gateway_rpc_present',to_regprocedure('public.admin_authorize_storage_operation(text,text,text,text,uuid,text)') IS NOT NULL,
 'function_fingerprints',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE "C") FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f' AND n.nspname IN ('public','ytrace_identity','ytrace_document_mutation','ytrace_production_containment') AND p.proname<>'admin_authorize_storage_operation'),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C",t.tgname COLLATE "C") FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname IN ('public','storage','ytrace_identity') AND t.tgname NOT IN ('ytrace_remember_template_asset','ytrace_remember_news_asset','ytrace_budget_cleanup','ytrace_liquidation_cleanup','ytrace_ypop_cleanup','ytrace_event_cleanup','ytrace_activity_cleanup','ytrace_move_cleanup')),
 'table_structure_md5',(SELECT md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||pg_get_userbyid(c.relowner)||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'')||':'||
 coalesce((SELECT string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),E'\n' ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'')||':'||
 coalesce((SELECT string_agg(con.conname||':'||pg_get_constraintdef(con.oid),E'\n' ORDER BY con.conname COLLATE "C") FROM pg_constraint con WHERE con.conrelid=c.oid),''),E'\n' ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','storage','ytrace_identity')),
 'all_policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname COLLATE "C",tablename COLLATE "C",policyname COLLATE "C") FROM pg_policies p),
 'default_privileges',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,'<global>'),'kind',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'') COLLATE "C",d.defaclobjtype) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'size_limit',b.file_size_limit,'mime_types',b.allowed_mime_types) ORDER BY b.id COLLATE "C") FROM storage.buckets b),
 'roles',(SELECT jsonb_agg(jsonb_build_object('code',r.code,'permissions',r.permission_codes) ORDER BY r.code::text COLLATE "C") FROM public.roles r)
)
 catalog),
f AS(SELECT p.oid,p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.prosecdef security_definer,p.provolatile volatility,p.proparallel parallel_mode,p.proisstrict strict,p.proconfig config,pg_get_function_arguments(p.oid) arguments,pg_get_function_result(p.oid) result,md5(pg_get_functiondef(p.oid)) definition_md5,md5(p.prosrc) source_md5 FROM pg_proc p WHERE p.oid=to_regprocedure('public.admin_bulk_delete_budget_requests(text,uuid[])')),
h AS(SELECT catalog,encode(sha256(convert_to((catalog-ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex') compatibility_sha256 FROM c)
SELECT jsonb_build_object('captured_at',clock_timestamp(),'phase','post',
 'read_only',current_setting('transaction_read_only'),'database',current_database(),'current_user',current_user,'session_user',session_user,'server_version',current_setting('server_version'),
 'project_binding',(SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins),
 'function',(SELECT to_jsonb(f) FROM f),'compatibility_sha256',h.compatibility_sha256,
 'catalog_matches',h.compatibility_sha256='e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f',
 'function_matches',EXISTS(SELECT 1 FROM f WHERE definition_md5='3da7c71f32e4f2a9164efbbac6cda448' AND owner='postgres' AND acl='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND security_definer AND volatility='v' AND parallel_mode='u' AND NOT strict AND config=ARRAY['search_path=public'] AND arguments='_session_token text, _request_ids uuid[]' AND result='jsonb'),
 'migration_history',catalog->'migration_history',
 'storage_policy_count',(SELECT count(*) FROM pg_policies WHERE schemaname='storage'),
 'storage_objects',(SELECT count(*) FROM storage.objects),
 'organization_profiles',(SELECT count(*) FROM public.organization_profiles),
 'containment_guard',public.is_development_or_test_environment()
) AS verification FROM h;
ROLLBACK;
