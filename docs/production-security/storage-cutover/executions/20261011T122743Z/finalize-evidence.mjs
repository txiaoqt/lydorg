// Local receipt verification only; never contacts Supabase.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='docs/production-security/storage-cutover/executions/20261011T122743Z/';
const receipt=JSON.parse(await readFile(root+'execution-receipt.json','utf8'));
const fingerprints=JSON.parse(await readFile(root+'function-trigger-policy-fingerprints.json','utf8'));
if(receipt.status!=='NOT_INSTALLED_AFTER_CONTROL_PLANE_SUBMISSION_ERROR'||receipt.attempts!==1||receipt.automaticRetries!==0||!receipt.operatorLockReleased)throw new Error('Invalid final receipt');
if(fingerprints.documentSecurityTriggers.length!==3||fingerprints.containmentMarkerTriggers.length!==4||fingerprints.disabledTestMutationFunctions.length!==12||fingerprints.storagePolicies.length!==15)throw new Error('Invalid preserved security evidence');
const entries=[];
for(const file of (await readdir(root)).sort()){
 if(file==='evidence-manifest.json')continue;
 const bytes=await readFile(root+file);
 if(file.endsWith('.json'))JSON.parse(bytes.toString('utf8'));
 entries.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(root+'evidence-manifest.json',JSON.stringify({project:'mqqaykksadotbrghbexz',status:receipt.status,entries},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,evidenceFiles:entries.length,documentSecurityTriggers:3,containmentMarkers:4,storagePolicies:15,automaticRetries:0}));
