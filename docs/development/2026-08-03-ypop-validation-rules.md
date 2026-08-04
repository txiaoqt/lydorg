# YPOP Validation Request Eligibility & Rules Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: YPOP Module — Validation Request Submission Rules & PPA Edit Modal Attachment Integration (`ypop-event-eligibility.ts`, `UserPortal.tsx`, `PwaYpopWorkspace.tsx`)
- **Primary Objective**:
  1. Block YPOP validation request submissions when an organization has no logged City-Led Activities or is missing required supporting proof documents.
  2. Integrate supporting document management directly inside the Edit Organization-Initiated Activity (PPA) modal for a unified editing experience.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/ypop-ppa-ux`

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

## 2. PPA Edit Modal Document Attachment UX Integration

### Expected UX & Flow
- **Create Activity**: User enters activity details (Name, Venue, Date, Narrative Report) and saves the draft.
- **Edit Activity**: User can update activity details AND upload, view, or remove supporting documents directly inside the Edit Organization-Initiated Activity modal.

### Implementation Details
- In `src/user/UserPortal.tsx`, integrated a `Supporting Documents & Proof Files` section into the Edit PPA Dialog (`ypopOrgActivityModalOpen` when `editingYpopOrgActivityId` is active).
- **Embedded File List**: Renders attached PPA files (`ypopOrgActivityFilesByActivityId`) with direct `View` links and `Remove` trash buttons (when PPA status is `draft` or `needs_revision`).
- **Embedded File Upload**: Provides an inline `Attach File` button calling `promptUploadYpopOrgActivityFile(editingYpopOrgActivityId)` with a loading state while files upload.
- **Visual Design System**: Uses standard Y-TRACE Dialog layout tokens, border dividers (`border-t border-border/70`), subtle list items (`bg-muted/30`), and responsive scrolling (`max-h-[90vh] overflow-y-auto`).

---

## 3. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/lib/ypop-event-eligibility.ts` | Domain Utility | Added `validateYpopSubmissionEligibility` function and `YpopSubmissionEligibility` type. |
| `src/lib/ypop-event-eligibility.test.ts` | Unit Tests | Added unit test suite for YPOP validation request submission eligibility edge cases (6 tests). |
| `src/user/UserPortal.tsx` | Organization Portal | Integrated `validateYpopSubmissionEligibility` into `handleSubmitYpop` and `renderEntryCard`, and embedded supporting document upload/manage section inside Edit PPA Modal. |
| `src/user/pwa/ypop/PwaYpopWorkspace.tsx` | PWA YPOP Workspace | Integrated `validateYpopSubmissionEligibility` into `submitEntry` and `submissionBlockReason`. |
| `docs/development/2026-08-03-ypop-validation-rules.md` | Engineering Docs | Added documentation for YPOP validation request submission rules and PPA edit modal UX integration. |

---

## 4. Rationale

Previously, document attachment was separate from editing PPA activity details. Moving file management inside the Edit modal consolidates all PPA maintenance into a single editing experience, eliminating unnecessary screen transitions while preserving existing upload handlers, file permissions, and storage schemas.

---

## 5. Standard Mandatory Verification Performed

1. **`npm run build`**:
   - Completed in 26.96s with **0 errors** (built production bundle successfully).
2. **`npx tsc --noEmit`**:
   - Completed with **0 TypeScript errors**.
3. **`npm test`**:
   - Completed with **24 test files** and **102 tests passing**.
4. **Regression Checks Completed**:
   - Verified PPA creation, draft saving, file attachment, file deletion, and submission workflows remain 100% functional.
5. **Git Branch**: Executed on `feature/ypop-ppa-ux`.
