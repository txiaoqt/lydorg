// Actual candidate SQL in isolated PostgreSQL/PGlite. No live HTTP or writes.
// Auth UID and token digest are synthetic; this is NOT Supabase JWT/API validation.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uid, foundation, cutover, installBaseline } from './storage_fixture_schema.mjs';
const privateBuckets=['organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files'];
const evidence=[];
const outcome=async (db,sql,params=[])=>{
  await db.exec('begin');
  try{return {rows:(await db.query(sql,params)).rows};}
  catch(e){return {denied:e.code};}
  finally{await db.exec('rollback');}
};
async function install(db) {
  await installBaseline(db);
  await db.exec('begin');await db.exec(foundation);await db.exec('commit');
  await db.query("select ytrace_storage_private.register_trusted_storage_origin($1,'local compatibility test')",['https://fixture.supabase.co']);
  await db.exec("begin;set local app.storage_remediation_validated='on'");await db.exec(cutover);await db.exec('commit');
}
async function admins(db) {
  for(const [n,code,permissions,active,expires,revoked] of [
    [800,'super_admin',[],true,'2099-01-01',null],
    [801,'reviewer',['registrations_management','budget_requests_review','liquidation_reports_review','ypop_validation_review'],true,'2099-01-01',null],
    [802,'limited',[],true,'2099-01-01',null],
    [803,'super_admin',[],true,'2000-01-01',null],
    [804,'super_admin',[],true,'2099-01-01','2026-01-01'],
    [805,'super_admin',[],false,'2099-01-01',null],
  ]){
    await db.query('insert into roles values($1,$2,$2,$3)',[uid(n),code,permissions]);
    await db.query('insert into admin_accounts values($1,$2::text::citext,$2::text::citext,$2::text,$3,$4)',[uid(n),String(n),active,uid(n)]);
    await db.query("insert into admin_sessions values($1,encode(extensions.digest($2,'sha256'),'hex'),$3,$4,null)",[uid(n),'fixture-'+n,revoked,expires]);
  }
}
const sign=(db,n,bucket,path)=>outcome(db,"select public.admin_authorize_storage_operation($1,'sign',$2,$3,null) as grant",['fixture-'+n,bucket,path]);

test('candidate SQL preserves owner/reviewer access, history and lifecycle restrictions',async()=>{
  const db=new PGlite();
  try{
    await install(db);await admins(db);
    const org=uid(11),other=uid(12),user=uid(1),type=uid(90),sub=uid(31),parent=uid(51);
    await db.query("insert into organization_profiles(id,user_id,profile_status) values($1,$2,'verified'),($3,$4,'verified'),($5,$6,'suspended_inactive')",[org,user,other,uid(2),uid(13),uid(3)]);
    await db.query("insert into required_document_types values($1,$2,true,'Fixture')",[type,'storage://template-files/'+type+'/active.pdf']);
    await db.query("insert into document_submissions(id,organization_id,submission_scope,status) values($1,$2,'registration','needs_revision')",[sub,org]);
    const docPath=org+'/'+type+'/current.pdf',oldPath=org+'/'+type+'/historical.pdf';
    await db.query("insert into document_submission_files(id,submission_id,document_type_id,file_url,admin_status,revision_history,revision_due_at) values($1,$2,$3,$4,'needs_revision',$5,'2099-01-01')",[uid(41),sub,type,'storage://organization-documents/'+docPath,JSON.stringify([{fileUrl:'storage://organization-documents/'+oldPath}])]);
    await db.query("insert into budget_requests(id,organization_id,status) values($1,$2,'under_review')",[parent,org]);
    await db.query('insert into budget_request_files values($1,$2,$3)',[uid(61),parent,'storage://budget-request-files/'+parent+'/file.pdf']);
    await db.query("insert into liquidation_reports values($1,$2,$3,'submitted')",[uid(52),org,parent]);
    await db.query('insert into liquidation_report_files values($1,$2,$3)',[uid(62),uid(52),'storage://liquidation-report-files/'+uid(52)+'/file.pdf']);
    await db.query("insert into ypop_entries values($1,$2,'submitted','2026-S2')",[uid(53),org]);
    await db.query('insert into ypop_files values($1,$2,$3,$4)',[uid(63),uid(53),org,'storage://ypop-files/'+uid(53)+'/file.pdf']);
    await db.query("insert into move_applications values($1,$2,'submitted')",[uid(54),org]);
    await db.query('insert into move_files values($1,$2,$3,$4)',[uid(64),uid(54),org,'storage://move-files/'+uid(54)+'/file.pdf']);
    const paths=[[privateBuckets[0],docPath],[privateBuckets[1],parent+'/file.pdf'],[privateBuckets[2],uid(52)+'/file.pdf'],[privateBuckets[3],uid(53)+'/file.pdf'],[privateBuckets[4],uid(54)+'/file.pdf'],[privateBuckets[0],oldPath]];
    for(const [b,p] of paths)await db.query('insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)',[b,p,user]);
    await db.query('insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)',[privateBuckets[1],uid(999)+'/unlinked.pdf',user]);
    for(const [identity,role,who,count] of [['owner','authenticated',user,6],['other','authenticated',uid(2),0],['anonymous','anon','',0],['suspended','authenticated',uid(3),0]]){
      await db.query("select set_config('test.uid',$1,false)",[who]);await db.exec('set role '+role);
      const rows=(await db.query("select bucket_id,name from storage.objects")).rows;assert.equal(rows.length,count,identity);
      await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-800','sign',$1,$2,null)",paths[0]),/permission denied/);
      await db.exec('reset role');evidence.push({test:identity+' private visibility',status:'PASS',rows:count});
    }
    await db.exec('set role service_role');
    for(const [b,p] of paths){
      assert.ok((await sign(db,800,b,p)).rows,'Super Admin');
      assert.equal(!!(await sign(db,801,b,p)).rows,b!=='move-files','reviewer mapping');
      for(const n of [802,803,804,805])assert.equal((await sign(db,n,b,p)).denied,'42501');
    }
    for(const [b,p] of [[privateBuckets[1],uid(999)+'/unlinked.pdf'],[privateBuckets[1],parent+'/unknown.pdf'],[privateBuckets[1],docPath]])assert.equal((await sign(db,800,b,p)).denied,'42501');
    await db.exec('reset role');
    // The owner can read a newly uploaded, not-yet-linked object ONLY under an
    // actual owned parent; Admin signing still requires the exact metadata link.
    await db.query('insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)',[privateBuckets[1],parent+'/unknown.pdf',user]);
    await db.query("select set_config('test.uid',$1,false)",[user]);await db.exec('set role authenticated');
    assert.equal((await db.query('select name from storage.objects where bucket_id=$1 and name=$2',[privateBuckets[1],parent+'/unknown.pdf'])).rows.length,1);
    assert.equal((await db.query('select name from storage.objects where name=$1',[uid(999)+'/unlinked.pdf'])).rows.length,0);
    assert.equal((await outcome(db,"update storage.objects set name='changed' returning id")).rows.length,0);
    assert.equal((await outcome(db,"delete from storage.objects where name=$1 returning id",[docPath])).rows.length,0,'revision evidence retained');
    const revision=org+'/'+type+'/revisions/new.pdf';
    assert.equal((await outcome(db,'insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3) returning id',[privateBuckets[0],revision,user])).rows.length,1,'eligible replacement upload');
    await db.exec('reset role');
    await db.query("update document_submission_files set admin_status='approved_green' where id=$1",[uid(41)]);
    await db.exec('set role authenticated');
    assert.equal((await outcome(db,'insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3) returning id',[privateBuckets[0],revision,user])).denied,'42501','approved replacement upload denied');
    assert.equal((await outcome(db,'delete from storage.objects where name=$1 returning id',[docPath])).rows.length,0,'approved bytes retained');
    await db.exec('reset role');
    evidence.push({test:'five buckets, historical revision, custom Admin permissions/expiry/revocation, unknown path and terminal locks',status:'PASS',scope:'synthetic PostgreSQL only'});
  }finally{await db.close();}
});

const snapshotDirectory=process.env.YTRACE_STORAGE_REVIEW_INPUT;
test('read-only production metadata projection resolves supported references and denies unmatched files',{skip:!snapshotDirectory},async()=>{
  const trace=JSON.parse(await readFile(resolve(snapshotDirectory,'object-trace.json'),'utf8'));
  const analyzed=JSON.parse(await readFile(resolve(snapshotDirectory,'analyzed-objects.json'),'utf8'));
  assert.equal(trace.read_only,'on');
  const db=new PGlite();
  try{
    await installBaseline(db);
    for(const o of trace.organizations)await db.query('insert into organization_profiles values($1,$2,$3,$4,$5)',[o.id,o.user_id,o.profile_status,o.profile_image_url,o.directory_visibility]);
    for(const t of trace.templates)await db.query('insert into required_document_types values($1,$2,$3,$4)',[t.id,t.template_url,t.active,'redacted']);
    for(const n of trace.news)await db.query('insert into news_releases values($1,$2,$3)',[n.id,n.image_url,n.status]);
    const allowed={
      document_submissions:['id','organization_id','submission_scope','renewal_id','status','created_at'],
      budget_requests:['id','organization_id','status','revision_locked','revision_locked_at','revision_unlocked_at','revision_due_at'],
      liquidation_reports:['id','organization_id','budget_request_id','status'],
      ypop_entries:['id','organization_id','status','semester'],
      ypop_event_participations:['id','organization_id','status'],
      ypop_org_activities:['id','organization_id','ypop_entry_id','status'],
      move_applications:['id','organization_id','status'],
    };
    for(const p of trace.parents){
      const d=p.details??{},row={id:p.id,organization_id:p.organization_id,status:p.status,created_at:p.created_at,...d,submission_scope:d.scope};
      const cols=allowed[p.source];assert.ok(cols,'known parent table');
      await db.query('insert into '+p.source+'('+cols.join(',')+') values('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',cols.map(c=>row[c]??null));
    }
    const fileColumns={
      document_submission_files:['id','submission_id','document_type_id','file_url','admin_status','revision_history','revision_locked','revision_locked_at','revision_unlocked_at','revision_due_at'],
      budget_request_files:['id','budget_request_id','file_url'],
      liquidation_report_files:['id','liquidation_report_id','file_url'],
      ypop_files:['id','ypop_entry_id','organization_id','file_url'],
      ypop_event_files:['id','participation_id','organization_id','file_url'],
      ypop_org_activity_files:['id','org_activity_id','organization_id','file_url'],
      move_files:['id','application_id','organization_id','file_url'],
    };
    for(const f of trace.files){
      const cols=fileColumns[f.source];assert.ok(cols,'known file table');
      const row={id:f.id,organization_id:f.organization_id,file_url:f.file_url,admin_status:f.status,...f.details};
      row[cols[1]]=f.parent_id;
      row.revision_history=JSON.stringify(trace.document_history.filter(x=>x.file_id===f.id).map(x=>({fileUrl:x.reference})));
      await db.query('insert into '+f.source+'('+cols.join(',')+') values('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',cols.map(c=>row[c]??null));
    }
    for(const o of trace.objects)await db.query('insert into storage.objects(id,bucket_id,name,owner,owner_id,metadata) values($1,$2,$3,$4,$5,$6)',[o.id,o.bucket_id,o.name,o.owner,o.owner_id,JSON.stringify({mimetype:o.mimetype})]);
    await db.exec('begin');await db.exec(foundation);await db.exec('commit');
    await db.query("select ytrace_storage_private.register_trusted_storage_origin($1,'production metadata projection; isolated DB')",['https://mqqaykksadotbrghbexz.supabase.co']);
    const beforePolicies=(await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n;
    await db.exec("begin;set local app.storage_remediation_validated='on'");await db.exec(cutover);await db.exec('commit');
    assert.equal(beforePolicies,15);assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n,9);
    let linked=0,unlinked=0,ownerRead=0,suspendedDenied=0,templateRead=0;
    for(const o of analyzed.filter(o=>privateBuckets.includes(o.bucket_id))){
      const refs=(await db.query('select * from ytrace_storage_private.resource_references($1,$2)',[o.bucket_id,o.name])).rows;
      const expected=(o.current_references.length+o.history_references.length)>0;
      assert.equal(refs.length>0,expected,'exact metadata projection '+o.id);
      if(expected)linked++;else unlinked++;
      await db.query("select set_config('test.uid',$1,false)",[o.owner_id??o.owner??'']);
      const access=(await db.query("select ytrace_storage_private.organization_object_access($1,$2,'read') allowed",[o.bucket_id,o.name])).rows[0].allowed;
      if(!expected)assert.equal(access,false,'unlinked object owner denied '+o.id);
      if(access)ownerRead++;
      else if(expected)suspendedDenied++;
    }
    for(const o of analyzed.filter(o=>o.bucket_id==='template-files')){
      const active=(await db.query('select ytrace_storage_private.is_active_template($1) allowed',[o.name])).rows[0].allowed;
      assert.equal(active,o.current_references.length>0,'template projection '+o.id);
      if(active)templateRead++;
    }
    assert.equal(linked,71);assert.equal(unlinked,215);assert.equal(templateRead,13);
    // Compare code/grants with fresh staging deployment without contacting its API.
    const stage=JSON.parse(await readFile(resolve(snapshotDirectory,'staging-catalog.json'),'utf8'));
    const local=(await db.query("select p.oid::regprocedure::text signature,md5(p.prosrc) source_md5,p.prosecdef security_definer,p.provolatile volatility,p.proconfig config,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ytrace_storage_private' or p.proname='admin_authorize_storage_operation'")).rows;
    assert.equal(local.length,14);
    for(const x of local){const y=stage.functions.find(y=>y.signature===x.signature);assert.ok(y,'deployed staging helper');for(const k of ['source_md5','security_definer','volatility','config','acl'])assert.deepEqual(x[k],y[k],x.signature+' '+k);}
    evidence.push({test:'production metadata projection in isolated PGlite',status:'PASS',objects:trace.objects.length,linkedPrivate:linked,unlinkedPrivateDenied:unlinked,ownerRead,suspendedOrOtherLinkedReadDenied:suspendedDenied,currentTemplatesReadable:templateRead,unreferencedTemplatesDenied:56,foundationSourcesAndGrantsMatchStaging:14,scope:'Production metadata only, no binary files or live authorization requests'});
  }finally{await db.close();}
});
test('production foundation wrapper enforces drift and atomic rollback in an isolated catalog',async()=>{
  const directory=resolve('docs/production-security/storage-cutover/20261011T113322Z');
  const artifact=JSON.parse(await readFile(resolve(directory,'foundation-artifact.json'),'utf8'));
  const candidate=await readFile(resolve(directory,'production_storage_foundation_review.sql'),'utf8');
  assert.equal(createHash('sha256').update(candidate).digest('hex'),artifact.sqlSha256,'exact prepared artifact');
  const expression=await readFile(resolve(directory,'catalog-expression.sql'),'utf8');
  const exclusions="ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present']";
  const fingerprint="encode(sha256(convert_to((("+expression+") - "+exclusions+")::text,'UTF8')),'hex')";
  for(const mode of ['drift','commit','rollback']){
    const db=new PGlite();
    try{
      await installBaseline(db);
      await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
      await db.exec('create table storage.buckets(id text primary key,public boolean,file_size_limit bigint,allowed_mime_types text[])');
      await db.query('insert into required_document_types values($1,$2,true,$3)',[uid(900),'storage://template-files/'+uid(900)+'/fixture.pdf','Preserved fixture']);
      const baseline=(await db.query('select '+fingerprint+' fingerprint')).rows[0].fingerprint;
      // ONLY this in-memory clone receives the synthetic catalog fingerprint.
      // The production artifact remains byte-identical and is never executed live.
      let isolated=candidate.replaceAll(artifact.compatibilitySha256,baseline);
      if(mode==='drift')await db.exec("create policy unexpected_permissive_override on storage.objects for select using(true)");
      if(mode==='rollback')isolated=isolated.replace(/\nCOMMIT;\s*$/,()=>"\nDO $$ BEGIN RAISE EXCEPTION 'Injected rollback test'; END $$;\nCOMMIT;");
      if(mode==='commit'){
        await db.exec(isolated);
        assert.equal((await db.query("select count(*)::int n from ytrace_storage_private.asset_bindings")).rows[0].n,1);
        assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n,15,'foundation never cuts over policies');
      }else{
        await assert.rejects(db.exec(isolated),mode==='drift'?/catalog drifted/:/Injected rollback test/);
        await db.exec('rollback');
        assert.equal((await db.query("select to_regnamespace('ytrace_storage_private') is null absent")).rows[0].absent,true,'namespace and DDL rolled back');
        assert.equal((await db.query("select to_regprocedure('public.admin_authorize_storage_operation(text,text,text,text,uuid,text)') is null absent")).rows[0].absent,true,'RPC creation rolled back');
      }
      assert.equal((await db.query('select name from required_document_types where id=$1',[uid(900)])).rows[0].name,'Preserved fixture');
      assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,0,'no migration history repair');
      evidence.push({test:'production foundation wrapper '+mode,status:'PASS',scope:'Actual wrapper SQL with synthetic catalog SHA substituted in memory only; no live installation'});
    }finally{await db.close();}
  }
});
test('production cutover wrapper rejects missing readiness and commits only its exact policy set',async()=>{
  const directory=resolve('docs/production-security/storage-cutover/20261011T113322Z');
  const foundationArtifact=JSON.parse(await readFile(resolve(directory,'foundation-artifact.json'),'utf8'));
  const cutoverArtifact=JSON.parse(await readFile(resolve(directory,'cutover-artifact.json'),'utf8'));
  const foundationCandidate=await readFile(resolve(directory,'production_storage_foundation_review.sql'),'utf8');
  const cutoverCandidate=await readFile(resolve(directory,'production_storage_policy_cutover_review.sql'),'utf8');
  assert.equal(createHash('sha256').update(cutoverCandidate).digest('hex'),cutoverArtifact.sqlSha256);
  const expression=await readFile(resolve(directory,'catalog-expression.sql'),'utf8');
  const exclusions="ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present']";
  const db=new PGlite();
  try{
    await installBaseline(db);
    await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);create table storage.buckets(id text primary key,public boolean,file_size_limit bigint,allowed_mime_types text[])');
    const hash=(await db.query("select encode(sha256(convert_to((("+expression+") - "+exclusions+")::text,'UTF8')),'hex') fingerprint")).rows[0].fingerprint;
    await db.exec(foundationCandidate.replaceAll(foundationArtifact.compatibilitySha256,hash));
    const isolated=cutoverCandidate.replaceAll(foundationArtifact.compatibilitySha256,hash);
    await assert.rejects(db.exec(isolated),/requires isolated authorization/);
    await db.exec('rollback');
    assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n,15,'missing readiness leaves policies intact');
    await db.exec("set app.storage_remediation_validated='on'");
    const injected=isolated.replace(/\nCOMMIT;\s*$/,()=>"\nDO $$ BEGIN RAISE EXCEPTION 'Injected cutover rollback'; END $$;\nCOMMIT;");
    await assert.rejects(db.exec(injected),/Injected cutover rollback/);
    await db.exec('rollback');
    assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n,15,'post-DDL failure leaves original policies intact');
    await db.exec(isolated);
    assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n,9);
    assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage' and policyname like 'ytrace_%'")).rows[0].n,6);
    evidence.push({test:'production cutover wrapper readiness gate, exact nine policies, unrelated catalog preservation and atomic rollback',status:'PASS',scope:'Isolated SQL; synthetic catalog fingerprint substituted in memory only'});
  }finally{await db.close();}
});
test.after(async()=>{
  if(process.env.YTRACE_STORAGE_REVIEW_OUTPUT)await writeFile(resolve(process.env.YTRACE_STORAGE_REVIEW_OUTPUT,'local-sql-compatibility.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
});

