// PREPARATION ONLY. Default --review is offline. --install needs a new human approval
// record at a fixed ignored path, current control-plane proof and verified TLS credentials.
import {readFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {
 TARGET,SQL_SHA,SQL_BYTES,sha256,requireGuard,safeError,missingEnvironment,
 verifyEndpoint,verifyArtifact,connectionConfiguration,connectClientOnce,verifyControlPlane,verifyAuthorization,
 selectRow,verifyNativeIdentity,verifyCatalog,verifyAbsence,verifyData,verifyPostflight,
 durableJson,claimLock,singleAttempt,
} from './runner-core.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(directory,'../../../..');
const review='docs/production-security/storage-cutover/20261011T113322Z/';
const prior='docs/production-security/storage-cutover/executions/20261011T122743Z/';
const inputs={sql:review+'production_storage_foundation_review.sql',catalog:review+'compatibility-fingerprint-readonly.sql',data:prior+'protected-data-readonly.sql',absence:prior+'final-recovery-readonly.sql',post:prior+'post-install-readonly.sql',dataBaseline:'docs/production-security/storage-cutover/data-drift-review/20261011T151810Z/protected-data-baseline.json',expectedFunctions:review+'expected-foundation-functions.json',identity:'docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-identity-privileges-readonly.sql'};
const state=resolve(root,'.agent/security/production-storage-review');
const authorizationPath=resolve(state,'native-foundation-authorization.json');
const controlPlanePath=resolve(state,'native-foundation-control-plane.json');
const markerPath=resolve(state,'native-foundation-attempt-started.json');
// Shared with the previous foundation procedure; never steal or auto-clear a lock.
const lockPath=resolve(state,'production-storage-foundation.operation.lock.json');
const parseFile=async path=>JSON.parse(await readFile(path,'utf8'));
const exists=async path=>{try{await access(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};

async function loadReviewedInputs(){
 const manifestBytes=await readFile(resolve(directory,'reviewed-inputs.json'));
 const manifest=JSON.parse(manifestBytes.toString('utf8'));
 requireGuard(manifest.version===1&&manifest.driverVersion==='8.23.0','REVIEWED_MANIFEST_VERSION_MISMATCH');
 const driver=createRequire(import.meta.url)('pg/package.json');
 requireGuard(driver.version===manifest.driverVersion,'NATIVE_DRIVER_VERSION_DRIFT');
 verifyEndpoint(manifest.target);
 requireGuard(Object.keys(manifest.inputs).sort().join(',')===Object.keys(inputs).sort().join(','),'INPUT_MANIFEST_MISMATCH');
 const loaded={};
 for(const [name,path] of Object.entries(inputs)){
   const expected=manifest.inputs[name];
   requireGuard(expected.file===path,'INPUT_PATH_MISMATCH');
   const bytes=await readFile(resolve(root,path));
   requireGuard(bytes.length===expected.bytes&&sha256(bytes)===expected.sha256,'REVIEWED_INPUT_DRIFT');
   loaded[name]=bytes;
 }
 loaded.sqlText=verifyArtifact(loaded.sql);
 const codeHashes=[];
 for(const name of ['runner-core.mjs','native-foundation-runner.mjs']){
   const bytes=await readFile(resolve(directory,name));
   codeHashes.push({file:name,sha256:sha256(bytes)});
 }
 loaded.bundleSha256=sha256(JSON.stringify({manifestSha256:sha256(manifestBytes),codeHashes}));
 return loaded;
}

async function readOnlyPreflight(client,loaded){
 const identity=selectRow(await client.query(loaded.identity.toString('utf8')),'native_identity');
 verifyNativeIdentity(identity);
 // Node validates the actual certificate and hostname before PostgreSQL startup.
 const stream=client.connection.stream;
 requireGuard(stream.authorized===true&&stream.encrypted===true,'TLS_SOCKET_NOT_AUTHORIZED');
 const certificate=stream.getPeerCertificate();
 requireGuard(typeof certificate.fingerprint256==='string','TLS_PEER_CERTIFICATE_MISSING');
 const catalog=selectRow(await client.query(loaded.catalog.toString('utf8')),'catalog');
 verifyCatalog(catalog);
 const absence=selectRow(await client.query(loaded.absence.toString('utf8')),'recovery_state');
 verifyAbsence(absence);
 const data=selectRow(await client.query(loaded.data.toString('utf8')),'preserved_data');
 verifyData(data,JSON.parse(loaded.dataBaseline.toString('utf8')));
 return {identity:{database:identity.database,current_user:identity.current_user,session_user:identity.session_user,server_version_num:identity.server_version_num,backend_pid:identity.backend_pid,server_port:identity.server_port,tls:identity.tls,tls_version:identity.tls_version},tlsPeerFingerprint256:certificate.fingerprint256,compatibilitySha256:catalog.compatibility_sha256,migrations:catalog.catalog.migration_history,protectedData:data};
}

async function main(){
 const args=process.argv.slice(2);
 requireGuard(args.length<=1&&(!args[0]||['--review','--preflight','--install'].includes(args[0])),'UNSUPPORTED_ARGUMENT');
 const mode=args[0]??'--review';
 const loaded=await loadReviewedInputs();
 if(mode==='--review')return {status:'PASS',mode:'OFFLINE_REVIEW',project:TARGET.project,host:TARGET.host,sqlBytes:SQL_BYTES,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,connectionAttempted:false,installationActivated:false};
 const missing=missingEnvironment(process.env);
 if(missing.length)return {status:'BLOCKED',project:TARGET.project,missing,connectionAttempted:false,installationActivated:false};
 const configuration=await connectionConfiguration(process.env,{readOnly:mode!=='--install'});
 const controlPlane=await parseFile(controlPlanePath);
 verifyControlPlane(controlPlane);
 let authorization;
 if(mode==='--install'){
   requireGuard(!await exists(markerPath),'ATTEMPT_ALREADY_RECORDED');
   authorization=await parseFile(authorizationPath);
   verifyAuthorization(authorization,loaded.bundleSha256,process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase());
 }
 // Dynamic pg import occurs only after credential, CA and operator-proof gates.
 const {Client}=await import('pg');
 let lock,client,retainLock=false,submissionStarted=false;
 try{
   if(mode==='--install')lock=await claimLock(lockPath);
   const connection=await connectClientOnce(Client,configuration);
   client=connection.client; // Exactly one Client and one connect attempt.
   const preflight=await readOnlyPreflight(client,loaded);
   if(mode==='--preflight')return {status:'PASS',mode:'READ_ONLY_PREFLIGHT',project:TARGET.project,host:TARGET.host,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,identity:preflight.identity,tlsPeerFingerprint256:preflight.tlsPeerFingerprint256,compatibilitySha256:preflight.compatibilitySha256,migrations:preflight.migrations,protectedRelations:preflight.protectedData.preserved_data.length,installationActivated:false};
   await lock.verify();
   requireGuard(connection.isHealthy(),'CONNECTION_LOST_BEFORE_SUBMISSION');
   verifyControlPlane(controlPlane);
   verifyAuthorization(authorization,loaded.bundleSha256,process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase());
   requireGuard(JSON.stringify(await parseFile(controlPlanePath))===JSON.stringify(controlPlane)&&JSON.stringify(await parseFile(authorizationPath))===JSON.stringify(authorization),'OPERATOR_RECORD_CHANGED_DURING_PREFLIGHT');
   requireGuard(!await exists(markerPath),'ATTEMPT_ALREADY_RECORDED');
   const id=new Date().toISOString().replace(/[-:.]/g,'');
   const evidenceParent=resolve(root,'docs/production-security/storage-cutover/native-executions');
   await mkdir(evidenceParent,{recursive:true});
   const evidenceDirectory=resolve(evidenceParent,id);
   await mkdir(evidenceDirectory,{recursive:false});
   await durableJson(resolve(evidenceDirectory,'preflight.json'),{project:TARGET.project,host:TARGET.host,route:TARGET.route,sqlSha256:SQL_SHA,sqlBytes:SQL_BYTES,runnerBundleSha256:loaded.bundleSha256,authorizationRecordSha256:sha256(await readFile(authorizationPath)),controlPlaneRecordSha256:sha256(await readFile(controlPlanePath)),caSha256:process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase(),capturedAt:new Date().toISOString(),...preflight});
   submissionStarted=true;
   const result=await singleAttempt({client,sqlBytes:loaded.sql,markerPath,lock,receiptPath:resolve(evidenceDirectory,'execution-receipt.json'),postflight:async()=>{
     const catalog=selectRow(await client.query(loaded.catalog.toString('utf8')),'catalog');
     verifyCatalog(catalog,{installed:true});
     const post=selectRow(await client.query(loaded.post.toString('utf8')),'foundation_verification');
     verifyPostflight(post,JSON.parse(loaded.expectedFunctions.toString('utf8')),loaded.sqlText);
     const data=selectRow(await client.query(loaded.data.toString('utf8')),'preserved_data');
     verifyData(data,preflight.protectedData);
     await durableJson(resolve(evidenceDirectory,'postflight.json'),{project:TARGET.project,capturedAt:new Date().toISOString(),catalogCompatibilitySha256:catalog.compatibility_sha256,migrationHistory:catalog.catalog.migration_history,foundation:post,protectedData:data});
   }});
   retainLock=result.status!=='COMMITTED_AND_VERIFIED';
   return result;
 }catch(error){
   retainLock=submissionStarted;
   throw error;
 }finally{
   if(client)await client.end().catch(()=>{});
   if(lock&&!retainLock)await lock.release();
   // An uncertain/postflight-failed attempt leaves BOTH lock and marker for review.
 }
}

main().then(result=>{console.log(JSON.stringify(result));if(result.status!=='PASS'&&result.status!=='COMMITTED_AND_VERIFIED')process.exitCode=2;}).catch(error=>{
 console.log(JSON.stringify({status:'BLOCKED',project:TARGET.project,error:safeError(error),automaticRetries:0,action:'Stop; inspect sanitized evidence and any retained lock/attempt marker. Never automatically resubmit.'}));
 process.exitCode=2;
});
