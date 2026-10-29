# Admin frontend: authenticated Vercel release review

Reviewed on 12 October 2026. **Decision: NO-GO for deployment using the current default Vercel build route.** Authentication is resolved. The isolated application correction remains intact; provider build alignment and a security-preserving recovery target still require review.

No deployment, promotion, rollback, project/environment change, Git push, Supabase request, account operation or production business mutation was performed. The one-time gateway acceptance helper was not rerun.

## Results

| Required check | Result | Evidence and limit |
|---|---|---|
| Authenticated Vercel access | PASS | Official CLI authenticated; project, deployment and team-scoped GET requests succeeded |
| Exact Admin project and production alias | PASS | `lydorg`, `prj_J36xqAUQELX8NttCaFFInsxcCEaI`; verified domain maps to the expected READY deployment |
| Build and runtime configuration | FAIL for pinned-release compatibility | Settings were retrieved successfully, but Node 24.x / `npm install` / `npm run build` do not match the validated Node 22.14.0 and fixed-version build recipe |
| Isolated release integrity | PASS | Both ZIP hashes and all 557 source-file hashes match; existing 91/91 tests and 53/53 reproduced build files remain applicable to those unchanged artifacts |
| Isolated release compatibility with default provider build | FAIL | The deterministic build wrapper is outside the source ZIP; the packaged default Vite configuration stamps the current time |
| Production environment compatibility with pinned build | FAIL: parity not established | Provider and local build use different public-variable sets; encrypted provider values were not decrypted. Current public endpoint/key checks pass separately |
| Previous production deployment retrieval | PASS | Exact immutable deployment remains READY and is still the current production target |
| Security-preserving rollback/recovery readiness | BLOCKED | That deployment lacks the gateway integration and corrected missing-session behavior. No independently verified compatible recovery deployment exists yet |

These FAIL results identify unmet release criteria. They do not establish that the current provider's encrypted public-variable values are incorrect.

## 1. Authoritative provider identity

Team: `toffs-projects-81b2ce10`, ID `team_lrnDtn1fujS9WebCMQoWHmGR`.

| Property | Admin | Organization/public/PWA |
|---|---|---|
| Vercel project | `lydorg` | `yorbms_user` |
| Project ID | `prj_J36xqAUQELX8NttCaFFInsxcCEaI` | `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N` |
| Production domain | `y-trace-admin.vercel.app` | `ytrace.app`, `www.ytrace.app` |
| Production deployment | `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ` | `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV` |
| Deployment state | READY | READY |
| Git repository | `txiaoqt/lydorg` | `txiaoqt/lydorg` |
| Production branch | `main` | `main` |
| Deployed commit | `2f6e7427c553b7535f53860d1732b42df7c023e8` | Same |
| Root directory | Repository root (`null` in API, `.` in CLI) | Same |
| Framework / Node | Vite / 24.x | Same |
| Install / build / output | `npm install` / `npm run build` / `build` | Same |

Admin immutable URL: `https://lydorg-gdb25hm7m-toffs-projects-81b2ce10.vercel.app`. Authenticated domain metadata confirms verification and assignment to the Admin project. Both current deployments originated from Git. Git fork protection is enabled.

**Shared-repository release risk:** both projects track the same root and production branch. A push/merge can cause deployments of both surfaces; do not use a shared-repository push as an Admin-only release mechanism. No disabling Git rule appears in the unchanged candidate configuration. Exact future webhook execution was not exercised. Vercel documents automatic deployments from connected Git branches. [Vercel Git deployments](https://vercel.com/docs/git)

## 2. Provider configuration and existing API behavior

The candidate retains the deployed commit's `vercel.json`:

- `/api/sync-run-once` keeps its local Python function route.
- Other `/api/(.*)` requests keep the existing `airnet-backend.vercel.app` proxy.
- Remaining routes rewrite to `/index.html`.
- CSP and the existing frame, MIME, referrer, permissions and resource-policy headers remain intact.

Fresh public GETs returned HTTP 200 for `/` and `/admin/settings`, with identical HTML. All six reviewed security-header values match the candidate configuration. No API function was invoked. Authenticated deployment inspection lists `api/sync-run-once`, 64.42 MB, region `iad1`.

The ZIP includes the unchanged Python entrypoint and both worker modules. Their third-party imports include `requests` and `python-dotenv`; the isolated source contains no Python dependency/version manifest. READY deployment status and preserved source prove neither a fresh Python dependency installation nor execution of that function. Preserve its server-only environment and verify packaging/imports in the eventual candidate build before alias promotion. Do not add dependency changes without review. [Vercel Python dependency configuration](https://vercel.com/docs/functions/runtimes/python)

## 3. Environment evidence, without secret values

Authenticated API inspection used `decrypt=false`. No provider environment values were written to evidence files, and no sensitive variable was decrypted.

| Admin variable name | Provider type | Targets |
|---|---|---|
| `VITE_DEPLOY_SURFACE` | encrypted | production, preview |
| `VITE_SUPABASE_URL` | encrypted | production, preview |
| `VITE_SUPABASE_ANON_KEY` | encrypted | production, preview |
| `VITE_ADMIN_APP_URL` | encrypted | production only |
| `SUPABASE_SERVICE_ROLE_KEY` | sensitive | production, preview |

Required public intent is `admin`, the exact production Supabase origin, a production-bound public anon key, and the verified Admin URL where configured. Service-role credentials must remain server-only and must never receive a `VITE_` prefix or enter browser build definitions.

Fresh reads of the public, unauthenticated production JS found the production origin and one production-bound anon JWT; no staging origin, service-role JWT pattern or `sb_secret_` pattern was found. These are bounded literal checks, not a universal secret audit. The old bundle lacks the gateway name, consistent with its verified pre-integration source commit. No Supabase API was contacted.

**Unresolved parity:** the pinned local build passed `VITE_ENABLE_STANDALONE_USER_PWA_UI` and did not pass `VITE_ADMIN_APP_URL`; the Admin provider configuration has the latter and not the former. The tested build also supplied its own fixed version. Do not claim default Vercel output equals the pinned build. Before another artifact is approved, verify only the allowlisted public configuration privately and record equality/classification results, never key values. [Vercel environment metadata API](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name)

## 4. Candidate identity and exact build differences

The unchanged candidate is content-addressed, not a new Git commit:

`sha256:ffe95e19a23eb8f9db43bf6c6199de787b88a8106ec157e57192b468fd082e0c`

| Artifact | Bytes | Reverified SHA-256 |
|---|---:|---|
| `admin-gateway-source-complete.zip` | 15,416,255 | `9c3f2747ccf9b5f3a6723decb3e3ec9f7ff7eff64a98957141578d57d95ca8e3` |
| `admin-gateway-build.zip` | 11,957,125 | `197daaaf91c3bc9f0817e9d469c4e950df2e48f94a0fa477e3058cc352c9614b` |

Runtime scope remains five files: `admin-storage-access.ts`, the selected `lydo-connect-supabase.ts` hunks, `signed-storage-url-cache.ts`, `query-client.ts`, and the private-cache cleanup additions in `lydo-connect-store.tsx`. No PWA/performance work, migration, production operator script or fixture is added to this release.

| Difference | Consequence |
|---|---|
| Tested Windows Node 22.14.0; provider Node 24.x | Provider toolchain compatibility and output identity have not been reproduced |
| Reproduction reused the existing dependency installation; provider uses `npm install` | Fresh-install equivalence is unproven; no `npm ci` claim is justified |
| Default Vite config generates a timestamp and optional Git SHA | `VITE_APP_VERSION` alone cannot reproduce the fixed version: the config reconstructs it |
| Deterministic wrapper lives outside the source ZIP | Uploading this source ZIP and accepting provider defaults will not execute that wrapper |
| Public configuration sets differ | Redirect/surface configuration needs alignment before accepting a new artifact |
| Static ZIP contains ordinary Vite output | It is not a Vercel Build Output API artifact and does not package the Python function |

Vercel supports Node 24.x and 22.x, automatically updating minor/patch versions. Merely changing the major selection would not prove exact local reproducibility. [Supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

**Proposed resolution for separate review, not implemented here:** prepare a new isolated variant with a self-contained deterministic build wrapper, explicitly reviewed public configuration, lockfile-based install and validation on the selected provider-compatible Node/Linux route. Prefer alignment with the existing Node 24 setting to avoid project-wide changes. Preserve the five runtime changes; add only reviewed packaging requirements. Resolve Python dependency packaging without changing endpoint behavior. Generate new source/build hashes rather than overwriting these approved artifacts or claiming their hashes remain valid.

## 5. Recovery and proposed release sequence

Read-only `rollback status lydorg` and `promote status lydorg` both report no operation in progress. CLI inspection and public HTTP retrieval confirm the designated deployment is available. No rollback or promotion was invoked; provider write entitlement was not exercised.

**Old deployment: recovery NO-GO.** Restoring it would remove gateway integration and the fail-closed resolver correction. It would also be incompatible with the future restrictive Storage cutover. Provider retrieval eligibility does not make it a security-preserving fallback.

The proposed controlled route, after build alignment and separate authorization, is:

1. Pin the Admin team/project IDs explicitly; use only the reviewed isolated source, never the dirty root or a Git push.
2. Create a production-environment candidate with automatic domain assignment suppressed. Vercel supports `--prod --skip-domain`; promotion is a separate write. This is a proposed future route, not an instruction to execute now. [Vercel staged production deployment](https://vercel.com/docs/cli/deploy)
3. Verify the resulting source/build identity, API-function packaging, CSP/rewrites, public configuration and scoped frontend smoke tests before promotion. Any production-session/file test needs its own appropriate scope; do not reuse the one-time acceptance helper.
4. Retain the independently verified compatible deployment and immutable evidence as the recovery basis. Obtain explicit authorization before domain promotion.
5. After release, recover through a separately reviewed compatible forward build or approved re-promotion of an intact compatible deployment. If none is usable, prepare a fail-closed Admin access pause; never restore the vulnerable resolver or weaken backend controls automatically.

Rollback and promotion mechanisms are documented but were not executed. Their plan/permission restrictions must be confirmed before use. [Rollback](https://vercel.com/docs/cli/rollback), [promotion](https://vercel.com/docs/cli/promote)

## 6. Validation and preservation

- Reused unchanged evidence: 91/91 focused assertions, TypeScript, two isolated Admin builds and 53/53 byte-identical generated files. These were **not rerun** in this provider review.
- Fresh: both ZIP hashes, 557/557 source hashes and source revision match.
- Fresh: `git diff --check` exits 0 with zero diagnostics when the per-command fsmonitor/safe-CRLF workarounds are used; no Git setting was changed.
- Branch and HEAD remain `ui-refactor` / `2f6e7427c553b7535f53860d1732b42df7c023e8`; 64 tracked dirty entries remain.
- Original snapshot preservation passes: 4,108 present originals retain their expected hashes except the two already documented resolver/test changes from the preceding task; 18 entries explicitly recorded as missing remain missing. An intermediate local check misinterpreted those missing-state flags; `preservation-verification-final.json` corrects that interpretation. No file restoration/deletion occurred.
- Only new read-only helper/evidence files and this report were created in this review. No application source, candidate, build archive or previous report was changed.

CLI 49.2.0 handled initial authenticated inspection. A temporary pinned official `vercel@63.1.2` package supplied the read-only API command and reused the official login; the installed global CLI and repository dependencies were not upgraded. Raw API payloads were filtered in memory and not saved. The separate in-app browser was unauthenticated and was not used to extract credentials. [Official authenticated CLI API](https://vercel.com/docs/cli/api)

## Remaining blockers and authorization

1. Approve and validate the provider-compatible build/packaging proposal, including the public-variable differences and existing Python function.
2. Pin the resulting artifact and deployment route; the existing static ZIP is not deployable as `--prebuilt` output.
3. Review a compatible recovery basis and a fail-closed contingency before alias promotion.

**No production deployment authorization template is issued yet**, because the requested prerequisite checks have not all passed. Once these local/provider-route issues are resolved, the authorization must name the new exact artifacts, Admin project/team, production-without-alias candidate step, bounded acceptance scope and separately approved promotion/recovery actions. It must exclude the Organization project, Storage policy cutover and all backend changes.
