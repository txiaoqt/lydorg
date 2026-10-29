// ONE native read-only preflight with the exact reviewed runner. No retry. UTC-safe timestamps from Date values.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('.',import.meta.url)),root=resolve(directory,'../../../../..');
const runner='docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs';
if(process.version!=='v24.21.0'||process.env.NODE_PG_FORCE_NATIVE!==undefined){console.log(JSON.stringify({status:'BLOCKED',code:'LAUNCH_PRECONDITION_FAILED'}));process.exit(2);}
const proof=JSON.parse(await readFile(resolve(process.env.USERPROFILE,'.ytrace-production-budget-deletion-pause','control-plane-proof.json'),'utf8'));
const proofTime=Date.parse(proof.verifiedAt),start=Date.now();
if(!Number.isFinite(proofTime)||start-proofTime<0||start-proofTime>240000){console.log(JSON.stringify({status:'BLOCKED',code:'PROOF_TOO_OLD_TO_START',ageSeconds:(start-proofTime)/1000}));process.exit(2);}
const invocation={mode:'READ_ONLY_PREFLIGHT',project:'mqqaykksadotbrghbexz',host:'db.mqqaykksadotbrghbexz.supabase.co',runnerBundleSha256:'58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25',invocations:1,automaticRetries:0,installationActivated:false,startedAt:new Date(start).toISOString(),proofAgeAtStartSeconds:(start-proofTime)/1000};
await writeFile(resolve(directory,'preflight-invocation.json'),JSON.stringify(invocation,null,2)+'\n',{flag:'wx'});
const env={...process.env};delete env.NODE_PG_FORCE_NATIVE;
const run=spawnSync(process.execPath,['--env-file=.env.foundation.local',runner,'--preflight'],{cwd:root,encoding:'utf8',env,timeout:240000});
const finish=Date.now();
await writeFile(resolve(directory,'native-preflight-output.json'),run.stdout,{flag:'wx'});
if(run.stderr)await writeFile(resolve(directory,'native-preflight-stderr.txt'),run.stderr,{flag:'wx'});
const completion={mode:'READ_ONLY_PREFLIGHT',invocations:1,exitCode:run.status,signal:run.signal,startedAt:new Date(start).toISOString(),finishedAt:new Date(finish).toISOString(),durationSeconds:(finish-start)/1000,proofVerifiedAt:proof.verifiedAt,proofAgeAtFinishSeconds:(finish-proofTime)/1000,timestampMethod:'Node Date.parse on raw ISO UTC',automaticRetries:0,installationActivated:false};
await writeFile(resolve(directory,'preflight-completion.json'),JSON.stringify(completion,null,2)+'\n',{flag:'wx'});
console.log(run.stdout.trim());
if(run.stderr)console.log('STDERR_PRESENT_SEE_FILE');
console.log(JSON.stringify(completion));
