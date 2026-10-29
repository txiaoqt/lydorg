# Isolated Admin release: provider metadata correction

Prepared 2026-10-12T05:37:41.277Z. **CONDITIONAL GO for a separately authorized Admin candidate deployment without domain promotion. NO-GO for production-domain promotion until hosted acceptance and recovery prerequisites pass.** No deployment was submitted in this task.

## Exact source and artifacts

- Branch/base commit: `ui-refactor` / `2f6e7427c553b7535f53860d1732b42df7c023e8`. No new Git commit.
- Target: `toffs-projects-81b2ce10 / lydorg`, team `team_lrnDtn1fujS9WebCMQoWHmGR`, project `prj_J36xqAUQELX8NttCaFFInsxcCEaI`.
- Domain: [y-trace-admin.vercel.app](https://y-trace-admin.vercel.app). Fresh authenticated project reads still require existing production target `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ`.
- New isolated source identity: **`sha256:51a18dbc3a799b39d074834edcfe6a9c88de1dd9d115277061e071f9f38c1959`**, 561 files.
- Previous final source: `sha256:e8ffe3241f7529f4440e8e4cc427254d2cd29da5e1bbcd0d689395431cd5aa8d`; retained unchanged alongside the original source revision and archives named in the request.
- Fixed application version remains `1.0.0-admin-storage-rc+20261012035933.vercel24` because the change affects packaging only. The new source/archive identities distinguish this release. Runtime bytes must remain identical.

| Artifact | Bytes | Fresh SHA-256 |
|---|---:|---|
| [Source ZIP](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T052118Z/admin-gateway-vercel24-source.zip>) | 15422629 | `324ea22858359d71c4cd94f7da2ee7a658d98327a2bca4e9b7d9facfc10e7984` |
| [Static build ZIP](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T052118Z/admin-gateway-vercel24-static-build.zip>) | 11957132 | `a5c2417acf8e3bf5b5e69dadd2ed204e37a7e6a95b81b47c124875c568993199` |

Build inventory SHA-256: `1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d`. Complete source and build inventories are preserved beside this report. The static ZIP is ordinary Vite output, **not** a Vercel Build Output API artifact. Do not use it with `--prebuilt`. [Vercel deployment formats](https://vercel.com/docs/cli/deploy)

## Confirmed failure and exact correction

The earlier single deployment `dpl_645dxpV4ubKyVXast3rBHjy3mZhr` ended in ERROR / `UNREVIEWED_PUBLIC_VARIABLE`. Configured project settings contained the four approved application names; the deployed environment also reported `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`. Its value was not requested or saved. [Preserved failed-deployment report](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/candidate-deployment-20261012T044600Z/execution-report.md>) retains the failed request, hosted logs and source comparison.

Vercel documents build-time observability client configuration; the exact Vite-prefixed name was independently observed in deployment metadata. [Vercel dynamic configuration](https://vercel.com/docs/analytics/package)

Only two files differ from the previous final candidate:

1. [Build wrapper](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T052118Z/candidate/scripts/build-admin-release.mjs>): add that one exact metadata name to the existing list, accepted only when `VERCEL=1`, the exact Admin project ID matches and `VERCEL_ENV=production`. Discard the value before starting Vite. Do not parse it or expose it to the client. Unknown `VITE_*` names remain rejected.
2. [Packaging tests](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T052118Z/candidate/scripts/build-admin-release.test.mjs>): five new tests cover opaque acceptance and discarding, standalone rejection, wrong-project rejection, preview rejection and similarly named-variable rejection.

All five runtime integration fixes, fail-closed Admin resolver, source configuration fingerprint, dependency versions/lockfile, Vite configuration, Python sources, requirements, SPA/API rewrites and security headers retain their prior hashes. No root application or Organization/PWA source was edited. The packaged `package.json`, `vercel.json`, deterministic configuration and Python requirements remain those of the previously reviewed variant.

## Node, build and environment parity

| Check | Result | Evidence |
|---|---|---|
| Provider identity/settings | PASS | Authenticated GETs at 2026-10-12T05:29:33.228Z and 2026-10-12T05:33:53.414Z; exact team/project, root null, Vite, Node 24.x, build npm run build, output build, unchanged production target |
| Lockfile installation | PASS | Two independent fresh npm ci installations; existing postinstall patch executed; lockfile/dependencies unchanged |
| Deterministic entrypoint | PASS | npm run build invokes node scripts/build-admin-release.mjs; both build logs confirm the wrapper |
| Local toolchain | PASS | v24.21.0, npm 11.19.0, Windows x64 |
| Linux/hosted reproduction | NOT TESTED | No usable Linux/WSL/Docker runtime in the previously inspected environment; no new runtime installed. Vercel chooses its own Node patch/npm version |
| Public configuration | PASS | Same exact fingerprint on both authenticated reads and builds: `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a` |
| Private inputs/provider metadata | PASS | Clean child environment; the first build included synthetic observability and other provider canaries; no canary, secret-key finding or private operator value in generated assets |
| SPA/API routes and CSP | PASS | Exact preserved route/header hash `9c709c6bfb433627e1567a298e2e81b61c296c4dc9045645e8fd68acc3f42255`; packaging test verifies it |
| Worktree/evidence preservation | PASS | 64 tracked dirty paths unchanged; original snapshot and both prior archives checked; 18 failed-deployment evidence files match their saved hashes |

Provider project install setting remains `npm install`. The isolated `vercel.json` overrides it to `npm ci --include=dev --no-audit --no-fund` for this deployment and retains `npm run build` / `build`. No project setting was changed. [Per-deployment build configuration](https://vercel.com/docs/builds/configure-a-build)

Exactly four client variables are allowed: `VITE_DEPLOY_SURFACE=admin`, production `VITE_SUPABASE_URL`, production-bound public anon JWT `VITE_SUPABASE_ANON_KEY`, and canonical `VITE_ADMIN_APP_URL`. The JWT class/project inspection plus exact trusted provider-value fingerprint is build-input validation, not cryptographic user authorization. Server authorization remains the gateway/database responsibility. No key value is included in this report.

`VITE_ENABLE_STANDALONE_USER_PWA_UI` is absent, irrelevant to the Admin surface and still rejected. The wrapper permits 17 exact provider metadata names only in the verified context, then removes all of them. Only the four approved application variables reach Vite. No server-only values were requested. `SUPABASE_SERVICE_ROLE_KEY` was examined as a metadata name only and remains server-side. No production environment file was loaded.

## Focused validation

| Suite/check | Passed | Result |
|---|---:|---|
| production-supabase-network-guard.test.ts | 4 | PASS |
| admin-storage-access.test.ts | 19 | PASS |
| admin-storage-resolver.integration.test.ts | 37 | PASS |
| private-query-cache.test.ts | 2 | PASS |
| query-client.test.ts | 3 | PASS |
| signed-storage-url-cache.test.ts | 15 | PASS |
| signed-storage-url.integration.test.ts | 9 | PASS |
| AdminRenewalDocumentPreview.test.tsx | 2 | PASS |
| Packaging, including five new guards | 26 | PASS |
| Python import/behavior checks | 7 | PASS |
| TypeScript --noEmit | — | PASS |
| Two clean Admin production builds | — | PASS |
| Reproducibility: all 53 files | — | PASS |
| Frontend bounded secret/origin scan | — | PASS |
| git diff --check | — | PASS; existing CRLF warnings |

**124 focused tests passed, zero failed.** The full repository suite was not rerun; historical failures retain their existing reports and are not reclassified as harmless. One preliminary local test command used the wrong relative executable path and never started Node; the corrected validation harness executed all 26 packaging assertions successfully. No failed assertion was suppressed.

Every generated file in the two fresh builds is byte-identical, and every file also matches the previous final 53-file static inventory. The static ZIP was newly generated and hashed with this variant's archive timestamp; its container hash differs even though compiled files are unchanged. The artifact inventory fingerprint is unchanged for that verified reason. This demonstrates Windows reproduction only, not a successful Vercel/Linux build.

Existing npm deprecation/install-script notices, stale Browserslist data and large-chunk build warnings remain recorded. No dependency upgrade, audit result or broad optimization is claimed. The secret scan is a bounded literal/pattern scan combined with clean environment inputs, not proof against every possible encoding.

## Python API compatibility and remaining acceptance

Unchanged runtime requirements: `requests==2.34.2`, `python-dotenv==1.2.4`, `urllib3>=2.7.0,<3`. Existing worker imports and root packaging are preserved. Seven checks were rerun in the existing isolated Windows Python 3.14.3 virtual environment; pip check passed. Python 3.12 grammar passed. The previous requirements resolution for Python 3.12 remains historical evidence; no actual Python 3.12 interpreter or hosted function execution is claimed.

GET returns 405; OPTIONS returns 204 with POST/OPTIONS. Missing trigger configuration returns 500 and a wrong trigger returns 401. The successful POST path was mocked locally with socket and requests networking blocked. **No live /api request, sync trigger or external business operation was invoked.** Existing routes remain: /api/sync-run-once to its Python function, other /api paths to the configured backend, other paths to index.html.

Vercel documents Python 3.12 as default and requirements.txt packaging. Hosted dependency installation, inclusion of worker imports, Python runtime selection and non-mutating GET/OPTIONS acceptance remain **BLOCKED pending a separately authorized candidate deployment**. Transitive Python packages are not fully pinned; preserve the hosted resolution evidence. [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python)

Production metadata still exposes no `SYNC_TRIGGER_TOKEN` name; no server setting was changed. If business sync must be enabled, its separate server-configuration review is required. This frontend candidate neither enables nor invokes it.

## Proposed controlled release route — not executed

1. Obtain fresh authorization naming this source ZIP/hash and source revision, exact team/project and production-without-alias scope. The previous deployment authorization/attempt marker is consumed and must not be reused.
2. Recheck project/alias/settings, public fingerprint, gateway prerequisite and archive/source hashes; exclude competing deployments. Extract the source ZIP into a new clean directory, excluding generated node_modules/build, operator files and private env files.
3. Use the supported pinned Vercel CLI route with process-only `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, exact team scope, `--prod --skip-domain --force`. Use a new exclusive lock, durable single-attempt marker and sanitized external receipt. No shared Git push and no deployment from the dirty root. Do not use `--prebuilt`, `--public`, promotion, environment changes or automatic retries.
4. Wait for an authoritative READY/ERROR outcome. Verify uploaded sources, actual Node/npm selection, wrapper invocation, configuration fingerprint and hosted artifacts. Investigate any unexplained artifact difference rather than adopting new expected hashes.
5. Require hosted Python dependency/import evidence and non-mutating GET/OPTIONS checks; never invoke POST/sync. Check root/deep SPA routes, assets, CSP, correct Admin surface, no Org/PWA change, expired/missing-session errors and fail-closed resolver. Authenticated file access requires separately provided genuine session/resource authorization; do not rerun the consumed one-time helper.
6. Retain and record the independently verified immutable compatible deployment as a recovery basis. Request separate production-domain promotion authorization only after the remaining acceptance and recovery requirements pass. [Vercel prod without alias](https://vercel.com/docs/cli/deploy)

## Recovery and decisions

The failed ERROR deployment cannot serve as recovery. Existing live deployment `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ` lacks the gateway integration and contains the earlier missing-session fallback; it is not an acceptable security-preserving rollback for the future restrictive Storage cutover.

Before promotion, identify a verified compatible immutable candidate and operator recovery procedure. If no safe alternate exists after a release fault, stop rollout, pause affected Admin document actions through separately approved fail-closed containment, and prepare a forward corrected candidate. Do not restore the vulnerable resolver or broaden Storage policies. A pause/forward deployment itself needs explicit approval. Keep the current aliases while candidate acceptance is incomplete.

| Decision | Status | Remaining requirement |
|---|---|---|
| Local isolated candidate preparation | GO | Completed locally; hashes/inventories pinned |
| New Admin candidate deployment without alias | CONDITIONAL GO | Fresh explicit authorization and immediate provider/source gates |
| Production-domain promotion | NO-GO | Successful hosted build/Python/frontend acceptance and security-preserving recovery |
| Broader Storage policy cutover | NO-GO in this task | Separate data-compatibility, Organization/PWA and cutover reviews/authorization |

Suggested separate authorization: “Authorize ONE deployment of isolated source revision sha256:51a18dbc3a799b39d074834edcfe6a9c88de1dd9d115277061e071f9f38c1959, source ZIP SHA-256 324ea22858359d71c4cd94f7da2ee7a658d98327a2bca4e9b7d9facfc10e7984, to toffs-projects-81b2ce10 / lydorg (prj_J36xqAUQELX8NttCaFFInsxcCEaI), using the reviewed production-without-alias CLI route and bounded non-mutating candidate acceptance. No domain promotion, Git push, server configuration changes, business mutations or Storage cutover. Stop on drift or ambiguous outcomes; no automatic retry.”

No live Supabase database, Storage, gateway or Auth operations were performed in this task. Completed UAT and gateway acceptance were reused as historical evidence where relevant and were not rerun. Historical reports, fixtures and the dirty worktree are preserved.
