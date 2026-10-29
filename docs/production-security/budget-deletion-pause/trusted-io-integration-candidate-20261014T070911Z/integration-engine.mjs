// NON-RUNNABLE / NOT AUTHORIZED. Protocol model only; no real I/O providers.
// No filesystem, environment, process, network, SQL, or cleanup capability here.
import { performance } from 'node:perf_hooks';
import {
  WrapperFailure, requireCondition as need, parseIsoNanoseconds,
  wallClockNanoseconds, PROOF_MAX_AGE_NS,
} from '../outer-preflight-wrapper-candidate-20261014T054751Z/deadline-controls.mjs';
import {
  sha256, validateProofBytes, evidenceNameIsSafe,
} from '../outer-preflight-wrapper-candidate-20261014T054751Z/preflight-evidence.mjs';

export const TARGET = Object.freeze({
  project: 'mqqaykksadotbrghbexz', host: 'db.mqqaykksadotbrghbexz.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres', route: 'native-pg-direct-tls',
});
export const ARTIFACT_PINS = Object.freeze({
  wrapperBundle: 'af8a4299c476969df5259889f69041ac855df528644fb54c0a37e15b72caceca',
  wrapperManifest: 'b36df23ff72ce16b49bb13157a2500365ac8fe0ba2d7030f7377ae1365b10f43',
  wrapperInventory: '268ad781656ac38dc93f31b4758aeaa3b4b2999d703572b9ce06a436eb5416e3',
  nativeBundle: 'f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84',
  nativeManifest: '3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2',
  sqlSha256: 'a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a',
  sqlBytes: 11945,
  verifierSha256: '459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34',
});
export const NATIVE_LAUNCH = Object.freeze({
  executableRelative: '.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe',
  cwd: 'C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused',
  args: Object.freeze([
    '--env-file=.env.foundation.local',
    'docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs',
    '--preflight',
  ]),
  ...TARGET, mode: '--preflight', nodeVersion: 'v24.21.0',
});
export const PORT_NAMES = Object.freeze([
  'verifyArtifacts', 'verifyLocalSecurity', 'inspectProof', 'getProject',
  'archiveProof', 'createProof', 'readNewProof',
  'launchNative', 'readEvidence', 'verifyEvidenceAcl',
]);
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const keys = (value, wanted) => value && typeof value === 'object' &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...wanted].sort());
function metadataMatches(actual, expected) {
  return keys(actual, ['createdAt', 'writtenAt', 'owner', 'aclSha256']) &&
    ['createdAt', 'writtenAt', 'owner', 'aclSha256'].every(k => actual[k] === expected[k]);
}
function checkExpectedStale(value) {
  need(keys(value, ['sha256', 'bytes', 'metadata']) && hex(value.sha256) &&
    Number.isSafeInteger(value.bytes) && value.bytes > 0 && value.bytes <= 4096, 'STALE_BINDING_INVALID');
  need(keys(value.metadata, ['createdAt', 'writtenAt', 'owner', 'aclSha256']) &&
    typeof value.metadata.owner === 'string' && value.metadata.owner.length > 0 &&
    hex(value.metadata.aclSha256), 'STALE_METADATA_BINDING_INVALID');
  parseIsoNanoseconds(value.metadata.createdAt);
  parseIsoNanoseconds(value.metadata.writtenAt);
}
function validateInspection(receipt, expected, wallNs) {
  need(receipt && Buffer.isBuffer(receipt.bytes) && receipt.bytes.length === expected.bytes &&
    metadataMatches(receipt.metadata, expected.metadata) && receipt.rootVerified === true &&
    receipt.artifactVerified === true && receipt.noRedirect === true &&
    receipt.forbiddenStateAbsent === true && receipt.destinationAbsent === true, 'STALE_PROOF_OR_STATE_MISMATCH');
  const old = validateProofBytes(receipt.bytes, expected.sha256);
  const age = wallNs - parseIsoNanoseconds(old.verifiedAt);
  need(age > PROOF_MAX_AGE_NS, 'EXPECTED_PROOF_NOT_STALE');
}
function validateNativePrerequisites(value) {
  need(value && value.project === TARGET.project && value.host === TARGET.host &&
    value.port === 5432 && value.nodeVersion === 'v24.21.0' &&
    value.nativeForceUnset === true && value.environmentLoaderApproved === true &&
    value.credentialAvailablePrivately === true && value.rootVerified === true &&
    value.noRedirect === true && value.forbiddenStateAbsent === true &&
    value.rejectUnauthorized === true && value.hostnameAndSniRequired === true &&
    value.noPoolerOrFallback === true &&
    value.caSha256 === '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7' &&
    value.configuredCaMatches === true && value.caFileMatches === true &&
    value.caProvenanceAndValidityVerified === true, 'TRUSTED_LOCAL_PREREQUISITE_FAILED');
}

// INTERNAL MODEL/TEST SEAM. Public facade fixes makePreflight to the reviewed
// wrapper. A live provider implementation is intentionally absent and BLOCKED.
export function createIntegrationEngine({
  ports, makePreflight, now = () => Date.now(), monotonicNow = () => performance.now(),
}) {
  need(keys(ports, PORT_NAMES) && PORT_NAMES.every(n => typeof ports[n] === 'function') &&
    typeof makePreflight === 'function' && typeof now === 'function' &&
    typeof monotonicNow === 'function', 'TRUSTED_PROVIDER_SET_INVALID');
  const io = Object.freeze(Object.fromEntries(PORT_NAMES.map(n => [n, ports[n]])));
  let consumed = false;
  return Object.freeze({
    async run(input) {
      if (consumed) return Object.freeze({
        status: 'BLOCKED', reason: 'INTEGRATION_ALREADY_CONSUMED', launches: 0,
        automaticRetries: 0, retainAllEvidence: true, installationActivated: false,
      });
      consumed = true;
      const calls = Object.fromEntries(PORT_NAMES.map(n => [n, 0]));
      let stage = 'validate-context', archiveConfirmed = false, newProofConfirmed = false;
      let proofStamp = null, freshBytes, expectedNewHash = null, seenEvidenceHash = null;
      let start, end, approvedAt, baseWall, baseMono, lastWall, lastMono;
      try {
        need(keys(input, ['approval', 'expectedStale', 'references']), 'CONTEXT_SCOPE_INVALID');
        const a = input.approval;
        need(keys(a, ['reference', 'approver', 'approvedAt', 'validityStartUtc', 'validityEndUtc']) &&
          typeof a.reference === 'string' && a.reference.length >= 8 &&
          typeof a.approver === 'string' && a.approver.length > 0, 'FRESH_HUMAN_CONTEXT_REQUIRED');
        need(!['YTRACE-BDP-READONLY-20261014-01', 'YTRACE-BDP-DECISION-A-20261014-01'].includes(a.reference),
          'HISTORICAL_AUTHORIZATION_FORBIDDEN');
        const approval = Object.freeze({ ...a });
        start = parseIsoNanoseconds(approval.validityStartUtc, { utcOnly: true });
        end = parseIsoNanoseconds(approval.validityEndUtc, { utcOnly: true });
        approvedAt = parseIsoNanoseconds(approval.approvedAt);
        need(start < end, 'VALIDITY_INTERVAL_NOT_ORDERED');
        checkExpectedStale(input.expectedStale);
        const expected = Object.freeze({
          sha256: input.expectedStale.sha256, bytes: input.expectedStale.bytes,
          metadata: Object.freeze({ ...input.expectedStale.metadata }),
        });
        const archiveLeaf = 'control-plane-proof-history-' + expected.sha256 + '.json';
        const proofRequest = Object.freeze({ activeLeaf: 'control-plane-proof.json', archiveLeaf,
          expectedSha256: expected.sha256, expectedBytes: expected.bytes });
        baseWall = wallClockNanoseconds(now()); baseMono = monotonicNow();
        need(Number.isFinite(baseMono) && baseMono >= 0, 'MONOTONIC_CLOCK_INVALID');
        lastWall = baseWall; lastMono = baseMono;
        const checkpoint = () => {
          const wall = wallClockNanoseconds(now()), mono = monotonicNow();
          need(Number.isFinite(mono) && mono >= lastMono, 'MONOTONIC_CLOCK_REGRESSED');
          need(wall >= lastWall, 'WALL_CLOCK_REGRESSED');
          need(wall >= start && wall <= end && approvedAt <= wall, 'OUTSIDE_APPROVED_VALIDITY');
          const elapsed = Math.ceil((mono - baseMono) * 1000000);
          need(Number.isSafeInteger(elapsed) && elapsed >= 0, 'MONOTONIC_DURATION_INVALID');
          let deadline = end;
          if (proofStamp !== null) {
            const proofNs = parseIsoNanoseconds(proofStamp);
            need(wall >= proofNs && wall - proofNs <= PROOF_MAX_AGE_NS, 'PROOF_EXPIRED_OR_FUTURE');
            if (proofNs + PROOF_MAX_AGE_NS < deadline) deadline = proofNs + PROOF_MAX_AGE_NS;
          }
          need(baseWall + BigInt(elapsed) <= deadline, 'DEADLINE_CROSSED');
          lastWall = wall; lastMono = mono;
          return wall;
        };
        const step = async (name, request) => {
          stage = name; checkpoint();
          calls[name]++;
          need(calls[name] <= (name === 'inspectProof' || name === 'readEvidence' ||
            name === 'verifyEvidenceAcl' ? 2 : 1), 'PORT_CALL_BOUNDARY_EXCEEDED');
          const value = await io[name](request);
          checkpoint(); // Every asynchronous boundary, including child exit.
          return value;
        };
        checkpoint();
        const artifacts = await step('verifyArtifacts', ARTIFACT_PINS);
        need(keys(artifacts, Object.keys(ARTIFACT_PINS)) &&
          Object.entries(ARTIFACT_PINS).every(([k, v]) => artifacts[k] === v), 'ARTIFACT_DRIFT');
        validateNativePrerequisites(await step('verifyLocalSecurity', TARGET));
        validateInspection(await step('inspectProof', proofRequest), expected, checkpoint());

        const observationStart = checkpoint();
        const observation = await step('getProject', Object.freeze({ id: TARGET.project, method: 'get_project' }));
        need(keys(observation, ['project', 'host', 'status', 'verifiedVia', 'verifiedAt']) &&
          observation.project === TARGET.project && observation.host === TARGET.host &&
          observation.status === 'ACTIVE_HEALTHY' &&
          observation.verifiedVia === 'supabase-control-plane-get-project', 'SCOPED_OBSERVATION_INVALID');
        const observationNs = parseIsoNanoseconds(observation.verifiedAt);
        need(observationNs >= observationStart && observationNs <= checkpoint(), 'OBSERVATION_TIMESTAMP_UNTRUSTED');
        proofStamp = observation.verifiedAt; // Keep this exact string through creation and completion.
        checkpoint();
        freshBytes = Buffer.from(JSON.stringify({
          project: observation.project, host: observation.host, status: observation.status,
          verifiedVia: observation.verifiedVia, verifiedAt: proofStamp,
        }) + '\n', 'utf8');
        expectedNewHash = sha256(freshBytes);
        need(expectedNewHash !== expected.sha256, 'STALE_PROOF_REUSE_FORBIDDEN');

        validateInspection(await step('inspectProof', proofRequest), expected, checkpoint());
        const archive = await step('archiveProof', proofRequest);
        need(archive && archive.sameDirectory === true && archive.noOverwrite === true &&
          archive.sourceAbsent === true && archive.archiveLeaf === archiveLeaf &&
          archive.sha256 === expected.sha256 && archive.bytes === expected.bytes &&
          metadataMatches(archive.metadata, expected.metadata) && archive.rootVerified === true &&
          archive.artifactVerified === true && archive.noRedirect === true &&
          archive.noTimestampReset === true, 'ARCHIVE_VERIFICATION_FAILED');
        archiveConfirmed = true;

        const created = await step('createProof', Object.freeze({
          activeLeaf: 'control-plane-proof.json', bytes: Buffer.from(freshBytes),
          sha256: expectedNewHash, createMode: 'wx', encoding: 'utf8-no-bom', requireSync: true,
        }));
        need(created && created.exclusive === true && created.synced === true &&
          created.sha256 === expectedNewHash && created.bytes === freshBytes.length &&
          created.rootVerified === true && created.artifactVerified === true &&
          created.noRedirect === true, 'NEW_PROOF_CREATION_UNVERIFIED');
        const reread = await step('readNewProof', Object.freeze({ activeLeaf: 'control-plane-proof.json' }));
        need(reread && Buffer.isBuffer(reread.bytes) && reread.bytes.equals(freshBytes) &&
          reread.rootVerified === true && reread.artifactVerified === true &&
          reread.noRedirect === true, 'NEW_PROOF_REREAD_MISMATCH');
        validateProofBytes(reread.bytes, expectedNewHash);
        newProofConfirmed = true;

        const wrapper = makePreflight({
          now, monotonicNow,
          launch: async request => {
            need(request?.mode === '--preflight' && request.project === TARGET.project &&
              request.host === TARGET.host && request.route === TARGET.route &&
              request.candidateBundleSha256 === ARTIFACT_PINS.nativeBundle, 'WRAPPER_LAUNCH_SCOPE_CHANGED');
            return await step('launchNative', NATIVE_LAUNCH);
          },
          readEvidence: async name => {
            need(evidenceNameIsSafe(name), 'EVIDENCE_NAME_INVALID');
            const bytes = await step('readEvidence', name);
            need(Buffer.isBuffer(bytes), 'EVIDENCE_NOT_RAW_BYTES');
            const hash = sha256(bytes);
            need(seenEvidenceHash === null || hash === seenEvidenceHash, 'EVIDENCE_CHANGED_BETWEEN_READS');
            seenEvidenceHash = hash;
            return Buffer.from(bytes);
          },
          verifyEvidenceAcl: async name => {
            need(evidenceNameIsSafe(name), 'EVIDENCE_NAME_INVALID');
            return await step('verifyEvidenceAcl', name);
          },
        });
        stage = 'reviewed-wrapper'; checkpoint();
        const outcome = await wrapper.run({
          proofBytes: Buffer.from(freshBytes), expectedProofSha256: expectedNewHash,
          validityStartUtc: approval.validityStartUtc, validityEndUtc: approval.validityEndUtc,
          references: input.references,
        });
        checkpoint();
        need(outcome && outcome.status === 'PASS' && outcome.mode === 'READ_ONLY_PREFLIGHT_WRAPPER' &&
          outcome.exitCode === 0 && outcome.launchCount === 1 && outcome.automaticRetries === 0 &&
          outcome.evidenceRetained === true && outcome.installationActivated === false &&
          outcome.freshnessAndValidityVerified === true && outcome.independentPreservationVerified === true &&
          evidenceNameIsSafe(outcome.evidenceFile) && hex(outcome.evidenceSha256) &&
          outcome.evidenceSha256 === seenEvidenceHash &&
          calls.launchNative === 1 && calls.readEvidence === 2 && calls.verifyEvidenceAcl === 2,
          'REVIEWED_RESULT_OR_EVIDENCE_INCOMPLETE');
        checkpoint(); // Immediately before returning success, never just exit zero.
        return Object.freeze({
          status: 'PASS', mode: 'OFFLINE_REVIEWED_IO_PROTOCOL', launches: calls.launchNative,
          calls: Object.freeze({ ...calls }), newProofSha256: expectedNewHash,
          evidenceSha256: seenEvidenceHash, automaticRetries: 0, retainAllEvidence: true,
          installationActivated: false,
        });
      } catch (error) {
        return Object.freeze({
          status: 'BLOCKED', stage,
          reason: error instanceof WrapperFailure ? error.code : 'TRUSTED_IO_FAILED',
          calls: Object.freeze({ ...calls }), launches: calls.launchNative,
          archiveAttempted: calls.archiveProof > 0, archiveConfirmed,
          newProofAttempted: calls.createProof > 0, newProofConfirmed,
          automaticRetries: 0, retainAllEvidence: true, uncertainOutcomeMustNotRetry: true,
          installationActivated: false,
        });
      } finally {
        freshBytes?.fill(0); // Only an owned memory copy; never a file operation.
      }
    },
  });
}
