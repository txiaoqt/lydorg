// Offline diagnosis only. No Supabase imports, connections, or SQL execution.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
const directory='docs/production-security/storage-cutover/diagnostics/20261011T125750Z/';
const source=await readFile(directory+'upstream-destructive-sql.ts','utf8');
// Reviewed upstream module is only string/regular-expression helpers.
assert.doesNotMatch(source,/\b(?:import|require|fetch|eval|process)\b/);
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const bytes=await readFile('docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql');
const sql=bytes.toString('utf8');
const sha256=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256,'e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2');
assert.equal(module.isDestructiveSql(sql),true);
assert.equal(module.isDestructiveSql('BEGIN READ ONLY; SELECT 1; COMMIT;'),false);
const matches=module.removeCommentsFromSql(sql).split(';').filter(statement=>/^\s*delete\s/i.test(statement)).map(statement=>statement.trim().replace(/\s+/g,' '));
const report={status:'PASS',offline:true,sqlBytes:bytes.length,sqlSha256:sha256,detectorSourceSha256:createHash('sha256').update(source).digest('hex'),currentUpstreamMarksCandidateDestructive:true,readOnlyControlMarksDestructive:false,detectedDeleteStatements:matches,interpretation:'DELETE tokens are inside new routine definitions. The reviewed install does not execute those routine DELETEs. The current upstream textual detector can request confirmation for this artifact.',limitation:'Hosted MCP version, confirmation capabilities, emitted state, expiry and server rejection reason were not available.'};
await writeFile(directory+'offline-detector-result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,currentUpstreamMarksCandidateDestructive:true,readOnlyControlMarksDestructive:false,detectedDeleteStatements:matches.length,sqlBytes:bytes.length,sqlSha256:sha256}));

