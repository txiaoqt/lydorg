// Pure pre-write plan: saved identifiers, authoritative state, one replacement.
export function planRecovery(a,renewals,submissions,files){
 const fail=()=>{throw new Error('Unexpected recovery state; no mutation permitted');};
 if(!a?.renewal?.id||!a?.renewalSubmission?.id||a.recoveryStartedAt||a.lifecycleApproved)fail();
 if(renewals.length!==1||submissions.length!==1||files.length!==6)fail();
 const r=renewals[0],s=submissions[0];
 if(r.id!==a.renewal.id||r.organization_id!==a.organizationId||r.cycle_number!==2||r.status!=='needs_revision'||r.current_accreditation_id!==a.initialTermId)fail();
 if(s.id!==a.renewalSubmission.id||s.organization_id!==a.organizationId||s.renewal_id!==r.id||s.status!=='needs_revision'||s.submission_scope!=='renewal')fail();
 const refs=a.files.filter(f=>f.kind==='renewal');
 if(refs.length!==6||new Set(refs.map(f=>f.metadataId)).size!==6)fail();
 for(const f of files)if(f.submission_id!==s.id||!refs.some(ref=>ref.metadataId===f.id&&ref.storageUri===f.file_url)||!['needs_revision','under_admin_review'].includes(f.admin_status))fail();
 const flagged=files.filter(f=>f.admin_status==='needs_revision');if(flagged.length!==1)fail();
 return {renewalId:r.id,submissionId:s.id,target:flagged[0],original:refs.find(f=>f.metadataId===flagged[0].id),preserved:files.filter(f=>f.id!==flagged[0].id),uploadCount:1,createRenewal:false,requestRevision:false};
}
