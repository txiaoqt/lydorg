# Organization/PWA Node 24 release readiness

Prepared 2026-10-12. **Local preparation only; no deployment, promotion, provider setting change, Git push or Supabase operation was performed.**

## Decision

**CONDITIONAL GO for a separately authorized, candidate-only `yorbms_user` deployment.** The isolated source installs and builds twice on Windows Node 24; all 53 generated files are identical. The seven approved runtime files are unchanged. Hosted Linux/Node/Python execution and owner browser acceptance remain pending.

**TypeScript: FAIL, 651 errors, exit 2.** This is not a type-clean release. No release-introduced type defect was identified after reviewing the one changed diagnostic rendering. Existing errors include production runtime code, not just tests. The conditional decision permits a protected candidate for hosted validation; it does not authorize domain promotion or the Storage cutover.

**Domain promotion: not yet assessed against a hosted candidate. Restrictive Storage cutover: NO-GO under this task.** Historical access decisions, the separate Admin budget cleanup issue and fresh cutover gates remain open in the [prior release plan](../../organization-storage-review/20261012T100755Z/isolated-release-plan.md).

## Target and preservation

| Item | Identity |
| --- | --- |
| Team | `toffs-projects-81b2ce10` / `team_lrnDtn1fujS9WebCMQoWHmGR` |
| Only release project | `yorbms_user` / `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N` |
| Organization deployment to preserve until separate promotion | `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV` |
| Admin deployment to preserve | `dpl_AZ287kU35oFTVqyTEQRf749qncAA` |
| Base Git HEAD / branch | `2f6e7427c553b7535f53860d1732b42df7c023e8` / `ui-refactor` |
| Fixed release version | `1.0.0-org-storage-rc+20261012114439.vercel24` |

Input archive SHA-256 matched `d1ff2d73d53d43b43e08a9f77237058159fa97b03d0e137d245efd457ae7874d`. All 558 input entries and source revision `094b8ddfc91221c427586f81b920ff7e16ddcd4e22d3f5d27b25f3d255c2084f` were verified before extraction. The archive and earlier evidence remain intact. Existing tracked dirty files, recorded deletions and HEAD were checked against the start-of-task snapshot; no existing source was overwritten.

Live provider identities above are the accepted previous evidence, not fresh provider API checks in this local task. Reconfirm them immediately before any future deployment.

## Exact packaging changes

Only six packaging files differ from the approved input:

| File | Change |
| --- | --- |
| `package.json` | Node `24.x`; build and `build:vercel` invoke the Organization wrapper; add packaging-test entrypoint. Dependency declarations and existing postinstall are unchanged. |
| `vercel.json` | `npm ci --include=dev --no-audit --no-fund` and `npm run build`; output `build`, rewrites and all headers/CSP retained. |
| `scripts/build-organization-release.mjs` | Organization-specific validation, clean Vite child process, fixed release version and empty environment-file directory. |
| `scripts/organization-release-config.json` | Pins Organization/team identity, four-value public fingerprint, version and preservation hashes; contains no public-key literal or private credentials. |
| `scripts/build-organization-release.test.mjs` | 44 packaging/security assertions. |
| `requirements.txt` | Existing successful Python packaging declaration reused: requests and python-dotenv pinned; urllib3 has the reviewed bounded range. API and worker code unchanged. |

All seven reviewed runtime files are byte-identical: `lydo-connect-supabase.ts`, `signed-storage-url-cache.ts`, `admin-storage-access.ts`, `query-client.ts`, `lydo-connect-store.tsx`, `PwaOrganizationAvatar.tsx`, `PwaDocumentPreview.tsx`. Their full paths/hashes are in [source-manifest.json](source-manifest.json). No unrelated PWA download/offline/styling/performance changes were added.

## Environment and security review

Four public inputs are required:

- `VITE_DEPLOY_SURFACE=user`
- `VITE_ENABLE_STANDALONE_USER_PWA_UI=true`
- `VITE_SUPABASE_URL=https://mqqaykksadotbrghbexz.supabase.co`
- Existing production-bound public `VITE_SUPABASE_ANON_KEY`, supplied through the approved environment and never printed here.

Sorted public-configuration JSON fingerprint: `cb861a63dc9a73eda9a295c21d659fabed8ea4dba15bf8722264b281e9c525bf`.

The wrapper requires Node major 24. In Vercel it requires `VERCEL=1`, the exact Organization project ID and `VERCEL_ENV=production`; supplied target/team identifiers must also match. Outside the verified Vercel context, unknown `VITE_*` names are rejected. Within that context all extra public/provider values are discarded without reading their contents, except the two environment labels checked for consistency. Missing or incorrect approved settings fail closed.

Vite runs in a fresh child with the four approved settings, a small OS/runtime allowlist, `NODE_ENV=production` and `TZ=UTC`. No provider/operator secret variables, `NODE_OPTIONS` or parent version override are forwarded. An empty `envDir` prevents root/private env-file loading. The build version is fixed through the Vite API. Tests include a real child-environment check and wrong project/team/key-class/configuration cases.

Decoding the public anon key's role/ref is a format check, **not cryptographic JWT validation**. The exact independently pinned public-configuration fingerprint also has to match. Organization runtime authorization remains genuine owner Auth/JWT plus server RLS; no service role is added to the frontend.

Vercel documents project/environment system variables but does not guarantee an automatically injected team-ID variable. Runtime project validation uses the globally unique pinned project ID; optional team IDs are checked when supplied. Authenticated provider verification of the actual team/project is mandatory at deployment. Environment labels alone are not a cryptographic control-plane attestation. See [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Actual local validation

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Fresh npm ci | **PASS 2/2** | Separate source directories, empty separate caches, lockfile unchanged; Node 24.21.0 / npm 11.19.0, Windows x64. |
| Isolated Organization builds | **PASS 2/2** | First build injected ten benign provider/private canaries; second did not. Neither loaded private env files. |
| Generated reproducibility | **PASS 53/53** | Every byte and path matches; 19,518,681 total bytes. [reproducibility.json](reproducibility.json). |
| Focused Vitest | **PASS 73/73** | Nine existing mocked frontend suites; no live account, Storage or database test. [focused-tests.json](focused-tests.json). |
| Packaging/security tests | **PASS 44/44** | Passed in candidate and independently installed reproduction directory. Initial `.tap` file contains Node's default spec reporter; [packaging-review.tap](packaging-review.tap) is explicit TAP. |
| Python dependency check | **PASS** | Reused isolated Windows venv, `pip check`; no dependency changes to host environment. |
| Python API packaging tests | **PASS 7/7** | Windows Python 3.14.3; Python 3.12 grammar parse, imports, GET 405, OPTIONS 204 and authorization branches with all external HTTP mocked/blocked. No sync POST was sent. Actual Python 3.12/provider execution **NOT TESTED**. |
| App TypeScript | **FAIL 651** | Actual `tsconfig.app.json`, exit 2; no compiler suppression/config weakening. See below. |
| Prior isolated SQL compatibility | **REUSED PASS 1/1** | Earlier PGlite foundation/cutover SQL test. No packaging file changes SQL/RLS/classification inputs; not rerun and not claimed as new live evidence. |
| Prior classification tests | **REUSED PASS 8/8** | Earlier offline conservative classification/redaction test; no data reclassification. [reused-validation.json](reused-validation.json). |
| Browser artifact secret/canary scan | **PASS** | All generated text artifacts, exact injected canaries, service-role JWT/secret-key/operator-variable patterns and unexpected project origins. A bounded scan, not universal proof of no possible secret. [bounded-browser-scan.json](bounded-browser-scan.json). |
| Source/ZIP verification | **PASS** | 562 source entries; seven runtime hashes, lockfile, API/worker, rewrites/headers unchanged; ZIP entries round-trip to manifest; archive generation repeated identically. |
| Diff checks | **PASS** | Root `git diff --check`, selected packaging-diff whitespace check and original dirty-tree preservation. |
| Hosted Linux/browser/PWA | **NOT TESTED** | No deployment authorized. Windows success does not establish Linux, installed-PWA, device or live owner-upload compatibility. |

Build warnings remain: stale Browserslist data and chunks over 500 kB. Dependencies/optimization were not changed for these warnings. npm audit was not run. The preserved urllib3 range and provider Node patch selection mean Python/provider runtime dependencies are not fully pinned by these Windows static-artifact results. Hosted logs and artifact checks remain necessary. Vercel supports Node 24 major and automatically selects minor/patch updates: [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## TypeScript baseline and release risk

[typescript-comparison.json](typescript-comparison.json) retains the raw comparison: 651 baseline / 651 current, one changed diagnostic text. Known absolute dependency-root normalization leaves 650 matching occurrences and one shortened ExcelJS object display variant. The changed error remains `report-export.ts(738,25)`, TS2352. Source bytes match the preserved baseline; TypeScript implementation and ExcelJS declaration hashes match; the nested error chain is identical. [typescript-rendering-resolution.json](typescript-rendering-resolution.json) records why this is an existing diagnostic, not a newly introduced defect. The first investigation's CRLF-versus-`git show` comparison failure is retained rather than erased.

The seven-file subset has **22 existing errors**, all in `lydo-connect-supabase.ts`; its 26-file local import closure has another **45** errors. Full locations/functions are in [typescript-scope-review.json](typescript-scope-review.json). These errors were inspected, not blanket-classified as harmless:

| Existing group | Assessment and required follow-up |
| --- | --- |
| Missing YPOP/budget type names, seed fields, template array/string fallback | Type/declaration mismatches survive as technical debt; missing names occur in type positions, not executable identifiers. The defensive template string branch contradicts its row type. No packaging change touches them. |
| Six Realtime callback signature errors | Existing payload callback/helper typing mismatch affects registration/renewal refresh code; focused cache tests are not full live session/realtime proof. Check owner status refresh in hosted acceptance. |
| Two avatar `profileImageUrl` errors | The authenticated context returns the raw `OrganizationProfileRow` with `profile_image_url`; these cleanup branches read the camel-case field. This is a concrete existing cleanup risk: the old object can be left behind. It is not introduced here and must not be hidden by the PWA display tests. Upload/removal behavior needs a separately scoped fix/review before claiming full avatar cleanup coverage; no live destructive test is authorized here. |
| Budget/YPOP status alias comparisons and Admin review-row union | Existing contract/typing risks in shared service code. They are outside the new upload-path/environment hunks; targeted owner workflow/permission acceptance is still required before promotion. |
| Liquidation `report.remarks` absent from selected fields | Existing notification-detail omission risk, not part of file ownership authorization. Keep as a separate defect. |
| 45 import-dependency errors | 16 in Admin settings types, 28 in shared seed/data declarations, one registration activity `referenceId` mismatch. These dependencies are not all test-only. Preserve and triage independently; the local build transpiles without typechecking. |
| ExcelJS report-export cast | Existing runtime dependency boundary/type assertion error with changed formatting; report export is not certified by this release's 73 tests. |

No new diagnostic was waived. The compile check remains **FAIL**. Candidate-only deployment can supply hosted evidence without moving the live domain; promotion requires explicit acceptance of the baseline risks and relevant operator smoke results. A type-clean release policy would remain **NO-GO** until the baseline is fixed in its own reviewed scope.

## Exact release artifacts

Source revision is a content digest, not a Git commit. Inventory fingerprints hash the ordered `{path, bytes, sha256}` arrays encoded as compact JSON.

| Artifact | Identity |
| --- | --- |
| Source revision | `0e3f313a4ca9c4a96242ab539767a5d2ad9a5e906483031c101e906f179d01dd` |
| Source ZIP | `.agent/organization-storage-vercel-20261012T114439Z/organization-storage-vercel24-source.zip` |
| Source ZIP SHA-256 | `e7d43c8aa7d0d0a2cc42130eafd34ad9b1b5147aeb416aba55349353f7fa33c8` |
| Source ZIP size / entries | 15,424,325 bytes / 562 |
| Static ZIP | `.agent/organization-storage-vercel-20261012T114439Z/organization-storage-vercel24-static.zip` |
| Static ZIP SHA-256 | `12f9d3da83e0669e8bde62879d3615782c877768571f79799a9d02bf162c62d3` |
| Static ZIP size / entries | 11,956,896 bytes / 53 |
| Generated inventory SHA-256 | `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94` |

Complete machine-readable identities: [release-artifacts.json](release-artifacts.json), [source-manifest.json](source-manifest.json), [static-manifest.json](static-manifest.json). The static ZIP is **not** a Vercel Build Output API artifact and must not be used with `--prebuilt`.

## Next separately authorized action

Use the [deterministic recipe](build-recipe.md), [hosted acceptance/recovery checklist](hosted-acceptance-and-recovery.md) and [authorization template](candidate-deployment-authorization.md). Deployment must use fresh archive extraction, explicit Organization/team identity and the reviewed production-without-domain route. Both projects share the GitHub `main` integration; a shared push could replace the successful Admin release. No Git push is part of this plan.

The locally validated PWA download/offline corrections remain outside this approved seven-file subset. This release does not newly certify cold offline startup, installed-PWA or full download behavior. Preserve those separate candidates and evidence.
