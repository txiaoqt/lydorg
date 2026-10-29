// Offline evidence checks only. Operator proofs are never opened here.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,verifyBudgetInventoryCopy,verifyBudgetSql,bundleSha256} from '../budget-runner-core.mjs';
const evidence=fileURLToPath(new URL('.',import.meta.url));
const adapter=resolve(evidence,'..'),root=resolve(adapter,'../../../..');
const json=async file=>JSON.parse(await readFile(resolve(evidence,file),'utf8'));
const before=await json('operator-metadata-before.json'),after=await json('operator-metadata-after.json');
assert.deepEqual(before.stateFiles,after.stateFiles);
const accessChanges=[];
for(let i=0;i<before.properties.length;i++){
  const {lastAccessAt:oldAccess,...oldStable}=before.properties[i];
  const {lastAccessAt:newAccess,...newStable}=after.properties[i];
  assert.deepEqual(newStable,oldStable);
  if(oldAccess!==newAccess)accessChanges.push({artifact:oldStable.name,before:oldAccess,after:newAccess});
}
const acl=await json('operator-acl-verification.json');
assert.equal(acl.length,3);assert.ok(acl.every(row=>row.result.status==='PASS'&&row.result.effectiveAclVerified===true));
const prior=await json('prior-artifact-manifest.json');
for(const pin of prior.files){const bytes=await readFile(resolve(evidence,'prior-artifacts',pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);}
const previousAttempt=resolve(adapter,'native-readonly-20261013T084554Z');
const previousEvidence=JSON.parse(await readFile(resolve(previousAttempt,'local-evidence-manifest.json'),'utf8'));
for(const pin of previousEvidence.files){const bytes=await readFile(resolve(previousAttempt,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);}
const manifestBytes=await readFile(resolve(adapter,'reviewed-inputs.json')),manifest=JSON.parse(manifestBytes);
const ids=await json('corrected-identities.json');
assert.equal(sha256(manifestBytes),ids.manifestSha256);
assert.equal(bundleSha256(manifestBytes,manifest.codeIdentities),ids.bundleSha256);
for(const pin of manifest.codeIdentities){const bytes=await readFile(resolve(adapter,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);}
for(const pin of Object.values(manifest.inputs)){const bytes=await readFile(resolve(root,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);}
verifyBudgetSql(await readFile(resolve(root,manifest.sql.file)));
const relations=verifyBudgetInventoryCopy(await readFile(resolve(root,manifest.inputs.originalProtectedDataSql.file)),await readFile(resolve(root,manifest.inputs.protectedDataSql.file)));
for(const name of ['operation-acl.ps1','budget-identity-readonly.sql','authorization-draft.json','execution-receipt.template.json']){
  assert.deepEqual(await readFile(resolve(adapter,name)),await readFile(resolve(evidence,'prior-artifacts',name)));
}
const tests=await readFile(resolve(evidence,'focused-tests-final.tap'),'utf8');
assert.match(tests,/# tests 39\r?\n/);assert.match(tests,/# pass 39\r?\n/);assert.match(tests,/# fail 0\r?\n/);assert.match(tests,/# skipped 0\r?\n/);
assert.equal((tests.match(/^ok \d+ - actual SQL /gm)??[]).length,6);
const review=await json('offline-review-final.json');
assert.equal(review.status,'PASS');assert.equal(review.connectionAttempted,false);assert.equal(review.installationActivated,false);
assert.equal(review.runnerBundleSha256,ids.bundleSha256);assert.equal(review.protectedInventoryRelations,57);
const diff=await json('diff-checks-verified.json');assert.ok(diff.focused.every(check=>check.status==='PASS'));
const result={status:'PASS',mode:'LOCAL_CORRECTION_AND_OFFLINE_TESTS_ONLY',bundleSha256:ids.bundleSha256,manifestSha256:ids.manifestSha256,dedicatedInventorySha256:ids.dedicatedInventorySha256,originalInventorySha256:ids.originalInventorySha256,inventoryDefinitionsPreserved:relations.length,originalFoundationVerifierUnchanged:true,approvedProductionSqlUnchanged:true,approvedSql:ids.approvedSql,aclHelperUnchanged:true,identityVerifierUnchanged:true,otherPinnedInputsUnchanged:true,priorArtifactsVerified:prior.files.length,operatorProofContentRead:false,operatorProofContentHashesRecomputed:false,operatorStateFilesUnchanged:true,operatorCreationAndWriteTimesUnchanged:true,operatorOwnershipAndAclUnchanged:true,observedOsLastAccessChanges:accessChanges,operatorAuthLockMarkerOrApprovedPreflightCreated:false,focusedTests:{pass:39,fail:0,skip:0,actualInputTests:6},offlineReview:'PASS',focusedDiffChecks:'PASS',unrelatedDirtyWorktreeDiffCheck:{status:diff.trackedWorktree.status,diagnostic:'Existing trailing whitespace at src/lib/lydo-connect-supabase.ts:4535; outside this correction and unchanged.'},productionConnectionAttempted:false,nativePreflightInvoked:false,installationInvoked:false,liveTlsCatalogInventoryVerification:'NOT PERFORMED',readOnlyPreflightDecision:'GO_SUBJECT_TO_SEPARATE_AUTHORIZATION_AND_FRESH_PROOF',installationDecision:'NO_GO'};
result.previousNativeFailureFilesVerified=previousEvidence.files.length;
await writeFile(resolve(evidence,'preservation-and-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,focusedTests:39,actualInputTests:6,operatorStatePreserved:true,lastAccessChanges:accessChanges.length,bundleSha256:ids.bundleSha256,productionConnectionAttempted:false}));
