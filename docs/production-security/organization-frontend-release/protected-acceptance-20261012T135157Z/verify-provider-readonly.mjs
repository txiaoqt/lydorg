// Read-only provider verification. Never deploy, promote, read credentials or decrypt environment settings.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {api,state,guard,sha,org,teamId} from '../../../../.agent/organization-candidate-deploy-20261012T122419Z/common.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const id='dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ';
const expectedUrl='yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app';
const before=JSON.parse(await fs.readFile(path.join(root,'docs/production-security/organization-frontend-release/candidate-deployment-20261012T122419Z/hosted-source-identity.json'),'utf8'));
try{
  const current=await state({excludeCandidate:id});
  const d=await api('/v13/deployments/'+id);
  guard(d.id===id&&d.projectId===org&&d.ownerId===teamId&&d.url===expectedUrl&&d.readyState==='READY','CANDIDATE_IDENTITY_OR_STATE_DRIFT');
  const tree=await api('/v6/deployments/'+id+'/files');
  const roots=Array.isArray(tree)?tree:tree.files;
  const src=roots?.filter(n=>n.name==='src');
  guard(src?.length===1&&Array.isArray(src[0].children),'HOSTED_SOURCE_TREE_MISSING');
  const files=[];
  function walk(nodes,prefix=''){
    for(const n of nodes){
      guard(typeof n.name==='string'&&!/[\/\\]/.test(n.name),'HOSTED_PATH_INVALID');
      const name=prefix?prefix+'/'+n.name:n.name;
      if(n.type==='directory'||Array.isArray(n.children))walk(n.children??[],name);
      else files.push({path:name,digest:n.sha??n.uid,size:n.size});
    }
  }
  walk(src[0].children);files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  guard(JSON.stringify(files)===JSON.stringify(before.files),'HOSTED_SOURCE_IDENTITY_DRIFT');
  const result={capturedAt:new Date().toISOString(),status:'PASS',readOnly:true,provider:current.summary,candidate:{id:d.id,url:d.url,readyState:d.readyState,projectId:d.projectId,ownerId:d.ownerId,createdAt:d.createdAt??d.created,target:d.target,alias:d.alias,projectSettings:{framework:d.projectSettings?.framework,nodeVersion:d.projectSettings?.nodeVersion,buildCommand:d.projectSettings?.buildCommand,installCommand:d.projectSettings?.installCommand,outputDirectory:d.projectSettings?.outputDirectory}},sourceIdentity:{status:'PASS',files:files.length,providerSourceMetadataSha256:sha(JSON.stringify(files)),matchesPreviousDeploymentSourceEvidence:true,limitation:'Provider source metadata identity; not browser-served static artifact verification.'},publicEnvironmentValuesRetrieved:false,deploymentCalls:0,promotionCalls:0};
  await fs.writeFile(path.join(here,'provider-preservation.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'PASS',candidate:id,state:d.readyState,sourceFiles:files.length,adminAlias:current.summary.adminAlias.deploymentId,organizationAlias:current.summary.organizationAlias.deploymentId,organizationWwwRedirect:current.summary.organizationDomains.find(n=>n.name==='www.ytrace.app')?.redirect}));
}catch(error){
  const reason=/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'PROVIDER_READONLY_VERIFICATION_BLOCKED';
  await fs.writeFile(path.join(here,'provider-blocker-'+Date.now()+'.json'),JSON.stringify({capturedAt:new Date().toISOString(),status:'BLOCKED',reason,noMutations:true},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'BLOCKED',reason}));process.exitCode=1;
}
