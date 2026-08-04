# Comprehensive Legacy Code Audit Report (Y-TRACE Project)

**Date**: August 3, 2026  
**Repository**: `txiaoqt/lydorg`  
**Branch**: `chore/legacy-code-audit`  
**Audit Purpose**: Complete repository audit to identify all legacy, obsolete, unused, unreachable, or deprecated code, routes, components, utilities, hooks, assets, types, and documentation.  
**Action Status**: AUDIT & DOCUMENTATION ONLY (No files deleted or modified).

---

## Executive Summary & Totals

| Audit Metric | Count | Description |
| :--- | :---: | :--- |
| **Legacy Pages** | **7** | Unreferenced page components in `src/pages/` not routed in production. |
| **Legacy Custom Components** | **4** | Custom components only imported by legacy pages or unreferenced. |
| **Legacy UI Primitives** | **11** | Shadcn UI primitives in `src/components/ui/` with 0 import references. |
| **Legacy / Unreachable Routes** | **8** | Dead section routes (e.g. `/compliance-status`) & legacy redirect aliases in `src/App.tsx`. |
| **Legacy Features** | **3** | Replaced workflows (Legacy Compliance Status, Transparency Board, Youth Desk). |
| **Legacy Hooks** | **1** | Hook (`use-user-profile.ts`) only referenced by legacy `Profile.tsx`. |
| **Legacy Utilities & Data Files** | **4** | Obsolete data/mock helper files (`mockData.ts`, `transparencyPortalData.ts`, etc.). |
| **Legacy Assets** | **2** | Unused PDF diagram (`public/`) and redundant PNG asset (`src/assets/hero-image.png`). |
| **Legacy Types & Interfaces** | **6** | Interfaces exclusively defined inside legacy/obsolete modules. |
| **Outdated Documentation Files** | **1** | Documentation (`docs/architecture/system-modules.md`) referencing legacy workflows. |

---

## 1. Legacy Pages

### Finding 1.1: `src/pages/BarangayMap.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/BarangayMap.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/BarangayMap.tsx)
- **Line / Section**: Entire File (Lines 1–210)
- **Why it is legacy**: Originally created for interactive barangay compliance mapping. Replaced by the unified YORP Registry (`AdminPortal`) and Portal Dashboard. Not imported in `src/App.tsx` or any active route.
- **Safe to remove**: Yes.
- **Dependencies**: Imports `ComplianceBadge`, `PageHero`.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Safe for deletion in future cleanup tasks.

### Finding 1.2: `src/pages/FinancialDisclosure.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/FinancialDisclosure.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/FinancialDisclosure.tsx)
- **Line / Section**: Entire File (Lines 1–115)
- **Why it is legacy**: Deprecated public disclosure layout. Replaced by `PublicTemplates.tsx` and `BudgetRequests` portal modules. Not routed in `src/App.tsx`.
- **Safe to remove**: Yes.
- **Dependencies**: Imports `PageHero`, `StatCard`.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Mark for deletion.

### Finding 1.3: `src/pages/Organizations.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/Organizations.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/Organizations.tsx)
- **Line / Section**: Entire File (Lines 1–160)
- **Why it is legacy**: Replaced by YORP Registry and portal Organization Profile. Unreachable from navigation.
- **Safe to remove**: Yes.
- **Dependencies**: Imports `PageHero`, `youthCatalog`.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Mark for deletion.

### Finding 1.4: `src/pages/Profile.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/Profile.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/Profile.tsx)
- **Line / Section**: Entire File (Lines 1–130)
- **Why it is legacy**: Standalone user profile page replaced by `UserPortal.tsx` (`organization-profile` section) and PWA Profile Editor (`PwaProfilePages.tsx`). Route `/profile` in `App.tsx` redirects to `/organization-profile`.
- **Safe to remove**: Yes.
- **Dependencies**: Imports `useUserProfile`.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Safe to remove after verifying no external deep links depend on it.

### Finding 1.5: `src/pages/TransparencyBoard.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/TransparencyBoard.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/TransparencyBoard.tsx)
- **Line / Section**: Entire File (Lines 1–250)
- **Why it is legacy**: Early prototype of transparency board. Replaced by `NewsReleases.tsx` and Portal Budget Monitoring.
- **Safe to remove**: Yes.
- **Dependencies**: Imports legacy transparency state.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Mark for deletion.

### Finding 1.6: `src/pages/TransparencyReports.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/TransparencyReports.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/TransparencyReports.tsx)
- **Line / Section**: Entire File (Lines 1–180)
- **Why it is legacy**: Deprecated public report view replaced by `/public-templates` and `/budget-request` reporting.
- **Safe to remove**: Yes.
- **Dependencies**: Imports `PageHero`, `transparencyPortalData`.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Safe for removal.

### Finding 1.7: `src/pages/YouthDesk.tsx`
- **Category**: Legacy Pages
- **File**: [src/pages/YouthDesk.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/pages/YouthDesk.tsx)
- **Line / Section**: Entire File (Lines 1–280)
- **Why it is legacy**: Prototype youth assistance screen replaced by `Contacts.tsx` and portal inquiry features.
- **Safe to remove**: Yes.
- **Dependencies**: Imports `PageHero`.
- **Estimated cleanup difficulty**: Low.
- **Risk level**: Low.
- **Recommendation**: Safe for removal.

---

## 2. Legacy Components

### 2.1 Custom Components

#### Finding 2.1.1: `src/components/ComplianceBadge.tsx`
- **Category**: Legacy Components
- **File**: [src/components/ComplianceBadge.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ComplianceBadge.tsx)
- **Why it is legacy**: Only imported by legacy page `BarangayMap.tsx`. Active portal uses `PortalStatusBadge` in `UserPortal.tsx`.
- **Safe to remove**: Yes (when `BarangayMap.tsx` is removed).
- **Risk level**: Low.

#### Finding 2.1.2: `src/components/FeatureCard.tsx`
- **Category**: Legacy Components
- **File**: [src/components/FeatureCard.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/FeatureCard.tsx)
- **Why it is legacy**: Unreferenced in entire codebase (0 imports).
- **Safe to remove**: Yes.
- **Risk level**: Low.

#### Finding 2.1.3: `src/components/PageHero.tsx`
- **Category**: Legacy Components
- **File**: [src/components/PageHero.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/PageHero.tsx)
- **Why it is legacy**: Only imported by legacy pages (`BarangayMap.tsx`, `FinancialDisclosure.tsx`, `Organizations.tsx`, `TransparencyReports.tsx`, `YouthDesk.tsx`).
- **Safe to remove**: Yes (when legacy pages are removed).
- **Risk level**: Low.

#### Finding 2.1.4: `src/components/LocationPreviewButton.tsx`
- **Category**: Legacy Components
- **File**: [src/components/LocationPreviewButton.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/LocationPreviewButton.tsx)
- **Why it is legacy**: Unreferenced in entire codebase (0 imports).
- **Safe to remove**: Yes.
- **Risk level**: Low.

### 2.2 Unused Shadcn UI Primitives

The following 11 UI primitive files in `src/components/ui/` have 0 import references across active production components:
1. [src/components/ui/context-menu.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/context-menu.tsx)
2. [src/components/ui/menubar.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/menubar.tsx)
3. [src/components/ui/resizable.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/resizable.tsx)
4. [src/components/ui/carousel.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/carousel.tsx)
5. [src/components/ui/chart.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/chart.tsx)
6. [src/components/ui/hover-card.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/hover-card.tsx)
7. [src/components/ui/navigation-menu.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/navigation-menu.tsx)
8. [src/components/ui/slider.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/slider.tsx)
9. [src/components/ui/toggle-group.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/toggle-group.tsx)
10. [src/components/ui/toggle.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/toggle.tsx)
11. [src/components/ui/aspect-ratio.tsx](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/components/ui/aspect-ratio.tsx)

- **Safe to remove**: Optional / Low priority (can be kept as library utilities or removed during bundle size optimization).

---

## 3. Legacy Routes & Unreachable Control Flow

### Finding 3.1: `/compliance-status` Dead Route
- **File**: `src/App.tsx` (Line 300)
- **Why it is legacy**: Renders `<UserPortalEntry section="compliance-status" />`. `UserPortal.tsx` has no `case "compliance-status"`, causing it to render `PortalEmptyState` ("Section not found").
- **Safe to remove**: Yes.

### Finding 3.2: `/public-transparency` Dead Route
- **File**: `src/App.tsx` (Line 299)
- **Why it is legacy**: Renders `<UserPortalEntry section="public-transparency" />` which falls through to `PortalEmptyState` in `UserPortal.tsx`.
- **Safe to remove**: Yes.

### Finding 3.3–3.8: Legacy Redirect Routes in `App.tsx`
- `/admin/users` -> Redirects to `/admin/yorp-registry`
- `/admin/document-validation` -> Redirects to `/admin/registrations`
- `/admin/public-transparency-posts` -> Redirects to `/admin/budget-monitoring`
- `/admin/notifications-activity` -> Redirects to `/admin/notifications`
- `/validation-review` -> Redirects to `/document-submission`
- `/profile` -> Redirects to `/organization-profile`
- **Why it is legacy**: Legacy backwards-compatibility alias routes from early architecture iterations.

---

## 4. Legacy Features

1. **Legacy Compliance Status Workflow**: Replaced by unified Document Submissions and YORP Registry status badges.
2. **Legacy Transparency Board**: Replaced by Public Templates, Budget Requests, and News Releases.
3. **Legacy Youth Desk**: Replaced by Contacts page and Admin Inquiries portal section.

---

## 5. Legacy Hooks

### Finding 5.1: `src/hooks/use-user-profile.ts`
- **Category**: Legacy Hooks
- **File**: [src/hooks/use-user-profile.ts](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/hooks/use-user-profile.ts)
- **Why it is legacy**: Only referenced by legacy `src/pages/Profile.tsx`. Production portal state is managed by `useLydoConnectStore` (`lydo-connect-store.tsx`).
- **Safe to remove**: Yes.

---

## 6. Legacy Utilities & Data Files

1. [src/lib/mockData.ts](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/lib/mockData.ts): Obsolete early mock dataset (0 imports).
2. [src/lib/transparencyPortalData.ts](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/lib/transparencyPortalData.ts): Legacy disclosure data structure.
3. [src/lib/youthCatalog.ts](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/lib/youthCatalog.ts): Early static catalog replaced by Supabase dynamic store.
4. `src/lib/registration-validation.ts`: Replaced by `organization-profile-domain.ts` and `urn-registration.ts`.

---

## 7. Legacy Supabase Resources & Migration Scripts

The `supabase/` directory contains 4 maintenance/repair SQL scripts:
- `supabase/repair_admin_portal_dynamic_sync.sql`
- `supabase/repair_admin_portal_snapshot_and_news.sql`
- `supabase/repair_budget_requests_schema.sql`
- `supabase/repair_organization_profiles_schema.sql`

- **Status**: Kept for historical reference. Safe to keep or consolidate into migration history.

---

## 8. Legacy Assets

1. [public/Blank diagram_ Lucidchart.pdf](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/public/Blank%20diagram_%20Lucidchart.pdf) (24 KB): Leftover diagram PDF in public root.
2. [src/assets/hero-image.png](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/src/assets/hero-image.png) (138 KB): Redundant PNG version of `hero-image.webp`.

---

## 9. Legacy Types

Interfaces `YouthOrganization`, `DisclosureDocument`, and `UserSettings` in `youthCatalog.ts`, `transparencyPortalData.ts`, and `use-user-profile.ts` are legacy.

---

## 10. Outdated Documentation

- [docs/architecture/system-modules.md](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/docs/architecture/system-modules.md): References legacy Compliance Status routes that are now handled via Document Submissions and YORP Registry.

---

## Recommended Cleanup Order (Highest Impact First)

1. **Phase 1: Legacy Pages & Custom Components** (Removes 7 unused page files and 4 custom components, freeing ~120 KB source code).
2. **Phase 2: Dead Routes & Redirect Aliases** (Cleans up `App.tsx` routing registry).
3. **Phase 3: Obsolete Data & Mock Files** (Removes `mockData.ts`, `transparencyPortalData.ts`, `youthCatalog.ts`).
4. **Phase 4: Legacy Assets** (Removes `Blank diagram_ Lucidchart.pdf` and `hero-image.png`).
5. **Phase 5: Optional UI Primitives** (Prunes 11 unused shadcn components).
