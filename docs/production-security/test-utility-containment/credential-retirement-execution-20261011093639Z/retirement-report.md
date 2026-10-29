# Production legacy Auth credential retirement

**Result: PASS — retirement confirmed.** Production `mqqaykksadotbrghbexz`. Executed 11 October 2026, approximately **17:38 Manila / 09:38 UTC**. Verified 2026-10-11 09:45:23 UTC.

One authorized official `auth.admin.updateUserById` request updated only the recorded legacy test Auth account ending `941f85`. Its request body contained only `password` and `ban_duration`. The random 64-character password was generated in the trusted Node process and never displayed or saved. The old embedded password was neither retrieved nor used. No password login was attempted.

## Preconditions and operation

| Check | Result | Actual evidence |
| --- | --- | --- |
| Exact production project and restricted target | PASS | Control-plane ID/database host match; restricted-record SHA-256 `5f7f4312c0d27b40d21d8e2470789478c19a0273335c65ae59580a6628bfa98a`; exact identity, email-provider relationship, test classification and organization ownership match. Full IDs remain in the existing restricted record. |
| Containment remains installed | PASS | Receipt `20261011230000`; guard FALSE; all 12 test-mutation RPCs remain disabled. Final definitions, permissions and Storage policies match preflight. |
| Secure Auth Admin credential | PASS | Read from the Git-ignored, untracked local environment file using a non-frontend variable; project/role/expiry checks and official read-only Admin GET succeeded. No credential was printed, copied into artifacts or exposed to the client. |
| Auth version and notifications | PASS | Health HTTP 200, `v2.197.0`; production password-change/security notifications remain off, no Auth hooks. SMTP remains enabled; global email delivery was not disabled. |
| Single authorized update | PASS | Exact-account **PUT HTTP 200**; one dispatched mutation; fresh official exact-account **GET HTTP 200** confirmed the result. The endpoint/field allowlist, durable attempt marker and single-request limit prevented alternative writes or retries. |
| Active ban | PASS | Exact `876000h` ban, independently confirmed in SQL until **2126-09-17 09:38:14.819768 UTC**. |
| Identity and account preservation | PASS | Original provider identity, email, roles, metadata, creation/confirmation timestamps and last sign-in fingerprint unchanged; ownership unchanged; account not deleted. |
| Session/token state | PASS | **0 Auth sessions, 0 refresh-token rows, 0 one-time tokens, 0 nonempty pending challenge-token fields.** |
| Unaffected Auth users | PASS | All **93 other accounts** retain the same safe inventory fingerprint and count. |
| Business/history and Storage | PASS | All **27 target-business relation fingerprints** unchanged. Of 57 global inventory fingerprints, **56 are unchanged**; the sole expected change is `auth.users_inventory`. Both Storage fingerprints, public business history, accreditation and document metadata are unchanged. |
| Scoped Auth/email workflow | PASS | Hosted Auth request logs show two exact-account GETs and exactly one PUT, all HTTP 200, plus one matching `user_modified` audit event. No other Auth workflow was observed in the bounded operation window. No invitation/OTP/recovery/confirmation call was made. |

The preflight records showed zero existing sessions, refresh tokens and pending challenges. Post-operation zero counts establish no remaining rows, not a live refresh-token replay test. The deployed implementation's password-update path revokes account sessions within its transaction; the live refresh-token FK cascades session deletion. A ban alone is not the session-revocation mechanism. [Reviewed Auth implementation](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/models/user.go).

## Independent audit and verification notes

Auth event evidence comes from the **hosted Auth logs/audit stream**. `auth.audit_log_entries` returned no matching table rows; this limitation is recorded rather than inventing a database audit receipt. The hosted stream independently records the one intended `user_modified` operation.

The first local log validator incorrectly required JSON boolean `true`; ClickHouse returned numeric `1`. The initial failed check is preserved in [auth-log-initial-validation.json](auth-log-initial-validation.json). Strictly accepting only `true` or `1` resolved that representation mismatch against the same saved response. No Auth request or mutation was repeated.

The SMTP provider's delivery receipts were not inspected. Scoped confirmation relies on the reviewed handler, disabled security-email notifications, absent hooks, restricted request trace and hosted Auth event evidence. This is not a claim that production sent no email globally.

## Residual exposure and stop boundary

Production access-token expiry remains **3,600 seconds**. A previously issued JWT may remain usable until its own expiry at services that only validate signatures/expiry. No claim of immediate universal JWT invalidation is made. Existing Storage signed URLs also retain their own expiry; password rotation and banning do not revoke them. [Supabase session guidance](https://supabase.com/docs/guides/auth/sessions).

All account ownership, business records, accreditation history, files and audits are preserved. No SQL migration, document-security hotfix, Storage change, frontend deployment or Git push occurred. No further production action is authorized or attempted.

The document-security hotfix requires its separate catalog rebaseline/review and authorization. It was not started automatically.

## Evidence

- [Preflight](preflight.json)
- [Official Auth operation and fresh Admin read](auth-operation-result.json)
- [Independent SQL and hosted Auth verification](verification.json)
- [Single-attempt marker](attempt.json)
- [Executed server-only runner](retire-once.mjs), SHA-256 `91aee6201b7d0451a1c56827c321930bf890542a3724d6e42e335b7ddfaed742`

The attempt marker is durable, and the short-lived execution gate is expired. Preserve these artifacts; do not rerun the operation.

