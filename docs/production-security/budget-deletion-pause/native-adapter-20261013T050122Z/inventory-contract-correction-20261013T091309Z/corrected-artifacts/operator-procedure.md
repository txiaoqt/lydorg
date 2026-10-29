# Budget deletion pause — corrected inventory preflight procedure

**Local preparation only.** No PostgreSQL connection, `--preflight`, or `--install` occurred during this correction. Earlier procedures are preserved in `inventory-contract-correction-20261013T091309Z/prior-artifacts/`. The failed native attempt remains in `native-readonly-20261013T084554Z/`.

## Reviewed identities

- Project: `mqqaykksadotbrghbexz`.
- Direct host: `db.mqqaykksadotbrghbexz.supabase.co:5432`; database/user: `postgres`; route: `native-pg-direct-tls`.
- Runner: `native-budget-pause-runner.mjs` in this directory; Node `v24.21.0`, pg `8.23.0` with 138 pinned runtime files.
- Bundle SHA-256: `58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25`.
- Manifest SHA-256: `562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb`.
- Budget inventory: `budget-protected-data-readonly.sql`, 13,902 bytes; SHA-256 `459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34`.
- Approved production pause SQL remains 11,945 bytes; SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`. Read-only mode never submits it.

The original foundation inventory is pinned separately as a preservation reference and is never executed by this adapter. The budget copy differs only by terminal `COMMIT` to `ROLLBACK`. All executable verifiers declare their result key, timeout and ROLLBACK contract. Input loading validates these before connection. Inventory result parsing keeps the row's `read_only` field alongside its 57-entry array.

## Preserve both existing proofs

The fixed root `%USERPROFILE%\.ytrace-production-budget-deletion-pause` contains exactly:

1. `control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json`.
2. `control-plane-proof.json`, recorded SHA-256 `2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf`.

Both are stale. Neither was refreshed, renamed, removed, opened for content, or rehashed in this correction. Metadata and ACL comparisons are recorded separately. Do not rerun Protect, reset ACLs/timestamps, clear a lock/marker, or repeat the original archival rename.

## Separately authorized future proof refresh

These steps are proposed only and need explicit authorization:

1. Verify the corrected bundle/manifest and every pin. Verify root and both proof ACLs read-only. Require the expected two files and absence of authorization, approved-preflight, operation lock, attempt marker and unexpected evidence. Verify both recorded proof hashes and preserved creation/last-write times; distinguish ordinary OS-managed access time from timestamp repair.
2. Require destination `control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json` absent. After approval, rename only the exact stale active proof to that destination inside the same root, with no overwrite. Preserve bytes, ownership, ACL, creation and last-write times. Keep the original archive intact.
3. Obtain a new authorized control-plane get_project result for the exact healthy project/direct host. Create one new active proof with create-new semantics, UTF-8 without BOM, containing only `project`, `host`, `status`, `verifiedVia`, `verifiedAt`. Verify ACL and hash.
4. Complete one native preflight within the proof's five-minute validity window. Stop on expiry or unexpected state; no overwrite, automatic refresh, retry or baseline adoption.

The ACL helper is unchanged: Protect accepts only the fixed root; Verify accepts the root and bounded direct child artifact names. No arbitrary SQL/endpoint argument exists.

## Commands after separate read-only approval

Use the existing private environment mechanism; never display its contents or credential values. Verify independent CA provenance and fingerprint before connection.

```powershell
$node = Join-Path (Get-Location) '.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe'
$runner = 'docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs'
& $node $runner --review
& $node --env-file=.env.foundation.local scripts/security/verify-foundation-environment.mjs
& $node --env-file=.env.foundation.local $runner --preflight
```

Require certificate-chain/hostname verification, the fixed direct route, PostgreSQL 17.6, expected role/privileges, exact original unpaused RPC/catalog, 164 migrations, 15 policies, 378 objects and foundation/document/containment fingerprints. No pooler fallback or disabled TLS verification.

The preflight captures 57 inventories. Capture does not approve their contents. Independently compare every entry with the applicable reviewed snapshot (`../20261012T165000Z/protected-data-readonly.json`, historical SHA-256 `2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc`); stop on unexplained drift without rebaselining. Do not copy a result to approved-preflight.json under read-only approval.

The previous incomplete attempt supplies no completed current TLS/catalog/57-inventory verification. Installation remains NO-GO pending successful fresh preflight, separate installation authorization and an exclusive drained execution window. No runnable installation authorization is prepared here.
