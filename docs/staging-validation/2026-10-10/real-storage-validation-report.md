# Y-TRACE staging: real Storage authorization validation

Date: 10 October 2026 (Asia/Manila). Target: `zroudsvpswqsjlyttkjf` only.

## Decision

**BLOCKED for complete security sign-off and production rollout.** Genuine staging Auth identities, custom Admin sessions, public asset workflows, and gateway authorization were exercised over HTTP. Organization profile initialization failed because staging is missing a required private identity-verification schema. Private organization-file tests consequently remain blocked. Passing template/news tests do not prove organization-file isolation.

No production requests, schema reconstruction, migrations, bucket recreation, bootstrap reruns, frontend deployment, or Git push occurred. Existing performance/security/identity changes were preserved.

## Repository and initial state

- Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- The initial working tree already contained extensive modified/untracked performance, Storage security, identity, test, documentation, and generated build files. They were not discarded or overwritten.
- Initial staging state: one activated synthetic Super Admin, zero Auth users/identities, zero organization profiles/private workflow records, ten buckets, zero Storage objects, and zero active custom Admin sessions.
- Reviewed the prior `synthetic-storage-validation-report.md` and the existing preflight, isolation, and gateway test scripts before extending the test tooling.

## Email and credential isolation

Provisioning used official Auth Admin `createUser` with `email_confirm: true`, generated passwords, reserved `example.invalid` emails, and service-controlled synthetic app metadata. No invitation, signup-email, recovery-email, or notification delivery endpoint was called. Normal password login was used afterward.

Read-only staging function/trigger inspection found no application email/HTTP dispatch in the examined Auth creation and notification paths. Auth user creation initializes local profile/role records; application notifications are in-app. The only deployed Edge Function is the existing Admin Storage gateway. This establishes isolation for the executed task paths; **global SMTP delivery configuration was not independently certified disabled**.

Only `.env.staging.local` was loaded. Every scripted HTTP request was restricted to the exact staging HTTPS origin, with redirects rejected. No production `.env` was loaded. Service-role privileges were used for fixture inventory/Auth creation and the explicitly labeled expired-session fixture, never for Organization A/B authorization assertions.

Generated fixture passwords and IDs are retained in `.ytrace-staging-fixtures.local`. Both local credential files are Git-ignored and untracked. The fixture journal's Windows ACL has inheritance disabled and allows only the current user, SYSTEM, and Administrators. Reports contain no passwords, API keys, JWTs, Admin session tokens, or signed URLs. Session tokens were not persisted to the fixture journal.

## Actual provisioning result

| Fixture | Status | Actual state / evidence |
|---|---|---|
| Original `staging-super-admin` | PASS | Preserved active, password set, existing `super_admin` role; normal login/permission context worked |
| Organization A candidate | PASS | `ytrace-org-a@example.invalid`; Auth create/get HTTP 200; genuine password login HTTP 200 |
| Organization B candidate | PASS | `ytrace-org-b@example.invalid`; Auth create/get/login HTTP 200 |
| Suspended organization candidate | PASS | `ytrace-org-suspended@example.invalid`; Auth create/get/login HTTP 200; **Auth identity only, not a suspended organization profile** |
| Organization A profile initialization | FAIL | Owner-JWT `POST /rest/v1/organization_profiles` returned HTTP 400, SQLSTATE `3F000` |
| Organization B and suspended profiles | BLOCKED | No profile writes attempted after the confirmed shared identity dependency failure |
| Registration/renewal/budget/liquidation/YPOP parents | BLOCKED | Required owning organization profiles do not exist; no orphan parent records were inserted |
| Zero-permission Admin | PASS | `staging-no-permissions`, created by normal Admin account RPC, activated through `set_initial_admin_password`, logged in through `authenticate_admin_account`; existing `organization_user` role has `permission_codes=[]` |

The zero-permission Admin uses one additional preconfirmed synthetic Auth identity, `ytrace-staging-no-permissions@example.invalid`, retained for follow-up tests. No role or permission definition was created or changed. The original Super Admin bootstrap was never executed.

### Profile failure: independently verified cause

Read-only staging SQL confirmed all of the following:

1. `to_regnamespace('ytrace_identity') IS NOT NULL` is **false**.
2. `to_regprocedure('ytrace_identity.assess(public.organization_profiles)') IS NOT NULL` is **false**.
3. The installed `guard_organization_identity_verification()` body calls `ytrace_identity.assess(new)` through the active organization identity trigger.
4. Organization A's authenticated profile INSERT failed before creating a row.

Staging lacks a private identity-verification dependency while retaining the public trigger function that calls it. This confirms a schema-completeness failure; attribution to the earlier schema reconstruction is an inference from that state. No trigger was disabled, no profile was inserted with a privileged bypass, and no missing helper was stubbed.

The first local preparation also encountered a credential-journal ACL-tool failure **before any Auth creation**. That local issue was corrected with native Windows ACL tooling, and its sanitized report is retained. It is separate from the subsequent live profile failure. No failed profile initialization was retried.

## Real HTTP authorization results

### Admin gateway: 11 PASS, 0 FAIL

Executed the previously prepared `test-admin-storage-gateway.mjs` against real staging objects and genuine custom Admin sessions. [Detailed HTTP evidence](real-storage-validation/admin-signing.json).

| Case | Status | Actual HTTP / assertion |
|---|---|---|
| Authorized Super Admin signs active template | PASS | Gateway 200, signed download 200, SHA-256 matches |
| Authorized Super Admin signs published news image | PASS | Gateway 200, signed download 200, SHA-256 matches |
| Genuine zero-permission Admin, both assets | PASS | Gateway 403 for each |
| Genuine expired Admin session, both assets | PASS | Gateway 403 for each |
| Genuine revoked Admin session, both assets | PASS | Gateway 403 for each |
| Invalid token, both assets | PASS | Gateway 403 for each; explicitly an invalid token, not a fabricated valid session |
| Valid Super Admin requests unbound arbitrary template object | PASS | Gateway 403 |

Revoked and expired sessions also returned no valid account through `validate_admin_session_token` (RPC HTTP 200 with an empty authorized result). Expiry setup shortened only one freshly created genuine test session, selected by exact Admin ID and SHA-256 token hash, and required exactly one updated row. It did not extend a session or alter account permissions.

### Independent public-asset checks

[Evidence](real-storage-validation/independent-tests.json) contains **31 PASS and 7 BLOCKED result rows**. These rows include fixture setup, login, suite invocation, and session cleanup; they must not be described as 31 independent authorization assertions or added to the gateway total as unique tests.

| Case | Status | Actual HTTP / assertion |
|---|---|---|
| Template metadata creation and upload through Admin gateway | PASS | Metadata RPCs 200, upload grant 200, signed upload 200 |
| News image upload and publication through supported Admin workflows | PASS | Grant/upload/metadata RPC 200 |
| Anonymous active-template download | PASS | Storage download 200; exact expected SHA-256 |
| Anonymous published-news download | PASS | Storage download 200; exact expected SHA-256 |
| Public news-image URL | PASS | GET 200; exact expected synthetic bytes |
| Anonymous template/news INSERT | PASS | Both Storage requests HTTP 400 with denied operation |
| Organization A JWT template/news INSERT | PASS | Both HTTP 400 with denied operation; no service-role impersonation |
| Anonymous and Organization A JWT template/news UPDATE | PASS | All four HTTP 400; subsequent HTTP 200 downloads retain original hashes |
| Anonymous and Organization A JWT template/news DELETE | PASS | Storage returns HTTP 200 with no deleted objects; subsequent downloads/hashes prove all four attempted deletions had no effect |
| Zero-permission Admin template/news upload grants | PASS | Both gateway requests HTTP 403 |

An HTTP 200 alone was never treated as successful authorization denial: DELETE assertions checked the returned deleted-object list and unchanged original content.

### Private organization authorization matrix

The prepared `test-storage-isolation.mjs` was reviewed and extended with sanitized HTTP evidence, but **not executed**: no valid owned private objects or parent records exist. Testing nonexistent paths would not prove isolation.

| Resource / operation | Own organization | Other organization | Anonymous | Suspended organization | Authorized Admin |
|---|---|---|---|---|---|
| Registration document read/sign/download | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Registration upload/replacement/deletion locks | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Renewal document read/upload/lifecycle | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Budget attachment read/upload/download | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Liquidation attachment read/upload/download | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| YPOP proof read/upload/download | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MOVE private documents | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

The suspended candidate has no application suspension state to assert. Private document hash validation is likewise BLOCKED. Neither unit mocks nor public-asset gateway successes substitute for these tests.

## Retained files and final database state

Exactly two small, clearly labeled test objects exist:

| Bucket | Visibility | Objects | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `template-files` | Private bucket; active template public-read policy | 1 | 637 | `a84bb5413690f2fb44c1ad69bfcacca289940bd03ab44bd35605b1e7fcc1612d` |
| `news-release-images` | Public | 1 | 68 | `10c748c65ed61863df4836499e79764b3506929f28a5e29065f8682cafaf8ea6` |

Final independent read-only checks:

| Item | Actual |
|---|---:|
| Expected staging buckets | 10: six private, four public |
| Storage objects | 2, both above |
| Synthetic Auth users / linked identities | 4 / 4 |
| Active Auth sessions | 0 |
| Custom Admin accounts | 2 |
| Original active, activated Super Admin | 1 |
| Active custom Admin sessions | 0 |
| Organization profiles | 0 |
| Registration submissions / budgets / liquidations / YPOP entries | 0 / 0 / 0 / 0 |
| `ytrace_*` Storage policies | 6 |

All test sessions were closed. Accounts, metadata, file objects, and audit/session history were preserved; no broad cleanup was performed.

The six existing Storage policies remain `ytrace_active_templates_read`, `ytrace_news_images_read`, `ytrace_private_organization_delete`, `ytrace_private_organization_insert`, `ytrace_private_organization_read`, and `ytrace_published_profile_avatar_read`. The three retained seed/transparency policies are unchanged. The transparency write policy still explicitly requires `current_user_is_admin()`; its public role does not mean unconditional write access.

Before/after read-only checks found unchanged Storage-policy, role-definition, and gateway-authorizer fingerprints:

- Storage policies: `9d0db3141ff03e8ebba9c1614a67338b`
- Role definitions: `6f12b91d6db645649d319d5dff911c32`
- Gateway DB authorizer: `bc17ff58b1bcc636d0d6320ccc2e3b33`

The existing `admin-storage-access` deployment was not changed. The separate 33-policy RLS performance migration remains unapplied.

## Local changes and validation

New local staging tooling:

- `scripts/staging/synthetic-validation-common.mjs`: exact-target network guard, redacted evidence, private credential journal, genuine login helpers, deterministic small PDF fixture.
- `scripts/staging/provision-synthetic-security-fixtures.mjs`: journaled Auth/profile/parent preparation with guarded phases; dependent workflow phase was **not executed**.
- `scripts/staging/run-available-security-tests.mjs`: independent real gateway/public-asset tests with genuine Admin/organization sessions and narrowly scoped fixture setup.
- `scripts/staging/synthetic-validation-common.test.mjs`: local guard/redaction/PDF tests.
- Existing `test-storage-isolation.mjs` and `test-admin-storage-gateway.mjs`: preserved assertions, added staging-only network guard and sanitized response/timing evidence. The isolation runner validates both credentials before login and closes only its own Auth sessions in `finally`; actual private-object execution remains blocked.

No application frontend, authorization migration, deployed function, or policy was edited in this task.

| Validation | Result | Evidence |
|---|---|---|
| Script syntax | PASS | New runtime scripts and both extended prepared scripts checked |
| Node staging/bootstrap safety tests | PASS | 53 passed, zero failed; tests import safety helpers, do not run bootstrap; [output](real-storage-validation/node-safety-tests.txt) |
| Focused Storage Vitest | PASS | 52 passed, zero failed, five files: signing cache, resolver, Admin access, and production network guard; [JSON](real-storage-validation/vitest-storage-focused.json); local tests, not live authorization evidence |
| TypeScript | PASS | `npx tsc --noEmit`, exit 0 |
| Isolated production-mode Vite build | PASS | Vite 5.4.19, 49.95 seconds; placeholder env and separate output under `tmp/staging-validation-build-20261010`; existing large-chunk/outdated Browserslist warnings |
| Full repository Vitest | FAIL | Completed: **2,211 passed, 150 failed, 2,361 total assertions, 205 files, zero collection errors**; [raw JSON](real-storage-validation/vitest-full.json) |
| Diff whitespace | PASS | `git diff --check`, exit 0; existing CRLF/fsmonitor warnings are separate |

Build validation did not contact Supabase or overwrite existing `build/`. It is not a deployed frontend or a measured browser performance result. No performance percentage or production authorization claim follows from these tests.

### Full-suite baseline comparison

All **150 current failing assertions** also failed in both the saved HEAD `2f6e742` run and the previous readiness run, matching by source-file path and full assertion name. There were **zero current failures not observed in those saved baselines**. [Comparison with individual names](real-storage-validation/vitest-baseline-comparison.json).

The saved HEAD run was 2,126 passed / 164 failed; previous readiness was 2,170 passed / 151 failed with one collection error. The baseline was **not rerun** during this task. These comparisons identify previously observed failures; they do not certify those defects harmless or explain every count difference across differing test discovery. Current failure areas include Admin lifecycle/settings, renewal fixtures, filters/reporting, YPOP components, session/inactivity behavior, and older UI expectations. No unrelated production logic or meaningful assertion was changed to make these failures pass.

## Remaining production rollout blockers

1. Separately review and repair the omitted **staging** private identity schema/dependencies from authoritative schema evidence. This task did not authorize migration or reconstruction. Do not disable the trigger, stub its verdict, or bypass validation.
2. Prepare a guarded continuation using the existing recorded Auth identities and current four-identity journal. Do not rerun the empty-baseline actor phase or bootstrap. Existing workflow preparation is not a certification that parent initialization will succeed.
3. Create valid profiles and actual suspension state, then initialize registration/renewal/budget/liquidation/YPOP parents through supported owner/Admin workflows. Stop on any new integrity constraint.
4. Execute real A/B/anonymous/suspended authorization for every applicable private bucket and operation; verify positive own-file access, negative cross-file access, lifecycle locks, and content hashes. Exercise gateway signing for private organization resources with correct and incorrect permissions.
5. Complete authenticated website, installed PWA, account-switch, status synchronization, and slow-network/TUS interruption tests with the preserved fixtures. Public/gateway API tests do not certify those UI paths.
6. Resolve or explicitly triage full-suite failures against the recorded baseline; passing compile/build does not make the repository regression suite green.
7. Review controlled production rollout/deployment order separately. No production write authorization is implied. Previously issued signed URLs remain valid until server expiration; cache clearing/session revocation does not retroactively invalidate them. Gateway validity remains 3,600 seconds, unchanged by this task.

**Recommendation:** keep production rollout on hold. The executed independent assertions passed, but normal organization initialization currently fails and the required private-document security evidence is missing.

## Evidence index

- [First local ACL preparation blocker](real-storage-validation/provision-actors-local-acl-blocker.json)
- [A Auth creation and failed owner profile request](real-storage-validation/provision-actors.json)
- [Remaining Auth-only provisioning](real-storage-validation/provision-remaining-auth.json)
- [Independent real HTTP tests](real-storage-validation/independent-tests.json)
- [Prepared gateway suite: 11 PASS](real-storage-validation/admin-signing.json)
- [Final independent staging inventory](real-storage-validation/final-inventory.json)
- [Full Vitest results](real-storage-validation/vitest-full.json)
- [Saved-baseline failure comparison](real-storage-validation/vitest-baseline-comparison.json)

Evidence omits URL query strings, signed URL tokens, credential values, request bodies, and private production records. Only fictional staging fixtures were accessed.
