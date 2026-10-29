// Create ONE new active proof (create-new) from fresh sanitized control-plane evidence. UTC-safe Date.parse arithmetic.
import {createHash} from 'node:crypto';
import {readFile,readdir,open,stat,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyControlPlaneProof} from '../budget-runner-core.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url));
const state=resolve(process.env.USERPROFILE,'.ytrace-production-budget-deletion-pause'),active=join(state,'control-plane-proof.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const acl=path=>{const r=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve(directory,'../operation-acl.ps1'),'-Action','Verify','-Path',path],{encoding:'utf8'});if(r.status!==0||JSON.parse(r.stdout).status!=='PASS')throw new Error('PROOF_ACL_FAILED');};
try{
  const expected=['control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json','control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json','control-plane-proof-history-79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1.json','preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json'].sort();
  const names=(await readdir(state)).sort();
  if(names.join(',')!==expected.join(','))throw new Error('UNEXPECTED_POST_ARCHIVE_OPERATOR_STATE');
  for(const n of expected.slice(0,3))if(sha(await readFile(join(state,n)))!==n.slice(28,92))throw new Error('ARCHIVE_HASH_CHANGED');
  acl(state);
  const source=JSON.parse(await readFile(resolve(directory,'control-plane-evidence.json'),'utf8'));
  const proof={project:source.project,host:source.host,status:source.status,verifiedVia:source.verifiedVia,verifiedAt:source.verifiedAt};
  verifyControlPlaneProof(proof);
  const bytes=Buffer.from(JSON.stringify(proof)+'\n','utf8');
  const handle=await open(active,'wx');
  try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
  const written=await readFile(active);
  if(sha(written)!==sha(bytes)||(await stat(active)).size!==bytes.length)throw new Error('FRESH_PROOF_INTEGRITY_MISMATCH');
  acl(active);
  const now=Date.now();
  const result={status:'PASS',project:proof.project,host:proof.host,proofSha256:sha(bytes),proofBytes:bytes.length,proofVerifiedAt:proof.verifiedAt,proofAgeSeconds:(now-Date.parse(proof.verifiedAt))/1000,proofExpiresAt:new Date(Date.parse(proof.verifiedAt)+300000).toISOString(),createNewUsed:true,activeProofAclVerified:true,historicalFilesPreserved:4,installationStateCreated:false,verifiedAt:new Date(now).toISOString()};
  await writeFile(resolve(directory,'fresh-proof-verification.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'BLOCKED',code:/^[A-Z_]+$/.test(error.message)?error.message:(error.code??'FRESH_PROOF_LOCAL_OPERATION_FAILED'),automaticRetries:0,databaseConnectionAttempted:false}));process.exitCode=2;}
