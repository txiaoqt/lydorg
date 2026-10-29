# Production test-utility containment review

Date: 11 October 2026 (Asia/Manila). **Prepared locally; NOT INSTALLED.**

## Decision

**CONDITIONAL GO for separate production deployment review.** The candidate passes isolated SQL regression tests and has an operator checklist. Execution still requires explicit approval, a freshly verified production connection/catalog, and quiesced test-utility activity. **NO-GO for declaring the credential/security incident closed:** the live functions have not been replaced and the affected Auth account has not been retired.

Production and staging received no writes. There was no Auth login/password comparison, mutation, migration installation, Storage operation, frontend change, deployment or Git push in this task. Existing working-tree changes and historical staging/UAT evidence were preserved.

## Repository and evidence baseline

- Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- The initial tree was already extensively dirty with performance, security, identity, PWA, staging, migration and generated-build work. Only new containment artifacts, one offline generator and one isolated SQL test were added here.
- Fresh management metadata identifies production as `mqqaykksadotbrghbexz`, `lydo-org-focused`, with the matching project-specific database host. See [control-plane verification](control-plane-verification.json).
- Production migration history remains 163 records, latest `20261008174154`; full version/name fingerprint `380c842e791bfbcf5c7a939371e24738`.
- [Original catalog](original-catalog.json) records exact signatures, definitions, MD5/SHA-256, owners, volatility, security modes, function configuration, direct EXECUTE ACLs and recorded catalog dependencies. **One credential-bearing definition is server-redacted; its recorded hashes describe the original, not the redacted copy.** No legacy plaintext credential was retrieved or tested.
- [Expected manifest](expected-production-manifest.json) pins 31 selected functions, 11 table ACL/column/constraint/trigger fingerprints, RLS states, public/Storage policies, role memberships and full migration history. [Final fresh verification](final-readonly-verification.json) confirmed that manifest remained unchanged after preparation.
- [Entry-point inventory](entry-point-inventory.json) and static source tracing independently identify the test utilities. PostgreSQL `pg_depend` alone does not discover every PL/pgSQL/runtime dependency; the callgraph is source evidence, not exhaustive dynamic-call proof.

## Confirmed causes and effective authorization

| Finding | Current boundary | Correction prepared |
|---|---|---|
| Environment guard returns true from editable `general.environment = development` | Configuration is not trustworthy production identity | SQL helper returns false unconditionally; future installation requires external project verification |
| Nine guarded test mutations validate an Admin token but do not require a Super Admin role | A valid custom Admin session is required; EXECUTE via anon/authenticated transport alone is **not** proof of unauthenticated mutation | Replace every confirmed test mutation with an unconditional denial body and revoke API execution |
| Sample-seeder Edge gateway checks Super Admin, while direct RPC role checks are weaker | Existing gateway is stronger than direct SQL entry points | SQL denial is enforced even if a caller bypasses the gateway; false environment also rejects the gateway's authorization step |
| Three service-role repair helpers have no environment/Admin guard | Service-role-only EXECUTE; not an anonymous API capability | Deny their bodies and revoke service-role EXECUTE as well |
| Account getter contains a fixed credential, writes it into Auth and returns it | Behind a valid Admin-token/environment check; not a public unauthenticated password response | Replace the body; remove credential from current stored definition/response. Separately retire the existing Auth credential |
| Profile and four related business tables expose fixture-marker writes under owner policies | Authenticated INSERT/UPDATE grants and owner RLS do not make these markers trustworthy | Freeze all existing markers on five tables, including through definer RPCs |
| Accreditation and terminal-renewal triggers honor test GUC plus fixture/email designation | These are test exceptions, not safe authorization boundaries | Remove three ledger exceptions and two terminal-renewal exceptions; retain normal approval, revocation and authorized deletion |
| Sample-status RPC validates a token but no Super Admin role | Custom Admin auth uses anon/authenticated transport independent of Supabase user JWTs | Preserve transport grants and response structure; require active account + existing `super_admin` role server-side |

No evidence in this task establishes that the legacy credential was abused. Zero current Auth session rows does not establish absence of unexpired access tokens. The password risk remains until separately approved retirement.

## Exact forward candidate

Artifact: [production_test_utility_containment.sql](production_test_utility_containment.sql)

SHA-256: `abd2ea82587c9bbb0c18af68851faa7f83fd5a64bca113014c500b00abec8c65`

The SQL preserves argument names/defaults, signatures and return types. It replaces 17 existing functions, creates one private trigger helper and four marker triggers, and records one forward migration receipt. There are no Auth/business-record/Storage writes, fixture creation, date simulation, reconciliation, global settings changes, role changes or RLS policy changes. Keeping this artifact outside `supabase/migrations` prevents accidental inclusion in the checkout's migration replay; the exact project must still be externally pinned before any future execution.

### Twelve denial-only mutation entry points

| Exact signature | Original API EXECUTE in addition to owner | Expected API EXECUTE |
|---|---|---|
| `admin_get_or_create_renewal_test_account(text)` | PUBLIC, anon, authenticated, service_role | None |
| `admin_ensure_renewal_test_account_profile(text)` | PUBLIC, anon, authenticated, service_role | None |
| `admin_prepare_renewal_test_scenario(text,integer,date)` | PUBLIC, anon, authenticated, service_role | None |
| `admin_reset_renewal_test_scenario(text)` | PUBLIC, anon, authenticated, service_role | None |
| `admin_restore_renewal_test_scenario(text)` | PUBLIC, anon, authenticated, service_role | None |
| `admin_seed_renewal_test_registration_documents(text)` | authenticated, service_role | None |
| `admin_cleanup_yorp_sample_dataset(text,text)` | anon, authenticated, service_role | None |
| `admin_seed_yorp_sample_dataset(text,text)` | authenticated, service_role | None |
| `admin_seed_yorp_sample_dataset_core(text,text)` | service_role | None |
| `diversify_yorp_seed_projects_and_budgets()` | service_role | None |
| `rebalance_yorp_seed_reporting_quarters()` | service_role | None |
| `repair_yorp_seeded_fixture_relationships(uuid,uuid,uuid,jsonb,text)` | service_role | None |

All twelve become SECURITY INVOKER and raise SQLSTATE `42501`, including when the owner or a caller with a Super Admin token executes them. API roles have no effective EXECUTE after revocation. They have no success path, new password, fixture selector or privileged override. The signatures remain for dependent callers, which receive a denial instead of a missing-function error.

### Other changes and preserved behavior

- `is_development_or_test_environment()` becomes constant false, independent of settings, flags, email, claims or GUCs. Its existing read grants remain.
- `admin_get_yorp_sample_dataset_status(text,text)` retains its batch restriction and JSON fields; validates custom session expiry/revocation/account activity and joins the existing role to require Super Admin. PUBLIC has no EXECUTE; anon/authenticated/service_role transport is retained. The underlying validator may update session usage, so this is not a completely side-effect-free runtime API; no live call was made.
- `enforce_accreditation_immutability()` removes all date/history/superseded/delete test exceptions. Normal status supersession, revocation evidence and the existing transaction-local authorized-deletion exception remain.
- `enforce_renewal_terminal_immutability()` removes test reopening/deletion exceptions. Draft-to-review-to-approval remains allowed; approved/rejected records stay terminal. The existing authorized-deletion exception remains. No new GUC or bypass is introduced.
- `guard_organization_identity_privileges()` adds a universal check before its existing privileged-role branch. `is_renewal_test_account`, `is_seeded_sample_data`, `seed_batch`, `seed_source_year`, and `seed_source_record_number` cannot be introduced or changed, even by security-definer application paths. Existing marker values are preserved; unrelated profile/review updates remain allowed.
- `ytrace_production_containment.freeze_fixture_markers()` is a private, SECURITY INVOKER trigger helper with no API-role schema/function grants. Four `a_production_fixture_markers_guard` BEFORE INSERT/UPDATE triggers freeze `is_seeded_sample_data` and `seed_batch` on budgets, liquidations, submissions and document files. [Marker exposure evidence](fixture-marker-exposure.json) shows why profile protection alone would be incomplete. Existing rows/files are not relabeled or removed.
- Pure category resolvers remain unchanged because normal budget validation uses them. The existing seeded-registration immutability guard remains protective; its seeder is disabled. No ordinary business routine was found to require the disabled mutation entry points.
- Normal registration, revision, renewal, approval, review, account retention/deletion and session functions are not replaced. Their current permission behavior is preserved, not broadly re-certified by this patch. The Settings test actions intentionally become unavailable in production. No frontend UX redesign is included.

## Local validation

Command: `node --test supabase/tests/production_test_utility_containment.local.test.mjs`

**PASS: 85/85 Node tests, 0 failures** in [final TAP evidence](local-test-run-07.tap). This includes two aggregate parent tests; [structured results](local-sql-results.json) record 83 individual successful checks. Earlier passing runs and fixture-development failures are described in [development notes](local-development-notes.md); they are not hidden or called production defects.

| Coverage | Result | Evidence type |
|---|---|---|
| All 12 mutations denied for anon, authenticated, service_role and owner; no protected data changes | PASS | Actual PostgreSQL roles/function ACLs/exception rollback |
| Super Admin cannot execute a production-disabled test mutation | PASS | Actual denial bodies; local captured custom-session validator |
| Constant environment guard under all legacy setting values and missing setting | PASS | Actual proposed SQL |
| Retained status rejects non-Super-Admin, invalid, expired, revoked and inactive sessions | PASS | Captured production validator + real local hashed session rows; active SA works over anon transport |
| Frozen markers on all five tables, including definer caller; unrelated edits work | PASS | Actual proposed profile trigger/private helper/new triggers |
| Fixture/GUC cannot rewrite ledger dates, reactivate superseded term, reopen/delete terminal renewal | PASS | Actual proposed trigger bodies |
| Normal three-year renewal draft/submission/Admin review/approval and preserved prior term | PASS | Captured unmodified production RPCs, local fictional records |
| Registration correction preserves peer/history; review creates normal initial accreditation | PASS | Captured production revision/review/automatic-verification functions |
| Authorized deletion of non-retained account; retained official history denied | PASS | Captured production deletion + reviewer/retention functions |
| Credential-bearing test function definitions replaced by denial-only sources | PASS | Actual installed local catalog, no credential expression/response |
| Original production manifest rejects local DB; function/ACL drift stops install | PASS | Complete candidate gate executed |
| Injected post-install grant error rolls back replacements, ACLs, namespace/triggers and receipt | PASS | Actual transaction rollback and exact before/after catalog comparison |
| Node syntax and normal configured `git diff --check` | PASS | Local commands; new text artifacts also checked separately |
| Supabase production/staging HTTP/real Auth login, concurrency, browser/PWA | NOT TESTED | Not authorized/needed for this local preparation; completed UAT was not replayed |

PGlite 0.5.8 executes PostgreSQL rather than JavaScript mocks of authorization. The tables/roles/identities are fictional and the schema is focused, not a complete production clone. Tests use a local `auth.uid()` driver, a narrow SHA-256 digest adapter, and peripheral setting/URN adapters. Admin token validation, reviewer authorization, retained-history logic and normal business RPCs are captured SQL. Table grants are deliberately broad in the fixture to test function/trigger enforcement; this is **not** live Supabase RLS certification.

The complete production candidate is tested with only its expected-catalog JSON literals substituted for the local fixture catalog; replacement bodies, grants, timeouts, gates, postconditions and receipt run unchanged. The untouched production gate is separately verified to reject the local database. This does not prove live installation permission or multi-session contention safety. No production credential is loaded by the generator or test file.

No TypeScript/build/full Vitest/PWA rerun was performed: no frontend file changed, and this task calls for isolated SQL validation rather than replaying completed UAT. Existing broader test failures remain separate.

## Credential containment and remaining risks

The SQL removes the embedded credential from the current function definition and response. It cannot erase prior Git/migration history, backups, logs or copies of an already disclosed password; nor does it rotate the existing Auth secret. Fresh read-only evidence identifies exactly one affected account and preserved business association without retrieving a password/hash. See [credential-retirement plan](credential-retirement-plan.md) for separately authorized ownership review, rotation/ban, supported refresh-session revocation, audit and token limitations.

Key deployment conditions:

1. Explicit production approval for the final hash; immediate external project/TLS verification and exact catalog match.
2. Verified installation privileges and a low-traffic, bounded-lock window. Four trigger creations take table locks; five-second lock timeout must abort on contention.
3. Quiescence of test utilities. The advisory lock prevents parallel installers, not arbitrary API activity. The active-call check cannot prove all possible in-flight/just-started calls are absent. Do not install until operators stop test maintenance activity.
4. Separate Auth credential retirement. Existing access JWTs and signed Storage URLs may survive until their respective expiry; zero session rows is not universal revocation proof.
5. Historical seeded rows remain marked and readable through existing authorized workflows. Future relabeling requires separate data review, not removal of marker guards. In-flight or unusual upsert paths not covered by the local cases need a focused approved smoke check; no broad business-history repair is bundled.
6. The broader Storage RLS/gateway cutover is unchanged and still requires its own compatibility review and approval. This patch is not a claim of full production security readiness.

## Installation and recovery

See [operator checklist](operator-checklist.md) for required permissions, fixed-project connection, exact hash/catalog comparison, atomic transaction, post-deployment checks and fail-closed recovery. Any pre-commit failure rolls back everything. An uncertain response requires read-only reconciliation, not an automatic retry. Post-commit recovery is forward-only; never restore the credential-bearing functions, test bypasses or broad mutation grants.

The separate document-mutation candidate remains unchanged at SHA-256 `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785`. Installing containment first adds migration receipt `20261011230000` and two new document-table marker triggers. Its current migration-count/latest-version and trigger gates must then fail; it needs a newly reviewed exact baseline and hash. Installing the hotfix first likewise invalidates containment's original catalog gate. Neither gate may be silently weakened.

**Recommendation:** approve containment and the exact-account retirement as distinct controlled actions first, then revalidate the standalone document hotfix against the resulting catalog. Keep the Storage cutover and frontend release independent. Nothing is automatically executed by this review.
