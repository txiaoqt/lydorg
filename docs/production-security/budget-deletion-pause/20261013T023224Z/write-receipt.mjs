// Local evidence only. No environment files, credentials, database or provider connection.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const previous='docs/production-security/budget-deletion-pause/20261012T165000Z';
const dir='docs/production-security/budget-deletion-pause/20261013T023224Z';
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await readFile(`${previous}/review-receipt.json`,'utf8'));
for(const f of old.artifacts)assert.equal(sha(await readFile(`${previous}/${f.path}`)),f.sha256,`Previous evidence drift: ${f.path}`);
const sql=await readFile(`${previous}/budget_deletion_pause_production.sql`);
assert.equal(sha(sql),'a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a');
assert.equal(sql.length,11945);
assert.equal(sha(await readFile('.agent/admin-storage-vercel-20261012T061324Z/admin-gateway-vercel24-source.zip')),'a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465');
assert.equal(sha(await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql')),'3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c');
const sqlLog=await readFile(`${dir}/sql-tests.tap`,'utf8');assert.match(sqlLog,/# tests 38/);assert.match(sqlLog,/# pass 38/);assert.match(sqlLog,/# fail 0/);
const frontendLog=await readFile(`${dir}/frontend-tests.log`,'utf8');assert.match(frontendLog,/18 passed \(18\)/);
const artifacts=[];
for(const name of (await readdir(dir)).sort()){
 if(name==='review-receipt.json')continue;const b=await readFile(`${dir}/${name}`);artifacts.push({path:name,bytes:b.length,sha256:sha(b)});
}
const harness=await readFile('supabase/tests/budget_deletion_pause.local.test.mjs');
const request=await readFile('C:/Users/Christopher x Angel/.codex/attachments/a03d1826-8125-485e-af16-e3f547177b27/Pasted text.txt');
await writeFile(`${dir}/review-receipt.json`,JSON.stringify({recordedAt:new Date().toISOString(),reportTimezone:'Asia/Manila',scope:'LOCAL_IMPLEMENTATION_VALIDATION_AND_READ_ONLY_PRODUCTION_REVIEW',requestSha256:sha(request),sqlSha256:sha(sql),sqlBytes:sql.length,sqlChanged:false,sqlInstalled:false,previousArtifactsPreserved:old.artifacts.length,frontendRuntimeChangedThisTask:false,productionWrites:0,stagingWrites:0,deployments:0,productionMutationRpcInvocations:0,sqlTests:{status:'PASS',passed:38,failed:0,engine:'PostgreSQL 18.3 / PGlite',liveHTTP:false},frontendTests:{status:'PASS',passed:18,failed:0,type:'MOCKED_CLIENT_AND_DOM'},appTypecheck:{status:'FAIL',evidence:'REUSED_UNCHANGED_ISOLATED_SOURCE',current:647,baseline:651,newDiagnosticIdentities:0},profileAttribution:'BLOCKED_PENDING_PRIVATE_OPERATOR_IDENTITY_MATCH',baselineAdopted:false,harnessSha256:sha(harness),artifacts},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',sqlChanged:false,previousArtifactsPreserved:old.artifacts.length,sqlTests:38,frontendTests:18,productionWrites:0,stagingWrites:0}));
