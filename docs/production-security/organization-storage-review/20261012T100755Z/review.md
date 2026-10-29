# Organization/PWA Storage compatibility review

Date: 2026-10-12. Scope: read-only provider/production inspection and local preparation. No deployment, promotion, database mutation, Auth/session creation, Storage operation, policy change or Git push was performed.

## Decision

**CONDITIONAL GO for isolated Organization/PWA release preparation.** The minimal candidate is assembled and its focused tests/build pass. A reviewed Node 24 hosted build recipe and separately authorized candidate deployment/acceptance are still required. **NO-GO for the restrictive Storage cutover today** pending the access/cleanup decisions below and successful independent Organization release verification.

The promoted Admin release is preserved. This review does not require a new staging environment or another full renewal/PWA test run.

## 1. Verified deployed identities

| Surface | Project | Current serving deployment | Verification |
| --- | --- | --- | --- |
| Organization/public/PWA, `ytrace.app` | `yorbms_user`, `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N` | `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV` | Authenticated Vercel project, deployment and alias GETs; READY |
| Admin, `y-trace-admin.vercel.app` | `lydorg`, `prj_J36xqAUQELX8NttCaFFInsxcCEaI` | `dpl_AZ287kU35oFTVqyTEQRf749qncAA` | Authenticated alias/project GETs; unchanged |
| Admin Storage gateway | Supabase production `mqqaykksadotbrghbexz` | ACTIVE v1 | Fresh read-only Edge Function inventory; nine functions |

Team: `toffs-projects-81b2ce10`, `team_lrnDtn1fujS9WebCMQoWHmGR`.

Vercel's Organization deployment `gitSource.sha` and `githubCommitSha` both identify `2f6e7427c553b7535f53860d1732b42df7c023e8`, matching local `ui-refactor` HEAD. The provider deployment came from `main`; branch names alone were not used as identity evidence. Public HTML/entry hashes still match the previously saved deployed evidence. Serving version: `1.0.0+20261008175023.2f6e742`.

- Root, `/dashboard`, `/app`, service worker and manifest: direct public GET 200, without executing application JavaScript or a browser service worker.
- Deployed entry SHA-256: `3bd8bbf60b9aa9831fc809a3d5b4ab97ef8db4c87f6778c69dcaf472fba7892b`.
- Full Vercel source-tree retrieval: **BLOCKED** because the deployment files endpoint returned 404. Provider Git identity and sampled public artifact identity are verified; a complete remote source/bundle digest is not claimed.
- Final provider preservation check: both aliases/production targets unchanged, with no queued/building deployments observed. This is a point-in-time observation, not an exclusive execution window.

Evidence: `provider-metadata.json`, `provider-preservation.json`, `public-frontend.json`, `gateway-preservation.json`.

## 2. Smallest required runtime changes

These corrections already existed in the dirty worktree. An explicit subset was assembled against the verified deployed commit, preserving unrelated work. Only seven runtime files differ in the isolated candidate:

| File | Required change |
| --- | --- |
| `src/lib/lydo-connect-supabase.ts` | Unique UUID object names and insert-only uploads in the shared budget/liquidation/YPOP helper; unique renewal draft/revision paths and insert-only renewal draft upload; account-scoped signing, reauthorization of canonical saved signed links, denied-signing failure without public fallback; fail-closed Admin-route gateway branch |
| `src/lib/signed-storage-url-cache.ts` | Partition signed URL/pending request state by current authorization context, bound freshness by session expiry, invalidate stale work |
| `src/lib/admin-storage-access.ts` | Dependency of the shared resolver's Admin-route branch; organization owner requests continue using their Supabase JWT and Storage SDK |
| `src/lib/query-client.ts` | Cancel/remove private `user` and `admin` queries during identity transitions |
| `src/lib/lydo-connect-store.tsx` | Call that private-query cleanup on account/reset transitions |
| `src/user/pwa/PwaOrganizationAvatar.tsx` | Remove independent path-only signed URL cache; invalidate/re-resolve on authorization change and discard late results |
| `src/user/pwa/PwaDocumentPreview.tsx` | Close private preview on logout/direct account switch; discard late preview resolution |

Precisely two Storage upload option corrections are included relative to the deployed base: the generic attachment helper and the renewal **draft** upload change from `upsert: true` to `false`. Renewal revision upload was already insert-only; its timestamp-only name now also receives a UUID. Database metadata upserts and supported revision RPCs are separate operations and retain their existing contracts.

Exact service changes: `selected-storage-service-final.patch`. All source file hashes: `source-manifest-release.json`. Two new root QA files: `src/lib/organization-storage-compatibility.test.ts` and `src/lib/organization-parent-upload-compatibility.test.ts`. No existing root runtime source file was edited by this review.

Excluded: PWA Download File/new-tab fixes, offline app-shell/service-worker fixes, styling, performance/lazy-loading changes, Admin budget cleanup changes, SQL and fixture utilities, credentials/operator state, and dirty build outputs. The avatar/preview changes above are private-data cleanup corrections, not a PWA visual redesign.

## 3. Workflow compatibility

| Workflow | Findings against planned restrictive policies | Evidence/limit |
| --- | --- | --- |
| Registration and registration revisions | Existing unique `{org}/{document-type}/...` paths, standard/TUS insert-only uploads and supported owner linkage RPCs fit real-parent ownership checks | Source review; local SQL; mocked upload transport tests; earlier real staging evidence reused |
| Renewal draft/revision | `{org}/renewal/{renewal-id}/{type}/...`; UUID paths, no object overwrite; correction links through `user_replace_document_submission_file` | New focused client tests and local SQL. No live renewal was replayed |
| Budget, liquidation, YPOP attachments | Parent UUID remains first path segment. Generic helper must insert a fresh unique object; it is now included in the isolated source | Six new mocked tests exercise actual exported functions, including denial before metadata insert |
| Owner preview/download | Storage signing uses current organization JWT; cache keys include principal/token context; failed signing yields unavailable state | Resolver/cache tests. Authorization remains server-side; client session inspection is not an authorization grant |
| Avatars | `{org}/profile/...`, insert-only, scoped profile update; exact approved public avatar path additionally requires directory eligibility/consent and supported image MIME | Source and local SQL review; avatar cache/account-switch tests |
| TUS/resumable registration uploads | Existing owner bearer token, current-account recheck before requests, 6 MiB chunks, unique names/no overwrite, bounded transient retries | Focused mocked transport checks. No new live interrupted upload was authorized or executed |
| MOVE | Foundation recognizes real MOVE parent relationships; no dedicated application MOVE upload workflow was identified to migrate | Existing local SQL path/denial checks. No new MOVE feature or claimed browser coverage |
| Active templates | All 13 current active template references resolve under foundation normalization; anonymous/owner reads can use the active-reference policy | Read-only metadata and local SQL; old unreferenced versions receive no new access |
| Published news | All three published references resolve. Public bucket HTTP delivery remains public; tightening `storage.objects` SELECT does not make formerly public binaries private | Read-only metadata and policy review; no new image upload or deletion |

The intended cutover supplies no private UPDATE policy. Replacing a document means creating a distinct object and using the supported metadata workflow. Unknown parents/paths receive no compatibility bypass. Client denial cannot be converted into a service-role or public-URL fallback.

Official TUS reference reviewed: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads). Owner JWT and server RLS remain authoritative; no frontend service-role credential is required.

## 4. Historical references: preserved, not declared unused

All 378 Storage object metadata identities match the prior saved inventory: zero changed, missing or reclassified objects. Paths are represented by SHA-256 in this report's machine-readable inventory, not filenames/content.

| Bucket | Objects | Supported current/history references | Unlinked | Exact history references |
| --- | ---: | ---: | ---: | ---: |
| organization-documents | 189 | 39 | 150 | 2 |
| budget-request-files | 37 | 6 | 31 | 0 |
| liquidation-report-files | 21 | 5 | 16 | 0 |
| ypop-files | 38 | 21 | 17 | 0 |
| move-files | 1 | 0 | 1 | 0 |
| template-files | 69 | 13 | 56 | 0 |

For these 355 private/template objects: **82 legitimately retained, 2 required historical evidence, 271 unresolved, 0 verified unused**. The 271 unresolved objects comprise:

- 128 private objects associated with the legacy test owner;
- 85 private objects without a surviving owner/organization association;
- 2 private objects associated with current non-test owners but lacking supported parent metadata;
- 56 unreferenced template versions, not 56 inactive template rows.

The prior per-object audit correlation is reused because object identities/classifications match; this was not another exhaustive audit/archive investigation. Seeded data is not proof of dispensability. No object was deleted, renamed, relinked, backfilled, downloaded or newly authorized.

Required decision before cutover: operators must identify any legitimate application/history access among unresolved objects. Either approve retention in place with explicitly accepted ordinary-access denial, or separately review a supported metadata/access remediation based on genuine evidence. Investigate the two current-owner budget/liquidation objects first. Deletion is not required to release the compatible frontend or to tighten policies.

Redacted per-object matrix and disposition: `historical-reconciliation.json`. Existing restricted operator path inventory remains untouched under `.agent/security/production-storage-review/20261011T113322Z/`.

## 5. Separate Admin budget deletion issue

`deleteAdminBudgetRequestsInSupabase` calls `admin_bulk_delete_budget_requests`, then attempts direct private Storage `remove` calls from the browser. The custom Admin token is not an organization JWT. The gateway permits private-file signing, not arbitrary private budget deletion. After parent deletion, supported ownership/parent evidence is gone. Under restrictive policies this cleanup can be denied or affect zero objects, while `error: null`/an empty response is currently treated as success.

This is a separate **physical cleanup/retained-orphan compatibility issue**, not justification for weaker owner policies or adding Admin work to this Organization release. No production deletion was tested. Existing deletion mocks cannot prove physical deletion.

Proposed narrow cutover mitigation for separate review: pause that destructive Admin cleanup workflow or explicitly retain files with accurate operator reporting. A permanent solution needs a server-authorized, exact resource/receipt-based cleanup design and persisted-object verification, preserving historical evidence. Do not grant broad private DELETE or use path-only authorization. No such change was made here.

## 6. Validation results

| Check | Result | Scope |
| --- | --- | --- |
| Focused Vitest | **PASS 73/73**, nine files, zero failed suites | Mocked organization uploads, renewal locks/linkage, TUS, signing/cache/account switching, production-network test guard |
| Isolated SQL compatibility test | **PASS 1/1** | PGlite PostgreSQL fixture exercising actual foundation/cutover SQL, roles, supported paths/history, denials and persisted state; not a hosted Storage API test |
| Classification tests | **PASS 8/8** | Offline conservative retention/classification/redaction |
| Isolated production-mode Vite build | **PASS**, 53 static files | Node 22.14.0 locally, projected four public settings, empty env-file directory; runtime inputs match final source exactly |
| TypeScript app project | **FAIL: 651 baseline / 651 candidate**, zero new diagnostic identities | Actual `tsconfig.app.json`, including existing tests. These failures are retained, not described as harmless or as a compiler pass |
| `git diff --check` | **PASS** | Existing repository line-ending configuration retained |
| Bounded generated browser scan | **PASS** | 27 text files; correct production public anon literal; no detected service-role JWT, `sb_secret_` key, listed operator variables, canaries or unexpected project origins |
| Fresh production metadata/catalog | **PASS** | 14 foundation function definitions/owners/security/config/ACLs match receipt; 164 migrations; 15 unchanged Storage policies; all 378 objects preserved |
| End-of-review business preservation | **PASS** | Exact fingerprints of document files/submissions, accreditation and renewal tables unchanged; not a fresh 57-inventory audit |
| New authenticated browser/real Storage HTTP tests | **NOT TESTED** | No sessions or mutations created. Previously verified staging/API and Admin acceptance evidence was not rerun |
| Hosted Node 24 build and full candidate acceptance | **NOT TESTED** | No deployment authorized |

An intermediate new QA file had a syntax error: its suite could not collect, while the existing 67 assertions passed. The syntax was corrected, and all 73 final assertions now pass. The failed Vitest/TypeScript evidence remains saved. An initial draft archive omitted the existing generic helper correction; final source review caught it before any deployment. Earlier drafts are superseded and must not be deployed.

The successful runtime build precedes only the QA syntax/filename-expectation repair. Every runtime, dependency, configuration and public-asset byte is unchanged; the final archive changes only that new test file. `release-artifacts.json` records the comparison. TypeScript diagnostic comparison ignores line shifts only, comparing file, code, message and occurrence counts.

## 7. Exact isolated review artifacts

- Verified base commit: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- Final source revision: `094b8ddfc91221c427586f81b920ff7e16ddcd4e22d3f5d27b25f3d255c2084f` (content digest, not a Git commit).
- Source: `.agent/organization-storage-review-20261012T100755Z/candidate-release/`.
- Source archive: `.agent/organization-storage-review-20261012T100755Z/organization-storage-source-reviewed.zip`.
- ZIP SHA-256: `d1ff2d73d53d43b43e08a9f77237058159fa97b03d0e137d245efd457ae7874d`; 15,415,534 bytes, 558 files.
- Static inventory SHA-256: `da35da7fde70170bcee2a615be9e67d0e4f387554b98da5ebe53a1fa7f36fa37`; 53 files.
- Review build version: `1.0.0-org-storage-rc2+20261012100755`.
- Public configuration fingerprint: `cb861a63dc9a73eda9a295c21d659fabed8ea4dba15bf8722264b281e9c525bf`.

The archive is a local review candidate, not yet a reviewed Vercel deployment payload. Static output is not Vercel Build Output API format. Node 24 provider parity is not established by the local Node 22 build.

## 8. Remaining blockers and independent release approach

1. Prepare/review an Organization-specific Node 24 build wrapper using the successful Admin environment-isolation approach. Pass only the four approved public values to Vite, fix release version, use the lockfile, preserve `/api`/Python packaging and reject secret forwarding. Keep Vercel settings unchanged and rehash the resulting source. Provider currently uses `npm install` / `npm run build`, while this local review used installed dependencies and a controlled Vite invocation.
2. Obtain separate authorization for a candidate-only deployment scoped to `yorbms_user`; verify hosted artifacts, harmless API GET/OPTIONS, routes/headers and operator owner-file/account-switch checks. Do not run external sync POST or invent new sessions under this review.
3. Obtain separate promotion approval only after acceptance. Verify every alias affected by promotion and confirm Admin remains on `dpl_AZ287kU35oFTVqyTEQRf749qncAA` before/after. The current review verifies `ytrace.app`; future promotion must enumerate all affected Organization aliases.
4. Both projects are connected to `txiaoqt/lydorg`, production branch `main`, repository root, with no configured ignore command observed. A shared-main push may automatically replace **both** production frontends. Use an isolated explicit-project CLI deployment without a Git push; Git auto-deployment controls require separate settings authorization if desired.
5. Before policy cutover, finish unresolved historical-access decisions, address/pause the separate Admin budget cleanup flow, verify the independently released Organization frontend, refresh exact policy/catalog/data gates and obtain separate cutover authorization.

Previously validated PWA download and cold-offline corrections remain a separate frontend scope. The current deployed service worker bypasses cross-origin requests but does not cache versioned `/assets/` for cold offline launch; this storage-only candidate intentionally retains that behavior. Full installed-PWA readiness is not newly certified here. No physical-device, offline-document, installed-PWA or interrupted-upload PASS is claimed.

Recovery: retain a hosted gateway-compatible Organization candidate before promotion; prefer a separately reviewed forward fix or pause of the affected UI. Once restrictive policies are applied, the old Organization deployment's upsert/cache behavior is not a generally compatible rollback. Do not restore broad policies, change the Admin alias or delete retained evidence to make a rollback appear successful. Detailed steps are in `isolated-release-plan.md`.

## Preservation

Existing HEAD and all 61 inventoried tracked dirty paths remain byte-identical, including their recorded deletions. Existing untracked evidence was not removed or changed. Production's two frontend aliases, ACTIVE v1 gateway, 15 Storage policies, 164 migrations, 378 object metadata records and four protected business inventories remain unchanged. No completed security correction was redeployed or repeated.
