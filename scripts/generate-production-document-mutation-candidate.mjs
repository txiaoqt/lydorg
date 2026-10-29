// Builds a review-only artifact outside supabase/migrations.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sourcePath='supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql';
const source=await readFile(sourcePath,'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
if(sha(source)!=='b19e93c19454a9012e85eb9dce81ba152b4f93d0eaa0fa475f78ab8d30a4d7a0')throw Error('Reviewed patch source drift');
if(/SYNTHETIC|ytrace-renewal|reconciled_synthetic|admin_prepare_renewal_test_scenario/i.test(source))throw Error('Staging fixture logic detected');
const from=source.indexOf('DO $gate$'),to=source.indexOf('END $gate$;',from)+('END $gate$;').length;
if(from<0||to<from)throw Error('Expected reviewed patch catalog gate');
const gate=`DO $production_gate$ DECLARE r record; _count bigint; _latest text; _trigger_hash text; _storage_policy_hash text; _table_policy_hash text; _rpc_acl_hash text; BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Reviewed postgres installation owner required'; END IF;
 SELECT count(*),max(version) INTO _count,_latest FROM supabase_migrations.schema_migrations;
 IF _count<>163 OR _latest<>'20261008174154' THEN RAISE EXCEPTION 'Production migration history drift'; END IF;
 FOR r IN SELECT * FROM (VALUES
 ('user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)','59370b100efed37d5975dc16983d786a',true),
 ('replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)','ce30b4dff57a2fa1b7bf314c01e9fae6',true),
 ('update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','252754fd75505948c26afe27f6b0b760',true),
 ('user_submit_renewal(uuid)','d41b680681db2323aba2c62693f59131',true),
 ('user_resubmit_renewal(uuid)','d19a1d0415f3eb900bab7dea241f0b21',true),
 ('guard_submitted_registration_document_edits()','c6265ae36e8db8678de7a4e69691008e',false),
 ('admin_approve_renewal(text,uuid,text,text)','33ba7c606820f771e4ed79709bcd188b',true),
 ('promote_renewal_submission_files_for_review()','b1a1e8a2d5eb9e8ccd66b10b6c652b45',true),
 ('hard_delete_admin_template_document(text,uuid)','36de9fc3fb6c5ad090579f3261f77bbf',true),
 ('delete_organization_account_canonical(text,uuid)','5c1f0179b9f279eb7a99ff9ee8627c3f',true)
 ) AS expected(signature,fingerprint,security_definer) LOOP
  IF to_regprocedure(r.signature) IS NULL OR md5(pg_get_functiondef(to_regprocedure(r.signature))) IS DISTINCT FROM r.fingerprint
    OR (SELECT pg_get_userbyid(p.proowner) FROM pg_proc p WHERE p.oid=to_regprocedure(r.signature))<>'postgres'
    OR (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=to_regprocedure(r.signature)) IS DISTINCT FROM r.security_definer THEN
    RAISE EXCEPTION 'Production mutation catalog drift: %',r.signature;
  END IF;
 END LOOP;
 IF to_regnamespace('ytrace_document_mutation') IS NOT NULL THEN RAISE EXCEPTION 'Patch namespace already exists'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('a_document_mutation_guard','b_document_direct_guard','a_document_parent_guard') AND NOT tgisinternal) THEN RAISE EXCEPTION 'Document guard trigger name collision'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('document_submission_files','document_submissions','organization_profiles','organization_renewals','organization_accreditations') AND NOT c.relrowsecurity) THEN RAISE EXCEPTION 'Required RLS state drift'; END IF;
 IF NOT has_function_privilege('authenticated','public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.user_submit_renewal(uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.user_resubmit_renewal(uuid)','EXECUTE')
 OR NOT has_function_privilege('anon','public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Production mutation RPC grant drift';
 END IF;
 SELECT md5(coalesce(string_agg(p.oid::regprocedure::text||':'||coalesce(grantee.rolname,'PUBLIC')||':'||acl.privilege_type||':'||acl.is_grantable,E'\\n' ORDER BY p.oid::regprocedure::text,coalesce(grantee.rolname,'PUBLIC'),acl.privilege_type),'')) INTO _rpc_acl_hash
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
 LEFT JOIN pg_roles grantee ON grantee.oid=acl.grantee
 WHERE n.nspname='public' AND p.proname IN ('user_replace_document_submission_file','replace_organization_document_file','update_admin_document_submission_file_review','user_submit_renewal','user_resubmit_renewal');
 IF _rpc_acl_hash<>'e45685fb8b158e7b039a6bf39b2b8973' THEN RAISE EXCEPTION 'Production mutation RPC ACL drift'; END IF;
 SELECT md5(coalesce(string_agg(c.relname||':'||t.tgname||':'||pg_get_triggerdef(t.oid),E'\\n' ORDER BY c.relname,t.tgname),'')) INTO _trigger_hash
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('document_submission_files','document_submissions','organization_profiles','organization_renewals','organization_accreditations');
 IF _trigger_hash<>'aed1b3f4417ad04716197a353c7259bf' THEN RAISE EXCEPTION 'Production trigger compatibility drift'; END IF;
 SELECT md5(coalesce(string_agg(schemaname||':'||tablename||':'||policyname||':'||roles::text||':'||cmd||':'||permissive||':'||coalesce(qual,'')||':'||coalesce(with_check,''),E'\\n' ORDER BY schemaname,tablename,policyname),'')) INTO _storage_policy_hash FROM pg_policies WHERE schemaname='storage';
 IF _storage_policy_hash<>'c5debe81f16c612c63a6b83ffdb90531' THEN RAISE EXCEPTION 'Production Storage policy drift'; END IF;
 SELECT md5(coalesce(string_agg(schemaname||':'||tablename||':'||policyname||':'||roles::text||':'||cmd||':'||permissive||':'||coalesce(qual,'')||':'||coalesce(with_check,''),E'\\n' ORDER BY schemaname,tablename,policyname),'')) INTO _table_policy_hash FROM pg_policies WHERE schemaname='public' AND tablename IN ('document_submission_files','document_submissions','organization_renewals','organization_profiles','organization_accreditations');
 IF _table_policy_hash<>'be6cd95840181dc1dc6124af9cfa6912' THEN RAISE EXCEPTION 'Production table policy drift'; END IF;
END $production_gate$;`;
const header=`-- PRODUCTION REVIEW CANDIDATE ONLY; NOT INSTALLED.
-- Target must be externally verified as Supabase project mqqaykksadotbrghbexz immediately before execution.
-- Keep outside supabase/migrations: production history is behind this checkout and automatic replay is unsafe.
-- This forward-only patch contains document lifecycle guards/RPC corrections only.
-- No fixture reconciliation, test organization, date simulation, test credentials, data rewrite or Storage policy change.
-- Exact reviewed staging-tested code body SHA-256: ${sha(source)}.
-- Catalog gate is pinned to read-only production inspection from 2026-10-11.
`;
const candidate=header+source.slice(0,from)+gate+source.slice(to);
if(/SYNTHETIC|ytrace-renewal|reconciled_synthetic|admin_prepare_renewal_test_scenario/i.test(candidate))throw Error('Unexpected staging content in candidate');
const dir='docs/production-security/document-mutation';await mkdir(dir,{recursive:true});
const path=dir+'/document_mutation_lifecycle_guard_production.sql';
if((await readFile(path,'utf8')).includes('-- PRODUCTION REVIEW CANDIDATE ONLY; NOT INSTALLED.')) await writeFile(path,candidate);
else throw Error('Refusing to overwrite an unrelated production artifact');
console.log(JSON.stringify({path,bytes:Buffer.byteLength(candidate),sourceSha256:sha(source),candidateSha256:sha(candidate),outsideMigrationFolder:true}));
