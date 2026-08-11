# Site Map Live Application Alignment Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Public Website Module — Site Map (`SiteMap.tsx`)
- **Primary Objective**: Align the Site Map page (`/site-map`) to reflect exclusively the active production workflows and pages of the Y-TRACE live application as wired in `src/App.tsx`, rename `"User Portal"` to `"Organization Portal"`, and purge all legacy, hidden, internal, or non-functional routes.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/public-pages`

---

## 1. Terminology & Structure Updates

### Section Renaming
- Renamed section title `"User Portal"` -> `"Organization Portal"`.
- **Rationale**: Authenticated users in Y-TRACE represent youth organizations submitting compliance and budget requests, rather than individual end users.

### Section Retained Links

#### Public Website Section (`title: "Public Website"`)
1. **Home**: `/`
2. **About**: `/about`
3. **Forms & Templates**: `/public-templates`
4. **News Releases**: `/news-releases`
5. **FAQs**: `/faqs`
6. **Contacts**: `/contacts`
7. **Privacy Policy**: `/privacy`
8. **Terms of Service**: `/terms`
9. **Site Map**: `/site-map`

#### Organization Portal Section (`title: "Organization Portal"`)
1. **Sign In**: `/signin`
2. **Create Organization Account**: `/signup`
3. **Dashboard**: `/dashboard`
4. **Organization Profile**: `/organization-profile`
5. **YPOP (Youth Participation Organization Passport)**: `/ypop`
6. **Document Submission**: `/document-submission`
7. **Budget Requests**: `/budget-request`
8. **Liquidation Reports**: `/liquidation-reporting`
9. **News Releases**: `/news-releases`
10. **Notifications**: `/notifications`
11. **Inquiry / Support**: `/contacts`
12. **Account Settings**: `/organization-profile`

---

## 2. Excluded Routes & Rationale

Per strict application state verification, the following route categories were excluded from the Site Map:

- **Legacy Routes**:
  - `Compliance Status` (`/compliance-status`): Legacy page not active in main workflow.
  - `Public Transparency Posting` (`/public-transparency`): Legacy route not linked in main navigation.
- **Password Recovery & Internal Auth Flows**:
  - `Forgot Password`, `Reset Password`, `Email Verification`, `Verify Email`, `Auth Callback` (`/reset-password`, `/verify-email`, `/auth/callback`): Sub-step utility states, not top-level navigation entries.
- **PWA & Internal Standalone Routes**:
  - `/app`, `/app-start`, `/app-more`, PWA entry gates: Internal mobile PWA container routes.
- **Admin Surface Routes**:
  - `/admin`, `/admin/registrations`, `/admin/users`, `/admin/budget-monitoring`, `/admin/templates`, `/admin/activity-logs`: Internal administrative interface.
- **Organization Renewal**:
  - Excluded because no live renewal workflow page exists for end users despite timer utilities.

---

## 3. Files Modified

| File Path | Component | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/SiteMap.tsx` | `SiteMap` | Updated `siteMapSections` array: renamed `"User Portal"` to `"Organization Portal"`, added `Forms & Templates`, included YPOP, removed legacy/hidden routes, updated hero subtitle text. |

---

## 4. Verification Performed

- **Route Verification**: Cross-referenced every link in `siteMapSections` against registered routes in `src/App.tsx`.
- **Dual News Releases Listing**: Verified `News Releases` (`/news-releases`) is listed under both `Public Website` and `Organization Portal`.
- **Responsive Layout**: Verified 2-column grid layout (`grid sm:grid-cols-2 gap-4 sm:gap-6`) remains clean and mobile-friendly.
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed in 32.74s with 0 errors.
- **Automated Test Suite**: `npm test` passed with `23/23 test files` and `92/92 unit tests`.
- **Git Workflow**: Executed on `feature/public-pages`.
