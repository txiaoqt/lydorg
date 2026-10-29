// Versioned candidate only. Default --review is offline.
// A future --install still requires separately approved records enforced by the runner.
import {readFile} from 'node:fs/promises';
import {resolve,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {
  TARGET,STATE_REL,STATE_FILES,SQL_SHA,canonicalJson,requireGuard,safeError,
  scrubReceiptValue,environmentSafety,verifyControlPlaneProofJson,
  verifyInstallationReceipt,resultExitCode,
} from './budget-runner-core.mjs';
import {loadReviewedInputs,invokeAcl} from './native-budget-pause-runner.mjs';

// Injected callbacks are only for offline unit tests. The CLI fixes both below.
export async function superviseInstallation({launchOnce,readEvidence,expectedBundleSha256,expectedRelations,expectedFoundation}){
  let child;
  try{child=await launchOnce();}
  catch{return {status:'UNRESOLVED',code:'CHILD_OUTCOME_UNCERTAIN',automaticRetries:0,stopForHumanReview:true};}
  let result;
  try{
    requireGuard(child&&child.status===0&&!child.signal&&!child.error,'CHILD_DID_NOT_EXIT_SUCCESSFULLY');
    requireGuard(typeof child.stdout==='string'&&child.stdout.length>0&&child.stdout.length<=65536,'CHILD_RESULT_SIZE_INVALID');
    result=scrubReceiptValue(JSON.parse(child.stdout));
    requireGuard(resultExitCode('--install',result)===0,'CHILD_RESULT_NOT_VERIFIED_SUCCESS');
    const {receiptBytes,markerBytes,preflightBytes}=await readEvidence(result);
    const receiptVerification=verifyInstallationReceipt({
      result,receiptBytes,markerBytes,preflightBytes,expectedBundleSha256,expectedRelations,expectedFoundation,
    });
    requireGuard(canonicalJson(result.receiptVerification)===canonicalJson(receiptVerification),'CHILD_RECEIPT_PROOF_MISMATCH');
    return {...result,receiptVerification,supervisorVerified:true,automaticRetries:0};
  }catch(error){
    return {status:'UNRESOLVED',code:'INSTALLATION_SUCCESS_NOT_ESTABLISHED',error:safeError(error),automaticRetries:0,stopForHumanReview:true};
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
  await invokeAcl('Verify',state);
  const proofPath=resolve(state,STATE_FILES.controlPlane);
  await invokeAcl('Verify',proofPath);
  verifyControlPlaneProofJson(await readFile(proofPath)); // Raw ISO JSON; maximum age is five minutes.
  const directory=fileURLToPath(new URL('.',import.meta.url));
  const runner=resolve(directory,'native-budget-pause-runner.mjs');
  return superviseInstallation({
    expectedBundleSha256:loaded.bundleSha256,expectedRelations:loaded.relations,expectedFoundation:loaded.foundationExpected,
    launchOnce:()=>spawnSync(process.execPath,[runner,'--install'],{
      cwd:resolve(directory,'../../../..'),encoding:'utf8',windowsHide:true,
      stdio:['ignore','pipe','pipe'],maxBuffer:1048576,env:process.env,
    }),
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
    console.log(JSON.stringify({status:'BLOCKED',project:TARGET.project,sqlSha256:SQL_SHA,error:safeError(error),automaticRetries:0,stopForHumanReview:true}));
    process.exitCode=2;
  });
}
