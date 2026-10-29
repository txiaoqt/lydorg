// Uninstalled local migration candidate. Embedded in-memory PostgreSQL only.
// No environment, credentials, network, shared DB, runner, or historical-evidence writes.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const migrationPath='supabase/migrations/20261014154614_pause_admin_budget_deletion.sql';
const migration=await readFile(migrationPath,'utf8');
const predecessor=await readFile('supabase/migrations/20260925080000_audit_records_hardening.sql','utf8');
const clientErrorSource=await readFile('src/lib/admin-budget-deletion-pause.ts','utf8');
const definitions=[...predecessor.matchAll(/CREATE OR REPLACE FUNCTION public\.admin_bulk_delete_budget_requests\([\s\S]*?\n\$\$;/g)];
assert.equal(definitions.length,1,'Exact repository predecessor must appear once');
const original=definitions[0][0];
const signature='public.admin_bulk_delete_budget_requests(text,uuid[])';
const pauseMessage='BUDGET_DELETION_PAUSED: Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.';
const uuid=n=>'41000000-0000-4000-8000-'+String(n).padStart(12,'0');
const tables=['budget_requests','budget_request_files','liquidation_reports','liquidation_report_files',
  'notifications','activity_logs','admin_accounts','admin_sessions','roles','guard_probe','storage.objects'];

const schema=[
  'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;',
  'CREATE ROLE budget_rpc_owner BYPASSRLS; CREATE ROLE no_rpc_access; CREATE SCHEMA storage;',
  'CREATE TABLE roles(id integer PRIMARY KEY,code text);',
  'CREATE TABLE admin_accounts(id uuid PRIMARY KEY,display_name text);',
  'CREATE TABLE admin_sessions(id uuid PRIMARY KEY,fixture_token text,last_used_at timestamptz);',
  'CREATE TABLE guard_probe(id integer PRIMARY KEY,armed boolean NOT NULL);',
  'CREATE TABLE budget_requests(id uuid PRIMARY KEY,organization_id uuid,activity_title text,status text,requested_amount numeric,approved_amount numeric,released_amount numeric);',
  'CREATE TABLE budget_request_files(id uuid PRIMARY KEY,budget_request_id uuid REFERENCES budget_requests ON DELETE CASCADE,file_url text);',
  'CREATE TABLE liquidation_reports(id uuid PRIMARY KEY,budget_request_id uuid REFERENCES budget_requests ON DELETE CASCADE,organization_id uuid,status text);',
  'CREATE TABLE liquidation_report_files(id uuid PRIMARY KEY,liquidation_report_id uuid REFERENCES liquidation_reports ON DELETE CASCADE,file_url text);',
  'CREATE TABLE notifications(id uuid PRIMARY KEY,related_type text,related_id uuid,title text);',
  'CREATE TABLE activity_logs(id uuid PRIMARY KEY,actor_user_id uuid,organization_id uuid,action text,related_type text,related_id uuid,description text,metadata jsonb);',
  'CREATE TABLE storage.objects(id uuid PRIMARY KEY,bucket_id text,name text,metadata jsonb);',
  'CREATE FUNCTION public.validate_admin_session_token(_token text) RETURNS TABLE(admin_id uuid)',
  'LANGUAGE plpgsql SECURITY DEFINER AS $fixture$ BEGIN',
  "IF (SELECT armed FROM public.guard_probe WHERE id=1) THEN RAISE EXCEPTION 'LOCAL_VALIDATOR_MUST_NOT_RUN'; END IF;",
  'UPDATE public.admin_sessions SET last_used_at=now() WHERE fixture_token=_token;',
  "RETURN QUERY SELECT id FROM public.admin_accounts WHERE _token IN ('synthetic-super','synthetic-reviewer','synthetic-zero');",
  'END $fixture$;',
  'CREATE FUNCTION public.is_audit_logging_enabled(text) RETURNS boolean LANGUAGE sql AS $fixture$ SELECT false $fixture$;',
  "CREATE FUNCTION public.extract_audit_request_metadata() RETURNS jsonb LANGUAGE sql AS $fixture$ SELECT '{}'::jsonb $fixture$;",
  'CREATE FUNCTION public.local_budget_count() RETURNS bigint LANGUAGE sql AS $fixture$ SELECT count(*) FROM public.budget_requests $fixture$;',
  'CREATE VIEW public.local_budget_status_view AS SELECT id,status FROM public.budget_requests;',
  'ALTER TABLE budget_requests ENABLE ROW LEVEL SECURITY;',
  'CREATE POLICY local_owner_policy ON public.budget_requests FOR SELECT USING (true);',
  "INSERT INTO roles VALUES (1,'synthetic-super'),(2,'synthetic-reviewer'),(3,'synthetic-zero');",
  'INSERT INTO guard_probe VALUES(1,false);',
].join('\n');

async function fixture({customOwner=true,customAcl=true}={}){
  const db=new PGlite(); // No dataDir, connection string, worker, socket, or persistent DB.
  try{
    await db.exec(schema);
    await db.query('INSERT INTO admin_accounts VALUES($1,$2)',[uuid(1),'SYNTHETIC DISPOSABLE ADMIN']);
    await db.query("INSERT INTO admin_sessions VALUES($1,'synthetic-super','2000-01-01T00:00:00Z')",[uuid(2)]);
    const statuses=['draft','submitted','under_review','needs_revision','awaiting_release',
      'approved_for_ftf_green','hard_copy_submitted','budget_released','completed','rejected_red'];
    for(let i=0;i<statuses.length;i++)await db.query(
      "INSERT INTO budget_requests VALUES($1,$2,'SYNTHETIC DISPOSABLE',$3,100,50,25)",[uuid(10+i),uuid(3),statuses[i]]);
    await db.query("INSERT INTO budget_request_files VALUES($1,$2,'storage://synthetic/fixture.bin')",[uuid(30),uuid(10)]);
    await db.query("INSERT INTO liquidation_reports VALUES($1,$2,$3,'submitted')",[uuid(31),uuid(10),uuid(3)]);
    await db.query("INSERT INTO liquidation_report_files VALUES($1,$2,'storage://synthetic/liquidation.bin')",[uuid(32),uuid(31)]);
    await db.query("INSERT INTO notifications VALUES($1,'budget_request',$2,'SYNTHETIC')",[uuid(33),uuid(10)]);
    await db.query("INSERT INTO activity_logs VALUES($1,$2,$3,'synthetic_history','budget_request',$4,'SYNTHETIC','{}')",[uuid(34),uuid(1),uuid(3),uuid(10)]);
    await db.query("INSERT INTO storage.objects VALUES($1,'synthetic','local/fixture.bin','{}'),($2,'synthetic','local/liquidation.bin','{}')",[uuid(35),uuid(36)]);
    await db.exec(original);
    if(customOwner)await db.exec('ALTER FUNCTION '+signature+' OWNER TO budget_rpc_owner; GRANT ALL ON ALL TABLES IN SCHEMA public TO budget_rpc_owner;');
    if(customAcl)await db.exec('REVOKE ALL ON FUNCTION '+signature+' FROM PUBLIC; GRANT EXECUTE ON FUNCTION '+signature+' TO anon,authenticated,service_role;');
    return db;
  }catch(error){await db.close();throw error;}
}
async function contract(db){
  return (await db.query([
    "SELECT p.oid::text AS oid,pg_get_userbyid(p.proowner) AS owner,p.proacl::text AS acl,to_jsonb(p)-'prosrc' AS preserved,",
    'p.prosrc AS source,pg_get_function_arguments(p.oid) AS arguments,pg_get_function_result(p.oid) AS result',
    'FROM pg_proc p WHERE p.oid=to_regprocedure($1)',
  ].join('\n'),[signature])).rows[0]??null;
}
async function snapshot(db){
  await db.exec('RESET ROLE');
  const result={};
  for(const table of tables)result[table]=(await db.query(
    "SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') AS data FROM "+table+' t')).rows[0].data;
  return result;
}
async function otherCatalog(db){
  return (await db.query([
    'SELECT jsonb_build_object(',
    "'functions',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace",
    "WHERE n.nspname IN ('public','storage') AND p.oid<>coalesce(to_regprocedure($1)::oid,0)),",
    "'relations',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace",
    "WHERE n.nspname IN ('public','storage')),",
    "'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_policy p),",
    "'triggers',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) FROM pg_trigger t),",
    "'constraints',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace",
    "WHERE n.nspname IN ('public','storage'))",
    ') AS data',
  ].join('\n'),[signature])).rows[0].data;
}
async function denied(db,session,ids=[uuid(10)]){
  await assert.rejects(db.query('SELECT public.admin_bulk_delete_budget_requests($1::text,$2::uuid[])',[session,ids]),
    error=>error.code==='PT409'&&error.message===pauseMessage);
}

test('single additive RPC replacement and exact established client error contract',()=>{
  const clientCode=clientErrorSource.match(/BUDGET_DELETION_PAUSED_CODE\s*=\s*"([^"]+)"/)?.[1];
  const clientMessage=clientErrorSource.match(/BUDGET_DELETION_PAUSED_MESSAGE\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(clientCode);assert.ok(clientMessage);
  assert.equal(pauseMessage,clientCode+': '+clientMessage);
  assert.equal((migration.match(/CREATE OR REPLACE FUNCTION/g)||[]).length,1);
  assert.doesNotMatch(migration,/\b(?:DELETE FROM|INSERT INTO|UPDATE public|ALTER TABLE|ALTER ROLE|GRANT EXECUTE|REVOKE ALL|CREATE TABLE|CREATE POLICY|CREATE TRIGGER|DROP FUNCTION)\b/i);
  const body=migration.match(/AS \$function\$([\s\S]*?)\$function\$;/)?.[1];
  assert.ok(body);
  assert.match(body,/^\s*BEGIN\s+RAISE SQLSTATE 'PT409' USING\s+MESSAGE = '[^']+';\s*END;\s*$/);
  assert.ok(body.includes(pauseMessage));
  assert.doesNotMatch(body,/\b(?:DELETE|UPDATE|INSERT|SELECT|PERFORM|EXECUTE|validate_admin_session_token)\b/i);
});

test('control: actual repository predecessor can delete only disposable fixture rows',async t=>{
  const db=await fixture();try{
    t.diagnostic((await db.query('SELECT version() AS version')).rows[0].version);
    const before=await snapshot(db);
    const result=(await db.query('SELECT public.admin_bulk_delete_budget_requests($1,$2) AS data',
      ['synthetic-super',[uuid(10)]])).rows[0].data;
    assert.equal(result.success,true);assert.equal(result.deleted_count,1);
    const after=await snapshot(db);
    assert.equal(after.budget_requests.length,before.budget_requests.length-1);
    assert.equal(after.budget_request_files.length,0);assert.equal(after.liquidation_reports.length,0);
    assert.equal(after.liquidation_report_files.length,0);assert.equal(after.notifications.length,0);
  }finally{await db.close();}
});

test('exact migration preserves OID/signature/result/custom owner/ACL/all other attributes and rows',async()=>{
  const db=await fixture();try{
    const before=await contract(db),rows=await snapshot(db),catalog=await otherCatalog(db);
    assert.equal(before.owner,'budget_rpc_owner');
    await db.exec(migration); // Exact file bytes, no substitutions or alternate installation route.
    const after=await contract(db);
    assert.deepEqual(after.preserved,before.preserved);
    assert.equal(after.oid,before.oid);assert.equal(after.owner,before.owner);assert.equal(after.acl,before.acl);
    assert.equal(after.arguments,'_session_token text, _request_ids uuid[]');assert.equal(after.result,'jsonb');
    assert.notEqual(after.source,before.source);assert.ok(after.source.includes(pauseMessage));
    assert.deepEqual(await snapshot(db),rows);assert.deepEqual(await otherCatalog(db),catalog);
    assert.equal(Number((await db.query('SELECT local_budget_count() AS n')).rows[0].n),10);
  }finally{await db.close();}
});

test('direct invocation always pauses across existing SQL roles and synthetic session conditions',async t=>{
  const db=await fixture();try{
    await db.exec(migration);
    await db.exec('UPDATE guard_probe SET armed=true'); // Any validator call would now raise a different error.
    const before=await snapshot(db);
    for(const role of ['postgres','anon','authenticated','service_role'])
      for(const session of ['synthetic-super','synthetic-reviewer','synthetic-zero','invalid','expired','revoked','',null])
        await t.test(role+' / '+(session===null?'null':session||'empty'),async()=>{
          await db.exec('SET ROLE '+role);await denied(db,session);
          assert.deepEqual(await snapshot(db),before);
        });
  }finally{await db.close();}
});

test('null, empty, unknown, duplicate, mixed and every lifecycle-state ID remain unchanged',async t=>{
  const db=await fixture();try{
    await db.exec(migration);const before=await snapshot(db);
    const cases=[['null IDs',null],['empty IDs',[]],['unknown IDs',[uuid(999)]],
      ['duplicate IDs',[uuid(10),uuid(10)]],['mixed IDs',[uuid(10),uuid(999),uuid(10)]],
      ['all lifecycle states',Array.from({length:10},(_,i)=>uuid(10+i))]];
    for(const [name,ids] of cases)await t.test(name,async()=>{
      await denied(db,'synthetic-super',ids);assert.deepEqual(await snapshot(db),before);
    });
  }finally{await db.close();}
});

test('existing missing EXECUTE privilege remains denied; no new grants',async()=>{
  const db=await fixture();try{
    await db.exec(migration);const before=await snapshot(db);
    await db.exec('SET ROLE no_rpc_access');
    await assert.rejects(db.query('SELECT public.admin_bulk_delete_budget_requests($1,$2)',
      ['synthetic-super',[uuid(10)]]),error=>error.code==='42501');
    assert.deepEqual(await snapshot(db),before);
  }finally{await db.close();}
});

test('default PUBLIC ACL and default owner are also preserved',async()=>{
  const db=await fixture({customOwner:false,customAcl:false});try{
    const before=await contract(db),rows=await snapshot(db);assert.equal(before.acl,null);
    await db.exec(migration);assert.deepEqual((await contract(db)).preserved,before.preserved);
    await db.exec('SET ROLE no_rpc_access');await denied(db,null,null);
    assert.deepEqual(await snapshot(db),rows);
  }finally{await db.close();}
});

test('missing RPC rejects without creating a new public function',async()=>{
  const db=await fixture();try{
    await db.exec('DROP FUNCTION '+signature);const before=await snapshot(db),catalog=await otherCatalog(db);
    await assert.rejects(db.exec(migration),error=>error.code==='42883');
    assert.equal(await contract(db),null);
    assert.deepEqual(await snapshot(db),before);assert.deepEqual(await otherCatalog(db),catalog);
  }finally{await db.close();}
});

test('unexpected existing contract fails closed with no function or row change',async t=>{
  for(const change of [
    'ALTER FUNCTION '+signature+' COST 101','ALTER FUNCTION '+signature+' STRICT',
    'ALTER FUNCTION '+signature+' SECURITY INVOKER','ALTER FUNCTION '+signature+' SET search_path TO pg_catalog',
  ])await t.test(change,async()=>{
    const db=await fixture();try{
      await db.exec(change);const before=await contract(db),rows=await snapshot(db),catalog=await otherCatalog(db);
      await assert.rejects(db.exec(migration),error=>error.code==='55000');
      assert.deepEqual(await contract(db),before);assert.deepEqual(await snapshot(db),rows);
      assert.deepEqual(await otherCatalog(db),catalog);
    }finally{await db.close();}
  });
});

test('reviewed predecessor body fingerprint passes and same-contract body drift fails closed',async t=>{
  await t.test('latest reviewed migration body matches the pinned pre-pause source fingerprint',async()=>{
    const db=await fixture();try{
      const before=await contract(db);
      const fingerprint=(await db.query("SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to($1::text,'UTF8')),'hex') AS value",[before.source])).rows[0].value;
      assert.equal(fingerprint,'22aa1342dced94b20a1ca95346bac835dfb0ef19edf76669503c5e2c13b44926');
      assert.match(migration,/pg_catalog\.sha256\(pg_catalog\.convert_to\(v_existing\.prosrc, 'UTF8'\)\)/);
      await db.exec(migration);
      const after=await contract(db);
      assert.equal(after.oid,before.oid);assert.equal(after.owner,before.owner);assert.equal(after.acl,before.acl);
      assert.equal(after.source.includes(pauseMessage),true);
    }finally{await db.close();}
  });

  await t.test('altered body with identical catalog attributes is rejected without changing function or fixture state',async()=>{
    const db=await fixture();try{
      const baseline=await contract(db);
      await db.exec(`CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE CALLED ON NULL INPUT SECURITY DEFINER PARALLEL UNSAFE COST 100
 SET search_path TO 'public'
AS $changed_body$
BEGIN
  RAISE EXCEPTION 'SYNTHETIC PREDECESSOR BODY DRIFT';
END;
$changed_body$;`);
      const before=await contract(db);
      assert.equal(before.oid,baseline.oid);assert.equal(before.owner,baseline.owner);assert.equal(before.acl,baseline.acl);
      assert.deepEqual(before.preserved,baseline.preserved);assert.notEqual(before.source,baseline.source);
      const rows=await snapshot(db),catalog=await otherCatalog(db);
      await assert.rejects(db.exec(migration),error=>error.code==='55000'&&
        error.message==='Budget deletion RPC body differs from the reviewed pre-pause baseline.');
      assert.deepEqual(await contract(db),before);
      assert.deepEqual(await snapshot(db),rows);assert.deepEqual(await otherCatalog(db),catalog);
    }finally{await db.close();}
  });
});

test('unexpected return type is rejected and preserved',async()=>{
  const db=await fixture();try{
    await db.exec('DROP FUNCTION '+signature);
    await db.exec("CREATE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text,_request_ids uuid[]) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fixture$ BEGIN RETURN 'SYNTHETIC DRIFT'; END $fixture$;");
    const before=await contract(db),rows=await snapshot(db);
    await assert.rejects(db.exec(migration),error=>error.code==='55000');
    assert.deepEqual(await contract(db),before);assert.deepEqual(await snapshot(db),rows);
  }finally{await db.close();}
});

test('injected failure after replacement rolls back the entire anonymous statement',async()=>{
  const db=await fixture();try{
    const before=await contract(db),rows=await snapshot(db),catalog=await otherCatalog(db);
    const anchor="  SELECT pg_catalog.to_jsonb(p) - 'prosrc' INTO STRICT v_after";
    assert.equal(migration.split(anchor).length,2);
    const injected=migration.replace(anchor,"  RAISE EXCEPTION 'LOCAL_INJECTED_AFTER_REPLACEMENT';\n"+anchor);
    await assert.rejects(db.exec(injected),/LOCAL_INJECTED_AFTER_REPLACEMENT/);
    assert.deepEqual(await contract(db),before);assert.deepEqual(await snapshot(db),rows);
    assert.deepEqual(await otherCatalog(db),catalog);
  }finally{await db.close();}
});
