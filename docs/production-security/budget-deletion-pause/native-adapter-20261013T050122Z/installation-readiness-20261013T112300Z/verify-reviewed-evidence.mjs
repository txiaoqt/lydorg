// Independent local byte/evidence review. No credential loading or DB access.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {computePgRuntimeClosure} from '../native-budget-pause-runner.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(directory,'..'),root=resolve(directory,'../../../../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>sha(Buffer.from(JSON.stringify(canonical(value))));
const json=async path=>JSON.parse(await readFile(path,'utf8'));
assert.equal(process.version,'v24.21.0');
const manifestBytes=await readFile(resolve(adapter,'reviewed-inputs.json'));
assert.equal(sha(manifestBytes),'562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb');
const manifest=JSON.parse(manifestBytes),codeHashes=[],verifiedPins=[];
for(const pin of manifest.codeIdentities){const bytes=await readFile(resolve(adapter,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);codeHashes.push({file:pin.file,bytes:bytes.length,sha256:sha(bytes)});}
codeHashes.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
const bundle=sha(Buffer.from(JSON.stringify({manifestSha256:sha(manifestBytes),codeHashes})));
assert.equal(bundle,'58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25');
for(const [name,pin] of Object.entries(manifest.inputs)){
  const path=resolve(root,pin.file);assert.ok(!relative(root,path).startsWith('..'));assert.equal((await lstat(path)).isSymbolicLink(),false);
  const bytes=await readFile(path);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);verifiedPins.push({name,...pin});
}
const sql=await readFile(resolve(root,manifest.sql.file));assert.equal(sql.length,11945);assert.equal(sha(sql),'a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a');
for(const pin of manifest.driverTree.inventory){const path=resolve(root,pin.path),info=await lstat(path);assert.equal(info.isFile(),true);assert.equal(info.isSymbolicLink(),false);const bytes=await readFile(path);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
assert.equal(sha(Buffer.from(JSON.stringify(manifest.driverTree.inventory))),manifest.driverTree.sha256);
const closure=await computePgRuntimeClosure();assert.deepEqual(closure.files,manifest.driverTree.inventory);assert.equal(closure.sha256,manifest.driverTree.sha256);
const prior=resolve(adapter,'native-readonly-20261013T103131Z');
const priorManifestBytes=await readFile(resolve(prior,'local-evidence-manifest.json'));
assert.equal(sha(priorManifestBytes),'b966a8d10f4de0d6b1819b54e85e147190b5f321fde2bc7432c1dccc979bcc96');
const priorManifest=JSON.parse(priorManifestBytes);
for(const pin of priorManifest.files){const bytes=await readFile(resolve(prior,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
const snapshotBytes=await readFile(resolve(prior,'native-preflight-evidence.json'));
assert.equal(sha(snapshotBytes),'6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81');
const data=JSON.parse(snapshotBytes),state={project:data.project,host:data.host,route:data.route,sqlSha256:data.sqlSha256,runnerBundleSha256:data.runnerBundleSha256,caSha256:data.tls.caSha256,peerCertificateFingerprint256:data.tls.peerCertificateFingerprint256,catalogSha256:data.budget.compatibility_sha256,function:data.budget.function,migrationHistory:data.budget.migration_history,storagePolicyCount:data.budget.storage_policy_count,protectedInventoriesSha256:data.protectedData.sha256,foundationSha256:data.foundation.sha256,native:{database:data.identity.database,current_user:data.identity.current_user,session_user:data.identity.session_user,server_version_num:data.identity.server_version_num,server_port:data.identity.server_port,tls:data.identity.tls,tls_version:data.identity.tls_version}};
assert.equal(digest(state),'8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc');assert.equal(data.approvalFingerprint,digest(state));
const normalize=record=>record.preserved_data.map(row=>({relation:row.relation,row_count:Number(row.row_count),content_fingerprint:row.content_fingerprint})).sort((a,b)=>a.relation<b.relation?-1:a.relation>b.relation?1:0);
const referenceBytes=await readFile(resolve(root,'docs/production-security/budget-deletion-pause/20261012T165000Z/protected-data-readonly.json'));
assert.equal(sha(referenceBytes),'2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc');
const currentRows=normalize(data.protectedData),reviewedRows=normalize(JSON.parse(referenceBytes));
assert.equal(currentRows.length,57);assert.equal(new Set(currentRows.map(row=>row.relation)).size,57);assert.deepEqual(currentRows,reviewedRows);assert.equal(digest(currentRows),data.protectedData.sha256);
const originalCompletion=await json(resolve(prior,'preflight-completion.json'));
const proof=await json(resolve(prior,'control-plane-evidence.json'));
const utcAge=(Date.parse(originalCompletion.finishedAt)-Date.parse(proof.verifiedAt))/1000;
assert.equal(utcAge,36.022);assert.ok(utcAge>=0&&utcAge<300);
assert.equal(originalCompletion.proofAgeAtFinishSeconds,28836.2550605);
const result={status:'PASS_LOCAL_REVIEW',reviewedBundleSha256:bundle,manifestSha256:sha(manifestBytes),sqlSha256:sha(sql),sqlBytes:sql.length,verifiedCodeFiles:codeHashes,verifiedInputPins:verifiedPins,driverVersion:manifest.driverVersion,driverRuntimeFiles:closure.files.length,driverPackages:closure.packages,driverTreeSha256:closure.sha256,historicalEvidenceManifestSha256:sha(priorManifestBytes),historicalEvidenceFilesUnchanged:priorManifest.files.length,successfulPreflightEvidenceSha256:sha(snapshotBytes),preflightStateFingerprint:digest(state),matchedHistoricalInventories:57,actualHistoricalProofAgeAtFinishSeconds:utcAge,originalContradictoryReceiptPreserved:true,productionConnectionAttempted:false,freshNativePreflightExecuted:false,installationExecuted:false};
await writeFile(resolve(directory,'independent-artifact-review.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,codeFiles:codeHashes.length,inputPins:verifiedPins.length,driverFiles:closure.files.length,priorEvidenceFilesVerified:priorManifest.files.length,historicalInventoriesMatched:57,productionConnectionAttempted:false}));
