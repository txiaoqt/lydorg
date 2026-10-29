# Y-TRACE Storage remediation — final local readiness and approval boundary

10 October 2026 (Asia/Manila). Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8` (nothing committed). Production project `mqqaykksadotbrghbexz`.

**Recommendation: NOT production-ready. Ready for controlled staging validation once an isolated target is authorized.** No SQL, policy, Edge Function, frontend, Storage object or migration-history change was made in any cloud project. Production was accessed only through `supabase db query --linked`, using single `SELECT`s wrapped in `begin transaction read only`. Nothing was pushed, deployed or linked differently.

Evidence levels used below:

- **[U]** local unit/contract tests (Vitest, mocks)
- **[P]** isolated PostgreSQL (PGlite) running the actual migration SQL with synthetic rows
- **[R]** read-only production inspection
- **[S]** real Supabase Storage/Edge API tests (none were possible)

## 1. Branch and files

All previously uncommitted work was preserved. Changes made in this task:

| File | Change |
|---|---|
| `supabase/migrations/20261009145634_storage_authorization_remediation.sql` | Revised in place (never applied anywhere, see §4): removed the hardcoded host; added the trusted-origin registry, resolver, backfill, audit and public-asset predicate helpers; `service_role` schema USAGE |
| `supabase/migrations/20261009150110_storage_authorization_cutover.sql` | Revised in place: foundation dependency check, legacy-reference gate, host-free template/news policies |
| `src/lib/lydo-connect-supabase.ts` | `extractPublicStoragePath` only accepts this environment's Supabase origin |
| `src/lib/admin-storage-resolver.integration.test.ts` | Foreign-origin news cleanup test |
| `supabase/tests/storage_fixture_schema.mjs` (new) | Shared PGlite fixture |
| `supabase/tests/storage_origin_portability.local.test.mjs` (new) | Portability matrix |
| `supabase/tests/storage_admin_gateway_roles.local.test.mjs` (new) | Per-role gateway matrix |
| `supabase/tests/storage_remediation.local.test.mjs` | Uses shared fixture and a registered fixture origin instead of the production host |
| `docs/staging-validation/2026-10-10/*` | This report; `setup.md` updated; reconciliation, drift, legacy-audit, dependency and test evidence |

## 2. Implementation state found (Phase 1)

The foundation, cutover, gateway (`control.ts`, `index.ts`), lazy Admin client, signed-URL cache and PWA avatar changes were complete and consistent with the previous report. The only functional defect was hostname portability. The other gaps found were operational:

- `service_role` lacked schema USAGE for the new deployment helpers.
- A frontend helper accepted public URLs from any host.

The existing behaviour was not redone.

## 3. Migration portability fixes (Phase 2)

- **Canonical first.** `storage://bucket/path` resolves the same way in every environment.
- **Legacy HTTP URLs.** `public_asset_reference(bucket, url)` accepts `<origin>/storage/v1/object/public/<bucket>/<name>` only when `<origin>` is in `ytrace_storage_private.trusted_storage_origins`. It:
  - strips query and fragment;
  - percent-decodes the path, keeping invalid escapes literal and failing closed on invalid UTF-8;
  - rejects other buckets, `sign`/`authenticated` paths, userinfo tricks, suffix-host tricks and empty names.
- **Who can change the trust list.** The registry has RLS on and no grants. Only `register_trusted_storage_origin()` writes to it, and only the migration owner and `service_role` can execute that. The origin format is validated by a CHECK constraint. A caller-supplied host is never trusted.
- **What uses the resolver.** The binding trigger, backfill, gateway `resource_references`, `is_active_template` and `is_published_news_image` all go through this one resolver, so trust is decided in one place.
- **No automatic metadata rewrite.** Production rows keep their legacy URLs. Production must register `https://mqqaykksadotbrghbexz.supabase.co` as a reviewed deployment step (§16).
- **Frontend.** `extractPublicStoragePath` now requires `url.origin === VITE_SUPABASE_URL` origin. The signed-URL path already checked the origin.

**Tests:** [P] `storage_origin_portability` (21 reference shapes plus registry, role, binding, gate, policy, gateway and duplicate cases) and [U] the resolver test. Covered:

- production-style, staging, canonical, malformed, foreign-project, encoded, duplicate/ambiguous and untrusted-host references;
- anon/authenticated cannot read or modify the registry;
- `service_role` can register origins but has no direct table access.

Evidence: `origin-portability-matrix.json`.

Unchanged and outside this rollout: the email templates and email Edge Functions still embed the production logo URL. That is cosmetic for staging (the logo image would load from production) and has no authorization impact.

## 4. Migration history reconciliation (Phase 3) — [R]

Evidence: `migration-reconciliation.json`.

- **Naming-only: all 16 same-name/different-version pairs.** After normalization, the applied SQL in `schema_migrations.statements` is byte-equivalent to each local file. None contain SQL changes.
- **Version `20260905`.** The live entry is a duplicate `admin_ypop_sync_rpcs` row. The local `20260905_ypop_workflow_closure_evaluation.sql` has no history row, but its function exists live with an identical body, so it was applied out-of-band. `db push` would skip it because the version is already recorded.
- **Genuinely unapplied (3):**
  - the separate performance proposal `20261009114340`;
  - the Storage foundation;
  - the Storage cutover.
- **Storage migrations never applied.** Production history does not list them, and the `ytrace_storage_private` schema does not exist live. Editing them in place was therefore permitted.
- **Standalone repair scripts.** 30 `supabase/*.sql` files exist with no recorded order. They alter tables they do not create.
- **Empty-database bootstrap: BLOCKED.**
  - 37 of 53 live public tables have no CREATE statement anywhere in the repo, including `organization_profiles`, `document_submissions`, `budget_requests`, `admin_accounts`, `roles` and `admin_sessions`.
  - 20 of 21 enums have none either.
  - Only 15 tables come from versioned migrations, and 1 comes from a standalone script.
  - **A reviewed schema-only baseline is required** (procedure in `setup.md` §3). It needs a securely supplied read-only DB connection string, which was not available.
- **No history repair, fetch or push was run.**

**Deployment hazard:** all three unapplied files sit in `supabase/migrations/`. Any `supabase db push` would apply the performance migration and foundation together, then fail at the cutover gate. Never run `db push` for this rollout (§16).

## 5. Storage policy cutover review (Phase 4)

**Live drift check [R]:** the cutover's embedded 15-policy expectation **exactly matches** live `pg_policies` today (`cutover-drift-check.json`).

What the cutover does:

- Drops 12 policies, all of which exist.
- Leaves 3 policies unchanged: transparency admin manage, transparency public read, YORP seed read.
- Creates 6 `ytrace_*` policies, with no name collisions.

| New policy | Command | Roles | Predicate |
|---|---|---|---|
| `ytrace_private_organization_read` | SELECT | authenticated | five private buckets, object owner = `auth.uid()`, `organization_object_access(...,'read')` |
| `ytrace_private_organization_insert` | INSERT | authenticated | same, `'insert'` (existing editable parent; lifecycle and semester locks) |
| `ytrace_private_organization_delete` | DELETE | authenticated | same, `'delete'` (or a 15-minute cleanup receipt) |
| `ytrace_published_profile_avatar_read` | SELECT | anon, authenticated | `is_public_avatar` (verified, opted in, exact profile path, image MIME, owner) |
| `ytrace_active_templates_read` | SELECT | anon, authenticated | `is_active_template(name)` |
| `ytrace_news_images_read` | SELECT | anon, authenticated | `is_published_news_image(name)` |

Other properties checked:

- **No UPDATE policy**, so reviewed bytes cannot be overwritten or renamed.
- **All policies are permissive.** None reintroduces a bucket-only predicate.
- **Grants.** The policy helpers have EXECUTE for exactly the roles that use them. Internal helpers are revoked from PUBLIC/anon/authenticated. The gateway RPC is `service_role` only.
- **Gates, in order:**
  1. approval flag `app.storage_remediation_validated`, never set by this task;
  2. `lock_timeout` 1s and `statement_timeout` 30s;
  3. new foundation-dependency check;
  4. new legacy-reference gate: any published news or active template row that looks like a Storage URL but does not resolve aborts the cutover;
  5. drift guard.
- **Transaction behaviour [P].** If any gate fails, the whole transaction rolls back and the 15 live policies stay untouched.

**Live dependencies [R].** Every column the foundation reads exists (0 missing). Also confirmed:

- the `validate_admin_session_token` body is identical to the version the tests use;
- `storage.objects.owner_id` is `text`;
- no `ytrace_*` triggers exist yet;
- enum values match the predicates (`suspended_inactive`, `open`, MOVE and liquidation statuses).

## 6. Legacy Storage compatibility (Phase 5) — [R], aggregates only

Evidence: `legacy-reference-audit.json`; re-runnable query: `legacy-reference-audit.sql`.

| Area | Finding |
|---|---|
| Private references (registration 37 objects, budget 6, liquidation 5, YPOP city proof 17, YPOP org activity 4) | 100% canonical. Every object exists, its owner equals the parent org's user, and its path prefix is correct. 0 missing, 0 owner mismatches, 0 legacy-owner-only, 0 `owner`/`owner_id` disagreements, 0 HTTP references |
| Registration seed references (510) | Point at the public `registration-seed-file` sample bucket; unaffected by the cutover |
| Renewal, YPOP entry, MOVE, profile-image references | 0 rows today |
| Ambiguous cross-org objects / objects referenced twice | 0 / 0 |
| Revision history | 2 rows, canonical references only, no HTTP |
| News | **3 published rows use legacy production public URLs**, which resolve once the production origin is registered. 0 encoded |
| Templates | 13 active, all canonical |
| Unreferenced objects | org-documents 152, budget 31, liquidation 16, YPOP 17, MOVE 1, templates 56, news 12. Owners keep reading their own files whose parent still exists. Admin signing fails closed for them. **Nothing deleted** |
| Unowned objects | Only news (15) and templates (69), which were uploaded under the old bucket-wide policy. Asset policies do not depend on owner. Cleanup goes only through gateway bindings |
| Published avatars | 0 candidates, so no avatar visible today disappears |

No broad-permission compatibility fallback was added. The only legacy accommodation is the reviewed, server-registered origin for the 3 news rows.

## 7. Custom Admin gateway (Phase 7) — [P] (no [S])

Every signing call:

- runs the captured validator (expiry, revocation, active account);
- re-reads `admin_accounts.is_active` and the current role permissions;
- requires reviewable authoritative metadata, the correct parent, organization consistency and the actual object owner;
- rejects ambiguity;
- returns only the exact requested object.

The Edge wrapper bounds the request body at 8 KB, validates input, never logs anything and only uses `service_role` server-side.

`storage_admin_gateway_roles` (`admin-gateway-role-matrix.json`): 11 actors × 9 document kinds.

| Actor | Can sign |
|---|---|
| Super Admin | everything reviewable |
| Registration / renewal reviewer (`registrations_management`) | registration and renewal |
| YORP registry viewer | approved documents of verified organizations only |
| Budget / liquidation / YPOP reviewer | only their own area |
| Unauthorized admin, expired session, revoked session, inactive account | nothing |

Denied in all cases:

- a permission removed after login;
- an account deactivated after login;
- unreferenced, owner-mismatched or missing objects;
- objects referenced by two organizations;
- a liquidation whose budget belongs to another org;
- a YPOP file whose redundant org field disagrees with its parent;
- path traversal, wrong bucket or an unsupported bucket;
- draft budget and MOVE files;
- direct RPC calls from anon or authenticated.

**Live note [R]:** no live role has `renewals_manage` and no MOVE permission exists, so renewal signing effectively needs `registrations_management`.

## 8. Organization A/B isolation (Phase 6)

- **[P] PASS** (`storage_remediation`):
  - A and B each see exactly their own 5 private objects and never the other's.
  - Anonymous and suspended users see 0.
  - An Admin's ordinary JWT gets no bypass.
  - Inserts are allowed only into an editable parent the user owns. UPDATE is never allowed. DELETE is limited to the owner's editable objects.
  - Also covered: review/revision locks, expiry and unlock; reused parent UUIDs; `owner_id`-only objects; cleanup-receipt expiry.
- **[S] BLOCKED:** real JWTs, signed URL creation, preview/download bytes, TUS upload.

**Decision needed (not invented):** the cutover denies a `suspended_inactive` organization even reading its own private files. The current app blocks suspended **actions** (`assertOrganizationNotSuspended`) but does not obviously block viewing. One such organization exists live. Product owners must confirm read denial is intended; if not, the reviewed change is confined to `organization_object_access`.

## 9. Public assets [P]

- Active canonical and env-URL templates are readable; inactive templates are not.
- Published canonical and env-URL news images are readable; archived, foreign-origin and orphan images are not.
- Anonymous template/news insert, update and delete are denied.
- The avatar exception requires verified + opted-in + image MIME. A PDF is never treated as an avatar.
- Public-bucket HTTP serving still bypasses object RLS, so an archived news image URL remains publicly fetchable. This is existing behaviour.
- **[S] BLOCKED.**

## 10. Workflow regression (Phase 8)

- **[U] Covered:**
  - registration bulk/TUS transport, Retry Failed, partial success;
  - renewal Realtime;
  - YPOP persistence and PPA sync;
  - Admin lifecycle;
  - reports/Section 35.
- **[P] Covered:** lifecycle locks for each workflow.
- **Full end-to-end registration, renewal, budget, liquidation and YPOP runs against real Storage: BLOCKED [S].**

## 11. MOVE limitations

- No frontend upload workflow exists, and there are 0 metadata rows.
- One unreferenced object exists; it stays unsignable.
- Organization uploads are allowed only in draft or needs-revision states.
- Admin signing is Super Admin only, for non-draft files.
- **Undecided:** which MOVE phases accept documents, and which permission should govern review. These need business confirmation before MOVE is enabled. Unsupported operations remain denied.

## 12. Staging availability (Phase 10)

**BLOCKED.** There is still no authorized isolated project.

- Projects visible to the CLI: production, `lydooo` (inactive) and EHR-Capstone (unrelated). None was touched.
- Docker, psql and Deno are unavailable. The repo-local Supabase CLI v2.118.0 exists.
- No cloud resource was created.

## 13. Required staging configuration

Follow `setup.md`:

1. Authorized project ref.
2. Reviewed schema-only baseline (needs a read-only DB URL).
3. Foundation applied in a transaction.
4. **Register the staging origin only.**
5. Deploy the gateway with `verify_jwt=false`.
6. Isolated frontend using `frontend.env.example`.
7. Synthetic actors.
8. Gated cutover via `psql --single-transaction`.
9. The real API matrix.

## 14. Test and build results (Phase 14)

| Check | Result | Level |
|---|---|---|
| `npx tsc --noEmit` | PASS | — |
| `vite build` (synthetic env) | PASS (existing large-chunk warning) | — |
| `git diff --check` and new-file whitespace check | PASS (line-ending warnings only) | — |
| Focused Vitest: 20 files (the previous 14 + performance/news/template tests) | **215 passed, 0 failed** | [U] |
| PGlite: readiness reproduction, remediation matrix, origin portability, gateway roles | **4/4 passed** | [P] |
| Full repository Vitest | NOT TESTED (previous baseline: 151 failures, unrelated and unresolved) | — |
| `performance_auth_uid` / `organization_identity` PGlite | NOT RUN (outside this rollout) | — |
| Real Storage/Edge API | BLOCKED | [S] |

## 15. Performance impact (Phase 13)

- Initial static JS: 1,244,090 → 1,244,143 bytes (+53); gzip +13 bytes; 40 chunks. The build environments differ, so this is not attributable to a code change.
- The database helpers add one indexed-equivalent function call per policy row.
- Template and news predicates now call a plpgsql resolver per candidate reference row: 13 + 3 rows today, which is negligible. Re-measure if those tables grow large.
- No new polling, preloading, mass signing or subscriptions.
- All previous optimizations are untouched and their tests pass: lazy portals, template cache, settings dedupe, YPOP coalescing, account-scoped cache, private cache clearing, targeted Admin checks.
- Signing latency and request counts against the real gateway: BLOCKED [S].

## 16. Production rollout sequence — PLAN ONLY, NOT EXECUTED

Apply everything with `psql --single-transaction --set=ON_ERROR_STOP=1` (or an equivalent reviewed transactional runner). In the same transaction, insert the migration's row into `supabase_migrations.schema_migrations` (version, name, statements), just as `db push` would. That record-keeping step needs explicit approval; it is not a history repair. **Never run `supabase db push`**, because it would include `20261009114340`.

1. Final migration review (this report, `cutover-drift-check.json`).
2. Legacy review: re-run `legacy-reference-audit.sql`.
3. Complete the real staging matrix (§8–§10 [S]).
4. Obtain written deployment approval.
5. Apply the foundation (inert; policies unchanged).
6. **Register `https://mqqaykksadotbrghbexz.supabase.co`** in a separate reviewed transaction. Run `asset_reference_audit()`: expect 3 news rows resolvable and 0 unresolved.
7. Deploy `admin-storage-access`.
8. Deploy the compatible frontend.
9. Verify gateway and frontend: Admin previews through the gateway; org/public flows still work under the old policies.
10. In the approved transaction: `SET LOCAL app.storage_remediation_validated='on'`.
11. Apply the cutover in that same transaction (dependency, legacy and drift gates).
12. Immediate smoke tests: anonymous private denial; A/B; Admin per role; templates; the 3 news images; registration upload.
13. Monitor 403/denial rates, upload failures and gateway errors.

Stop if gateway/frontend checks fail before cutover, or on any gate or drift failure.

## 17. Rollback / forward recovery

- **Before cutover:** roll back the frontend or gateway. The foundation and registered origin are inert and can stay.
- **After cutover:**
  - Keep the secure gateway and client.
  - Temporarily disable the affected operation in the UI.
  - Diagnose with `asset_reference_audit()` and the gateway's 403s.
  - Ship a reviewed forward correction, for example registering a missing origin or fixing a lifecycle predicate.
- **Never** restore the 12 bucket-only policies or add an anonymous fallback.
- Failed migrations roll back atomically.

## 18. Signed URL security (Phase 12)

Lifetimes are unchanged: downloads 3,600 s; signed uploads up to 2 h. None of the following revoke an already-issued URL or upload token:

- client cache clearing (60 s client reuse);
- logout;
- suspension;
- Admin revocation;
- the policy cutover itself.

The exposure window after revocation or cutover is therefore up to 1 h for downloads and 2 h for uploads. Mitigation options, each needing separate approval:

- shorten the download lifetime after real iframe/download duration tests;
- issue upload tokens just-in-time;
- incident-time object quarantine.

Immediate revocation is not claimed.

## 19. Remaining risks

1. No real Storage/Edge/JWT validation yet.
2. Schema-only baseline not produced (blocked on credentials).
3. Suspended-organization read decision pending.
4. MOVE semantics undecided.
5. All three pending migrations share `supabase/migrations/`, so a careless `db push` would mix them.
6. Archived public news images stay publicly fetchable by URL.
7. Bearer-URL revocation window.
8. 151 unrelated baseline test failures.
9. Email templates still point at the production logo.

## 20. Exact production blockers and readiness classification

| Requirement | Status |
|---|---|
| Migration portability (no embedded host; trusted-origin design) | PASS [P] |
| Migration history reconciliation | PASS [R]: naming-only, documented |
| Empty-database bootstrap / schema baseline | BLOCKED: needs read-only DB credential and review |
| Cutover drift guard vs live | PASS [R] |
| Cutover gates and atomic rollback | PASS [P] |
| Live dependency presence | PASS [R] |
| Legacy reference compatibility | PASS [R] (requires production origin registration step) |
| Organization A/B / anon / suspended isolation | PASS [P]; BLOCKED [S] |
| Suspended read-denial business decision | BLOCKED: decision |
| Custom Admin gateway role matrix | PASS [P]; BLOCKED [S] (deployed Edge Function) |
| Public templates / news / avatars | PASS [P]; BLOCKED [S] |
| Workflow regressions (registration, renewal, budget, liquidation, YPOP) | PASS [U]/[P]; BLOCKED [S] end-to-end |
| MOVE lifecycle | BLOCKED: business decision |
| Client compatibility (cache isolation, dedupe, no fallback, PWA avatar) | PASS [U]; NOT TESTED in real browser against staging |
| TUS / slow network / installed PWA | BLOCKED [S] |
| Signed URL expiry enforcement | NOT TESTED [S] |
| Performance (static) | PASS; real latency NOT TESTED |
| tsc / build / diff check / focused tests | PASS |
| Authorized isolated staging | BLOCKED |
| Production deployment approval | BLOCKED |

**Final recommendation: BLOCKED for production.** Next actions needed from the owner:

1. Authorize an isolated staging project, or approve creating one with an org/region/cost limit.
2. Provide a read-only DB connection through a secure channel for the schema baseline.
3. Decide on suspended-organization read access and MOVE scope.
