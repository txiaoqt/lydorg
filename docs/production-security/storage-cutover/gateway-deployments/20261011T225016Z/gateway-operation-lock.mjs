// Local gateway-operation exclusivity only. Never deploys or touches a database.
import {open,mkdir,readFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const file=resolve('.agent/security/production-admin-storage-gateway/operation.lock.json');
const claim={project:'mqqaykksadotbrghbexz',gateway:'admin-storage-access',pid:process.pid,nonce:randomUUID(),createdAt:new Date().toISOString()};
try{
 await mkdir(resolve(file,'..'),{recursive:true});
 const handle=await open(file,'wx',0o600);
 try{await handle.writeFile(JSON.stringify(claim)+'\n');await handle.sync();}finally{await handle.close();}
 console.log(JSON.stringify({status:'LOCK_HELD',...claim}));
 process.stdin.setEncoding('utf8');process.stdin.resume();
 let input='';const keepAlive=setInterval(()=>{},1000);
 process.stdin.on('data',async chunk=>{
  input+=chunk;if(!input.includes('\n'))return;const command=input.trim();input='';
  if(command!=='RELEASE '+claim.nonce)return;
  try{
   if(JSON.stringify(JSON.parse(await readFile(file,'utf8')))!==JSON.stringify(claim))throw Error('LOCK_OWNER_CHANGED');
   await unlink(file);clearInterval(keepAlive);
   console.log(JSON.stringify({status:'LOCK_RELEASED',pid:process.pid}));process.exit(0);
  }catch{console.log(JSON.stringify({status:'LOCK_RELEASE_FAILED'}));process.exit(2);}
 });
}catch(error){console.log(JSON.stringify({status:'LOCK_NOT_ACQUIRED',code:error.code==='EEXIST'?'LOCK_EXISTS':'LOCAL_LOCK_FAILED'}));process.exit(2);}
