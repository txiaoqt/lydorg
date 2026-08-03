# Organization Profile Module Improvements Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Organization Profile Module (`UserPortal.tsx`, `PwaProfilePages.tsx`, `SignUp.tsx`, `organization-profile-domain.ts`, `urn-registration.ts`)
- **Primary Objectives**:
  1. Visual distinction between editable and read-only/disabled fields across desktop and mobile profile forms.
  2. Strict Facebook page/profile URL validation.
  3. Automatic URN generation (`PCYDO-YYYY-XXXX`) for new organizations with read-only state and explanatory helper text.
  4. Person name validation for Representative and Adviser fields (restricting numeric and inappropriate special characters).
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/organization-profile`

---

## 1. Summary of Improvements & Implementation

### 1. Editable vs Non-Editable Field Styling
- **Global CSS Layer (`src/index.css`)**:
  Added explicit base rules for read-only text inputs, textareas, and disabled select dropdowns:
  ```css
  input[readonly],
  textarea[readonly],
  select[disabled],
  input[disabled],
  textarea[disabled] {
    background-color: hsl(var(--muted) / 0.7) !important;
    color: hsl(var(--muted-foreground)) !important;
    cursor: not-allowed !important;
    border-color: hsl(var(--border) / 0.9) !important;
  }
  ```
- **Behavior**:
  - Read-only fields (e.g. Organization Name, Email, Contact Number, District, Barangay, Organization Type, URN) render with a distinct light gray background (`bg-muted/70`), muted text, and a `not-allowed` cursor.
  - Editable fields (Representative, Adviser, Address, Facebook Page, Major/Sub Classifications, Advocacies) maintain standard input backgrounds (`bg-background`) with active focus transitions.

---

### 2. Facebook Field Validation
- **Domain Utility (`src/lib/organization-profile-domain.ts`)**:
  Implemented `isValidFacebookUrl(url: string)`:
  - Accepts valid Facebook profile or page URLs starting with `https://facebook.com`, `https://www.facebook.com`, `https://m.facebook.com`, `https://web.facebook.com`, or `https://fb.com`.
  - Rejects plain text, random strings, non-Facebook domain URLs, and invalid protocols.
  - Allows empty strings for optional entry.
- **Form Integration (`UserPortal.tsx`, `PwaProfilePages.tsx`)**:
  Intercepts save attempts and displays a user-friendly toast message:
  `"Please enter a valid Facebook profile or page URL starting with https://facebook.com, https://www.facebook.com, or https://fb.com."`

---

### 3. Automatic URN Generation
- **URN Generation Utility (`src/lib/urn-registration.ts`)**:
  Implemented `generateUniqueUrn()`:
  - Formats unique URNs matching pattern `PCYDO-YYYY-XXXX` (e.g. `PCYDO-2026-7A9B`).
- **Sign Up Workflow (`src/pages/SignUp.tsx`)**:
  - Unchecking "We already have a Unique Registration Number (URN)" displays helper text:
    `"A Unique Registration Number will be automatically generated after your organization is successfully created."`
  - On account creation for new organizations, `generateUniqueUrn()` is generated once and saved into `organizationIdentifierNumber`.
- **Database Migration (`supabase/20260803_auto_generate_urn.sql`)**:
  Created a SQL migration defining `public.generate_unique_urn()` and a `BEFORE INSERT` trigger `trigger_auto_generate_urn` on `public.organization_profiles` as a database-level fallback.

---

### 4. Representative & Adviser Name Validation
- **Domain Utility (`src/lib/organization-profile-domain.ts`)**:
  Implemented `isValidPersonName(name: string)`:
  - Rejects numbers, numeric strings, and inappropriate special characters.
  - Permits letters (`a-z`, `A-Z`), spaces, hyphens (`-`), apostrophes (`'`), and periods (`.`).
- **Form Integration (`UserPortal.tsx`, `PwaProfilePages.tsx`)**:
  Intercepts save attempts and displays user-friendly toast alerts for invalid representative or adviser names.

---

## 2. Database Changes & Supabase Migration

- **Migration File**: [supabase/20260803_auto_generate_urn.sql](file:///c:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/supabase/20260803_auto_generate_urn.sql)
- **Functions & Triggers**:
  - `public.generate_unique_urn()`: PL/pgSQL function returning a unique `PCYDO-YYYY-XXXX` URN string.
  - `public.handle_organization_profile_urn_auto_gen()`: `BEFORE INSERT` trigger function populating missing URN fields for new organization profiles.

---

## 3. Files Modified

| File Path | Summary of Changes |
| :--- | :--- |
| `src/index.css` | Added `@layer base` CSS rule for read-only inputs and disabled select dropdowns (`bg-muted/70`, `text-muted-foreground`, `cursor-not-allowed`). |
| `src/lib/organization-profile-domain.ts` | Added `personNamePattern`, `isValidPersonName`, and `isValidFacebookUrl` validation utilities. |
| `src/lib/organization-profile-domain.test.ts` | Added unit test suite covering Facebook URL and Person Name validation edge cases (6 tests). |
| `src/lib/urn-registration.ts` | Added `generateUniqueUrn()` function producing `PCYDO-YYYY-XXXX` format URNs. |
| `src/lib/urn-registration.test.ts` | Added unit test verifying `generateUniqueUrn()` produces valid URNs. |
| `src/pages/SignUp.tsx` | Added helper text for auto URN generation on new orgs, and auto-populated URN on submission. |
| `src/user/UserPortal.tsx` | Added field validation calls for Facebook URL and representative/adviser names, and auto URN fallback. |
| `src/user/pwa/profile/PwaProfilePages.tsx` | Added field validation calls for PWA profile editor. |
| `supabase/20260803_auto_generate_urn.sql` | Created database migration for auto URN generation trigger. |

---

## 4. Verification Performed

- **TypeScript Type Check**: `npx tsc --noEmit` passed with 0 errors.
- **Unit Test Suite**: `npm test` passed with 24 test files and 99 tests passing.
- **Production Build**: `npm run build` completed in 32.22s with 0 errors.
- **Git Branch**: `feature/organization-profile`.
