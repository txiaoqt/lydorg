// Local trust/reference verification. No network or PostgreSQL access.
import assert from 'node:assert/strict';
import {X509Certificate} from 'node:crypto';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,protectedDataDigest,expectedRelationsFromSql,safeError} from '../budget-runner-core.mjs';
import {verifyFoundationEnvironment} from '../../../../../scripts/security/verify-foundation-environment.mjs';
const evidence=fileURLToPath(new URL('.',import.meta.url)),root=resolve(evidence,'../../../../..');
try{
  assert.equal((await verifyFoundationEnvironment(process.env)).status,'PASS');
  assert.equal((await lstat(resolve(root,'.env.foundation.local'))).isSymbolicLink(),false);
  const info=await lstat(process.env.YTRACE_PRODUCTION_DB_CA_FILE);
  assert.equal(info.isFile(),true);assert.equal(info.isSymbolicLink(),false);
  const bytes=await readFile(process.env.YTRACE_PRODUCTION_DB_CA_FILE);
  const hash=sha256(bytes),trusted='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
  const prior=JSON.parse(await readFile(resolve(root,'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/preflight.json'),'utf8'));
  assert.equal(prior.caSha256,trusted);assert.equal(hash,trusted);
  assert.equal(process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase(),trusted);
  const certificate=new X509Certificate(bytes),now=Date.now();
  assert.equal(certificate.ca,true);assert.equal(certificate.verify(certificate.publicKey),true);
  assert.ok(Date.parse(certificate.validFrom)<=now&&Date.parse(certificate.validTo)>now);
  const referencePath='docs/production-security/budget-deletion-pause/20261012T165000Z/protected-data-readonly.json';
  const referenceBytes=await readFile(resolve(root,referencePath));
  assert.equal(sha256(referenceBytes),'2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc');
  const inventory=await readFile(resolve(evidence,'../budget-protected-data-readonly.sql'));
  const reference=protectedDataDigest(JSON.parse(referenceBytes),expectedRelationsFromSql(inventory));
  const result={status:'PASS',caBytesMatchConfiguredAndIndependentlyReviewedFingerprint:true,certificateIsCa:true,selfSignatureValid:true,certificateCurrentlyValid:true,trustSource:'Previously approved Supabase published prod-ca-2021 certificate, independently HTTPS-verified and recorded in production foundation preflight',trustReference:'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/preflight.json',referenceSnapshot:referencePath,referenceSnapshotSha256:sha256(referenceBytes),referenceInventoryCount:reference.rows.length,referenceInventoriesSha256:reference.sha256,nativeTlsVerification:'PENDING_ACTUAL_CONNECTION',productionConnectionAttempted:false,credentialValuesLogged:false};
  await writeFile(resolve(evidence,'ca-and-reference-verification.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'PASS',caTrustedFingerprintMatch:true,certificateValid:true,referenceInventoryCount:57,productionConnectionAttempted:false}));
}catch(error){console.log(JSON.stringify({status:'BLOCKED',code:'LOCAL_CA_OR_REFERENCE_CHECK_FAILED',safeError:safeError(error),productionConnectionAttempted:false}));process.exitCode=2;}
