# Final pre-execution review — budget deletion pause

October 13, 2026, Asia/Manila. **NO-GO for production installation at this point.** The SQL review passes; the required budget-specific native execution adapter is missing. The operator confirmed there is none. No SQL installation, production mutation RPC, native install attempt, frontend operation, Storage change, authorization record or attempt marker was created.

## Status by required check

| Check | Result | Evidence |
| --- | --- | --- |
| Exact SQL hash and size | **PASS** | SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`, 11,945 bytes |
| Project/control-plane identity | **PASS** | Exact `mqqaykksadotbrghbexz`, ACTIVE_HEALTHY, host `db.mqqaykksadotbrghbexz.supabase.co` |
| Current RPC/catalog | **PASS** | Original unpaused function and exact reviewed compatibility hash match |
| Required current database privileges | **PASS** | Owner postgres; CONNECT, public USAGE/CREATE, plpgsql/type USAGE and protected-relation SELECT checks passed; all 57 inventories actually captured read-only |
| SQL transaction/timeouts/guards | **PASS** | Original BEGIN/COMMIT; lock 1s, statement 30s; original-contract, project-origin, exact catalog, original OID and protected-data guards |
| Before/after 57-inventory query coverage | **PASS — review only** | 57 unique inventories captured; current values match the previous reviewed snapshot; no post-install run occurred |
| TLS requirements/source pattern | **PASS — review only** | Existing native core uses fixed host/SNI, supplied verified CA, rejectUnauthorized=true and actual authorized/encrypted socket checks |
| Fresh budget-adapter native TLS preflight | **NOT TESTED** | No budget adapter exists; no credential/certificate material loaded during review |
| Budget-specific adapter/bundle identity | **BLOCKED** | No source path or bundle hash exists |
| Budget lock, durable attempt marker and retry enforcement | **BLOCKED** | Foundation controls exist but are bound to a different, already-consumed operation |
| Uncertain-outcome reconciliation | **BLOCKED for execution** | Required protocol documented, but no budget adapter implements it |
| Final adapter-bound installation authorization | **BLOCKED** | Exact SQL scope prepared; adapter identity cannot yet be filled honestly |
| Receipt format | **PASS — template only** | `execution-receipt.template.json`; no execution or approval asserted |

The accepted **38/38 disposable SQL and 18/18 UI tests were not repeated**. Existing TypeScript FAIL (647 errors, zero new identities) remains visible; it is not used as a blocker to this independent server-only security pause. Existing frontend deployments are outside this task.

## SQL and exact mutation scope

Reviewed file:

`docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql`

Only `public.admin_bulk_delete_budget_requests(_session_token text,_request_ids uuid[]) RETURNS jsonb` is replaced. The new body unconditionally raises SQLSTATE `PT409` with the fixed `BUDGET_DELETION_PAUSED` message **before session validation**. It contains no data mutation, Storage operation, audit insert, argument disclosure or role-based bypass. Existing valid/invalid/null sessions all encounter the pause when it is later installed.

The transaction also performs read-only catalog/data queries and transaction-local custom settings for its guards. It creates no tables, schemas, policies, triggers, grants or migration receipt. No historical rows are reconciled. All unrelated business functions, Storage policies and foundation objects remain outside the mutation scope.

Current expected contract:

- OID 32925; owner postgres; LANGUAGE plpgsql; SECURITY DEFINER; VOLATILE; non-strict; parallel unsafe; COST 100; search_path=public; exact text/uuid[] arguments and jsonb result.
- ACL `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` preserved. The wide existing EXECUTE ACL grants no deletion capability after an unconditional exception; no grant expansion is proposed.
- Original definition/source MD5: `f6c36316ba941c9e0f76674754ac44ba` / `eb7b756964fd31efebfb39749f5c9e5b`.
- Expected new definition/source MD5: `3da7c71f32e4f2a9164efbbac6cda448` / `0e4e1f3cb102a26d08ab10161a23e682`.
- Original catalog SHA-256: `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`.
- Projected post-pause catalog SHA-256: `e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f`.

## Fresh read-only production evidence

`production-readonly-preflight.json` confirms PostgreSQL 17.6, database/current user/session user postgres, exact production origin, matching current function/catalog, 164 migrations, latest `20261011230000`, complete history MD5 `1f5eca911f6e2057ae070a955eaca3dc`, 15 Storage policies, 378 Storage objects, 93 profiles and containment environment guard FALSE. **The production function is still unpaused.**

This evidence comes from read-only control-plane/database inspection. It is not proof of a new native TLS handshake. The actual native identity must be independently checked on the pinned endpoint immediately before any future authorized write.

## Preservation verifier review

Existing 57-inventory query:

`docs/production-security/storage-cutover/executions/20261011T122743Z/protected-data-readonly.sql`

Source SHA-256: `ecf05439e94d078b63d7f5b4efc37f262425ed5a9ecc7904cd241efb5d4b249d` (13,900 bytes). It uses repeatable-read READ ONLY transactions, bounded statement timeout, fixed relation names, row counts and aggregate fingerprints. Auth inventories hash selected identity/metadata fields without returning credentials, tokens, names or emails. They are inventories, not a complete export or coverage of every Auth token table.

All 57 current inventory values match the earlier preparation snapshot. `protected-inventories-readonly.json` is review evidence, **not a silently adopted installation baseline**. The future budget adapter must durably record its reviewed immediate preflight values and compare all 57 relation/count/fingerprint entries exactly after the acknowledged transaction. No filtering or acceptance of unexplained drift is permitted.

The reviewed SQL itself compares eight protected relations within its transaction: budget requests/files, liquidation reports/files, notifications, activity logs, Admin sessions and Storage objects. This does not substitute for the separate 57-inventory comparison.

The main compatibility catalog intentionally excludes foundation-specific routines/authorization RPC, eight foundation triggers and its private table structures. The future adapter must add before/after comparison using the existing supplemental foundation read-only verifier and installed receipt. **No SQL modification is needed:** this is an external verification requirement, not permission to weaken gates or rebuild the foundation.

## TLS, connection and credential requirements

The reviewed existing native core provides the suitable pattern: fixed host/port/database/user, no arbitrary connection string, CA bytes checked against an independently trusted SHA-256, `ssl.rejectUnauthorized=true`, `ssl.servername` equal to the exact expected host, default secure Node hostname verification, authorized/encrypted socket checks and server TLS 1.2/1.3 validation. Do not replace hostname verification with an always-successful callback or disable TLS through configuration/environment.

node-postgres passes SSL options to Node's TLS socket and warns that SSL URL options can replace the explicit SSL configuration. Use the explicit fixed configuration without connection-string overrides. See [node-postgres SSL](https://node-postgres.com/features/ssl) and [Node TLS hostname verification](https://nodejs.org/api/tls.html#tlscheckserveridentityhostname-cert).

The existing secure loader may supply credentials to a future trusted native process from the ignored local environment file. No password, connection string, certificate contents, token or key is required in chat or a receipt. Hash agreement alone is not independent trust: the expected CA hash must come from the already independently verified operator source and be bound to the future authorization. A pooler or alternate endpoint is not a fallback.

## Why the existing foundation runner cannot be used

The foundation runner pins another SQL hash/length, requires foundation absence, uses its older fixed baseline, performs foundation-specific postflight and has foundation-specific consumed markers. Its result helper also expects COMMIT whereas the budget pre/post verifiers terminate with ROLLBACK. Calling it with a new SQL path or weakening those checks would be an unreviewed change.

`adapter-requirements.md` specifies the smallest separate budget binding using the existing architecture, including the required input/code hashes, correct result parsing, single Client, owned lock, flushed marker and zero resubmission behavior. No new adapter was invented or activated under this review-only instruction.

## Exclusive window and uncertain outcome

A future installation requires a new low-traffic window excluding competing migrations, grants, repairs, session timestamp updates and business/Storage writes through verification. Drain existing deletion requests and stale-client operations; replacing a function cannot recall an already-running old call. A local operation lock does not prevent another machine/operator starting work.

Before the one submission, record backend PID, backend start time and a unique non-secret application name/nonce. After a lost response, keep the marker consumed and retain the lock. Use only an independently verified read-only reconciliation connection, establish the original backend has finished, then inspect exact function/catalog, all 57 inventories and supplemental foundation state. An old catalog observed while the writer is still active is insufficient to prove absence. Do not cancel a backend, retry SQL, clear markers or restore the old RPC automatically.

Classify exact new preserved state as committed/verified; exact old preserved state with no outstanding writer as not installed/verified; anything mixed remains unresolved or committed-with-drift according to authoritative acknowledgement. Every uncertainty stops for human review. A known SQL failure permits rollback of that failed transaction under the eventual reviewed procedure; no production rollback was performed here.

## Authorization and receipt

`authorization-draft.md` contains the exact SQL/project/route scope and mandatory controls. **The missing adapter path and bundle hash are explicit placeholders; this draft is not ready to authorize execution.** A final adapter-bound single-use authorization cannot be honestly produced until that artifact exists and is reviewed.

`execution-receipt.template.json` records target, SQL/adapter/input identities, authorization reference, TLS fingerprints, owned lock/marker evidence, backend identity, submission count, COMMIT acknowledgement, pre/post catalog/data fingerprints and read-only reconciliation classification. It excludes raw errors, query parameters, passwords, tokens, private rows, certificate contents and signed URLs.

## Next step / stop

**Prepare and review the missing budget-specific native adapter locally, with focused adapter-control tests; retain the exact SQL unchanged.** Then obtain separate installation authorization naming the adapter bundle and a fresh exclusive window. No production authorization is requested at this incomplete execution stage. Stop after this review.
