// One operator-authorized DOC-01 signing + in-memory download. No login/write API exists here.
import { readFile, open, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { prepareRequest, PROJECT, ORIGIN } from './production-gateway-acceptance-inputs.mjs';
import * as core from '../../docs/production-security/storage-cutover/native-runner-20261011T132539Z/runner-core.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const privateDir = resolve(root, '.agent/security/production-gateway-acceptance');
const review = resolve(root, 'docs/production-security/storage-cutover/20261011T113322Z');
const installed = resolve(root, 'docs/production-security/storage-cutover/executions/20261011T122743Z');
const manifestHash = '66a333ef7ab4e77a86c0ca4ace0c01670cf503cd65187e67b7542fbf5534e400';
const gatewayHash = '88e6e86352cdb3718e5687c1287b0bc73717a48f21b8c65aa97310744ab260e2';
const hash = value => createHash('sha256').update(value).digest('hex');
const guard = core.requireGuard;
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export const withoutCaptureTime = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'captured_at'));
const markerPath = resolve(privateDir, 'positive-attempt-started.local.json');
const receiptPath = resolve(privateDir, 'positive-acceptance-receipt.local.json');
const lockPath = resolve(privateDir, 'positive-operation.lock.local.json');
let client, lockClaim, submitted = false, before, session, receiptWritten = false;
const evidence = { project: PROJECT, candidateLabel: 'DOC-01', gateway: 'admin-storage-access',
  startedAt: new Date().toISOString(), status: 'BLOCKED', automaticRetries: 0,
  signingRequests: 0, downloadRequests: 0, independentContentHashComparison: 'NOT TESTED',
  permissionSpecificDenial: 'BLOCKED', reasonPermissionDenial: 'NO_APPROVED_DENIAL_RESOURCE',
  sessionValidation: 'NOT TESTED', authorizedSigning: 'NOT TESTED', authorizedDownload: 'NOT TESTED',
  privateBytesPersisted: false, secretsOrSignedUrlsPersisted: false,
  independentEdgeFunctionPostcheck: 'PENDING',
};

async function writeOnce(path, value) {
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(value,null,2)+'\n'); await file.sync(); }
  finally { await file.close(); }
}
async function assertNoAttempt() {
  for (const path of [markerPath, receiptPath]) {
    try { const file = await open(path,'r'); await file.close(); guard(false,'PREVIOUS_ATTEMPT_OR_RECEIPT_EXISTS'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
async function claimLock() {
  lockClaim = { project: PROJECT, candidateLabel: 'DOC-01', pid: process.pid, nonce: randomUUID() };
  await writeOnce(lockPath,lockClaim);
}
async function releaseLock() {
  if (!lockClaim) return;
  try { if (same(JSON.parse(await readFile(lockPath,'utf8')),lockClaim)) await unlink(lockPath); }
  catch {} // Preserve an unverified lock rather than removing another operation's evidence.
}
async function controlPlane() {
  const proof = JSON.parse(await readFile(resolve(privateDir,'positive-control-plane.local.json'),'utf8'));
  core.verifyControlPlane(proof);
  guard(proof.functions?.length === 9,'EDGE_FUNCTION_INVENTORY_DRIFT');
  const gateway = proof.functions.find(f => f.name === 'admin-storage-access');
  guard(gateway?.status === 'ACTIVE' && gateway.version === 1 && gateway.verify_jwt === false &&
    gateway.ezbr_sha256 === gatewayHash,'GATEWAY_IDENTITY_DRIFT');
  const original = JSON.parse(await readFile(resolve(root,
    'docs/production-security/storage-cutover/gateway-deployments/20261011T225016Z/final-function-inventories.json'),'utf8'));
  const identities = functions => functions.map(({name,status,version,verify_jwt,ezbr_sha256}) =>
    ({name,status,version,verify_jwt,ezbr_sha256})).sort((a,b)=>a.name.localeCompare(b.name));
  guard(same(identities(proof.functions),identities(original.productionFunctions)),
    'EXISTING_EDGE_FUNCTION_IDENTITY_DRIFT');
  return proof;
}
async function selectedFile() {
  const bytes = await readFile(resolve(privateDir,'candidates.local.json'));
  guard(hash(bytes) === manifestHash,'APPROVED_FILE_SELECTION_CHANGED');
  const manifest = JSON.parse(bytes.toString('utf8'));
  guard(manifest.project === PROJECT && manifest.candidates.filter(f => f.label === 'DOC-01').length === 1,
    'APPROVED_FILE_SELECTION_INVALID');
  return { manifest, file: manifest.candidates.find(f => f.label === 'DOC-01') };
}
async function verifyFile(file) {
  // Parameters originate solely in the pinned operator-approved selection, never CLI paths.
  const result = await client.query(`SELECT f.admin_status::text AS status,
    md5(to_jsonb(f)::text) AS document_md5,md5(to_jsonb(ds)::text) AS parent_md5,
    md5(to_jsonb(o)::text) AS object_md5,
    EXISTS(SELECT 1 FROM ytrace_storage_private.resource_references(o.bucket_id,o.name) r
      WHERE r.reviewable AND r.parent_id=ds.id AND r.organization_id=ds.organization_id) AS reviewable,
    (SELECT count(DISTINCT r.organization_id) FROM ytrace_storage_private.resource_references(o.bucket_id,o.name) r) AS organization_count
    FROM public.document_submission_files f JOIN public.document_submissions ds ON ds.id=f.submission_id
    JOIN public.organization_profiles op ON op.id=ds.organization_id
    JOIN storage.objects o ON o.id=$2 AND o.bucket_id=$3 AND o.name=$4
      AND f.file_url='storage://'||o.bucket_id||'/'||o.name
      AND coalesce(o.owner_id,o.owner::text)=op.user_id::text
    WHERE f.id=$1 AND ds.id=$5 AND ds.organization_id=$6`,
    [file.document_id,file.storage_object_id,file.bucket_id,file.object_name,file.parent_id,file.organization_id]);
  guard(result.rows.length === 1,'APPROVED_FILE_RELATIONSHIP_MISSING');
  const row = result.rows[0];
  guard(row.document_md5 === file.document_row_md5 && row.parent_md5 === file.parent_row_md5 &&
    row.object_md5 === file.object_row_md5 && row.reviewable && Number(row.organization_count) === 1 &&
    row.status === file.document_status,'APPROVED_FILE_STATE_CHANGED');
}
async function catalogSnapshot() {
  const catalog = core.selectRow(await client.query(await readFile(resolve(review,'compatibility-fingerprint-readonly.sql'),'utf8')),'catalog');
  core.verifyCatalog(catalog,{installed:true});
  const foundation = core.selectRow(await client.query(await readFile(resolve(installed,'post-install-readonly.sql'),'utf8')),'foundation_verification');
  const sql = await readFile(resolve(review,'production_storage_foundation_review.sql'),'utf8');
  guard(hash(sql) === core.SQL_SHA,'REVIEWED_FOUNDATION_ARTIFACT_CHANGED');
  core.verifyPostflight(foundation,JSON.parse(await readFile(resolve(review,'expected-foundation-functions.json'),'utf8')),sql);
  const prior = JSON.parse(await readFile(resolve(root,
    'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/postflight.json'),'utf8'));
  for (const key of ['functions','tables','triggers']) guard(same(foundation[key],prior.foundation[key]),'FOUNDATION_RECEIPT_DRIFT');
  const data = core.selectRow(await client.query(await readFile(resolve(installed,'protected-data-readonly.sql'),'utf8')),'preserved_data');
  guard(data.preserved_data?.length === 57 && data.read_only === 'on','PROTECTED_INVENTORY_INVALID');
  guard(Number(data.preserved_data.find(r => r.relation === 'storage.objects')?.row_count) === 378,'STORAGE_OBJECT_COUNT_DRIFT');
  return { catalog, foundation, data };
}
export function verifyExistingSessionState(row, reportedExpiry, now = Date.now()) {
  guard(row.is_active === true,'EXISTING_ADMIN_ACCOUNT_INACTIVE');
  guard(!row.revoked_at,'EXISTING_ADMIN_SESSION_REVOKED');
  const serverExpiry = Date.parse(row.expires_at);
  guard(Number.isFinite(serverExpiry),'EXISTING_ADMIN_SESSION_EXPIRY_INVALID');
  guard(serverExpiry > now,'EXISTING_ADMIN_SESSION_EXPIRED');
  guard(serverExpiry === Date.parse(reportedExpiry),'OPERATOR_SESSION_EXPIRY_MISMATCH');
}
async function sessionForToken(token, file, reportedExpiry) {
  // Match only the voluntarily supplied token; no other token/hash is retrieved.
  const result = await client.query(`SELECT s.id,s.admin_id,s.expires_at::text AS expires_at,
    s.last_used_at::text AS last_used_at,s.revoked_at::text AS revoked_at,a.is_active,
    r.code AS role_code,r.permission_codes,
    md5((to_jsonb(s)-'last_used_at')::text) AS stable_md5
    FROM public.admin_sessions s JOIN public.admin_accounts a ON a.id=s.admin_id
    JOIN public.roles r ON r.id=a.role_id WHERE s.token_hash=$1`,[hash(token)]);
  guard(result.rows.length === 1,'EXISTING_ADMIN_SESSION_NOT_FOUND');
  const row = result.rows[0];
  verifyExistingSessionState(row,reportedExpiry);
  guard(row.role_code === 'super_admin' || (row.permission_codes ?? []).some(p => file.permissions.includes(p)),
    'ADMIN_FILE_PERMISSION_DENIED');
  return row;
}
async function sessionPreservation(id) {
  const result = await client.query(`SELECT
    (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text COLLATE "C"),''))
      FROM public.admin_sessions s WHERE s.id<>$1) AS other_sessions_md5,
    (SELECT count(*) FROM public.admin_sessions) AS session_count,
    (SELECT md5((to_jsonb(s)-'last_used_at')::text) FROM public.admin_sessions s WHERE s.id=$1) AS target_stable_md5,
    (SELECT last_used_at::text FROM public.admin_sessions WHERE id=$1) AS last_used_at,
    (SELECT expires_at::text FROM public.admin_sessions WHERE id=$1) AS expires_at`,[id]);
  return result.rows[0];
}
export async function readBounded(response, maximum) {
  guard(!response.headers.get('content-length') || Number(response.headers.get('content-length')) <= maximum,'RESPONSE_TOO_LARGE');
  guard(response.body,'RESPONSE_BODY_MISSING');
  const reader = response.body.getReader(), chunks = []; let total = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      const part = Buffer.from(value.buffer,value.byteOffset,value.byteLength); chunks.push(part); total += part.length;
      if (total > maximum) { await reader.cancel(); guard(false,'RESPONSE_TOO_LARGE'); }
    }
    return Buffer.concat(chunks,total);
  } finally { for (const chunk of chunks) chunk.fill(0); }
}
export function verifiedSignedUrl(value, file, started, now = Date.now()) {
  guard(typeof value === 'string' && value.length <= 8192,'SIGNED_URL_INVALID');
  const url = new URL(value);
  guard(url.origin === ORIGIN && !url.username && !url.password && !url.hash,'SIGNED_URL_ORIGIN_INVALID');
  guard(url.pathname.split('/').map(part => decodeURIComponent(part)).join('/') ===
    `/storage/v1/object/sign/${file.bucket_id}/${file.object_name}`,'SIGNED_URL_SCOPE_INVALID');
  guard(same([...url.searchParams.keys()],['token']),'SIGNED_URL_QUERY_INVALID');
  const parts = url.searchParams.get('token').split('.');
  guard(parts.length === 3 && /^[A-Za-z0-9_-]+$/.test(parts[1]),'SIGNED_URL_EXPIRY_INVALID');
  const claims = JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  guard(Number.isSafeInteger(claims.exp) && claims.exp*1000 > now &&
    claims.exp*1000 >= started+3480000 && claims.exp*1000 <= now+3720000,'SIGNED_URL_EXPIRY_INVALID');
  // Parsing exp is a consistency check; Storage verifies the signature on the single GET.
  return url.href;
}
async function postflight(file, sessionsBefore) {
  const after = await catalogSnapshot(); await verifyFile(file);
  guard(same({...before.catalog,catalog:withoutCaptureTime(before.catalog.catalog)},
    {...after.catalog,catalog:withoutCaptureTime(after.catalog.catalog)}),'CATALOG_CHANGED_DURING_ACCEPTANCE');
  guard(same(withoutCaptureTime(before.foundation),withoutCaptureTime(after.foundation)),
    'FOUNDATION_CHANGED_DURING_ACCEPTANCE');
  const untouched = rows => rows.filter(r => r.relation !== 'public.admin_sessions');
  guard(same(untouched(before.data.preserved_data),untouched(after.data.preserved_data)),'PROTECTED_BUSINESS_OR_STORAGE_DATA_CHANGED');
  const sessionsAfter = await sessionPreservation(session.id);
  guard(sessionsBefore.other_sessions_md5 === sessionsAfter.other_sessions_md5 &&
    sessionsBefore.session_count === sessionsAfter.session_count &&
    sessionsBefore.target_stable_md5 === sessionsAfter.target_stable_md5 &&
    sessionsBefore.expires_at === sessionsAfter.expires_at,'ADMIN_SESSION_CHANGE_EXCEEDED_LAST_USED_AT');
  return { status:'PASS', unchangedNonSessionInventories:56, totalInventories:57,
    adminSessionOnlyPermittedLastUsedAtChange:true,
    lastUsedAtChanged:sessionsBefore.last_used_at !== sessionsAfter.last_used_at,
    sessionExpiryUnchanged:true,storageObjects:378,storagePolicies:15,migrations:164,
    foundationFingerprints:Object.fromEntries(['functions','tables','triggers'].map(k=>[k,hash(JSON.stringify(after.foundation[k]))])),
  };
}
async function main() {
  guard(process.argv.length === 3 && ['--check-readiness','--run-once'].includes(process.argv[2]),'UNEXPECTED_EXECUTION_MODE');
  guard(!process.env.NODE_OPTIONS && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0','UNSAFE_NODE_RUNTIME');
  await assertNoAttempt();
  const proof = await controlPlane();
  const {manifest,file} = await selectedFile();
  guard(file.bucket_id === 'organization-documents' && file.label === 'DOC-01','UNAPPROVED_FILE');
  const configuration = await core.connectionConfiguration(process.env,{readOnly:true});
  client = (await core.connectClientOnce(Client,configuration)).client;
  core.verifyNativeIdentity(core.selectRow(await client.query(await readFile(resolve(root,
    'docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-identity-privileges-readonly.sql'),'utf8')),'native_identity'));
  guard(client.connection.stream.authorized && client.connection.stream.encrypted,'NATIVE_TLS_UNVERIFIED');
  await verifyFile(file);
  before = await catalogSnapshot();
  evidence.preflight = {status:'PASS',tlsChainAndHostnameVerified:true,catalogCompatible:true,
    foundationReceiptMatches:true,protectedInventories:57,storageObjects:378,storagePolicies:15,migrations:164,
    approvedMetadataAndOwnershipUnchanged:true,edgeFunctionCount:proof.functions.length};
  if (process.argv[2] === '--check-readiness') {
    console.log(JSON.stringify({...evidence.preflight,status:'READY_FOR_HIDDEN_OPERATOR_INPUT',
      candidateLabel:'DOC-01',gatewayRequests:0,downloads:0})); return;
  }
  await claimLock(); await assertNoAttempt();
  let inputText='', inputBytes=0, input, prepared;
  try {
    for await (const chunk of process.stdin) { inputBytes+=chunk.length;guard(inputBytes<=8192,'INPUT_TOO_LARGE'); inputText+=chunk.toString('utf8'); }
    input = JSON.parse(inputText); inputText='';
    guard(input.candidateLabel === 'DOC-01' && input.expectedSha256 === '', 'AUTHORIZED_TEST_SCOPE_MISMATCH');
    prepared = prepareRequest(input,manifest);
    session = await sessionForToken(input.sessionToken,file,input.sessionExpiresAt);
    const sessionsBefore = await sessionPreservation(session.id);
    guard(sessionsBefore.target_stable_md5 === session.stable_md5,'ADMIN_SESSION_CHANGED_DURING_PREFLIGHT');
    evidence.sessionReadOnlyPrecheck = 'PASS';
    await controlPlane(); await verifyFile(file);
    guard(same(JSON.parse(await readFile(lockPath,'utf8')),lockClaim),'OPERATION_LOCK_CHANGED');
    await writeOnce(markerPath,{project:PROJECT,candidateLabel:'DOC-01',startedAt:new Date().toISOString(),
      pid:process.pid,scope:'one-sign-and-one-memory-download-no-independent-expected-hash',automaticRetries:0});
    submitted = true; evidence.signingRequests=1;
    const signingStarted=Date.now();
    const response = await fetch(`${ORIGIN}/functions/v1/admin-storage-access`,{method:'POST',redirect:'error',
      headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(prepared.request),
      signal:AbortSignal.timeout(20000)});
    evidence.signingHTTP=response.status; evidence.signingElapsedMs=Date.now()-signingStarted;
    input.sessionToken=''; prepared.request.sessionToken='';
    guard(response.status === 200,'GATEWAY_SIGNING_HTTP_NOT_200');
    guard(response.headers.get('cache-control') === 'no-store','GATEWAY_CACHE_HEADER_INVALID');
    let signingBytes=await readBounded(response,16384), grant;
    try { grant=JSON.parse(signingBytes.toString('utf8')); } finally { signingBytes.fill(0);signingBytes=null; }
    guard(grant.expiresIn === 3600 && same(Object.keys(grant).sort(),['expiresIn','signedUrl']),'GATEWAY_SIGNING_RESPONSE_INVALID');
    let signedUrl=verifiedSignedUrl(grant.signedUrl,file,signingStarted); grant.signedUrl=''; grant=null;
    evidence.sessionValidation='PASS'; evidence.authorizedSigning='PASS';
    evidence.signedUrlScopeOriginAndExpiry='PASS'; evidence.signedUrlLifetimeSeconds=3600;
    evidence.downloadRequests=1; const downloadStarted=Date.now();
    const download = await fetch(signedUrl,{method:'GET',redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(30000)}); signedUrl='';
    evidence.downloadHTTP=download.status;
    guard(download.status === 200,'AUTHORIZED_DOWNLOAD_HTTP_NOT_200');
    let bytes;
    try {
      bytes=await readBounded(download,Math.min(Number(file.bytes),20971520));
      guard(bytes.length === Number(file.bytes) && bytes.subarray(0,5).toString('ascii') === '%PDF-','DOWNLOADED_PDF_SIZE_OR_FORMAT_INVALID');
      // Calculate in memory, but never mislabel this as an independent integrity comparison.
      const observedHash=hash(bytes); guard(/^[a-f0-9]{64}$/.test(observedHash),'HASH_CALCULATION_FAILED');
      evidence.downloadedBytes=bytes.length; evidence.downloadSha256CalculatedInMemory=true;
      evidence.authorizedDownload='PASS';
    } finally { if(bytes)bytes.fill(0); bytes=null; }
    evidence.downloadElapsedMs=Date.now()-downloadStarted;
    evidence.preservation=await postflight(file,sessionsBefore);
    evidence.status='PASS_PENDING_INDEPENDENT_EDGE_POSTCHECK';
  } catch(error) {
    evidence.status=submitted?'FAIL_STOPPED_NO_RETRY':'BLOCKED_BEFORE_SIGNING';
    evidence.reason=error.safeCode ?? 'NETWORK_OR_LOCAL_OPERATION_FAILED';
    if(submitted) evidence.noAutomaticRetry=true;
    throw error;
  } finally { inputText=''; if(input)input.sessionToken='';if(prepared)prepared.request.sessionToken=''; }
}

// Importing the pure validators for offline checks must never initiate a live request.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error=>{
    if(!evidence.reason)evidence.reason=error.safeCode ?? 'LOCAL_OR_READ_ONLY_PREFLIGHT_FAILED';
    process.exitCode=2;
  }).finally(async()=>{
    if(client)await client.end().catch(()=>{});
    if(submitted){
      evidence.finishedAt=new Date().toISOString();
      try { await writeOnce(receiptPath,evidence);receiptWritten=true; }
      catch { evidence.receiptWriteFailed=true;process.exitCode=2; }
      console.log(JSON.stringify({...evidence,receiptWritten}));
    } else if(process.exitCode) console.log(JSON.stringify({status:'BLOCKED',reason:evidence.reason,
      signingRequests:0,downloadRequests:0,gatewayRequests:0,downloads:0,attemptMarkerCreated:false}));
    await releaseLock();
  });
}
