# Production Storage foundation data-drift review

**Decision: CONDITIONAL GO for a separately authorized single-attempt foundation installation. No installation was performed.**

Production: `mqqaykksadotbrghbexz`. Branch: `ui-refactor`. HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.

The seven changes are corroborated as supported application activity. They consist of **two separate event chains**: one new Google Auth identity with its default profile/role and policy consent; one login by a pre-existing Super Admin with the matching session/audit. All original cohorts match their historical counts and recorded fingerprints. No privilege escalation or unexplained successful mutation was found within the reviewed scope.

The refreshed native `--preflight` passed with **57/57 protected inventories**, the exact production catalog, 164 migration records, TLS 1.3/PostgreSQL 17.6, required privileges and foundation absence. Production and staging remained read-only throughout.

## 1. Cause and legitimacy of each inventory change

Times below are UTC on 2026-10-11; add eight hours for Asia/Manila. No raw user/Admin IDs, names, addresses, passwords, JWTs or session tokens are included.

| Inventory | Old → new rows | Verified explanation |
| --- | ---: | --- |
| `auth.users_inventory` | 94 → 95 | A Google user was created at 14:36:56.059820. External Auth audit records `user_signedup` at 14:36:56.127681, with a one-way actor correlation matching this exact new identity. Auth role/audience are `authenticated`; not anonymous/banned; no Admin link or authorization metadata. |
| `auth.identities_inventory` | 95 → 96 | One Google identity at 14:36:56.122017 links to the same user. Provider email is verified and matches the Auth account. No second provider/identity was added for this user. |
| `public.user_profiles` | 94 → 95 | Profile at 14:36:56.049075 links to the new Auth user; email/name/display/contact values match the inspected signup trigger's inputs. Values were compared server-side and reported as booleans. |
| `public.user_roles` | 94 → 95 | The same user received the trigger's default `youth` role at 14:36:56.049075, zero permission codes, no assigning Admin. The live trigger ignores user metadata for role assignment. Existing role definitions and Admin accounts are unchanged. |
| `public.user_policy_acceptance` | 8 → 9 | Consent at 14:37:02.258320 links to that user and an active existing policy; terms/privacy are true. Gateway logs show an authenticated owner POST returning **201**; its JWT subject correlates to the reviewed identity. |
| `public.admin_sessions` | 483 → 484 | An active, password-enabled, pre-existing Super Admin logged in at 14:37:24.328655. Gateway logs show `authenticate_admin_account` POST **200**, permission-context POST **200** and session-refresh POST **200**. Session timing follows the configured 60-minute timeout with refresh activity. No token/hash value was retrieved into evidence. |
| `public.activity_logs` | 3333 → 3334 | One `admin_sign_in` at the exact session-creation timestamp, linked to the existing Admin. Its related resource/description match the inspected normal login workflow. The actor is explicitly **different from the new Auth user**. |

The profile/role timestamps are 11 ms before the Auth application's recorded creation timestamp. Their default-generated timestamps coincide, ownership/default values match the live AFTER INSERT trigger, and the external signup event follows within the same second. These observations do not imply a separate historical profile or a backdated fixture.

### Independent evidence

- Native read-only reconstruction of each original cohort, excluding records created/assigned after the original snapshot: **7/7 counts and content fingerprints match**. This supports no net change to pre-existing fields covered by the original inventories.
- Live `handle_new_auth_user()` inspected: creates the profile and default `youth` role; role-management RLS requires Admin authorization.
- Client OAuth flow: `src/pages/SignIn.tsx` invokes Google Auth. Consent flow: `src/hooks/use-policy-agreement.ts` inserts owner consent. Admin flow: `src/hooks/use-auth.tsx` invokes custom Admin login/permission/refresh RPCs.
- External platform logs inspected only for **14:36:30–14:38:00 UTC**, returning allowlisted paths/statuses, provider, roles and correlation booleans.
- The database query returned no matching Auth audit rows. The corresponding external Auth audit was available. Supabase documents database audit storage as optional alongside external logs. [Auth audit documentation](https://supabase.com/docs/guides/auth/audit-logs)

Two password requests in that window returned HTTP 400: `invalid_credentials` and `user_banned`. They granted no access. Their human intent and precise account attribution were not established or assumed; they do not account for the successful additions. They are retained in the redacted evidence.

This is a bounded workflow/preservation review, not attribution of physical human operators. Auth inventory projections do not include password hashes, tokens or every Auth column; no claim is made that unrecorded fields were forensically compared.

Full redacted activity and request evidence: [redacted-activity-evidence.json](redacted-activity-evidence.json).

## 2. Reviewed fresh baseline

Snapshot captured **2026-10-11T15:31:27.305Z** in an explicit repeatable-read, read-only transaction. That same snapshot rechecked the seven original cohorts, all reviewed new-record observations and the exact correlated new identity before acceptance.

| Artifact | SHA-256 |
| --- | --- |
| Original baseline, preserved at its original execution path | `36a039bb6455aeea0d31c2e9920c7279f5ad3144b9a132071fa8218b4249a771` |
| New baseline | `60a25f959aa2e45ab384cb41702f5eb13b93bdfe9ef71049b99eeceb5bde5d9a` |
| Original runner bundle, reconstructable from archived bytes | `69b01be6d530fc0539a44e05fa38c2962fa1b6cae289e063f77076a5518c61af` |
| Updated runner bundle | `481a2f5372bf28dd9b8bc04d8691aa5555ca9c5454cf07346012aaf065700fd9` |
| Foundation SQL, unchanged, 47,407 bytes | `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2` |

**50 inventories are unchanged**, including:

- 10 Storage buckets and 378 objects, including their complete recorded metadata fingerprints.
- Registration/renewal document metadata and submissions.
- Organization profiles, accreditation history and renewals.
- Budget, liquidation, YPOP files/records.
- Existing Admin accounts, settings and news/template reference data. Role definitions separately match the exact catalog fingerprint.

Every old/new relation count and fingerprint is recorded in [baseline-capture-verification.json](baseline-capture-verification.json). The actual new 57-inventory snapshot is [protected-data-baseline.json](protected-data-baseline.json).

## 3. Minimal local runner update

The runner hard-coded the original historical baseline filename and required the manifest to match that filename. Preserving the original execution evidence therefore required **one fixed baseline-path binding change** in `native-foundation-runner.mjs`, plus the corresponding `dataBaseline` manifest entry (path/size/hash).

No guard, comparison, SQL, timeout, lock, attempt marker, retry behavior, endpoint or installation-mode logic changed. `runner-core.mjs` is byte-for-byte unchanged. All seven other manifest inputs are unchanged.

The original manifest and both executable source byte sequences are archived here, with their original hashes. The historical baseline and all earlier reports remain untouched. The historical one-shot `prepare-reviewed-inputs.mjs` was not rerun; it is not the regeneration procedure for this refreshed bundle.

Updated binding/hash evidence: [updated-runner-review.json](updated-runner-review.json).

## 4. Validation

**36 PASS / 0 FAIL / 0 SKIPPED.**

- 25 existing offline runner tests: endpoint/CA guards, catalog/history/policy drift, privileges, authorization scope, exclusive locks, durable attempt markers, unchanged SQL/timeouts and no retry after uncertain results.
- 3 existing isolated PGlite/PostgreSQL tests: read-only enforcement, atomic rollback and rejection by the actual candidate's catalog gate. These test local transaction semantics, not a production installation.
- 8 new baseline-review tests: original artifacts preserved, one binding change only, new inputs/hash exact, seven justified appends, distinct actors, all 57 future fingerprints enforced, offline CLI and redacted evidence.

The drift test injects a change into **each of the 57 relations** and requires rejection. The old baseline still rejects the seven additions; no exception/allowlist was added to the installation runner.

Test output: [focused-tests.tap](focused-tests.tap).

`git diff --check` passed. Existing LF/CRLF warnings were retained without normalizing files. The private environment remains ignored/untracked with its restricted ACL. No installation authorization, attempt marker or operation lock exists. Local checks: [final-workspace-checks.json](final-workspace-checks.json).

### Fresh real native preflight

**PASS**, after fresh independent control-plane lookup; proof timestamp `2026-10-11T15:35:05.945Z`.

| Gate | Result |
| --- | --- |
| Exact production project/direct host; strict TLS 1.3 | PASS |
| Database/user `postgres`; PostgreSQL 17.6 (`170006`) | PASS |
| Exact catalog SHA-256 `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5` | PASS |
| 164 migrations; latest `20261011230000`; history MD5 `1f5eca911f6e2057ae070a955eaca3dc` | PASS |
| Containment/document protections, required ownership and privileges | PASS |
| 15 unchanged Storage policies | PASS |
| All 57 protected inventories against the refreshed snapshot | PASS |
| Foundation namespace/RPCs/triggers absent; no competing relevant transaction/lock observed | PASS |
| Installation activated | **No** |

Actual runner output: [native-readonly-preflight.json](native-readonly-preflight.json). Native connection setup and earlier PWA/UAT tests were not repeated. No TypeScript/Vite rerun was needed for this baseline-only change.

## 5. Separate installation prerequisites

1. Independently review this evidence, the fixed baseline binding, new baseline hash and new runner bundle.
2. Obtain fresh human production authorization naming the unchanged SQL hash, new runner bundle and native direct/TLS route. No authorization record was created here; the earlier MCP authorization is not reused.
3. Establish an exclusive low-traffic window covering schema/grant/repair operations **and protected-data writers**: Auth signup/signin/refresh, consent, Admin login/session refresh, business mutations and Storage uploads/deletes. Coordinate the window operationally; no configuration change is authorized by this report.
4. Refresh independent control-plane proof and rerun the exact native preflight immediately before any separately authorized attempt. Future drift must stop execution; never silently accept another baseline.
5. Retain the existing single-client, single-attempt submission, exact atomic SQL, 1-second lock timeout, 30-second statement timeout and migration-history behavior.
6. After any uncertain installation response, reconcile read-only and stop. Never resubmit automatically.

**Current readiness: CONDITIONAL GO for separate review/authorization. Foundation remains uninstalled.** No gateway deployment, Storage policy cutover, frontend release, Auth mutation, staging operation or Git push occurred.

