#!/usr/bin/env node
/** Staging-only, journaled synthetic fixtures. Never imports the frontend or production .env. */
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { open, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { REF, MARKER, STATE, client, requireEnv, verifyTarget, guardedFetch, URL,
  loadState, saveState, ok, attempt, record, persistReport, signInActor, adminLogin, revokeAdmin,
  syntheticPdf, hash, setContext } from './synthetic-validation-common.mjs';

verifyTarget();
const phase = process.argv.find(arg => arg.startsWith('--phase='))?.split('=')[1];
if (!['actors', 'remaining-auth', 'profiles', 'registrations', 'workflows'].includes(phase)) throw new Error('Expected explicit supported provisioning phase');
const service = client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const LOCK = resolve('.ytrace-staging-fixtures-lock.local');
let state, superLogin;
const actorDefinitions = {
  A: { email: 'ytrace-org-a@example.invalid', name: 'Aster Lantern Synthetic Youth Organization', barangay: 'Bagong Ilog' },
  B: { email: 'ytrace-org-b@example.invalid', name: 'Cobalt River Synthetic Youth Organization', barangay: 'Kapasigan' },
  S: { email: 'ytrace-org-suspended@example.invalid', name: 'Willow Summit Synthetic Youth Organization', barangay: 'San Miguel' },
};
async function allUsers() { return (await ok(service.auth.admin.listUsers({ page: 1, perPage: 1000 }))).users; }
async function insert(c, table, payload) { return ok(c.from(table).insert(payload).select('*').single()); }
async function update(c, table, id, patch) { return ok(c.from(table).update(patch).eq('id', id).select('*').single()); }
async function rpc(name, params) { return ok(superLogin.c.rpc(name, { _session_token: superLogin.token, ...params })); }

async function preflight() {
  const settings = await guardedFetch(`${URL}/auth/v1/settings`, { headers: { apikey: requireEnv('YTRACE_STAGING_ANON_KEY') } });
  if (!settings.ok) throw new Error('Expected valid staging anon key');
  const admins = await ok(service.from('admin_accounts').select('id,username,email,is_active,is_password_set,role_id'));
  const initial = admins.filter(a => a.username === 'staging-super-admin');
  if (initial.length !== 1 || !initial[0].is_active || !initial[0].is_password_set) throw new Error('Expected existing active Super Admin');
  const roles = await ok(service.from('roles').select('id,code,permission_codes'));
  if (roles.find(r => r.id === initial[0].role_id)?.code !== 'super_admin') throw new Error('Expected unchanged Super Admin role');
  const buckets = await ok(service.storage.listBuckets());
  if (buckets.length !== 10) throw new Error('Expected ten existing buckets');
  const users = await allUsers();
  if (phase === 'actors') {
    if ((existsSync(STATE) && (await stat(STATE)).size !== 0) || admins.length !== 1 || users.length !== 0) throw new Error('Expected untouched post-bootstrap baseline and no populated fixture journal');
    for (const table of ['organization_profiles', 'document_submissions', 'budget_requests', 'liquidation_reports', 'ypop_entries']) {
      const r = await service.from(table).select('id', { count: 'exact', head: true });
      if (r.error || r.count !== 0) throw new Error('Expected empty synthetic workflow baseline');
    }
  } else if (phase === 'remaining-auth') {
    state = await loadState();
    const recorded = Object.values(state.actors).filter(a => a.userId);
    if (users.length !== recorded.length || users.some(u => !recorded.some(a => a.userId === u.id && a.email === u.email && u.app_metadata?.ytrace_security_fixture === MARKER))) {
      throw new Error('Expected only existing journal-recorded fixture identities');
    }
    const profiles = await service.from('organization_profiles').select('id', { count: 'exact', head: true });
    if (profiles.error || profiles.count !== 0) throw new Error('Expected no profile writes after the identity dependency blocker');
  } else {
    state = await loadState();
    const recorded = [...Object.values(state.actors), state.reviewer];
    if (users.length !== 4 || recorded.some(a => !users.some(u => u.id === a.userId && u.email === a.email && u.app_metadata?.ytrace_security_fixture === MARKER))) {
      throw new Error('Expected exact journal-recorded synthetic Auth identities');
    }
    if (phase === 'profiles') {
      const count = await service.from('organization_profiles').select('id', { count: 'exact', head: true });
      if (state.profilesStarted || count.error || count.count !== 0) throw new Error('Expected unattempted profile continuation and zero profiles');
    } else if (state.workflowsStarted || !state.profilesFinished) {
      throw new Error('Expected successful profiles and unattempted workflow phase');
    }
    if (phase==='registrations' && state.registrationsStarted) throw new Error('Registration preparation was already attempted; no automatic retry');
    if (phase==='workflows' && !state.registrationsFinished) throw new Error('Expected valid registration parents before financial workflows');
  }
  setContext('Super Admin', 'Normal custom Admin login');
  superLogin = await adminLogin('staging-super-admin', requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'));
  if (superLogin.adminId !== initial[0].id) throw new Error('Expected existing Super Admin login identity');
  const ctx = await ok(superLogin.c.rpc('get_admin_permission_context', { _session_token: superLogin.token }));
  if (ctx[0]?.role_code !== 'super_admin') throw new Error('Expected unchanged Super Admin permissions');
  return roles;
}

async function actors() {
  state = { projectRef: REF, marker: MARKER, createdAt: new Date().toISOString(), actors: {}, files: [] };
  for (const [label, def] of Object.entries(actorDefinitions)) state.actors[label] = { ...def, password: randomBytes(36).toString('base64url') };
  await saveState(state, !existsSync(STATE));
  for (const [label, actor] of Object.entries(state.actors)) {
    const provisioned = await attempt(`Provision fictional Organization ${label} Auth identity`, 'Privileged fixture setup', async () => {
      if (!actor.email.endsWith('@example.invalid')) throw new Error('Expected reserved invalid email domain');
      const data = await ok(service.auth.admin.createUser({ email: actor.email, password: actor.password, email_confirm: true,
        app_metadata: { ytrace_security_fixture: MARKER, ytrace_fixture_actor: label } }));
      if (!data.user?.id) throw new Error('Expected newly created synthetic Auth identity');
      actor.userId = data.user.id;
      await saveState(state);
      const full = await ok(service.auth.admin.getUserById(actor.userId));
      if (full.user.id !== actor.userId || full.user.email !== actor.email || full.user.identities?.length !== 1 || full.user.identities[0].provider !== 'email') throw new Error('Expected exact synthetic email identity');
      return true;
    });
    if (!provisioned) break;
    const profile = await attempt(`Organization ${label} creates its own application profile`, `Organization ${label} JWT`, async () => {
      const c = await signInActor(actor, label);
      try {
        const row = await insert(c, 'organization_profiles', { user_id: actor.userId, organization_name: actor.name,
          organization_email: actor.email, contact_number: `0900000000${label === 'A' ? 1 : label === 'B' ? 2 : 3}`,
          barangay: actor.barangay, address_barangay: actor.barangay, address_city: 'Pasig City', address_province: 'Metro Manila',
          address_street: 'Fictional Staging Test Street', address_zip_code: '1600', major_classification: 'Youth Organization',
          sub_classification: 'Community-Based', advocacies: ['Education'], representative_first_name: `Synthetic${label}`,
          representative_last_name: 'Fixture', representative_name: `Synthetic${label} Fixture`, adviser_name: 'Fictional Adviser',
          profile_status: 'incomplete', registration_type: label === 'B' ? 'existing_urn' : 'new_organization',
          is_existing_organization: label === 'B', ...(label === 'B' ? { urn: '08-23-901', organization_identifier_number: '08-23-901' } : {}),
          directory_visibility: false });
        actor.organizationId = row.id; await saveState(state); return row;
      } finally { await c.auth.signOut({ scope: 'global' }); }
    });
    if (!profile) break;
  }
}

async function remainingAuth() {
  for (const [label, actor] of Object.entries(state.actors)) {
    if (actor.userId) continue;
    const created = await attempt(`Provision fictional Organization ${label} Auth identity only`, 'Privileged fixture setup', async () => {
      if (!actor.email.endsWith('@example.invalid')) throw new Error('Expected invalid-domain identity');
      const data = await ok(service.auth.admin.createUser({ email: actor.email, password: actor.password, email_confirm: true,
        app_metadata: { ytrace_security_fixture: MARKER, ytrace_fixture_actor: label } }));
      actor.userId = data.user.id; await saveState(state);
      const detail = await ok(service.auth.admin.getUserById(actor.userId));
      if (detail.user.email !== actor.email || detail.user.identities?.length !== 1 || detail.user.identities[0].provider !== 'email') throw new Error('Expected exact synthetic email identity');
      const c = await signInActor(actor, label); await c.auth.signOut({ scope: 'global' }); return true;
    });
    if (!created) break;
  }
  state.workflowBlocker = 'Missing staging ytrace_identity schema and assess helper; profile insert SQLSTATE 3F000';
  await saveState(state);
  for (const label of Object.keys(state.actors)) record(`Organization ${label} profile and dependent workflows`, 'BLOCKED', { reason: state.workflowBlocker });
}

async function upload(actor, c, kind, bucket, prefix, table, metadata) {
  const fileName = `SYNTHETIC-${kind}-${actor.label}.pdf`;
  const path = `${prefix}/${fileName}`;
  const bytes = syntheticPdf(`${actor.label} ${kind}`);
  await ok(c.storage.from(bucket).upload(path, bytes, { contentType: 'application/pdf', upsert: false }));
  const ref = { actor: actor.label, kind, bucket, path, fileName, sha256: hash(bytes), size: bytes.length, storageUri: `storage://${bucket}/${path}` };
  // Persist successful bytes before metadata insertion so interrupted initialization
  // never repeats the transfer or silently removes an uploaded fixture.
  state.files.push(ref); await saveState(state);
  const row = await insert(c, table, { ...metadata, file_name: fileName, file_url: ref.storageUri,
    file_type: 'application/pdf', file_size: bytes.length, uploaded_at: new Date().toISOString() });
  ref.metadataId = row.id; await saveState(state); return ref;
}

async function requiredStep(check, actor, fn) {
  const value = await attempt(check, actor, fn);
  if (value == null) throw new Error('Expected workflow step success; dependent phase stopped');
  return value;
}

async function profiles() {
  state.profilesStarted = true; await saveState(state);
  for (const label of ['A','B','S']) {
    const actor = state.actors[label]; actor.label = label;
    await requiredStep(`${label}: owner-authenticated profile initialization after exact schema parity`, `${label} JWT`, async () => {
      const c = await signInActor(actor,label);
      try {
        const row = await insert(c,'organization_profiles', { user_id: actor.userId, organization_name: actor.name,
          organization_email: actor.email, contact_number: `0900000000${label==='A'?1:label==='B'?2:3}`,
          barangay: actor.barangay,address_barangay: actor.barangay,address_city:'Pasig City',address_province:'Metro Manila',
          address_street:'Fictional Staging Test Street',address_zip_code:'1600',major_classification:'Youth Organization',
          sub_classification:'Community-Based',advocacies:['Education'],representative_first_name:`Synthetic${label}`,
          representative_last_name:'Fixture',representative_name:`Synthetic${label} Fixture`,adviser_name:'Fictional Adviser',
          profile_status:'incomplete',registration_type:label==='B'?'existing_urn':'new_organization',is_existing_organization:label==='B',
          ...(label==='B'?{urn:'08-23-901',organization_identifier_number:'08-23-901'}:{}),directory_visibility:false });
        if (row.user_id!==actor.userId || row.organization_name!==actor.name) throw new Error('Expected exact profile ownership');
        actor.organizationId=row.id; await saveState(state);
        const owned=await ok(c.from('organization_profiles').select('id,user_id').eq('user_id',actor.userId));
        if (owned.length!==1 || owned[0].id!==row.id) throw new Error('Expected exactly one owner profile');
        const identity=await rpc('admin_get_organization_identity_review',{_organization_id:row.id});
        if(identity.outcome!=='NO_MATCH' || identity.version<1 || identity.candidates.length!==0) throw new Error('Expected valid unambiguous synthetic identity metadata');
        actor.identityOutcome=identity.outcome; await saveState(state);
        return true;
      } finally { await c.auth.signOut({scope:'local'}); }
    });
  }
  // Verify explicit cross-profile access through actual owner JWTs before any verification.
  for (const [own,other] of [['A','B'],['B','A']]) await requiredStep(`${own}: cannot read ${other} private profile`,`${own} JWT`,async()=>{
    const c=await signInActor(state.actors[own],own);
    try {
      const rows=await ok(c.from('organization_profiles').select('id,user_id,organization_email').eq('id',state.actors[other].organizationId));
      if(rows.length!==0) throw new Error('Expected no cross-organization private profile'); return true;
    } finally { await c.auth.signOut({scope:'local'}); }
  });
  await requiredStep('S: supported Admin suspension workflow','Super Admin',async()=>{
    const actor=state.actors.S;
    const rows=await rpc('update_admin_organization_profile_review',{_organization_profile_id:actor.organizationId,_profile_status:'suspended_inactive',_verified_at:null});
    if(rows.length!==1 || rows[0].profile_status!=='suspended_inactive') throw new Error('Expected supported suspension state');
    actor.suspended=true; await saveState(state); return true;
  });
  state.profilesFinished=true; state.workflowBlocker=null; await saveState(state);
}

async function registrations() {
  state.registrationsStarted=true; await saveState(state);
  const required=await ok(service.from('required_document_types').select('id,name,scope').eq('is_active',true).eq('is_required',true).eq('template_scope','document_submission'));
  for(const label of ['A','B']) {
    const actor=state.actors[label]; actor.label=label;
    const c=await signInActor(actor,label);
    try {
      await requiredStep(`${label}: normal registration parent and owned PDF uploads`,`${label} JWT`,async()=>{
        actor.registration=await insert(c,'document_submissions',{organization_id:actor.organizationId,submitted_by:actor.userId,status:'draft',user_confirmed:false});
        await saveState(state);
        for(const type of label==='A'?required:required.slice(0,1)) await upload(actor,c,'registration-'+type.id.slice(0,8),'organization-documents',`${actor.organizationId}/${type.id}`,
          'document_submission_files',{submission_id:actor.registration.id,document_type_id:type.id,validation_status:'correct',admin_status:'draft'});
        await ok(c.from('document_submission_files').update({admin_status:'under_admin_review'}).eq('submission_id',actor.registration.id).eq('admin_status','draft').select('id'));
        await update(c,'document_submissions',actor.registration.id,{status:'under_admin_review',user_confirmed:true,submitted_at:new Date().toISOString()});
        return true;
      });
      await requiredStep(`${label}: normal authorized registration review`,'Super Admin',async()=>{
        if(label==='A') for(const file of state.files.filter(f=>f.actor===label&&f.kind.startsWith('registration-'))) {
          await rpc('update_admin_document_submission_file_review',{_file_id:file.metadataId,_status:'approved_green',_admin_remarks:'SYNTHETIC staging approval only'});
        } else await rpc('review_organization_urn',{_organization_id:actor.organizationId,_expected_urn:'08-23-901',_decision:'verified',_remarks:'SYNTHETIC existing-URN review only'});
        const profile=await ok(c.from('organization_profiles').select('profile_status').eq('id',actor.organizationId).single());
        if(profile.profile_status!=='verified') throw new Error('Expected normal verification outcome');
        actor.verified=true; await saveState(state); return true;
      });
    } finally { await c.auth.signOut({scope:'local'}); }
  }
  state.registrationsFinished=true; await saveState(state);
}

async function workflows() {
  state.workflowsStarted=true; await saveState(state);
  const period=await requiredStep('Create synthetic open YPOP period through normal Admin RPC','Super Admin',async()=>{
    const rows=await rpc('admin_create_ypop_period',{_semester_key:'STAGING-SECURITY-2026',_semester_label:'SYNTHETIC Storage Security 2026',
      _validation_deadline:new Date(Date.now()+60*86400000).toISOString(),_status:'open',_org_led_tiers:[]});
    state.period=rows[0]; await saveState(state); return rows[0];
  });
  for(const label of ['A','B']) {
    const actor=state.actors[label];const c=await signInActor(actor,label);
    try {
      await requiredStep(`${label}: normal YPOP creation, proof upload, submission and review`,`${label} JWT / Super Admin`,async()=>{
        actor.ypop=await insert(c,'ypop_entries',{organization_id:actor.organizationId,submitted_by:actor.userId,semester:period.semester_key,
          semester_label:period.semester_label,status:'draft',submission_note:'SYNTHETIC staging only'}); await saveState(state);
        await upload(actor,c,'ypop','ypop-files',actor.ypop.id,'ypop_files',{ypop_entry_id:actor.ypop.id,organization_id:actor.organizationId});
        await update(c,'ypop_entries',actor.ypop.id,{status:'submitted',submitted_at:new Date().toISOString()});
        await rpc('admin_update_ypop_entry',{_entry_id:actor.ypop.id,_status:'qualified',_points_earned:80,_admin_remarks:'SYNTHETIC qualification only'});
        return true;
      });
      await requiredStep(`${label}: normal budget creation, attachment, submission and Admin release`,`${label} JWT / Super Admin`,async()=>{
        actor.budget=await insert(c,'budget_requests',{organization_id:actor.organizationId,submitted_by:actor.userId,
          activity_title:`SYNTHETIC ${label} Storage Security Workshop`,activity_description:'Fictional test activity; no real expenditure.',
          activity_date:new Date().toISOString().slice(0,10),venue:'Fictional Staging Hall',purpose_category:'Education',
          requested_amount:100,approved_amount:0,released_amount:0,status:'draft',ypop_entry_id:actor.ypop.id}); await saveState(state);
        await upload(actor,c,'budget','budget-request-files',actor.budget.id,'budget_request_files',{budget_request_id:actor.budget.id});
        await update(c,'budget_requests',actor.budget.id,{status:'submitted'});
        await rpc('update_admin_budget_request',{_budget_request_id:actor.budget.id,_status:'awaiting_release',_approved_amount:100});
        await rpc('update_admin_budget_request',{_budget_request_id:actor.budget.id,_status:'budget_released',_released_amount:100,
          _release_date:new Date().toISOString().slice(0,10),_go_signal_at:new Date().toISOString()});return true;
      });
      await requiredStep(`${label}: linked liquidation and owned attachment`,`${label} JWT`,async()=>{
        actor.liquidation=await ok(c.from('liquidation_reports').select('*').eq('budget_request_id',actor.budget.id).eq('organization_id',actor.organizationId).single());await saveState(state);
        await upload(actor,c,'liquidation','liquidation-report-files',actor.liquidation.id,'liquidation_report_files',{liquidation_report_id:actor.liquidation.id});
        await update(c,'liquidation_reports',actor.liquidation.id,{status:'submitted'});return true;
      });
    } finally { await c.auth.signOut({scope:'local'}); }
  }
  // Renewal initialization must use its existing authoritative term/window.
  // Do not insert or backdate accreditation as a workaround for a missing term.
  const b=state.actors.B;const c=await signInActor(b,'B');
  try {
    await requiredStep('B: supported renewal initialization','B JWT',async()=>{
      b.renewal=await ok(c.rpc('user_start_or_get_renewal_draft',{p_organization_id:b.organizationId}));await saveState(state);return true;
    });
  } finally { await c.auth.signOut({scope:'local'}); }
  state.workflowsFinished=true;await saveState(state);
}


let lock;
try {
  lock = await open(LOCK, 'wx', 0o600);
  await lock.writeFile(JSON.stringify({ pid: process.pid, phase, projectRef: REF }));
  await preflight();
  if (phase === 'actors') await actors(); else if (phase === 'remaining-auth') await remainingAuth(); else if (phase === 'profiles') await profiles(); else if (phase === 'registrations') await registrations(); else await workflows();
} catch (error) {
  record('Provisioning stopped without bypass or automatic retry', 'BLOCKED', { reason: (await import('./synthetic-validation-common.mjs')).safeError(error).reason });
  process.exitCode = 2;
} finally {
  if (superLogin) {
    const revoked = await attempt('Revoke fixture-setup Admin session', 'Super Admin', async () => { await revokeAdmin(superLogin); return true; });
    if (!revoked) process.exitCode = 2;
  }
  await persistReport(`provision-${phase}`);
  if (lock) { await lock.close(); await unlink(LOCK); }
}
if ((await import('./synthetic-validation-common.mjs')).results.some(r => r.status !== 'PASS')) process.exitCode = 2;
