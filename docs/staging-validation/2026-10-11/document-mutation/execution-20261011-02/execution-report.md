# Controlled staging document security patch — execution report

Date: 11 October 2026 (Asia/Manila). Project: **zroudsvpswqsjlyttkjf / ytrace-staging**.
HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty working tree and historical reports preserved.
Production was not accessed or modified. No Git push, application deployment, fixture creation, accreditation simulation, Storage policy change or unrelated migration occurred.

## Installation and lock

**PASS — committed once.** Supabase apply_migration returned success. Independent catalog, repaired data, audit and migration-history reads confirm the committed outcome. No retry was made.

- Recorded migration: `20261010192717_document_mutation_lifecycle_guard_staging_reconciliation`.
- Reviewed patch source SHA-256: `b19e93c19454a9012e85eb9dce81ba152b4f93d0eaa0fa475f78ab8d30a4d7a0`.
- Reviewed reconciliation source SHA-256: `4fc55025d07210611056c39527a6a71860edac71be35c8e2c895b0c084f57d03`.
- Exact combined transaction SHA-256: `3ff3e637c9883da22b288bb1dc424e4792aa36f31717c24c5f5e47adcf8a012c`.
- Reconciliation was inserted before CREATE SCHEMA in the reviewed BEGIN/COMMIT transaction; never committed independently.

**PASS — interactive lock stability.** A local interactive terminal test verified exclusive ownership and cleanup. The actual PTY lock holder (PID 54448) was verified alive from the same elevated host context before SQL and after all verification. Targeted process inspection identified only this operation, with zero unclassified Node command lines. It held the lock throughout installation and verification, then accepted RELEASE and removed only its own verified PID/project/phase-matched lock. Lock absence was confirmed. An initial sandbox-context process inspection could not see the elevated process; same-host inspection and the live PTY confirmed it was alive, rather than removing or replacing its lock.

Fresh read-only preflight matched reviewed function definitions/ACLs, columns, table grants/RLS, table policies, triggers and all nine Storage policies. Type comparison used original PostgreSQL typname and all four original tables after identifying representation differences in the first inspection query; there was no actual catalog drift. The transaction additionally enforced its original-function and exact-row gates. SDK forensic reads confirmed the recorded Auth identity and trusted marker, existing actors and both physical PDFs.

See `catalog-preflight.json`, `preflight.json`, `combined-reviewed.sql`, `installation-result.json` and `post-install-control-plane.json`.

## Exact one-row reconciliation

Target: `bf21c513-6466-44ac-9487-c791544ee4ad`.
Renewal: `be35b31c-2bbe-42ab-a4aa-52e9c7123b65`, cycle 2.

| Property | Before | After | Status |
|---|---|---|---|
| Document reference | Original 673-byte PDF | Previously approved corrected 674-byte PDF | PASS |
| Review state | submitted, review fields cleared by prior vulnerability | approved_green, historical approved review metadata restored | PASS |
| Revision history | Two entries | Same two entries, unchanged | PASS |
| Five other files | approved_green | Entire five rows unchanged | PASS |
| Parent and renewal | approved_green / approved | Entire rows unchanged | PASS |
| Dedicated accreditation terms | Superseded term 1 and active term 2 | Entire rows unchanged | PASS |
| Reconciliation audit | None | Exactly one new reconciled_synthetic_approved_document audit | PASS |
| Physical objects | 29 | 29 | PASS |
| Storage policies / table grants | Reviewed definitions | Unchanged | PASS |

The corrected uploaded_at is reconstructed from authoritative Storage created_at, as explicitly reviewed and recorded by the audit; the vulnerable operation had not retained the former uploaded_at. It is not claimed to be a recovered exact historical field. The audit preserves before/after evidence and the complete revision history remains intact.

Both actual PDF byte hashes were verified before installation through privileged read-only downloads and again after installation through the genuine owner JWT:

| PDF | Bytes | SHA-256 | Status |
|---|---:|---|---|
| Original | 673 | 6e71339ae9f1ed382362a22da0ad7ae6f272a39e3ee565de51beb16f3e35103f | PASS |
| Corrected | 674 | 67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d | PASS |

The four owner mutation RPCs retain authenticated EXECUTE and deny anon EXECUTE. Five intended public function definitions changed. Private lifecycle helpers/triggers were installed. No Storage policy was modified.

## Real staging HTTP authorization

**26 PASS, zero FAIL; 95 recorded requests**, including login, normal Admin session creation/revocation, assertions and privileged read-only invariant checks. No service-role impersonation: privileged clients only read verification metadata; owner/other-organization assertions used real password-authenticated JWTs; Admin gateway assertions used genuine custom Admin sessions.

| Operation / principal | Actual HTTP outcome | Status |
|---|---|---|
| Owner approved replacement, both RPCs | 400 / 400 | PASS |
| Other organization replacement, both RPCs | 400 / 400 | PASS |
| Anonymous replacement, both RPCs | 401 / 401 | PASS |
| Custom Admin client without owner JWT, both owner RPCs | 401 / 401 | PASS |
| Owner direct terminal content UPDATE | 400 | PASS |
| Other organization / anonymous / custom Admin client direct UPDATE | 200 with zero affected rows for each | PASS |
| Owner original and corrected download | 200, actual SHA-256 matches | PASS |
| Owner signing and signed download | 200 / 200, actual SHA-256 matches | PASS |
| Other organization download/signing | 400 / 400 | PASS |
| Anonymous download/signing | 400 / 400 | PASS |
| Authorized Super Admin gateway/signature download | 200 / 200, actual SHA-256 matches | PASS |
| Zero-permission Admin gateway | 403 | PASS |
| Genuine revoked Admin gateway | 403 | PASS |
| Forged parent/path gateway | 403 | PASS |
| Protected rows after every denied mutation and final check | Complete row/parent/renewal/term equality | PASS |

An HTTP 200 empty response alone was not counted as sufficient denial evidence: each direct mutation was required to affect zero rows, followed by privileged persisted-state comparison. No DELETE assertion was performed. No files were overwritten or deleted. Signed URLs, passwords, keys and tokens are excluded from saved evidence. Ordinary creation/revocation of test sessions was the only test setup mutation after installation. Final control-plane verification confirms zero active Admin sessions.

Detailed per-request method, sanitized endpoint, status and timings are in `terminal-http.json`.

## Remaining validation

| Check | Status | Evidence / blocker |
|---|---|---|
| Focused local PostgreSQL SQL tests | PASS | 47/47 via PGlite; includes positive revision, negative lifecycle and exact atomic reconciliation cases |
| Focused Vitest SQL contracts | PASS | 7/7 |
| git diff --check | PASS | Exit 0; existing line-ending warnings retained |
| Real positive revision on separate existing eligible state | BLOCKED | Read-only inventory found zero editable draft/needs_revision files outside completed cycle; no fixture reopening/provisioning authorized |
| Real multi-session approval vs replacement race | BLOCKED | No independent PostgreSQL connection tooling/eligible disposable test state available; single-connection PGlite does not certify concurrency |
| Genuine expired Admin session retest | BLOCKED | No saved expired test token; this run did not change session expiry or wait for natural expiry. Prior gateway evidence remains historical, not a current pass |
| Storage overwrite/deletion checks | BLOCKED | No separately approved disposable object and recovery plan; protected evidence deliberately preserved |
| Authenticated browser/PWA, mobile and interrupted upload | BLOCKED | Browser inventory contains staging Supabase dashboard only; no verified staging frontend/test session available. No frontend was deployed or configured against the production-linked checkout |
| TypeScript / production build rerun | NOT TESTED | No runtime application changes in this execution; previous reviewed tsc/build passes remain historical |
| Full Vitest / existing 150 failures | NOT TESTED | Full suite not rerun; prior failures are not certified harmless |

Current inventory remains five Auth users/identities, four organizations, two Admins, three global accreditation terms, one approved renewal, ten buckets and 29 objects. Existing A/B/suspended fixtures remain preserved. Final evidence is in `final-catalog.json` and `final-readonly-proof.json`.

## Readiness decisions

**Capstone UAT readiness: BLOCKED for complete sign-off.** The known approved-document replacement vulnerability is now patched in staging and its real terminal denial tests pass. However, authenticated browser/PWA task coverage and a real post-patch positive revision workflow remain unvalidated. Limited API validation has passed; it does not establish participant-facing UAT readiness.

**Production Storage security rollout readiness: BLOCKED.** Requires the remaining positive workflow, real concurrency, authenticated browser/PWA and production historical-path/data compatibility validation, plus separate rollout authorization. No production installation is authorized or implied. Previously issued signed URLs are not revoked by this patch or client cache invalidation.

## Safety and recovery

Do not restore vulnerable RPCs or undo approved renewal history. If an issue emerges, preserve records and prepare a reviewed forward correction. The control-plane migration version differs from the local proposal filename because the supported management API registered this one staging transaction; no migration-history repair or broad replay was attempted. Keep this staging reconciliation excluded from any future production replay: do not push/deploy or run db push from the production-linked checkout. A separately reviewed production artifact and rollout plan are still required.

New execution files and test runner are local only. Original reviewed SQL sources, prior failed-run evidence, existing identities/files and unrelated dirty application work remain preserved.
