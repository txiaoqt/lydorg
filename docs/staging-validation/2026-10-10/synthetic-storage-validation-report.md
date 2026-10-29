# Y-TRACE Synthetic Storage Validation — 2026-10-10

## Result

**Production rollout recommendation: NOT READY FOR SECURITY SIGN-OFF.** The current staging schema and Storage cutover pass a read-only preflight, and the local cache/gateway regression tests pass. The requested live Organization A/B, anonymous, Admin-gateway, and workflow tests are **BLOCKED** because this task session has neither a staging-only service-role credential nor an authenticated staging Auth/Storage/Edge Function control channel. No synthetic actors, workflow records, or Storage objects were created.

Production was not used as a test target. No production request or write was made.

## Repository and preservation

- Branch: `ui-refactor`
- HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`
- The working tree was already substantially dirty before this task. Existing performance, Storage remediation, identity-verification, migration, test, report, and generated `build/` work was preserved; no reset, checkout, or cleanup was run.
- Local changes made specifically for this task: the mobile YPOP close-control test correction; `scripts/staging/verify-synthetic-staging-preflight.mjs`; `scripts/staging/test-storage-isolation.mjs`; and `scripts/staging/test-admin-storage-gateway.mjs`.
- `npm run build` refreshed the tracked `build/` output. Those generated artifacts were left in place to preserve the shared worktree.

## Staging read-only preflight

Verified against the exact project reference `zroudsvpswqsjlyttkjf` (`ytrace-staging`, `ACTIVE_HEALTHY`, `ap-northeast-2`, `https://zroudsvpswqsjlyttkjf.supabase.co`):

| Check | Result | Evidence |
|---|---|---|
| Project identity and region | PASS | Supabase project metadata read |
| Required Storage buckets | PASS | Live bucket metadata: exactly 10 expected buckets; six private and four public; no bucket size or MIME restrictions |
| Storage objects | PASS | Live metadata query: 0 objects |
| Storage policies | PASS | Read-only live catalog query: 9 policies; six restrictive `ytrace_*` policies present; 12 named vulnerable legacy policy names absent |
| Foundation and cutover | PASS | Live migration history contains `20261009190941` (`staging_storage_authorization_foundation_20261010`) and `20261009191528` (`staging_storage_authorization_cutover_20261010`) |
| Auth identities | PASS | Live count: 0 Auth users |
| Organization profiles | PASS | Live count: 0 |
| Admin accounts | PASS | Live count: 0 |
| Budget/liquidation workflow records | PASS | Live counts: 0 |
| Admin Storage gateway | PASS | Control-plane metadata: `admin-storage-access` ACTIVE, v1; deployment hash unchanged from the validation report |
| Production | NOT TESTED | No production access used; production remains strictly outside this test |

Four role definitions and 22 other static/reference rows (required document types, YPOP period, and budget purpose categories) are present. They are configuration, not unexpected synthetic users or workflow data. The older staging deployment report that said the buckets were absent is stale; the fresh read-only check above supersedes it.

Verified bucket inventory (actual storage object count per bucket):

| Bucket | Actual public setting | Objects |
|---|---:|---:|
| `organization-documents` | No (private) | 0 |
| `budget-request-files` | No (private) | 0 |
| `liquidation-report-files` | No (private) | 0 |
| `ypop-files` | No (private) | 0 |
| `move-files` | No (private) | 0 |
| `template-files` | No (private) | 0 |
| `news-release-images` | Yes (public) | 0 |
| `brand-logo` | Yes (public) | 0 |
| `registration-seed-file` | Yes (public) | 0 |
| `transparency-attachments` | Yes (public) | 0 |

Restrictive policy names observed: `ytrace_private_organization_read`, `ytrace_private_organization_insert`, `ytrace_private_organization_delete`, `ytrace_published_profile_avatar_read`, `ytrace_active_templates_read`, and `ytrace_news_images_read`. The three retained unrelated policies were left unchanged. The deployed gateway hash was `564d0b5ceab9a63e8b81a824382fe565f045f1f794d3d9120b2fb5e9dc67fc8e`.

## Local implementation and regression evidence

The signed URL cache remains in-memory and session-context scoped, deduplicates same-context in-flight work, expires frontend reuse after one minute, and does not permanently cache failures. Clearing the cache does not revoke an already-issued signed URL. The Admin gateway currently requests Storage URLs with a 3,600-second server expiry; this was not changed because the real preview/download duration tests could not be run.

The earlier YPOP failure was an outdated mobile assertion. Desktop exposes “Close Drawer”; mobile uses an accessible “Close modal” icon button. The test now checks that actual mobile control and verifies that clicking it requests `onOpenChange(false)`. No production UI behavior was changed.

| Validation | Result | Evidence level |
|---|---|---|
| Signed URL cache tests | PASS — 15 | Mocked/local unit tests |
| Admin Storage access tests | PASS — 19 | Mocked/local unit tests |
| Signed URL integration tests | PASS — 9 | Local integration tests with mocked Supabase boundary |
| Admin Storage resolver integration tests | PASS — 5 | Local integration tests with mocked Supabase boundary |
| PWA avatar Storage tests | PASS — 2 | Mocked/local component tests |
| Resumable registration upload tests | PASS — 24 | Mocked/local unit tests |
| YPOP submission workflow tests | PASS — 24 | Mocked/local component/workflow tests |
| Focused total | PASS — 98 tests in 7 files | No live staging Storage/Auth calls |
| `npx tsc --noEmit` | PASS | Local |
| `npm run build` | PASS | Local Vite build; completed in 44.18s |
| `git diff --check` | PASS | Local; Git printed existing LF/CRLF normalization warnings |
| Full repository Vitest suite | NOT TESTED | An attempt was started but stopped before Vitest wrote a complete summary; partial output surfaced failures in unrelated suites, so they are not classified as regressions or baseline failures here |

The build reports some chunks larger than 500 kB (including the Admin portal and ExcelJS chunks). This is build-output evidence only; authenticated browser traffic, transfer bytes, latency, idle egress, and Storage request counts were not measured.

Partial full-suite output included failures in `admin-pdf-sample-generation`, `organization-renewal-phase3d`, `UserPortalResponsiveWorkspace`, `BudgetMonitoringOverview`, `YorpRegistry.accreditation`, `budget-monitoring-filters`, `admin-inactivity`, `admin-review-decision-help`, and `ytrace-policy`. The full run was not completed, so the total and cause of these failures are unknown. They need a completed run and comparison against the correct baseline before any code changes.

## Live authorization and workflow results

The following required test groups are **BLOCKED**, not passed:

| Test area | Status | Why |
|---|---|---|
| Real Auth user provisioning / JWT sign-in | BLOCKED | No staging-only service-role key or Auth Admin API tool is available to this task |
| Organization A/B Storage isolation | BLOCKED | No real staging Auth JWTs or synthetic parent records/files |
| Anonymous private Storage denial | BLOCKED | No authenticated Storage API invocation channel is available |
| Suspended organization access | BLOCKED | No actor/profile to represent the suspended workflow state |
| Admin signing gateway | BLOCKED | `admin_accounts` is empty; there is no real custom Admin session. The available function tool can deploy/retrieve but cannot invoke the deployed endpoint. The normal invite RPC requires an existing authorized Admin and may send email; it was not called. |
| Registration, renewal, budget, liquidation, YPOP, MOVE lifecycle | BLOCKED | No synthetic records or files; end-to-end writes require an authorized staging client and supported workflow actions |
| Template, news image, avatar real access | BLOCKED | No real Storage API credentials/session to verify upload, sign, or download |
| Browser/PWA, account switching, slow network/TUS | NOT TESTED | No staging-authenticated browser session was available |
| Request counts, latency, bytes, egress | NOT TESTED | No authenticated browser/network instrumentation was run |
| Postgres policy authorization matrix | NOT TESTED | Read-only policy presence was verified, but no isolated actor sessions were available to exercise PostgreSQL RLS operations |

No test used service-role credentials to impersonate an organization. No real email was sent. No test tried private production objects.

## Safe preflight script

Added three staging-only scripts:

- `scripts/staging/verify-synthetic-staging-preflight.mjs` hard-rejects any URL/ref other than the exact staging project, does not load `.env`, makes read-only requests, checks the bucket set/settings/object inventory and pristine Auth/application counts, bounds object enumeration, and never prints keys or request errors. Syntax validation passed. Running without credentials exits before making a network request with a clear `BLOCKED` message, as expected in this task environment.
- `scripts/staging/test-storage-isolation.mjs` uses real Organization A/B password sign-in and real Storage download/sign requests. It verifies each synthetic file by SHA-256 and checks cross-org and anonymous denial. It is read-only and requires already-provisioned synthetic accounts/files.
- `scripts/staging/test-admin-storage-gateway.mjs` sends real sign requests to the exact staging function endpoint using actual custom Admin session tokens supplied by environment-variable name. Allowed cases download and hash-verify the synthetic file; denied cases must not return a URL. It never prints tokens or URLs. Any mistakenly issued URL remains valid until its server expiry; test only with disposable synthetic staging files.

The latter two scripts passed Node syntax validation but could not run because no identities, synthetic files, or secrets are available. They do not provision Admins, profiles, or business workflow records.

To run it later from PowerShell after setting **staging-only** values in the current terminal process:

```powershell
$env:YTRACE_STAGING_SUPABASE_URL = 'https://zroudsvpswqsjlyttkjf.supabase.co'
$env:YTRACE_STAGING_PROJECT_REF = 'zroudsvpswqsjlyttkjf'
$env:YTRACE_STAGING_SERVICE_ROLE_KEY = '<staging-only service-role key>'
node scripts/staging/verify-synthetic-staging-preflight.mjs
```

Do not put the production key in these variables or use the root production `.env`. This preflight is read-only; it does not provision accounts or run Storage authorization assertions.

After staging actors and files are created through the authorized workflows, the Organization A/B script takes JSON arrays of `storage://bucket/path` references with expected SHA-256 hashes. The Admin gateway script takes actual token values in separate environment variables and JSON cases that refer to those variable **names** (not token values):

```powershell
$env:YTRACE_STAGING_ANON_KEY = '<staging publishable/anon key>'
$env:YTRACE_STAGING_ORG_A_EMAIL = 'org-a@example.invalid'
$env:YTRACE_STAGING_ORG_A_PASSWORD = '<unique synthetic password>'
$env:YTRACE_STAGING_ORG_B_EMAIL = 'org-b@example.invalid'
$env:YTRACE_STAGING_ORG_B_PASSWORD = '<unique synthetic password>'
$env:YTRACE_STAGING_ORG_A_OBJECTS_JSON = '[{"storageUri":"storage://organization-documents/<org-a-test-path>","sha256":"<64-hex-digest>"}]'
$env:YTRACE_STAGING_ORG_B_OBJECTS_JSON = '[{"storageUri":"storage://organization-documents/<org-b-test-path>","sha256":"<64-hex-digest>"}]'
node scripts/staging/test-storage-isolation.mjs

$env:YTRACE_STAGING_ADMIN_TOKEN_SUPER = '<genuine staging custom Admin session token>'
$env:YTRACE_STAGING_ADMIN_STORAGE_CASES_JSON = '[{"label":"Super Admin synthetic document","tokenEnv":"YTRACE_STAGING_ADMIN_TOKEN_SUPER","bucket":"organization-documents","path":"<org-a-test-path>","resourceId":"<synthetic-resource-uuid>","fileName":"synthetic-document.pdf","expected":"allow","sha256":"<64-hex-digest>"}]'
node scripts/staging/test-admin-storage-gateway.mjs
```

These are placeholders: use only real staging-created test actors, exact synthetic object references and hashes, and session tokens created by the normal staging Admin login. Set the common target variables from the preflight instructions first. Do not put token values inside JSON case definitions, reports, or Git. The Admin script’s allowed case creates a short-lived signed URL and downloads only the specified synthetic object.

## Blockers to completing the authorized synthetic test

1. Supply a staging-only service-role key securely to the local terminal process and a staging publishable/anon key for real organization clients. Do not paste secrets into chat.
2. Provide or establish a safe first Super Admin in staging. `admin_accounts` has zero rows, while normal Admin invitation requires an existing Admin session with the proper permission. Do not bypass this with a fabricated session token.
3. Confirm staging outbound email is disabled or routed to a test sink before invoking any invite flow; this has not been verified.
4. Run the official Supabase Auth Admin, Storage SDK, and Admin gateway HTTP tests using the resulting genuine staging identities and documented workflow-created parents. Current MCP access supports project/database inspection but not Auth user creation, Storage API requests, or Edge Function invocation.

Until those steps are available, Authorization Matrix, document lifecycle, and rollout acceptance remain unproven. No migration or policy change is recommended from this run. Keep the separate 33-policy performance migration unapplied.

## Final recommendation

The repository is locally buildable and the focused cache, upload, gateway-boundary, PWA-avatar, and YPOP regression suites pass. Staging is correctly isolated and has the restrictive Storage cutover in place. **Do not treat this as production Storage security sign-off:** actual Auth, Storage RLS, custom Admin token, object lifecycle, and browser/PWA tests have not been exercised against staging.
