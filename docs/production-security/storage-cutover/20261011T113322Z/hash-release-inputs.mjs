// Offline release manifest. No credentials or network.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base='docs/production-security/storage-cutover/20261011T113322Z/';
const paths=[
'supabase/migrations/20261009145634_storage_authorization_remediation.sql',
'supabase/migrations/20261009150110_storage_authorization_cutover.sql',
'supabase/functions/admin-storage-access/index.ts','supabase/functions/admin-storage-access/control.ts',
'src/lib/admin-storage-access.ts','src/lib/lydo-connect-supabase.ts','src/lib/signed-storage-url-cache.ts','src/lib/admin-auth.ts','src/lib/supabase.ts',
'scripts/security/storage-object-classification.mjs','scripts/security/storage-object-classification.test.mjs',
'scripts/security/verify-storage-session-validator.local.mjs','supabase/tests/storage_cutover_compatibility.local.test.mjs',
...['production_storage_foundation_review.sql','production_storage_policy_cutover_review.sql','production-catalog-final.json','expected-foundation-functions.json','historical-object-matrix.json','compatibility-fingerprint-readonly.sql','review.md','operator-checklist.md'].map(x=>base+x)
];
const files=[];
for(const path of paths){const bytes=await readFile(path);files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(base+'file-hashes.json',JSON.stringify({scope:'Prepared local artifacts and existing frontend dependencies; not deployed',files},null,2)+'\n',{flag:'wx'});
const vitest=JSON.parse(await readFile(base+'focused-vitest.json','utf8'));
const sql=JSON.parse(await readFile(base+'local-sql-final-v2/local-sql-compatibility.json','utf8'));
await writeFile(base+'validation-summary.json',JSON.stringify({
classification:{tests:8,passed:8,failed:0},
sql:{tests:4,passed:4,failed:0,evidence:sql,limitations:['PGlite PostgreSQL with synthetic auth.uid and noncryptographic token digest','No live production HTTP authorization tests','In-memory synthetic catalog SHA substituted for wrapper tests only']},
vitest:{tests:vitest.numTotalTests,passed:vitest.numPassedTests,failed:vitest.numFailedTests},
typescript:{command:'npx tsc --noEmit',exitCode:0},
diffCheck:{command:'git diff --check',exitCode:0},
earlierLocalFailures:[{run:'01',passed:1,failed:1,cause:'Synthetic citext parameter inference'},{run:'03',passed:2,failed:1,cause:'Missing storage.buckets in wrapper fixture'},{run:'04',passed:2,failed:1,cause:'Fault-injection replacement-string dollar escaping'}],
productionWrites:false,stagingWrites:false,pushOrDeployment:false,buildAndFullSuite:'Not run; no application source changed'
},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({hashedFiles:files.length,vitestPassed:vitest.numPassedTests,sqlEvidenceRecords:sql.length}));

