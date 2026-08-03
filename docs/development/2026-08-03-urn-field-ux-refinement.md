# Sign Up URN Registration UX Refinement Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Authentication Module — Sign Up URN Registration Flow & Field Styling
- **Primary Objective**: Streamline Sign Up Step 1 UX by preserving approved help icon (`?`) popover behavior, omitting the URN input textbox for new organization registrations while preserving auto-generation, and ensuring existing organization URN inputs match Organization Name input styling identically without custom wrapper overrides.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/authentication`

---

## 1. Sign Up Step 1 URN UX Refinement

- **New Organizations (`isExistingOrganization = false`)**:
  - The URN text input is omitted entirely from Step 1.
  - An informational guidance box is rendered below the URN label with contextual help:
    > *A Unique Registration Number (URN) will be automatically generated after your organization is successfully registered.*
  - The help (`?`) icon popover is preserved beside the URN section label.
- **Existing Organizations (`isExistingOrganization = true`)**:
  - The URN label features the help (`?`) icon beside `Unique Registration Number (URN) *` that opens the contextual guidance Popover on click/tap.
  - The URN input is rendered using the standard `<div className="space-y-1.5 pt-3">` layout structure without wrapper hacks.
  - Renders 100% identically to the Organization Name input:
    - Same height, border thickness, border radius, blue focus ring, outline, spacing, shadow, and focus behavior.
  - No helper text is rendered below the input box (only red validation messages when invalid).

---

## 2. Organization Profile Read-Only Field Styling

- In `UserPortal.tsx` and `PwaProfilePages.tsx`, read-only URN fields display the auto-generated URN or fallback text (`Auto-generated upon registration`).
- Read-only visual styling remains identical to Organization Name and other non-editable fields.

---

## 3. Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/SignUp.tsx` | Sign Up Page | Preserved Help icon popover beside URN label and unified URN input styling with Organization Name input. |
| `src/user/UserPortal.tsx` | Organization Profile | Updated URN read-only field value to display auto-generated URN with fallback text. |
| `src/user/pwa/profile/PwaProfilePages.tsx` | PWA Profile Editor | Standardized URN field read-only rendering. |
| `docs/development/2026-08-03-urn-field-ux-refinement.md` | Engineering Docs | Added documentation for URN UX refinement and regression prevention. |

---

## 4. Regression Investigation & Prevention Analysis

### Regression Description
- When switching between feature branches (`feature/organization-portal`, `chore/legacy-code-audit`), the URN field rendering in `SignUp.tsx` on unmerged branches reverted to the old pre-approved layout (missing help `?` icon beside the label, static helper text below the textbox, and outer wrapper clipping the focus ring).

### Root Cause
- **Unmerged Feature Branches**: The changes made on `feature/authentication` were contained within `feature/authentication` and had not been merged into `main` before `feature/organization-portal` was created from `main`.
- **Conditional Layout Overwrites**: Previous refactoring of the Registration Type section used outer wrapper divs (`p-1 -m-1`, `max-h-96`) that altered focus ring bounding boxes.

### Resolution & Prevention Measures
- **Resolution**:
  - Preserved the `HelpCircle` (`?`) popover icon beside the `Unique Registration Number (URN)` label across both checked and unchecked states.
  - Structured the URN input box using the exact same `<div className="space-y-1.5 pt-3">` layout and `<Input>` primitive as the Organization Name field.
  - Merged and synced `feature/authentication` fixes across all active branches.
- **Prevention Rules Going Forward**:
  1. Fix only the requested feature.
  2. Preserve all previously approved UI fixes.
  3. Do not modify unrelated pages or components.
  4. Perform pre-commit checks on focus rings, help icons, and input styling equality before declaring tasks complete.

---

## 5. Verification Performed

- **TypeScript Type Check**: `npx tsc --noEmit` passed with 0 errors.
- **Unit Test Suite**: `npm test` passed with 24 test files and 99 tests passing.
- **Git Branch Workflow**: Executed on `feature/authentication`.
