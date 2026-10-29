# Budget deletion pause — corrected read-only preflight procedure

**Preparation only.** The ACL correction and offline tests are complete. No PostgreSQL connection, `--preflight`, or `--install` was executed in this correction task. The previous procedure and artifacts are preserved in `acl-correction-20261013T080046Z/prior-artifacts/`.

## Exact reviewed identities

- Production project: `mqqaykksadotbrghbexz`.
- Direct endpoint: `db.mqqaykksadotbrghbexz.supabase.co:5432`; database/user: `postgres`; route: `native-pg-direct-tls`.
- Adapter: `native-budget-pause-runner.mjs` in this directory.
- Adapter bundle SHA-256: `0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9`.
- Input manifest SHA-256: `8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8`.
- Approved SQL: 11,945 bytes, SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`. The SQL is unchanged and is never submitted by read-only preflight.

## Preserve the existing operator state

The fixed state directory already exists at `%USERPROFILE%\.ytrace-production-budget-deletion-pause`. Do not rerun `Protect`, reset its ACL, clear files, or reuse locks/attempt markers. The correction task left the directory and proof byte-identical, including ownership, ACLs and last-write times.

Its one existing file is the stale `control-plane-proof.json`, SHA-256 `0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd`. It must not be used as fresh evidence.

A future authorization must explicitly cover the following local evidence refresh. These are proposed steps, not actions performed in this task:

1. Verify the corrected bundle and all pinned inputs. Verify the existing state root and proof through the corrected CLI. Require the exact preserved proof hash, safe ACLs, and absence of authorization, approved-preflight, lock and attempt files. Stop on any unexpected file or difference.
2. Resolve source and destination inside the fixed root. Require the destination `control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json` to be absent.
3. Rename only the exact stale proof to that hash-named history file, without overwrite. Preserve its bytes, ACL and timestamps; verify the archived SHA-256 and the helper's `Verify` result. This preserves the original evidence and makes the active filename available.
4. Obtain a fresh authorized Supabase Control Plane `get_project` result. Require the exact project, ACTIVE_HEALTHY and direct database host. Create a new `control-plane-proof.json` using create-new semantics and UTF-8 without BOM. It must contain only project, host, status, verifiedVia and verifiedAt. Do not include credentials. Verify its ACL.
5. Stop on an unexpected result. Do not automatically redo the rename, overwrite either proof, reset state, or treat an existing destination as permission to continue.

`Verify` permits the exact root, the five fixed runner artifacts, the runner's bounded generated evidence names, and `control-plane-proof-history-<64-hex-SHA-256>.json`. Historical proof files are not read as authorization by the runner. `Protect` still permits only the exact fixed root. There is no test-root or arbitrary-path CLI override.

## Future read-only commands

These commands require a fresh separate authorization naming the corrected identities and the local evidence refresh above. Run from the repository root with the existing private environment file; never display its contents or supplied values.

```powershell
$node = Join-Path (Get-Location) '.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe'
$runner = 'docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs'
& $node $runner --review
& $node --env-file=.env.foundation.local scripts/security/verify-foundation-environment.mjs
& $node --env-file=.env.foundation.local $runner --preflight
```

Require independent CA provenance and its exact fingerprint, certificate-chain and hostname verification, PostgreSQL 17.6, expected identity/privileges, exact original budget RPC/catalog, 164 migrations, 15 policies, 378 objects and supplemental foundation/containment/document protection fingerprints. The control-plane proof expires after five minutes.

The adapter captures exactly 57 inventory fingerprints; a fresh capture does not automatically approve changed data. Compare the evidence to the applicable reviewed snapshot, investigate differences, and stop on unexplained drift. Do not copy a result to `approved-preflight.json` or create an installation authorization under read-only approval.

A later installation still requires its own explicit authorization, reviewed preflight bindings, a fresh exclusive drained window, and all one-attempt protections. This procedure grants none of those permissions. The non-runnable installation template remains `approved:false`.

See `read-only-preflight-authorization-draft.md` for proposed approval wording and `readiness-report.md` for actual offline evidence.
