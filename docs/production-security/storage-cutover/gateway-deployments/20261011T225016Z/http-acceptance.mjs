// Single bounded acceptance run. No credentials loaded or Storage object writes/reservations requested.
import {writeFile,open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const url='https://mqqaykksadotbrghbexz.supabase.co/functions/v1/admin-storage-access';
const here=fileURLToPath(new URL('.',import.meta.url));
const token='deliberately-invalid-gateway-acceptance-value';
const path='__ytrace_gateway_acceptance__/unbound-parent/absent.pdf';
const body=(overrides={})=>JSON.stringify({action:'sign',bucket:'organization-documents',path,sessionToken:token,...overrides});
const tests=[
 {name:'OPTIONS preflight',method:'OPTIONS',expected:204},
 {name:'GET unsupported',method:'GET',expected:405,error:'Method not allowed.'},
 {name:'PUT unsupported',method:'PUT',expected:405,error:'Method not allowed.'},
 {name:'Malformed JSON',method:'POST',body:'{',expected:400,error:'Storage request could not be authorized or completed.'},
 {name:'Oversized JSON',method:'POST',body:JSON.stringify({padding:'x'.repeat(8192)}),expected:400,error:'Invalid storage request.'},
 {name:'Missing custom Admin session',method:'POST',body:JSON.stringify({action:'sign',bucket:'organization-documents',path}),expected:400,error:'Invalid storage request.'},
 {name:'Invalid Admin token sign',method:'POST',body:body(),expected:403,error:'Storage access denied.'},
 {name:'Unauthorized private upload',method:'POST',body:body({action:'upload'}),expected:403,error:'Operation not permitted.'},
 {name:'Unauthorized private delete',method:'POST',body:body({action:'delete'}),expected:403,error:'Operation not permitted.'},
 {name:'Unknown bucket',method:'POST',body:body({bucket:'not-a-supported-bucket'}),expected:400,error:'Invalid storage request.'},
 {name:'Traversal path',method:'POST',body:body({path:'../absent.pdf'}),expected:400,error:'Invalid storage request.'},
 {name:'Unauthenticated forged budget parent/path',method:'POST',body:body({bucket:'budget-request-files',path:'00000000-0000-0000-0000-000000000000/unbound-parent/absent.pdf'}),expected:403,error:'Storage access denied.'},
 {name:'Unauthenticated forged renewal parent/path',method:'POST',body:body({path:'00000000-0000-0000-0000-000000000000/renewals/unbound-parent/absent.pdf'}),expected:403,error:'Storage access denied.'},
];
const journal=await open(here+'http-acceptance.jsonl','wx',0o600);
const results=[];let failure=false;
try{
 for(const test of tests){
  const started=Date.now();let record;
  try{
   const response=await fetch(url,{method:test.method,redirect:'error',headers:{'Content-Type':'application/json','Origin':'http://localhost:4173'},body:test.body,signal:AbortSignal.timeout(15000)});
   const bytes=Buffer.from(await response.arrayBuffer());let parsed;try{parsed=JSON.parse(bytes.toString('utf8'));}catch{}
   const sensitive=Boolean(parsed?.signedUrl||parsed?.token||parsed?.authorization||parsed?.access_token||parsed?.refresh_token);
   const expectedMessage=(!test.error||parsed?.error===test.error);
   const safeCache=response.headers.get('cache-control')==='no-store';
   const pass=response.status===test.expected&&!sensitive&&expectedMessage&&safeCache;
   record={name:test.name,status:pass?'PASS':'FAIL',method:test.method,expectedHTTP:test.expected,actualHTTP:response.status,elapsedMs:Date.now()-started,responseBytes:bytes.length,responseSha256:createHash('sha256').update(bytes).digest('hex'),expectedErrorMatched:expectedMessage,cacheControlNoStore:safeCache,corsAllowOrigin:response.headers.get('access-control-allow-origin'),sensitiveResponseDetected:sensitive};
  }catch{record={name:test.name,status:'FAIL',method:test.method,expectedHTTP:test.expected,actualHTTP:null,elapsedMs:Date.now()-started,error:'NETWORK_OR_TIMEOUT_FAILURE'};}
  results.push(record);await journal.writeFile(JSON.stringify(record)+'\n');await journal.sync();
  console.log(JSON.stringify({name:record.name,status:record.status,http:record.actualHTTP}));
  if(record.status!=='PASS'){failure=true;break;}
 }
}finally{await journal.close();}
const result={project:'mqqaykksadotbrghbexz',gateway:'admin-storage-access',capturedAt:new Date().toISOString(),runCount:1,automaticRetries:0,requested:tests.length,executed:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,stoppedOnFirstFailure:failure,noGenuineAdminTokenUsed:true,noSignedURLReturned:true,noObjectUploadDeleteOrReservation:true,results,remaining:[{name:'Positive authorized signing and download/hash',status:'BLOCKED',reason:'No existing genuine Admin session and operator-designated existing file supplied'},{name:'Authenticated bad-parent and permission-specific denials',status:'BLOCKED',reason:'No genuine operator-designated Admin session supplied; invalid-session denials are separately recorded'}]};
await writeFile(here+'http-acceptance.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(failure)process.exitCode=2;
