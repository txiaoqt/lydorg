// Read-only staging transport probe. Never logs credentials or creates an Admin session.
// Existing target RPC must still be the disabled placeholder. No environment file auto-load.
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';
const ref='zroudsvpswqsjlyttkjf',url=`https://${ref}.supabase.co`;
if(process.env.YTRACE_STAGING_PROJECT_REF!==ref||process.env.YTRACE_STAGING_SUPABASE_URL!==url)throw new Error('Exact staging configuration required');
const key=process.env.YTRACE_STAGING_ANON_KEY;
if(!key)throw new Error('YTRACE_STAGING_ANON_KEY required');
const jwt=key.split('.').length===3;
let claims={};if(jwt){try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{throw new Error('Invalid key format');}}
const result={project:ref,keyType:jwt?'legacy JWT':key.startsWith('sb_publishable_')?'publishable':'unknown',decodedRefMatches:jwt?claims.ref===ref:null,decodedRoleAnon:jwt?claims.role==='anon':null,decodedClaimsAreNotProofOfSignature:true,http:[]};
if(!jwt||claims.ref!==ref||claims.role!=='anon')throw new Error('Reviewed rollout requires the exact staging legacy anon JWT; publishable-key compatibility is not assumed');
let bearerMatches=false;
const guardedFetch=async(input,init)=>{
 const target=new URL(typeof input==='string'?input:input.url);
 if(target.origin!==url||target.pathname!=='/rest/v1/rpc/admin_get_or_create_renewal_test_account')throw new Error('Unreviewed endpoint blocked');
 const h=new Headers(init?.headers);bearerMatches=h.get('authorization')===`Bearer ${key}`;
 const r=await fetch(input,{...init,redirect:'error'});result.http.push({test:'normal SDK anonymous Admin transport to disabled RPC',status:r.status});return r;
};
const c=createClient(url,key,{global:{fetch:guardedFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const response=await c.rpc('admin_get_or_create_renewal_test_account',{p_session_token:''});
if(response.error?.code!=='P0001'||response.error?.message!=='Disabled in isolated staging until synthetic fixtures are reviewed'){
 console.log(JSON.stringify({status:response.status,code:/^[a-zA-Z0-9_-]{1,30}$/.test(response.error?.code??'')?response.error.code:null,httpRequests:result.http.length,networkFailure:response.error?.message?.includes('fetch failed')??false}));
 throw new Error('Unexpected RPC state or network failure; no further probes performed');
}
result.sdkUsesLegacyKeyAsBearerWithoutAuthSession=bearerMatches;
result.currentStagingKeyAcceptedByPostgREST=true;
// Negative signature check only: unchanged signature with altered project claim must be rejected.
const [header,payload,signature]=key.split('.');
const changed=JSON.parse(Buffer.from(payload,'base64url').toString());changed.ref='wrong-project';
const tampered=[header,Buffer.from(JSON.stringify(changed)).toString('base64url'),signature].join('.');
const denied=await fetch(`${url}/rest/v1/rpc/admin_get_or_create_renewal_test_account`,{method:'POST',redirect:'error',headers:{apikey:key,Authorization:`Bearer ${tampered}`,'content-type':'application/json'},body:JSON.stringify({p_session_token:''})});
result.http.push({test:'tampered signed project claim',status:denied.status});
if(denied.status!==401)throw new Error('Tampered JWT was not rejected as expected');
await denied.body?.cancel();
result.signatureValidationObserved=true;result.superAdminAuthorizationAfterNewSQL='NOT TESTED';
await writeFile('docs/staging-validation/2026-10-11/renewal-scenario/admin-transport-final-review.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
