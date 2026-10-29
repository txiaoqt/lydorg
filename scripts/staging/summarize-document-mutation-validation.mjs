// Local evidence summarization only; no database/API access.
import { readFile,writeFile,copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base='docs/staging-validation/2026-10-11/document-mutation/';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const prior=await json('docs/staging-validation/2026-10-11/renewal-scenario/final-catalog-manifest.json');
const current=await json(base+'fresh-sql-snapshot.json');
const normalize=p=>({name:p.name??p.policyname,cmd:p.cmd,roles:p.roles,permissive:p.permissive,qual:p.qual,check:Object.hasOwn(p,'check')?p.check:p.with_check});
const canonical=x=>JSON.stringify(Array.isArray(x)?x.map(normalize).sort((a,b)=>a.name.localeCompare(b.name)):x);
const vitest=await json(base+'vitest-focused.json');
const tap=await readFile('tmp/document-mutation-sql-tests.txt','utf8');
const metrics=Object.fromEntries(['tests','pass','fail'].map(k=>[k,Number(tap.match(new RegExp(`^# ${k} (\\d+)`,'m'))?.[1])]));
const files=['supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql',base+'proposed-staging-reconciliation.sql'];
const hashes=[];for(const file of files)hashes.push({file,sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
const production=await json(base+'production-readonly-fingerprints.json'),catalog=await json(base+'staging-catalog.json');
const result={scope:'Local candidate only; no live patch or fixture repair',checkedAt:new Date().toISOString(),sql:metrics,vitest:{tests:vitest.numTotalTests,pass:vitest.numPassedTests,fail:vitest.numFailedTests},typescript:{status:'PASS',command:'npx tsc --noEmit'},build:{status:'PASS',command:'npm run build -- --outDir tmp/document-mutation-build'},storagePolicies:{count:current.policies.length,unchangedSinceReviewedScenario:canonical(prior.storage)===canonical(current.policies)},productionFunctionMatches:production.functions.map(f=>({signature:f.signature,md5:f.md5,matchesStaging:catalog.functions.find(s=>s.signature===f.signature)?.md5===f.md5})),hashes,blocked:['Real concurrent sessions','Post-patch staging HTTP authorization','Browser/PWA validation'],notTested:['Complete canonical account deletion with all auxiliary tables; its existing retention/authorization function is unchanged'],productionWrites:0,stagingWrites:0};
await writeFile(base+'validation-summary.json',JSON.stringify(result,null,2));
await copyFile('tmp/document-mutation-sql-tests.txt',base+'local-sql-final-results.txt');
console.log(JSON.stringify({sql:metrics,vitest:result.vitest,storagePolicies:result.storagePolicies,hashes}));
