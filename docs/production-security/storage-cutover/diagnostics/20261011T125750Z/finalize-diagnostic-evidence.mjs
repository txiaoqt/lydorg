// Local evidence only. No network, database client or credential reads.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const directory = 'docs/production-security/storage-cutover/diagnostics/20261011T125750Z/';
const artifact = 'docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql';
const sha256 = data => createHash('sha256').update(data).digest('hex');
const sql = await readFile(artifact);
assert.equal(sql.length,47407);
assert.equal(sha256(sql),'e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2');
const normalize = value => value.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trimEnd();
const before = normalize(await readFile(directory+'working-tree-before.txt','utf8'));
const after = normalize(await readFile(directory+'working-tree-after.txt','utf8'));
assert.equal(after,before,'Working-tree status differs; inspect before finalizing.');
const protection = {
  sqlBytes:sql.length,sqlSha256:sha256(sql),sqlUnchanged:true,
  workingTreeStatusUnchanged:true,
  qualification:'Porcelain status comparison plus scoped diagnostic edits; this is not a byte-level snapshot of every pre-existing untracked file.',
};
await writeFile(directory+'local-preservation.json',JSON.stringify(protection,null,2)+'\n',{flag:'wx'});
const evidence=[];
for (const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
  if (!entry.isFile() || entry.name==='evidence-manifest.json') continue;
  const data=await readFile(directory+entry.name);
  if (/\.(?:md|mjs|ts)$/.test(entry.name)) {
    assert.equal(data.toString('utf8').split(/\r?\n/).some(line=>/[\t ]+$/.test(line)),false,`Trailing whitespace: ${entry.name}`);
  }
  evidence.push({file:entry.name,bytes:data.length,sha256:sha256(data)});
}
const manifest={project:'mqqaykksadotbrghbexz',scope:'Read-only diagnostic evidence; not an installation receipt',createdAt:new Date().toISOString(),reviewedArtifact:{file:artifact,bytes:sql.length,sha256:sha256(sql)},priorExecutionReceipt:'docs/production-security/storage-cutover/executions/20261011T122743Z/execution-receipt.json',files:evidence};
await writeFile(directory+'evidence-manifest.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',sqlUnchanged:true,workingTreeStatusUnchanged:true,evidenceFiles:evidence.length,noDatabaseWrites:true}));
