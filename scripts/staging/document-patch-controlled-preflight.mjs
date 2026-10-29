// One authorized run: read-only checks and a held same-machine fixture lock.
import {open,readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {client,loadState,requireEnv,REF,hash,ok,evidence,safeError} from './synthetic-validation-common.mjs';
const dir='docs/staging-validation/2026-10-11/document-mutation/execution-20261011-02';
const lockPath='.ytrace-staging-fixtures-lock.local';
let lock;
try {
 if(!process.stdin.isTTY)throw new Error('Expected interactive terminal for fixture lock holder');
 await mkdir(dir,{recursive:true});
 lock=await open(lockPath,'wx',0o600);
 await lock.writeFile(JSON.stringify({pid:process.pid,projectRef:REF,phase:'authorized-document-security-patch'}));
 const state=await loadState(),a=state.renewalScenario;
 const c=client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
 const previous=JSON.parse(await readFile('docs/staging-validation/2026-10-11/document-mutation/fixture-reconciliation-evidence.json','utf8'));
 const rows=await ok(c.from('document_submission_files').select('*').eq('submission_id',a.renewalSubmission.id));
 const target=rows.find(f=>f.id===a.recoveryTargetFileId);
 const canonical=x=>JSON.stringify(x, Object.keys(x).sort());
 if(!target||canonical(target)!==canonical(previous.target)||rows.length!==6)throw new Error('Expected exact reviewed target');
 const renewal=await ok(c.from('organization_renewals').select('*').eq('id',a.renewal.id).single());
 const submission=await ok(c.from('document_submissions').select('*').eq('id',a.renewalSubmission.id).single());
 const terms=await ok(c.from('organization_accreditations').select('*').eq('organization_id',a.organizationId));
 if(renewal.status!=='approved'||submission.status!=='approved_green'||terms.length!==2||rows.filter(f=>f.id!==target.id).some(f=>f.admin_status!=='approved_green'))throw new Error('Expected approved state');
 const u=await ok(c.auth.admin.getUserById(a.userId));
 if(u.user.id!==a.userId||u.user.email!=='ytrace-renewal-synthetic@example.invalid'||u.user.app_metadata.ytrace_renewal_fixture!==REF+'-v1'||u.user.identities?.length!==1)throw new Error('Expected recorded fixture identity');
 const profiles=await ok(c.from('organization_profiles').select('id,user_id,organization_name,profile_status'));
 if(!state.renewalScenarioOriginalProfiles.every(p=>profiles.some(q=>canonical(p)===canonical(q))))throw new Error('Expected preserved actors');
 const hashes=[];
 for(const f of [previous.original,previous.corrected]) {
  const blob=await ok(c.storage.from(f.bucket).download(f.path));const b=Buffer.from(await blob.arrayBuffer());
  if(hash(b)!==f.sha256||b.length!==f.size)throw new Error('Expected synthetic file hash');
  hashes.push({sha256:hash(b),size:b.length});
 }
 const patch=await readFile('supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql','utf8');
 const repair=await readFile('docs/staging-validation/2026-10-11/document-mutation/proposed-staging-reconciliation.sql','utf8');
 if(hash(patch)!=='b19e93c19454a9012e85eb9dce81ba152b4f93d0eaa0fa475f78ab8d30a4d7a0'||hash(repair)!=='4fc55025d07210611056c39527a6a71860edac71be35c8e2c895b0c084f57d03')throw new Error('Expected reviewed SQL hashes');
 const combined=patch.replace('CREATE SCHEMA ytrace_document_mutation;',repair+'\nCREATE SCHEMA ytrace_document_mutation;');
 await writeFile(dir+'/combined-reviewed.sql',combined,{flag:'wx'});
 await writeFile(dir+'/preflight.json',JSON.stringify({projectRef:REF,status:'PASS',at:new Date().toISOString(),combinedSha256:hash(combined),hashes,rows,renewal,submission,terms,profiles,http:evidence},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'PASS',lockHeld:true,pid:process.pid,combinedSha256:hash(combined),syntheticHashes:hashes}));
 console.log('Waiting for RELEASE; no additional network operations in lock holder.');
 process.stdin.setEncoding('utf8');
 await new Promise((resolve,reject)=>{
  const keepAlive=setInterval(()=>{},1000);
  const finish=error=>{clearInterval(keepAlive);error?reject(error):resolve();};
  process.stdin.resume();
  process.stdin.on('data',data=>{if(data.trim()==='RELEASE')finish();});
  process.stdin.once('end',()=>finish(new Error('Expected interactive terminal remained open')));
  process.stdin.once('error',()=>finish(new Error('Expected healthy fixture lock terminal')));
 });
}catch(e){console.log(JSON.stringify({status:'FAIL',...safeError(e)}));process.exitCode=1;}
finally{if(lock){await lock.close();const own=JSON.parse(await readFile(lockPath,'utf8'));if(own.pid!==process.pid||own.projectRef!==REF||own.phase!=='authorized-document-security-patch')throw new Error('Lock ownership changed; refusing removal');await unlink(lockPath);console.log('Fixture lock released.');}}
