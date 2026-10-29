// Actual extracted PostgreSQL routines; synthetic local tables and auth.uid fixture.
// Does not contact Supabase or establish any staging accreditation history.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const directory='docs/staging-validation/2026-10-10/renewal-review/';
const user='00000000-0000-4000-8000-000000000001',org='00000000-0000-4000-8000-000000000002',term='00000000-0000-4000-8000-000000000003';
async function database(){
  const db=new PGlite();
  await db.exec(`create schema auth; create schema extensions;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table organization_profiles(id uuid primary key,user_id uuid,profile_status text,current_accreditation_id uuid,accreditation_expires_at timestamptz);
    create table organization_accreditations(id uuid primary key,organization_id uuid,status text,term_number int,end_date date);
    create table organization_renewals(id uuid default gen_random_uuid(),organization_id uuid,cycle_number int,current_accreditation_id uuid,status text);
    create table document_submissions(id uuid default gen_random_uuid(),organization_id uuid,submitted_by uuid,status text,user_confirmed boolean,submission_scope text,renewal_id uuid);
    select set_config('request.jwt.claim.sub','${user}',false);
    insert into organization_profiles values('${org}','${user}','verified',null,null);`);
  const routines=JSON.parse(await readFile(directory+'staging-routines.json','utf8'));
  for(const name of ['calculate_organization_renewal_eligibility','user_start_or_get_renewal_draft'])await db.exec(routines.find(r=>r.name===name).definition);
  return db;
}
async function preview(db){return (await db.query('select calculate_organization_renewal_eligibility($1) as result',[org])).rows[0].result;}
const draft=db=>db.query('select user_start_or_get_renewal_draft($1) as result',[org]);
async function expiry(db,days){await db.query('update organization_profiles set accreditation_expires_at=(current_date+$1::int)::timestamptz where id=$2',[days,org]);}
async function ledger(db,days,status='active'){
  await db.query('insert into organization_accreditations values($1,$2,$3,1,current_date+$4::int)',[term,org,status,days]);
  await db.query('update organization_profiles set current_accreditation_id=$1 where id=$2',[term,org]);await expiry(db,days);
}
test('current missing-ledger/profile-expiry mismatch is reproducible in isolated PostgreSQL',async()=>{
  const db=await database();try{await expiry(db,30);assert.equal((await preview(db)).canDraft,true);
    await assert.rejects(draft(db),/No authoritative accreditation term/);assert.equal((await db.query('select count(*)::int as n from organization_renewals')).rows[0].n,0);
  }finally{await db.close();}
});
test('actual current B-shaped state without ledger or projection denies preview and creation',async()=>{
  const db=await database();try{assert.equal((await preview(db)).canDraft,false);await assert.rejects(draft(db),/No authoritative accreditation term/);}finally{await db.close();}
});
test('current revoked and suspended preview discrepancies; draft safeguards remain enforced',async()=>{
  const db=await database();try{await ledger(db,30,'revoked');assert.equal((await preview(db)).canDraft,true);await assert.rejects(draft(db),/revoked/);
    await db.exec("update organization_accreditations set status='active'; update organization_profiles set profile_status='suspended_inactive'");
    assert.equal((await preview(db)).canDraft,true);await assert.rejects(draft(db),/verified profile status/);
  }finally{await db.close();}
});
test('review-only proposal rejects projected-only history, revoked and suspended prerequisites',async()=>{
  const db=await database();try{await db.exec(await readFile(directory+'proposed-eligibility-alignment.sql','utf8'));
    await expiry(db,30);assert.equal((await preview(db)).canDraft,false);
    await ledger(db,30,'revoked');assert.equal((await preview(db)).canDraft,false);
    await db.exec("update organization_accreditations set status='active'; update organization_profiles set profile_status='suspended_inactive'");
    assert.equal((await preview(db)).canDraft,false);
  }finally{await db.close();}
});
test('review-only proposal preserves 90-day early and 180-day late boundaries with genuine local ledger',async()=>{
  const db=await database();try{await db.exec(await readFile(directory+'proposed-eligibility-alignment.sql','utf8'));await ledger(db,91);
    for(const [days,allowed]of [[91,false],[90,true],[0,true],[-180,true],[-181,false]]){
      await db.query('update organization_accreditations set end_date=current_date+$1::int',[days]);
      assert.equal((await preview(db)).canDraft,allowed,`days=${days}`);
      if(allowed){assert.ok((await draft(db)).rows[0].result.renewal.id);await db.exec('delete from document_submissions; delete from organization_renewals');}
      else await assert.rejects(draft(db),/window/);
    }
  }finally{await db.close();}
});
test('proposal is not a complete draft guarantee: terminal cycle and cross-owner guards still reject',async()=>{
  const db=await database();try{await db.exec(await readFile(directory+'proposed-eligibility-alignment.sql','utf8'));await ledger(db,30);
    await db.query("insert into organization_renewals(organization_id,cycle_number,status) values($1,2,'rejected')",[org]);
    assert.equal((await preview(db)).canDraft,true);await assert.rejects(draft(db),/was rejected/);
    await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',false)");
    await assert.rejects(draft(db),/does not own/);
  }finally{await db.close();}
});
