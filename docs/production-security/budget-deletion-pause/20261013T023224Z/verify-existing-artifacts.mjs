// Read-only local verification. Does not rebuild, regenerate or modify prior evidence.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const original='docs/production-security/budget-deletion-pause/20261012T165000Z';
const out='docs/production-security/budget-deletion-pause/20261013T023224Z';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(await readFile(`${original}/review-receipt.json`,'utf8'));
const results=[];
for(const item of receipt.artifacts){
 const bytes=await readFile(`${original}/${item.path}`);
 assert.equal(sha(bytes),item.sha256,`Previous evidence changed: ${item.path}`);
 assert.equal(bytes.length,item.bytes);
 results.push({path:item.path,status:'PASS',sha256:item.sha256});
}
const ids=JSON.parse(await readFile(`${original}/frontend-overlay-identities.json`,'utf8'));
for(const item of ids.files){
 const file=item.kind==='isolated-live-base-overlay'?`${original}/admin-release-overlay/${item.path}`:item.path;
 assert.equal(sha(await readFile(file)),item.proposedSha256,`Prepared runtime changed: ${item.path}`);
}
assert.equal(sha(await readFile(`${original}/budget_deletion_pause_production.sql`)),'a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a');
assert.equal(sha(await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql')),'3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c');
await mkdir(out,{recursive:true});
await writeFile(`${out}/existing-artifact-verification.json`,JSON.stringify({status:'PASS',recordedAt:new Date().toISOString(),priorArtifactsVerified:results.length,runtimeIdentitiesVerified:ids.files.length,sqlUnchanged:true,originalCutoverUnchanged:true,results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',priorArtifactsVerified:results.length,runtimeIdentitiesVerified:ids.files.length}));
