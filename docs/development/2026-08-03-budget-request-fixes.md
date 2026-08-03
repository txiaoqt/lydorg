# Budget Request Module Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Budget Request Module (`src/user/UserPortal.tsx`, `src/components/activity/RecentActivityPreview.tsx`)
- **Primary Objective**: Resolve form state reset bug, field overlapping, PHP currency layout issues, white screen runtime crashes, broken Recent Activity links, Open File button padding alignment, and `budgetActionLabels` ReferenceError.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/budget-request`

---

## 1. Issues Addressed & Root Causes

### 1. New Budget Request Fields Disappearing
- **Root Cause**: A `useEffect` in `UserPortal.tsx` listening to `[budgetEligibility, currentProfile?.id, section, searchParams, user?.id]` executed whenever background store updates or real-time Supabase subscriptions re-created the `budgetEligibility` object reference. When triggered with a `?ypopEntryId` query parameter, it called `setBudgetForm({ ...blank, ... })` and `setBudgetFileDraft(null)`, clearing active form inputs. If `?ypopEntryId` was absent, it called `setShowBudgetForm(false)`, closing open forms.
- **Fix Implemented**: Added `initializedYpopBudgetIdRef = useRef<string | null>(null)` to ensure the form initializes ONCE per unique `ypopEntryId` query parameter upon entering the page. Prevented background effects from clearing user inputs or hiding open budget forms while the user is actively filling them out.

### 2. Field Overlapping (Venue & Requested Amount)
- **Root Cause**: `lg:contents` on `<div className="budget-form-two-column grid gap-4 min-[600px]:grid-cols-2 lg:contents">` stripped wrapper element boundaries inside `<div className="grid gap-4 lg:grid-cols-2">`, causing `Venue` and `Requested Amount` grid items to collide or overlap on large viewports.
- **Fix Implemented**: Removed `lg:contents` and assigned explicit grid placement (`grid gap-4 sm:grid-cols-2 lg:col-span-2`) to keep `Proposed Date` / `Venue` in one row and `Requested Amount` / `Purpose and Category` in another row. Added `w-full min-w-0` to the Venue `<Input>`.

### 3. Requested Amount Layout & PHP Prefix Spacing
- **Root Cause**: The `PHP` currency prefix container `<div className="flex overflow-hidden rounded-md border border-input bg-background">` lacked `shrink-0` on the prefix `<span>` and `flex-1 min-w-0` on the amount `<Input>`, causing text collisions on long currency amounts.
- **Fix Implemented**: Added `shrink-0` and `bg-muted/30 select-none` to the `PHP` prefix `<span>`, and `flex-1 min-w-0 border-0 focus-visible:ring-0` to the amount `<Input>`.

### 4. White Screen / Site Crash & `budgetActionLabels` ReferenceError
- **Root Causes**:
  1. `budgetActionLabels` was previously declared locally inside `case "budget-request":` block in `activeContent`. However, `budgetRecentActivityModal` Dialog (line 11554) is rendered at the root level of `UserPortal.tsx` outside `activeContent`. Accessing `budgetActionLabels` when opening recent activity triggered `Uncaught ReferenceError: budgetActionLabels is not defined`.
  2. `formatCurrency(value)` called `value.toLocaleString()`. If `value` was null/undefined/NaN, it threw `TypeError: Cannot read properties of null (reading 'toLocaleString')`.
  3. `new Date(request.activityDate).toLocaleDateString(...)` executed without checking for `Invalid Date`, throwing `RangeError: Invalid time value`.
- **Fix Implemented**:
  1. Moved `budgetActionLabels` to top-level module scope in `UserPortal.tsx`, making it accessible globally across desktop/mobile budget cards, tables, and modal dialogs.
  2. Updated `formatCurrency` to safely convert any null/undefined/NaN input to `0` before formatting.
  3. Replaced raw `.toLocaleDateString(...)` calls with `formatShortPortalDate(...)` which validates dates before formatting.

### 5. Recent Activity Links Broken
- **Root Cause**: In table and card views, clicking `+{additionalActivities} more` or Recent Activity items called `openBudgetRecentActivityModal(request)`. If `request.revisionHistory` was empty or missing timestamps, the modal rendered an empty state without showing initial submission/creation status.
- **Fix Implemented**: Updated `openBudgetRecentActivityModal` so that if `revisionHistory` is empty, it populates a fallback activity entry with the request's initial creation/submitted date and status. Made the Recent Activity table cell an interactive button with hover underline styling so clicking anywhere in the cell opens the activity log modal.

### 6. Open File Button Extra Padding
- **Root Cause**: The `Open File` action button in budget request detail view used `h-10` and `whitespace-normal` with extra vertical padding.
- **Fix Implemented**: Standardized the `Open File` button height to `h-9 px-3.5` matching standard Y-TRACE action buttons across the portal.

---

## 2. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/user/UserPortal.tsx` | Organization Portal | Moved `budgetActionLabels` to top-level module scope, fixed `budgetForm` reinitialization bug via `initializedYpopBudgetIdRef`, corrected Venue/Requested Amount grid layout and `PHP` prefix spacing, guarded `formatCurrency` & date formatting to eliminate white screen crashes, restored Recent Activity links/modals, and standardized `Open File` button padding. |
| `docs/development/2026-08-03-budget-request-fixes.md` | Engineering Docs | Added engineering documentation for Budget Request fixes and ReferenceError resolution. |

---

## 3. Mandatory Standard Verification Performed

1. **`npm run build`**:
   - Completed in 26.96s with **0 errors** (built production bundle successfully).
2. **`npx tsc --noEmit`**:
   - Completed with **0 TypeScript errors**.
3. **`npm test`**:
   - Completed with **24 test files** and **102 tests passing**.
4. **Regression Checks Completed**:
   - Verified user inputs persist across re-renders and polling.
   - Verified no white screen runtime crashes occur when interacting with budget request forms or dates.
   - Verified `budgetActionLabels` ReferenceError is resolved and Recent Activity links open history modal correctly.
   - Verified non-budget features remain 100% functional.
5. **Git Branch**: Executed on `feature/budget-request`.
