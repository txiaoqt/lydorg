// Environment portability of public-asset references (news images, templates).
// Isolated PGlite execution of the actual migration SQL. No Storage HTTP server,
// no production data or credentials. "production-style" means URL shape only.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uid, foundation, cutover, installBaseline } from './storage_fixture_schema.mjs';

const ENV_ORIGIN = 'https://stagingfixture.supabase.co';            // this environment
const FOREIGN_ORIGIN = 'https://mqqaykksadotbrghbexz.supabase.co';  // production-style host, foreign to this environment
const publicUrl = (origin, bucket, name) => `${origin}/storage/v1/object/public/${bucket}/${name}`;

test('public-asset references resolve only through canonical form or the registered environment origin', async () => {
  const db = new PGlite(); const evidence = { scope: 'Isolated PGlite; synthetic rows; URL shapes only. Not a live Storage API test.', cases: [] };
  const attempt = async (sql, params=[]) => { await db.exec('begin'); try { return { rows:(await db.query(sql,params)).rows }; } catch(e) { return { denied:e.code||e.message }; } finally { await db.exec('rollback'); } };
  const resolve = (bucket, url) => db.query('select ytrace_storage_private.public_asset_reference($1,$2) as name',[bucket,url]).then(r=>r.rows[0].name);
  try {
    await installBaseline(db);
    await db.exec('begin'); await db.exec(foundation); await db.exec('commit');

    // Foundation embeds no hostname at all.
    assert.doesNotMatch(foundation, /supabase\.co/i, 'foundation must not embed a project hostname');
    assert.doesNotMatch(cutover, /supabase\.co/i, 'cutover must not embed a project hostname');

    // Nothing registered yet: canonical works, every HTTP form fails closed.
    assert.equal(await resolve('news-release-images','storage://news-release-images/news-releases/a.jpg'),'news-releases/a.jpg');
    assert.equal(await resolve('news-release-images',publicUrl(ENV_ORIGIN,'news-release-images','news-releases/a.jpg')),null);
    assert.equal(await resolve('news-release-images',publicUrl(FOREIGN_ORIGIN,'news-release-images','news-releases/a.jpg')),null);

    // Registry format validation and normalization.
    for (const bad of ['https://evil.example/storage','https://host/path/','ftp://host','host.example','https://ho st.example','https://host.example?x=1','https://user@host.example','https://host.example:99999x','']) {
      await assert.rejects(db.query('select ytrace_storage_private.register_trusted_storage_origin($1)',[bad]), undefined, `rejects origin ${JSON.stringify(bad)}`);
    }
    await db.query("select ytrace_storage_private.register_trusted_storage_origin($1,'fixture env')",[`${ENV_ORIGIN.toUpperCase()}/`]);
    assert.deepEqual((await db.query('select origin from ytrace_storage_private.trusted_storage_origins')).rows,[{origin:ENV_ORIGIN}]);
    await db.query("select ytrace_storage_private.register_trusted_storage_origin($1)",['http://127.0.0.1:54321']); // local stack form
    assert.equal((await db.query('select count(*)::int as n from ytrace_storage_private.trusted_storage_origins')).rows[0].n,2);

    const cases = [
      ['canonical storage://', 'storage://news-release-images/news-releases/1700000000000-photo.jpg', 'news-releases/1700000000000-photo.jpg'],
      ['staging-generated public URL', publicUrl(ENV_ORIGIN,'news-release-images','news-releases/1700000000000-photo.jpg'), 'news-releases/1700000000000-photo.jpg'],
      ['uppercase scheme/host, same origin', publicUrl('HTTPS://StagingFixture.supabase.co','news-release-images','news-releases/x.jpg'), 'news-releases/x.jpg'],
      ['local stack origin with port', publicUrl('http://127.0.0.1:54321','news-release-images','news-releases/x.jpg'), 'news-releases/x.jpg'],
      ['encodeURI path (space, unicode)', publicUrl(ENV_ORIGIN,'news-release-images','news-releases/caf%C3%A9%20photo.jpg'), 'news-releases/café photo.jpg'],
      ['query string / fragment stripped', publicUrl(ENV_ORIGIN,'news-release-images','news-releases/x.jpg')+'?t=123#frag', 'news-releases/x.jpg'],
      ['production-style URL = foreign project here', publicUrl(FOREIGN_ORIGIN,'news-release-images','news-releases/x.jpg'), null],
      ['unknown/untrusted host', publicUrl('https://attacker.example','news-release-images','news-releases/x.jpg'), null],
      ['trusted host, wrong bucket', publicUrl(ENV_ORIGIN,'organization-documents','org/profile/x.jpg'), null],
      ['trusted host, signed path (not public)', `${ENV_ORIGIN}/storage/v1/object/sign/news-release-images/news-releases/x.jpg?token=abc`, null],
      ['trusted host as userinfo on foreign host', `https://stagingfixture.supabase.co@attacker.example/storage/v1/object/public/news-release-images/x.jpg`, null],
      ['trusted host as path prefix on foreign host', `https://attacker.example/stagingfixture.supabase.co/storage/v1/object/public/news-release-images/x.jpg`, null],
      ['trusted host with extra label', publicUrl('https://stagingfixture.supabase.co.attacker.example','news-release-images','x.jpg'), null],
      ['canonical with other bucket', 'storage://organization-documents/x.jpg', null],
      ['canonical empty name', 'storage://news-release-images/', null],
      ['malformed', 'not a url', null],
      ['malformed percent escape stays literal', publicUrl(ENV_ORIGIN,'news-release-images','x%zz.jpg'), 'x%zz.jpg'],
      ['invalid UTF-8 escape fails closed', publicUrl(ENV_ORIGIN,'news-release-images','x%FF.jpg'), null],
      ['external image URL', 'https://cdn.example/image.jpg', null],
      ['empty', '', null],
      ['null', null, null],
    ];
    for (const [label, url, expected] of cases) {
      const actual = await resolve('news-release-images', url);
      assert.equal(actual, expected, label);
      evidence.cases.push({ label, resolves: actual !== null, exact: actual === expected });
    }
    // Template bucket uses the same resolver; cross-bucket URLs never match.
    assert.equal(await resolve('template-files', publicUrl(ENV_ORIGIN,'template-files',`${uid(90)}/form.pdf`)), `${uid(90)}/form.pdf`);
    assert.equal(await resolve('template-files', publicUrl(ENV_ORIGIN,'news-release-images',`${uid(90)}/form.pdf`)), null);

    // Ordinary roles can neither read nor change the trusted origin registry.
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      assert.ok((await attempt('select * from ytrace_storage_private.trusted_storage_origins')).denied, `${role} cannot read registry`);
      assert.ok((await attempt('select ytrace_storage_private.register_trusted_storage_origin($1)',['https://attacker.example'])).denied, `${role} cannot register`);
      assert.ok((await attempt('select ytrace_storage_private.public_asset_reference($1,$2)',['news-release-images','storage://news-release-images/x'])).denied, `${role} cannot call resolver directly`);
      assert.ok((await attempt('select ytrace_storage_private.backfill_asset_bindings()')).denied, `${role} cannot backfill`);
      assert.ok((await attempt("insert into ytrace_storage_private.trusted_storage_origins(origin) values('https://attacker.example')")).denied, `${role} cannot insert registry row`);
      await db.exec('reset role');
    }
    assert.equal((await db.query('select count(*)::int as n from ytrace_storage_private.trusted_storage_origins')).rows[0].n,2);
    // The server deployment role can register origins and read the aggregate audit.
    await db.exec('set role service_role');
    assert.equal((await attempt('select ytrace_storage_private.register_trusted_storage_origin($1)',['https://serviceregistered.supabase.co'])).denied, undefined, 'service_role can register (rolled back)');
    assert.equal((await attempt('select * from ytrace_storage_private.asset_reference_audit()')).denied, undefined, 'service_role can audit');
    assert.ok((await attempt('select * from ytrace_storage_private.trusted_storage_origins')).denied, 'service_role has no direct table grant');
    await db.exec('reset role');

    // Binding trigger + backfill: legacy rows bind after registration, foreign rows never bind.
    await db.query("insert into news_releases values($1,$2,'published'),($3,$4,'published'),($5,$6,'archived'),($7,$8,'published')",
      [uid(1), publicUrl(ENV_ORIGIN,'news-release-images','news-releases/env.jpg'),
       uid(2), 'storage://news-release-images/news-releases/canonical.jpg',
       uid(3), publicUrl(ENV_ORIGIN,'news-release-images','news-releases/archived.jpg'),
       uid(4), 'https://cdn.example/external.jpg']);
    const bindings = (await db.query('select object_name from ytrace_storage_private.asset_bindings where bucket_id=$1 order by 1',['news-release-images'])).rows.map(r=>r.object_name);
    assert.deepEqual(bindings,['news-releases/archived.jpg','news-releases/canonical.jpg','news-releases/env.jpg']);

    // Cutover legacy gate: a published Storage-looking reference at an unregistered
    // origin aborts the transaction; external URLs and archived rows do not.
    await db.query("insert into news_releases values($1,$2,'published')",[uid(5), publicUrl(FOREIGN_ORIGIN,'news-release-images','news-releases/prod-shaped.jpg')]);
    await db.exec("begin; set local app.storage_remediation_validated='on'");
    await assert.rejects(db.exec(cutover), /do not resolve to a trusted origin/);
    await db.exec('rollback');
    assert.equal((await db.query("select count(*)::int as n from pg_policies where schemaname='storage' and policyname like 'ytrace_%'")).rows[0].n,0,'gate failure left live policies untouched');
    const audit = (await db.query('select * from ytrace_storage_private.asset_reference_audit()')).rows;
    assert.ok(audit.some(r=>r.resource_kind==='news' && r.origin===FOREIGN_ORIGIN && r.form==='legacy-public-url' && r.published && !r.resolvable && Number(r.total)===1));
    assert.ok(audit.some(r=>r.resource_kind==='news' && r.form==='external' && !r.resolvable));
    evidence.auditSample = audit.map(r=>({...r,total:Number(r.total)}));
    // Archiving the unresolved row removes it from the gate (reviewed decision, not a bypass).
    await db.query("update news_releases set visibility_status='archived' where id=$1",[uid(5)]);
    await db.exec("begin; set local app.storage_remediation_validated='on'"); await db.exec(cutover); await db.exec('commit');

    // Published-image metadata policy after cutover: environment URL and canonical
    // rows are readable; archived, foreign-origin and unreferenced objects are not.
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2),($1,$3),($1,$4),($1,$5),($1,$6)',
      ['news-release-images','news-releases/env.jpg','news-releases/canonical.jpg','news-releases/archived.jpg','news-releases/prod-shaped.jpg','news-releases/orphan.jpg']);
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      const visible=(await db.query("select name from storage.objects where bucket_id='news-release-images' order by 1")).rows.map(r=>r.name);
      assert.deepEqual(visible,['news-releases/canonical.jpg','news-releases/env.jpg'],role);
      await db.exec('reset role');
    }
    // Duplicate / ambiguous: two published releases referencing one image is a
    // single public image, still readable; a template and a news row cannot share
    // an object because the resolver is bucket-scoped.
    await db.query("insert into news_releases values($1,$2,'published')",[uid(6), publicUrl(ENV_ORIGIN,'news-release-images','news-releases/env.jpg')]);
    assert.equal((await db.query("select count(distinct resource_kind)::int as n from ytrace_storage_private.resource_references('news-release-images','news-releases/env.jpg')")).rows[0].n,1);
    assert.equal((await db.query("select count(*)::int as n from ytrace_storage_private.resource_references('news-release-images','news-releases/env.jpg')")).rows[0].n,2);

    // Template policy: active canonical and active env-URL templates readable; inactive not.
    await db.query('insert into required_document_types values($1,$2,true,$3),($4,$5,true,$6),($7,$8,false,$9)',
      [uid(90),`storage://template-files/${uid(90)}/form.pdf`,'A', uid(91),publicUrl(ENV_ORIGIN,'template-files',`${uid(91)}/form.pdf`),'B', uid(92),`storage://template-files/${uid(92)}/old.pdf`,'C']);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2),($1,$3),($1,$4)',['template-files',`${uid(90)}/form.pdf`,`${uid(91)}/form.pdf`,`${uid(92)}/old.pdf`]);
    await db.exec('set role anon');
    assert.deepEqual((await db.query("select name from storage.objects where bucket_id='template-files' order by 1")).rows.map(r=>r.name),[`${uid(90)}/form.pdf`,`${uid(91)}/form.pdf`]);
    await db.exec('reset role');

    // Admin gateway RPC: news signing / cleanup authorization follows the same resolver.
    await db.query('insert into roles values($1,$2,$2,$3)',[uid(100),'super_admin',[]]);
    await db.query('insert into admin_accounts values($1,$2::text::citext,$2::text::citext,$2::text,true,$3)',[uid(50),'admin-50',uid(100)]);
    await db.query("insert into admin_sessions values($1,encode(extensions.digest($2,'sha256'),'hex'),null,'2099-01-01',null)",[uid(50),'fixture-50']);
    await db.exec('set role service_role');
    assert.equal((await db.query("select public.admin_authorize_storage_operation('fixture-50','sign','news-release-images','news-releases/env.jpg',null) as g")).rows[0].g.object_name,'news-releases/env.jpg');
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-50','sign','news-release-images','news-releases/prod-shaped.jpg',null)"),'foreign-origin reference is not signable');
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-50','sign','news-release-images','news-releases/orphan.jpg',null)"),'unreferenced object is not signable');
    // Cleanup: a bound-but-no-longer-referenced legacy image may be removed; a referenced one may not; an orphan never.
    await db.exec('reset role');
    await db.query("update news_releases set preview_image_url=$1 where id=$2",['storage://news-release-images/news-releases/replacement.jpg',uid(3)]);
    await db.exec('set role service_role');
    assert.equal((await db.query("select public.admin_authorize_storage_operation('fixture-50','delete','news-release-images','news-releases/archived.jpg',null) as g")).rows[0].g.object_name,'news-releases/archived.jpg');
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-50','delete','news-release-images','news-releases/env.jpg',null)"),'currently referenced image cannot be deleted via cleanup');
    await assert.rejects(db.query("select public.admin_authorize_storage_operation('fixture-50','delete','news-release-images','news-releases/orphan.jpg',null)"),'never-bound object cannot be deleted');
    await db.exec('reset role');

    await mkdir(new URL('../../docs/staging-validation/2026-10-10/',import.meta.url),{recursive:true});
    await writeFile(new URL('../../docs/staging-validation/2026-10-10/origin-portability-matrix.json',import.meta.url),JSON.stringify(evidence,null,2));
  } finally { await db.close(); }
});
