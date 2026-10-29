// Synthetic PostgreSQL only. Never connects to production or uses real identities.
// Uses the existing local PGlite runtime. Run: node --test supabase/tests/performance_auth_uid.local.test.mjs
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const evidence = JSON.parse(await readFile(new URL('../../docs/performance/2026-10-09/database-evidence.json', import.meta.url), 'utf8'));
const policies = evidence.schema.policies.filter(p => p.schemaname === 'public');
const migration = await readFile(new URL('../migrations/20261009114340_performance_auth_uid_initplans.sql', import.meta.url), 'utf8');
const q = s => '"' + s.replaceAll('"', '""') + '"';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const tables = [...new Set(policies.map(p => p.tablename))];
async function setup(db) {
  await db.exec(`create schema auth; create role anon; create role authenticated;
    grant usage on schema public,auth to anon,authenticated;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function current_user_is_admin() returns boolean language sql stable as $$
      select auth.uid() = '${id(3)}'::uuid $$;
    create table admin_accounts(id uuid primary key);
    insert into admin_accounts values('${id(3)}');
    grant select on admin_accounts to anon,authenticated;`);
  for (const table of tables) {
    await db.exec(`create table ${q(table)}(id uuid primary key, user_id uuid, organization_id uuid,
      submitted_by uuid, submission_id uuid, budget_request_id uuid, liquidation_report_id uuid,
      status text default 'draft');
      alter table ${q(table)} enable row level security;
      grant select,insert,update,delete on ${q(table)} to anon,authenticated;
      insert into ${q(table)} values('${id(1)}','${id(1)}','${id(1)}','${id(1)}','${id(1)}','${id(1)}','${id(1)}','draft'),
        ('${id(2)}','${id(2)}','${id(2)}','${id(2)}','${id(2)}','${id(2)}','${id(2)}','draft'),
        ('${id(5)}','${id(5)}','${id(5)}','${id(5)}','${id(5)}','${id(5)}','${id(5)}','draft');`);
  }
  for (const p of policies) await db.exec(`create policy ${q(p.policyname)} on ${q(p.tablename)} as ${p.permissive}
    for ${p.cmd} to ${p.roles.map(q).join(',')}${p.qual ? ` using (${p.qual})` : ''}${p.with_check ? ` with check (${p.with_check})` : ''};`);
}
async function matrix(db) {
  const results = [];
  for (const [identity, role, uid] of [['Anonymous','anon',''], ['Organization A','authenticated',id(1)], ['Organization B','authenticated',id(2)], ['Authorized Admin fixture','authenticated',id(3)], ['Unauthorized Admin','authenticated',id(4)], ['Suspended Organization fixture','authenticated',id(5)], ['Expired session fixture','anon','']]) {
    await db.query("select set_config('test.uid',$1,false)",[uid]);
    await db.exec(`set role ${role}`);
    for (const table of tables) {
      const rows = (await db.query(`select id from ${q(table)} order by id`)).rows;
      if (uid === id(1)) assert.ok(rows.every(r => r.id === id(1)), `${table}: A sees B`);
      if (uid === id(2)) assert.ok(rows.every(r => r.id === id(2)), `${table}: B sees A`);
      if (!uid || uid === id(4)) assert.equal(rows.length,0,`${table}: unauthorized read`);
      results.push({identity,role,uid,table,rows});
      // Roll back each write independently; compare USING and WITH CHECK, including
      // cross-organization ownership changes and renewal status restrictions.
      for (const sql of [
        `update ${q(table)} set status='submitted' where id='${id(1)}' returning id`,
        `update ${q(table)} set organization_id='${id(2)}', user_id='${id(2)}', submitted_by='${id(2)}' where id='${id(1)}' returning id`,
        `insert into ${q(table)}(id,user_id,organization_id,submitted_by,status) values('${id(9)}','${id(2)}','${id(2)}','${id(2)}','draft') returning id`,
        `delete from ${q(table)} where id='${id(2)}' returning id`,
      ]) {
        await db.exec('begin');
        try { results.push({identity,role,uid,table,sql,rows:(await db.query(sql)).rows}); }
        catch (error) { results.push({identity,role,uid,table,sql,error:error.code}); }
        finally { await db.exec('rollback'); }
      }
    }
    await db.exec('reset role');
  }
  return results;
}
test('33 captured policy predicates preserve seven-identity read/write matrix and metadata', async () => {
  const db = new PGlite();
  try {
    await setup(db);
    const before = await matrix(db);
    const metadataBefore = (await db.query('select schemaname,tablename,policyname,permissive,roles,cmd from pg_policies order by 1,2,3')).rows;
    await db.exec('begin');
    await db.exec(migration);
    await db.exec('commit');
    const after = await matrix(db);
    assert.deepEqual(after,before);
    if (process.env.READINESS_RLS_MATRIX_OUTPUT) await writeFile(process.env.READINESS_RLS_MATRIX_OUTPUT,JSON.stringify({scope:"Exact 33 captured predicates in local PostgreSQL; synthetic auth/admin helpers, tables and grants. Suspended identity models ownership only; production suspension triggers and RPC/session enforcement are not certified.",before,after},null,2));
    assert.deepEqual((await db.query('select schemaname,tablename,policyname,permissive,roles,cmd from pg_policies order by 1,2,3')).rows,metadataBefore);
    assert.equal(policies.length,33);
    assert.equal((await db.query("select count(*)::int n from pg_policies where qual like '%SELECT auth.uid()%' or with_check like '%SELECT auth.uid()%'")).rows[0].n,33);
  } finally { await db.close(); }
});
test('policy drift aborts migration rather than overwriting authorization', async () => {
  const db = new PGlite();
  try {
    await setup(db);
    await db.exec('alter policy notifications_self_or_admin on notifications using(false)');
    await assert.rejects(db.exec(migration),/definition drift/);
  } finally { await db.close(); }
});
test('local large-table plan uses InitPlan; timings are synthetic, not production claims', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create role authenticated; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create table sample(user_id uuid); insert into sample select '${id(1)}'::uuid from generate_series(1,50000);
      grant select on sample to authenticated; alter table sample enable row level security;
      create policy own on sample using(user_id=auth.uid()); analyze sample;
      select set_config('test.uid','${id(1)}',false); set role authenticated;`);
    const run = async () => (await db.query('explain (analyze,format json) select count(*) from sample')).rows[0]['QUERY PLAN'];
    await run(); const before = await run();
    await db.exec('reset role; alter policy own on sample using(user_id=(select auth.uid())); set role authenticated;');
    await run(); const after = await run();
    assert.match(JSON.stringify(after),/InitPlan/);
    await writeFile(new URL(process.env.READINESS_RLS_OUTPUT || '../../docs/performance/2026-10-09/rls-synthetic-plans.json',import.meta.url),JSON.stringify({scope:'Local PGlite, synthetic 50,000 rows; no production timing inference',before,after},null,2));
  } finally { await db.close(); }
});
