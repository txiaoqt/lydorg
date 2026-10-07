# Admin quarterly reporting

Implemented locally. The quarterly reporting migration was applied to linked Supabase project `mqqaykksadotbrghbexz` on October 8, 2026 (Asia/Manila). No frontend deployment, `db push`, RLS change, or direct table grant was performed.

## Scope and date bases

| Export | Reporting date / scope |
| --- | --- |
| Raw YORP Registry | `accreditationStartDate`, then `verifiedAt`, then `createdAt`. Period intersects search, status, district, barangay and classification filters and scopes the visible registry, summary cards and exports. |
| Budget Requests | `activity_date`, falling back to the Manila calendar date of `created_at`. Period intersects the current search, status, district, barangay and classification server filters. |
| Liquidation Reports | `created_at` in Asia/Manila. There is no `submitted_at` field in the current schema. This is a report-creation period, not a submission/completion period. Existing draft exclusion remains. |
| Budget Monitoring | Existing activity date, then release date for custom ranges/quarters; existing fiscal-year semantics for All Year. |
| Allocation by Barangay | The same scoped Budget Monitoring period and existing filters, including Organization Funding and map-derived reporting. |
| Activity Logs | `created_at` in Asia/Manila, combined with search and category. Selecting an exact period clears the relative time filter; selecting Last N days clears the exact period. |

Administrator accounts remain a static master-data export without quarter filtering. Document/ZIP downloads and backup/recovery exports retain their existing selection/recovery scope. Official Section 35 reports retain their separate year/quarter calculation, UI and export implementation.

## Periods

| Quarter | Inclusive dates | Exclusive SQL end |
| --- | --- | --- |
| Q1 | January 1–March 31 | April 1 |
| Q2 | April 1–June 30 | July 1 |
| Q3 | July 1–September 30 | October 1 |
| Q4 | October 1–December 31 | January 1 of the next year |

All Year spans January 1 to the following January 1 exclusively. Custom dates are inclusive in the UI and converted to the following day for exclusive SQL boundaries. Monitoring retains its existing inclusive-end RPC without a database change. Date-only fields retain their date; timestamps use Manila time, independent of browser time zone. Invalid custom ranges disable generation/application.

Titles, filter summaries and filenames identify the period. Quarter/year/custom filenames omit the generated-date suffix, e.g. `budget-requests-2026-q1.pdf`. All Periods retains a generated-date filename. Existing formats, page setup and YORP column selection remain.

Year and Period controls appear beside Export in the Budget Requests, Liquidation Reports, Activity Logs and YORP Registry headers. Their export dialogs reuse the header selection without repeating the controls. Budget Requests and YORP Registry no longer have semester dropdowns or apply a hidden semester selection from the URL. Official Section 35 report controls remain separate.

The header Year selector offers All Year plus individual years. Period offers All Periods, Q1–Q4 and Custom Date Range. A selected year with All Periods filters the entire selected year; All Year with a quarter filters that quarter across years. YORP table filtering updates immediately in memory. Budget and Liquidation period changes discard previous query placeholder rows while the new bounded server query loads. Liquidation filtering intentionally uses report creation date (confirmed by the user), which can differ from displayed deadlines. Date-basis notes identify this on each page.

The Budget Requests, Liquidation Reports, Activity Logs and YORP Registry header year options include 2026, 2025 and 2024, plus All Year, per the current seeded reporting dataset. Budget Monitoring uses the same Year/Period options inside its popover and retains explicit Apply period behavior. The selected current year remains available when the calendar moves beyond those seed years.

Reporting filters initially select the current year and quarter in Asia/Manila (2026 Q4 as of October 8, 2026), evaluated when the page mounts rather than hardcoded. Budget Monitoring, YORP Registry, Budget Requests, Liquidation Reports, Activity Logs and the YORP quarterly report dialog use the shared current-period helper. All Year and All Periods remain selectable. The seed-preview year filter also initially selects the current year. No database migration is needed for this default change; no tests were added or run for it.

Budget Monitoring All Year + All Periods includes all non-draft reporting records across years; All Year + quarter filters by activity/release quarter across years. The new `20261007213208_admin_monitoring_all_years.sql` migration was applied with user approval. It accepts a nullable fiscal year and optional quarter while preserving bounded cursor pages, permission checks, draft exclusion and RPC grants. Live checks confirmed those predicates, hardened search path and invalid-session rejection.

Quarter views retain the selected year's actual annual allocation instead of passing null. All-year views sum one configured allocation per year, preferring active records, and identify the configured years in the card notes. Execution totals follow the reporting period; allocation totals remain annual. Remaining headroom is unavailable for partial-period comparisons or combined data with missing annual allocation coverage. A genuinely unconfigured fiscal year still reports Not Configured; no allocations are created automatically.

Budget Requests displays Pending Review, Approved Budget and Released Budget cards. The `20261007214053_admin_budget_period_summary.sql` migration scopes all three summary values to the same activity-date/creation-date reporting period as the table, including recurring quarters across years. Card summaries remain independent of table status tabs, search, geography and pagination. Approved Budget sums actual approved amounts for approval/release lifecycle statuses and excludes pending, revision, rejected and draft requests; Released Budget sums released amounts for released/completed requests. The current-page rows are not used for totals. Prior-period placeholder rows are cleared while the new query loads.

The summary migration was applied with user approval. Its actual summary expression was evaluated read-only for All Periods, 2026 and recurring Q1, confirming the fields and year totals within all-period totals. RPC signature, grants and invalid-session rejection were checked. No authenticated browser export was exercised.

`supabase/migrations/20261007212327_admin_independent_year_quarter_filters.sql` adds an optional `_quarter` parameter to the two paged RPCs, preserves existing date defaults, authorization, pagination and draft guards, and was applied to the linked project with user approval. It uses Manila time for timestamp quarters. Live checks confirmed quarter predicates and rejection of invalid quarters and sessions; authenticated exports were not exercised against live data.

## Pagination and egress

Budget and Liquidation browsing stays at 20 rows per page with server filtering and a page reset on period changes. Activity Logs retain their existing 10-row pages. Matching export metadata is fetched in 50-row pages only inside explicit Generate Export handlers. Temporary export rows are not merged into the global store. Merely opening an export dialog does not fetch the all-pages export dataset.

Monitoring retains its existing scoped, abortable cursor loader and query cache. No full snapshots, recurring export queries, file metadata preloads, signed URLs, Storage HEAD requests or file/PDF downloads were added. The new review export loader checks session continuity and removes duplicate IDs if a queue moves during export. Offset exports are not a transaction snapshot: concurrent changes can change membership while pagination is running.

## Migration prerequisite

`supabase/migrations/20261007203541_admin_quarterly_export_filters.sql` is the initial forward migration. It is **applied**, recorded remotely as `20261007211022_admin_quarterly_export_filters` (the migration tool assigned the remote timestamp). The two subsequent filter migrations are described above.

It extends `admin_get_review_resource_page` and `admin_get_portal_list_page` with `_start_date date DEFAULT NULL` and `_end_date_exclusive date DEFAULT NULL`. The former filters Budget and Liquidation branches; the latter filters only Activity Logs. Existing relative log filters, response projections, numbered references, sort order and filters remain.

The migration extends the predecessor definitions with guarded replacements, fails atomically on unexpected signatures/body anchors, and removes the old default-argument overload to avoid PostgREST ambiguity. Old callers remain supported by the new parameters' defaults. Active-account/session and resource permission checks stay in place; PUBLIC execution is revoked and the existing anon/authenticated/service_role RPC grants are retained. Search paths use `pg_catalog, public, pg_temp`. No cascading drop or RLS weakening occurs.

Live signatures, authorization anchors and migration history matched the predecessor definitions before application. Application succeeded and PostgREST schema reload was requested. Post-application checks confirmed one 13-argument signature per RPC, optional date defaults, hardened search paths, preserved execution grants, authorization and pagination guards, and Manila exclusive-end predicates. Database calls confirmed that both RPCs reject invalid sessions and reversed date ranges. An authenticated export was not exercised against live data. Security advisors were reviewed; these RPCs retain intentional anon/authenticated execution behind the existing admin session and permission checks.

## Changed source files

- `src/lib/admin-report-period.ts`: shared model, validation, boundaries, labels, Manila matching, monitoring adapters and export naming.
- `src/admin/components/AdminReportingPeriodSelector.tsx`: shared controlled year/period/custom selector.
- `src/admin/components/AdminExportDialog.tsx`: optional selector and selected-period callback; legacy callbacks retain their original argument count.
- `src/admin/components/YorpRegistryExportDialog.tsx`: shared selector alongside the existing column controls.
- `src/admin/components/ActivityLogsExportDialog.tsx` and `src/components/reports/ExportReportDialog.tsx`: forward optional period configuration.
- `src/admin/pages/YorpRegistry.tsx`: export-only intersection with current registry filters.
- `src/admin/AdminPortal.tsx`: bounded period queries, page resets, explicit complete export loaders, shared metadata and monitoring/allocation export periods.
- `src/admin/components/BudgetMonitoringPageControls.tsx`: quarter presets converted into the existing inclusive custom-period model, staged Apply action and preserved fiscal-year label.
- `src/lib/lydo-connect-supabase.ts`: ranged list/review wrappers and bounded complete review exports; existing monitoring loader retained.
- `src/lib/report-export.ts`: optional generated-date filename suffix, defaulting to existing behavior.
- The single migration above and this documentation.

## Added coverage

- `src/lib/admin-report-period.test.ts`
- `src/lib/admin-quarterly-export-rpc.test.ts`
- `src/lib/admin-quarterly-export-contract.test.ts`
- `src/admin/components/AdminReportingPeriodSelector.test.tsx`
- `src/admin/pages/YorpRegistry.quarterly.test.tsx`
- `src/components/reports/YorpQuarterlyReportDialog.regression.test.tsx`

These cover boundaries, Manila midnight, leap/custom dates, filenames, optional UI, chosen-period generation, no export prefetch, YORP filter intersections, monitoring adapters/custom/year behavior, bounded multi-page RPC calls, relative log filters, authorization/migration contracts, page reset wiring and unchanged Section 35 controls. Page reset and global-store isolation checks are source-contract tests; RPC and selector/export behavior are runtime tests with mocked services.

## Seed quarter repair

Applied `20261007214552_rebalance_yorp_seed_reporting_quarters.sql` to the linked project after explicit approval. The marked 84-record `PCYDO-YORP-2024-2026` fixture now has 2024 Q1–Q4 budget counts 8/8/8/7, 2025 Q1–Q4 counts 12/12/12/11, and 2026 Q1 count 6. Every quarter includes released budgets and liquidation reports; report creation dates match the budget activity quarter in Asia/Manila.

The initial attempt rolled back completely because terminal released-budget dates are immutable. The repair serializes writes, permits only marked fixture release-date changes inside its transaction, and restores the exact terminal guard before returning. Amount and status guards remain active throughout. Any error rolls back both the function replacement and row updates. The helper is unavailable to anon/authenticated; the existing admin seeder invokes it behind its existing admin-session and development-environment checks so reseeding retains quarter coverage.

Post-application database checks confirmed all nine quarters, 57 linked liquidation reports, and the unchanged PHP 4,200,000 approved total. Internal before/after assertions preserved identities, amounts and statuses. Full-row fingerprints for unmarked budgets/reports and the protected renewal test account were unchanged; the terminal guard definition fingerprint also matched its original value. Security advisors reported no finding mentioning the repair helper. No application tests were added or run for this data repair.

## Seed names and financial variation

`20261007215640_diversify_yorp_seed_projects_and_budgets.sql` revises only the marked 84-record fixture, with explicit user authorization to change its data. Each source ordinal receives a distinct project title; requested amounts range from PHP 30,000–74,000 and approved amounts vary by a PHP 0–3,000 adjustment. Released requests receive their approved amount; awaiting-release requests retain zero released funds. Existing statuses, dates, quarter placement, categories and identities are preserved. Liquidation monetary displays derive from linked budgets; existing report chronology is restored after the budget sync trigger runs.

The privileged helper serializes writes and temporarily exempts only validated fixture rows from terminal amount immutability inside its transaction. The original guard definition is restored before return; failure rolls back the whole operation. Anon/authenticated execution is revoked. The existing authenticated development seeder calls the variation helper after the quarter-repair helper, retaining its existing validation and authorization checks.

Applied and verified in the linked database: 84 distinct normalized titles. 2024 Q1–Q4 approved/released totals are 439,000/259,000; 325,000/214,000; 436,000/271,000; and 394,000/324,000. 2025 quarters and 2026 Q1 also have varied amounts. Before/after fingerprints confirm the original terminal guard and all non-fixture/protected renewal budgets and reports remain unchanged. The migration's assertions confirm fixture identities/statuses/dates and linked report contents remain unchanged. Security advisors have no finding naming the helper. The local sample preview catalog uses the same titles and approved-amount formula, while retaining category resolution from the original source titles. No application tests or reseeding operation were run for this revision.

## Validation and existing debt

Focused and broader affected Vitest suites pass: **128 tests across 17 files**, including all 37 new tests, existing registry column-selection, monitoring/map, activity export, Admin pagination and Section 35 semantics tests. The production build, root `npx tsc --noEmit`, and `git diff --check` pass. The root tsconfig has project references and no direct source inputs; the app-specific typecheck was run separately and has 649 existing diagnostics, with no new diagnostics compared against untouched HEAD.

Broader existing suites retain five failures in master-registry column/portrait geometry expectations and 32 lifecycle test failures due to Realtime mocks missing `supabase.channel`. These failures reproduce on untouched HEAD. A concurrent map timeout and an artifact-generation transient were checked again with bounded workers; final separate runs pass or reproduce the five stable layout failures. Those unrelated tests/source expectations were not changed.
