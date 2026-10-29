# Renewal recovery continuation — stopped before writes

11 October 2026, Asia/Manila. Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Target exclusively `zroudsvpswqsjlyttkjf`. Production was not accessed.

## Outcome

**BLOCKED: the lifecycle continuation did not execute.** The attempted execution stopped in its read-only Auth identity preflight, before login, upload, file replacement, resubmission or approval. The preflight incorrectly expected linked `identities` in the Auth Admin `listUsers` summary response. This was a runner defect, not an observed identity mismatch.

An independent read-only `getUserById` request verified the exact recorded user ID, email, trusted staging marker, confirmed email and one email-provider identity. The local preflight was corrected to use this authoritative detail endpoint. A subsequent explicitly read-only preflight passed every configured check. No mutation execution was retried, honoring the instruction to stop on a new unexpected error.

The historical HTTP 400 from the previous run and this failed guard remain preserved in separate evidence files. Neither failure has been hidden or reclassified as a passed execution.

## Local changes and tests

- Removed the redundant aggregate revision RPC from `controlled-renewal-lifecycle.mjs`. After normal file review, it now verifies the already-performed renewal transition instead of requesting it twice.
- Added pure `planRecovery`: exact recorded organization/renewal/submission/current term, cycle 2, `needs_revision`, six original metadata records, exactly one flagged file and five preserved records. An unexpected state, multiple renewals, metadata mismatch or already-attempted recovery refuses mutation.
- Added explicit `resume-renewal-needs-revision.mjs`: starts from that plan; contains no identity creation, draft creation, scenario simulation or original submission RPC. Exactly one correction upload is present. Successful transfer is journaled before replacement. Earlier reports cannot be overwritten; an existing execution report prevents automatic replay.
- Added `--preflight-only`, which does not authenticate or mutate Supabase, to validate the corrected checks after the stop.
- Corrected linked-identity verification to call official Admin `getUserById` after checking the inventory; no guard was removed or broadened.

| Local validation | Status | Evidence |
|---|---|---|
| Existing needs_revision and one-file recovery plan | PASS | Focused Node test. |
| No duplicate transition/new renewal | PASS | Plan flags plus source checks. |
| Exactly one flag; zero/multiple flags rejected | PASS | Focused Node test. |
| Five originals preserved; mismatched metadata rejected | PASS | Plan validation test. |
| Unexpected state/ownership/duplicate parent rejected | PASS | Focused Node test. |
| Attempted recovery cannot replay | PASS | Focused Node test. |
| No provisioning/draft/date/original-submission calls | PASS | Recovery source regression test; one upload call only. |
| Identity detail endpoint used | PASS | Regression test against omitted summary identities. |
| Focused suite total | PASS | **9 passed, 0 failed**. These are local checks, not live lifecycle certification. |
| Runner syntax | PASS | `node --check`. |
| Whitespace | PASS | `git -c core.fsmonitor=false diff --check`; existing line-ending warnings. |
| TypeScript/build/full Vitest | NOT TESTED | No frontend changes; not rerun in this recovery pass. |

## Fresh real staging read-only checks

| Check | Status | Actual evidence |
|---|---|---|
| Control plane identity | PASS | Exact ref/name, ACTIVE_HEALTHY, exact staging database host. |
| Inventory | PASS | 5 Auth users/identities, 4 organizations, 2 Admins, 2 terms, 1 renewal, 10 buckets, 28 objects, zero active custom Admin sessions. |
| Concurrency | PASS | Nine inspectable Node processes; none classified as a competing fixture operation. Existing fixture-operation lock acquired and released by each read-only run; absent after completion. |
| Installed scenario | PASS | Private schema present, prepared fixture, transaction mutation permit cleared. No SQL was installed or modified. |
| Storage policies | PASS | Exact definitions equal preserved nine-policy catalog manifest. No policy writes. |
| Journal and original actors | PASS | Exact original identity/marker records and A/B/suspended profile identity/name/status values match. |
| Dedicated Auth detail | PASS | Official detail GET 200: exact recorded ID/email/app marker, confirmed email, single email-provider identity. |
| Existing Admin accounts | PASS | Active activated Super Admin and genuine zero-permission reviewer role verified read-only. |
| Registration and initial term | PASS | Original approved registration, exact authoritative current term, term 1 active and preserved simulated expiry. |
| Renewal/document state | PASS | Exactly one saved cycle 2 renewal/submission in needs_revision, six saved document references, one flagged file, five under review. |
| Audit evidence | PASS | Existing fixture binding, date simulation and renewal submission actions present. |
| Existing dedicated Storage objects | PASS | All 12 recorded registration/renewal objects found at expected paths/sizes through official metadata listing. No binaries downloaded during preflight. |

One initial read-only SQL inventory query referenced `permit_pid` rather than the actual `mutation_pid` column and returned SQLSTATE 42703. It was corrected using the reviewed schema and passed. This was a query typo, not catalog drift; it performed no writes.

The corrected comprehensive API preflight made only GET requests. Actual sanitized HTTP requests are recorded in `recovery-readonly-preflight.json`. No password, token, API key or signed URL was logged.

## Actual lifecycle and Storage coverage this continuation

| Requested operation | Status | Reason |
|---|---|---|
| Corrected owner upload | BLOCKED | Stopped before Auth login or upload. |
| Revision RPC/original and corrected hash verification | BLOCKED | No corrected object exists. |
| Resubmission/review/approval | BLOCKED | No continuation writes executed. |
| Accreditation transition | BLOCKED | Initial term remains active; no new term created. |
| Owner download/signing | BLOCKED | No authenticated test group executed. |
| Cross-organization/anonymous denial | BLOCKED | No renewal Storage assertion executed in this pass. |
| Authorized/zero-permission/revoked/expired Admin signing | BLOCKED | No new Admin session created. |
| Forged parent/path denial | BLOCKED | Not executed. |
| Terminal overwrite/deletion/replacement restrictions | BLOCKED | Renewal remains needs_revision. |
| Downloaded SHA-256 | BLOCKED | Recorded upload hashes are not downloaded-content evidence. |
| Authenticated browser/PWA/mobile/interrupted upload | BLOCKED | Execution stopped before workflow testing. No browser/device PASS claimed. |

## Preserved state and readiness

The existing renewal remains **needs_revision**, with exactly one flagged original document and five unchanged pending documents. No identity, organization, registration, renewal, term, object, date simulation, role, permission, session or policy changed during this continuation. No deployment, Git push, cleanup or production request occurred.

**Capstone renewal UAT: BLOCKED.** Corrected upload, approval and browser participant tasks are still unverified.

**Production Storage rollout: BLOCKED.** Renewal-specific authorization, downloaded hashes, terminal lifecycle and browser/PWA evidence remain incomplete. Prior unrelated Storage/gateway PASS results do not substitute for this coverage.

The corrected read-only preconditions now pass. Under the explicit stop-on-error instruction, no further mutation attempt is authorized automatically by this report. A future authorized continuation must preserve the failed report, use a separately named one-run evidence artifact, repeat only immediate checks and start with the same single flagged document. It must not provision, reinstall SQL, simulate dates or recreate the renewal.

## Evidence

- `recovery-http-evidence.json`: failed initial identity guard; one successful inventory HTTP GET; no writes.
- `recovery-readonly-preflight.json`: corrected comprehensive read-only preflight PASS and actual HTTP evidence.
- `execution-http-evidence.json`: prior partial lifecycle and HTTP 400, unchanged.
- `resumed-execution-report.md`: prior run, unchanged.
- New local guard/tests/recovery script plus the narrow original-runner correction; all existing dirty work preserved.
