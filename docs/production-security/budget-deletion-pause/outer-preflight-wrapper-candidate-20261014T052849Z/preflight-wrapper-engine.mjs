// OFFLINE CANDIDATE ONLY: exports controls; has no CLI or live I/O implementation.
// No credentials/environment, protected paths, process spawning, SQL, or cleanup.
import { performance } from 'node:perf_hooks';
import { WrapperFailure, requireCondition as need, temporalGate, completionGate } from './deadline-controls.mjs';
import {
  validateProofBytes, parseReviewedResult, sha256,
} from './preflight-evidence.mjs';
export const PINNED_PREFLIGHT_REQUEST = Object.freeze({
  project: 'mqqaykksadotbrghbexz',
  host: 'db.mqqaykksadotbrghbexz.supabase.co', port: 5432, database: 'postgres', user: 'postgres',
  route: 'native-pg-direct-tls', mode: '--preflight',
  candidateBundleSha256: 'f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84',
});
// The caller is a trusted, separately reviewed integration, NOT a CLI input.
// Only an offline fake transport is provided in this package. Evidence reads and
// Verify-only ACL checks must later be bound to the fixed protected root. This
// object is one use, including a blocked prelaunch call. No durable marker is made.
export function createPreflightWrapperEngine({
  launch, readEvidence, verifyEvidenceAcl,
  now = () => Date.now(), monotonicNow = () => performance.now(),
  evidenceValidator,
}) {
  need([launch, readEvidence, verifyEvidenceAcl, now, monotonicNow, evidenceValidator]
    .every(fn => typeof fn === 'function'), 'TRUSTED_CAPABILITY_MISSING');
  let consumed = false;
  return Object.freeze({
    async run(input) {
      if (consumed) return Object.freeze({
        status: 'BLOCKED', code: 'WRAPPER_ALREADY_CONSUMED', exitCode: 2,
        launchCount: 0, automaticRetries: 0, evidenceRetained: true, installationActivated: false,
      });
      consumed = true;
      let launchCount = 0, evidenceFile = null, evidenceBytes, secondBytes, proofBytes;
      try {
        need(input && Buffer.isBuffer(input.proofBytes), 'PROOF_BYTES_REQUIRED');
        proofBytes = Buffer.from(input.proofBytes); // Never alter caller-owned evidence.
        const proofHash = input.expectedProofSha256;
        const proof = validateProofBytes(proofBytes, proofHash);
        const times = Object.freeze({
          proofTimestamp: proof.verifiedAt,
          validityStartUtc: input.validityStartUtc, validityEndUtc: input.validityEndUtc,
        });
        const references = input.references && Object.fromEntries(Object.entries(input.references)
          .map(([name, bytes]) => [name, Buffer.isBuffer(bytes) ? Buffer.from(bytes) : bytes]));
        // Gate immediately before the one possible launch.
        const atLaunch = temporalGate(times, now());
        const monoStart = monotonicNow();
        need(Number.isFinite(monoStart) && monoStart >= 0, 'MONOTONIC_CLOCK_INVALID');
        launchCount = 1;
        const child = await launch(PINNED_PREFLIGHT_REQUEST); // Sole launch site; no fallback.
        // Check times BEFORE trusting a zero exit or reading additional evidence.
        let atCompletion = completionGate(times, now(), atLaunch, monoStart, monotonicNow());
        need(child && child.exitCode === 0 && child.signal === null, 'CHILD_NOT_SUCCESSFUL');
        const result = parseReviewedResult(child.stdout);
        evidenceFile = result.evidenceFile;
        const aclBefore = await verifyEvidenceAcl(evidenceFile);
        need(aclBefore?.status === 'PASS' && aclBefore.rootVerified === true &&
          aclBefore.fileVerified === true && aclBefore.noRedirect === true, 'EVIDENCE_ACL_UNVERIFIED');
        evidenceBytes = Buffer.from(await readEvidence(evidenceFile));
        need(evidenceBytes.length > 0 && evidenceBytes.length <= 1048576, 'EVIDENCE_SIZE_INVALID');
        secondBytes = Buffer.from(await readEvidence(evidenceFile));
        need(evidenceBytes.equals(secondBytes), 'EVIDENCE_CHANGED_BETWEEN_READS');
        const aclAfter = await verifyEvidenceAcl(evidenceFile);
        need(aclAfter?.status === 'PASS' && aclAfter.rootVerified === true &&
          aclAfter.fileVerified === true && aclAfter.noRedirect === true, 'EVIDENCE_ACL_UNVERIFIED');
        atCompletion = completionGate(times, now(), atLaunch, monoStart, monotonicNow());
        const verified = await evidenceValidator({
          result, evidenceBytes, proofHash, launchNs: atLaunch.now,
          completionNs: atCompletion.now, references,
        });
        need(verified?.evidenceSha256 === sha256(evidenceBytes) &&
          verified.protectedInventoryCount === 57 && verified.storageObjects === 378 &&
          ['inventoriesMatch', 'catalogAndFunctionMatch', 'foundationAndProtectionsMatch',
            'migrationsMatch', 'storagePoliciesMatch'].every(key => verified[key] === true),
          'INDEPENDENT_EVIDENCE_INCOMPLETE');
        // Validation and reads are included in the completion deadline.
        completionGate(times, now(), atLaunch, monoStart, monotonicNow());
        return Object.freeze({
          status: 'PASS', mode: 'READ_ONLY_PREFLIGHT_WRAPPER', exitCode: 0,
          launchCount, automaticRetries: 0, evidenceRetained: true,
          evidenceFile, evidenceSha256: verified.evidenceSha256,
          freshnessAndValidityVerified: true, independentPreservationVerified: true,
          installationActivated: false,
        });
      } catch (error) {
        // Do not copy arbitrary child stdout/stderr, exception text or input values.
        return Object.freeze({
          status: 'BLOCKED', code: error instanceof WrapperFailure ? error.code : 'READONLY_WRAPPER_FAILED',
          exitCode: 2, launchCount, automaticRetries: 0, evidenceRetained: true,
          evidenceFile, stopForHumanReview: true, installationActivated: false,
        });
      } finally {
        proofBytes?.fill(0); evidenceBytes?.fill(0); secondBytes?.fill(0);
        // Memory copies only. Never remove, rewrite or restore a file.
      }
    },
  });
}
