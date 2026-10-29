# Y-TRACE production readiness, security and regression validation

Date: 9 October 2026, Asia/Manila. Supabase project: `mqqaykksadotbrghbexz`.

## 1. Decision

**Production readiness: FAIL. Do not approve an unconditional production rollout.**

The frontend performance improvements remain intact, and the narrowly scoped client hardening has passing focused tests. However, current live Storage policy definitions contain a cross-organization/anonymous read exposure and overly permissive template metadata writes. Exact captured predicates and grants reproduced those failures in isolated PostgreSQL. This is a server authorization problem that client caching cannot fix.

True authenticated Admin/Organization/PWA end-to-end validation is BLOCKED by the absence of an authorized isolated environment and supplied test credentials. The full repository suite is also not green: 151 remaining assertion failures reproduce at HEAD. No production records, policies, indexes, authentication settings or Storage objects were modified. Nothing was pushed, deployed or applied.

See [Storage security review](storage-security-review.md) and [authenticated acceptance plan](authenticated-acceptance-plan.md).

## 2. Git and initial state

- Branch: `ui-refactor`.
- HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- Latest locally available commits inspected: `2f6e742`, `12eb2f3`, `696705c`, `01c5d8a`, `8214b26`. No claim is made that a remote branch could not have advanced; no pull/reset/checkout/push was performed.
- Initial tracked modifications: `src/App.tsx`, `src/components/public/PublicTemplatesCatalog.tsx`, `src/lib/admin-system-settings.ts`, `src/lib/lydo-connect-supabase.ts`, `src/lib/renewal-realtime.test.ts`, `src/user/UserPortalEntry.tsx`.
- Initial untracked work included prior performance evidence/scripts/tests, the RLS proposal, its local harness and `tmp/`. Exact inventory: [initial-working-tree.txt](initial-working-tree.txt).
- All prior optimization work was preserved. The existing HEAD archive under `tmp/performance-head` was used for comparison; the main checkout was not reset. Its previously documented temporary SQL line-ending normalization is an archive artifact, not a change to an applied migration.

## 3. Optimization state audit

| Existing improvement | Current finding |
|---|---|
| Lazy AdminPortal/browser UserPortal | Still lazy; authorization gates remain outside protected route content; added chunk-load recovery |
| Public template catalog | Five-minute freshness, no interval polling, explicit refresh preserved |
| Public settings | Overlapping requests still share the in-flight request; failures can retry |
| YPOP selected-file Realtime coalescing | Preserved; burst/in-flight/cleanup tests pass |
| RLS optimization proposal | Original filename exists; live migration history confirms unapplied |
| Scoped loaders | Server search/filter/page boundaries preserved; no snapshot refresh mechanism introduced |
| Admin synchronization | Existing visible/active-resource eight-second version checks preserved |
| Organization synchronization | Existing RLS-scoped channels and selected-file detail refreshes preserved |
| React Query | Retry/caching defaults preserved; private results now removed on account transitions |
| Uploads | TUS, adaptive concurrency, partial success/retry and document locks untouched |
| Exports/identity workflows | Quarterly/all-pages export, organization dossier and identity checks untouched |

Inspected the requested entry points, provider, query client, Admin/User portal and PWA code. No rendering architecture refactor, new background polling, eager file signing, broad recurring invalidation or full export preloading was introduced. `get_admin_portal_snapshot`, `loadAdminPortalSupabaseState` and `loadLydoConnectSupabaseState` were not restored as recurring refresh paths.

## 4. Signed Storage URL cache findings and fixes

Previous implementation:

- Cache and in-flight maps keyed only by bucket/path, across accounts.
- Negative-result Set with no expiration; some generic 400 responses permanently poisoned future attempts.
- A signing failure could fall back to a public URL even for a private bucket.
- Pending responses could populate caches after logout/account changes.
- Raw exception/path logging could expose sensitive request details.

Current implementation:

- New in-memory `SignedStorageUrlCache`; context includes Supabase principal/access credential and custom Admin credential, never persisted or logged.
- Clear on sign-in/out, token refresh, user update, local logout reset, Admin session changes and relevant cross-tab storage events.
- Read current context before use and after signing; generation checks reject old in-flight results. A stale request cannot delete a newer account's pending entry.
- Same-context concurrent requests share one signing request. A hung request stops occupying the pending cache after 30 seconds; late responses are discarded. The underlying SDK request is not forcibly cancelled.
- Positive client freshness: at most 60 seconds and bounded by known session expiry; at most 256 cached entries.
- No negative cache: missing, transient and denied responses can retry immediately. No public fallback on signing failure and no raw error logging.
- Known-project legacy signed/authenticated HTTP references are converted back to Storage references and reauthorized. Public/external links and blob/data previews remain supported.
- Lazy signing remains selected-file driven. No HEAD probes, mass signing or automatic PDF binary downloads were added. `getSession()` normally reads SDK state; it may refresh an expired session when required.

**Important limit:** server URL issuance remains the existing 3,600 seconds. Already-issued URLs remain usable until server expiry; client invalidation does not revoke them. Unknown permission/suspension changes are not instantly communicated to this cache. Reauthorization occurs on a subsequent preview after client freshness expires, and server policies must correctly deny access. Already-open previews are not revoked.

Official references: [signed URL API and SELECT requirement](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## 5. Additional account-cache hardening

Several Admin React Query keys are not partitioned by Admin identity. The provider reset its local state but did not remove the shared private query results. Added `clearPrivateQueryCaches()` on logout/account transitions: cancel and remove only `admin`/`user` query namespaces. Public metadata caches and local draft/form state are untouched. This is identity-transition cleanup, not recurring whole-portal invalidation or polling. Late cancelled requests cannot repopulate the removed query entries in the focused test.

## 6. Signed URL and account-cache tests

| Coverage | Result and evidence level |
|---|---|
| Same-user cache hit/concurrent deduplication | PASS — unit and production-resolver integration mocks |
| A→logout→B, same bucket/path | PASS — no A URL returned by client cache; mocked B denial has no public fallback |
| Switch without reload/pending response race | PASS — generation/context tests and local logout event integration |
| Token refresh/session expiration | PASS — unit and auth-event integration fixtures |
| Expired client URL freshness | PASS — fresh signing after 60 seconds, session lifetime capped |
| Transient/404/authorization recovery | PASS — immediate retry, no permanent negative entries |
| Revocation response | PASS — after reauthorization denies, no stale cached URL is returned |
| Suspension/permission event | PASS — explicit invalidation fixture; real suspension propagation remains BLOCKED |
| Hung signing and late completion | PASS — bounded pending lifetime, late result ignored |
| Sensitive logging/persistence | PASS — resolver/helper tests; no raw signing logs or persistence introduced |
| Shared private query cache | PASS — private namespace removal and late-request rejection; public metadata retained |
| Live Organization B denied Storage access | FAIL at captured policy level; live exploit/API testing was not performed |

15 cache unit tests + 9 resolver integration tests pass. The account-cache follow-up run passed 43 tests across five suites, including these tests and existing account-switching/query-client checks. These are mocks/local client tests, not live authorization certification.

## 7. Authenticated Admin smoke testing

True authenticated tests: **BLOCKED**. No isolated project/test credentials were supplied. Production custom session-validation RPCs were not executed because they update `last_used_at`.

Local Edge fixtures use the actual production frontend build, a synthetic Admin session and intercepted empty RPC results. **All non-local traffic is intercepted**. Thirteen page routes rendered without console errors or unhandled page errors: Overview, Registrations, Renewals, Budget Requests (`/admin/budget-utilization`), Liquidations (`/admin/liquidation-monitoring`), YPOP Validation, YORP Registry, Budget Monitoring, Activity Logs, Notifications, Templates, Settings, Backup & Recovery. Anonymous `/admin` redirected to `/signin`. These verify empty-state route loading, not record correctness, real login, write workflows or server permissions. The deliberately aborted Admin chunk produced two expected console errors, displayed recovery, and produced no unhandled page error; console payloads were not persisted.

Fixture evidence contains request paths/methods only, never session tokens or signed URL queries. Initial Overview fixtures still showed overlapping validation/dashboard/sidebar requests. This remains an investigation item for isolated authenticated traces; no server validation was removed to improve those counts. Data-bearing records, document reviews, search/pagination and reports require the acceptance plan in an isolated environment. Existing automated suites exercise these features with mocks and have mixed results described below.

## 8. Admin and Organization synchronization

Actual Admin timer/visibility code with mocked versions, on Budget Requests:

| Fixture phase | Observed traffic |
|---|---|
| Unchanged version, nine seconds | One version RPC; no review/list/detail business refresh. Independent session renewal occurred |
| Relevant budget version changed | One version RPC + one targeted review-page RPC |
| Unrelated registration version changed | One version RPC; no review-page refresh |
| Hidden tab, nine seconds | Zero requests |
| Visible again after budget change | Immediate version check + one targeted review-page refresh |

No page errors were captured. Evidence: [browser-fixtures.json](browser-fixtures.json). Pure mapping tests cover all resource version keys; Organization Realtime tests cover organization filters, selected detail/semester, bursts, in-flight convergence and cleanup. Tests assert exact current scoped invalidation keys. Actual live triggers/counters/cross-profile events for registration, renewal, liquidations and both YPOP lanes remain BLOCKED pending an isolated two-profile run. No direct anonymous Admin subscriptions were introduced.

## 9. Organization website, PWA and slow network

- Actual Organization A/B login, records and direct API/RPC isolation: **BLOCKED**. Existing client isolation tests pass, but cannot replace real policy checks.
- PWA route/auth-flow/profile-draft and resumable transport checks passed in the 85-test focused security/workflow run. Wider existing component suites still fail on HEAD.
- Installed device/browser PWA, service-worker update lifecycle, authenticated preview/download/reconnect: **BLOCKED**. No physical installed device was tested.
- Slow Admin cold load: rendered Overview with intercepted fixtures under simulated 200 ms latency / 200 KB/s download, no page error. This is not a physical mobile-data result.
- Deferred chunk tests exercise loading fallback, eventual arrival, failed import recovery, existing browser draft retention and installed-route redirection. Failed Admin chunk browser fixture shows recovery with no unhandled page error.
- New `RouteChunkBoundary` handles lazy chunk failures after bootstrap and offers manual reload with an unsaved-input warning. It does not automatically reload or clear drafts; application errors still propagate to existing error handling.
- Existing worker uses network fetches for `/assets/`; offline cold chunk availability and initial bootstrap asset failure are not solved by this boundary. Saved HTML alone cannot guarantee offline cold loading. No service-worker redesign was made.
- TUS transport's 13 mocked tests cover interruption/progress/retry, adaptive concurrency, account-change authorization, cleanup and no duplicate completed transfers. Real endpoint interruption/resume/partial-success transfer-byte validation remains BLOCKED.

## 10. Authentication/session safety

No session validity, inactivity timeout, permission enforcement or server token validation rules changed. Existing expiry/revocation handling and network-vs-authoritative error distinction were inspected. Client caches do not replace server authorization. Lazy entries remain under the existing auth/role/recovery/email gates. Private cache clearing is synchronous on recognized identity transitions; scoped user token refresh does not trigger business-cache clearing. `auth-session-recovery`, `admin-permissions`, account-switching, PWA auth-flow and transport tests passed in the focused run. Two older Admin inactivity tests fail on both HEAD/current because expectations use old fixed expiry behavior; they were not used to justify changing production timeout logic.

## 11. Live database and Advisor evidence

Read-only captures: [live-schema.json](live-schema.json), [live-guards.json](live-guards.json). These contain policy/function/schema metadata, not production record contents. Captured 82 public/Storage policies, current grants/RLS flags, bucket privacy, 36 relevant triggers and authorization helper definitions. Private organization buckets remain private; the policy predicates, not bucket privacy flags, cause the identified exposure.

| Current Advisor category | Count |
|---|---:|
| auth_rls_initplan | 33 |
| unindexed_foreign_keys | 34 |
| unused_index | 18 |
| multiple_permissive_policies | 114 |
| auth_db_connections_absolute | 1 |
| rls_enabled_no_policy | 9 |
| function_search_path_mutable | 11 |
| extension_in_public | 1 |
| anon SECURITY DEFINER executable | 199 |
| authenticated SECURITY DEFINER executable | 203 |
| leaked password protection disabled | 1 |

These counts match the previous evidence. Broad SECURITY DEFINER execution findings require review of each function's internal checks; counts alone do not prove unauthorized execution. Bucket-only Storage predicates were independently inspected and reproduced. No policies were merged or indexes dropped/added.

References: [RLS InitPlan Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [unindexed FK Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Full notices/remediation URLs are in the two Advisor JSON files.

## 12. RLS migration readiness

`supabase/migrations/20261009114340_performance_auth_uid_initplans.sql` still exists under the original filename. Live migration history confirms it is **NOT APPLIED**.

All 33 captured target policy definitions exactly match current live definitions: schema/table/name, roles, command, permissive mode, USING and WITH CHECK. No drift found. Current grants and table RLS states were inspected; the migration contains no grant/table-RLS/helper/Storage changes. It only wraps row-independent `auth.uid()` in scalar SELECTs and keeps custom Admin helpers and ownership/status joins. Relevant renewal/document lifecycle triggers are unchanged. Definition guards abort on drift; one-second lock and 30-second statement timeouts require transactional deployment and a separate deployment review.

**READY FOR MIGRATION REVIEW**, not deployed and not certified for production application. The isolated full-schema authorization matrix with real helpers/triggers/custom Admin sessions remains BLOCKED; Storage authorization defects also require separate review. Applying this migration would preserve the existing Storage vulnerabilities, not fix them.

## 13. Authorization matrix and SQL performance

Local PGlite is real isolated PostgreSQL. The 33 captured predicates are tested before/after for seven synthetic identities: anonymous, A, B, authorized Admin helper fixture, unauthorized Admin, suspended-owner fixture, expired/null-auth fixture. SELECT and rollback-only INSERT/UPDATE/DELETE outcomes and policy metadata remain identical. Local drift rejection and InitPlan tests pass: **3/3**. Tables/grants/auth/Admin helpers are synthetic; the suspended case models ownership, not the full suspension trigger/RPC chain. This does not certify full production authorization. Exact matrix: [rls-authorization-matrix.json](rls-authorization-matrix.json).

Separate exact Storage policies/captured grants in local PostgreSQL demonstrate reads of B-owned fixture metadata by A and anonymous actors, and anonymous template metadata writes. The reproduction test passes because it confirms the finding; its **security acceptance result is FAIL**. See [storage-authorization-matrix.json](storage-authorization-matrix.json).

Current warmed synthetic 50,000-row local sample: **109.743 ms before, 48.929 ms after**, with scalar InitPlan after. Previous sample was 116.249/49.145 ms. These are single local samples; no production speedup percentage is inferred. Production SQL execution timings and an isolated full-schema post-migration Advisor run are NOT TESTED. No heavy production EXPLAIN ANALYZE was run.

## 14. Nine previous failures and full repository regression

The nine previously reported failures were outdated expectations:

- Five Realtime assertions omitted newer scoped inner-loader/entries/PPA query keys. Updated exact lists, preserving organization/detail/semester bounds and burst/cleanup checks.
- One Admin status test expected legacy labels instead of current `Awaiting Release`/`Budget Released` display semantics. User-side lifecycle labels were not changed.
- Three report assertions expected a fixed 13-column portrait registry. Current registry is configurable, defaults to ten columns including Verified Date and uses A4 landscape with proportional widths. Updated contracts and added an actual generated-PDF dimension/column-width check. Financial report portrait behavior remains asserted.

No production business logic was changed to satisfy these tests. They now pass in focused runs.

| Test run | Passed | Failed | Scope |
|---|---:|---:|---|
| HEAD `2f6e742` full Vitest | 2,126 | 164 | 2,290 assertions, 194 files |
| Current full Vitest | 2,170 | 151 | 2,321 executed assertions, 200 discovered files; one collection error described below |
| Security/workflow focused | 85 | 0 | 11 suites; overlaps other runs |
| Final account/cache focused | 43 | 0 | Five suites; includes new private-cache followup |
| Final contracts focused | 67 | 0 | Seven suites; includes actual PDF geometry followup |
| Audit mock repair followup | 7 | 0 | Previously uncollected audit suite |
| Local RLS | 3 | 0 | Exact predicate equivalence / drift / synthetic plan |
| Local Storage finding reproduction | 1 | 0 | Confirms authorization FAIL, not an isolation PASS |

Across **2,278 matching full-run assertions (2,271 unique names)**, there are **zero new assertion failures** and zero failing added assertions. All 151 remaining assertion failures also fail on HEAD. The full current run exposed one collection error: an old partial `admin-auth` mock lacked newly imported event constants. Changed the fixture to preserve actual module exports; its seven tests passed on rerun. The full suite was not rerun after that fixture-only repair or the final small followups. Two private-query tests and the actual PDF geometry assertion were added after full-run discovery/transformation and executed in focused followups. Counts above are exact run outputs and must not be summed as unique tests.

The initial intermediate full attempt had 1,871/152 plus collection errors while implementation was still changing; it is not the final comparison. It is retained in `tmp/` for transparency.

Remaining baseline failures include incomplete Realtime mocks (`supabase.channel` missing), older UI/status/filter/seed expectations, renewal/RPC fixture mismatches, fake-clock/session expectations and artifact tests writing outside permitted scratch paths. Other baseline failures may represent unresolved defects; they are not certified harmless merely because they predate this task. No unrelated production redesign or blanket test weakening was attempted. Four HEAD-only artifact failures disappeared because of different archive scratch filesystem conditions, not a production fix.

Full names and first failure messages: [regression-comparison.json](regression-comparison.json). Raw run JSON/logs remain in `tmp/readiness-*`.

## 15. Current performance comparison

These are local production-build artifacts and single anonymous Edge measurements, not production-network guarantees. Static closure follows the Vite manifest's static imports. Browser assets are locally served uncompressed, with fresh profiles and real read-only public API traffic. CDP may include CORS preflight responses; duplicate OPTIONS are not counted as duplicate business queries.

| Metric | Previous reported optimized | Current final build |
|---|---:|---:|
| Initial static JS bytes | 1,240,878 | 1,243,519 |
| Initial static JS gzip bytes | 333,557 | 334,592 |
| JS chunk count | 39 | 39 |
| Home JS response bytes | 1,865,082 | 1,867,723 |
| Templates JS response bytes | 1,974,170 | 1,976,811 |
| Home page request events | 28 | 28 |
| Templates page request events | 24 | 24 |
| Templates idle requests / 35 s | 0 | 0 |

The retained `tmp/performance-after` artifact measures 1,240,805 raw / 333,482 gzip, slightly different from the prior report's final measurement. Against that artifact, current growth is 2,714 raw / 1,110 gzip bytes; against the prior reported measurement, 2,641 raw / 1,035 gzip. The added recovery/cache safety code justifies this small increase. The much larger original unoptimized figures (5,669,431 raw / 1,677,353 gzip) are historical report values, not a newly repeated baseline build.

Current total wire bytes: Home 10,667,433; Templates 4,373,863. No failed requests. Home and Templates each issue one public-settings RPC; Templates issues one document-type GET and zero idle requests. Actual public API response timings in this sample include Home news/settings around 957/964 ms and Templates document-types/settings around 643/257 ms, excluding preflight. These include network/server time and are not SQL timings. Large portal/report chunks remain deferred and are listed in [bundle-sizes.json](bundle-sizes.json).

Source and fixture checks found no new recurring global snapshot requests, binary preview preloads or broad polling. Client freshness reduction may increase signing for repeatedly reopening the same file more than a minute apart; ordinary list navigation still does not sign files. Egress change under real authenticated usage is **unverified**, not a claimed percentage.

## 16. Production-readiness checklist

PASS entries identify their evidence level; mocks do not certify production workflows.

| Area | Status | Evidence / blocker |
|---|---|---|
| Frontend lazy loading | PASS | Build, deferred module/draft tests, intercepted Admin routes and chunk-failure recovery |
| Public template caching | PASS | Timer/refresh test and zero requests over 35-second anonymous idle sample |
| Public settings deduplication | PASS | Overlap/failure-retry tests; one actual settings RPC per anonymous page |
| YPOP Realtime coalescing | PASS | Scoped burst/in-flight/cleanup mock tests; live status mutation E2E remains blocked |
| Signed URL cache safety | PASS | 24 unit/integration tests, local-only memory cache; server authorization assessed separately |
| Admin authenticated workflows | BLOCKED | No isolated credentials; intercepted empty-page fixtures cannot verify records/reviews |
| Organization authenticated workflows | BLOCKED | No isolated A/B accounts or direct API E2E |
| PWA navigation/service-worker behavior | BLOCKED | Mock routing/draft evidence; no installed device, update/offline cold-load validation |
| Slow-network uploads | BLOCKED | Throttled route fixture and 13 transport tests; no real TUS network interruption E2E |
| RLS migration | BLOCKED | Static/predicate review ready; full-schema real-helper authorization/Advisor validation absent; unapplied |
| Admin permission isolation | BLOCKED | Focused mocks pass; no actual limited/revoked Admin E2E |
| Organization RLS isolation | FAIL | Captured Storage SELECT/ALL policies and local reproduction permit unauthorized metadata access |
| Exports and reports | BLOCKED | Scoped export/dossier tests and generated PDF checks; older artifact failures and no authenticated full-data comparison |
| Existing test failures | FAIL | 151 known-baseline assertion failures remain; no new matched assertion failures |

## 17. Files changed and deployment separation

New local source/tests:

- `src/lib/signed-storage-url-cache.ts`, its unit test and `signed-storage-url.integration.test.ts`.
- `src/components/RouteChunkBoundary.tsx` and its test.
- `src/lib/private-query-cache.test.ts`.
- `scripts/readiness-browser-smoke.mjs`.
- `supabase/tests/storage_policy_readiness.local.test.mjs`.
- This readiness evidence/report directory.

Updated during this pass:

- `src/lib/lydo-connect-supabase.ts`: Storage resolver/context/race hardening; prior YPOP coalescing retained.
- `src/lib/query-client.ts`, `src/lib/lydo-connect-store.tsx`: private query cancellation/removal on account transitions.
- `src/App.tsx`, `src/user/UserPortalEntry.tsx`: chunk recovery around existing lazy boundaries, gates preserved.
- `src/lib/renewal-realtime.test.ts`, `admin-lifecycle-user-sync.test.tsx`, `report-export.test.ts`, `section35-reporting.test.ts`: current contracts and added PDF geometry.
- `src/lib/audit-records-hardening.test.ts`: preserve auth event constants in its partial mock.
- `scripts/performance-browser-audit.mjs`: optional output path so earlier measurements are preserved.
- `supabase/tests/performance_auth_uid.local.test.mjs`: seven fixture identities and optional separate readiness evidence outputs.

Previous public catalog/settings code and performance evidence remain preserved. No applied migration was edited; no new production migration was created in this pass.

**Frontend-only candidates for a controlled staging deployment:** existing lazy entries/catalog/settings deduplication/YPOP coalescing; session-scoped signed URL cache; account-transition private query cleanup; explicit lazy chunk recovery. These have local build/test evidence and require no database change. **No change set is cleared here for unconditional production deployment** because authorization and authenticated-E2E blockers remain.

**Changes requiring separate migration/security review:** the existing 33-policy InitPlan proposal, plus a future Storage ownership/custom-Admin signing remediation design. Do not combine the performance migration with an unreviewed Storage authorization rewrite. No policy remediation migration or Edge Function was deployed.

## 18. Validation commands and remaining work

Executed `npx tsc --noEmit` (PASS), `npm run build -- --manifest --outDir tmp/readiness-build` (PASS), `git diff --check` (PASS), focused Vitest runs, full current/HEAD Vitest runs, local PostgreSQL harnesses and headless Edge scripts. Build retains existing large-chunk/Browserslist warnings. Log files are under `tmp/readiness-*`; output directory keeps the normal build artifact separate.

Next gates: separately review/remediate broad Storage authorization with custom Admin compatibility; obtain an authorized isolated full-schema environment; execute the acceptance plan for real A/B/Admin sessions, all status lanes, installed PWA and TUS interruptions; triage the broader baseline failures; review the 33-policy migration independently. No production write is needed merely to inspect the current findings.
