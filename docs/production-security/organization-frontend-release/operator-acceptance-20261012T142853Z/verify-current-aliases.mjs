// Pinned authenticated provider GETs only. No deploy/promote/configuration calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {api,guard,org,admin,teamId,expectedAdmin,expectedOrg,alias} from '../../../../.agent/organization-candidate-deploy-20261012T122419Z/common.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
try{
  const results=[];
  for(const endpoint of ['/v13/deployments/dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ','/v4/aliases/y-trace-admin.vercel.app','/v4/aliases/ytrace.app','/v9/projects/'+org+'/domains','/v9/projects/'+admin,'/v9/projects/'+org])results.push(await api(endpoint));
  const[d,a,o,domains,adminProject,orgProject]=results;
  guard(d.id==='dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ'&&d.url==='yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app'&&d.readyState==='READY'&&d.projectId===org&&d.ownerId===teamId,'CANDIDATE_DRIFT');
  guard(alias(a).projectId===admin&&alias(a).deploymentId===expectedAdmin&&alias(o).projectId===org&&alias(o).deploymentId===expectedOrg,'LIVE_ALIAS_DRIFT');
  guard(adminProject.id===admin&&adminProject.accountId===teamId&&adminProject.targets?.production?.id===expectedAdmin&&orgProject.id===org&&orgProject.accountId===teamId&&orgProject.targets?.production?.id===expectedOrg,'PROJECT_PRODUCTION_TARGET_DRIFT');
  const www=(domains.domains??[]).find(n=>n.name==='www.ytrace.app');
  guard(www?.verified===true&&www.redirect==='ytrace.app'&&www.redirectStatusCode===307,'WWW_REDIRECT_DRIFT');
  const result={capturedAt:new Date().toISOString(),status:'PASS',candidate:{id:d.id,url:d.url,state:d.readyState,projectId:d.projectId,teamId:d.ownerId},adminAlias:alias(a),organizationAlias:alias(o),www:{name:www.name,verified:www.verified,redirect:www.redirect,redirectStatusCode:www.redirectStatusCode},projectProductionTargets:{admin:adminProject.targets.production.id,organization:orgProject.targets.production.id},readOnlyProviderGets:6,deployments:0,promotions:0,environmentValuesRead:false};
  await fs.writeFile(path.join(here,'provider-current-preservation.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result));
}catch(error){
  const reason=/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'PROVIDER_CHECK_BLOCKED';
  await fs.writeFile(path.join(here,'provider-readonly-blocker-'+Date.now()+'.json'),JSON.stringify({capturedAt:new Date().toISOString(),status:'BLOCKED',reason},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'BLOCKED',reason}));process.exitCode=1;
}
