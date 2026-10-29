// Pure, budget-specific controls. No database, network, environment-file, or
// filesystem side effects occur when this module is imported.
import {createHash,randomUUID} from 'node:crypto';
import {open,readFile,stat,lstat,unlink} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {
  sha256,requireGuard,safeError,connectionConfiguration,connectClientOnce,
} from '../../storage-cutover/native-runner-20261011T132539Z/runner-core.mjs';

export {sha256,requireGuard,safeError,connectionConfiguration,connectClientOnce};

export const TARGET=Object.freeze({
  project:'mqqaykksadotbrghbexz',host:'db.mqqaykksadotbrghbexz.supabase.co',
  port:5432,database:'postgres',user:'postgres',route:'native-pg-direct-tls',
});
export const SQL_PATH='docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql';
export const SQL_SHA='a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a';
export const SQL_BYTES=11945;
export const PRE_CATALOG_SHA='eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5';
export const POST_CATALOG_SHA='e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f';
export const HISTORY=Object.freeze({count:164,latest:'20261011230000',complete_md5:'1f5eca911f6e2057ae070a955eaca3dc'});
export const STATE_REL='.ytrace-production-budget-deletion-pause';
export const STATE_FILES=Object.freeze({
  controlPlane:'control-plane-proof.json',authorization:'authorization.json',
  approvedPreflight:'approved-preflight.json',lock:'budget-deletion-pause.operation.lock.json',
  marker:'budget-deletion-pause.attempt.json',
});
export const EXPECTED_FUNCTION=Object.freeze({
  signature:'admin_bulk_delete_budget_requests(text,uuid[])',oid:'32925',owner:'postgres',
  acl:'{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}',
  security_definer:true,volatility:'v',parallel_mode:'u',strict:false,
  config:['search_path=public'],arguments:'_session_token text, _request_ids uuid[]',result:'jsonb',
  definition_md5:'f6c36316ba941c9e0f76674754ac44ba',source_md5:'eb7b756964fd31efebfb39749f5c9e5b',
});
export const EXPECTED_PAUSED_FUNCTION=Object.freeze({...EXPECTED_FUNCTION,
  definition_md5:'3da7c71f32e4f2a9164efbbac6cda448',source_md5:'0e4e1f3cb102a26d08ab10161a23e682',
});
export const EXPECTED_FOUNDATION_FINGERPRINTS=Object.freeze({
  functions:'31c658a5d692e03262bf1952b1b493bce67e96f8d06da307da10e928a59af55a',
  tables:'e8a99cced6798451a93d4aca4eac5ca1a209ef3869cd367ac454215ec32eb85f',
  triggers:'ab8eaa2be4f9dd4dfbb993f61cb42b99c41ad198c8af1345eb5ec5fc40b4416f',
  storagePolicies:'7e1b100bafecd97a5d7ae26cf2416999c5f0940a60acc1499bc970a94e975ee6',
  containmentTriggers:'134c036655c997919a9cc0b873ae7f521419b746ef4521858e4dd3a8b7be4b38',
  documentSecurityTriggers:'7c6ac12418623c36145f617917db808b65565ed2ea68c81352504a8b92961abf',
});
export const REVIEWED_CODE_FILES=Object.freeze([
  'budget-runner-core.mjs','native-budget-pause-runner.mjs','operation-acl.ps1','native-budget-pause.test.mjs',
]);

const canonicalize=value=>{
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalize(value[key])]));
  return value;
};
export const canonicalJson=value=>JSON.stringify(canonicalize(value));
export const hashJson=value=>sha256(Buffer.from(canonicalJson(value),'utf8'));

export function verifyFixedTarget(value){
  requireGuard(value&&canonicalJson(value)===canonicalJson(TARGET),'TARGET_MISMATCH');
}

export function verifyBudgetSql(bytes){
  requireGuard(Buffer.isBuffer(bytes)&&bytes.length===SQL_BYTES&&sha256(bytes)===SQL_SHA,'BUDGET_SQL_ARTIFACT_MISMATCH');
  const text=bytes.toString('utf8');
  requireGuard(Buffer.from(text,'utf8').equals(bytes),'BUDGET_SQL_UTF8_MISMATCH');
  requireGuard((text.match(/\bCREATE\s+OR\s+REPLACE\s+FUNCTION\b/gi)||[]).length===1,'BUDGET_SQL_FUNCTION_SCOPE_MISMATCH');
  requireGuard(/^(?:--[^\r\n]*\r?\n)+BEGIN;\r?\nSET LOCAL lock_timeout='1s';\r?\nSET LOCAL statement_timeout='30s';/i.test(text),'BUDGET_SQL_TRANSACTION_OR_TIMEOUT_MISMATCH');
  requireGuard(/COMMIT;\s*$/.test(text),'BUDGET_SQL_COMMIT_BOUNDARY_MISMATCH');
  requireGuard(/admin_bulk_delete_budget_requests\s*\(\s*_session_token\s+text\s*,\s*_request_ids\s+uuid\[\]\s*\)/i.test(text),'BUDGET_SQL_TARGET_MISMATCH');
  return text;
}

export async function verifyPinnedFile(root,pin){
  requireGuard(pin&&typeof pin.file==='string'&&Number.isSafeInteger(pin.bytes)&&/^[a-f0-9]{64}$/.test(pin.sha256),'INPUT_PIN_INVALID');
  const path=resolve(root,pin.file);
  const rel=relative(root,path);
  requireGuard(path===resolve(root,pin.file)&&rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel),'INPUT_PATH_ESCAPE');
  const info=await lstat(path);
  requireGuard(info.isFile()&&!info.isSymbolicLink(),'INPUT_NOT_REGULAR_FILE');
  const bytes=await readFile(path);
  requireGuard(bytes.length===pin.bytes&&sha256(bytes)===pin.sha256,'PINNED_INPUT_DRIFT');
  return bytes;
}

export function validateVerifierResult(result,key,expectedCommand='ROLLBACK'){
  const list=Array.isArray(result)?result:[result];
  requireGuard(list.length>0&&list.at(-1)?.command===expectedCommand,'READ_ONLY_TERMINAL_TAG_MISMATCH');
  const rows=list.flatMap(item=>item.rows??[]).filter(row=>row&&Object.hasOwn(row,key));
  requireGuard(rows.length===1,'READ_ONLY_RESULT_SHAPE_MISMATCH');
  return rows[0][key];
}

export function expectedRelationsFromSql(bytes){
  const text=bytes.toString('utf8');
  const relations=[...text.matchAll(/SELECT\s+'((?:public|auth|storage)\.[a-zA-Z0-9_]+)'\s+AS\s+relation/gi)].map(m=>m[1]);
  requireGuard(relations.length===57&&new Set(relations).size===57,'PROTECTED_INVENTORY_SQL_SHAPE_MISMATCH');
  return relations.sort((a,b)=>a<b?-1:a>b?1:0);
}

export function normalizeProtectedData(value,expectedRelations){
  requireGuard(value?.read_only==='on'&&Array.isArray(value.preserved_data)&&value.preserved_data.length===57,'PROTECTED_DATA_RESULT_INVALID');
  const normalized=value.preserved_data.map(row=>{
    requireGuard(row&&typeof row.relation==='string'&&Number.isSafeInteger(Number(row.row_count))&&typeof row.content_fingerprint==='string'&&/^[a-f0-9]{32}$/.test(row.content_fingerprint),'PROTECTED_DATA_ROW_INVALID');
    return {relation:row.relation,row_count:Number(row.row_count),content_fingerprint:row.content_fingerprint};
  }).sort((a,b)=>a.relation<b.relation?-1:a.relation>b.relation?1:0);
  requireGuard(new Set(normalized.map(row=>row.relation)).size===57,'PROTECTED_DATA_DUPLICATE_RELATION');
  requireGuard(canonicalJson(normalized.map(row=>row.relation))===canonicalJson(expectedRelations),'PROTECTED_DATA_RELATION_SET_MISMATCH');
  return normalized;
}

export function protectedDataDigest(value,expectedRelations){
  const normalized=normalizeProtectedData(value,expectedRelations);
  return {rows:normalized,sha256:hashJson(normalized)};
}

function validateFunctionContract(fn,expected){
  requireGuard(fn&&Object.keys(expected).every(key=>canonicalJson(fn[key])===canonicalJson(expected[key])),'BUDGET_FUNCTION_CONTRACT_MISMATCH');
}

export function verifyBudgetState(v,phase){
  const isPost=phase==='post';
  validateBudgetStateShape(v,phase);
  requireGuard(v.catalog_matches===true&&v.compatibility_sha256===(isPost?POST_CATALOG_SHA:PRE_CATALOG_SHA),'BUDGET_CATALOG_FINGERPRINT_MISMATCH');
  requireGuard(v.function_matches===true,'BUDGET_FUNCTION_FINGERPRINT_MISMATCH');
  return v;
}

export function validateBudgetStateShape(v,phase){
  requireGuard(v&&v.phase===phase&&v.read_only==='on'&&v.database==='postgres'&&v.current_user==='postgres'&&v.session_user==='postgres','BUDGET_VERIFIER_IDENTITY_MISMATCH');
  requireGuard(v.server_version==='17.6'&&v.project_binding?.length===1&&v.project_binding[0]==='https://mqqaykksadotbrghbexz.supabase.co','BUDGET_PROJECT_BINDING_MISMATCH');
  requireGuard(v.containment_guard===false&&v.storage_policy_count===15&&v.migration_history&&canonicalJson(v.migration_history)===canonicalJson(HISTORY),'BUDGET_PROTECTION_OR_HISTORY_MISMATCH');
  requireGuard([PRE_CATALOG_SHA,POST_CATALOG_SHA].includes(v.compatibility_sha256),'BUDGET_CATALOG_FINGERPRINT_UNKNOWN');
  requireGuard(v.function&&[EXPECTED_FUNCTION.definition_md5,EXPECTED_PAUSED_FUNCTION.definition_md5].includes(v.function.definition_md5)&&[EXPECTED_FUNCTION.source_md5,EXPECTED_PAUSED_FUNCTION.source_md5].includes(v.function.source_md5),'BUDGET_FUNCTION_FINGERPRINT_UNKNOWN');
  const isPost=v.compatibility_sha256===POST_CATALOG_SHA;
  validateFunctionContract(v.function,isPost?EXPECTED_PAUSED_FUNCTION:EXPECTED_FUNCTION);
  requireGuard(Number.isSafeInteger(v.storage_objects)&&Number.isSafeInteger(v.organization_profiles)&&v.storage_objects>=0&&v.organization_profiles>=0,'BUDGET_COUNT_SHAPE_MISMATCH');
  return v;
}

const FOUNDATION_DYNAMIC_KEYS=new Set(['captured_at','read_only','database','current_user','session_user']);
export function stableFoundation(value){
  requireGuard(value&&value.read_only==='on'&&value.database==='postgres'&&value.current_user==='postgres'&&value.session_user==='postgres','FOUNDATION_VERIFIER_IDENTITY_MISMATCH');
  requireGuard(value.functions?.length===14&&value.tables?.length===4&&value.triggers?.length===8&&value.storage_policy_count===15&&value.environment_guard===false,'FOUNDATION_PROTECTION_MISMATCH');
  requireGuard(canonicalJson(value.trusted_origins)===canonicalJson(['https://mqqaykksadotbrghbexz.supabase.co']),'FOUNDATION_TRUSTED_ORIGIN_MISMATCH');
  const {captured_at,read_only,database,current_user,session_user,...stable}=value;
  void captured_at; void read_only; void database; void current_user; void session_user;
  for(const key of Object.keys(stable))requireGuard(!FOUNDATION_DYNAMIC_KEYS.has(key),'FOUNDATION_NORMALIZATION_ERROR');
  return stable;
}

export function foundationStructure(value){
  const stable=stableFoundation(value);
  return {
    functions:stable.functions,tables:stable.tables,triggers:stable.triggers,
    schema_acl:stable.schema_acl,trusted_origins:stable.trusted_origins,
    storage_policy_count:stable.storage_policy_count,environment_guard:stable.environment_guard,
  };
}

export function verifyFoundationReceipt(receipt){
  requireGuard(receipt?.status==='PASS'&&receipt.project===TARGET.project&&receipt.host===TARGET.host&&receipt.route===TARGET.route&&receipt.independentReadOnlyConnection===true&&receipt.tlsChainAndHostnameVerified===true,'FOUNDATION_RECEIPT_IDENTITY_MISMATCH');
  const fps=receipt.fingerprints;
  requireGuard(fps&&fps.foundationFunctionsSha256===EXPECTED_FOUNDATION_FINGERPRINTS.functions&&fps.foundationTablesSha256===EXPECTED_FOUNDATION_FINGERPRINTS.tables&&fps.foundationTriggersSha256===EXPECTED_FOUNDATION_FINGERPRINTS.triggers&&fps.storagePoliciesSha256===EXPECTED_FOUNDATION_FINGERPRINTS.storagePolicies&&fps.containmentTriggersSha256===EXPECTED_FOUNDATION_FINGERPRINTS.containmentTriggers&&fps.documentSecurityTriggersSha256===EXPECTED_FOUNDATION_FINGERPRINTS.documentSecurityTriggers,'FOUNDATION_RECEIPT_FINGERPRINT_MISMATCH');
  const expected=foundationStructure(receipt.foundation);
  return {structure:expected,sha256:hashJson(expected)};
}

export function comparePreservation(pre,post,expectedRelations,expectedFoundation){
  const preData=protectedDataDigest(pre.protectedData,expectedRelations);
  const postData=protectedDataDigest(post.protectedData,expectedRelations);
  requireGuard(preData.sha256===postData.sha256&&canonicalJson(preData.rows)===canonicalJson(postData.rows),'PROTECTED_57_INVENTORY_CHANGED');
  const before=stableFoundation(pre.foundation?.value??pre.foundation);
  const after=stableFoundation(post.foundation?.value??post.foundation);
  const beforeHash=hashJson(before),afterHash=hashJson(after);
  const beforeStructure=foundationStructure(pre.foundation?.value??pre.foundation),afterStructure=foundationStructure(post.foundation?.value??post.foundation);
  requireGuard(hashJson(beforeStructure)===expectedFoundation.sha256&&canonicalJson(beforeStructure)===canonicalJson(expectedFoundation.structure),'FOUNDATION_STRUCTURE_MISMATCH');
  requireGuard(canonicalJson(afterStructure)===canonicalJson(beforeStructure)&&afterHash===beforeHash,'FOUNDATION_STATE_CHANGED');
  requireGuard(pre.budget.storage_objects===post.budget.storage_objects&&pre.budget.organization_profiles===post.budget.organization_profiles,'PROTECTED_COUNT_CHANGED');
  requireGuard(pre.budget.storage_policy_count===15&&post.budget.storage_policy_count===15,'STORAGE_POLICY_COUNT_CHANGED');
  requireGuard(canonicalJson(pre.budget.migration_history)===canonicalJson(post.budget.migration_history),'MIGRATION_HISTORY_CHANGED');
  return {protectedInventoriesSha256:preData.sha256,protectedInventoriesCount:preData.rows.length,foundationSha256:beforeHash,storagePolicies:15,migrationHistory:pre.budget.migration_history};
}

export function verifyNativeIdentity(value,{applicationName,readOnly=true}={}){
  requireGuard(value&&value.database==='postgres'&&value.current_user==='postgres'&&value.session_user==='postgres'&&value.server_version_num===170006&&value.server_port===5432,'NATIVE_DATABASE_IDENTITY_MISMATCH');
  requireGuard(value.transaction_read_only==='on'&&value.default_transaction_read_only===(readOnly?'on':'off')&&value.tls===true&&/^TLSv1\.[23]$/.test(value.tls_version),'NATIVE_TLS_OR_READ_ONLY_MISMATCH');
  requireGuard(value.application_name===applicationName&&Number.isSafeInteger(Number(value.backend_pid))&&typeof value.backend_start==='string'&&Number.isFinite(Date.parse(value.backend_start)),'NATIVE_BACKEND_IDENTITY_MISMATCH');
  requireGuard(value.database_connect===true&&value.owns_target_function===true&&value.public_usage===true&&value.public_create===true&&value.plpgsql_usage===true&&value.text_type_usage===true&&value.uuid_array_type_usage===true&&value.jsonb_type_usage===true&&value.all_eight_protected_relations_selectable===true,'INSTALLATION_PRIVILEGE_MISMATCH');
  requireGuard(value.pg_read_all_stats===true,'RECONCILIATION_VISIBILITY_MISSING');
  return value;
}

export function verifyBudgetPrePostPair(pre,post){
  verifyBudgetState(pre,'pre');
  verifyBudgetState(post,'post');
  requireGuard(pre.function.oid===post.function.oid&&pre.function.oid===EXPECTED_FUNCTION.oid,'BUDGET_FUNCTION_OID_CHANGED');
}

export function verifyControlPlaneProof(value,{now=Date.now(),maxAgeMs=300000}={}){
  const expected=['project','host','status','verifiedVia','verifiedAt'];
  requireGuard(value&&canonicalJson(Object.keys(value).sort())===canonicalJson(expected.sort()),'CONTROL_PLANE_PROOF_SHAPE_MISMATCH');
  requireGuard(value.project===TARGET.project&&value.host===TARGET.host&&value.status==='ACTIVE_HEALTHY'&&value.verifiedVia==='supabase-control-plane-get-project','CONTROL_PLANE_PROJECT_MISMATCH');
  const age=now-Date.parse(value.verifiedAt);
  requireGuard(Number.isFinite(age)&&age>=0&&age<=maxAgeMs,'CONTROL_PLANE_PROOF_EXPIRED');
  return value;
}

export function verifyAuthorization(value,{bundleSha256,caSha256,preflightEvidenceSha256,now=Date.now()}={}){
  const fields=['version','approved','project','host','port','database','user','route','sqlSha256','sqlBytes','runnerBundleSha256','caSha256','controlPlaneEvidenceSha256','preflightEvidenceSha256','preflightStateSha256','authorizationReference','approvedAt','expiresAt','exclusiveWindowConfirmed','existingDeletionRequestsDrained'];
  requireGuard(value&&canonicalJson(Object.keys(value).sort())===canonicalJson([...fields].sort()),'AUTHORIZATION_FIELDS_MISMATCH');
  requireGuard(value.version===1&&value.approved===true&&value.project===TARGET.project&&value.host===TARGET.host&&value.port===TARGET.port&&value.database===TARGET.database&&value.user===TARGET.user&&value.route===TARGET.route&&value.sqlSha256===SQL_SHA&&value.sqlBytes===SQL_BYTES&&value.runnerBundleSha256===bundleSha256&&value.caSha256===caSha256&&value.preflightEvidenceSha256===preflightEvidenceSha256&&/^[a-f0-9]{64}$/.test(value.preflightStateSha256)&&value.exclusiveWindowConfirmed===true&&value.existingDeletionRequestsDrained===true,'AUTHORIZATION_SCOPE_MISMATCH');
  requireGuard(typeof value.authorizationReference==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(value.authorizationReference),'AUTHORIZATION_REFERENCE_INVALID');
  const approved=Date.parse(value.approvedAt),expires=Date.parse(value.expiresAt);
  requireGuard(Number.isFinite(approved)&&Number.isFinite(expires)&&approved<=now&&expires>now&&expires-approved<=1800000,'AUTHORIZATION_EXPIRED');
  return value;
}

export async function durableCreateJson(path,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n','utf8');
  const handle=await open(path,'wx',0o600);
  try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
  requireGuard((await stat(path)).size===bytes.length,'DURABLE_FILE_SIZE_MISMATCH');
  return sha256(bytes);
}

export async function durableAppendJsonLine(path,value){
  const bytes=Buffer.from(JSON.stringify(value)+'\n','utf8');
  const handle=await open(path,'a');
  try{await handle.write(bytes);await handle.sync();}finally{await handle.close();}
}

export async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}

export async function claimBudgetLock(path){
  const claim={project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,pid:process.pid,nonce:randomUUID(),createdAt:new Date().toISOString()};
  await durableCreateJson(path,claim);
  return {claim,async verify(aclVerifier){
    const current=await readJson(path);
    requireGuard(canonicalJson(current)===canonicalJson(claim),'BUDGET_LOCK_OWNERSHIP_MISMATCH');
    try{process.kill(process.pid,0);}catch{requireGuard(false,'BUDGET_LOCK_PROCESS_NOT_ALIVE');}
    if(aclVerifier)await aclVerifier(path);
  },async release(aclVerifier){
    await this.verify(aclVerifier);
    const current=await readFile(path,'utf8');
    requireGuard(canonicalJson(JSON.parse(current))===canonicalJson(claim),'BUDGET_LOCK_OWNERSHIP_MISMATCH');
    await unlink(path);
  }};
}

export async function runOneShot({client,sqlBytes,markerPath,receiptPath,lock,preflight,preflightEvidence,postflight,applicationIdentity,verifyStatePath=async()=>{},write=durableAppendJsonLine}){
  const sql=verifyBudgetSql(sqlBytes);
  await lock.verify(verifyStatePath);
  requireGuard(!await pathExists(markerPath),'BUDGET_ATTEMPT_ALREADY_CONSUMED');
  requireGuard(!await pathExists(receiptPath),'BUDGET_RECEIPT_ALREADY_EXISTS');
  await write(receiptPath,{event:'ATTEMPT_ARMED',project:TARGET.project,sqlSha256:SQL_SHA,applicationIdentity,capturedAt:new Date().toISOString()});
  await durableCreateJson(markerPath,{project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,runnerBundleSha256:applicationIdentity.runnerBundleSha256,preflightFile:preflightEvidence?.file,preflightSha256:preflightEvidence?.sha256,preflightStateSha256:preflightEvidence?.stateSha256,attempt:1,nonce:applicationIdentity.nonce,applicationName:applicationIdentity.applicationName,backendPid:applicationIdentity.backendPid,backendStart:applicationIdentity.backendStart,lockPid:lock.claim.pid,lockNonce:lock.claim.nonce,startedAt:new Date().toISOString(),submissionMayHaveOccurred:true});
  await verifyStatePath(markerPath);
  await lock.verify(verifyStatePath);
  let commitAcknowledged=false;
  try{
    const results=await client.query(sql); // Exactly one simple-query submission, no parameters, retry or recovery query.
    const list=Array.isArray(results)?results:[results];
    const commands=list.map(item=>item.command);
    client.__ytraceLastCommandTag=commands.at(-1);
    requireGuard(commands.at(-1)==='COMMIT','COMMIT_ACKNOWLEDGEMENT_MISSING');
    commitAcknowledged=true;
  }catch(error){
    const record={event:'SUBMISSION_OUTCOME_UNCERTAIN',project:TARGET.project,sqlSha256:SQL_SHA,submissionCount:1,automaticRetries:0,rollbackStatementsSent:0,commitAcknowledged:false,error:safeError(error),capturedAt:new Date().toISOString(),retainLock:true,retainAttemptMarker:true};
    try{await write(receiptPath,record);}catch{}
    return {status:'UNRESOLVED',commitAcknowledged:false,retainLock:true,retainAttemptMarker:true,submissionCount:1,automaticRetries:0,rollbackStatementsSent:0};
  }
  try{
    await write(receiptPath,{event:'COMMIT_ACKNOWLEDGED',project:TARGET.project,sqlSha256:SQL_SHA,commands:commitAckAcknowledgementList(client),capturedAt:new Date().toISOString()});
    await postflight(preflight);
    await write(receiptPath,{event:'POSTFLIGHT_VERIFIED',project:TARGET.project,sqlSha256:SQL_SHA,commitAcknowledged:true,capturedAt:new Date().toISOString()});
    return {status:'COMMITTED_AND_VERIFIED',commitAcknowledged:true,retainLock:false,retainAttemptMarker:true,submissionCount:1,automaticRetries:0,rollbackStatementsSent:0};
  }catch(error){
    try{await write(receiptPath,{event:'COMMITTED_POSTFLIGHT_FAILED',project:TARGET.project,sqlSha256:SQL_SHA,commitAcknowledged,error:safeError(error),capturedAt:new Date().toISOString(),retainLock:true,retainAttemptMarker:true});}catch{}
    return {status:'COMMITTED_POSTFLIGHT_FAILED',commitAcknowledged:true,retainLock:true,retainAttemptMarker:true,submissionCount:1,automaticRetries:0,rollbackStatementsSent:0};
  }
}

function commitAckAcknowledgementList(client){
  // Only a boolean and terminal tag are safe to record; never return the driver object.
  const command=client.__ytraceLastCommandTag;
  return command==='COMMIT'?['COMMIT']:['COMMIT_ACKNOWLEDGED'];
}

export async function verifyOriginalBackendFinished(client,identity){
  requireGuard(Number.isSafeInteger(Number(identity.backendPid))&&Number.isFinite(Date.parse(identity.backendStart))&&/^ytrace-budget-pause-i-[a-f0-9-]{36}$/.test(identity.applicationName),'BACKEND_IDENTITY_INVALID');
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='10s';");
  const selected=await client.query({
    text:`SELECT jsonb_build_object(
        'read_only',current_setting('transaction_read_only'),
        'database',current_database(),'current_user',current_user,'session_user',session_user,
        'prior_backend_active',EXISTS(SELECT 1 FROM pg_stat_activity a WHERE a.pid=$1::int AND a.backend_start=$2::timestamptz AND a.application_name=$3),
        'matching_application_sessions',(SELECT count(*) FROM pg_stat_activity a WHERE a.application_name=$3),
        'can_inspect_activity',pg_has_role(current_user,'pg_read_all_stats','member') OR current_user='postgres'
      ) AS reconciliation_state`,
    values:[Number(identity.backendPid),identity.backendStart,identity.applicationName],
  });
  const rolled=await client.query('ROLLBACK;');
  const row=validateVerifierResult([selected,rolled],'reconciliation_state','ROLLBACK');
  requireGuard(row?.read_only==='on'&&row.database==='postgres'&&row.current_user==='postgres'&&row.session_user==='postgres'&&row.can_inspect_activity===true,'RECONCILIATION_IDENTITY_MISMATCH');
  return {finished:row.prior_backend_active===false&&row.matching_application_sessions===0,priorBackendActive:row.prior_backend_active===true,matchingApplicationSessions:Number(row.matching_application_sessions)};
}

export function classifyReconciliation({priorBackendFinished,preState,postState,preservationMatches}){
  if(priorBackendFinished!==true)return {classification:'UNRESOLVED',stop:true};
  if(preservationMatches!==true)return {classification:'COMMITTED_WITH_DRIFT',stop:true};
  const old=preState?.compatibility_sha256===PRE_CATALOG_SHA&&preState?.catalog_matches===true&&preState?.function_matches===true&&preState?.function?.definition_md5===EXPECTED_FUNCTION.definition_md5&&preState?.function?.source_md5===EXPECTED_FUNCTION.source_md5;
  const updated=postState?.compatibility_sha256===POST_CATALOG_SHA&&postState?.catalog_matches===true&&postState?.function_matches===true&&postState?.function?.definition_md5===EXPECTED_PAUSED_FUNCTION.definition_md5&&postState?.function?.source_md5===EXPECTED_PAUSED_FUNCTION.source_md5;
  if(updated)return {classification:'COMMITTED_AND_VERIFIED',stop:true};
  if(old)return {classification:'NOT_INSTALLED_VERIFIED',stop:true};
  return {classification:'UNRESOLVED',stop:true};
}

export async function pathExists(path){try{await lstat(path);return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}}

export function verifyTlsSocket(client,{expectedHost=TARGET.host,expectedCaSha256}={}){
  requireGuard(typeof expectedCaSha256==='string'&&/^[a-f0-9]{64}$/.test(expectedCaSha256),'CA_FINGERPRINT_INVALID');
  const stream=client?.connection?.stream;
  requireGuard(stream?.encrypted===true&&stream?.authorized===true&&typeof stream.getProtocol==='function'&&/^TLSv1\.[23]$/.test(stream.getProtocol()),'TLS_SOCKET_NOT_AUTHORIZED');
  requireGuard(stream.servername===expectedHost,'TLS_SERVERNAME_MISMATCH');
  const certificate=stream.getPeerCertificate?.();
  requireGuard(certificate&&typeof certificate.fingerprint256==='string','TLS_PEER_CERTIFICATE_MISSING');
  return {chainVerified:true,hostnameVerified:true,protocol:stream.getProtocol(),peerCertificateFingerprint256:certificate.fingerprint256};
}

export function environmentSafety(env){
  const forbidden=['DATABASE_URL','SUPABASE_DB_URL','YTRACE_PRODUCTION_DATABASE_URL','PGSERVICEFILE','PGSERVICE'];
  requireGuard(forbidden.every(name=>!env[name]),'CONNECTION_STRING_OR_SERVICE_OVERRIDE_FORBIDDEN');
  requireGuard(env.NODE_OPTIONS===undefined&&env.NODE_EXTRA_CA_CERTS===undefined,'NODE_RUNTIME_OVERRIDE_FORBIDDEN');
  requireGuard(env.NODE_TLS_REJECT_UNAUTHORIZED!=='0','INSECURE_TLS_ENVIRONMENT');
  const fixedPg={PGHOST:TARGET.host,PGPORT:String(TARGET.port),PGDATABASE:TARGET.database,PGUSER:TARGET.user};
  for(const name of Object.keys(env).filter(key=>/^PG[A-Z0-9_]*$/i.test(key))){
    requireGuard(Object.hasOwn(fixedPg,name)&&(!env[name]||env[name]===fixedPg[name]),'CONNECTION_STRING_OR_SERVICE_OVERRIDE_FORBIDDEN');
  }
  return true;
}

export function createInstallApplicationName(nonce=randomUUID()){
  requireGuard(/^[a-f0-9-]{36}$/.test(nonce),'INSTALL_NONCE_INVALID');
  return {nonce,applicationName:`ytrace-budget-pause-i-${nonce}`};
}

export function checkManifestShape(manifest){
  requireGuard(manifest?.version===1&&manifest.nodeVersion==='v24.21.0'&&manifest.driverVersion==='8.23.0','REVIEWED_MANIFEST_VERSION_MISMATCH');
  verifyFixedTarget(manifest.target);
  requireGuard(manifest.sql?.file===SQL_PATH&&manifest.sql.bytes===SQL_BYTES&&manifest.sql.sha256===SQL_SHA,'REVIEWED_SQL_PIN_MISMATCH');
  requireGuard(manifest.inputs&&Object.keys(manifest.inputs).sort().join(',')==='environmentVerifier,foundationCore,foundationReceipt,foundationSql,identitySql,packageLock,postSql,preSql,protectedDataSql,sql','REVIEWED_INPUT_SET_MISMATCH');
  requireGuard(manifest.driverTree&&Number.isSafeInteger(manifest.driverTree.files)&&manifest.driverTree.files>0&&/^[a-f0-9]{64}$/.test(manifest.driverTree.sha256)&&Array.isArray(manifest.driverTree.inventory)&&manifest.driverTree.inventory.length===manifest.driverTree.files,'REVIEWED_DRIVER_TREE_PIN_INVALID');
  requireGuard(sha256(Buffer.from(JSON.stringify(manifest.driverTree.inventory),'utf8'))===manifest.driverTree.sha256,'REVIEWED_DRIVER_TREE_INVENTORY_MISMATCH');
  const driverPaths=manifest.driverTree.inventory.map(item=>item?.path);
  requireGuard(driverPaths.every(path=>typeof path==='string'&&path.startsWith('node_modules/')&&!path.includes('..')&&!path.includes('\\'))&&new Set(driverPaths).size===driverPaths.length&&canonicalJson(driverPaths)===canonicalJson([...driverPaths].sort()),'REVIEWED_DRIVER_TREE_PATHS_INVALID');
  requireGuard(Array.isArray(manifest.codeIdentities)&&manifest.codeIdentities.length===REVIEWED_CODE_FILES.length,'REVIEWED_CODE_IDENTITY_SET_INVALID');
  const identities=[...manifest.codeIdentities].sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
  requireGuard(canonicalJson(identities.map(item=>item.file))===canonicalJson([...REVIEWED_CODE_FILES].sort())&&identities.every(item=>Number.isSafeInteger(item.bytes)&&item.bytes>0&&/^[a-f0-9]{64}$/.test(item.sha256)),'REVIEWED_CODE_IDENTITY_INVALID');
  return manifest;
}

export function bundleSha256(manifestBytes,codeHashes){
  const sorted=[...codeHashes].sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
  requireGuard(sorted.length===4&&new Set(sorted.map(item=>item.file)).size===4&&sorted.every(item=>/^[a-f0-9]{64}$/.test(item.sha256)),'BUNDLE_CODE_MANIFEST_INVALID');
  return sha256(Buffer.from(JSON.stringify({manifestSha256:sha256(manifestBytes),codeHashes:sorted}), 'utf8'));
}

export async function checkNoSymlink(path){
  const info=await lstat(path);
  requireGuard(!info.isSymbolicLink()&&!info.isBlockDevice()&&!info.isCharacterDevice(),'STATE_PATH_REPARSE_OR_SPECIAL_FILE');
  return info;
}

export function assertAuthorizedPreflightMatches(preflight,auth){
  const stable=preflight?.approvalFingerprint;
  requireGuard(typeof stable==='string'&&stable===auth.preflightStateSha256,'PREFLIGHT_STATE_NOT_APPROVED');
}

export function preflightStateFingerprint(data){
  return hashJson({
    project:data.project,host:data.host,route:data.route,sqlSha256:data.sqlSha256,
    runnerBundleSha256:data.runnerBundleSha256,caSha256:data.tls?.caSha256,
    peerCertificateFingerprint256:data.tls?.peerCertificateFingerprint256,
    catalogSha256:data.budget?.compatibility_sha256,function:data.budget?.function,
    migrationHistory:data.budget?.migration_history,storagePolicyCount:data.budget?.storage_policy_count,
    protectedInventoriesSha256:data.protectedData?.sha256,foundationSha256:data.foundation?.sha256,
    native:{database:data.identity?.database,current_user:data.identity?.current_user,session_user:data.identity?.session_user,server_version_num:data.identity?.server_version_num,server_port:data.identity?.server_port,tls:data.identity?.tls,tls_version:data.identity?.tls_version},
  });
}

export function scrubReceiptValue(value){
  const visit=item=>{
    if(Array.isArray(item)){for(const child of item)visit(child);return;}
    if(item&&typeof item==='object'){
      for(const [key,child] of Object.entries(item)){
        requireGuard(!/(?:password|access.?token|refresh.?token|signed.?url|authorization.?header|connection.?string|private.?key|ca.?contents)/i.test(key),'RECEIPT_SECRET_FIELD_DETECTED');
        visit(child);
      }
      return;
    }
    if(typeof item==='string')requireGuard(!/(?:postgres(?:ql)?:\/\/|eyJ[a-zA-Z0-9_-]{10,}\.|token=[^&\s]+|password=[^&\s]+)/i.test(item),'RECEIPT_SECRET_PATTERN_DETECTED');
  };
  visit(value);
  return value;
}
