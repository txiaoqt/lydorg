# Y-TRACE performance audit — baseline

Inspection: 9 October 2026, Asia/Manila. Live project: `mqqaykksadotbrghbexz`.

## Repository and measurement boundaries

HEAD `2f6e742` on `ui-refactor`; read-only fetch of secondary `lydorg/main` confirms 0 ahead / 0 behind. Initial working tree contained only pre-existing untracked `tmp/`. Preserve it. Supabase inspection is SELECT/catalog/EXPLAIN only; no statistics reset, authenticated mutation RPC, migration, configuration change or deployment.

Production baseline built with Vite to `tmp/performance-baseline`, manifest enabled: 54.33 seconds. Main JS: 5,668.14 kB raw, 1,677.35 kB gzip according to Vite. These are build artifact sizes, not measured network transfer or load time. ExcelJS 938.37 kB is already dynamic; PWA 167.78 kB is already a route chunk. Admin and browser UserPortal are static imports. PDF/report assets, charts and maps are reachable through those entries.

Authenticated browser page-load request counts, transferred bytes, largest/slowest individual API responses, render profiles, and live role-based integration tests are **unverified**: no representative authenticated browser session supplied. Historical SQL means are not current page latency. Acceptance scenarios are listed in the final report. Do not infer a measured responsiveness percentage from bundle size.

## Live evidence

Current Performance Advisor: 33 `auth_rls_initplan`, 34 `unindexed_foreign_keys`, 18 `unused_index`, 114 `multiple_permissive_policies`, one Auth connection-limit notice. Exact findings and remediation links are retained in `advisors-performance.json`. Security findings are separate in `advisors-security.json`; no automatic policy consolidation or index removal.

Approximate catalog counts: 92 organization profiles, 90 budgets, 62 liquidations, 547 document files, 173 notifications, 13 required document types, 3,329 activity logs. Several tables are too small to justify extra indexes for current speed. Statistics reset time was unavailable. Historical temp bytes (~351.7 GB) and two deadlocks are cumulative, not evidence of a current incident.

| Historical statement | Calls | Mean execution ms | Second sample calls |
|---|---:|---:|---:|
| Notifications | 253,554 | 20.81 | 253,554 |
| Budget file metadata | 133,047 | 11.27 | 133,047 |
| Liquidation file metadata | 133,042 | 9.06 | 133,042 |
| YPOP event files | 240,748 | 5.23 | 240,748 |
| YPOP participations | 236,409 | 5.04 | 236,409 |

Second sample: 11:39:44 UTC. No increase in these dominant historical statement/role entries during the observation window. Other role entries exist and are retained in evidence. This is a quiet-window observation, not a load test or proof of absence of traffic during login/navigation. Historical admin YPOP means include 43–57 ms calls, but their cumulative totals cannot identify current rates. Required-document metadata historical mean ~0.15 ms; reducing unnecessary requests matters more than SQL tuning there.

Read-only EXPLAIN of organization-scoped liquidation list: sequential scan + sort, estimated total cost 8.79, estimated one matching row. With only 62 rows this is reasonable. No organization-leading liquidation index; budget organization/date, notification user/read/date, unique document submission/type and admin token-hash indexes already exist. A document-type FK index is not covered by submission/type's leading column, but 547 rows and little reverse-lookup traffic do not establish a meaningful benefit. URN history is empty. Index additions deferred pending realistic cardinality/plan evidence; do not add all 34 or drop the 18.

## Architecture / request tracing

* Admin lists: bounded RPCs, server search/filter/pagination; active-page version checks approximately eight seconds while visible; unchanged version does not fetch business data. Sidebar uses a separate small permission-scoped counts RPC and signal broadcast with fallback refresh. This is intentional status correctness, not a restored whole-portal poll.
* Organization Website/PWA: scoped query caches, list limits 25/50, lazy selected-file metadata. Provider handles profile/bootstrap and local drafts; auth hydration already deduplicates organization profile/roles. No recurring `get_admin_portal_snapshot`, `loadAdminPortalSupabaseState`, or `loadLydoConnectSupabaseState` was found on active refresh paths.
* Public templates: confirmed 30-second interval while mounted/visible (source-derived two refreshes/minute, not browser measurement). QueryClient globally disables focus refresh. Replace polling with five-minute freshness, stale focus/reconnect and explicit refresh so new/archived publications remain discoverable.
* Other public pages: no equivalent 30-second catalog interval found. Public transparency/news remain feature-scoped.
* User Realtime: organization/resource filters, parent/file-specific invalidation and 60 ms burst coalescing already exist in status subscription. Selected PWA YPOP proof-file subscription currently invalidates/cancels for every individual file event; a bulk operation can cancel/refetch repeatedly. Add bounded burst coalescing with cleanup and a follow-up pass for events during an in-flight refresh.
* Admin auth: token validation and permission context remain server-authorized; simultaneous `getSession` / auth callback can duplicate the initial admin validation chain. Safe candidate is in-flight-only deduplication, never long-lived permission caching or removal of server checks. Defer if tests cannot cover account switching/error handling.
* Storage: lazy signing, resolved-URL cache and pending-promise deduplication already exist. No routine HEAD or binary download after status change. Do not mass-sign or make buckets public. Cache identity isolation deserves separate security review; no speculative Storage redesign in this pass.
* React: large contexts/portals may rerender broadly, but no runtime profile yet. Do not migrate server state or change draft lifetime based on component size alone.
* Registration bulk upload: TUS lazy transport, adaptive concurrency, slow mode, transient retries, progress, partial success and cleanup exist. Preserve successful-file retry exclusion and registration locks; no workflow redesign justified.
* Reporting: explicit all-pages loops with 50-row pages for budget/liquidation/activity exports; Budget Monitoring uses a cursor and abort signal. Per-organization reports use metadata, not submitted PDF binaries. Full report generation still retains complete result arrays and PDF tables; memory at large scale remains unverified. Avoid parallel all-page fetches; preserve dates, totals and formatting.

## Ranked local implementation plan

| Priority | Opportunity | Evidence / expected benefit | Complexity / risk |
|---|---|---|---|
| 1 | Stop public catalog interval | Confirmed timer; eliminates idle catalog refresh | Low; explicit refresh + stale focus needed |
| 2 | Lazy Admin and browser portal entries | Measured 5.67 MB main JS; both static imports | Low/medium; preserve authentication and PWA gates |
| 3 | Coalesce selected YPOP file events | Confirmed per-event cancel/invalidate | Medium; test events during refresh and cleanup |
| 4 | Row-independent auth UID InitPlans | Current Advisor + exact live policy definitions | Local forward migration only; semantic equivalence tests |
| Deferred | Indexes, context redesign, auth TTL caching, export streaming | No current load/plan/profile evidence sufficient | Regression/security/locking risk exceeds demonstrated benefit |

RLS optimization reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select. Only `auth.uid()` may be wrapped, leaving row-dependent ownership, suspension/status restrictions, custom Admin session authorization, roles, permissiveness and grants intact. No live application.
