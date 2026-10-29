# Future native single-attempt operator procedure

**Not authorized for execution by this preparation task.** Current status: native connection BLOCKED. Do not create an active approval record or invoke `--install` until the required independent review, native read-only checks and new production authorization have been completed.

## 1. Independent identity and credential prerequisites

Verify the project through the authenticated Supabase control plane: `mqqaykksadotbrghbexz`, name `lydo-org-focused`, `ACTIVE_HEALTHY`, direct host `db.mqqaykksadotbrghbexz.supabase.co`.

Pinned connection: TLS to that host, port 5432, database/user `postgres`; route `native-pg-direct-tls`. No pooler, production-linked CLI, `apply_migration`, `db push` or alternate endpoint fallback. A different route requires new review and authorization.

Provide these variables only to the trusted local PowerShell/Node process:

- `YTRACE_PRODUCTION_DB_PASSWORD`: correct PostgreSQL account password, entered with secure interactive input or supplied by an approved secret manager. Never place it in shell history, command arguments, a tracked file or chat.
- `YTRACE_PRODUCTION_DB_CA_FILE`: absolute path to the correct CA certificate obtained through an authenticated trusted source for this connection.
- `YTRACE_PRODUCTION_DB_CA_SHA256`: independently verified SHA-256 of the exact certificate bytes. Hashing an unauthenticated download alone does not establish trust.

The runner does not load `.env`. A separate terminal's process variables are not automatically inherited by Codex or another existing terminal: run the commands in the same trusted process/environment. Do not use anon/service-role API keys as database passwords. Do not disable TLS verification or change the pinned host to work around a failure.

Confirm local Node/`pg` availability and driver version `8.23.0`. Confirm direct endpoint network/IPv6 reachability without switching routes. Keep credentials out of screen recordings and process/configuration dumps. Remove the password from the process environment when finished.

## 2. Review and read-only connection checks

From `C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused`:

```powershell
node docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-foundation-runner.mjs --review
```

Require SQL length `47407`, SHA-256 `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2`, and reviewed runner bundle SHA-256 `69b01be6d530fc0539a44e05fa38c2962fa1b6cae289e063f77076a5518c61af`. This command is offline, not a connection test.

Run the original supported read-only probe, unchanged:

```powershell
node docs/production-security/storage-cutover/diagnostics/20261011T125750Z/native-postgres-readonly-probe.mjs
```

Require PASS for authentication, read-only transaction, verified TLS and foundation absence. Stop on missing credentials, certificate, network or identity failure. No automatic connection retries. The optional original `--same-size` probe is read-only but is unnecessary unless payload handling needs a specific additional diagnostic.

After a **fresh independent** control-plane project lookup, save its sanitized evidence at the fixed ignored path:

`.agent/security/production-storage-review/native-foundation-control-plane.json`

Use `control-plane.template.json` as a shape only; fill the actual UTC `verifiedAt`. It must be at most five minutes old at both checks. The template and this report are not a live proof. The local record documents the trusted operator's lookup; it is not a signed Supabase attestation or database authorization substitute.

```powershell
node docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-foundation-runner.mjs --preflight
```

Require actual native TLS certificate-chain/hostname validation, authorized socket/peer fingerprint, server version 17.6 (`170006`), exact identity, roles and privileges. Require all reviewed catalog and data gates:

- 164 migrations, latest `20261011230000`, history MD5 `1f5eca911f6e2057ae070a955eaca3dc`.
- Compatibility SHA-256 `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`.
- Existing containment/document protections and owner/grant/default-grant definitions intact; foundation namespace/RPCs/triggers absent; no competing operations/locks.
- Exact reviewed 57 protected-relation fingerprints, 378 objects, 10 buckets and 15 unchanged Storage policies.

Any drift, including ordinary new records, requires review. Never update the manifest or weaken a comparison just to proceed. Native read-only PASS is a prerequisite to requesting installation authorization, not permission to install.

## 3. New independent authorization and exclusive window

Obtain a **new human production authorization** naming:

- Project `mqqaykksadotbrghbexz` and exact pinned native endpoint/route `native-pg-direct-tls`.
- SQL SHA-256 `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2`, length 47407.
- Independently reviewed runner bundle and CA hashes.
- Exactly one attempt with original transaction/timeouts and no migration receipt insertion.
- Exclusive low-traffic window; no competing migrations, role/grant changes, repairs, foundation utilities or relevant data/Storage writes until verification ends.

Database activity checks and local locks cannot guarantee other operators remain quiescent. Obtain their confirmation. An installation marker is already-consumed evidence, not a transient lock to clear for convenience.

Only after that approval, a trusted operator may complete `authorization.template.json` at the fixed ignored path:

`.agent/security/production-storage-review/native-foundation-authorization.json`

Set `approved: true`, actual reference, UTC approval/expiry (maximum 30-minute window), `exclusiveWindowConfirmed: true`, and reviewed hashes. No extra fields. Do not infer authorization from a local JSON flag. Independently preserve the actual human authorization. Refresh control-plane evidence if needed before invocation.

Before invoking the installer, confirm both are absent:

- `.agent/security/production-storage-review/native-foundation-attempt-started.json`
- `.agent/security/production-storage-review/production-storage-foundation.operation.lock.json`

If present, stop for ownership/outcome reconciliation. Never remove another process's lock or reset an attempt marker. Restrict the local state directory to trusted operators; `.gitignore` and POSIX-style creation mode alone do not establish Windows ACL security.

## 4. Future one-attempt execution — separate authorization required

**Do not run this command in the current preparation task.** Following the preceding approvals and checks only:

```powershell
node docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-foundation-runner.mjs --install
```

The runner acquires the shared exclusive operation lock, opens one TLS `pg.Client`, reruns immediate explicit read-only checks, verifies unchanged/fresh operator records, saves preflight evidence, persists the attempt marker and submits the exact reviewed SQL once. It preserves SQL's `BEGIN`/`COMMIT`, 1-second lock timeout and 30-second per-statement timeout. It does not append SQL, insert a migration receipt, pool, reconnect or retry.

Allow the process to finish; no external watchdog should resubmit on a slow response. Check its status and uniquely named evidence under `docs/production-security/storage-cutover/native-executions/`. `COMMITTED_AND_VERIFIED` is the sole success status. Postflight verifies exact foundation functions/ACLs, four RLS tables, eight enabled triggers, origin/canonical asset behavior, existing protections, migration count 164 and protected data/policy/object fingerprints.

Preserve external receipt, preflight/postflight files and their hashes securely. Independently reconcile the committed catalog read-only through a trusted connection. The receipt must record project, SQL hash, timestamp, transaction outcome and catalog evidence. No production business mutation is needed merely to demonstrate denial.

## 5. Stop, reconcile and recover

| Outcome | Required response |
| --- | --- |
| Failure before submission | No installer SQL was sent. Resolve only the specific prerequisite after review; do not reinterpret it as authorization for a different route/artifact. |
| Known SQL ERROR and acknowledged rollback | Keep attempt/lock evidence. Independently verify original catalog and data read-only. A new attempt requires review and separate authorization. |
| Lost connection, missing COMMIT acknowledgement, timeout or receipt uncertainty | Assume unknown outcome. Never retry. Preserve marker/lock and inspect authoritative state read-only. |
| COMMIT acknowledged, postflight failed | Treat as committed. Preserve evidence, existing protections and fail-closed posture. Prepare a separately reviewed forward correction. |
| COMMITTED_AND_VERIFIED | Owned lock is released; attempt marker remains. Stop after foundation verification. Gateway, frontend and restrictive cutover need separate approvals. |

The runner does not restore vulnerable definitions, delete objects, change policies or undo committed internal foundation state. A reviewed forward correction or operational pause is the recovery path. Do not bypass marker/lock protection or replay broad migrations.

## Scope after success

Foundation only. Existing permissive Storage policies are intentionally unchanged; this does not by itself close the Storage exposure. Production Admin gateway, compatible frontend, historical-file decisions and restrictive policy cutover remain separately reviewed releases. No staging, Auth, historical-object or frontend work is included here.
