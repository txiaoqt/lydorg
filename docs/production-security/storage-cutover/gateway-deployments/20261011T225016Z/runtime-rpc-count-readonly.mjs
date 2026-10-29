// Read-only aggregate runtime evidence; never outputs query text or credentials.
import {readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {Client} from 'pg';
import {connectionConfiguration,connectClientOnce,requireGuard,safeError} from '../../native-runner-20261011T132539Z/runner-core.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));let client;
try{
 const phase=process.env.YTRACE_GATEWAY_RPC_COUNT_PHASE;requireGuard(['before','after'].includes(phase),'INVALID_PHASE');
 const conn=await connectClientOnce(Client,await connectionConfiguration(process.env,{readOnly:true}));client=conn.client;
 const identity=(await client.query("SELECT current_database() database,current_user,current_setting('transaction_read_only') read_only")).rows[0];
 requireGuard(identity.database==='postgres'&&identity.current_user==='postgres'&&identity.read_only==='on'&&client.connection.stream.authorized===true,'READ_ONLY_IDENTITY_MISMATCH');
 const exists=(await client.query("SELECT to_regclass('extensions.pg_stat_statements') IS NOT NULL available")).rows[0].available;
 let stats=[];if(exists)stats=(await client.query("SELECT r.rolname, sum(s.calls)::text calls FROM extensions.pg_stat_statements s JOIN pg_roles r ON r.oid=s.userid WHERE s.query LIKE $1 GROUP BY r.rolname ORDER BY r.rolname",['%admin_authorize_storage_operation%'])).rows;
 const value={status:exists?'PASS':'NOT TESTED',project:'mqqaykksadotbrghbexz',phase,readOnly:true,capturedAt:new Date().toISOString(),stats,onlyAggregateCounters:true};
 if(phase==='after'){
  const before=JSON.parse(await readFile(here+'runtime-rpc-count-before.json','utf8'));
  value.delta=stats.map(r=>({role:r.rolname,callsDelta:Number(r.calls)-Number(before.stats.find(b=>b.rolname===r.rolname)?.calls??0)}));
 }
 await writeFile(here+'runtime-rpc-count-'+phase+'.json',JSON.stringify(value,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(value));
}catch(error){console.log(JSON.stringify({status:'NOT TESTED',error:safeError(error)}));process.exitCode=2;}finally{if(client)await client.end().catch(()=>{});}
