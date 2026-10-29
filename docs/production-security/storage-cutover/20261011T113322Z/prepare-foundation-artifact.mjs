// Offline artifact generation only. Never opens a database or reads credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const directory=resolve('docs/production-security/storage-cutover/20261011T113322Z');
const snapshot=JSON.parse(await readFile(resolve(directory,'production-catalog-final.json'),'utf8'));
if(snapshot.catalog.foundation_present || snapshot.catalog.gateway_rpc_present || snapshot.catalog.migration_history.count!==164 || snapshot.catalog.migration_history.latest!=='20261011230000')throw new Error('Unexpected reviewed baseline');
const sql=await readFile('supabase/migrations/20261009145634_storage_authorization_remediation.sql','utf8');
const expression=await readFile(resolve(directory,'catalog-expression.sql'),'utf8');
const expected=JSON.parse(await readFile(resolve(directory,'expected-foundation-functions.json'),'utf8'));
if(expected.length!==14)throw new Error('Unexpected foundation manifest');
const excluded="ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present']";
const fingerprint="encode(sha256(convert_to((_catalog - "+excluded+")::text,'UTF8')),'hex')";
const triggerNames=['ytrace_remember_template_asset','ytrace_remember_news_asset','ytrace_budget_cleanup','ytrace_liquidation_cleanup','ytrace_ypop_cleanup','ytrace_event_cleanup','ytrace_activity_cleanup','ytrace_move_cleanup'];
const triggerList=triggerNames.map(x=>"'"+x+"'").join(',');
const expectedJson=JSON.stringify(expected);
const candidate=[
'-- PREPARATION ONLY. Separately authorize this exact file/hash before installation.',
'-- Fixed control-plane project: mqqaykksadotbrghbexz. Independently verify its endpoint.',
'-- SQL catalog matching cannot authenticate the control-plane project by itself.',
'-- Standalone foundation ONLY: no policy cutover, gateway deployment or business repair.',
'BEGIN;',
"SET LOCAL lock_timeout='1s';",
"SET LOCAL statement_timeout='30s';",
'DO $storage_preflight$',
'DECLARE _catalog jsonb;',
'BEGIN',
" IF current_database()<>'postgres' OR current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected installation identity'; END IF;",
' _catalog := ('+expression+');',
" IF (_catalog->>'foundation_present')::boolean OR (_catalog->>'gateway_rpc_present')::boolean THEN RAISE EXCEPTION 'Storage foundation already exists; do not retry'; END IF;",
" IF "+fingerprint+" <> '"+snapshot.compatibility_sha256+"' THEN RAISE EXCEPTION 'Exact reviewed production catalog drifted'; END IF;",
'END $storage_preflight$;',
'-- BEGIN unchanged reviewed foundation source; original migration is not edited.',
sql,
'-- END unchanged reviewed foundation source.',
"SELECT ytrace_storage_private.register_trusted_storage_origin('https://mqqaykksadotbrghbexz.supabase.co','Production foundation; separately approved deployment');",
'DO $storage_postflight$',
'DECLARE _catalog jsonb; _actual jsonb;',
'BEGIN',
' _catalog := ('+expression+');',
" IF "+fingerprint+" <> '"+snapshot.compatibility_sha256+"' THEN RAISE EXCEPTION 'Unrelated catalog or permissions changed'; END IF;",
" IF NOT (_catalog->>'foundation_present')::boolean OR NOT (_catalog->>'gateway_rpc_present')::boolean THEN RAISE EXCEPTION 'Missing foundation'; END IF;",
" SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE \"C\") INTO _actual FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ytrace_storage_private' OR (n.nspname='public' AND p.proname='admin_authorize_storage_operation');",
" IF _actual IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'signature' COLLATE \"C\") FROM jsonb_array_elements($reviewed_functions$"+expectedJson+"$reviewed_functions$::jsonb) x) THEN RAISE EXCEPTION 'Foundation source/security/grant mismatch'; END IF;",
" IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ytrace_storage_private' AND c.relkind='r' AND c.relrowsecurity)=4 IS NOT TRUE THEN RAISE EXCEPTION 'Private foundation table/RLS mismatch'; END IF;",
" IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES('anon'),('authenticated')) r(role_name) WHERE n.nspname='ytrace_storage_private' AND c.relkind='r' AND (has_table_privilege(r.role_name,c.oid,'SELECT') OR has_table_privilege(r.role_name,c.oid,'INSERT') OR has_table_privilege(r.role_name,c.oid,'UPDATE') OR has_table_privilege(r.role_name,c.oid,'DELETE'))) THEN RAISE EXCEPTION 'Unexpected browser access to private tables'; END IF;",
" IF (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgenabled='O' AND t.tgname IN ("+triggerList+"))<>8 THEN RAISE EXCEPTION 'Foundation trigger mismatch'; END IF;",
" IF (SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins) IS DISTINCT FROM ARRAY['https://mqqaykksadotbrghbexz.supabase.co'] THEN RAISE EXCEPTION 'Unexpected trusted origin'; END IF;",
" IF EXISTS(SELECT 1 FROM ytrace_storage_private.asset_reference_audit() WHERE published AND form NOT IN ('empty','external') AND NOT resolvable) THEN RAISE EXCEPTION 'Active public asset reference does not resolve'; END IF;",
'END $storage_postflight$;',
'COMMIT;',''
].join('\n');
await writeFile(resolve(directory,'production_storage_foundation_review.sql'),candidate,{flag:'wx'});
const sha=createHash('sha256').update(candidate).digest('hex');
await writeFile(resolve(directory,'foundation-artifact.json'),JSON.stringify({project:'mqqaykksadotbrghbexz',status:'PREPARED ONLY; NOT INSTALLED',sqlSha256:sha,compatibilitySha256:snapshot.compatibility_sha256,sourceSha256:createHash('sha256').update(sql).digest('hex'),migrationHistoryAfter:164,migrationReceipt:'None; external execution receipt required. Stop for a newly reviewed candidate if a DB receipt is mandatory.',atomic:true,lockTimeout:'1s',statementTimeout:'30s'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidateSha256:sha,sourceSha256:createHash('sha256').update(sql).digest('hex')}));

