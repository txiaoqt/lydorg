import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile,stat,readdir,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkServerIdentity} from 'node:tls';
import {loadReviewedInputs,invokeAcl,captureSnapshot} from './native-budget-pause-runner.mjs';
import {
  TARGET,SQL_PATH,SQL_SHA,SQL_BYTES,PRE_CATALOG_SHA,POST_CATALOG_SHA,
  sha256,hashJson,verifyFixedTarget,verifyBudgetSql,verifyPinnedFile,connectionConfiguration,connectClientOnce,safeError,
  validateVerifierResult,expectedRelationsFromSql,normalizeProtectedData,protectedDataDigest,
  ORIGINAL_INVENTORY_PATH,ORIGINAL_INVENTORY_SHA,BUDGET_INVENTORY_PATH,READ_ONLY_SQL_CONTRACTS,
  verifyReadOnlySqlContract,verifyReadOnlyInputContracts,verifyBudgetInventoryCopy,validateReadOnlyVerifierResult,
  verifyBudgetState,validateBudgetStateShape,verifyNativeIdentity,verifyControlPlaneProof,
  verifyAuthorization,verifyFoundationReceipt,foundationStructure,stableFoundation,
  comparePreservation,verifyTlsSocket,environmentSafety,createInstallApplicationName,
  bundleSha256,checkManifestShape,durableCreateJson,claimBudgetLock,runOneShot,
  verifyOriginalBackendFinished,classifyReconciliation,scrubReceiptValue,
} from './budget-runner-core.mjs';

const root=resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const adapterDir=resolve(fileURLToPath(new URL('.',import.meta.url)));
const sqlPath=resolve(root,SQL_PATH);
const dataSqlPath=resolve(root,BUDGET_INVENTORY_PATH);
const originalDataSqlPath=resolve(root,ORIGINAL_INVENTORY_PATH);
const foundationReceiptPath=resolve(root,'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json');
const psAcl=resolve(adapterDir,'operation-acl.ps1');
const manifestPath=resolve(adapterDir,'reviewed-inputs.json');

async function tempDir(){return await mkdtemp(join(tmpdir(),'ytrace-budget-pause-test-'));}
async function cleanup(path){await rm(path,{recursive:true,force:true});}
function fakeLock(){return {claim:{pid:process.pid,nonce:'test-lock-nonce'},verify:async()=>{},release:async()=>{}};}
function testAppIdentity(){return {nonce:'12345678-1234-4234-8234-123456789abc',applicationName:'ytrace-budget-pause-i-12345678-1234-4234-8234-123456789abc',backendPid:31337,backendStart:'2026-10-13T00:00:00.000Z',runnerBundleSha256:'a'.repeat(64)};}

test('pins the approved SQL bytes, digest, one target routine, transaction and timeouts',async()=>{
  const bytes=await readFile(sqlPath);
  assert.equal(bytes.length,SQL_BYTES);
  assert.equal(sha256(bytes),SQL_SHA);
  assert.ok(verifyBudgetSql(bytes).includes("SET LOCAL lock_timeout='1s';"));
  const altered=Buffer.from(bytes);altered[altered.length-4]^=1;
  assert.throws(()=>verifyBudgetSql(altered),/BUDGET_SQL_ARTIFACT_MISMATCH/);
});

test('rejects alternate project, endpoint, SQL path and mismatched input pins',async()=>{
  assert.throws(()=>verifyFixedTarget({...TARGET,project:'mqqaykksadotbrghbexz-evil'}),/TARGET_MISMATCH/);
  assert.throws(()=>verifyFixedTarget({...TARGET,host:'db.other.supabase.co'}),/TARGET_MISMATCH/);
  await assert.rejects(()=>verifyPinnedFile(root,{file:'../../outside.sql',bytes:1,sha256:'0'.repeat(64)}),/INPUT_PATH_ESCAPE/);
  assert.throws(()=>checkManifestShape({version:1,nodeVersion:'v24.21.0',driverVersion:'8.23.0',target:TARGET,sql:{file:SQL_PATH,bytes:SQL_BYTES,sha256:'0'.repeat(64)},inputs:{}}),/REVIEWED_SQL_PIN_MISMATCH/);
});

test('complete reviewed manifest pins every helper, verifier, input and pg runtime file identity',async()=>{
  const loaded=await loadReviewedInputs();
  assert.equal(loaded.inputs.sql.length,SQL_BYTES);
  assert.equal(loaded.relations.length,57);
  assert.equal(loaded.driver.files.length,138);
  assert.equal(loaded.codeHashes.length,4);
  assert.match(loaded.bundleSha256,/^[a-f0-9]{64}$/);
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  assert.equal(manifest.driverTree.inventory.length,138);
  assert.equal(manifest.codeIdentities.length,4);
  assert.throws(()=>checkManifestShape({...manifest,driverTree:{...manifest.driverTree,sha256:'0'.repeat(64)}}),/REVIEWED_DRIVER_TREE_INVENTORY_MISMATCH/);
  assert.throws(()=>checkManifestShape({...manifest,codeIdentities:manifest.codeIdentities.slice(1)}),/REVIEWED_CODE_IDENTITY_SET_INVALID/);
});

test('runner rejects arbitrary SQL, endpoint and multi-argument execution requests before loading a connection',async()=>{
  const runnerPath=resolve(adapterDir,'native-budget-pause-runner.mjs');
  const output=await new Promise((resolvePromise,reject)=>{
    const child=spawn(process.execPath,[runnerPath,'--review','--sql','https://wrong.example/query'],{windowsHide:true,stdio:['ignore','pipe','ignore']});
    let stdout='';child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>stdout+=chunk);child.on('error',reject);child.on('close',code=>code===2?resolvePromise(stdout.trim()):reject(new Error('UNSUPPORTED_RUNNER_REQUEST_EXIT_MISMATCH')));
  });
  const result=JSON.parse(output);
  assert.equal(result.status,'BLOCKED');assert.equal(result.error.code,'UNSUPPORTED_ARGUMENT');assert.equal(result.automaticRetries,0);assert.equal(result.project,TARGET.project);
});

test('only the declared read-only ROLLBACK terminal tag is accepted',()=>{
  const good=[{command:'BEGIN'},{command:'SELECT',rows:[{verification:{read_only:'on'}}]},{command:'ROLLBACK'}];
  assert.deepEqual(validateVerifierResult(good,'verification'),{read_only:'on'});
  assert.throws(()=>validateVerifierResult([...good.slice(0,-1),{command:'COMMIT'}],'verification'),/READ_ONLY_TERMINAL_TAG_MISMATCH/);
  assert.throws(()=>validateVerifierResult([{command:'ROLLBACK',rows:[{verification:{}},{verification:{}}]}],'verification'),/READ_ONLY_RESULT_SHAPE_MISMATCH/);
});

test('actual SQL inventory copy preserves the original bytes and all 57 ordered definitions',async()=>{
  const original=await readFile(originalDataSqlPath),budget=await readFile(dataSqlPath);
  assert.equal(original.length,13900);assert.equal(sha256(original),ORIGINAL_INVENTORY_SHA);
  assert.equal(budget.length,13902);
  assert.equal(sha256(budget),'459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34');
  assert.deepEqual(budget,Buffer.from(original.toString('utf8').replace(/COMMIT;(\s*)$/,'ROLLBACK;$1'),'utf8'));
  assert.equal(budget.toString('utf8').replace(/ROLLBACK;(\s*)$/,'COMMIT;$1'),original.toString('utf8'));
  const definitions=bytes=>[...bytes.toString('utf8').matchAll(/SELECT\s+'((?:public|auth|storage)\.[a-zA-Z0-9_]+)'\s+AS\s+relation/gi)].map(match=>match[1]);
  assert.equal(definitions(original).length,57);
  assert.deepEqual(definitions(budget),definitions(original));
  assert.deepEqual(verifyBudgetInventoryCopy(original,budget),expectedRelationsFromSql(original));
  assert.throws(()=>verifyBudgetInventoryCopy(original,Buffer.from(budget.toString('utf8').replace('md5(','max('))),/BUDGET_INVENTORY_COPY_MISMATCH/);
});

function readOnlyDriverResult(inputName,row){
  return [{command:'BEGIN',rows:[]},{command:'SET',rows:[]},{command:'SELECT',rowCount:1,rows:[row]},{command:READ_ONLY_SQL_CONTRACTS[inputName].terminal,rows:[]}];
}

test('actual SQL inputs each satisfy their declared isolation, timeout, result and terminal contract',async()=>{
  const loaded=await loadReviewedInputs();
  const contracts=verifyReadOnlyInputContracts(loaded.inputs);
  assert.equal(contracts.length,6);
  for(const contract of contracts){
    assert.equal(contract.readOnly,true);assert.equal(contract.isolation,'REPEATABLE READ');assert.equal(contract.statementCount,4);
    assert.equal(contract.terminal,contract.referenceOnly?'COMMIT':'ROLLBACK');
    assert.equal(contract.statementTimeout,contract.input==='identitySql'?'10s':'20s');
    if(!contract.referenceOnly){
      const row={captured_at:'2026-10-13T00:00:00Z',read_only:'on',[contract.resultKey]:{synthetic:true}};
      const value=validateReadOnlyVerifierResult(readOnlyDriverResult(contract.input,row),contract.input);
      assert.deepEqual(value,contract.rowEnvelope?row:row[contract.resultKey]);
    }
  }
  assert.equal(verifyBudgetSql(loaded.inputs.sql).trimEnd().endsWith('COMMIT;'),true);
  assert.throws(()=>verifyReadOnlySqlContract(loaded.inputs.sql,'protectedDataSql'),/READ_ONLY_SQL_STATEMENT_COUNT_MISMATCH/);
  assert.throws(()=>verifyReadOnlySqlContract(loaded.inputs.originalProtectedDataSql,'originalProtectedDataSql'),/READ_ONLY_SQL_INPUT_NOT_EXECUTABLE/);
});

test('actual SQL regression reproduces the original terminal mismatch and retains the inventory row envelope',async()=>{
  const original=await readFile(originalDataSqlPath),budget=await readFile(dataSqlPath);
  assert.equal(verifyReadOnlySqlContract(original,'originalProtectedDataSql',{execution:false}).terminal,'COMMIT');
  const relations=expectedRelationsFromSql(budget);
  const row={captured_at:'2026-10-13T00:00:00Z',read_only:'on',preserved_data:relations.map(relation=>({relation,row_count:0,content_fingerprint:'0'.repeat(32)}))};
  assert.match(budget.toString('utf8'),/SELECT clock_timestamp\(\) AS captured_at, current_setting\('transaction_read_only'\) AS read_only, jsonb_agg\(to_jsonb\(x\) ORDER BY relation COLLATE "C"\) AS preserved_data FROM/);
  const originalResult=readOnlyDriverResult('originalProtectedDataSql',row);
  assert.throws(()=>validateVerifierResult(originalResult,'preserved_data','ROLLBACK'),/READ_ONLY_TERMINAL_TAG_MISMATCH/);
  assert.throws(()=>validateReadOnlyVerifierResult(originalResult,'protectedDataSql'),/READ_ONLY_TERMINAL_TAG_MISMATCH/);
  assert.throws(()=>verifyReadOnlySqlContract(original,'protectedDataSql'),/READ_ONLY_SQL_TERMINAL_MISMATCH/);
  const result=readOnlyDriverResult('protectedDataSql',row);
  // The old generic extraction loses read_only; actual inventory results need the whole row.
  assert.throws(()=>protectedDataDigest(validateVerifierResult(result,'preserved_data'),relations),/PROTECTED_DATA_RESULT_INVALID/);
  assert.deepEqual(validateReadOnlyVerifierResult(result,'protectedDataSql'),row);
  assert.equal(protectedDataDigest(validateReadOnlyVerifierResult(result,'protectedDataSql'),relations).rows.length,57);
});

test('actual SQL contract drift and data-changing statements are rejected before a mocked native connection',async()=>{
  const loaded=await loadReviewedInputs(),text=loaded.inputs.protectedDataSql.toString('utf8');
  const cases=[
    [text.replace('READ ONLY','READ WRITE'),'READ_ONLY_SQL_TRANSACTION_MODE_MISMATCH'],
    [text.replace('REPEATABLE READ','READ COMMITTED'),'READ_ONLY_SQL_TRANSACTION_MODE_MISMATCH'],
    [text.replace("statement_timeout='20s'","statement_timeout='30s'"),'READ_ONLY_SQL_TIMEOUT_MISMATCH'],
    [text.replace(/ROLLBACK;(\s*)$/,'COMMIT;$1'),'READ_ONLY_SQL_TERMINAL_MISMATCH'],
    [text.replace('SELECT clock_timestamp()',"WITH changed AS (DELETE FROM public.organization_profiles RETURNING *) SELECT clock_timestamp()"),'READ_ONLY_SQL_DATA_CHANGE_FORBIDDEN'],
    [text.replace('SELECT clock_timestamp()',"SELECT set_config('role','postgres',true), clock_timestamp()"),'READ_ONLY_SQL_DATA_CHANGE_FORBIDDEN'],
    [text.replace('SELECT clock_timestamp()',"SELECT nextval('public.sequence'), clock_timestamp()"),'READ_ONLY_SQL_DATA_CHANGE_FORBIDDEN'],
    [text.replace('AS preserved_data FROM','AS preserved_data INTO public.bad_snapshot FROM'),'READ_ONLY_SQL_DATA_CHANGE_FORBIDDEN'],
    [text.replace('ROLLBACK;','DELETE FROM public.organization_profiles; ROLLBACK;'),'READ_ONLY_SQL_STATEMENT_COUNT_MISMATCH'],
    [text.replace('ROLLBACK;','ROLLBACK; COMMIT;'),'READ_ONLY_SQL_STATEMENT_COUNT_MISMATCH'],
    [text.replace('AS preserved_data FROM','AS unexpected_result FROM'),'READ_ONLY_SQL_RESULT_KEY_MISMATCH'],
    [text+'/* unclosed','READ_ONLY_SQL_UNTERMINATED_COMMENT'],
    [text+"SELECT 'unclosed",'READ_ONLY_SQL_UNTERMINATED_LITERAL'],
    [text.replace('SELECT clock_timestamp()',"SELECT $$DELETE$$, clock_timestamp()"),'READ_ONLY_SQL_UNSUPPORTED_LEXICAL_FORM'],
  ];
  let connected=0;
  for(const [changed,code] of cases){
    const inputs={...loaded.inputs,protectedDataSql:Buffer.from(changed,'utf8')};
    await assert.rejects(async()=>{verifyReadOnlyInputContracts(inputs);connected++;},error=>error.message===code);
  }
  assert.equal(connected,0);
  assert.throws(()=>verifyReadOnlySqlContract(loaded.inputs.identitySql,'unknownInput'),/READ_ONLY_SQL_INPUT_NOT_EXECUTABLE/);
  assert.throws(()=>validateReadOnlyVerifierResult(readOnlyDriverResult('originalProtectedDataSql',{}),'originalProtectedDataSql'),/READ_ONLY_SQL_INPUT_NOT_EXECUTABLE/);
  // Words inside comments and literals are not executed statements.
  assert.equal(verifyReadOnlySqlContract(Buffer.from(text.replace('SELECT clock_timestamp()',"/* DELETE; /* UPDATE */ */ SELECT 'DELETE; UPDATE' AS ignored_literal, clock_timestamp()")),'protectedDataSql').terminal,'ROLLBACK');
});

test('actual SQL result parsing refuses alternate terminal tags, command sequences and duplicate envelopes',async()=>{
  const loaded=await loadReviewedInputs();
  for(const inputName of Object.keys(READ_ONLY_SQL_CONTRACTS).filter(name=>!READ_ONLY_SQL_CONTRACTS[name].referenceOnly)){
    verifyReadOnlySqlContract(loaded.inputs[inputName],inputName);
    const key=READ_ONLY_SQL_CONTRACTS[inputName].key,result=readOnlyDriverResult(inputName,{[key]:{read_only:'on'}});
    assert.throws(()=>validateReadOnlyVerifierResult([...result.slice(0,-1),{command:'COMMIT'}],inputName),/READ_ONLY_TERMINAL_TAG_MISMATCH/);
    assert.throws(()=>validateReadOnlyVerifierResult([result[0],{command:'DELETE'},...result.slice(1)],inputName),/READ_ONLY_COMMAND_SEQUENCE_MISMATCH/);
    assert.throws(()=>validateReadOnlyVerifierResult([result[0],result[1],{command:'SELECT',rows:[{[key]:{}},{[key]:{}}]},result[3]],inputName),/READ_ONLY_RESULT_SHAPE_MISMATCH/);
    assert.throws(()=>validateReadOnlyVerifierResult([result[0],result[1],{command:'SELECT',rows:[{unexpected:{}}]},result[3]],inputName),/READ_ONLY_RESULT_SHAPE_MISMATCH/);
  }
});

test('actual SQL runner snapshot uses all four executable preflight inputs with mocked pg row shapes',async()=>{
  const loaded=await loadReviewedInputs(),applicationName='ytrace-budget-pause-r-12345678-1234-4234-8234-123456789abc';
  const foundation=JSON.parse(await readFile(foundationReceiptPath,'utf8')).foundation;
  const identity={database:'postgres',current_user:'postgres',session_user:'postgres',server_version_num:170006,server_port:5432,transaction_read_only:'on',default_transaction_read_only:'on',tls:true,tls_version:'TLSv1.3',application_name:applicationName,backend_pid:55,backend_start:'2026-10-13T00:00:00Z',database_connect:true,owns_target_function:true,public_usage:true,public_create:true,plpgsql_usage:true,text_type_usage:true,uuid_array_type_usage:true,jsonb_type_usage:true,all_eight_protected_relations_selectable:true,pg_read_all_stats:true,active_budget_deletion_calls:0,other_budget_install_sessions:0};
  const inventory={captured_at:'2026-10-13T00:00:00Z',read_only:'on',preserved_data:loaded.relations.map(relation=>({relation,row_count:0,content_fingerprint:'0'.repeat(32)}))};
  const rows={identitySql:{native_identity:identity},preSql:{verification:readBudgetShape('pre')},protectedDataSql:inventory,foundationSql:{foundation_verification:foundation}};
  const calls=[];
  const client={async query(text){
    const name=Object.keys(rows).find(name=>loaded.inputs[name].toString('utf8')===text);
    assert.ok(name,'no install SQL or arbitrary query may be submitted to this mock');
    verifyReadOnlySqlContract(Buffer.from(text),name);calls.push(name);return readOnlyDriverResult(name,rows[name]);
  }};
  const snapshot=await captureSnapshot(client,loaded,{applicationName,readOnly:true,caSha256:'a'.repeat(64),peerTls:{chainVerified:true,hostnameVerified:true,protocol:'TLSv1.3',peerCertificateFingerprint256:'OFFLINE-MOCK'},controlPlaneSha256:'b'.repeat(64)});
  assert.deepEqual(calls,['identitySql','preSql','protectedDataSql','foundationSql']);
  assert.equal(snapshot.status,'READ_ONLY_PREFLIGHT_PASS');assert.equal(snapshot.protectedData.preserved_data.length,57);
  assert.equal(snapshot.protectedData.read_only,'on');assert.equal(snapshot.budget.compatibility_sha256,PRE_CATALOG_SHA);
  assert.equal(snapshot.foundation.structureSha256,loaded.foundationExpected.sha256);
});

test('captures exactly the 57 pinned relation identities and rejects missing, duplicate or unexpected rows',async()=>{
  const relations=expectedRelationsFromSql(await readFile(dataSqlPath));
  assert.equal(relations.length,57);
  const rows=relations.map((relation,index)=>({relation,row_count:index,content_fingerprint:(index+1).toString(16).padStart(32,'0')}));
  const snapshot=protectedDataDigest({read_only:'on',preserved_data:rows},relations);
  assert.equal(snapshot.rows.length,57);
  assert.match(snapshot.sha256,/^[a-f0-9]{64}$/);
  assert.throws(()=>normalizeProtectedData({read_only:'on',preserved_data:rows.slice(1)},relations),/PROTECTED_DATA_RESULT_INVALID/);
  assert.throws(()=>normalizeProtectedData({read_only:'on',preserved_data:[...rows,rows[0]]},relations),/PROTECTED_DATA_RESULT_INVALID/);
  const swapped=rows.slice();swapped[0]={...swapped[0],relation:'public.unexpected_relation'};
  assert.throws(()=>normalizeProtectedData({read_only:'on',preserved_data:swapped},relations),/PROTECTED_DATA_RELATION_SET_MISMATCH/);
  const duplicate=rows.slice();duplicate[0]=duplicate[1];
  assert.throws(()=>normalizeProtectedData({read_only:'on',preserved_data:duplicate},relations),/PROTECTED_DATA_DUPLICATE_RELATION/);
});

test('requires exact before/after budget RPC and protected foundation state',async()=>{
  const receipt=JSON.parse(await readFile(foundationReceiptPath,'utf8'));
  const installed=verifyFoundationReceipt(receipt);
  const structure=foundationStructure(receipt.foundation);
  assert.equal(installed.sha256,hashJson(structure));
  const changed=JSON.parse(JSON.stringify(receipt.foundation));changed.triggers[0].enabled='D';
  assert.notEqual(stableFoundation(changed).triggers[0].enabled,stableFoundation(receipt.foundation).triggers[0].enabled);
  const old=readBudgetShape('pre');
  const paused=readBudgetShape('post');
  assert.equal(verifyBudgetState(old,'pre').compatibility_sha256,PRE_CATALOG_SHA);
  assert.equal(verifyBudgetState(paused,'post').compatibility_sha256,POST_CATALOG_SHA);
  assert.throws(()=>verifyBudgetState({...paused,phase:'pre'},'pre'),/BUDGET_CATALOG_FINGERPRINT_MISMATCH/);
});

test('compares all 57 immediate inventories and supplemental foundation state without adopting drift',async()=>{
  const relations=expectedRelationsFromSql(await readFile(dataSqlPath));
  const receipt=JSON.parse(await readFile(foundationReceiptPath,'utf8'));
  const expectedFoundation=verifyFoundationReceipt(receipt);
  const rows=relations.map((relation,index)=>({relation,row_count:index+10,content_fingerprint:(index+1).toString(16).padStart(32,'0')}));
  const budget=readBudgetShape('pre');
  const before={budget,protectedData:{read_only:'on',preserved_data:rows},foundation:{value:receipt.foundation}};
  const after={budget:readBudgetShape('post'),protectedData:{read_only:'on',preserved_data:rows},foundation:{value:receipt.foundation}};
  const preserved=comparePreservation(before,after,relations,expectedFoundation);
  assert.equal(preserved.protectedInventoriesCount,57);
  assert.equal(preserved.storagePolicies,15);
  const changedRows=rows.map((row,index)=>index===9?{...row,row_count:row.row_count+1}:row);
  assert.throws(()=>comparePreservation(before,{...after,protectedData:{read_only:'on',preserved_data:changedRows}},relations,expectedFoundation),/PROTECTED_57_INVENTORY_CHANGED/);
  const changedFoundation=JSON.parse(JSON.stringify(receipt.foundation));changedFoundation.triggers[0].enabled='D';
  assert.throws(()=>comparePreservation(before,{...after,foundation:{value:changedFoundation}},relations,expectedFoundation),/FOUNDATION_STATE_CHANGED/);
  assert.throws(()=>comparePreservation(before,{...after,budget:{...after.budget,storage_policy_count:14}},relations,expectedFoundation),/STORAGE_POLICY_COUNT_CHANGED/);
  assert.throws(()=>comparePreservation(before,{...after,budget:{...after.budget,storage_objects:379}},relations,expectedFoundation),/PROTECTED_COUNT_CHANGED/);
  assert.throws(()=>comparePreservation(before,{...after,budget:{...after.budget,migration_history:{...after.budget.migration_history,count:165}}},relations,expectedFoundation),/MIGRATION_HISTORY_CHANGED/);
});

function readBudgetShape(phase){
  const post=phase==='post';
  const base={phase,read_only:'on',database:'postgres',current_user:'postgres',session_user:'postgres',server_version:'17.6',project_binding:['https://mqqaykksadotbrghbexz.supabase.co'],containment_guard:false,storage_policy_count:15,migration_history:{count:164,latest:'20261011230000',complete_md5:'1f5eca911f6e2057ae070a955eaca3dc'},catalog_matches:true,function_matches:true,compatibility_sha256:post?POST_CATALOG_SHA:PRE_CATALOG_SHA,storage_objects:378,organization_profiles:93};
  base.function={oid:'32925',signature:'admin_bulk_delete_budget_requests(text,uuid[])',owner:'postgres',acl:'{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}',security_definer:true,volatility:'v',parallel_mode:'u',strict:false,config:['search_path=public'],arguments:'_session_token text, _request_ids uuid[]',result:'jsonb',definition_md5:post?'3da7c71f32e4f2a9164efbbac6cda448':'f6c36316ba941c9e0f76674754ac44ba',source_md5:post?'0e4e1f3cb102a26d08ab10161a23e682':'eb7b756964fd31efebfb39749f5c9e5b'};
  return base;
}

test('native identity requires exact server version, TLS, role privileges and backend binding',()=>{
  const value={database:'postgres',current_user:'postgres',session_user:'postgres',server_version_num:170006,server_port:5432,transaction_read_only:'on',default_transaction_read_only:'on',tls:true,tls_version:'TLSv1.3',application_name:'ytrace-budget-pause-r-12345678-1234-4234-8234-123456789abc',backend_pid:55,backend_start:'2026-10-13T00:00:00Z',database_connect:true,owns_target_function:true,public_usage:true,public_create:true,plpgsql_usage:true,text_type_usage:true,uuid_array_type_usage:true,jsonb_type_usage:true,all_eight_protected_relations_selectable:true,pg_read_all_stats:true};
  assert.equal(verifyNativeIdentity(value,{applicationName:value.application_name,readOnly:true}),value);
  assert.throws(()=>verifyNativeIdentity({...value,tls:false},{applicationName:value.application_name,readOnly:true}),/NATIVE_TLS_OR_READ_ONLY_MISMATCH/);
  assert.throws(()=>verifyNativeIdentity({...value,public_create:false},{applicationName:value.application_name,readOnly:true}),/INSTALLATION_PRIVILEGE_MISMATCH/);
});

test('environment and fixed TLS socket checks fail closed',()=>{
  assert.equal(environmentSafety({}),true);
  assert.throws(()=>environmentSafety({DATABASE_URL:'postgresql://not-used'}),/CONNECTION_STRING_OR_SERVICE_OVERRIDE_FORBIDDEN/);
  assert.throws(()=>environmentSafety({PGAPPNAME:'caller-controlled'}),/CONNECTION_STRING_OR_SERVICE_OVERRIDE_FORBIDDEN/);
  assert.throws(()=>environmentSafety({PGHOST:'db.other.supabase.co'}),/CONNECTION_STRING_OR_SERVICE_OVERRIDE_FORBIDDEN/);
  assert.throws(()=>environmentSafety({NODE_OPTIONS:'--require injected.js'}),/NODE_RUNTIME_OVERRIDE_FORBIDDEN/);
  assert.throws(()=>environmentSafety({NODE_TLS_REJECT_UNAUTHORIZED:'0'}),/INSECURE_TLS_ENVIRONMENT/);
  const peer={fingerprint256:'AA:BB'};
  const socket={encrypted:true,authorized:true,servername:TARGET.host,getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>peer};
  assert.equal(verifyTlsSocket({connection:{stream:socket}},{expectedCaSha256:'a'.repeat(64)}).hostnameVerified,true);
  assert.throws(()=>verifyTlsSocket({connection:{stream:{...socket,authorized:false}}},{expectedCaSha256:'a'.repeat(64)}),/TLS_SOCKET_NOT_AUTHORIZED/);
  assert.throws(()=>verifyTlsSocket({connection:{stream:{...socket,servername:'wrong.example'}}},{expectedCaSha256:'a'.repeat(64)}),/TLS_SERVERNAME_MISMATCH/);
});

test('trusted CA hash, TLS hostname and chain failure stop the one client before any query',async()=>{
  const dir=await tempDir();
  try{
    const caPath=join(dir,'synthetic-offline-ca.pem');
    const caBytes=Buffer.from('synthetic offline CA fixture; not a production certificate');
    await writeFile(caPath,caBytes);
    const env={YTRACE_PRODUCTION_DB_PASSWORD:'synthetic-placeholder-not-a-secret',YTRACE_PRODUCTION_DB_CA_FILE:caPath,YTRACE_PRODUCTION_DB_CA_SHA256:sha256(caBytes)};
    await assert.rejects(()=>connectionConfiguration({...env,YTRACE_PRODUCTION_DB_CA_SHA256:'0'.repeat(64)},{readOnly:false}),/CA_HASH_MISMATCH/);
    const configuration=await connectionConfiguration(env,{readOnly:false});
    assert.equal(configuration.host,TARGET.host);assert.equal(configuration.ssl.servername,TARGET.host);assert.equal(configuration.ssl.rejectUnauthorized,true);
    assert.equal(configuration.options,'-c default_transaction_read_only=off');
    for(const override of [{PGHOST:'db.other.supabase.co'},{PGPORT:'5433'},{PGDATABASE:'other'},{PGUSER:'other'},{PGSSLMODE:'disable'},{PGSSLROOTCERT:'other.pem'},{PGOPTIONS:'-c role=other'},{NODE_TLS_REJECT_UNAUTHORIZED:'0'}]){
      await assert.rejects(()=>connectionConfiguration({...env,...override},{readOnly:false}));
    }
    const hostnameError=checkServerIdentity(TARGET.host,{subjectaltname:'DNS:wrong.invalid'});
    assert.equal(hostnameError.code,'ERR_TLS_CERT_ALTNAME_INVALID');
    const calls={constructed:0,connected:0,ended:0,queries:0};
    class FakeTlsClient{
      constructor(){calls.constructed++;}on(){}
      async connect(){calls.connected++;throw Object.assign(new Error('synthetic private TLS error'),{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'});}
      async end(){calls.ended++;}async query(){calls.queries++;}
    }
    await assert.rejects(()=>connectClientOnce(FakeTlsClient,configuration),error=>{
      const safe=JSON.stringify(safeError(error));assert.equal(safe.includes('synthetic private TLS error'),false);return error.code==='UNABLE_TO_VERIFY_LEAF_SIGNATURE';
    });
    assert.deepEqual(calls,{constructed:1,connected:1,ended:1,queries:0});
  }finally{await cleanup(dir);}
});

test('control-plane proof and human authorization are exact, short-lived and bound to artifacts',()=>{
  const now=Date.parse('2026-10-13T01:00:00Z');
  const proof={project:TARGET.project,host:TARGET.host,status:'ACTIVE_HEALTHY',verifiedVia:'supabase-control-plane-get-project',verifiedAt:new Date(now-1000).toISOString()};
  assert.equal(verifyControlPlaneProof(proof,{now}),proof);
  assert.throws(()=>verifyControlPlaneProof({...proof,host:'other'},{now}),/CONTROL_PLANE_PROJECT_MISMATCH/);
  const authorization={version:1,approved:true,project:TARGET.project,host:TARGET.host,port:5432,database:'postgres',user:'postgres',route:'native-pg-direct-tls',sqlSha256:SQL_SHA,sqlBytes:SQL_BYTES,runnerBundleSha256:'a'.repeat(64),caSha256:'b'.repeat(64),controlPlaneEvidenceSha256:'c'.repeat(64),preflightEvidenceSha256:'d'.repeat(64),preflightStateSha256:'e'.repeat(64),authorizationReference:'BUDGET-PAUSE-TEST-01',approvedAt:new Date(now-5000).toISOString(),expiresAt:new Date(now+600000).toISOString(),exclusiveWindowConfirmed:true,existingDeletionRequestsDrained:true};
  assert.equal(verifyAuthorization(authorization,{bundleSha256:'a'.repeat(64),caSha256:'b'.repeat(64),preflightEvidenceSha256:'d'.repeat(64),now}),authorization);
  assert.throws(()=>verifyAuthorization({...authorization,approved:false},{bundleSha256:'a'.repeat(64),caSha256:'b'.repeat(64),preflightEvidenceSha256:'d'.repeat(64),now}),/AUTHORIZATION_SCOPE_MISMATCH/);
  assert.throws(()=>verifyAuthorization(authorization,{bundleSha256:'f'.repeat(64),caSha256:'b'.repeat(64),preflightEvidenceSha256:'d'.repeat(64),now}),/AUTHORIZATION_SCOPE_MISMATCH/);
});

test('lock is exclusive across processes and nonce ownership cannot be replaced',async()=>{
  const dir=await tempDir();
  try{
    const lockPath=join(dir,'budget.lock');
    const lock=await claimBudgetLock(lockPath);
    await lock.verify();
    const code=`import {open} from 'node:fs/promises'; try { const h=await open(${JSON.stringify(lockPath)},'wx'); await h.close(); process.stdout.write('UNEXPECTEDLY_ACQUIRED'); } catch(e) { process.stdout.write(e.code==='EEXIST'?'CONTENDED':'ERROR'); }`;
    const outcome=await new Promise((resolvePromise,reject)=>{
      const child=spawn(process.execPath,['--input-type=module','-e',code],{windowsHide:true,stdio:['ignore','pipe','ignore']});
      let out='';child.stdout.setEncoding('utf8');child.stdout.on('data',part=>out+=part);child.on('error',reject);child.on('close',code=>code===0?resolvePromise(out):reject(new Error('LOCK_CHILD_FAILED')));
    });
    assert.equal(outcome,'CONTENDED');
    await writeFile(lockPath,JSON.stringify({...lock.claim,nonce:'different-nonce'}));
    await assert.rejects(()=>lock.verify(),/BUDGET_LOCK_OWNERSHIP_MISMATCH/);
  } finally {await cleanup(dir);}
});

test('single attempt consumes marker before exactly one SQL submission and never sends rollback',async()=>{
  const dir=await tempDir();
  try{
    const marker=join(dir,'marker.json'),receipt=join(dir,'receipt.jsonl');
    const sqlBytes=await readFile(sqlPath);let submissions=0,postflights=0;
    const client={async query(text){submissions++;assert.equal(typeof text,'string');return [{command:'BEGIN'},{command:'CREATE'},{command:'COMMIT'}];}};
    const result=await runOneShot({client,sqlBytes,markerPath:marker,receiptPath:receipt,lock:fakeLock(),applicationIdentity:testAppIdentity(),postflight:async()=>{postflights++;}});
    assert.equal(result.status,'COMMITTED_AND_VERIFIED');
    assert.equal(result.submissionCount,1);assert.equal(result.automaticRetries,0);assert.equal(result.rollbackStatementsSent,0);
    assert.equal(submissions,1);assert.equal(postflights,1);assert.ok((await stat(marker)).isFile());
    const lines=(await readFile(receipt,'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(lines.map(row=>row.event),['ATTEMPT_ARMED','COMMIT_ACKNOWLEDGED','POSTFLIGHT_VERIFIED']);
  } finally {await cleanup(dir);}
});

test('duplicate marker blocks before any SQL request',async()=>{
  const dir=await tempDir();
  try{
    const sqlBytes=await readFile(sqlPath);
    const marker=join(dir,'marker.json'),receipt=join(dir,'receipt.jsonl');
    await writeFile(marker,'consumed');let submissions=0;
    await assert.rejects(()=>runOneShot({client:{query:async()=>{submissions++;}},sqlBytes,markerPath:marker,receiptPath:receipt,lock:fakeLock(),applicationIdentity:testAppIdentity(),postflight:async()=>{}}),/BUDGET_ATTEMPT_ALREADY_CONSUMED/);
    assert.equal(submissions,0);
  } finally {await cleanup(dir);}
});

test('connection loss before or after simulated COMMIT remains unresolved and is never retried',async()=>{
  for(const commitApplied of [false,true]){
    const dir=await tempDir();
    try{
      const marker=join(dir,'marker.json'),receipt=join(dir,'receipt.jsonl');let submissions=0,simulatedState='original';
      const result=await runOneShot({client:{async query(){submissions++;if(commitApplied)simulatedState='paused';const error=new Error('private transport message must not be logged');error.code='ECONNRESET';throw error;}},sqlBytes:await readFile(sqlPath),markerPath:marker,receiptPath:receipt,lock:fakeLock(),applicationIdentity:testAppIdentity(),postflight:async()=>{assert.fail('postflight cannot run without acknowledgement');}});
      assert.equal(result.status,'UNRESOLVED');assert.equal(result.retainLock,true);assert.equal(result.retainAttemptMarker,true);
      assert.equal(submissions,1);assert.ok((await stat(marker)).isFile());
      const receiptText=await readFile(receipt,'utf8');
      assert.ok(!receiptText.includes('private transport message'));assert.ok(!receiptText.includes('password'));
      assert.equal(simulatedState,commitApplied?'paused':'original');
    } finally {await cleanup(dir);}
  }
});

test('receipt preparation and post-commit receipt failures fail closed without a second SQL submission',async()=>{
  const dir=await tempDir();
  try{
    const sqlBytes=await readFile(sqlPath);let submissions=0;
    await assert.rejects(()=>runOneShot({client:{query:async()=>{submissions++;return {command:'COMMIT'};}},sqlBytes,markerPath:join(dir,'m1'),receiptPath:join(dir,'r1'),lock:fakeLock(),applicationIdentity:testAppIdentity(),postflight:async()=>{},write:async()=>{throw new Error('receipt unavailable');}}),/receipt unavailable/);
    assert.equal(submissions,0);
    let postCalls=0;
    const result=await runOneShot({client:{async query(){submissions++;return [{command:'COMMIT'}];}},sqlBytes,markerPath:join(dir,'m2'),receiptPath:join(dir,'r2'),lock:fakeLock(),applicationIdentity:testAppIdentity(),postflight:async()=>{postCalls++;},write:async(file,event)=>{if(event.event==='COMMIT_ACKNOWLEDGED')throw new Error('receipt update failure');}});
    assert.equal(result.status,'COMMITTED_POSTFLIGHT_FAILED');assert.equal(result.commitAcknowledged,true);assert.equal(result.retainLock,true);assert.equal(postCalls,0);
    assert.equal(submissions,1);
  } finally {await cleanup(dir);}
});

test('reconciliation classification requires a finished writer and exact old/new state plus preservation',()=>{
  const old=readBudgetShape('pre'),updated=readBudgetShape('post');
  const currentOld={...old},currentPostOld={...readBudgetShape('post'),compatibility_sha256:PRE_CATALOG_SHA,catalog_matches:false,function_matches:false};
  const currentUpdatedPre={...readBudgetShape('pre'),compatibility_sha256:POST_CATALOG_SHA,catalog_matches:false,function_matches:false,function:updated.function};
  assert.equal(classifyReconciliation({priorBackendFinished:false,preState:old,postState:updated,preservationMatches:true}).classification,'UNRESOLVED');
  assert.equal(classifyReconciliation({priorBackendFinished:true,preState:currentOld,postState:currentPostOld,preservationMatches:true}).classification,'NOT_INSTALLED_VERIFIED');
  assert.equal(classifyReconciliation({priorBackendFinished:true,preState:currentUpdatedPre,postState:updated,preservationMatches:true}).classification,'COMMITTED_AND_VERIFIED');
  assert.equal(classifyReconciliation({priorBackendFinished:true,preState:old,postState:updated,preservationMatches:false}).classification,'COMMITTED_WITH_DRIFT');
  assert.equal(classifyReconciliation({priorBackendFinished:true,preState:old,postState:updated,preservationMatches:true}).stop,true);
});

test('backend reconciliation uses a separate read-only session and exact backend identity',async()=>{
  const calls=[];
  const client={async query(query){calls.push(query);if(typeof query==='string')return {command:query.startsWith('BEGIN')?'BEGIN':'ROLLBACK'};if(query.values)return {command:'SELECT',rows:[{reconciliation_state:{read_only:'on',database:'postgres',current_user:'postgres',session_user:'postgres',prior_backend_active:false,matching_application_sessions:0,can_inspect_activity:true}}]};throw new Error('UNEXPECTED_QUERY');}};
  const result=await verifyOriginalBackendFinished(client,{backendPid:77,backendStart:'2026-10-13T00:00:00Z',applicationName:'ytrace-budget-pause-i-12345678-1234-4234-8234-123456789abc'});
  assert.equal(result.finished,true);
  assert.equal(calls.length,3);
  assert.ok(calls[1].text.includes('pg_stat_activity'));
  assert.ok(!calls[1].text.toLowerCase().includes('query as'));
  assert.equal(calls[1].values[0],77);
  assert.equal(calls[2],'ROLLBACK;');
  await assert.rejects(()=>verifyOriginalBackendFinished(client,{backendPid:77,backendStart:'bad',applicationName:'wrong'}),/BACKEND_IDENTITY_INVALID/);
});

test('human authorization absence or drift is rejected; errors and receipts do not leak secrets',()=>{
  assert.throws(()=>verifyAuthorization(null,{bundleSha256:'a'.repeat(64),caSha256:'b'.repeat(64),preflightEvidenceSha256:'c'.repeat(64)}),/AUTHORIZATION_FIELDS_MISMATCH/);
  const good={status:'BLOCKED',error:{code:'DATABASE_OR_LOCAL_OPERATION_FAILED',databaseCode:'ECONNRESET'},sqlResubmitted:false};
  assert.equal(scrubReceiptValue(good),good);
  assert.throws(()=>scrubReceiptValue({password:'synthetic'}),/RECEIPT_SECRET_FIELD_DETECTED/);
  assert.throws(()=>scrubReceiptValue({detail:'postgresql://user:pass@host/db'}),/RECEIPT_SECRET_PATTERN_DETECTED/);
});

test('fixed install application name fits PostgreSQL application_name without truncation',()=>{
  const id=createInstallApplicationName();
  assert.match(id.applicationName,/^ytrace-budget-pause-i-[a-f0-9-]{36}$/);
  assert.ok(Buffer.byteLength(id.applicationName,'utf8')<=63);
});

test('Windows ACL helper applies and verifies isolated effective ACLs (disposable temporary directory only)',{skip:process.platform!=='win32'},async()=>{
  const result=await new Promise((resolvePromise,reject)=>{
    const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',psAcl,'-Action','SelfTest'],{windowsHide:true,env:Object.fromEntries(Object.entries(process.env).filter(([key])=>['path','systemroot','windir','temp','tmp','userprofile','homedrive','homepath','username','userdomain'].includes(key.toLowerCase()))),stdio:['ignore','pipe','ignore']});
    let output='';child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>output+=chunk);child.on('error',reject);child.on('close',code=>{try{const parsed=JSON.parse(output.trim());if(code!==0)reject(new Error(parsed.code??'ACL_SELFTEST_FAILED'));else resolvePromise(parsed);}catch(error){reject(error);}});
  });
  assert.equal(result.status,'PASS');assert.equal(result.checks,5);assert.equal(result.productionStateTouched,false);assert.equal(result.fixedProfileParentSafe,true);assert.equal(result.untrustedMutationRightRejected,true);
});

function cliEnvironment(){return Object.fromEntries(Object.entries(process.env).filter(([key])=>['path','systemroot','windir','temp','tmp','userprofile','homedrive','homepath','username','userdomain'].includes(key.toLowerCase())));}

async function powershell(args){
  return await new Promise((resolvePromise,reject)=>{
    const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',...args],{windowsHide:true,env:cliEnvironment(),stdio:['ignore','pipe','pipe']});
    let output='',stderr='';
    const timer=setTimeout(()=>{child.kill();reject(new Error('TEST_POWERSHELL_TIMEOUT'));},15000);
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>8192){child.kill();clearTimeout(timer);reject(new Error('TEST_POWERSHELL_OUTPUT_TOO_LARGE'));}});
    child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>8192){child.kill();clearTimeout(timer);reject(new Error('TEST_POWERSHELL_ERROR_TOO_LARGE'));}});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);resolvePromise({code,output:output.trim(),stderr:stderr.trim()});});
  });
}
const psQuote=value=>"'"+value.replaceAll("'","''")+"'";
async function aclCli(script,action,path){
  const result=await powershell(['-File',script,'-Action',action,'-Path',path]);
  return {...result,value:JSON.parse(result.output)};
}
async function assertAclPass(script,action,path){const r=await aclCli(script,action,path);assert.equal(r.code,0,r.output);assert.equal(r.value.status,'PASS');return r.value;}
async function assertAclDenied(script,action,path,code){const r=await aclCli(script,action,path);assert.equal(r.code,2,r.output);assert.equal(r.value.status,'BLOCKED');assert.equal(r.value.code,code);}

// The shipped CLI has no root override. Disposable mutation tests use a copy
// with exactly one trusted-root assignment substituted; all CLI logic and
// checks stay byte-identical. The exact shipped file is also tested read-only.
const rootBinding="  $stateRoot = [System.IO.Path]::GetFullPath((Join-Path $userProfile '.ytrace-production-budget-deletion-pause'))";
async function fixtureScript(parent,stateRoot,name='operation-acl.ps1'){
  const source=await readFile(psAcl,'utf8');
  assert.equal(source.split(rootBinding).length,2,'fixed root assignment must occur exactly once');
  const replacement='  $stateRoot = '+psQuote(stateRoot);
  const copied=source.replace(rootBinding,replacement);
  assert.equal(copied.replace(replacement,rootBinding),source,'only the trusted root binding may differ');
  const path=join(parent,name);await writeFile(path,copied,'utf8');return path;
}
async function aclFixture(){
  const profile=resolve(process.env.USERPROFILE);
  const parent=await mkdtemp(join(profile,'.ytrace-budget-acl-test-'));
  const state=join(parent,'operation-state');
  return {parent,state,script:await fixtureScript(parent,state)};
}
async function cleanupAclFixture(fixture){
  const parent=resolve(fixture.parent),profile=resolve(process.env.USERPROFILE);
  assert.equal(dirname(parent).toLowerCase(),profile.toLowerCase());
  assert.match(basename(parent),/^\.ytrace-budget-acl-test-[A-Za-z0-9]+$/);
  assert.equal((await lstat(parent)).isSymbolicLink(),false);
  // fs.rm removes junction entries themselves and does not follow their targets.
  await rm(parent,{recursive:true,force:true});
}

test('actual shipped PowerShell CLI and runner verify existing operator root/proof read-only',{skip:process.platform!=='win32'},async t=>{
  const state=join(process.env.USERPROFILE,'.ytrace-production-budget-deletion-pause');
  const proof=join(state,'control-plane-proof.json');
  try{await stat(proof);}catch(error){if(error.code==='ENOENT'){t.skip('existing operator evidence is unavailable; disposable CLI cases still run');return;}throw error;}
  // Do not read operator proof contents: NTFS may update last-access time.
  const metadata=async()=>{const rootInfo=await stat(state),proofInfo=await stat(proof);return {files:await readdir(state),rootCreated:rootInfo.birthtimeMs,rootModified:rootInfo.mtimeMs,proofCreated:proofInfo.birthtimeMs,proofModified:proofInfo.mtimeMs,proofBytes:proofInfo.size};};
  const before=await metadata();
  await assertAclPass(psAcl,'Verify',state);
  await assertAclPass(psAcl,'Verify',proof);
  assert.equal((await invokeAcl('Verify',proof)).status,'PASS');
  assert.deepEqual(await metadata(),before);
});

test('PowerShell CLI Protect and Verify use the bounded artifact allowlist (disposable fixed-root copy)',{skip:process.platform!=='win32'},async t=>{
  const f=await aclFixture();
  try{
    await t.test('Protect accepts only its exact approved root',async()=>{
      await assertAclPass(f.script,'Protect',f.state);
      for(const path of [join(f.parent,'alternate-state'),join(f.state,'authorization.json'),f.state+'-sibling'])await assertAclDenied(f.script,'Protect',path,'ONLY_FIXED_BUDGET_STATE_PATH_ALLOWED');
    });
    const uuid='12345678-1234-4234-8234-123456789abc';
    const names=['control-plane-proof.json',`control-plane-proof-history-${'a'.repeat(64)}.json`,'authorization.json','approved-preflight.json','budget-deletion-pause.operation.lock.json','budget-deletion-pause.attempt.json',`preflight-20261013T080046123Z-${uuid}.json`,`install-preflight-${uuid}.json`,`execution-${uuid}.jsonl`,`reconciliation-20261013T080046123Z-${uuid}.json`];
    await t.test('Verify accepts root and every legitimate child evidence family',async()=>{
      await assertAclPass(f.script,'Verify',f.state);
      for(const name of names){const path=join(f.state,name);await writeFile(path,'{}','utf8');await assertAclPass(f.script,'Verify',path);}
      await assertAclPass(f.script,'Verify',join(f.state,'CONTROL-PLANE-PROOF.JSON').toUpperCase());
      await assertAclPass(f.script,'Verify',join(f.state,'control-plane-proof.json').replaceAll('\\','/'));
    });
    await t.test('Verify rejects alternate roots, siblings, nested children and unknown leaves',async()=>{
      for(const path of [join(f.parent,'alternate-state','control-plane-proof.json'),f.state+'-sibling\\control-plane-proof.json',join(f.state,'nested','control-plane-proof.json')])await assertAclDenied(f.script,'Verify',path,'STATE_PATH_OUTSIDE_PROTECTED_ROOT');
      for(const name of ['unknown.json','control-plane-proof-history-wrong.json','execution-wrong.jsonl',`install-preflight-${uuid}.json.backup`])await assertAclDenied(f.script,'Verify',join(f.state,name),'STATE_ARTIFACT_NAME_NOT_ALLOWED');
      await assertAclDenied(f.script,'Verify',join(f.state,`preflight-20261013T080047123Z-${uuid}.json`),'STATE_PATH_MISSING');
    });
    await t.test('CLI rejects traversal, relative/device/UNC paths, streams and ambiguous names',async()=>{
      for(const path of [f.state+'\\..\\operation-state\\control-plane-proof.json',f.state+'\\.\\control-plane-proof.json']){
        await assertAclDenied(f.script,'Verify',path,'STATE_PATH_TRAVERSAL_NOT_ALLOWED');
        await assertAclDenied(f.script,'Protect',path,'STATE_PATH_TRAVERSAL_NOT_ALLOWED');
      }
      for(const path of ['control-plane-proof.json','C:control-plane-proof.json','\\\\?\\'+f.state,'\\\\server\\share\\control-plane-proof.json'])await assertAclDenied(f.script,'Verify',path,'STATE_PATH_MUST_BE_ABSOLUTE_LOCAL');
      await assertAclDenied(f.script,'Verify',join(f.state,'control-plane-proof.json:stream'),'STATE_PATH_STREAM_NOT_ALLOWED');
      for(const name of ['control-plane-proof.json.','control-plane-proof.json '])await assertAclDenied(f.script,'Verify',join(f.state,name),'STATE_PATH_AMBIGUOUS_SEGMENT');
    });
    await t.test('Verify rejects an allowed leaf whose DACL grants another principal',async()=>{
      const path=join(f.state,'authorization.json');
      const setup=await powershell(['-Command',`$ErrorActionPreference='Stop';$p=${psQuote(path)};$a=Get-Acl -LiteralPath $p;$sid=[Security.Principal.SecurityIdentifier]::new('S-1-5-32-545');$r=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow);$a.AddAccessRule($r);Set-Acl -LiteralPath $p -AclObject $a`]);
      assert.equal(setup.code,0);await assertAclDenied(f.script,'Verify',path,'STATE_DACL_HAS_UNAPPROVED_PRINCIPAL');
    });
    await t.test('Verify rejects a directory using an allowed artifact filename',async()=>{
      const path=join(f.state,'approved-preflight.json');await rm(path);
      const setup=await powershell(['-Command',`$ErrorActionPreference='Stop';New-Item -ItemType Directory -Path ${psQuote(path)} | Out-Null`]);
      assert.equal(setup.code,0);await assertAclDenied(f.script,'Verify',path,'STATE_ARTIFACT_NOT_FILE');
    });
    await t.test('Verify rejects a child junction; Protect rejects a root junction without changing its target',async()=>{
      const child=join(f.state,'control-plane-proof.json'),target=join(f.parent,'junction-target'),rootLink=join(f.parent,'redirected-state');
      await rm(child);
      const setup=await powershell(['-Command',`$ErrorActionPreference='Stop';New-Item -ItemType Directory -Path ${psQuote(target)} | Out-Null;New-Item -ItemType Junction -Path ${psQuote(child)} -Target ${psQuote(target)} | Out-Null;New-Item -ItemType Junction -Path ${psQuote(rootLink)} -Target ${psQuote(target)} | Out-Null;(Get-Acl -LiteralPath ${psQuote(target)}).Sddl`]);
      assert.equal(setup.code,0);
      await assertAclDenied(f.script,'Verify',child,'STATE_PATH_REPARSE_POINT');
      const linkedScript=await fixtureScript(f.parent,rootLink,'linked-operation-acl.ps1');
      await assertAclDenied(linkedScript,'Protect',rootLink,'STATE_PATH_REPARSE_POINT');
      await assertAclDenied(linkedScript,'Verify',rootLink,'STATE_PATH_REPARSE_POINT');
      const after=await powershell(['-Command',`(Get-Acl -LiteralPath ${psQuote(target)}).Sddl`]);assert.equal(after.code,0);assert.equal(after.output,setup.output);
    });
    await t.test('Verify also checks the root DACL when a broad grant is added',async()=>{
      const separate=await aclFixture();
      try{
        await assertAclPass(separate.script,'Protect',separate.state);
        const setup=await powershell(['-Command',`$ErrorActionPreference='Stop';$p=${psQuote(separate.state)};$a=[Security.AccessControl.DirectorySecurity]::new();$a.SetSecurityDescriptorSddlForm((Get-Acl -LiteralPath $p).Sddl,[Security.AccessControl.AccessControlSections]::Access);$sid=[Security.Principal.SecurityIdentifier]::new('S-1-5-32-545');$r=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow);$a.AddAccessRule($r);[IO.Directory]::SetAccessControl($p,$a)`]);
        assert.equal(setup.code,0,setup.stderr);await assertAclDenied(separate.script,'Verify',separate.state,'STATE_DACL_HAS_UNAPPROVED_PRINCIPAL');
      }finally{await cleanupAclFixture(separate);}
    });
  }finally{await cleanupAclFixture(f);}
});

test('installation authorization draft is deliberately non-runnable and prior blocked proof is stale',async()=>{
  const draft=JSON.parse(await readFile(join(adapterDir,'authorization-draft.json'),'utf8'));
  assert.equal(draft.approved,false);assert.equal(draft.draftStatus,'NOT_AUTHORIZED_DO_NOT_COPY_TO_OPERATOR_STATE');
  assert.throws(()=>verifyAuthorization(draft,{bundleSha256:draft.runnerBundleSha256}),/AUTHORIZATION_FIELDS_MISMATCH/);
  assert.throws(()=>verifyControlPlaneProof({project:TARGET.project,host:TARGET.host,status:'ACTIVE_HEALTHY',verifiedVia:'supabase-control-plane-get-project',verifiedAt:'2026-10-13T07:53:03.000Z'},{now:Date.parse('2026-10-13T08:00:46.000Z')}),/CONTROL_PLANE_PROOF_EXPIRED/);
});
