// Local artifact preparation only. No credentials, network or runner modes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,bundleSha256,REVIEWED_CODE_FILES,SQL_PATH,verifyBudgetSql,
  BUDGET_INVENTORY_PATH,verifyBudgetInventoryCopy,verifyReadOnlyInputContracts,checkManifestShape,
} from '../budget-runner-core.mjs';

const evidence=fileURLToPath(new URL('.',import.meta.url));
const adapter=resolve(evidence,'..'),root=resolve(adapter,'../../../..');
const priorBytes=await readFile(resolve(evidence,'prior-artifacts/reviewed-inputs.json'));
assert.equal(sha256(priorBytes),'8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8');
const prior=JSON.parse(priorBytes),original=await readFile(resolve(root,prior.inputs.protectedDataSql.file));
const oldCode=[];
for(const file of REVIEWED_CODE_FILES){const bytes=await readFile(resolve(evidence,'prior-artifacts',file));oldCode.push({file,bytes:bytes.length,sha256:sha256(bytes)});}
assert.equal(bundleSha256(priorBytes,oldCode),'0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9');
const budget=await readFile(resolve(root,BUDGET_INVENTORY_PATH));
verifyBudgetInventoryCopy(original,budget);verifyBudgetSql(await readFile(resolve(root,SQL_PATH)));
const manifest=structuredClone(prior);
manifest.inputs.originalProtectedDataSql=structuredClone(prior.inputs.protectedDataSql);
manifest.inputs.protectedDataSql={file:BUDGET_INVENTORY_PATH,bytes:budget.length,sha256:sha256(budget)};
manifest.inputs=Object.fromEntries(Object.entries(manifest.inputs).sort(([a],[b])=>a<b?-1:a>b?1:0));
const inputBytes={};
for(const [name,pin] of Object.entries(manifest.inputs)){
  const bytes=await readFile(resolve(root,pin.file));
  assert.equal(bytes.length,pin.bytes);assert.equal(sha256(bytes),pin.sha256);inputBytes[name]=bytes;
  if(!['protectedDataSql','originalProtectedDataSql'].includes(name))assert.deepEqual(pin,prior.inputs[name]);
}
const contracts=verifyReadOnlyInputContracts(inputBytes);
manifest.codeIdentities=[];
for(const file of REVIEWED_CODE_FILES){const bytes=await readFile(resolve(adapter,file));manifest.codeIdentities.push({file,bytes:bytes.length,sha256:sha256(bytes)});}
manifest.codeIdentities.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
assert.deepEqual(manifest.driverTree,prior.driverTree);
assert.equal(manifest.foundationStructureSha256,prior.foundationStructureSha256);
assert.deepEqual(manifest.codeIdentities.find(item=>item.file==='operation-acl.ps1'),prior.codeIdentities.find(item=>item.file==='operation-acl.ps1'));
checkManifestShape(manifest);
const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n','utf8');
await writeFile(resolve(adapter,'reviewed-inputs.json'),bytes);
const identity={oldBundleSha256:bundleSha256(priorBytes,oldCode),oldManifestSha256:sha256(priorBytes),bundleSha256:bundleSha256(bytes,manifest.codeIdentities),manifestSha256:sha256(bytes),dedicatedInventorySha256:sha256(budget),dedicatedInventoryBytes:budget.length,originalInventorySha256:sha256(original),originalInventoryBytes:original.length,approvedSql:manifest.sql,codeIdentities:manifest.codeIdentities,contracts,unchangedOtherInputPins:true,unchangedDriverRuntime:true,unchangedAclHelper:true};
await writeFile(resolve(evidence,'corrected-identities.json'),JSON.stringify(identity,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',bundleSha256:identity.bundleSha256,manifestSha256:identity.manifestSha256,contracts:contracts.length,sqlUnchanged:true}));
