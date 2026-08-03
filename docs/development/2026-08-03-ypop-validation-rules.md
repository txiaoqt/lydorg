# YPOP Validation Request Eligibility & Rules Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: YPOP Module — Validation Request Submission Rules (`ypop-event-eligibility.ts`, `UserPortal.tsx`, `PwaYpopWorkspace.tsx`)
- **Primary Objective**: Block YPOP validation request submissions when an organization has no logged City-Led Activities or is missing required supporting proof documents.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/ypop-validation`

---

## 1. Validation Rules Added

Before allowing an organization user to submit a YPOP Validation Request (`handleSubmitYpop` in desktop web portal and `submitEntry` in PWA mobile workspace), the system evaluates `validateYpopSubmissionEligibility(...)`:

1. **City-Led Activity Requirement**:
   - The organization must have joined / logged at least one City-Led Activity (`participations.length > 0` or `cityLedAttendance.length > 0`).
   - **Validation Error Message**: `"You must log at least one City-Led Activity before submitting a YPOP validation request."`

2. **Supporting Documents Requirement**:
   - Every logged City-Led Activity must have supporting proof submitted / attached (`proofSubmittedAt` timestamp or attached event proof files), and total attached proof files across entry/activities must be greater than 0.
   - **Validation Error Message**: `"You must attach all required supporting proof documents for your logged City-Led Activities before submitting for validation."`

3. **Behavior when Unmet**:
   - Submission is blocked (returns early without prompting or updating status).
   - An informative toast message (`variant: "destructive"`) is rendered.
   - Desktop entry card displays an inline warning banner explaining the exact missing requirement.
   - Submit button is disabled and annotated with a tooltip.
   - User remains on the current page without page reloads or routing changes.

---

## 2. JSX Syntax Error Fix in UserPortal.tsx

### Root Cause
During multi-replace chunking in `src/user/UserPortal.tsx`, line 8063 in `renderEntryCard`'s shared header had an unclosed `<p>` tag:
```tsx
{deadline && (
  <p className={`text-xs ${isDeadlinePast ? "text-destructive" : "text-muted-foreground"}`}>
```
The deadline date string, closing `</p>`, closing `)}`, and closing `</div>` elements were accidentally truncated, causing Vite JSX compilation to fail with `Expected '</', got '{'`.

### Fix Implemented
Restored the complete JSX block in `src/user/UserPortal.tsx` lines 8055–8068:
```tsx
{deadline && (
  <p className={`text-xs ${isDeadlinePast ? "text-destructive" : "text-muted-foreground"}`}>
    Validation {isDeadlinePast ? "closed" : "closes"} {deadline.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
  </p>
)}
```

---

## 3. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/lib/ypop-event-eligibility.ts` | Domain Utility | Added `validateYpopSubmissionEligibility` function and `YpopSubmissionEligibility` type. |
| `src/lib/ypop-event-eligibility.test.ts` | Unit Tests | Added unit test suite for YPOP validation request submission eligibility edge cases (6 tests). |
| `src/user/UserPortal.tsx` | Organization Portal | Integrated `validateYpopSubmissionEligibility` into `handleSubmitYpop` and `renderEntryCard` UI, and fixed unclosed `<p>` tag in entry card header. |
| `src/user/pwa/ypop/PwaYpopWorkspace.tsx` | PWA YPOP Workspace | Integrated `validateYpopSubmissionEligibility` into `submitEntry` and `submissionBlockReason`. |
| `docs/development/2026-08-03-ypop-validation-rules.md` | Engineering Docs | Added documentation for YPOP validation request submission rules and JSX syntax fix. |

---

## 4. Rationale

Previously, an organization could submit a YPOP semester entry for administrative validation even if no City-Led Activities were joined or no proof files were attached, causing incomplete submissions in the admin review queue. Enforcing these pre-submission checks ensures that administrators only receive actionable, complete YPOP validation requests.

---

## 5. Standard Mandatory Verification Performed

1. **`npm run build`**:
   - Completed in 26.69s with **0 errors** (built production bundle successfully).
2. **`npx tsc --noEmit`**:
   - Completed with **0 TypeScript errors**.
3. **`npm test`**:
   - Completed with **24 test files** and **102 tests passing**.
4. **Regression Checks Completed**:
   - Verified YPOP workflow integrity, UI entry cards, proof file upload/attachments, and non-YPOP features remain 100% functional.
5. **Git Branch**: Executed on `feature/ypop-validation`.
