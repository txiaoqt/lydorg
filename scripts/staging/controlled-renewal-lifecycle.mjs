import { adminLogin, revokeAdmin, requireEnv, signInActor, guardedFetch, hash, syntheticPdf } from './synthetic-validation-common.mjs';
import { randomUUID } from 'node:crypto';
export async function run({state,owner,admin,service,step,upload,assert,saveState,ok,client}) {
 const a=state.renewalScenario,sessions=[],auth=[];
 const scenario=(session,days=30)=>client().rpc('admin_prepare_renewal_test_scenario',{p_session_token:session,p_expiration_days_ahead:days,p_custom_expiration_date:null});
 const denied=async(promise)=>{const r=await promise;assert(r.error&&!r.data?.signedUrl,'Expected denied request');return r;};
 try{
  const unauthorized=await step('Genuine zero-permission Admin login',async()=>{
   const s=await adminLogin(state.reviewer.username,state.reviewer.password);sessions.push(s);
   const ctx=await ok(s.c.rpc('get_admin_permission_context',{_session_token:s.token}));assert(ctx[0]?.role_code!=='super_admin','Expected ordinary Admin');return s;
  });
  const revoked=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));sessions.push(revoked);await revokeAdmin(revoked);
  const expired=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));sessions.push(expired);
  await step('Privileged expiry fixture shortens only newly created genuine test session',async()=>{
   const rows=await ok(service.from('admin_sessions').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('admin_id',expired.adminId).eq('token_hash',hash(expired.token)).is('revoked_at',null).select('id'));
   assert(rows.length===1,'Expected exactly one newly created session');
  });
  for(const [label,token]of [['invalid','not-a-valid-admin-session'],['zero-permission',unauthorized.token],['revoked',revoked.token],['expired',expired.token]])await step(`${label} Admin denied scenario before simulation`,()=>denied(scenario(token)));
  await step('Owner JWT cannot operate privileged scenario',()=>denied(owner.rpc('admin_prepare_renewal_test_scenario',{p_session_token:'',p_expiration_days_ahead:30,p_custom_expiration_date:null})));
  await step('Super Admin binds only independently designated fixture without displaying password',async()=>{
   const row=await ok(admin.c.rpc('admin_get_or_create_renewal_test_account',{p_session_token:admin.token}));
   assert(row.organization.id===a.organizationId&&row.credentials.temporaryPassword===null,'Expected exact dedicated fixture');
  });
  await step('30 Days Ahead scenario and OPEN genuine owner eligibility',async()=>{
   const row=await ok(scenario(admin.token));assert(row.organizationId===a.organizationId&&row.accreditationId===a.initialTermId&&row.eligibility.canDraft===true,'Expected exact eligible term');
   const e=await ok(owner.rpc('calculate_organization_renewal_eligibility',{_org_id:a.organizationId}));assert(e.canDraft===true,'Expected OPEN renewal');a.scenarioApplied=true;await saveState(state);
  });
  await step('Genuine owner creates one renewal draft',async()=>{
   const d=await ok(owner.rpc('user_start_or_get_renewal_draft',{p_organization_id:a.organizationId}));assert(d.renewal.organization_id===a.organizationId&&d.submission.renewal_id===d.renewal.id,'Expected linked genuine renewal');a.renewal=d.renewal;a.renewalSubmission=d.submission;await saveState(state);
  });
  await step('Owner uploads all required renewal PDFs and submits',async()=>{
   const types=await ok(owner.from('required_document_types').select('id,name,scope').eq('is_active',true).eq('is_required',true).eq('template_scope','document_submission').in('scope',['both','renewal']));assert(types.length>0,'Expected renewal requirements');
   for(const t of types)await upload(t,a.renewalSubmission,'renewal');
   const r=await ok(owner.rpc('user_submit_renewal',{p_renewal_id:a.renewal.id}));assert(r.success,'Expected submitted renewal');
  });
  await step('Admin sees submitted renewal through scoped review RPC',async()=>{await ok(admin.c.rpc('admin_get_renewal_review_context',{_session_token:admin.token,_renewal_id:a.renewal.id}));});
  const target=a.files.find(f=>f.kind==='renewal');
  await step('Normal Admin document flag and Needs Revision transition',async()=>{
   await ok(admin.c.rpc('update_admin_document_submission_file_review',{_session_token:admin.token,_file_id:target.metadataId,_status:'needs_revision',_admin_remarks:'SYNTHETIC correct the dedicated renewal PDF'}));
   // File review already performs the renewal transition atomically.
   const r=await ok(owner.from('organization_renewals').select('status').eq('id',a.renewal.id).single());
   assert(r.status==='needs_revision','Expected file review to transition renewal');
  });
  let corrected;
  await step('Owner uploads corrected PDF and replaces through supported revision RPC',async()=>{
   const bytes=syntheticPdf('Dedicated corrected renewal document'),fileName='SYNTHETIC-renewal-corrected.pdf';
   const type=(await ok(owner.from('document_submission_files').select('document_type_id').eq('id',target.metadataId).single())).document_type_id;
   const path=`${a.organizationId}/renewal/${a.renewal.id}/${type}/revisions/${randomUUID()}-${fileName}`;
   await ok(owner.storage.from('organization-documents').upload(path,bytes,{contentType:'application/pdf',upsert:false}));
   corrected={...target,path,fileName,storageUri:`storage://organization-documents/${path}`,sha256:hash(bytes),size:bytes.length,kind:'renewal-corrected'};a.files.push(corrected);await saveState(state);
   await ok(owner.rpc('user_replace_document_submission_file',{_file_id:target.metadataId,_new_file_url:corrected.storageUri,_new_file_name:fileName,_new_file_type:'application/pdf',_new_file_size:bytes.length}));
  });
  await step('Owner resubmits corrected renewal',async()=>{const r=await ok(owner.rpc('user_resubmit_renewal',{p_renewal_id:a.renewal.id}));assert(r.success,'Expected resubmitted');});
  const other=await signInActor(state.actors.B,'Organization B JWT');auth.push(other);
  const checkHash=async(c,f)=>{const blob=await ok(c.storage.from(f.bucket).download(f.path));assert(hash(Buffer.from(await blob.arrayBuffer()))===f.sha256,'Expected downloaded SHA256');};
  const gateway=async(session,f,resourceId)=>session.c.functions.invoke('admin-storage-access',{body:{action:'sign',bucket:f.bucket,path:f.path,resourceId:resourceId??null,sessionToken:session.token}});
  for(const f of a.files.filter(f=>f.kind.startsWith('renewal')))await step(`Owner download hash ${f.kind} ${f.metadataId}`,()=>checkHash(owner,f));
  await step('Owner signed corrected download hash',async()=>{
   const r=await ok(owner.storage.from(corrected.bucket).createSignedUrl(corrected.path,60));const response=await guardedFetch(r.signedUrl);assert(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===corrected.sha256,'Expected owner signed hash');
  });
  for(const [label,c]of [['Other organization',other],['Anonymous',client()]]){
   await step(`${label} denied renewal download`,()=>denied(c.storage.from(corrected.bucket).download(corrected.path)));
   await step(`${label} denied renewal signing`,()=>denied(c.storage.from(corrected.bucket).createSignedUrl(corrected.path,60)));
  }
  await step('Authorized Admin signed corrected download hash',async()=>{const r=await ok(gateway(admin,corrected));assert(r.signedUrl,'Expected Admin signed URL');const response=await guardedFetch(r.signedUrl);assert(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===corrected.sha256,'Expected Admin downloaded hash');});
  for(const [label,s]of [['Zero-permission',unauthorized],['Revoked',revoked],['Expired',expired]])await step(`${label} Admin denied renewal signing`,()=>denied(gateway(s,corrected)));
  await step('Authorized Admin denied forged parent/path',()=>denied(gateway(admin,{...corrected,path:corrected.path.replace(a.organizationId,state.actors.B.organizationId)},state.actors.B.organizationId)));
  await step('Normal document approvals and final renewal approval',async()=>{
   for(const f of a.files.filter(f=>f.kind==='renewal'))await ok(admin.c.rpc('update_admin_document_submission_file_review',{_session_token:admin.token,_file_id:f.metadataId,_status:'approved_green',_admin_remarks:'SYNTHETIC dedicated renewal final document approval'}));
   const r=await ok(admin.c.rpc('admin_approve_renewal',{p_session_token:admin.token,p_renewal_id:a.renewal.id,p_certificate_urn:null,p_admin_remarks:'SYNTHETIC completed controlled staging renewal'}));assert(r.success,'Expected renewal approval');a.lifecycleApproved=true;await saveState(state);
  });
  await step('Approved terminal renewal and legitimate accreditation transition',async()=>{
   const r=await ok(owner.from('organization_renewals').select('status').eq('id',a.renewal.id).single());assert(r.status==='approved','Expected terminal approved');
   const p=await ok(owner.from('organization_profiles').select('current_accreditation_id').eq('id',a.organizationId).single());assert(p.current_accreditation_id!==a.initialTermId,'Expected new accreditation');a.finalTermId=p.current_accreditation_id;await saveState(state);
  });
  await step('Terminal file replacement denied',()=>denied(owner.rpc('user_replace_document_submission_file',{_file_id:target.metadataId,_new_file_url:target.storageUri,_new_file_name:target.fileName,_new_file_type:'application/pdf',_new_file_size:target.size})));
  await step('Terminal Storage overwrite denied and original hash intact',async()=>{
   await denied(owner.storage.from(corrected.bucket).upload(corrected.path,syntheticPdf('DENIED overwrite'),{contentType:'application/pdf',upsert:true}));await checkHash(owner,corrected);
  });
  await step('Existing A B suspended profiles preserved',async()=>{const rows=await ok(service.from('organization_profiles').select('id,user_id,organization_name,profile_status').in('id',state.renewalScenarioOriginalProfiles.map(p=>p.id)));assert(JSON.stringify(rows.sort((a,b)=>a.id.localeCompare(b.id)))===JSON.stringify(state.renewalScenarioOriginalProfiles.sort((a,b)=>a.id.localeCompare(b.id))),'Expected original profiles unchanged');});
 }finally{
  for(const s of sessions)await step('Revoke only lifecycle test Admin session',()=>revokeAdmin(s));
  for(const c of auth)await step('Close only lifecycle test organization session',async()=>{const r=await c.auth.signOut({scope:'local'});if(r.error)throw r.error;});
 }
}
