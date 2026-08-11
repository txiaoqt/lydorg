# Organization Portal News Releases Separation Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Organization Portal Module — News Releases Routing & UI Separation
- **Primary Objective**: Separate the News Releases experience between the Public Website (`/news-releases`) and the Organization Portal (`/portal-news-releases`), preventing authenticated portal users from being unexpectedly redirected to the public website UI while sharing the underlying published news dataset.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/organization-portal`

---

## 1. Root Cause of Incorrect Routing

- **Diagnosis**:
  - `userRouteMap["news-releases"]` in `src/lib/lydo-connect-data.ts` previously mapped to `"/news-releases"`.
  - In `src/App.tsx`, `/news-releases` was configured as a top-level route rendering `<NewsReleases />` (the Public Website page component with public navbar, public hero, and public footer).
  - The application lacked an explicit authenticated portal route mapping for News Releases (such as `/portal-news-releases` or `/organization-news-releases`).
  - As a result, when an authenticated user clicked "News Releases" in the Organization Portal navigation, React Router evaluated `/news-releases` and rendered the Public Website page, taking users out of the portal frame.

---

## 2. Shared Data Architecture & UI Separation

- **Shared Data Layer**:
  - Both Public Website (`/news-releases`) and Organization Portal (`/portal-news-releases`) consume the same backend news publication state (`visibility_status = 'published'`).
  - The backend and Supabase query logic are shared; only the presentation layer and routing are decoupled.
- **Public Website (`src/pages/NewsReleases.tsx`)**:
  - Remained 100% UNCHANGED with public header, hero gradient, search, and public layout.
- **Organization Portal (`src/user/UserPortal.tsx` -> `section === 'news-releases'`)**:
  - Renders inside the authenticated `UserPortal` shell (with sidebar, portal header, breadcrumbs, user avatar, and status badges).
  - Includes a portal-native search bar and category filter pill buttons (`portalNewsSearch`, `portalNewsCategoryFilter`).
  - Renders published news release cards using portal design tokens (`rounded-[22px] border-border/70 bg-card shadow-sm`).
  - Action buttons link directly to Facebook posts or internal announcements without breaking out of the portal shell.

---

## 3. Routing Changes

| Route Path | Module / Target Component | Rationale |
| :--- | :--- | :--- |
| `/news-releases` | Public Website (`<NewsReleases />`) | Public website page (Unchanged). |
| `/portal-news-releases` | Organization Portal (`<UserPortalEntry section="news-releases" />`) | Dedicated authenticated Organization Portal route. |
| `/organization-news-releases` | Organization Portal (`<UserPortalEntry section="news-releases" />`) | Route alias for portal news releases. |

---

## 4. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/lib/lydo-connect-data.ts` | `userRouteMap` | Updated `userRouteMap["news-releases"]` from `"/news-releases"` to `"/portal-news-releases"`. |
| `src/App.tsx` | Route Registry | Added `<Route path="/portal-news-releases" />` and `<Route path="/organization-news-releases" />` rendering `<RequireUser><UserPortalEntry section="news-releases" /></RequireUser>`. |
| `src/user/pwa/pwaRoutes.ts` | PWA Navigation | Mapped `/portal-news-releases` and `/organization-news-releases` to `PWA_ROUTES.news` in `legacyRouteMap`. |
| `src/pages/SiteMap.tsx` | Site Map Directory | Updated Organization Portal section link to point to `/portal-news-releases`. |
| `src/user/UserPortal.tsx` | `UserPortal` | Added `portalNewsSearch` and `portalNewsCategoryFilter` interactive state, and updated `section === "news-releases"` view with portal-native search, filter chips, and card grid. |

---

## 5. Verification Performed

- **Navigation & Shell Integrity**: Verified clicking "News Releases" inside the Organization Portal opens `/portal-news-releases` within the portal shell. Zero redirects to Public Website.
- **Public Website Integrity**: Verified `/news-releases` renders the Public Website page unchanged.
- **Shared News Data**: Verified published news releases display identically on both interfaces.
- **TypeScript Type Check**: `npx tsc --noEmit` passed with 0 errors.
- **Unit Test Suite**: `npm test` passed with 24 test files and 99 tests passing.
- **Production Build**: `npm run build` completed in 31.81s with 0 errors.
- **Git Branch Workflow**: Executed on `feature/organization-portal`.

---

## 6. Recurring Regression Investigation (August 3, 2026)

### Problem

The News Releases portal fix keeps reverting. After logging out and back in, or switching branches and restarting the dev server, clicking "News Releases" in the Organization Portal sidebar redirects to the Public Website page again.

### Root Cause

The fix was **never merged into `main`**. It exists only on `feature/organization-portal` and `feature/authentication` (which merged from `feature/organization-portal`).

Every time work is done on `main` or a branch forked from `main` (e.g., `feature/organization-profile`, `feature/public-pages`, `chore/legacy-code-audit`), the workspace reverts to:

- `userRouteMap["news-releases"]` → `"/news-releases"` (public route, not portal)
- No `/portal-news-releases` route in `App.tsx`
- No `PublicNewsReleasesGate` component

### Branches Containing the Fix

- `feature/organization-portal` ✅
- `feature/authentication` ✅ (merged from above)

### Branches Missing the Fix

- `main` ❌
- `feature/organization-profile` ❌
- `feature/public-pages` ❌
- `chore/legacy-code-audit` ❌
- All other branches forked from `main` ❌

### Resolution

Merge `feature/organization-portal` into `main`, then rebase all active feature branches on `main`.

### Detailed Investigation

See: `docs/development/2026-08-03-news-releases-portal-regression-investigation.md`

