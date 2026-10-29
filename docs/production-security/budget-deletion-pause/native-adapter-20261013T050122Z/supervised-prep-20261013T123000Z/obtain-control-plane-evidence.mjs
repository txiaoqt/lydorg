// Operator-approved control-plane route: local Supabase CLI `projects list -o json` (read-only Management API GET).
// Only sanitized project metadata is saved. No database connection.
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('.',import.meta.url)),root=resolve(directory,'../../../../..');
const requestedAt=new Date().toISOString();
const run=spawnSync(`"${resolve(root,'node_modules/.bin/supabase.cmd')}"`,['projects','list','-o','json'],{cwd:root,encoding:'utf8',shell:true,timeout:60000,env:{...process.env,SUPABASE_NO_UPDATE_CHECK:'1'}});
const verifiedAt=new Date().toISOString();
try{
  if(run.status!==0)throw new Error('CONTROL_PLANE_CLI_FAILED');
  const start=run.stdout.indexOf('[');if(start<0)throw new Error('CONTROL_PLANE_CLI_OUTPUT_INVALID');
  const projects=JSON.parse(run.stdout.slice(start));
  const matches=projects.filter(p=>(p.ref??p.id)==='mqqaykksadotbrghbexz');
  if(matches.length!==1)throw new Error('CONTROL_PLANE_PROJECT_NOT_FOUND');
  const p=matches[0],host=p.database?.host;
  if(host!=='db.mqqaykksadotbrghbexz.supabase.co')throw new Error('CONTROL_PLANE_HOST_MISMATCH');
  if(p.status!=='ACTIVE_HEALTHY')throw new Error('CONTROL_PLANE_PROJECT_NOT_HEALTHY');
  const evidence={project:'mqqaykksadotbrghbexz',host,status:p.status,verifiedVia:'supabase-control-plane-get-project',verifiedAt,platformVersion:p.database?.version??null,actualRoute:'supabase-cli-2.118.0-projects-list-json (operator-approved substitute for MCP get_project; same Management API project record)',requestedAt,onlySanitizedMetadataSaved:true};
  await writeFile(resolve(directory,'control-plane-evidence.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'PASS',...evidence}));
}catch(error){
  console.log(JSON.stringify({status:'BLOCKED',code:/^[A-Z_]+$/.test(error.message)?error.message:'CONTROL_PLANE_EVIDENCE_FAILED',cliExit:run.status,automaticRetries:0,databaseConnectionAttempted:false}));
  process.exitCode=2;
}
