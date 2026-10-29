import { readFile,writeFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const dir='docs/production-security/budget-deletion-pause/20261012T165000Z';
const sha=b=>createHash('sha256').update(b).digest('hex');
const m=JSON.parse(await readFile(`${dir}/candidate-manifest.json`,'utf8'));
assert.equal(sha(await readFile(`${dir}/budget_deletion_pause_production.sql`)),m.sha256);
assert.equal(sha(await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql')),'3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c');
const frontend=JSON.parse(await readFile(`${dir}/frontend-overlay-identities.json`,'utf8'));
for(const f of frontend.files){const p=f.kind==='isolated-live-base-overlay'?`${dir}/admin-release-overlay/${f.path}`:f.path;assert.equal(sha(await readFile(p)),f.proposedSha256);}
const inventory=JSON.parse(await readFile(`${dir}/isolated-generated-inventory.json`,'utf8'));
let scanned=0;const findings=[];
for(const file of inventory.filter(f=>/\.(js|mjs|html|json)$/.test(f.path))){
 const bytes=await readFile(`.agent/budget-deletion-pause-20261012T165000Z/source/build/${file.path}`);
 assert.equal(sha(bytes),file.sha256);const text=bytes.toString();scanned++;
 for(const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){
  try{const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());if(claims.role!=='anon'||claims.ref!=='mqqaykksadotbrghbexz')findings.push({path:file.path,kind:'UNAPPROVED_JWT_CLASS_OR_PROJECT'});}catch{findings.push({path:file.path,kind:'UNCLASSIFIED_JWT_LITERAL'});}
 }
 for(const name of ['LOCAL-FICTIONAL-NOT-A-SESSION','YTRACE_PRODUCTION_DB_PASSWORD','YTRACE_PRODUCTION_DB_CA_FILE'])if(text.includes(name))findings.push({path:file.path,kind:'PRIVATE_TEST_OR_OPERATOR_MARKER'});
}
assert.equal(findings.length,0,'Unexpected browser secret/class marker');
const artifacts=[];
async function walk(root,rel=''){for(const f of await readdir(root,{withFileTypes:true})){const name=rel?`${rel}/${f.name}`:f.name;if(f.isDirectory())await walk(`${root}/${f.name}`,name);else if(name!=='review-receipt.json'){const bytes=await readFile(`${root}/${f.name}`);artifacts.push({path:name,bytes:bytes.length,sha256:sha(bytes)});}}}
await walk(dir);artifacts.sort((a,b)=>a.path.localeCompare(b.path));
const request=await readFile('C:/Users/Christopher x Angel/.codex/attachments/7063ce44-83d9-4a30-8141-1e0bf8f2738c/Pasted text.txt');
await writeFile(`${dir}/review-receipt.json`,JSON.stringify({recordedAt:new Date().toISOString(),scope:'LOCAL_PREPARATION_AND_READ_ONLY_PRODUCTION_INSPECTION',production:'mqqaykksadotbrghbexz',productionWrites:0,stagingWrites:0,requestSha256:sha(request),sqlSha256:m.sha256,sqlBytes:m.bytes,sqlInstalled:false,sqlLocalTests:'37/37 PASS',frontendFocusedTests:'46/46 PASS',isolatedBuild:'PASS Windows Node24.21.0',actualAppTypecheck:'FAIL: 647 baseline errors; zero new diagnostic identities',boundedBrowserScan:{status:'PASS',filesScanned:scanned,findings,limitation:'JWT-class and explicit marker scan only; not an exhaustive secret audit'},baselineAdopted:false,originalCutoverPreserved:true,artifacts},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',sqlSha256:m.sha256,browserScanFiles:scanned,artifacts:artifacts.length,productionWrites:0,stagingWrites:0}));
