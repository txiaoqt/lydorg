# News Releases Portal Regression Investigation

## Date: August 3, 2026

## Regression Description

Inside the Organization Portal, clicking "News Releases" in the sidebar redirects authenticated users to the **Public Website** News Releases page (`/news-releases`) instead of keeping them inside the portal shell (`/portal-news-releases`).

This regression keeps recurring after being fixed.

---

## Root Cause Analysis

### The Fix Was Never Merged Into `main`

The News Releases separation fix lives **exclusively** on two feature branches:

| Branch | Contains Fix? |
| :--- | :---: |
| `feature/organization-portal` | ✅ Yes |
| `feature/authentication` | ✅ Yes (merged from `feature/organization-portal`) |
| **`main`** | **❌ No** |
| `feature/organization-profile` | ❌ No |
| `feature/public-pages` | ❌ No |
| `chore/legacy-code-audit` | ❌ No |

### What Happens When You Switch Branches

Every time a developer checks out `main` (or any branch forked from `main` before commit `7fc27eb`), the workspace reverts to the old code where:

- `userRouteMap["news-releases"]` points to `"/news-releases"` (the **public** page route)
- No `/portal-news-releases` route exists in `App.tsx`
- No `PublicNewsReleasesGate` component exists
- The sidebar `onNavigate` handler calls `navigate("/news-releases")`, which loads the **public** `<NewsReleases />` component outside the portal shell

### Detailed Navigation Flow Trace

```
1. User clicks "News Releases" in Organization Portal sidebar
   └─ UserPortalShell.tsx line 227: onClick={() => onNavigate(item.id))
      └─ item.id = "news-releases"

2. onNavigate callback (UserPortal.tsx line 10134):
   └─ navigate(userRouteMap["news-releases"] ?? userRouteMap.dashboard)

3. userRouteMap lookup (lydo-connect-data.ts line 518):
   └─ ON feature/organization-portal: "/portal-news-releases" ✅
   └─ ON main:                        "/news-releases"        ❌

4. Route resolution (App.tsx):
   └─ ON feature/organization-portal:
      "/portal-news-releases" → <RequireUser><UserPortalEntry section="news-releases" /></RequireUser>
      → Renders portal-embedded News Releases with search, filters, cards ✅

   └─ ON main:
      "/news-releases" → <NewsReleases /> (Public Website component)
      → User leaves portal shell entirely ❌
```

### Why It Keeps Recurring

The regression is **not caused by any specific code change overwriting the fix**. It recurs because:

1. **Branch isolation**: The fix on `feature/organization-portal` was never merged into `main`.
2. **Branch switching**: When any other task requires checking out `main` or a branch derived from `main`, the workspace loses the fix.
3. **Dev server restarts**: Running `npm run dev` after switching to `main` serves code without the portal route.
4. **Build artifacts**: The committed `build/` directory was last built from `main` (commit `80047d3`), which predates the fix.

### Specific Commits Involved

| Commit | Description | Branch |
| :--- | :--- | :--- |
| `7fc27eb` | Original fix: Separated News Releases between Public Website and Organization Portal | `feature/organization-portal` |
| `edc2a52` | Added `PublicNewsReleasesGate` to redirect authenticated users on `/news-releases` to `/portal-news-releases` | `feature/organization-portal` |
| `97dfe8b` | Merged `feature/authentication` into `feature/organization-portal` (sync) | `feature/organization-portal` |

### Files That Contain the Fix (and revert when switching to `main`)

| File | What Changes |
| :--- | :--- |
| `src/lib/lydo-connect-data.ts` (line 518) | `userRouteMap["news-releases"]` changes from `"/portal-news-releases"` → `"/news-releases"` |
| `src/App.tsx` (lines 155-170, 295, 314-315) | `PublicNewsReleasesGate` component and `/portal-news-releases` + `/organization-news-releases` routes disappear |
| `src/user/UserPortal.tsx` (lines 7142+) | Portal-embedded News Releases view with search/filter is present on both branches (this file is not the issue) |
| `src/user/pwa/pwaRoutes.ts` (lines 85-86) | PWA route mappings for `/portal-news-releases` and `/organization-news-releases` disappear |

---

## Resolution Strategy

> ⚠️ **This section documents the strategy. No fix has been applied yet per the user's instructions.**

The **only** correct resolution is to merge `feature/organization-portal` into `main`. Until that happens:

- Any branch created from `main` will lack the fix.
- Any developer running from `main` will see the regression.
- The deployed Vercel build (from `build/` committed on `main`) will lack the fix.

### Merge Order Recommendation

1. Merge `feature/organization-portal` → `main`
2. Rebuild and commit `build/` from `main`
3. Rebase or merge `main` into all other active feature branches

---

## Prevention Measures (Mandatory Going Forward)

### Rule 1: Scope Containment
When implementing a task, ONLY modify files directly related to that task:
- Signup UI → Only signup components
- URN generation → Only signup + organization creation + Supabase migration
- News Releases → Only News Releases files
- Do NOT edit `App.tsx`, shared routing, navigation, authentication, global layout, or shared components unless the task explicitly requires it

### Rule 2: Pre-Completion Regression Checklist
Before considering ANY future task complete, verify:
- [ ] Organization Portal News Releases opens the Portal page (not Public)
- [ ] Public Website News Releases opens the Public page
- [ ] Signup UI matches the approved design
- [ ] URN help icon still exists
- [ ] Previous UI fixes remain intact
- [ ] Authentication flow still works
- [ ] Password recovery still works
- [ ] No routing regressions were introduced

### Rule 3: Merge Discipline
- Feature branch fixes that modify shared routing (`App.tsx`, `lydo-connect-data.ts`) must be merged into `main` promptly
- Other feature branches must be rebased or merge `main` before starting new work
- Never leave critical routing fixes isolated on feature branches for extended periods

---

## Affected Files Summary

| File | Role in Regression |
| :--- | :--- |
| `src/lib/lydo-connect-data.ts` | Contains `userRouteMap` — the sidebar navigation route mapping |
| `src/App.tsx` | Contains route definitions and `PublicNewsReleasesGate` |
| `src/user/pwa/pwaRoutes.ts` | Contains PWA route mappings for portal news releases |
| `src/user/UserPortal.tsx` | Contains portal-embedded News Releases view (NOT the cause) |
| `src/user/UserPortalEntry.tsx` | Routes section prop to UserPortal (NOT the cause) |
| `src/components/portal/UserPortalShell.tsx` | Sidebar click handler calls `onNavigate(item.id)` (NOT the cause) |

---

## Merge Conflict Resolution (August 3, 2026)

### Problem

A prior merge between `feature/authentication` and `feature/organization-portal` left unresolved Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in `src/pages/SignUp.tsx`, preventing the project from compiling.

### Files With Merge Conflicts

| File | Lines | Conflict Description |
| :--- | :---: | :--- |
| `src/pages/SignUp.tsx` | 22–35 | Import block conflict between `urn-registration` exports and `password-policy` exports |

### How the Conflict Was Resolved

The conflict was in the import section at the top of `SignUp.tsx`:

- **HEAD side** (`feature/organization-portal`): Imported the full set of `urn-registration` exports (`URN_MAX_LENGTH`, `generateUniqueUrn`, `isRegistrationVerified`, `isUrnRegistration`, `normalizeUrn`, `urnReviewLabels`, `validateUrn`) needed for auto URN generation and organization profile features. Did NOT import `password-policy`.
- **Incoming side** (`feature/authentication`): Imported minimal `urn-registration` exports (`normalizeUrn`, `validateUrn`) plus the `password-policy` exports (`isPasswordValid`, `validatePasswordCriteria`) needed for password validation criteria/checklist UI.

**Resolution**: Combined BOTH sides — kept ALL `urn-registration` exports from HEAD (all are actively used in the file for auto URN generation) AND added the `password-policy` import from `feature/authentication` (actively used at lines 141, 235, 243, 348 for password criteria validation).

### Why Each Implementation Was Preserved

| Import | Used At | Feature |
| :--- | :--- | :--- |
| `URN_MAX_LENGTH` | Organization creation logic | URN auto-generation |
| `generateUniqueUrn` | Line 220 | Auto-generate URN for new organizations |
| `isRegistrationVerified` | Organization status checks | Registration verification flow |
| `isUrnRegistration` | Organization type checks | URN registration detection |
| `normalizeUrn` | URN input processing | Input normalization |
| `urnReviewLabels` | URN status display | Review label mapping |
| `validateUrn` | URN validation | Input validation |
| `isPasswordValid` | Lines 235, 243 | Password strength gate |
| `validatePasswordCriteria` | Lines 141, 348 | Password criteria checklist UI |

### Verification Performed

- **Conflict marker scan**: Zero occurrences of `<<<<<<<`, `=======`, `>>>>>>>` in source files
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors
- **Unit tests**: `npm test` passed with 25 test files and 106 tests
- **URN help icon**: Verified `HelpCircle` rendered at lines 674, 679, 703, 708
- **Portal News Releases**: `userRouteMap["news-releases"]` = `"/portal-news-releases"` ✅
- **PublicNewsReleasesGate**: Present in `App.tsx` at line 156 ✅
- **Password validation**: `validatePasswordCriteria` used at lines 141, 348 ✅

### Branch Workflow Rule (Going Forward)

Do NOT merge feature branches into each other. The correct topology is:

```
main
├── feature/authentication
├── feature/organization-portal
├── feature/signup-ui
├── feature/organization-profile
└── feature/public-pages
```

Each feature branch should only be merged INTO `main` (never into sibling branches) unless explicitly requested.

