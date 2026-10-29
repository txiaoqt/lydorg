// Offline tests: fake pg sessions, local filesystem and Node hostname verification.
// No credential reads, network clients, production/staging contacts or installation mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {checkServerIdentity} from 'node:tls';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
 TARGET,SQL_SHA,SQL_BYTES,CATALOG_SHA,HISTORY,sha256,GuardError,safeError,
 verifyArtifact,verifyEndpoint,missingEnvironment,connectionConfiguration,connectClientOnce,
 verifyCatalog,verifyData,verifyNativeIdentity,verifyControlPlane,verifyAuthorization,
 selectRow,verifyPostflight,durableJson,claimLock,singleAttempt,
} from './runner-core.mjs';
const sql=await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql');
const catalog=JSON.parse(await readFile('docs/production-security/storage-cutover/diagnostics/20261011T125750Z/catalog-readonly.json','utf8'));
const data=JSON.parse(await readFile('docs/production-security/storage-cutover/executions/20261011T122743Z/immediate-data-before.json','utf8'));
const functions=JSON.parse(await readFile('docs/production-security/storage-cutover/20261011T113322Z/expected-foundation-functions.json','utf8'));
const clone=value=>structuredClone(value);
const sentinel='OFFLINE_SENTINEL_NOT_A_REAL_CREDENTIAL';
const scratch=()=>mkdtemp(resolve(tmpdir(),'ytrace-native-runner-offline-'));
const authorization=()=>({version:1,approved:true,project:TARGET.project,host:TARGET.host,route:TARGET.route,sqlSha256:SQL_SHA,sqlBytes:SQL_BYTES,runnerBundleSha256:'a'.repeat(64),caSha256:'b'.repeat(64),authorizationReference:'offline-only-approval',approvedAt:'2026-10-11T13:00:00Z',expiresAt:'2026-10-11T13:20:00Z',exclusiveWindowConfirmed:true});
const now=Date.parse('2026-10-11T13:10:00Z');
function offlineCli(args){
 const env={};for(const name of ['PATH','SystemRoot','WINDIR','TEMP','TMP'])if(process.env[name])env[name]=process.env[name];
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./native-foundation-runner.mjs',import.meta.url)),...args],{env,encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.error,undefined);assert.equal(result.stderr,'');
 return {exitCode:result.status,output:JSON.parse(result.stdout)};
}
async function context(query,postflight=async()=>{}){
 const dir=await scratch(),lock=await claimLock(resolve(dir,'operation.lock.json'));
 return {client:{query},sqlBytes:sql,markerPath:resolve(dir,'attempt.json'),receiptPath:resolve(dir,'receipt.json'),lock,postflight};
}

test('exact reviewed artifact bytes and atomic timeouts are retained',()=>{
 assert.equal(sql.length,SQL_BYTES);assert.equal(sha256(sql),SQL_SHA);
 assert.equal(verifyArtifact(sql),sql.toString('utf8'));
});
test('truncated and same-length changed artifacts are rejected',()=>{
 assert.throws(()=>verifyArtifact(sql.subarray(1)),/ARTIFACT_MISMATCH/);
 const changed=Buffer.from(sql);changed[0]^=1;
 assert.throws(()=>verifyArtifact(changed),/ARTIFACT_MISMATCH/);
});
test('wrong project, host, port and pooled route are rejected',()=>{
 for(const [key,value] of [['project','zroudsvpswqsjlyttkjf'],['host','wrong.invalid'],['port',6543],['route','pooler']])assert.throws(()=>verifyEndpoint({...TARGET,[key]:value}),/ENDPOINT_MISMATCH/);
});
test('missing credentials and CA stop before any connection',async()=>{
 assert.equal(missingEnvironment({}).length,3);
 await assert.rejects(connectionConfiguration({}),/MISSING_NATIVE_CREDENTIAL_OR_CA/);
});
test('wrong CA hash fails and verified config cannot disable hostname/chain validation',async()=>{
 const dir=await scratch(),caPath=resolve(dir,'offline-ca.txt'),bytes=Buffer.from('offline fixture; not a production CA');
 await writeFile(caPath,bytes);
 const env={YTRACE_PRODUCTION_DB_PASSWORD:sentinel,YTRACE_PRODUCTION_DB_CA_FILE:caPath,YTRACE_PRODUCTION_DB_CA_SHA256:sha256(bytes)};
 await assert.rejects(connectionConfiguration({...env,YTRACE_PRODUCTION_DB_CA_SHA256:'0'.repeat(64)}),/CA_HASH_MISMATCH/);
 const configuration=await connectionConfiguration(env);
 assert.equal(configuration.host,TARGET.host);assert.equal(configuration.ssl.servername,TARGET.host);
 assert.equal(configuration.ssl.rejectUnauthorized,true);assert.match(configuration.options,/default_transaction_read_only=on/);
 assert.equal(configuration.query_timeout,0);
 for(const bad of [{PGHOST:'wrong.invalid'},{PGSSLMODE:'disable'},{PGOPTIONS:'unsafe'},{NODE_TLS_REJECT_UNAUTHORIZED:'0'}])await assert.rejects(connectionConfiguration({...env,...bad}));
});
test('Node TLS hostname verifier rejects a wrong certificate identity',()=>{
 const error=checkServerIdentity(TARGET.host,{subjectaltname:'DNS:wrong.invalid'});
 assert.equal(error.code,'ERR_TLS_CERT_ALTNAME_INVALID');
 assert.equal(safeError({...error,message:sentinel}).databaseCode,'ERR_TLS_CERT_ALTNAME_INVALID');
 assert.equal(JSON.stringify(safeError({...error,message:sentinel})).includes(sentinel),false);
});
test('TLS chain failure closes the sole fake client and cannot submit or retry',async()=>{
 const calls={construct:0,connect:0,end:0,query:0};
 class FakeClient {
   constructor(){calls.construct++;}on(){}
   async connect(){calls.connect++;throw Object.assign(new Error(sentinel),{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'});}
   async end(){calls.end++;}async query(){calls.query++;}
 }
 const configuration={host:TARGET.host,port:TARGET.port,database:TARGET.database,user:TARGET.user,ssl:{rejectUnauthorized:true,servername:TARGET.host}};
 await assert.rejects(connectClientOnce(FakeClient,configuration),error=>{
   const sanitized=JSON.stringify(safeError(error));assert.equal(sanitized.includes(sentinel),false);return error.code==='UNABLE_TO_VERIFY_LEAF_SIGNATURE';
 });
 assert.deepEqual(calls,{construct:1,connect:1,end:1,query:0});
 await assert.rejects(connectClientOnce(FakeClient,{...configuration,host:'wrong.invalid'}),/NATIVE_CLIENT_CONFIGURATION_MISMATCH/);
 assert.equal(calls.construct,1);
});
test('native identity requires reviewed version, roles, privileges and read-only TLS',()=>{
 const identity={database:'postgres',current_user:'postgres',session_user:'postgres',read_only:'on',tls:true,tls_version:'TLSv1.3',server_version_num:170006,server_port:5432,environment_guard:false,database_create:true,public_create:true,browser_service_role_membership:false,function_owner_counts:{postgres:251,supabase_admin:45},required_roles:['anon','authenticated','postgres','service_role'],trigger_tables:Array.from({length:8},()=>({owner:'postgres',select:true,trigger:true}))};
 verifyNativeIdentity(identity);
 for(const change of [{tls:false},{read_only:'off'},{server_version_num:170007},{database_create:false},{function_owner_counts:{postgres:296}}])assert.throws(()=>verifyNativeIdentity({...identity,...change}));
});
test('unexpected compatibility, history, policy and protection drift stop preflight',()=>{
 verifyCatalog(catalog);
 assert.throws(()=>verifyCatalog({...catalog,compatibility_sha256:'0'.repeat(64)}),/CATALOG_FINGERPRINT_MISMATCH/);
 const history=clone(catalog);history.catalog.migration_history.count=165;
 assert.throws(()=>verifyCatalog(history),/MIGRATION_HISTORY_MISMATCH/);
 const policies=clone(catalog);policies.catalog.all_policies.pop();assert.throws(()=>verifyCatalog(policies));
 const triggers=clone(catalog);triggers.catalog.triggers.find(t=>t.name==='a_document_mutation_guard').enabled='D';assert.throws(()=>verifyCatalog(triggers),/EXISTING_SECURITY_TRIGGER_MISMATCH/);
});
test('all 57 protected data/object/reference fingerprints must match',()=>{
 verifyData(data,data);
 const changed=clone(data);changed.preserved_data.find(row=>row.relation==='storage.objects').content_fingerprint='0'.repeat(32);
 assert.throws(()=>verifyData(changed,data),/PROTECTED_DATA_OR_REFERENCE_DRIFT/);
 assert.throws(()=>verifyData({...data,read_only:'off'},data));
});
test('control-plane proof must match the fixed endpoint and remain fresh',()=>{
 const proof={project:TARGET.project,host:TARGET.host,status:'ACTIVE_HEALTHY',verifiedVia:'supabase-control-plane-get-project',verifiedAt:'2026-10-11T13:09:00Z'};
 verifyControlPlane(proof,now);
 assert.throws(()=>verifyControlPlane({...proof,host:'wrong.invalid'},now));
 assert.throws(()=>verifyControlPlane({...proof,verifiedAt:'2026-10-11T12:00:00Z'},now));
});
test('future authorization is scoped to SQL, native route, code bundle, CA and exclusive window',()=>{
 const valid=authorization();verifyAuthorization(valid,'a'.repeat(64),'b'.repeat(64),now);
 for(const change of [{approved:false},{project:'zroudsvpswqsjlyttkjf'},{route:'mcp'},{sqlSha256:'0'.repeat(64)},{exclusiveWindowConfirmed:false},{expiresAt:'2026-10-11T13:01:00Z'},{unrecognized:sentinel}])assert.throws(()=>verifyAuthorization({...valid,...change},'a'.repeat(64),'b'.repeat(64),now));
});
test('read-only query result must include COMMIT acknowledgement',()=>{
 assert.throws(()=>selectRow([{command:'SELECT',rows:[{catalog:{}}]}],'catalog'),/READ_ONLY_TRANSACTION_NOT_COMMITTED/);
});
test('same-machine lock is exclusive; stale locks are never auto-cleared',async()=>{
 const dir=await scratch(),path=resolve(dir,'operation.lock.json');
 const results=await Promise.allSettled([claimLock(path),claimLock(path)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await results.find(r=>r.status==='fulfilled').value.release();
 await durableJson(path,{pid:999999999,nonce:'stale-offline-fixture'});
 await assert.rejects(claimLock(path),error=>error.code==='EEXIST');
 assert.equal(JSON.parse(await readFile(path,'utf8')).nonce,'stale-offline-fixture');
});
test('a changed foreign lock cannot be released',async()=>{
 const dir=await scratch(),path=resolve(dir,'operation.lock.json'),lock=await claimLock(path);
 await writeFile(path,JSON.stringify({nonce:'different-owner'}));
 await assert.rejects(lock.release(),/LOCK_OWNERSHIP_MISMATCH/);
 assert.equal(JSON.parse(await readFile(path,'utf8')).nonce,'different-owner');
});
test('single attempt sends the exact complete SQL once; durable marker prevents a second send',async()=>{
 const queries=[],ctx=await context(async text=>{queries.push(text);return [{command:'BEGIN'},{command:'COMMIT'}];});
 const result=await singleAttempt(ctx);assert.equal(result.status,'COMMITTED_AND_VERIFIED');
 assert.deepEqual(queries,[sql.toString('utf8')]);
 assert.equal(JSON.parse(await readFile(ctx.markerPath,'utf8')).attempt,1);
 await assert.rejects(singleAttempt({...ctx,receiptPath:ctx.receiptPath+'.second'}),error=>error.code==='EEXIST');
 assert.equal(queries.length,1);await ctx.lock.release();
});
test('ambiguous response is never retried; marker and lock remain, logs have no secrets',async()=>{
 let calls=0;
 const ctx=await context(async()=>{calls++;throw Object.assign(new Error(sentinel),{code:'ECONNRESET',detail:sentinel,query:sentinel,connectionString:sentinel});});
 const result=await singleAttempt(ctx);
 assert.equal(result.status,'UNKNOWN_TRANSACTION_OUTCOME');assert.equal(result.committed,null);assert.equal(calls,1);
 assert.equal((await readFile(ctx.receiptPath,'utf8')).includes(sentinel),false);
 await ctx.lock.verify();await access(ctx.markerPath);
 await assert.rejects(singleAttempt({...ctx,receiptPath:ctx.receiptPath+'.second'}));assert.equal(calls,1);
});
test('missing COMMIT acknowledgement is uncertain and never triggers resubmission',async()=>{
 let calls=0;const ctx=await context(async()=>{calls++;return [{command:'BEGIN'},{command:'SELECT'}];});
 const result=await singleAttempt(ctx);assert.equal(result.status,'UNKNOWN_TRANSACTION_OUTCOME');assert.equal(calls,1);
});
test('server connection SQLSTATE remains ambiguous even with ERROR severity',async()=>{
 let calls=0;const ctx=await context(async()=>{calls++;throw Object.assign(new Error(sentinel),{severity:'ERROR',code:'08006'});});
 const result=await singleAttempt(ctx);assert.equal(result.status,'UNKNOWN_TRANSACTION_OUTCOME');assert.equal(result.rollbackAcknowledged,false);assert.equal(calls,1);
});
test('known PostgreSQL error permits only ROLLBACK and still requires reconciliation',async()=>{
 const queries=[],ctx=await context(async text=>{
   queries.push(text);if(text==='ROLLBACK;')return {command:'ROLLBACK'};
   throw Object.assign(new Error(sentinel),{severity:'ERROR',code:'23514'});
 });
 const result=await singleAttempt(ctx);
 assert.equal(result.status,'ERROR_ROLLBACK_ACKNOWLEDGED_RECONCILIATION_REQUIRED');assert.equal(result.rollbackAcknowledged,true);
 assert.deepEqual(queries,[sql.toString('utf8'),'ROLLBACK;']);await ctx.lock.verify();
});
test('failure after COMMIT is reported as committed; no rollback or reinstall',async()=>{
 let calls=0;const ctx=await context(async()=>{calls++;return [{command:'COMMIT'}];},async()=>{throw new GuardError('POSTFLIGHT_FAILURE');});
 const result=await singleAttempt(ctx);assert.equal(result.status,'COMMITTED_POSTFLIGHT_FAILED');assert.equal(result.committed,true);assert.equal(calls,1);await ctx.lock.verify();
});
test('postflight validates exact source/ACLs, trigger bindings, private tables and canonical assets',()=>{
 const tableGrants=()=>Object.fromEntries(['select','insert','update','delete','truncate','references','trigger'].map(p=>[p,false]));
 const post={environment_guard:false,storage_policy_count:15,trusted_origins:['https://mqqaykksadotbrghbexz.supabase.co'],functions:functions.map(f=>({...f,public_execute:false,effective_grants:Object.fromEntries(['anon','authenticated','service_role'].map(role=>[role,f.acl.includes(role+'=X/')]))})),tables:['admin_asset_uploads','asset_bindings','cleanup_receipts','trusted_storage_origins'].map(name=>({table:'ytrace_storage_private.'+name,owner:'postgres',rls:true,public_dml:false,effective_grants:{anon:tableGrants(),authenticated:tableGrants(),service_role:tableGrants()}})),triggers:[...sql.toString('utf8').matchAll(/^CREATE TRIGGER\b[\s\S]*?;/gm)].map(m=>({enabled:'O',definition:m[0]})),current_template_resolution:{total:13,resolved:13,objects_exist:13},published_news_resolution:{published:3,resolved:3,objects_exist:3},asset_audit:[]};
 verifyPostflight(post,functions,sql.toString('utf8'));
 const changed=clone(post);changed.functions[0].source_md5='0'.repeat(32);assert.throws(()=>verifyPostflight(changed,functions,sql.toString('utf8')));
 const trigger=clone(post);trigger.triggers[0].definition=trigger.triggers[0].definition.replace('template_url','id');assert.throws(()=>verifyPostflight(trigger,functions,sql.toString('utf8')));
 const table=clone(post);table.tables[0].effective_grants.anon.select=true;assert.throws(()=>verifyPostflight(table,functions,sql.toString('utf8')));
});
test('default CLI mode reviews offline; installation stays inactive',()=>{
 const result=offlineCli([]);assert.equal(result.exitCode,0);assert.equal(result.output.status,'PASS');assert.equal(result.output.mode,'OFFLINE_REVIEW');assert.equal(result.output.sqlSha256,SQL_SHA);assert.equal(result.output.connectionAttempted,false);assert.equal(result.output.installationActivated,false);
});
test('CLI preflight with isolated empty environment stops before connecting',()=>{
 const result=offlineCli(['--preflight']);assert.equal(result.exitCode,2);assert.equal(result.output.status,'BLOCKED');assert.equal(result.output.missing.length,3);assert.equal(result.output.connectionAttempted,false);assert.equal(result.output.installationActivated,false);
});
test('CLI refuses arbitrary SQL, project and endpoint arguments',()=>{
 for(const args of [['--sql'],['--project'],['--url'],['--review','postgres://wrong.invalid']]){
   const result=offlineCli(args);assert.equal(result.exitCode,2);assert.equal(result.output.error.code,'UNSUPPORTED_ARGUMENT');
 }
});
