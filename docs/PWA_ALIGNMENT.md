# PWA alignment audit and handoff

The installed Y-TRACE app now follows the website's organization workflows and administrative terminology while retaining its touch navigation and compact layouts. This is an extension of the incumbent Y-TRACE system: the website's blue identity and existing theme tokens remain the visual authority. This pass creates no `PRODUCT.md`, `DESIGN.md`, or replacement global design system.

## Product and surface contract

This document is durable authority for this scoped PWA extension. The primary user is an organization representative completing registration, compliance, YPOP qualification, activity budget and liquidation workflows. The website and shared workflow modules own the requirements, administrative decisions and copy. The app's **Operate** scope is helping that user identify their current obligation, open the relevant workflow, inspect details and submit validated work with a clear confirmation.

Preserve the installed app shell and bottom navigation. Preserve the existing Y-TRACE blue identity and token system. The dashboard's first viewport should make Current Focus and workflow metrics legible; follow the sequence **visit workflow → inspect details → validate files/details → confirm submission** for consequential work. Official resources and support remain reachable alongside those tasks.

Shared website workspaces supply canonical behavior but carry a responsive density risk. When extending YPOP or renewal, inspect headings, control wrapping, long file names, evidence lists and tables at narrow widths; keep controls usable without changing the global design system. Local screenshots establish sampled presentation only, so they do not resolve every workspace state or device condition.

## Before / After / Why

| Surface | Before | After | Why |
| --- | --- | --- | --- |
| Dashboard | “Today's Briefing,” request counts, and binary completion based on the latest request; renewal opened Profile. | “Current Focus · Action Required,” Overview with shared workflow completion metrics, Activity History, Support & Resources, and a dedicated renewal destination. Renewal countdown uses days. | Match the website's task vocabulary and report organization workflow progress rather than treating a single approved request as total completion. Reduce changing text during scanning. |
| Budgets | Broad edit availability outside approved states; edit data depended on the section snapshot; submission had no review step. | Detail and file queries expose loading/retry states. Editing is limited to drafts or eligible revisions. Review submission confirms the request; resubmission requires a corrected PDF. | Preserve administrative review and revision rules and give users a concrete final check. |
| Liquidations | Reports could disappear when their budget was absent from the loaded budget snapshot; file manager depended on cached section data. | Keep organization reports and use related budget metadata when available. Fetch manager details/files explicitly; enforce review/revision locks, one attachment, genuine replacement, and submission confirmation. | Partial section data must not hide compliance obligations or imply a file is ready for resubmission. |
| Registration documents | Rejected registration submissions remained manageable; batch files could be submitted immediately; local template IDs did not always match database file IDs. | Registration excludes renewal submissions. `isMatchingFileForTemplate` resolves attached files consistently. Local route IDs remain stable while uploads use database UUIDs. Management allows draft/needs-revision states and confirms file assignments before draft saving or review submission. | Keep original registration separate from renewal, display the correct existing attachment, and protect the administrative decision boundary. |
| City-led YPOP and organization PPAs | Separate PWA YPOP screens maintained another workflow implementation. | PWA routes mount the website's `UserPortalYPOPWorkspaceView`, with semester context, city participation, organization activities and evidence through existing store actions. | One canonical workspace owns program semantics, labels, and review behavior. |
| Registration renewal | No dedicated PWA renewal or approved-cycle destinations. | Registration Renewal and Approved Renewals mount `UserPortalRenewalWorkspaceView`; approved history is read only. Query state, retry, status refresh and profile refresh accompany the wrapper. | Expose the website's renewal cycle without creating a second renewal policy. |
| Templates and news | Existing PWA libraries/readers used shared portal data, but section loading required an organization ID. | Shared template/news sections can load for an authenticated user without an organization ID. Dashboard resources link to official templates and releases. Existing PWA readers remain. | Official resources should remain discoverable independently of organization workflow setup. |
| Profile, settings, support and resources navigation | Profile/settings/help routes existed; More omitted renewal destinations and described YPOP as scores/proof records. | More includes both renewal destinations and “YPOP Validation / City-Led Activities and Organization PPAs.” Dashboard resources point to inquiries, templates and official news. Profile/settings/help bodies are retained. | Align destinations and language with the website while keeping established app preferences and support access. |
| App presentation | Decorative card shadows, gradient avatar treatment and compressed uppercase overview labels competed with information. | Flat surfaces, inherited sans typography, wrapping labels/file names, clearer headings, tabular metrics, touch-sized controls and narrow-screen shared-workspace adjustments. | Improve scanning and touch use within the existing palette, shell and theme system. |

## Canonical ownership

Activity History and the dashboard's Recent Activity use the website's `formatActivityActionLabel` with action codes and metadata, rather than raw audit descriptions. Full history uses shared date headers, timestamps and status marker semantics, grouped newest first. Organization-scoped pagination is preserved.

- Website composition and wording: `src/user/UserPortal.tsx` and `src/components/portal/UserPortalRedesignView.tsx`.
- YPOP: `src/components/portal/UserPortalYPOPWorkspaceView.tsx`. `src/user/pwa/ypop/PwaYpopAlignedPage.tsx` is a routing/data adapter, not a new program definition. Legacy PWA YPOP URLs now resolve to this workspace; their activity editor URL does not promise that a specific editor opens automatically.
- Renewal: `src/components/portal/UserPortalRenewalWorkspaceView.tsx`, `src/lib/organization-renewal.ts`, and `src/hooks/use-renewal-clock.ts`. `src/user/pwa/renewals/PwaRenewalPage.tsx` adapts navigation, files and refreshes.
- Shared workflow rules: `src/lib/user-workflow-eligibility.ts`, `src/lib/budget-eligibility.ts`, `src/lib/revision-deadline.ts`, `src/lib/workflow-metrics.ts`, and the existing data/status helpers. PWA budgets and liquidations retain compact app views while consuming these rules and existing repository loaders.
- Data and mutations: existing store, portal repository and `src/lib/lydo-connect-supabase.ts`. This pass adds no production API or database schema.
- Visual authority: `src/index.css` and the existing PWA theme variables. `src/user/pwa/styles/pwa-app.css` supplies scoped presentation; it does not define a new global visual world.
- Navigation: `src/user/pwa/pwaRoutes.ts`, `PwaBottomNavigation.tsx`, `PwaMorePage.tsx` and `PwaUserPortal.tsx`. Profile, settings, support, directory and legal views remain reachable through their incumbent routes.

Future changes to program policy, eligibility, status names or administrative review behavior should start in the canonical website/shared modules and flow into the adapters. Keep the app's navigation and responsive presentation scoped to the PWA.

## Loading and submission safeguards

Section loads display a status message and a retryable error rather than rendering a failed request as an empty workflow. Budget and liquidation details/managers load their own record and file data. Renewal loading/errors are handled separately; dashboard renewal focus is not selected while that query is loading or failed.

Budgets permit editing drafts and eligible, unexpired revisions; requests under review are locked. Saving a revision draft preserves its revision state. Budget replacement uploads complete before the request status changes; liquidation replacements upload the new file before removing the old file. Interrupted replacement may leave multiple files, so liquidation review submission requires exactly one current attachment and revision submission requires genuine replacement evidence. Refresh and error paths make recovery visible, but replacement is not a transactional guarantee.

Registration batch confirmation lists document assignments and file names. Budget and liquidation submission dialogs explain administrative review and the editing lock. Renewal and YPOP continue to use their canonical workspace safeguards. These client safeguards complement the existing backend rules; local review does not establish production authorization behavior.

## Evidence and verification limits

The documentation pass inspected the working diff under `src/user/pwa`, the new YPOP and renewal adapters, shared-source imports, resource navigation and screenshot inventory. The implementation pass reported scoped ESLint clean, a passing local Vite build, and semantic TypeScript diagnostics reduced from baseline **647** to current **646**, with **no new diagnostics**. Existing repository TypeScript debt remains; this is not a claim of a clean repository-wide typecheck. No tests were added for this alignment pass.

Local visual review artifacts are under `.impeccable/review/`: `mobile.png`, `desktop.png`, `budget-mobile.png`, `liquidations-mobile.png`, `documents-mobile.png`, `documents-manage-mobile.png`, `ypop-mobile.png`, `renewal-mobile.png`, `templates-mobile.png`, `news-mobile.png`, and `more-mobile.png`. They use synthetic data and are local-only review evidence. They demonstrate sampled layouts, not successful production submissions or coverage of every status, permission, device or network condition. Profile/settings/support coverage here is navigation/source inspection; there is no dedicated screenshot for each retained view.

Production authentication, organization permissions, uploads/downloads, administrative review, realtime changes, failed/slow networks, installed-device behavior and offline service-worker behavior still require validation in the appropriate environment. This pass does not claim all production flows validated. No commit or push is part of this documentation handoff, and no global design-system artifact was created or changed by it.
