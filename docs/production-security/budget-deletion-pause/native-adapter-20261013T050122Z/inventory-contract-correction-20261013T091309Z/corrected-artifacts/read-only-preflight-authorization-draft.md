# Proposed corrected read-only native preflight authorization

**DRAFT ONLY. Requires separate human approval. This is not an installation authorization or operator-state record.**

> I authorize ONE read-only native budget-pause preflight for project `mqqaykksadotbrghbexz`, host `db.mqqaykksadotbrghbexz.supabase.co:5432`, database/user `postgres`, route `native-pg-direct-tls`.
>
> Use only `docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs`; corrected bundle SHA-256 `58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25`, manifest SHA-256 `562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb`. Require dedicated inventory SHA-256 `459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34` and unchanged production SQL SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`, 11,945 bytes. Do not submit production pause SQL.
>
> I also authorize a narrowly scoped local evidence refresh after exact state/hash/ACL verification: preserve the original hash-named archive, and rename ONLY the current stale control-plane-proof.json with SHA-256 `2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf` to `control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json` inside the same protected root, without overwrite. Require destination absent. Preserve bytes, creation/last-write times, ownership and ACLs; record ordinary OS-managed last-access changes without timestamp repair. Create one fresh active proof from a new authorized control-plane get_project result using create-new semantics. Require exact project, ACTIVE_HEALTHY, direct hostname and five-minute freshness.
>
> Preserve every other operator artifact. Stop on unexpected state. Do not rerun Protect, reset ACLs/timestamps, clear locks/markers, refresh evidence automatically, or create installation authorization/approved-preflight/attempt-marker files. Use the existing secure local environment loader and independently trusted CA. Require certificate-chain and hostname verification, fixed direct route and no TLS/pooler fallback.
>
> Run only --review and --preflight. Require PostgreSQL 17.6, expected identity/privileges, exact original unpaused RPC/catalog, foundation/document/containment protections, 164 migrations, 15 policies and 378 Storage objects. Compare all 57 current entries with the applicable reviewed snapshot; stop on unexplained differences without rebaselining. Preserve sanitized evidence.
>
> No --install, production SQL submission, business/Auth/Storage mutation, destructive RPC call, deployment, Git push, automatic retry or rollback. Stop after read-only reporting. Installation needs a separate approval bound to completed preflight and an exclusive execution window.

This draft was updated locally only. Neither proof refresh nor native connection was performed. The old bundle identifies historical attempts and cannot authorize this corrected bundle.
