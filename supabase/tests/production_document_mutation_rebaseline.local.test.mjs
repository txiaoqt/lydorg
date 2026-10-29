// Isolated PostgreSQL execution using the existing PGlite runtime. No HTTP or env files.
// Actual captured production RPCs, containment guards, roles, RLS and transactions.
// Auth UID transport and digest implementation are local adapters; this is not live Auth/Storage or concurrency certification.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const dir='docs/production-security/document-mutation/rebaseline-20261011T095424Z';
const inputs=JSON.parse(await readFile(`${dir}/local-schema-inputs.json`,'utf8'));
inputs.functions.push(...JSON.parse(await readFile(`${dir}/local-extra-functions.json`,'utf8')));
const baseline=JSON.parse(await readFile(`${dir}/production-baseline.json`,'utf8'));
const expected=JSON.parse(await readFile(`${dir}/expected-production-manifest.json`,'utf8'));
const generated=JSON.parse(await readFile(`${dir}/generated-columns-readonly.json`,'utf8'));
const metadata=JSON.parse(await readFile(`${dir}/candidate-metadata.json`,'utf8'));
const candidate=await readFile(metadata.path,'utf8');
const manifestSql=await readFile(`${dir}/catalog-manifest-readonly.sql`,'utf8');
const sha=v=>createHash('sha256').update(v).digest('hex');
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const org=id(1),owner=id(2),other=id(3),sid=id(4),fid=id(5),dtype=id(6),rid=id(7),term=id(8),sa=id(9),reviewer=id(10);
const path=`${org}/renewal/${rid}/${dtype}/revisions/corrected.pdf`;
const uri=`storage://organization-documents/${path}`;
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
const results=[];
let engineVersion;
const disabled=expected.catalog.functions.filter(f=>/^(admin_(cleanup_yorp_sample|ensure_renewal_test|get_or_create_renewal_test|prepare_renewal_test|reset_renewal_test|restore_renewal_test|seed_renewal_test|seed_yorp_sample)|diversify_yorp_seed|rebalance_yorp_seed|repair_yorp_seeded)/.test(f.signature));
const dataTables=['organization_profiles','organization_accreditations','organization_renewals','document_submissions','document_submission_files','budget_requests','liquidation_reports','storage.objects','auth.users','activity_logs','notifications','admin_accounts','admin_sessions','supabase_migrations.schema_migrations'];
async function snapshot(db){
 const prior=(await db.query('select current_user role')).rows[0].role;
 assert.ok(['postgres','anon','authenticated','service_role'].includes(prior));
 // Privileged local verification is separate from each ordinary-role assertion.
 await db.exec('set role postgres');
 try{const out={};for(const table of dataTables)out[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from ${table} t`)).rows[0].rows;return out;}
 finally{await db.exec(`set role ${prior}`);}
}
async function catalog(db){return (await db.query(manifestSql)).rows[0].manifest;}
async function deniedUnchanged(db,sql,args=[],pattern=/immutable|locked|terminal|editable|authorized|authentication|required|permission denied|disabled|review|deadline|expired|cutoff/i){
 const before=await snapshot(db);await db.exec('savepoint expected_denial');
 await assert.rejects(db.query(sql,args),pattern);await db.exec('rollback to savepoint expected_denial');assert.deepEqual(await snapshot(db),before);
}
const replace=(db)=>db.query('select user_replace_document_submission_file($1,$2,$3,$4,$5,true)',[fid,uri,'corrected.pdf','application/pdf',100]);
const replaceSql='select user_replace_document_submission_file($1,$2,$3,$4,$5,true)';
const replaceArgs=[fid,uri,'corrected.pdf','application/pdf',100];
async function fixture(){
 const db=new PGlite();
 try{
 engineVersion=(await db.query('select version() version')).rows[0].version;
 await db.exec(`create role anon;create role authenticated;create role service_role;create role authenticator noinherit;
 create schema auth;create schema storage;create schema extensions;create schema ytrace_identity;create schema ytrace_production_containment;create schema supabase_migrations;
 create domain public.citext as text;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function extensions.digest(input text,algorithm text) returns bytea language plpgsql immutable strict as $$begin if algorithm<>'sha256' then raise exception 'Only SHA-256 is supported by the local adapter';end if;return sha256(convert_to(input,'UTF8'));end$$;
 create function current_user_is_admin() returns boolean language sql stable as $$select false$$;
 create function get_system_setting_bool(text,boolean) returns boolean language sql as $$select $2$$;
 create function normalize_urn(text) returns text language sql immutable as $$select upper($1)$$;
 create function generate_unique_urn(text,timestamptz) returns text language sql as $$select 'LOCAL-FICTIONAL-URN'$$;
 create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz default clock_timestamp());
 create table storage.buckets(id text primary key,public boolean);
 create table ytrace_identity.cases(id uuid,organization_id uuid,canonical_organization_id uuid,outcome text);
 create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);`);
 for(const type of inputs.enums)await db.exec(`create type public.${type.name} as enum(${type.labels.map(q).join(',')})`);
 for(const table of [...new Set(inputs.columns.map(c=>c.table))]){
  // Identity-name generated expressions are outside this document lifecycle fixture.
  // Retain their typed columns; never misrepresent a generated expression as DEFAULT.
  const cols=inputs.columns.filter(c=>c.table===table).map(c=>`"${c.name}" ${c.type}${c.default&&!generated.some(g=>g.table===table&&g.column===c.name)?' default '+c.default:''}${c.not_null?' not null':''}${c.name==='id'?' primary key':''}`);
  try{await db.exec(`create table public.${table}(${cols.join(',')})`);}
  catch(error){throw new Error(`Local table ${table}: ${error.message}; position ${error.position??'unknown'}`,{cause:error});}
 }
 for(const table of ['ypop_entries','ypop_event_participations','ypop_org_activities'])await db.exec(`create table ${table}(organization_id uuid,submitted_by uuid)`);
 for(const table of ['move_files','move_applications','urn_review_history','ypop_files','ypop_event_files','ypop_org_activity_files','compliance_remarks','inquiries'])await db.exec(`create table ${table}(organization_id uuid)`);
 await db.exec(`create table budget_request_files(budget_request_id uuid);create table liquidation_report_files(liquidation_report_id uuid);
 create table user_roles(user_id uuid,role_id int2);create table user_profiles(user_id uuid);create table user_policy_acceptance(user_id uuid);
 insert into roles(id,code,label,permission_codes) values(1,'super_admin','Local SA','{}'),(2,'admin','Local reviewer',array['registrations_management']);
 insert into admin_accounts(id,username,password_hash,email,display_name,role_id) values('${sa}','local-sa','NOT-A-LOGIN-HASH','local-sa@example.invalid','Local SA',1),('${reviewer}','local-reviewer','NOT-A-LOGIN-HASH','local-reviewer@example.invalid','Local reviewer',2);
 insert into admin_sessions(admin_id,token_hash,expires_at) values('${sa}',encode(extensions.digest('local-sa','sha256'),'hex'),now()+interval '1 hour'),('${reviewer}',encode(extensions.digest('local-reviewer','sha256'),'hex'),now()+interval '1 hour'),('${sa}',encode(extensions.digest('local-expired','sha256'),'hex'),now()-interval '1 hour');
 insert into admin_sessions(admin_id,token_hash,expires_at,revoked_at) values('${sa}',encode(extensions.digest('local-revoked','sha256'),'hex'),now()+interval '1 hour',now());
 insert into auth.users values('${owner}','local-owner@example.invalid','{}','{}'),('${other}','local-other@example.invalid','{}','{}');
 insert into organization_profiles(id,user_id,organization_name,organization_email,contact_number,barangay,profile_status,urn) values('${org}','${owner}','Local fictional A','local-a@example.invalid','000','Local','verified','LOCAL-A'),('${other}','${other}','Local fictional B','local-b@example.invalid','000','Local','verified','LOCAL-B');
 insert into organization_accreditations(id,organization_id,term_number,start_date,end_date,certificate_urn,status) values('${term}','${org}',1,current_date-1065,current_date+30,'LOCAL-A','active');
 update organization_profiles set current_accreditation_id='${term}' where id='${org}';
 insert into organization_renewals(id,organization_id,status,current_accreditation_id,cycle_number) values('${rid}','${org}','needs_revision','${term}',2);
 insert into document_submissions(id,organization_id,submitted_by,status,renewal_id,submission_scope) values('${sid}','${org}','${owner}','needs_revision','${rid}','renewal');
 insert into required_document_types(id,name,is_active,is_required,scope,template_scope) values('${dtype}','Local PDF',true,true,'both','document_submission');
 insert into document_submission_files(id,submission_id,document_type_id,file_url,file_name,file_type,file_size,admin_status,revision_history,revision_requested_at,revision_due_at) values('${fid}','${sid}','${dtype}','storage://organization-documents/${org}/renewal/${rid}/${dtype}/original.pdf','original.pdf','application/pdf',100,'needs_revision','[]',now()-interval '1 hour',now()+interval '1 day');
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('organization-documents','${path}','${owner}','{"size":100,"mimetype":"application/pdf"}');
 insert into storage.buckets values('organization-documents',false);
 insert into budget_requests(id,organization_id,submitted_by,activity_title,venue) values('${id(50)}','${org}','${owner}','Local budget','Local');
 insert into liquidation_reports(id,budget_request_id,organization_id,submitted_by) values('${id(51)}','${id(50)}','${org}','${owner}');`);
 for(let n=0;n<5;n++)await db.query("insert into document_submission_files(id,submission_id,file_url,file_name,file_type,file_size,admin_status) values($1,$2,$3,$4,'application/pdf',100,'under_admin_review')",[id(20+n),sid,`storage://organization-documents/peer-${n}.pdf`,`peer-${n}.pdf`]);
 await db.exec(`insert into auth.users values('${id(61)}','local-registration@example.invalid','{}','{}');
 insert into organization_profiles(id,user_id,organization_name,organization_email,contact_number,barangay,profile_status) values('${id(60)}','${id(61)}','Local registration','local-registration@example.invalid','000','Local','pending_review');
 insert into document_submissions(id,organization_id,submitted_by,status,submission_scope) values('${id(62)}','${id(60)}','${id(61)}','needs_revision','registration');
 insert into document_submission_files(id,submission_id,document_type_id,file_url,file_name,file_type,file_size,admin_status,revision_requested_at,revision_due_at) values
 ('${id(63)}','${id(62)}','${dtype}','storage://organization-documents/${id(60)}/${dtype}/original.pdf','registration-original.pdf','application/pdf',100,'needs_revision',now()-interval '1 hour',now()+interval '1 day'),
 ('${id(64)}','${id(62)}',null,'storage://organization-documents/registration-peer.pdf','registration-peer.pdf','application/pdf',100,'approved_green',null,null);
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('organization-documents','${id(60)}/${dtype}/revisions/corrected.pdf','${id(61)}','{"size":100,"mimetype":"application/pdf"}');`);
 for(const row of baseline.migration_records)await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[row.version,row.name,['LOCAL CATALOG PLACEHOLDER; no migration replay']]);
 // Captured functions are current post-containment definitions; no legacy password-bearing body is read.
 for(const f of inputs.functions)await db.exec(f.definition);
 for(const f of inputs.functions){
  const recorded=expected.catalog.functions.find(x=>x.signature===f.signature);
  await db.exec(`revoke all on function ${f.signature} from public,anon,authenticated,service_role`);
  for(const acl of recorded?.acl??[]){if(acl.grantee!=='postgres')await db.exec(`grant execute on function ${f.signature} to ${acl.grantee==='PUBLIC'?'public':acl.grantee}${acl.grantable?' with grant option':''}`);}
 }
 await db.exec(`revoke all on schema ytrace_production_containment from public,anon,authenticated,service_role;
 create trigger trg_a_identity_privileges before insert or update on organization_profiles for each row execute function guard_organization_identity_privileges();
 create trigger trg_accreditation_immutability before update or delete on organization_accreditations for each row execute function enforce_accreditation_immutability();
 create trigger trg_sync_organization_accreditation_projection after insert or update on organization_accreditations for each row execute function sync_organization_accreditation_projection();
 create trigger trg_renewal_terminal_immutability before update or delete on organization_renewals for each row execute function enforce_renewal_terminal_immutability();
 create trigger trg_guard_submitted_registration_document_edits before update or delete on document_submission_files for each row execute function guard_submitted_registration_document_edits();
 create trigger trg_document_submission_files_updated_at before update on document_submission_files for each row execute function set_updated_at();
 create trigger trg_promote_renewal_files_for_admin_review after update on document_submissions for each row execute function promote_renewal_submission_files_for_review();
 grant usage on schema auth,extensions,storage to anon,authenticated,service_role;
 grant select on storage.objects to anon,authenticated,service_role;
 -- Broad synthetic table grants keep trigger/RPC checks observable independently of grant-only denials.
 grant all on all tables in schema public to anon,authenticated,service_role;`);
 for(const table of ['budget_requests','liquidation_reports','document_submissions','document_submission_files'])await db.exec(`create trigger a_production_fixture_markers_guard before insert or update on ${table} for each row execute function ytrace_production_containment.freeze_fixture_markers()`);
 for(const table of ['organization_profiles','organization_renewals','organization_accreditations','document_submissions','document_submission_files'])await db.exec(`alter table ${table} enable row level security`);
 for(const p of baseline.policies.filter(p=>p.schemaname==='public'))await db.exec(`create policy "${p.policyname}" on ${p.tablename} as ${p.permissive.toLowerCase()} for ${p.cmd} to ${p.roles.map(r=>r==='public'?'public':`"${r}"`).join(',')} ${p.qual?'using ('+p.qual+')':''} ${p.with_check?'with check ('+p.with_check+')':''}`);
 await db.exec(`alter table storage.objects enable row level security;create policy local_storage_owner on storage.objects for select to authenticated using(owner_id=auth.uid()::text);select set_config('request.jwt.claim.sub','${owner}',false)`);
 const localExpected=await catalog(db);
 // Only the pinned expected-catalog literal changes for the declared synthetic schema. Gate SQL/body stays intact.
 const localCandidate=candidate.replace(/\$expected_catalog\$[\s\S]*?\$expected_catalog\$/,()=>`$expected_catalog$${JSON.stringify(localExpected)}$expected_catalog$`);
 return {db,localCandidate,localExpected};
 }catch(error){await db.close();throw error;}
}

test('rebaselined artifact scope and body integrity',async()=>{
 const historical=await readFile(metadata.historicalPath,'utf8');
 assert.equal(sha(historical),metadata.historicalSha256);assert.equal(sha(candidate),metadata.sha256);
 const body=s=>s.slice(s.indexOf('END $production_gate$;')+'END $production_gate$;'.length);
 assert.equal(body(candidate),body(historical));assert.equal(sha(body(candidate)),metadata.unchangedBodySha256);
 assert.equal(disabled.length,12);assert.equal(metadata.newMigrationReceipt,null);
 assert.doesNotMatch(body(candidate),/ytrace_production_containment|a_production_fixture_markers_guard|supabase_migrations|ytrace_staging_renewal/);
 assert.doesNotMatch(candidate,/^\s*(?:CREATE|ALTER|DROP) POLICY|DISABLE TRIGGER|^\s*(?:UPDATE|INSERT INTO|DELETE FROM) auth\./im);
 results.push({check:'Historical artifact preserved; executable patch body byte-identical; no Auth/Storage/fixture/history writes',status:'PASS'});
});

test('post-containment document lifecycle actual PostgreSQL matrix',async t=>{
 const {db,localCandidate,localExpected}=await fixture();
 try{
  await t.test('unmodified production candidate rejects this synthetic catalog',async()=>{
   const before=await snapshot(db);await assert.rejects(db.exec(candidate),/catalog drift/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);results.push({check:'Untouched production gate fails closed locally',status:'PASS'});
  });
  await t.test('exact patch bodies install with unchanged business rows, containment and migration history',async()=>{
   const before=await snapshot(db);const protectedFns=await containmentCatalog(db);
   const roundtrip=[];
   for(const f of inputs.functions){const actual=(await db.query('select md5(pg_get_functiondef(to_regprocedure($1))) md5',[f.signature])).rows[0].md5;roundtrip.push({signature:f.signature,productionMd5:f.md5,localMd5:actual,match:actual===f.md5});}
   await writeFile(`${dir}/captured-function-roundtrip.json`,JSON.stringify({engineVersion,functions:roundtrip},null,2)+'\n');
   assert.ok(roundtrip.every(f=>f.match),'Captured production definitions must round-trip without code changes');
   await db.exec(localCandidate);assert.deepEqual(await snapshot(db),before);assert.deepEqual(await containmentCatalog(db),protectedFns);
   assert.equal((await db.query("select count(*)::int n from pg_trigger where tgname in ('a_document_mutation_guard','b_document_direct_guard','a_document_parent_guard') and tgenabled='O'")).rows[0].n,3);
   const postFunctions=(await db.query("select p.oid::regprocedure::text signature,md5(pg_get_functiondef(p.oid)) definition_md5,md5(p.prosrc) source_md5,pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('user_replace_document_submission_file','replace_organization_document_file','update_admin_document_submission_file_review','user_submit_renewal','user_resubmit_renewal','guard_direct_document_mutation','guard_document_parent_mutation')) or n.nspname='ytrace_document_mutation' order by signature")).rows;
   await writeFile(`${dir}/expected-post-install-functions.local.json`,JSON.stringify({scope:'Definition/source hashes measured in isolated PostgreSQL. New-function ACL strings are local observations, not a replacement for production default-privilege review. Corroborate on the target after separately authorized installation.',functions:postFunctions},null,2)+'\n');
   results.push({check:'Exact patch body installs atomically; all rows/containment/history unchanged',status:'PASS'});
  });
  await t.test('operator post-install verifier recognizes the installed guards and preserved authorization',async()=>{
   const sql=await readFile(`${dir}/post-install-verify-readonly.sql`,'utf8');
   const statements=await db.exec(sql);const v=statements.find(s=>s.rows?.[0]?.verification)?.rows[0].verification;
   await writeFile(`${dir}/post-install-verifier.local.json`,JSON.stringify(v,null,2)+'\n');
   assert.ok(v);
   for(const key of ['all_patch_functions_match','unchanged_catalog_functions_match','new_triggers_match','containment_marker_triggers_match','containment_helper_unchanged','admin_review_acl_unchanged'])assert.equal(v[key],true,key);
   assert.ok(v.owner_rpc_grants.every(r=>r.authenticated&&!r.anon&&!r.public_execute));
   assert.ok(v.new_guard_api_execute.every(r=>!r.anon&&!r.authenticated));
   assert.ok(v.private_schema_api_access.every(r=>!r.usage&&!r.create));
   assert.equal(v.migration_history.count,164);assert.equal(v.migration_history.latest,'20261011230000');assert.equal(v.migration_history.complete_history_md5,localExpected.complete_history_md5);
   results.push({check:'Read-only operator post-install verifier validates functions, triggers, grants and preserved history locally',status:'PASS'});
  });
  async function run(name,fn){await t.test(name,async()=>{await db.exec('begin');try{await fn();results.push({check:name,status:'PASS'});}finally{await db.exec('rollback');}});}
  await run('requested renewal revision changes one file, preserves five peers and resubmits',async()=>{
   const peers=(await db.query('select to_jsonb(f) row from document_submission_files f where submission_id=$2 and id<>$1 order by id',[fid,sid])).rows;
   await db.exec('set local role authenticated');await replace(db);await db.query('select user_resubmit_renewal($1)',[rid]);await db.exec('reset role');
   const row=(await db.query('select * from document_submission_files where id=$1',[fid])).rows[0];assert.equal(row.file_url,uri);assert.equal(row.revision_history.length,1);
   assert.equal((await db.query('select status from organization_renewals where id=$1',[rid])).rows[0].status,'resubmitted');
   // Promotion may update review statuses/timestamps on resubmission; file content and ownership remain intact.
   const peerContent=rows=>rows.map(({row})=>({id:row.id,submission_id:row.submission_id,file_url:row.file_url,file_name:row.file_name,file_type:row.file_type,file_size:row.file_size,revision_history:row.revision_history}));
   assert.deepEqual(peerContent((await db.query('select to_jsonb(f) row from document_submission_files f where submission_id=$2 and id<>$1 order by id',[fid,sid])).rows),peerContent(peers));
  });
  await run('normal registration requested revision preserves the peer and original revision history',async()=>{
   const regPath=`storage://organization-documents/${id(60)}/${dtype}/revisions/corrected.pdf`;
   const peer=(await db.query('select to_jsonb(f) row from document_submission_files f where id=$1',[id(64)])).rows[0];
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(61)]);await db.exec('set local role authenticated');
   await db.query('select replace_organization_document_file($1,$2,(select updated_at from document_submission_files where id=$1),$3,$4,$5,$6)',[id(63),dtype,regPath,'registration-corrected.pdf','application/pdf',100]);await db.exec('reset role');
   const corrected=(await db.query('select * from document_submission_files where id=$1',[id(63)])).rows[0];assert.equal(corrected.file_url,regPath);assert.equal(corrected.revision_history.length,1);assert.equal(corrected.admin_status,'under_admin_review');
   assert.deepEqual((await db.query('select to_jsonb(f) row from document_submission_files f where id=$1',[id(64)])).rows[0],peer);
  });
  await run('API grants preserve authenticated owner RPCs and custom Admin anon review transport',async()=>{
   for(const signature of ['user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)','replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)','user_submit_renewal(uuid)','user_resubmit_renewal(uuid)']){
    assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') ok",[signature])).rows[0].ok,true);
    assert.equal((await db.query("select has_function_privilege('anon',$1,'EXECUTE') ok",[signature])).rows[0].ok,false);
   }
   assert.equal((await db.query("select has_function_privilege('anon','update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','EXECUTE') ok")).rows[0].ok,true);
  });
  for(const terminal of ['approved','rejected'])await run(`${terminal} renewal and associated documents deny both replacement RPCs and direct writes`,async()=>{
   await db.query('update organization_renewals set status=$1 where id=$2',[terminal,rid]);
   await deniedUnchanged(db,replaceSql,replaceArgs);
   await deniedUnchanged(db,'select replace_organization_document_file($1,$2,(select updated_at from document_submission_files where id=$1),$3,$4,$5,$6)',[fid,dtype,uri,'corrected.pdf','application/pdf',100]);
   await deniedUnchanged(db,"update document_submission_files set file_name='forged.pdf' where id=$1",[fid]);
   await deniedUnchanged(db,"update organization_renewals set status='draft' where id=$1",[rid]);
   await deniedUnchanged(db,'delete from organization_renewals where id=$1',[rid]);
  });
  for(const terminal of ['approved_green','rejected_red'])await run(`${terminal} submission blocks content mutations and owner deletion`,async()=>{
   await db.query('update document_submissions set status=$1 where id=$2',[terminal,sid]);
   await deniedUnchanged(db,replaceSql,replaceArgs);await db.exec('set local role authenticated');await deniedUnchanged(db,'delete from document_submission_files where id=$1',[fid],/Use the supported revision workflow/);await db.exec('reset role');
  });
  for(const status of ['under_admin_review','approved_green','rejected_red'])await run(`${status} file content is immutable through owner replacement`,async()=>{
   await db.query('update document_submission_files set admin_status=$1 where id=$2',[status,fid]);await deniedUnchanged(db,replaceSql,replaceArgs);
  });
  await run('cross-organization and anonymous RPC mutation denied without changed rows',async()=>{
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);await db.exec('set local role authenticated');await deniedUnchanged(db,replaceSql,replaceArgs);await db.exec('reset role');
   await db.exec("select set_config('request.jwt.claim.sub','',true)");await deniedUnchanged(db,replaceSql,replaceArgs);await db.exec('set local role anon');await deniedUnchanged(db,replaceSql,replaceArgs);await db.exec('reset role');
  });
  await run('direct cross-organization RLS updates affect zero rows',async()=>{
   const before=await snapshot(db);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);await db.exec('set local role authenticated');
   const r=await db.query("update document_submission_files set file_name='forged.pdf' where id=$1 returning id",[fid]);assert.equal(r.rows.length,0);await db.exec('reset role');assert.deepEqual(await snapshot(db),before);
  });
  await run('suspended owner replacement and resubmission denied',async()=>{
   await db.query("update organization_profiles set profile_status='suspended_inactive' where id=$1",[org]);await deniedUnchanged(db,replaceSql,replaceArgs);await deniedUnchanged(db,'select user_resubmit_renewal($1)',[rid]);
  });
  await run('genuine captured Admin validator accepts active reviewer and denies invalid/expired/revoked sessions',async()=>{
   await replace(db);await db.exec("select set_config('request.jwt.claim.sub','',true);set local role anon");
   for(const token of ['local-invalid','local-expired','local-revoked'])await deniedUnchanged(db,"select update_admin_document_submission_file_review($1,$2,'approved_green',null)",[token,fid]);
   await db.query("select update_admin_document_submission_file_review('local-reviewer',$1,'approved_green',null)",[fid]);await db.exec('reset role');
   assert.equal((await db.query('select admin_status from document_submission_files where id=$1',[fid])).rows[0].admin_status,'approved_green');
  });
  await run('inactive Admin is denied and no review state changes',async()=>{
   await replace(db);await db.query('update admin_accounts set is_active=false where id=$1',[reviewer]);await deniedUnchanged(db,"select update_admin_document_submission_file_review('local-reviewer',$1,'approved_green',null)",[fid]);
  });
  await run('normal full Admin approval creates one next term then terminal replacement stays denied',async()=>{
   await replace(db);await db.query('select user_resubmit_renewal($1)',[rid]);await db.exec("select set_config('request.jwt.claim.sub','',true);set local role anon");
   for(const f of [fid,...Array.from({length:5},(_,n)=>id(20+n))])await db.query("select update_admin_document_submission_file_review('local-reviewer',$1,'approved_green',null)",[f]);
   const response=(await db.query("select admin_approve_renewal('local-reviewer',$1,'LOCAL-RENEWED','Local review') data",[rid])).rows[0].data;assert.equal(response.success,true);await db.exec('reset role');
   assert.equal((await db.query('select status from organization_renewals where id=$1',[rid])).rows[0].status,'approved');
   const terms=(await db.query('select term_number,status,start_date::text,end_date::text from organization_accreditations order by term_number')).rows;
   assert.equal(terms.length,2);assert.equal(terms[0].status,'superseded');assert.equal(terms[1].status,'active');assert.equal(terms[1].start_date,terms[0].end_date);
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);await deniedUnchanged(db,replaceSql,replaceArgs);
  });
  for(const role of ['authenticated','postgres'])for(const table of ['budget_requests','liquidation_reports','document_submissions','document_submission_files'])await run(`${role}: ${table} fixture markers remain protected after patch`,async()=>{
   const row=(await db.query(`select id from ${table} order by id limit 1`)).rows[0].id;await db.exec(`set local role ${role}`);
   // The alphabetically earlier parent guard denies ordinary clients first.
   // postgres cases below prove the containment marker guard itself still denies definer/owner writes.
   const expectedError=role==='authenticated'&&table==='document_submissions'?/Submission review fields are server controlled/:/fixture markers/;
   await deniedUnchanged(db,`update ${table} set is_seeded_sample_data=true where id=$1`,[row],expectedError);
   await deniedUnchanged(db,`update ${table} set seed_batch='FORGED' where id=$1`,[row],expectedError);await db.exec('reset role');
  });
  await run('identity markers and test GUC cannot bypass accreditation/renewal immutability',async()=>{
   await db.exec("select set_config('app.allow_test_scenario_prep','true',true)");await deniedUnchanged(db,"update organization_profiles set is_renewal_test_account=true where id=$1",[org],/fixture markers/);
   await deniedUnchanged(db,'update organization_accreditations set end_date=current_date+10 where id=$1',[term]);
   await db.query("update organization_renewals set status='approved' where id=$1",[rid]);await deniedUnchanged(db,"update organization_renewals set status='draft' where id=$1",[rid]);
  });
  for(const role of ['anon','authenticated','service_role','postgres'])await run(`${role}: all 12 test mutation RPCs remain disabled`,async()=>{
   await db.exec(`set local role ${role}`);
   for(const f of disabled){
    const args=f.signature.startsWith('repair_')?[org,owner,sa,{},'local']:f.signature.includes('(text,integer,date)')?['local-sa',30,null]:f.signature.includes('(text,text)')?['local-sa','LOCAL']:f.signature.endsWith('(text)')?['local-sa']:[];
    await deniedUnchanged(db,`select ${f.signature.slice(0,f.signature.indexOf('('))}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args,/permission denied|disabled/);
   }
   await db.exec('reset role');assert.equal((await db.query('select is_development_or_test_environment() ok')).rows[0].ok,false);
  });
  await run('retained sample status retains Super Admin enforcement over anon transport',async()=>{
   await db.exec('set local role anon');await deniedUnchanged(db,"select admin_get_yorp_sample_dataset_status('local-reviewer')",[],/Super Admin/);
   assert.equal((await db.query("select admin_get_yorp_sample_dataset_status('local-sa') data")).rows[0].data.is_development_or_test_environment,false);await db.exec('reset role');
  });
  await run('replacement audit failure rolls back file/history/parent changes',async()=>{
   await db.exec("create function local_fail_audit() returns trigger language plpgsql as $$begin raise exception 'injected audit failure';end$$;create trigger local_fail_audit before insert on activity_logs for each row execute function local_fail_audit()");
   await deniedUnchanged(db,replaceSql,replaceArgs,/injected audit failure/);
  });
  await run('second installation is rejected without data changes',async()=>{
   const before=await snapshot(db);await assert.rejects(db.exec(localCandidate),/catalog drift/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
   // The failed candidate owns its BEGIN; restart the enclosing test transaction for uniform cleanup.
   await db.exec('begin');
  });
 }finally{await db.close();}
});

async function containmentCatalog(db){
 const m=await catalog(db);
 return {functions:m.catalog.functions.filter(f=>/renewal_test|yorp_sample|seed_projects|seed_reporting|seeded_fixture|environment|enforce_accreditation|enforce_renewal_terminal|guard_organization_identity_privileges/.test(f.signature)),helper:m.containment_helper,schema:m.containment_schema,triggers:m.trigger_dependencies.filter(t=>t.name==='a_production_fixture_markers_guard'),environment:m.environment_guard,history:m.complete_history_md5};
}

test('new exact gates and atomic rollback',async t=>{
 const {db,localCandidate}=await fixture();
 try{
  const drifts=[
   ['migration version/name',"update supabase_migrations.schema_migrations set name='unexpected' where version='20261011230000'"],
   ['migration statements',"update supabase_migrations.schema_migrations set statements=array['unexpected'] where version='20261011230000'"],
   ['missing migration receipt',"delete from supabase_migrations.schema_migrations where version='20261011230000'"],
   ['RPC function body',"alter function user_resubmit_renewal(uuid) set search_path=pg_catalog,public"],
   ['RPC ACL',"revoke execute on function user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) from authenticated"],
   ['RPC owner',"alter function user_resubmit_renewal(uuid) owner to service_role"],
   ['fixture trigger disabled',"alter table document_submission_files disable trigger a_production_fixture_markers_guard"],
   ['fixture trigger missing',"drop trigger a_production_fixture_markers_guard on document_submissions"],
   ['containment helper grant',"grant execute on function ytrace_production_containment.freeze_fixture_markers() to authenticated"],
   ['containment private schema grant',"grant usage on schema ytrace_production_containment to authenticated"],
   ['test-only RPC reenabled',"grant execute on function admin_reset_renewal_test_scenario(text) to anon"],
   ['environment guard changed',"create or replace function is_development_or_test_environment() returns boolean language sql stable as $$select true$$"],
   ['RLS disabled',"alter table document_submission_files disable row level security"],
   ['table column changed',"alter table document_submissions add column unexpected text"],
   ['table constraint changed',"alter table document_submissions add constraint unexpected_check check (id is not null)"],
   ['Storage policy changed',"create policy unexpected_storage on storage.objects for select to anon using(true)"],
   ['role inheritance changed',"alter role authenticated noinherit"],
   ['namespace collision',"create schema ytrace_document_mutation"],
   ['guard trigger-name collision',"create trigger a_document_parent_guard before update on budget_requests for each row execute function ytrace_production_containment.freeze_fixture_markers()"]
  ];
  for(const [name,drift] of drifts)await t.test(`${name} fails closed before installation`,async()=>{
   const original=await catalog(db);await db.exec('begin');await db.exec(drift);const before=await snapshot(db);
   await assert.rejects(db.exec(localCandidate),/catalog drift|migration history drift/);await db.exec('rollback');assert.deepEqual(await catalog(db),original);
   assert.equal((await db.query("select to_regnamespace('ytrace_document_mutation') is null absent")).rows[0].absent,true);
   assert.equal((await db.query("select to_regprocedure('public.guard_direct_document_mutation()') is null and to_regprocedure('public.guard_document_parent_mutation()') is null absent")).rows[0].absent,true);
   assert.ok(before);results.push({check:`Drift gate: ${name}`,status:'PASS'});
  });
  await t.test('failure after all new functions/triggers/grants restores full original catalog and rows',async()=>{
   const beforeCatalog=await catalog(db),beforeRows=await snapshot(db);
   const failed=localCandidate.replace(/COMMIT;\s*$/,"DO $injected_failure$ BEGIN RAISE EXCEPTION 'injected precommit failure'; END $injected_failure$;\nCOMMIT;");
   await assert.rejects(db.exec(failed),/injected precommit failure/);await db.exec('rollback');
   assert.deepEqual(await catalog(db),beforeCatalog);assert.deepEqual(await snapshot(db),beforeRows);
   assert.equal((await db.query("select to_regnamespace('ytrace_document_mutation') is null absent")).rows[0].absent,true);
   results.push({check:'Injected final failure rolls back every RPC/trigger/grant and all rows',status:'PASS'});
  });
 }finally{await db.close();}
});

test.after(async()=>{
 await writeFile(`${dir}/local-sql-results.json`,JSON.stringify({engine:'Existing PGlite / actual PostgreSQL',engineVersion,candidateSha256:metadata.sha256,results,passed:results.filter(r=>r.status==='PASS').length,scope:'Synthetic isolated rows and current captured production functions. Same SQL gate with only expected-catalog literal substituted locally. Real RLS predicates on scoped tables; Auth UID/digest/ordinary-admin helper and URN generation have declared local adapters. Generated identity-name expressions are represented by typed nullable columns; unrelated identity name derivation is not certified. No live HTTP, hosted Supabase Auth/Storage, physical devices or multi-session concurrency certification.',productionWrites:false,stagingWrites:false,concurrency:'NOT TESTED; single PGlite connection'},null,2)+'\n');
});
