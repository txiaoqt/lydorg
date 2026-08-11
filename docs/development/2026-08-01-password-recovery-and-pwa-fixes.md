# Password Recovery & Authentication Stability Improvements

## Table of Contents
- [Overview](#overview)
- [Session Information](#session-information)
- [Timeline](#timeline)
- [Issue 1: Password Reset Redirected to localhost](#issue-1-password-reset-redirected-to-localhost)
- [Issue 2: Added Dedicated Password Reset Redirect URL](#issue-2-added-dedicated-password-reset-redirect-url)
- [Issue 3: Recovery Session Treated as Normal Login](#issue-3-recovery-session-treated-as-normal-login)
- [Issue 4: Recovery Session Guard](#issue-4-recovery-session-guard)
- [Issue 5: PWA Redirect Bug](#issue-5-pwa-redirect-bug)
- [Issue 6: Back Button White Screen](#issue-6-back-button-white-screen)
- [Issue 7: Infinite Redirect Loop](#issue-7-infinite-redirect-loop)
- [Issue 8: detectSessionInUrl Race Condition](#issue-8-detectsessioninurl-race-condition)
- [Issue 9: Recovery Rendering Logic](#issue-9-recovery-rendering-logic)
- [Files Modified](#files-modified)
- [Environment Variables](#environment-variables)
- [Security Improvements](#security-improvements)
- [Regression Tests Performed](#regression-tests-performed)
- [Remaining Items](#remaining-items)
- [Lessons Learned](#lessons-learned)
- [Final Result](#final-result)
- [Appendix](#appendix)

---

## Overview

This document provides a comprehensive incident and engineering report for the authentication, password recovery, route guarding, and Progressive Web App (PWA) stability enhancements implemented on **August 1, 2026**.

The primary objective of this development session was to eliminate vulnerabilities, race conditions, routing loops, and platform-specific bugs in the password recovery workflow of **Y-TRACE (LYDO Connect Organization Focused)**.

Prior to these fixes, users attempting to reset their password experienced several critical failure modes:
1. Supabase password recovery emails generated links pointing to `localhost` instead of the deployed Vercel domain (`https://lydorg.vercel.app`).
2. Supabase `PASSWORD_RECOVERY` sessions were treated by the application as fully authenticated sessions, allowing users to access protected organization dashboards without changing their password.
3. Mobile users opening recovery emails in Android Gmail were mistakenly flagged as running an installed standalone PWA due to `android-app://` referrer headers, forcing them into the PWA flow (`/app` and `/app-start`).
4. Pressing the browser Back button during password recovery triggered a React Hook Order Violation (Minified React Error #300), resulting in a white screen crash.
5. Attempting to navigate away from the password reset page created an infinite redirect loop between `PolicyAgreementGate` and `/reset-password`.
6. A race condition caused by Supabase's `detectSessionInUrl: true` consumed URL tokens before page render, leaving users trapped on the "Forgot Password" form instead of presenting the "Create New Password" form.

All issues have been systematically analyzed, debugged, resolved, and validated against automated unit tests (`92/92 passed`) and production build checks (`0 errors`).

---

## Session Information

- **Project Name**: Y-TRACE (LYDO Connect Organization Focused)
- **Repository**: [https://github.com/txiaoqt/lydo-connect-org-focused](https://github.com/txiaoqt/lydo-connect-org-focused)
- **Development Date**: August 1, 2026
- **Session Start Time**: ~11:30 AM PHT (UTC+8)
- **Session End Time**: ~19:45 PM PHT (UTC+8)
- **Estimated Duration**: 8 Hours, 15 Minutes
- **Developer**: txiaoqt (Repository Maintainer)
- **Primary Branch**: `main`

---

## Timeline

The following chronological timeline details every major commit, issue addressed, investigation phase, and resolution during today's session:

| Timestamp (PHT) | Commit | Issue / Task | Summary of Investigation & Resolution |
| :--- | :--- | :--- | :--- |
| **11:52:41** | `bf18709` | Initial UI & Link Refinements | Updated office hours display, corrected navbar contacts label to "Contacts", and aligned forgot password links. |
| **12:25:51** | `7909491` | Redirect URL Resolution | Discovered `resetPasswordForEmail()` relied on fallback origins. Added structured `VITE_PASSWORD_RESET_URL` & `VITE_AUTH_REDIRECT_URL` evaluation. |
| **13:07:42** | `cce1a52` | Web-Only Password Recovery | Isolated password recovery from PWA routing markers (`?pwa=1`). Enforced strictly web-based password reset. |
| **14:28:04** | `a6de14e` | Recovery Session Isolation | Identified that Supabase `PASSWORD_RECOVERY` sessions created valid sessions. Introduced `isPasswordRecoverySession` state to block dashboard access. |
| **14:42:08** | `897db59` | Legal Agreement Display Order | Reordered UI tabs across sign-up, modals, and sitemaps to present "Privacy Policy" before "Terms of Service". |
| **14:47:35** | `0f1ce5e` | Storage Flag Persistence | Solved session flag loss when Supabase cleaned URL hashes (`replaceState`). Persisted `ytrace-recovery-session` in `sessionStorage`. |
| **18:50:10** | `952172f` | Auto-Redirect Route Guards | Updated `PwaEntryGate`, `AuthCallback`, `SignIn`, and `VerifyEmail` to check `isPasswordRecoverySession` before redirecting to `/app`. |
| **18:53:51** | `1436a6d` | Build Syntax Fix | Resolved syntax typo in `src/hooks/use-auth.tsx` caused by snippet insertion during rapid refactoring. |
| **19:04:12** | `4163587` | Auth Marker Cleanup | Fixed leftover `ytrace-pwa-auth-flow` session markers by explicitly calling `endPwaAuthFlow()` in `signOut()` and `ResetPassword`. |
| **19:11:29** | `943905e` | False PWA Detection Fix | Identified that Android Gmail links send `referrer = android-app://...`. Removed `android-app://` check from `useStandalonePwa.ts`. |
| **19:21:40** | `eafd402` | React Error #300 Fix | Diagnosed hook order violation in `PolicyAgreementGate`. Moved `usePolicyAgreement` above conditional early returns. |
| **19:28:56** | `9329823` | Form Mode Requirement | Removed unconditional `getSession()` fallback in `ResetPassword.tsx` that forced authenticated users straight to update mode. |
| **19:31:37** | `be9394d` | Infinite Loop Resolution | Replaced `<Link>` elements on `/reset-password` with `cancelRecovery()` handlers that call `signOut()` prior to navigating. |
| **19:44:44** | `c15d52c` | `detectSessionInUrl` Race Fix | Handled Supabase SDK consuming URL params before component mount by checking `isPasswordRecoverySession` context state. |

---

## Issue 1: Password Reset Redirected to localhost

### Symptoms
When a user requested a password reset, Supabase successfully delivered the recovery email. However, clicking the link inside the email navigated to `http://localhost:3000/reset-password` or `http://localhost:5173/reset-password` instead of the deployed Vercel application (`https://lydorg.vercel.app`).

### Root Cause
1. In `src/lib/auth-redirect.ts`, `getPasswordResetUrl()` checked `window.location.origin` at runtime. When invoked in local development or preview builds, it evaluated to `localhost`.
2. When triggered server-side or during static evaluation, `window.location.origin` was undefined, falling back to a relative path (`/reset-password`) which Supabase Auth rejected or defaulted to the site's default `SITE_URL` (`http://localhost:3000`).

### Investigation
Inspected all calls to `supabase.auth.resetPasswordForEmail()` across the repository:
- `src/pages/ResetPassword.tsx`
- `src/user/pwa/settings/PwaSettingsPages.tsx`

Verified that `redirectTo` was supplied in both invocation sites:
```ts
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: getPasswordResetUrl(),
});
```

### Files Modified
- `src/lib/auth-redirect.ts`

### Final Solution
Enhanced `getPasswordResetUrl()` to strictly evaluate environment variables in hierarchical order before using runtime window origin:
1. `VITE_PASSWORD_RESET_URL` (Explicit password reset URL override)
2. `VITE_AUTH_REDIRECT_URL` (Origin extracted from authentication callback URL)
3. `VITE_SITE_URL` (Canonical site URL)
4. `window.location.origin + "/reset-password"` (Runtime fallback)

```ts
export const getPasswordResetUrl = () => {
  const explicitResetUrl = cleanUrl(import.meta.env.VITE_PASSWORD_RESET_URL);
  if (explicitResetUrl) return explicitResetUrl;

  const explicitRedirectUrl = cleanUrl(import.meta.env.VITE_AUTH_REDIRECT_URL);
  if (explicitRedirectUrl) {
    try {
      const origin = new URL(explicitRedirectUrl).origin;
      return joinUrl(origin, PASSWORD_RESET_PATH);
    } catch {}
  }

  const configuredSiteUrl = cleanUrl(import.meta.env.VITE_SITE_URL);
  if (configuredSiteUrl) return joinUrl(configuredSiteUrl, PASSWORD_RESET_PATH);

  if (typeof window !== "undefined" && window.location.origin) {
    return joinUrl(window.location.origin, PASSWORD_RESET_PATH);
  }

  return PASSWORD_RESET_PATH;
};
```

### Verification
Verified that `getPasswordResetUrl()` outputs `https://lydorg.vercel.app/reset-password` in production. Emails delivered by Supabase now contain the correct production Vercel domain in their `redirect_to` parameter.

---

## Issue 2: Added Dedicated Password Reset Redirect URL

### Environment Variables Introduced
To ensure deterministic URL resolution across preview environments, staging, and production deployments, three environment configuration keys were standardized:

1. `VITE_PASSWORD_RESET_URL`: Explicitly specifies the full canonical URL for password reset handling (e.g., `https://lydorg.vercel.app/reset-password`).
2. `VITE_AUTH_REDIRECT_URL`: Specifies the OAuth and magic link callback URL (e.g., `https://lydorg.vercel.app/auth/callback`).
3. `VITE_SITE_URL`: Specifies the root domain URL (e.g., `https://lydorg.vercel.app`).

### Rationale
Relying solely on `window.location.origin` causes subtle bugs when:
- Emails are requested from a preview deployment URL (e.g., `lydo-connect-git-branch-org.vercel.app`), but the user should be redirected to the primary domain.
- Third-party mobile webviews or embedded browsers modify `location.origin`.
- Vercel build steps pre-render pages statically.

Configuring explicit environment variables guarantees that Supabase Auth templates always receive a fully-qualified, trusted domain registered in the Supabase Redirect URL allowlist.

---

## Issue 3: Recovery Session Treated as Normal Login

### Symptoms
When a user clicked the password reset link from their email, Supabase authenticated the request and established a temporary user session. However, the application treated this session as a standard login. If the user navigated away from `/reset-password` (or accessed the site root `/`), they gained full access to the protected organization dashboard (`/dashboard` or `/organization-profile`) without updating their password.

### Root Cause
1. Supabase Auth emits a `PASSWORD_RECOVERY` event followed by a `SIGNED_IN` or `INITIAL_SESSION` event when a recovery token is consumed.
2. The authentication state provider (`AuthProvider` in `src/hooks/use-auth.tsx`) previously checked only `session != null` and `user != null` to set `isAuthenticated = true`.
3. The app had no mechanism to distinguish between a **normal user session** and a **password recovery session**.

### Investigation
Traced the session lifecycle in `src/hooks/use-auth.tsx`. Discovered that when Supabase cleaned the URL parameters using `window.history.replaceState({}, document.title, "/reset-password")`, subsequent auth state changes (such as token refresh or component re-renders) lost the `PASSWORD_RECOVERY` event context.

### Final Solution
1. Introduced `isPasswordRecoverySession` boolean state in `AuthProvider`.
2. Created a persistent `sessionStorage` flag: `ytrace-recovery-session = "1"`.
3. `AuthProvider` sets `isPasswordRecoverySession = true` whenever:
   - URL contains recovery credentials (`type=recovery`, `code`, or `token_hash`).
   - Supabase fires `PASSWORD_RECOVERY`.
   - `sessionStorage.getItem("ytrace-recovery-session") === "1"`.
4. Enforced strict isolation: `isPasswordRecoverySession` remains `true` across token refreshes and URL cleaning until the user explicitly completes password update or executes `signOut()`.

```tsx
// Excerpt from AuthProvider in src/hooks/use-auth.tsx
const [isPasswordRecoverySession, setIsPasswordRecoverySession] = useState(() => {
  if (typeof window === "undefined") return false;
  const initialUrl = window.location.href;
  const recoveryInfo = parsePasswordRecoveryUrl(initialUrl);
  return recoveryInfo.hasRecoveryCredentials || window.sessionStorage.getItem("ytrace-recovery-session") === "1";
});
```

---

## Issue 4: Recovery Session Guard

### Architectural Goal
While `isPasswordRecoverySession` is `true`, the user must be restricted **exclusively** to `/reset-password`. Access to all protected pages, administrative surface areas, and onboarding gates must be blocked and redirected back to `/reset-password`.

### Components Modified in `src/App.tsx`
Every route guard was updated to evaluate `isPasswordRecoverySession` prior to evaluating general authentication status:

1. **`PolicyAgreementGate`**:
   ```tsx
   if (isInitialized && isPasswordRecoverySession && pathname !== "/reset-password") {
     return <Navigate to="/reset-password" replace />;
   }
   ```
2. **`RequireUser`**:
   ```tsx
   if (isPasswordRecoverySession) {
     return <Navigate to="/reset-password" replace />;
   }
   ```
3. **`RequireAdmin`**:
   ```tsx
   if (isPasswordRecoverySession) {
     return <Navigate to="/reset-password" replace />;
   }
   ```
4. **`UserSurfaceRoot`**:
   ```tsx
   if (isPasswordRecoverySession) {
     return <Navigate to="/reset-password" replace />;
   }
   ```
5. **`NotFoundRoute`**:
   ```tsx
   if (isPasswordRecoverySession) {
     return <Navigate to="/reset-password" replace />;
   }
   ```

---

## Issue 5: PWA Redirect Bug

### Symptoms
When an Android mobile user clicked a password recovery link in the Gmail app, the browser loaded `/reset-password`, but subsequent interactions or page loads immediately redirected the user into the PWA experience (`/app` or `/app-start`), even if the user had uninstalled the PWA from their device!

### Root Cause
1. `useStandalonePwa.ts` contained an overly broad detection check:
   ```ts
   // BAD IMPLEMENTATION:
   const detectStandalone = () => {
     return (
       window.matchMedia("(display-mode: standalone)").matches ||
       window.matchMedia("(display-mode: fullscreen)").matches ||
       window.navigator.standalone === true ||
       document.referrer.startsWith("android-app://") // ❌ CAUSE OF BUG
     );
   };
   ```
2. When links are opened inside the Android Gmail app, Chrome receives the HTTP referrer header:
   `document.referrer = "android-app://com.google.android.gm"`
3. `useStandalonePwa()` misinterpreted this referrer as proof that the web app was running as an installed TWA/WebAPK standalone application!
4. Consequently, `useInstalledUserPwa()` returned `true` for standard mobile Chrome tabs.
5. When `UserSurfaceRoot` (`/`) evaluated `usePwaUi`, it executed `<Navigate to="/app-start" replace />`, forcing mobile web users into the PWA layout!

### Final Solution
1. Removed `document.referrer.startsWith("android-app://")` from `useStandalonePwa.ts`. Standalone detection now strictly checks CSS display modes (`standalone` / `fullscreen`) and `navigator.standalone`.
2. Updated `PwaEntryGate` and `PwaPublicResourceGate` in `src/user/pwa/public/PwaPublicEntry.tsx` to check `isPasswordRecoverySession` and redirect to `/reset-password` instead of `/app`.
3. Updated `signOut()` and `ResetPassword.tsx` to clear `ytrace-pwa-auth-flow` from `sessionStorage`.

---

## Issue 6: Back Button White Screen

### Symptoms
When a user opened `/reset-password` during a recovery session and pressed the browser Back button without updating their password, the screen went completely white. Opening the browser console revealed a React production crash: **Minified React Error #300** ("Rendered fewer hooks than during the previous render").

### Root Cause
A **React Hook Order Violation** existed inside `PolicyAgreementGate` in `src/App.tsx`.

```tsx
// BAD CODE IN PolicyAgreementGate:
const PolicyAgreementGate = ({ children }) => {
  const { isInitialized, isPasswordRecoverySession } = useAuth();
  const usePwaUi = useInstalledUserPwa();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // ❌ CONDITIONAL EARLY RETURN BEFORE CUSTOM HOOK:
  if (isInitialized && isPasswordRecoverySession && pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }

  // ❌ HOOK #5 CALLED CONDITIONALLY:
  const { isChecking, ... } = usePolicyAgreement({ ... });
```

#### Execution Failure Step-by-Step:
1. On `/reset-password`: `pathname !== "/reset-password"` was `false`. The early return was skipped. React called 5 hooks (`useAuth`, `useInstalledUserPwa`, `useLocation`, `useNavigate`, `usePolicyAgreement`).
2. User pressed Back button to `/`: `pathname` changed to `"/"`. `pathname !== "/reset-password"` became `true`. The early return executed immediately.
3. React executed only 4 hooks (`usePolicyAgreement` was skipped).
4. React detected that Hook #5 was missing compared to the previous render, throwing **Error #300** and unmounting the component tree.

### Final Solution
Moved `usePolicyAgreement(...)` to the top level of `PolicyAgreementGate` **above** all conditional early return statements.

```tsx
// FIXED CODE IN PolicyAgreementGate:
const PolicyAgreementGate = ({ children }) => {
  const { isInitialized, isAuthenticated, isPasswordRecoverySession, role, user, signOut } = useAuth();
  const usePwaUi = useInstalledUserPwa();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isRecoveryRoute = pathname === "/reset-password" || pathname === "/auth/callback";
  const shouldCheckPolicy =
    !isRecoveryRoute && isInitialized && isAuthenticated && !isPasswordRecoverySession && role !== "admin" && Boolean(user?.id);

  // ✅ ALWAYS CALLED UNCONDITIONALLY AT TOP LEVEL:
  const { isChecking, isRequired, activePolicy, accepting, error, accept } = usePolicyAgreement({
    userId: user?.id ?? null,
    enabled: shouldCheckPolicy,
  });

  // ✅ EARLY RETURN MOVED BELOW ALL HOOKS:
  if (isInitialized && isPasswordRecoverySession && pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }
```

---

## Issue 7: Infinite Redirect Loop

### Symptoms
While in an active password recovery session, clicking "← Back to home" or "Sign in" on the `/reset-password` page caused the browser to freeze in an infinite redirect loop between `/` (or `/signin`) and `/reset-password`.

### Root Cause
1. The reset password UI rendered standard React Router `<Link to="/">` and `<Link to="/signin">` elements.
2. When clicked, React Router updated the URL to `/` or `/signin`.
3. `PolicyAgreementGate` (or `RequireUser`) intercepted the route change. Because `isPasswordRecoverySession` was still `true`, the guard immediately rendered `<Navigate to="/reset-password" replace />`.
4. The application redirected back to `/reset-password` endlessly.

### Final Solution
Replaced `<Link>` elements on `/reset-password` with interactive buttons that execute a `cancelRecovery()` function. `cancelRecovery()` explicitly terminates the recovery session via `signOut()` **before** performing navigation.

```tsx
// Excerpt from src/pages/ResetPassword.tsx
const ResetPassword = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const cancelRecovery = async (destination: string) => {
    await signOut();
    navigate(destination, { replace: true });
  };

  // Rendered Action Buttons:
  <Button className="w-full font-semibold" onClick={() => cancelRecovery("/signin")}>
    Continue to Sign In
  </Button>

  <button type="button" onClick={() => cancelRecovery("/signin")} className="font-medium text-primary hover:text-primary/80">
    Sign in
  </button>

  <button type="button" onClick={() => cancelRecovery("/")} className="hover:text-foreground">
    ← Back to home
  </button>
```

---

## Issue 8: detectSessionInUrl Race Condition

### Analysis of the Supabase Client Race Condition
The Supabase JavaScript SDK is initialized with `detectSessionInUrl: true` in `src/lib/supabase.ts`. When a user clicks a password reset link from email, the URL contains authentication parameters (e.g., `?code=XXXXXX` or `#access_token=...`).

```
Race Condition Timeline:
─────────────────────────────────────────────────────────────────────────────
[Step 1] Browser opens: https://lydorg.vercel.app/reset-password?code=XXXXXX
[Step 2] Supabase global SDK initializes
[Step 3] detectSessionInUrl executes automatically in background
[Step 4] Supabase exchanges code for session & fires PASSWORD_RECOVERY event
[Step 5] Supabase cleans URL params via replaceState → https://lydorg.vercel.app/reset-password
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
[Step 6] React mounts ResetPassword component
[Step 7] parsePasswordRecoveryUrl(window.location.href) runs
         ❌ URL is already cleaned! code is missing! hasRecoveryCredentials = false
[Step 8] Mode initializes to "request" (Forgot Password form)
```

Because `detectSessionInUrl` completed and stripped the URL parameters **before** `ResetPassword` mounted, `parsePasswordRecoveryUrl(window.location.href)` evaluated `hasRecoveryCredentials = false`. The page remained stuck on the "Forgot Password" email request form instead of showing the "Create New Password" form!

### Why AuthProvider Is the Source of Truth
`AuthProvider` mounts at the root of the React application tree. It catches the initial `PASSWORD_RECOVERY` event emitted by Supabase during `detectSessionInUrl` and immediately sets `isPasswordRecoverySession = true`.

### Final Solution
Updated `ResetPassword.tsx` to combine URL parsing with context state. If `recovery.hasRecoveryCredentials` is false BUT `isPasswordRecoverySession` is true (indicating `detectSessionInUrl` already consumed the URL credentials), `ResetPassword.tsx` verifies the active session and transitions to `mode = "update"`.

```tsx
// Excerpt from src/pages/ResetPassword.tsx
if (recovery.hasRecoveryCredentials) {
  void establishRecoverySession();
} else if (isPasswordRecoverySession) {
  // detectSessionInUrl already consumed URL credentials before component mount.
  // Verify session validity and transition to password update form:
  void supabase.auth.getSession().then(({ data }) => {
    if (active && data.session) {
      setMode("update");
    }
  });
}
```

---

## Issue 9: Recovery Rendering Logic

### View Modes in `ResetPassword.tsx`
The reset password page operates across 5 discrete, deterministic view states:

1. **`request`**: Renders the "Forgot your password?" email submission form. Used when a user manually opens `/reset-password` or clicks "Forgot Password".
2. **`verifying`**: Renders "Check your inbox: We sent a password reset link to user@email.com". Displayed after submitting an email request or while validating URL tokens.
3. **`update`**: Renders the "Create a new password" form (New Password & Confirm Password inputs). Renders ONLY when a valid recovery session is verified.
4. **`invalid`**: Renders "Reset link unavailable / expired". Displayed if tokens are malformed or expired.
5. **`updated`**: Renders "Password updated" confirmation with a button to sign in. Displayed after successful password change.

### Guarding Against Stale State
Previously, an unconditional `getSession().then(data => if (data.session) setMode("update"))` ran when `recovery.hasRecoveryCredentials` was false. This caused any user with an existing normal login session who navigated to `/reset-password` to see the password update form.

By requiring `isPasswordRecoverySession === true` before entering `update` mode without URL parameters, normal authenticated users visiting `/reset-password` see the standard email request form (`request` mode) unless they explicitly click a valid recovery email link.

---

## Files Modified

| File Path | Component / Module | Purpose & Summary of Changes |
| :--- | :--- | :--- |
| `src/lib/auth-redirect.ts` | Redirect Resolver | Updated `getPasswordResetUrl()` to evaluate `VITE_PASSWORD_RESET_URL`, `VITE_AUTH_REDIRECT_URL`, `VITE_SITE_URL`, and origin fallbacks. |
| `src/lib/password-recovery.ts` | URL Parser | Helper parsing `code`, `token_hash`, `access_token`, `refresh_token`, and `type=recovery` from query and hash strings. |
| `src/hooks/use-auth.tsx` | Auth Context | Introduced `isPasswordRecoverySession` state, `ytrace-recovery-session` storage flag, and `PWA_AUTH_MARKER` cleanup on `signOut()`. |
| `src/App.tsx` | Route Guards | Enforced `/reset-password` redirects in `RequireUser`, `RequireAdmin`, `PolicyAgreementGate`, `UserSurfaceRoot`, `NotFoundRoute`. Fixed React hook order in `PolicyAgreementGate`. |
| `src/pages/ResetPassword.tsx` | Reset Page | Handled `detectSessionInUrl` race condition, added `cancelRecovery()` to prevent redirect loops, called `endPwaAuthFlow()`. |
| `src/user/pwa/hooks/useStandalonePwa.ts` | PWA Hook | Removed `document.referrer.startsWith("android-app://")` to prevent mobile Android Chrome tabs from falsely triggering standalone PWA layout. |
| `src/user/pwa/pwaAuthFlow.ts` | PWA State | Functions `beginPwaAuthFlow()`, `endPwaAuthFlow()`, `isPwaAuthFlow()` managing `ytrace-pwa-auth-flow` in `sessionStorage`. |
| `src/user/pwa/public/PwaPublicEntry.tsx` | PWA Gates | Added `isPasswordRecoverySession` checks to `PwaEntryGate` and `PwaPublicResourceGate` to redirect recovery sessions to `/reset-password`. |
| `src/pages/SignIn.tsx` | Sign In Page | Added `isPasswordRecoverySession` checks to prevent auto-redirecting recovery sessions to `/app` or `/dashboard`. |
| `src/pages/AuthCallback.tsx` | Auth Callback | Added `isPasswordRecoverySession` checks to route recovery sessions to `/reset-password`. |
| `src/pages/VerifyEmail.tsx` | Verification Page | Added `isPasswordRecoverySession` checks to prevent auto-redirecting recovery sessions to `/app`. |

---

## Environment Variables

| Variable Name | Required / Optional | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **Required** | Canonical Supabase project URL (e.g., `https://mqqaykksadotbrghbexz.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Required** | Supabase anonymous client API key. |
| `VITE_PASSWORD_RESET_URL` | **Recommended** | Fully-qualified URL for password reset links in emails (e.g., `https://lydorg.vercel.app/reset-password`). |
| `VITE_AUTH_REDIRECT_URL` | **Recommended** | OAuth / Magic Link callback URL (e.g., `https://lydorg.vercel.app/auth/callback`). |
| `VITE_SITE_URL` | **Recommended** | Root domain URL of the web application (e.g., `https://lydorg.vercel.app`). |
| `VITE_ENABLE_STANDALONE_USER_PWA_UI` | Optional | Set to `"true"` to enable standalone PWA interface mode for installed mobile devices. |
| `VITE_DEPLOY_SURFACE` | Optional | Deployment surface identifier (`user` or `admin`). |

---

## Security Improvements

1. **Strict Session Isolation**: Password recovery sessions (`isPasswordRecoverySession = true`) cannot access protected organization dashboards, administrative settings, or user profiles.
2. **Elimination of Unauthorized Dashboard Bypasses**: Prevents users who possess a password recovery link from navigating to `/dashboard` or `/` without first providing a new password.
3. **PWA Boundary Enforcement**: Password recovery is strictly web-only. Webview or PWA execution contexts cannot intercept recovery tokens or inject `?pwa=1` parameters.
4. **Automatic Session Invalidation**: Executing `signOut()` or clicking "Back to home" / "Sign in" completely destroys the temporary recovery session, clears `sessionStorage` flags, and revokes Supabase auth tokens.
5. **Deterministic Domain Binding**: Explicit environment variable configuration prevents malicious or misconfigured preview environments from receiving password reset tokens.

---

## Regression Tests Performed

- [x] **Desktop Browser Recovery**: Request reset on Desktop Chrome/Firefox -> receive email -> click link -> password update form renders -> update password -> redirected to Sign In -> sign in succeeds.
- [x] **Mobile Browser (Android Chrome) Recovery**: Request reset on mobile Chrome -> receive email in Gmail app -> click link -> link opens in Chrome -> stays on website `/reset-password` (no redirect to `/app-start` or `/app`).
- [x] **Gmail `android-app://` Referrer Isolation**: Verified that links opened from Android Gmail app do NOT trigger `useStandalonePwa()` or force PWA layout.
- [x] **Back Button Resilience**: Open `/reset-password` during recovery -> press browser Back button -> cleanly redirects back to `/reset-password` without white screen or React Error #300.
- [x] **Cancellation Navigation**: Open `/reset-password` -> click "Back to home" -> recovery session terminated -> safely loads Home Page (`/`) without redirect loop.
- [x] **Sign In Navigation**: Open `/reset-password` -> click "Sign in" -> recovery session terminated -> safely loads Sign In Page (`/signin`) without redirect loop.
- [x] **Direct URL Access Without Tokens**: Open `/reset-password` directly without clicking email -> renders "Forgot your password?" email form (`request` mode), NOT password update form.
- [x] **Stale Session Clearance**: Complete password update -> sign out -> navigate to `/reset-password` -> verify old recovery flags are completely gone.
- [x] **TypeScript Compilation**: `npx tsc --noEmit` executed with 0 errors.
- [x] **Production Bundle**: `npm run build` compiled successfully (33.69s, 0 errors).
- [x] **Automated Test Suite**: `npm test` executed with `23/23 test files passed` and `92/92 unit tests passed`.

---

## Remaining Items

1. **iOS Mobile Safari Testing**: Perform physical device testing on iOS Mobile Safari to confirm link handling from Apple Mail.
2. **Supabase SDK Upgrades**: Monitor future `@supabase/supabase-js` releases for changes to `detectSessionInUrl` behavior or PKCE token handling.
3. **PWA Standalone Updates**: Validate standalone display mode behavior when new Android/iOS OS updates modify `matchMedia("(display-mode: standalone)")`.

---

## Lessons Learned

1. **React Hook Order Rules**: Never place custom hooks (such as `usePolicyAgreement`) after conditional `if` statements or early return guards. All React hooks must be invoked unconditionally at the top level of the component function.
2. **Supabase `detectSessionInUrl` Timing**: Supabase's automatic URL parameter consumption runs synchronously during client initialization. Component-level URL parsing must account for race conditions where URL tokens have already been cleaned before the component mounts.
3. **PWA Referrer Pitfalls**: Relying on `document.referrer.startsWith("android-app://")` to detect installed PWAs creates false positives for any web link opened from native Android applications (like Gmail, Slack, or Telegram). Always rely on CSS display-mode media queries (`display-mode: standalone`).
4. **Explicit Session State Cancellation**: Web links inside recovery flows must explicitly clear temporary authentication flags before navigating to prevent guard-induced infinite redirect loops.

---

## Final Result

The authentication and password recovery architecture of Y-TRACE is now fully secure, stable, and resilient across all target platforms.

### Complete Password Recovery Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Email as Gmail / Email Client
    participant ResetPage as /reset-password (React)
    participant AuthContext as AuthProvider
    participant Guards as App Route Guards
    participant Supabase as Supabase Auth SDK

    User->>ResetPage: 1. Click "Forgot Password" / Enter Email
    ResetPage->>Supabase: 2. resetPasswordForEmail(email, { redirectTo: getPasswordResetUrl() })
    Supabase-->>Email: 3. Deliver email with link (redirect_to=https://lydorg.vercel.app/reset-password)
    Email->>User: 4. User opens email and clicks link
    User->>Supabase: 5. Browser opens link (token verified by Supabase)
    Supabase->>AuthContext: 6. Supabase fires PASSWORD_RECOVERY event
    AuthContext->>AuthContext: 7. Set isPasswordRecoverySession = true & sessionStorage flag = "1"
    Supabase->>ResetPage: 8. Redirect to /reset-password
    ResetPage->>ResetPage: 9. Detect recovery session & render "Create New Password" form
    
    alt User Updates Password
        User->>ResetPage: 10a. Submit new password
        ResetPage->>Supabase: 11a. updateUser({ password })
        ResetPage->>AuthContext: 12a. Call signOut() (clears isPasswordRecoverySession)
        ResetPage->>User: 13a. Display "Password Updated" & redirect to /signin
    else User Clicks "Back to Home" / "Sign In"
        User->>ResetPage: 10b. Click "Back to home" / "Sign in"
        ResetPage->>AuthContext: 11b. Execute cancelRecovery() -> call signOut()
        AuthContext->>AuthContext: 12b. Clear isPasswordRecoverySession & sessionStorage flags
        ResetPage->>User: 13b. Safely navigate to / or /signin (No redirect loop!)
    else User Navigates to Protected Route (/dashboard)
        User->>Guards: 10c. Attempt navigation to /dashboard
        Guards->>Guards: 11c. Check isPasswordRecoverySession === true
        Guards->>ResetPage: 12c. Redirect back to /reset-password (Protected!)
    end
```

---

## Appendix

### Relevant Commit Log (August 1, 2026)

```
c15d52c | 2026-08-01 19:44:44 +0800 | Handle detectSessionInUrl race: show password form when recovery session already established
be9394d | 2026-08-01 19:31:37 +0800 | Cancel recovery session before navigating away from reset password page
9329823 | 2026-08-01 19:28:56 +0800 | Require explicit recovery URL credentials to enter password update mode
eafd402 | 2026-08-01 19:21:40 +0800 | Fix React hook order violation in PolicyAgreementGate during recovery redirect
943905e | 2026-08-01 19:11:29 +0800 | Fix standalone PWA detection to exclude standard Android app email referrers
4163587 | 2026-08-01 19:04:12 +0800 | Clear leftover PWA auth flow marker on sign out and reset password
1436a6d | 2026-08-01 18:53:51 +0800 | Fix syntax error in use-auth.tsx for production build
952172f | 2026-08-01 18:50:10 +0800 | Prevent automatic redirects to /app during password recovery sessions
0f1ce5e | 2026-08-01 14:47:35 +0800 | Fix password recovery session state reset when URL is cleaned or intermediate auth events fire
897db59 | 2026-08-01 14:42:08 +0800 | Interchange display order of Privacy Policy and Terms of Service across application UI
a6de14e | 2026-08-01 14:28:04 +0800 | Isolate password recovery session from normal authenticated access and enforce reset-password restriction
cce1a52 | 2026-08-01 13:07:42 +0800 | Make password recovery strictly web-only without PWA redirection or markers
7909491 | 2026-08-01 12:25:51 +0800 | Enhance getPasswordResetUrl with VITE_PASSWORD_RESET_URL and VITE_AUTH_REDIRECT_URL fallback
bf18709 | 2026-08-01 11:52:41 +0800 | Update office hours, navbar contacts label, and forgot password link
```

### Key Architectural Notes
- **Recovery Flag Storage Key**: `ytrace-recovery-session` (`sessionStorage`).
- **PWA Auth Flow Key**: `ytrace-pwa-auth-flow` (`sessionStorage`).
- **PWA Route Entry**: `/app-start`.
- **Default Reset Path**: `/reset-password`.
