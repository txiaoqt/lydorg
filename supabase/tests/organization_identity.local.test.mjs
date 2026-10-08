// Synthetic local PostgreSQL tests; never connects to Supabase.
// Setup: npm install --prefix tmp/organization-identity-db --no-audit --no-fund @electric-sql/pglite@0.5.8
// Run: node --test supabase/tests/organization_identity.local.test.mjs
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { pg_trgm } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/contrib/pg_trgm.js';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
const db = new PGlite({ extensions: { pg_trgm } });
let serial = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`;
const admin = '11111111-1111-4111-8111-111111111111';
const sql = async (q, args = []) => (await db.query(q, args)).rows;
const one = async (q, args = []) => (await sql(q, args))[0];
async function profile(name, area='Palatiw', status='pending', urn=null) {
  const id=uuid(), user=uuid();
  await sql('insert into auth.users(id) values($1)',[user]);
  await sql(`insert into organization_profiles(id,user_id,organization_name,barangay,district,profile_status,urn,urn_normalized,registration_type)
    values($1,$2,$3,$4,'District I',$5,$6,$6,$7)`,[id,user,name,area,status,urn,urn?'existing_urn':'new']);
  return {id,user};
}
async function packet(p) { return (await one('select admin_get_organization_identity_review($1,$2) as data',['valid',p.id])).data; }
async function decide(p,c,decision,version) {
  return (await one('select admin_review_organization_identity($1,$2,$3,$4,$5,$6,$7) as data',
    ['valid',p.id,c?.id??null,decision,'Official supporting record reviewed','Evidence reference 123',version??(await packet(p)).version])).data;
}
async function asApplicant(p, callback) {
  await sql("select set_config('test.uid',$1,false)",[p.user]);
  await sql('set role authenticated');
  try { return await callback(); } finally { await sql('reset role'); await sql("select set_config('test.uid','',false)"); }
}
before(async () => {
  await db.exec(`
    create schema auth; create schema extensions;
    create role anon; create role authenticated; create role service_role; create role supabase_admin;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    create table roles(id uuid primary key,code text,permission_codes text[]);
    create table admin_accounts(id uuid primary key,role_id uuid references roles(id),is_active boolean default true);
    insert into roles values('22222222-2222-4222-8222-222222222222','admin',array['registrations_management']),
      ('33333333-3333-4333-8333-333333333333','viewer',array['yorp_registry_view']);
    insert into admin_accounts(id,role_id) values('${admin}','22222222-2222-4222-8222-222222222222'),
      ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333');
    create function validate_admin_session_token(token text) returns table(admin_id uuid) language sql as $$
      select case token when 'valid' then '${admin}'::uuid when 'viewer' then '44444444-4444-4444-8444-444444444444'::uuid end
      where token in ('valid','viewer') $$;
    create function normalize_urn(value text) returns text language sql immutable as $$ select upper(trim(value)) $$;
    create table organization_profiles(id uuid primary key, user_id uuid unique references auth.users(id) on delete cascade,
      organization_name text not null,organization_identifier_number text,organization_email text,barangay text,district text,
      profile_status text default 'pending',verified_at timestamptz,urn_review_status text,verification_method text,internal_notes text,
      urn_reviewed_by uuid,urn_reviewed_at timestamptz,urn_admin_remarks text,urn text,urn_normalized text unique,registration_type text default 'new',created_at timestamptz default now());
    alter table organization_profiles enable row level security;
    create policy own_profile on organization_profiles to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    grant select,insert,update,delete on organization_profiles to authenticated;
    create table organization_accreditations(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade);
    create table organization_renewals(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade);
    create table budget_requests(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade,status text,approved_amount numeric,released_amount numeric);
    create table liquidation_reports(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade,status text);
    create table document_submissions(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade);
    create table ypop_entries(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade);
    create table ypop_event_participations(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade);
    create table ypop_org_activities(id uuid primary key default gen_random_uuid(),organization_id uuid references organization_profiles(id) on delete cascade);
    create function delete_organization_account_canonical(_session_token text,_organization_id uuid) returns jsonb language plpgsql security definer as $$
    begin
      perform 1 from organization_profiles where id=_organization_id for update;
  -- 4. Activate transaction-local bypass for immutability triggers
      delete from organization_renewals where organization_id=_organization_id;
      delete from organization_accreditations where organization_id=_organization_id;
      delete from budget_requests where organization_id=_organization_id;
      delete from liquidation_reports where organization_id=_organization_id;
      delete from organization_profiles where id=_organization_id;
      return jsonb_build_object('success',true);
    end $$;
  `);
  await db.exec(await readFile(new URL('../migrations/20261008174154_organization_identity_review.sql',import.meta.url),'utf8'));
});
after(async()=>{await db.close();});
test('SQL normalization: case, whitespace, punctuation, abbreviation and Unicode',async()=>{
  for (const name of ['Palatiw Youth Organization','PALATIW  YOUTH ORGANIZATION',' Palatiw Youth Org. ','Ｐａｌａｔｉｗ Youth Organization'])
    assert.equal((await one('select normalize_organization_identity_name($1) as name',[name])).name,'palatiw youth organization');
});
test('generic name candidate regardless of email/location; omitted URN remains pending',async()=>{
  const existing=await profile('Privacy Youth Organization','Privacy','verified','17-26-010');
  const applicant=await profile('Privacy Youth Org.','Different Barangay');
  assert.equal((await packet(applicant)).outcome,'POSSIBLE_MATCH');
  const response=(await one('select check_organization_identity($1,$2,null) as data',['PRIVACY YOUTH ORG.','Different Barangay'])).data;
  assert.deepEqual(response,{outcome:'POSSIBLE_MATCH'});
  await assert.rejects(sql("update organization_profiles set profile_status='verified' where id=$1",[applicant.id]),/identity review/);
  assert.equal((await packet(existing)).outcome,'NO_MATCH');
});
test('same barangay modest variations and similar-name false positives are only candidates',async()=>{
  await profile('Neighborhood Youth Organization','Community','verified');
  const p=await profile('Neighborhood Youth Volunteers Organization','Community');
  assert.equal((await packet(p)).outcome,'POSSIBLE_MATCH');
  const unrelated=await profile('Distinct Sea Conservation Club','Other');
  assert.equal((await packet(unrelated)).outcome,'NO_MATCH');
});
test('direct inserts cannot grant verification; metadata/GUC tricks cannot bypass',async()=>{
  const p=await profile('Direct privilege club');
  await asApplicant(p,async()=>{
    await sql("select set_config('app.urn_server_transition','on',false)");
    await assert.rejects(sql("update organization_profiles set profile_status='verified',verified_at=now() where id=$1",[p.id]),/authorized server/);
    await assert.rejects(sql("update organization_profiles set internal_notes='bypass' where id=$1",[p.id]),/authorized server/);
    await assert.rejects(sql("update organization_profiles set created_at='2000-01-01' where id=$1",[p.id]),/authorized server/);
  });
  const user=uuid(); await sql('insert into auth.users values($1)',[user]);
  await asApplicant({user},()=>assert.rejects(sql("insert into organization_profiles(id,user_id,organization_name,profile_status) values($1,$2,'Injected organization','verified')",[uuid(),user]),/authorized server/));
});
test('authenticated own-profile RLS excludes unrelated rows; private audit/helpers denied',async()=>{
  const p=await profile('RLS example club');
  await asApplicant(p,async()=>{
    assert.equal((await sql('select id from organization_profiles')).length,1);
    await assert.rejects(sql('select * from ytrace_identity.decisions'),/permission denied/);
    await assert.rejects(sql("select ytrace_identity.has_retained_history($1)",[p.id]),/permission denied/);
  });
});
test('exact URN conflict is generic; invalid/unauthorized admin cannot inspect or link',async()=>{
  const existing=await profile('Official URN Club','URN','verified','18-26-050');
  await assert.rejects(profile('Wrong URN claim with another name','Elsewhere','pending','18-26-050'),/unique constraint/);
  assert.deepEqual((await one("select check_organization_identity('Completely different claim',null,'18-26-050') as data")).data,{outcome:'EXACT_URN_CONFLICT'});
  const p=await profile('Official URN Club','URN');
  for(const token of ['forged','viewer']) await assert.rejects(sql('select admin_get_organization_identity_review($1,$2)',[token,p.id]),/authorized registration/);
  await assert.rejects(sql('select admin_review_organization_identity($1,$2,$3,$4,$5,$6,1)',['forged',p.id,existing.id,'confirmed_existing','Fake assertion no proof','fake ref']),/authorized registration/);
});
test('separate decision allows legitimate organization; audit retained and no automatic approval',async()=>{
  const existing=await profile('Shared Name Foundation','Shared','verified');
  const p=await profile('Shared Name Foundation','Elsewhere');
  const result=await decide(p,existing,'confirmed_different');
  assert.equal(result.outcome,'VERIFIED_SEPARATE'); assert.equal(result.history[0].adminId,admin);
  assert.equal((await one('select profile_status from organization_profiles where id=$1',[p.id])).profile_status,'pending');
  await sql("update organization_profiles set profile_status='verified' where id=$1",[p.id]);
  await sql("insert into budget_requests(organization_id,status) values($1,'pending_review')",[p.id]);
});
test('changed candidate/profile details invalidate separation evidence and stale decisions',async()=>{
  const existing=await profile('Fingerprint Youth Network','Original','verified');
  const p=await profile('Fingerprint Youth Network','Second');
  const cleared=await decide(p,existing,'confirmed_different');
  await assert.rejects(sql("update organization_profiles set barangay='Changed' where id=$1",[existing.id]),/identity review/);
  await sql("update organization_profiles set profile_status='pending',barangay='Changed' where id=$1",[existing.id]);
  await assert.rejects(decide(p,existing,'confirmed_different',cleared.version),/details changed/);
  assert.equal((await packet(p)).outcome,'POSSIBLE_MATCH');
  await sql("update organization_profiles set barangay='Applicant changed' where id=$1",[p.id]);
  await assert.rejects(sql("update organization_profiles set profile_status='verified' where id=$1",[p.id]),/identity review/);
});
test('confirmed existing preserves original budgets/liquidations and never transfers access',async()=>{
  const existing=await profile('Continuity Youth Group','Continuity','verified');
  await sql("insert into budget_requests(organization_id,status,approved_amount,released_amount) values($1,'released',15000,15000)",[existing.id]);
  await sql("insert into liquidation_reports(organization_id,status) values($1,'needs_revision')",[existing.id]);
  const p=await profile('Continuity Youth Group','Continuity');
  const result=await decide(p,existing,'confirmed_existing');
  assert.equal(result.canonicalOrganizationId,existing.id); assert.equal(result.outcome,'CONFIRMED_EXISTING');
  assert.equal((await packet(existing)).relatedRegistrations[0].id,p.id);
  await assert.rejects(sql('delete from organization_profiles where id=$1',[p.id]),/history is retained/);
  await assert.rejects(sql("update organization_profiles set organization_name='Clean renamed identity',profile_status='verified' where id=$1",[p.id]),/identity review/);
  await assert.rejects(sql("insert into budget_requests(organization_id,status) values($1,'pending_review')",[p.id]),/verified organization/);
  await assert.rejects(sql('update organization_profiles set user_id=$1 where id=$2',[p.user,existing.id]),/ownership recovery/);
  for(const table of ['budget_requests','liquidation_reports']) {
    assert.equal((await one(`select organization_id from ${table} where organization_id=$1`,[existing.id])).organization_id,existing.id);
    await assert.rejects(sql(`update ${table} set organization_id=$1 where organization_id=$2`,[p.id,existing.id]),/ownership cannot be reassigned/);
  }
});
test('more information/rejection remain pending across resubmission; admin may clear corrected noncandidate',async()=>{
  for(const decision of ['more_information','rejected']) {
    const p=await profile('Hold '+decision);
    const hold=await decide(p,null,decision);
    await assert.rejects(sql('delete from organization_profiles where id=$1',[p.id]),/history is retained/);
    await sql('update organization_profiles set organization_name=$1 where id=$2',[decision+' independently corrected club',p.id]);
    await assert.rejects(decide(p,null,'confirmed_different',hold.version),/details changed/);
    const cleared=await decide(p,null,'confirmed_different');
    assert.equal(cleared.outcome,'NO_MATCH'); assert.equal(cleared.history.length,2);
  }
});
test('two pending attempts retain the earlier original identity after explicit admin proof, without duplicate verification',async()=>{
  const a=await profile('Pending collision organization','Collision');
  const b=await profile('Pending collision organization','Collision');
  await assert.rejects(decide(a,b,'confirmed_existing'),/earlier original pending registration/);
  const linked=await decide(b,a,'confirmed_existing');
  assert.equal(linked.canonicalOrganizationId,a.id);
  assert.equal((await one('select profile_status from organization_profiles where id=$1',[a.id])).profile_status,'pending');
  assert.equal((await packet(a)).outcome,'NO_MATCH');
  await sql("update organization_profiles set profile_status='verified' where id=$1",[a.id]);
  await assert.rejects(sql("update organization_profiles set profile_status='verified' where id=$1",[b.id]),/identity review/);
});
test('retained-history deletion blocked before child cleanup and via Auth cascade',async()=>{
  const p=await profile('Retention protected','Protected','verified');
  await sql('insert into organization_accreditations(organization_id) values($1)',[p.id]);
  await sql('insert into organization_renewals(organization_id) values($1)',[p.id]);
  await assert.rejects(sql("select delete_organization_account_canonical('valid',$1)",[p.id]),/history is retained/);
  await assert.rejects(sql('delete from auth.users where id=$1',[p.user]),/history is retained/);
  assert.equal((await sql('select id from organization_accreditations where organization_id=$1',[p.id])).length,1);
  assert.equal((await sql('select id from organization_renewals where organization_id=$1',[p.id])).length,1);
  await assert.rejects(sql('update organization_renewals set organization_id=$1 where organization_id=$2',[uuid(),p.id]),/ownership cannot be reassigned/);
  const draft=await profile('Unestablished removable draft');
  assert.equal((await one("select delete_organization_account_canonical('valid',$1) as data",[draft.id])).data.success,true);
});
test('large candidate lists cannot be cleared by reviewing only the bounded subset',async()=>{
  for(let i=0;i<22;i++) await profile('Overflow youth organization','Area'+i);
  const p=await profile('Overflow youth organization','Last area');
  const initial=await packet(p); assert.equal(initial.candidateLimitReached,true); assert.equal(initial.candidates.length,21);
  for(const c of initial.candidates) await decide(p,c,'confirmed_different');
  assert.equal((await packet(p)).outcome,'POSSIBLE_MATCH');
  await assert.rejects(sql("update organization_profiles set profile_status='verified' where id=$1",[p.id]),/identity review/);
});
test('burst throttling fails closed, never discloses matched details',async()=>{
  await sql('delete from ytrace_identity.check_rate');
  for(let i=0;i<30;i++) assert.deepEqual((await one("select check_organization_identity('No match rate example',null,null) as data")).data,{outcome:'NO_MATCH'});
  assert.deepEqual((await one("select check_organization_identity('No match rate example',null,null) as data")).data,{outcome:'CHECK_UNAVAILABLE'});
});
test('serialized competing registration and review requests cannot clear both identities',async()=>{
  // PGlite serializes one connection: this exercises competing queued writes/stale versions,
  // not PostgreSQL multi-session visibility. See concurrency-review.md for that required gate.
  const a=await profile('Concurrent verified attempt','Race');
  const b=await profile('Concurrent verified attempt','Race');
  const attempts=await Promise.allSettled([a,b].map(p=>sql("update organization_profiles set profile_status='verified' where id=$1",[p.id])));
  assert.equal(attempts.filter(x=>x.status==='rejected').length,2);
  const version=(await packet(a)).version;
  const reviews=await Promise.allSettled([decide(a,b,'confirmed_different',version),decide(a,b,'confirmed_different',version)]);
  assert.equal(reviews.filter(x=>x.status==='fulfilled').length,1);
  assert.match(reviews.find(x=>x.status==='rejected').reason.message,/details changed/);
});
test('all official history owners stay fixed through re-registration processes',async()=>{
  const p=await profile('Renewal continuity fixture','Renewal','verified');
  const next=await profile('Different separate future fixture','Separate');
  for(const table of ['organization_accreditations','organization_renewals','document_submissions','ypop_entries','ypop_event_participations','ypop_org_activities']) {
    await sql(`insert into ${table}(organization_id) values($1)`,[p.id]);
    await assert.rejects(sql(`update ${table} set organization_id=$1 where organization_id=$2`,[next.id,p.id]),/ownership cannot be reassigned/);
    assert.equal((await sql(`select id from ${table} where organization_id=$1`,[p.id])).length,1);
  }
});
test('invalid/underprivileged custom sessions cannot invoke deletion',async()=>{
  const p=await profile('Legacy bypass attempt','Legacy');
  for(const token of ['forged','viewer']) await assert.rejects(sql('select delete_organization_account_canonical($1,$2)',[token,p.id]),/authorized registration/);
});
test('late re-registration can reference expired official identity without new accreditation',async()=>{
  const old=await profile('Expired historical organization','Expired','verified');
  await sql("update organization_profiles set profile_status='suspended_inactive',verified_at='2020-01-01' where id=$1",[old.id]);
  await sql('insert into organization_accreditations(organization_id) values($1)',[old.id]);
  const applicant=await profile('Expired historical organization','Expired');
  const reviewed=await decide(applicant,old,'confirmed_existing');
  assert.equal(reviewed.canonicalOrganizationId,old.id);
  assert.equal((await sql('select id from organization_accreditations where organization_id=$1',[old.id])).length,1);
  assert.equal((await sql('select id from organization_accreditations where organization_id=$1',[applicant.id])).length,0);
});
test('anonymous checks reveal only an outcome and cannot read profiles',async()=>{
  await sql('delete from ytrace_identity.check_rate'); await sql('set role anon');
  try {
    assert.deepEqual((await one("select check_organization_identity('Private generic example',null,null) as data")).data,{outcome:'NO_MATCH'});
    await assert.rejects(sql('select id,organization_email from organization_profiles'),/permission denied/);
  } finally {await sql('reset role');}
});
test('official URN changes require server authorization and invalidate prior candidate evidence',async()=>{
  const original=await profile('Official assigned new organization','Official','verified');
  await sql("update organization_profiles set urn='19-26-012',urn_normalized='19-26-012' where id=$1",[original.id]);
  const p=await profile('Official assigned new organization','Other');
  const reviewed=await decide(p,original,'confirmed_different');
  await asApplicant(original,()=>assert.rejects(sql("update organization_profiles set urn=null,urn_normalized=null where id=$1",[original.id]),/authorized server/));
  await sql("update organization_profiles set urn='19-26-013',urn_normalized='19-26-013' where id=$1",[original.id]);
  await assert.rejects(decide(p,original,'confirmed_different',reviewed.version),/details changed/);
  assert.equal((await packet(p)).outcome,'POSSIBLE_MATCH');
});
test('stale transaction snapshots cannot bypass serialized identity checks',async()=>{
  await sql('begin isolation level repeatable read');
  try {await assert.rejects(sql("insert into organization_profiles(id,organization_name,profile_status) values($1,'Snapshot bypass fixture','verified')",[uuid()]),/READ COMMITTED isolation/);}
  finally {await sql('rollback');}
});
