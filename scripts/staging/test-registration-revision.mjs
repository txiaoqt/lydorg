// One journaled, normal-workflow staging revision; never deletes original fixtures.
import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPORT, verifyTarget, loadState, saveState, signInActor, adminLogin, revokeAdmin,
  requireEnv, ok, syntheticPdf, hash, setContext, evidence, record, persistReport, client, guardedFetch } from './synthetic-validation-common.mjs';
verifyTarget();
if (!process.env.YTRACE_STAGING_REPORT_RUN || existsSync(resolve(REPORT,'registration-revision.json'))) throw new Error('Fresh evidence directory required');
const lockPath=resolve('.ytrace-staging-fixtures-lock.local');
const lock=await open(lockPath,'wx');
let owner, other, admin, unauthorized;
async function step(name,actor,fn) {
  setContext(actor,name);const cursor=evidence.length;
  try { if(!await fn())throw new Error('Assertion failed');record(name,'PASS',{http:evidence.slice(cursor)}); }
  catch { record(name,'BLOCKED',{http:evidence.slice(cursor),reason:'Operation stopped; inspect HTTP evidence; no automatic retry'});throw new Error('Stop dependent revision operation'); }
}
try {
  const state=await loadState();
  if(!state.registrationsFinished || state.registrationRevisionStarted)throw new Error('Expected untouched revision phase');
  const previous=state.files.find(f=>f.actor==='B'&&f.kind.startsWith('registration-'));
  if(!previous?.metadataId)throw new Error('Expected recorded B document');
  owner=await signInActor(state.actors.B,'B');other=await signInActor(state.actors.A,'A');
  admin=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));
  unauthorized=await adminLogin(state.reviewer.username,state.reviewer.password);
  state.registrationRevisionStarted=true;await saveState(state);
  await step('Admin requests revision through existing review RPC','Super Admin',async()=>{
    await ok(admin.c.rpc('update_admin_document_submission_file_review',{_session_token:admin.token,_file_id:previous.metadataId,
      _status:'needs_revision',_admin_remarks:'SYNTHETIC staging revision request'}));
    return (await ok(owner.from('document_submission_files').select('admin_status').eq('id',previous.metadataId).single())).admin_status==='needs_revision';
  });
  const row=await ok(owner.from('document_submission_files').select('updated_at,document_type_id').eq('id',previous.metadataId).single());
  const fileName='SYNTHETIC-B-registration-revision.pdf';const bytes=syntheticPdf('B CORRECTED REGISTRATION');
  const path=`${state.actors.B.organizationId}/${row.document_type_id}/revisions/${randomUUID()}-${fileName}`;
  const revised={...previous,path,fileName,storageUri:`storage://organization-documents/${path}`,sha256:hash(bytes),kind:'registration-revision'};
  await step('B uploads corrected PDF with genuine owner JWT','B JWT',async()=>{
    await ok(owner.storage.from(previous.bucket).upload(path,bytes,{contentType:'application/pdf'}));
    state.files.push(revised);await saveState(state);return true;
  });
  await step('B replaces metadata with supported optimistic-lock RPC','B JWT',async()=>{
    const rows=await ok(owner.rpc('replace_organization_document_file',{_file_id:previous.metadataId,_document_type_id:row.document_type_id,
      _expected_updated_at:row.updated_at,_file_url:revised.storageUri,_file_name:fileName,_file_type:'application/pdf',_file_size:bytes.length}));
    return rows.length===1&&rows[0].file_url===revised.storageUri&&rows[0].admin_status==='under_admin_review';
  });
  await step('B corrected download matches hash; original bytes preserved','B JWT',async()=>{
    for(const ref of [previous,revised]) {const data=await ok(owner.storage.from(ref.bucket).download(ref.path));if(hash(Buffer.from(await data.arrayBuffer()))!==ref.sha256)return false;}
    return true;
  });
  for(const [label,c] of [['Other organization',other],['Anonymous',client()]])await step(`${label} denied corrected private download`,label,async()=>{
    const r=await c.storage.from(revised.bucket).download(revised.path);return !!r.error;
  });
  for(const [label,session,allow]of [['Authorized Admin',admin,true],['Unauthorized Admin',unauthorized,false]])await step(`${label}: corrected-file gateway authorization`,label,async()=>{
    const r=await session.c.functions.invoke('admin-storage-access',{body:{action:'sign',bucket:revised.bucket,path:revised.path,sessionToken:session.token}});
    if(!allow)return !!r.error&&Number(r.error.context?.status)===403&&!r.data?.signedUrl;
    if(r.error||!r.data?.signedUrl)return false;const response=await guardedFetch(r.data.signedUrl);
    return response.ok&&hash(Buffer.from(await response.arrayBuffer()))===revised.sha256;
  });
  state.registrationRevisionFinished=true;await saveState(state);
}catch {record('Dependent revision validation stopped','BLOCKED');process.exitCode=2;}
finally {
  for(const c of [owner,other].filter(Boolean)){const r=await c.auth.signOut({scope:'local'});record('Close revision test Auth session',r.error?'BLOCKED':'PASS');}
  for(const s of [admin,unauthorized].filter(Boolean))try{await revokeAdmin(s);record('Revoke revision test Admin session','PASS');}catch{record('Admin cleanup','BLOCKED');process.exitCode=2;}
  await persistReport('registration-revision');await lock.close();await unlink(lockPath);
}
