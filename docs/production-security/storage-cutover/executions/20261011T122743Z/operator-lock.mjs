// Cooperative operator lock only; the separately confirmed exclusive window is required.
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const directory=resolve('.agent/security/production-storage-review');
const path=resolve(directory,'production-storage-foundation.operation.lock.json');
const evidence=resolve('docs/production-security/storage-cutover/executions/20261011T122743Z/operator-lock-acquired.json');
const mode=process.argv[2];
if(mode==='acquire'){
 await mkdir(directory,{recursive:true});
 const claim={project:'mqqaykksadotbrghbexz',scope:'FOUNDATION ONLY',artifactSha256:'e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2',execution:'20261011T122743Z',nonce:randomUUID(),acquiredAt:new Date().toISOString(),kind:'cooperative operator lock; exclusive human window separately confirmed'};
 await writeFile(path,JSON.stringify(claim,null,2)+'\n',{flag:'wx'});
 await writeFile(evidence,JSON.stringify(claim,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({acquired:true,project:claim.project,execution:claim.execution}));
}else if(mode==='verify'||mode==='release'){
 const a=JSON.parse(await readFile(path,'utf8'));
 const b=JSON.parse(await readFile(evidence,'utf8'));
 if(a.nonce!==b.nonce||a.project!==b.project||a.execution!==b.execution||a.artifactSha256!==b.artifactSha256)throw new Error('Foreign or changed lock; do not remove');
 if(mode==='release')await unlink(path);
 console.log(JSON.stringify({owned:true,released:mode==='release',project:a.project,execution:a.execution}));
}else throw new Error('Unknown lock operation');

