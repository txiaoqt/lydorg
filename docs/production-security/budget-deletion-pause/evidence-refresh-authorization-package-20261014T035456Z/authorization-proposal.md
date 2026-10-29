# NON-RUNNABLE — NOT APPROVED

## Proposed evidence refresh and one native read-only preflight

Prepared 2026-10-14T03:54:56.672Z. This is a human-review proposal only. No operation below is approved by this document. It contains no runnable command or machine-readable authorization. See the [operator checklist](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T035456Z/operator-checklist.md>) and [evidence and identity sheet](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T035456Z/evidence-identities.md>).

Context reference YTRACE-BDP-READONLY-20261014-01 identifies earlier bounded read-only checks only. It does not authorize protected-state writes and is not reused as the proposed evidence-refresh authorization reference. Decision B, installation authorization and any installation window remain blank and out of scope. No installation window is required for the proposed Decision A verification.

| Item | Required reviewed identity |
| --- | --- |
| Production project | mqqaykksadotbrghbexz |
| Direct endpoint | db.mqqaykksadotbrghbexz.supabase.co:5432 |
| Database / user | postgres / postgres |
| Route | native-pg-direct-tls only |
| Candidate | C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/ |
| Candidate bundle SHA-256 | f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84 |
| Manifest SHA-256 | 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2 |
| Candidate inventory SHA-256 | e852913544468bd34724e22b9bc132bcf9c5d8a060a0cf4eaba3d8a89bf5d362 |
| Historical pause SQL | 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated read-only inventory verifier | 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Toolchain | Node v24.21.0; pg 8.23.0; five code files, eleven inputs, 138 driver files |

## Blank approval fields

| Human approval field | Value |
| --- | --- |
| Evidence-refresh and one-preflight authorization reference | |
| Approval identity | |
| Approval time (ISO timestamp with explicit offset) | |
| Decision B | |
| Installation authorization reference | |
| Installation window start UTC | |
| Installation window end UTC | |

## Separate operations requiring explicit authorization

1. **Private immediate recheck.** Request authority to inspect the fixed protected root and active proof privately immediately before handling it, including canonical paths, absence of reparse redirection, owner, effective ACLs, exact bytes/hash, size and creation/last-write timestamps. The source is C:/Users/Christopher x Angel/.ytrace-production-budget-deletion-pause/control-plane-proof.json. Require exactly 197 bytes and SHA-256 fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7, the expected five-field sanitized schema and reviewed production identity. Stop on unexpected fields, credential-like values, unsafe permissions or any mismatch; disclose no contents or secrets. Verify that authorization.json, approved-preflight.json, budget-deletion-pause.operation.lock.json and budget-deletion-pause.attempt.json remain absent, and preserve all other reviewed evidence. The earlier observations do not establish current presence or current hashes.

2. **One exact archival rename.** Separately request authority to rename only that verified active proof, within the same directory, to control-plane-proof-history-fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7.json. Require the destination to remain absent immediately before handling. The rename operation must itself refuse an existing destination, including one appearing after the existence check; no overwrite, force option, copy/delete fallback or cross-directory move is permitted. Preserve bytes/hash, ownership/effective ACL, creation time and last-write time, and verify those properties afterward. Ordinary OS-managed last-access changes are acceptable and must not be reset. Preserve the three pre-existing history archives and all earlier preflight evidence. If the rename succeeds and a later assertion fails, stop and report that exact state; do not rename back, repair or repeat the action automatically.

3. **Fresh scoped identity and one new proof.** Separately request one fresh configured Supabase MCP get_project observation for mqqaykksadotbrghbexz at execution time. Require unambiguous ACTIVE_HEALTHY identity and the exact direct host. Do not inspect tokens or fall back to broader credentials, another API or another project. The observation at 2026-10-14T03:30:04.632Z and the expired active proof are historical only. Request create-new creation of one sanitized control-plane-proof.json in the same protected root, with exactly project, host, status, verifiedVia and verifiedAt. Use UTF-8 without BOM, exclusive creation and the reviewed restricted ACL. Set verifiedVia to supabase-control-plane-get-project and bind verifiedAt to the actual fresh observation with an explicit-offset ISO timestamp. Persist no credentials, tokens or secrets. Verify its exact schema, hash and ACL privately. If it exists, creation fails, a partial proof remains or provenance is ambiguous, stop and preserve everything; no overwrite or automatic refresh.

4. **Exactly one native read-only preflight and its evidence file.** Separately request one invocation of the reviewed candidate's --preflight mode using the existing approved private environment loader, pinned Node/driver/inputs and fixed direct TLS endpoint. Require independently trusted CA provenance and SHA-256, certificate-chain and hostname validation, exact SNI, rejectUnauthorized enabled and an authenticated encrypted socket. No pooler, alternate endpoint, TLS fallback or alternate SQL route is permitted. Use only the reviewed executable read-only verifier contracts with terminal ROLLBACK; never submit the historical pause SQL. Retain the NODE_PG_FORCE_NATIVE unset requirement, including rejection of an empty value, and the existing runtime/environment guards. Request the protected write intrinsic to that mode: exactly one dynamically named preflight-<YYYYMMDDTHHMMSSsssZ>-<UUIDv4>.json, exclusive wx creation, write, sync, size check and subsequent ACL Verify. Allow the reviewed helper's Verify checks on the relevant root/proof/archive/generated artifacts; do not run Protect or SelfTest or change ACLs/execution policy.

5. **Retention and stop behavior.** Separately request retention of any partial or complete new proof/preflight evidence if a step stops or fails. Do not delete, overwrite, retry, automatically repair, roll back local evidence handling, refresh again, rebaseline, or create another snapshot. A complete snapshot may contain READ_ONLY_PREFLIGHT_PASS before the final ACL check; that field, file existence or exit zero alone does not establish completed verification. Require the actual successful preflight result, its file/ACL identity and the independent comparisons below. Report the exact completed steps and retained state on failure.

## Freshness and preservation gates

Require proof age between zero and 300 seconds, calculated by Node from the original explicit-offset ISO JSON value. Do not use timezone-free PowerShell date text or change timestamps. The reviewed runner checks freshness on proof load; the future operator must also confirm capture completed within that same five-minute window. If the window expires, stop, retain evidence and do not refresh or retry automatically.

Require PostgreSQL 17.6, database/current/session user postgres, direct port 5432, read-only enforcement, reviewed privileges, original unpaused public.admin_bulk_delete_budget_requests(text,uuid[]) contract and exact catalog/function/owner/grant fingerprints. Compare all 57 protected inventories individually against the applicable reviewed reference, together with foundation/document/containment functions, tables, triggers and permissions; require 164 migrations with their exact full history, 15 unchanged Storage policies and 378 preserved objects. Reference paths and hashes are in the identity sheet. Capturing inventories does not itself approve a match. Any unexpected difference, missing comparison, integrity failure or uncertainty stops the task; no selective omission or baseline adoption is allowed.

The historical normalized whole-state fingerprint 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc belongs to older evidence and must not be used as this candidate's expected fingerprint. Fresh current-candidate evidence requires review of per-entry/catalog matches; this proposal approves no new baseline or installation binding.

## Explicit exclusions

No database mutation or pause-SQL installation; no installation/reconciliation/business-RPC mode; no authorization.json, approved-preflight.json, operation lock or attempt marker creation; no copying a fresh snapshot into an approved binding; no Auth, Storage, gateway, frontend, migration, deployment, Git push or pagination action. Decision B and all installation/window fields remain blank and outside this proposal. The future task must stop after sanitized read-only reporting.
