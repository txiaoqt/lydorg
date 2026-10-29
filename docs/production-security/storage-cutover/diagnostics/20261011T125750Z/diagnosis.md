# Production Storage foundation submission diagnosis

Date: 11 October 2026. Project: `mqqaykksadotbrghbexz` only.

**Diagnostic task completed. No database installation or retry was performed.** Staging was not contacted. Existing security corrections and the reviewed foundation SQL were preserved.

## Decision

**GO for diagnostic preparation; NO-GO for installation now.** The recommended next route is an explicitly authorized native PostgreSQL connection, using the existing `pg` client and strict certificate/hostname verification. That route remains **BLOCKED** until the database credential, trusted CA, network connectivity and read-only identity probe are verified. It has not been tested against production.

A new single-attempt authorization and a new exclusive schema-change window are required. The previous authorization/attempt marker must not be reused. The [installation checklist](single-attempt-installation-checklist.md) preserves the exact SQL and its atomic transaction.

## Artifact and working tree

- Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- Existing dirty working tree preserved; additions in this task are diagnostic evidence, documentation and a read-only probe with offline guard tests.
- Reviewed artifact: `docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql`.
- Length: **47,407 bytes**; SHA-256: **`e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2`**.
- No SQL changes, transaction splitting, catalog-gate changes or migration receipts were introduced.

## Saved submission evidence

The prior receipt and acknowledgement remain in `executions/20261011T122743Z/`.

| Event | UTC, 11 October | Asia/Manila, 11 October |
|---|---|---|
| One complete SQL submitted through Supabase MCP `execute_sql` with explicit production project ID | 12:36:30 | 20:36:30 |
| Error returned | 12:44:46 | 20:44:46 |
| Independent read-only reconciliation | 12:46:31.643 | 20:46:31.643 |

Elapsed submission-to-response time was **496 seconds (8 minutes 16 seconds)**. The saved response is `isError: true` with `McpServerError: Invalid or expired requestState`. It contains no PostgreSQL SQLSTATE, transaction result or request correlation ID. One agent submission and zero automatic retries are recorded. Waiting for that tool response did not resubmit SQL.

Read-only reconciliation found no committed foundation, no remaining matching transaction and the original catalog/data intact. This establishes **not installed**, not whether a database execution was ever started and rolled back.

## Diagnosis: evidence versus hypotheses

**Confirmed category: MCP request-state validation / continuation failure.** Current MCP SDK source maps invalid state to this exact error; malformed state, failed signature validation, expiration and binding failure can share the response. The detailed reason is available only through server diagnostics. An error mentioning request state does not establish expiration of a Supabase Auth user session. [SDK server implementation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/server.ts), [request-state codec](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/requestStateCodec.ts).

**Leading hypothesis, not confirmed: a confirmation continuation expired during the prolonged call.** Supabase documents a separate destructive-SQL confirmation flow. An offline run of its current upstream classifier flags this exact artifact because it recognizes `DELETE` text inside newly defined routine bodies. Those routine deletes are not executed by the installation itself. This provides a plausible route into confirmation handling; it does not prove the hosted server used this classifier or emitted a confirmation. [Supabase MCP confirmations](https://supabase.com/docs/guides/ai-tools/mcp#destructive-sql-confirmations), [current SQL classifier](https://github.com/supabase/mcp/blob/main/packages/mcp-server-supabase/src/tools/destructive-sql.ts), [SQL tool implementation](https://github.com/supabase/mcp/blob/main/packages/mcp-server-supabase/src/tools/database-operation-tools.ts).

Other possible causes are a changed/malformed echoed state, inconsistent signing keys across workers or a restart, principal/context binding changes, or a client/server continuation incompatibility. Supabase's current local HTTP development instructions mention a 120-second state lifetime, while the generic SDK example uses 600 seconds. **Neither establishes the deployed hosted lifetime**, and total tool latency is not the age of the state token. The 496-second interval alone cannot prove expiration. [Supabase local HTTP instructions](https://github.com/supabase/mcp/blob/main/CONTRIBUTING.md), [SDK continuation documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/input-required.md).

| Possible explanation | Evidence / disposition |
|---|---|
| MCP request-state/continuation rejection | **Confirmed error category**; exact internal reason unavailable. |
| State expiration while awaiting confirmation | **Plausible leading hypothesis**; issuance time, expiry, approval round and hosted TTL unavailable. |
| Supabase control-plane login/session is generally expired | **Not demonstrated**; fresh project reads and SQL queries succeed. They do not prove the earlier session was healthy throughout. |
| Universal 47,407-byte payload limit | **Not supported**; same-size harmless request succeeded. Different write/confirmation handling remains untested. |
| PostgreSQL lock or statement timeout | **Not demonstrated**; response has no SQLSTATE. No such event found in the bounded project-log results. |
| Longer backend/server timeout causing lost state | **Unverified**; backend traces and proxy limits unavailable. |
| SQL/catalog failure | **Not demonstrated by this error**; current compatibility fingerprint still matches. No DDL was executed to test this hypothesis. |

To determine the specific cause, obtain Supabase MCP service diagnostics for the project and UTC interval above: correlation ID if recoverable, server/client versions, confirmation round timing, state verification reason, worker key consistency and whether execution was dispatched. Do not collect or share raw request-state tokens, credentials, private references or authorization headers. Project PostgreSQL/Realtime logs are not those MCP traces.

## Fresh read-only verification

| Check | Result | Evidence |
|---|---|---|
| Exact control-plane project | **PASS** — `mqqaykksadotbrghbexz`, `lydo-org-focused`, ACTIVE_HEALTHY, database host `db.mqqaykksadotbrghbexz.supabase.co` | `project-readonly.json` |
| Small bounded query through existing MCP connection | **PASS** — database/current user/session user `postgres`; transaction read-only `on` | `small-readonly-result.json` |
| Same-size multi-statement read-only query | **PASS** — 47,407-byte request, explicit READ ONLY, 3-second statement limit; 7,343 ms observed tool latency | `same-size-readonly-result.json` |
| Current complete compatibility fingerprint | **PASS** — exact reviewed SHA-256 `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5` | `catalog-readonly.json` |
| Foundation still absent | **PASS** — namespace, gateway RPC and eight new triggers absent; no matching active transaction/locks at 12:58:55 UTC | `absence-readonly.json` |
| Migration history | **PASS** — 164; latest `20261011230000`; full history MD5 `1f5eca911f6e2057ae070a955eaca3dc` | `catalog-readonly.json` |
| Existing catalog protection | **PASS** — all 296 function records, 90 triggers, 82 policies and default grants match the reviewed pre-install manifest, including four containment markers, three document guards and twelve disabled test RPCs; environment guard FALSE | `catalog-readonly.json`, `absence-readonly.json` |
| Project log investigation | **PASS, limited evidence** — 12:36:00–12:45:15 UTC: one PostgreSQL and three Realtime entries; no matching request-state/foundation-preflight/lock-timeout/statement-timeout mention | `windowed-project-logs.json` |

The same-size query was a small SELECT padded with a harmless comment, not the foundation SQL in a rollback transaction. Its 7,343 ms is end-to-end tool latency, not SQL execution time. It tests transport of that size and ordinary SQL access, not confirmation handling or write authorization.

The earlier independent reconciliation also recorded **57/57 protected relations unchanged**, **378 Storage objects unchanged**, **15 Storage policies unchanged**, and unchanged object/reference inventories. Those data comparisons are historical evidence from the failed attempt, not freshly rerun data scans in this diagnostic task. Fresh catalog verification continues to show the same 15 Storage policies.

## Reliable route assessment

| Route | Assessment |
|---|---|
| Existing MCP `execute_sql` | Read-only access works; confirmation continuation for this artifact remains unverified. **Do not blindly retry** or disable confirmation to avoid the failure. |
| Native PostgreSQL using installed `pg` 8.23.0 | **Recommended conditionally.** One authenticated TLS connection and one exact simple-query submission preserve the standalone transaction without an MCP continuation. Requires separate route authorization and successful native preflight. |
| Native `psql` | Supported operator alternative, but not installed/on PATH in the inspected environment. Do not install or substitute it silently. |
| Session pooler | Possible IPv4 alternative only after independently verifying the exact dashboard endpoint, project-qualified username, TLS and connection semantics; not configured/tested here. |
| `apply_migration`, `db push`, broad replay | **Excluded**: not equivalent to the reviewed external-receipt-only procedure and not authorized. |

Supabase supports direct PostgreSQL connections for persistent clients and migration work; direct endpoints normally require IPv6 unless IPv4 support is available. Its session pooler offers an alternative where direct connectivity is unavailable. The current environment's native DNS/TCP/TLS reachability is **NOT TESTED**. [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Native connection prerequisites and local checks

The prepared `native-postgres-readonly-probe.mjs` accepts no arbitrary URL or installation argument. It loads no `.env`, pins the exact production hostname/port/database/user, validates a trusted CA file hash, verifies hostname/certificate, enforces read-only startup/transaction limits and emits sanitized results only. Supply credentials through a trusted server-side process; never through chat, command-line arguments, frontend variables or committed files.

Required process variables are **`YTRACE_PRODUCTION_DB_PASSWORD`**, **`YTRACE_PRODUCTION_DB_CA_FILE`** and **`YTRACE_PRODUCTION_DB_CA_SHA256`**. The first is the actual PostgreSQL account password; Supabase API anon/service-role keys are not substitutes. The CA file must come from the independently verified project connection configuration; its hash must also be independently reviewed. No production password was loaded or requested in this task.

TLS uses an explicit `ssl` object with trusted CA, `rejectUnauthorized: true` and the fixed hostname. Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0`, unverified certificates or connection-string SSL parameters that override this configuration. Native PostgreSQL certificate/hostname verification is the equivalent security objective of `sslmode=verify-full`. [node-postgres TLS configuration](https://node-postgres.com/features/ssl), [PostgreSQL TLS verification](https://www.postgresql.org/docs/current/libpq-ssl.html).

From the repository root, the following is a **read-only probe**, not an installation command:

```powershell
node docs/production-security/storage-cutover/diagnostics/20261011T125750Z/native-postgres-readonly-probe.mjs --same-size
```

| Local validation | Result |
|---|---|
| Probe JavaScript syntax | **PASS** |
| Missing-credential early stop, TLS-prerequisite early stop, secret-safe output, forbidden installation argument | **PASS** — three offline tests; no connection attempted |
| Current upstream destructive classifier on exact artifact versus harmless SELECT | **PASS** — offline diagnostic reproduction only |
| Actual native PostgreSQL probe | **BLOCKED** — all three required variables absent; no connection attempted |
| Actual foundation installation | **NOT TESTED / NOT AUTHORIZED** |

No frontend changes were made; TypeScript, Vite and application regression suites were not rerun for this diagnostic-only task. Existing SQL/security tests were not repeated.

## Fresh authorization required

After the native read-only TLS/identity probe and route review pass, authorize **one native PostgreSQL installation** of the same exact artifact/hash, external execution receipt only, with its existing BEGIN/COMMIT, 1-second lock timeout and 30-second statement timeout. Confirm a fresh exclusive window and no competing schema/grant/repair operations. Recheck all immediate catalog, privilege and inventory gates before the single submission.

This must not authorize the restrictive policy cutover, Admin gateway, frontend deployment, historical-object repair, Auth changes or a different migration mechanism. An uncertain response requires read-only reconciliation and a stop, never an automatic second submission.
