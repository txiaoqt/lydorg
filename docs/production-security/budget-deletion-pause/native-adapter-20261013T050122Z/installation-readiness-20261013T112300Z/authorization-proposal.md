# Proposed production budget-deletion pause authorization

**NON-RUNNABLE DRAFT — NOT APPROVED. This document does not authorize execution, create authorization.json, approve a maintenance window or populate machine-readable approval fields.**

The operator must explicitly approve the scope, controls and a new execution window before any live preparation or installation. Window start/end and authorization reference are intentionally unapproved.

## Proposed wording for separate human approval

I authorize ONE controlled, operator-supervised installation of ONLY:

- SQL path: docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql.
- SQL SHA-256: a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a.
- SQL size: 11,945 UTF-8 bytes.
- Production project: mqqaykksadotbrghbexz.
- Direct endpoint: db.mqqaykksadotbrghbexz.supabase.co:5432; database/user postgres; route native-pg-direct-tls.
- Adapter: docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs.
- Adapter bundle SHA-256: 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25.
- Manifest SHA-256: 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb.
- Dedicated inventory verifier SHA-256: 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34.

The sole persistent database change is replacement of public.admin_bulk_delete_budget_requests(text,uuid[]) with the reviewed unconditional PT409 BUDGET_DELETION_PAUSED body. Preserve OID, signature, owner, grants/settings, all historical records and files. No migration receipt, audit row, other function, policy, trigger or schema change is included.

### Historical review anchors

The successful native preflight is historical evidence, SHA-256 **6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81**, normalized state fingerprint **8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc**. Its expired proof is not fresh installation evidence. Preserve that preflight and both existing proof archives without alteration.

### Window and conditional fresh bindings

Approved window start UTC: **TO BE EXPLICITLY APPROVED**.

Approved window end UTC: **TO BE EXPLICITLY APPROVED**.

Authorization reference: **TO BE ASSIGNED AFTER APPROVAL**.

Before installation, obtain and record the operator's new exclusive-window/drained-request confirmation. Pause competing migrations, grants, repairs, protected-data/Auth/consent/Admin-session/Storage writers and known background jobs until completion or stop. Do not assume the local lock excludes other operators or application sessions.

I authorize only the following bounded local preparation during that approved window, conditional on exact checks:

1. Verify the current four-file protected state and all reviewed bytes/hashes/ACLs; require authorization, approved-preflight, lock and attempt files absent.
2. Archive ONLY the current stale active proof, SHA-256 79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1, to its new same-directory hash-named history file with no overwrite. Require destination absent and preserve creation/write times, bytes, ownership/ACLs; accept ordinary OS-managed access-time changes. Keep both older archives and the historical preflight intact; do not repeat earlier renames or reset state.
3. Obtain fresh independent Supabase control-plane get_project evidence for the exact healthy project/direct host and create one active five-field sanitized proof with create-new semantics. Verify ACL/integrity and a five-minute freshness limit.
4. Use the trusted existing environment loader and independently reviewed CA fingerprint 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7; require actual certificate-chain, hostname and encrypted-socket verification with no endpoint/pooler/TLS fallback. Never print or persist secrets.
5. Run ONE fresh native read-only preflight. Require exact original RPC/catalog, PostgreSQL 17.6/identity/privileges, 57/57 reviewed inventories, unchanged foundation/document/containment state, 164 migrations, 15 policies and 378 objects. Require normalized state fingerprint exactly 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc. STOP on any drift; no rebaseline.
6. Only after those exact same-state checks, materialize the local approval bindings covered by this approval: a create-new byte-identical approved-preflight copy of the FRESH snapshot and the strict authorization record bound to that snapshot's new byte hash and the SAME active proof hash. Preserve the historical 6e5869… file unchanged. Fresh byte hashes are immutable evidence bindings, not permission to approve changed data. Record every derived hash in the external receipt. No placeholder or old-proof pairing may be used.

### Single installation and verification

Use the exact reviewed runner/native route once, with its one Client, owned exclusive operation lock, durable unused attempt marker, unchanged BEGIN/COMMIT, 1-second lock timeout and 30-second per-statement timeout. Require the fresh proof and authorization still valid immediately before arming. Never split, edit, reorder, append, replay, automatically retry or reconnect to resubmit SQL.

Correct the OUTER invocation's UTC handling before use: parse raw ISO JSON with the approved Node runtime; never reparse timezone-free PowerShell DateTime text. Parse JSON status explicitly. Exit code zero is not success. Accept normal success only with COMMITTED_AND_VERIFIED, terminal COMMIT acknowledgement, one submission, zero retries and complete verified postflight journal/evidence.

Require exact paused RPC/catalog fingerprints, all 57 inventories and supplemental foundation unchanged, all security protections preserved, 164 migrations, all 15 Storage policies and 378 objects unchanged. No live destructive RPC demo is authorized. Preserve the consumed marker and receipts and stop after reporting.

For any uncertain outcome or postflight failure: stop, preserve lock/marker/evidence and do not retry. Permit only bounded read-only reconciliation through the reviewed adapter after verifying the recorded writer backend has finished. Determine commit/install presence from raw catalog and function fingerprints. The known COMMITTED_WITH_DRIFT label is not authoritative when preservation fails; every such result requires manual evidence review. No automatic repair, baseline adoption, rollback or lock removal.

If committed defects are found, prepare a separately authorized forward correction or maintain a fail-closed feature pause. Never restore the permissive deletion function or remove existing protections.

### Exclusions

No Storage cutover or grant change, frontend/gateway deployment, Auth change, unrelated migration, receipt INSERT, budget/data/file deletion, upload/relink, fixture action, Git push or automatic next release. This approval would cover only the specified preparation, one budget-pause transaction and its bounded verification/reconciliation.

**Until the operator explicitly approves this wording and fills the window/reference, installation remains unauthorized. No active authorization file was created during review.**
