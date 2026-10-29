// Budget deletion pause adapter. Default mode is offline --review.
// A future --install requires a fresh, exact human authorization record.
import {createHash,randomUUID} from 'node:crypto';
import {readFile,readdir,lstat,stat,mkdir} from 'node:fs/promises';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {
  TARGET,SQL_PATH,SQL_SHA,SQL_BYTES,STATE_REL,STATE_FILES,
  sha256,requireGuard,safeError,connectionConfiguration,connectClientOnce,
  EXPECTED_FUNCTION,EXPECTED_PAUSED_FUNCTION,hashJson,
  verifyBudgetSql,verifyPinnedFile,validateReadOnlyVerifierResult,expectedRelationsFromSql,
  BUDGET_INVENTORY_PATH,ORIGINAL_INVENTORY_PATH,verifyReadOnlyInputContracts,
  protectedDataDigest,verifyBudgetState,stableFoundation,foundationStructure,
  verifyFoundationReceipt,comparePreservation,verifyNativeIdentity,
  verifyControlPlaneProof,verifyAuthorization,validateBudgetStateShape,canonicalJson,durableCreateJson,durableAppendJsonLine,
  readJson,claimBudgetLock,runOneShot,verifyOriginalBackendFinished,classifyReconciliation,
  verifyTlsSocket,environmentSafety,createInstallApplicationName,checkManifestShape,
  bundleSha256,pathExists,preflightStateFingerprint,scrubReceiptValue,checkNoSymlink,
  REVIEWED_CODE_FILES,
} from './budget-runner-core.mjs';
import {verifyFoundationEnvironment} from '../../../../scripts/security/verify-foundation-environment.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(directory,'../../../..');
requireGuard(typeof process.env.USERPROFILE==='string'&&isAbsolute(process.env.USERPROFILE),'SECURE_USER_PROFILE_UNAVAILABLE');
const stateDir=resolve(process.env.USERPROFILE,STATE_REL);
const aclHelper=resolve(directory,'operation-acl.ps1');
const manifestPath=resolve(directory,'reviewed-inputs.json');
const inputPaths=Object.freeze({
  sql:SQL_PATH,
  preSql:'docs/production-security/budget-deletion-pause/20261012T165000Z/pre-install-readonly.sql',
  postSql:'docs/production-security/budget-deletion-pause/20261012T165000Z/post-install-readonly.sql',
  protectedDataSql:BUDGET_INVENTORY_PATH,
  originalProtectedDataSql:ORIGINAL_INVENTORY_PATH,
  foundationSql:'docs/production-security/storage-cutover/final-readiness-20261012T160633Z/foundation-readonly.sql',
  foundationReceipt:'docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json',
  identitySql:'docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/budget-identity-readonly.sql',
  foundationCore:'docs/production-security/storage-cutover/native-runner-20261011T132539Z/runner-core.mjs',
  environmentVerifier:'scripts/security/verify-foundation-environment.mjs',
  packageLock:'package-lock.json',
});
const codeFiles=REVIEWED_CODE_FILES;
const statePath=name=>resolve(stateDir,name);
const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;

function within(parent,child){const rel=relative(parent,child);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+sep)&&!rel.startsWith('..\\')&&!rel.includes(':');}

async function hashTree(directoryRoot){
  const files=[];
  async function visit(dir){
    const entries=await readdir(dir,{withFileTypes:true});
    entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
    for(const entry of entries){
      const full=resolve(dir,entry.name);
      const info=await lstat(full);
      requireGuard(!info.isSymbolicLink(),'DRIVER_TREE_CONTAINS_LINK');
      if(info.isDirectory())await visit(full);
      else if(info.isFile()){
        const bytes=await readFile(full);
        files.push({path:relative(root,full).replaceAll('\\','/'),bytes:bytes.length,sha256:sha256(bytes)});
      } else requireGuard(false,'DRIVER_TREE_CONTAINS_SPECIAL_FILE');
    }
  }
  await visit(directoryRoot);
  return {files,sha256:sha256(Buffer.from(JSON.stringify(files),'utf8'))};
}

async function locateDependency(name,parentDir){
  const parts=name.split('/');
  let cursor=parentDir;
  while(within(root,cursor)||cursor===root){
    const candidate=resolve(cursor,'node_modules',...parts);
    try{
      const info=await lstat(candidate);
      requireGuard(info.isDirectory()&&!info.isSymbolicLink(),'DRIVER_PACKAGE_PATH_INVALID');
      return candidate;
    }catch(error){if(error?.code!=='ENOENT')throw error;}
    if(cursor===root)break;
    const rel=relative(root,cursor);
    const parent=resolve(cursor,'..');
    if(parent===cursor||(!within(root,parent)&&parent!==root))break;
    cursor=parent;
  }
  return null;
}

async function computePgRuntimeClosure(){
  const seen=new Set();
  const packages=[];
  async function add(name,parentDir){
    const dir=await locateDependency(name,parentDir);
    requireGuard(dir,'PG_RUNTIME_DEPENDENCY_MISSING');
    const rel=relative(root,dir).replaceAll('\\','/');
    if(seen.has(rel))return;
    seen.add(rel);
    const pkg=JSON.parse(await readFile(resolve(dir,'package.json'),'utf8'));
    packages.push({name:pkg.name,version:pkg.version,path:rel});
    const deps={...(pkg.dependencies??{}),...(pkg.optionalDependencies??{})};
    for(const dependency of Object.keys(deps).sort()){
      const resolved=await locateDependency(dependency,dir);
      if(!resolved&&Object.hasOwn(pkg.optionalDependencies??{},dependency))continue;
      requireGuard(resolved,'PG_RUNTIME_DEPENDENCY_MISSING');
      await add(dependency,dir);
    }
  }
  await add('pg',root);
  packages.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const files=[];
  for(const item of packages){
    const dir=resolve(root,item.path);
    const tree=await hashTree(dir);
    files.push(...tree.files);
  }
  files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return {packages,files,sha256:sha256(Buffer.from(JSON.stringify(files),'utf8'))};
}

async function readCodeHashes(){
  const output=[];
  for(const file of codeFiles){
    const bytes=await readFile(resolve(directory,file));
    output.push({file,bytes:bytes.length,sha256:sha256(bytes)});
  }
  return output.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}

async function loadReviewedInputs(){
  requireGuard(process.version==='v24.21.0','PINNED_NODE_VERSION_REQUIRED');
  const manifestBytes=await readFile(manifestPath);
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  checkManifestShape(manifest);
  const loaded={manifest,manifestBytes,inputs:{}};
  for(const [name,pin] of Object.entries(manifest.inputs)){
    requireGuard(pin.file===inputPaths[name],'INPUT_PATH_MISMATCH');
    loaded.inputs[name]=await verifyPinnedFile(root,pin);
  }
  loaded.sqlText=verifyBudgetSql(loaded.inputs.sql);
  loaded.readOnlyContracts=verifyReadOnlyInputContracts(loaded.inputs);
  loaded.relations=expectedRelationsFromSql(loaded.inputs.protectedDataSql);
  loaded.foundationReceipt=JSON.parse(loaded.inputs.foundationReceipt.toString('utf8'));
  loaded.foundationExpected=verifyFoundationReceipt(loaded.foundationReceipt);
  const driverPackage=createRequire(import.meta.url)('pg/package.json');
  requireGuard(driverPackage.version===manifest.driverVersion,'PG_DRIVER_VERSION_MISMATCH');
  loaded.driver=await computePgRuntimeClosure();
  requireGuard(loaded.driver.files.length===manifest.driverTree.files&&loaded.driver.sha256===manifest.driverTree.sha256,'PG_DRIVER_TREE_DRIFT');
  requireGuard(canonicalJson(loaded.driver.files)===canonicalJson(manifest.driverTree.inventory),'PG_DRIVER_FILE_IDENTITY_DRIFT');
  loaded.codeHashes=await readCodeHashes();
  requireGuard(canonicalJson(loaded.codeHashes)===canonicalJson(manifest.codeIdentities),'RUNNER_CODE_IDENTITY_DRIFT');
  loaded.bundleSha256=bundleSha256(manifestBytes,loaded.codeHashes);
  return loaded;
}

function safeEnvironmentForPowerShell(){
  // Do not inherit PSModulePath: Windows PowerShell initializes its trusted
  // system module path itself. A caller-controlled module path could shadow
  // Get-Acl/Set-Acl while this helper is enforcing the operation lock.
  const permitted=new Set(['path','systemroot','windir','temp','tmp','userprofile','homedrive','homepath','username','userdomain']);
  return Object.fromEntries(Object.entries(process.env).filter(([key])=>permitted.has(key.toLowerCase())));
}

async function invokeAcl(action,path){
  return await new Promise((resolvePromise,rejectPromise)=>{
    const args=['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',aclHelper,'-Action',action];
    if(path)args.push('-Path',path);
    const child=spawn('powershell.exe',args,{windowsHide:true,env:safeEnvironmentForPowerShell(),stdio:['ignore','pipe','ignore']});
    let out='';
    const timer=setTimeout(()=>{child.kill();rejectPromise(new Error('ACL_HELPER_TIMEOUT'));},15000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{out+=chunk;if(out.length>4096){child.kill();clearTimeout(timer);rejectPromise(new Error('ACL_HELPER_OUTPUT_INVALID'));}});
    child.on('error',()=>{clearTimeout(timer);rejectPromise(new Error('ACL_HELPER_UNAVAILABLE'));});
    child.on('close',code=>{
      clearTimeout(timer);
      try{
        const response=JSON.parse(out.trim());
        if(code!==0||response.status!=='PASS')return rejectPromise(new Error(typeof response.code==='string'?response.code:'ACL_CHECK_FAILED'));
        resolvePromise({status:'PASS',action:response.action??action});
      }catch{rejectPromise(new Error('ACL_HELPER_RESULT_INVALID'));}
    });
  });
}

async function verifyStateAcl(paths=[stateDir]){
  for(const path of paths){await checkNoSymlink(path);await invokeAcl('Verify',path);}
}

async function readStateJson(filename){
  const path=statePath(filename);
  await verifyStateAcl([path]);
  return {path,bytes:await readFile(path),value:await readJson(path)};
}

function compactStamp(){return new Date().toISOString().replace(/[-:.]/g,'');}
function readOnlyApplicationName(){return `ytrace-budget-pause-r-${randomUUID()}`;}

function buildConnectionConfiguration(env,{readOnly,applicationName}){
  environmentSafety(env);
  const resultPromise=verifyFoundationEnvironment(env);
  return resultPromise.then(verified=>{
    requireGuard(verified.status==='PASS','SECURE_NATIVE_ENVIRONMENT_BLOCKED');
    return connectionConfiguration(env,{readOnly}).then(configuration=>{
      requireGuard(configuration.host===TARGET.host&&configuration.port===TARGET.port&&configuration.database===TARGET.database&&configuration.user===TARGET.user&&!configuration.connectionString,'FIXED_NATIVE_CONNECTION_MISMATCH');
      requireGuard(configuration.ssl?.rejectUnauthorized===true&&configuration.ssl?.servername===TARGET.host&&!configuration.ssl?.checkServerIdentity,'TLS_CONFIGURATION_MISMATCH');
      requireGuard(configuration.application_name.startsWith('ytrace-foundation-native-'),'UNEXPECTED_BASE_APPLICATION_NAME');
      configuration.application_name=applicationName;
      configuration.query_timeout=0;
      return configuration;
    });
  });
}

async function connectOnce(readOnly,applicationName){
  const configuration=await buildConnectionConfiguration(process.env,{readOnly,applicationName});
  const {Client}=createRequire(import.meta.url)('pg');
  const connection=await connectClientOnce(Client,configuration);
  const tls=verifyTlsSocket(connection.client,{expectedCaSha256:process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase()});
  return {...connection,tls};
}

function verifierRow(result,inputName){return validateReadOnlyVerifierResult(result,inputName);}

async function captureSnapshot(client,loaded,{applicationName,readOnly,caSha256,peerTls,controlPlaneSha256}){
  const identity=verifierRow(await client.query(loaded.inputs.identitySql.toString('utf8')),'identitySql');
  verifyNativeIdentity(identity,{applicationName,readOnly});
  requireGuard(Number(identity.active_budget_deletion_calls)===0&&Number(identity.other_budget_install_sessions)===0,'BUDGET_OPERATION_NOT_QUIESCENT');
  const budget=verifyBudgetState(verifierRow(await client.query(loaded.inputs.preSql.toString('utf8')),'preSql'),'pre');
  const dataRaw=verifierRow(await client.query(loaded.inputs.protectedDataSql.toString('utf8')),'protectedDataSql');
  const data=protectedDataDigest(dataRaw,loaded.relations);
  const foundationRaw=verifierRow(await client.query(loaded.inputs.foundationSql.toString('utf8')),'foundationSql');
  const foundationStable=stableFoundation(foundationRaw);
  const structure=foundationStructure(foundationRaw);
  const foundationSha=hashJson(foundationStable);
  const structureSha=hashJson(structure);
  requireGuard(structureSha===loaded.foundationExpected.sha256&&canonicalJson(structure)===canonicalJson(loaded.foundationExpected.structure),'FOUNDATION_STRUCTURE_MISMATCH');
  return {
    recordType:'YTRACE_BUDGET_PAUSE_NATIVE_PREFLIGHT',status:'READ_ONLY_PREFLIGHT_PASS',
    project:TARGET.project,host:TARGET.host,port:TARGET.port,database:TARGET.database,user:TARGET.user,route:TARGET.route,
    sqlSha256:SQL_SHA,sqlBytes:SQL_BYTES,runnerBundleSha256:loaded.bundleSha256,
    capturedAt:new Date().toISOString(),controlPlaneEvidenceSha256:controlPlaneSha256,
    tls:{chainVerified:peerTls.chainVerified,hostnameVerified:peerTls.hostnameVerified,protocol:peerTls.protocol,peerCertificateFingerprint256:peerTls.peerCertificateFingerprint256,caSha256},
    identity,budget,protectedData:{read_only:'on',preserved_data:data.rows,sha256:data.sha256},
    foundation:{value:foundationRaw,sha256:foundationSha,structureSha256:structureSha},
  };
}

async function verifyControlPlaneFile(){
  await verifyStateAcl([stateDir,statePath(STATE_FILES.controlPlane)]);
  const bytes=await readFile(statePath(STATE_FILES.controlPlane));
  const proof=JSON.parse(bytes.toString('utf8'));
  verifyControlPlaneProof(proof);
  return {proof,sha256:sha256(bytes)};
}

function approvedStateKey(snapshot){return preflightStateFingerprint(snapshot);}

async function readApprovedRecords(loaded,controlPlaneSha,caSha){
  const [authRecord,approvedRecord]=await Promise.all([
    readStateJson(STATE_FILES.authorization),readStateJson(STATE_FILES.approvedPreflight),
  ]);
  const approvedBytesSha=sha256(approvedRecord.bytes);
  const authorization=verifyAuthorization(authRecord.value,{bundleSha256:loaded.bundleSha256,caSha256:caSha,preflightEvidenceSha256:approvedBytesSha});
  requireGuard(authorization.controlPlaneEvidenceSha256===controlPlaneSha,'AUTHORIZATION_CONTROL_PLANE_EVIDENCE_MISMATCH');
  const baseline=approvedRecord.value;
  requireGuard(baseline.status==='READ_ONLY_PREFLIGHT_PASS'&&baseline.project===TARGET.project&&baseline.host===TARGET.host&&baseline.sqlSha256===SQL_SHA&&baseline.sqlBytes===SQL_BYTES&&baseline.runnerBundleSha256===loaded.bundleSha256&&baseline.tls?.caSha256===caSha,'APPROVED_PREFLIGHT_IDENTITY_MISMATCH');
  requireGuard(baseline.approvalFingerprint===approvedStateKey(baseline),'APPROVED_PREFLIGHT_FINGERPRINT_INVALID');
  requireGuard(baseline.controlPlaneEvidenceSha256===controlPlaneSha,'PREFLIGHT_CONTROL_PLANE_EVIDENCE_MISMATCH');
  requireGuard(authorization.preflightStateSha256===baseline.approvalFingerprint,'AUTHORIZATION_PREFLIGHT_STATE_MISMATCH');
  return {authorization,authBytesSha256:sha256(authRecord.bytes),baseline,baselineBytesSha256:approvedBytesSha};
}

async function ensureDriverAndInputs(loaded){
  requireGuard(loaded.sqlText.length>0&&loaded.relations.length===57,'REVIEWED_INPUT_VALIDATION_FAILED');
  requireGuard(loaded.foundationExpected.sha256===loaded.manifest.foundationStructureSha256,'FOUNDATION_MANIFEST_FINGERPRINT_MISMATCH');
  return true;
}

async function runPreflight(loaded){
  const control=await verifyControlPlaneFile();
  await verifyStateAcl([stateDir]);
  const appName=readOnlyApplicationName();
  const connection=await connectOnce(true,appName);
  let snapshot;
  try{
    snapshot=await captureSnapshot(connection.client,loaded,{applicationName:appName,readOnly:true,caSha256:process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase(),peerTls:connection.tls,controlPlaneSha256:control.sha256});
    snapshot.approvalFingerprint=approvedStateKey(snapshot);
    scrubReceiptValue(snapshot);
    const filename=`preflight-${compactStamp()}-${randomUUID()}.json`;
    const path=statePath(filename);
    await durableCreateJson(path,snapshot);
    await verifyStateAcl([path]);
    return {status:'PASS',mode:'READ_ONLY_PREFLIGHT',project:TARGET.project,host:TARGET.host,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,protectedInventoryCount:57,protectedInventoriesSha256:snapshot.protectedData.sha256,foundationStructureSha256:snapshot.foundation.structureSha256,preflightStateSha256:snapshot.approvalFingerprint,evidenceFile:filename,installationActivated:false};
  } finally {await connection.client.end().catch(()=>{});}
}

async function verifyInstallQuiescence(client,loaded,applicationName){
  const identity=verifierRow(await client.query(loaded.inputs.identitySql.toString('utf8')),'identitySql');
  verifyNativeIdentity(identity,{applicationName,readOnly:false});
  requireGuard(Number(identity.active_budget_deletion_calls)===0&&Number(identity.other_budget_install_sessions)===0,'BUDGET_OPERATION_NOT_QUIESCENT');
  return identity;
}

async function runInstall(loaded){
  const control=await verifyControlPlaneFile();
  const environment=await verifyFoundationEnvironment(process.env);
  requireGuard(environment.status==='PASS','SECURE_NATIVE_ENVIRONMENT_BLOCKED');
  const caSha=process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase();
  const records=await readApprovedRecords(loaded,control.sha256,caSha);
  requireGuard(!(await pathExists(statePath(STATE_FILES.marker))),'BUDGET_ATTEMPT_ALREADY_CONSUMED');
  requireGuard(!(await pathExists(statePath(STATE_FILES.lock))),'BUDGET_OPERATION_LOCK_ALREADY_EXISTS');
  await verifyStateAcl([stateDir,statePath(STATE_FILES.authorization),statePath(STATE_FILES.approvedPreflight)]);
  const lock=await claimBudgetLock(statePath(STATE_FILES.lock));
  let client,connection,attemptConsumed=false,retainLock=false;
  try{
    await lock.verify(path=>invokeAcl('Verify',path));
    const applicationIdentity=createInstallApplicationName();
    applicationIdentity.runnerBundleSha256=loaded.bundleSha256;
    applicationIdentity.caSha256=caSha;
    const config=await buildConnectionConfiguration(process.env,{readOnly:false,applicationName:applicationIdentity.applicationName});
    const {Client}=createRequire(import.meta.url)('pg');
    connection=await connectClientOnce(Client,config);
    client=connection.client;
    const peerTls=verifyTlsSocket(client,{expectedCaSha256:caSha});
    const fresh=await captureSnapshot(client,loaded,{applicationName:applicationIdentity.applicationName,readOnly:false,caSha256:caSha,peerTls,controlPlaneSha256:control.sha256});
    fresh.approvalFingerprint=approvedStateKey(fresh);
    requireGuard(fresh.approvalFingerprint===records.baseline.approvalFingerprint,'APPROVED_PREFLIGHT_DRIFT');
    const identity=await verifyInstallQuiescence(client,loaded,applicationIdentity.applicationName);
    requireGuard(identity.backend_pid===fresh.identity.backend_pid&&identity.backend_start===fresh.identity.backend_start,'INSTALL_BACKEND_IDENTITY_CHANGED');
    // Recheck time-bound external evidence, exact local records and owned lock immediately before arming.
    const currentControlBytes=await readFile(statePath(STATE_FILES.controlPlane));
    verifyControlPlaneProof(JSON.parse(currentControlBytes.toString('utf8')));
    requireGuard(sha256(currentControlBytes)===control.sha256,'CONTROL_PLANE_EVIDENCE_CHANGED');
    verifyAuthorization(records.authorization,{bundleSha256:loaded.bundleSha256,caSha256:caSha,preflightEvidenceSha256:records.baselineBytesSha256});
    requireGuard(sha256(await readFile(statePath(STATE_FILES.authorization)))===records.authBytesSha256&&sha256(await readFile(statePath(STATE_FILES.approvedPreflight)))===records.baselineBytesSha256,'OPERATOR_AUTHORIZATION_CHANGED');
    await lock.verify(path=>invokeAcl('Verify',path));
    const nonce=applicationIdentity.nonce;
    const preflightFilename=`install-preflight-${nonce}.json`;
    const preflightPath=statePath(preflightFilename);
    scrubReceiptValue(fresh);
    const preflightSha=await durableCreateJson(preflightPath,fresh);
    await verifyStateAcl([preflightPath]);
    const receiptFilename=`execution-${nonce}.jsonl`;
    const receiptPath=statePath(receiptFilename);
    attemptConsumed=true;
    const result=await runOneShot({
      client,sqlBytes:loaded.inputs.sql,markerPath:statePath(STATE_FILES.marker),receiptPath,lock,
      preflight:fresh,preflightEvidence:{file:preflightFilename,sha256:preflightSha,stateSha256:fresh.approvalFingerprint},
      applicationIdentity:{...applicationIdentity,backendPid:Number(identity.backend_pid),backendStart:identity.backend_start},
      verifyStatePath:path=>invokeAcl('Verify',path),
      write:async(file,event)=>{scrubReceiptValue(event);await durableAppendJsonLine(file,event);await invokeAcl('Verify',file);},
      postflight:async pre=>{
        const budget=verifyBudgetState(verifierRow(await client.query(loaded.inputs.postSql.toString('utf8')),'postSql'),'post');
        requireGuard(budget.function.oid===pre.budget.function.oid,'POSTFLIGHT_FUNCTION_OID_CHANGED');
        const protectedData=verifierRow(await client.query(loaded.inputs.protectedDataSql.toString('utf8')),'protectedDataSql');
        const protectedDigest=protectedDataDigest(protectedData,loaded.relations);
        const foundationRaw=verifierRow(await client.query(loaded.inputs.foundationSql.toString('utf8')),'foundationSql');
        const post={budget,protectedData:{read_only:'on',preserved_data:protectedDigest.rows,sha256:protectedDigest.sha256},foundation:{value:foundationRaw,sha256:hashJson(stableFoundation(foundationRaw))}};
        const preserve=comparePreservation({budget:pre.budget,protectedData:pre.protectedData,foundation:pre.foundation.value},post,loaded.relations,loaded.foundationExpected);
        const finalIdentity=await verifyInstallQuiescence(client,loaded,applicationIdentity.applicationName);
        requireGuard(finalIdentity.backend_pid===identity.backend_pid&&finalIdentity.backend_start===identity.backend_start,'POSTFLIGHT_INSTALL_BACKEND_CHANGED');
        const details={event:'POSTFLIGHT_EVIDENCE',status:'PASS',project:TARGET.project,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,capturedAt:new Date().toISOString(),catalogSha256:budget.compatibility_sha256,function:budget.function,migrationHistory:budget.migration_history,protectedInventoryCount:preserve.protectedInventoriesCount,protectedInventoriesSha256:preserve.protectedInventoriesSha256,foundationSha256:preserve.foundationSha256,storagePolicyCount:15,storageObjects:budget.storage_objects,organizationProfiles:budget.organization_profiles,backend:{pid:identity.backend_pid,startedAt:identity.backend_start,applicationName:applicationIdentity.applicationName}};
        scrubReceiptValue(details);
        await durableAppendJsonLine(receiptPath,details);
        await invokeAcl('Verify',receiptPath);
      },
    });
    retainLock=result.retainLock;
    return {...result,project:TARGET.project,runnerBundleSha256:loaded.bundleSha256,sqlSha256:SQL_SHA,attemptMarkerRetained:true};
  } catch(error){
    if(attemptConsumed){retainLock=true;}
    throw error;
  } finally {
    if(client)await client.end().catch(()=>{});
    if(lock&&!retainLock&&!attemptConsumed)await lock.release(path=>invokeAcl('Verify',path)).catch(()=>{});
    if(lock&&!retainLock&&attemptConsumed)await lock.release(path=>invokeAcl('Verify',path));
  }
}

async function runReconcile(loaded){
  await verifyStateAcl([stateDir,statePath(STATE_FILES.marker),statePath(STATE_FILES.lock)]);
  const markerBytes=await readFile(statePath(STATE_FILES.marker));
  const marker=JSON.parse(markerBytes.toString('utf8'));
  requireGuard(marker.project===TARGET.project&&marker.route===TARGET.route&&marker.sqlSha256===SQL_SHA&&marker.runnerBundleSha256===loaded.bundleSha256&&marker.attempt===1&&marker.submissionMayHaveOccurred===true,'BUDGET_MARKER_SCOPE_MISMATCH');
  requireGuard(typeof marker.preflightFile==='string'&&/^install-preflight-[a-f0-9-]{36}\.json$/.test(marker.preflightFile),'BUDGET_MARKER_PREFLIGHT_REFERENCE_INVALID');
  const lock=await readJson(statePath(STATE_FILES.lock));
  requireGuard(lock.project===TARGET.project&&lock.route===TARGET.route&&lock.sqlSha256===SQL_SHA&&lock.pid===marker.lockPid&&lock.nonce===marker.lockNonce,'BUDGET_LOCK_MARKER_MISMATCH');
  const preBytes=await readFile(statePath(marker.preflightFile));
  requireGuard(sha256(preBytes)===marker.preflightSha256,'INSTALL_PREFLIGHT_EVIDENCE_MISMATCH');
  const pre=JSON.parse(preBytes.toString('utf8'));
  requireGuard(pre.runnerBundleSha256===loaded.bundleSha256&&pre.approvalFingerprint===marker.preflightStateSha256,'INSTALL_PREFLIGHT_BUNDLE_MISMATCH');
  const control=await verifyControlPlaneFile();
  const appName=readOnlyApplicationName();
  const connection=await connectOnce(true,appName);
  try{
    const readIdentity=verifierRow(await connection.client.query(loaded.inputs.identitySql.toString('utf8')),'identitySql');
    verifyNativeIdentity(readIdentity,{applicationName:appName,readOnly:true});
    const finished=await verifyOriginalBackendFinished(connection.client,{backendPid:marker.backendPid,backendStart:marker.backendStart,applicationName:marker.applicationName});
    if(!finished.finished){
      const evidence={recordType:'YTRACE_BUDGET_PAUSE_RECONCILIATION',classification:'UNRESOLVED',priorBackendFinished:false,project:TARGET.project,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,submissionCount:1,sqlResubmitted:false,stop:true,capturedAt:new Date().toISOString()};
      scrubReceiptValue(evidence);
      const path=statePath(`reconciliation-${compactStamp()}-${randomUUID()}.json`);
      await durableCreateJson(path,evidence);await verifyStateAcl([path]);
      return {status:'UNRESOLVED',project:TARGET.project,priorBackendFinished:false,sqlResubmitted:false,evidenceFile:relative(stateDir,path)};
    }
    const currentPre=verifierRow(await connection.client.query(loaded.inputs.preSql.toString('utf8')),'preSql');
    const currentPost=verifierRow(await connection.client.query(loaded.inputs.postSql.toString('utf8')),'postSql');
    for(const state of [currentPre,currentPost]){
      validateBudgetStateShape(state,state.phase);
      requireGuard(state.function.oid===pre.budget.function.oid&&canonicalJson(state.migration_history)===canonicalJson(pre.budget.migration_history),'RECONCILIATION_VERIFIER_IDENTITY_MISMATCH');
    }
    requireGuard(currentPre.compatibility_sha256===currentPost.compatibility_sha256&&currentPre.function.definition_md5===currentPost.function.definition_md5&&currentPre.function.source_md5===currentPost.function.source_md5,'RECONCILIATION_SNAPSHOT_CHANGED');
    const currentData=verifierRow(await connection.client.query(loaded.inputs.protectedDataSql.toString('utf8')),'protectedDataSql');
    const currentDigest=protectedDataDigest(currentData,loaded.relations);
    const currentFoundation=verifierRow(await connection.client.query(loaded.inputs.foundationSql.toString('utf8')),'foundationSql');
    const snapshot={budget:currentPre,protectedData:{read_only:'on',preserved_data:currentDigest.rows,sha256:currentDigest.sha256},foundation:{value:currentFoundation}};
    let preservation=true;
    try{comparePreservation({budget:pre.budget,protectedData:pre.protectedData,foundation:pre.foundation.value},snapshot,loaded.relations,loaded.foundationExpected);}catch{preservation=false;}
    const classification=classifyReconciliation({priorBackendFinished:true,preState:currentPre,postState:currentPost,preservationMatches:preservation});
    const evidence={recordType:'YTRACE_BUDGET_PAUSE_RECONCILIATION',classification:classification.classification,priorBackendFinished:true,project:TARGET.project,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,controlPlaneEvidenceSha256:control.sha256,submissionCount:1,sqlResubmitted:false,preservationMatches:preservation,catalogSha256:currentPre.compatibility_sha256,functionDefinitionMd5:currentPre.function.definition_md5,functionSourceMd5:currentPre.function.source_md5,protectedInventoryCount:currentDigest.rows.length,protectedInventoriesSha256:currentDigest.sha256,foundationStructureSha256:loaded.foundationExpected.sha256,stop:true,capturedAt:new Date().toISOString()};
    scrubReceiptValue(evidence);
    const path=statePath(`reconciliation-${compactStamp()}-${randomUUID()}.json`);
    await durableCreateJson(path,evidence);await verifyStateAcl([path]);
    return {status:classification.classification,project:TARGET.project,priorBackendFinished:true,preservationMatches:preservation,sqlResubmitted:false,stopForHumanReview:true,evidenceFile:relative(stateDir,path)};
  } finally {await connection.client.end().catch(()=>{});}
}

async function main(){
  const args=process.argv.slice(2);
  requireGuard(args.length<=1&&(!args[0]||['--review','--preflight','--install','--reconcile'].includes(args[0])),'UNSUPPORTED_ARGUMENT');
  const mode=args[0]??'--review';
  const loaded=await loadReviewedInputs();
  await ensureDriverAndInputs(loaded);
  if(mode==='--review')return {status:'PASS',mode:'OFFLINE_REVIEW',project:TARGET.project,host:TARGET.host,sqlBytes:SQL_BYTES,sqlSha256:SQL_SHA,runnerBundleSha256:loaded.bundleSha256,driverVersion:loaded.manifest.driverVersion,driverRuntimeFiles:loaded.driver.files.length,protectedInventoryRelations:loaded.relations.length,readOnlyContracts:loaded.readOnlyContracts,foundationStructureSha256:loaded.foundationExpected.sha256,connectionAttempted:false,installationActivated:false};
  if(mode==='--preflight')return await runPreflight(loaded);
  if(mode==='--install')return await runInstall(loaded);
  return await runReconcile(loaded);
}

if(isDirect){
  main().then(result=>{
    console.log(JSON.stringify(scrubReceiptValue(result)));
    if(!['PASS','READ_ONLY_PREFLIGHT','COMMITTED_AND_VERIFIED','COMMITTED_POSTFLIGHT_FAILED','UNRESOLVED','NOT_INSTALLED_VERIFIED','COMMITTED_WITH_DRIFT'].includes(result.status))process.exitCode=2;
  }).catch(error=>{
    console.log(JSON.stringify({status:'BLOCKED',project:TARGET.project,error:safeError(error),automaticRetries:0,action:'Stop; preserve operation state and review sanitized evidence.'}));
    process.exitCode=2;
  });
}

export {computePgRuntimeClosure,loadReviewedInputs,main,verifyInstallQuiescence,captureSnapshot,invokeAcl};
