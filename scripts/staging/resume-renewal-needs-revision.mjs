// Explicit single continuation. Never provisions identities, drafts, dates or SQL.
import { open,unlink,writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { planRecovery } from './renewal-recovery-plan.mjs';
import { REF,MARKER,client,loadState,saveState,requireEnv,signInActor,adminLogin,revokeAdmin,ok,hash,syntheticPdf,guardedFetch,evidence,setContext,safeError } from './synthetic-validation-common.mjs';
const preflightOnly=process.argv[2]==='--preflight-only';
if(!preflightOnly&&process.argv[2]!=='--resume-needs-revision')throw new Error('Explicit recovery mode required');
const reportRun=process.argv.find(v=>v.startsWith('--report-run='))?.slice('--report-run='.length);
if(reportRun&&!/^[a-z0-9-]{1,80}$/.test(reportRun))throw new Error('Invalid report run label');
const base='docs/staging-validation/2026-10-11/renewal-scenario',reportPath=`${base}/${preflightOnly?'recovery-readonly-preflight':'recovery-http-evidence'}${reportRun?`-${reportRun}`:''}.json`,lockPath='.ytrace-staging-fixtures-lock.local';
if(existsSync(reportPath))throw new Error('Existing recovery evidence; no automatic replay');
const results=[],admins=[],auth=[];let lock,state,plan,owner,admin,corrected;
const service=client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const assert=(value,message='Unexpected recovery state')=>{if(!value)throw new Error(message);};
async function persist(){await writeFile(reportPath,JSON.stringify({projectRef:REF,timestamp:new Date().toISOString(),results,evidence},null,2));}
async function step(check,fn){setContext('Controlled renewal recovery',check);const cursor=evidence.length;try{const details=await fn();results.push({check,status:'PASS',...(details??{}),http:evidence.slice(cursor)});console.log(`PASS: ${check}`);await persist();return details;}catch(e){results.push({check,status:'FAIL',...safeError(e),http:evidence.slice(cursor)});await persist();throw e;}}
async function inventory(f){const pos=f.path.lastIndexOf('/');const rows=await ok(service.storage.from(f.bucket).list(f.path.slice(0,pos),{limit:100,search:f.path.slice(pos+1)}));return rows.filter(r=>r.name===f.path.slice(pos+1));}
async function downloaded(c,f){const b=await ok(c.storage.from(f.bucket).download(f.path));assert(hash(Buffer.from(await b.arrayBuffer()))===f.sha256,'Expected downloaded hash');}
async function deny(promise){const r=await promise;assert(r.error&&!r.data?.signedUrl,'Expected authorization denial');const status=Number(r.error?.context?.status??r.error?.statusCode??r.error?.status??r.status);assert([400,401,403,404].includes(status),'Expected actual HTTP denial');return {denialStatus:status};}
async function gateway(s,f,resourceId=null){return s.c.functions.invoke('admin-storage-access',{body:{action:'sign',bucket:f.bucket,path:f.path,resourceId,sessionToken:s.token}});}
async function preserved(){const a=state.renewalScenario;const rows=await ok(service.from('document_submission_files').select('id,file_url,file_size,file_name').eq('submission_id',a.renewalSubmission.id));assert(rows.length===6,'Expected same six file records');for(const p of plan.preserved){const now=rows.find(r=>r.id===p.id);assert(now?.file_url===p.file_url&&now.file_name===p.file_name&&now.file_size===p.file_size,'Expected five original references unchanged');}}
try{
 lock=await open(lockPath,'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid,projectRef:REF,phase:'renewal-needs-revision-recovery'}));
 state=await loadState();const a=state.renewalScenario;
 await step('Read-only recovery identities, permissions, registration, term, audits, files and saved IDs',async()=>{
  assert(a?.email==='ytrace-renewal-synthetic@example.invalid'&&a.name==='SYNTHETIC Y-TRACE Renewal Scenario'&&a.scenarioApplied,'Expected saved designated actor');
  const users=(await ok(service.auth.admin.listUsers({page:1,perPage:1000}))).users;const recorded=[...Object.values(state.actors),state.reviewer];
  assert(users.length===5&&recorded.every(r=>users.some(u=>u.id===r.userId&&u.email===r.email&&u.app_metadata?.ytrace_security_fixture===MARKER)),'Expected original identities');
  const dedicated=users.filter(u=>u.id===a.userId&&u.email===a.email&&u.app_metadata?.ytrace_renewal_fixture===`${REF}-v1`);
  assert(dedicated.length===1,'Expected exact inventory identity');
  // The list endpoint omits linked identities. Authoritative detail is required.
  const detail=(await ok(service.auth.admin.getUserById(a.userId))).user;
  assert(detail.id===a.userId&&detail.email===a.email&&detail.app_metadata?.ytrace_renewal_fixture===`${REF}-v1`&&detail.identities?.length===1&&detail.identities[0].provider==='email'&&detail.email_confirmed_at,'Expected trusted confirmed identity');
  const profiles=await ok(service.from('organization_profiles').select('id,user_id,organization_name,profile_status,current_accreditation_id,organization_email'));
  assert(profiles.length===4&&state.renewalScenarioOriginalProfiles.every(p=>profiles.some(r=>r.id===p.id&&r.user_id===p.user_id&&r.organization_name===p.organization_name&&r.profile_status===p.profile_status)),'Expected original profiles');
  assert(profiles.some(p=>p.id===a.organizationId&&p.user_id===a.userId&&p.profile_status==='verified'&&p.current_accreditation_id===a.initialTermId&&p.organization_email===a.email),'Expected designated ownership');
  const accounts=await ok(service.from('admin_accounts').select('id,username,is_active,is_password_set,role_id'));const roles=await ok(service.from('roles').select('id,code,permission_codes'));
  assert(accounts.length===2&&accounts.some(r=>r.username==='staging-super-admin'&&r.is_active&&r.is_password_set&&roles.some(role=>role.id===r.role_id&&role.code==='super_admin')),'Expected unchanged Super Admin');
  assert(accounts.some(r=>r.id===state.reviewer.adminId&&r.is_active&&roles.some(role=>role.id===r.role_id&&role.permission_codes.length===0)),'Expected genuine zero-permission Admin');
  const reg=await ok(service.from('document_submissions').select('id,organization_id,status,submission_scope').eq('id',a.registration.id).single());assert(reg.organization_id===a.organizationId&&reg.status==='approved_green'&&reg.submission_scope==='registration','Expected approved original registration');
  const terms=await ok(service.from('organization_accreditations').select('*').eq('organization_id',a.organizationId));assert(terms.length===1&&terms[0].id===a.initialTermId&&terms[0].term_number===1&&terms[0].status==='active'&&terms[0].end_date==='2026-11-09','Expected preserved simulated term');
  const renewals=await ok(service.from('organization_renewals').select('*').eq('organization_id',a.organizationId));
  const submissions=await ok(service.from('document_submissions').select('*').eq('renewal_id',a.renewal.id));
  const files=await ok(service.from('document_submission_files').select('*').eq('submission_id',a.renewalSubmission.id));plan=planRecovery(a,renewals,submissions,files);
  const audits=await ok(service.from('activity_logs').select('action').eq('organization_id',a.organizationId));for(const action of ['staging_renewal_fixture_bound','staging_renewal_simulated','renewal_submitted'])assert(audits.some(r=>r.action===action),'Expected existing audit evidence');
  for(const f of a.files){const objects=await inventory(f);assert(objects.length===1&&objects[0].metadata?.size===f.size,'Expected exact existing Storage object');}
  return {existingRenewals:1,existingDocuments:6,flaggedDocuments:1,preservedDocuments:5};
 });
 if(preflightOnly){console.log('PASS: read-only mode; no login, upload or database mutation');}
 else {
 await step('Normal existing owner Auth login',async()=>{owner=await signInActor(a,'Dedicated renewal owner');auth.push(owner);});
 await step('Original six owner downloads match recorded SHA-256',async()=>{for(const f of a.files.filter(f=>f.kind==='renewal'))await downloaded(owner,f);return {downloadedFiles:6};});
 a.recoveryStartedAt=new Date().toISOString();a.recoveryTargetFileId=plan.target.id;await saveState(state);
 await step('Upload exactly one corrected PDF with genuine owner JWT',async()=>{
  const bytes=syntheticPdf('Dedicated renewal corrected PDF controlled recovery'),fileName='SYNTHETIC-renewal-corrected.pdf';
  const path=`${a.organizationId}/renewal/${a.renewal.id}/${plan.target.document_type_id}/revisions/${randomUUID()}-${fileName}`;
  a.recoveryUploadAttempt={path,sha256:hash(bytes),size:bytes.length};await saveState(state);
  await ok(owner.storage.from('organization-documents').upload(path,bytes,{contentType:'application/pdf',upsert:false}));
  corrected={...plan.original,kind:'renewal-corrected',path,fileName,storageUri:`storage://organization-documents/${path}`,size:bytes.length,sha256:hash(bytes)};a.files.push(corrected);await saveState(state);
  return {uploadedFiles:1,sha256:corrected.sha256};
 });
 await step('Replace only flagged document through existing revision RPC',async()=>{
  await ok(owner.rpc('user_replace_document_submission_file',{_file_id:plan.target.id,_new_file_url:corrected.storageUri,_new_file_name:corrected.fileName,_new_file_type:'application/pdf',_new_file_size:corrected.size}));
  const row=await ok(owner.from('document_submission_files').select('file_url,admin_status,revision_history').eq('id',plan.target.id).single());assert(row.file_url===corrected.storageUri&&row.admin_status==='submitted','Expected corrected review metadata');await preserved();return {unchangedOtherDocuments:5};
 });
 await step('Original and corrected hashes; five unchanged PDFs intact',async()=>{for(const f of a.files.filter(f=>f.kind.startsWith('renewal')))await downloaded(owner,f);return {verifiedDownloads:7};});
 await step('Normal owner resubmission',async()=>{const r=await ok(owner.rpc('user_resubmit_renewal',{p_renewal_id:a.renewal.id}));assert(r.success,'Expected normal resubmission');});
 await step('Normal Super Admin login and scoped renewal review',async()=>{admin=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));admins.push(admin);const ctx=await ok(admin.c.rpc('get_admin_permission_context',{_session_token:admin.token}));assert(ctx[0]?.role_code==='super_admin','Expected genuine Super Admin');await ok(admin.c.rpc('admin_get_renewal_review_context',{_session_token:admin.token,_renewal_id:a.renewal.id}));});
 await step('Approve pending documents through normal Admin review',async()=>{
  const rows=await ok(service.from('document_submission_files').select('id,admin_status').eq('submission_id',a.renewalSubmission.id));assert(rows.length===6,'Expected six records');
  for(const f of rows){assert(['submitted','under_admin_review','approved_green'].includes(f.admin_status),'Expected reviewable document');if(f.admin_status!=='approved_green')await ok(admin.c.rpc('update_admin_document_submission_file_review',{_session_token:admin.token,_file_id:f.id,_status:'approved_green',_admin_remarks:'SYNTHETIC controlled renewal recovery document approval'}));}
 });
 await step('Final cycle 2 approval through normal Admin RPC',async()=>{const r=await ok(admin.c.rpc('admin_approve_renewal',{p_session_token:admin.token,p_renewal_id:a.renewal.id,p_certificate_urn:null,p_admin_remarks:'SYNTHETIC complete preserved staging renewal cycle 2'}));assert(r.success,'Expected normal final approval');a.lifecycleApproved=true;await saveState(state);});
 await step('Cycle 2 terminal approval and authoritative three-year term transition',async()=>{
  const rows=await ok(service.from('organization_accreditations').select('id,term_number,status,start_date,end_date').eq('organization_id',a.organizationId));
  const old=rows.find(r=>r.id===a.initialTermId),current=rows.find(r=>r.status==='active');assert(rows.length===2&&old?.status==='superseded'&&current?.term_number===2&&current.start_date===old.end_date&&current.end_date==='2029-11-09','Expected legitimate three-year term transition');
  const renewal=await ok(owner.from('organization_renewals').select('status,cycle_number').eq('id',a.renewal.id).single());assert(renewal.status==='approved'&&renewal.cycle_number===2,'Expected same approved cycle');a.finalTermId=current.id;await saveState(state);await preserved();return {renewalStatus:'approved',termNumber:2,startDate:current.start_date,endDate:current.end_date};
 });
 const other=await signInActor(state.actors.B,'Other organization JWT');auth.push(other);
 await step('Owner terminal download and signed URL hashes',async()=>{await downloaded(owner,corrected);const signed=await ok(owner.storage.from(corrected.bucket).createSignedUrl(corrected.path,60));const response=await guardedFetch(signed.signedUrl);assert(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===corrected.sha256,'Expected signed download SHA256');});
 for(const [label,c]of [['Cross-organization',other],['Anonymous',client()]]){
  await step(`${label} denied private download`,()=>deny(c.storage.from(corrected.bucket).download(corrected.path)));
  await step(`${label} denied private signing`,()=>deny(c.storage.from(corrected.bucket).createSignedUrl(corrected.path,60)));
 }
 await step('Authorized Admin signing and downloaded hash',async()=>{const data=await ok(gateway(admin,corrected));const r=await guardedFetch(data.signedUrl);assert(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===corrected.sha256,'Expected gateway hash');});
 const unauthorized=await adminLogin(state.reviewer.username,state.reviewer.password);admins.push(unauthorized);
 const revoked=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));admins.push(revoked);await revokeAdmin(revoked);
 const expired=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));admins.push(expired);
 await step('Privileged expiry setup changes only newly created genuine test session',async()=>{const rows=await ok(service.from('admin_sessions').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('admin_id',expired.adminId).eq('token_hash',hash(expired.token)).is('revoked_at',null).select('id'));assert(rows.length===1,'Expected exactly one test session');});
 for(const [label,s]of [['Zero-permission',unauthorized],['Revoked',revoked],['Expired',expired]])await step(`${label} Admin denied renewal gateway signing`,()=>deny(gateway(s,corrected)));
 await step('Forged organization parent and path denied',()=>deny(gateway(admin,{...corrected,path:corrected.path.replace(a.organizationId,state.actors.B.organizationId)},state.actors.B.organizationId)));
 await step('Terminal metadata revision denied and corrected reference preserved',async()=>{await deny(owner.rpc('user_replace_document_submission_file',{_file_id:plan.target.id,_new_file_url:plan.original.storageUri,_new_file_name:plan.original.fileName,_new_file_type:'application/pdf',_new_file_size:plan.original.size}));const row=await ok(owner.from('document_submission_files').select('file_url').eq('id',plan.target.id).single());assert(row.file_url===corrected.storageUri,'Expected terminal reference unchanged');});
 await step('Terminal Storage overwrite denied and bytes intact',async()=>{await deny(owner.storage.from(corrected.bucket).update(corrected.path,syntheticPdf('DENIED terminal overwrite'),{contentType:'application/pdf'}));await downloaded(owner,corrected);});
 await step('Terminal Storage DELETE has no effect; persisted object and hash intact',async()=>{const r=await owner.storage.from(corrected.bucket).remove([corrected.path]);assert(r.error||r.data?.length===0,'Expected no deleted object');assert((await inventory(corrected)).length===1,'Expected persisted object');await downloaded(owner,corrected);return {objectStillPresent:true};});
 await step('Final five documents and original fixtures remain intact',async()=>{await preserved();const rows=await ok(service.from('organization_profiles').select('id,user_id,organization_name,profile_status').in('id',state.renewalScenarioOriginalProfiles.map(p=>p.id)));assert(state.renewalScenarioOriginalProfiles.every(p=>rows.some(r=>JSON.stringify(r)===JSON.stringify(p))),'Expected original profiles preserved');for(const f of a.files.filter(f=>f.kind.startsWith('renewal')))await downloaded(owner,f);});
 a.recoveryFinishedAt=new Date().toISOString();await saveState(state);
 }
}catch(error){console.log('STOP: no automatic retry or history cleanup');results.push({check:'Recovery stopped',status:'BLOCKED',...safeError(error)});process.exitCode=2;}
finally{
 for(const s of admins)try{await step('Revoke only recovery test Admin session',()=>revokeAdmin(s));}catch{process.exitCode=2;}
 for(const c of auth)try{await step('Close only recovery test Auth session',async()=>{const r=await c.auth.signOut({scope:'local'});if(r.error)throw r.error;});}catch{process.exitCode=2;}
 await persist();if(lock){await lock.close();await unlink(lockPath);}
}
