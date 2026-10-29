// Read-only, in-memory evidence verification. No files or credentials are opened.
// Reuse unchanged pure validators, not the executable native runner.
import { createHash } from 'node:crypto';
import {
  TARGET, SQL_SHA, SQL_BYTES, canonicalJson, hashJson, protectedDataDigest,
  expectedRelationsFromSql, verifyBudgetState, verifyNativeIdentity,
  stableFoundation, foundationStructure, verifyFoundationReceipt,
  preflightStateFingerprint, scrubReceiptValue,
} from '../native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs';
import { requireCondition as need, parseIsoNanoseconds } from './deadline-controls.mjs';
export const REVIEWED_BUNDLE = 'f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84';
export const TRUSTED_CA = '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
export const REFERENCE_PINS = Object.freeze({
  inventorySql: '459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34',
  baselineData: '2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc',
  baselineSnapshot: '6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81',
  foundationReceipt: 'a549cf9bb3e8cd3c95d07ff71bf2d7417e9509f2d1ddcbd3e2f8572cf5c63b37',
});
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const evidenceNameIsSafe = name => typeof name === 'string' &&
  /^preflight-\d{8}T\d{9}Z-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/.test(name);
function parsePrivateJson(bytes) {
  need(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 1048576, 'EVIDENCE_BYTES_INVALID');
  const text = bytes.toString('utf8');
  need(Buffer.from(text, 'utf8').equals(bytes) && !text.startsWith('\uFEFF'), 'EVIDENCE_ENCODING_INVALID');
  const value = JSON.parse(text);
  scrubReceiptValue(value);
  return value;
}
export function parseReviewedResult(stdout) {
  need(typeof stdout === 'string' && stdout.length <= 16384, 'CHILD_RESULT_INVALID');
  const value = JSON.parse(stdout.trim()); // Extra objects/log lines cannot pass JSON.parse.
  scrubReceiptValue(value);
  need(value?.status === 'PASS' && value.mode === 'READ_ONLY_PREFLIGHT' &&
    value.installationActivated === false, 'REVIEWED_PREFLIGHT_NOT_PASS');
  need(evidenceNameIsSafe(value.evidenceFile), 'EVIDENCE_NAME_INVALID');
  return value;
}
export function validateProofBytes(bytes, expectedHash) {
  need(typeof expectedHash === 'string' && /^[a-f0-9]{64}$/.test(expectedHash) &&
    Buffer.isBuffer(bytes) && bytes.length <= 4096 && sha256(bytes) === expectedHash, 'PROOF_IDENTITY_INVALID');
  const proof = parsePrivateJson(bytes);
  const raw = bytes.toString('utf8');
  need(raw === JSON.stringify(proof) || raw === JSON.stringify(proof) + '\n', 'PROOF_JSON_AMBIGUOUS');
  need(proof && canonicalJson(Object.keys(proof).sort()) ===
    canonicalJson(['project', 'host', 'status', 'verifiedVia', 'verifiedAt'].sort()), 'PROOF_SCHEMA_INVALID');
  need(proof.project === TARGET.project && proof.host === TARGET.host &&
    proof.status === 'ACTIVE_HEALTHY' && proof.verifiedVia === 'supabase-control-plane-get-project',
    'PROOF_PROJECT_INVALID');
  parseIsoNanoseconds(proof.verifiedAt);
  return proof;
}
export function validateReviewedPreflightEvidence({ result, evidenceBytes, proofHash, launchNs, completionNs, references }) {
  need(references && Object.keys(REFERENCE_PINS).every(name =>
    Buffer.isBuffer(references[name]) && sha256(references[name]) === REFERENCE_PINS[name]), 'REVIEWED_REFERENCE_PIN_MISMATCH');
  const relations = expectedRelationsFromSql(references.inventorySql);
  const baseline = parsePrivateJson(references.baselineData);
  const previous = parsePrivateJson(references.baselineSnapshot);
  const foundationReceipt = parsePrivateJson(references.foundationReceipt);
  const expectedFoundation = verifyFoundationReceipt(foundationReceipt);
  const snapshot = parsePrivateJson(evidenceBytes);
  need(snapshot.recordType === 'YTRACE_BUDGET_PAUSE_NATIVE_PREFLIGHT' &&
    snapshot.status === 'READ_ONLY_PREFLIGHT_PASS', 'SNAPSHOT_STATUS_INVALID');
  for (const [key, expected] of Object.entries({
    project: TARGET.project, host: TARGET.host, port: TARGET.port, database: TARGET.database,
    user: TARGET.user, route: TARGET.route, sqlSha256: SQL_SHA, sqlBytes: SQL_BYTES,
    runnerBundleSha256: REVIEWED_BUNDLE, controlPlaneEvidenceSha256: proofHash,
  })) need(snapshot[key] === expected, 'SNAPSHOT_SCOPE_MISMATCH');
  const captured = parseIsoNanoseconds(snapshot.capturedAt);
  need(captured >= launchNs && captured <= completionNs, 'SNAPSHOT_CAPTURE_TIME_MISMATCH');
  need(snapshot.tls?.chainVerified === true && snapshot.tls.hostnameVerified === true &&
    /^TLSv1\.[23]$/.test(snapshot.tls.protocol) && snapshot.tls.caSha256 === TRUSTED_CA &&
    /^(?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(snapshot.tls.peerCertificateFingerprint256), 'SNAPSHOT_TLS_INVALID');
  need(/^ytrace-budget-pause-r-[0-9a-f-]{36}$/.test(snapshot.identity?.application_name), 'SNAPSHOT_APPLICATION_INVALID');
  verifyNativeIdentity(snapshot.identity, { applicationName: snapshot.identity.application_name, readOnly: true });
  need(snapshot.identity.tls_version === snapshot.tls.protocol, 'TLS_PROTOCOL_EVIDENCE_MISMATCH');
  need(Number(snapshot.identity.active_budget_deletion_calls) === 0 &&
    Number(snapshot.identity.other_budget_install_sessions) === 0, 'SNAPSHOT_NOT_QUIESCENT');
  verifyBudgetState(snapshot.budget, 'pre');
  need(snapshot.budget.storage_objects === 378, 'STORAGE_OBJECT_COUNT_MISMATCH');
  const actualData = protectedDataDigest(snapshot.protectedData, relations);
  const expectedData = protectedDataDigest(baseline, relations);
  need(actualData.sha256 === expectedData.sha256 && canonicalJson(actualData.rows) ===
    canonicalJson(expectedData.rows) && snapshot.protectedData.sha256 === actualData.sha256,
    'PROTECTED_INVENTORY_DRIFT');
  const value = snapshot.foundation?.value;
  const stable = stableFoundation(value), structure = foundationStructure(value);
  need(canonicalJson(structure) === canonicalJson(expectedFoundation.structure) &&
    hashJson(structure) === expectedFoundation.sha256 &&
    snapshot.foundation.structureSha256 === expectedFoundation.sha256, 'FOUNDATION_STRUCTURE_DRIFT');
  need(canonicalJson(stable) === canonicalJson(stableFoundation(previous.foundation.value)) &&
    snapshot.foundation.sha256 === hashJson(stable), 'FOUNDATION_STATE_DRIFT');
  need(snapshot.budget.organization_profiles === previous.budget.organization_profiles &&
    canonicalJson(snapshot.budget.migration_history) === canonicalJson(previous.budget.migration_history),
    'BUSINESS_OR_MIGRATION_DRIFT');
  need(snapshot.approvalFingerprint === preflightStateFingerprint(snapshot), 'SNAPSHOT_FINGERPRINT_INVALID');
  const matches = {
    project: TARGET.project, host: TARGET.host, sqlSha256: SQL_SHA,
    runnerBundleSha256: REVIEWED_BUNDLE, protectedInventoryCount: 57,
    protectedInventoriesSha256: actualData.sha256, foundationStructureSha256: expectedFoundation.sha256,
    preflightStateSha256: snapshot.approvalFingerprint,
  };
  for (const [key, expected] of Object.entries(matches)) need(result[key] === expected, 'RESULT_EVIDENCE_MISMATCH');
  return Object.freeze({
    evidenceSha256: sha256(evidenceBytes), protectedInventoryCount: 57,
    inventoriesMatch: true, catalogAndFunctionMatch: true, foundationAndProtectionsMatch: true,
    migrationsMatch: true, storagePoliciesMatch: true, storageObjects: 378,
  });
}
