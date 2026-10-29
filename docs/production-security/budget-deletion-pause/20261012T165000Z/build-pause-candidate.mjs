// LOCAL generation and canonical PostgreSQL hashing only; no connections/env loading.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { PGlite } from '../../../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
const dir='docs/production-security/budget-deletion-pause/20261012T165000Z';
const get=p=>readFile(p,'utf8');
const save=(name,v)=>writeFile(`${dir}/${name}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
const md5=b=>createHash('md5').update(b).digest('hex');
const current=JSON.parse(await get(`${dir}/catalog-readonly.json`));
const captured=JSON.parse(await get(`${dir}/captured-functions.json`));
const original=captured.find(f=>f.signature==='admin_bulk_delete_budget_requests(text,uuid[])');
const before=current.catalog.function_fingerprints.find(f=>f.signature===original.signature);
const excluded=['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'];
const stripped=structuredClone(current.catalog); for(const k of excluded)delete stripped[k];
const db=new PGlite();
try {
 await db.exec('create role anon;create role authenticated;create role service_role;');
 // Exact captured function round-trip; tables aren't needed to compile PL/pgSQL.
 await db.exec(original.definition);
 await db.exec('grant execute on function public.admin_bulk_delete_budget_requests(text,uuid[]) to anon,authenticated,service_role;');
 const acl=(await db.query("select proacl::text acl from pg_proc where oid='public.admin_bulk_delete_budget_requests(text,uuid[])'::regprocedure")).rows[0].acl;
 assert.equal(acl,before.acl);
 const canonicalHash=async v=>(await db.query("select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') hash",[JSON.stringify(v)])).rows[0].hash;
 const oldHash=await canonicalHash(stripped);
 assert.equal(oldHash,'eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5');
 const body=`CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE CALLED ON NULL INPUT SECURITY DEFINER PARALLEL UNSAFE COST 100
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE SQLSTATE 'PT409' USING
    MESSAGE = 'BUDGET_DELETION_PAUSED: Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.';
END;
$function$;
`;
 await db.exec(body);
 const after=(await db.query("select p.oid::regprocedure::text signature,md5(pg_get_functiondef(p.oid)) definition_md5,md5(p.prosrc) source_md5,pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,p.provolatile volatility,p.proconfig config,p.proacl::text acl from pg_proc p where p.oid='public.admin_bulk_delete_budget_requests(text,uuid[])'::regprocedure")).rows[0];
 const projected=structuredClone(stripped);projected.function_fingerprints=projected.function_fingerprints.map(f=>f.signature===after.signature?after:f);
 const newHash=await canonicalHash(projected);
 const expr=await get('docs/production-security/storage-cutover/20261011T113322Z/catalog-expression.sql');
 const catalogHash=`encode(sha256(convert_to((${expr} - ARRAY[${excluded.map(k=>`'${k}'`).join(',')}])::text,'UTF8')),'hex')`;
 const dataHash=`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) FROM %I.%I t`;
 const tables=['public.budget_requests','public.budget_request_files','public.liquidation_reports','public.liquidation_report_files','public.notifications','public.activity_logs','public.admin_sessions','storage.objects'];
 const fingerprintLoop=`FOREACH _relation IN ARRAY ARRAY[${tables.map(t=>`'${t}'`).join(',')}] LOOP
   EXECUTE format(${"'"+dataHash.replaceAll("'","''")+"'"},split_part(_relation,'.',1),split_part(_relation,'.',2)) INTO _hash;
   _data := _data || jsonb_build_object(_relation,_hash);
 END LOOP;`;
 const sql=`-- PREPARED ONLY. Separate authorization required; outside automatic migration replay.
-- Fixed production target mqqaykksadotbrghbexz via independently verified native direct TLS.
-- One function replacement; no migration receipt, business writes, grants or Storage changes.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='30s';
DO $pause_pre$
DECLARE _relation text; _hash text; _data jsonb := '{}'::jsonb;
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected installation identity'; END IF;
 IF current_setting('server_version_num')::int/10000<>17 THEN RAISE EXCEPTION 'Unexpected PostgreSQL major version'; END IF;
 IF (SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins) IS DISTINCT FROM ARRAY['https://mqqaykksadotbrghbexz.supabase.co'] THEN RAISE EXCEPTION 'Wrong production Storage origin'; END IF;
 IF ${catalogHash} <> '${oldHash}' THEN RAISE EXCEPTION 'Exact reviewed production catalog drifted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid='public.admin_bulk_delete_budget_requests(text,uuid[])'::regprocedure AND pg_get_userbyid(p.proowner)='postgres' AND l.lanname='plpgsql' AND p.prosecdef AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.procost=100 AND p.prorows=0 AND p.proconfig=ARRAY['search_path=public'] AND p.proacl::text='${before.acl}' AND pg_get_function_arguments(p.oid)='_session_token text, _request_ids uuid[]' AND pg_get_function_result(p.oid)='jsonb' AND md5(pg_get_functiondef(p.oid))='${before.definition_md5}') THEN RAISE EXCEPTION 'Budget deletion function contract drifted'; END IF;
 PERFORM set_config('ytrace_budget_pause.original_oid','public.admin_bulk_delete_budget_requests(text,uuid[])'::regprocedure::oid::text,true);
 ${fingerprintLoop}
 PERFORM set_config('ytrace_budget_pause.preserved_data',_data::text,true);
END $pause_pre$;
-- BEGIN reviewed pause body
${body}-- END reviewed pause body
DO $pause_post$
DECLARE _relation text; _hash text; _data jsonb := '{}'::jsonb;
BEGIN
 IF 'public.admin_bulk_delete_budget_requests(text,uuid[])'::regprocedure::oid::text IS DISTINCT FROM current_setting('ytrace_budget_pause.original_oid') THEN RAISE EXCEPTION 'Original function identity changed'; END IF;
 IF ${catalogHash} <> '${newHash}' THEN RAISE EXCEPTION 'Unexpected post-pause catalog'; END IF;
 ${fingerprintLoop}
 IF _data IS DISTINCT FROM current_setting('ytrace_budget_pause.preserved_data')::jsonb THEN RAISE EXCEPTION 'Protected data changed during pause installation'; END IF;
END $pause_post$;
COMMIT;
`;
 await save('budget_deletion_pause_production.sql',sql);
 await save('pause-body.sql',body);
 await save('candidate-manifest.json',{project:'mqqaykksadotbrghbexz',route:'native-pg-direct-tls',sql:'budget_deletion_pause_production.sql',sha256:sha(sql),bytes:Buffer.byteLength(sql),bodySha256:sha(body),before,after,beforeCatalogSha256:oldHash,projectedAfterCatalogSha256:newHash,projectedOnly:true,signature:original.signature,changes:['One existing RPC definition only; preserved OID, owner, grants, signature, security mode, search_path and cost'],migrationHistory:current.catalog.migration_history,locallyMeasuredVersion:(await db.query('select version() version')).rows[0].version});
 // Original cutover remains untouched. Proposal changes only its two catalog hashes.
 const originalCutover=await get('docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql');
 assert.equal(sha(originalCutover),'3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c');
 assert.equal(originalCutover.split(oldHash).length-1,2);
 const proposal=originalCutover.replaceAll(oldHash,newHash);
 await save('future-cutover-gates-proposal.sql',proposal);
 await save('future-cutover-gates.json',{status:'PROJECTED_ONLY_NOT_AUTHORIZED',originalSha256:sha(originalCutover),proposedSha256:sha(proposal),changedOccurrences:2,oldHash,newHash,securityPredicatesUnchanged:true,prerequisite:'Deploy pause only after separate approval, then capture exact full read-only production catalog and confirm the projected fingerprint. Review fresh preservation inventories separately; no baseline is silently adopted.'});
 console.log(JSON.stringify({status:'LOCAL_CANDIDATE_PREPARED',sqlSha256:sha(sql),bytes:Buffer.byteLength(sql),beforeCatalog:oldHash,projectedAfterCatalog:newHash}));
} finally {await db.close();}
