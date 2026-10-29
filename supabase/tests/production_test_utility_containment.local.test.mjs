// Actual PGlite/PostgreSQL SQL, roles, triggers and transactions; no network or env files.
// Only the expected catalog literal is substituted for the synthetic local catalog.
// All proposed replacement SQL, grants, transaction gates and postconditions run unchanged.
// This is not Supabase Auth/HTTP, production authorization, or multi-session certification.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const dir='docs/production-security/test-utility-containment';
const baseline=JSON.parse(await readFile(`${dir}/original-catalog.json`,'utf8'));
const dependencies=JSON.parse(await readFile(`${dir}/normal-workflow-dependencies.json`,'utf8'));
const enums=JSON.parse(await readFile(`${dir}/original-enums.json`,'utf8'));
const metadata=JSON.parse(await readFile(`${dir}/candidate-metadata.json`,'utf8'));
const catalog=JSON.parse(await readFile('docs/staging-validation/2026-10-11/document-mutation/staging-catalog.json','utf8'));
const candidate=await readFile(`${dir}/production_test_utility_containment.sql`,'utf8');
const manifestSql=await readFile(`${dir}/catalog-manifest.sql`,'utf8');
const uuid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const org=uuid(1),owner=uuid(2),other=uuid(3),term=uuid(4),docType=uuid(5),superAdmin=uuid(6),ordinaryAdmin=uuid(7);
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const functionSql=name=>baseline.functions.find(f=>f.name===name).definition;

async function fixture(){
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create role authenticator noinherit;
 create schema auth;create schema storage;create schema extensions;create schema ytrace_identity;create schema supabase_migrations;
 create domain public.citext as text;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 -- Narrow local replacement for pgcrypto digest: same SHA-256 bytes, reject other algorithms.
 create function extensions.digest(input text,algorithm text) returns bytea language plpgsql immutable strict as $$begin if algorithm<>'sha256' then raise exception 'Unsupported local digest';end if;return sha256(convert_to(input,'UTF8'));end$$;
 create function current_user_is_admin() returns boolean language sql stable as $$select false$$;
 create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
 create table ytrace_identity.cases(id uuid,organization_id uuid,canonical_organization_id uuid,outcome text);
 create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
 create table admin_system_settings(setting_key text primary key,value_json jsonb);
 insert into admin_system_settings values('general.environment','"development"');`);
 for(const {name,labels} of enums){
  const values=Array.isArray(labels)?labels:labels.slice(1,-1).split(',');
  assert.ok(values.every(label=>/^[a-z_]+$/.test(label)));
  await db.exec(`create type public.${name} as enum(${values.map(q).join(',')})`);
 }
 for(const table of ['organization_profiles','organization_accreditations','admin_accounts','admin_sessions','roles']){
  const columns=baseline.metadata.columns.filter(c=>c.table===table).map(c=>`"${c.column}" ${c.udt==='_text'?'text[]':c.udt}${c.default?' default '+c.default:''}${c.column==='id'?' primary key':''}`);
  await db.exec(`create table public.${table}(${columns.join(',')})`);
 }
 for(const table of ['organization_renewals','document_submissions','document_submission_files']){
  const columns=catalog.columns.filter(c=>c.table===table).map(c=>`"${c.name}" ${c.type}${c.name==='id'?' primary key default gen_random_uuid()':''}`);
  await db.exec(`create table ${table}(${columns.join(',')})`);
 }
 for(const table of ['required_document_types','yorp_sample_document_assets']){
  const columns=baseline.otherColumns.filter(c=>c.table_name===table).map(c=>`"${c.column_name}" ${c.udt_name==='_text'?'text[]':c.udt_name}${c.column_default?' default '+c.column_default:''}${c.column_name==='id'?' primary key':''}`);
  await db.exec(`create table ${table}(${columns.join(',')})`);
 }
 await db.exec(`create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb,created_at timestamptz default now());
 create table activity_logs(actor_user_id uuid,organization_id uuid,action text,related_type text,related_id uuid,description text,metadata jsonb,created_at timestamptz default now());
 create table notifications(user_id uuid,organization_id uuid,title text,message text,type text,related_type text,related_id uuid,created_at timestamptz);
 create table budget_requests(id uuid,organization_id uuid,status text,is_seeded_sample_data boolean,seed_batch text);
 create table liquidation_reports(id uuid,organization_id uuid,status text,is_seeded_sample_data boolean,seed_batch text);
 create table budget_request_files(budget_request_id uuid);create table liquidation_report_files(liquidation_report_id uuid);
 create table user_roles(user_id uuid,role_id int2);create table user_profiles(user_id uuid);create table user_policy_acceptance(user_id uuid);
 create function get_system_setting_bool(text,boolean) returns boolean language sql as $$select $2$$;
 create function normalize_urn(text) returns text language sql immutable as $$select upper($1)$$;
 create function generate_unique_urn(text,timestamptz) returns text language sql as $$select 'LOCAL-FICTIONAL-URN'$$;`);
 for(const table of ['ypop_entries','ypop_event_participations','ypop_org_activities'])await db.exec(`create table ${table}(organization_id uuid,submitted_by uuid)`);
 for(const table of ['move_files','move_applications','urn_review_history','ypop_files','ypop_event_files','ypop_org_activity_files','compliance_remarks','inquiries'])await db.exec(`create table ${table}(organization_id uuid)`);
 for(const f of baseline.additional.functions)await db.exec(f.definition);
 // SQL-language retained-history helper needs the tables above; PL/pgSQL functions bind at invocation.
 for(const f of baseline.functions)await db.exec(f.definition);
 for(const f of dependencies)await db.exec(f.definition);
 await db.exec(catalog.functions.find(f=>f.name==='set_updated_at').definition);
 // Restore recorded direct ACLs rather than relying on default PUBLIC permissions.
 for(const f of baseline.functions){
  await db.exec(`revoke all on function public.${f.signature} from public,anon,authenticated,service_role`);
  for(const acl of f.acl.filter(a=>a.grantee!=='postgres'))await db.exec(`grant execute on function public.${f.signature} to ${acl.grantee==='PUBLIC'?'public':acl.grantee}${acl.grantable?' with grant option':''}`);
 }
 await db.exec(`create trigger trg_a_identity_privileges before insert or update on organization_profiles for each row execute function guard_organization_identity_privileges();
 create trigger trg_accreditation_immutability before update or delete on organization_accreditations for each row execute function enforce_accreditation_immutability();
 create trigger trg_sync_organization_accreditation_projection after insert or update on organization_accreditations for each row execute function sync_organization_accreditation_projection();
 create trigger trg_identity_retained_deletion before delete on organization_profiles for each row execute function guard_retained_organization_deletion();
 create trigger registration_guard before update or delete on document_submission_files for each row execute function guard_submitted_registration_document_edits();
 create trigger renewal_guard before update or delete on organization_renewals for each row execute function enforce_renewal_terminal_immutability();
 create trigger document_touch before update on document_submission_files for each row execute function set_updated_at();
 create trigger renewal_promote after update on document_submissions for each row execute function promote_renewal_submission_files_for_review();
 insert into roles(id,code,label,permission_codes) values(1,'super_admin','Synthetic SA','{}'),(2,'admin','Synthetic reviewer',array['registrations_management']);
 insert into admin_accounts(id,username,password_hash,email,display_name,role_id) values
 ('${superAdmin}','local-super-admin','NOT-A-LOGIN-HASH','local-super-admin@example.invalid','Local SA',1),
 ('${ordinaryAdmin}','local-reviewer','NOT-A-LOGIN-HASH','local-reviewer@example.invalid','Local reviewer',2);
 insert into admin_sessions(admin_id,token_hash,expires_at) values
 ('${superAdmin}',encode(extensions.digest('local-sa','sha256'),'hex'),now()+interval '1 hour'),
 ('${ordinaryAdmin}',encode(extensions.digest('local-reviewer','sha256'),'hex'),now()+interval '1 hour'),
 ('${superAdmin}',encode(extensions.digest('local-expired','sha256'),'hex'),now()-interval '1 hour');
 insert into admin_sessions(admin_id,token_hash,expires_at,revoked_at) values('${superAdmin}',encode(extensions.digest('local-revoked','sha256'),'hex'),now()+interval '1 hour',now());
 insert into organization_profiles(id,user_id,organization_name,organization_email,contact_number,barangay,profile_status,urn,is_renewal_test_account)
 values('${org}','${owner}','Local fictional organization','local-owner@example.invalid','000','Local','verified','LOCAL-INITIAL',true);
 insert into organization_accreditations(id,organization_id,term_number,start_date,end_date,certificate_urn,status) values('${term}','${org}',1,current_date-1065,current_date+30,'LOCAL-INITIAL','active');
 insert into required_document_types(id,name,scope) values('${docType}','Local fictional PDF','both');
 insert into budget_requests(id,organization_id,status,is_seeded_sample_data,seed_batch) values('${uuid(96)}','${org}','draft',true,'LOCAL-SEED');
 insert into liquidation_reports(id,organization_id,status,is_seeded_sample_data,seed_batch) values('${uuid(96)}','${org}','draft',true,'LOCAL-SEED');
 insert into document_submissions(id,organization_id,submitted_by,status,submission_scope,is_seeded_sample_data,seed_batch) values('${uuid(96)}','${org}','${owner}','draft','registration',true,'LOCAL-SEED');
 insert into document_submission_files(id,submission_id,document_type_id,admin_status,file_name,is_seeded_sample_data,seed_batch) values('${uuid(96)}','${uuid(96)}','${docType}','draft','seed.pdf',true,'LOCAL-SEED');
 insert into supabase_migrations.schema_migrations(version,name) values('20261008174154','synthetic-local-catalog');
 grant usage on schema auth,extensions,storage to anon,authenticated,service_role;
 grant select on storage.objects to anon,authenticated,service_role;
 -- Test-driver table grants intentionally broad: this suite tests function/trigger boundaries, not Supabase RLS.
 grant all on all tables in schema public to anon,authenticated,service_role;
 select set_config('request.jwt.claim.sub','${owner}',false);`);
 const expected=(await db.query(manifestSql)).rows[0].manifest;
 const localCandidate=candidate.replace(/\$expected_catalog\$[\s\S]*?\$expected_catalog\$/g,()=>`$expected_catalog$${JSON.stringify(expected)}$expected_catalog$`);
 return {db,localCandidate};
 }catch(error){await db.close();throw error;}
}
const protectedTables=['organization_profiles','organization_accreditations','organization_renewals','document_submissions','document_submission_files','budget_requests','liquidation_reports','storage.objects','activity_logs','notifications','admin_accounts','admin_sessions'];
async function snapshot(db){
 const result={};
 for(const table of protectedTables)result[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from ${table} t`)).rows[0].rows;
 return result;
}
async function deniedUnchanged(db,sql,params=[],pattern=/disabled|permission denied|immutable|cannot|Super Admin|not authorized|required|retained|own/){
 const before=await snapshot(db);
 await db.exec('savepoint denied_operation');
 await assert.rejects(db.query(sql,params),pattern);
 await db.exec('rollback to savepoint denied_operation');
 assert.deepEqual(await snapshot(db),before);
}
const callArgs=signature=>signature.startsWith('repair_')?[org,owner,superAdmin,{},'local']:
 signature.includes('(text,integer,date)')?['local-sa',30,null]:signature.includes('(text,text)')?['local-sa','PCYDO-YORP-2024-2026']:signature.endsWith('(text)')?['local-sa']:[];
function invocation(signature){const args=callArgs(signature);return {sql:`select public.${signature.slice(0,signature.indexOf('('))}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args};}
const results=[];

test('production containment actual PostgreSQL validation',async t=>{
 const {db,localCandidate}=await fixture();
 try{
  await t.test('unmodified production manifest fails closed on an isolated local catalog',async()=>{
   const before=await snapshot(db);
   await assert.rejects(db.exec(candidate),/catalog drift/);await db.exec('rollback');
   assert.deepEqual(await snapshot(db),before);
   assert.equal((await db.query('select is_development_or_test_environment() ok')).rows[0].ok,true);
   results.push({check:'Unmodified production gate rejects local database',status:'PASS'});
  });
  await t.test('exact candidate bodies install atomically with only a declared local catalog substitution',async()=>{
   const before=await snapshot(db);await db.exec(localCandidate);assert.deepEqual(await snapshot(db),before);
   assert.equal((await db.query("select count(*)::int n from supabase_migrations.schema_migrations where version='20261011230000'")).rows[0].n,1);
   results.push({check:'Actual replacement SQL/grants/postconditions commit; business data unchanged',status:'PASS'});
  });
  async function run(name,fn){await t.test(name,async()=>{await db.exec('begin');try{await fn();results.push({check:name,status:'PASS'});}finally{await db.exec('rollback');}});}
  for(const role of ['anon','authenticated','service_role','postgres'])for(const signature of metadata.disabledFunctions){
   await run(`${role}: ${signature} denied with protected data unchanged`,async()=>{
    await db.exec(`set local role ${role}`);const {sql,args}=invocation(signature);await deniedUnchanged(db,sql,args);
   });
  }
  await run('Super Admin token cannot run production-disabled test mutations',async()=>{
   for(const signature of metadata.disabledFunctions){const {sql,args}=invocation(signature);await deniedUnchanged(db,sql,args);}
  });
  await run('no production-disabled mutation retains PUBLIC or API/inherited EXECUTE',async()=>{
   for(const signature of metadata.disabledFunctions)for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') ok',[role,signature])).rows[0].ok,false);
  });
  await run('environment fails closed for every editable setting and missing setting',async()=>{
   for(const value of ['development','dev','test','testing','staging','local','production','unknown']){
    await db.query('update admin_system_settings set value_json=$1::jsonb',[JSON.stringify(value)]);
    assert.equal((await db.query('select is_development_or_test_environment() ok')).rows[0].ok,false);
   }
   await db.exec('delete from admin_system_settings');assert.equal((await db.query('select is_development_or_test_environment() ok')).rows[0].ok,false);
  });
  for(const token of ['local-reviewer','local-expired','local-revoked','local-invalid'])await run(`retained sample status rejects ${token.replace('local-','')} session`,()=>deniedUnchanged(db,'select admin_get_yorp_sample_dataset_status($1)',[token]));
  await run('retained status accepts active Super Admin over anon custom-session transport',async()=>{
   await db.exec('set local role anon');const r=(await db.query("select admin_get_yorp_sample_dataset_status('local-sa') data")).rows[0].data;
   assert.equal(r.is_development_or_test_environment,false);assert.equal(r.expected_total,84);assert.equal(r.total_seeded_organizations,0);
  });
  await run('inactive Super Admin is denied by the real captured token validator',async()=>{
   await db.exec(`update admin_accounts set is_active=false where id='${superAdmin}'`);await deniedUnchanged(db,"select admin_get_yorp_sample_dataset_status('local-sa')");
  });
  for(const role of ['anon','authenticated','service_role','postgres'])await run(`${role}: fixture markers cannot be changed`,async()=>{
   await db.exec(`set local role ${role}`);
   for(const set of ['is_renewal_test_account=false','is_seeded_sample_data=true',"seed_batch='forged'",'seed_source_year=2026','seed_source_record_number=1'])await deniedUnchanged(db,`update organization_profiles set ${set} where id=$1`,[org]);
  });
  await run('ordinary new profiles cannot introduce any fixture marker',async()=>{
   await db.exec('set local role authenticated');
   for(const [field,value] of [['is_renewal_test_account','true'],['is_seeded_sample_data','true'],['seed_batch',"'forged'"],['seed_source_year','2026'],['seed_source_record_number','1']])await deniedUnchanged(db,`insert into organization_profiles(id,user_id,${field}) values($1,$2,${value})`,[uuid(90),owner]);
  });
  await run('security-definer owner cannot bypass marker protection for an organization caller',async()=>{
   await db.exec(`create function local_marker_attack(uuid) returns void language sql security definer as $$update organization_profiles set is_seeded_sample_data=true where id=$1$$;set local role authenticated`);
   await deniedUnchanged(db,'select local_marker_attack($1)',[org]);
  });
  await run('normal profile edits retain existing fixture markers',async()=>{
   await db.exec('set local role authenticated');await db.query('update organization_profiles set organization_name=$1 where id=$2',['Local edited name',org]);
   assert.equal((await db.query('select is_renewal_test_account from organization_profiles where id=$1',[org])).rows[0].is_renewal_test_account,true);
  });
  await run('fixture flag and arbitrary test GUC cannot alter or delete accreditation history',async()=>{
   await db.exec("select set_config('app.allow_test_scenario_prep','true',true)");
   for(const set of ["start_date=current_date-2000",'end_date=current_date+10','term_number=99',"certificate_urn='forged'",'approved_at=now()',"is_legacy_inferred=true"])await deniedUnchanged(db,`update organization_accreditations set ${set} where id=$1`,[term]);
   await deniedUnchanged(db,'delete from organization_accreditations where id=$1',[term]);
   await db.query("update organization_accreditations set status='superseded' where id=$1",[term]);
   await deniedUnchanged(db,"update organization_accreditations set status='active' where id=$1",[term]);
  });
  await run('fixture flag and test GUC cannot reopen or delete terminal renewals',async()=>{
   await db.exec("select set_config('app.allow_test_scenario_prep','true',true)");
   await db.query("insert into organization_renewals(id,organization_id,status,cycle_number) values($1,$2,'approved',2)",[uuid(95),org]);
   await deniedUnchanged(db,"update organization_renewals set status='draft' where id=$1",[uuid(95)],/Terminal renewal/);
   await deniedUnchanged(db,'delete from organization_renewals where id=$1',[uuid(95)],/Terminal renewal/);
  });
  for(const table of ['budget_requests','liquidation_reports','document_submissions','document_submission_files'])await run(`${table}: owner and definer cannot change seed markers; normal edits still work`,async()=>{
   const fixtureId=uuid(96);
   for(const role of ['authenticated','postgres']){
    await db.exec(`set local role ${role}`);
    await deniedUnchanged(db,`update ${table} set is_seeded_sample_data=false where id=$1`,[fixtureId]);
    await deniedUnchanged(db,`update ${table} set seed_batch='FORGED' where id=$1`,[fixtureId]);
    await deniedUnchanged(db,`insert into ${table}(id,is_seeded_sample_data,seed_batch) values($1,true,'FORGED')`,[uuid(97)]);
    await db.query(`update ${table} set seed_batch=seed_batch where id=$1`,[fixtureId]);
    const ordinaryEdit=table==='document_submission_files'?"file_name='ordinary-edit.pdf'":"status='draft'";
    await db.query(`update ${table} set ${ordinaryEdit} where id=$1`,[fixtureId]);
    await db.exec('reset role');
   }
   await db.exec(`create function local_seed_attack(uuid) returns void language sql security definer as $$update ${table} set is_seeded_sample_data=false where id=$1$$;set local role authenticated`);
   await deniedUnchanged(db,'select local_seed_attack($1)',[fixtureId]);
  });
  await run('normal revocation works; revoked term and revocation evidence cannot be rewritten',async()=>{
   await db.query("update organization_accreditations set status='revoked',revocation_reason='Local reason' where id=$1",[term]);
   assert.ok((await db.query('select revoked_at from organization_accreditations where id=$1',[term])).rows[0].revoked_at);
   await deniedUnchanged(db,"update organization_accreditations set status='active' where id=$1",[term]);
   await deniedUnchanged(db,"update organization_accreditations set revocation_reason='forged' where id=$1",[term]);
  });
  await run('normal renewal draft, submission, valid Admin review and three-year approval remain operational',async()=>{
   await db.exec('set local role authenticated');
   const draft=(await db.query('select user_start_or_get_renewal_draft($1) data',[org])).rows[0].data;
   const r=draft.renewal.id,s=draft.submission.id;
   assert.equal(draft.renewal.cycle_number,2);
   const repeat=(await db.query('select user_start_or_get_renewal_draft($1) data',[org])).rows[0].data;assert.equal(repeat.renewal.id,r);
   await db.exec('reset role');
   await db.query("insert into document_submission_files(id,submission_id,document_type_id,file_url,file_name,file_type,file_size,admin_status,updated_at,revision_history) values($1,$2,$3,'storage://organization-documents/local.pdf','local.pdf','application/pdf',100,'draft',now(),'[]')",[uuid(50),s,docType]);
   await db.exec('set local role authenticated');await db.query('select user_submit_renewal($1)',[r]);await db.exec('reset role');
   await db.exec('set local role anon');
   for(const token of ['local-invalid','local-expired','local-revoked'])await deniedUnchanged(db,"select update_admin_document_submission_file_review($1,$2,'approved_green',null)",[token,uuid(50)]);
   await db.query("select update_admin_document_submission_file_review('local-reviewer',$1,'approved_green',null)",[uuid(50)]);
   for(const token of ['local-invalid','local-expired','local-revoked'])await deniedUnchanged(db,'select admin_approve_renewal($1,$2,$3,null)',[token,r,'LOCAL-RENEWED']);
   const approved=(await db.query("select admin_approve_renewal('local-reviewer',$1,'LOCAL-RENEWED','Local test') data",[r])).rows[0].data;
   assert.equal(approved.success,true);await db.exec('reset role');
   const terms=(await db.query('select term_number,start_date::text,end_date::text,status from organization_accreditations where organization_id=$1 order by term_number',[org])).rows;
   assert.equal(terms.length,2);assert.equal(terms[0].status,'superseded');assert.equal(terms[1].status,'active');assert.equal(terms[1].start_date,terms[0].end_date);
   assert.equal((await db.query("select end_date=(start_date+interval '3 years')::date ok from organization_accreditations where term_number=2")).rows[0].ok,true);
   assert.equal((await db.query('select is_renewal_test_account from organization_profiles where id=$1',[org])).rows[0].is_renewal_test_account,true);
  });
  await run('normal registration revision, Admin review and initial accreditation remain operational',async()=>{
   const regOrg=uuid(60),regOwner=uuid(61),submission=uuid(62),file=uuid(63),peer=uuid(64);
   await db.query("insert into organization_profiles(id,user_id,organization_name,organization_email,contact_number,barangay,profile_status,urn) values($1,$2,'Local registration','local-registration@example.invalid','000','Local','pending_review','LOCAL-REGISTRATION')",[regOrg,regOwner]);
   await db.query("insert into document_submissions(id,organization_id,submitted_by,status,submission_scope,created_at) values($1,$2,$3,'needs_revision','registration',now())",[submission,regOrg,regOwner]);
   await db.query("insert into document_submission_files(id,submission_id,document_type_id,file_url,file_name,admin_status,updated_at,revision_history) values($1,$2,$3,'storage://organization-documents/original.pdf','original.pdf','needs_revision',now(),'[]'),($4,$2,null,'storage://organization-documents/peer.pdf','peer.pdf','approved_green',now(),'[]')",[file,submission,docType,peer]);
   const peerBefore=(await db.query('select to_jsonb(f) data from document_submission_files f where id=$1',[peer])).rows[0].data;
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
   const args=[file,docType,`storage://organization-documents/${regOrg}/${docType}/revisions/corrected.pdf`,'corrected.pdf','application/pdf',100];
   const sql='select replace_organization_document_file($1,$2,(select updated_at from document_submission_files where id=$1),$3,$4,$5,$6)';
   await deniedUnchanged(db,sql,args);
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[regOwner]);await db.exec('set local role authenticated');await db.query(sql,args);await db.exec('reset role');
   const corrected=(await db.query('select * from document_submission_files where id=$1',[file])).rows[0];assert.equal(corrected.file_url,args[2]);assert.equal(corrected.revision_history.length,1);assert.equal(corrected.admin_status,'under_admin_review');
   assert.deepEqual((await db.query('select to_jsonb(f) data from document_submission_files f where id=$1',[peer])).rows[0].data,peerBefore);
   await db.exec('set local role anon');await db.query("select update_admin_document_submission_file_review('local-reviewer',$1,'approved_green',null)",[file]);await db.exec('reset role');
   assert.equal((await db.query('select profile_status from organization_profiles where id=$1',[regOrg])).rows[0].profile_status,'verified');
   assert.equal((await db.query('select count(*)::int n from organization_accreditations where organization_id=$1',[regOrg])).rows[0].n,1);
  });
  await run('authorized account deletion works only without retained official history',async()=>{
   const disposable=uuid(70),user=uuid(71);
   await db.query("insert into organization_profiles(id,user_id,organization_name,organization_email,contact_number,barangay,profile_status) values($1,$2,'Local disposable','local-disposable@example.invalid','000','Local','pending_review')",[disposable,user]);
   const response=(await db.query("select delete_organization_account_canonical('local-reviewer',$1) data",[disposable])).rows[0].data;assert.equal(response.success,true);
   assert.equal((await db.query('select count(*)::int n from organization_profiles where id=$1',[disposable])).rows[0].n,0);
   await deniedUnchanged(db,"select delete_organization_account_canonical('local-sa',$1)",[org]);
   const invalid=(await db.query("select delete_organization_account_canonical('local-invalid',$1) data",[org])).rows[0].data;assert.equal(invalid.success,false);assert.equal(invalid.stage,'authorization');
  });
  await run('legitimate deletion trigger exception is retained and scoped to the transaction',async()=>{
   await db.exec("savepoint deletion_scope;select set_config('app.allow_org_deletion','true',true)");
   await db.query('delete from organization_accreditations where id=$1',[term]);
   await db.exec('rollback to savepoint deletion_scope');
   await deniedUnchanged(db,'delete from organization_accreditations where id=$1',[term]);
  });
  await run('stored test functions expose only denial, no embedded credential expression or response',async()=>{
   for(const signature of metadata.disabledFunctions){const r=(await db.query('select prosrc,prosecdef from pg_proc where oid=to_regprocedure($1)',[signature])).rows[0];assert.match(r.prosrc,/Test-only mutation is disabled/);assert.doesNotMatch(r.prosrc,/crypt\(|password|credentials|auth\.users/i);assert.equal(r.prosecdef,false);}
  });
  await run('second installation stops rather than reapplying or changing data',async()=>{
   const before=await snapshot(db);await assert.rejects(db.exec(localCandidate),/catalog drift/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  });
 }finally{await db.close();}
});

test('catalog drift and postcondition failure roll back the whole proposed transaction',async t=>{
 const {db,localCandidate}=await fixture();
 try{
  await t.test('ACL drift rejected before mutation',async()=>{
   await db.exec('grant execute on function diversify_yorp_seed_projects_and_budgets() to anon');
   const before=await snapshot(db);await assert.rejects(db.exec(localCandidate),/catalog drift/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
   await db.exec('revoke execute on function diversify_yorp_seed_projects_and_budgets() from anon');results.push({check:'ACL drift gate',status:'PASS'});
  });
  await t.test('function-body drift rejected before mutation',async()=>{
   await db.exec("alter function admin_reset_renewal_test_scenario(text) set search_path=pg_catalog,public");
   await assert.rejects(db.exec(localCandidate),/catalog drift/);await db.exec('rollback');await db.exec(functionSql('admin_reset_renewal_test_scenario'));results.push({check:'Function drift gate',status:'PASS'});
  });
  await t.test('postcondition failure atomically restores all original functions/grants and history',async()=>{
   const before=(await db.query(manifestSql)).rows[0].manifest;
   const fault=localCandidate.replace('DO $containment_postconditions$',"GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO anon;\nDO $containment_postconditions$");
   await assert.rejects(db.exec(fault),/API execution privilege/);await db.exec('rollback');
   assert.deepEqual((await db.query(manifestSql)).rows[0].manifest,before);results.push({check:'Whole transaction rollback on injected grant error',status:'PASS'});
  });
 }finally{await db.close();}
});

test('artifact integrity and deployment scope',()=>{
 assert.equal(createHash('sha256').update(candidate).digest('hex'),metadata.sha256);
 assert.ok(!candidate.includes('[REDACTED LEGACY CREDENTIAL]'));
 assert.doesNotMatch(candidate,/^\s*(?:INSERT INTO\s+auth\.|UPDATE\s+auth\.|DELETE FROM\b|TRUNCATE\b|DROP\b|ALTER POLICY\b|CREATE POLICY\b)/im);
 assert.equal(metadata.disabledFunctions.length,12);assert.equal(metadata.changedFunctions.length,17);assert.equal(metadata.newMarkerTriggers.length,4);
 assert.ok(baseline.functions.find(f=>f.name==='admin_get_or_create_renewal_test_account').definition_redacted);
 results.push({check:'Candidate hash and no live-data/Auth/Storage mutation scope',status:'PASS'});
});

test.after(async()=>{
 await writeFile(`${dir}/local-sql-results.json`,JSON.stringify({engine:'PGlite 0.5.8 / actual PostgreSQL SQL',scope:'Synthetic isolated tables, roles, Auth UID test driver and SHA-256 digest adapter. Actual captured token validator, reviewer authorization, normal renewal/registration/deletion functions and proposed SQL replacements. Expected-catalog literal substituted only for the local catalog; untouched production gate separately rejected. No live API/Auth, browser, multi-session or production deployment certification.',results,passed:results.filter(r=>r.status==='PASS').length,concurrency:'NOT TESTED: single PGlite connection',liveWrites:false},null,2)+'\n');
});
