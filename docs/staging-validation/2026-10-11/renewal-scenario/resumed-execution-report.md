# Controlled staging renewal execution — partial completion

11 October 2026, Asia/Manila. Actual HTTP timestamps use UTC (10 October, approximately 17:51–17:53 UTC). Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty tree preserved.

## Decision

**Execution stopped at the first unexpected HTTP failure, without retry.** The reviewed SQL is installed and the dedicated renewal is genuinely **needs_revision**. Correction, resubmission, approval and renewal Storage/browser assertions remain **BLOCKED**. This is not completed renewal validation or production security sign-off.

The failure was a duplicate transition in the execution runner: normal file review already changed the renewal to `needs_revision`, then the runner called `admin_request_renewal_revision`, whose precondition only permits submitted/under_review/resubmitted. That second request returned HTTP 400 / SQLSTATE P0001. The first write committed successfully. No rollback, repeat review, date reset, restoration or automatic continuation was attempted.

Production was not contacted. No application deployment, Git push, unrelated migration, permission change, Storage policy change or account bootstrap occurred.

## Preconditions and installation

| Check | Status | Evidence |
|---|---|---|
| Fixed staging control plane | PASS | Project ref/name/ACTIVE_HEALTHY/database host matched `zroudsvpswqsjlyttkjf`. |
| Concurrent local operations | PASS | Nine inspectable Node processes, none matching bootstrap/fixture operations. Exclusive existing fixture-operation lock acquired and held across provisioning and installation. User confirmed controlled operator. |
| Immediate baseline | PASS | 4 Auth users/identities, 3 organizations, 2 Admins, 1 term, 0 renewals, 16 objects, no installed adaptation or active Admin sessions. |
| Exact reviewed catalog | PASS | Read-only drift gate passed before creation and again immediately before installation. |
| Approved SQL SHA-256 | PASS | `b84b3b80c9045c11ca4e58c14c52c73018916b01235a71b829c8c66ef2029245`; local source unchanged after execution. |
| Scoped email isolation | PASS | Prior reassessment plus exact Admin `createUser(email_confirm:true)`; no invitation, confirmation-send, recovery, OTP or email-dispatch endpoint invoked. Built-in email remains available globally. |
| SQL installation | PASS | Fixed-project management `apply_migration` returned `success:true`, name `staging_only_reviewed_renewal_scenario`; only reviewed SQL supplied. Private schema exists; mutation permit is VOLATILE. The management tool records this staging-only installation in migration history. |
| Storage policies preserved | PASS | All nine definitions compare exactly equal to reviewed catalog manifest after installation. |

The 33-policy performance migration and separate eligibility proposal remain outside this execution. No production-linked CLI was used.

## Dedicated synthetic fixture and actual lifecycle

Exactly one identity created: `ytrace-renewal-synthetic@example.invalid`, trusted app metadata `ytrace_renewal_fixture=zroudsvpswqsjlyttkjf-v1`, confirmed email provider. Its generated password and recorded ID are retained only in the ignored local credential journal. No password is returned by the scenario panel RPC.

Organization: **SYNTHETIC Y-TRACE Renewal Scenario**. All profile and submission writes used its genuine Auth login/JWT. Service-role use was limited to privileged provisioning/read-only inventory and shortening one newly generated test Admin session for the expiry assertion; it never impersonated the organization. Initial accreditation came from normal authorized registration review, not direct ledger insertion.

| Step | Status | Actual evidence |
|---|---|---|
| One confirmed Auth identity | PASS | POST `/auth/v1/admin/users` 200; exact email, marker and single email-provider identity verified. |
| Normal organization login/profile | PASS | Auth token endpoint 200; owner profile insert 201. |
| Identity assessment | PASS | Existing Admin identity-review RPC 200, NO_MATCH with no candidates. |
| Registration documents | PASS | Six small labeled PDFs: Storage uploads 200, metadata inserts 201; normal submission updates 200. |
| Initial registration approval | PASS | Six normal Admin file-review calls 200; verified profile with authoritative current term. |
| Super Admin scenario binding | PASS | RPC 200, exact designated organization, null temporaryPassword. |
| 30 Days Ahead | PASS | Scenario RPC 200; correct initial term and `canDraft=true`; genuine owner eligibility RPC 200 with `canDraft=true`. |
| Renewal draft | PASS | Existing owner draft RPC 200; parent/submission ownership links verified. |
| Required renewal documents | PASS | Six renewal PDFs uploaded 200 and metadata inserted 201. No successful transfer repeated. |
| Submission/Admin visibility | PASS | `user_submit_renewal` and scoped Admin review-context RPC both 200. |
| File-level Needs Revision | PASS | Normal document-review RPC 200; fresh database read confirms one flagged document and renewal `needs_revision`. |
| Additional aggregate revision RPC | FAIL | Redundant call returned 400/P0001 because first review already changed renewal state. Runner stopped. |
| Corrected upload/resubmission/approval | BLOCKED | Not attempted following stop rule. |
| Terminal restrictions/new accreditation term | BLOCKED | Renewal not approved. |

The database uses its current UTC date. Applied synthetic term dates are **2023-11-09 through 2026-11-09**, term 1, active, non-legacy; the three-year date span is the explicitly authorized fixture-only simulation. Binding and simulation audit rows exist. No existing organization's dates were changed. Renewal cycle 2 references that current term.

## Real scenario authorization matrix

These are actual staging PostgREST requests, not mocked tests. A short-lived test session was obtained through normal Admin authentication and then expired by shortening only its exact token-hash-matched row, following the existing staging security-test pattern. No session was fabricated or extended.

| Caller | Operation | Status | HTTP |
|---|---|---|---|
| Valid Super Admin | Bind dedicated fixture / prepare +30 | PASS | 200 / 200 |
| Invalid custom Admin token over anon transport | Prepare scenario denied | PASS | 401 |
| Genuine zero-permission Admin | Prepare scenario denied | PASS | 401 |
| Revoked genuine Admin session | Prepare scenario denied | PASS | 401 |
| Expired genuine Admin session | Prepare scenario denied | PASS | 401 |
| Genuine organization JWT without Admin authorization | Prepare scenario denied | PASS | 403 |

All denial assertions ran before the permitted date simulation. These results certify the tested scenario endpoint; they are not evidence for unexecuted renewal-file gateway checks.

## Renewal Storage authorization matrix

| Assertion | Status | Evidence / blocker |
|---|---|---|
| Owner initial renewal uploads | PASS | Six genuine owner Storage HTTP 200 responses with associated owner metadata inserts. |
| Owner download/signing and downloaded SHA-256 | BLOCKED | Runner stopped before this test group. Generated/uploaded SHA-256 values are recorded but do not substitute for downloaded-content verification. |
| Other organization denied download/signing | BLOCKED | Not executed for the new renewal files. |
| Anonymous denied download/signing | BLOCKED | Not executed for the new renewal files. |
| Authorized Admin signing/hash | BLOCKED | Not executed for the new renewal files. |
| Zero-permission/revoked/expired Admin signing denial | BLOCKED | Scenario-denial results above do not substitute for gateway authorization. |
| Invalid parent/path denial | BLOCKED | Not executed. |
| Locked replacement/overwrite/delete | BLOCKED | Terminal approval not reached. No DELETE was issued. |

Earlier 78 private Storage / 43 gateway / 8 registration-revision assertions remain prior evidence only; they do not count as this renewal's completed matrix.

## Browser/PWA and regressions

Authenticated browser/PWA login/logout, preview/download, account switching, mobile UI and interrupted/TUS uploads: **BLOCKED**, not attempted after the mandatory stop. The SDK uploads in this run are real HTTP uploads, not evidence of browser or TUS reliability.

Confirmed issue: the new execution runner redundantly requests aggregate revision after the existing file-review RPC already makes that transition. Read-only inspection of both exact live function definitions explains the result. No application or database business rule was changed to accommodate the runner. The current complete lifecycle runner must not be rerun from its beginning.

Both new runner modules pass `node --check`. `git -c core.fsmonitor=false diff --check` passes (existing line-ending warnings). TypeScript, Vite build and Vitest were **NOT TESTED in this execution**; prior final-review results remain separate. No claim is made that existing 150 full-suite baseline failures are harmless or newly resolved.

## Final preserved state

| Resource | Before | After |
|---|---:|---:|
| Auth users/identities | 4/4 | 5/5 |
| Organizations | 3 | 4 |
| Admin accounts | 2 | 2 |
| Accreditation terms | 1 | 2 |
| Renewals | 0 | 1, needs_revision |
| Buckets | 10 | 10 |
| Storage objects | 16 | 28 |
| Active custom Admin test sessions | 0 | 0 |

All four execution Admin sessions were revoked through the supported RPC (204); owner test Auth session signed out locally (204). Original A/B/suspended profile identity/name/status fields compare equal to the pre-write snapshot; existing journal-recorded file references still match. Exact Storage policy comparison passes. No broad cleanup or binary download occurred. The fixture-operation lock was released after session cleanup. The dedicated password, IDs, documents, initial term, simulated dates, renewal and audits remain available for investigation and follow-up.

The installed scenario remains restricted to the designated fixture. No unexpected privilege grant was observed, so no disable operation was needed. If later required, use the already reviewed fail-closed disable procedure; disabling cannot undo committed simulations or revoke previously issued signed URLs.

## Readiness and next action

**Staging renewal validation: BLOCKED, partially complete.** Preserve and inspect the existing `needs_revision` packet. A future expressly authorized continuation should start with corrected upload using the existing owner/renewal/file IDs, not recreate identities, registration, SQL, scenarios or draft. Validate current state before that continuation; do not repeat the successful flag or failed aggregate transition. This report does not automatically execute that continuation.

**Capstone renewal UAT: BLOCKED.** A genuine eligible participant fixture exists, but corrected upload, resubmission, final approval and authenticated browser tasks have not passed.

**Production Storage rollout: BLOCKED.** Complete the renewal-specific real authorization matrix, downloaded hashes, terminal lifecycle checks, browser/PWA coverage and existing production-path compatibility review before sign-off. No production rollout is authorized or implied.

## Evidence/files

- `execution-http-evidence.json`: every executed HTTP method, sanitized endpoint, status, timing and grouped assertion, including failed and cleanup requests.
- `post-stop-readonly-verification.json`: original profile/file-reference checks, exact designated identity, six registration/six renewal files and explicit absence of downloaded-hash verification.
- `scripts/staging/controlled-renewal-execution.mjs`: journaled single-run registration/install handoff, exact project/hash guards and lock.
- `scripts/staging/controlled-renewal-lifecycle.mjs`: executed lifecycle/authorization sequence and unexecuted later checks; contains the redundant transition documented above. It is not an approved recovery runner.
- Existing reviewed SQL, final review, prior reports and credential journal preserved. Credentials remain ignored and untracked.
