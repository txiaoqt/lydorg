// Real staging prerequisite/denial checks only. No fixture or ledger writes.
import { existsSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { REPORT, verifyTarget, loadState, client, signInActor, ok, setContext, evidence, record, persistReport } from './synthetic-validation-common.mjs';
verifyTarget();
if(!process.env.YTRACE_STAGING_REPORT_RUN || existsSync(resolve(REPORT,'renewal-prerequisites.json')))throw new Error('Fresh report run required');
const lockPath=resolve('.ytrace-staging-fixtures-lock.local');
const lock=await open(lockPath,'wx');const sessions=[];
async function check(label,actor,fn){
  setContext(actor,label);const cursor=evidence.length;
  try {const details=await fn();if(!details)throw new Error('Failed assertion');record(label,'PASS',{...details,http:evidence.slice(cursor)});}
  catch {record(label,'FAIL',{http:evidence.slice(cursor),reason:'Unexpected state; stop without automatic retry'});throw new Error('Stop prerequisite validation');}
}
try {
  const state=await loadState();const actors={};
  for(const label of ['A','B','S']){actors[label]=await signInActor(state.actors[label],label);sessions.push(actors[label]);}
  for(const label of ['A','B'])await check(`${label}: authoritative eligibility preview denies current fixture`,`${label} JWT`,async()=>{
    const c=actors[label],id=state.actors[label].organizationId;
    const profile=await ok(c.from('organization_profiles').select('id,profile_status,current_accreditation_id,accreditation_expires_at').eq('id',id).single());
    if(profile.profile_status!=='verified'||(label==='B'&&(profile.current_accreditation_id!==null||profile.accreditation_expires_at!==null)))return false;
    const preview=await ok(c.rpc('calculate_organization_renewal_eligibility',{_org_id:id}));
    return preview.canDraft===false&&preview.canSubmit===false?{canDraft:false,canSubmit:false,windowStatus:preview.windowStatus,
      prerequisite:label==='B'?'No ledger term or expiry projection':'Current term outside renewal window'}:false;
  });
  for(const [label,c,organizationId,message]of [
    ['B own missing-ledger draft denied',actors.B,state.actors.B.organizationId,'No authoritative accreditation term'],
    ['A own early draft denied',actors.A,state.actors.A.organizationId,'Renewal window is not yet open'],
    ['A cannot create B renewal',actors.A,state.actors.B.organizationId,'Caller does not own'],
    ['B cannot create A renewal',actors.B,state.actors.A.organizationId,'Caller does not own'],
    ['Anonymous cannot create renewal',client(),state.actors.B.organizationId,'Authentication required'],
    ['Suspended organization cannot create renewal',actors.S,state.actors.S.organizationId,'verified profile status'],
  ])await check(label,label,async()=>{
    const r=await c.rpc('user_start_or_get_renewal_draft',{p_organization_id:organizationId});
    return r.error?.code==='P0001'&&r.error.message.includes(message)?{sqlstate:r.error.code,denialReason:message}:false;
  });
}catch{record('Renewal lifecycle remains blocked; no fabricated term or eligibility bypass','BLOCKED');process.exitCode=2;}
finally{
  for(const c of sessions){const r=await c.auth.signOut({scope:'local'});record('Close only this prerequisite test Auth session',r.error?'BLOCKED':'PASS');if(r.error)process.exitCode=2;}
  await persistReport('renewal-prerequisites');await lock.close();await unlink(lockPath);
}
