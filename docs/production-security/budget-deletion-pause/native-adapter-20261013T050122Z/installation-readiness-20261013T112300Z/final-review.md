# Final independent budget-deletion pause installation review

## Recommendation

**GO to request ONE operator-supervised production installation authorization for the exact reviewed SQL and adapter. Installation is NOT authorized or executable under this review.**

The mutation boundary, transaction, preservation gates and one-attempt controls are suitable for this narrowly scoped pause. Two reporting limitations require the explicit controls in operator-checklist.md: UTC-safe outer timestamp handling and strict JSON/receipt success checks. A confirmed reconciliation-label defect stops safely but cannot itself prove commit. Supervised recovery must inspect the raw catalog/function fingerprints. **NO-GO for unattended orchestration that trusts an exit code or that label.**

No reviewed implementation was changed. No current production connection, control-plane refresh, fresh preflight, installation, active-proof archival, approval record, operation lock or attempt marker was performed/created. The execution window has not begun. All new files are local review artifacts.

## Independently verified identities

| Artifact | Exact identity |
| --- | --- |
| Project/route | mqqaykksadotbrghbexz; db.mqqaykksadotbrghbexz.supabase.co:5432; postgres database/user; native-pg-direct-tls |
| SQL | docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql |
| SQL bytes/SHA-256 | 11,945; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Adapter | docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs |
| Adapter bundle SHA-256 | 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25 |
| Manifest SHA-256 | 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb |
| Dedicated verifier SHA-256 | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Successful historical native evidence SHA-256 | 6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81 |
| Approved historical state fingerprint | 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc |
| Historical 57-inventory fingerprint | eabcb583b5a2417de666793aa86b26f53f6c32e4369d83e577f0fe70153f7429 |
| Independent CA reference SHA-256 | 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7 |

This review recomputed the bundle independently from the manifest bytes and sorted code identities. All **four code files, eleven pinned inputs and all 138 pg runtime files** matched. The actual dependency closure also matched the reviewed inventory. The pg 8.23.0 JS connection/stream/query implementation was inspected: one Client is used, no pool is instantiated, TLS rejection has no plaintext fallback, and the adapter has one mutation query call with no retry branch. The imported foundation core contributes only named utilities; its foundation installation SQL is not submitted by the budget adapter.

The driver supports an optional NODE_PG_FORCE_NATIVE override outside its pinned JS route. The operator must reject that flag before launching; the core's environment ban does not explicitly include it. This is an additional trusted-launch precondition, not permission to select another driver. Existing endpoint/runtime/PG/TLS override guards remain unchanged.

The successful preflight evidence manifest b966a8d10f4de0d6b1819b54e85e147190b5f321fde2bc7432c1dccc979bcc96 and **all 26 historical evidence files** matched their recorded hashes. The historical snapshot state fingerprint and all 57 normalized inventory entries were independently recomputed and matched the applicable reviewed snapshot. See independent-artifact-review.json. No completed test suite was rerun.

## Exact proposed database effect

One CREATE OR REPLACE of public.admin_bulk_delete_budget_requests(_session_token text,_request_ids uuid[]) RETURNS jsonb. Its new body always raises PT409 with fixed BUDGET_DELETION_PAUSED text before reading arguments, validating a session or performing a business operation. Every caller, including Super Admin, is denied; no unauthorized privilege or private data is exposed. The existing PUBLIC/anon/authenticated/service-role EXECUTE ACL remains, but this body grants no operative capability.

The original OID 32925, postgres owner, signature/argument names/result, security mode, volatility, strictness/parallel attributes, cost, search_path and grants remain. All other functions, triggers, RLS, roles and default grants remain outside mutation scope. No business/audit/session row or Storage object is changed. Transaction-local timeout and preservation GUCs leave no persistent schema object. No migration receipt is inserted; migration history must stay at 164.

The live function was unpaused at the accepted historical preflight. This review makes no fresh claim about current production catalog/data; future immediate verification is mandatory.

## Source-based security/operational review

| Required control | Finding |
| --- | --- |
| No arbitrary SQL/project/endpoint | PASS: fixed input paths, exact SQL length/hash, fixed host/database/user and strict CLI arguments. No alternate installation route. |
| Native TLS/trust | PASS for reviewed route: rejectUnauthorized true, fixed SNI, CA byte/fingerprint validation, encrypted/authorized socket and servername checks; native version/role/project binding verified. Independent trust and clean launch must be refreshed before execution. |
| Operation lock | PASS: fixed protected root, create-new lock, nonce/PID/content verification, ACL and ancestor/reparse checks. Only the owned lock is released. It does not exclude remote/application writers. |
| Durable marker | PASS: create-new/fsync/size-checked marker with backend and evidence bindings before mutation query; retained after success or uncertainty. Existing marker blocks installation. |
| Single submission/no retry | PASS: one client.query(sql), original payload, no appended SQL/reconnect resubmission/installer rollback query. Errors conservatively retain marker/lock. |
| Transaction/timeouts | PASS: original BEGIN/COMMIT; 1-second lock and 30-second per-statement timeouts; exact pre/post catalog and eight in-transaction data checks. No assertion weakened. No total 30-second transaction deadline or distributed table/write lock is claimed. |
| COMMIT acknowledgement | PASS: requires terminal COMMIT from the exact simple-query result. Missing acknowledgement is UNRESOLVED. Acknowledged commit plus postflight failure is separately reported. |
| All 57 preservation | PASS: normalized relation set/count/hash comparisons and row equality across immediate pre/post snapshots; source checks missing/duplicate/unexpected entries. External window prevents unreviewed concurrent writers. |
| Supplemental preservation | PASS: full before/after stable foundation hash plus exact structure/receipt, catalog/RPC, migrations, counts and protections. |
| Uncertain outcome | PASS with reporting caveat: separate read-only backend-finished check uses PID/start/app-name; no resubmission. Raw old/new catalog and function hashes are mandatory proof; drift label alone is insufficient. |
| Forward recovery | PASS: stop/preserve evidence and prepare a separately reviewed forward correction or continue pause. No vulnerable-definition restoration or broad grants. |
| Unrelated effects | PASS: sole function replacement; no DML, Auth, Storage API, policy, trigger, migration replay, deployment or Git operation. |

## Confirmed reporting limitations and mitigation

### UTC wrapper calculation — correction required before reuse

The original completion receipt reports 28836.2550605 seconds because PowerShell ConvertFrom-Json produced a UTC DateTime that was cast to a timezone-free string, losing its marker/fractions, then parsed in UTC+08:00. Independent raw-ISO parsing verifies **36.022 seconds** at completion. The native adapter's Node freshness checks and complete snapshot are consistent with that value. All original contradictory/corrective evidence remains unchanged.

Do not reuse the unsafe outer calculation. Use raw ISO JSON plus the approved Node runtime for UTC arithmetic, or a separately reviewed type-preserving UTC conversion. Do not remove the actual five-minute guard. Record explicit UTC values. This correction is outside the pinned runner, so SQL/bundle identities remain unchanged.

### Exit status — strict result handling required

The CLI intentionally returns exit code zero for several stopped outcomes, including UNRESOLVED and COMMITTED_POSTFLIGHT_FAILED. Exit code is not a release-success signal. Accept only COMMITTED_AND_VERIFIED with commitAcknowledged true, exactly one submission, zero retries, COMMIT acknowledgement and complete valid postflight receipt/events/fingerprints. Stop on anything else. Do not auto-chain another release.

### Reconciliation label — remaining P2 reporting defect, failure still stops

budget-runner-core.mjs classifyReconciliation checks preservation before determining old/new state. When preservation fails, it returns COMMITTED_WITH_DRIFT even if the original catalog and original RPC remain. A newly added **pure in-memory reproduction**, using the saved original preflight state, confirms this case. It creates no client, lock or marker. See reconciliation-label-review.json.

This label does not prove COMMIT. The result always stops; the installation is never retried, and unknown/drift results cannot meet the normal success whitelist. For supervised recovery, require the raw catalog and definition/source fingerprints after the writer backend finishes, and report installation presence separately from preservation. Recommend a future narrowly reviewed label correction; no adapter change is made in this task. Do not rely on this label for automated committed-state decisions.

These controls permit a supervised authorization request without weakening the mutation or preservation gates. If the operator requires unattended orchestration or cannot apply the explicit raw-evidence checks, recommendation becomes NO-GO until the reporting code/wrapper is corrected and reviewed.

## Historical accepted evidence versus fresh execution evidence

The native attempt completed at 2026-10-13T10:42:30.2550605Z: TLS 1.3/hostname/chain, PostgreSQL 17.6, exact original RPC/catalog, 57/57 inventories, full stable foundation, 164 migrations, 15 policies and 378 objects all PASS. There were zero installation attempts. This is historical evidence only; its five-minute proof expired.

The old 6e5869… preflight embeds proof hash 79a508…. readApprovedRecords requires the active proof hash to equal BOTH authorization.controlPlaneEvidenceSha256 and approved-preflight.controlPlaneEvidenceSha256. Therefore a refreshed proof cannot be paired with the old preflight bytes. Never edit those bytes or relax the guard.

The proposal explicitly permits later authorized fresh evidence/bindings ONLY if normalized state remains exactly 8d8a45… and every preservation check matches. The new fresh snapshot byte hash will legitimately differ because its proof/backend/time differ; it is bound as new immutable evidence, not a changed-data baseline. See the full sequence in operator-checklist.md.

Historical local test evidence was confirmed by reading the final logs: **38/38 disposable SQL, 18/18 UI/client and 39/39 adapter tests** passed. These suites were not rerun. SQL tests used the existing PostgreSQL 18.3/PGlite disposable environment; native production preflight used PostgreSQL 17.6. No fresh SQL/concurrency/browser test is claimed. Existing 647 frontend TypeScript diagnostics remain a separate frontend concern, not a passing typecheck or a runtime change in this SQL-only release.

## Window, preservation and recovery requirements

No window was started or assumed in this review. The operator must approve a new UTC interval and confirm drained existing calls/transactions/queued cleanup plus no competing schema, permission, repair, protected-data/Auth/session/Storage writes. Database counts and the local filesystem lock cannot provide that global exclusion.

Before later preparation, verify the exact current four-file state and the absence of authorization, approved-preflight, lock and marker. Preserve both archives, active proof and historical preflight. No active proof was opened for content, moved or refreshed in this review; metadata-only observations are recorded. A future authorized refresh must target only the current 79a508… proof, never repeat either earlier archive operation.

On known SQL failure, the atomic transaction must leave the original state after the writer closes; verify read-only and stop, retaining consumed evidence. On ambiguous outcome, require the original backend finished before old/new fingerprint classification. If proof expires before reconciliation, stop for a separately scoped evidence refresh; no silent overwrite/refresh. On acknowledged commit with verification failure, keep the restrictive pause/protections, preserve evidence and prepare forward correction. Never restore the permissive RPC or use older incompatible frontends as rollback.

## Deliverables and remaining approvals

- operator-checklist.md: complete preflight, bindings, single-attempt, postflight, status and uncertain-outcome checklist.
- authorization-proposal.md: non-runnable wording binding exact artifacts, historical review anchors, conditional fresh bindings, new window and recovery controls. Window/reference remain unapproved; no machine-readable approved authorization is created.
- independent-artifact-review.json: complete verified dependency/input/source identities and historical evidence comparison.
- reconciliation-label-review.json: newly reproduced reporting limitation, explicitly simulated in memory.
- preservation-verification.json: current operator metadata/ACL and historical-evidence preservation result.

**GO for a separately approved, supervised budget-pause installation request. STOP here.** No production/staging writes, fresh native preflight, proof refresh, lock/attempt/approval creation, frontend/gateway deployment, Storage cutover or Git push.

The Admin pause UI release and restrictive Storage cutover remain separate. The cutover must be independently re-gated against the actually installed pause catalog; this review grants no Storage or frontend action.
