# Staging Initial Super Admin Bootstrap

## Scope and safety

- Authorized project: `zroudsvpswqsjlyttkjf` (`https://zroudsvpswqsjlyttkjf.supabase.co`) only.
- Production project `mqqaykksadotbrghbexz` was not queried for writes or modified.
- No migration, Edge Function, Storage object, or authentication setting was changed.
- The staging terminal credentials were not available to the Codex task process, so the Auth activation and login verification must be run in the same interactive PowerShell terminal that passed the staging preflight.

## Review findings

- `public.set_initial_admin_password(text)` can be reused. It reads the caller's Auth identity from `auth.uid()`, finds the matching pending Admin by email, hashes the supplied password with bcrypt, and changes `is_password_set` to `true`.
- The ordinary `invite_admin_account` workflow requires an already-authenticated Admin with administrator-management permission. It is not an initial bootstrap mechanism.
- The staging project currently has only the `admin-storage-access` Edge Function deployed; `admin-invite` is absent. The bootstrap does not deploy or invoke an Edge Function.
- The `auth.users` creation trigger creates a normal user profile and default youth role. The bootstrap creates a marker-only temporary identity, activates the pending Admin password through the existing RPC, then deletes only that marked shadow identity. This mirrors the existing Admin invite finalization behavior; the profile and default role are removed through their `auth.users` cascade relationships.
- The shadow Auth identity receives a separate 48-byte random temporary password held only in process memory. It is never the chosen Super Admin password and is never printed or persisted.
- The invite-email setting has no explicit row and the existing invite function defaults to sending mail. The bootstrap never calls an invitation, signup-confirmation, or email endpoint. It uses the Supabase Auth Admin `createUser` API with `email_confirm: true` and an `example.invalid` address, then uses password sign-in only to obtain the real Auth JWT required by the activation RPC. No email configuration or SMTP delivery is needed.
- The existing `super_admin` role is used without changing role permissions. Its `administrators_management` and `system_settings_manage` permissions were verified.

## Staging state

The user-provided read-only preflight screenshot showed the expected ten buckets with the expected public/private settings, no unexpected buckets, zero Storage objects, zero Auth users, and zero baseline Admin/organization/workflow records.

Immediately before the one-time bootstrap row insert, read-only SQL confirmed:

- `admin_accounts`: 0 rows
- `auth.users`: 0 rows
- Exactly one `super_admin` role existed, with the expected Admin permissions.
- `service_role` has the required existing `SELECT` and `INSERT` table grants.
- No public function name indicated a pre-existing initial-Admin bootstrap RPC.

One pending row was then inserted on staging only:

- Username: `staging-super-admin`
- Email: `ytrace-staging-super-admin@example.invalid`
- Role: existing `super_admin` (role id 4)
- Active: yes, matching the existing invitation flow
- Password set: no; it has a freshly generated random bcrypt hash with no known password

The password activation and normal Admin login have **not yet been executed or verified**. Do not treat the pending row as a completed bootstrap.

## Complete activation in the staging PowerShell terminal

The script intentionally reads only process environment variables and will refuse any URL/reference other than the exact staging project. Do not add credentials to the repository `.env` and do not paste them into chat.

```powershell
Set-ProcessSecret 'YTRACE_STAGING_BOOTSTRAP_PASSWORD' 'Staging Super Admin password (14+ characters)'
node scripts/staging/bootstrap-initial-super-admin.mjs
```

Run this in the same interactive terminal where `verify-synthetic-staging-preflight.mjs` succeeded and the four `YTRACE_STAGING_*` values are available. The script creates the marked Auth shadow only if absent, activates the password using `set_initial_admin_password`, removes the shadow after checking that it has no organization or registration association, then verifies `authenticate_admin_account`, the `super_admin` permission context, token validation, and immediate revocation. It prints pass/fail summaries only; it never prints the password, Auth JWT, Admin session token, or signed URLs.

## Automated-test isolation

- Vitest uses fixed non-routable placeholder Supabase values and never loads the root deployment `.env`.
- Its setup blocks the production Supabase project host at `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` boundaries.
- Playwright starts a fresh local Vite server with the same placeholder values and refuses to reuse an existing developer server.
- The dedicated network-guard suite passed 4 tests after the final test addition; TypeScript and the bootstrap script syntax check passed.
