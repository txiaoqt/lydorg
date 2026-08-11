# Authentication Module E2E Test Traceability Matrix

| Test Case ID | Description | Spec File | Automated | Executed | Result | Evidence |
|---|---|---|---|---|---|---|
| **TC001** | Sign in with valid credentials | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC002** | Sign in with invalid password | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC003** | Sign in with invalid email format | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC004** | Sign in with non-existing email | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC005** | Sign in with empty email field | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC006** | Sign in with empty password field | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC007** | Sign in with both fields empty | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC008** | Sign in with email containing leading/trailing spaces | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC009** | Sign in with uppercase email (case insensitivity) | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC010** | Sign In button shows loading state during submission | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC011** | Toggle password visibility on Sign In page | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC012** | Navigate to Forgot Password from Sign In page | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC013** | Navigate to Registration from Sign In page | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC014** | Navigate back to home from Sign In page | `sign-in.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC015** | Register existing organization with valid URN – Step 1 | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC016** | Register existing organization with invalid URN format | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC017** | Register existing organization with empty URN field | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC018** | Register existing organization with already-used URN | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC019** | Register with empty organization name | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC020** | URN case insensitivity – lowercase input converted to uppercase | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC021** | URN Help icon popover displays information | `registration-existing-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC022** | Register new organization with auto-generated URN – Step 1 | `registration-new-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC023** | Verify auto-generated URN callout text is displayed when checkbox unchecked | `registration-new-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC024** | Toggle URN checkbox shows/hides appropriate fields | `registration-new-urn.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC025** | Complete account details with all valid fields | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC026** | Submit with empty email field | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC027** | Submit with non-Gmail email address | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC028** | Submit with already registered email | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC029** | Email availability check shows available status | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC030** | Submit with empty contact number | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC031** | Submit with invalid contact number format | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC032** | Contact number with fewer than 11 digits | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC033** | District field is required | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC034** | Barangay dropdown is disabled until district is selected | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC035** | Barangay options change based on district selection | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC036** | Submit with password that does not meet policy | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC037** | Submit with mismatched confirm password | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC038** | Matching passwords show confirmation message | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC039** | Paste prevention on Confirm Password field | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC040** | Submit without checking policy agreement | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC041** | Privacy Policy link opens policy content | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC042** | Terms of Service link opens terms content | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC043** | Review confirmation dialog displays entered details | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC044** | Cancel review dialog returns to form | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC045** | Navigate back from Step 2 to Step 1 | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC046** | Create Account button shows loading state during submission | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC047** | Submit with invalid Facebook URL (non-Facebook domain) | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC048** | Facebook URL with www.facebook.com accepted | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC049** | Facebook URL with fb.com short domain accepted | `registration-account-details.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC050** | Verification page displays after successful registration | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC051** | Enter valid 6-digit OTP code | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC052** | Enter invalid OTP code | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC053** | Enter expired OTP code | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC054** | Verify and Continue button disabled with incomplete OTP | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC055** | Resend verification code | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC056** | Resend code cooldown prevents rapid resending | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC057** | Password field appears if verification page is refreshed | `registration-verification.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC058** | Request password reset with registered email | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC059** | Request password reset with unregistered email | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC060** | Request password reset with invalid email format | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC061** | Request password reset with empty email field | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC062** | Send Reset Link button shows loading state | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC063** | Send another link from success page | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC064** | Navigate to Sign In from Forgot Password page | `forgot-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC065** | Reset password with valid link and valid new password | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC066** | Reset password with expired link | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC067** | Reset password with invalid/tampered token | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC068** | Reset password with password that does not meet policy | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC069** | Reset password with mismatched confirm password | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC070** | Reset password with empty new password field | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC071** | Paste prevention on Reset Password confirm field | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC072** | Login using new password after successful reset | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC073** | Login using old password after successful reset | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC074** | Update Password button shows loading state | `reset-password.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC075** | Password meets all policy requirements | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC076** | Password too short (less than 8 characters) | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC077** | Password too long (more than 16 characters) | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC078** | Password missing uppercase letter | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC079** | Password missing lowercase letter | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC080** | Password missing number | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC081** | Password missing special character | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC082** | Password policy live validation updates as user types | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC083** | Password exactly 8 characters (lower boundary) | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC084** | Password with 7 characters (one below minimum boundary) | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC085** | Password exactly 16 characters (upper boundary) | `password-policy.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC086** | Valid Gmail email format accepted on registration | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC087** | Non-Gmail email rejected on registration | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC088** | Email missing @ symbol | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC089** | Email missing domain | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC090** | Email with multiple @ symbols | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC091** | Email with spaces | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC092** | Uppercase email treated as case-insensitive | `email-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC093** | Policy agreement checkbox checked – registration allowed | `policy-agreement.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC094** | Post-login policy enforcement when policy version changes | `policy-agreement.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC095** | Declining updated policy agreement signs user out | `policy-agreement.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC096** | Authenticated user can access protected routes | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC097** | Unauthenticated user is redirected from protected routes | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC098** | Sign out redirects to Sign In / Welcome page | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC099** | Signed-out user cannot access protected routes via back button | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC100** | Session persists after browser page refresh | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC101** | Session persists after closing and reopening browser tab | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC102** | Password recovery session isolates user from portal access | `authentication-session.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC103** | Required fields display validation when submitted empty | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC104** | Very long organization name (boundary test) | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC105** | Whitespace-only input in required text fields | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC106** | Duplicate form submission prevention | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC107** | URN with exactly correct format boundary (PCYDO-AAAA-0000) | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC108** | URN with too few characters in a segment | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC109** | URN with too many characters in a segment | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC110** | URN missing PCYDO prefix | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC111** | Registration failure shows user-friendly error | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC112** | Sign-in failure shows user-friendly error | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC113** | Password reset failure shows user-friendly error | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC114** | Contact number maximum length enforcement | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC115** | Contact number accepts only numeric input | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |
| **TC116** | Simultaneous multiple browser tab sign-in | `general-validation.spec.ts` | Yes | Yes | **PASS** | Playwright Chromium Trace & HTML Report |

## Summary Statistics
- **Total Documented Test Cases**: 116
- **Total Automated Test Cases**: 116
- **Total Passed**: 116
- **Total Failed**: 0
- **Total Blocked**: 0
- **Pass Rate**: 100%