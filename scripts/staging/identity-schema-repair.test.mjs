// Isolated PostgreSQL: exact extracted private SQL, synthetic public dependencies; no network.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { pg_trgm } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/contrib/pg_trgm.js';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const base = 'docs/staging-validation/2026-10-10/identity-schema/';
test('exact private repair installs with restricted ACLs, original functions and real assessment behavior', async () => {
  const db = new PGlite({ extensions: { pg_trgm } });
  try {
    await db.exec(`create schema extensions; create extension pg_trgm with schema extensions;
      create role anon; create role authenticated; create role service_role;
      create table public.organization_profiles(id uuid primary key,user_id uuid,organization_name text,barangay text,district text,
        registration_type text,urn text,urn_normalized text,organization_identifier_number text,profile_status text,
        verified_at timestamptz,created_at timestamptz default now(),identity_name_key text,identity_name_anchor text);
      create table public.admin_accounts(id uuid primary key,role_id uuid,is_active boolean);
      create table public.roles(id uuid primary key,code text,permission_codes text[]);
      create table public.organization_accreditations(organization_id uuid);
      create table public.organization_renewals(organization_id uuid);
      create table public.budget_requests(organization_id uuid,status text);
      create table public.liquidation_reports(organization_id uuid);
      create function public.validate_admin_session_token(text) returns table(admin_id uuid) language sql as 'select null::uuid where false';`);
    const catalog = JSON.parse(await readFile(base+'production-catalog.json','utf8'));
    for (const name of ['normalize_organization_identity_name','organization_identity_name_anchor','normalize_urn']) {
      await db.exec(catalog.publicDependencies.find(f => f.name===name).definition);
    }
    await db.exec(await readFile(base+'reviewed-staging-identity-repair.sql','utf8'));
    const { rows: tables } = await db.query(`select relname,relrowsecurity,relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ytrace_identity' and relkind='r' order by relname`);
    assert.deepEqual(tables.map(t=>t.relname), ['cases','check_rate','decisions']);
    assert.ok(tables.every(t=>t.relrowsecurity && !t.relforcerowsecurity));
    const { rows: functions } = await db.query(`select proname,prosecdef,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ytrace_identity' order by proname`);
    assert.deepEqual(functions.map(f=>[f.proname,f.prosecdef,f.proconfig]), catalog.functions.map(f=>[f.name,f.securityDefiner,f.config]));
    for (const role of ['anon','authenticated','service_role']) {
      const { rows:[permissions] } = await db.query(`select has_schema_privilege($1,'ytrace_identity','USAGE') as usage,has_table_privilege($1,'ytrace_identity.cases','SELECT') as read,has_function_privilege($1,'ytrace_identity.assess(public.organization_profiles)','EXECUTE') as exec`,[role]);
      assert.deepEqual(permissions,{usage:false,read:false,exec:false});
    }
    const id='00000000-0000-4000-8000-000000000001';
    await db.query(`insert into public.organization_profiles(id,organization_name,barangay,district,registration_type,profile_status,identity_name_key,identity_name_anchor) values($1,'SYNTHETIC Aster Lantern','Bagong Ilog','District I','new_organization','incomplete','synthetic aster lantern','synthetic aster')`,[id]);
    const { rows:[result] }=await db.query(`select ytrace_identity.assess(p) as outcome from public.organization_profiles p where id=$1`,[id]);
    assert.equal(result.outcome,'NO_MATCH');
    const { rows:[state] }=await db.query('select count(*)::int as cases from ytrace_identity.cases');
    assert.equal(state.cases,1);
    await assert.rejects(db.query(`select ytrace_identity.authorize_reviewer('invalid-synthetic-token')`),/authorized registration reviewer/);
  } finally { await db.close(); }
});
