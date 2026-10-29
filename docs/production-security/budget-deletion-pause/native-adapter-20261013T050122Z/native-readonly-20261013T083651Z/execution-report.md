# Corrected native read-only preflight — stopped during local proof preservation

**NO-GO for installation authorization. No native PostgreSQL connection or preflight occurred.** The one authorized proof rename completed, but the all-timestamps preservation condition failed.

## Actual results

- Artifact verification and offline --review: PASS; corrected bundle and manifest matched the exact authorization.
- Existing root/proof ownership and effective ACL verification: PASS.
- Secure local environment and CA byte/fingerprint validation: PASS. The CA fingerprint matched the previously independently verified production CA. Credentials and certificate contents were not printed.
- Local archival rename: completed exactly once. The active filename is absent; the sole state file is the approved hash-named archive. No overwrite, reset or cleanup occurred.
- Archive bytes/hash, creation time, last-write time and security descriptor: PASS; the archive remains 200 bytes with SHA-256 0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.
- Archive ACL verification through the corrected helper: PASS.
- Last-access timestamp preservation: FAIL. Before: 2026-10-13T08:38:40.0970190Z; observed after reconciliation: 2026-10-13T08:39:44.3840509Z.
- Windows filesystem policy reports DisableLastAccess=2: system-managed last-access updates enabled. The isolated difference is consistent with normal access-time updates from file inspection/hashing; the exact triggering read/rename event was not separately instrumented.
- Fresh control-plane proof, native TLS/server identity, RPC/catalog, 57-inventory comparison, foundation/security preservation, and current migration/policy/object counts: NOT TESTED because execution stopped before these phases.

## Exact committed local state

The protected directory contains only control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json. No active proof, authorization, approved-preflight, operation lock or installation attempt marker exists. Original proof bytes, creation/modification timestamps and security descriptor remain intact. Last-access time was not restored. No automatic retry or rollback occurred.

## Reviewed identities

- Bundle: 0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9.
- Manifest: 8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8.
- SQL: a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a; 11,945 bytes. No adapter, manifest or SQL implementation was modified.

## Required continuation scope

A revised read-only authorization must acknowledge the already-completed rename and explicitly permit ordinary OS-managed last-access timestamp changes while requiring unchanged bytes, creation/last-write times, ownership and ACLs. Continue from the archived proof; do not rename again or reset the state directory. After fresh exact state verification, create a new active proof from current control-plane evidence and run the same reviewed preflight once. Do not repair timestamps automatically.

A successful later preflight must still compare all 57 inventories with the applicable reviewed snapshot without adopting drift. A separate installation authorization and exclusive drained execution window remain required. This stop receipt approves neither.
