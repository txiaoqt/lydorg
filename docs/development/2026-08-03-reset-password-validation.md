# Authentication Password Validation, Eye Toggle UI & Sign Up Verification Refinement Engineering Documentation

## Overview

- **Date**: August 3, 2026
- **Feature / Component**: Authentication Module (Sign Up `SignUp.tsx`, Verification `VerifyEmail.tsx`, Reset Password `ResetPassword.tsx`, Shared Utility `password-policy.ts`)
- **Primary Objective**: Refine the password visibility toggle (eye icon) background, enforce 5-criterion password validation, conditionally hide helper description text when URN validation error is rendered, establish consistent vertical spacing hierarchy for the URN field aligned with Organization Name, and correct six-digit verification code error message handling to accurately distinguish incorrect codes from expired codes.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `feature/auth-validation`

---

## 1. Sign Up URN Field Layout & Conditional Helper Text Rendering (`SignUp.tsx`)

### Problem & Requirement
Previously, when a URN validation error occurred, the URN container rendered BOTH the validation error message (`FormMessage` / `urnError`) and the helper description text at the same time below the input. This created excessive vertical height and caused the URN field layout to feel misaligned compared to Organization Name and other standard form fields.

### Solution & Expected Behavior
Implemented conditional rendering for the URN field's message container:
- **When Validation Error Exists**:
  - `Label`
  - `Input`
  - `Error Message` (`<p id="urn-error" className="text-xs text-destructive">{urnError}</p>`)
- **When NO Validation Error Exists**:
  - `Label`
  - `Input`
  - `Helper Description Text` (`<p id="urn-helper" className="text-xs text-muted-foreground leading-relaxed pt-0.5">...</p>`)

```tsx
{touched.has("identifier") && isExistingOrganization && !isIdentifierValid ? (
  <p id="urn-error" className="text-xs text-destructive">{urnError}</p>
) : (
  <p id="urn-helper" className="text-xs text-muted-foreground leading-relaxed pt-0.5">
    Enter the URN exactly as it appears in your existing LYDO / PCYDO registration record. LYDO / PCYDO will verify this number against its official registration record so you will not need to submit the six initial registration documents once the URN is confirmed.
  </p>
)}
```

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
| `src/pages/SignUp.tsx` | `SignUp` | Conditionally hide helper text when URN error is displayed; integrated `password-policy` checks, `PasswordCriteriaChecklist`, confirm match feedback, paste prevention, and eye button styling. |
| `src/pages/VerifyEmail.tsx` | `VerifyEmail` | Updated OTP error handling to accurately map incorrect vs expired verification code error messages. |
| `src/pages/ResetPassword.tsx` | `ResetPassword` | Configured transparent eye toggle styling (`bg-transparent hover:bg-transparent active:bg-transparent hover:text-foreground`). |
| `src/lib/password-policy.ts` | Shared Utility | Centralized `validatePasswordCriteria` and `isPasswordValid` functions. |
| `src/lib/password-policy.test.ts` | Test Suite | Added 7 unit tests verifying all 5 password rules. |

---

## Verification Performed

- **Conditional Rendering**: Verified helper text is hidden when URN validation error is active, matching Organization Name layout.
- **OTP Error Handling**: Verified mistyped codes display `"Incorrect verification code. Please check the code and try again."` while expired codes display `"That verification code has expired. Please request a new code."`
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed in 64.08s with 0 errors.
- **Automated Tests**: `npm test` passed with `24/24 test files` and `99/99 unit tests`.
- **Git Branch**: `feature/auth-validation` (Not pushed to remote as instructed).
