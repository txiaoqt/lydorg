// Final local evidence preservation only; no database/network operations.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,bundleSha256,verifyBudgetSql,verifyReadOnlyInputContracts} from '../budget-runner-core.mjs';
const evidence=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(evidence,'..'),root=resolve(evidence,'../../../../..');
const json=async file=>JSON.parse(await readFile(resolve(evidence,file),'utf8'));
const before=await json('operator-state-before.json'),after=await json('operator-state-after.json');
const oldArchive=before.files.find(item=>item.name.startsWith('control-plane-proof-history-'));
const oldActive=before.files.find(item=>item.name==='control-plane-proof.json');
const renamedName='control-plane-proof-history-'+oldActive.sha256+'.json';
const observedAccessChanges=[];
for(const [oldItem,newName] of [[oldArchive,oldArchive.name],[oldActive,renamedName]]){
  const current=after.metadata.find(item=>item.name===newName);assert.ok(current);
  for(const key of ['bytes','directory','createdAt','lastWriteAt','attributes','aclSha256','sha256'])assert.equal(current[key],oldItem[key]);
  assert.equal(current.effectiveAclVerified,true);
  if(current.lastAccessAt!==oldItem.lastAccessAt)observedAccessChanges.push({artifact:newName,before:oldItem.lastAccessAt,after:current.lastAccessAt});
}
assert.equal(after.metadata.find(item=>item.directory).aclSha256,before.files.find(item=>item.directory).aclSha256);
assert.equal(after.metadata.find(item=>item.directory).createdAt,before.files.find(item=>item.directory).createdAt);
assert.equal(after.stateFiles.length,4);assert.ok(after.metadata.every(item=>item.effectiveAclVerified));
for(const key of ['authorizationExists','approvedPreflightExists','operationLockExists','installationAttemptMarkerExists','preflightEvidenceCopiedToApproval'])assert.equal(after[key],false);
const result=await json('read-only-verification-result.json');
assert.equal(result.status,'PASS');assert.equal(result.inventoryComparison.matched,57);assert.equal(result.inventoryComparison.changed,0);
assert.equal(after.metadata.find(item=>item.name==='control-plane-proof.json').sha256,result.controlPlaneProofSha256);
assert.equal(after.metadata.find(item=>item.name===result.operatorEvidenceFile).sha256,result.preflightEvidenceSha256);
const foundation=await json('foundation-supplemental-comparison.json');
assert.equal(foundation.completeStableFoundationMatches,true);assert.equal(foundation.structureMatches,true);
const manifestBytes=await readFile(resolve(adapter,'reviewed-inputs.json')),manifest=JSON.parse(manifestBytes);
assert.equal(sha256(manifestBytes),'562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb');
assert.equal(bundleSha256(manifestBytes,manifest.codeIdentities),'58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25');
for(const pin of manifest.codeIdentities){const bytes=await readFile(resolve(adapter,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);}
const inputs={};
for(const [key,pin] of Object.entries(manifest.inputs)){const bytes=await readFile(resolve(root,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);inputs[key]=bytes;}
verifyBudgetSql(inputs.sql);verifyReadOnlyInputContracts(inputs);
const previous=resolve(adapter,'native-readonly-20261013T084554Z');
const oldManifest=JSON.parse(await readFile(resolve(previous,'local-evidence-manifest.json'),'utf8'));
for(const pin of oldManifest.files){const bytes=await readFile(resolve(previous,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);}
const final={...result,recordType:'YTRACE_BUDGET_PAUSE_READ_ONLY_EXECUTION_RECEIPT',recordedAt:new Date().toISOString(),decision:'GO_TO_PREPARE_SEPARATE_INSTALLATION_AUTHORIZATION',installationExecuted:false,installationSqlSubmitted:false,operatorState:{expectedFiles:4,archivesContentCreationWriteOwnershipAclPreserved:true,ordinaryOsManagedLastAccessChanges:observedAccessChanges,rootOwnershipAclPreserved:true,allEffectiveAclsVerified:true,authorizationCreated:false,approvedPreflightCreated:false,installationLockCreated:false,installationAttemptMarkerCreated:false},foundationFullStableSha256:foundation.currentFullFoundationSha256,foundationFullStableComparison:'PASS',priorFailureFilesHashVerified:oldManifest.files.length,reviewedAdapterManifestSqlUnchanged:true,proofFreshnessContradiction:'Resolved read-only from raw UTC JSON and reproduced outer PowerShell DateTime/string conversion; original contradictory receipt preserved',preflightSnapshotAdoptedAsInstallationApproval:false,installationPrerequisites:['Separate explicit production authorization bound to exact artifacts and successful preflight evidence','Exclusive low-traffic drained execution window','Fresh control-plane proof and immediate catalog/data verification within its five-minute validity window','Reviewed protected-state preparation without clearing or overwriting existing evidence']};
await writeFile(resolve(evidence,'read-only-execution-receipt.json'),JSON.stringify(final,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',nativeAttempts:1,inventoriesMatched:57,foundationStableMatches:true,protectedOperatorStatePreserved:true,previousFailureEvidenceUnchanged:true,installationExecuted:false,preflightEvidenceSha256:result.preflightEvidenceSha256,decision:final.decision}));
