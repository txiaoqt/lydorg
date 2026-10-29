// Saved assertion-identity comparison; never changes tests or contacts Supabase.
import { readFile,writeFile } from 'node:fs/promises';
const directory='docs/staging-validation/2026-10-10/identity-schema/';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const [current,previous,head]=await Promise.all([read(directory+'vitest-full.json'),
  read('docs/staging-validation/2026-10-10/real-storage-validation/vitest-full.json'),read('tmp/readiness-failing-baseline.json')]);
const rows=run=>run.testResults.flatMap(file=>file.assertionResults.map(a=>({file:file.name.replaceAll('\\','/').split('/src/').at(-1),name:a.fullName,status:a.status})));
const key=row=>row.file+'\n'+row.name;
const failedKeys=run=>new Set(rows(run).filter(a=>a.status==='failed').map(key));
const priorFailed=failedKeys(previous),headFailed=failedKeys(head);
const failures=rows(current).filter(a=>a.status==='failed').map(row=>({...row,inPreviousFailures:priorFailed.has(key(row)),inSavedHeadFailures:headFailed.has(key(row))}));
const metrics=run=>({total:run.numTotalTests,passed:run.numPassedTests,failed:run.numFailedTests,files:run.testResults.length,
  collectionErrors:run.testResults.filter(f=>f.status==='failed'&&!f.assertionResults.length).length});
const report={current:metrics(current),previous:metrics(previous),savedHead:metrics(head),baselineCommit:'2f6e7427c553b7535f53860d1732b42df7c023e8',
  baselineNote:'Saved baseline evidence; HEAD was not rerun in this task. Matching assertion identity establishes previous occurrence, not harmlessness.',
  matchedPreviousFailures:failures.filter(r=>r.inPreviousFailures).length,matchedHeadFailures:failures.filter(r=>r.inSavedHeadFailures).length,
  newlyFailingAssertions:failures.filter(r=>!r.inPreviousFailures),failures};
await writeFile(directory+'vitest-baseline-comparison.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,failures:undefined}));
