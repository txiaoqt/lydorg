// Actual isolated PostgreSQL via existing PGlite, not native TCP/TLS integration.
// All rows are disposable in-memory local fixtures. No environment/HTTP/API access.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {PGlite} from '../../../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import {verifyArtifact,claimLock,singleAttempt} from './runner-core.mjs';
const sql=await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql');
test('isolated PostgreSQL commits a complete multi-statement transaction and enforces READ ONLY',async()=>{
 const db=new PGlite();
 try{
   await db.exec('BEGIN; CREATE TABLE runner_sentinel(value int); INSERT INTO runner_sentinel VALUES(7); COMMIT;');
   assert.equal((await db.query('select value from runner_sentinel')).rows[0].value,7);
   await db.exec('BEGIN READ ONLY;');
   await assert.rejects(db.query('insert into runner_sentinel values(9)'),error=>error.code==='25006');
   await db.exec('ROLLBACK;');
   assert.equal((await db.query('select count(*)::int as total from runner_sentinel')).rows[0].total,1);
 }finally{await db.close();}
});
test('isolated PostgreSQL rolls back DDL and rows after an injected failure before COMMIT',async()=>{
 const db=new PGlite();
 try{
   await db.exec('CREATE TABLE runner_sentinel(value int); INSERT INTO runner_sentinel VALUES(7);');
   await assert.rejects(db.exec("BEGIN; CREATE TABLE runner_tentative(value int); INSERT INTO runner_sentinel VALUES(8); DO $$ BEGIN RAISE EXCEPTION 'offline injected failure'; END $$; COMMIT;"));
   await db.exec('ROLLBACK;');
   assert.equal((await db.query("select to_regclass('runner_tentative') as object")).rows[0].object,null);
   assert.deepEqual((await db.query('select value from runner_sentinel')).rows,[{value:7}]);
 }finally{await db.close();}
});
test('untouched production candidate fails its real local catalog gate; runner rolls back without retry',async()=>{
 const db=new PGlite(),dir=await mkdtemp(resolve(tmpdir(),'ytrace-foundation-pglite-'));
 const lock=await claimLock(resolve(dir,'lock.json'));
 let candidateCalls=0,rollbackCalls=0;
 try{
   const version=(await db.query('select version() as version')).rows[0].version;
   // The existing local runtime is PostgreSQL 18.3, not production's 17.6.
   // This checks transaction semantics only; native 17.6 integration remains blocked.
   assert.match(version,/PostgreSQL 18\.3 \(PGlite 0\.5\.8\)/);
   await db.exec('CREATE TABLE runner_sentinel(value int); INSERT INTO runner_sentinel VALUES(7);');
   const client={query:async text=>{
     if(text==='ROLLBACK;'){rollbackCalls++;await db.exec(text);return {command:'ROLLBACK'};}
     assert.equal(text,verifyArtifact(sql));candidateCalls++;
     await db.exec(text);throw new Error('Unreachable: isolated catalog must not satisfy production gates');
   }};
   const result=await singleAttempt({client,sqlBytes:sql,lock,markerPath:resolve(dir,'attempt.json'),receiptPath:resolve(dir,'receipt.json'),postflight:async()=>{throw new Error('Postflight must not run');}});
   assert.equal(result.status,'ERROR_ROLLBACK_ACKNOWLEDGED_RECONCILIATION_REQUIRED');
   assert.equal(candidateCalls,1);assert.equal(rollbackCalls,1);
   assert.deepEqual((await db.query('select value from runner_sentinel')).rows,[{value:7}]);
   assert.equal((await db.query("select to_regnamespace('ytrace_storage_private') as namespace")).rows[0].namespace,null);
   await lock.verify();
 }finally{await db.close();}
});
