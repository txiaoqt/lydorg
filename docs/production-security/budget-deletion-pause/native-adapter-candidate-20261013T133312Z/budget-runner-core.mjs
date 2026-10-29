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
export const ORIGINAL_INVENTORY_PATH='docs/production-security/storage-cutover/executions/20261011T122743Z/protected-data-readonly.sql';
export const ORIGINAL_INVENTORY_SHA='ecf05439e94d078b63d7f5b4efc37f262425ed5a9ecc7904cd241efb5d4b249d';
export const BUDGET_INVENTORY_PATH='docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/budget-protected-data-readonly.sql';
export const READ_ONLY_SQL_CONTRACTS=Object.freeze({
  identitySql:Object.freeze({terminal:'ROLLBACK',timeout:'10s',key:'native_identity',rowEnvelope:false}),
  preSql:Object.freeze({terminal:'ROLLBACK',timeout:'20s',key:'verification',rowEnvelope:false}),
  postSql:Object.freeze({terminal:'ROLLBACK',timeout:'20s',key:'verification',rowEnvelope:false}),
  protectedDataSql:Object.freeze({terminal:'ROLLBACK',timeout:'20s',key:'preserved_data',rowEnvelope:true}),
  foundationSql:Object.freeze({terminal:'ROLLBACK',timeout:'20s',key:'foundation_verification',rowEnvelope:false}),
  // Pinned preservation reference only. Never submitted by this adapter.
  originalProtectedDataSql:Object.freeze({terminal:'COMMIT',timeout:'20s',key:'preserved_data',rowEnvelope:true,referenceOnly:true}),
});
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
  'budget-runner-core.mjs','native-budget-pause-runner.mjs','operation-acl.ps1',
  'native-budget-pause-supervisor.mjs','budget-safety-controls.test.mjs',
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

// A bounded lexical check for the exact pinned verifier format, not a general
// SQL sandbox. File hashes and PostgreSQL READ ONLY remain required barriers.
function verifierStatements(text){
  const statements=[],tokens=[];
  let i=0;
  while(i<text.length){
    const char=text[i];
    if(/\s/.test(char)){i++;continue;}
    if(text.startsWith('--',i)){while(i<text.length&&text[i]!=='\n')i++;continue;}
    if(text.startsWith('/*',i)){
      i+=2;let depth=1;
      while(i<text.length&&depth){if(text.startsWith('/*',i)){depth++;i+=2;}else if(text.startsWith('*/',i)){depth--;i+=2;}else i++;}
      requireGuard(depth===0,'READ_ONLY_SQL_UNTERMINATED_COMMENT');continue;
    }
    if(char==="'"||char==='"'){
      const quote=char,escaped=quote==="'"&&tokens.at(-1)?.value==='E'&&tokens.at(-1)?.end===i;
      let value='',closed=false;i++;
      while(i<text.length){
        if(text[i]===quote){if(text[i+1]===quote){value+=quote;i+=2;continue;}i++;closed=true;break;}
        if(escaped&&text[i]==='\\'){requireGuard(i+1<text.length,'READ_ONLY_SQL_UNTERMINATED_LITERAL');value+=text.slice(i,i+2);i+=2;continue;}
        value+=text[i++];
      }
      requireGuard(closed,'READ_ONLY_SQL_UNTERMINATED_LITERAL');
      tokens.push({type:quote==="'"?'literal':'identifier',value,end:i});continue;
    }
    requireGuard(char!=='$','READ_ONLY_SQL_UNSUPPORTED_LEXICAL_FORM');
    if(/[A-Za-z_]/.test(char)){
      const start=i++;while(i<text.length&&/[A-Za-z0-9_$]/.test(text[i]))i++;
      tokens.push({type:'word',value:text.slice(start,i).toUpperCase(),end:i});continue;
    }
    if(char===';'){
      requireGuard(tokens.length>0,'READ_ONLY_SQL_EMPTY_STATEMENT');
      statements.push(tokens.splice(0));i++;continue;
    }
    tokens.push({type:'symbol',value:char,end:++i});
  }
  requireGuard(tokens.length===0,'READ_ONLY_SQL_UNTERMINATED_STATEMENT');
  return statements;
}

export function verifyReadOnlySqlContract(bytes,inputName,{execution=true}={}){
  const contract=READ_ONLY_SQL_CONTRACTS[inputName];
  requireGuard(contract&&(!execution||!contract.referenceOnly),'READ_ONLY_SQL_INPUT_NOT_EXECUTABLE');
  requireGuard(Buffer.isBuffer(bytes),'READ_ONLY_SQL_BYTES_REQUIRED');
  const text=bytes.toString('utf8');
  requireGuard(Buffer.from(text,'utf8').equals(bytes),'READ_ONLY_SQL_UTF8_MISMATCH');
  const statements=verifierStatements(text);
  requireGuard(statements.length===4,'READ_ONLY_SQL_STATEMENT_COUNT_MISMATCH');
  const words=statement=>statement.map(token=>token.type==='word'?token.value:'?').join(' ');
  requireGuard(words(statements[0])==='BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY','READ_ONLY_SQL_TRANSACTION_MODE_MISMATCH');
  const setting=statements[1];
  requireGuard(setting.length===5&&words(setting.slice(0,3))==='SET LOCAL STATEMENT_TIMEOUT'&&setting[3].value==='='&&setting[4].type==='literal'&&setting[4].value===contract.timeout,'READ_ONLY_SQL_TIMEOUT_MISMATCH');
  requireGuard(words(statements[3])===contract.terminal,'READ_ONLY_SQL_TERMINAL_MISMATCH');
  const query=statements[2],queryWords=query.filter(token=>token.type==='word').map(token=>token.value);
  requireGuard(['SELECT','WITH'].includes(queryWords[0]),'READ_ONLY_SQL_QUERY_REQUIRED');
  const forbidden=new Set(['INSERT','UPDATE','DELETE','MERGE','TRUNCATE','CREATE','ALTER','DROP','GRANT','REVOKE','COPY','CALL','DO','EXECUTE','INTO','LOCK','SET','RESET','BEGIN','COMMIT','ROLLBACK','VACUUM','ANALYZE','REFRESH','REINDEX','NEXTVAL','SETVAL','SET_CONFIG','PG_TERMINATE_BACKEND','PG_CANCEL_BACKEND','PG_ADVISORY_LOCK','PG_ADVISORY_XACT_LOCK','PG_ADVISORY_UNLOCK']);
  requireGuard(!queryWords.some(word=>forbidden.has(word)),'READ_ONLY_SQL_DATA_CHANGE_FORBIDDEN');
  requireGuard(query.some((token,index)=>token.type==='word'&&token.value==='AS'&&query[index+1]?.type==='word'&&query[index+1].value===contract.key.toUpperCase()),'READ_ONLY_SQL_RESULT_KEY_MISMATCH');
  return {input:inputName,terminal:contract.terminal,readOnly:true,isolation:'REPEATABLE READ',statementTimeout:contract.timeout,resultKey:contract.key,rowEnvelope:contract.rowEnvelope,referenceOnly:!!contract.referenceOnly,statementCount:statements.length};
}

export function verifyBudgetInventoryCopy(original,budget){
  requireGuard(Buffer.isBuffer(original)&&original.length===13900&&sha256(original)===ORIGINAL_INVENTORY_SHA,'ORIGINAL_INVENTORY_ARTIFACT_MISMATCH');
  const text=original.toString('utf8');
  requireGuard(/COMMIT;(\s*)$/.test(text),'ORIGINAL_INVENTORY_TERMINAL_MISMATCH');
  const expected=Buffer.from(text.replace(/COMMIT;(\s*)$/,'ROLLBACK;$1'),'utf8');
  requireGuard(Buffer.isBuffer(budget)&&budget.equals(expected),'BUDGET_INVENTORY_COPY_MISMATCH');
  verifyReadOnlySqlContract(original,'originalProtectedDataSql',{execution:false});
  verifyReadOnlySqlContract(budget,'protectedDataSql');
  return expectedRelationsFromSql(budget);
}

export function verifyReadOnlyInputContracts(inputs){
  const contracts=Object.keys(READ_ONLY_SQL_CONTRACTS).map(name=>verifyReadOnlySqlContract(inputs[name],name,{execution:!READ_ONLY_SQL_CONTRACTS[name].referenceOnly}));
  verifyBudgetInventoryCopy(inputs.originalProtectedDataSql,inputs.protectedDataSql);
  return contracts;
}

export function validateReadOnlyVerifierResult(result,inputName){
  const contract=READ_ONLY_SQL_CONTRACTS[inputName];
  requireGuard(contract&&!contract.referenceOnly,'READ_ONLY_SQL_INPUT_NOT_EXECUTABLE');
  const value=validateVerifierResult(result,contract.key,contract.terminal);
  const list=Array.isArray(result)?result:[result];
  requireGuard(list.map(item=>item.command).join(',')===`BEGIN,SET,SELECT,${contract.terminal}`,'READ_ONLY_COMMAND_SEQUENCE_MISMATCH');
  // This inventory query returns three columns; keep read_only beside the array.
  return contract.rowEnvelope?list.flatMap(item=>item.rows??[]).find(row=>row&&Object.hasOwn(row,contract.key)):value;
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
  requireGuard(Number.isSafeInteger(maxAgeMs)&&maxAgeMs>0&&maxAgeMs<=300000,'CONTROL_PLANE_FRESHNESS_LIMIT_INVALID');
  const age=now-parseExplicitIso(value.verifiedAt);
  requireGuard(Number.isFinite(age)&&age>=0&&age<=maxAgeMs,'CONTROL_PLANE_PROOF_EXPIRED');
  return value;
}

export function verifyAuthorization(value,{bundleSha256,caSha256,preflightEvidenceSha256,now=Date.now()}={}){
  const fields=['version','approved','project','host','port','database','user','route','sqlSha256','sqlBytes','runnerBundleSha256','caSha256','controlPlaneEvidenceSha256','preflightEvidenceSha256','preflightStateSha256','authorizationReference','approvedAt','expiresAt','exclusiveWindowConfirmed','existingDeletionRequestsDrained'];
  requireGuard(value&&canonicalJson(Object.keys(value).sort())===canonicalJson([...fields].sort()),'AUTHORIZATION_FIELDS_MISMATCH');
  requireGuard(value.version===1&&value.approved===true&&value.project===TARGET.project&&value.host===TARGET.host&&value.port===TARGET.port&&value.database===TARGET.database&&value.user===TARGET.user&&value.route===TARGET.route&&value.sqlSha256===SQL_SHA&&value.sqlBytes===SQL_BYTES&&value.runnerBundleSha256===bundleSha256&&value.caSha256===caSha256&&value.preflightEvidenceSha256===preflightEvidenceSha256&&/^[a-f0-9]{64}$/.test(value.preflightStateSha256)&&value.exclusiveWindowConfirmed===true&&value.existingDeletionRequestsDrained===true,'AUTHORIZATION_SCOPE_MISMATCH');
  requireGuard(typeof value.authorizationReference==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(value.authorizationReference),'AUTHORIZATION_REFERENCE_INVALID');
  const approved=parseExplicitIso(value.approvedAt),expires=parseExplicitIso(value.expiresAt);
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
  const unresolved={classification:'UNRESOLVED',installationPresence:'UNRESOLVED',preservationStatus:'NOT_VERIFIED',stop:true,sqlResubmitted:false};
  if(priorBackendFinished!==true||typeof preservationMatches!=='boolean')return unresolved;
  // Both independent catalog views must describe the same actual function.
  // Neither a status label nor a preservation failure establishes presence.
  try{
    validateBudgetStateShape(preState,'pre');
    validateBudgetStateShape(postState,'post');
    requireGuard(preState.compatibility_sha256===postState.compatibility_sha256&&canonicalJson(preState.function)===canonicalJson(postState.function),'RECONCILIATION_SNAPSHOT_CHANGED');
    const updated=postState.compatibility_sha256===POST_CATALOG_SHA;
    verifyBudgetState(updated?postState:preState,updated?'post':'pre');
    return {
      classification:updated?(preservationMatches?'INSTALLED_AND_PRESERVED':'INSTALLED_WITH_DRIFT'):(preservationMatches?'NOT_INSTALLED_VERIFIED':'NOT_INSTALLED_WITH_DRIFT'),
      installationPresence:updated?'PRESENT':'ABSENT',
      preservationStatus:preservationMatches?'MATCH':'DRIFT',
      rawEvidence:{catalogSha256:preState.compatibility_sha256,functionDefinitionMd5:preState.function.definition_md5,functionSourceMd5:preState.function.source_md5},
      stop:true,sqlResubmitted:false,
    };
  }catch{return unresolved;}
}

export function parseExplicitIso(value){
  requireGuard(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value),'EXPLICIT_ISO_TIMESTAMP_REQUIRED');
  const time=Date.parse(value);
  requireGuard(Number.isFinite(time),'ISO_TIMESTAMP_INVALID');
  return time;
}

function boundedJson(bytes,limit){
  requireGuard(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=limit,'EVIDENCE_BYTES_INVALID');
  const text=bytes.toString('utf8');
  requireGuard(Buffer.from(text,'utf8').equals(bytes),'EVIDENCE_UTF8_INVALID');
  let parsed;
  try{parsed=JSON.parse(text);}catch{requireGuard(false,'EVIDENCE_JSON_INVALID');}
  return scrubReceiptValue(parsed);
}

export function verifyControlPlaneProofJson(bytes,{now=Date.now()}={}){
  const proof=boundedJson(bytes,16384);
  verifyControlPlaneProof(proof,{now});
  return {proof,sha256:sha256(bytes),ageSeconds:(now-parseExplicitIso(proof.verifiedAt))/1000};
}

export function verifyInstallationReceipt({result,receiptBytes,markerBytes,preflightBytes,expectedBundleSha256,expectedRelations,expectedFoundation}){
  requireGuard(result?.status==='COMMITTED_AND_VERIFIED'&&result.commitAcknowledged===true&&result.submissionCount===1&&result.automaticRetries===0&&result.rollbackStatementsSent===0&&result.retainLock===false&&result.retainAttemptMarker===true&&result.stopForHumanReview!==true,'INSTALL_RESULT_NOT_VERIFIED_SUCCESS');
  requireGuard(/^[a-f0-9]{64}$/.test(expectedBundleSha256)&&result.project===TARGET.project&&result.sqlSha256===SQL_SHA&&result.runnerBundleSha256===expectedBundleSha256,'INSTALL_RESULT_SCOPE_MISMATCH');
  requireGuard(Buffer.isBuffer(receiptBytes)&&receiptBytes.length>0&&receiptBytes.length<=1048576,'RECEIPT_SIZE_INVALID');
  const text=receiptBytes.toString('utf8');
  requireGuard(Buffer.from(text,'utf8').equals(receiptBytes)&&text.endsWith('\n'),'RECEIPT_INCOMPLETE');
  const lines=text.slice(0,-1).split('\n');
  requireGuard(lines.length===4&&lines.every(line=>line.length>0),'RECEIPT_EVENT_COUNT_INVALID');
  const events=lines.map(line=>boundedJson(Buffer.from(line,'utf8'),262144));
  requireGuard(events.map(event=>event.event).join(',')==='ATTEMPT_ARMED,COMMIT_ACKNOWLEDGED,POSTFLIGHT_EVIDENCE,POSTFLIGHT_VERIFIED','RECEIPT_EVENT_SEQUENCE_INVALID');
  const times=events.map(event=>parseExplicitIso(event.capturedAt));
  requireGuard(times.every((time,index)=>index===0||time>=times[index-1]),'RECEIPT_TIME_SEQUENCE_INVALID');
  requireGuard(events.every(event=>event.project===TARGET.project&&event.sqlSha256===SQL_SHA),'RECEIPT_SCOPE_MISMATCH');
  const [armed,commit,post,verified]=events;
  requireGuard(canonicalJson(commit.commands)===canonicalJson(['COMMIT'])&&verified.commitAcknowledged===true,'RECEIPT_TERMINAL_COMMIT_MISSING');
  const marker=boundedJson(markerBytes,65536),pre=boundedJson(preflightBytes,2097152);
  const app=armed.applicationIdentity;
  requireGuard(app&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(app.nonce)&&app.applicationName==='ytrace-budget-pause-i-'+app.nonce&&app.runnerBundleSha256===expectedBundleSha256,'RECEIPT_APPLICATION_IDENTITY_MISMATCH');
  requireGuard(Number.isSafeInteger(app.backendPid)&&app.backendPid>0&&typeof app.backendStart==='string','RECEIPT_BACKEND_IDENTITY_MISMATCH');
  parseExplicitIso(app.backendStart);
  requireGuard(marker.project===TARGET.project&&marker.route===TARGET.route&&marker.sqlSha256===SQL_SHA&&marker.runnerBundleSha256===expectedBundleSha256&&marker.attempt===1&&marker.submissionMayHaveOccurred===true,'RECEIPT_MARKER_SCOPE_MISMATCH');
  requireGuard(marker.nonce===app.nonce&&marker.applicationName===app.applicationName&&marker.backendPid===app.backendPid&&marker.backendStart===app.backendStart&&Number.isSafeInteger(marker.lockPid)&&marker.lockPid>0&&typeof marker.lockNonce==='string'&&marker.lockNonce.length>0,'RECEIPT_MARKER_IDENTITY_MISMATCH');
  const markerTime=parseExplicitIso(marker.startedAt);
  requireGuard(markerTime>=times[0]&&markerTime<=times[1],'RECEIPT_MARKER_TIME_MISMATCH');
  requireGuard(marker.preflightFile==='install-preflight-'+app.nonce+'.json'&&result.preflightFile===marker.preflightFile&&result.evidenceFile==='execution-'+app.nonce+'.jsonl'&&marker.preflightSha256===sha256(preflightBytes)&&marker.preflightStateSha256===pre.approvalFingerprint,'RECEIPT_PREFLIGHT_BINDING_MISMATCH');
  requireGuard(pre.recordType==='YTRACE_BUDGET_PAUSE_NATIVE_PREFLIGHT'&&pre.status==='READ_ONLY_PREFLIGHT_PASS'&&pre.project===TARGET.project&&pre.host===TARGET.host&&pre.route===TARGET.route&&pre.sqlSha256===SQL_SHA&&pre.sqlBytes===SQL_BYTES&&pre.runnerBundleSha256===expectedBundleSha256,'RECEIPT_PREFLIGHT_SCOPE_MISMATCH');
  requireGuard(pre.approvalFingerprint===preflightStateFingerprint(pre)&&parseExplicitIso(pre.capturedAt)<=times[0],'RECEIPT_PREFLIGHT_STATE_MISMATCH');
  requireGuard(pre.tls?.chainVerified===true&&pre.tls.hostnameVerified===true&&pre.tls.caSha256===app.caSha256,'RECEIPT_PREFLIGHT_TLS_MISMATCH');
  requireGuard(Number(pre.identity?.backend_pid)===app.backendPid&&pre.identity.backend_start===app.backendStart&&pre.identity.application_name===app.applicationName,'RECEIPT_PREFLIGHT_BACKEND_MISMATCH');
  verifyBudgetState(pre.budget,'pre');
  const protectedData=protectedDataDigest(pre.protectedData,expectedRelations);
  const stable=stableFoundation(pre.foundation?.value);
  requireGuard(protectedData.sha256===pre.protectedData.sha256&&hashJson(stable)===pre.foundation.sha256,'RECEIPT_PREFLIGHT_PRESERVATION_MISMATCH');
  requireGuard(hashJson(foundationStructure(pre.foundation.value))===expectedFoundation.sha256&&canonicalJson(foundationStructure(pre.foundation.value))===canonicalJson(expectedFoundation.structure),'RECEIPT_FOUNDATION_REFERENCE_MISMATCH');
  requireGuard(post.status==='PASS'&&post.runnerBundleSha256===expectedBundleSha256&&post.catalogSha256===POST_CATALOG_SHA,'RECEIPT_POSTFLIGHT_CATALOG_MISMATCH');
  validateFunctionContract(post.function,EXPECTED_PAUSED_FUNCTION);
  requireGuard(canonicalJson(post.migrationHistory)===canonicalJson(HISTORY)&&post.storagePolicyCount===15&&post.storageObjects===pre.budget.storage_objects&&post.organizationProfiles===pre.budget.organization_profiles,'RECEIPT_POSTFLIGHT_COUNTS_MISMATCH');
  requireGuard(post.protectedInventoryCount===57&&post.protectedInventoriesSha256===protectedData.sha256&&post.foundationSha256===pre.foundation.sha256,'RECEIPT_POSTFLIGHT_PRESERVATION_MISMATCH');
  requireGuard(post.backend?.pid===app.backendPid&&post.backend.startedAt===app.backendStart&&post.backend.applicationName===app.applicationName,'RECEIPT_POSTFLIGHT_BACKEND_MISMATCH');
  return {status:'PASS',receiptSha256:sha256(receiptBytes),markerSha256:sha256(markerBytes),preflightSha256:sha256(preflightBytes),terminalCommand:'COMMIT',eventCount:4,protectedInventories:57,catalogSha256:POST_CATALOG_SHA};
}

export function resultExitCode(mode,result){
  if(mode==='--review')return result?.status==='PASS'&&result.mode==='OFFLINE_REVIEW'&&result.installationActivated===false?0:2;
  if(mode==='--preflight')return result?.status==='PASS'&&result.mode==='READ_ONLY_PREFLIGHT'&&result.installationActivated===false?0:2;
  if(mode!=='--install')return 2; // Reconciliation always stops for human review.
  const proof=result?.receiptVerification;
  return result?.status==='COMMITTED_AND_VERIFIED'&&result.commitAcknowledged===true&&result.submissionCount===1&&result.automaticRetries===0&&result.rollbackStatementsSent===0&&result.retainLock===false&&result.retainAttemptMarker===true&&result.stopForHumanReview!==true&&proof?.status==='PASS'&&proof.terminalCommand==='COMMIT'&&proof.eventCount===4&&proof.protectedInventories===57&&proof.catalogSha256===POST_CATALOG_SHA&&['receiptSha256','markerSha256','preflightSha256'].every(key=>/^[a-f0-9]{64}$/.test(proof[key]))?0:2;
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
  requireGuard(env.NODE_PG_FORCE_NATIVE===undefined,'NATIVE_DRIVER_OVERRIDE_FORBIDDEN');
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
  requireGuard(manifest.inputs&&Object.keys(manifest.inputs).sort().join(',')==='environmentVerifier,foundationCore,foundationReceipt,foundationSql,identitySql,originalProtectedDataSql,packageLock,postSql,preSql,protectedDataSql,sql','REVIEWED_INPUT_SET_MISMATCH');
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
  requireGuard(sorted.length===REVIEWED_CODE_FILES.length&&new Set(sorted.map(item=>item.file)).size===REVIEWED_CODE_FILES.length&&canonicalJson(sorted.map(item=>item.file))===canonicalJson([...REVIEWED_CODE_FILES].sort())&&sorted.every(item=>/^[a-f0-9]{64}$/.test(item.sha256)),'BUNDLE_CODE_MANIFEST_INVALID');
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
