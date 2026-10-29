// Focused offline tests only. All marker/receipt fixtures remain in memory.
// No database client, environment-file loading, state-file creation or SQL execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {
  TARGET,SQL_SHA,SQL_BYTES,PRE_CATALOG_SHA,POST_CATALOG_SHA,
  EXPECTED_FUNCTION,EXPECTED_PAUSED_FUNCTION,sha256,hashJson,
  preflightStateFingerprint,expectedRelationsFromSql,foundationStructure,
  verifyInstallationReceipt,resultExitCode,classifyReconciliation,
  verifyControlPlaneProofJson,verifyControlPlaneProof,environmentSafety,
} from './budget-runner-core.mjs';
import {superviseInstallation} from './native-budget-pause-supervisor.mjs';
import {loadReviewedInputs} from './native-budget-pause-runner.mjs';

const readRelative=relative=>readFile(fileURLToPath(new URL(relative,import.meta.url)));
const historical=JSON.parse(await readRelative('../native-adapter-20261013T050122Z/native-readonly-20261013T103131Z/native-preflight-evidence.json'));
const relations=expectedRelationsFromSql(await readRelative('../native-adapter-20261013T050122Z/budget-protected-data-readonly.sql'));
const clone=value=>structuredClone(value);
const bytes=value=>Buffer.from(JSON.stringify(value),'utf8');
const bundle='c'.repeat(64),nonce='11111111-2222-4333-8444-555555555555';
const stamp=seconds=>'2026-10-13T13:00:'+String(seconds).padStart(2,'0')+'.000Z';
function fixture(){
  const pre=clone(historical);
  const app={nonce,applicationName:'ytrace-budget-pause-i-'+nonce,runnerBundleSha256:bundle,caSha256:pre.tls.caSha256,backendPid:31337,backendStart:stamp(0)};
  pre.runnerBundleSha256=bundle;
  pre.capturedAt=stamp(1);
  pre.identity.backend_pid=app.backendPid;pre.identity.backend_start=app.backendStart;pre.identity.application_name=app.applicationName;
  pre.approvalFingerprint=preflightStateFingerprint(pre);
  const preflightBytes=bytes(pre);
  const marker={project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,runnerBundleSha256:bundle,preflightFile:'install-preflight-'+nonce+'.json',preflightSha256:sha256(preflightBytes),preflightStateSha256:pre.approvalFingerprint,attempt:1,submissionMayHaveOccurred:true,nonce,applicationName:app.applicationName,backendPid:app.backendPid,backendStart:app.backendStart,lockPid:4242,lockNonce:'offline-lock-identity',startedAt:stamp(3)};
  const scoped={project:TARGET.project,sqlSha256:SQL_SHA};
  const events=[
    {...scoped,event:'ATTEMPT_ARMED',applicationIdentity:app,capturedAt:stamp(2)},
    {...scoped,event:'COMMIT_ACKNOWLEDGED',commands:['COMMIT'],capturedAt:stamp(4)},
    {...scoped,event:'POSTFLIGHT_EVIDENCE',status:'PASS',runnerBundleSha256:bundle,capturedAt:stamp(5),catalogSha256:POST_CATALOG_SHA,function:clone(EXPECTED_PAUSED_FUNCTION),migrationHistory:clone(pre.budget.migration_history),protectedInventoryCount:57,protectedInventoriesSha256:pre.protectedData.sha256,foundationSha256:pre.foundation.sha256,storagePolicyCount:15,storageObjects:pre.budget.storage_objects,organizationProfiles:pre.budget.organization_profiles,backend:{pid:app.backendPid,startedAt:app.backendStart,applicationName:app.applicationName}},
    {...scoped,event:'POSTFLIGHT_VERIFIED',commitAcknowledged:true,capturedAt:stamp(6)},
  ];
  const result={status:'COMMITTED_AND_VERIFIED',commitAcknowledged:true,submissionCount:1,automaticRetries:0,rollbackStatementsSent:0,retainLock:false,retainAttemptMarker:true,project:TARGET.project,sqlSha256:SQL_SHA,runnerBundleSha256:bundle,evidenceFile:'execution-'+nonce+'.jsonl',preflightFile:marker.preflightFile};
  return {pre,marker,events,result,expectedBundleSha256:bundle,expectedRelations:relations,expectedFoundation:{structure:foundationStructure(pre.foundation.value),sha256:hashJson(foundationStructure(pre.foundation.value))}};
}
function argumentsFor(f){
  return {...f,receiptBytes:Buffer.from(f.events.map(event=>JSON.stringify(event)).join('\n')+'\n'),markerBytes:bytes(f.marker),preflightBytes:bytes(f.pre)};
}
function validResult(f){
  return {...f.result,receiptVerification:verifyInstallationReceipt(argumentsFor(f))};
}
function rawViews(installed=false){
  const pre=clone(historical.budget),post=clone(historical.budget);
  pre.phase='pre';post.phase='post';
  for(const view of [pre,post]){
    view.compatibility_sha256=installed?POST_CATALOG_SHA:PRE_CATALOG_SHA;
    view.function=clone(installed?EXPECTED_PAUSED_FUNCTION:EXPECTED_FUNCTION);
  }
  pre.catalog_matches=!installed;pre.function_matches=!installed;
  post.catalog_matches=installed;post.function_matches=installed;
  return {preState:pre,postState:post};
}

test('complete receipt proves terminal COMMIT, one attempt and all preservation bindings',()=>{
  const f=fixture(),verification=verifyInstallationReceipt(argumentsFor(f));
  assert.equal(verification.status,'PASS');
  assert.equal(verification.terminalCommand,'COMMIT');
  assert.equal(verification.eventCount,4);
  assert.equal(verification.protectedInventories,57);
  assert.equal(resultExitCode('--install',{...f.result,receiptVerification:verification}),0);
});

for(const status of ['UNRESOLVED','COMMITTED_POSTFLIGHT_FAILED','COMMITTED_WITH_DRIFT','NOT_INSTALLED_VERIFIED','INSTALLED_AND_PRESERVED','INSTALLED_WITH_DRIFT','PASS']){
  test('stopped zero-exit '+status+' cannot be accepted as installation success',async()=>{
    let launches=0,reads=0;
    const result=await superviseInstallation({
      launchOnce:()=>{launches++;return {status:0,signal:null,stdout:JSON.stringify({status})};},
      readEvidence:()=>{reads++;throw Error('must not read');},
    });
    assert.equal(result.status,'UNRESOLVED');assert.equal(result.stopForHumanReview,true);
    assert.equal(result.automaticRetries,0);assert.equal(launches,1);assert.equal(reads,0);
    assert.equal(resultExitCode('--install',{status}),2);
  });
}

test('a real harmless child exiting zero with UNRESOLVED remains stopped',async()=>{
  let launches=0;
  const result=await superviseInstallation({
    launchOnce:()=>{launches++;return spawnSync(process.execPath,['--input-type=module','-e','console.log(JSON.stringify({status:"UNRESOLVED"}))'],{encoding:'utf8',windowsHide:true});},
    readEvidence:()=>assert.fail('No evidence read for stopped child'),
  });
  assert.equal(launches,1);assert.equal(result.status,'UNRESOLVED');
});

for(const [field,value] of [['commitAcknowledged',false],['submissionCount',0],['submissionCount',2],['automaticRetries',1],['rollbackStatementsSent',1],['retainLock',true],['retainAttemptMarker',false],['stopForHumanReview',true]]){
  test('success rejects inconsistent '+field+'='+value,()=>{
    const f=fixture();f.result[field]=value;
    assert.throws(()=>verifyInstallationReceipt(argumentsFor(f)),/INSTALL_RESULT_NOT_VERIFIED_SUCCESS/);
    assert.equal(resultExitCode('--install',f.result),2);
  });
}

for(const [name,mutate] of [
  ['missing event',f=>f.events.pop()],
  ['duplicate event',f=>f.events.push(clone(f.events[2]))],
  ['wrong terminal tag',f=>{f.events[1].commands=['ROLLBACK'];}],
  ['wrong function fingerprint',f=>{f.events[2].function.source_md5='0'.repeat(32);}],
  ['wrong function owner',f=>{f.events[2].function.owner='other';}],
  ['changed inventories',f=>{f.events[2].protectedInventoriesSha256='0'.repeat(64);}],
  ['changed foundation',f=>{f.events[2].foundationSha256='0'.repeat(64);}],
  ['changed migrations',f=>{f.events[2].migrationHistory.count=165;}],
  ['changed Storage count',f=>{f.events[2].storageObjects++;}],
  ['changed backend',f=>{f.events[2].backend.pid++;}],
  ['mismatched marker hash',f=>{f.marker.preflightSha256='0'.repeat(64);}],
  ['mismatched nonce',f=>{f.marker.nonce='0'.repeat(36);}],
  ['different candidate bundle',f=>{f.result.runnerBundleSha256='0'.repeat(64);}],
  ['secret-shaped evidence',f=>{f.events[2].accessToken='must-not-be-exposed';}],
]){
  test('receipt fails closed for '+name,()=>{
    const f=fixture();mutate(f);
    assert.throws(()=>verifyInstallationReceipt(argumentsFor(f)));
  });
}

test('partial journal and timezone-free event timestamps fail closed',()=>{
  const f=fixture(),args=argumentsFor(f);
  assert.throws(()=>verifyInstallationReceipt({...args,receiptBytes:args.receiptBytes.subarray(0,-1)}),/RECEIPT_INCOMPLETE/);
  f.events[0].capturedAt='2026-10-13T13:00:02';
  assert.throws(()=>verifyInstallationReceipt(argumentsFor(f)),/EXPLICIT_ISO_TIMESTAMP_REQUIRED/);
});

test('supervisor independently verifies bytes and matching child receipt hashes',async()=>{
  const f=fixture();let launches=0,reads=0;
  const result=await superviseInstallation({
    ...f,
    launchOnce:()=>{launches++;return {status:0,signal:null,stdout:JSON.stringify(validResult(f))};},
    readEvidence:()=>{reads++;return argumentsFor(f);},
  });
  assert.equal(result.status,'COMMITTED_AND_VERIFIED');assert.equal(result.supervisorVerified,true);
  assert.equal(launches,1);assert.equal(reads,1);assert.equal(resultExitCode('--install',result),0);
});

test('forged receipt PASS or changed durable bytes cannot pass supervisor',async()=>{
  const f=fixture(),reported=validResult(f);
  f.events[2].protectedInventoriesSha256='0'.repeat(64);
  const result=await superviseInstallation({...f,launchOnce:()=>({status:0,stdout:JSON.stringify(reported)}),readEvidence:()=>argumentsFor(f)});
  assert.equal(result.status,'UNRESOLVED');assert.equal(resultExitCode('--install',result),2);
  assert.equal(JSON.stringify(result).includes('must-not-be-exposed'),false);
});

test('ambiguous child exception has one launch and zero automatic retries',async()=>{
  let launches=0;
  const result=await superviseInstallation({launchOnce:()=>{launches++;throw Error('uncertain child');},readEvidence:()=>assert.fail('No retry/read')});
  assert.equal(launches,1);assert.equal(result.status,'UNRESOLVED');assert.equal(result.automaticRetries,0);
});

test('nonzero exit, signal and malformed output are unresolved',async()=>{
  for(const child of [{status:2,stdout:'{}'},{status:0,signal:'SIGTERM',stdout:'{}'},{status:0,stdout:'{} trailing'},{status:0,stdout:''}]){
    const result=await superviseInstallation({launchOnce:()=>child,readEvidence:()=>assert.fail('No evidence read')});
    assert.equal(result.status,'UNRESOLVED');
  }
});

for(const installed of [false,true])for(const preserved of [false,true]){
  test('raw '+(installed?'new':'original')+' fingerprints with preservation '+preserved+' determine presence independently',()=>{
    const result=classifyReconciliation({priorBackendFinished:true,...rawViews(installed),preservationMatches:preserved});
    assert.equal(result.installationPresence,installed?'PRESENT':'ABSENT');
    assert.equal(result.preservationStatus,preserved?'MATCH':'DRIFT');
    assert.equal(result.stop,true);assert.equal(result.sqlResubmitted,false);
    assert.notEqual(result.classification,'COMMITTED_AND_VERIFIED');
    assert.notEqual(result.classification,'COMMITTED_WITH_DRIFT');
    assert.equal(resultExitCode('--reconcile',{status:result.classification}),2);
  });
}

for(const [name,mutate] of [
  ['unknown catalog',views=>{views.preState.compatibility_sha256='0'.repeat(64);views.postState.compatibility_sha256='0'.repeat(64);}],
  ['unknown function',views=>{views.preState.function.source_md5='0'.repeat(32);views.postState.function.source_md5='0'.repeat(32);}],
  ['inconsistent views',views=>{views.preState=rawViews(false).preState;}],
  ['wrong owner',views=>{views.preState.function.owner='other';views.postState.function.owner='other';}],
]){
  test('reconciliation remains unresolved for '+name,()=>{
    const views=rawViews(true);mutate(views);
    const result=classifyReconciliation({priorBackendFinished:true,...views,preservationMatches:false});
    assert.equal(result.classification,'UNRESOLVED');assert.equal(result.installationPresence,'UNRESOLVED');
    assert.equal(result.sqlResubmitted,false);assert.equal(result.stop,true);
  });
}

test('active backend, unknown preservation and missing raw views cannot infer installation',()=>{
  for(const args of [
    {priorBackendFinished:false,...rawViews(true),preservationMatches:false},
    {priorBackendFinished:true,...rawViews(true)},
    {priorBackendFinished:true,preservationMatches:false},
  ])assert.equal(classifyReconciliation(args).classification,'UNRESOLVED');
});

test('UTC freshness parses original ISO JSON equally for explicit offsets',()=>{
  const now=Date.parse('2026-10-13T12:34:04.365Z');
  for(const verifiedAt of ['2026-10-13T12:33:34.351Z','2026-10-13T20:33:34.351+08:00','2026-10-13T05:33:34.351-07:00']){
    const proof={project:TARGET.project,host:TARGET.host,status:'ACTIVE_HEALTHY',verifiedVia:'supabase-control-plane-get-project',verifiedAt};
    const result=verifyControlPlaneProofJson(bytes(proof),{now});
    assert.equal(result.ageSeconds,30.014);
  }
});

test('five-minute freshness cannot be removed or extended and future proofs fail',()=>{
  const proof={project:TARGET.project,host:TARGET.host,status:'ACTIVE_HEALTHY',verifiedVia:'supabase-control-plane-get-project',verifiedAt:'2026-10-13T12:00:00.000Z'};
  assert.equal(verifyControlPlaneProofJson(bytes(proof),{now:Date.parse(proof.verifiedAt)+300000}).ageSeconds,300);
  assert.throws(()=>verifyControlPlaneProofJson(bytes(proof),{now:Date.parse(proof.verifiedAt)+300001}),/CONTROL_PLANE_PROOF_EXPIRED/);
  assert.throws(()=>verifyControlPlaneProofJson(bytes(proof),{now:Date.parse(proof.verifiedAt)-1}),/CONTROL_PLANE_PROOF_EXPIRED/);
  assert.throws(()=>verifyControlPlaneProof(proof,{now:Date.parse(proof.verifiedAt),maxAgeMs:300001}),/CONTROL_PLANE_FRESHNESS_LIMIT_INVALID/);
  assert.throws(()=>verifyControlPlaneProofJson(bytes({...proof,verifiedAt:'2026-10-13T12:00:00'})),/EXPLICIT_ISO_TIMESTAMP_REQUIRED/);
});

test('forced native driver is denied even when the variable is an empty string',()=>{
  assert.equal(environmentSafety({}),true);
  for(const value of ['1','', '0'])assert.throws(()=>environmentSafety({NODE_PG_FORCE_NATIVE:value}),/NATIVE_DRIVER_OVERRIDE_FORBIDDEN/);
});

test('candidate pins unchanged SQL, eleven inputs and the same 138 dependency files',async()=>{
  const loaded=await loadReviewedInputs();
  assert.equal(loaded.inputs.sql.length,SQL_BYTES);assert.equal(sha256(loaded.inputs.sql),SQL_SHA);
  assert.equal(Object.keys(loaded.inputs).length,11);assert.equal(loaded.driver.files.length,138);
  assert.equal(loaded.codeHashes.length,5);
});

test('receipt validation is wired before success lock release and stopped results are nonzero',async()=>{
  const runner=(await readRelative('./native-budget-pause-runner.mjs')).toString('utf8');
  const guarded=runner.slice(runner.indexOf("if(result.status==='COMMITTED_AND_VERIFIED')"),runner.indexOf('async function runReconcile'));
  assert.ok(guarded.indexOf('verifyInstallationReceipt(')<guarded.indexOf('retainLock=false'));
  assert.ok(guarded.includes("status:'COMMITTED_POSTFLIGHT_FAILED',retainLock:true"));
  assert.ok(runner.includes("process.exitCode=resultExitCode(process.argv[2]??'--review',result)"));
});
