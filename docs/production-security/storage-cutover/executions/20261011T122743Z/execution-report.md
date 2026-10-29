# Production Storage foundation — single-attempt execution report

**Outcome: NOT INSTALLED. No retry performed.**
Production: mqqaykksadotbrghbexz (lydo-org-focused).
Branch: ui-refactor; HEAD: 2f6e7427c553b7535f53860d1732b42df7c023e8.

## Authorized artifact

- Path: docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql
- SHA-256: e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2
- Size: 47,407 bytes.
- Submitted once, without changes, appended SQL, migration receipt or retry.
- Original BEGIN/COMMIT, 1-second lock timeout and 30-second statement timeout retained.
- The reviewed internal asset-binding initialization is distinct from historical business metadata backfilling; neither historical documents nor Storage objects were modified.

## Actual execution evidence

| Check | Status | Evidence |
|---|---|---|
| Fixed production project and connection | PASS | Control-plane get_project returned the exact ID and db.mqqaykksadotbrghbexz.supabase.co; independent SQL returned postgres database/current user/session user, PostgreSQL 17.6 |
| Authorized SQL bytes/hash | PASS | SHA-256 checked before submission and after reconciliation |
| Complete compatibility gate | PASS | eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5 |
| Migration history | PASS | 164; latest 20261011230000; full history MD5 1f5eca911f6e2057ae070a955eaca3dc |
| DDL/ownership/trigger privileges | PASS | Database CREATE, public CREATE, postgres ownership/TRIGGER rights on all eight targets; required roles exist; default grants matched |
| Foundation initially absent | PASS | Namespace, gateway RPC and eight trigger names absent |
| Object/canonical reference inventory | PASS | Exact reviewed counts and values matched |
| Exclusive schema window/operator lock | PASS | Explicit user confirmation; cooperative operation lock acquired and verified |
| Foundation installation | FAIL | One submission returned McpServerError: Invalid or expired requestState; no PostgreSQL transaction result |
| Installed foundation postconditions | BLOCKED | Four tables, 14 functions and eight triggers are absent; no trusted-origin registry exists |
| Read-only reconciliation | PASS | Original catalog/data unchanged; no matching active/idle-in-transaction foundation operation or relevant DDL lock |
| Lock cleanup/working tree | PASS | Only this operation's verified lock released; Git status before/after identical |

Submission: 2026-10-11 12:36:30 UTC (20:36:30 Asia/Manila).
Error response: 2026-10-11 12:44:46 UTC (20:44:46 Asia/Manila).
Final read-only transaction/absence check: 2026-10-11T12:46:31.643259+00:00.

The transport/control-plane error does not prove whether PostgreSQL received the request. Independent reconciliation establishes that no foundation installation committed or remains visible/active. No rollback, alternate write path or retry was attempted.

The optional Windows DNS lookup returned Access is denied. Project/connection verification used the explicit project-pinned control plane plus native database identity and exact catalog evidence; no DNS success is claimed. Read-only control-plane calls continued to work after the submission error. Its root cause remains unconfirmed.

## Preserved production state

| Inventory/protection | Before | After |
|---|---:|---:|
| Existing catalog function fingerprints | 296 | 296, exact match |
| Existing trigger definitions/enabled states | 90 | 90, exact match |
| RLS/policy records across schemas | 82 | 82, exact match |
| Storage object policies | 15 | 15, exact match |
| Migration records | 164 | 164, exact full-history match |
| Protected business/Storage/sanitized Auth inventories | 57 | 57, all row counts/content fingerprints match |
| Buckets | 10 | 10 |
| Storage objects | 378 | 378, exact object metadata match |
| Document file projections | 579 | 579 |
| Parent projections | 266 | 266 |
| Organization projections | 92 | 92 |
| Current template references | 13 | 13 |
| News references | 3 | 3 |
| Revision-history references | 2 | 2 |
| Generic reference tokens | 597 | 597 |

All four containment marker triggers, all three document-security triggers, twelve disabled test-mutation RPC definitions and their privileges remain unchanged. The production environment guard is FALSE. No business mutation tests, private binary retrievals, Storage object writes or Auth mutations were performed.

Foundation table/function/trigger fingerprints cannot be supplied as installed: none exist. The expected 14 source/security/ACL records and eight trigger names, together with the preserved actual catalog fingerprints, are in function-trigger-policy-fingerprints.json. No new service-role or browser privileges were installed.

A local reporting filter initially counted only the one namespaced document trigger; its two public-schema trigger functions are also part of the hotfix. The initial local receipt is retained separately, and corrected exact-name evidence is in document-trigger-evidence-correction.json. This was local evidence bookkeeping, not a database discrepancy.

## External receipt and privacy

execution-receipt.json records the exact hash, project, timestamps, single submission, error and independent reconciliation. No database migration receipt was inserted.

Full object/reference evidence is retained only under the existing Git-ignored, operator-ACL-restricted .agent/security/production-storage-review/20261011T113322Z/foundation-execution-20261011T122743Z directory. Public evidence contains counts and fingerprints, not private object paths, credentials, JWTs or signed URLs.

## Next phase decision

**NO-GO for Admin gateway deployment at present: its required production foundation is absent.**

A future attempt requires resolving the control-plane submission failure, fresh separate single-attempt authorization, a fresh exclusive window and all immediate compatibility/inventory checks. The authorized artifact was not changed and must not be automatically retried.

After a successfully verified foundation installation, separately review/authorize the pinned Admin gateway, its server-only credentials and custom-session configuration, compatible frontend and legitimate-access checks. The gateway and frontend must precede restrictive policy cutover.

The broader Storage cutover remains blocked by those dependencies and the documented records-owner decisions for 215 unmatched private objects and 56 unreferenced template objects. Existing permissive policies are unchanged; this failed foundation attempt has not remediated Storage exposure.

No staging changes, gateway/frontend deployment, policy cutover, historical object changes, Auth operations, Git push or unrelated migration replay occurred. The exclusive schema window can now be closed.

