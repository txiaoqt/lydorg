# Budget deletion pause — prepared native operator procedure

**Preparation only.** This procedure is documentation for a later, separately authorized run. No production connection or SQL installation was performed while preparing it.

## Pinned scope

- Project: `mqqaykksadotbrghbexz`
- Direct PostgreSQL endpoint: `db.mqqaykksadotbrghbexz.supabase.co:5432`
- Database and role: `postgres`
- Route: `native-pg-direct-tls`
- SQL: `docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql`
- SQL SHA-256 and size: `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`, 11,945 bytes
- Target: `public.admin_bulk_delete_budget_requests(text,uuid[])`
- Adapter bundle SHA-256: `01b42ba7f4ff814cfbd6aa622504ffb5da03c27cbe2f2c102212f46763b5559f`
- Adapter manifest SHA-256: `cdd186cc57911774f8f1a67d7a4cdd78c928b761c9dacbec041841bf38ec32eb`
- Existing foundation structure SHA-256 pinned for preservation: `eb9bf6a418438358fc9b6e8e72208e4b3ade1d798ac04fe91c7eb58c2b5063d9`

The SQL file stays outside migration replay. It keeps its original `BEGIN`/`COMMIT`, 1-second lock timeout and 30-second statement timeout. It is submitted as one simple-query message by one `pg.Client`; the runner has no arbitrary SQL, endpoint, project or retry options.

## Commands for a future read-only preflight

Run from the repository root in Windows PowerShell. These commands are instructions only; none of the preflight commands below was run in this preparation task.

```powershell
$node = Join-Path (Get-Location) '.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe'
$runner = 'docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/native-budget-pause-runner.mjs'
$acl = Join-Path (Get-Location) 'docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/operation-acl.ps1'
$state = Join-Path $env:USERPROFILE '.ytrace-production-budget-deletion-pause'
```

First confirm the state path does **not** already exist. If it exists, stop and preserve it for read-only inspection; do not reset its ACL or remove any lock/marker. On a first, empty state path only, create and protect it with the reviewed helper:

```powershell
if (Test-Path -LiteralPath $state) { throw 'Existing operation state: stop and preserve it' }
& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $acl -Action Protect -Path $state
```

Obtain a new, independent Supabase Control Plane project read for `mqqaykksadotbrghbexz`. Save the sanitized project/host/status/method/time proof as `$state\control-plane-proof.json` using UTF-8 **without BOM**. Do not put an access token or API key in the proof. The runner requires the proof to be no more than five minutes old.

Use the previously configured root `.env.foundation.local` only through Node's environment-file loader. Do not print the file or variable values. Validate presence and the independently trusted CA file fingerprint, then perform offline review and the read-only preflight:

```powershell
& $node --env-file=.env.foundation.local scripts/security/verify-foundation-environment.mjs
& $node $runner --review
& $node --env-file=.env.foundation.local $runner --preflight
```

`verify-foundation-environment.mjs` reports only variable-presence flags and whether the CA hash matches; the expected CA SHA-256 must still be independently trusted. `--preflight` uses native TLS with chain and hostname verification, a read-only database identity query, the exact catalog verifier, all 57 protected inventory rows, and the installed foundation verifier. It writes a sanitized local preflight record; it does not install SQL.

Require the exact pinned project, endpoint, PostgreSQL 17.6 identity, authorized TLS 1.2/1.3 socket, catalog fingerprint, 164 migration history, 15 Storage policies, unchanged containment/document guards, exact original RPC and all 57 inventory fingerprints. Also require zero active budget-deletion calls and zero competing budget-install sessions. Any mismatch stops the process; do not rebaseline in the execution window.

Only after independent human review of the generated preflight may an operator copy that exact record to `$state\approved-preflight.json`. A separate explicit human authorization is then required. The authorization must bind the current bundle hash, CA hash, control-plane proof hash, approved-preflight file hash and state fingerprint; be short-lived (at most 30 minutes); confirm the exclusive window and drained existing deletion requests; and authorize this exact SQL/project/route only. The in-repository `authorization-draft.json` is deliberately invalid and must not be copied into the operator state directory.

## Later single-attempt installation

Only after a separate authorization is granted and valid local authorization/preflight files have been supplied:

```powershell
& $node --env-file=.env.foundation.local $runner --install
```

Immediately before submission, the runner repeats the project/catalog/function/privilege/57-inventory/foundation checks, checks quiescence, validates all local proofs and the ACL, and claims the budget-specific exclusive lock. It persists and verifies the durable attempt marker before calling `client.query()` exactly once with the byte-verified SQL. It does not append SQL, insert a migration receipt, use a pool, reconnect, retry or issue a rollback statement.

Require a `COMMIT` acknowledgement and successful postflight before a normal success report. The postflight verifies the target function's OID/contract/grants, catalog, all 57 inventories, foundation fingerprints, 164 migration history and 15 Storage policies. It does not modify Storage policies or business data.

## Failure and uncertain outcome

- A failed preflight releases only the lock owned by the current process and creates no attempt marker.
- Once the marker is consumed, the lock and marker are retained on every uncertain or post-commit verification failure. Never clear either automatically.
- If the SQL response is lost or ambiguous, do not rerun `--install`. Preserve the backend PID/start time, application name, marker and sanitized receipt.
- After a fresh independent control-plane proof, the separately read-only reconciliation mode may be used for evidence collection:

  ```powershell
  & $node --env-file=.env.foundation.local $runner --reconcile
  ```

  It uses a separate read-only connection, first verifies the original backend has finished, then compares the exact old/new function/catalog state and preservation fingerprints. It writes a local reconciliation record, does not release the lock, and always stops for human review. `NOT_INSTALLED_VERIFIED` is **not** permission to retry.
- Never restore the vulnerable deletion function as rollback. If COMMIT succeeded but postflight failed, retain the pause and prepare a separately reviewed forward correction.

## Sanitized authorization wording for a later request

> I authorize ONE controlled production installation of `docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql`, SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a` (11,945 bytes), against production project `mqqaykksadotbrghbexz` using native direct TLS to `db.mqqaykksadotbrghbexz.supabase.co:5432`, database/user `postgres`, and adapter bundle SHA-256 `01b42ba7f4ff814cfbd6aa622504ffb5da03c27cbe2f2c102212f46763b5559f`. Require a fresh independently verified project proof and read-only preflight, exact catalog and 57-inventory preservation, current CA fingerprint, exclusive drained window, and a single atomic SQL submission with the original timeouts. Stop on any drift or uncertain result; never retry automatically. This authorizes only the named budget deletion pause, with no Storage policy, Auth, frontend, business-record, migration-history, or unrelated database changes.

The live CA fingerprint, control-plane proof, approved-preflight hash/state fingerprint, authorization reference and short approval window must be reviewed and bound locally before any later installation. They are not known or approved by this local preparation.
