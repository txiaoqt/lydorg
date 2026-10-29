// Post-install real HTTP assertions only. No uploads/deletes/date simulation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {client,loadState,requireEnv,REF,ok,hash,signInActor,adminLogin,revokeAdmin,guardedFetch,evidence,setContext,safeError} from './synthetic-validation-common.mjs';
const dir='docs/staging-validation/2026-10-11/document-mutation/execution-20261011-02/';
const report=dir+'terminal-http.json',admins=[],auth=[],results=[];
const state=await loadState(),a=state.renewalScenario;
const lock=JSON.parse(await readFile('.ytrace-staging-fixtures-lock.local','utf8'));
assert.equal(lock.pid,54448);assert.equal(lock.projectRef,REF);assert.equal(lock.phase,'authorized-document-security-patch');process.kill(lock.pid,0);
const service=client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const before=JSON.parse(await readFile(dir+'post-install-control-plane.json','utf8'));
const forensic=JSON.parse(await readFile('docs/staging-validation/2026-10-11/document-mutation/fixture-reconciliation-evidence.json','utf8'));
const original=forensic.original,corrected=forensic.corrected;
const stable=x=>JSON.stringify(x&&typeof x==='object'?Array.isArray(x)?x.map(stable).sort():Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x);
async function preserved(){
 const rows=await ok(service.from('document_submission_files').select('*').eq('submission_id',a.renewalSubmission.id));assert.equal(stable(rows),stable(before.peers));
 const r=await ok(service.from('organization_renewals').select('*').eq('id',a.renewal.id).single());assert.equal(stable(r),stable(before.renewal));
 const s=await ok(service.from('document_submissions').select('*').eq('id',a.renewalSubmission.id).single());assert.equal(stable(s),stable(before.submission));
 const t=await ok(service.from('organization_accreditations').select('*').eq('organization_id',a.organizationId));assert.equal(stable(t),stable(before.terms));
}
async function persist(){await writeFile(report,JSON.stringify({projectRef:REF,at:new Date().toISOString(),results,evidence},null,2));}
async function step(check,actor,fn){setContext(actor,check);const cursor=evidence.length;try{const details=await fn();results.push({check,status:'PASS',...details,http:evidence.slice(cursor)});console.log('PASS: '+check);await persist();}catch(e){results.push({check,status:'FAIL',...safeError(e),http:evidence.slice(cursor)});await persist();throw e;}}
async function deny(p){const r=await p;assert(r.error&&!r.data?.signedUrl,'Expected denial');const status=Number(r.error.context?.status??r.error.statusCode??r.error.status??r.status);assert([400,401,403,404].includes(status),'Expected HTTP denial');return {denialStatus:status};}
async function bytes(c,f){const b=await ok(c.storage.from(f.bucket).download(f.path));const actual=Buffer.from(await b.arrayBuffer());assert.equal(hash(actual),f.sha256);assert.equal(actual.length,f.size);return {sha256:hash(actual),bytes:actual.length};}
const gateway=(s,f,resourceId=null)=>s.c.functions.invoke('admin-storage-access',{body:{action:'sign',bucket:f.bucket,path:f.path,resourceId,sessionToken:s.token}});
try{
 await step('Installed repaired state unchanged before assertions','Privileged verification',preserved);
 const owner=await signInActor(a,'Recorded owner JWT');auth.push(owner);
 const other=await signInActor(state.actors.B,'Other organization JWT');auth.push(other);
 const anon=client();
 const admin=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));admins.push(admin);
 const unauthorized=await adminLogin(state.reviewer.username,state.reviewer.password);admins.push(unauthorized);
 await step('Genuine Super Admin permission context','Admin',async()=>{const c=await ok(admin.c.rpc('get_admin_permission_context',{_session_token:admin.token}));assert.equal(c[0].role_code,'super_admin');});
 for(const [label,c]of [['Owner',owner],['Other organization',other],['Anonymous',anon],['Custom Admin without organization JWT',admin.c]]){
  await step(label+' terminal replacement RPC denied',label,async()=>{const d=await deny(c.rpc('user_replace_document_submission_file',{_file_id:a.recoveryTargetFileId,_new_file_url:original.storageUri,_new_file_name:original.fileName,_new_file_type:'application/pdf',_new_file_size:original.size}));await preserved();return {...d,protectedStateUnchanged:true};});
  await step(label+' optimistic replacement RPC denied',label,async()=>{const d=await deny(c.rpc('replace_organization_document_file',{_file_id:a.recoveryTargetFileId,_document_type_id:before.target.document_type_id,_expected_updated_at:before.target.updated_at,_file_url:original.storageUri,_file_name:original.fileName,_file_type:'application/pdf',_file_size:original.size}));await preserved();return {...d,protectedStateUnchanged:true};});
  await step(label+' direct terminal content mutation denied',label,async()=>{const r=await c.from('document_submission_files').update({file_url:original.storageUri,file_name:original.fileName,file_size:original.size}).eq('id',a.recoveryTargetFileId).select('id');assert(r.error||r.data?.length===0,'Expected no modified row');await preserved();return {httpStatus:r.status,zeroRows:!r.error,protectedStateUnchanged:true};});
 }
 await step('Owner original PDF bytes preserved','Owner',()=>bytes(owner,original));
 await step('Owner corrected PDF download and hash','Owner',()=>bytes(owner,corrected));
 await step('Owner signing and signed download hash','Owner',async()=>{const d=await ok(owner.storage.from(corrected.bucket).createSignedUrl(corrected.path,60));const r=await guardedFetch(d.signedUrl);assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),corrected.sha256);});
 for(const [label,c]of [['Other organization',other],['Anonymous',anon]]){
  await step(label+' private download denied',label,()=>deny(c.storage.from(corrected.bucket).download(corrected.path)));
  await step(label+' private signing denied',label,()=>deny(c.storage.from(corrected.bucket).createSignedUrl(corrected.path,60)));
 }
 await step('Authorized Admin gateway signing and hash','Admin',async()=>{const d=await ok(gateway(admin,corrected));const r=await guardedFetch(d.signedUrl);assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),corrected.sha256);});
 await step('Zero-permission Admin gateway denied','Zero-permission Admin',()=>deny(gateway(unauthorized,corrected)));
 const revoked=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));admins.push(revoked);await revokeAdmin(revoked);
 await step('Genuine revoked Admin gateway denied','Revoked Admin',()=>deny(gateway(revoked,corrected)));
 await step('Forged parent/path gateway denied','Admin',()=>deny(gateway(admin,{...corrected,path:corrected.path.replace(a.organizationId,state.actors.B.organizationId)},state.actors.B.organizationId)));
 await step('Final protected rows unchanged after all denied mutations','Privileged verification',preserved);
 const all=await ok(service.from('document_submission_files').select('id,submission_id,admin_status'));
 const parents=await ok(service.from('document_submissions').select('id,status,renewal_id,organization_id'));
 const candidates=all.filter(f=>['draft','needs_revision'].includes(f.admin_status)&&f.submission_id!==a.renewalSubmission.id).map(f=>({...f,parent:parents.find(s=>s.id===f.submission_id)}));
 results.push({check:'Separate eligible positive revision state',status:'BLOCKED',candidateCount:candidates.length,reason:candidates.length?'Further reviewed ownership/lifecycle fixture selection required; no mutation attempted':'No existing draft/needs_revision document outside approved cycle; no fixture reopening authorized'});
 results.push({check:'Expired genuine Admin session',status:'BLOCKED',reason:'No recorded expired test token available; no session expiry mutation or waiting for natural expiry in this scoped run'});
 results.push({check:'Destructive Storage overwrite/deletion',status:'BLOCKED',reason:'No separately approved disposable objects/recovery plan; preserved evidence not used'});
}catch(e){console.log('STOP: unexpected assertion; no retry');process.exitCode=2;}
finally{
 for(const s of admins)try{await revokeAdmin(s);}catch(e){results.push({check:'Revoke own test Admin session',status:'FAIL',...safeError(e)});process.exitCode=2;}
 for(const c of auth)try{const r=await c.auth.signOut({scope:'local'});if(r.error)throw r.error;}catch(e){results.push({check:'Sign out own Auth session',status:'FAIL',...safeError(e)});process.exitCode=2;}
 await persist();
}
