# Y-TRACE staging identity-schema repair and real Storage validation

Date: 10 October 2026 (Asia/Manila). Target: **zroudsvpswqsjlyttkjf only**.

## Decision

**PASS — missing identity schema repaired; genuine owner profile initialization now works.**

**BLOCKED — complete production Storage security sign-off.** Renewal fixtures cannot initialize through the supported workflow because Organization B lacks an authoritative accreditation term. Browser/PWA, slow-network/TUS and MOVE workflow coverage are incomplete. Existing regression failures also require review. No production deployment recommendation is made from catalog parity or these API checks alone.

This report extends, rather than replaces, [the previous report](../real-storage-validation-report.md). Its earlier missing-schema failure remains historical evidence. Original gateway/public-asset results and all earlier failed attempts have been preserved.

## Scope and preservation

- Branch `ui-refactor`; HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- The working tree was already extensively modified/untracked. Initial and final inventories: `tmp/identity-repair-initial-git-status.txt` and `tmp/identity-repair-final-git-status.txt`. No reset, checkout, stash, cleanup, push or deployment occurred.
- Production access was limited to PostgreSQL catalog definitions and metadata. No production identity cases, decisions, organization rows, documents or credentials were copied.
- Existing Auth identities, activated Super Admin, zero-permission Admin, ten buckets and two public synthetic assets were verified before the repair. No Auth accounts or buckets were recreated.
- Requests in fixture/test scripts are restricted to the exact staging HTTPS origin and reject redirects. The repository production `.env` is not loaded. Tests/build use placeholder Supabase configuration.
- `.env.staging.local` and `.ytrace-staging-fixtures.local` are Git-ignored and untracked. The journal has inheritance disabled and grants access only to its local owner, SYSTEM and Administrators. The env file retains broader inherited local ACLs, including the sandbox group; this is a local credential-file hardening consideration, not evidence of remote exposure. Neither file is included in reports.
- Fixture passwords remain in the protected local journal. Test session tokens were not persisted. Reports omit keys, passwords, JWTs, Admin tokens and signed URLs.

## Production inventory and exact repair

Evidence: [production catalog](production-catalog.json), [before catalog](staging-before-catalog.json), [after catalog](staging-after-catalog.json), [reviewed SQL](reviewed-staging-identity-repair.sql).

| Object / property | Result | Authoritative definition preserved |
|---|---|---|
| `ytrace_identity` schema | PASS | Owner `postgres`; schema privileges only `postgres` |
| `cases`, `check_rate`, `decisions` | PASS | Exact columns, types, defaults, nullability, constraints, ownership and table grants |
| Three tables' RLS | PASS | Enabled; FORCE RLS false; no policies, matching production |
| Seven indexes | PASS | `cases_pkey`, `check_rate_pkey`, `decisions_pkey`, canonical, decision pair/subject and rate cleanup indexes |
| `assess(organization_profiles)` | PASS | Original body, text return, SECURITY DEFINER |
| `authorize_reviewer(text)` | PASS | Original body, uuid return, SECURITY DEFINER |
| `candidate_fingerprint(organization_profiles)` | PASS | Original stable invoker definition |
| `candidates(text,text,text,uuid)` | PASS | Original stable SECURITY DEFINER; SETOF organization_profiles; threshold **0.82** |
| `fingerprint(organization_profiles)` | PASS | Original stable invoker definition |
| `has_retained_history(uuid)` | PASS | Original stable SECURITY DEFINER, boolean return |
| Function owners / grants / search paths | PASS | Exact extracted definitions; owner/EXECUTE `postgres` only |
| Direct private schema access | PASS | No USAGE granted to `anon`, `authenticated` or `service_role` |
| Eleven public dependencies | PASS | Their extracted function definitions already matched; none replaced |
| Extensions | PASS | Existing pg_trgm 1.6, citext 1.6 and pgcrypto 1.3 match |
| Other private objects | PASS | No sequences, extra standalone types or column-specific grants requiring reconstruction |

Original exception behavior, permission checks, session validation and identity decision rules are retained. There are no stub approval functions, invented permissive policies or removed triggers. Function definitions were reviewed for embedded private data/secrets before use.

### Migration execution and connection-specific failure

The first transactional application failed with SQLSTATE **42501**, attempting to set `pg_trgm.similarity_threshold`. Independent inspection confirmed **complete rollback**: no private schema/functions or migration-history entry remained.

Read-only diagnosis demonstrated that the installed extension's GUC was not registered in that connection until its library was loaded. A READ ONLY transaction could call `extensions.similarity('synthetic','synthetic')`, then set the user-context GUC locally to 0.82. The reviewed correction adds this read-only call in the DDL connection; it changes no extension, role, persistent configuration or function logic. See [diagnosis](extension-initialization-review.md).

One corrected, explicitly staging-targeted application succeeded. Actual history:

| Version | Name | Result |
|---|---|---|
| `20261010104343` | `staging_missing_private_identity_schema_20261010` | PASS |

The migration uses a transaction and five-second lock timeout, creates only missing private objects, and preserves their ACLs. It is stored outside the production migration series. No historical migration records were fabricated, unrelated migrations applied, public schemas replaced or Storage policies changed.

### Independent parity and fingerprints

Fresh production/staging catalog comparisons match at every extracted field, rather than merely matching counts. [Parity summary](parity-summary.json); [normalized SHA-256 fingerprints](schema-fingerprints.json). Normalization sorts object keys, preserves catalog-sorted arrays and converts strings to LF.

| Catalog section | Matching SHA-256 |
|---|---|
| Complete inventory | `3a285cc3d1e4207a925e4942f459591e19df85b8e0abde69b859458ffd903497` |
| Tables | `e9c6946ded1c8a5689ee1c78e0465f9dd398b234a5d036932ed95de1585db792` |
| Functions | `8c47fd73c7530f6affda4bca08b91dcd587e737161d82a9a06af63c0c5935ad2` |
| Public dependencies | `f0f759bbbf7d3c2fab0d1090be1597392d9f7b43f4bd9a78b88636f4df03d335` |

Intentional staging differences in the extracted identity schema: **none**. Both `to_regnamespace('ytrace_identity')` and `to_regprocedure('ytrace_identity.assess(public.organization_profiles)')` resolve. Existing public identity triggers remain identical to the pre-repair snapshot.

## Genuine organization and parent workflows

Evidence is under `../real-storage-validation/identity-repair/` in `provision-profiles.json`, `provision-registrations.json` and `provision-workflows.json`. Setup steps below are not counted as independent security assertions.

| Workflow | Status | Actual evidence |
|---|---|---|
| A profile initialization | PASS | Genuine A JWT; owner API INSERT HTTP 201; exactly one owned profile; actual identity guard produced NO_MATCH |
| B profile initialization | PASS | Attempted only after A success; genuine B JWT; HTTP 201; correct owner, NO_MATCH |
| Suspended candidate profile | PASS | Own JWT HTTP 201; supported authorized Admin review RPC establishes `suspended_inactive` |
| Profile isolation | PASS | A's request for B and B's request for A returned HTTP 200 with empty rows |
| A registration | PASS | Normal parent, six owner-uploaded PDFs, submission/review RPCs; automatic verification creates one accreditation term |
| B registration | PASS | Normal parent, one owner-uploaded PDF; existing-URN review RPC verifies profile |
| A/B YPOP | PASS | Owner drafts, small proof PDFs, submission and normal Admin qualification RPC |
| A/B budgets | PASS | Qualified YPOP linkage; owner attachments/submission; normal Admin approval/release, PHP100 each |
| A/B liquidation | PASS | Linked reports generated through supported release workflow; owner PDF attachments and submissions |
| B renewal initialization | BLOCKED | `user_start_or_get_renewal_draft`: HTTP 400, SQLSTATE P0001; no authoritative accreditation term |
| Renewal revision | BLOCKED | No valid renewal parent; no direct privileged insert/backdated term/window bypass used |

B's existing-URN verification does not create an accreditation ledger term. A has one current term; B has none. A safe historical renewal-fixture plan or an independently reviewed workflow correction is required before proceeding. The dependent workflow stopped at this constraint; successful budget/liquidation/YPOP fixtures are retained and were not replayed.

Synthetic emails use `example.invalid`; prior email-isolation checks were retained. No invite, password recovery or outbound notification-delivery function was called. Supported Auth password login and in-application review/notification triggers were used. No real identities were used.

## Real private Storage and Admin gateway authorization

These are actual staging HTTP tests with genuine organization JWTs and genuine custom Admin sessions. They are not mocked results. Service-role use was confined to labeled fixture inventory and shortening the expiration of one exact genuine test Admin session; it was never used to impersonate A/B.

Primary evidence: `../real-storage-validation/identity-repair-private-02/`:

- `org-isolation.json`: **78 PASS**, zero FAIL (13 files × six assertions).
- `admin-signing.json`: **43 PASS**, zero FAIL.
- `private-tests.json`: six additional upload/lock/suspension assertions PASS, plus separately labeled suite invocation/session cleanup results.

| Access / operation | A owned files | B owned files | Result / HTTP evidence |
|---|---|---|---|
| Owner authenticated download | PASS | PASS | HTTP 200; SHA-256 matches fixture bytes |
| Owner signing and signed download | PASS | PASS | HTTP 200; signed download hash matches |
| Other organization download | PASS: denied | PASS: denied | Actual 400/403 denials; no file bytes returned |
| Other organization signing | PASS: denied | PASS: denied | Actual 400/403 denials; no signed URL |
| Anonymous download/signing | PASS: denied | PASS: denied | Actual 400/403 denials |
| Authorized Super Admin gateway | PASS | PASS | HTTP 200; private signed download hashes match |
| Zero-permission Admin | PASS: denied | PASS: denied | HTTP 403 |
| Revoked Admin session | PASS: denied | PASS: denied | HTTP 403 |
| Expired Admin session | PASS: denied | PASS: denied | HTTP 403 |
| Invalid Admin token | PASS: denied | PASS: denied | HTTP 403 |
| Forged B parent path for A document | PASS: denied | — | HTTP 403; no authoritative metadata binding |

Coverage spans `organization-documents`, `budget-request-files`, `liquidation-report-files` and `ypop-files`. Original public template/news gateway downloads also passed with content hashes. Successful file-upload setup is evidenced by HTTP 200 and authoritative owner metadata, not inferred from path naming alone.

Additional real assertions: invalid parent upload denied; wrong-organization upload denied; wrong bucket/path upload denied; approved registration overwrite denied and original hash unchanged; denied DELETE left the original object/hash intact (empty successful DELETE response is not treated as deletion); actual suspended organization upload denied. Privileged inventory verified that denied uploads created no object.

### Preserved failed expectation from first run

`identity-repair-private-01/admin-signing.json` contains **20 PASS / 1 FAIL**. A valid Super Admin signing A's existing document while supplying B's `resourceId` returned HTTP 200. That first expectation of denial failed and remains recorded.

Review established that the signing contract derives the resource/parent from authoritative bucket/path metadata. The `resourceId` argument is used for upload reservations, not signing. This Admin was permitted to sign A's document; the unused field did not authorize an unbound object. The corrected test in run 02 forges the actual parent/path and is denied. No gateway or policy code was modified to hide the failed expectation. Rejecting irrelevant signing fields is a separate API-contract hardening consideration. Run 01 and run 02 totals overlap and must not be added as distinct checks.

### Registration revision lifecycle

Evidence: `../real-storage-validation/identity-repair-revision-01/registration-revision.json`.

**Eight workflow/authorization checks PASS**, with cleanup reported separately:

1. Genuine Admin requests `needs_revision` through existing review RPC.
2. B uploads a corrected small PDF through its own JWT and permitted revision path.
3. B calls `replace_organization_document_file` with exact document type and optimistic timestamp; result returns to `under_admin_review`.
4. Corrected and original file downloads both match their hashes; neither original object nor journal was deleted.
5. A cannot download B's corrected private document.
6. Anonymous cannot download it.
7. Authorized Admin signs/downloads corrected bytes with matching hash.
8. Zero-permission Admin signing is denied with HTTP 403.

## Final retained staging state

[Fresh final inventory](final-staging-state.json): four recorded Auth users and four linked identities, three organization profiles, two existing custom Admin accounts, ten buckets (six private/four public), **16 objects** (14 private synthetic PDFs including the new revision; original template PDF/news PNG). Two registrations, two budgets, two liquidations, two YPOP entries and zero renewals. Three synthetic identity cases and zero identity decisions. No production identity rows imported.

Active Admin test sessions: **zero**. All temporary test Auth sessions created by these scripts were signed out. Persistent fixture identities and files remain for browser/PWA follow-up.

Storage policies, role permission definitions and public profile triggers match the pre-repair snapshot. `admin-storage-access` remains ACTIVE version 1 with unchanged SHA-256 `564d0b5ceab9a63e8b81a824382fe565f045f1f794d3d9120b2fb5e9dc67fc8e`. The unrelated 33-policy performance migration remains unapplied.

## Local regression validation

- **PASS:** 54 Node SQL/bootstrap/fixture safety tests, including installing exact private DDL in isolated PGlite, actual assessment execution, restricted direct ACLs and reviewer denial. Public dependency fixtures in this local SQL test are synthetic; it does not replace live staging evidence.
- **PASS:** `npx tsc --noEmit`.
- **PASS:** production-mode Vite build via the npm build script with explicit isolated env/config and separate output. Existing build output preserved. Completed in 44.75 seconds; chunk-size/Browserslist warnings remain. The first PowerShell invocation misforwarded npm flags and failed before compilation; corrected `cmd.exe /d /c` argument forwarding succeeded. Both logs retained.
- **PASS:** `git -c core.fsmonitor=false diff --check`. Default Git fsmonitor reported IPC warnings; disabling fsmonitor for this check avoids the unavailable daemon without repository configuration changes.
- **PASS:** focused Vitest: **147 passed / 0 failed**, 12 files. Covers identity logic/API/profile writes, registration transport/bulk/URN lifecycle, signed URL cache/resolver, Admin Storage access, renewal and YPOP workflow tests. These are local automated tests; they are separate from genuine staging HTTP evidence.
- **FAIL:** completed full repository Vitest: **2,211 passed / 150 failed**, 2,361 assertions across 205 files, zero collection errors. This exactly matches the prior completed run. All 150 failed assertion identities also occur in both the saved previous run and the saved HEAD baseline. **Zero newly failing assertion identities** were found; the HEAD baseline was not rerun during this task. Matching names establishes prior occurrence, not harmlessness. Existing failures include Admin review UI, renewal UI, reports, filters, settings and YPOP interactions and remain unresolved.
- Evidence: [full run](vitest-full.json), [focused run](vitest-focused.json), [assertion-level baseline comparison](vitest-baseline-comparison.json), [54 Node tests](node-safety-tests.txt). No failing production logic or meaningful expectations were changed to improve the pass rate.

## Changes in this task

Staging-only scripts: added `verify-identity-repair-fixtures.mjs`, `identity-schema-repair.test.mjs`, `compare-identity-schema-catalogs.mjs`, `run-private-storage-validation.mjs`, `test-registration-revision.mjs`; extended existing provisioning phases for profile/registration initialization and supported financial workflows; added safe report-run directories to `synthetic-validation-common.mjs`.

The old unexecuted financial helper's privileged backdated accreditation insertion was removed from the executable continuation. Supported renewal initialization now stops explicitly when requirements are unmet. Original actor setup/empty-baseline safeguards remain separate and were not executed again.

New evidence/SQL stays in this directory and labeled real-validation subdirectories. No frontend, gateway, production migration, Storage authorization or role definitions were changed by this task. Existing unrelated uncommitted work is retained.

## Remaining rollout blockers and recommendation

| Area | Status | Remaining evidence / action |
|---|---|---|
| Missing private identity schema | PASS | Exact catalog/fingerprints and real profile-trigger execution |
| A/B and suspended setup | PASS | Genuine owner JWT and supported Admin suspension |
| Four private file workflow families | PASS | Own/cross/anonymous API, hash and gateway checks above |
| Registration revision | PASS | Actual review/upload/replacement/review-state and access checks |
| Renewal revision | BLOCKED | Missing B accreditation term; reviewed legitimate fixture plan required |
| MOVE | NOT TESTED | No scope expansion or fabricated permissions |
| Public template/news | PASS | Preserved previous write-denial/public-read evidence; fresh hashes/signing checked |
| Browser/PWA preview/download | NOT TESTED | API evidence does not establish UI, mobile or service-worker behavior |
| TUS/slow-network/retry lifecycle | NOT TESTED | Resumable upload code preserved; no physical-device claim |
| Full regression suite | FAIL | Completed: 2,211 pass / 150 fail; all failures previously observed, zero new identities; unresolved failures require review |
| Production security/deployment sign-off | BLOCKED | Complete remaining workflows and regression review first |

No signed URL expiry was changed. Previously issued URLs remain valid until their server expiration; client cache/session invalidation does not revoke them. Normal API fixtures and tiny on-demand downloads preserve lazy access; no whole-portal refresh, mass signing or production egress measurement is claimed.

**Recommendation:** retain staging fixtures, investigate supported existing-URN accreditation initialization separately, complete renewal/MOVE and authenticated browser/PWA coverage, and review existing failing regression assertions before a controlled production rollout. Do not replay this repair into production: its private schema already exists there. Production Storage cutover and the separate performance migration remain separate approval/review decisions.
