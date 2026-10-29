# Proposed single-attempt Storage foundation procedure

**Preparation only. No installation is authorized by this checklist.** Target: `mqqaykksadotbrghbexz`.

## 1. Authorization and route prerequisites

1. Obtain fresh authorization for **one native PostgreSQL submission** of `docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql`, SHA-256 `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2`, exactly 47,407 bytes. This is a new attempt, not a replay of the old marker.
2. Verify the Supabase control-plane project independently: `mqqaykksadotbrghbexz`, API origin `https://mqqaykksadotbrghbexz.supabase.co`, direct database host `db.mqqaykksadotbrghbexz.supabase.co`, port 5432, database/user `postgres`. Do not rely on the repository's CLI link.
3. Verify the operator's database credential is available to the trusted server-side process. Do not substitute a service-role/anon API key, rotate a credential, write it to a tracked file or include it in a connection URL on the command line.
4. Obtain and independently verify the production CA certificate and its SHA-256. Require certificate-chain and hostname verification; forbid insecure TLS overrides. Confirm network/IPv6 and any applicable database network restrictions permit the fixed connection. Do not change production configuration to make this pass.
5. Run the prepared native read-only probe. Require exact identity, TLS, READ ONLY and foundation absence; optionally use its 47,407-byte harmless control. A PASS is a connection check, not full catalog/DDL authorization.
6. If a direct connection cannot be established, **STOP**. A dashboard-verified session pooler on port 5432 or `psql` requires a separately reviewed route and credentials/TLS checks. Do not switch to transaction pooling, `apply_migration`, the SQL editor or `db push` automatically.

## 2. Prepare and review the installation runner

The current probe has **no installation mode**. Prepare/review the actual installer before execution authorization is used; local review and offline tests may proceed without a live write.

- Use one `pg.Client`, not a pool. Pin host/port/database/user/CA and verify the trusted CA hash. Retain a single connection for immediate read-only preflight and the later installation.
- Use explicit READ ONLY transactions for preflight. The connection's installation defaults must permit the separately authorized transaction; do not try to turn the read-only probe into a write tool or append SQL to the candidate.
- Load artifact bytes once, hash/check their length, require UTF-8 round-trip byte equality, and submit that exact string without newline normalization, templating, splitting or additions.
- Allow no arbitrary SQL/project/URL arguments, automatic reconnect or retry. Use a new exclusive local operation lock and immutable attempt marker in a uniquely named evidence directory. Preserve the old attempt and its evidence.
- Hold the lock for the entire preflight, one submission and outcome verification. Verify the lock-holder stays alive. The lock is cooperative and local; obtain an explicit exclusive window covering other operators/machines.
- Bound connection establishment, but do not impose a shorter client-side query deadline on the installation than the reviewed multi-statement operation. Preserve the artifact's **1s lock / 30s per-statement limits**. No new server/database timeout setting or production configuration change.
- Sanitize errors: record SQLSTATE/code and operation phase only; no raw SQL error context, passwords, connection URLs, private object references or authorization material. No verbose driver tracing or transcript of secrets.

Native simple-query execution supports this complete SQL string in one call; a single client preserves transaction scope. Do not force extended/prepared mode or split at semicolons. [node-postgres query API](https://node-postgres.com/apis/client), [transaction connection requirement](https://node-postgres.com/features/transactions).

## 3. Immediate pre-write gates

Within the newly confirmed low-traffic exclusive schema-change window:

1. Acquire/verify the new operator lock and confirm no other schema, grant, role, repair or fixture operation is starting. Do not remove another operator's lock.
2. Recheck project identity through the independent control plane and fixed native TLS endpoint. In the same native session verify database, current/session role, server version, endpoint and required owner/DDL/trigger/grant privileges. A matching database name alone does not identify the project.
3. Rehash the already loaded SQL bytes and require the authorized hash/length. Any artifact difference is a stop, not permission to regenerate it.
4. Run the reviewed `compatibility-fingerprint-readonly.sql` in a bounded READ ONLY transaction. Require:
   - Compatibility SHA-256 `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`.
   - 164 migration records, latest `20261011230000`, complete-history MD5 `1f5eca911f6e2057ae070a955eaca3dc`.
   - All 296 existing function records, 90 triggers, 82 policies, table structure and default privileges unchanged.
   - Four containment marker triggers, three document-security triggers, twelve disabled test RPCs and FALSE environment guard intact.
   - Foundation namespace, 14 functions, four tables and eight triggers absent; no foundation transaction or conflicting DDL/grant activity.
5. Recheck source-object, canonical template/news, parent/ownership and historical-reference inventories against the preserved reviewed baseline. Snapshot protected-data fingerprints immediately before execution. Review any changed object/reference rather than automatically rebaselining. Existing baseline: 378 objects, 10 buckets, 15 Storage policies, 13 current template references and three published-news references.
6. Verify applicable database/schema creation, table SELECT/TRIGGER, function ownership and required roles, service-role permissions and default ACLs. Do not change privileges to bypass a failing gate.
7. Complete and save the external preflight receipt, independently checked artifact identity and approved window. Mark this new attempt as started **once immediately before submission**. Stop if any gate fails.

The candidate's embedded checks remain authoritative inside its transaction. External preflight is additional evidence, not a substitute for those checks.

## 4. Exactly one atomic submission

After every gate and the fresh authorization pass, the reviewed runner performs **one** `client.query(exactSqlString)` on the verified connection.

- The exact file retains its own BEGIN/COMMIT; no outer transaction, `psql --single-transaction`, appended receipt, reordered statement or modified gate.
- Do not submit `apply_migration`, `db push`, staging SQL, policy cutover or another release artifact.
- Require an authoritative PostgreSQL completion result ending in COMMIT, then independent read-only post-installation verification. A successful network status alone is insufficient.
- Save project/endpoint/role, artifact hash/length, UTC and Manila timestamps, attempt count, sanitized command results and transaction outcome in an external receipt.
- The exact artifact inserts **no migration receipt**. If an in-database receipt is required by policy, stop for a newly reviewed SQL candidate instead of appending one.

## 5. Post-installation verification

Use the reviewed `executions/20261011T122743Z/post-install-readonly.sql`, the expected foundation-function manifest and protected-data verifier, via bounded READ ONLY queries. Require:

- Four internal tables with RLS enabled and reviewed permissions.
- All 14 exact function definitions/owners/security settings/ACLs; no private RPC execution for PUBLIC, anon or authenticated; reviewed service-role access only.
- All eight triggers with exact bindings/functions/enabled states, not just matching counts.
- Only the exact production trusted Storage origin; current 13 templates and published news references resolve under the reviewed design.
- Existing 15 Storage policies unchanged; no restrictive cutover performed.
- All containment/document security protections and unrelated function/policy/grant records unchanged.
- Migration history still exactly 164 and the full fingerprint unchanged.
- All 57 protected relation fingerprints and Storage object/reference inventories unchanged from the immediate preflight, excluding only the explicitly expected new internal authorization rows. No historical business-row or object rewrite.
- A new external evidence manifest/receipt; lock released through verified cleanup only after the outcome is established or the uncertain-operation evidence is preserved.

Foundation installation alone does not secure the still-permissive production Storage policies. Gateway, compatible frontend, records-access decisions and restrictive cutover remain separately authorized phases.

## 6. Failure and recovery

- **Known pre-COMMIT SQL failure:** abort/ROLLBACK the open failed transaction, then verify original catalog/data and absence of active work read-only. Do not automatically rerun.
- **Lost/uncertain response:** stop. Read-only independent reconciliation must distinguish installed, absent and still-running states using exact function/trigger hashes, transaction activity and protected fingerprints. Do not infer failure from a missing response or resubmit while a transaction may still run.
- **Confirmed COMMIT with a failed postcondition:** retain protections/evidence and stop the next release phase. Prepare a separately reviewed forward correction; do not drop the foundation or restore unsafe policies as a shortcut.
- No account rotation, policy relaxation, object deletion/backfill, gateway/frontend deployment or historical repair is part of recovery.

If returning to MCP is desired instead, first obtain service-level failure diagnostics and verify confirmation compatibility. Do not remove safety prompts, change the SQL to evade the classifier or interpret the read-only transport check as proof that a destructive continuation works.
