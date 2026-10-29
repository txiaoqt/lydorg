# Budget deletion pause — preparation review

Recorded 2026-10-13 Asia/Manila. Production `mqqaykksadotbrghbexz` and staging remained read-only. No production mutation RPC, database installation, deployment, Git push, Auth operation or Storage file operation was performed.

## Decision

**GO for separate review/authorization of the server pause.** It is prepared and tested locally; **not installed**. Fresh exclusive-window preflight is still mandatory.

**CONDITIONAL GO for independent Admin frontend release preparation.** Four runtime files are isolated from the approved live Admin source. Packaging/version, hosted acceptance and separate deployment/promotion authorizations remain.

**NO-GO for executing Storage cutover now.** The pause must first be separately installed and verified; the cutover catalog gate then requires its exact reviewed update, an approved preservation snapshot and independent cutover authorization. No policy predicate is relaxed.

## Exact SQL and server behavior

`budget_deletion_pause_production.sql`: 11,945 UTF-8 bytes.

SHA-256:

`a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`

Only `public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[]) RETURNS jsonb` is replaced. Its body unconditionally raises SQLSTATE `PT409` with the fixed message:

> BUDGET_DELETION_PAUSED: Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.

No argument/session inspection, session timestamp update, audit append, deletion or file cleanup occurs. Null tokens and null/empty ID arrays also fail closed. The same error is returned for every role. The existing signature, OID, postgres owner, SECURITY DEFINER, VOLATILE, non-strict/parallel-unsafe mode, cost, `search_path=public` and exact ACL are retained. The existing PUBLIC/anon/authenticated/service-role EXECUTE grants gain no capability because the body always raises. No grant change is bundled.

CREATE OR REPLACE preserves ownership, privileges and dependent identity; the transaction verifies these expectations and the full catalog before and after. See [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html). PostgREST maps PTxyz errors to HTTP xyz, so PT409 is the prepared HTTP 409 contract; this has **not** been exercised against live production. See [PostgREST custom errors](https://docs.postgrest.org/en/stable/references/errors.html).

BEGIN/COMMIT, 1-second lock timeout and 30-second per-statement timeout are retained. Eight protected relation fingerprints are compared within the transaction; all 57 inventories must additionally be compared by the future operator. The candidate creates no schema, migration receipt, trigger, policy or audit row. Its project boundary is a separately verified fixed native TLS connection, exact catalog and exact trusted production Storage origin; a user-supplied client flag is not used as a project or Admin authorization boundary.

Expected function fingerprints:

| State | Definition MD5 | Source MD5 |
| --- | --- | --- |
| Current production | `f6c36316ba941c9e0f76674754ac44ba` | `eb7b756964fd31efebfb39749f5c9e5b` |
| Prepared pause | `3da7c71f32e4f2a9164efbbac6cda448` | `0e4e1f3cb102a26d08ab10161a23e682` |

Fresh read-only preflight at 2026-10-12 17:14:28 UTC: PASS. PostgreSQL 17.6, database/current user/session user postgres, exact production origin, original RPC and full catalog match; 164 migrations (latest `20261011230000`, complete MD5 `1f5eca911f6e2057ae070a955eaca3dc`), 15 Storage policies, 378 objects, 93 profiles; containment environment guard FALSE. No mutation was invoked. The old RPC remains live until separately authorized installation.

## Local results and limitations

| Check | Result | Evidence |
| --- | --- | --- |
| Disposable PostgreSQL suite | **PASS 37/37** | `sql-tests-final.tap`, `sql-test-evidence.json` |
| Four SQL execution roles × eight session states | **PASS 32/32** | All rejected PT409, with full synthetic row equality after each denial |
| Null/empty/unknown/mixed IDs; armed validator | **PASS** | No session validation, timestamp change, notification/audit change or Storage deletion |
| OID/signature/owner/ACL/config preservation | **PASS** | Captured original function and local post-install contract |
| Actual captured budget detail, file review and release | **PASS** | Disposable records only; unrelated definitions unchanged |
| Wrong origin/contract/catalog drift; injected pre-COMMIT failure | **PASS** | Fail closed; original function and rows restored after rollback |
| Focused frontend tests | **PASS 46/46** | `frontend-tests-first.log` |
| Windows Node 24.21.0 isolated Admin build | **PASS** | `isolated-admin-build.log`, 53 generated assets |
| Actual app TypeScript | **FAIL: 647 existing diagnostics** | Base 651; zero new identities, four removed; `typescript-comparison.json` |
| Full working-tree diff check | **PASS** | `full-diff-check.log`; existing dirty work preserved |
| Production pause / live denial tests | **NOT TESTED** | No installation or production mutation RPC authorized |
| New hosted/browser acceptance | **NOT TESTED** | No frontend deployment; earlier UAT was not repeated |

The disposable engine is the existing **PostgreSQL 18.3 / PGlite 0.5.8**, not native PostgreSQL 17. Production-captured definitions round-trip with their reviewed hashes. The local transaction test adapts only the two whole-catalog constants and the engine-major gate to the synthetic environment. Pause body, exact function contract, protected-data checks and transaction remain unchanged. The untouched production artifact rejects this local environment. No concurrency or live Auth/Storage HTTP certification is claimed.

Earlier local harness failures are preserved in `sql-tests-first.tap` through `sql-tests-sixth.tap`: fixture parameter/domain mismatch, notification schema/enum assumptions, the local PG18 versus production PG17 gate and a malformed JavaScript failure-injection replacement. These were corrected in the **test harness**. The prepared production SQL hash did not change. The final suite is 37/37. The first frontend run passed 46/46; no existing assertion was suppressed to obtain that result. Deletion-permitted tests were replaced because the approved business requirement is now an unconditional pause; their originals remain saved.

TypeScript is a real FAIL. Of its 647 existing errors, 61 are in runtime-scope files; their diagnostic identities match the unchanged source baseline. This patch introduces none and removes four obsolete-code diagnostics. It is not a claim that all existing errors are harmless. The successful compilation is separate evidence. No compiler settings or assertions were weakened.

## Profile delta and preservation proposal

Confirmed from read-only production evidence:

- All original **92 full profile rows** exactly match the foundation-era fingerprint `52f00b0d86d0c583a56143629fd7409a`; none was modified, deleted or reassigned.
- The added profile alias `2c2732174d1111e4` was created **2026-10-12 22:25:31.999995 Asia/Manila**. The 93-row fingerprint is `a3d0cedda53960f18b94f97f59779489`.
- Its owner alias `dc239fb97d3966e4` is an existing Google-linked Auth identity created October 11, with normal `authenticated` Auth role and `youth` application role assigned then. There is no linked Admin account, accreditation, URN, test marker or sample marker. Profile status is `pending_review`.
- Two profile contacts were created at the same timestamp. All original **212 contact rows** exactly match the old fingerprint `44b6275d26e3b12bc73b78506cf891f3`.
- Current owner-scoped profile policy, identity guards, contact synchronization and reference/version triggers are enabled. The actual owner profile client binds `user_id` to the genuine Auth session.

**Interpretation:** the new row is consistent with normal first profile completion by an existing Google user, not a recreated identity or privilege escalation. It matches the operator-reported own-account UAT timing. **Independent attribution to the operator is not established:** no corresponding retained account-specific Auth/application audit entry was found, and no private identity was requested or exposed. Operator attribution is a correlation, not a confirmed identity match.

The full 57-inventory comparison has **49 unchanged and eight changed** inventories. Besides profile/contacts, the differences are Auth user/identity inventories, activity logs, Admin sessions, reference counters and Admin change versions. Four new activity rows are `admin_sign_in`, with corresponding four session creation timestamps for the same existing Admin alias. Two existing Auth users show later login timestamps; the Google identity update belongs to the added profile owner. Counter/version changes are consistent with enabled profile triggers but are not a row-by-row reconstruction of the older counter/session/Auth state.

`preservation-baseline-proposal.json` records the exact old/new fingerprints and remaining attribution/mutable-inventory review. **No pinned installer manifest or baseline was replaced.** Confirm the operator attribution and review the remaining mutable differences before adopting a complete cutover baseline. Fresh immediate before/after preservation evidence remains necessary for any later authorized server pause.

## Accepted retention and cutover impact

`retention-decisions.md` records the approved retain-and-deny disposition for **128 + 85 + 2 + 56 = 271** objects. Preserve both financial objects, all 378 objects, 13 current templates and supported current documents. No new access is granted; no object is classified as disposable merely for lacking a current row. No required current workflow is presently shown to rely on the unmatched objects. Future evidence-based access requests remain separate.

The original reviewed cutover SQL is unchanged:

`3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c`

Its exact catalog hash is currently valid (`eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`). Installing the pause would change that hash to the **locally projected** `e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f`.

`future-cutover-gates-proposal.sql` changes only **two catalog-hash literals**; reversing those two replacements reproduces the original file byte-for-byte. Proposed SHA-256 `f77ceae769301affc2b8150db1bf922fbbaf3ee4db6f20a65939d95495ab5f8c`. The 15-to-9 policy transition, predicates, grants, foundation checks and all other bytes are unchanged. **Projected only, not authorized:** capture the actual post-pause production catalog and review the proposal separately before it can be an execution artifact.

## Next approvals

1. Server pause only: use the exact narrow wording and checks in `operator-checklist.md`. No frontend or Storage action is included.
2. Admin frontend: separate isolated package/build review, candidate deployment and promotion approvals; see `admin-frontend-release-plan.md`. Never push shared main or deploy the dirty root. Preserve both current approved frontends and gateway v1.
3. Storage cutover: independent authorization after the pause, exact gate refresh, preservation review and the accepted retention decision are verified.

Recovery is forward/fail-closed. Preserve the pause and restrictive security protections. Do not restore the original permissive deletion RPC or older incompatible frontend.
