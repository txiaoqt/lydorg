# Y-TRACE Final Staging Validation and Production Security Preparation

Date: 11 October 2026 (Asia/Manila)

## Result

The post-patch registration document revision workflow passed against the exact staging project. One synthetic Organization C was created and retained, its owner uploaded two small PDFs, an authorized Admin requested revision on one file, and the owner replaced and resubmitted that file through the existing RPC. The corrected file and the original file both remain in private Storage; the approved peer document was unchanged. The registration remains under Admin review and was not approved; no accreditation term or renewal was created.

No production write, deployment, push, migration, Storage-policy change, or modification to Organizations A/B/suspended occurred.

## Repository and safety boundary

- Branch: `ui-refactor`; HEAD remained `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- The working tree was already extensively dirty. It was preserved; no reset or checkout was performed.
- Staging requests were guarded to `zroudsvpswqsjlyttkjf`. The ignored, untracked `.env.staging.local` supplied staging-only credentials; values were not printed.
- The local fixture lock was acquired and released by the runner. Targeted Windows process inspection found no competing staging runner. The prepared journal DACL remained protected to the current user, SYSTEM, and Administrators.
- Email screenshots show custom SMTP disabled and no Auth hooks, while Supabase built-in email remains available. The provisioning call used the synthetic `.example.invalid` address and `email_confirm: true`; no invitation, confirmation-send, recovery, OTP, or notification-delivery endpoint was called. This does **not** mean global email delivery is disabled.

## Preserved execution history

Three unique reports were kept; none was overwritten.

| Report | Outcome |
|---|---|
| `positive-revision-2026-10-11-05.json` | Preflight passed. The run stopped before an Auth request because Windows returned `EPERM` syncing a read-only journal handle. An isolated local probe reproduced the error; changing the journal sync handle to `r+` fixed it. Read-only staging Auth inventory showed no Org C identity at that point. |
| `positive-revision-2026-10-11-06.json` | Reused the prepared journal and created one Auth identity; normal owner login succeeded. Profile creation returned HTTP 400 / SQLSTATE `23514`: the synthetic phone number had ten digits, while the existing check requires `^09[0-9]{9}$`. Read-only verification confirmed no profile or other business write had committed. The input was corrected to a valid 11-digit synthetic number. |
| `positive-revision-2026-10-11-07.json` | Reused the exact recorded Auth identity; fresh preflight passed and the complete scoped revision/resubmission run passed. |

The recovery guards require the exact preserved failure report and an exact live staging inventory. They cannot create a second Org C identity in the Auth-created recovery mode. The report’s draft-creation detail field was originally named `status`, which overrode the report step’s `PASS` label. The actual draft POST returned HTTP 201 and the later submission transition returned HTTP 200. The runner now records that detail as `submissionStatus`; the historical execution report was left intact.

## Staging final state

Fresh API/database evidence after the successful run:

| Item | Result |
|---|---:|
| Auth users / Org C identity / email identity | 6 / 1 / 1 |
| Organization profiles / Org C profile | 5 / 1 (`incomplete`) |
| Registration submissions / Org C submission | 5 / 1 (`under_admin_review`, confirmed) |
| Org C document metadata | 2: one `under_admin_review`, one `approved_green` |
| Org C private Storage objects | 3 |
| Total Storage objects | 32 (29 preserved + 3 synthetic) |
| Renewals / accreditation terms | 1 / 3 (unchanged) |
| Storage object policies / buckets | 9 / 10 (unchanged) |

The test did not approve the registration or create accreditation. The original A/B/suspended profiles, their submissions and files, the approved renewal, and existing accreditation terms were preserved by exact postflight comparisons.

## Real staging HTTP results

All HTTP evidence is in [the successful execution JSON](positive-revision-2026-10-11-07.json); object paths, credentials, tokens, and signed URLs are not included.

| Actor/action | HTTP evidence | Result |
|---|---|---|
| Auth Admin create of the one synthetic identity | `POST /auth/v1/admin/users` → 200 | PASS |
| Organization C password login | `POST /auth/v1/token` → 200 | PASS; genuine owner JWT used for profile, document and submission operations |
| Owner profile and draft submission | PostgREST `POST` → 201 each | PASS |
| Two initial private PDF uploads and metadata inserts | Storage `POST` → 200 each; metadata `POST` → 201 each | PASS |
| Submit for review | File and parent `PATCH` → 200 | PASS; parent became `under_admin_review` |
| Super Admin flags one document and approves the peer | Admin review RPC `POST` → 200 each | PASS; one target entered revision; peer became `approved_green`; registration remained unapproved |
| Organization A tries Org C file download/replacement | Storage `GET` → 400; replacement RPC → 400 | PASS denial; protected file rows stayed byte-for-byte equivalent at the metadata level |
| Anonymous caller tries private file download/replacement | Storage `GET` → 400; replacement RPC → 401 | PASS denial; protected rows unchanged |
| Owner tries replacing the approved peer | Replacement RPC → 400 | PASS denial; peer row and file unchanged |
| Owner uploads corrected PDF and replaces the flagged row | Storage `POST` → 200; replacement RPC `POST` → 200 | PASS; corrected file linked and resubmitted under review |
| Owner downloads original, corrected, and peer PDFs | Storage `GET` → 200 for each | PASS; downloaded bytes matched recorded SHA-256 values below |
| Transient custom Admin session revocation | Revoke RPC → 204 | PASS |

| Synthetic PDF | Size | SHA-256 |
|---|---:|---|
| Original Constitution and By-Laws | 661 bytes | `4e070cb2eea5d8e35214f5d52c74d9c0d420e349b13e1a67c39dc6d694948c53` |
| Corrected Constitution and By-Laws | 675 bytes | `eff909582c12ba82bc1fcdbc8f88a8f8df3f12a1101be978d6ef7cacc19f13a5` |
| Form B peer document | 672 bytes | `0ac59676f7aa8053c1fbabfcb5f466f763d6c959eba38ed6e680357ebe1cceb0` |

The owner replacement path preserved one revision-history entry and the original physical object. No Storage object was deleted. Organization B access, Admin signed-URL creation for this new Org C object, and direct destructive Storage operations were not newly tested. Earlier 78 private Storage-isolation, 43 Admin gateway, and 26 post-patch terminal HTTP assertions remain historical evidence and are not counted as new Org C assertions.

## Browser, concurrency, and regression status

| Check | Status | Evidence / limit |
|---|---|---|
| Authenticated Organization/Admin browser workflow | **BLOCKED** | Prior browser audit found no Playwright Chromium executable and the in-app browser could not reach the local Vite loopback. The API run above is not a browser test. |
| PWA install, mobile layout, account switching, previews, interrupted upload | **BLOCKED** | Requires the unavailable authenticated browser/device session. No UI result is claimed. |
| Real concurrent approval-vs-replacement transaction | **BLOCKED** | No isolated multi-connection PostgreSQL/browser setup was available. Single-connection PGlite does not prove race safety. |
| Focused Org C journal/recovery tests | **PASS** | 6/6 Node tests. |
| Focused document-mutation SQL model | **PASS** | 47/47 local PGlite assertions, including valid revision and terminal-state cases; not live authorization or concurrency evidence. |
| Focused Vitest suites | **53 PASS / 1 FAIL** | The one failure is the already recorded baseline assertion in `baseline-failure-inventory.json`: renewal template count expects at least 6; current mock returns 5. No test was weakened. |
| TypeScript | **PASS** | `npx tsc --noEmit`. |
| Vite production build | **PASS** | Built into a temporary directory and removed afterward. Build warned that some chunks exceed 500 KB; that is not a new failure. |
| `git diff --check` | **PASS** | Only existing line-ending warnings. |
| Full repository Vitest suite | **NOT TESTED** | Not rerun in this scoped pass. |

## Production-only security patch

The production candidate remains a standalone review artifact, outside `supabase/migrations`:

- [Production-only SQL candidate](../../../production-security/document-mutation/document_mutation_lifecycle_guard_production.sql)
- SHA-256: `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785`
- It contains the lifecycle security correction only. It excludes the Org C fixture, the staging reconciliation, date simulation, test credentials, data rewrites, and Storage policy changes.
- It was not installed, executed against production, or placed in migration replay. No production write occurred.

The read-only production catalog compatibility evidence in the [previous final review](../../../production-security/document-mutation/final-validation-review.md) records 163 production migrations (latest `20261008174154`), matching reviewed mutation-function fingerprints, and matching Storage/table-policy and trigger fingerprints. The local migration set is newer, so `db push` or broad replay is unsafe. Production had zero renewal rows at inspection time, so renewal-specific production data flow was not exercised. The report also identified 547 existing `storage://` references and found their referenced objects present; this patch does not rewrite them.

### Controlled deployment and recovery outline

1. Require a separate production authorization and independently verify the exact production project reference and candidate hash.
2. Apply only the standalone reviewed SQL, never the staging reconciliation or broad migration replay. Stop if its history/catalog/ACL gate differs.
3. The transaction has a 5-second lock timeout and 30-second statement timeout; pre-commit failure rolls back the complete patch. If the result is uncertain, inspect catalog state read-only and do not blindly retry.
4. After a separately authorized commit, verify functions, triggers, grants and denied terminal mutations with approved test data.
5. For a post-commit defect, use a forward correction or a reviewed fail-closed pause. Do not restore the vulnerable RPC. Already-issued signed URLs remain valid until their server-side expiry; cache invalidation does not revoke them.

The broader production Storage-policy cutover is separate and not covered by this migration.

## Readiness decisions

| Assessment | Decision | Reason |
|---|---|---|
| Capstone UAT | **BLOCKED for full sign-off** | The real post-patch owner revision/resubmission now passes in staging. Authenticated UI/PWA, mobile, participant access and interrupted-upload checks remain unverified. |
| Production document-mutation patch | **BLOCKED** | Standalone candidate and read-only compatibility review are prepared, but browser validation and real multi-session concurrency remain unverified; no production execution is authorized. |
| Broader production Storage security rollout | **BLOCKED / separate review required** | This document-mutation candidate does not change Storage policies. The broader Storage cutover needs its own rollout review and authorization. |

## Files and evidence

- Runner: `scripts/staging/run-org-c-registration-revision.mjs`
- Recovery/inventory guards: `scripts/staging/org-c-registration-revision-guards.mjs`
- Focused tests: `scripts/staging/org-c-registration-revision-guards.test.mjs`
- Preserved execution reports: `positive-revision-2026-10-11-05.json`, `positive-revision-2026-10-11-06.json`, `positive-revision-2026-10-11-07.json`
- Production candidate SHA-256 was rechecked locally; no candidate or migration content was changed in this pass.
