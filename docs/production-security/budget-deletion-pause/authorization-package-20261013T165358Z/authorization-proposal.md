# NON-RUNNABLE — NOT APPROVED

## Proposed production budget-deletion pause

Human-review document only, prepared on 2026-10-14 in Asia/Manila. The directory timestamp is UTC. This document grants no authority, activates no window, creates no machine-readable approval, and initiates no production activity. Filling its blank fields would not itself authorize execution.

The independently reviewed candidate received **CANDIDATE REVIEW PASS**. Production readiness and installation authorization remain unestablished. See the [independent review](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/independent-supervisor-identity-review-20261013T162851Z.md>), [artifact identity evidence](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/authorization-package-20261013T165358Z/evidence-identities.md>) and [future operator checklist](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/authorization-package-20261013T165358Z/operator-checklist.md>).

## Exact proposed scope

| Binding | Required value |
| --- | --- |
| Production Supabase project | mqqaykksadotbrghbexz |
| Direct database endpoint | db.mqqaykksadotbrghbexz.supabase.co:5432 |
| Database and PostgreSQL account | postgres / postgres |
| Route | native-pg-direct-tls; no pooler or alternate SQL route |
| Candidate directory | C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z |
| Candidate bundle SHA-256 | f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84 |
| Input manifest SHA-256 | 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2 |
| Complete candidate inventory SHA-256 | e852913544468bd34724e22b9bc132bcf9c5d8a060a0cf4eaba3d8a89bf5d362 |
| SQL | [budget_deletion_pause_production.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql>) |
| SQL bytes / SHA-256 | 11,945 / a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated inventory verifier | [budget-protected-data-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/budget-protected-data-readonly.sql>) |
| Verifier SHA-256 | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Future installation controller | [native-budget-pause-supervisor.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-supervisor.mjs>) |
| Worker, not an independent installation entrypoint | [native-budget-pause-runner.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs>) |
| Toolchain reviewed by the candidate | Node v24.21.0; pg 8.23.0; five code files, eleven pinned inputs, 138 dependency files |

The sole proposed persistent database mutation is replacement of public.admin_bulk_delete_budget_requests(text,uuid[]) with the reviewed unconditional SQLSTATE PT409 / BUDGET_DELETION_PAUSED response. Preserve its OID 32925, signature, argument names, jsonb result, postgres owner, exact grants, security/volatility/parallel/null-input attributes and settings. Preserve every historical/business record and Storage file. No other function, grant, policy, trigger, schema, audit row or migration-receipt insertion is proposed.

The exact SQL must remain byte-for-byte unchanged, with its original BEGIN/COMMIT boundary, 1-second lock timeout and 30-second per-statement timeout. The statement limit is not a total transaction deadline. No splitting, appending, replay or alternative submission route is proposed.

## Blank human decision fields

All fields below are intentionally empty. No present or earlier authorization/window is adopted.

| Human approval field | Value |
| --- | --- |
| Fresh read-only verification authorization reference | |
| Final installation authorization reference | |
| Installation window start UTC, ISO timestamp with explicit offset | |
| Installation window end UTC, ISO timestamp with explicit offset | |
| Approving human / accountable operator | |

## Two separate decisions are required

**Decision A — future fresh read-only verification: NOT APPROVED.** A separate explicit authorization would be needed to inspect the protected root, verify its owner/effective ACLs, obtain fresh independent control-plane identity, validate the trusted CA and native TLS endpoint, and run a fresh read-only preflight with this candidate. Any local evidence refresh/archive action would need its own exact bounded authorization after the actual current state is inspected. No stale proof rename, state reset, authorization record, approved-preflight copy, operation lock, attempt marker or SQL installation is implied by Decision A.

Fresh verification must establish the exact healthy production project/direct endpoint, certificate chain and hostname, encrypted socket, PostgreSQL 17.6, role identity/privileges, original unpaused RPC and exact catalog/function fingerprints, all 57 preservation inventories, installed foundation/document/containment protections, 164 migrations, 15 unchanged Storage policies and 378 preserved objects. Compare each protected inventory with the applicable reviewed preservation reference. Every unexpected mismatch stops the process; none may be silently accepted, omitted or rebaselined.

All historical proofs/preflights are expired or tied to older candidate identities. They are preservation references only. They cannot be copied or paired with a new proof as current approval bindings. The whole-state fingerprint includes the runner bundle and TLS identity; the historical normalized fingerprint 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc is not the expected current-candidate fingerprint. Fresh matching per-entry data/catalog evidence and a fresh current-candidate fingerprint require independent review. This proposal computes or approves no live binding.

**Decision B — future one-attempt installation: NOT APPROVED.** Only after Decision A succeeds and its exact evidence is reviewed could a separate installation authorization identify this bundle/SQL/verifier/inventory, immutable fresh proof and preflight evidence hashes, current normalized same-state fingerprint, verified CA, and a newly approved exclusive window. The protected local approval bindings could be prepared only under that later explicit authority, with the exact reviewed schema and create-new semantics. This document contains no runnable record, populated approval field, reference, approval timestamp or shell command.

The new window must drain existing/queued budget-deletion operations and pause competing protected-data, business, Auth/consent/Admin-session, Storage, schema, privilege/role, repair and relevant background writers. The local lock and activity snapshots cannot exclude another operator or application write. Explicit coordination is required. Window/reference fields remain blank; older window confirmations cannot be reused.

## Proposed outcome and stop rules

A future installation would be supervised by the exact reviewed controller, which owns the exclusive durable lock and launches one IPC-bound worker. The worker must retain its original channel, require bounded operation-specific acknowledgments, and fail permanently on loss, timeout or ambiguous ownership. It has no release or reconnect path. Before any possible submission, loss must stop without a query. After possible submission, the result remains unresolved with the lock/marker/evidence retained.

Normal success requires explicit COMMITTED_AND_VERIFIED, terminal COMMIT acknowledgement, exactly one submission, zero automatic retries or compensating rollback submissions from the mutation path, complete matching durable journal/marker/preflight hashes, independent supervisor receipt verification and verified release of its own lock. A zero exit code, provisional worker status or drift label is insufficient. The attempt marker and receipts remain after verified success; the supervisor releases the lock only after the required verification.

On uncertainty, preserve any existing lock, attempt marker and receipts. Reconciliation would require separate explicit authority for bounded read-only inspection after the recorded writer backend and matching application sessions have finished. Determine presence from consistent raw catalog and full function fingerprints, separately from preservation status. Unknown/conflicting evidence remains unresolved. Never automatically retry, repair, roll back, clear state, adopt a baseline or restore the permissive function. Any committed defect needs a separately reviewed forward correction or continued fail-closed pause.

## Disclosed unverified items

Actual Windows PID recycling and real disk-lock crash recovery were not tested. Protected-root ownership/effective ACL verification, fresh production state and live TLS/database verification remain unverified for this candidate. This document task performed none of them. Offline passing tests and candidate review do not establish these live prerequisites.

## Exclusions

No Storage policy cutover or broad DELETE grant; frontend or gateway deployment; Auth account/configuration change; unrelated migration or receipt insert; record/file deletion; upload, move or relink; Git push; pagination work; fixture manipulation; automatic next release; or automatic rollback. No production endpoint or business RPC call is authorized by this proposal.

**NON-RUNNABLE — NOT APPROVED. Separate read-only verification and final installation authorizations remain outstanding.**
