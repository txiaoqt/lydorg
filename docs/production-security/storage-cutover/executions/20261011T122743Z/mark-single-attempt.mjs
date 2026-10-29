// Persistent single-attempt boundary. Does not access the network or credentials.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='docs/production-security/storage-cutover/executions/20261011T122743Z/';
const actual=JSON.parse(await readFile('.agent/security/production-storage-review/production-storage-foundation.operation.lock.json','utf8'));
const claim=JSON.parse(await readFile(root+'operator-lock-acquired.json','utf8'));
const receipt=JSON.parse(await readFile(root+'pre-install-receipt.json','utf8'));
if(actual.nonce!==claim.nonce||actual.project!=='mqqaykksadotbrghbexz'||actual.execution!=='20261011T122743Z')throw new Error('Operator lock mismatch');
const bytes=await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql');
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!==receipt.sqlSha256||sha256!=='e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2')throw new Error('Artifact mismatch');
const marker={status:'ONE_SUBMISSION_BOUNDARY_STARTED',project:actual.project,sha256,startedAt:new Date().toISOString(),attempt:1,automaticRetries:0,execution:actual.execution};
await writeFile(root+'attempt-started.json',JSON.stringify(marker,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(marker));

