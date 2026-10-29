// Offline only: no credentials, environment-file loading, database or HTTP calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { verifyData } from '../../native-runner-20261011T132539Z/runner-core.mjs';

const root=process.cwd();
const dir='docs/production-security/storage-cutover/data-drift-review/20261011T151810Z/';
const runner='docs/production-security/storage-cutover/native-runner-20261011T132539Z/';
const bytes=file=>readFile(resolve(root,file));
const json=async file=>JSON.parse((await bytes(file)).toString('utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const oldManifest=await json(dir+'original-reviewed-inputs.json');
const manifest=await json(runner+'reviewed-inputs.json');
const original=await json(oldManifest.inputs.dataBaseline.file);
const baseline=await json(manifest.inputs.dataBaseline.file);
const capture=await json(dir+'baseline-capture-verification.json');
const review=await json(dir+'redacted-activity-evidence.json');

test('historical baseline and archived original bundle remain byte-for-byte intact',async()=>{
 assert.equal(hash(await bytes(oldManifest.inputs.dataBaseline.file)),'36a039bb6455aeea0d31c2e9920c7279f5ad3144b9a132071fa8218b4249a771');
 assert.equal(hash(await bytes(dir+'original-reviewed-inputs.json')),'031c8c19c02ae311422d6e4248e44132ef15dd91ec976a0457fe8fe4d85471c7');
 const codeHashes=[
  {file:'runner-core.mjs',sha256:hash(await bytes(dir+'original-runner-core.mjs.txt'))},
  {file:'native-foundation-runner.mjs',sha256:hash(await bytes(dir+'original-native-foundation-runner.mjs.txt'))},
 ];
 assert.equal(hash(JSON.stringify({manifestSha256:hash(await bytes(dir+'original-reviewed-inputs.json')),codeHashes})),'69b01be6d530fc0539a44e05fa38c2962fa1b6cae289e063f77076a5518c61af');
});

test('foundation SQL and every non-baseline manifest input are unchanged',async()=>{
 for(const name of Object.keys(manifest.inputs)){
  if(name!=='dataBaseline')assert.deepEqual(manifest.inputs[name],oldManifest.inputs[name]);
  const entry=manifest.inputs[name],data=await bytes(entry.file);
  assert.equal(data.length,entry.bytes);assert.equal(hash(data),entry.sha256);
 }
 assert.equal(manifest.inputs.sql.sha256,'e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2');
 assert.equal(manifest.inputs.sql.bytes,47407);
 assert.equal(manifest.inputs.dataBaseline.sha256,'60a25f959aa2e45ab384cb41702f5eb13b93bdfe9ef71049b99eeceb5bde5d9a');
});

test('executable change is exactly one fixed baseline binding; core and all guards are unchanged',async()=>{
 const source=(await bytes(dir+'original-native-foundation-runner.mjs.txt')).toString('utf8');
 const before="dataBaseline:prior+'immediate-data-before.json'";
 const after="dataBaseline:'"+manifest.inputs.dataBaseline.file+"'";
 assert.equal(source.split(before).length,2);
 assert.equal((await bytes(runner+'native-foundation-runner.mjs')).toString('utf8'),source.replace(before,after));
 assert.deepEqual(await bytes(runner+'runner-core.mjs'),await bytes(dir+'original-runner-core.mjs.txt'));
});

test('fresh baseline contains exactly the seven reviewed appends and 50 unchanged relations',()=>{
 assert.equal(original.preserved_data.length,57);assert.equal(baseline.preserved_data.length,57);
 const allowed=new Set(['auth.users_inventory','auth.identities_inventory','public.user_profiles','public.user_roles','public.user_policy_acceptance','public.activity_logs','public.admin_sessions']);
 for(const row of baseline.preserved_data){
  const old=original.preserved_data.find(x=>x.relation===row.relation);
  if(allowed.has(row.relation)){assert.equal(row.row_count,old.row_count+1);assert.notEqual(row.content_fingerprint,old.content_fingerprint);}
  else assert.deepEqual(row,old);
 }
 assert.equal(capture.unchangedRelations,50);assert.equal(capture.reviewedAppendRelations,7);
 assert.equal(capture.preexistingCohortsMatch,7);
 assert.equal(capture.reviewedActivityMatches,true);assert.equal(capture.reviewedActorMatches,true);
});

test('legitimacy evidence separates Google signup/owner consent from the existing Admin login',()=>{
 const a=review.redactedInvestigation.redactedActivity;
 assert.equal(review.status,'LEGITIMATE_WORKFLOWS_CORROBORATED');
 assert.ok(review.redactedInvestigation.preexistingRecords.every(x=>x.rowCountMatches&&x.contentFingerprintMatches));
 assert.equal(a.new_users.length,1);assert.equal(a.new_users[0].app_metadata_provider,'google');
 assert.equal(a.new_users[0].has_authorization_metadata,false);assert.equal(a.new_users[0].admin_account_link,false);
 assert.equal(a.new_roles[0].role,'youth');assert.deepEqual(a.new_roles[0].permissions,[]);
 assert.equal(a.new_roles[0].matches_signup_default,true);
 assert.ok(review.authLogs.some(x=>x.source==='auth_audit_logs'&&x.action==='user_signedup'&&x.provider==='google'&&x.actor_matches_reviewed_new_user===1));
 assert.ok(review.requestLogs.some(x=>x.path==='/rest/v1/user_policy_acceptance'&&x.method==='POST'&&x.http_status===201&&x.jwt_role==='authenticated'&&x.subject_matches_reviewed_new_user===1));
 assert.equal(a.new_activity_logs[0].actor_is_new_auth_user,false);
 assert.equal(a.new_activity_logs[0].actor_is_existing_admin,true);
 assert.equal(a.new_activity_logs[0].matching_new_sessions,1);
 assert.equal(a.new_sessions[0].matching_signin_audits,1);
 assert.ok(review.failedPasswordRequests.some(x=>x.error_code==='user_banned'));
 assert.ok(review.failedPasswordRequests.some(x=>x.error_code==='invalid_credentials'));
});

test('all 57 future fingerprints remain enforced and the old snapshot still rejects the additions',()=>{
 verifyData(baseline,baseline);
 assert.throws(()=>verifyData(baseline,original),/PROTECTED_DATA_OR_REFERENCE_DRIFT/);
 for(let index=0;index<baseline.preserved_data.length;index++){
  const changed=structuredClone(baseline);changed.preserved_data[index].content_fingerprint='0'.repeat(32);
  assert.throws(()=>verifyData(changed,baseline),/PROTECTED_DATA_OR_REFERENCE_DRIFT/);
 }
 assert.throws(()=>verifyData({...baseline,read_only:'off'},baseline));
 assert.throws(()=>verifyData({...baseline,preserved_data:baseline.preserved_data.slice(1)},baseline));
});

test('offline CLI reviews the exact refreshed bundle without connecting or activating installation',()=>{
 const env={};for(const key of ['PATH','SystemRoot','WINDIR','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
 const r=spawnSync(process.execPath,[resolve(root,runner+'native-foundation-runner.mjs'),'--review'],{env,encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0);assert.equal(r.stderr,'');assert.equal(r.error,undefined);
 const result=JSON.parse(r.stdout);assert.equal(result.mode,'OFFLINE_REVIEW');
 assert.equal(result.runnerBundleSha256,'481a2f5372bf28dd9b8bc04d8691aa5555ca9c5454cf07346012aaf065700fd9');
 assert.equal(result.connectionAttempted,false);assert.equal(result.installationActivated,false);
});

test('saved review evidence contains no raw UUIDs, email addresses, passwords or session tokens',async()=>{
 for(const file of ['redacted-activity-evidence.json','baseline-capture-verification.json','protected-data-baseline.json','updated-runner-review.json']){
  const text=(await bytes(dir+file)).toString('utf8');
  assert.doesNotMatch(text,/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  assert.doesNotMatch(text,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(text,/"(?:password|password_hash|token_hash|session_token|access_token|refresh_token|authorization)"\s*:/i);
 }
});

