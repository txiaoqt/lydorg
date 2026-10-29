# Production-compatible frontend release readiness

Review date: 2026-10-12. Production: `mqqaykksadotbrghbexz`. Branch: `ui-refactor`. Local HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.

## Decision

**NO-GO for promoting the current frontend candidate.** A narrow resolver correction is required before it satisfies the requested no-direct-fallback boundary. The compatible release also needs an isolated, tested source revision; the full dirty working tree is not an approved release artifact.

The already deployed foundation and gateway remain prerequisites that have passed their independent verification. No new database, Auth, gateway or Storage operation was needed or performed in this assessment. The completed acceptance helper was not rerun.

## 1. Actual production targets and deployed version

| Surface | Production target | Vercel project / operator-designated deployment | Current public build evidence |
|---|---|---|---|
| Admin | https://y-trace-admin.vercel.app | `toffs-projects-81b2ce10/lydorg`, deployment `3xkY2hTr9ght98vNXqrjZTtrEPCQ`; immutable host `lydorg-gdb25hm7m-toffs-projects-81b2ce10.vercel.app` | HTTP 200; embedded version `1.0.0+20261008175317.2f6e742`; entry `index-O-y4BvcB.js` |
| Organization website, public website and user PWA | https://ytrace.app | `toffs-projects-81b2ce10/yorbms_user`, deployment `HGFE2BwongbW7ncM4kn6cQ48ffeV`; immutable host `yorbmsuser-e2bgtj2bj-toffs-projects-81b2ce10.vercel.app` | HTTP 200; embedded version `1.0.0+20261008175023.2f6e742`; entry `index-BUidbxI_.js` |

Public HTML and its same-origin entry JS/CSS were fetched on `2026-10-12T01:23:09Z` without executing the application, supplying authentication, or calling Supabase. Both entries contain the production Supabase reference and an ordinary anon JWT; neither entry contains `admin-storage-access`. No service-role JWT or `sb_secret_` credential was detected in these inspected entry assets. This is a bounded scan, not proof about every possible secret or deployed server file.

GitHub's `main` points to full commit `2f6e7427c553b7535f53860d1732b42df7c023e8`; its two successful Vercel checks link to the exact deployment IDs supplied by the operator. This corroborates the live embedded short commit. Both immutable hosts redirect to Vercel authentication. The local Vercel CLI cannot read current project metadata with its available credentials. Consequently the current domains, served versions and asset hashes are directly verified; the current provider-side alias assignment, root directory, environment settings and complete immutable bundle are **BLOCKED** pending operator/provider verification. A client version string alone is not cryptographic proof of an entire deployment's source.

The remote `ui-refactor` branch was not found by the GitHub branch endpoint. The local branch and HEAD must not be treated as already containing or deploying the dirty changes. No new release commit exists.

See `live-frontend-evidence.json` for exact public asset fingerprints and evidence limits.

## 2. Deployment-critical resolver finding

**Confirmed source behavior; no unauthorized production file request was performed.**

In `src/lib/lydo-connect-supabase.ts:6378`, `readActiveStorageAdminSession()` returns null both outside Admin routes and on an Admin route without a valid custom session. `readStorageAuthorizationContext()` then falls through to the organization/anonymous Supabase Auth context. At line 6419, the signer chooses the gateway only when that session helper is truthy. Otherwise line 6424 calls `storage.createSignedUrl()` directly.

Thus a private reference resolved on `/admin/...` with no valid custom Admin session can attempt direct Storage signing. The still-permissive production policies can authorize that separate request. Existing route gates and expiry events reduce ordinary UI reachability, but do not make this resolver fail closed. The 56 passing tests do not cover this missing-session branch. Gateway denial with a valid supplied Admin session already has a passing no-fallback test; that is a different branch.

### Exact required correction, for separate implementation review

Limit the correction to the shared resolver and its existing integration tests:

1. Determine Admin-route intent independently of whether `readAdminSession()` returns a session.
2. For the seven gateway-supported buckets on an Admin route, require the custom session and use the gateway, or return a safe failure. Never switch to organization/anonymous signing because the custom session is absent, invalid, expired or changes during resolution.
3. Preserve organization/public-route signing through their actual Supabase principal. Preserve published news/public asset rendering and existing metadata references.
4. Retain cache invalidation, concurrent request deduplication, stale-result rejection, lazy signing and safe errors.
5. Extend `admin-storage-resolver.integration.test.ts` for missing/expired custom sessions, an independently present organization JWT on an Admin route, and logout/route transitions between context selection and signing. Assert zero direct Storage calls on those Admin paths.

No runtime source correction was made in this readiness task. Its implementation and a newly pinned isolated release candidate require review. The previously reviewed client source hashes still match; this is an uncovered existing path, not a source-drift finding.

## 3. Smallest compatible frontend scope

**First target: Admin Vercel project `lydorg`.** It needs the gateway integration before removing broad policies. Organization/public/PWA deployment can remain separate; the Admin gateway is not a replacement for owner JWT authorization.

| File / hunk | Required behavior |
|---|---|
| New `src/lib/admin-storage-access.ts` | Invoke `admin-storage-access` with the existing custom session in the JSON body; use signed upload grants for template/news assets; reject changed sessions and denied grants without fallback |
| New `src/lib/signed-storage-url-cache.ts` | In-memory session-scoped bearer URL cache; bounded cache/pending lifetime, concurrent deduplication, no negative cache or private URL logging |
| Selected `src/lib/lydo-connect-supabase.ts` hunks | Cache/auth-event imports; trusted-origin URL parsing; gateway-backed news upload/cleanup; template upload; resolver/cache integration; required correction above |
| `src/lib/query-client.ts` addition | Cancel/remove private `admin` and `user` queries on identity changes; retain public queries |
| `src/lib/lydo-connect-store.tsx` three additions | Invoke private-query cleanup on reset and identity transition |

`release-manifest.json` pins the current full files, unchanged dependencies, and individual selected hunk hashes. The shared Supabase service file contains unrelated performance and organization-upload edits, so its full dirty file must not be promoted as the smallest release automatically. Selected hunk boundaries are recorded for review, not as an executable final patch. The required resolver fix will change those hashes.

Exclude staging renewal-test utilities/SQL, synthetic fixtures/reconciliation, migrations, credentials, operator scripts/evidence, dirty generated `build/`, unrelated test expectation changes, YPOP coalescing, public polling/settings optimizations, lazy-loading changes, and PWA download/offline-shell corrections from the minimal Admin gateway release. Preserve all of them locally. PWA corrections retain their own validated release scope.

An independent organization/public/PWA candidate before restrictive cutover should review the owner-upload `upsert:false`/unique-path hunks and session-aware avatar/preview changes with the existing TUS workflow. Its runtime must keep using owner JWTs. Do not silently bundle it into the Admin release.

## 4. Workflow compatibility assessment

| Workflow | Current local integration | Evidence / remaining limitation |
|---|---|---|
| Registration, renewal and YORP review | Admin call sites and `AdminRenewalDocumentPreview` resolve through the shared helper; valid Admin context uses the gateway | Resolver and renewal preview mocks pass; existing live gateway acceptance reused. Missing-session correction still required |
| Budget and liquidation preview/download | Shared resolver; parent/path authorization stays in the installed database RPC | Historical metadata compatibility review reused. No production upload/delete or new permission-specific test performed |
| YPOP city-led / organization-led | Shared resolver for selected and batch files; server validates parent and organization | Previously verified staging evidence reused; no new live YPOP test |
| MOVE | Gateway bucket allowlist supports it; authorization projection requires a supported parent and currently reserves eligible Admin access to Super Admin | No dedicated MOVE application UI/data loader found in `src`; MOVE template categories do not establish a MOVE document workflow. Unlinked historical MOVE object remains denied, not granted by path inference |
| Template upload/replacement | Gateway-issued unique signed upload, `upsert:false`, then existing permission-checked template metadata RPC | Existing client/gateway tests pass. No production write test authorized |
| News upload/replacement/cleanup | Gateway grants; current origin checked before legacy public-path cleanup; cleanup failures retain objects | Public image URLs remain intentionally public. No production write test authorized |
| Public templates/news | Templates use organization/anonymous signing on public routes; news rendering retains public image URLs | No Admin token should be used on user/public routes. Current canonical metadata binding previously verified; no claim that unknown versions become accessible |
| Organization website / PWA files | Genuine organization Supabase Auth context; unique registration/revision paths and TUS transport remain intact | Current focused cache/avatar/preview tests pass; not a new real browser or installed-PWA run |

The foundation already verifies resource, ownership, parent relationships and current Admin permission server-side. The client only supplies lookup keys. The service-only authorization RPC is not called directly by frontend code. `verify_jwt=false` on the gateway is intentional for independent custom Admin tokens; it does not replace the RPC's authorization.

No service-role credentials are required by this frontend integration. Session tokens are sent in the request body, not filenames/query strings or logs. Existing custom-session persistence is unchanged; this review does not claim the application uses exclusively memory-only Admin sessions.

The cache invalidates on organization Auth transitions, Admin-session changes, account reset and cross-tab storage changes. Positive entries are reused for at most 60 seconds and never beyond the client session expiry; issued Storage URLs retain their server-defined 3,600-second validity. Clearing client cache does not revoke issued URLs. Account-switch mock tests pass; production browser switching and every mounted Admin preview are not certified by those mocks.

Denied gateway requests use generic safe errors. General Admin preview actions show a toast; `AdminRenewalDocumentPreview` renders its existing placeholder for an unavailable URL, rather than a specific retry/error explanation. Gateway rejections do not currently trigger the `/rest/v1/rpc/`-only automatic Admin expiry handler. Existing inactivity/session monitors still enforce sign-out. These error-UX limitations should be tested in the scoped preview; they are not evidence of server authorization bypass.

### Separate restrictive-policy cutover limitations

- Preserve the prior classification: 215 unmatched private objects and 56 unreferenced template versions are unresolved; absence of a current link does not prove an object is disposable. Current supported metadata can authorize access; path-only guesses cannot.
- Previously reviewed historical-object decisions and the two current-owner files lacking parent links remain cutover prerequisites. Do not relink or relax authorization to make them work.
- `deleteAdminBudgetRequestsInSupabase` still attempts direct private Storage cleanup after its authorized metadata RPC. Under future restrictive policies that cleanup may fail and retain objects. Reconcile the intended server-side cleanup behavior separately before advertising complete destructive-workflow compatibility.
- The resolver reauthorizes same-project `/sign/` and `/authenticated/` URLs. Other HTTP values, including `/public/` and external links, pass through; do not claim all historical URL forms have been reauthorized. The existing canonical-reference inventory and ownership rules remain the basis for future cutover.

These limitations do not require weakening policies or delaying every independent frontend preparation step. They prevent treating this review as authorization for the broader cutover.

## 5. Validation performed in this task

| Check | Result | Scope |
|---|---|---|
| Existing focused frontend tests | PASS | 56 assertions across 8 files; local mocks/jsdom, no live sessions |
| `npx tsc --noEmit` | PASS | Entire current working tree |
| Admin production build | PASS | Current dirty tree, `VITE_DEPLOY_SURFACE=admin`, isolated review output |
| User production build | PASS | Current dirty tree, `VITE_DEPLOY_SURFACE=user`, isolated review output |
| `git diff --check` | PASS | Existing tracked changes; CRLF normalization warnings are recorded separately from failures |
| Public deployed HTML/entry inspection | PASS | Two actual live hosts; exact hashes and embedded versions recorded |
| Authenticated Vercel project/immutable inspection | BLOCKED | Existing CLI lacks access; immutable URLs require authentication |
| Current candidate's missing-Admin-session denial | NOT TESTED dynamically | Source review identifies fallback; regression test must be added with correction |
| New authenticated production/browser/PWA workflows | NOT TESTED | Not authorized/needed; prior completed tests reused, acceptance helper not rerun |
| Full repository Vitest | NOT TESTED | Not requested for this scope; prior 2,211 passing / 150 failing baseline remains historical and untriaged here |

The initial `npm run build -- --outDir ... --manifest` invocation failed because the local npm/PowerShell wrapper forwarded the output directory as a positional Vite root. It transformed zero modules and did not overwrite `build/`. Both subsequent direct invocations of the installed Vite CLI succeeded. This tooling failure is retained; it is not a newly failing application assertion.

Build commands used:

```powershell
# Set separately for each review build; no deploy command was run.
$env:VITE_DEPLOY_SURFACE = 'admin' # second build: 'user'
$env:VITE_APP_VERSION = '1.0.0-review-gateway'
node node_modules/vite/bin/vite.js build --outDir .agent/frontend-readiness-20261012T011835Z/admin --manifest
# Second build used the corresponding /user output directory.
```

Normal frontend environment loading was validated without printing values: exact production URL, project-matching anon key, no public secret/password/service-role variable names, and no private foundation variables in the build process. `.env.foundation.local` was not loaded. All generated JS was scanned for service-role JWTs/`sb_secret_` keys; none were detected. The staging reference also appears as an existing explicit test-scenario guard constant; it is not the configured runtime client URL.

The two review builds include unrelated dirty changes and use a review version label. They are **not deployable release candidates**. Their full asset inventories and hashes are in `build-artifact-inventories.json`. The expected final production artifact/hash is **NOT GENERATED**. Build timestamps alter output hashes; final approval must pin the isolated source revision and exact built artifacts for each surface.

## 6. Required public build configuration

| Variable | Admin | Organization/public/PWA |
|---|---|---|
| `VITE_DEPLOY_SURFACE` | `admin` | `user` |
| `VITE_SUPABASE_URL` | `https://mqqaykksadotbrghbexz.supabase.co` | Same |
| `VITE_SUPABASE_ANON_KEY` | Project's public anon/publishable key, verified for intended transport | Same |
| `VITE_APP_VERSION` | Reviewed release identifier; build includes timestamp | Separately reviewed identifier |

The tested public key class was legacy `anon`; this does not certify changing key types. No frontend gateway URL override is needed: `functions.invoke` uses the configured production Supabase project. Never add a `VITE_` service-role/secret key. Gateway server secrets stay in hosted Edge Function configuration. Existing server-side `/api` settings are a separate hosting concern; do not expose them through Vite.

Existing `vercel.json` uses `build` output, SPA rewrites and CSP permitting Supabase connect/frame origins. Gateway requests need no new CSP grant. Confirm the actual Vercel project's root/build/output and existing `/api` behavior with the operator before release; do not run a bare `vercel` command in this dirty checkout.

## 7. Controlled release and recovery plan

1. Review and implement only the missing-session correction with focused tests. Re-pin changed files/hunks.
2. Prepare an isolated release revision based on the verified deployed commit plus the explicitly selected gateway/cache hunks. Do not reset, stage indiscriminately, or deploy this dirty directory. Exclude SQL, staging utilities, secrets, generated outputs and other release scopes. Retain the current production-network guard and isolated Vitest environment as QA-only inputs when running its tests. Build/test that exact revision for `admin`.
3. Obtain provider-side project/alias/env confirmation for `lydorg` and a working authorized deployment mechanism. Record the currently serving immutable deployment as the rollback target. Confirm no automated second-project rollout is triggered by publishing a shared repository commit.
4. Reuse the installed foundation and gateway; check their reviewed identities read-only immediately before the separately authorized frontend release. Do not reinstall them or execute the one-time acceptance helper.
5. Obtain explicit authorization naming the Admin Vercel project, isolated source revision, artifact identity and smoke-test scope. Deploy only that frontend target. Keep all 15 Storage policies unchanged.
6. Verify the new public version/entry hashes and effective `admin` surface. With separately supplied/authorized real sessions and metadata-linked files, check registration/renewal, budget/liquidation, YPOP and templates preview/download. Require gateway calls, no direct private signing fallback, safe denied/expired states, no sensitive console output, and account-switch cleanup. Do not create sessions or mutate files without separate permission.
7. Release organization/public/PWA changes independently if needed; validate current template downloads/news rendering and owner flows before a later explicitly authorized restrictive cutover.

**Rollback before restrictive policies:** restore only the verified previous immutable frontend deployment through the authorized Vercel mechanism, then check the served version and service-worker/client update state. Leave foundation, gateway, containment and document guards installed. Preserve in-progress forms/drafts. The old client relies on the still-existing permissive policies; rolling back does not resolve that pre-existing exposure.

**After a future restrictive cutover:** the old frontend is not an acceptable rollback if it lacks gateway compatibility. Retain a tested compatible build or use a reviewed forward frontend correction / fail-closed pause. Never restore broad policies or vulnerable document RPCs as a shortcut. Previously issued signed URLs may remain usable until server expiration.

## 8. Remaining blockers and release boundaries

- **Required before this frontend release:** resolver fail-closed correction plus regression tests; isolated tested release revision/artifacts; operator confirmation of provider settings and an authenticated deployment route. No additional infrastructure reconstruction is required.
- **Coverage limits to carry forward:** permission-specific production denial and independent expected content-hash comparison were unavailable in the earlier approved acceptance. New live browser checks require separately authorized operator inputs. Historical MOVE access is not implemented by a generic bucket allowlist.
- **Separate Storage cutover NO-GO:** unresolved historical-access decisions and complete cleanup/path/workflow compatibility remain outside this frontend release.
- **Capstone UAT:** retain the prior staging assessment and 20/20 installed-Chrome evidence. This task did not rerun or revoke those results, and they do not certify the yet-unbuilt production frontend candidate.

Only local review/evidence artifacts were created. Runtime files, the existing dirty `build/`, production/staging records, policies, Auth sessions, gateway deployment and Git remotes were not modified. No push or deployment occurred. Stop here for the narrow implementation review; frontend deployment still requires separate authorization.
