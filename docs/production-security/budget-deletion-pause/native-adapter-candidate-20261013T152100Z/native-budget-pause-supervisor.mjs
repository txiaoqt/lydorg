// Versioned local candidate. Default --review is offline.
// Only this supervisor can own/release the future installation lock.
import {readFile} from 'node:fs/promises';
import {resolve,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {
  TARGET,STATE_REL,STATE_FILES,SQL_SHA,canonicalJson,requireGuard,safeError,
  scrubReceiptValue,environmentSafety,verifyInstallationReceipt,resultExitCode,
  workerReadyForVerification,claimBudgetLock,
} from './budget-runner-core.mjs';
import {loadReviewedInputs,invokeAcl,prepareInstallation} from './native-budget-pause-runner.mjs';

// Injectable process factory is used only by offline tests. The CLI fixes the
// executable, worker path and arguments and never accepts arbitrary commands.
export async function launchWorkerOnce({runner,lock,bundleSha256,spawnProcess=spawn,verifyLock}){
  await lock.verify(verifyLock);
  return await new Promise(resolveChild=>{
    let stdout='',settled=false,leaseSent=false;
    const child=spawnProcess(process.execPath,[runner,'--install-worker'],{
      cwd:resolve(fileURLToPath(new URL('.',import.meta.url)),'../../../..'),
      windowsHide:true,env:{...process.env},stdio:['ignore','pipe','ignore','ipc'],
    });
    const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolveChild(result);};
    const fail=()=>{try{child.kill();}catch{}finish({status:null,error:true,stdout:''});};
    const timer=setTimeout(fail,5000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>65536)fail();});
    child.stdout.on('error',fail);
    child.on('error',fail);
    child.on('message',async message=>{
      if(leaseSent||message?.protocol!=='YTRACE_BUDGET_WORKER_READY_V1'||message.pid!==child.pid||message.bundleSha256!==bundleSha256){fail();return;}
      leaseSent=true; // At most one IPC lease and one worker launch, including failures.
      try{
        await lock.verify(verifyLock);
        if(settled)return;
        child.send({protocol:'YTRACE_BUDGET_SUPERVISOR_LEASE_V1',claim:lock.claim},error=>{if(error)fail();});
        clearTimeout(timer);
      }catch{fail();}
    });
    child.on('close',(status,signal)=>finish({status,signal,stdout,leaseSent}));
  });
}

// The lock is already exclusively owned before launch. No catch/finally releases
// it. A dead supervisor leaves the durable claim and marker for read-only review.
export async function superviseInstallation({lock,verifyLock,launchOnce,readEvidence,expectedBundleSha256,expectedRelations,expectedFoundation}){
  let launches=0;
  try{
    requireGuard(lock&&typeof lock.verify==='function'&&typeof lock.releaseAfterVerification==='function','SUPERVISOR_OWNED_LOCK_REQUIRED');
    await lock.verify(verifyLock);
    launches++;
    const child=await launchOnce();
    await lock.verify(verifyLock);
    requireGuard(child&&child.status===0&&!child.signal&&!child.error,'CHILD_DID_NOT_EXIT_SUCCESSFULLY');
    requireGuard(typeof child.stdout==='string'&&child.stdout.length>0&&child.stdout.length<=65536,'CHILD_RESULT_SIZE_INVALID');
    const result=scrubReceiptValue(JSON.parse(child.stdout));
    requireGuard(workerReadyForVerification(result),'CHILD_RESULT_NOT_VERIFIED_SUCCESS');
    const {receiptBytes,markerBytes,preflightBytes}=await readEvidence(result);
    await lock.verify(verifyLock);
    const receiptVerification=verifyInstallationReceipt({
      result,receiptBytes,markerBytes,preflightBytes,expectedBundleSha256,expectedRelations,expectedFoundation,expectedLockClaim:lock.claim,
    });
    requireGuard(canonicalJson(result.receiptVerification)===canonicalJson(receiptVerification),'CHILD_RECEIPT_PROOF_MISMATCH');
    await lock.verify(verifyLock);
    await lock.releaseAfterVerification(receiptVerification,verifyLock);
    return {...result,status:'COMMITTED_AND_VERIFIED',retainLock:false,receiptVerification,supervisorVerified:true,lockReleased:true,automaticRetries:0};
  }catch(error){
    return {status:'UNRESOLVED',code:'INSTALLATION_SUCCESS_NOT_ESTABLISHED',error:safeError(error),workerLaunches:launches,automaticRetries:0,retainLock:true,preserveOperationState:true,stopForHumanReview:true};
  }
}

async function main(){
  const args=process.argv.slice(2);
  requireGuard(args.length<=1&&(!args[0]||['--review','--install'].includes(args[0])),'UNSUPPORTED_SUPERVISOR_ARGUMENT');
  const mode=args[0]??'--review';
  environmentSafety(process.env);
  const loaded=await loadReviewedInputs();
  if(mode==='--review')return {status:'PASS',mode:'OFFLINE_REVIEW',project:TARGET.project,runnerBundleSha256:loaded.bundleSha256,installationActivated:false,connectionAttempted:false};
  requireGuard(typeof process.env.USERPROFILE==='string'&&isAbsolute(process.env.USERPROFILE),'SECURE_USER_PROFILE_UNAVAILABLE');
  const state=resolve(process.env.USERPROFILE,STATE_REL);
  // Exact existing operator authorization, fresh proof, reviewed preflight and
  // trusted environment are mandatory before claiming the exclusive lock.
  await prepareInstallation(loaded);
  const lock=await claimBudgetLock(resolve(state,STATE_FILES.lock),{bundleSha256:loaded.bundleSha256});
  const verifyLock=path=>invokeAcl('Verify',path);
  const directory=fileURLToPath(new URL('.',import.meta.url));
  return superviseInstallation({
    lock,verifyLock,
    expectedBundleSha256:loaded.bundleSha256,expectedRelations:loaded.relations,expectedFoundation:loaded.foundationExpected,
    launchOnce:()=>launchWorkerOnce({runner:resolve(directory,'native-budget-pause-runner.mjs'),lock,bundleSha256:loaded.bundleSha256,verifyLock}),
    readEvidence:async result=>{
      requireGuard(/^execution-[a-f0-9-]{36}\.jsonl$/.test(result.evidenceFile)&&/^install-preflight-[a-f0-9-]{36}\.json$/.test(result.preflightFile),'CHILD_EVIDENCE_PATH_INVALID');
      const receiptPath=resolve(state,result.evidenceFile),preflightPath=resolve(state,result.preflightFile),markerPath=resolve(state,STATE_FILES.marker);
      for(const file of [receiptPath,preflightPath,markerPath])await invokeAcl('Verify',file);
      const [receiptBytes,preflightBytes,markerBytes]=await Promise.all([readFile(receiptPath),readFile(preflightPath),readFile(markerPath)]);
      return {receiptBytes,preflightBytes,markerBytes};
    },
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().then(result=>{
    console.log(JSON.stringify(scrubReceiptValue(result)));
    process.exitCode=resultExitCode(process.argv[2]??'--review',result);
  }).catch(error=>{
    console.log(JSON.stringify({status:'BLOCKED',project:TARGET.project,sqlSha256:SQL_SHA,error:safeError(error),automaticRetries:0,preserveOperationState:true,stopForHumanReview:true}));
    process.exitCode=2;
  });
}
