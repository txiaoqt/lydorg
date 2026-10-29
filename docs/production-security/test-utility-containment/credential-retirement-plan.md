# Legacy Auth credential retirement — separate approval required

11 October 2026. **PLAN ONLY. No Auth mutation or password authentication was performed.**

## Exact target and current evidence

Use [affected-account-readonly.json](affected-account-readonly.json) as the restricted operator record of the exact organization ID and Auth user ID. Fresh production reads found one marked profile, one legacy-designated profile, one matching Auth account, one email identity, one organization association, one accreditation term, and no renewal records. The email relationship matches. There were zero `auth.sessions` rows at inspection; that does not prove nobody holds an unexpired access token. The account is confirmed and no active ban was observed. These are state observations, not a password test or evidence of exploitation.

Do not publish the account-identifier artifact externally. Do not recover, copy, compare, log, or attempt to authenticate with the old embedded password. No plaintext password or password hash was retrieved in this task. The original function definition was redacted in the database before its catalog capture left the server.

## Proposed authorized sequence

1. Obtain separate authorization naming the exact recorded Auth user and production project. Confirm the account is a legacy test identity rather than a legitimate transferred account; review its ownership and retained business history with the responsible operator. Stop if its IDs, identity/email association, organization ownership, or classification has changed.
2. Install the separately approved SQL containment first, so no surviving test utility can reveal or restore the old credential. Recheck that the account getter and profile/scenario/seeder/repair functions are denial-only and API execution is revoked. Do not put a new password in any SQL definition, migration, frontend, evidence file, or chat.
3. Review production Auth notification/hook settings and any real recipient before mutation. A password change must not silently send an unapproved notification. Do not assume staging email isolation applies to production.
4. For a confirmed unused test identity, prefer an explicitly approved Auth ban plus rotation to a securely generated, unshared random password. If ownership is legitimate, agree on secure rotation and delivery with that owner instead. Use the official server-side Auth Admin `updateUserById` for exactly the recorded ID; verify the returned ID. Do not delete the account or organization, change roles, rewrite app/user metadata, use invitation/recovery/OTP flows, or rotate project-wide keys. The API supports direct password changes and bans, and must remain server-side. [Supabase Auth Admin update reference](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).
5. Explicitly retire refresh sessions. The Admin `signOut` API accepts a **valid logged-in JWT**, not an arbitrary user ID. Do not fabricate one or pass the user ID in its place. If a suitable verified session is unavailable, stop that part for a separately reviewed supported revocation method. One possible separately authorized sequence is rotation, one server-side password login using only the **new** password, verification of the returned user ID, immediate Admin `signOut(jwt, 'global')`, then the approved ban. Do not assume rotation alone proves global revocation. No such login or operation is authorized or executed here. [Supabase Admin signOut reference](https://supabase.com/docs/reference/javascript/auth-admin-signout).
6. Verify the exact account ban/rotation outcome without testing the old password; verify refresh-session removal and the denial of a controlled refresh token if one was legitimately retained for this operation. Reconcile any ambiguous API response read-only before further actions. Record operator, project, target IDs, timestamps, approved operation, sanitized HTTP result, and remaining risk; exclude passwords, JWTs, refresh tokens, signed URLs, and authorization headers.
7. Confirm unchanged organization ownership, accreditation terms, registrations/documents, audit records and file references. Preserve these historical records and the SQL containment. Any future return to legitimate account use requires separate ownership review and a fresh secret, never restoration of the embedded credential.

## Token and Storage limitations

Global sign-out removes affected session records, but existing short-lived JWTs need not immediately fail at services that validate only their signature and expiry. Review the configured expiry and wait/monitor that interval; do not change project-wide expiry in this task. Checking session existence for sensitive operations is a separate design decision. [Supabase session guidance](https://supabase.com/docs/guides/auth/sessions).

Neither password rotation, client-cache clearing nor this SQL patch revokes already issued Storage signed URLs. Their server-defined expiry still applies. The broader Storage policy exposure and gateway cutover remain separate release work. Do not claim credential retirement alone repairs Storage RLS.

## Stop conditions

An unexpected target, multiple associations, real ownership ambiguity, unverified email side effect, unsupported session revocation mechanism, uncertain write response, or unexpected authorization success requires investigation and fresh approval. Never delete the account or historical rows as a shortcut.
