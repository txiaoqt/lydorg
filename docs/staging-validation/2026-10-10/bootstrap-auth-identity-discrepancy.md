# Staging Admin Bootstrap Auth Identity Forensic Review

**Scope:** staging project `zroudsvpswqsjlyttkjf` only. Production project `mqqaykksadotbrghbexz` was not contacted. No live Auth, Admin, Storage, or business records were created, updated, deleted, or activated during this review.

## Root cause

The bootstrap script declared `verifyAuthUser()` as `async` but assigned its result without `await`:

```js
let shadowUser = verifyAuthUser(usersBefore);
```

That assigned a Promise, which is always truthy. For a pending Admin, the script therefore selected its “Temporary synthetic Auth identity recovery” branch even when there was no Auth identity. It then passed the Promise object to the identity metadata guard. The guard saw no `email` or marker on that Promise and emitted the “identity no longer matches” error. The message described the wrong object; it did not prove that a real Auth user had unexpected metadata.

This explains the diagnostic run that stopped at recovery. That run could not reach `createUser`, `updateUserById`, `signInWithPassword`, `set_initial_admin_password`, or `deleteUser`. A prior generic error did not retain a stage or HTTP status, and no timestamped request log or Auth response was available. Therefore I cannot establish from available evidence whether a different earlier attempt ever created an Auth user or what metadata keys it returned. The subsequent and current read-only database checks found no Auth identity.

## Metadata contract

The local correction now puts the explicit bootstrap marker in `app_metadata`, which is Admin-controlled. It accepts only that marker and the documented email-provider `app_metadata` values `provider: "email"` and `providers: ["email"]`; it requires `user_metadata` to be empty. If the Admin API response includes linked identities, it must show exactly the recorded user’s email identity. Unexpected keys, marker values, provider values, email, confirmation state, lifecycle, linked identity, or Auth user ID fail closed.

Supabase documents `user_metadata` as user-editable and `app_metadata` as server-controlled. Its Auth hook example shows the email provider values in `app_metadata` and an empty `user_metadata`; the Admin `createUser` reference documents pre-confirming an email without invoking an invitation flow. [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data), [Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [Admin createUser reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

No actual unexpected Auth metadata keys were captured in the failed run, so none were allowlisted by guesswork.

## Local safety corrections

- Made inventory validation synchronous so a Promise cannot be mistaken for an Auth user.
- Added a staging-only local journal containing the returned Auth user ID and identity labels, never passwords or tokens. Recovery, rotation, and deletion require that exact recorded ID.
- Added a per-Windows-user, per-staging-project exclusive lock. A stale lock is not removed automatically. This serializes processes on the same user profile; it is not a distributed lock across machines.
- Marker and metadata checks run before any delete. The returned Auth UUID is journaled immediately before metadata validation. Cleanup also verifies the expected Auth-triggered profile/default youth role and checks all current public-schema Auth-user foreign-key references that could cascade or null business/audit data. The list is based on the live staging schema read during this review. A stale `registrations` table check was removed after the live schema confirmed that table does not exist; registration data is stored through `document_submissions` and its file table.
- Activation uses the temporary password only for Supabase Auth sign-in and passes the separately supplied Admin password only to the existing `set_initial_admin_password` RPC. It signs out before cleanup. A failed activation never reaches cleanup.
- If identity creation succeeds but the local ID journal cannot be written, the script stops without activation or deletion. A later run sees an unrecorded identity and refuses to adopt it; manual review and separate authorization are required.

## Evidence and current staging state

The Supabase project metadata identified `zroudsvpswqsjlyttkjf` as the active `ytrace-staging` project. Read-only SQL against that explicit project returned:

| Check | Current result |
|---|---:|
| `auth.users` | 0 |
| `auth.identities` | 0 |
| `public.admin_sessions` | 0 |
| `storage.objects` | 0 |
| `public.admin_accounts` | 1 |
| Exact pending synthetic Super Admin (`super_admin`, active, password unset) | 1 |
| Storage buckets | 10: six private, four public; all without MIME or size limits |

Auth-trigger side-effect tables and registration/workflow tables are also empty: `user_profiles`, `user_roles`, `organization_profiles`, `document_submissions`, `document_submission_files`, `budget_requests`, and `liquidation_reports` each have zero rows. The live public schema has no `registrations` table.

The 10 bucket names and public flags match the staging inventory. One Auth user-creation trigger is installed; its function inserts the expected `user_profiles` row and default youth role. Read-only catalog inspection confirmed their Auth-user deletion relationships and enumerated the application tables guarded before cleanup. The staging role catalog still has exactly one `super_admin` role with the expected `administrators_management` and `system_settings_manage` permissions.

The recorded terminal messages contain no timestamps or Auth API response statuses. No metadata key names were emitted. The currently available evidence is the script stage/error, prior preflight output, and read-only database state; there is no saved Auth Admin response or timestamped terminal log to reconstruct further.

## Tests and changes

Mocked Auth Admin and lifecycle tests passed **16/16** using:

```text
node --test scripts/staging/bootstrap-initial-super-admin-safety.test.mjs
```

Coverage includes standard email-provider metadata, correct and unexpected markers, exact ID and duplicate-user checks, missing identity, failed creation, malformed created-user metadata, recorded-ID recovery, failed activation/sign-out ordering, cleanup rejection, local journal handling, and concurrent local invocations. Node syntax checks passed for the bootstrap and safety modules. `git diff --check` exited 0; Git also printed existing LF/CRLF warnings. These tests are mocked/local and are not live Auth proof. One read-only count query initially referenced the absent `registrations` table and returned a schema error; it did not modify data. Follow-up schema discovery and counts verified the actual registration/document tables listed above.

Files added or changed for this forensic correction:

- `scripts/staging/bootstrap-initial-super-admin.mjs`
- `scripts/staging/bootstrap-initial-super-admin-safety.mjs`
- `scripts/staging/bootstrap-initial-super-admin-safety.test.mjs`
- `docs/staging-validation/2026-10-10/bootstrap-auth-identity-discrepancy.md`

The shared working tree was already extensively modified before this review. No reset, checkout, cleanup, migration, or deployment was run. No staging bootstrap or production operation was executed after the correction.

## Retry safety

Do not retry automatically. The specific Promise/recovery bug is fixed locally and covered by mocks, and current staging state is still pending/empty as expected. A future single controlled staging retry should first verify no bootstrap process is running and inspect the per-user temporary staging lock/journal; then rerun the read-only preflight and review the exact staging target before authorizing any Auth creation, activation, deletion, or Admin login. No real staging bootstrap has validated the corrected code yet. Cross-machine concurrency uses Supabase's unique email constraint plus fail-closed recorded-ID checks, not a shared distributed lock.
