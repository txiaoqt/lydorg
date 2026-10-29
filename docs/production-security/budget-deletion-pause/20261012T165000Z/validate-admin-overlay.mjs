// LOCAL isolated compilation only. No network requests, provider operations or secret env loading.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import JSZip from '../../../../node_modules/jszip/lib/index.js';
const dir='docs/production-security/budget-deletion-pause/20261012T165000Z';
const base='.agent/admin-storage-vercel-20261012T061324Z';
const local='.agent/budget-deletion-pause-20261012T165000Z';
const target=path.resolve(local,'source');
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const manifest=await json(`${base}/source-manifest.json`);
const zipBytes=await fs.readFile(`${base}/admin-gateway-vercel24-source.zip`);
assert.equal(sha(zipBytes),'a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465');
const zip=await JSZip.loadAsync(zipBytes);
assert.equal(Object.values(zip.files).filter(f=>!f.dir).length,561);
await fs.mkdir(target,{recursive:true});
for(const f of manifest.files){
 assert.ok(!f.path.includes('..')&&!path.isAbsolute(f.path));
 const bytes=await zip.file(f.path).async('nodebuffer');assert.equal(sha(bytes),f.sha256);assert.equal(bytes.length,f.bytes);
 const dest=path.join(target,f.path);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);
}
const files=['src/admin/AdminPortal.tsx','src/admin/components/BudgetRequestsTable.tsx','src/lib/lydo-connect-supabase.ts','src/lib/admin-budget-deletion-pause.ts'];
for(const f of files)await fs.copyFile(`${dir}/admin-release-overlay/${f}`,path.join(target,f));
// A distinct version is a future packaging requirement. This local compilation
// checks the four runtime files with the unchanged reviewed build recipe.
const buildZip=await JSZip.loadAsync(await fs.readFile(`${base}/admin-gateway-vercel24-static-build.zip`));
const publicKeys=new Set();
for(const f of Object.values(buildZip.files).filter(f=>!f.dir&&f.name.endsWith('.js'))){
 const text=await f.async('string');
 for(const value of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){
  let claims;try{claims=JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());}catch{continue;}
  if(claims.role==='anon'&&claims.ref==='mqqaykksadotbrghbexz')publicKeys.add(value);
 }
}
assert.equal(publicKeys.size,1,'Require one existing production-bound PUBLIC anon key');
const config={VITE_DEPLOY_SURFACE:'admin',VITE_ADMIN_APP_URL:'https://y-trace-admin.vercel.app',VITE_SUPABASE_URL:'https://mqqaykksadotbrghbexz.supabase.co',VITE_SUPABASE_ANON_KEY:[...publicKeys][0]};
const configHash=sha(JSON.stringify(Object.fromEntries(Object.entries(config).sort())));
assert.equal(configHash,'27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a');
const runtime=path.resolve('.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64');
const node=path.join(runtime,'node.exe');await fs.access(node);
const environment={PATH:runtime+path.delimiter+(process.env.PATH||'')};
for(const name of ['SystemRoot','WINDIR','TEMP','TMP','ComSpec','PATHEXT'])if(process.env[name])environment[name]=process.env[name];
async function run(args,env,name){
 const log=await fs.open(`${dir}/${name}`,'wx');
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(node,args,{cwd:target,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>log.write(b));child.stderr.on('data',b=>log.write(b));
  child.once('error',()=>reject(Error('LOCAL_PROCESS_UNAVAILABLE')));child.once('close',resolve);
 });await log.close();return code;
}
const build=await run(['scripts/build-admin-release.mjs'],{...environment,...config},'isolated-admin-build.log');
const types=await run([path.resolve('node_modules/typescript/bin/tsc'),'--project','tsconfig.app.json','--noEmit','--pretty','false'],environment,'isolated-admin-typescript.log');
const unchanged=[];
for(const f of manifest.files.filter(f=>!files.includes(f.path)))assert.equal(sha(await fs.readFile(path.join(target,f.path))),f.sha256);
const inventory=[];
async function walk(d,rel=''){for(const f of await fs.readdir(d,{withFileTypes:true})){const name=rel?`${rel}/${f.name}`:f.name;if(f.isDirectory())await walk(path.join(d,f.name),name);else{const b=await fs.readFile(path.join(d,f.name));inventory.push({path:name,bytes:b.length,sha256:sha(b)});}}}
if(build===0)await walk(path.join(target,'build'));
inventory.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
await fs.writeFile(`${dir}/isolated-generated-inventory.json`,JSON.stringify(inventory,null,2)+'\n');
await fs.writeFile(`${dir}/isolated-build-results.json`,JSON.stringify({build:build===0?'PASS':'FAIL',buildExit:build,typecheck:types===0?'PASS':'FAIL',typecheckExit:types,platform:'win32',node:'24.21.0',baseSourceIdentitiesVerified:561,runtimeOverlay:files,unrelatedSourceIdentitiesPreserved:manifest.files.length-3,publicConfigurationSha256:configHash,publicKeyClass:'anon',privateEnvironmentFilesRead:false,productionWrites:0,buildVersion:'Unchanged base version for local validation only; not a deployable release identity',generatedFiles:inventory.length,generatedInventorySha256:sha(JSON.stringify(inventory))},null,2)+'\n');
console.log(JSON.stringify({localBuild:build===0?'PASS':'FAIL',actualAppTypecheck:types===0?'PASS':'FAIL',generatedFiles:inventory.length,sourceIdentitiesPreserved:true}));
