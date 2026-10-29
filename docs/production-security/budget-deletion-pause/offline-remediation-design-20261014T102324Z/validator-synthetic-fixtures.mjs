// NON-RUNNABLE — NOT AUTHORIZED. Pure synthetic evidence builder.
// Caller supplies four exact historical redacted reference buffers, never live I/O.
import { createHash } from 'node:crypto';
import {
  TARGET, SQL_SHA, SQL_BYTES, PRE_CATALOG_SHA, HISTORY, EXPECTED_FUNCTION,
  expectedRelationsFromSql, protectedDataDigest, hashJson, stableFoundation,
  foundationStructure, preflightStateFingerprint,
} from '../native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs';
import { REFERENCE_PINS, REVIEWED_BUNDLE, TRUSTED_CA } from '../outer-preflight-wrapper-candidate-20261014T054751Z/preflight-evidence.mjs';
import { parseIsoNanoseconds } from '../outer-preflight-wrapper-candidate-20261014T054751Z/deadline-controls.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const clone = v => JSON.parse(JSON.stringify(v));
export function makeSyntheticValidatorFixture(references) {
  for (const [name, pin] of Object.entries(REFERENCE_PINS)) {
    if (!Buffer.isBuffer(references?.[name]) || sha(references[name]) !== pin) {
      throw Error('OFFLINE_REFERENCE_PIN_MISMATCH');
    }
  }
  const previous = JSON.parse(references.baselineSnapshot);
  const baseline = JSON.parse(references.baselineData);
  const relations = expectedRelationsFromSql(references.inventorySql);
  const data = protectedDataDigest(baseline, relations);
  const capturedAt = '2031-03-01T00:00:01.000Z';
  const foundation = clone(previous.foundation.value);
  foundation.captured_at = capturedAt;
  const proofHash = sha(Buffer.from('SYNTHETIC_OPAQUE_PROOF_BINDING_ONLY'));
  const snapshot = {
    recordType: 'YTRACE_BUDGET_PAUSE_NATIVE_PREFLIGHT', status: 'READ_ONLY_PREFLIGHT_PASS',
    ...TARGET, sqlSha256: SQL_SHA, sqlBytes: SQL_BYTES, runnerBundleSha256: REVIEWED_BUNDLE,
    capturedAt, controlPlaneEvidenceSha256: proofHash,
    tls: { chainVerified: true, hostnameVerified: true, protocol: 'TLSv1.3', caSha256: TRUSTED_CA,
      peerCertificateFingerprint256: Array(32).fill('AA').join(':') },
    identity: {
      database: 'postgres', current_user: 'postgres', session_user: 'postgres',
      server_version_num: 170006, server_port: 5432, transaction_read_only: 'on',
      default_transaction_read_only: 'on', tls: true, tls_version: 'TLSv1.3',
      application_name: 'ytrace-budget-pause-r-11111111-2222-4333-8444-555555555555',
      backend_pid: 12345, backend_start: '2031-03-01T00:00:00Z',
      active_budget_deletion_calls: 0, other_budget_install_sessions: 0,
      database_connect: true, owns_target_function: true, public_usage: true, public_create: true,
      plpgsql_usage: true, text_type_usage: true, uuid_array_type_usage: true, jsonb_type_usage: true,
      all_eight_protected_relations_selectable: true, pg_read_all_stats: true,
    },
    budget: {
      phase: 'pre', database: 'postgres', current_user: 'postgres', session_user: 'postgres',
      read_only: 'on', captured_at: capturedAt, server_version: '17.6',
      project_binding: ['https://mqqaykksadotbrghbexz.supabase.co'],
      catalog_matches: true, function_matches: true, compatibility_sha256: PRE_CATALOG_SHA,
      function: clone(EXPECTED_FUNCTION), containment_guard: false, migration_history: clone(HISTORY),
      storage_policy_count: 15, storage_objects: 378,
      organization_profiles: previous.budget.organization_profiles,
    },
    protectedData: { read_only: 'on', preserved_data: clone(data.rows), sha256: data.sha256 },
    foundation: { value: foundation, sha256: hashJson(stableFoundation(foundation)),
      structureSha256: hashJson(foundationStructure(foundation)) },
  };
  const fixture = { references, snapshot, proofHash, result: {},
    launchNs: parseIsoNanoseconds('2031-03-01T00:00:00Z'),
    completionNs: parseIsoNanoseconds('2031-03-01T00:00:02Z') };
  refreshSyntheticDigests(fixture);
  return fixture;
}
export function refreshSyntheticDigests(f) {
  const data = protectedDataDigest(f.snapshot.protectedData, expectedRelationsFromSql(f.references.inventorySql));
  f.snapshot.protectedData.sha256 = data.sha256;
  f.snapshot.foundation.sha256 = hashJson(stableFoundation(f.snapshot.foundation.value));
  f.snapshot.foundation.structureSha256 = hashJson(foundationStructure(f.snapshot.foundation.value));
  f.snapshot.approvalFingerprint = preflightStateFingerprint(f.snapshot);
  f.result = {
    status: 'PASS', mode: 'READ_ONLY_PREFLIGHT', installationActivated: false,
    project: TARGET.project, host: TARGET.host, sqlSha256: SQL_SHA, runnerBundleSha256: REVIEWED_BUNDLE,
    protectedInventoryCount: 57, protectedInventoriesSha256: data.sha256,
    foundationStructureSha256: f.snapshot.foundation.structureSha256,
    preflightStateSha256: f.snapshot.approvalFingerprint,
    evidenceFile: 'preflight-20310301T000001000Z-11111111-2222-4333-8444-555555555555.json',
  };
}
export function encodeSyntheticFixture(f) {
  return { result: f.result, references: f.references, proofHash: f.proofHash,
    launchNs: f.launchNs, completionNs: f.completionNs,
    evidenceBytes: Buffer.from(JSON.stringify(f.snapshot), 'utf8') };
}
