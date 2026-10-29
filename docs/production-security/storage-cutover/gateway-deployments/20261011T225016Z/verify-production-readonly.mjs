// Bounded READ-ONLY production verification for the authorized gateway release.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from 'pg';
import {connectionConfiguration,connectClientOnce,selectRow,verifyNativeIdentity,verifyCatalog,verifyPostflight,sha256,requireGuard,safeError} from '../../native-runner-20261011T132539Z/runner-core.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../../../../..');
const review=resolve(root,'docs/production-security/storage-cutover/20261011T113322Z');
const prior=resolve(root,'docs/production-security/storage-cutover/executions/20261011T122743Z');
let client;
try{
 requireGuard(process.argv.length===2,'UNEXPECTED_ARGUMENT');
 const configuration=await connectionConfiguration(process.env,{readOnly:true});
 const conn=await connectClientOnce(Client,configuration); client=conn.client;
 const identity=selectRow(await client.query(await readFile(resolve(root,'docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-identity-privileges-readonly.sql'),'utf8')),'native_identity');
 verifyNativeIdentity(identity);
 requireGuard(client.connection.stream.authorized===true&&client.connection.stream.encrypted===true,'TLS_SOCKET_UNVERIFIED');
 const catalog=selectRow(await client.query(await readFile(resolve(review,'compatibility-fingerprint-readonly.sql'),'utf8')),'catalog');
 verifyCatalog(catalog,{installed:true});
 const foundation=selectRow(await client.query(await readFile(resolve(prior,'post-install-readonly.sql'),'utf8')),'foundation_verification');
 const sql=await readFile(resolve(review,'production_storage_foundation_review.sql'),'utf8');
 requireGuard(sha256(Buffer.from(sql,'utf8'))==='e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2','FOUNDATION_ARTIFACT_CHANGED');
 verifyPostflight(foundation,JSON.parse(await readFile(resolve(review,'expected-foundation-functions.json'),'utf8')),sql);
 const receipt=JSON.parse(await readFile(resolve(root,'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/postflight.json'),'utf8'));
 for(const key of ['functions','tables','triggers']){
  requireGuard(JSON.stringify(foundation[key])===JSON.stringify(receipt.foundation[key]),'FOUNDATION_RECEIPT_'+key.toUpperCase()+'_DRIFT');
 }
 const protectedData=selectRow(await client.query(await readFile(resolve(prior,'protected-data-readonly.sql'),'utf8')),'preserved_data');
 requireGuard(protectedData.preserved_data.length===57,'PROTECTED_INVENTORY_SHAPE_MISMATCH');
 const phase=process.env.YTRACE_GATEWAY_VERIFICATION_PHASE;
 requireGuard(['pre','post','acceptance'].includes(phase),'INVALID_VERIFICATION_PHASE');
 const result={status:'PASS',capturedAt:new Date().toISOString(),project:'mqqaykksadotbrghbexz',phase,readOnly:true,tlsChainAndHostnameVerified:true,identity:{database:identity.database,current_user:identity.current_user,session_user:identity.session_user,server_version_num:identity.server_version_num,tls_version:identity.tls_version,read_only:identity.read_only},compatibilitySha256:catalog.compatibility_sha256,migrations:catalog.catalog.migration_history,foundationReceiptExactMatch:true,foundationFingerprints:Object.fromEntries(['functions','tables','triggers'].map(k=>[k,sha256(JSON.stringify(foundation[k]))])),storagePolicies:catalog.catalog.all_policies.filter(p=>p.schemaname==='storage'&&p.tablename==='objects'),containmentMarkers:catalog.catalog.triggers.filter(t=>t.name==='a_production_fixture_markers_guard'),documentSecurityTriggers:catalog.catalog.triggers.filter(t=>['a_document_mutation_guard','b_document_direct_guard','a_document_parent_guard'].includes(t.name)),foundation,protectedData};
 if(phase!=='pre'){
  const before=JSON.parse(await readFile(resolve(here,'database-preflight.json'),'utf8'));
  requireGuard(JSON.stringify(result.storagePolicies)===JSON.stringify(before.storagePolicies),'STORAGE_POLICY_CHANGED');
  requireGuard(JSON.stringify(result.foundationFingerprints)===JSON.stringify(before.foundationFingerprints),'FOUNDATION_CHANGED');
  result.protectedDataMatchesImmediatePreflight=JSON.stringify(result.protectedData.preserved_data)===JSON.stringify(before.protectedData.preserved_data);
  result.changedInventories=result.protectedData.preserved_data.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(before.protectedData.preserved_data[i])).map(r=>r.key??r.table??r.name??r);
 }
 await writeFile(resolve(here,phase==='pre'?'database-preflight.json':phase==='post'?'database-postflight.json':'database-acceptance-postflight.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.status,phase,readOnly:true,tlsChainAndHostnameVerified:true,foundationReceiptExactMatch:true,compatibilitySha256:result.compatibilitySha256,migrations:result.migrations.count,storagePolicies:result.storagePolicies.length,protectedInventories:result.protectedData.preserved_data.length,protectedDataMatchesImmediatePreflight:result.protectedDataMatchesImmediatePreflight,changedInventories:result.changedInventories}));
}catch(error){console.log(JSON.stringify({status:'FAIL',error:safeError(error)}));process.exitCode=2;}finally{if(client)await client.end().catch(()=>{});}
