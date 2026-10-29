// Final local preservation check and review manifest; no live operations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(directory,'..'),root=resolve(directory,'../../../../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const before=await json(resolve(directory,'operator-state-before.json')),after=await json(resolve(directory,'operator-state-after.json'));
assert.deepEqual(before.files,after.files);assert.equal(before.files.length,4);
const priorState=await json(resolve(adapter,'native-readonly-20261013T103131Z/operator-state-after.json'));
const accessChanges=[];
for(const item of before.metadata){
  const later=after.metadata.find(row=>row.name===item.name),historical=priorState.metadata.find(row=>row.name===item.name);assert.ok(later&&historical);
  for(const key of ['directory','bytes','createdAt','lastWriteAt','attributes','aclSha256']){assert.equal(later[key],item[key]);assert.equal(item[key],historical[key]);}
  if(later.lastAccessAt!==item.lastAccessAt)accessChanges.push({artifact:item.name,before:item.lastAccessAt,after:later.lastAccessAt});
}
const audit=await json(resolve(directory,'independent-artifact-review.json'));
for(const pin of audit.verifiedCodeFiles){const bytes=await readFile(resolve(adapter,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
for(const pin of audit.verifiedInputPins){const bytes=await readFile(resolve(root,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
const historical=resolve(adapter,'native-readonly-20261013T103131Z');
const historicalManifest=await json(resolve(historical,'local-evidence-manifest.json'));
for(const pin of historicalManifest.files){const bytes=await readFile(resolve(historical,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
const failed=resolve(adapter,'native-readonly-20261013T084554Z'),failedManifest=await json(resolve(failed,'local-evidence-manifest.json'));
for(const pin of failedManifest.files){const bytes=await readFile(resolve(failed,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
const draft=await readFile(resolve(directory,'authorization-proposal.md'),'utf8');
assert.ok(draft.includes('NON-RUNNABLE DRAFT — NOT APPROVED'));assert.ok(draft.includes('TO BE EXPLICITLY APPROVED'));assert.ok(!draft.includes('"approved": true'));
const statusBefore=await readFile(resolve(directory,'git-status-before.txt')),statusAfter=await readFile(resolve(directory,'git-status-after.txt'));
const logPaths={disposableSql:'docs/production-security/budget-deletion-pause/20261013T023224Z/sql-tests.tap',uiClient:'docs/production-security/budget-deletion-pause/20261013T023224Z/frontend-tests.log',adapter:'docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/focused-tests.tap'};
const reusedTestEvidence={};
for(const [name,path] of Object.entries(logPaths)){const bytes=await readFile(resolve(root,path));reusedTestEvidence[name]={path,sha256:sha(bytes),rerun:false};}
const preservation={status:'PASS',operatorStateFiles:4,operatorFileContentsRead:false,operatorRootFilesCreationWriteAttributesAclPreserved:true,ordinaryOsManagedAccessChanges:accessChanges,pinnedCodeAndInputBytesUnchanged:true,historicalSuccessFilesPreserved:historicalManifest.files.length,historicalFailedFilesHashVerified:failedManifest.files.length,dirtyPorcelainStatusUnchanged:statusBefore.equals(statusAfter),qualification:'Porcelain status is not a byte-level snapshot of every unrelated dirty file; this review edited only its new review directory.',reusedTestEvidence,completedTestSuitesRerun:0,newPureDiscrepancyProbe:1,productionConnectionAttempted:false,freshNativePreflightExecuted:false,proofArchivedOrRefreshed:false,installationExecuted:false,authorizationRecordCreated:false,operationLockCreated:false,installationAttemptMarkerCreated:false};
await writeFile(resolve(directory,'preservation-verification.json'),JSON.stringify(preservation,null,2)+'\n',{flag:'wx'});
const files=[];
for(const file of (await readdir(directory)).sort()){
  if(file==='review-artifact-manifest.json')continue;
  const path=resolve(directory,file),info=await lstat(path);assert.equal(info.isSymbolicLink(),false);assert.equal(info.isFile(),true);
  const bytes=await readFile(path);files.push({file,bytes:bytes.length,sha256:sha(bytes)});
}
const result={status:'GO_TO_REQUEST_SUPERVISED_INSTALLATION_AUTHORIZATION',executionCurrentlyAuthorized:false,unattendedOrchestration:'NO_GO',reviewedSqlSha256:audit.sqlSha256,reviewedSqlBytes:audit.sqlBytes,reviewedBundleSha256:audit.reviewedBundleSha256,reviewedManifestSha256:audit.manifestSha256,historicalPreflightEvidenceSha256:audit.successfulPreflightEvidenceSha256,historicalPreflightStateFingerprint:audit.preflightStateFingerprint,requiredControls:['New exclusive drained window','Fresh immutable proof and fresh same-state approval bindings','UTC-safe outer parsing','JSON/receipt success whitelist','Raw catalog/function reconciliation for stopped outcomes'],files};
const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
await writeFile(resolve(directory,'review-artifact-manifest.json'),bytes,{flag:'wx'});
console.log(JSON.stringify({status:result.status,reviewFiles:files.length,reviewArtifactManifestSha256:sha(bytes),operatorFourFileStatePreserved:true,reviewedSqlAndBundleUnchanged:true,productionConnectionAttempted:false,installationAuthorized:false}));
