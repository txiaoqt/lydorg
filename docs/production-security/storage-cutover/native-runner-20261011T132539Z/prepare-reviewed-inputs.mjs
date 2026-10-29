// Local preparation only. Never connects, reads credentials or creates approval records.
import {readFile,writeFile} from 'node:fs/promises';
import {TARGET,sha256,verifyArtifact} from './runner-core.mjs';
const directory='docs/production-security/storage-cutover/native-runner-20261011T132539Z/';
const review='docs/production-security/storage-cutover/20261011T113322Z/';
const prior='docs/production-security/storage-cutover/executions/20261011T122743Z/';
const paths={sql:review+'production_storage_foundation_review.sql',catalog:review+'compatibility-fingerprint-readonly.sql',data:prior+'protected-data-readonly.sql',absence:prior+'final-recovery-readonly.sql',post:prior+'post-install-readonly.sql',dataBaseline:prior+'immediate-data-before.json',expectedFunctions:review+'expected-foundation-functions.json',identity:directory+'native-identity-privileges-readonly.sql'};
const inputs={};
for(const [name,file] of Object.entries(paths)){
 const bytes=await readFile(file);
 if(name==='sql')verifyArtifact(bytes);
 inputs[name]={file,bytes:bytes.length,sha256:sha256(bytes)};
}
await writeFile(directory+'reviewed-inputs.json',JSON.stringify({version:1,driverVersion:'8.23.0',target:TARGET,inputs},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',inputs:Object.keys(inputs).length,remoteConnections:0}));
