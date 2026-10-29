// Local final-review evidence only. Never writes an operation lock/attempt/authorization.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='docs/production-security/budget-deletion-pause/execution-review-20261013T024629Z';
const previous='docs/production-security/budget-deletion-pause/20261012T165000Z';
const sha=b=>createHash('sha256').update(b).digest('hex');
const sql=await readFile(`${previous}/budget_deletion_pause_production.sql`);
assert.equal(sha(sql),'a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a');assert.equal(sql.length,11945);
const old=JSON.parse(await readFile(`${previous}/review-receipt.json`,'utf8'));
for(const item of old.artifacts)assert.equal(sha(await readFile(`${previous}/${item.path}`)),item.sha256,`Previous artifact changed: ${item.path}`);
const inputs=JSON.parse(await readFile(`${dir}/artifact-and-mechanism-review.json`,'utf8'));
assert.equal(inputs.preservation.changedSincePriorSnapshot.length,0);
const before=JSON.parse(await readFile(`${dir}/production-readonly-preflight.json`,'utf8')).verification;
assert.equal(before.catalog_matches,true);assert.equal(before.function_matches,true);
const dataOriginal=await readFile('docs/production-security/storage-cutover/executions/20261011T122743Z/protected-data-readonly.sql','utf8');
const provenance={originalSourceSha256:sha(dataOriginal),executedReviewQuerySha256:sha(dataOriginal.replace(/\bCOMMIT\s*;/g,'ROLLBACK;')),change:'Read-only review copy changes terminal COMMIT to ROLLBACK for MCP inspection; original file and production pause SQL remain unchanged.',transactionReadOnly:true};
await writeFile(`${dir}/readonly-query-provenance.json`,JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
const files=[];
for(const path of (await readdir(dir)).sort()){if(path==='review-receipt.json')continue;const bytes=await readFile(`${dir}/${path}`);files.push({path,bytes:bytes.length,sha256:sha(bytes)});}
await writeFile(`${dir}/review-receipt.json`,JSON.stringify({recordType:'FINAL_PRE_EXECUTION_REVIEW_ONLY',recordedAt:new Date().toISOString(),reportTimezone:'Asia/Manila',decision:'NO_GO_EXECUTION_ADAPTER_MISSING',project:'mqqaykksadotbrghbexz',host:'db.mqqaykksadotbrghbexz.supabase.co',sqlSha256:sha(sql),sqlBytes:sql.length,sqlModified:false,sqlInstalled:false,adapterPath:null,adapterBundleSha256:null,operatorConfirmedNoAdapter:true,productionWrites:0,stagingWrites:0,nativeConnectionAttempted:false,credentialEnvironmentLoaded:false,authorizationRecordCreated:false,operationLockCreated:false,attemptMarkerCreated:false,acceptedValidationRepeated:false,previousArtifactsPreserved:old.artifacts.length,protectedInventoriesCaptured:57,all57MatchPriorReviewSnapshot:true,baselineAdopted:false,files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'NO_GO_EXECUTION_ADAPTER_MISSING',sqlHashVerified:true,sqlBytes:sql.length,previousArtifactsPreserved:old.artifacts.length,all57InventoriesMatch:true,productionWrites:0}));
