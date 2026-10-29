// Saved evidence comparison only. No PostgreSQL/network/client construction.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  sha256,protectedDataDigest,expectedRelationsFromSql,verifyBudgetState,verifyNativeIdentity,
  foundationStructure,verifyFoundationReceipt,hashJson,preflightStateFingerprint,safeError,
} from '../budget-runner-core.mjs';
const evidence=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(evidence,'..'),root=resolve(evidence,'../../../../..');
const state=resolve(process.env.USERPROFILE,'.ytrace-production-budget-deletion-pause');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
try{
  const output=await json(resolve(evidence,'native-preflight-output.json'));
  assert.equal(output.status,'PASS');assert.equal(output.mode,'READ_ONLY_PREFLIGHT');assert.equal(output.installationActivated,false);
  assert.match(output.evidenceFile,/^preflight-[0-9TZ]+-[a-f0-9-]{36}\.json$/);
  assert.notEqual(output.evidenceFile,'preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json');
  const bytes=await readFile(join(state,output.evidenceFile)),snapshot=JSON.parse(bytes);
  const historical=await json(resolve(adapter,'native-readonly-20261013T103131Z/native-preflight-evidence.json'));
  assert.equal(snapshot.runnerBundleSha256,'58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25');
  assert.equal(snapshot.sqlSha256,'a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a');
  assert.equal(snapshot.project,'mqqaykksadotbrghbexz');assert.equal(snapshot.host,'db.mqqaykksadotbrghbexz.supabase.co');assert.equal(snapshot.route,historical.route);
  assert.equal(snapshot.status,'READ_ONLY_PREFLIGHT_PASS');
  assert.equal(snapshot.approvalFingerprint,preflightStateFingerprint(snapshot));
  assert.equal(snapshot.approvalFingerprint,'8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc');
  verifyBudgetState(snapshot.budget,'pre');verifyNativeIdentity(snapshot.identity,{applicationName:snapshot.identity.application_name,readOnly:true});
  assert.equal(snapshot.tls.chainVerified,true);assert.equal(snapshot.tls.hostnameVerified,true);
  assert.equal(snapshot.tls.caSha256,'700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7');
  assert.equal(snapshot.tls.peerCertificateFingerprint256,historical.tls.peerCertificateFingerprint256);
  assert.equal(snapshot.budget.compatibility_sha256,'eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5');
  assert.equal(snapshot.budget.function.definition_md5,'f6c36316ba941c9e0f76674754ac44ba');assert.equal(snapshot.budget.function.source_md5,'eb7b756964fd31efebfb39749f5c9e5b');
  assert.deepEqual(snapshot.budget.function,historical.budget.function);
  assert.deepEqual(snapshot.budget.migration_history,historical.budget.migration_history);
  assert.equal(snapshot.budget.migration_history.count,164);
  assert.equal(snapshot.budget.storage_objects,378);assert.equal(snapshot.budget.storage_policy_count,15);
  assert.equal(snapshot.foundation.sha256,'770d3d419386094aa7be2cce8e1a5a47056fe2c972e4a043c8949652cd67dea5');assert.equal(snapshot.foundation.sha256,historical.foundation.sha256);
  assert.equal(snapshot.identity.server_version_num,historical.identity.server_version_num);
  const proofBytes=await readFile(join(state,'control-plane-proof.json')),proof=JSON.parse(proofBytes);
  assert.equal(sha256(proofBytes),'fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7');
  assert.equal(snapshot.controlPlaneEvidenceSha256,sha256(proofBytes));
  const completion=await json(resolve(evidence,'preflight-completion.json')),proofTime=Date.parse(proof.verifiedAt);
  const ages={atStartSeconds:(Date.parse(completion.startedAt)-proofTime)/1000,atCaptureSeconds:(Date.parse(snapshot.capturedAt)-proofTime)/1000,atFinishSeconds:(Date.parse(completion.finishedAt)-proofTime)/1000};
  assert.ok(Object.values(ages).every(age=>Number.isFinite(age)&&age>=0&&age<=300));
  const relations=expectedRelationsFromSql(await readFile(resolve(adapter,'budget-protected-data-readonly.sql')));
  const referenceBytes=await readFile(resolve(root,'docs/production-security/budget-deletion-pause/20261012T165000Z/protected-data-readonly.json'));
  assert.equal(sha256(referenceBytes),'2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc');
  const before=protectedDataDigest(JSON.parse(referenceBytes),relations),after=protectedDataDigest(snapshot.protectedData,relations);
  assert.equal(after.sha256,snapshot.protectedData.sha256);assert.equal(after.sha256,'eabcb583b5a2417de666793aa86b26f53f6c32e4369d83e577f0fe70153f7429');
  const differences=[];
  for(let i=0;i<before.rows.length;i++){const a=before.rows[i],b=after.rows[i];assert.equal(a.relation,b.relation);if(a.row_count!==b.row_count||a.content_fingerprint!==b.content_fingerprint)differences.push(a.relation);}
  assert.equal(after.rows.length,57);assert.equal(differences.length,0);
  const manifest=await json(resolve(adapter,'reviewed-inputs.json'));
  const receiptBytes=await readFile(resolve(root,manifest.inputs.foundationReceipt.file));assert.equal(sha256(receiptBytes),manifest.inputs.foundationReceipt.sha256);
  const foundationExpected=verifyFoundationReceipt(JSON.parse(receiptBytes));
  assert.equal(hashJson(foundationStructure(snapshot.foundation.value)),foundationExpected.sha256);assert.equal(snapshot.foundation.structureSha256,'eb9bf6a418438358fc9b6e8e72208e4b3ade1d798ac04fe91c7eb58c2b5063d9');
  await writeFile(resolve(evidence,'native-preflight-evidence.json'),bytes,{flag:'wx'});
  const result={status:'PASS',evidenceFile:output.evidenceFile,preflightEvidenceSha256:sha256(bytes),preflightStateSha256:snapshot.approvalFingerprint,controlPlaneProofSha256:sha256(proofBytes),proofVerifiedAt:proof.verifiedAt,proofExpiresAt:new Date(proofTime+300000).toISOString(),proofAges:ages,capturedAt:snapshot.capturedAt,tls:{protocol:snapshot.tls.protocol,chainVerified:true,hostnameVerified:true,caSha256:snapshot.tls.caSha256,peerCertificateFingerprint256:snapshot.tls.peerCertificateFingerprint256,peerUnchangedFromHistorical:true},postgresql:{serverVersion:snapshot.budget.server_version,serverVersionNum:snapshot.identity.server_version_num,database:snapshot.identity.database,currentUser:snapshot.identity.current_user,sessionUser:snapshot.identity.session_user,readOnly:snapshot.identity.transaction_read_only},catalogSha256:snapshot.budget.compatibility_sha256,functionOid:snapshot.budget.function.oid,functionDefinitionMd5:snapshot.budget.function.definition_md5,functionSourceMd5:snapshot.budget.function.source_md5,originalUnpausedRpc:true,inventories:{captured:57,matched:57,changed:0,sha256:after.sha256,referenceSha256:before.sha256},foundationStructureSha256:snapshot.foundation.structureSha256,foundationFullStableSha256:snapshot.foundation.sha256,environmentGuard:snapshot.budget.containment_guard,migrations:snapshot.budget.migration_history,storagePolicies:snapshot.budget.storage_policy_count,storageObjects:snapshot.budget.storage_objects,driftFromHistoricalApprovedState:false,baselineAdopted:false,nativeAttempts:1,automaticRetries:0,installationActivated:false,authorizationCreated:false,approvedPreflightCreated:false};
  await writeFile(resolve(evidence,'read-only-verification-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'NO_GO',code:'FRESH_PREFLIGHT_COMPARISON_FAILED',safeError:safeError(error)}));process.exitCode=2;}
