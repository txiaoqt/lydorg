# Authentication Password Validation, Eye Toggle UI & Sign Up URN Focus Ring Fix Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Authentication Module (Sign Up `SignUp.tsx`, Verification `VerifyEmail.tsx`, Reset Password `ResetPassword.tsx`, Shared Utility `password-policy.ts`)
- **Primary Objective**: Investigate and resolve URN input focus ring clipping by replacing permanent `overflow-hidden` with `overflow-visible` on the expanded reveal container and adding a padding buffer, replace permanent URN helper text with an interactive `HelpCircle` contextual popover, refine password visibility toggle icon backgrounds, enforce 5-criterion password validation, and correct six-digit verification code error message handling.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/authentication`

---

## 1. URN Input Focus Ring Clipping Root Cause Analysis & Fix (`SignUp.tsx`)

### Root Cause Analysis
Both Organization Name and URN fields consume the exact same reusable `<Input>` component. However, the URN field sits inside a smooth reveal container used to toggle the URN field's visibility when the "We already have a Unique Registration Number (URN)" checkbox is checked.

The container was defined as:
```tsx
<div className="overflow-hidden transition-all duration-300 ease-in-out max-h-96 opacity-100 mt-4">
```

Because `overflow-hidden` remained active on the container even when fully expanded, the 2px/3px focus ring (`ring-2 ring-primary ring-offset-background`) extending beyond the outer border box of the `<Input>` was **hard-clipped by the container bounding box**. In contrast, Organization Name is not inside an `overflow-hidden` container, allowing its focus ring to render completely unclipped.

### Technical Implementation
1. **Conditional Overflow**: Configured the reveal container to apply `overflow-visible` when `isExistingOrganization` is `true` (fully expanded) and `overflow-hidden` only when `isExistingOrganization` is `false` (collapsed state).
2. **Padding Buffer**: Added `p-1 -m-1` (4px inner padding buffer with negative margin compensation) to the inner field wrapper so the focus ring has 4px of rendering clearance on all sides during transitions.

```tsx
<div
  className={`transition-all duration-300 ease-in-out ${
    isExistingOrganization
      ? "max-h-96 opacity-100 mt-4 overflow-visible"
      : "max-h-0 opacity-0 overflow-hidden"
  }`}
>
  <div className="space-y-1.5 p-1 -m-1">
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
    <Input
      id="organizationIdentifierNumber"
      placeholder="PCYDO-XXXX-XXXX"
      value={organizationIdentifierNumber}
      onChange={(e) => setOrganizationIdentifierNumber(e.target.value)}
      onBlur={() => touch("identifier")}
      required={isExistingOrganization}
      tabIndex={isExistingOrganization ? 0 : -1}
    />
    {touched.has("identifier") && isExistingOrganization && !isIdentifierValid && (
      <p id="urn-error" className="text-xs text-destructive">{urnError}</p>
    )}
  </div>
</div>
```

---

## 2. Contextual Help Popover for Unique Registration Number (URN) Field (`SignUp.tsx`)

Replaced permanent helper text beneath the URN input with a `HelpCircle` icon popover (`@/components/ui/popover`) beside the URN label.

---

## 3. Six-Digit Verification Code Error Handling (`VerifyEmail.tsx`)

Differentiated error conditions so mistyped codes display `"Incorrect verification code. Please check the code and try again."` while expired codes display `"That verification code has expired. Please request a new code."`

---

## 4. UI Refinement: Password Visibility (Eye) Toggle Background Removal

The eye toggle button eliminates filled backgrounds across all interaction states (`bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent`).

---

## 5. Unified Password Policy & Real-Time Validation (`password-policy.ts`)

Enforces 5 mandatory complexity rules before password submission.

---

## Files Modified

| File Path | Component | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/SignUp.tsx` | `SignUp` | Set `overflow-visible` on expanded URN reveal container and added `p-1 -m-1` buffer to prevent focus ring clipping; replaced permanent URN helper text with interactive `HelpCircle` `Popover` beside the URN label; integrated shared `password-policy` checks, `PasswordCriteriaChecklist`, confirm match feedback, paste prevention, and eye button styling. |
| `src/pages/VerifyEmail.tsx` | `VerifyEmail` | Updated OTP error handling to accurately map incorrect vs expired verification code error messages. |
| `src/pages/ResetPassword.tsx` | `ResetPassword` | Configured transparent eye toggle styling (`bg-transparent hover:bg-transparent active:bg-transparent hover:text-foreground`). |
| `src/lib/password-policy.ts` | Shared Utility | Centralized `validatePasswordCriteria` and `isPasswordValid` functions. |
| `src/lib/password-policy.test.ts` | Test Suite | Added 7 unit tests verifying all 5 password rules. |

---

## Verification Performed

- **Focus Ring Rendering**: Verified URN input focus ring renders 100% complete, unclipped, and visually identical to Organization Name input when focused.
- **Reveal Animation**: Verified URN reveal container smoothly expands and collapses without layout shift.
- **Popover Interaction**: Verified clicking/tapping the `HelpCircle` icon toggles the popover, click-outside dismisses it, and pressing `Escape` closes it.
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed in 44.82s with 0 errors.
- **Automated Tests**: `npm test` passed with `24/24 test files` and `99/99 unit tests`.
- **Git Branch Workflow**: Executed on `feature/authentication`.
