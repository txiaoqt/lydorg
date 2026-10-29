# Y-TRACE Final Staging Validation and Production Security Preparation

Date: 11 October 2026 (Asia/Manila)

## Scope and repository state

- Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- The working tree was already dirty with extensive performance, staging, migration, build-output and test changes. It was preserved; no reset, checkout, push or deployment was performed.
- Staging reads were pinned to `zroudsvpswqsjlyttkjf`. Production reads were pinned to `mqqaykksadotbrghbexz`. Production received no writes.
- The installed staging transaction, renewal history, existing actors and files were not replayed, repaired, reset or recreated.

## Staging positive revision and terminal behavior

| Check | Result | Evidence |
|---|---|---|
| Existing approved renewal preserved | PASS | Fresh staging read: one renewal, status `approved`; approved submission and all six files remain. Final proof in [execution report](../../staging-validation/2026-10-11/document-mutation/execution-20261011-02/execution-report.md). |
| Post-patch editable revision state | BLOCKED | Fresh staging aggregate: zero document files on an editable parent. The sole renewal is terminal/approved. |
| Existing registration workflow state | BLOCKED for safe reuse | One registration file is pending review under Org B. The recorded fixture journal says B’s earlier registration revision run is already finished. Reopening it would mutate the cross-organization test fixture and append history, so it was preserved. |
| Prior real registration revision | PASS — historical, pre-patch | Eight real API assertions for Admin revision request, owner correction, replacement, original/corrected hashes, cross-org/anonymous denial, Admin signing and zero-permission denial; see [identity-schema report](../../staging-validation/2026-10-10/identity-schema/repair-and-validation-report.md). This is not a post-patch positive revision assertion. |
| Post-patch real terminal security | PASS | 26 real staging HTTP assertions passed with persisted-state comparisons; approved replacement/direct mutation denied, valid owner/Admin reads/signing and unauthorized/cross-org/anonymous denials verified. See [execution report](../../staging-validation/2026-10-11/document-mutation/execution-20261011-02/execution-report.md) and its `terminal-http.json`. |
| Local SQL model | PASS — synthetic PostgreSQL | 47/47 PGlite assertions from the execution report, including positive revision and terminal cases. PGlite does not certify concurrent transactions or live Storage authorization. |
| Focused Vitest | PASS | Re-run `npx vitest run src/lib/document-mutation-sql.test.ts`: 7 passed, 0 failed. These tests assert SQL contracts, not live authorization. |

The Org B file is technically reviewable, but it is not an isolated disposable state. Its current status is `under_admin_review`; turning it back into `needs_revision` would alter the already-used A/B cross-organization fixture. There is no safe post-patch positive revision fixture to consume without approval.

### Minimal disposable fixture proposal — not created

After explicit approval, provision exactly one clearly marked synthetic Organization C in staging through the existing Auth/organization/registration workflows. Use one synthetic Auth identity at an `.example.invalid` address, one profile, one registration submission, two small labeled PDFs (one target and one peer), and one corrected replacement PDF. Do not call invitation, confirmation-send, recovery or notification-email Auth endpoints. Confirm that no real email recipient is used and no external notification path is invoked before account creation.

Then use the real Super Admin review RPC to mark only the target document `needs_revision`; sign in as Organization C normally; upload and replace only that file using the supported organization RPC; verify original and corrected SHA-256, one revision-history entry, unchanged peer row/object, resubmission, and cross-org/anonymous denial. Do not approve this disposable registration or create accreditation history. Existing approved-document immutability remains covered by the post-patch terminal tests. Preserve the fixture and evidence after the run unless separately authorized for cleanup.

## Browser/PWA validation

| Check | Result | Evidence |
|---|---|---|
| Local app configured for staging only | PASS — guard verified; browser execution blocked | A guarded env preparation script writes only staging URL and anon key to an ignored temporary Vite env directory; it rejects any project/URL mismatch and never writes a service-role key. |
| Browser login and renewal screens | BLOCKED | No usable authenticated browser runner was available. Playwright could not launch because its Chromium executable is absent. The Codex in-app browser timed out connecting to the local loopback Vite server; the local shell HTTP probe also could not reach it. No login, UI workflow or browser pass is claimed. |
| Preview/download, account switching, mobile layout, session expiry and interrupted upload | BLOCKED | These require the unavailable authenticated browser session. No production host was allowed by the Playwright network guard; no device/PWA installation was available. |

Manual UAT procedure once a browser runner can reach the staging-only app: use the synthetic Organization C and the existing staging Super Admin; verify login/logout, renewal status, open and download a preserved PDF, perform the approved revision/resubmission sequence, sign out and sign into another synthetic organization, confirm no prior private data remains, inspect a 390px viewport, let a disposable session expire, and interrupt/retry one small upload while verifying successful files are not reuploaded. Do not use the completed approved cycle to manufacture a revision.

## Concurrency and additional security checks

- **BLOCKED:** No real multi-session PostgreSQL or independent disposable renewal fixture was available. The PGlite suite serializes one connection. No owner-replacement-vs-Admin-approval race was run or inferred from single-connection tests.
- **PASS — previously measured terminal checks:** owner/cross-org/anonymous and custom Admin gateway operations were exercised over real staging HTTP after patch installation. Denied direct table mutation responses were followed by privileged persisted-state equality checks; empty HTTP 200 alone was not considered proof of denial.
- **BLOCKED:** Storage overwrite/delete assertions were not attempted against preserved files. They require an independently approved disposable object and recovery plan.
- Prior 78 private Storage and 43 Admin gateway checks remain historical evidence from earlier runs; they are not new assertions in this pass.

## Production read-only compatibility review

Fresh production catalog queries confirmed:

- Migration history: 163 recorded entries; latest `20261008174154`. This does not match the newer local migration set; broad CLI replay is unsafe.
- All 10 expected function definitions, owners (`postgres`) and `SECURITY DEFINER` modes matched the reviewed source fingerprints. Relevant trigger, public-table policy and full Storage-policy fingerprints matched the candidate’s guards.
- The current direct ACL fingerprint for the five mutation/review RPCs matched `e45685fb8b158e7b039a6bf39b2b8973`. Existing role grants are not uniform: owner mutation/re-submit RPCs have public/anon grants in the current catalog, while the Admin review RPC intentionally remains executable by anon/authenticated for its custom Admin-token validation. The candidate revokes public/anon execution only from owner mutation and submit/resubmit RPCs, preserves authenticated execution, and preserves the Admin review entry point and its server-side token check.
- Relevant tables have RLS enabled and the reviewed trigger/table structures are present. No patch namespace or trigger-name collision was found.
- Production currently has zero renewal rows and zero renewal-linked submissions; therefore the production renewal lifecycle was not exercised with real production records.
- There are 547 `storage://` document metadata references, all linked to existing Storage objects: 510 references to six names in the public `registration-seed-file` sample bucket and 37 references in private `organization-documents`. The public bucket has six objects, and its read policy allowlists those same six sample filenames; all 510 sample references match the allowlist. `organization-documents` is private. The candidate neither rewrites these references nor changes Storage policies or objects.

These catalog checks are read-only. No production private file was downloaded, signed, or modified.

## Production-only forward patch prepared

Review artifact: [document_mutation_lifecycle_guard_production.sql](document_mutation_lifecycle_guard_production.sql)

- Candidate SHA-256: `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785`.
- Tested staging patch body SHA-256: `b19e93c19454a9012e85eb9dce81ba152b4f93d0eaa0fa475f78ab8d30a4d7a0`.
- Generator: [generate-production-document-mutation-candidate.mjs](../../../scripts/generate-production-document-mutation-candidate.mjs).
- The artifact is deliberately outside `supabase/migrations`; it is not installed. It contains lifecycle guards and corrected document mutation RPCs, with no staging reconciliation, test-organization logic, simulated dates, test identities, audit-row inserts or Storage policy changes. Static scans found none of the staging fixture identifiers or reconciliation statements.
- Its transaction gate requires the production migration-history marker, exact function body/owner/security-mode fingerprints, patch namespace absence, no trigger collision, RLS state, intended RPC grants, exact ACL fingerprint, and the current trigger and policy fingerprints. It also requires `current_user = postgres`. The SQL cannot prove which Supabase project it is connected to; deployment must separately pin and verify the production project reference immediately before execution.
- Candidate generation, Node syntax check, content guards and focused SQL-contract tests passed. The production candidate itself was not applied or executed against production; its live guard is intentionally untested by writes.

### Production rollout and recovery plan — future separate approval required

1. Independently verify the production project reference and candidate SHA-256. Never use `supabase db push`, migration replay from this checkout, or the staging SQL bundle. Review the standalone candidate as one explicitly selected forward migration.
2. Recheck its catalog gate inputs, production migration history, function ACLs, policies/triggers, table columns and bucket settings. Stop if any fingerprint differs; do not edit the gate to make it pass.
3. Schedule a low-traffic window. The candidate uses a five-second lock timeout and a 30-second statement timeout and runs in one transaction. A pre-commit error must roll back the complete DDL/RPC change. If the response is uncertain, inspect read-only catalog state; do not retry blindly.
4. After a committed deployment is separately authorized, verify migration registration and trigger/function/grant fingerprints, then run a controlled owner revision and Admin review smoke test with approved test data. Verify denied terminal mutations leave rows and file hashes unchanged. Do not replay or import the staging reconciliation.
5. If a post-commit defect appears, retain the new guards and prepare a forward correction. Do not restore the vulnerable RPC definitions. If operations must be paused, separately review a fail-closed restriction of owner mutation RPC execution; never remove guards as a quick rollback. Database rollback does not revoke previously issued signed Storage URLs, which remain usable until their server-side expiry.

## Readiness decisions

| Assessment | Decision | Reason |
|---|---|---|
| Capstone UAT | **BLOCKED for full sign-off** | Staging terminal security passed, and a prior pre-patch registration revision workflow passed. A post-patch positive revision/resubmission has no safe isolated fixture yet; authenticated browser/PWA and mobile upload checks are blocked. |
| Production document-mutation security rollout | **BLOCKED** | A reviewable standalone candidate and live catalog compatibility evidence are ready, but post-patch positive workflow, real concurrent approval/replacement behavior and authenticated browser checks remain unverified. No production execution is authorized. |
| Broader production Storage cutover | **NOT COVERED by this patch** | The candidate does not change Storage policies. Its readiness must be reviewed independently from this document-mutation correction. |

### Critical blockers

1. Approval for one disposable synthetic Organization C fixture, then real post-patch positive revision/resubmission tests.
2. A genuine concurrent HTTP race on that disposable state, or an authorized isolated multi-connection database test; do not treat PGlite as concurrency proof.
3. An authenticated browser runner with the staging-only app reachable, followed by the focused manual/automated UI checks above.
4. Separate review and authorization before any production deployment.

### Validation performed in this review

- `npx vitest run src/lib/document-mutation-sql.test.ts`: **7 passed, 0 failed**.
- `node --check scripts/generate-production-document-mutation-candidate.mjs`: **PASS**.
- Production candidate static guard: **PASS**; correct SHA recorded above, outside `supabase/migrations`, no staging reconciliation/test fixture strings.
- `git diff --check` on the candidate and generator: **PASS**. No TypeScript or production build was rerun because no application source was changed in this review.
- Full Vitest, a new positive staging revision, concurrency, and browser/PWA workflows: **not run / blocked** as described above.
