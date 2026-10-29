# Budget deletion pause — independent production authorization required

## Scope

One existing function: `public.admin_bulk_delete_budget_requests(text,uuid[])`. The candidate is outside `supabase/migrations/`. It has no migration receipt, new grants, triggers, business-record writes, frontend deployment or Storage changes.

Exact SQL: `budget_deletion_pause_production.sql`.

SHA-256: `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a` (11,945 UTF-8 bytes).

## Before any later installation

1. Obtain separate authorization naming the exact production project, SQL hash, fixed native direct TLS route and one attempt. This preparation is not that authorization.
2. Independently verify Supabase project `mqqaykksadotbrghbexz`, endpoint `db.mqqaykksadotbrghbexz.supabase.co`, trusted CA, TLS chain/hostname and PostgreSQL 17.6. Use the trusted operator process; do not read secrets into chat or logs. Do not use the production-linked CLI or the consumed Storage foundation installer.
3. Rehash the SQL bytes. Preserve the external receipt, exclusive lock and durable attempt marker for this separate operation. Review a dedicated execution adapter if required; none is activated or authorized by this task.
4. Obtain an exclusive low-traffic schema/protected-data window. Stop/drain existing budget-deletion requests, including stale browser tabs. A catalog snapshot cannot prevent an already-running old function from completing. Exclude competing migrations, grant changes, Admin session timestamp writes and financial/business/Storage mutations through verification.
5. Run `pre-install-readonly.sql` and the existing 57-inventory read-only capture. Require the exact catalog, original OID/contract, owner/ACL, production origin, 164 migrations and 15 policies. Record fresh immediate protected-data fingerprints. Do not silently adopt the proposed baseline or overlook unexplained drift.
6. Require the pause to be absent and no competing pause operation. Verify original definition MD5 `f6c36316ba941c9e0f76674754ac44ba`, source MD5 `eb7b756964fd31efebfb39749f5c9e5b`, OID 32925 from this read-only snapshot (reverify immediately).

## One atomic submission

Submit the exact file once, preserving BEGIN/COMMIT, 1-second lock timeout and 30-second per-statement timeout. Do not split, append receipts, use `db push`, replay migrations or automatically retry. The transaction pins the original contract and full reviewed catalog, records eight protected relation digests in transaction-local settings, replaces only the function and requires the projected catalog and data digests before COMMIT.

## Afterward

Run `post-install-readonly.sql`. Compare all 57 immediate before/after inventories. Require the original OID, exact new definition/source MD5 and unchanged signature, owner, ACL, search path, volatility, parallel mode, strictness and return type. Require the new catalog hash, unchanged 164 migrations, 15 policies, 378 objects and existing protections. No production mutation RPC test is included in this authorization template.

The in-transaction row digests are eight relations: budget requests/files, liquidation reports/files, notifications, audits, Admin sessions and Storage objects. The separate 57-inventory comparison covers broader preservation. Neither is permission to rebaseline unexplained concurrent writes.

## Failure/recovery

A known pre-COMMIT failure must roll back. Reconcile catalog and data read-only. An ambiguous response consumes the attempt: inspect authoritative state and stop, with no retry. After a successful COMMIT, retain the pause while preparing any separately reviewed forward correction. Never restore the permissive deletion function as a rollback. Frontend recovery must retain the disabled action and gateway integration.

## Narrow authorization template

> I authorize ONE controlled production installation of `docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql`, SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`, on Supabase `mqqaykksadotbrghbexz` through the independently verified native direct TLS route only. Require fresh exact preflight, an exclusive drained execution window, a durable single-attempt receipt and atomic submission. Verify function/catalog/data preservation read-only after installation. Stop on drift or uncertain outcome. This authorizes the server-side budget deletion pause only; no frontend release, Storage policy cutover, Auth/business mutation, grants, gateway changes or unrelated SQL is authorized.
