// READ ONLY staging forensic inventory and two known synthetic PDF GETs.
// No Auth login, signing, mutations, cleanup, or RPCs.
import { client,loadState,ok,requireEnv,REF,hash,evidence } from './synthetic-validation-common.mjs';
import { readFile,writeFile } from 'node:fs/promises';
const base='docs/staging-validation/2026-10-11/document-mutation/';
const state=await loadState(),a=state.renewalScenario;
if(!a?.lifecycleApproved || !a.recoveryTargetFileId)throw new Error('Expected completed recorded scenario');
const c=client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const files=await ok(c.from('document_submission_files').select('*').eq('submission_id',a.renewalSubmission.id));
const target=files.find(f=>f.id===a.recoveryTargetFileId);
const original=a.files.find(f=>f.kind==='renewal'&&f.metadataId===target?.id);
const corrected=a.files.find(f=>f.kind==='renewal-corrected');
if(!target||!original||!corrected||files.length!==6)throw new Error('Expected recorded six-file relationship');
const r=await ok(c.from('organization_renewals').select('*').eq('id',a.renewal.id).single());
const s=await ok(c.from('document_submissions').select('*').eq('id',a.renewalSubmission.id).single());
const terms=await ok(c.from('organization_accreditations').select('*').eq('organization_id',a.organizationId));
const audits=await ok(c.from('activity_logs').select('id,action,related_id,created_at').eq('organization_id',a.organizationId));
const hashes=[];
for(const f of [original,corrected]){
 const blob=await ok(c.storage.from(f.bucket).download(f.path));const bytes=Buffer.from(await blob.arrayBuffer());
 const actual=hash(bytes);if(actual!==f.sha256||bytes.length!==f.size)throw new Error('Synthetic forensic hash mismatch');
 hashes.push({kind:f.kind,sha256:actual,size:bytes.length,match:true});
}
const old=JSON.parse(await readFile('docs/staging-validation/2026-10-11/renewal-scenario/approved-renewal-post-stop-verification.json','utf8'));
const profiles=await ok(c.from('organization_profiles').select('id,user_id,organization_name,profile_status'));
const preserved=state.renewalScenarioOriginalProfiles.every(p=>profiles.some(q=>p.id===q.id&&p.user_id===q.user_id&&p.organization_name===q.organization_name&&p.profile_status===q.profile_status));
const summary={checkedAt:new Date().toISOString(),projectRef:REF,method:'Privileged read-only GET of recorded synthetic files; not an authorization test',renewalStatus:r.status,cycle:r.cycle_number,submissionStatus:s.status,documentCount:files.length,targetStatus:target.admin_status,targetReferencesOriginal:target.file_url===original.storageUri,correctedReferenceInHistory:target.revision_history?.some(h=>h.previousFileUrl===corrected.storageUri),fiveOthersApproved:files.filter(f=>f.id!==target.id).every(f=>f.admin_status==='approved_green'),originalFixturesPreserved:preserved,hashes,termStates:terms.map(t=>({term_number:t.term_number,status:t.status,start_date:t.start_date,end_date:t.end_date})),priorAssessmentMatches:old.renewalStatus===r.status&&old.terminalTargetStatus===target.admin_status,http:evidence};
await writeFile(base+'fixture-readonly-verification.json',JSON.stringify(summary,null,2));
// Authoritative snapshot used to construct a separately reviewed exact-row repair.
await writeFile(base+'fixture-reconciliation-evidence.json',JSON.stringify({projectRef:REF,organizationId:a.organizationId,renewal:r,submission:s,target,original,corrected:{bucket:corrected.bucket,path:corrected.path,storageUri:corrected.storageUri,fileName:corrected.fileName,size:corrected.size,sha256:corrected.sha256},audits,terms},null,2));
console.log(JSON.stringify({projectRef:REF,renewalStatus:r.status,submissionStatus:s.status,targetStatus:target.admin_status,documentCount:files.length,syntheticHashesVerified:hashes.length,originalFixturesPreserved:preserved}));
