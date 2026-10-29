import { readFile, writeFile } from 'node:fs/promises';
const dir='docs/production-security/budget-deletion-pause/20261012T165000Z';
const m=JSON.parse(await readFile(`${dir}/candidate-manifest.json`,'utf8'));
const expr=await readFile('docs/production-security/storage-cutover/20261011T113322Z/catalog-expression.sql','utf8');
for(const phase of ['pre','post']){
 const expected=phase==='pre'?m.beforeCatalogSha256:m.projectedAfterCatalogSha256;
 const definition=phase==='pre'?m.before.definition_md5:m.after.definition_md5;
 const sql=`-- READ-ONLY ${phase}-installation verifier. Does not invoke any business or session RPC.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
WITH c AS(SELECT ${expr} catalog),
f AS(SELECT p.oid,p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.prosecdef security_definer,p.provolatile volatility,p.proparallel parallel_mode,p.proisstrict strict,p.proconfig config,pg_get_function_arguments(p.oid) arguments,pg_get_function_result(p.oid) result,md5(pg_get_functiondef(p.oid)) definition_md5,md5(p.prosrc) source_md5 FROM pg_proc p WHERE p.oid=to_regprocedure('public.admin_bulk_delete_budget_requests(text,uuid[])')),
h AS(SELECT catalog,encode(sha256(convert_to((catalog-ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex') compatibility_sha256 FROM c)
SELECT jsonb_build_object('captured_at',clock_timestamp(),'phase','${phase}',
 'read_only',current_setting('transaction_read_only'),'database',current_database(),'current_user',current_user,'session_user',session_user,'server_version',current_setting('server_version'),
 'project_binding',(SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins),
 'function',(SELECT to_jsonb(f) FROM f),'compatibility_sha256',h.compatibility_sha256,
 'catalog_matches',h.compatibility_sha256='${expected}',
 'function_matches',EXISTS(SELECT 1 FROM f WHERE definition_md5='${definition}' AND owner='postgres' AND acl='${m.before.acl}' AND security_definer AND volatility='v' AND parallel_mode='u' AND NOT strict AND config=ARRAY['search_path=public'] AND arguments='_session_token text, _request_ids uuid[]' AND result='jsonb'),
 'migration_history',catalog->'migration_history',
 'storage_policy_count',(SELECT count(*) FROM pg_policies WHERE schemaname='storage'),
 'storage_objects',(SELECT count(*) FROM storage.objects),
 'organization_profiles',(SELECT count(*) FROM public.organization_profiles),
 'containment_guard',public.is_development_or_test_environment()
) AS verification FROM h;
ROLLBACK;
`;
 await writeFile(`${dir}/${phase}-install-readonly.sql`,sql);
}
// Preserve the historical baseline. This is a proposal, not an approved installer input.
const current=JSON.parse(await readFile(`${dir}/protected-data-readonly.json`,'utf8'));
const old=JSON.parse(await readFile('docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json','utf8')).protectedData;
const diffs=current.preserved_data.flatMap(n=>{
 const original=old.preserved_data.find(o=>o.relation===n.relation);
 return JSON.stringify(original)===JSON.stringify(n)?[]:[{relation:n.relation,original,current:n}];
});
await writeFile(`${dir}/preservation-baseline-proposal.json`,JSON.stringify({status:'PROPOSAL_ONLY_NOT_ADOPTED',originalBaseline:'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json',readOnlySnapshot:`${dir}/protected-data-readonly.json`,inventories:57,unchangedInventories:57-diffs.length,differences:diffs,profileProposal:{oldRows:92,newRows:93,allOriginalRowsExact:true,newProfileAlias:'2c2732174d1111e4',ownerAlias:'dc239fb97d3966e4',createdUTC:'2026-10-12T14:25:31.999995+00:00',createdManila:'2026-10-12 22:25:31.999995+08:00',existingGoogleIdentity:true,normalYouthRole:true,noAdminLink:true,status:'pending_review',operatorAttribution:'Timing and workflow are consistent with the operator report; independent identity attribution is not established. No corresponding per-account audit row retained.'},gate:'Do not update any pinned installer baseline. Review remaining mutable inventories and confirm operator attribution before adopting a full cutover preservation baseline. For a separately authorized pause, capture and compare all 57 inventories in the exclusive window; no business rewrite is permitted.'},null,2)+'\n');
console.log(JSON.stringify({status:'LOCAL_READONLY_VERIFIERS_PREPARED',unchangedInventories:57-diffs.length,changedInventories:diffs.map(d=>d.relation)}));
