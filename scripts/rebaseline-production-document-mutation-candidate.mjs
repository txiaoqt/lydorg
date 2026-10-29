// Local preparation only. Reads saved read-only evidence; never connects to a database.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const dir = 'docs/production-security/document-mutation/rebaseline-20261011T095424Z';
const historicalPath = 'docs/production-security/document-mutation/document_mutation_lifecycle_guard_production.sql';
const historicalSha = '86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785';
const sha = value => createHash('sha256').update(value).digest('hex');
const historicalBytes = await readFile(historicalPath);
assert.equal(sha(historicalBytes), historicalSha, 'Historical candidate drift');
const historical = historicalBytes.toString('utf8');
const expected = JSON.parse(await readFile(`${dir}/expected-production-manifest.json`, 'utf8'));
const query = (await readFile(`${dir}/catalog-manifest-readonly.sql`, 'utf8')).trim().replace(/;\s*$/, '');
const baseline = JSON.parse(await readFile(`${dir}/production-baseline.json`, 'utf8'));
const compatibility = JSON.parse(await readFile(`${dir}/compatibility-hashes.json`, 'utf8'));
assert.deepEqual(expected.catalog.migrations, {count:164, latest:'20261011230000', fingerprint:'2d1ea52795f2d3c97c71e229819d9a7c'});
assert.equal(expected.complete_history_md5, '1f5eca911f6e2057ae070a955eaca3dc');
assert.equal(expected.environment_guard, false);
assert.equal(expected.containment_receipt.version, '20261011230000');
assert.equal(expected.trigger_dependencies.filter(t => t.name === 'a_production_fixture_markers_guard' && t.enabled === 'O').length, 4);
assert.equal(compatibility.trigger_hash_without_marker, 'aed1b3f4417ad04716197a353c7259bf');
assert.equal(compatibility.trigger_hash, '42b3e24219b2dd719f0cff11c57adc3a');
for (const match of historical.matchAll(/\('([^']+)','([a-f0-9]{32})',(true|false)\)/g)) {
  const current = baseline.patch_scope_functions.find(f => f.signature === match[1]);
  assert.ok(current, `Missing unchanged dependency ${match[1]}`);
  assert.equal(current.definition_md5, match[2], `Unexpected source drift ${match[1]}`);
  assert.equal(current.security_definer, match[3] === 'true');
  assert.equal(current.owner, 'postgres');
}
const from = historical.indexOf('DO $production_gate$');
const end = historical.indexOf('END $production_gate$;', from) + 'END $production_gate$;'.length;
assert.ok(from > 0 && end > from);
const expectedLiteral = JSON.stringify(expected);
assert.ok(!expectedLiteral.includes('$expected_catalog$'));
const gate = `DO $production_gate$
DECLARE
 _actual jsonb;
 _expected jsonb := $expected_catalog$${expectedLiteral}$expected_catalog$::jsonb;
 _count bigint; _latest text;
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'Reviewed postgres installation database and owner required';
 END IF;
 SELECT count(*),max(version) INTO _count,_latest FROM supabase_migrations.schema_migrations;
 IF _count<>164 OR _latest<>'20261011230000' THEN
  RAISE EXCEPTION 'Production migration history drift';
 END IF;
 SELECT q.manifest INTO _actual FROM (
${query}
 ) q;
 IF _actual IS DISTINCT FROM _expected THEN
  RAISE EXCEPTION 'Production post-containment catalog drift; stop and review';
 END IF;
 IF NOT has_database_privilege(current_user,current_database(),'CREATE')
  OR NOT has_schema_privilege(current_user,'public','CREATE')
  OR NOT has_table_privilege(current_user,'public.document_submission_files','TRIGGER')
  OR NOT has_table_privilege(current_user,'public.document_submissions','TRIGGER') THEN
  RAISE EXCEPTION 'Required installation privileges are unavailable';
 END IF;
END $production_gate$;`;
const header = `-- REBASELINED PRODUCTION REVIEW CANDIDATE ONLY; NOT INSTALLED.
-- Explicit production project/endpoint verification is mandatory; SQL catalog identity alone is not a project identity.
-- Read-only baseline: ${baseline.captured_at}; containment receipt 20261011230000.
-- Historical candidate SHA-256: ${historicalSha}.
-- Only the preflight gate and these comments differ. All lifecycle/authentication/DDL bodies remain byte-identical.
-- Containment functions, four enabled fixture-marker triggers, API grants and full migration contents are pinned.
-- No new migration receipt is inserted by this historical patch body; expected history remains 164 records.
`;
const candidate = header + historical.slice(0, from) + gate + historical.slice(end);
assert.equal(candidate.slice(candidate.indexOf('END $production_gate$;') + 'END $production_gate$;'.length), historical.slice(end));
assert.doesNotMatch(candidate, /reconciled_synthetic_approved_document|ytrace_staging_renewal|ytrace-renewal-synthetic@example|app\.allow_test_scenario_prep/i);
assert.doesNotMatch(candidate, /^\s*(?:ALTER POLICY|CREATE POLICY|DROP POLICY|ALTER TABLE.+DISABLE TRIGGER|UPDATE auth\.|INSERT INTO auth\.|TRUNCATE\b)/im);
const path = `${dir}/document_mutation_lifecycle_guard_production_rebaselined.sql`;
await writeFile(path, candidate);
const metadata = {
  path, productionProject:'mqqaykksadotbrghbexz', installed:false,
  historicalPath, historicalSha256:historicalSha, sha256:sha(candidate), bytes:Buffer.byteLength(candidate),
  baselineCapturedAt:baseline.captured_at, migrationHistory:expected.catalog.migrations,
  completeMigrationHistoryMd5:expected.complete_history_md5,
  unchangedBodySha256:sha(historical.slice(end)), bodyByteIdentical:true,
  changedScope:['Header comments','Preflight compatibility gate only'],
  containmentMarkerTriggers:expected.trigger_dependencies.filter(t=>t.name==='a_production_fixture_markers_guard'),
  newMigrationReceipt:null, expectedPostInstallMigrationCount:164,
  lockTimeout:'5s', statementTimeout:'30s', outsideMigrationReplay:true
};
await writeFile(`${dir}/candidate-metadata.json`, JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata));
