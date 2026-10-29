// Genuine staging JWT/Storage/gateway assertions. Privileged inventory/expiry setup is labeled separately.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { REF, REPORT, client, verifyTarget, requireEnv, loadState, signInActor, adminLogin, revokeAdmin, ok, hash,
  syntheticPdf, setContext, record, evidence, persistReport } from './synthetic-validation-common.mjs';
verifyTarget();
if(!process.env.YTRACE_STAGING_REPORT_RUN || existsSync(resolve(REPORT,'private-tests.json'))) throw new Error('Expected a fresh dedicated report run');
const state=await loadState();
if(!state.registrationsFinished) throw new Error('Expected valid existing registration fixtures');
const service=client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const sessions=[]; const auth=[];
async function assertion(label,actor,fn) {
  setContext(actor,label);const start=evidence.length;
  try { const pass=await fn();record(label,pass?'PASS':'FAIL',{http:evidence.slice(start)});if(!pass)throw new Error('Authorization assertion failed; stop affected validation'); }
  catch(error) { if(!/Authorization assertion failed/.test(error.message)) record(label,'BLOCKED',{http:evidence.slice(start),reason:'Sanitized prerequisite or transport failure'});throw error; }
}
async function intact(c,ref) { const r=await c.storage.from(ref.bucket).download(ref.path);return !r.error&&hash(Buffer.from(await r.data.arrayBuffer()))===ref.sha256; }
async function absent(bucket,path) {
  // Privileged existence inventory is not an organization authorization assertion.
  const split=path.lastIndexOf('/');const prefix=split<0?'':path.slice(0,split),name=path.slice(split+1);
  const rows=await ok(service.storage.from(bucket).list(prefix,{limit:100,search:name}));
  return !rows.some(r=>r.name===name);
}
function child(script,env) {
  const r=spawnSync(process.execPath,[script],{env,encoding:'utf8',windowsHide:true});
  process.stdout.write(r.stdout??'');
  if(r.status!==0) throw new Error('Prepared real staging suite failed; inspect sanitized JSON');
}
try {
  const env={...process.env};
  for(const label of ['A','B']) {
    env[`YTRACE_STAGING_ORG_${label}_EMAIL`]=state.actors[label].email;
    env[`YTRACE_STAGING_ORG_${label}_PASSWORD`]=state.actors[label].password;
    env[`YTRACE_STAGING_ORG_${label}_OBJECTS_JSON`]=JSON.stringify(state.files.filter(f=>f.actor===label));
  }
  child('scripts/staging/test-storage-isolation.mjs',env);
  record('Prepared own/cross/anonymous real Storage suite','PASS');
  const a=await signInActor(state.actors.A,'A');auth.push(a);
  const b=state.files.find(f=>f.actor==='B');const own=state.files.find(f=>f.actor==='A');
  for(const [label,bucket,path] of [
    ['Invalid parent denied','organization-documents',`${randomUUID()}/${own.path.split('/')[1]}/SYNTHETIC-invalid-parent.pdf`],
    ['Wrong organization upload denied',b.bucket,b.path.replace(/[^/]+$/,'SYNTHETIC-cross-upload.pdf')],
    ['Wrong bucket upload denied','budget-request-files',`${state.actors.A.organizationId}/SYNTHETIC-wrong-bucket.pdf`],
  ]) await assertion(label,'A JWT',async()=>{
    const r=await a.storage.from(bucket).upload(path,syntheticPdf('DENIED UPLOAD'),{contentType:'application/pdf'});
    return !!r.error&&[400,401,403].includes(Number(r.error.statusCode??r.error.status))&&await absent(bucket,path);
  });
  await assertion('Locked approved registration overwrite denied, original hash preserved','A JWT',async()=>{
    const r=await a.storage.from(own.bucket).update(own.path,syntheticPdf('DENIED OVERWRITE'),{contentType:'application/pdf'});
    return !!r.error&&await intact(a,own);
  });
  await assertion('Locked approved registration DELETE has no effect, original hash preserved','A JWT',async()=>{
    const r=await a.storage.from(own.bucket).remove([own.path]);return (r.error||r.data?.length===0)&&await intact(a,own);
  });
  const suspended=await signInActor(state.actors.S,'Suspended');auth.push(suspended);
  const suspendedPath=`${state.actors.S.organizationId}/profile/SYNTHETIC-suspended-avatar.pdf`;
  await assertion('Suspended organization cannot upload to its own profile path','Suspended JWT',async()=>{
    const r=await suspended.storage.from('organization-documents').upload(suspendedPath,syntheticPdf('SUSPENDED DENIED'),{contentType:'application/pdf'});
    return !!r.error&&await absent('organization-documents',suspendedPath);
  });
  const valid=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));sessions.push(valid);
  const unauthorized=await adminLogin(state.reviewer.username,state.reviewer.password);sessions.push(unauthorized);
  const revoked=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));sessions.push(revoked);await revokeAdmin(revoked);
  const expired=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));sessions.push(expired);
  setContext('Privileged expiry fixture','Shorten only this genuine test session');
  const expiredRows=await ok(service.from('admin_sessions').update({expires_at:new Date(Date.now()-60000).toISOString()})
    .eq('admin_id',expired.adminId).eq('token_hash',hash(expired.token)).is('revoked_at',null).select('id'));
  if(expiredRows.length!==1)throw new Error('Expected exactly one expired synthetic test session');
  env.YTRACE_STAGING_ADMIN_TOKEN_VALID=valid.token;env.YTRACE_STAGING_ADMIN_TOKEN_UNAUTHORIZED=unauthorized.token;
  env.YTRACE_STAGING_ADMIN_TOKEN_REVOKED=revoked.token;env.YTRACE_STAGING_ADMIN_TOKEN_EXPIRED=expired.token;
  env.YTRACE_STAGING_ADMIN_TOKEN_INVALID='invalid-synthetic-token';
  const samples=[...new Map(state.files.map(f=>[f.actor+':'+f.bucket,f])).values(),state.template,state.newsImage];
  const cases=[];
  for(const [index,ref] of samples.entries()) {
    cases.push({label:`Authorized Admin signs fixture ${index+1}; hash matches`,tokenEnv:'YTRACE_STAGING_ADMIN_TOKEN_VALID',...ref,expected:'allow'});
    if(ref.actor) for(const token of ['UNAUTHORIZED','REVOKED','EXPIRED','INVALID']) cases.push({label:`${token}: fixture ${index+1} signing denied`,tokenEnv:`YTRACE_STAGING_ADMIN_TOKEN_${token}`,...ref,expected:'deny'});
  }
  // Signing derives parent identity from authoritative path metadata, not the upload-only resourceId argument.
  // Exercise an actually unbound parent/path instead of expecting an unused argument to change authorization.
  cases.push({label:'Forged B parent path for A document is denied',tokenEnv:'YTRACE_STAGING_ADMIN_TOKEN_VALID',...own,
    path:own.path.replace(state.actors.A.organizationId,state.actors.B.organizationId),expected:'deny'});
  env.YTRACE_STAGING_ADMIN_STORAGE_CASES_JSON=JSON.stringify(cases);
  child('scripts/staging/test-admin-storage-gateway.mjs',env);
  record('Prepared genuine Admin gateway suite including private files','PASS');
} catch { record('Dependent private validation stopped without bypass','BLOCKED',{reason:'Inspect actual assertion/HTTP evidence; no automatic retry'});process.exitCode=2; }
finally {
  for(const c of auth) { const r=await c.auth.signOut({scope:'local'});record('Close only this test Auth session',r.error?'BLOCKED':'PASS'); }
  for(const s of sessions) {try{await revokeAdmin(s);record('Revoke only this test Admin session','PASS');}catch{record('Test Admin session cleanup','BLOCKED');process.exitCode=2;}}
  await persistReport('private-tests');
}
