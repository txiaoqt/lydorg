# Authentication Password Validation, Eye Toggle UI & Sign Up Verification Refinement Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Authentication Module (Sign Up `SignUp.tsx`, Verification `VerifyEmail.tsx`, Reset Password `ResetPassword.tsx`, Shared Utility `password-policy.ts`)
- **Primary Objective**: Refine the password visibility toggle (eye icon) background, enforce 5-criterion password validation, establish a consistent vertical spacing hierarchy for the URN field aligned with Organization Name, and correct six-digit verification code error message handling to accurately distinguish incorrect codes from expired codes.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/authentication`

---

## 1. Sign Up URN Field Vertical Spacing Hierarchy (`SignUp.tsx`)

### Problem & Analysis
The Unique Registration Number (URN) section in Step 1 of Sign Up previously appeared visually misaligned compared to the Organization Name field due to inconsistent vertical spacing. Placing multiple separate `<p>` tags with stacked `space-y-1.5` gaps below the input created uncoordinated vertical white space, and an error message inserted above the helper text squeezed the field elements out of balance.

### Layout & Hierarchy Refinement
1. **Consistent Label-to-Input Gap**: `RequiredLabel` -> `Input` connected with standard `space-y-1.5` field spacing, matching Organization Name and all other form inputs.
2. **Unified Helper Text Block**: Streamlined helper text into a single, cohesive paragraph (`text-xs text-muted-foreground leading-relaxed pt-0.5`) directly below the input/error message. All original guidance text ("Enter the URN exactly as it appears...", "LYDO / PCYDO will verify this number...", "You will not need to submit the six initial registration documents once the URN is confirmed.") is preserved.
3. **Smooth Container Expansion**: Configured reveal container with `max-h-96 opacity-100 mt-4` to ensure unclipped expansion and clean vertical separation from the checkbox above.

---

## 2. Six-Digit Verification Code Error Handling (`VerifyEmail.tsx`)

### Problem
When an incorrect 6-digit verification code was entered, Supabase Auth returned the error string `"Token has expired or is invalid"`. Previously, regex `/expired/i.test(verifyError.message)` matched `"expired"`, incorrectly telling users that their code had expired when it was simply mistyped.

### Solution
Differentiated error conditions in `VerifyEmail.tsx`:
- **Expired Code**: Only triggers when the error message explicitly contains `"expired"` without `"invalid"` (e.g., `"Token has expired"` or `"Otp has expired"`):  
  👉 `"That verification code has expired. Please request a new code."`
- **Incorrect/Invalid Code**: Triggers when the code is mistyped or invalid (including Supabase's default `"Token has expired or is invalid"` or `"Invalid OTP"`):  
  👉 `"Incorrect verification code. Please check the code and try again."`

```ts
if (verifyError) {
  const lower = verifyError.message.toLowerCase();
  const isExpired = lower.includes("expired") && !lower.includes("invalid");
  setError(
    isExpired
      ? "That verification code has expired. Please request a new code."
      : "Incorrect verification code. Please check the code and try again.",
  );
  return;
}
```

---

## 3. UI Refinement: Password Visibility (Eye) Toggle Background Removal

The eye toggle button eliminates filled backgrounds across all interaction states:

### Interaction States
- **Normal**: `bg-transparent text-muted-foreground`
- **Hover**: `hover:bg-transparent hover:text-foreground` (Darkens icon stroke color only; no grey background box)
- **Active / Pressed**: `active:bg-transparent active:text-foreground` (No filled background on click/tap)
- **Focus**: `focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` (Preserves keyboard focus ring without a background fill)

---

## 4. Unified Password Policy & Real-Time Validation (`password-policy.ts`)

Enforces 5 mandatory complexity rules before password submission:

1. **Length**: Must be between 8 and 16 characters (`8 <= length <= 16`).
2. **Uppercase Letter**: Must contain at least one uppercase character (`/[A-Z]/`).
3. **Lowercase Letter**: Must contain at least one lowercase character (`/[a-z]/`).
4. **Numeric Digit**: Must contain at least one number (`/[0-9]/`).
5. **Special Character**: Must contain at least one special symbol (`/[!@#$%^&*()\-_+=\[\]{}|;:'",.<>?/\\~]/`).

---

## Files Modified

| File Path | Component | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/SignUp.tsx` | `SignUp` | Unified URN field vertical spacing hierarchy with Organization Name; integrated `password-policy` checks, `PasswordCriteriaChecklist`, confirm match feedback, paste prevention, and eye button styling. |
| `src/pages/VerifyEmail.tsx` | `VerifyEmail` | Updated OTP error handling to accurately map incorrect vs expired verification code error messages. |
| `src/pages/ResetPassword.tsx` | `ResetPassword` | Configured transparent eye toggle styling (`bg-transparent hover:bg-transparent active:bg-transparent hover:text-foreground`). |
| `src/lib/password-policy.ts` | Shared Utility | Centralized `validatePasswordCriteria` and `isPasswordValid` functions. |
| `src/lib/password-policy.test.ts` | Test Suite | Added 7 unit tests verifying all 5 password rules. |

---

## Verification Performed

- **URN Spacing & Hierarchy**: Verified URN field vertical spacing aligns consistently with Organization Name.
- **OTP Verification Error Handling**: Verified mistyped codes display `"Incorrect verification code. Please check the code and try again."` while expired codes display `"That verification code has expired. Please request a new code."`
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed in 52.88s with 0 errors.
- **Automated Tests**: `npm test` passed with `24/24 test files` and `99/99 unit tests`.
- **Git Branch**: `feature/authentication`.
