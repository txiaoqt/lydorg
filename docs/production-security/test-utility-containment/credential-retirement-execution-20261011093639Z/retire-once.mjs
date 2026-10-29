import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {createClient} from '@supabase/supabase-js';

const origin='https://mqqaykksadotbrghbexz.supabase.co';
const expectedRecordHash='5f7f4312c0d27b40d21d8e2470789478c19a0273335c65ae59580a6628bfa98a';
const expectedEmailHash='2a638b1afcba5b0a0fd80da162a4546031e9d23beb8ad250f9810b1813294bf4';
const directory=dirname(fileURLToPath(import.meta.url));
const root=resolve(directory,'../../../..');
const resultPath=join(directory,'auth-operation-result.json');
const attemptPath=join(directory,'attempt.json');
const http=[];
let putDispatched=false;
let putCount=0;
let newPassword;
let result={projectRef:'mqqaykksadotbrghbexz',targetSuffix:'941f85',status:'NOT_DISPATCHED',authMutationRequests:0,http,credentialsRecorded:false};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const preservedFields=user=>({id:user.id,email:user.email,phone:user.phone,role:user.role,app_metadata:user.app_metadata,user_metadata:user.user_metadata,identities:user.identities,email_confirmed_at:user.email_confirmed_at,phone_confirmed_at:user.phone_confirmed_at,created_at:user.created_at,last_sign_in_at:user.last_sign_in_at,is_sso_user:user.is_sso_user,is_anonymous:user.is_anonymous});
const checkUser=(user,target,expectedFingerprint)=>{
 if(!user||user.id!==target.auth_user_id||!user.id.endsWith('941f85'))throw new Error('AUTH_USER_MISMATCH');
 if(createHash('sha256').update(user.email?.toLowerCase()||'').digest('hex')!==expectedEmailHash)throw new Error('AUTH_EMAIL_MISMATCH');
 if(user.role!=='authenticated'||!user.email_confirmed_at||user.deleted_at||user.is_super_admin===true||user.is_sso_user===true)throw new Error('AUTH_IDENTITY_DRIFT');
 if(user.identities?.length!==1||user.identities[0].provider!=='email'||user.identities[0].user_id!==user.id||user.identities[0].identity_data?.email?.toLowerCase()!==user.email.toLowerCase())throw new Error('PROVIDER_IDENTITY_DRIFT');
 if(digest(preservedFields(user))!==expectedFingerprint)throw new Error('PRESERVED_AUTH_FIELDS_DRIFT');
};
const safeReason=error=>{
 const allowed=new Set(['PROJECT_GUARD','RECORD_HASH_MISMATCH','TARGET_RECORD_MISMATCH','EXPIRED_PREFLIGHT','PREFLIGHT_GATE_FAILED','CREDENTIAL_UNAVAILABLE','CREDENTIAL_BINDING_MISMATCH','NETWORK_GUARD_BLOCKED','WRITE_ALREADY_ATTEMPTED','UNAUTHORIZED_PAYLOAD','AUTH_VERSION_DRIFT','AUTH_ADMIN_READ_DENIED','AUTH_USER_MISMATCH','AUTH_EMAIL_MISMATCH','AUTH_IDENTITY_DRIFT','PROVIDER_IDENTITY_DRIFT','PRESERVED_AUTH_FIELDS_DRIFT','UNEXPECTED_EXISTING_BAN','AUTH_UPDATE_RETURNED_ERROR','POST_UPDATE_READ_DENIED','BAN_VERIFICATION_FAILED','HTTP_UPDATE_NOT_CONFIRMED']);
 return allowed.has(error?.message)?error.message:'SANITIZED_AUTH_OPERATION_ERROR';
};
try{
 const gate=JSON.parse(await readFile(join(directory,'execution-gate.json'),'utf8'));
 if(gate.status!=='PASS'||gate.projectRef!=='mqqaykksadotbrghbexz'||gate.requiredAuthVersion!=='v2.197.0'||gate.banDuration!=='876000h'||gate.maxAuthMutationRequests!==1)throw new Error('PREFLIGHT_GATE_FAILED');
 const prepared=Date.parse(gate.preparedAt.replace(' UTC','Z').replace(' ','T'));
 if(!Number.isFinite(prepared)||Date.now()-prepared>5*60_000||Date.now()<prepared-5_000)throw new Error('EXPIRED_PREFLIGHT');
 const recordBytes=await readFile(join(root,'docs/production-security/test-utility-containment/affected-account-readonly.json'));
 if(createHash('sha256').update(recordBytes).digest('hex')!==expectedRecordHash||gate.recordSha256!==expectedRecordHash)throw new Error('RECORD_HASH_MISMATCH');
 const record=JSON.parse(recordBytes.toString('utf8'));
 if(record.projectRef!=='mqqaykksadotbrghbexz'||record.targets?.length!==1)throw new Error('TARGET_RECORD_MISMATCH');
 const target=record.targets[0];
 if(!target.auth_user_id.endsWith('941f85'))throw new Error('TARGET_RECORD_MISMATCH');
 const env=parseEnv(await readFile(join(root,'.env'),'utf8'));
 if((env.SUPABASE_URL||env.VITE_SUPABASE_URL)?.replace(/\/$/,'')!==origin)throw new Error('PROJECT_GUARD');
 const key=env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)throw new Error('CREDENTIAL_UNAVAILABLE');
 if(!key.startsWith('sb_secret_')){
  const claims=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString('utf8'));
  if(claims.role!=='service_role'||claims.ref!=='mqqaykksadotbrghbexz'||claims.exp<=Date.now()/1000)throw new Error('CREDENTIAL_BINDING_MISMATCH');
 }
 const accountPath='/auth/v1/admin/users/'+target.auth_user_id;
 const guardedFetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  const method=(init.method||'GET').toUpperCase();
  if(url.origin!==origin||url.search||url.hash||!['GET','PUT'].includes(method)||![accountPath,'/auth/v1/health'].includes(url.pathname)||method==='PUT'&&url.pathname!==accountPath)throw new Error('NETWORK_GUARD_BLOCKED');
  if(method==='PUT'){
   if(putCount!==0)throw new Error('WRITE_ALREADY_ATTEMPTED');
   const payload=JSON.parse(init.body);
   if(Object.keys(payload).sort().join(',')!=='ban_duration,password'||payload.ban_duration!=='876000h'||typeof payload.password!=='string'||payload.password.length!==64||payload.password!==newPassword)throw new Error('UNAUTHORIZED_PAYLOAD');
   await writeFile(attemptPath,JSON.stringify({projectRef:'mqqaykksadotbrghbexz',targetSuffix:'941f85',dispatchedAt:new Date().toISOString(),authorizedFields:['password','ban_duration'],banDuration:'876000h',automaticRetryAllowed:false})+'\n',{flag:'wx'});
   putCount=1;
   putDispatched=true;
   result={...result,status:'DISPATCHED_OUTCOME_PENDING',authMutationRequests:1,dispatchedAt:new Date().toISOString()};
  }
  const response=await fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(30000)});
  const requestId=response.headers.get('x-request-id');
  http.push({resource:url.pathname===accountPath?'exact-recorded-auth-user':'auth-health',method,status:response.status,requestId:requestId&&/^[A-Za-z0-9_-]{1,120}$/.test(requestId)?requestId:null,time:new Date().toISOString()});
  return response;
 };
 const client=createClient(origin,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:guardedFetch}});
 const healthResponse=await guardedFetch(origin+'/auth/v1/health',{headers:{apikey:key,Authorization:'Bearer '+key}});
 const health=await healthResponse.json();
 if(healthResponse.status!==200||health.version!=='v2.197.0')throw new Error('AUTH_VERSION_DRIFT');
 const before=await client.auth.admin.getUserById(target.auth_user_id);
 if(before.error)throw new Error('AUTH_ADMIN_READ_DENIED');
 checkUser(before.data.user,target,gate.preservationFingerprint);
 if(before.data.user.banned_until&&Date.parse(before.data.user.banned_until)>Date.now())throw new Error('UNEXPECTED_EXISTING_BAN');
 newPassword='Aa1!'+randomBytes(45).toString('base64url');
 const update=await client.auth.admin.updateUserById(target.auth_user_id,{password:newPassword,ban_duration:'876000h'});
 newPassword=undefined;
 if(update.error)throw new Error('AUTH_UPDATE_RETURNED_ERROR');
 if(!http.some(entry=>entry.method==='PUT'&&entry.status===200))throw new Error('HTTP_UPDATE_NOT_CONFIRMED');
 checkUser(update.data.user,target,gate.preservationFingerprint);
 const after=await client.auth.admin.getUserById(target.auth_user_id);
 if(after.error)throw new Error('POST_UPDATE_READ_DENIED');
 checkUser(after.data.user,target,gate.preservationFingerprint);
 const banUntil=Date.parse(after.data.user.banned_until||'');
 const dispatched=Date.parse(result.dispatchedAt);
 const expected=dispatched+876000*60*60_000;
 if(!Number.isFinite(banUntil)||banUntil<=Date.now()||Math.abs(banUntil-expected)>5*60_000)throw new Error('BAN_VERIFICATION_FAILED');
 result={...result,status:'AUTH_API_UPDATE_CONFIRMED',completedAt:new Date().toISOString(),authVersion:health.version,targetReturnedExactly:true,banActive:true,bannedUntil:after.data.user.banned_until,preservationFingerprint:digest(preservedFields(after.data.user)),preservedAuthFieldsUnchanged:true,updatedAt:after.data.user.updated_at,noLoginPerformed:true,noEmailFlowInvoked:true,independentSqlVerification:'PENDING'};
 await writeFile(resultPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result));
}catch(error){
 newPassword=undefined;
 result={...result,status:putDispatched?'STOP_AFTER_DISPATCH_RECONCILE_READ_ONLY':'STOP_BEFORE_DISPATCH',reason:safeReason(error),authMutationRequests:putCount,stoppedAt:new Date().toISOString(),automaticRetryAllowed:false};
 try{await writeFile(resultPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});}catch{}
 console.log(JSON.stringify(result));
 process.exitCode=1;
}

