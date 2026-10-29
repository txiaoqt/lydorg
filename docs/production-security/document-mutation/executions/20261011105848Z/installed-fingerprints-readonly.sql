BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
WITH target_functions AS (
 SELECT p.* FROM unnest(ARRAY[
 'public.guard_direct_document_mutation()','public.guard_document_parent_mutation()',
 'public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)',
 'public.update_admin_document_submission_file_review(text,uuid,public.document_submission_status,text)',
 'public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)',
 'public.user_resubmit_renewal(uuid)','public.user_submit_renewal(uuid)',
 'ytrace_document_mutation.guard_file()','ytrace_document_mutation.lock_replacement(uuid)'
 ]) x(signature) JOIN pg_proc p ON p.oid=to_regprocedure(x.signature)
)
SELECT jsonb_build_object(
 'verified_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'functions',(SELECT jsonb_agg(jsonb_build_object(
  'signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),
  'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,
  'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',coalesce(r.rolname,'PUBLIC'),'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY coalesce(r.rolname,'PUBLIC'),a.privilege_type) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) ORDER BY r.rolname) FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role'))
 ) ORDER BY p.oid::regprocedure::text) FROM target_functions p),
 'document_triggers',(SELECT jsonb_agg(jsonb_build_object(
 'table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'event_mask',t.tgtype,
 'definition',pg_get_triggerdef(t.oid),'definition_md5',md5(pg_get_triggerdef(t.oid)),
 'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'),
 'function',t.tgfoid::regprocedure::text,'function_definition_md5',md5(pg_get_functiondef(t.tgfoid)),
 'when_expression',pg_get_expr(t.tgqual,t.tgrelid),'argument_count',t.tgnargs,'column_restriction',t.tgattr::text
 ) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' AND ((c.relname='document_submission_files' AND t.tgname IN ('a_document_mutation_guard','b_document_direct_guard')) OR (c.relname='document_submissions' AND t.tgname='a_document_parent_guard'))),
 'containment_triggers',(SELECT jsonb_agg(jsonb_build_object(
 'table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'event_mask',t.tgtype,
 'definition_md5',md5(pg_get_triggerdef(t.oid)),'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'),
 'function',t.tgfoid::regprocedure::text,'function_definition_md5',md5(pg_get_functiondef(t.tgfoid))
 ) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' AND t.tgname='a_production_fixture_markers_guard'),
 'migration_history',(SELECT jsonb_build_object('count',count(*),'latest',max(version),
  'version_name_md5',md5(coalesce(string_agg(version||':'||coalesce(name,''),E'\n' ORDER BY version),'')),
  'complete_history_md5',md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY version),'[]'::jsonb)::text))
 FROM supabase_migrations.schema_migrations m),
 'patch_schema',(SELECT jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl::text) FROM pg_namespace n WHERE n.nspname='ytrace_document_mutation')
) AS installed_catalog;
COMMIT;
