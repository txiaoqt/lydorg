// Local comparison only. Does not issue HTTP requests or access browser credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(here,'../vercel24-20261012T114439Z/static-manifest.json'),'utf8'));
const inputBytes=await fs.readFile(path.join(here,'operator-observed-input.json'));
const input=JSON.parse(inputBytes);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expectedHash='bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94';
const fileDifferences=[];
for(const f of manifest.files){
  const matches=input.observedFiles.filter(g=>g.path===f.path);
  if(matches.length!==1||matches[0].bytes!==f.bytes||matches[0].sha256!==f.sha256)fileDifferences.push(f.path);
}
for(const f of input.observedFiles)if(!manifest.files.some(g=>g.path===f.path))fileDifferences.push(f.path);
const routeExpectations=[['/','GET',200],['/dashboard','GET',200],['/app','GET',200],['/document-submission','GET',200],['/organization-renewal','GET',200],['/app/documents','GET',200],['/app/renewals','GET',200],['/api/sync-run-once','GET',405],['/api/sync-run-once','OPTIONS',204]];
const shell=manifest.files.find(f=>f.path==='index.html');
const routeDifferences=[];
for(const [route,method,status] of routeExpectations){
  const rows=input.requests.filter(r=>r.path===route&&r.method===method);
  const r=rows[0];
  if(rows.length!==1||r.http!==status||r.redirectBlocked||r.headerMismatches.length)routeDifferences.push(route+' '+method);
  else if(!route.startsWith('/api/')&&(r.bytes!==shell.bytes||r.sha256!==shell.sha256||(route!=='/'&&r.sameShell!==true)))routeDifferences.push(route+' shell');
}
const expectedGetBody=Buffer.from(JSON.stringify({ok:false,error:'Method not allowed. Use POST.'}).replaceAll(':',': ').replaceAll(',',', '));
const get=input.requests.find(r=>r.path==='/api/sync-run-once'&&r.method==='GET');
const options=input.requests.find(r=>r.path==='/api/sync-run-once'&&r.method==='OPTIONS');
const pythonBodiesMatch=get?.bytes===expectedGetBody.length&&get?.sha256===sha(expectedGetBody)&&options?.bytes===0&&options?.sha256===sha(Buffer.alloc(0));
const identityMatches=input.deploymentId==='dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ'&&input.sourceRevision===manifest.sourceRevision.replace(/^sha256:/,'')&&input.expectedVersion===manifest.fixedVersion&&input.origin==='https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app';
const scanPass=input.secretScan.filesScanned===33&&input.secretScan.findings.length===0;
const inventoryMatches=manifest.files.length===53&&input.observedFiles.length===53&&sha(JSON.stringify(manifest.files))===expectedHash&&sha(JSON.stringify(input.observedFiles))===expectedHash&&!fileDifferences.length;
const summaryMatches=input.summary.expectedAssets===53&&input.summary.matchedAssets===53&&input.summary.failedAssets===0&&input.summary.blockedAssets===0&&input.summary.headerFailures===0&&input.summary.pythonHttp==='PASS'&&input.summary.secretFindings===0&&input.summary.blockedRequests===0;
const scopeMatches=input.privateFileRequests===0&&input.postRequests===0&&input.credentialReads===0&&input.requests.length===9&&input.assetCommonReportedFields.method==='GET'&&input.assetCommonReportedFields.http===200&&input.assetCommonReportedFields.headerMismatches.length===0&&!input.assetCommonReportedFields.redirectBlocked;
const status=identityMatches&&inventoryMatches&&!routeDifferences.length&&pythonBodiesMatch&&scanPass&&summaryMatches&&scopeMatches?'PASS':'FAIL';
const result={comparedAt:new Date().toISOString(),status,evidenceOrigin:'Operator-executed browser output; independently compared locally, not independently captured',inputSha256:sha(inputBytes),deploymentId:input.deploymentId,identityMatches,inventoryMatches,expectedInventorySha256:expectedHash,observedInventorySha256:sha(JSON.stringify(input.observedFiles)),matchedFiles:53-fileDifferences.length,files:input.observedFiles.length,totalAssetBytes:input.observedFiles.reduce((n,f)=>n+f.bytes,0),fileDifferences,routeDifferences,reportedHeaderMismatches:0,rootAndDeepRoutes:'7 matching HTTP 200 SPA shells',pythonGet:{http:get.http,bytes:get.bytes,sha256:get.sha256},pythonOptions:{http:options.http,bytes:options.bytes,sha256:options.sha256},pythonBodiesMatch,scanPass,scanFiles:input.secretScan.filesScanned,summaryMatches,scopeMatches,networkBypass:{operatorConfirmed:input.operatorConfirmedNetworkBypass,workerControllerPresent:input.serviceWorkerControllerPresent,independentlyAttested:false,limitation:'DevTools bypass confirmed by operator. The checker records worker presence but cannot attest that setting; preserve this evidence limitation.'},newNetworkRequests:0,productionMutationsByThisComparator:0};
await fs.writeFile(path.join(here,'operator-evidence-comparison.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
if(status!=='PASS')process.exitCode=1;
