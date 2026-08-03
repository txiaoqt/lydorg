# Authentication Password Validation, Eye Toggle UI & Sign Up URN Help Popover Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Authentication Module (Sign Up `SignUp.tsx`, Verification `VerifyEmail.tsx`, Reset Password `ResetPassword.tsx`, Shared Utility `password-policy.ts`)
- **Primary Objective**: Replace permanently visible helper text beneath the URN field with a contextual help icon (`HelpCircle` / `?`) beside the URN label, refine password visibility toggle icon backgrounds, enforce 5-criterion password validation, and correct six-digit verification code error message handling to accurately distinguish incorrect codes from expired codes.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/auth-validation-urn-help`

---

## 1. Contextual Help Popover for Unique Registration Number (URN) Field (`SignUp.tsx`)

### UX Objective & Rationale
Previously, the URN field displayed two paragraphs of guidance text permanently below the input. When a validation error was triggered, rendering both the error message and the long helper text created excessive vertical height and uncoordinated spacing compared to the Organization Name field.

Moving the guidance into an accessible, interactive contextual help popover beside the URN label delivers a clean, modern form layout while preserving 100% of the guidance information for users who request it.

### Implementation Details
- **Label**: Remains `Unique Registration Number (URN) *` (with red required asterisk).
- **Contextual Help Icon**: Placed a small, muted `HelpCircle` icon (`h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer`) directly beside the URN label inside `<div className="flex items-center gap-1.5">`.
- **Interactive Popover (`@/components/ui/popover`)**:
  - Clicking or tapping the icon triggers a Radix-powered popover containing the complete guidance:
    - `"Enter the URN exactly as it appears in your existing LYDO / PCYDO registration record."`
    - `"LYDO / PCYDO will verify this number against its official registration record so you will not need to submit the six initial registration documents once the URN is confirmed."`
  - **Dismissal & Ergonomics**: Automatically closes on click-outside and Escape key press.
  - **Accessibility**: Uses focusable `<button>` with `asChild`, `aria-label="URN help guidance"`, and full keyboard navigation support.
- **Validation Message Placement**: Beneath the input, ONLY validation error messages (`<p id="urn-error" className="text-xs text-destructive">{urnError}</p>`) are rendered when active.

```tsx
<div className="flex items-center gap-1.5">
  <RequiredLabel htmlFor="organizationIdentifierNumber">Unique Registration Number (URN)</RequiredLabel>
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-0.5"
        aria-label="URN help guidance"
      >
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-80 p-3.5 text-xs space-y-2">
      <div className="font-semibold text-foreground flex items-center gap-1.5">
        <HelpCircle className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        About Unique Registration Number (URN)
      </div>
      <p className="leading-relaxed text-muted-foreground">
        Enter the URN exactly as it appears in your existing LYDO / PCYDO registration record.
      </p>
      <p className="leading-relaxed text-muted-foreground">
        LYDO / PCYDO will verify this number against its official registration record so you will not need to submit the six initial registration documents once the URN is confirmed.
      </p>
    </PopoverContent>
  </Popover>
</div>
```

---

## 2. Six-Digit Verification Code Error Handling (`VerifyEmail.tsx`)

### Problem & Solution
Differentiated error conditions in `VerifyEmail.tsx` so mistyped codes display `"Incorrect verification code. Please check the code and try again."` while expired codes display `"That verification code has expired. Please request a new code."`

---

## 3. UI Refinement: Password Visibility (Eye) Toggle Background Removal

The eye toggle button eliminates filled backgrounds across all interaction states (`bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent`).

---

## 4. Unified Password Policy & Real-Time Validation (`password-policy.ts`)

Enforces 5 mandatory complexity rules before password submission.

---

## Files Modified

| File Path | Component | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/SignUp.tsx` | `SignUp` | Replaced permanent URN helper text with interactive `HelpCircle` `Popover` beside the URN label; integrated shared `password-policy` checks, `PasswordCriteriaChecklist`, confirm match feedback, paste prevention, and eye button styling. |
| `src/pages/VerifyEmail.tsx` | `VerifyEmail` | Updated OTP error handling to accurately map incorrect vs expired verification code error messages. |
| `src/pages/ResetPassword.tsx` | `ResetPassword` | Configured transparent eye toggle styling (`bg-transparent hover:bg-transparent active:bg-transparent hover:text-foreground`). |
| `src/lib/password-policy.ts` | Shared Utility | Centralized `validatePasswordCriteria` and `isPasswordValid` functions. |
| `src/lib/password-policy.test.ts` | Test Suite | Added 7 unit tests verifying all 5 password rules. |

---

## Verification Performed

- **Popover Interaction**: Verified clicking/tapping the `HelpCircle` icon opens the URN guidance popover and closes cleanly on click-outside or pressing Escape.
- **Keyboard & Screen Reader Access**: Verified focus management on popover trigger button and proper `aria-label` accessibility.
- **Clean Form Hierarchy**: Verified URN field layout cleanly matches Organization Name without permanent helper text cluttering the input area.
- **Validation Message**: Verified validation error message (`"Please enter a valid Unique Registration Number (URN) in the format PCYDO-XXXX-XXXX."`) renders cleanly below the input.
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed in 53.64s with 0 errors.
- **Automated Tests**: `npm test` passed with `24/24 test files` and `99/99 unit tests`.
- **Git Branch**: `feature/auth-validation-urn-help`.
