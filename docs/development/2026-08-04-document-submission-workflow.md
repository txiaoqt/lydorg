# Document Submission Workflow & UI Hardening Engineering Documentation

## Overview

- **Start Time**: August 4, 2026 11:22 AM
- **Completion Time**: August 4, 2026 11:29 AM
- **Feature / Component**: Document Submission & Liquidation Attachment Workflows (`src/user/UserPortal.tsx`, `src/user/pwa/documents/PwaDocumentPages.tsx`, `src/user/pwa/documents/documentFileValidation.ts`, `src/lib/lydo-connect-supabase.ts`, `supabase/20260804_harden_document_submission_workflow.sql`)
- **Primary Objective**: Continue and finalize UI fixes, PDF-only validation, submission status security, note section icon updates, long filename modal scroll prevention, and database boundary hardening for the Document Submission module.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/document-submission`

---

## 1. Accomplishments & Verification Summary

### 1. Submit Note UI & Icon
- **Fix Implemented**: Replaced currency/money icon (`Receipt`) in the Submit Note dropdown menu and mobile actions with `PenSquare` in `UserPortal.tsx`. Form textareas and submission action controls render cleanly.
- **Submit Note Button State**: Ensured Submit Note button visibility depends on workflow state (`liquidationSubmittableStatuses.has(report.status)`), preventing the button from disappearing when file drafts are removed.

### 2. PDF-Only File Upload Validation
- **Client-Side Validation**: Updated `documentFileValidation.ts` so file picker `accept` string is strictly `.pdf,application/pdf`. Validated file extension and verified magic bytes `%PDF-` header signature on every upload. Non-PDF files are rejected with a clear error message: *"This document must be a PDF file."*
- **API & Server Validation**: Added `assertPdfUpload` helper in `src/lib/lydo-connect-supabase.ts` to validate MIME type and `.pdf` file extension before uploading storage objects.

### 3. Submission Workflow Hardening & Immutability
- **Draft State**: Organizations can upload, remove, replace files, and edit notes.
- **Submitted for Review State**: Once submitted (`under_admin_review`, `submitted`, `approved_green`), document mutation controls (upload, replace, delete buttons) are disabled in the UI.
- **Needs Revision State**: Re-enables uploading replacement PDF files and resubmitting for review.
- **Backend API & Security**: `removeOrganizationDocumentFromSupabase` and `submitDocumentSubmissionForReview` enforce workflow status checks, rejecting modification attempts if status is under review.

### 4. Database-Level Boundary Protection (SQL Migration)
- **New Migration**: Created `supabase/20260804_harden_document_submission_workflow.sql`.
- **Triggers Added**:
  - `document_submission_files_workflow_guard`: Prevents inserting, updating, or deleting document submission files when the parent submission is under admin review.
  - `document_submissions_workflow_guard`: Enforces status transitions and validates that at least one PDF exists before advancing to `under_admin_review`.
  - `liquidation_report_files_workflow_guard` & `liquidation_reports_workflow_guard`: Enforces identical file locking and PDF presence rules for liquidation reports.

### 5. Long Filename Modal Scroll Fix
- **Fix Implemented**: Added `overflow-x-hidden`, `break-words`, and `sm:truncate` to document viewer/editor dialogs in `UserPortal.tsx`. Long filenames wrap gracefully or truncate with ellipsis without creating horizontal scrollbars on fixed-width dialog modals.

### 6. Submit Onsite & Review Validation
- **Fix Implemented**: `submitDocumentSubmissionForReview` verifies that an attached PDF file exists before transitioning status to `under_admin_review`. Rejects submissions without an attached PDF with a clear error message: *"Attach a PDF document before submitting documents for review."*

---

## 2. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/user/pwa/documents/documentFileValidation.ts` | File Validation Utility | Enforced PDF-only file input accept restrictions, file extension checks, and `%PDF-` signature magic bytes check. |
| `src/lib/lydo-connect-supabase.ts` | Supabase API Services | Added submission status guards, PDF presence check in `submitDocumentSubmissionForReview`, and liquidation file deletion checks. |
| `src/user/UserPortal.tsx` | Desktop & Mobile User Portal | Replaced note icon with `PenSquare`, fixed long filename modal overflow (`overflow-x-hidden`, `break-words`), disabled file actions on submitted status. |
| `src/user/pwa/documents/PwaDocumentPages.tsx` | Mobile PWA Documents | Restricted input accept to `.pdf,application/pdf` and updated `submissionLocked` state checks. |
| `supabase/20260804_harden_document_submission_workflow.sql` | SQL Database Migration | Created database trigger functions enforcing document submission and liquidation file immutability at database boundary. |

---

## 3. Mandatory Standard Verification Performed

1. **`npm run build`**:
   - Completed in 27.60s with **0 errors** (built production bundle successfully).
2. **`npx tsc --noEmit`**:
   - Completed with **0 TypeScript errors**.
3. **`npm test`**:
   - Passed **25 test files** and **106 tests** with 0 failures.
4. **Git Branch & Push**:
   - Committed and pushed to `feature/document-submission` only. Not merged into `main`.
