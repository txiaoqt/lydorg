// Supervised preparation offline verification. No PostgreSQL/network access; no credential values printed.
import assert from 'node:assert/strict';
import {createHash,X509Certificate} from 'node:crypto';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {computePgRuntimeClosure} from '../native-budget-pause-runner.mjs';
import {safeError} from '../budget-runner-core.mjs';
import {verifyFoundationEnvironment} from '../../../../../scripts/security/verify-foundation-environment.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(directory,'..'),root=resolve(directory,'../../../../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>sha(Buffer.from(JSON.stringify(canonical(value))));
try{
  assert.equal(process.version,'v24.21.0');
  assert.equal(process.env.NODE_PG_FORCE_NATIVE,undefined);
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
  const verifier=await readFile(resolve(adapter,'budget-protected-data-readonly.sql'));assert.equal(verifier.length,13902);assert.equal(sha(verifier),'459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34');
  const prior=resolve(adapter,'native-readonly-20261013T103131Z');
  const priorManifestBytes=await readFile(resolve(prior,'local-evidence-manifest.json'));
  assert.equal(sha(priorManifestBytes),'b966a8d10f4de0d6b1819b54e85e147190b5f321fde2bc7432c1dccc979bcc96');
  const priorManifest=JSON.parse(priorManifestBytes);
  for(const pin of priorManifest.files){const bytes=await readFile(resolve(prior,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
  const snapshotBytes=await readFile(resolve(prior,'native-preflight-evidence.json'));
  assert.equal(sha(snapshotBytes),'6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81');
  const data=JSON.parse(snapshotBytes),state={project:data.project,host:data.host,route:data.route,sqlSha256:data.sqlSha256,runnerBundleSha256:data.runnerBundleSha256,caSha256:data.tls.caSha256,peerCertificateFingerprint256:data.tls.peerCertificateFingerprint256,catalogSha256:data.budget.compatibility_sha256,function:data.budget.function,migrationHistory:data.budget.migration_history,storagePolicyCount:data.budget.storage_policy_count,protectedInventoriesSha256:data.protectedData.sha256,foundationSha256:data.foundation.sha256,native:{database:data.identity.database,current_user:data.identity.current_user,session_user:data.identity.session_user,server_version_num:data.identity.server_version_num,server_port:data.identity.server_port,tls:data.identity.tls,tls_version:data.identity.tls_version}};
  assert.equal(digest(state),'8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc');
  const historicalOperatorBytes=await readFile(resolve(process.env.USERPROFILE,'.ytrace-production-budget-deletion-pause','preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json'));
  assert.equal(sha(historicalOperatorBytes),'6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81');
  assert.equal((await verifyFoundationEnvironment(process.env)).status,'PASS');
  assert.equal((await lstat(resolve(root,'.env.foundation.local'))).isSymbolicLink(),false);
  const caInfo=await lstat(process.env.YTRACE_PRODUCTION_DB_CA_FILE);assert.equal(caInfo.isFile(),true);assert.equal(caInfo.isSymbolicLink(),false);
  const caBytes=await readFile(process.env.YTRACE_PRODUCTION_DB_CA_FILE),trusted='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
  assert.equal(sha(caBytes),trusted);assert.equal(process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase(),trusted);
  const certificate=new X509Certificate(caBytes),now=Date.now();
  assert.equal(certificate.ca,true);assert.equal(certificate.verify(certificate.publicKey),true);assert.ok(Date.parse(certificate.validFrom)<=now&&Date.parse(certificate.validTo)>now);
  const result={status:'PASS_OFFLINE',verifiedAt:new Date().toISOString(),nodeVersion:process.version,nodePgForceNativeUnset:true,bundleSha256:bundle,manifestSha256:sha(manifestBytes),sqlSha256:sha(sql),sqlBytes:sql.length,codeFiles:codeHashes.length,inputPins:verifiedPins.length,driverRuntimeFiles:closure.files.length,driverTreeSha256:closure.sha256,verifierSha256:sha(verifier),historicalEvidenceFilesVerified:priorManifest.files.length,historicalPreflightSha256:sha(snapshotBytes),historicalOperatorPreflightByteIdentical:true,historicalStateFingerprint:digest(state),environmentVerifier:'PASS',caSha256:trusted,caSelfSignatureValid:true,caCurrentlyValid:true,caValidTo:certificate.validTo,credentialValuesLogged:false,productionConnectionAttempted:false};
  await writeFile(resolve(directory,'offline-verification.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'BLOCKED',code:'OFFLINE_VERIFICATION_FAILED',safeError:safeError(error),productionConnectionAttempted:false}));process.exitCode=2;}
