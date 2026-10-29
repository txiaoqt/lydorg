// Local immutable review copy; no runner execution or operator-state access.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile,readdir,lstat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {constants} from 'node:fs';
import {sha256} from '../budget-runner-core.mjs';
const evidence=fileURLToPath(new URL('.',import.meta.url)),adapter=resolve(evidence,'..');
const destination=resolve(evidence,'corrected-artifacts');
await mkdir(destination); // Existing review copies are never overwritten.
const names=['budget-runner-core.mjs','native-budget-pause-runner.mjs','native-budget-pause.test.mjs','operation-acl.ps1','budget-identity-readonly.sql','budget-protected-data-readonly.sql','reviewed-inputs.json','operator-procedure.md','read-only-preflight-authorization-draft.md','readiness-report.md','focused-tests.tap','offline-review.json','authorization-draft.json','execution-receipt.template.json'];
for(const name of names){await copyFile(resolve(adapter,name),resolve(destination,name),constants.COPYFILE_EXCL);assert.deepEqual(await readFile(resolve(adapter,name)),await readFile(resolve(destination,name)));}
const files=[];
async function visit(directory){
  for(const name of (await readdir(directory)).sort()){
    if(name==='final-artifact-manifest.json')continue;
    const path=resolve(directory,name),info=await lstat(path);assert.equal(info.isSymbolicLink(),false);
    if(info.isDirectory())await visit(path);
    else {assert.equal(info.isFile(),true);const bytes=await readFile(path);files.push({file:relative(evidence,path).replaceAll('\\','/'),bytes:bytes.length,sha256:sha256(bytes)});}
  }
}
await visit(evidence);
const identities=JSON.parse(await readFile(resolve(evidence,'corrected-identities.json'),'utf8'));
const manifest={status:'LOCAL_REVIEW_COPY_COMPLETE',bundleSha256:identities.bundleSha256,manifestSha256:identities.manifestSha256,operatorStateCopied:false,credentialsIncluded:false,files};
await writeFile(resolve(evidence,'final-artifact-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',reviewCopyFiles:names.length,evidenceFiles:files.length,artifactManifestSha256:sha256(await readFile(resolve(evidence,'final-artifact-manifest.json')))}));
