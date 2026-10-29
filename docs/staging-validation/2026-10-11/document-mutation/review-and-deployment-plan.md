# Approved-document mutation: local security correction

Date: 11 October 2026, Asia/Manila. Branch: `ui-refactor`. HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.

**Status: local review candidate; NOT INSTALLED.** No staging records were changed or reconciled. Production access was limited to function catalog fingerprints. The existing dirty working tree, migrations, fixture journal and earlier HTTP evidence were preserved.

## Findings and evidence

The actual staging HTTP test previously returned 200 from `user_replace_document_submission_file` after cycle 2 approval and changed the approved corrected file back to the original file. That historical failure remains in `../renewal-scenario/recovery-http-evidence-authorized-20261011-02.json`.

The RPC is SECURITY DEFINER and bypasses ordinary RLS. It neither locks nor validates the renewal/submission/file lifecycle, suspension, revision deadlines, or uploaded Storage object. Its `_owner_id <> auth.uid()` comparison also fails closed incorrectly: NULL comparison skips the exception. Both terminal-owner mutation and anonymous mutation were reproduced against the captured implementation in isolated PostgreSQL, **not against private live documents**.

The existing `guard_submitted_registration_document_edits` explicitly skips definer calls, which leaves this RPC unprotected. Direct table ALL policies also permit owner writes without checking workflow state; therefore replacing only one RPC is insufficient.

The registration replacement RPC already checks identity, suspension, flagged-file status, deadlines, optimistic timestamp and a path prefix. It lacks authoritative parent/renewal terminal checks, the common lock order and a stored-object ownership check. The older `user_resubmit_renewal` has the same NULL identity comparison and omits suspension/deadline checks.

Fresh production catalog checks confirm all seven compared functions are byte-equivalent to staging under `md5(pg_get_functiondef(...))`. This establishes that production contains the same vulnerable implementation; no exploit was attempted against production. See `production-readonly-fingerprints.json` and `validation-summary.json`.

## Entry-point audit

`document-writers.json` captures all 19 public routines whose definitions write the submission/file tables, alongside signatures and original hashes.

| Path | Existing controls | Candidate treatment |
|---|---|---|
| Generic owner replacement | Incomplete ownership comparison only | Private locked owner/lifecycle guard; authoritative object checks; audit; explicit Auth requirement |
| Registration replacement | Ownership, suspension, per-file revision, deadline, timestamp | Same private parent/renewal guard; preserve its history, notification and optimistic concurrency behavior |
| Direct file INSERT/UPDATE/DELETE | Owner RLS and partial registration guard | Universal lifecycle/object trigger plus invoker guard for server-controlled review/history fields |
| Direct submission writes | Owner/submitted-by RLS | Immutable parent linkage, terminal status and protected review/deadline fields |
| Admin per-file review | Existing custom token validation | Preserve validation; acquire renewal, organization, submission, file locks before decisions; reread review state |
| Renewal submit/resubmit | Renewal lock and partial owner/state checks | Explicit non-null Auth identity, actual owner, suspension and revision lock/deadline checks |
| Additional documents, alternate resubmit, start draft | Existing owner/state checks | Inspected; no separate rewrite; new file triggers still protect content and terminal state |
| Admin aggregate review, approve/reject/request revision/unlock | Existing custom session and workflow rules | Inspected; no new generic Admin bypass; new terminal/content guards apply |
| Seed relationship repair / canonical account deletion / template hard deletion | Privileged existing operations | Owner clients cannot unlink/delete terminal files. Preserve validated backend deletion semantics and exact template-catalog unlinking; full canonical deletion remains untested |

RLS, table grants and Storage policy definitions are not altered. The nine live Storage policies match the previously reviewed scenario manifest; see `validation-summary.json`. The separate 33-policy performance migration remains unapplied.

## Exact proposed SQL and privileges

Forward file: `supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql` (created by the installed Supabase CLI; UTC filename date differs from the Manila report date).

Support source: `guard-functions.sql`. Deterministic local generator: `scripts/staging/prepare-document-mutation-patch.mjs`. Do not execute the fragment separately. Exact SHA-256 hashes are in `validation-summary.json`.

Changed signatures and original MD5:

| Signature | Original MD5 |
|---|---|
| `user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)` | `59370b100efed37d5975dc16983d786a` |
| `replace_organization_document_file(uuid,uuid,timestamptz,text,text,text,bigint)` | `ce30b4dff57a2fa1b7bf314c01e9fae6` |
| `update_admin_document_submission_file_review(text,uuid,document_submission_status,text)` | `252754fd75505948c26afe27f6b0b760` |
| `user_submit_renewal(uuid)` | `d41b680681db2323aba2c62693f59131` |
| `user_resubmit_renewal(uuid)` | `d19a1d0415f3eb900bab7dea241f0b21` |

The transaction gates ten original definitions, including approval, relevant existing guards and the unchanged template/account deletion functions, and requires the reviewed postgres installation owner. Missing or changed definitions abort. No already-applied file was edited. It creates a private schema/helper and three trigger functions. Private helper access is revoked from PUBLIC/anon/authenticated. Owner mutation RPCs revoke PUBLIC/anon EXECUTE and retain authenticated access. Admin review retains its existing custom-token entry privileges, including anon-role requests; an isolated SQL test verifies this compatibility with a synthetic session validator.

No client-controllable GUC or Admin override bypasses the replacement guard. Definer search paths are fixed. New references must be canonical `storage://organization-documents/...` URIs, resolve to a real stored object owned by the authenticated profile owner, fit the real organization/renewal/requirement path, and match PDF type/size. Requested corrections require a different revision object uploaded after the revision request. Existing historical references are preserved; they are not rewritten.

The initial strict candidate would also have blocked existing privileged deletion/catalog operations. It was narrowed **before deployment**: direct client DELETE retains mandatory owner/lifecycle checks, while existing backend deletion semantics remain subject to the unchanged canonical function's custom session, reviewer and retained-history checks. No permission or retention exception was added to that function. A template-only unlink may change `document_type_id` from a UUID to NULL and `updated_at`, with every other field exactly unchanged. The invoker guard denies this unlink to ordinary clients; the actual existing validated template deletion RPC is tested locally with valid/invalid synthetic Admin sessions. This is not an exception for replacing content, changing review status or moving a document to another parent. No replacement RPC can use it. The metadata-only seed repair routine remains service-role-only (`backend-entrypoint-privileges.json`).

RPC lock order: renewal → organization → submission → file. This shares the approval flow's renewal/organization ordering; the existing approval also locks the accreditation term before its parent update. All reads following waits recheck relationships and state. Direct row DML necessarily starts with the file row lock and can deadlock against a parent-first operation; PostgreSQL should abort one transaction safely. **Real multi-session contention testing is still BLOCKED** and no concurrency PASS is claimed.

## Local validation

| Test | Status | Evidence / limit |
|---|---|---|
| Captured pre-patch terminal and anonymous defects | PASS | Reproduced locally with actual original RPC and trigger |
| Owner / cross-organization / anonymous / suspended matrix | PASS | Actual PGlite PostgreSQL functions and captured RLS, synthetic rows |
| Approved/rejected renewal and approved registration protection | PASS | Denial snapshots compare complete file, parent, renewal and audit state |
| Per-file status, parent/renewal locks, deadlines and late cutoff | PASS | Positive and negative SQL cases |
| Wrong/missing Storage object, owner, path, size, MIME or old upload | PASS | Actual SQL against synthetic `storage.objects`; not a Storage HTTP server |
| Draft upload, registration revision, renewal revision/resubmission | PASS | Real function bodies in isolated database; registration history/notification preserved |
| Custom Admin review and captured final approval | PASS | Actual bodies; Admin token validator and ancillary functions are synthetic |
| Audit failure and installation drift | PASS | Atomic rollback verified |
| Exact-row reconciliation plus patch / failed reconciliation rollback | PASS | Actual proposed SQL, isolated copies of recorded synthetic metadata; no live repair |
| Local SQL suite | PASS | **47/47 Node tests**, including parent test groups; `local-sql-final-results.txt` |
| Focused Vitest | PASS | **117/117**; `vitest-focused.json` |
| TypeScript | PASS | `npx tsc --noEmit`, exit 0 |
| Production build | PASS | `npm run build -- --outDir tmp/document-mutation-build`, exit 0; preserves existing `build/` work |
| Diff whitespace | PASS | `git diff --check`; existing CRLF warnings only |
| Concurrent approval/replacement across connections | BLOCKED | No local multi-connection PostgreSQL server available; PGlite serializes one connection |
| Post-patch real staging HTTP and browser/PWA tests | NOT TESTED | Patch installation is not authorized in this task |
| Full Vitest / previous 150 baseline failures | NOT TESTED | Full suite not rerun; no claim that those failures are harmless |

The expanded SQL run initially failed because the isolated accreditation fixture lacked `certificate_urn` and a replay test expected the namespace gate instead of the earlier definition-drift gate. These test harness issues were corrected; the original failure output is preserved in `local-sql-fixture-errors-before-correction.txt`. No production behavior was weakened to satisfy those assertions.

Local SQL is actual PostgreSQL execution through PGlite, but the surrounding schema is synthetic and not a complete Supabase reconstruction. It does not certify Storage RLS, real Admin expiry/revocation, Auth JWT verification or physical upload transport. Those require the later real staging tests.

## Read-only fixture findings and reconciliation proposal

Fresh verification confirms cycle 2 remains approved, its submission remains approved_green, and five unflagged files remain approved_green. The exact target `bf21c513-6466-44ac-9487-c791544ee4ad` is submitted and points to the original PDF. Its two-entry history records the previously approved corrected reference and review timestamp/remarks.

Both synthetic PDF hashes were freshly verified through privileged read-only GETs:

- Original: `6e71339ae9f1ed382362a22da0ad7ae6f272a39e3ee565de51beb16f3e35103f` (673 bytes).
- Corrected: `67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d` (674 bytes).

These forensic reads are **not owner authorization tests**. Existing A/B/suspended identity/profile snapshots were unchanged. The dedicated superseded term 1 and active term 2 remain intact. See `fixture-readonly-verification.json` and `fixture-reconciliation-evidence.json`.

`proposed-staging-reconciliation.sql` is an exact one-row proposal, not an executable replay command. It must run **inside the approved patch transaction before the new guards are installed**, followed by installation before the same COMMIT. This prevents an unprotected repaired state from becoming visible and avoids any trigger disable/override.

It requires the exact staging Super Admin anchor, trusted dedicated fixture/Auth marker, approved cycle/submission, six files, five approved peers, exact current target composite row, approved historical corrected metadata, stored object owner/type/size and two preserved terms. Binary hash verification must be rerun immediately before execution because SQL metadata does not verify physical bytes.

It restores corrected URL/name/type/size/status and the historical approved review timestamp/remarks. The exact former `uploaded_at` was not retained by the vulnerable RPC: the proposal explicitly reconstructs it from the corrected Storage object's authoritative `created_at`, and records that fact in the audit. It preserves both files and the complete two-entry revision history. A new audit records before/after state, the independently verified hash and reconciliation rationale. Other file rows, parent, renewal and terms are compared before/after; failure rolls back everything. Replay is deliberately refused.

## Controlled deployment plan — separate approval required

1. Review the exact client/backend distinction above. The local tests cover template unlink and the trigger-level deletion boundary; they do not execute full canonical deletion through every auxiliary table. No live deletion or template removal is part of the proposed staging validation.
2. Acquire the existing fixture-operation lock; verify no concurrent operators. Use the explicit staging control plane for `zroudsvpswqsjlyttkjf`, never the production-linked CLI or broad `db push`.
3. Recheck live catalog hashes, table/trigger/grant/policy compatibility, dedicated actor/journal IDs, exact damaged metadata, both binary hashes, unchanged peer fixtures and source SHA-256. Stop on drift or uncertain state.
4. Review the **combined** SQL/hash, inserting only the exact approved reconciliation fragment before `CREATE SCHEMA ytrace_document_mutation;` in the forward transaction. The local integration test exercises this exact composition. No other migrations are included.
5. Apply once to staging only. Any timeout/error must roll back; inspect rather than automatically retry. Record the registered migration version without repairing history.
6. Freshly verify the one-row approved correction, new audit, unchanged original/corrected objects/history/terms/peers and unchanged Storage policies/grants.
7. Use genuine existing staging owner/other-org/Admin sessions for terminal replacement, direct write, signing/download/hash and invalid-session denials. Preserve evidence and stop immediately on any unexpected success. A live positive revision lifecycle and concurrency validation need a separately scoped test state; do not reopen the completed renewal automatically.
8. Run focused browser/PWA checks where available. Do not claim unavailable authenticated or interrupted-upload tests passed. No production rollout follows automatically.

## Rollback / fail-closed recovery

Before COMMIT: an exception or explicit ROLLBACK restores all metadata/DDL/audit changes. Local tests prove this for drift and audit failure.

After COMMIT: do not restore the vulnerable RPC or remove terminal guards to make a workflow pass. Pause affected mutations, preserve evidence and prepare a narrowly reviewed forward correction. If needed, separately approved revocation of authenticated EXECUTE on the four owner mutation RPCs can disable those operations while retaining guard protection; direct draft writes still exist, so this is not a complete write freeze. No production revocation is authorized here.

Do not undo the completed renewal, reopen terminal records, delete either file, erase the reconciliation audit or reset accreditation. Client cache invalidation does not revoke previously issued signed URLs. This patch does not change signed-URL expiry or Storage policies.

## Readiness and remaining risks

**Capstone UAT: BLOCKED for release sign-off.** The live approved-document mutation remains exploitable until the server patch and real terminal retests pass. Controlled earlier UAT evidence is preserved; local tests do not make the deployed environment safe.

**Production Storage rollout: BLOCKED.** Requires separate staging authorization, real post-patch HTTP/Storage evidence, multi-session contention checks, browser/PWA validation and production legacy-object compatibility review. The full canonical deletion workflow was not executed; existing Admin permissions are preserved, not comprehensively recertified by the mocked session validator. The captured approval routine's broader completeness/permission contract was not redesigned in this patch.

Expected cost is bounded extra row locks, one stored-object lookup and an audit per actual replacement. No navigation requests, polling, mass signing, binary preloads or new frontend background work were added. No egress improvement percentage is claimed.

## Files added for this task

- Forward migration: `supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql`.
- Actual PostgreSQL integration tests: `supabase/tests/document_mutation.local.test.mjs`.
- Vitest SQL contract tests: `src/lib/document-mutation-sql.test.ts`.
- Local proposal generators: `scripts/staging/prepare-document-mutation-patch.mjs` and `scripts/staging/prepare-document-reconciliation.mjs`.
- Read-only forensic script: `scripts/staging/review-approved-document-readonly.mjs`.
- Local evidence summary: `scripts/staging/summarize-document-mutation-validation.mjs`.
- This report directory: captured catalogs/privileges, forensic snapshots, unapplied reconciliation SQL, source guard fragment, exact SHA-256 manifest and test/build evidence.

No existing application runtime file, applied migration, Storage policy, fixture journal, or historical HTTP report was modified. The pre-existing application and build changes remain in the working tree.

**Review request:** authorize only a separately reviewed staging atomic patch/reconciliation and real terminal-security retest, within the explicit client/backend boundary above. No live account deletion, template deletion, production application, Git push or frontend deployment is proposed.

Reference: Supabase's [database function security guidance](https://supabase.com/docs/guides/database/functions) explains definer execution and EXECUTE privileges. Findings above come from captured project catalogs and the saved local/HTTP evidence, not an assumed equivalence between client-side checks and database authorization.
