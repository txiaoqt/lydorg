// Focused offline tests only. All marker/receipt fixtures remain in memory.
// No database client, environment-file loading, state-file creation or SQL execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {
  TARGET,SQL_SHA,SQL_BYTES,PRE_CATALOG_SHA,POST_CATALOG_SHA,
  EXPECTED_FUNCTION,EXPECTED_PAUSED_FUNCTION,sha256,hashJson,
  preflightStateFingerprint,expectedRelationsFromSql,foundationStructure,
  verifyInstallationReceipt,resultExitCode,classifyReconciliation,
  verifyControlPlaneProofJson,verifyControlPlaneProof,environmentSafety,
  claimBudgetLock,attachWorkerLock,createWorkerSupervisorChannel,supervisorChallenge,verifySupervisorChallenge,SUPERVISOR_ACK,runOneShot,verifySupervisorClaim,verifyPgDriverBinding,workerReadyForVerification,verifyOriginalBackendFinished,canonicalJson,
} from './budget-runner-core.mjs';
import {superviseInstallation as realSupervise,launchWorkerOnce} from './native-budget-pause-supervisor.mjs';
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
  const expectedLockClaim={recordType:'YTRACE_BUDGET_SUPERVISOR_LOCK',version:2,project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,runnerBundleSha256:bundle,pid:4242,nonce,createdAt:stamp(0)};
  const app={nonce,applicationName:'ytrace-budget-pause-i-'+nonce,runnerBundleSha256:bundle,caSha256:pre.tls.caSha256,backendPid:31337,backendStart:stamp(0)};
  pre.runnerBundleSha256=bundle;
  pre.capturedAt=stamp(1);
  pre.identity.backend_pid=app.backendPid;pre.identity.backend_start=app.backendStart;pre.identity.application_name=app.applicationName;
  pre.approvalFingerprint=preflightStateFingerprint(pre);
  const preflightBytes=bytes(pre);
  const marker={project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,runnerBundleSha256:bundle,preflightFile:'install-preflight-'+nonce+'.json',preflightSha256:sha256(preflightBytes),preflightStateSha256:pre.approvalFingerprint,attempt:1,submissionMayHaveOccurred:true,nonce,applicationName:app.applicationName,backendPid:app.backendPid,backendStart:app.backendStart,lockPid:4242,lockNonce:expectedLockClaim.nonce,startedAt:stamp(3)};
  const scoped={project:TARGET.project,sqlSha256:SQL_SHA};
  const events=[
    {...scoped,event:'ATTEMPT_ARMED',applicationIdentity:app,capturedAt:stamp(2)},
    {...scoped,event:'COMMIT_ACKNOWLEDGED',commands:['COMMIT'],capturedAt:stamp(4)},
    {...scoped,event:'POSTFLIGHT_EVIDENCE',status:'PASS',runnerBundleSha256:bundle,capturedAt:stamp(5),catalogSha256:POST_CATALOG_SHA,function:clone(EXPECTED_PAUSED_FUNCTION),migrationHistory:clone(pre.budget.migration_history),protectedInventoryCount:57,protectedInventoriesSha256:pre.protectedData.sha256,foundationSha256:pre.foundation.sha256,storagePolicyCount:15,storageObjects:pre.budget.storage_objects,organizationProfiles:pre.budget.organization_profiles,backend:{pid:app.backendPid,startedAt:app.backendStart,applicationName:app.applicationName}},
    {...scoped,event:'POSTFLIGHT_VERIFIED',commitAcknowledged:true,capturedAt:stamp(6)},
  ];
  const result={status:'COMMITTED_AWAITING_SUPERVISOR_VERIFICATION',supervisorLockSha256:hashJson(expectedLockClaim),commitAcknowledged:true,submissionCount:1,automaticRetries:0,rollbackStatementsSent:0,retainLock:true,retainAttemptMarker:true,project:TARGET.project,sqlSha256:SQL_SHA,runnerBundleSha256:bundle,evidenceFile:'execution-'+nonce+'.jsonl',preflightFile:marker.preflightFile};
  return {pre,marker,events,result,expectedLockClaim,expectedBundleSha256:bundle,expectedRelations:relations,expectedFoundation:{structure:foundationStructure(pre.foundation.value),sha256:hashJson(foundationStructure(pre.foundation.value))}};
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

// Wrapper for the earlier receipt-focused cases: lock/marker state stays in
// memory and is continuously checked by the actual supervisor implementation.
async function superviseInstallation(args){
  const claim=args.expectedLockClaim??fixture().expectedLockClaim;
  let present=true;
  const lock=args.lock??{claim,async verify(){assert.equal(present,true);},async releaseAfterVerification(proof){assert.equal(present,true);assert.equal(proof.supervisorLockSha256,hashJson(claim));present=false;}};
  return realSupervise({...args,lock});
}

test('complete receipt proves terminal COMMIT, one attempt and all preservation bindings',()=>{
  const f=fixture(),verification=verifyInstallationReceipt(argumentsFor(f));
  assert.equal(verification.status,'PASS');
  assert.equal(verification.terminalCommand,'COMMIT');
  assert.equal(verification.eventCount,4);
  assert.equal(verification.protectedInventories,57);
  assert.equal(resultExitCode('--install',{...f.result,receiptVerification:verification}),2);
  assert.equal(workerReadyForVerification({...f.result,receiptVerification:verification}),true);
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

for(const [field,value] of [['commitAcknowledged',false],['submissionCount',0],['submissionCount',2],['automaticRetries',1],['rollbackStatementsSent',1],['retainLock',false],['retainAttemptMarker',false],['stopForHumanReview',true]]){
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

test('worker never owns/releases the lock; supervisor verifies before its sole release',async()=>{
  const runner=(await readRelative('./native-budget-pause-runner.mjs')).toString('utf8');
  const supervisor=(await readRelative('./native-budget-pause-supervisor.mjs')).toString('utf8');
  assert.equal(runner.includes('claimBudgetLock('),false);
  assert.equal(runner.includes('lock.release'),false);
  assert.ok(runner.includes('attachWorkerLock('));
  assert.ok(supervisor.indexOf('verifyInstallationReceipt(')<supervisor.indexOf('await lock.releaseAfterVerification('));
  assert.ok(supervisor.indexOf('await prepareInstallation(loaded)')<supervisor.indexOf('await claimBudgetLock('));
  assert.ok(runner.includes("process.exitCode=resultExitCode(process.argv[2]??'--review',result)"));
});

async function ownedMemoryLock(){
  const state={current:null,present:false,marker:true,alive:true,releaseCalls:0,claims:0};
  const io={
    async createJson(path,value){if(state.present)throw Error('EEXIST');state.present=true;state.current=clone(value);state.claims++;},
    async readJson(){if(!state.present)throw Error('ENOENT');return clone(state.current);},
    async unlink(){assert.equal(state.present,true);state.present=false;state.releaseCalls++;},
    alive:()=>state.alive,
  };
  const lock=await claimBudgetLock(':memory-only:',{bundleSha256:bundle,pid:4242,io});
  const f=fixture();
  f.expectedLockClaim=lock.claim;f.marker.lockNonce=lock.claim.nonce;
  f.result.supervisorLockSha256=hashJson(lock.claim);
  return {state,io,lock,f};
}

test('supervisor holds the actual claim continuously through worker exit and independent receipt verification',async()=>{
  const {state,io,lock,f}=await ownedMemoryLock(),steps=[];
  const cannotAcquire=async label=>{
    steps.push(label);assert.equal(state.present,true);
    await assert.rejects(claimBudgetLock(':memory-only:',{bundleSha256:bundle,io}),/EEXIST/);
  };
  const result=await realSupervise({...f,lock,
    launchOnce:async()=>{await cannotAcquire('worker-start');await cannotAcquire('worker-exit');return {status:0,stdout:JSON.stringify(validResult(f))};},
    readEvidence:async()=>{await cannotAcquire('supervisor-read');return argumentsFor(f);},
  });
  assert.equal(result.status,'COMMITTED_AND_VERIFIED');assert.equal(result.supervisorVerified,true);
  assert.equal(resultExitCode('--install',result),0);
  assert.deepEqual(steps,['worker-start','worker-exit','supervisor-read']);
  assert.equal(state.releaseCalls,1);assert.equal(state.present,false);assert.equal(state.marker,true);assert.equal(state.claims,1);
});

for(const scenario of ['read failure','corrupt receipt','child signal','child uncertain','owner changed','supervisor interruption']){
  test('lock and marker remain on '+scenario+'; no SQL/worker retry',async()=>{
    const {state,lock,f}=await ownedMemoryLock();let launches=0;
    const result=await realSupervise({...f,lock,
      launchOnce:async()=>{
        launches++;
        if(scenario==='child uncertain')throw Error('uncertain');
        if(scenario==='child signal')return {status:null,signal:'SIGTERM',stdout:''};
        return {status:0,stdout:JSON.stringify(validResult(f))};
      },
      readEvidence:async()=>{
        assert.equal(state.present,true);
        if(scenario==='read failure')throw Error('EACCES');
        if(scenario==='supervisor interruption'){state.alive=false;throw Error('simulated supervisor terminated');}
        if(scenario==='corrupt receipt')f.events[2].function.source_md5='0'.repeat(32);
        if(scenario==='owner changed')state.current.nonce='00000000-0000-4000-8000-000000000000';
        return argumentsFor(f);
      },
    });
    assert.equal(result.status,'UNRESOLVED');assert.equal(result.automaticRetries,0);assert.equal(launches,1);
    assert.equal(state.present,true);assert.equal(state.marker,true);assert.equal(state.releaseCalls,0);
  });
}

test('an independently mismatched child proof cannot release the actual claim',async()=>{
  const {state,lock,f}=await ownedMemoryLock(),reported=validResult(f);
  reported.receiptVerification.receiptSha256='0'.repeat(64);
  const result=await realSupervise({...f,lock,launchOnce:()=>({status:0,stdout:JSON.stringify(reported)}),readEvidence:()=>argumentsFor(f)});
  assert.equal(result.status,'UNRESOLVED');assert.equal(state.present,true);assert.equal(state.releaseCalls,0);
});

test('release requires the exact owner and independently complete receipt proof',async()=>{
  const {state,lock,f}=await ownedMemoryLock();
  await assert.rejects(lock.releaseAfterVerification({status:'PASS'}),/SUPERVISOR_RELEASE_REQUIRES_VERIFIED_RECEIPT/);
  const proof=verifyInstallationReceipt(argumentsFor(f));
  await assert.rejects(lock.releaseAfterVerification({...proof,supervisorLockSha256:'0'.repeat(64)}),/SUPERVISOR_RELEASE_REQUIRES_VERIFIED_RECEIPT/);
  state.current.nonce='00000000-0000-4000-8000-000000000000';
  await assert.rejects(lock.releaseAfterVerification(proof),/BUDGET_LOCK_OWNERSHIP_MISMATCH/);
  assert.equal(state.present,true);assert.equal(state.releaseCalls,0);
});

test('worker has only a verification lease and cannot unlink a disconnected supervisor lock',async()=>{
  const {state,lock,io}=await ownedMemoryLock(),peer=memorySupervisorChannel(lock.claim);
  const lease=await attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:bundle,parentPid:4242,supervisorChannel:peer.channel,io});
  assert.deepEqual(Object.keys(lease).sort(),['assertLive','claim','guard','isLive','verify']);
  await lease.verify();peer.disconnect();
  await assert.rejects(lease.verify(),/SUPERVISOR_CHANNEL_DISCONNECTED/);
  assert.equal(state.present,true);assert.equal(state.marker,true);assert.equal(state.releaseCalls,0);
  peer.channel.close();
});

test('worker rejects wrong parent, bundle or changed claim before arming',async()=>{
  const {state,lock,io}=await ownedMemoryLock(),peer=memorySupervisorChannel(lock.claim);
  await assert.rejects(attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:bundle,parentPid:5555,supervisorChannel:peer.channel,io}),/WORKER_PARENT_IDENTITY_MISMATCH/);
  await assert.rejects(attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:'d'.repeat(64),parentPid:4242,supervisorChannel:peer.channel,io}),/SUPERVISOR_LOCK_SCOPE_MISMATCH/);
  state.current.nonce='00000000-0000-4000-8000-000000000000';
  await assert.rejects(attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:bundle,parentPid:4242,supervisorChannel:peer.channel,io}),/BUDGET_LOCK_OWNERSHIP_MISMATCH/);
  peer.channel.close();
});

test('dead supervisor state permits only read-only classification after the recorded writer finishes',async()=>{
  const {state,lock}=await ownedMemoryLock();state.alive=false;
  assert.equal(verifySupervisorClaim(state.current,bundle),state.current);
  let calls=0;const commands=[];
  const client={async query(query){
    calls++;commands.push(typeof query==='string'?query:query.text);
    if(calls===2)return {command:'SELECT',rows:[{reconciliation_state:{read_only:'on',database:'postgres',current_user:'postgres',session_user:'postgres',can_inspect_activity:true,prior_backend_active:false,matching_application_sessions:0}}]};
    return {command:calls===1?'SET':'ROLLBACK',rows:[]};
  }};
  const finished=await verifyOriginalBackendFinished(client,{backendPid:31337,backendStart:stamp(0),applicationName:'ytrace-budget-pause-i-'+nonce});
  assert.equal(finished.finished,true);assert.equal(calls,3);
  assert.ok(commands[0].includes('READ ONLY'));assert.equal(commands[2],'ROLLBACK;');
  assert.equal(classifyReconciliation({priorBackendFinished:finished.finished,...rawViews(true),preservationMatches:true}).installationPresence,'PRESENT');
  assert.equal(classifyReconciliation({priorBackendFinished:false,...rawViews(true),preservationMatches:true}).classification,'UNRESOLVED');
  assert.equal(state.present,true);assert.equal(state.marker,true);assert.equal(state.releaseCalls,0);
});

test('real harmless IPC child receives one parent lease; lock persists through process exit',async()=>{
  const {state,lock}=await ownedMemoryLock();lock.claim.pid=process.pid;state.current.pid=process.pid;
  let spawns=0;
  const program='process.once("message",m=>{if(m.protocol!=="YTRACE_BUDGET_SUPERVISOR_LEASE_V1"||m.claim.pid!==process.ppid)process.exit(2);process.disconnect();console.log(JSON.stringify({status:"UNRESOLVED"}));});process.send({protocol:"YTRACE_BUDGET_WORKER_READY_V1",pid:process.pid,bundleSha256:"'+bundle+'"});';
  const beforeNodeOptions=process.env.NODE_OPTIONS;
  const child=await launchWorkerOnce({runner:':not-executed:',lock,bundleSha256:bundle,
    spawnProcess:(file,args,options)=>{spawns++;return spawn(file,['-e',program],{...options,cwd:fileURLToPath(new URL('.',import.meta.url))});},
  });
  assert.equal(spawns,1);assert.equal(child.status,0);assert.equal(child.leaseSent,true);
  assert.equal(JSON.parse(child.stdout).status,'UNRESOLVED');
  assert.equal(process.env.NODE_OPTIONS,beforeNodeOptions,'child launch must not mutate the supervisor environment');
  assert.equal(state.present,true);assert.equal(state.releaseCalls,0);
});

function driverFixture(){
  const root=resolve('offline-pinned-root'),packagePath=resolve(root,'node_modules/pg/package.json'),entryPath=resolve(root,'node_modules/pg/lib/index.js');
  const pkg=bytes({name:'pg',version:'8.23.0'}),entry=Buffer.from('module.exports={Client:class{}};');
  const data=new Map([[packagePath,pkg],[entryPath,entry]]),links=new Set(),redirects=new Map();
  const manifest={driverVersion:'8.23.0',driverTree:{sha256:'b'.repeat(64),inventory:[{path:'node_modules/pg/package.json',bytes:pkg.length,sha256:sha256(pkg)},{path:'node_modules/pg/lib/index.js',bytes:entry.length,sha256:sha256(entry)}]}};
  let reads=0;
  const io={async lstat(path){return {isSymbolicLink:()=>links.has(path),isFile:()=>data.has(path),isDirectory:()=>!data.has(path)};},async realpath(path){return redirects.get(path)??path;},async readFile(path){reads++;if(!data.has(path))throw Error('ENOENT');return data.get(path);}};
  return {root,manifest,resolution:{packagePath,entryPath},io,data,links,redirects,reads:()=>reads};
}
test('expected pinned pg resolution binds real entry/package paths and hashed identity',async()=>{
  const f=driverFixture(),verified=await verifyPgDriverBinding(f);
  assert.equal(verified.entryPath,f.resolution.entryPath);assert.equal(verified.packagePath,f.resolution.packagePath);assert.equal(verified.name,'pg');assert.equal(verified.version,'8.23.0');
});
for(const scenario of ['candidate shadow','ancestor shadow','outside root','wrong entry']){
  test('rejects '+scenario+' resolution before reading/loading driver bytes',async()=>{
    const f=driverFixture();
    const base=scenario==='candidate shadow'?resolve(f.root,'docs/node_modules/pg'):scenario==='ancestor shadow'?resolve(f.root,'../node_modules/pg'):resolve(f.root,'../outside/pg');
    f.resolution.entryPath=scenario==='wrong entry'?resolve(f.root,'node_modules/pg/esm/index.mjs'):resolve(base,'lib/index.js');
    if(scenario!=='wrong entry')f.resolution.packagePath=resolve(base,'package.json');
    await assert.rejects(verifyPgDriverBinding(f),/PG_RESOLUTION_NOT_PINNED/);assert.equal(f.reads(),0);
  });
}
for(const part of ['node_modules','node_modules/pg','node_modules/pg/lib/index.js']){
  test('rejects symlink/junction at '+part,async()=>{
    const f=driverFixture();f.links.add(resolve(f.root,part));
    await assert.rejects(verifyPgDriverBinding(f),/PG_RESOLUTION_LINK_OR_TYPE_INVALID/);assert.equal(f.reads(),0);
  });
}
test('rejects realpath escape even when lstat appears regular',async()=>{
  const f=driverFixture();f.redirects.set(f.resolution.entryPath,resolve(f.root,'../escaped.js'));
  await assert.rejects(verifyPgDriverBinding(f),/PG_REALPATH_NOT_PINNED/);assert.equal(f.reads(),0);
});
for(const [name,value] of [['version','8.22.0'],['name','shadow-pg']]){
  test('rejects package '+name+' mismatch even with synthetic matching byte pin',async()=>{
    const f=driverFixture(),pkg=bytes({...JSON.parse(f.data.get(f.resolution.packagePath)),[name]:value});
    f.data.set(f.resolution.packagePath,pkg);
    f.manifest.driverTree.inventory[0]={...f.manifest.driverTree.inventory[0],bytes:pkg.length,sha256:sha256(pkg)};
    await assert.rejects(verifyPgDriverBinding(f),/PG_PACKAGE_IDENTITY_MISMATCH/);
  });
}
test('rejects absent pin or changed entry bytes',async()=>{
  for(const tamper of ['pin','bytes']){
    const f=driverFixture();
    if(tamper==='pin')f.manifest.driverTree.inventory.pop();else f.data.set(f.resolution.entryPath,Buffer.from('different'));
    await assert.rejects(verifyPgDriverBinding(f),tamper==='pin'?/PG_RESOLUTION_PIN_MISSING/:/PG_RESOLUTION_BYTES_DRIFT/);
  }
});
test('actual Node metadata resolution matches the verified repository closure; no Client is constructed',async()=>{
  const loaded=await loadReviewedInputs(),resolver=createRequire(import.meta.url);
  assert.equal(resolver.resolve('pg'),loaded.pgBinding.entryPath);
  assert.equal(resolver.resolve('pg/package.json'),loaded.pgBinding.packagePath);
  assert.equal(loaded.pgBinding.closureSha256,loaded.driver.sha256);assert.equal(loaded.driver.files.length,138);
  assert.equal(resolver.cache[loaded.pgBinding.entryPath],undefined);
});
test('all connection sites load only the reverified absolute entry and closure',async()=>{
  const runner=(await readRelative('./native-budget-pause-runner.mjs')).toString('utf8');
  assert.equal(runner.includes("createRequire(import.meta.url)('pg')"),false);
  assert.equal(runner.includes("createRequire(import.meta.url)('pg/package.json')"),false);
  assert.ok(runner.includes('resolver(binding.entryPath)'));
  const guard=runner.slice(runner.indexOf('async function getPinnedPgClient'),runner.indexOf('function safeEnvironmentForPowerShell'));
  assert.ok(guard.indexOf('verifyPgDriverBinding(')<guard.indexOf('resolver(binding.entryPath)'));
  assert.ok(guard.indexOf('computePgRuntimeClosure(')<guard.indexOf('resolver(binding.entryPath)'));
  assert.ok(runner.includes("if(mode==='--install-worker')requireGuard(process.connected===true"));
  assert.equal(runner.includes("if(mode==='--install')"),false);
});

// Process-identity regressions. IPC transports and operation state below are
// synthetic and in memory; Client.query is a stub, never a database connection.
function memorySupervisorChannel(claim,{timeoutMs=100}={}){
  const transport=new EventEmitter();transport.connected=true;
  const requests=[];let lastSequence=0,responder;
  transport.send=(request,callback)=>{requests.push(structuredClone(request));callback?.(null);queueMicrotask(()=>responder(request));};
  const disconnect=()=>{transport.connected=false;transport.emit('disconnect');};
  transport.disconnect=disconnect;
  const ack=request=>verifySupervisorChallenge(request,{claim,workerPid:77,lastSequence:lastSequence++});
  responder=request=>transport.emit('message',ack(request));
  const channel=createWorkerSupervisorChannel({claim,bundleSha256:bundle,transport,workerPid:77,parentPid:claim.pid,timeoutMs});
  return {channel,transport,requests,disconnect,ack,setResponder:fn=>{responder=fn;}};
}

test('live original IPC channel supplies fresh operation-specific acknowledgments',async()=>{
  const f=fixture(),peer=memorySupervisorChannel(f.expectedLockClaim);
  try{
    await peer.channel.verify();await peer.channel.verify();
    assert.equal(peer.channel.isLive(),true);assert.equal(peer.requests.length,2);
    const [first,second]=peer.requests;
    assert.equal(first.operationNonce,f.expectedLockClaim.nonce);assert.equal(first.claimSha256,hashJson(f.expectedLockClaim));
    assert.equal(first.runnerBundleSha256,bundle);assert.equal(first.supervisorPid,4242);assert.equal(first.workerPid,77);
    assert.equal(first.sequence,1);assert.equal(second.sequence,2);assert.notEqual(first.challenge,second.challenge);
  }finally{peer.channel.close();}
});

test('original channel loss is fatal while the original PID still appears present',async()=>{
  const {state,lock,io}=await ownedMemoryLock(),peer=memorySupervisorChannel(lock.claim);
  const lease=await attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:bundle,parentPid:4242,supervisorChannel:peer.channel,io});
  assert.equal(state.alive,true);peer.disconnect();
  await assert.rejects(lease.verify(),/SUPERVISOR_CHANNEL_DISCONNECTED/);
  assert.equal(state.alive,true);assert.equal(state.present,true);assert.equal(state.releaseCalls,0);peer.channel.close();
});

test('a different process reusing the PID cannot revive the lost original channel or unchanged claim',async()=>{
  const {state,lock,io}=await ownedMemoryLock(),peer=memorySupervisorChannel(lock.claim);
  const original=canonicalJson(state.current);
  const lease=await attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:bundle,parentPid:4242,supervisorChannel:peer.channel,io});
  peer.disconnect();state.alive=true;peer.transport.connected=true; // Simulated new occupant; not actual OS recycling.
  await assert.rejects(lease.verify(),/SUPERVISOR_CHANNEL_DISCONNECTED/);
  assert.equal(canonicalJson(state.current),original);assert.equal(state.present,true);assert.equal(state.marker,true);assert.equal(state.releaseCalls,0);
  peer.channel.close();
});

test('PID/file evidence without an original live channel is rejected',async()=>{
  const {state,lock,io}=await ownedMemoryLock();
  await assert.rejects(attachWorkerLock(':memory-only:',{claim:lock.claim,bundleSha256:bundle,parentPid:4242,io}),/SUPERVISOR_LIVE_CHANNEL_REQUIRED/);
  assert.equal(state.alive,true);assert.equal(state.present,true);assert.equal(state.releaseCalls,0);
});

for(const [name,mutate] of [
  ['wrong nonce',ack=>{ack.operationNonce='00000000-0000-4000-8000-000000000000';}],
  ['wrong challenge',ack=>{ack.challenge='00000000-0000-4000-8000-000000000000';}],
  ['wrong claim hash',ack=>{ack.claimSha256='0'.repeat(64);}],
  ['wrong bundle',ack=>{ack.runnerBundleSha256='0'.repeat(64);}],
  ['wrong parent',ack=>{ack.supervisorPid=5555;}],
  ['wrong worker',ack=>{ack.workerPid=5555;}],
  ['wrong sequence',ack=>{ack.sequence++;}],
  ['malformed protocol',ack=>{ack.protocol='unrecognized';}],
  ['extra field',ack=>{ack.extra=true;}],
]){
  test('invalid acknowledgment permanently fails closed: '+name,async()=>{
    const peer=memorySupervisorChannel(fixture().expectedLockClaim);
    peer.setResponder(request=>{const ack=peer.ack(request);mutate(ack);peer.transport.emit('message',ack);});
    await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_INVALID/);
    await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_INVALID/);
    assert.equal(peer.requests.length,1);peer.channel.close();
  });
}

test('missing acknowledgment expires and cannot be retried on the same lease',async()=>{
  const peer=memorySupervisorChannel(fixture().expectedLockClaim,{timeoutMs:20});peer.setResponder(()=>{});
  await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_TIMEOUT/);
  await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_TIMEOUT/);
  assert.equal(peer.requests.length,1);peer.channel.close();
});

test('replayed stale acknowledgment is rejected for the next fresh challenge',async()=>{
  const peer=memorySupervisorChannel(fixture().expectedLockClaim);let stale;
  peer.setResponder(request=>{stale=peer.ack(request);peer.transport.emit('message',stale);});
  await peer.channel.verify();
  peer.setResponder(()=>peer.transport.emit('message',stale));
  await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_INVALID/);peer.channel.close();
});

test('delayed valid acknowledgment after timeout cannot restore the lease',async()=>{
  const peer=memorySupervisorChannel(fixture().expectedLockClaim,{timeoutMs:20});let delayed;
  peer.setResponder(request=>{delayed=peer.ack(request);});
  await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_TIMEOUT/);
  peer.transport.emit('message',delayed);
  await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_TIMEOUT/);
  assert.equal(peer.channel.isLive(),false);peer.channel.close();
});

test('monotonic deadline rejects a late acknowledgment even before its delayed timer runs',async()=>{
  const peer=memorySupervisorChannel(fixture().expectedLockClaim,{timeoutMs:20});
  peer.setResponder(request=>{const ack=peer.ack(request);const deadline=performance.now()+30;while(performance.now()<deadline){}peer.transport.emit('message',ack);});
  await assert.rejects(peer.channel.verify(),/SUPERVISOR_ACK_TIMEOUT/);peer.channel.close();
});

test('disconnect during pending acknowledgment and send failure both latch failure',async()=>{
  for(const scenario of ['disconnect','send error']){
    const peer=memorySupervisorChannel(fixture().expectedLockClaim);
    if(scenario==='disconnect')peer.setResponder(()=>peer.disconnect());
    else peer.transport.send=(_,callback)=>callback(Error('synthetic send failure'));
    await assert.rejects(peer.channel.verify(),/SUPERVISOR_CHANNEL_(DISCONNECTED|SEND_FAILED)/);
    assert.equal(peer.channel.isLive(),false);peer.channel.close();
  }
});

test('supervisor rejects wrong claim, worker and sequence before acknowledging',()=>{
  const claim=fixture().expectedLockClaim;
  for(const change of [{operationNonce:'wrong'},{workerPid:88},{sequence:2},{claimSha256:'0'.repeat(64)}]){
    const request={...supervisorChallenge(claim,77,1,'11111111-2222-4333-8444-555555555555'),...change};
    assert.throws(()=>verifySupervisorChallenge(request,{claim,workerPid:77,lastSequence:0}),/SUPERVISOR_CHALLENGE_(INVALID|SCOPE_MISMATCH)/);
  }
});

async function simulatedSubmission(stage){
  const {state,lock:owner,io}=await ownedMemoryLock(),peer=memorySupervisorChannel(owner.claim);
  const lease=await attachWorkerLock(':memory-only:',{claim:owner.claim,bundleSha256:bundle,parentPid:4242,supervisorChannel:peer.channel,io});
  const events=[],files=new Map();let submissions=0,postflights=0;
  const client={query(){submissions++;if(stage==='during-query')return new Promise(resolve=>queueMicrotask(()=>{peer.disconnect();resolve({command:'COMMIT'});}));return Promise.resolve({command:'COMMIT'});}};
  const args={client,sqlBytes:await readRelative('../20261012T165000Z/budget_deletion_pause_production.sql'),markerPath:':memory-marker:',receiptPath:':memory-receipt:',lock:lease,preflight:{},preflightEvidence:{},applicationIdentity:{nonce,bundleSha256:bundle,runnerBundleSha256:bundle,backendPid:31337,backendStart:stamp(0),applicationName:'ytrace-budget-pause-i-'+nonce},
    stateIo:{async pathExists(path){return files.has(path);},async createJson(path,value){assert.equal(files.has(path),false);files.set(path,clone(value));if(stage==='before-submission')peer.disconnect();}},
    write:async(path,event)=>{events.push(event);if(stage==='after-commit'&&event.event==='COMMIT_ACKNOWLEDGED')peer.disconnect();},
    postflight:async()=>{postflights++;if(stage==='during-postflight')peer.disconnect();},
    verifyStatePath:async()=>{},
  };
  const result=await runOneShot(args);
  const evidence={result,submissions,postflights,markerPresent:files.has(':memory-marker:'),lockPresent:state.present,releaseCalls:state.releaseCalls,events};
  peer.channel.close();return evidence;
}

for(const [stage,count] of [['before-submission',0],['during-query',1],['after-commit',1],['during-postflight',1]]){
  test('channel loss '+stage+' stops unresolved, retains lock/marker and never resubmits',async()=>{
    const evidence=await simulatedSubmission(stage);
    assert.equal(evidence.result.status,'UNRESOLVED');assert.equal(evidence.submissions,count);
    assert.equal(evidence.result.submissionCount,count);assert.equal(evidence.result.automaticRetries,0);
    assert.equal(evidence.result.retainLock,true);assert.equal(evidence.result.retainAttemptMarker,true);
    assert.equal(evidence.markerPresent,true);assert.equal(evidence.lockPresent,true);assert.equal(evidence.releaseCalls,0);
    assert.equal(resultExitCode('--install',evidence.result),2);
  });
}

test('live channel allows one simulated submission with provisional receipt status only',async()=>{
  const evidence=await simulatedSubmission('live');
  assert.equal(evidence.submissions,1);assert.equal(evidence.postflights,1);
  assert.equal(evidence.result.status,'COMMITTED_AWAITING_SUPERVISOR_VERIFICATION');
  assert.equal(evidence.result.automaticRetries,0);assert.equal(evidence.lockPresent,true);assert.equal(evidence.markerPresent,true);assert.equal(evidence.releaseCalls,0);
  assert.equal(resultExitCode('--install',evidence.result),2);
});

test('real harmless child verifies two fresh challenges over its original inherited IPC channel',async()=>{
  const {state,lock}=await ownedMemoryLock();lock.claim.pid=process.pid;state.current.pid=process.pid;
  const program='(async()=>{const {createWorkerSupervisorChannel}=await import("./budget-runner-core.mjs");process.once("message",async m=>{let channel;try{channel=createWorkerSupervisorChannel({claim:m.claim,bundleSha256:"'+bundle+'"});await channel.verify();await channel.verify();channel.assertLive();console.log(JSON.stringify({status:"SYNTHETIC_ACK_VERIFIED",checks:2}));}catch{process.exitCode=2;}finally{channel?.close();}});process.send({protocol:"YTRACE_BUDGET_WORKER_READY_V1",pid:process.pid,bundleSha256:"'+bundle+'"});})();';
  let launches=0;
  const child=await launchWorkerOnce({runner:':never-executed:',lock,bundleSha256:bundle,spawnProcess:(file,args,options)=>{launches++;return spawn(file,['-e',program],{...options,cwd:fileURLToPath(new URL('.',import.meta.url))});}});
  assert.equal(launches,1);assert.equal(child.status,0);assert.equal(child.leaseSent,true);
  assert.deepEqual(JSON.parse(child.stdout),{status:'SYNTHETIC_ACK_VERIFIED',checks:2});
  assert.equal(state.present,true);assert.equal(state.marker,true);assert.equal(state.releaseCalls,0);
});

test('worker keeps IPC through final result; no reconnect/PID fallback and sole supervisor release remain',async()=>{
  const runner=(await readRelative('./native-budget-pause-runner.mjs')).toString('utf8');
  const core=(await readRelative('./budget-runner-core.mjs')).toString('utf8');
  const receive=runner.slice(runner.indexOf('async function receiveSupervisorClaim'),runner.indexOf('async function runInstallWorker'));
  assert.equal(receive.includes('process.disconnect()'),false);
  assert.ok(receive.includes('createWorkerSupervisorChannel('));assert.ok(runner.includes('await channel.verify(); // After database shutdown'));
  const lease=core.slice(core.indexOf('export async function attachWorkerLock'),core.indexOf('// Resolve first, verify paths'));
  assert.equal(lease.includes('io.alive'),false);assert.equal(lease.includes('process.kill'),false);
  assert.ok(core.includes('lock.assertLive(); // Last synchronous check'));assert.ok(core.includes('await lock.guard(client.query(sql))'));
  assert.equal(runner.includes('lock.release'),false);
});
