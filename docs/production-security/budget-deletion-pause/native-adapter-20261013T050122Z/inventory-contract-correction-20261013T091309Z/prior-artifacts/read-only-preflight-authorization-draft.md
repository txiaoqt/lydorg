# Proposed read-only native preflight authorization

**DRAFT ONLY — not an approval or a runnable installation record.** This wording requires explicit human approval. It does not authorize installation or approve any changed production data.

> I authorize ONE READ-ONLY native budget-deletion-pause preflight against Supabase project `mqqaykksadotbrghbexz`, direct host `db.mqqaykksadotbrghbexz.supabase.co`, port 5432, database/user postgres, route native-pg-direct-tls.
>
> Use only `docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs`, corrected bundle SHA-256 `0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9`, manifest SHA-256 `8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8`, and unchanged SQL SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a` (11,945 bytes). The SQL must not be submitted.
>
> I also authorize the narrowly scoped local proof refresh: after exact state, hash and ACL verification, rename the existing stale proof with SHA-256 `0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd` to `control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json` inside the same protected state root, with no overwrite. Preserve and verify its bytes, ACLs and timestamps. Then create one fresh active `control-plane-proof.json` from authorized current Supabase control-plane evidence using create-new semantics. Stop if the existing proof, state contents or destination differs.
>
> Preserve the state directory and every other record. Do not rerun Protect, reset ACLs, clear locks or markers, create an installation authorization, or copy a result to approved-preflight.json. Use only the existing secure local credential loader and independently trusted CA fingerprint. Require full TLS chain/hostname verification and the exact direct endpoint; no fallback route.
>
> Run only --review and --preflight. Require PostgreSQL 17.6, expected role/privileges, exact original unpaused RPC/catalog, installed foundation/document/containment protections, 164 migrations, 15 Storage policies, 378 objects, and all 57 inventory entries. Compare fresh inventory evidence with the applicable reviewed snapshot; stop on unexplained drift without rebaselining. Preserve sanitized evidence.
>
> No --install, SQL submission, production mutation, destructive RPC test, Auth/Storage change, gateway/frontend deployment, Git push, automatic retry, or rollback is authorized. Stop after read-only reporting. Installation needs a later approval bound to the verified preflight and a fresh exclusive execution window.

The proof-history operation is proposed here and was not performed during the correction. If this local archival scope is not approved, the stale fixed-name proof remains an execution blocker; do not overwrite it.
