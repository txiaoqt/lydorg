// Saved evidence comparison only. No PostgreSQL/network/client construction.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  sha256,protectedDataDigest,expectedRelationsFromSql,verifyBudgetState,verifyNativeIdentity,
  foundationStructure,verifyFoundationReceipt,hashJson,preflightStateFingerprint,
} from '../budget-runner-core.mjs';
const evidence=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(evidence,'..'),root=resolve(evidence,'../../../../..');
const state=resolve(process.env.USERPROFILE,'.ytrace-production-budget-deletion-pause');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const output=await json(resolve(evidence,'native-preflight-output.json'));
assert.equal(output.status,'PASS');assert.equal(output.mode,'READ_ONLY_PREFLIGHT');assert.equal(output.installationActivated,false);
assert.match(output.evidenceFile,/^preflight-[0-9TZ]+-[a-f0-9-]{36}\.json$/);
const bytes=await readFile(join(state,output.evidenceFile)),snapshot=JSON.parse(bytes);
assert.equal(snapshot.runnerBundleSha256,'58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25');
assert.equal(snapshot.project,'mqqaykksadotbrghbexz');assert.equal(snapshot.host,'db.mqqaykksadotbrghbexz.supabase.co');
assert.equal(snapshot.status,'READ_ONLY_PREFLIGHT_PASS');
assert.equal(snapshot.approvalFingerprint,preflightStateFingerprint(snapshot));
verifyBudgetState(snapshot.budget,'pre');verifyNativeIdentity(snapshot.identity,{applicationName:snapshot.identity.application_name,readOnly:true});
assert.equal(snapshot.tls.chainVerified,true);assert.equal(snapshot.tls.hostnameVerified,true);
assert.equal(snapshot.tls.caSha256,'700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7');
const sourceProofBytes=await readFile(join(state,'control-plane-proof.json'));
const sourceProof=JSON.parse(sourceProofBytes);
assert.equal(sha256(sourceProofBytes),snapshot.controlPlaneEvidenceSha256);
const completion=await json(resolve(evidence,'preflight-completion.json'));
const proofTime=Date.parse(sourceProof.verifiedAt);
const ages={atStartSeconds:(Date.parse(completion.startedAt)-proofTime)/1000,atCaptureSeconds:(Date.parse(snapshot.capturedAt)-proofTime)/1000,atFinishSeconds:(Date.parse(completion.finishedAt)-proofTime)/1000};
assert.ok(Object.values(ages).every(age=>age>=0&&age<=300));
const freshness={status:'PASS',verifiedAt:sourceProof.verifiedAt,startedAt:completion.startedAt,capturedAt:snapshot.capturedAt,finishedAt:completion.finishedAt,...ages,requiredMaxAgeSeconds:300,originalWrapperAgeSeconds:completion.proofAgeAtFinishSeconds,originalWrapperCalculationContradictsRawUtc:Math.abs(completion.proofAgeAtFinishSeconds-ages.atFinishSeconds)>1,explanation:'The outer PowerShell JSON parser converts ISO dates to DateTime. Casting that value back to a timezone-free string before DateTimeOffset.Parse interpreted it in local UTC+08:00, inflating age by eight hours. Node JSON parsing preserves explicit UTC; the adapter independently checked the actual proof before connection.',originalReceiptPreserved:true,nativeAttemptRepeated:false};
await writeFile(resolve(evidence,'proof-freshness-independent.json'),JSON.stringify(freshness,null,2)+'\n',{flag:'wx'});
const inventoryBytes=await readFile(resolve(adapter,'budget-protected-data-readonly.sql'));
const relations=expectedRelationsFromSql(inventoryBytes);
const referencePath=resolve(root,'docs/production-security/budget-deletion-pause/20261012T165000Z/protected-data-readonly.json');
const referenceBytes=await readFile(referencePath);
assert.equal(sha256(referenceBytes),'2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc');
const before=protectedDataDigest(JSON.parse(referenceBytes),relations),after=protectedDataDigest(snapshot.protectedData,relations);
assert.equal(after.sha256,snapshot.protectedData.sha256);assert.equal(after.sha256,output.protectedInventoriesSha256);
const differences=[];
for(let i=0;i<before.rows.length;i++){
  const a=before.rows[i],b=after.rows[i];assert.equal(a.relation,b.relation);
  if(a.row_count!==b.row_count||a.content_fingerprint!==b.content_fingerprint)differences.push({relation:a.relation,beforeCount:a.row_count,currentCount:b.row_count,rowCountChanged:a.row_count!==b.row_count,beforeFingerprint:a.content_fingerprint,currentFingerprint:b.content_fingerprint});
}
const manifest=await json(resolve(adapter,'reviewed-inputs.json'));
const receiptBytes=await readFile(resolve(root,manifest.inputs.foundationReceipt.file));
assert.equal(sha256(receiptBytes),manifest.inputs.foundationReceipt.sha256);
const foundationExpected=verifyFoundationReceipt(JSON.parse(receiptBytes));
assert.equal(hashJson(foundationStructure(snapshot.foundation.value)),foundationExpected.sha256);
assert.equal(snapshot.foundation.structureSha256,foundationExpected.sha256);
assert.equal(snapshot.budget.storage_objects,378);assert.equal(snapshot.budget.storage_policy_count,15);assert.equal(snapshot.budget.migration_history.count,164);
const comparison={status:differences.length?'FAIL_PROTECTED_INVENTORY_DRIFT':'PASS',expectedInventories:57,capturedInventories:57,matchedInventories:57-differences.length,changedInventories:differences.length,referenceFileSha256:sha256(referenceBytes),referenceInventoriesSha256:before.sha256,currentInventoriesSha256:after.sha256,differences,baselineAdopted:false,baselineModified:false,legitimacyOfDifferences:'NOT ESTABLISHED BY THIS PREFLIGHT',nativeAttemptCount:1,automaticRetries:0};
await writeFile(resolve(evidence,'inventory-comparison.json'),JSON.stringify(comparison,null,2)+'\n',{flag:'wx'});
await writeFile(resolve(evidence,'native-preflight-evidence.json'),bytes,{flag:'wx'});
const result={status:differences.length?'NO_GO_INVENTORY_DRIFT':'PASS',project:snapshot.project,host:snapshot.host,route:snapshot.route,nativeReadOnlyPreflight:'PASS',tls:{chainVerified:true,hostnameVerified:true,encryptedSocketVerified:true,protocol:snapshot.tls.protocol,peerCertificateFingerprint256:snapshot.tls.peerCertificateFingerprint256},postgresql:{serverVersion:snapshot.budget.server_version,serverVersionNum:snapshot.identity.server_version_num,database:snapshot.identity.database,currentUser:snapshot.identity.current_user,sessionUser:snapshot.identity.session_user,readOnly:snapshot.identity.transaction_read_only,expectedPrivilegesVerified:true},originalUnpausedRpcAndCatalog:'PASS',catalogSha256:snapshot.budget.compatibility_sha256,functionDefinitionMd5:snapshot.budget.function.definition_md5,functionSourceMd5:snapshot.budget.function.source_md5,foundationStructure:'PASS',foundationStructureSha256:foundationExpected.sha256,productionEnvironmentGuard:snapshot.budget.containment_guard,migrations:snapshot.budget.migration_history,storagePolicies:snapshot.budget.storage_policy_count,storageObjects:snapshot.budget.storage_objects,inventoryComparison:{matched:57-differences.length,changed:differences.length,beforeSha256:before.sha256,currentSha256:after.sha256},proofFreshness:freshness.status,proofAgeAtFinishSeconds:ages.atFinishSeconds,operatorEvidenceFile:output.evidenceFile,preflightEvidenceSha256:sha256(bytes),preflightStateSha256:snapshot.approvalFingerprint,controlPlaneProofSha256:sha256(sourceProofBytes),runnerBundleSha256:snapshot.runnerBundleSha256,manifestSha256:sha256(await readFile(resolve(adapter,'reviewed-inputs.json'))),nativeAttempts:1,automaticRetries:0,installationActivated:false,installationAuthorizationCreated:false,approvedPreflightCreated:false};
await writeFile(resolve(evidence,'read-only-verification-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
