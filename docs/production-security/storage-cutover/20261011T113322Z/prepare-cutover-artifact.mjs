// Offline packaging only. No database connection, credentials or deployment.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const dir=resolve('docs/production-security/storage-cutover/20261011T113322Z');
const expression=await readFile(resolve(dir,'catalog-expression.sql'),'utf8');
const snapshot=JSON.parse(await readFile(resolve(dir,'production-catalog-final.json'),'utf8'));
const stage=JSON.parse(await readFile(resolve(dir,'staging-deployed-catalog.json'),'utf8'));
const foundation=await readFile(resolve(dir,'production_storage_foundation_review.sql'),'utf8');
const body=await readFile('supabase/migrations/20261009150110_storage_authorization_cutover.sql','utf8');
const functionCheck=foundation.slice(foundation.indexOf(' SELECT jsonb_agg('),foundation.indexOf(" IF (SELECT count(*) FROM pg_class"));
if(!functionCheck.includes('Foundation source/security/grant mismatch'))throw new Error('Expected foundation check missing');
const old=snapshot.catalog.all_policies.filter(p=>p.schemaname==='storage' && p.tablename==='objects');
if(old.length!==15 || stage.policies.length!==9)throw new Error('Unexpected policy manifests');
const expected=JSON.stringify(stage.policies),previous=JSON.stringify(old);
const fp="encode(sha256(convert_to((_catalog - ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex')";
const candidate=[
'-- DRAFT FOR SEPARATE REVIEW/AUTHORIZATION. Not installed. Not an automatic rollout.',
'-- Production control-plane target: mqqaykksadotbrghbexz; independently verify endpoint.',
'-- Requires foundation, deployed gateway, compatible frontend, access checks and',
'-- signed records-owner decisions for this reviewed unmatched-object inventory.',
'-- app.storage_remediation_validated is operator attestation, NOT an auth boundary.',
'-- Do not set it until those prerequisites have actually passed.',
'BEGIN;',
"SET LOCAL lock_timeout='1s';SET LOCAL statement_timeout='30s';",
'DO $storage_cutover_pre$ DECLARE _catalog jsonb; _actual jsonb;',
'BEGIN',
" IF current_database()<>'postgres' OR current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected installation identity'; END IF;",
' _catalog := ('+expression+');',
" IF NOT (_catalog->>'foundation_present')::boolean OR NOT (_catalog->>'gateway_rpc_present')::boolean THEN RAISE EXCEPTION 'Production foundation not installed'; END IF;",
" IF "+fp+" <> '"+snapshot.compatibility_sha256+"' THEN RAISE EXCEPTION 'Exact reviewed production catalog drifted'; END IF;",
functionCheck,
" IF (SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins) IS DISTINCT FROM ARRAY['https://mqqaykksadotbrghbexz.supabase.co'] THEN RAISE EXCEPTION 'Unexpected trusted origin'; END IF;",
'END $storage_cutover_pre$;',
'-- BEGIN unchanged cutover body.',
body,
'-- END unchanged cutover body.',
'DO $storage_cutover_post$ DECLARE _catalog jsonb; _actual jsonb; _restored_policies jsonb;',
'BEGIN',
" SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname COLLATE \"C\") INTO _actual FROM pg_policies p WHERE schemaname='storage' AND tablename='objects';",
" IF _actual IS DISTINCT FROM (SELECT jsonb_agg(p ORDER BY p->>'policyname' COLLATE \"C\") FROM jsonb_array_elements($newpolicies$"+expected+"$newpolicies$::jsonb) p) THEN RAISE EXCEPTION 'Exact restrictive policy set mismatch'; END IF;",
' _catalog := ('+expression+');',
' SELECT jsonb_agg(p ORDER BY p->>\'schemaname\' COLLATE "C",p->>\'tablename\' COLLATE "C",p->>\'policyname\' COLLATE "C") INTO _restored_policies FROM (',
"  SELECT p FROM jsonb_array_elements(_catalog->'all_policies') p WHERE NOT (p->>'schemaname'='storage' AND p->>'tablename'='objects')",
"  UNION ALL SELECT p FROM jsonb_array_elements($oldpolicies$"+previous+"$oldpolicies$::jsonb) p",
' ) baseline_policy_projection;',
" _catalog := jsonb_set(_catalog,'{all_policies}',_restored_policies);",
" IF "+fp+" <> '"+snapshot.compatibility_sha256+"' THEN RAISE EXCEPTION 'Unrelated catalog changed during cutover'; END IF;",
functionCheck,
'END $storage_cutover_post$;',
'COMMIT;',''
].join('\n');
await writeFile(resolve(dir,'production_storage_policy_cutover_review.sql'),candidate,{flag:'wx'});
await writeFile(resolve(dir,'cutover-artifact.json'),JSON.stringify({status:'DRAFT; external prerequisites BLOCKED; NOT INSTALLED',project:'mqqaykksadotbrghbexz',sqlSha256:createHash('sha256').update(candidate).digest('hex'),sourceSha256:createHash('sha256').update(body).digest('hex'),sourcePolicies:15,removedPolicies:12,addedPolicies:6,finalPolicies:9,migrationHistoryAfter:164,migrationReceipt:'None; external execution receipt. Stop if a DB receipt is mandatory.',atomic:true,lockTimeout:'1s',statementTimeout:'30s'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cutoverSha256:createHash('sha256').update(candidate).digest('hex')}));

