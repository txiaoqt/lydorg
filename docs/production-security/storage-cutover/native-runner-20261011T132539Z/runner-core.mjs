// Local core: no database/network imports, .env loading, arbitrary SQL or endpoint options.
import {createHash, randomUUID} from 'node:crypto';
import {readFile,open,unlink,mkdir} from 'node:fs/promises';
import {resolve,isAbsolute} from 'node:path';

export const TARGET=Object.freeze({project:'mqqaykksadotbrghbexz',host:'db.mqqaykksadotbrghbexz.supabase.co',port:5432,database:'postgres',user:'postgres',route:'native-pg-direct-tls'});
export const SQL_SHA='e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2';
export const SQL_BYTES=47407;
export const CATALOG_SHA='eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5';
export const HISTORY=Object.freeze({count:164,latest:'20261011230000',complete_md5:'1f5eca911f6e2057ae070a955eaca3dc'});
export const REQUIRED_ENV=Object.freeze(['YTRACE_PRODUCTION_DB_PASSWORD','YTRACE_PRODUCTION_DB_CA_FILE','YTRACE_PRODUCTION_DB_CA_SHA256']);
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value);
export class GuardError extends Error { constructor(code){super(code);this.safeCode=code;} }
export function requireGuard(condition,code){if(!condition)throw new GuardError(code);}
export function safeError(error){
  return {code:error instanceof GuardError?error.safeCode:'DATABASE_OR_LOCAL_OPERATION_FAILED',
    databaseCode:typeof error?.code==='string' && /^(?:[0-9A-Z]{5}|ERR_TLS_CERT_ALTNAME_INVALID|CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN|ECONNRESET|ETIMEDOUT|ENOTFOUND|EACCES|EEXIST)$/.test(error.code)?error.code:null};
}
export function missingEnvironment(env){return REQUIRED_ENV.filter(name=>!env[name]);}
export function verifyEndpoint(endpoint){requireGuard(Object.keys(TARGET).every(key=>endpoint[key]===TARGET[key]),'ENDPOINT_MISMATCH');}
export function verifyArtifact(bytes){
  requireGuard(Buffer.isBuffer(bytes)&&bytes.length===SQL_BYTES&&sha256(bytes)===SQL_SHA,'ARTIFACT_MISMATCH');
  const text=bytes.toString('utf8');
  requireGuard(Buffer.from(text,'utf8').equals(bytes),'UTF8_ROUND_TRIP_MISMATCH');
  requireGuard(/\nBEGIN;\r?\nSET LOCAL lock_timeout='1s';\r?\nSET LOCAL statement_timeout='30s';/.test(text)&&/COMMIT;\r?\n?$/.test(text),'TRANSACTION_BOUNDARY_MISMATCH');
  return text;
}
export async function connectionConfiguration(env,{readOnly=true}={}){
  requireGuard(missingEnvironment(env).length===0,'MISSING_NATIVE_CREDENTIAL_OR_CA');
  requireGuard(env.NODE_TLS_REJECT_UNAUTHORIZED!=='0','INSECURE_TLS_ENVIRONMENT');
  for(const [key,value] of Object.entries({PGHOST:TARGET.host,PGPORT:String(TARGET.port),PGDATABASE:TARGET.database,PGUSER:TARGET.user})){
    requireGuard(!env[key]||env[key]===value,'CONFLICTING_CONNECTION_ENVIRONMENT');
  }
  requireGuard(!env.PGOPTIONS&&!env.PGSERVICE&&!env.PGSSLMODE&&!env.PGSSLROOTCERT&&!env.PGSSLCERT&&!env.PGSSLKEY,'CONFLICTING_CONNECTION_ENVIRONMENT');
  requireGuard(isAbsolute(env.YTRACE_PRODUCTION_DB_CA_FILE)&&/^[a-fA-F0-9]{64}$/.test(env.YTRACE_PRODUCTION_DB_CA_SHA256),'CA_CONFIGURATION_INVALID');
  const ca=await readFile(env.YTRACE_PRODUCTION_DB_CA_FILE);
  requireGuard(sha256(ca)===env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase(),'CA_HASH_MISMATCH');
  return {host:TARGET.host,port:TARGET.port,database:TARGET.database,user:TARGET.user,
    password:env.YTRACE_PRODUCTION_DB_PASSWORD,
    ssl:{ca:ca.toString('utf8'),rejectUnauthorized:true,servername:TARGET.host},
    sslnegotiation:'postgres',enableChannelBinding:true,
    options:readOnly?'-c default_transaction_read_only=on -c statement_timeout=20000':'-c default_transaction_read_only=off',
    application_name:readOnly?'ytrace-foundation-native-readonly':'ytrace-foundation-native-single-attempt',
    client_encoding:'UTF8',connectionTimeoutMillis:10000,query_timeout:0,
    keepAlive:true,keepAliveInitialDelayMillis:10000};
}
export async function connectClientOnce(ClientType,configuration){
  requireGuard(configuration.host===TARGET.host&&configuration.port===TARGET.port&&configuration.database===TARGET.database&&configuration.user===TARGET.user&&configuration.ssl?.rejectUnauthorized===true&&configuration.ssl.servername===TARGET.host&&!configuration.connectionString,'NATIVE_CLIENT_CONFIGURATION_MISMATCH');
  const client=new ClientType(configuration);
  let healthy=true;
  client.on('error',()=>{healthy=false;});
  try{await client.connect();}catch(error){await client.end().catch(()=>{});throw error;}
  return {client,isHealthy:()=>healthy};
}
export function verifyControlPlane(proof,now=Date.now()){
  requireGuard(proof?.project===TARGET.project&&proof.host===TARGET.host&&proof.status==='ACTIVE_HEALTHY'&&proof.verifiedVia==='supabase-control-plane-get-project','CONTROL_PLANE_MISMATCH');
  const age=now-Date.parse(proof.verifiedAt);
  requireGuard(Number.isFinite(age)&&age>=0&&age<=300000,'CONTROL_PLANE_PROOF_EXPIRED');
}
export function verifyAuthorization(value,bundleSha,caSha,now=Date.now()){
  const keys=['version','approved','project','host','route','sqlSha256','sqlBytes','runnerBundleSha256','caSha256','authorizationReference','approvedAt','expiresAt','exclusiveWindowConfirmed'];
  requireGuard(value&&canonical(Object.keys(value).sort())===canonical(keys.sort()),'AUTHORIZATION_FIELDS_MISMATCH');
  requireGuard(value.version===1&&value.approved===true&&value.project===TARGET.project&&value.host===TARGET.host&&value.route===TARGET.route&&value.sqlSha256===SQL_SHA&&value.sqlBytes===SQL_BYTES&&value.runnerBundleSha256===bundleSha&&value.caSha256===caSha&&value.exclusiveWindowConfirmed===true,'AUTHORIZATION_SCOPE_MISMATCH');
  requireGuard(typeof value.authorizationReference==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(value.authorizationReference),'AUTHORIZATION_REFERENCE_INVALID');
  const approved=Date.parse(value.approvedAt),expires=Date.parse(value.expiresAt);
  requireGuard(Number.isFinite(approved)&&Number.isFinite(expires)&&approved<=now&&expires>now&&expires-approved<=1800000,'AUTHORIZATION_EXPIRED');
}
export function selectRow(result,key){
  const list=Array.isArray(result)?result:[result];
  requireGuard(list.at(-1)?.command==='COMMIT','READ_ONLY_TRANSACTION_NOT_COMMITTED');
  const rows=list.flatMap(item=>item.rows??[]).filter(row=>key in row);
  requireGuard(rows.length===1,'READ_ONLY_RESULT_SHAPE_MISMATCH');
  return ['catalog','preserved_data'].includes(key)?rows[0]:rows[0][key];
}
export function verifyNativeIdentity(value){
  requireGuard(value?.database==='postgres'&&value.current_user==='postgres'&&value.session_user==='postgres'&&value.read_only==='on'&&value.tls===true&&/^TLSv1\.[23]$/.test(value.tls_version)&&value.server_version_num===170006&&value.server_port===5432,'NATIVE_TLS_IDENTITY_OR_VERSION_MISMATCH');
  requireGuard(value.environment_guard===false&&value.database_create===true&&value.public_create===true&&value.function_owner_counts?.postgres===251&&value.function_owner_counts?.supabase_admin===45&&Object.keys(value.function_owner_counts).length===2,'INSTALLATION_PRIVILEGE_MISMATCH');
  requireGuard(value.browser_service_role_membership===false,'UNEXPECTED_BROWSER_SERVICE_ROLE_MEMBERSHIP');
  requireGuard(canonical(value.required_roles)===canonical(['anon','authenticated','postgres','service_role']),'REQUIRED_ROLES_MISMATCH');
  requireGuard(value.trigger_tables?.length===8&&value.trigger_tables.every(item=>item.owner==='postgres'&&item.select===true&&item.trigger===true),'TRIGGER_PRIVILEGE_MISMATCH');
}
export function verifyCatalog(result,{installed=false}={}){
  const c=result?.catalog;
  requireGuard(c&&result.compatibility_sha256===CATALOG_SHA&&c.read_only==='on'&&c.database==='postgres'&&c.current_user==='postgres'&&c.session_user==='postgres','CATALOG_FINGERPRINT_MISMATCH');
  requireGuard(canonical(c.migration_history)===canonical(HISTORY),'MIGRATION_HISTORY_MISMATCH');
  requireGuard(c.foundation_present===installed&&c.gateway_rpc_present===installed,'FOUNDATION_PRESENCE_MISMATCH');
  requireGuard(c.function_fingerprints?.length===296&&c.triggers?.length===90&&c.all_policies?.length===82&&c.buckets?.length===10&&c.all_policies.filter(p=>p.schemaname==='storage'&&p.tablename==='objects').length===15,'CATALOG_INVENTORY_MISMATCH');
  requireGuard(c.triggers.filter(t=>t.name==='a_production_fixture_markers_guard'&&t.enabled==='O').length===4&&c.triggers.filter(t=>['a_document_mutation_guard','b_document_direct_guard','a_document_parent_guard'].includes(t.name)&&t.enabled==='O').length===3,'EXISTING_SECURITY_TRIGGER_MISMATCH');
}
export function verifyAbsence(value){
  requireGuard(value?.database==='postgres'&&value.current_user==='postgres'&&value.session_user==='postgres'&&value.environment_guard===false&&value.foundation_namespace_count===0&&value.foundation_rpc_count===0&&value.foundation_trigger_count===0&&value.other_foundation_transactions?.length===0&&value.foundation_locks?.length===0,'FOUNDATION_ABSENCE_OR_QUIESCENCE_MISMATCH');
}
export function verifyData(actual,expected){
  requireGuard(actual?.read_only==='on'&&actual.preserved_data?.length===57&&canonical(actual.preserved_data)===canonical(expected.preserved_data),'PROTECTED_DATA_OR_REFERENCE_DRIFT');
}
const normalizeTrigger=text=>text.replace(/;\s*$/,'').replace(/\bON public\./,'ON ').replace(/\s+/g,' ').trim();
export function verifyPostflight(post,expectedFunctions,sqlText){
  requireGuard(post?.environment_guard===false&&post.storage_policy_count===15,'POSTFLIGHT_PROTECTION_MISMATCH');
  requireGuard(canonical(post.trusted_origins)===canonical(['https://mqqaykksadotbrghbexz.supabase.co']),'POSTFLIGHT_ORIGIN_MISMATCH');
  const pick=record=>Object.fromEntries(Object.keys(expectedFunctions[0]).map(key=>[key,record[key]]));
  const sort=items=>[...items].sort((a,b)=>a.signature<b.signature?-1:a.signature>b.signature?1:0);
  requireGuard(post.functions?.length===14&&canonical(sort(post.functions.map(pick)))===canonical(sort(expectedFunctions)),'POSTFLIGHT_FUNCTION_OR_ACL_MISMATCH');
  requireGuard(post.functions.every(f=>!f.public_execute&&['anon','authenticated','service_role'].every(role=>f.effective_grants?.[role]===f.acl.includes(role+'=X/'))),'POSTFLIGHT_EFFECTIVE_FUNCTION_GRANT_MISMATCH');
  const admin=post.functions.find(f=>f.signature==='admin_authorize_storage_operation(text,text,text,text,uuid,text)');
  requireGuard(admin&&!admin.public_execute&&admin.effective_grants.anon===false&&admin.effective_grants.authenticated===false&&admin.effective_grants.service_role===true,'POSTFLIGHT_ADMIN_GATEWAY_GRANT_MISMATCH');
  const tables=['admin_asset_uploads','asset_bindings','cleanup_receipts','trusted_storage_origins'].map(name=>'ytrace_storage_private.'+name).sort();
  const tablePrivileges=['delete','insert','references','select','trigger','truncate','update'];
  requireGuard(post.tables?.length===4&&canonical(post.tables.map(t=>t.table).sort())===canonical(tables)&&post.tables.every(t=>t.owner==='postgres'&&t.rls===true&&t.public_dml===false&&['anon','authenticated','service_role'].every(role=>canonical(Object.keys(t.effective_grants[role]).sort())===canonical(tablePrivileges)&&Object.values(t.effective_grants[role]).every(v=>v===false))),'POSTFLIGHT_PRIVATE_TABLE_GRANT_MISMATCH');
  const definitions=[...sqlText.matchAll(/^CREATE TRIGGER\b[\s\S]*?;/gm)].map(m=>normalizeTrigger(m[0])).sort();
  requireGuard(definitions.length===8&&post.triggers?.length===8&&post.triggers.every(t=>t.enabled==='O')&&canonical(post.triggers.map(t=>normalizeTrigger(t.definition)).sort())===canonical(definitions),'POSTFLIGHT_TRIGGER_BINDING_MISMATCH');
  requireGuard(post.current_template_resolution?.total===13&&post.current_template_resolution.resolved===13&&post.current_template_resolution.objects_exist===13&&post.published_news_resolution?.published===3&&post.published_news_resolution.resolved===3&&post.published_news_resolution.objects_exist===3,'POSTFLIGHT_CANONICAL_ASSET_MISMATCH');
  requireGuard(post.asset_audit?.every(row=>!row.published||['empty','external'].includes(row.form)||row.resolvable===true),'POSTFLIGHT_ASSET_AUDIT_MISMATCH');
}
export async function durableJson(path,value){
  const handle=await open(path,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}
}
export async function claimLock(path){
  await mkdir(resolve(path,'..'),{recursive:true});
  const claim={project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,pid:process.pid,nonce:randomUUID(),createdAt:new Date().toISOString()};
  await durableJson(path,claim);
  return {claim,async verify(){
    const current=JSON.parse(await readFile(path,'utf8'));
    requireGuard(canonical(current)===canonical(claim),'LOCK_OWNERSHIP_MISMATCH');
    process.kill(process.pid,0);
  },async release(){await this.verify();await unlink(path);}};
}
// No recovery retry exists. The immutable marker survives every submission outcome.
export async function singleAttempt({client,sqlBytes,markerPath,lock,receiptPath,postflight,now=()=>new Date().toISOString()}){
  const text=verifyArtifact(sqlBytes);
  await lock.verify();
  await durableJson(markerPath,{project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,sqlBytes:SQL_BYTES,attempt:1,startedAt:now()});
  let committed=false;
  try{
    const result=await client.query(text); // One complete simple-query message; no parameters/name/queryMode.
    const commands=(Array.isArray(result)?result:[result]).map(r=>r.command);
    requireGuard(commands.at(-1)==='COMMIT','COMMIT_ACKNOWLEDGEMENT_MISSING');
    committed=true;
    await postflight();
    const receipt={status:'COMMITTED_AND_VERIFIED',project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,attempts:1,automaticRetries:0,committed:true,verifiedAt:now()};
    await durableJson(receiptPath,receipt);
    return receipt;
  }catch(error){
    let rollbackAcknowledged=false;
    if(!committed&&error?.severity==='ERROR'&&typeof error.code==='string'&&/^[0-9A-Z]{5}$/.test(error.code)&&!/^08|^57P0[123]$/.test(error.code)){
      try{const result=await client.query('ROLLBACK;');rollbackAcknowledged=result.command==='ROLLBACK';}catch{}
    }
    const receipt={status:committed?'COMMITTED_POSTFLIGHT_FAILED':rollbackAcknowledged?'ERROR_ROLLBACK_ACKNOWLEDGED_RECONCILIATION_REQUIRED':'UNKNOWN_TRANSACTION_OUTCOME',project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,attempts:1,automaticRetries:0,committed:committed?true:null,rollbackAcknowledged,error:safeError(error),stoppedAt:now(),retainLock:true};
    await durableJson(receiptPath,receipt);
    return receipt;
  }
}
