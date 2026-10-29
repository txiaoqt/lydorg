// Actual isolated PostgreSQL policies/functions, synthetic records and auth uid.
// No Storage HTTP server/binaries and no production data or credentials are used.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uid, foundation, cutover, installBaseline } from './storage_fixture_schema.mjs';
test('candidate policies and custom Admin guards enforce isolated authorization', async () => {
  const db = new PGlite(); const results = [];
  try {
    await installBaseline(db);
    await db.exec('begin'); await db.exec(foundation); await db.exec('commit');
    // Environment-neutral: the deployment registers THIS environment's origin; no
    // production hostname is embedded in the migrations or needed by this fixture.
    await db.query("select ytrace_storage_private.register_trusted_storage_origin($1,'fixture')",['https://stagingfixture.supabase.co']);
    await db.exec('begin');
    await assert.rejects(db.exec(cutover), /requires isolated authorization/); await db.exec('rollback');
    await db.exec("begin; set local app.storage_remediation_validated='on'"); await db.exec(cutover); await db.exec('commit');
    for (const n of [1,2,5]) await db.query('insert into organization_profiles(id,user_id,profile_status) values($1,$2,$3)',[uid(n+10),uid(n),n===5?'suspended_inactive':'verified']);
    await db.query('insert into required_document_types values($1,$2,true,$3)',[uid(90),`storage://template-files/${uid(90)}/active.pdf`,'Template name']);
    await db.query("insert into news_releases values($1,$2,'published')",[uid(91),'https://stagingfixture.supabase.co/storage/v1/object/public/news-release-images/public.jpg']);
    const buckets=['organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files'];
    const paths = {};
    for (const n of [1,2,5]) {
      const org=uid(n+10), id=uid(n+20), sub=uid(n+30);
      await db.query("insert into document_submissions(id,organization_id,submission_scope,status) values($1,$2,'registration','draft')",[sub,org]);
      await db.query("insert into document_submission_files(id,submission_id,document_type_id,file_url,admin_status) values($1,$2,$3,$4,'draft')",[uid(n+40),sub,uid(90),`storage://organization-documents/${org}/${uid(90)}/file.pdf`]);
      await db.query("insert into budget_requests(id,organization_id,status) values($1,$2,'draft')",[id,org]);
      await db.query('insert into budget_request_files values($1,$2,$3)',[uid(n+50),id,`storage://budget-request-files/${id}/file.pdf`]);
      await db.query("insert into liquidation_reports values($1,$2,$1,'draft')",[id,org]);
      await db.query('insert into liquidation_report_files values($1,$2,$3)',[uid(n+60),id,`storage://liquidation-report-files/${id}/file.pdf`]);
      await db.query("insert into ypop_entries values($1,$2,'draft','2026-S2')",[id,org]);
      await db.query('insert into ypop_files values($1,$2,$3,$4)',[uid(n+70),id,org,`storage://ypop-files/${id}/file.pdf`]);
      await db.query("insert into move_applications values($1,$2,'draft')",[id,org]);
      await db.query('insert into move_files values($1,$2,$3,$4)',[uid(n+80),id,org,`storage://move-files/${id}/file.pdf`]);
      paths[n]=buckets.map(bucket=>({bucket,path:bucket==='organization-documents'?`${org}/${uid(90)}/file.pdf`:`${id}/file.pdf`}));
      for(const x of paths[n]) await db.query('insert into storage.objects(bucket_id,name,owner) values($1,$2,$3)',[x.bucket,x.path,uid(n)]);
    }
    await db.exec("insert into ypop_periods values('2026-S2','open')");
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2),($1,$3),($4,$5)', ['template-files',`${uid(90)}/active.pdf`,`${uid(90)}/archived.pdf`,'news-release-images','public.jpg']);
    const attempt = async sql => { await db.exec('begin'); try { return { rows:(await db.query(sql)).rows.length }; } catch(e) {return {denied:e.code};} finally {await db.exec('rollback');} };
    for(const [identity,role,user,n] of [['Anonymous','anon','',null],['Organization A','authenticated',uid(1),1],['Organization B','authenticated',uid(2),2],['Suspended organization','authenticated',uid(5),null],['Unauthorized Admin JWT','authenticated',uid(4),null]]) {
      await db.query("select set_config('test.uid',$1,false)",[user]); await db.exec(`set role ${role}`);
      const visible=(await db.query("select bucket_id,name from storage.objects where bucket_id not in ('template-files','news-release-images')")).rows;
      assert.equal(visible.length,n?5:0,identity);
      if(n) assert.deepEqual(visible.map(x=>x.name).sort(),paths[n].map(x=>x.path).sort());
      const operations=[];
      for(const x of paths[1]) {
        const insert=await attempt(`insert into storage.objects(bucket_id,name,owner) values('${x.bucket}','${x.path}.new','${user||uid(9)}') returning id`);
        const update=await attempt(`update storage.objects set name=name||'.changed' where bucket_id='${x.bucket}' returning id`);
        const del=await attempt(`delete from storage.objects where bucket_id='${x.bucket}' returning id`);
        assert.equal(insert.rows??0,n===1?1:0,`${identity} ${x.bucket} insert`); assert.equal(update.rows??0,0);
        assert.equal(del.rows??0,n?1:0); operations.push({bucket:x.bucket,insert,update,delete:del});
      }
      assert.equal((await db.query("select * from storage.objects where bucket_id='template-files'")).rows.length,1);
      assert.equal((await db.query("select * from storage.objects where bucket_id='news-release-images'")).rows.length,1);
      for(const bucket of ['template-files','news-release-images']) {
        assert.ok((await attempt(`insert into storage.objects(bucket_id,name) values('${bucket}','unauthorized') returning id`)).denied);
        assert.equal((await attempt(`delete from storage.objects where bucket_id='${bucket}' returning id`)).rows,0);
        assert.equal((await attempt(`update storage.objects set name='unauthorized' where bucket_id='${bucket}' returning id`)).rows,0);
      }
      await assert.rejects(db.query("select public.admin_authorize_storage_operation('anything','sign','organization-documents','anything',null)"), /permission denied/);
      results.push({identity,visiblePrivateObjects:visible.length,operations,publicAssets:'read only'}); await db.exec('reset role');
    }
    // Review locks, expired revision and explicit unlock are actual SQL outcomes.
    await db.query("select set_config('test.uid',$1,false)",[uid(1)]);
    for(const [status,locked,due,unlocked,allowed] of [['under_review',false,null,null,false],['needs_revision',true,null,null,false],['needs_revision',false,'2000-01-01',null,false],['needs_revision',true,'2000-01-01','2026-01-01',true]]) {
      await db.query('update budget_requests set status=$1,revision_locked=$2,revision_due_at=$3,revision_unlocked_at=$4 where id=$5',[status,locked,due,unlocked,uid(21)]);
      await db.exec('set role authenticated');
      const insert=await attempt(`insert into storage.objects(bucket_id,name,owner) values('budget-request-files','${uid(21)}/replacement.pdf','${uid(1)}') returning id`);
      assert.equal(insert.rows??0,allowed?1:0); await db.exec('reset role');
    }
    // Real captured token validator, synthetic sessions/accounts and digest fixture.
    for(const [n,code,permissions,active,expiry,revoked] of [[3,'super_admin',[],true,'2099-01-01',null],[4,'limited',['budget_requests_review'],true,'2099-01-01',null],[6,'limited',[],true,'2099-01-01',null],[7,'super_admin',[],true,'2000-01-01',null],[8,'super_admin',[],true,'2099-01-01','2026-01-01'],[9,'super_admin',[],false,'2099-01-01',null]]) {
      await db.query('insert into roles values($1,$2,$2,$3)',[uid(n+100),code,permissions]);
      await db.query('insert into admin_accounts values($1,$2::text::citext,$2::text::citext,$2::text,$3,$4)',[uid(n),`admin-${n}`,active,uid(n+100)]);
      await db.query("insert into admin_sessions values($1,encode(extensions.digest($2,'sha256'),'hex'),$3,$4,null)",[uid(n),`fixture-${n}`,revoked,expiry]);
    }
    // Draft uploads must not become Admin-reviewable simply because their path is known.
    await db.exec('set role service_role');
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-3','sign','organization-documents',$1,null)",[paths[1][0].path]));
    await db.exec('reset role');
    await db.query("update document_submission_files set admin_status='under_admin_review'");
    await db.query("update liquidation_reports set status='submitted'");
    await db.query("update ypop_entries set status='submitted'");
    await db.query("update move_applications set status='submitted'");
    await db.exec('set role service_role');
    for (const x of paths[1]) {
      const grant=(await db.query("select public.admin_authorize_storage_operation('fixture-3','sign',$1,$2,null) as grant",[x.bucket,x.path])).rows[0].grant;
      assert.equal(grant.bucket_id,x.bucket); assert.equal(grant.object_name,x.path);
    }
    for(const [identity,token,allowed] of [['Authorized Admin','fixture-3',true],['Correct limited Admin','fixture-4',true],['Wrong permission','fixture-6',false],['Expired','fixture-7',false],['Revoked','fixture-8',false],['Inactive','fixture-9',false],['Invalid','unknown',false]]) {
      const run=()=>db.query('select public.admin_authorize_storage_operation($1,$2,$3,$4,null) as grant',[token,'sign','budget-request-files',paths[1][1].path]);
      if(allowed) assert.equal((await run()).rows[0].grant.object_name,paths[1][1].path); else await assert.rejects(run());
      results.push({identity,signAllowed:allowed});
    }
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-3','sign','budget-request-files','arbitrary.pdf',null)"));
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-4','sign','organization-documents',$1,null)",[paths[1][0].path]));
    const upload=(await db.query("select public.admin_authorize_storage_operation('fixture-3','upload','template-files','arbitrary.pdf',$1) as grant",[uid(90)])).rows[0].grant;
    assert.notEqual(upload.object_name,'arbitrary.pdf');
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-6','upload','template-files','', $1)",[uid(90)]));
    // A server reservation permits cleanup only while unattached; an arbitrary
    // path in the same bucket never becomes a deletion capability.
    assert.equal((await db.query("select public.admin_authorize_storage_operation('fixture-3','delete','template-files',$1,null) as grant",[upload.object_name])).rows[0].grant.object_name,upload.object_name);
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-3','delete','template-files','arbitrary.pdf',null)"));
    await db.exec('reset role');
    // Parent deletion leaves only a short-lived cleanup receipt, never a write grant.
    await db.query("select set_config('test.uid',$1,false)",[uid(2)]);
    await db.query('delete from budget_requests where id=$1',[uid(22)]);
    await db.exec('set role authenticated');
    assert.equal((await attempt(`delete from storage.objects where bucket_id='budget-request-files' and name='${paths[2][1].path}' returning id`)).rows,1);
    assert.ok((await attempt(`insert into storage.objects(bucket_id,name,owner) values('budget-request-files','${uid(22)}/new.pdf','${uid(2)}') returning id`)).denied);
    await db.exec('reset role');
    // Publish only a verified, opted-in, exact profile image, never a PDF path.
    const avatar=`${uid(11)}/profile/avatar.png`;
    await db.query("insert into storage.objects(bucket_id,name,owner,metadata) values('organization-documents',$1,$2,'{\"mimetype\":\"image/png\"}')",[avatar,uid(1)]);
    await db.query("update organization_profiles set directory_visibility=true,profile_image_url=$1 where id=$2",[`storage://organization-documents/${avatar}`,uid(11)]);
    await db.exec('set role anon');
    assert.equal((await db.query("select name from storage.objects where bucket_id='organization-documents'")).rows.length,1);
    await db.exec('reset role');
    await db.query("update storage.objects set metadata='{\"mimetype\":\"application/pdf\"}' where name=$1",[avatar]);
    await db.exec('set role anon');
    assert.equal((await db.query("select name from storage.objects where bucket_id='organization-documents'")).rows.length,0);
    await db.exec('reset role');
    await db.query("update storage.objects set metadata='{\"mimetype\":\"image/png\"}' where name=$1",[avatar]);
    await db.query("update organization_profiles set directory_visibility=false where id=$1",[uid(11)]);
    await db.exec('set role anon');
    assert.equal((await db.query("select name from storage.objects where bucket_id='organization-documents'")).rows.length,0);
    await db.exec('reset role');
    await db.query("update ytrace_storage_private.cleanup_receipts set expires_at='2000-01-01'");
    await db.exec('set role authenticated');
    assert.equal((await attempt(`delete from storage.objects where bucket_id='budget-request-files' and name='${paths[2][1].path}' returning id`)).rows,0);
    await db.exec('reset role');
    // A reused parent UUID cannot grant access to another principal's old bytes.
    await db.query("insert into budget_requests(id,organization_id,status) values($1,$2,'draft')",[uid(22),uid(11)]);
    await db.query("select set_config('test.uid',$1,false)",[uid(1)]); await db.exec('set role authenticated');
    assert.equal((await db.query("select name from storage.objects where bucket_id='budget-request-files' and name=$1",[paths[2][1].path])).rows.length,0);
    await db.exec('reset role');
    // Modern Storage ownership works even when the deprecated owner is NULL.
    await db.query("insert into storage.objects(bucket_id,name,owner_id) values('budget-request-files',$1,$2)",[`${uid(21)}/modern.pdf`,uid(1)]);
    await db.exec('set role authenticated');
    assert.equal((await db.query("select name from storage.objects where name=$1",[`${uid(21)}/modern.pdf`])).rows.length,1);
    await db.exec('reset role');
    // Byte overwrite and requirement delete stay denied while under review.
    await db.query("select set_config('test.uid',$1,false)",[uid(1)]);
    await db.query("update document_submission_files set admin_status='under_admin_review' where id=$1",[uid(41)]);
    await db.exec('set role authenticated');
    assert.ok((await attempt(`insert into storage.objects(bucket_id,name,owner) values('organization-documents','${uid(11)}/${uid(90)}/replacement.pdf','${uid(1)}') returning id`)).denied);
    assert.equal((await attempt(`delete from storage.objects where bucket_id='organization-documents' and name='${paths[1][0].path}' returning id`)).rows,0);
    await db.exec('reset role');
    await db.query("update document_submission_files set admin_status='needs_revision',revision_due_at='2099-01-01' where id=$1",[uid(41)]);
    await db.exec('set role authenticated');
    assert.equal((await attempt(`insert into storage.objects(bucket_id,name,owner) values('organization-documents','${uid(11)}/${uid(90)}/revisions/new.pdf','${uid(1)}') returning id`)).rows,1);
    assert.equal((await attempt(`delete from storage.objects where bucket_id='organization-documents' and name='${paths[1][0].path}' returning id`)).rows,0);
    await db.exec('reset role');
    await mkdir(new URL('../../docs/storage-remediation/2026-10-09/',import.meta.url),{recursive:true});
    await writeFile(new URL('../../docs/storage-remediation/2026-10-09/authorization-matrix.json',import.meta.url),JSON.stringify({scope:'Isolated PostgreSQL policies/functions, synthetic tables/records, auth.uid setting and noncryptographic digest fixture. No actual Storage API or binary preview/download certification.',additionalChecks:['cutover approval gate','all five private buckets custom Admin signing','draft-parent cleanup receipt expiration','reviewed requirement lock','revision replacement without deleting reviewed document','revision expiry and explicit unlock','published avatar consent and MIME restriction','modern owner_id and deprecated owner compatibility','reused parent UUID isolation','unattached asset cleanup reservation; arbitrary delete denied'],results},null,2));
  } finally { await db.close(); }
});
