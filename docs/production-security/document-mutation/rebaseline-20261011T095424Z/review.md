# Production document-mutation hotfix: post-containment rebaseline

## Decision

**CONDITIONAL GO for a separately authorized, standalone production hotfix. NOT INSTALLED.**

The reviewed lifecycle/authorization body is unchanged. Fresh production gates match, local PostgreSQL tests pass, and containment remains intact. Execution still requires a new authorization naming this candidate/hash, an independently verified production connection, an exclusive schema-change window, and immediate drift checks. No production or staging writes were performed.

This decision covers document metadata lifecycle protection. It does not authorize the broader Storage policy/gateway cutover, frontend deployment, migration replay, or any test-data reconciliation.

## Repository and artifacts

- Branch: `ui-refactor`.
- HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- Initial working tree: 2,912 changed/untracked paths, excluding this new evidence directory. Existing performance, security, identity, staging and frontend work was preserved.
- Historical candidate: [original SQL](../document_mutation_lifecycle_guard_production.sql).
- Historical SHA-256: `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785`.
- New candidate: [rebaselined SQL](document_mutation_lifecycle_guard_production_rebaselined.sql).
- **New SHA-256: `bd06efbc326146cabf00ef005401a5bb7aa4a060927d7bffb63eafcf0f35f567`**.
- New size: 170,636 bytes.
- Unchanged executable suffix after the compatibility gate: SHA-256 `4f952c2d98d3f0d54fed6b60ddc00287d48faa0ec3389176502451cad6af25dc`.
- Only introductory comments and `DO $production_gate$` changed. The historical file and applied/unapplied migration sources were not edited.
- Candidate is outside `supabase/migrations`. Generator: [local generator](../../../../scripts/rebaseline-production-document-mutation-candidate.mjs).

## Fresh production baseline

All remote SQL was explicitly addressed to `mqqaykksadotbrghbexz` and wrapped in read-only transactions. No staging connection was used.

| Check | Result | Actual evidence |
|---|---|---|
| Project / endpoint | PASS | Control plane: `mqqaykksadotbrghbexz`, `lydo-org-focused`, `db.mqqaykksadotbrghbexz.supabase.co`, ACTIVE_HEALTHY |
| Database / identity | PASS | Database, current user and session user are `postgres`; SQL reports read-only ON; server PostgreSQL 17.6, platform 17.6.1.127 |
| Complete migration inventory | PASS | All 164 records captured as version/name/statement-count/record digest, without downloading stored migration SQL |
| Version/name history fingerprint | PASS | `2d1ea52795f2d3c97c71e229819d9a7c`; latest `20261011230000` |
| Complete history fingerprint | PASS | `1f5eca911f6e2057ae070a955eaca3dc`, covering every column and stored statement through server-side JSONB hashing |
| Containment | PASS | Environment FALSE; all 12 mutation RPC definitions remain denial-only; PUBLIC/anon/authenticated/service_role EXECUTE remains revoked |
| Fixture protections | PASS | Four enabled `a_production_fixture_markers_guard` triggers, private helper and schema privileges match |
| Original hotfix dependencies | PASS | Ten definitions/signatures/owners/security modes remain at historical expected values |
| Catalog gate mirror | PASS | Read-only evaluation of the exact new manifest equals the pinned expected value |
| Installation privileges | PASS | Database CREATE, public schema CREATE, target-table TRIGGER and expected function ownership verified |
| Preserved data inventory | PASS | All 57 safe relation inventories retain identical counts and fingerprints between this task's reads |
| Permission inventory | PASS | Existing schema ACL, table ACL/RLS, policy and unrelated-function fingerprints unchanged |

Baseline captured at **2026-10-11 09:54:24 UTC / 17:54:24 Manila**. Final compatibility read: **10:24:59 UTC / 18:24:59 Manila**. This is a point-in-time baseline and must be rerun immediately before any future installation.

Evidence: [full baseline](production-baseline.json), [expected manifest](expected-production-manifest.json), [complete read-only capture SQL](production-baseline-readonly.sql), [final compatibility](final-readonly-compatibility.json), [data fingerprints](final-readonly-protected_data.json), [permissions](final-readonly-permissions.json), [default privileges](default-privileges-readonly.json).

### Containment compatibility

The two additional marker triggers on `document_submission_files` and `document_submissions` explain the original trigger fingerprint change:

- Before containment: `aed1b3f4417ad04716197a353c7259bf`.
- Current: `42b3e24219b2dd719f0cff11c57adc3a`.
- Removing only those marker triggers from the comparison reproduces the historical hash exactly.

The other two marker triggers remain on budget requests and liquidation reports. All four are pinned and left enabled. The containment helper, its restricted schema, disabled RPCs, retained Super Admin status authorization, accreditation immutability and terminal-renewal immutability are captured by the new gate and preserved by installation tests.

The original Storage-policy, target-table-policy and owner/review RPC ACL fingerprints remain `c5debe81f16c612c63a6b83ffdb90531`, `be6cd95840181dc1dc6124af9cfa6912`, and `e45685fb8b158e7b039a6bf39b2b8973`, respectively.

## Every gate change

| Gate | Historical candidate | New candidate / reason |
|---|---|---|
| Migration count / latest | 163 / 20261008174154 | 164 / 20261011230000, recognizing the committed containment |
| Migration contents | Count/latest only | Exact full history, version/name fingerprint and containment receipt record digest; rejects edits to old stored statements as well as new/missing records |
| Function catalog | Ten body/owner/definer checks and selected ACLs | Same ten required dependencies plus the current 31-function catalog with owners, security modes, volatility and normalized ACLs; protects containment definitions and grants |
| Trigger catalog | Historical aggregate hash | Exact current trigger definitions, enabled states, referenced-function hashes/owners and four marker guards |
| Tables / RLS / grants | Required RLS flags, policy hashes | Exact current column-expression/type/nullability, constraint, owner, ACL, RLS and trigger fingerprints for the scoped catalog |
| Roles | No full role manifest | Current relevant role flags and memberships, so privilege-context drift fails closed |
| Private containment objects | Did not yet exist | Exact helper definition/configuration/ACL, schema ownership and API usage/create privileges |
| Patch absence / collisions | Namespace and trigger-name checks | Same requirements pinned in the exact absence manifest |
| Environment guard | Not part of old gate | Must match contained definition and FALSE result |
| Installation identity | current_user = postgres | Database and current_user = postgres plus explicit required DDL privileges; external project verification remains mandatory |

These are compatibility checks only. No containment function, RLS policy, Auth setting, Storage policy or business rule is replaced by the rebaseline. Generated identity-column metadata was separately inspected; the local fixture limitations are documented below.

## Runtime changes retained from the original reviewed hotfix

Exactly five existing RPCs are replaced, with their signatures/defaults/return contracts preserved:

1. `user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)`
2. `replace_organization_document_file(uuid,uuid,timestamptz,text,text,text,bigint)`
3. `update_admin_document_submission_file_review(text,uuid,document_submission_status,text)`
4. `user_submit_renewal(uuid)`
5. `user_resubmit_renewal(uuid)`

Four helpers are created:

- `ytrace_document_mutation.lock_replacement(uuid)`
- `ytrace_document_mutation.guard_file()`
- `public.guard_direct_document_mutation()`
- `public.guard_document_parent_mutation()`

Three triggers are added:

| Trigger | Table | Events |
|---|---|---|
| a_document_mutation_guard | document_submission_files | BEFORE INSERT / UPDATE |
| b_document_direct_guard | document_submission_files | BEFORE INSERT / UPDATE / DELETE |
| a_document_parent_guard | document_submissions | BEFORE INSERT / UPDATE / DELETE |

The existing Admin approval RPC, custom session validator, accreditation triggers, normal ownership/RLS rules and fixture-marker guards are not replaced. Owner mutation/submit RPCs lose PUBLIC/anon EXECUTE and retain authenticated access, as already reviewed in the historical candidate. The custom Admin review RPC keeps its existing transport grants and validates the Admin session server-side.

## Local regression evidence

**Final run: 58 passed, 0 failed, 0 skipped** in 9.15 seconds. This includes 56 leaf checks plus two parent test groups in Node TAP.

Command:

```powershell
node --test supabase/tests/production_document_mutation_rebaseline.local.test.mjs
```

Evidence: [final TAP](local-sql-run-07.tap), [case results](local-sql-results.json), [function round-trip](captured-function-roundtrip.json), [operator-verifier test](post-install-verifier.local.json).

| Coverage | Result | Evidence boundary |
|---|---|---|
| Approved/rejected renewal replacements and direct mutations denied | PASS | Actual isolated PostgreSQL functions/triggers; persisted rows compared after denials |
| Approved/rejected submission and reviewed/approved/rejected file content protected | PASS | Both owner replacement entry points and ordinary-client deletion exercised |
| Normal renewal revision/resubmission | PASS | One file corrected, original history retained, five peer contents preserved |
| Normal registration requested revision | PASS | Existing supported replacement RPC; peer row unchanged |
| Cross-org / anonymous / suspended mutation denial | PASS | Actual local roles, ownership checks and scoped RLS; privileged local verification is separate |
| Existing Admin review authorization | PASS | Captured validator, active reviewer, invalid/expired/revoked/inactive sessions |
| Normal Admin renewal approval | PASS | Captured approval function produces next authoritative term; prior term retained/superseded; later replacement denied |
| Four marker guards and identity marker guard | PASS | Owner/direct-role and postgres/definer-context denial; no marker/GUC bypass |
| Twelve disabled test RPCs | PASS | Denied under anon, authenticated, service_role and postgres |
| Retained status Super Admin restriction | PASS | Ordinary reviewer denied; valid Super Admin accepted over anon transport |
| No installation data rewrites | PASS | Protected local rows, containment catalog and migration history unchanged |
| Drift gates | PASS | History name/statement/receipt, function body/owner/ACL, trigger removal/disable, helper/schema grants, RPC reenable, environment, RLS, columns, constraints, Storage policy, role inheritance and namespace/name collision |
| Atomic rollback | PASS | Failure injected after all new DDL/RPC/grant changes; old catalog/rows restored and new namespace/functions/triggers absent |
| Operator post-install verifier | PASS | Actual local SQL recognizes nine patched/new functions, trigger event masks, preserved grants/containment and unchanged history |
| Remote authorization / concurrency tests | NOT TESTED | This task permits read-only remote access; no live mutation RPC was invoked |
| TypeScript / frontend build / broad Vitest | NOT TESTED | No application or TypeScript source changed; not required for this SQL-only rebaseline |

### Honest environment limits and failed-run triage

- Local engine: **PostgreSQL 18.3 / PGlite 0.5.8**, single connection. Production is PostgreSQL 17.6. The exact manifest SELECT was independently executed read-only on production 17.6 and matched. The executable patch body was already exercised by earlier real staging tests and remains byte-identical; those tests were not repeated here.
- All **39 captured current production function definitions round-tripped with identical definition hashes** locally.
- Local tables use current types/defaults/not-null fields and actual scoped RLS predicates. Unrelated foreign-key topology and business triggers are not a complete production database replica.
- Auth UID transport, SHA-256 digest adapter, ordinary JWT-Admin helper and URN generator are declared local adapters. Custom Admin session validation/reviewer logic and tested lifecycle RPCs are actual captured definitions. These are not new live Supabase Auth/Storage assertions.
- Two generated organization identity-name columns are represented as typed nullable fixture columns; identity-name derivation is not certified by these tests.
- Runs 01/02 failed during fixture construction because generated expressions were mistakenly treated as DEFAULTs. The fixture was corrected using read-only generated-column inspection.
- Run 03 recorded three leaf expected-message mismatches: two denials correctly used “supported revision workflow”; the ordinary-client parent guard denied seed-marker edits before the marker trigger. Expectations now require the actual specific guard message and unchanged rows. The postgres cases independently prove the marker trigger itself remains effective.
- All failed logs are retained. Runs 04–07 passed; no production behavior was altered to satisfy a test.
- Previous broad-suite failures were not rerun, hidden or reclassified.

### File and syntax checks

- `node --check` passed for the local candidate generator and new PostgreSQL test module.
- `git diff --check` passed. Git emitted line-ending conversion warnings for existing dirty files; those files were not normalized or edited.
- New source/SQL/report whitespace checks passed. Six whitespace-only lines in the preserved failed-run TAP output are retained as raw historical evidence.
- Final integrity checks preserve the historical candidate/source hashes and all 2,912 initial status entries. Newly created files are confined to this evidence directory, the new local generator and the new test module.

## Migration history, locking and recovery

The candidate preserves the historical patch body and **does not insert a new migration receipt**. If this exact SQL is later executed directly, the expected count remains 164 and the containment receipt remains latest. Record the reviewed SQL hash, transaction outcome and post-install catalog evidence as the standalone operator receipt. If organizational policy requires a new database history row, prepare and review a different atomic candidate before authorization; do not append SQL silently or use a migration tool that adds an unreviewed receipt.

The entire candidate has one BEGIN/COMMIT, a **5-second lock timeout** and **30-second statement timeout**. These are per-lock-wait/per-statement limits, not a 30-second total transaction limit. Trigger creation takes table DDL locks and may briefly block writers. No new concurrency guarantees are claimed.

Before commit, a failure rolls back the whole patch and leaves the post-containment baseline intact. An uncertain response requires read-only reconciliation; no automatic retry. After a confirmed commit, recovery is forward-only. Keep lifecycle and fixture guards enabled; separately approve a narrow fail-closed pause/correction if needed. Never restore vulnerable RPC bodies, remove containment, or overwrite business history.

## Risks and release prerequisites

1. **Separate production authorization is absent.** The original mutation definitions still exist in production; preparation does not fix the live issue.
2. Obtain an exclusive schema-change window and immediate matching preflight. Concurrent ordinary record activity can complicate data-fingerprint preservation checks; plan a short low-traffic verification window.
3. PGlite 18.3 is not a native PostgreSQL 17.6 multi-session test. Approval/replacement contention and deadlock behavior remain unverified. Monitor lock/timeouts and investigate failed operations without retrying uncertain writes.
4. Default privileges in production grant new public functions to API roles. The reviewed explicit REVOKEs remove PUBLIC/anon/authenticated access from the new trigger helpers; service_role is trusted and may retain public trigger-function EXECUTE. Verify actual grants, rather than copying local ACL strings.
5. Broader Storage authorization and existing issued signed URLs are outside this correction. No bucket policy or URL revocation is provided by it.
6. No general Admin permission redesign, frontend release, unrelated RLS performance migration, fixture reconciliation or staging test utility is included.

## Operator deliverables and authorization boundary

- [Operator checklist](operator-checklist.md)
- [Immediate read-only preflight](preflight-verify-readonly.sql)
- [Post-install read-only verifier](post-install-verify-readonly.sql)
- [Candidate metadata](candidate-metadata.json)
- [Local test source](../../../../supabase/tests/production_document_mutation_rebaseline.local.test.mjs)

Authorize only the exact rebaselined SQL hash against `mqqaykksadotbrghbexz`, once, as one atomic transaction, with read-only reconciliation and postchecks. No current action applies or deploys it.

