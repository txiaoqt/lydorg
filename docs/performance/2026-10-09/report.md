# Y-TRACE / LYDO Connect — performance and scalability review

**Date:** 9 October 2026 (Asia/Manila). **Supabase:** `mqqaykksadotbrghbexz`.

## Outcome and safety boundary

Implemented four focused frontend optimizations locally and prepared one **unapplied** RLS migration. Production database inspection was read-only. No GitHub push, Vercel deployment, Edge deployment, migration application, index creation/removal, production configuration change or data repair was performed.

Baseline HEAD: `2f6e742`, branch `ui-refactor`. Fetched secondary `lydorg/main` read-only: zero commits ahead/behind. Initial working tree had only pre-existing untracked `tmp/`; preserved. The CLI changed its temporary version notice during help/migration creation; restored that file to its original empty content. Existing applied migrations were not edited. Test snapshot normalization described below occurred only inside `tmp/performance-head`.

## Before / after measurements

### Build artifacts

Two production Vite builds, same configuration/environment, output under `tmp/`. Exact sizes come from Node file lengths and gzip, with static import closure determined from Vite's manifest. They are **not production network sizes**.

| Metric | Baseline | Final |
|---|---:|---:|
| Initial static JS closure | 5,669,431 bytes | 1,240,878 bytes |
| Initial static JS gzip | 1,677,353 bytes | 333,557 bytes |
| Generated JS asset count | 18 | 39 |
| Largest final chunk | — | AdminPortal: 2,857,628 bytes / 940,752 gzip |
| Vite build duration, single run | 54.33 seconds | 50.98 seconds |

Admin and browser UserPortal are now lazy route entries. PWA was already lazy and remains so. XLSX, PDF/chart/map code reachable only through portal imports no longer enters the public initial application chunk. This does **not** mean every export dependency is independently lazy: Admin still loads a large feature bundle, and public drawers/shared components retain a roughly 550 kB shared chunk. ExcelJS remains a separate ~938 kB dynamic chunk. No manual vendor splitting, dependency upgrades or broad component refactor was introduced.

### Browser measurements

Fresh anonymous headless Edge profiles; service workers disabled for reproducibility; local production assets served **without compression**; real read-only public Supabase API traffic. One paired sample per page, no mobile CPU/network emulation. Totals include fonts/images and, for templates, the 35-second observation window. Request counts are Playwright application requests and exclude browser-generated CORS preflight; wire-byte totals use Chromium Network events. Local results do not establish production p95 or mobile load times.

| Page / metric | Baseline | Final |
|---|---:|---:|
| Home initial requests | 21 | 28 |
| Home total encoded response bytes | 14,582,678 | 10,664,741 |
| Home JS encoded response bytes | 5,706,110 | 1,865,082 |
| Home public-settings RPC requests | 2 | 1 |
| Templates initial requests | 15 | 24 |
| Templates total encoded response bytes | 8,150,476 | 4,371,219 |
| Templates JS encoded response bytes | 5,675,611 | 1,974,170 |
| Templates API requests during 35 seconds idle | 1 | 0 |
| Failed browser requests | 0 | 0 |

**Tradeoff:** code splitting increases asset request count while substantially decreasing JavaScript bytes. Vite preloads shared dependencies; several small shared icon chunks remain. No claim is made that all network waterfalls are eliminated. A further chunk-grouping change needs a separate cold-navigation measurement across all three portal surfaces.

Observed main-thread long tasks: home 226 ms before, none in final sample; templates 205 ms before, one 54 ms task after. These single samples support deferring code, but are **not React profiler evidence** or statistically reliable responsiveness percentages. No context/state architecture was changed.

Largest public API metadata response observed: `required_document_types`, 2,363 encoded bytes in final sample. Slowest metadata response-to-headers observed: home public settings 827 ms baseline; news 832 ms final. These include network/service conditions and do not show a SQL latency improvement. Browser timings are not query execution times.

Large remaining local assets dominate home transfer: hero JPEG ~3.37 MB, overview JPEG ~2.42 MB, two Segoe TTF files ~1.91 MB combined. Recommend separately reviewing responsive image encodings and WOFF2 equivalents with visual/glyph/asset-license validation. No production Storage image or font asset was changed.

## Optimization matrix

| Issue | Root cause | Change made | Before metric | After metric | Risk | Status |
|---|---|---|---|---|---|---|
| Public template idle egress | 30-second interval | Five-minute stale time; no interval; stale focus/reconnect and explicit Refresh templates | One idle GET / 35 s measured; two/minute source-derived | Zero idle GET / 35 s measured | Low: foreground idle publication discovery requires explicit refresh | Implemented |
| Duplicate home settings | Page/footer start overlapping fetches | Share only the in-flight promise; release on success/failure | Two RPCs measured | One RPC measured | Low; later calls still fetch fresh data | Implemented |
| Heavy initial application JS | Static Admin/browser portal entry imports | Lazy entries with existing authorization/PWA gates and loading fallbacks | 5,669,431 raw bytes | 1,240,878 raw bytes | Medium: cold authenticated navigation downloads deferred chunks | Implemented |
| PWA YPOP proof file event bursts | Every INSERT/UPDATE cancels/invalidates independently | 60 ms coalescing, one subsequent pass for events during refresh, disposed timer/callback guards | N cancellations/invalidations for N immediate events, source-derived | 20-event synthetic burst: one cancellation/invalidation | Low/medium; extra 60 ms per burst | Implemented and tested |
| Per-row UID evaluation | 33 policies call row-independent auth helper directly | Wrap only `auth.uid()` as `(SELECT auth.uid())`; guard exact existing definitions | 33 current Advisor findings | Live unchanged; local plan has InitPlan | Security-sensitive; definition guard, authorization tests, short DDL timeouts | Migration prepared, NOT applied |
| Missing FK indexes | 34 relationships lack a valid non-partial leading index | Inspect catalog, cardinality, existing composites and four candidate plans | Current small data / low estimated plan costs | Unchanged | Added write cost and DDL locks unjustified now | Deferred |
| Broad context rerenders | Possible large context update surface | Source review only | No authenticated render profile | Unverified | Draft/remount regressions | Deferred |
| Auth validation duplication | Initial getSession/auth-event race is possible | Source tracing; no permission TTL or server-check removal | Cumulative timing only | Unchanged | Expiry/revocation/account-switch risk | Deferred pending authenticated trace |
| Report memory | Complete arrays/PDF tables retained during explicit export | Preserve bounded sequential pagination and existing cancellation | No large-report heap measurement | Unchanged | Formatting/full-data regressions | Separate large-data benchmark proposal |

## Live database / historical traffic

The dominant historical counts for notifications (253,554), budget files (133,047), liquidation files (133,042), YPOP event files (240,748), and YPOP participations (236,409) **did not increase between captured samples**. Means respectively 20.81, 11.27, 9.06, 5.23 and 5.04 ms are cumulative. Other role/query variants exist. The observation window was quiet and did not simulate authenticated login/navigation; it cannot prove zero traffic during active use. No counter reset was performed.

Current-source tracing confirms scoped/paginated loaders rather than recurring whole-portal snapshot refresh. Historical required-document metadata averaged ~0.15 ms; the confirmed current concern there was idle network frequency, not an expensive SQL scan.

Current-path statement history, still **cumulative**, in `admin-sql-cumulative.json`:

| RPC | Calls in dominant statement/role entry | Historical mean ms |
|---|---:|---:|
| validate_admin_session_token | 5,600 | 64.28 |
| get_admin_permission_context | 4,101 | 18.41 |
| admin_get_portal_change_versions | 3,443 | 10.19 |
| admin_get_sidebar_counts | 1,183 | 19.31 |
| admin_get_review_resource_page | 394 | 47.52 |

These identify investigation targets, not current request rates or new incidents. Custom Admin validation updates session activity internally; it was **not invoked** in the live database audit. No authentication/session cache replaces server-side authorization. Inactivity timers, logout, token expiry, revocation and permission enforcement remain unchanged.

### Advisor findings

Current counts match the previous audit:

* [33 auth RLS InitPlan warnings](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).
* [34 unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
* [18 unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
* [114 multiple-permissive-policy warnings](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
* One absolute Auth connection-limit notice; no configuration change.

The 114 overlapping-policy warnings were reviewed separately. Multiple permissive authorization paths can be intentional; no policy was merged or removed. Security Advisor also reported 9 RLS-without-policy notices, 11 mutable-search-path functions, a public-schema extension notice, 199 anon / 203 authenticated executable SECURITY DEFINER notices, and a leaked-password-protection notice. Executable custom-token RPCs and intentionally locked identity tables require context; these counts alone do not prove exploitable access. Exact findings/remediation URLs are retained separately. They are not silently folded into performance fixes.

### Index decisions

`foreign-key-index-review.json` records **all 34** uncovered public FKs, current indexes and approximate row counts. Existing leading/composite/partial indexes were distinguished; no unused index was dropped.

| Candidate | Approximate rows | Read-only representative EXPLAIN | Decision |
|---|---:|---|---|
| liquidation_reports.organization_id | 62 | Seq scan + sort, estimated total cost 8.79 for scoped list | Revisit organization/date/id composite at realistic scale |
| budget_requests.ypop_entry_id | 90 | Seq scan, estimated cost 20.12 | No measured hot reverse lookup justifies index now |
| document_submission_files.document_type_id | 547 | Planner uses existing submission/type unique index, estimated cost 20.81 | Not a leading FK index; observed plan still uses it; no blind duplicate |
| urn_review_history.organization_id | 0 | Seq scan, estimated cost 15.38 | Empty table; defer |

Plans used sentinel UUIDs and the management inspection role, **without ANALYZE**; they do not measure JWT/RLS execution or real-data selectivity. A sequential scan on a small table is reasonable. Reassess after growth, write/delete pressure and representative authenticated plans. No index migration was justified.

## RLS proposal and authorization evidence

`supabase/migrations/20261009114340_performance_auth_uid_initplans.sql` is forward-only and **unapplied**. It changes 33 captured public policy predicates; Storage policies are excluded. Only row-independent UID calls are wrapped. Commands, target roles, permissive/restrictive behavior, ownership joins, renewal status checks, admin helpers and grants remain intact. Suspended-organization triggers and custom Admin token RPCs are untouched.

The migration aborts if any captured policy definition/role/command differs. This prevents overwriting newer authorization changes. It uses a one-second lock timeout and a 30-second statement timeout; future application still requires a reviewed transactional deployment and brief policy-DDL locks. No production locks were acquired for this proposal. Do not apply without separate approval and fresh staging/integration validation.

Synthetic local PostgreSQL tests cover unauthenticated, Org A, Org B, authorized Admin and unauthorized Admin identities across all 33 isolated predicates, comparing reads, inserts, updates, cross-organization ownership changes, renewal states and deletes before/after. Role/command metadata remains equal; drift abort is tested. Auth helpers/grants are synthetic fixtures, **not a reproduction of every live policy, trigger or custom-token integration**. Org A/B cannot read each other's synthetic rows. Production/staging authorization matrix remains unverified.

Local 50,000-row illustrative plan: execution 116.249 ms before / 49.145 ms after, with InitPlan after. This is a warmed single PGlite sample with a synthetic UID helper, **not a production speedup estimate**. [Supabase's recommended pattern](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) applies only to row-independent calls.

## Preserved architecture and scope coverage

* **Admin:** dashboard summaries, registrations, renewals, budget/liquidation lists, YPOP, registry, notifications, templates, reporting and permissions retain existing scoped loaders. No Admin direct anon subscription to private business tables was added.
* **Organization Website/PWA:** dashboard, documents, renewal, budget, liquidation, both YPOP lanes, inquiries, notifications, templates and profile retain query ownership filters, page bounds and draft state. Lazy browser entry identity stays stable across section changes; an unsaved-input test covers this.
* **Realtime:** existing parent/child invalidation and filters remain. Only the selected YPOP proof-file helper gains burst coalescing. Cleanup removes the same channel and cancels queued work; an in-flight observer refresh gets a subsequent pass if another event arrives. Existing active-page, visible-tab, approximately eight-second Admin version checks are untouched. Unchanged versions still select no resources for refresh. The separate small authorized sidebar-count fallback is preserved.
* **Storage:** existing selected-preview signing and in-flight URL deduplication remain; no mass signing, automatic PDF download, HEAD requests or public-bucket change. A pre-existing URL cache keyed only by bucket/path and indefinite negative-cache entries warrant a separate account-switch/cache-expiry security/reliability audit. This pass does not claim those paths were redesigned.
* **Bulk registration:** TUS, slow mode, adaptive concurrency, transient retries, progress, partial success, Retry Failed, cleanup and document locks remain. Focused transport/reliability/PWA tests pass. No repeated successful upload was introduced.
* **Exports:** quarterly budget/liquidation/activity filters, YORP registry, per-organization reports, monitoring, barangay allocation and Section 35 formatting remain. Export-only all-pages loops stay bounded/sequential; monitoring retains cursor cancellation. Per-organization metadata reports still do not download submitted PDF binaries. Large-report peak memory/progress/cancellation outside existing supported paths needs synthetic-scale profiling before streaming redesign.

## Validation

* `npx tsc --noEmit`: passed before and after.
* `npm run build -- --outDir tmp/performance-final --manifest`: passed; large-chunk and old Browserslist database warnings remain.
* `git diff --check`: passed; informational Windows LF/CRLF notices only.
* Matched core regression run: HEAD **209 passed / 9 failed (218)**; optimized tree **216 passed / same 9 failed (225)**. No new failures. Covers scoped loading, query retries, Realtime, budget monitoring, uploads, resubmission, auth recovery, templates, registry/PDF/XLSX/Section 35/activity exports and PWA documents.
* Additional workflow run: **313 checks passed** after. Raw HEAD archive run had one migration-source literal-newline assertion fail because archive SQL had CRLF while the working checkout has LF. Re-running that suite with only the temporary snapshot's line endings normalized passes; this is an archive artifact, not a functional improvement. Covers permissions, notifications, inquiries, identity/profile, YPOP synchronization, staging/revision/draft isolation, PWA routes/profile/liquidation and browser workflows.
* Public settings/contact/routing/catalog run: **14 passed** (overlaps four checks with core run). All nine newly added frontend checks pass, including the three Realtime burst/cleanup tests.
* Local RLS suite: **3 passed**. Never connects to Supabase.
* Initial unrestricted whole-suite baseline was interrupted after roughly ten minutes without a final report. Completed matched focused runs above replace it for regression comparison; **the entire repository suite is not certified green**. Existing nine failures concern old Realtime query-key expectations, one status-render assertion and report column/geometry assumptions. They were not hidden or weakened.

Workflow comparison runs use a non-production `.invalid` Supabase URL for unmocked calls. Browser measurements use fresh anonymous profiles and public read-only endpoints only. No live upload, approval, notification dispatch or authenticated mutation was tested.

## Remaining acceptance work (unverified)

| Scenario | Required acceptance evidence |
|---|---|
| Admin login/navigation | HAR for initial dashboard and each active list; one intended version request chain; no recurring snapshot; unchanged version yields zero business refetches; hidden tab stops checks |
| Admin authorization | Authorized and unauthorized custom-token actions; expiry/revocation/inactivity/logout unchanged; no anon private-table subscription |
| Org A / Org B | Scoped page loads and cross-org denial for rows/file metadata/Storage; suspended-account restrictions; direct mutation guards |
| Cross-session status | Registration, renewal, budget, liquidation, City-led/Org-led changes in website and installed PWA; one affected refresh after burst; no missing final event |
| Preview/upload | Selected file only signed; replace needs-revision file; reject edits/removal while under review; slow/resumable upload, partial success and Retry Failed with no repeat successful transfer |
| Export scale | 1,000 / 10,000 synthetic filtered rows; heap/progress/cancel measurements; complete pages and unchanged totals/date boundaries/formatting; no uploaded PDF binaries fetched |
| React | Profiler traces for tables and open drawers during targeted background updates; draft/input retained; no unrelated context redesign until measured |
| Route chunks/PWA | Cold authenticated routes, offline installed-app navigation, existing service-worker update lifecycle and deferred chunk load failure recovery |
| Publications | Publish/archive template elsewhere; explicit Refresh reflects change immediately; stale focus/reconnect/remount fetches appropriately; no idle polling |

## Evidence and reproduction

* `baseline.md`, `database-evidence.json`, `admin-sql-cumulative.json`, `foreign-key-index-review.json`.
* `advisors-performance.json`, `advisors-security.json` with original remediation links.
* `bundle-sizes.json`, `browser-public.json`, `browser-summary.json`, `rls-synthetic-plans.json`, `validation.json`.
* `scripts/performance-bundle-sizes.mjs`: reproducible manifest/file/gzip measurements.
* `scripts/performance-browser-audit.mjs`: isolated anonymous Edge comparison, local build directories supplied as arguments.
* `supabase/tests/performance_auth_uid.local.test.mjs`: local-only role matrix, drift guard and synthetic plan.

Expected Supabase egress impact is limited and defensible: remove catalog idle metadata requests and overlapping public-settings responses; coalesce selected-file event bursts. Savings depend on traffic/session length and are **not extrapolated into an invented monthly percentage**. JavaScript/static-asset savings primarily affect hosting/CDN transfer, not Supabase database egress. RLS improvements do not affect live performance until the proposed migration is separately approved and applied.

Changed application files: `src/App.tsx`, `src/user/UserPortalEntry.tsx`, `src/components/public/PublicTemplatesCatalog.tsx`, `src/lib/admin-system-settings.ts`, `src/lib/lydo-connect-supabase.ts`. Added/extended tests, two measurement scripts, this evidence directory and the local RLS proposal are the remaining changes.
