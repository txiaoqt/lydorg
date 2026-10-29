# Legacy credential retirement — production preparation

11 October 2026, 17:03 Manila (09:03 UTC). Project: `mqqaykksadotbrghbexz`.

**Decision: ready for separate account-specific approval; execution is blocked pending that approval and a securely supplied production Auth Admin credential. No Auth mutation, password login, database write, migration, Storage change, push or deployment was performed.**

This supplements the [previous retirement plan](../credential-retirement-plan.md). Preserve that plan and all previous containment evidence. The version-specific revocation finding below replaces its tentative rotation/login/sign-out fallback for the reviewed Auth version.

## Read-only preflight

| Check | Result | Evidence |
| --- | --- | --- |
| Correct production project | PASS | Control plane reports the expected project and database host; authenticated dashboard project matches. |
| Containment remains installed | PASS | Receipt `20261011230000`; all 12 mutation RPCs remain denial-only with API EXECUTE revoked; environment guard returns FALSE; 17 function definitions match the installed review; four fixture-marker triggers remain. |
| Exact affected identity | PASS | Single target matches the restricted record: Auth ID ends `941f85`, organization ID ends `14de17`. One confirmed email-provider identity, one organization association, ordinary `authenticated`/`youth` roles, no elevated Auth role, no deletion or active ban. |
| Legacy test classification | PASS | Designated email and organization label match the server-redacted legacy definition; the original `created_renewal_test_account` audit exists; the protected renewal-test marker is set. No ownership mismatch or additional organization association was found. |
| Business history preserved | PASS | All 57 relation fingerprints match the containment installation snapshot, including public business tables, Storage and the limited Auth inventories. Policy, relation-grant, schema-grant and unrelated-function fingerprints also match. |
| Existing refresh sessions | PASS — observation only | Zero target session rows, zero refresh-token rows, zero pending one-time token rows. This does not prove that no issued access JWT exists. |
| Scoped notification behavior | PASS | Production password-change/security notifications are off; no Auth hooks are configured. Custom SMTP is enabled. Global email delivery is **not** disabled. |
| Supported refresh-session retirement | PASS — source/catalog review | Exact production Auth health request returned HTTP 200 and `v2.197.0`; the versioned official implementation and live session FK establish the password-update revocation path below. |
| Privileged Auth execution credential | BLOCKED | No recognized production service-role/secret key is present in this task process. No privileged Auth request was attempted. |
| Actual retirement and post-retirement verification | NOT TESTED | Not authorized in this preparation task. |

The original record's nullable `currently_banned` value and the current FALSE both mean no active ban; this is not account drift.

This is a designated test account with retained history, not an assertion that it has never been used. Its last observed test-utility audit was 10 October, 16:23 UTC. Preserve its one accreditation term, one registration submission/six files, three budgets/three attachments, two liquidations/two attachments, YPOP records, 393 activity entries and 79 notifications. There are zero current renewal records. The current accreditation pointer resolves to the same organization's retained ledger term.

Full target IDs remain in [the restricted operator record](../affected-account-readonly.json), SHA-256:

`5f7f4312c0d27b40d21d8e2470789478c19a0273335c65ae59580a6628bfa98a`

That record is untracked but currently **not Git-ignored**. Keep it out of commits and external reports. The accompanying sanitized [preflight evidence](preflight-evidence.json) contains suffixes, counts and fingerprints rather than the legacy email, full target IDs or credentials.

## Supported official operation

Use a trusted server process with the exact origin `https://mqqaykksadotbrghbexz.supabase.co`, session persistence/automatic refresh disabled, redacted logging, and an account-specific request allowlist. Supply the production Auth Admin credential securely to that process; never put it in frontend variables, command arguments, evidence, SQL or chat. A custom Y-TRACE Admin session alone is not a Supabase Auth Admin credential.

Immediately before the one approved write, repeat the exact-record, containment, Auth version and notification checks. Perform official `auth.admin.getUserById` for the recorded ID and compare its identity/ownership baseline through read-only SQL. Stop on project, identity, classification, settings or version drift.

The single proposed mutation is:

```js
// REVIEW ONLY — not an executed command or a standalone runner.
// exactAuthUserId must come from the hash-verified restricted record.
const newPassword = 'Aa1!' + randomBytes(45).toString('base64url');
const { data, error } = await serverClient.auth.admin.updateUserById(
  exactAuthUserId,
  { password: newPassword, ban_duration: '876000h' }
);
```

This is a 64-character random password with required character classes, generated only in memory after approval and never displayed, persisted or delivered. `876000h` is the documented 100-year ban. Only these two attributes are allowed; omit email, phone, roles, metadata, confirmation flags and password hashes. [Official Admin update reference](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

For the observed `v2.197.0`, [Admin update](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/admin.go) calls `UpdatePassword(tx, nil)` and applies the ban inside one server database transaction. It does not invoke an invitation, recovery or confirmation-send workflow. The reviewed handler contains no password-change mail dispatch, and no custom UPDATE trigger exists on `auth.users`.

[Password update](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/models/user.go) clears the account's pending Auth challenge tokens and calls global logout. [Global logout](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/models/sessions.go) removes that user's sessions; the production `auth.refresh_tokens.session_id` foreign key has ON DELETE CASCADE. The ban is a separate login restriction, not the revocation mechanism.

**No password login or fabricated JWT is needed for this supported path.** Do not call `auth.admin.signOut` with a user ID; that API requires a genuine user JWT. If the deployed version changes or revocation cannot be verified, stop and review rather than automatically switching to the old fallback. [Official sign-out reference](https://supabase.com/docs/reference/javascript/auth-admin-signout).

## Required verification after a separately approved retirement

1. Record a sanitized HTTP status/request identifier. Require the exact returned user ID; do not print the returned user object, raw error text, password, headers or session material.
2. Independently read the exact account through Auth Admin and SQL: intended ban is active, account remains confirmed/not deleted, same provider identity, ownership, roles and metadata.
3. Require zero target Auth session and refresh-token rows, and zero pending one-time token rows. Do not retrieve token values. Use available Auth audit/platform evidence for the exact account and operation time, with private fields redacted.
4. Compare the saved target-business and public/Storage fingerprints. No business/history/ownership/Storage mutation is part of this operation. The exact Auth credential state, `updated_at`, ban, associated session/token cleanup and Auth audit evidence are the intended changes.
5. On timeout or ambiguous response, reconcile read-only and stop without retry. Unexpected surviving sessions or unrelated changes are a failure requiring investigation, not permission for direct Auth SQL deletion.
6. Preserve the account, accreditation, files and logs. Re-enabling a legitimate account in the future requires separate ownership review and authorization; never restore the embedded credential.

No live refresh token is held for an end-to-end revocation challenge, and no token has been created for testing. Current zero counts and a reviewed implementation are preparation evidence; actual retirement remains unexecuted.

Production access-token expiry is currently **3,600 seconds**. Existing access JWTs can remain usable until expiry at services that only validate signatures/expiry. Account retirement does not revoke already-issued Storage signed URLs. Monitor the configured JWT interval after retirement and respect each signed URL's own expiry. Do not rotate project-wide keys or claim instant universal revocation. [Session guidance](https://supabase.com/docs/guides/auth/sessions).

## Exact separate authorization required

> Authorize one production Auth Admin update for the single legacy test identity in the SHA-256-verified affected-account-readonly.json record (Auth ID ending 941f85), project mqqaykksadotbrghbexz: rotate to an unshared random password, apply the 876000h ban, allow the supported account-specific refresh-session/pending-token revocation, and perform read-only verification. Preserve all ownership and business/history records. No email flow, deletion or project-wide secret rotation.

Execution additionally requires a verified production Auth Admin credential delivered securely to a trusted server process. Do not paste it into chat.

## Separate document hotfix work

Credential retirement has not happened; the follow-up document-hotfix rebaseline is not started. After independent confirmation of retirement, recapture migration history and exact compatibility gates including the two containment triggers on document tables, then generate/review a new production-only candidate. The former hash `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785` must not be executed unchanged against the new catalog.

No application code or SQL was changed. Broad application tests and completed staging UAT were not repeated.

