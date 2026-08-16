# Fix Email Verification and Pending Registration Regression

## Overview
Scope the pending verification check specifically to the organization registration resume workflow, preventing it from leaking into the Forgot Password and Sign In authentication flows or misclassifying existing accounts as unconfirmed registrations.

---

## Root Cause Analysis

1. **Broad and Unscoped Verification Check in `email-validation.ts`**:
   The previous update attempted to query `organization_profiles` and `user_profiles` before checking `is_signup_email_registered`. Due to Row Level Security (RLS) on profile tables for anonymous requests, profile lookups returned null, causing any account existing in Supabase Auth to be classified as `"unconfirmed"`.
2. **Leakage into Forgot Password Flow in `ResetPassword.tsx`**:
   `ResetPassword.tsx` was calling `checkSignupEmail(normalizedEmail)` and intercepting the reset process if the result was not `"registered"`, displaying `"This account has not finished email verification yet. Please complete verification first."` instead of invoking `supabase.auth.resetPasswordForEmail`.
3. **Session & Context Scoping**:
   An unverified Auth user in Supabase by itself does not mean a user is resuming an organization registration. An interrupted registration is identified when the current registration session/context holds a pending registration for that email (via `ytrace-pending-signup-email` in session storage or explicit registration context).

---

## User Review Required

> [!IMPORTANT]
> **No Breaking Changes**: All existing valid workflows (normal registration, Step 3 OTP verification, Step 3 refresh with password field, resending OTP code, and Forgot Password recovery) are preserved.

---

## Proposed Changes

### Core Validation Layer

#### [MODIFY] [email-validation.ts](file:///c:/Users/1nata/.gemini/antigravity/scratch/lydorg/src/lib/email-validation.ts)
- Clean up `checkSignupEmail` to rely on the Supabase RPC `is_signup_email_registered` for checking whether an account exists.
- Export `PENDING_SIGNUP_EMAIL_KEY = "ytrace-pending-signup-email"` to keep session storage keys centralized.
- Accept optional `options?: { isResumingRegistration?: boolean }` so callers can explicitly pass resume context.
- Distinguish `"unconfirmed"` (pending verification) from `"registered"`:
  - If RPC returns `true` (email exists in Supabase Auth):
    - Check if the current browser registration session / options matches the email (`sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY) === normalizedEmail` or `options?.isResumingRegistration === true`).
    - If it matches: return `"unconfirmed"` (allows resuming registration and requesting a new code).
    - If it does not match: return `"registered"` (treated as an existing registered account: `"This email is already registered. Sign in instead."`).
  - If RPC returns `false`: return `"available"`.
  - If RPC fails: return `"error"`.

---

### Authentication & Recovery Pages

#### [MODIFY] [ResetPassword.tsx](file:///c:/Users/1nata/.gemini/antigravity/scratch/lydorg/src/pages/ResetPassword.tsx)
- Remove `checkSignupEmail` import and invocation from `requestReset`.
- Restore Forgot Password as an independent recovery flow:
  - Validate email format (`!normalizedEmail || !normalizedEmail.includes("@")`).
  - Directly invoke `supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: getPasswordResetUrl() })`.
  - Handle Supabase's actual response and errors without displaying the registration-specific `"pending verification"` message or redirecting into registration.

#### [MODIFY] [SignUp.tsx](file:///c:/Users/1nata/.gemini/antigravity/scratch/lydorg/src/pages/SignUp.tsx)
- Use the centralized `PENDING_SIGNUP_EMAIL_KEY` from `@/lib/email-validation`.
- Maintain the pending-verification banner and submission enablement (`emailAvailability !== "registered" && emailAvailability !== "checking"`) specifically for the interrupted registration resume flow.

---

### Unit & Integration Tests

#### [MODIFY] [email-validation.test.ts](file:///c:/Users/1nata/.gemini/antigravity/scratch/lydorg/src/lib/email-validation.test.ts)
- Update and add comprehensive unit test cases:
  1. Empty email returns `"available"`.
  2. Non-existent email returns `"available"`.
  3. Existing auth user with matching pending session storage returns `"unconfirmed"`.
  4. Existing auth user with explicit `isResumingRegistration: true` returns `"unconfirmed"`.
  5. Existing auth user without pending session storage returns `"registered"`.
  6. Existing auth user with non-matching pending session email returns `"registered"`.
  7. RPC error returns `"error"`.

---

## Verification Plan

### Automated Tests
- Run full test suite: `npm test`
- Run TypeScript compiler check: `npx tsc --noEmit`
- Run production build: `npm run build`

### Manual & Test Case Verification Matrix
1. **Case A (Registration interrupted before OTP)**:
   - User signs up, reaches Step 3, goes Back.
   - Re-entering the pending email correctly identifies `"unconfirmed"` status and allows requesting a new verification code.
2. **Case B (Existing verified account)**:
   - Sign in with verified account executes normally via `signInWithPassword`.
   - Entering verified email on Sign Up without active pending session displays `"This email is already registered. Sign in instead."`
3. **Case C & D (Forgot Password with unverified / verified account)**:
   - Submitting on Forgot Password triggers `resetPasswordForEmail` directly without showing registration-specific pending verification error.
4. **Case E (Forgot Password invalid email)**:
   - Form validation retains format checks.
5. **Case F (Step 3 Refresh)**:
   - Refreshing on `/verify-email` continues to show password field and TC039 tests pass.
6. **Case G (Normal Registration)**:
   - Brand new email displays `"Email is available."` and creates account.
