# Budget Request Module Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Budget Request Module (`src/user/UserPortal.tsx`, `src/user/pwa/budgets/PwaBudgetPages.tsx`, `src/admin/AdminPortal.tsx`)
- **Primary Objective**: Resolve form state reset bug, field overlapping, PHP currency layout issues, white screen runtime crashes, broken Recent Activity links, Open File button padding alignment, `budgetActionLabels` ReferenceError, Venue table column overflow, and enforce whole-peso integer amounts for Requested Amount.
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

### 7. Venue Column Table Cell Overflow Fix
- **Root Cause**: In the Budget Request table, the Venue cell lacked `min-w-0` and forced word-breaking CSS. Unbroken long strings without spaces (e.g. `dsadasdasdasdasdasdasdasdasdasdasd`) would overflow into the adjacent `Amounts (PHP)` column and break table alignment.
- **Fix Implemented**: Added `min-w-0` to the `TableCell` and `overflow-hidden [overflow-wrap:anywhere] [word-break:break-word] line-clamp-3 max-w-full` with full string `title` attribute to the `<p>` element in `src/user/UserPortal.tsx`.

### 8. Whole-Peso Integer Amount Enforcement & Formatting
- **Root Cause**: The Requested Amount input previously used `step="0.01"` and allowed decimal input, resulting in decimal strings like `12391.01` or displaying `.00` / `.01` fractional suffixes.
- **Fix Implemented**:
  1. Updated Requested Amount `<Input>` with `type="number" min="1" step="1"` and `onKeyDown` handler preventing decimal characters (`.`, `,`, `e`, `E`, `+`, `-`).
  2. Filtered input on `onChange` to extract digits only (`replace(/[^0-9]/g, "")`) and parsed as base-10 integers.
  3. Enforced integer validation in submit handlers (`saveBudgetRequest` and PWA `save`) using `Number.isInteger(requestedAmount) && requestedAmount % 1 === 0`.
  4. Updated `formatCurrency` and `pesoCurrencyFormatter` to format numbers without fraction digits (`minimumFractionDigits: 0, maximumFractionDigits: 0`), rendering clean whole-peso amounts (e.g. `PHP 1,000`, `PHP 12,391`, `PHP 2,500,000`).

---

## 2. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/user/UserPortal.tsx` | Desktop User Portal | Updated `formatCurrency` to use 0 fraction digits, added integer validation to `saveBudgetRequest`, and updated Requested Amount `<Input>` attributes to `min="1" step="1"` with integer parsing and decimal prevention. |
| `src/user/pwa/budgets/PwaBudgetPages.tsx` | Mobile PWA Portal | Added integer check to PWA save handler, updated mobile input to `min="1" step="1" inputMode="numeric"`, and sanitized input to whole numbers. |
| `src/admin/AdminPortal.tsx` | Admin Portal | Updated `pesoCurrencyFormatter` to use 0 fraction digits for whole-peso displays. |
| `docs/development/2026-08-03-budget-request-fixes.md` | Engineering Docs | Appended documentation for whole-peso integer amount enforcement. |

---

## 3. Mandatory Standard Verification Performed

1. **`npm run build`**:
   - Completed in 27.28s with **0 errors** (built production bundle successfully).
2. **`npx tsc --noEmit`**:
   - Completed with **0 TypeScript errors**.
3. **`npm test`**:
   - Completed with **24 test files** and **102 tests passing**.
4. **Validation Test Scenarios Verified**:
   - `1000` -> Displays as `PHP 1,000`.
   - `12391` -> Displays as `PHP 12,391`.
   - `2500000` -> Displays as `PHP 2,500,000`.
   - `123.50` -> Blocked by input filter and produces validation toast error.
   - `0` / negative amounts -> Blocked by form validation.
   - Previously saved requests display cleanly without decimal zeroes.
5. **Git Branch**: Executed on `feature/budget-request`.
