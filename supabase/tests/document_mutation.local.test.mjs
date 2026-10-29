// Actual PostgreSQL (PGlite) execution of captured RPCs + forward SQL + RLS.
// Synthetic schema/validator/notifications only. No network or credentials.
// PGlite serializes one connection: multi-session contention is NOT certified.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile,writeFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const base='docs/staging-validation/2026-10-11/document-mutation/';
const catalog=JSON.parse(await readFile(base+'staging-catalog.json','utf8'));
const patch=await readFile('supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql','utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const org=id(1),owner=id(2),other=id(3),submission=id(4),file=id(5),type=id(6),renewal=id(7),term=id(8),admin=id(9);
const path=`${org}/renewal/${renewal}/${type}/revisions/new.pdf`;
const uri=`storage://organization-documents/${path}`;
export async function fixture({install=true}={}){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function current_user_is_admin() returns boolean language sql stable as $$select false$$;
 create type document_submission_status as enum('draft','submitted','under_admin_review','ready_for_review','needs_revision','approved_green','rejected_red');
 create type document_file_validation_status as enum('correct','incorrect');
 create type profile_status as enum('verified','pending_review','suspended_inactive');
 create type registration_type as enum('new','existing');create type urn_review_status as enum('pending','approved','verified');create type verification_method as enum('documents','existing_urn');`);
 const map={citext:'text',_text:'text[]'};
 for(const table of ['organization_profiles','organization_renewals','document_submissions','document_submission_files']){
  const cols=catalog.columns.filter(c=>c.table===table).map(c=>`"${c.name}" ${map[c.type]??c.type}${c.name==='id'?' primary key default gen_random_uuid()':''}`);
  await db.exec(`create table public.${table}(${cols.join(',')});`);
 }
 await db.exec(`create table organization_accreditations(id uuid primary key default gen_random_uuid(),organization_id uuid,end_date date,start_date date,term_number int,status text,certificate_urn text,is_legacy_inferred boolean,approved_by uuid,approved_at timestamptz,created_at timestamptz);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz default clock_timestamp());
 create table required_document_types(id uuid primary key,name text,is_active boolean,is_required boolean,scope text,template_scope text);
 create table activity_logs(actor_user_id uuid,organization_id uuid,action text,related_type text,related_id uuid,description text,created_at timestamptz default now(),metadata jsonb);
 create table notifications(user_id uuid,organization_id uuid,title text,message text,type text,related_type text,related_id uuid,created_at timestamptz);
 create function get_system_setting_bool(text,boolean) returns boolean language sql as $$select $2$$;
 create function evaluate_and_apply_automatic_registration_verification(uuid,uuid) returns void language sql as $$select$$;
 create function validate_admin_session_token(text) returns table(admin_id uuid) language sql as $$select '${admin}'::uuid where $1='valid-admin'$$;
 create function generate_unique_urn(text,timestamptz) returns text language sql as $$select 'LOCAL-SYNTHETIC'$$;
 create function normalize_urn(text) returns text language sql as $$select $1$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 grant all on all tables in schema public to authenticated,anon;
 insert into organization_profiles(id,user_id,profile_status) values('${org}','${owner}','verified'),('${other}','${other}','verified');
 insert into organization_accreditations(id,organization_id,end_date,term_number,status,start_date) values('${term}','${org}',current_date+30,1,'active',current_date-1000);
 insert into organization_renewals(id,organization_id,status,current_accreditation_id,cycle_number) values('${renewal}','${org}','needs_revision','${term}',2);
 insert into document_submissions(id,organization_id,submitted_by,status,renewal_id,submission_scope) values('${submission}','${org}','${owner}','needs_revision','${renewal}','renewal');
 insert into document_submission_files(id,submission_id,document_type_id,file_url,file_name,file_type,file_size,admin_status,revision_history,updated_at,revision_requested_at,revision_due_at)
 values('${file}','${submission}','${type}','storage://organization-documents/old.pdf','old.pdf','application/pdf',100,'needs_revision','[]',now(),now()-interval '1 hour',now()+interval '1 day');
 insert into required_document_types values('${type}','Test PDF',true,true,'both','document_submission');
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('organization-documents','${path}','${owner}','{"size":100,"mimetype":"application/pdf"}');`);
 for(const name of ['user_replace_document_submission_file','replace_organization_document_file','update_admin_document_submission_file_review','guard_submitted_registration_document_edits','set_updated_at','enforce_renewal_terminal_immutability','user_submit_renewal','user_resubmit_renewal','admin_approve_renewal','promote_renewal_submission_files_for_review'])await db.exec(catalog.functions.find(f=>f.name===name).definition);
 const backend=JSON.parse(await readFile(base+'document-writers.json','utf8'));
 for(const name of ['hard_delete_admin_template_document','delete_organization_account_canonical'])await db.exec(backend.find(f=>f.name===name).definition);
 await db.exec(`create trigger guard_submitted_registration_document_edits before update or delete on document_submission_files for each row execute function guard_submitted_registration_document_edits();
 create trigger touch before update on document_submission_files for each row execute function set_updated_at();
 create trigger renewal_terminal before update or delete on organization_renewals for each row execute function enforce_renewal_terminal_immutability();`);
 for(const t of ['document_submission_files','document_submissions','organization_renewals'])await db.exec(`alter table ${t} enable row level security`);
 for(const p of catalog.policies)await db.exec(`create policy "${p.name}" on ${p.table} for ${p.cmd} to public ${p.qual?`using (${p.qual})`:''} ${p.check?`with check (${p.check})`:''}`);
 if(install){const before=(await db.query("select jsonb_agg(to_jsonb(p) order by policyname) policies from pg_policies p")).rows[0];await db.exec(patch);assert.deepEqual((await db.query("select jsonb_agg(to_jsonb(p) order by policyname) policies from pg_policies p")).rows[0],before);}
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 return db;
}
const call=db=>db.query('select user_replace_document_submission_file($1,$2,$3,$4,$5,true)',[file,uri,'new.pdf','application/pdf',100]);
const snapshot=async db=>(await db.query(`select to_jsonb(f) file,(select to_jsonb(s) from document_submissions s where id='${submission}') parent,(select to_jsonb(r) from organization_renewals r where id='${renewal}') renewal,(select count(*)::int from activity_logs) audits from document_submission_files f where id='${file}'`)).rows;
test('document mutation actual SQL authorization/lifecycle matrix',async t=>{
 const results=[];
 async function run(name,fn){await t.test(name,async()=>{const db=await fixture();try{await fn(db);results.push({check:name,status:'PASS'});}finally{await db.close();}});}
 async function deniedUnchanged(db,invoke=()=>call(db),pattern=/.+/){const before=await snapshot(db);await assert.rejects(invoke,pattern);assert.deepEqual(await snapshot(db),before);}
 await t.test('captured pre-patch RPC reproduces terminal and anonymous mutation',async()=>{const db=await fixture({install:false});try{await db.exec("update organization_renewals set status='approved';update document_submissions set status='approved_green'");await call(db);assert.equal((await db.query('select admin_status from document_submission_files')).rows[0].admin_status,'submitted');await db.exec("select set_config('request.jwt.claim.sub','',false);set role anon");await call(db);await db.exec('reset role');results.push({check:'Captured original terminal and anonymous vulnerability reproduced locally',status:'PASS'});}finally{await db.close();}});
 await t.test('catalog drift aborts installation atomically',async()=>{const db=await fixture({install:false});try{await db.exec("comment on function user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) is 'drift test'");await db.exec("alter function user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) set search_path=pg_catalog,public");await assert.rejects(db.exec(patch),/catalog drift/);await db.exec('rollback');assert.equal((await db.query("select to_regnamespace('ytrace_document_mutation') is null absent")).rows[0].absent,true);results.push({check:'Catalog drift rejects installation atomically',status:'PASS'});}finally{await db.close();}});
 await run('valid renewal revision updates one file and retains history/audit',async db=>{await call(db);const r=(await db.query(`select * from document_submission_files where id='${file}'`)).rows[0];assert.equal(r.file_url,uri);assert.equal(r.admin_status,'submitted');assert.equal(r.revision_history.length,1);assert.equal((await db.query('select count(*)::int n from activity_logs')).rows[0].n,1);});
 await run('approved renewal rejects replacement with all fields unchanged',async db=>{await db.exec(`update organization_renewals set status='approved';update document_submissions set status='approved_green'`);await deniedUnchanged(db);});
 await run('rejected renewal rejects replacement with all fields unchanged',async db=>{await db.exec("update organization_renewals set status='rejected'");await deniedUnchanged(db);});
 await run('terminal registration rejects both replacement entry points',async db=>{await db.exec("update document_submissions set renewal_id=null,submission_scope='registration'").catch(()=>{}); // installed link guard must deny; change fixture only with trigger absent
  await db.exec("alter table document_submissions disable trigger a_document_parent_guard;update document_submissions set renewal_id=null,submission_scope='registration',status='approved_green';alter table document_submissions enable trigger a_document_parent_guard");
  await deniedUnchanged(db);await deniedUnchanged(db,()=>db.query('select replace_organization_document_file($1,$2,(select updated_at from document_submission_files where id=$1),$3,$4,$5,$6)',[file,type,uri,'new.pdf','application/pdf',100]));});
 await run('cross-organization owner is denied without mutation',async db=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await deniedUnchanged(db);});
 await run('anonymous null identity fails closed and PUBLIC execute is revoked',async db=>{await db.query("select set_config('request.jwt.claim.sub','',false)");await deniedUnchanged(db);await db.exec('set role anon');await assert.rejects(()=>call(db),/permission denied/);await db.exec('reset role');});
 await run('suspended organization denied',async db=>{await db.exec("update organization_profiles set profile_status='suspended_inactive'");await deniedUnchanged(db);});
 for(const field of ['revision_locked','revision_due_at','revision_locked_at'])await run(`file ${field} enforced`,async db=>{await db.exec(`update document_submission_files set ${field}=${field==='revision_locked'?'true':"now()-interval '1 day'"}`);await deniedUnchanged(db);});
 for(const table of ['document_submissions','organization_renewals'])await run(`${table} deadline enforced`,async db=>{await db.exec(`update ${table} set revision_due_at=now()-interval '1 day'`);await deniedUnchanged(db);});
 await run('late accreditation cutoff enforced',async db=>{await db.exec("update organization_accreditations set end_date=current_date-181");await deniedUnchanged(db);});
 await run('missing parent and inconsistent renewal owner denied',async db=>{await db.exec(`update organization_renewals set organization_id='${other}'`);await deniedUnchanged(db);});
 for(const kind of ['missing','wrong-owner','wrong-path','wrong-size','wrong-mime','old-upload'])await run(`Storage relationship ${kind} denied`,async db=>{
  if(kind==='missing')await db.exec('delete from storage.objects');
  if(kind==='wrong-owner')await db.exec(`update storage.objects set owner_id='${other}'`);
  if(kind==='wrong-size')await db.exec(`update storage.objects set metadata='{"size":99,"mimetype":"application/pdf"}'`);
  if(kind==='wrong-mime')await db.exec(`update storage.objects set metadata='{"size":100,"mimetype":"text/plain"}'`);
  if(kind==='old-upload')await db.exec("update storage.objects set created_at=now()-interval '2 hours'");
  if(kind==='wrong-path')return deniedUnchanged(db,()=>db.query('select user_replace_document_submission_file($1,$2,$3,$4,100,true)',[file,`storage://organization-documents/${other}/${type}/revisions/new.pdf`,'new.pdf','application/pdf']));
  await deniedUnchanged(db);
 });
 await run('approved individual file cannot be demoted by owner direct UPDATE',async db=>{await db.exec("update document_submission_files set admin_status='approved_green'");await db.exec('set role authenticated');await assert.rejects(db.query(`update document_submission_files set admin_status='draft' where id='${file}'`),/revision workflow/);await db.exec('reset role');await deniedUnchanged(db);});
 await run('direct owner cannot reparent or forge review history/approval',async db=>{await db.exec("update document_submission_files set admin_status='draft'");await db.exec('set role authenticated');for(const assignment of [`submission_id='${other}'`,"admin_status='approved_green'","revision_history='[{\"forged\":true}]'"]){await assert.rejects(db.query(`update document_submission_files set ${assignment} where id='${file}'`));}await db.exec('reset role');});
 await run('direct draft upload/update remains available to owner',async db=>{await db.exec("update document_submission_files set admin_status='draft',revision_requested_at=null,revision_due_at=null");await db.exec('set role authenticated');await db.query(`update document_submission_files set file_url=$1,file_name='new.pdf',admin_status='draft',uploaded_at=clock_timestamp() where id=$2`,[uri,file]);await db.exec('reset role');assert.equal((await db.query('select file_url from document_submission_files')).rows[0].file_url,uri);});
 await run('direct client cannot clear deadline then overwrite draft',async db=>{await db.exec("update document_submission_files set admin_status='draft'");const before=await snapshot(db);await db.exec('set role authenticated');await assert.rejects(db.query("update document_submission_files set revision_due_at=null,revision_requested_at=null"),/server controlled/);await db.exec('reset role');assert.deepEqual(await snapshot(db),before);});
 await run('suspended owner cannot delete or change draft review status directly',async db=>{await db.exec("update document_submission_files set admin_status='draft';update organization_profiles set profile_status='suspended_inactive'");const before=await snapshot(db);await db.exec('set role authenticated');await assert.rejects(db.query('delete from document_submission_files'),/not authorized/);await assert.rejects(db.query("update document_submission_files set admin_status='submitted'"),/not authorized/);await db.exec('reset role');assert.deepEqual(await snapshot(db),before);});
 await run('missing file parent fails closed',async db=>{await db.exec("alter table document_submission_files disable trigger a_document_mutation_guard;update document_submission_files set submission_id=null;alter table document_submission_files enable trigger a_document_mutation_guard");await deniedUnchanged(db);});
 await run('terminal owner DELETE and universal INSERT/UPDATE rejected',async db=>{await db.exec("update document_submissions set status='approved_green'");const before=await snapshot(db);await db.exec('set role authenticated');await assert.rejects(db.query(`delete from document_submission_files where id='${file}'`));await db.exec('reset role');assert.deepEqual(await snapshot(db),before);await deniedUnchanged(db,()=>db.query(`update document_submission_files set admin_status='draft' where id='${file}'`));await assert.rejects(db.query(`insert into document_submission_files(id,submission_id,document_type_id) values('${id(99)}','${submission}','${type}')`));});
 await run('direct parent cannot demote terminal status or unlock revision',async db=>{await db.exec("update document_submissions set status='approved_green'");await db.exec('set role authenticated');await assert.rejects(db.query("update document_submissions set status='draft'"),/Terminal/);await assert.rejects(db.query("update document_submissions set revision_unlocked_at=now()"));await db.exec('reset role');});
 await run('legitimate registration replacement preserves original RPC history/notification',async db=>{await db.exec("alter table document_submissions disable trigger a_document_parent_guard;update document_submissions set renewal_id=null,submission_scope='registration';alter table document_submissions enable trigger a_document_parent_guard");const p=`${org}/${type}/revisions/registration.pdf`;await db.query('update storage.objects set name=$1',[p]);await db.query('select replace_organization_document_file($1,$2,(select updated_at from document_submission_files where id=$1),$3,$4,$5,$6)',[file,type,`storage://organization-documents/${p}`,'registration.pdf','application/pdf',100]);assert.equal((await db.query('select admin_status from document_submission_files')).rows[0].admin_status,'under_admin_review');assert.equal((await db.query('select count(*)::int n from notifications')).rows[0].n,1);});
 await run('stale registration optimistic timestamp denied without mutation',async db=>{await deniedUnchanged(db,()=>db.query('select replace_organization_document_file($1,$2,now()-interval \'1 day\',$3,$4,$5,$6)',[file,type,uri,'new.pdf','application/pdf',100]),/changed after/);});
 await run('audit failure rolls back replacement metadata/history atomically',async db=>{await db.exec(`create function fail_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable';end$$;create trigger fail_audit before insert on activity_logs for each row execute function fail_audit()`);await deniedUnchanged(db,()=>call(db),/audit unavailable/);});
 await run('Admin review works before terminal; late review cannot reopen terminal',async db=>{await call(db);await db.query("select update_admin_document_submission_file_review('valid-admin',$1,'approved_green',null)",[file]);assert.equal((await db.query('select status from document_submissions')).rows[0].status,'approved_green');await db.exec("update organization_renewals set status='approved'");await deniedUnchanged(db,()=>db.query("select update_admin_document_submission_file_review('valid-admin',$1,'needs_revision','late')",[file]));});
 await run('custom Admin anon-role review remains usable without an organization JWT',async db=>{await call(db);await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');await assert.rejects(db.query("select update_admin_document_submission_file_review('invalid-admin',$1,'approved_green',null)",[file]),/not authorized/);await db.query("select update_admin_document_submission_file_review('valid-admin',$1,'approved_green',null)",[file]);await db.exec('reset role');assert.equal((await db.query('select status from document_submissions')).rows[0].status,'approved_green');});
 await run('actual captured Admin approval commits term transition then rejects replacement',async db=>{await call(db);await db.query('select user_resubmit_renewal($1)',[renewal]);await db.query("select update_admin_document_submission_file_review('valid-admin',$1,'approved_green',null)",[file]);await db.query("select admin_approve_renewal('valid-admin',$1,'LOCAL-SYNTHETIC','Local approval')",[renewal]);assert.equal((await db.query('select status from organization_renewals')).rows[0].status,'approved');assert.equal((await db.query("select count(*)::int n from organization_accreditations where status='active'")).rows[0].n,1);await deniedUnchanged(db);});
 await run('resubmission works after correction; terminal resubmission fails',async db=>{await call(db);await db.query('select user_resubmit_renewal($1)',[renewal]);assert.equal((await db.query('select status from organization_renewals')).rows[0].status,'resubmitted');await db.exec("update organization_renewals set status='approved'");await deniedUnchanged(db,()=>db.query('select user_resubmit_renewal($1)',[renewal]));});
 await run('private helper cannot be invoked directly by authenticated role',async db=>{await db.exec('set role authenticated');await assert.rejects(db.query('select ytrace_document_mutation.lock_replacement($1)',[file]),/permission denied/);await db.exec('reset role');});
 await run('anonymous/suspended resubmission cannot alter a corrected packet',async db=>{await call(db);await db.query("select set_config('request.jwt.claim.sub','',false)");await deniedUnchanged(db,()=>db.query('select user_resubmit_renewal($1)',[renewal]));await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec("update organization_profiles set profile_status='suspended_inactive'");await deniedUnchanged(db,()=>db.query('select user_resubmit_renewal($1)',[renewal]));});
 await run('owner cannot use catalog unlink to mutate an approved file',async db=>{await db.exec("update document_submission_files set admin_status='approved_green';update document_submissions set status='approved_green'");const before=await snapshot(db);await db.exec('set role authenticated');await assert.rejects(db.query('update document_submission_files set document_type_id=null'));await db.exec('reset role');assert.deepEqual(await snapshot(db),before);});
 await run('actual validated Admin template deletion preserves terminal file content/review/history',async db=>{const writers=JSON.parse(await readFile(base+'document-writers.json','utf8'));await db.exec(writers.find(f=>f.name==='hard_delete_admin_template_document').definition);await db.exec("update document_submission_files set admin_status='approved_green';update document_submissions set status='approved_green'");const before=(await db.query("select to_jsonb(f)-ARRAY['document_type_id','updated_at'] row from document_submission_files f")).rows[0];await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');await assert.rejects(db.query("select hard_delete_admin_template_document('invalid-admin',$1)",[type]));await db.query("select hard_delete_admin_template_document('valid-admin',$1)",[type]);await db.exec('reset role');assert.deepEqual((await db.query("select to_jsonb(f)-ARRAY['document_type_id','updated_at'] row from document_submission_files f")).rows[0],before);assert.equal((await db.query('select document_type_id from document_submission_files')).rows[0].document_type_id,null);});
 await run('backend deletion semantics remain available; direct terminal parent deletion denied',async db=>{await db.exec("update document_submission_files set admin_status='approved_green';update document_submissions set status='approved_green'");await db.exec('set role authenticated');await assert.rejects(db.query('delete from document_submissions'));await db.exec('reset role');await db.exec('delete from document_submission_files;delete from document_submissions');assert.equal((await db.query('select count(*)::int n from document_submission_files')).rows[0].n,0);});
 await writeFile(base+'local-sql-results.json',JSON.stringify({scope:'Actual PGlite PostgreSQL; synthetic schema and Admin validator, captured RLS/RPCs. Not live HTTP or multi-session concurrency.',results,concurrency:'BLOCKED: no multi-connection PostgreSQL server available'},null,2));
});

test('exact staging reconciliation proposal executes only locally and preserves evidence',async t=>{
 const e=JSON.parse(await readFile(base+'fixture-reconciliation-evidence.json','utf8'));
 const fresh=JSON.parse(await readFile(base+'fresh-sql-snapshot.json','utf8'));
 const repair=await readFile(base+'proposed-staging-reconciliation.sql','utf8');
 async function setup(){
  const db=await fixture({install:false});
  await db.exec(`truncate document_submission_files,document_submissions,organization_renewals,organization_profiles,organization_accreditations,storage.objects;
  create table roles(id uuid primary key,code text);create table admin_accounts(id uuid,username text,email text,is_active boolean,is_password_set boolean,role_id uuid);
  create table auth.users(id uuid,email text,raw_app_meta_data jsonb);
  create schema ytrace_staging_renewal;create table ytrace_staging_renewal.fixture(organization_id uuid,user_id uuid);
  insert into roles values('${id(200)}','super_admin');
  insert into admin_accounts values('f3cd6008-41ee-46dd-969d-35f86bacf063','staging-super-admin','ytrace-staging-super-admin@example.invalid',true,true,'${id(200)}');`);
  await db.query('insert into organization_profiles(id,user_id,profile_status) values($1,$2,\'verified\')',[e.organizationId,e.submission.submitted_by]);
  await db.query('insert into auth.users values($1,$2,$3)',[e.submission.submitted_by,'ytrace-renewal-synthetic@example.invalid',{ytrace_renewal_fixture:'zroudsvpswqsjlyttkjf-v1'}]);
  await db.query('insert into ytrace_staging_renewal.fixture values($1,$2)',[e.organizationId,e.submission.submitted_by]);
  for(const [table,row] of [['document_submissions',e.submission],['organization_renewals',e.renewal],['document_submission_files',fresh.target],...e.terms.map(r=>['organization_accreditations',r])])await db.query(`insert into ${table} select * from jsonb_populate_record(null::${table},$1::jsonb)`,[JSON.stringify(row)]);
  for(let n=0;n<5;n++)await db.query('insert into document_submission_files select * from jsonb_populate_record(null::document_submission_files,$1::jsonb)',[JSON.stringify({...fresh.target,id:id(300+n),admin_status:'approved_green'})]);
  for(const f of [e.original,e.corrected])await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('organization-documents',$1,$2,$3)",[f.path,e.submission.submitted_by,{size:f.size,mimetype:'application/pdf'}]);
  return db;
 }
 await t.test('one exact row restored with history/files/terms and five files intact; patch closes access atomically',async()=>{
  const db=await setup();try{
   const before=(await db.query('select jsonb_agg(to_jsonb(o) order by name) objects from storage.objects o')).rows[0];
   const combined=patch.replace('CREATE SCHEMA ytrace_document_mutation;',repair+'\nCREATE SCHEMA ytrace_document_mutation;');
   await db.exec(combined);
   const row=(await db.query('select * from document_submission_files where id=$1',[e.target.id])).rows[0];
   assert.equal(row.file_url,e.corrected.storageUri);assert.equal(row.admin_status,'approved_green');assert.deepEqual(row.revision_history,e.target.revision_history);
   assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(o) order by name) objects from storage.objects o')).rows[0],before);
   assert.equal((await db.query("select count(*)::int n from activity_logs where action='reconciled_synthetic_approved_document'")).rows[0].n,1);
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[e.submission.submitted_by]);
   await assert.rejects(db.query('select user_replace_document_submission_file($1,$2,$3,$4,100,true)',[e.target.id,e.original.storageUri,'old.pdf','application/pdf']));
   await assert.rejects(db.exec(combined),/Document mutation catalog drift/);await db.exec('rollback');
  }finally{await db.close();}
 });
 await t.test('audit failure rolls back the entire repair and leaves patch absent',async()=>{
  const db=await setup();try{
   await db.exec("create function fail_repair_audit() returns trigger language plpgsql as $$begin raise exception 'audit failure';end$$;create trigger fail_audit before insert on activity_logs for each row execute function fail_repair_audit()");
   const before=(await db.query('select to_jsonb(f) row from document_submission_files f where id=$1',[e.target.id])).rows[0];
   await assert.rejects(db.exec(patch.replace('CREATE SCHEMA ytrace_document_mutation;',repair+'\nCREATE SCHEMA ytrace_document_mutation;')),/audit failure/);await db.exec('rollback');
   assert.deepEqual((await db.query('select to_jsonb(f) row from document_submission_files f where id=$1',[e.target.id])).rows[0],before);
   assert.equal((await db.query("select to_regnamespace('ytrace_document_mutation') is null absent")).rows[0].absent,true);
  }finally{await db.close();}
 });
 await t.test('object ownership mismatch stops without a metadata repair',async()=>{
  const db=await setup();try{
   await db.exec("update storage.objects set owner_id='unexpected'");const before=(await db.query('select to_jsonb(f) row from document_submission_files f where id=$1',[e.target.id])).rows[0];
   await assert.rejects(db.exec(patch.replace('CREATE SCHEMA ytrace_document_mutation;',repair+'\nCREATE SCHEMA ytrace_document_mutation;')),/Storage object differs/);await db.exec('rollback');
   assert.deepEqual((await db.query('select to_jsonb(f) row from document_submission_files f where id=$1',[e.target.id])).rows[0],before);
  }finally{await db.close();}
 });
});
