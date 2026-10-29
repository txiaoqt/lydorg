# Isolated Admin release aligned with Vercel

Prepared 12 October 2026. **CONDITIONAL GO for a separately authorized production-environment candidate deployment without domain promotion. NO-GO for promotion until hosted acceptance and recovery checks pass.**

## 1. Exact candidate and artifacts

- Target: `toffs-projects-81b2ce10 / lydorg`, project `prj_J36xqAUQELX8NttCaFFInsxcCEaI`, team `team_lrnDtn1fujS9WebCMQoWHmGR`.
- Production domain: [y-trace-admin.vercel.app](https://y-trace-admin.vercel.app). Authenticated public-configuration reads still identify `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ` as the existing production target.
- Branch/base commit: `ui-refactor` / `2f6e7427c553b7535f53860d1732b42df7c023e8`. No new Git commit was created.
- **Final source revision:** `sha256:e8ffe3241f7529f4440e8e4cc427254d2cd29da5e1bbcd0d689395431cd5aa8d` (561 files).
- Fixed application version: `1.0.0-admin-storage-rc+20261012035933.vercel24`.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| [Final complete source ZIP](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/admin-gateway-vercel24-source.zip>) | 15,422,338 | `665e7d1f5969eb53cd65592043fbae8b6da21b1f7c83fbd9dfc1cc32f5aeaf6e` |
| [Final static build ZIP](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/admin-gateway-vercel24-static-build.zip>) | 11,957,132 | `294632f506ea8762f6197622803043c6bd00a2e524753e608eb032b11a29c699` |

The static ZIP contains ordinary Vite output. It is **not** a Vercel Build Output API artifact and must not be deployed using `--prebuilt`. The source ZIP includes the Python API and its worker imports. [Vercel prebuilt requirements](https://vercel.com/docs/cli/deploy)

Original source/build archives remain byte-for-byte intact. The first Node 24 intermediate variant is also preserved. It was superseded after provider documentation revealed automatically injected Vite metadata; only the final `revision2` source is proposed for release.

## 2. Packaging changes and build compatibility

| Final isolated file | Change |
|---|---|
| [package.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/candidate/package.json>) | Build scripts invoke the packaged wrapper; npm dependencies unchanged |
| [vercel.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/candidate/vercel.json>) | Per-deployment npm ci and build commands; existing routes/headers unchanged |
| [scripts/build-admin-release.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/candidate/scripts/build-admin-release.mjs>) | Node 24, exact public configuration, fixed version and clean worker environment |
| [scripts/build-admin-release.test.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/candidate/scripts/build-admin-release.test.mjs>) | 21 focused packaging checks |
| [scripts/admin-release-config.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/candidate/scripts/admin-release-config.json>) | Pinned target, public configuration fingerprint, version and preservation hashes |
| [requirements.txt](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/revision2/candidate/requirements.txt>) | Minimal existing Python API dependencies |

All five reviewed runtime integration files retain their previous hashes, including the fail-closed resolver. `package-lock.json`, npm dependencies, Vite configuration, Python source, SPA rewrites and six security headers retain their reviewed identities. The root application source and Organization/PWA release are unchanged.

The configured provider uses Node `24.x`, Vite, root directory `null`/repository root, `npm install`, `npm run build`, and output `build`. The isolated `vercel.json` overrides install for this deployment to `npm ci --include=dev --no-audit --no-fund`; it retains `npm run build`, which now executes the packaged wrapper. No provider setting was edited. Per-deployment build configuration is supported. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)

Local validation used official Node **24.21.0**, npm **11.19.0**, Windows x64, and two separate fresh lockfile installations. The Node download matched its official HTTPS checksum; no detached-signature verification is claimed. No installed Linux/WSL distribution or Docker runtime was available. Vercel selects Node patch releases independently; Linux/provider reproducibility is **NOT TESTED**. [Supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

The wrapper overrides Vite's generated timestamp with the full fixed version. It launches Vite in a clean child process with an empty environment-file directory. Only four approved client variables reach it. Project/environment checks reject a wrong Vercel target. Documented `VITE_VERCEL_*` metadata (16 exact names) is accepted only in the verified Vercel context and discarded; unknown public variables still fail. This handles automatic framework injection without embedding deployment URLs, Git metadata, salts or private operator variables. [Vercel framework variables](https://vercel.com/docs/environment-variables/framework-environment-variables)

## 3. Public configuration parity and private inputs

Authenticated GET requests examined metadata and decrypted only these four explicitly public application settings in memory:

| Name | Verification |
|---|---|
| `VITE_DEPLOY_SURFACE` | PASS: Admin surface |
| `VITE_SUPABASE_URL` | PASS: exact production project `mqqaykksadotbrghbexz` |
| `VITE_SUPABASE_ANON_KEY` | PASS: public anon JWT class, matching project; exact provider-value fingerprint |
| `VITE_ADMIN_APP_URL` | PASS: canonical Admin origin |

Combined public configuration SHA-256: `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a`. Values were not written to reports or environment files. The public anon key is intentionally present in the compiled client, as required by the existing application. Payload decoding classifies this public build input; it is not a substitute for backend authorization.

`VITE_ENABLE_STANDALONE_USER_PWA_UI` is absent from the Admin provider configuration and unnecessary for this surface. It is excluded and rejected by the wrapper. The separate Organization project retains its existing configuration.

`SUPABASE_SERVICE_ROLE_KEY` exists as a sensitive server-only provider setting. Its value was **never requested**. Server credentials, PostgreSQL/operator variables, custom Admin sessions, Vercel OIDC values and `NODE_OPTIONS` are not passed into the Vite worker. Final generated assets contain zero detected service-role JWTs, secret API keys, session literals, staging origins or injected provider canaries. This is a bounded scan plus environment isolation, not an exhaustive secret audit.

## 4. Python API preservation

`api/sync-run-once.py`, `worker/__init__.py` and `worker/gform_sync_worker.py` are unchanged. Requirements now declare:

`requests==2.34.2`, `python-dotenv==1.2.4`, `urllib3>=2.7.0,<3`.

These cover the existing imports and the Requests TLS dependency requirement; no JavaScript dependency was upgraded. Fresh installation and `pip check` passed in an isolated Windows Python 3.14.3 environment. Seven network-blocked import/handler checks passed: dependency imports, Python 3.12 grammar, GET 405, OPTIONS 204, missing trigger 500, wrong trigger 401, and a mocked authorized POST. No actual sync endpoint or business operation was invoked. [Requests release history](https://github.com/psf/requests/blob/main/HISTORY.md)

Python 3.12 distribution resolution passed for Windows; it is not Linux runtime execution. No Python version override was added. Vercel's documented default is 3.12 and native `/api` Python functions remain supported; hosted import/package verification is required before promotion. Transitive Python versions are not fully locked and must be recorded from the candidate build. [Vercel Python runtime and dependencies](https://vercel.com/docs/functions/runtimes/python)

Existing routes remain: local `/api/sync-run-once`, the other `/api/(.*)` proxy to the existing backend, and SPA fallback. Server environment requirements are unchanged. The inspected provider names do not include `SYNC_TRIGGER_TOKEN`; consequently successful external sync execution is not claimed. Configure or change nothing under this release without separate review. A future harmless GET/OPTIONS import check must not invoke POST.

## 5. Focused validation

| Check | Result | Evidence/limit |
|---|---|---|
| Gateway/resolver/cache/preview baseline | PASS | 91/91 local Vitest assertions, zero failures; mocks and safe fixtures |
| Final packaging guards | PASS | 21/21 Node tests, including provider metadata filtering and secret exclusion |
| Python import/handler checks | PASS | 7/7, offline mocked handlers; unchanged Python inputs verified in final source |
| TypeScript | PASS | `tsc --noEmit`, exit 0 |
| Clean Admin builds | PASS | Both actual `npm run build` entrypoints completed |
| Fresh dependency installation | PASS | Two independent final-source `npm ci` runs, 671 packages each |
| Reproduction | PASS | 53/53 generated files byte-identical, independently extracted source and independent installs |
| Provider-shaped environment | PASS locally | One build received simulated Vercel metadata/private canary; the other did not; assets are identical and canaries absent |
| Secret/origin scan | PASS within stated limits | One intended production anon JWT; zero detected private literals or staging origin |
| Routing/CSP preservation | PASS | Exact prior rewrite/header fingerprint retained |
| `git diff --check` | PASS | Per-command fsmonitor/safe-CRLF workarounds; no Git setting changed |
| Full repository tests | NOT TESTED | Scope limited to the requested baseline and packaging checks |
| Linux/hosted Vercel build | BLOCKED / NOT TESTED | No local Linux; deployment not authorized |
| Production authenticated UI/Python invocation | NOT TESTED | No production session, API or private-file tests performed |

There are **119 scoped checks passing, zero failed assertions** (91 + 21 + 7), with the above execution distinctions. Existing npm deprecation/install-script warnings and Vite chunk-size/Browserslist warnings are retained in logs; no dependency upgrade was attempted to suppress them. A preliminary test command had a wrong relative Node path and executed no assertions; the corrected command and saved final suite both passed.

Preservation checks verified both historical ZIPs, all 557 original candidate files, and all 4,126 original worktree entries, including 18 already-missing assets. Only the two resolver/test differences documented before this task differ from the original snapshot. No additional root application file was changed. The working branch/HEAD and 64 tracked dirty entries remain intact.

## 6. Proposed deployment route — NOT EXECUTED

Use only a fresh extraction of the final source ZIP, verify all 561 source hashes, and pin the existing Admin team/project. Use the official authenticated CLI 63.1.2 with project identifiers supplied to its process; no browser credentials or tokens are extracted. The project environment variables select the existing project without creating or relinking one. [CLI project selection](https://vercel.com/docs/cli/global-options)

Proposed command after separate authorization, with `VERCEL_ORG_ID=team_lrnDtn1fujS9WebCMQoWHmGR` and `VERCEL_PROJECT_ID=prj_J36xqAUQELX8NttCaFFInsxcCEaI` set only for that process:

`npm.cmd exec --yes --package=vercel@63.1.2 --registry=https://registry.npmjs.org -- vercel deploy --cwd <fresh-verified-source-directory> --scope toffs-projects-81b2ce10 --prod --skip-domain --force --no-color`

This requests a hosted production-environment build without automatic domain assignment. Promotion is a separate operation. Never upload the dirty root, send secrets in command arguments, use the static ZIP as `--prebuilt`, or push to the shared repository. `--skip-domain` overrides automatic domain assignment. [Vercel staged production deployment](https://vercel.com/docs/cli/deploy)

Before that single attempt: refresh authenticated project/domain/settings and public configuration fingerprints; verify source ZIP/hash; check for competing deployment/promotion; confirm candidate-only authorization and operator access. Preserve an external source/build/deployment receipt. Do not automatically retry an ambiguous result.

Before any later promotion:

1. Require READY on the exact Admin project, production environment, intended install/build commands and wrapper output. Record actual Linux Node/npm/Python versions and dependencies.
2. Confirm the current production alias and Organization project did not move. Verify all uploaded source identities, Python entrypoint/worker inclusion, and compiled browser config.
3. Inventory hosted static assets. Compare with this local inventory; investigate every difference and separately review/pin any justified provider-specific output. Do not silently substitute a new hash.
4. Verify root/deep Admin routes, CSP/security headers, and harmless API GET/OPTIONS behavior without POST or external sync.
5. Perform bounded frontend smoke checks and separately scoped existing-session/file acceptance if authorized; do not rerun the completed one-time gateway helper, create sessions or perform uploads/deletes automatically.
6. Retain the verified compatible immutable deployment and evidence as a recovery basis; review fail-closed recovery and obtain explicit domain-promotion authorization.

## 7. Recovery and remaining limits

The existing production deployment is retrievable, but **security-preserving rollback to it is NO-GO**: it lacks the gateway and corrected missing-session behavior. Source/build archives do not constitute a provider recovery deployment.

Before promotion, a candidate failure leaves the current production alias untouched. Stop and prepare a reviewed forward correction. After promotion, re-promote only an independently verified compatible immutable deployment when that resolves an alias/deployment issue. Re-promoting the same defective code does not fix a code defect. If no safe compatible target exists, pause Admin document use and obtain separate approval for a reviewed maintenance-only Admin deployment/access restriction while preparing a compatible forward fix. Do not restore vulnerable resolver code or broaden Storage policies. No recovery write is authorized here.

The intended compatible recovery deployment does **not exist yet**; creation and acceptance require the candidate-only release step. Read-only provider access does not prove deployment/promotion permissions. Hosted Linux/Python acceptance, safe recovery eligibility, and separately authorized frontend/file smoke scope remain prerequisites for promotion. The broader restrictive Storage policy cutover and Organization/PWA release remain separate.

## 8. Separate authorization template

> I authorize ONE candidate-only source deployment to Vercel team `team_lrnDtn1fujS9WebCMQoWHmGR`, project `prj_J36xqAUQELX8NttCaFFInsxcCEaI` (lydorg), using official CLI 63.1.2 with `--prod --skip-domain --force`. Use only final source revision `sha256:e8ffe3241f7529f4440e8e4cc427254d2cd29da5e1bbcd0d689395431cd5aa8d` and ZIP SHA-256 `665e7d1f5969eb53cd65592043fbae8b6da21b1f7c83fbd9dfc1cc32f5aeaf6e` (15,422,338 bytes). Perform immediate read-only drift checks and bounded non-mutating provider/static/Python GET/OPTIONS checks. Stop on drift, uncertain submission or failed acceptance; no automatic retry. This does not authorize promotion/domain changes, Git push, Organization/PWA deployment, database/Storage/Auth/gateway changes, new sessions, file uploads/deletes, external sync POST, or rerunning the one-time gateway helper. Any authenticated production-file test needs its own explicit session/resource scope.

**Nothing was deployed or promoted. No Vercel setting, Supabase record, policy, account, function, or production file was changed.**
