// NON-RUNNABLE — NOT AUTHORIZED. Calls the unchanged pure validator only.
// No wrapper.run, runner, helper, database, network, environment or protected state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateReviewedPreflightEvidence, parseReviewedResult } from '../outer-preflight-wrapper-candidate-20261014T054751Z/preflight-evidence.mjs';
import { makeSyntheticValidatorFixture, refreshSyntheticDigests, encodeSyntheticFixture } from './validator-synthetic-fixtures.mjs';
const INPUTS = Object.freeze({
  "inventorySql": {
    "file": "docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/budget-protected-data-readonly.sql",
    "bytes": 13902,
    "sha256": "459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34"
  },
  "baselineData": {
    "file": "docs/production-security/budget-deletion-pause/20261012T165000Z/protected-data-readonly.json",
    "bytes": 8427,
    "sha256": "2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc"
  },
  "baselineSnapshot": {
    "file": "docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-readonly-20261013T103131Z/native-preflight-evidence.json",
    "bytes": 37159,
    "sha256": "6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81"
  },
  "foundationReceipt": {
    "file": "docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json",
    "bytes": 36906,
    "sha256": "a549cf9bb3e8cd3c95d07ff71bf2d7417e9509f2d1ddcbd3e2f8572cf5c63b37"
  }
});
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const references = {};
for (const [name, pin] of Object.entries(INPUTS)) {
  const path = resolve(root, pin.file);
  const info = await lstat(path), canonical = await realpath(path);
  assert.ok(info.isFile() && !info.isSymbolicLink(), 'OFFLINE_REFERENCE_NOT_REGULAR');
  assert.equal(canonical.toLowerCase(), path.toLowerCase(), 'OFFLINE_REFERENCE_REDIRECT');
  const bytes = await readFile(path);
  assert.equal(bytes.length, pin.bytes, 'OFFLINE_REFERENCE_SIZE');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pin.sha256, 'OFFLINE_REFERENCE_HASH');
  references[name] = bytes;
}
function fresh() { return makeSyntheticValidatorFixture(references); }
function check(f) {
  const encoded = encodeSyntheticFixture(f);
  encoded.result = parseReviewedResult(JSON.stringify(encoded.result));
  return validateReviewedPreflightEvidence(encoded);
}
function reject(f) {
  let rejected = false;
  try { check(f); } catch { rejected = true; }
  assert.equal(rejected, true, 'UNCHANGED_VALIDATOR_ACCEPTED_ALTERED_SYNTHETIC_EVIDENCE');
}
test('complete generated positive evidence reaches the unchanged fixed validator', () => {
  const f = fresh(), out = check(f);
  assert.equal(out.protectedInventoryCount, 57); assert.equal(out.storageObjects, 378);
  for (const k of ['inventoriesMatch','catalogAndFunctionMatch','foundationAndProtectionsMatch','migrationsMatch','storagePoliciesMatch']) assert.equal(out[k], true);
  assert.equal(out.evidenceSha256, createHash('sha256').update(encodeSyntheticFixture(f).evidenceBytes).digest('hex'));
});
test('explicit offset and inclusive capture bounds are accepted by the unchanged validator', () => {
  for (const time of ['2031-03-01T00:00:00Z','2031-03-01T00:00:02Z','2031-03-01T08:00:01+08:00']) {
    const f = fresh(); f.snapshot.capturedAt = time;
    assert.equal(check(f).inventoriesMatch, true);
  }
});
const cases = [
  ['wrong project', f => { f.snapshot.project = 'SYNTHETIC_OTHER'; }],
  ['wrong host', f => { f.snapshot.host = 'synthetic.invalid'; }],
  ['wrong port', f => { f.snapshot.port = 6432; }],
  ['wrong route', f => { f.snapshot.route = 'pooler'; }],
  ['wrong native bundle', f => { f.snapshot.runnerBundleSha256 = '0'.repeat(64); }],
  ['wrong SQL hash', f => { f.snapshot.sqlSha256 = '0'.repeat(64); }],
  ['wrong SQL size', f => { f.snapshot.sqlBytes++; }],
  ['wrong proof binding', f => { f.snapshot.controlPlaneEvidenceSha256 = '0'.repeat(64); }],
  ['capture before launch', f => { f.snapshot.capturedAt = '2031-02-28T23:59:59Z'; }],
  ['capture after completion', f => { f.snapshot.capturedAt = '2031-03-01T00:00:02.000000001Z'; }],
  ['capture missing offset', f => { f.snapshot.capturedAt = '2031-03-01T00:00:01'; }],
  ['TLS chain unverified', f => { f.snapshot.tls.chainVerified = false; }],
  ['TLS hostname unverified', f => { f.snapshot.tls.hostnameVerified = false; }],
  ['wrong CA fingerprint', f => { f.snapshot.tls.caSha256 = '0'.repeat(64); }],
  ['bad peer fingerprint', f => { f.snapshot.tls.peerCertificateFingerprint256 = 'SYNTHETIC_INVALID'; }],
  ['protocol disagreement', f => { f.snapshot.identity.tls_version = 'TLSv1.2'; }],
  ['wrong PostgreSQL version', f => { f.snapshot.identity.server_version_num = 160000; }],
  ['missing privilege', f => { f.snapshot.identity.public_create = false; }],
  ['read-write identity', f => { f.snapshot.identity.default_transaction_read_only = 'off'; }],
  ['string PID', f => { f.snapshot.identity.backend_pid = '12345'; }],
  ['nonzero competing activity', f => { f.snapshot.identity.active_budget_deletion_calls = 1; }],
  ['string activity count', f => { f.snapshot.identity.other_budget_install_sessions = '0'; }],
  ['wrong catalog', f => { f.snapshot.budget.compatibility_sha256 = '0'.repeat(64); }],
  ['changed function owner', f => { f.snapshot.budget.function.owner = 'SYNTHETIC_OTHER'; }, true],
  ['changed function grants', f => { f.snapshot.budget.function.acl = '{}'; }, true],
  ['changed function definition', f => { f.snapshot.budget.function.definition_md5 = '0'.repeat(32); }, true],
  ['containment guard bypass', f => { f.snapshot.budget.containment_guard = true; }],
  ['changed migration count', f => { f.snapshot.budget.migration_history.count++; }, true],
  ['changed migration history', f => { f.snapshot.budget.migration_history.complete_md5 = '0'.repeat(32); }, true],
  ['changed policy count', f => { f.snapshot.budget.storage_policy_count--; }, true],
  ['changed object count', f => { f.snapshot.budget.storage_objects++; }],
  ['changed business count', f => { f.snapshot.budget.organization_profiles++; }],
  ['missing inventory row', f => { f.snapshot.protectedData.preserved_data.pop(); }],
  ['duplicate inventory row', f => { f.snapshot.protectedData.preserved_data[1] = { ...f.snapshot.protectedData.preserved_data[0] }; }],
  ['negative inventory count', f => { f.snapshot.protectedData.preserved_data[0].row_count = -1; }],
  ['string inventory count', f => { f.snapshot.protectedData.preserved_data[0].row_count = '0'; }],
  ['wrong inventory digest', f => { f.snapshot.protectedData.sha256 = '0'.repeat(64); }],
  ['foundation state changed', f => { f.snapshot.foundation.value.internal_counts = { synthetic: 999 }; }, true],
  ['wrong trusted origin', f => { f.snapshot.foundation.value.trusted_origins = ['https://synthetic.invalid']; }],
  ['wrong foundation digest', f => { f.snapshot.foundation.sha256 = '0'.repeat(64); }],
  ['wrong state fingerprint', f => { f.snapshot.approvalFingerprint = '0'.repeat(64); }],
  ['result digest disagreement', f => { f.result.protectedInventoriesSha256 = '0'.repeat(64); }],
  ['result structure disagreement', f => { f.result.foundationStructureSha256 = '0'.repeat(64); }],
  ['result state disagreement', f => { f.result.preflightStateSha256 = '0'.repeat(64); }],
  ['result inventory count', f => { f.result.protectedInventoryCount = 56; }],
  ['result evidence traversal', f => { f.result.evidenceFile = '../SYNTHETIC.json'; }],
  ['result PASS alone', f => { f.result = { status: 'PASS' }; }],
  ['result stopped', f => { f.result.status = 'BLOCKED'; }],
  ['installation activated', f => { f.result.installationActivated = true; }],
  ['secret-like synthetic field', f => { f.snapshot.password = 'PRIVATE_SYNTHETIC_CANARY'; }],
];
for (const [name, alter, refresh] of cases) test('fixed validator rejects: ' + name, () => {
  const f = fresh(); alter(f);
  if (refresh) refreshSyntheticDigests(f);
  reject(f);
});
for (let index = 0; index < 57; index++) test('pinned inventory drift rejected after self-consistent rehash: row ' + index, () => {
  const f = fresh(); f.snapshot.protectedData.preserved_data[index].row_count++;
  refreshSyntheticDigests(f); reject(f);
});
for (let index = 0; index < 14; index++) test('foundation function owner drift: index ' + index, () => {
  const f = fresh(); f.snapshot.foundation.value.functions[index].owner = 'SYNTHETIC_OTHER';
  refreshSyntheticDigests(f); reject(f);
});
for (let index = 0; index < 4; index++) test('foundation table RLS drift: index ' + index, () => {
  const f = fresh(); f.snapshot.foundation.value.tables[index].rls = !f.snapshot.foundation.value.tables[index].rls;
  refreshSyntheticDigests(f); reject(f);
});
for (let index = 0; index < 8; index++) test('foundation trigger state drift: index ' + index, () => {
  const f = fresh(), t = f.snapshot.foundation.value.triggers[index];
  t.enabled = t.enabled === 'D' ? 'O' : 'D';
  refreshSyntheticDigests(f); reject(f);
});
for (const name of Object.keys(INPUTS)) test('reference pin cannot be substituted: ' + name, () => {
  const f = fresh(), bad = Buffer.from(f.references[name]); bad[0] ^= 1;
  f.references = { ...f.references, [name]: bad }; reject(f);
});
for (const [name, bytes] of [
  ['empty', Buffer.alloc(0)], ['invalid JSON', Buffer.from('{')],
  ['invalid UTF8', Buffer.from([255])], ['oversized', Buffer.alloc(1048577)],
]) test('malformed evidence rejected: ' + name, () => {
  const encoded = encodeSyntheticFixture(fresh()); encoded.evidenceBytes = bytes;
  let rejected = false;
  try { validateReviewedPreflightEvidence(encoded); } catch { rejected = true; }
  assert.equal(rejected, true);
});
