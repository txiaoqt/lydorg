// Isolated PostgreSQL reproduction of current live Storage predicates. No network.
// Auth/admin helper and records are fixtures; this does not certify live API behavior.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const schema = JSON.parse(await readFile(new URL('../../docs/readiness/2026-10-09/live-schema.json', import.meta.url), 'utf8'));
const q = s => '"' + s.replaceAll('"', '""') + '"';
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('reproduces bucket-wide read exposure with exact captured Storage policies', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create schema storage; create role anon; create role authenticated;
      grant usage on schema auth,storage,public to anon,authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create function current_user_is_admin() returns boolean language sql stable as $$select auth.uid()='${uid(3)}'::uuid$$;
      create table storage.objects(id int primary key, bucket_id text, name text, owner uuid);
      alter table storage.objects enable row level security;`);
    for (const grant of schema.grants.filter(g => g.table_schema === 'storage' && g.table_name === 'objects')) {
      await db.exec(`grant ${grant.privilege_type} on storage.objects to ${q(grant.grantee)}`);
    }
    for (const p of schema.policies.filter(p => p.schemaname === 'storage' && p.tablename === 'objects')) {
      await db.exec(`create policy ${q(p.policyname)} on storage.objects as ${p.permissive} for ${p.cmd} to ${p.roles.map(q).join(',')}
        ${p.qual ? `using (${p.qual})` : ''} ${p.with_check ? `with check (${p.with_check})` : ''}`);
    }
    const buckets = ['organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files','template-files','news-release-images'];
    for (const [i,bucket] of buckets.entries()) await db.query('insert into storage.objects values($1,$2,$3,$4)', [i+1,bucket,'B/private-fixture.pdf',uid(2)]);
    const results = [];
    for (const [identity,role,user] of [['Anonymous','anon',''],['Organization A','authenticated',uid(1)],['Organization B','authenticated',uid(2)],['Authorized Admin fixture','authenticated',uid(3)],['Unauthorized Admin','authenticated',uid(4)],['Suspended Organization fixture','authenticated',uid(5)],['Invalid/expired session','anon','']]) {
      await db.query("select set_config('test.uid',$1,false)",[user]); await db.exec(`set role ${role}`);
      const rows = (await db.query('select bucket_id from storage.objects order by id')).rows;
      // A failing isolation property is the finding, not an acceptance pass.
      assert.equal(rows.length, buckets.length, `${identity}: expected reproduction of unrestricted reads`);
      const operations = [];
      for (const sql of ["insert into storage.objects values(99,'template-files','unauthorized-fixture.pdf',null) returning id", "update storage.objects set name='changed-fixture.pdf' where bucket_id='template-files' returning id", "delete from storage.objects where bucket_id='template-files' returning id"]) {
        await db.exec('begin');
        try { operations.push({sql, rows:(await db.query(sql)).rows}); }
        catch (error) { operations.push({sql,error:error.code}); }
        finally { await db.exec('rollback'); }
      }
      results.push({identity,readableBuckets:rows,operations}); await db.exec('reset role');
    }
    await writeFile(new URL('../../docs/readiness/2026-10-09/storage-authorization-matrix.json',import.meta.url),JSON.stringify({
      scope:'Exact captured policies and grants, isolated PostgreSQL; synthetic objects and auth/admin helpers. Suspension has no Storage predicate in these policies.',
      securityAcceptance:'FAIL',results},null,2));
  } finally { await db.close(); }
});
