// Single authorized staging execution. No retry/resume switch after uncertain writes.
import { open, unlink, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { client, loadState, saveState, ok, requireEnv, REF, MARKER, signInActor, adminLogin, revokeAdmin, syntheticPdf, hash, evidence, setContext, safeError } from './synthetic-validation-common.mjs';
const base='docs/staging-validation/2026-10-11/renewal-scenario';
const lockPath='.ytrace-staging-fixtures-lock.local';
const expectedHash='b84b3b80c9045c11ca4e58c14c52c73018916b01235a71b829c8c66ef2029245';
const results=[]; let lock,state,owner,admin;
const assert=(value,message)=>{if(!value)throw new Error(message);};
async function report(){await writeFile(`${base}/execution-http-evidence.json`,JSON.stringify({projectRef:REF,timestamp:new Date().toISOString(),results,evidence},null,2));}
async function step(label,fn){setContext('Controlled renewal',label);const start=evidence.length;try{const value=await fn();results.push({check:label,status:'PASS',http:evidence.slice(start)});console.log(`PASS: ${label}`);await report();return value;}catch(e){results.push({check:label,status:'FAIL',...safeError(e),http:evidence.slice(start)});await report();throw e;}}
const service=client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
async function insert(c,table,payload){return ok(c.from(table).insert(payload).select('*').single());}
async function upload(type,submission,kind='registration'){
 const a=state.renewalScenario,bytes=syntheticPdf(`Dedicated renewal ${kind} ${type.name}`),fileName=`SYNTHETIC-${kind}-${type.id}.pdf`;
 const path=`${a.organizationId}/${kind==='registration'?'':`renewal/${a.renewal.id}/`}${type.id}/${fileName}`;
 await ok(owner.storage.from('organization-documents').upload(path,bytes,{contentType:'application/pdf',upsert:false}));
 const f={kind,bucket:'organization-documents',path,fileName,sha256:hash(bytes),size:bytes.length,storageUri:`storage://organization-documents/${path}`};
 a.files.push(f);await saveState(state);
 const row=await insert(owner,'document_submission_files',{submission_id:submission.id,document_type_id:type.id,file_name:fileName,file_url:f.storageUri,file_type:'application/pdf',file_size:bytes.length,validation_status:'correct',admin_status:'draft'});
 f.metadataId=row.id;await saveState(state);return f;
}
try{
 lock=await open(lockPath,'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid,projectRef:REF,phase:'controlled-renewal'}));
 state=await loadState();assert(!state.renewalScenario,'Expected unattempted dedicated fixture');
 await step('Immediate exact-stage inventory, credentials and reviewed SQL hash',async()=>{
  assert(hash(await readFile(`${base}/staging-adaptation.sql`))===expectedHash,'Expected exact reviewed SQL hash');
  const users=(await ok(service.auth.admin.listUsers({page:1,perPage:1000}))).users;
  const actors=[...Object.values(state.actors),state.reviewer];
  assert(users.length===4&&actors.every(a=>users.some(u=>u.id===a.userId&&u.email===a.email&&u.app_metadata?.ytrace_security_fixture===MARKER)),'Expected original identities');
  const profiles=await ok(service.from('organization_profiles').select('id,user_id,organization_name,profile_status'));
  assert(profiles.length===3&&Object.values(state.actors).every(a=>profiles.some(p=>p.id===a.organizationId&&p.user_id===a.userId&&p.organization_name===a.name)),'Expected original profiles');
  state.renewalScenarioOriginalProfiles=profiles;
  assert((await ok(service.storage.listBuckets())).length===10,'Expected ten buckets');
 });
 await step('Create exactly one confirmed synthetic Auth identity without email endpoints',async()=>{
  state.renewalScenario={email:'ytrace-renewal-synthetic@example.invalid',name:'SYNTHETIC Y-TRACE Renewal Scenario',password:randomBytes(36).toString('base64url'),files:[],creationAttemptedAt:new Date().toISOString()};await saveState(state);
  const a=state.renewalScenario;
  const data=await ok(service.auth.admin.createUser({email:a.email,password:a.password,email_confirm:true,app_metadata:{ytrace_renewal_fixture:`${REF}-v1`}}));
  a.userId=data.user.id;await saveState(state);
  assert(data.user.email===a.email&&data.user.app_metadata?.ytrace_renewal_fixture===`${REF}-v1`&&data.user.identities?.length===1&&data.user.identities[0].provider==='email','Expected exact trusted identity');
 });
 owner=await step('Normal dedicated organization Auth login',()=>signInActor(state.renewalScenario,'Dedicated owner JWT'));
 await step('Owner creates designated fictional organization profile',async()=>{
  const a=state.renewalScenario;
  const row=await insert(owner,'organization_profiles',{user_id:a.userId,organization_name:a.name,organization_email:a.email,contact_number:'09000000004',barangay:'Palatiw',address_barangay:'Palatiw',address_city:'Pasig City',address_province:'Metro Manila',address_street:'Fictional Renewal Staging Street',address_zip_code:'1600',major_classification:'Youth Organization',sub_classification:'Community-Based',advocacies:['Education'],representative_first_name:'SyntheticRenewal',representative_last_name:'Fixture',representative_name:'SyntheticRenewal Fixture',adviser_name:'Fictional Adviser',profile_status:'incomplete',registration_type:'new_organization',is_existing_organization:false,directory_visibility:false});
  a.organizationId=row.id;await saveState(state);assert(row.user_id===a.userId,'Expected exact owner');
 });
 admin=await step('Normal existing Super Admin login and permission context',async()=>{
  const login=await adminLogin('staging-super-admin',requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));
  admin=login;
  const context=await ok(login.c.rpc('get_admin_permission_context',{_session_token:login.token}));assert(context[0]?.role_code==='super_admin','Expected Super Admin context');return login;
 });
 await step('Normal identity review and genuine registration uploads',async()=>{
  const a=state.renewalScenario;
  const identity=await ok(admin.c.rpc('admin_get_organization_identity_review',{_session_token:admin.token,_organization_id:a.organizationId}));
  assert(identity.outcome==='NO_MATCH'&&identity.candidates.length===0,'Expected unambiguous identity');
  a.registration=await insert(owner,'document_submissions',{organization_id:a.organizationId,submitted_by:a.userId,status:'draft',user_confirmed:false});await saveState(state);
  const types=await ok(owner.from('required_document_types').select('id,name,scope').eq('is_active',true).eq('is_required',true).eq('template_scope','document_submission'));
  assert(types.length>0,'Expected registration requirements');
  for(const type of types)await upload(type,a.registration);
  await ok(owner.from('document_submission_files').update({admin_status:'under_admin_review'}).eq('submission_id',a.registration.id).eq('admin_status','draft').select('id'));
  await ok(owner.from('document_submissions').update({status:'under_admin_review',user_confirmed:true,submitted_at:new Date().toISOString()}).eq('id',a.registration.id).select('id').single());
 });
 await step('Authorized registration review produces legitimate initial accreditation',async()=>{
  const a=state.renewalScenario;
  for(const f of a.files)await ok(admin.c.rpc('update_admin_document_submission_file_review',{_session_token:admin.token,_file_id:f.metadataId,_status:'approved_green',_admin_remarks:'SYNTHETIC dedicated staging renewal registration approval'}));
  const p=await ok(owner.from('organization_profiles').select('profile_status,current_accreditation_id').eq('id',a.organizationId).single());
  assert(p.profile_status==='verified'&&p.current_accreditation_id,'Expected normal authoritative accreditation');a.initialTermId=p.current_accreditation_id;await saveState(state);
 });
 console.log('READY: registration complete; lock held while awaiting reviewed SQL installation');
 await writeFile('tmp/renewal-registration.ready','ready');
 while(!existsSync('tmp/renewal-install.ready'))await new Promise(resolve=>setTimeout(resolve,1000));
 const continuation=await import('./controlled-renewal-lifecycle.mjs');
 await continuation.run({state,owner,admin,service,step,upload,assert,saveState,ok,client,base});
}catch(error){console.log('STOP: controlled execution ended; no automatic retry');results.push({check:'Controlled execution stopped',status:'BLOCKED',...safeError(error)});process.exitCode=2;}
finally{
 if(admin)try{await step('Revoke only execution Super Admin session',()=>revokeAdmin(admin));}catch{process.exitCode=2;}
 if(owner)try{await step('Close only execution owner Auth session',async()=>{const r=await owner.auth.signOut({scope:'local'});if(r.error)throw r.error;});}catch{process.exitCode=2;}
 await report();if(lock){await lock.close();await unlink(lockPath);}
}
