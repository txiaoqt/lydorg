# Native PostgreSQL foundation readiness

Date: 2026-10-11. Project: `mqqaykksadotbrghbexz`.

**Decision: NO-GO for installation now.** Offline runner preparation passed. Native authentication, certificate validation, network connectivity and current SQL/catalog readiness remain **BLOCKED**. Installation mode was not activated. No production or staging SQL writes, deployment, Auth operation or Git push occurred.

## Actual connection evidence

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| Independent project/endpoint lookup | PASS | Supabase control-plane `get_project` returned `lydo-org-focused`, `ACTIVE_HEALTHY`, direct database host `db.mqqaykksadotbrghbexz.supabase.co`, platform version `17.6.1.127`. This is endpoint evidence, not a native database connection. |
| Existing native read-only probe | BLOCKED | `native-postgres-readonly-probe.mjs` returned three missing environment variables and `connectionAttempted: false`. |
| Verified CA and native TLS identity | BLOCKED | No CA file/hash supplied; no handshake, hostname verification result or live certificate fingerprint obtained. |
| Native PostgreSQL account/version/privileges | BLOCKED | No native login. Expected `postgres` / database `postgres`, PostgreSQL 17.6, remain unverified over this route. |
| Fresh native catalog, inventories and foundation absence | BLOCKED | No native SQL submitted. Previous control-plane reconciliation is historical evidence only. |
| Offline artifact and runner review | PASS | Exact SQL bytes/hash and all eight fixed reviewed inputs match. |
| Local tests | PASS | 28 passed, 0 failed; coverage and limitations below. |

Missing variables in the actual task process:

- `YTRACE_PRODUCTION_DB_PASSWORD`: the account-specific PostgreSQL password, not an anon/service-role/API key.
- `YTRACE_PRODUCTION_DB_CA_FILE`: absolute path to the independently authenticated CA certificate file.
- `YTRACE_PRODUCTION_DB_CA_SHA256`: independently reviewed SHA-256 of that exact CA file.

No `.env` was loaded or inspected for passwords. Credentials must be supplied to the trusted server-side process through its environment; never put them in chat, source, command arguments or receipts. The separate operator procedure describes the prerequisites. If the pinned direct endpoint cannot be reached, stop: a pooler or alternate route requires separate review.

## Pinned artifacts and baseline

SQL: `docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql`.

| Artifact / baseline | Value |
| --- | --- |
| SQL byte length | `47407` |
| SQL SHA-256 | `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2` |
| Runner bundle SHA-256 | `69b01be6d530fc0539a44e05fa38c2962fa1b6cae289e063f77076a5518c61af` |
| Native driver pin | `pg` `8.23.0` |
| Expected existing catalog SHA-256 | `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5` |
| Expected migration history | 164; latest `20261011230000`; complete MD5 `1f5eca911f6e2057ae070a955eaca3dc` |
| Expected preserved inventory | 57 relation fingerprints; 10 buckets, 378 objects, 15 Storage policies |

The bundle hash covers the reviewed-input manifest and both executable source files. The manifest pins all eight input file paths, lengths and hashes. It does not make local files tamper-proof; an independent reviewer must confirm the bundle hash before future authorization.

The inventory and catalog values above are **expected gates from preserved prior evidence**, not newly measured production SQL results. The native runner refuses drift, including legitimate intervening business-data changes; it does not silently regenerate or accept a baseline. If drift occurs, review and rebaseline before any authorization.

## Runner review

Files: `native-foundation-runner.mjs`, `runner-core.mjs`, `native-identity-privileges-readonly.sql`, `reviewed-inputs.json`.

- Fixed project, direct host, port 5432, database/user `postgres` and route `native-pg-direct-tls`. No arbitrary SQL, project, endpoint or connection-string arguments.
- Default `--review` is offline. `--preflight` uses only explicit read-only transactions. Future `--install` requires a new scoped human authorization, fresh control-plane proof and exclusive window; no active authorization record was created.
- One `pg.Client`, one connection attempt, no pool, reconnect/resubmission or retry logic. Credentials are never printed or persisted. Raw driver errors, SQL error details and notices are not logged.
- CA file hash check; certificate-chain and hostname verification enabled with `rejectUnauthorized: true` and the exact `servername`. Conflicting environment overrides and disabled TLS verification are rejected. The real socket must be encrypted and authorized; its public certificate fingerprint is recorded after login.
- Actual native identity must match PostgreSQL 17.6, `postgres`, TLS 1.2/1.3 and required roles/privileges. Existing function ownership is preserved: 251 `postgres`, 45 `supabase_admin` in the pinned catalog scope. Eight trigger-target ownership/privilege checks are included.
- The existing same-machine foundation operation lock is acquired exclusively and checked before submission. Foreign/stale locks are never cleared automatically. This cooperative lock cannot exclude another computer; the human exclusive window remains required.
- A fixed write-once attempt marker is file-synced before submission and retained permanently. It prevents automatic retry even if the connection fails. Windows file durability and ACLs still depend on the host/filesystem; keep the ignored state directory restricted to trusted operators.
- Exact UTF-8 SQL is submitted once as one simple-query message. No splitting, normalization, appended SQL or receipt insertion. Original `BEGIN`/`COMMIT`, 1-second lock timeout and 30-second per-statement timeout remain unchanged. No client query deadline can cause automatic resubmission.
- Postflight requires 14 exact function definitions/ACLs, eight enabled trigger bindings, four private RLS tables, exact trusted origin, canonical template/news resolution, unchanged existing catalog/policies and all protected data fingerprints. The Admin authorization RPC stays service-role-only. Deliberate browser helper EXECUTE permissions remain as reviewed; the runner does not claim every foundation helper is private.
- Migration history must remain 164. Unique external preflight, postflight and execution-receipt files record SQL/bundle/CA/proof hashes, project, timestamps, native identity and outcome, without passwords or tokens.
- Missing COMMIT acknowledgement or a connection-related failure is **uncertain**, never success or permission to retry. Known SQL errors permit only rollback; independent read-only reconciliation is still required. A committed installation with failed postflight is explicitly marked committed and stops for forward review. Uncertain/failed verification retains the lock and attempt evidence.

Native PostgreSQL SSL uses the driver's supported TLS configuration; transactions must stay on one client. Direct connections may require IPv6 connectivity, which has not been tested here. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres), [node-postgres SSL](https://node-postgres.com/features/ssl) and [node-postgres transactions](https://node-postgres.com/features/transactions).

## Local validation

Command, from the repository root:

```powershell
node --test docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-runner.test.mjs docs/production-security/storage-cutover/native-runner-20261011T132539Z/transaction.local.test.mjs
```

**28 PASS / 0 FAIL** in `focused-tests.tap`:

| Coverage | Count / evidence level |
| --- | --- |
| Credential/CA/configuration, endpoint, hash, catalog/data drift, approval freshness, locks, attempt marker, one submission, ambiguous/error outcomes, sanitized errors, postconditions and CLI modes | 25 offline tests; mocked database/TLS failures plus Node's real hostname verifier and local filesystem/child-process checks |
| Commit and read-only enforcement; DDL/row rollback after injected failure; untouched candidate rejection by its actual catalog gate with rollback and no retry | 3 isolated PostgreSQL tests using existing PGlite 0.5.8 / PostgreSQL 18.3, in memory |

The initial isolated run had one failed **new test expectation** because it assumed PostgreSQL 17 rather than the local runtime's actual 18.3. That result is preserved in `local-postgres-first-run.json`; the local engine expectation was corrected explicitly. The production 17.6 identity guard was retained. The final 28/28 result does not prove production TLS, native `pg` transport or PostgreSQL 17.6 integration.

Node syntax checks passed for the two executable source files. Final whitespace/artifact/working-tree checks are recorded in `final-workspace-checks.json`. No frontend changes were made; TypeScript, Vite and application Vitest were not rerun for this runner-only task. Completed PWA/renewal tests were not repeated.

## Scope preservation and next decision

Branch `ui-refactor`; HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. The tree was already extensively dirty; this task adds only the `native-runner-20261011T132539Z` review folder and preserves earlier application/security work, SQL candidates and reports. No real installation marker, operation lock or authorization file was created.

**Offline preparation: PASS for independent review. Native installation: NO-GO now. Future procedure: CONDITIONAL GO** only after all of the following:

1. Independently authenticated CA/password are available to the trusted process and native read-only TLS/server/catalog checks actually pass.
2. Exact SQL and runner/input hashes are independently reviewed, including the native route, strict inventory gates and recovery behavior.
3. A fresh exclusive low-traffic window excludes competing migrations, grants, repairs and relevant business/Storage writes.
4. A new human authorization explicitly names the SQL hash and native execution route (plus reviewed runner/CA hashes). The prior MCP authorization is not reused.

Stop after preparation. This report authorizes no installation, gateway deployment, policy cutover or frontend release.
