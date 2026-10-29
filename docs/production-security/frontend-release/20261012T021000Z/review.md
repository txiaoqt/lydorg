# Isolated Admin Storage frontend release candidate

Prepared 2026-10-12T02:40:26.260Z. Branch: `ui-refactor`. HEAD/base: `2f6e7427c553b7535f53860d1732b42df7c023e8`.

## Decision

| Required result | Status | Evidence |
|---|---|---|
| Missing-session direct-signing fallback fixed | PASS | Admin route intent is separate from session validity; all seven gateway buckets deny absent/invalid sessions |
| New regression tests | PASS | 37 resolver cases, including 32 newly added; 91 isolated assertions across 8 files pass |
| Isolated Admin production build | PASS | Two successful builds of the final candidate with `VITE_DEPLOY_SURFACE=admin` |
| Reproducible release artifact | PASS | All 53 generated files byte-identical after fresh source-archive extraction |
| Vercel deployment readiness | **NO-GO / BLOCKED** | CLI has no credentials; actual project root/build/environment and rollback eligibility cannot be confirmed |

**Local candidate preparation is complete. Nothing was pushed or deployed.** No production/staging database, Auth, Storage, gateway or business mutation was performed. The completed one-time gateway acceptance helper was not rerun.

## 1. Resolver correction and security boundary

The old shared resolver treated a missing custom Admin session like a public/organization request. On an Admin route that could select direct Storage signing with an organization or anonymous principal.

The correction captures Admin route intent independently, requires a usable custom session for the seven supported buckets, and fixes the request to the gateway path. It rechecks route/account context before and after asynchronous authorization, after the lazy gateway import, and after cache resolution. Logout, account switching and route changes discard stale results. A gateway rejection returns a safe empty result and never tries direct Storage signing.

Covered buckets: `organization-documents`, `budget-request-files`, `liquidation-report-files`, `ypop-files`, `move-files`, `template-files`, `news-release-images`.

Organization/public routes keep signing with their actual Supabase Auth principal. Intentionally public news HTTP URLs continue rendering. Same-project stored signed/authenticated references are reauthorized; unrelated HTTP URLs and public asset URLs retain their existing handling. File paths, parent metadata and server authorization rules are unchanged.

The existing RAM cache, concurrent deduplication, lazy signing, no-negative-cache behavior and identity invalidation remain. No polling, mass signing or metadata preloading was added. Existing generic error/placeholder behavior is retained.

**Revocation limit:** the gateway validates current permissions when it is called. A remotely revoked session cannot be detected locally before the next server check solely from its unchanged token. Positive cache reuse remains capped at 60 seconds and local session expiry; issued URLs retain the existing server validity of 3,600 seconds. Client invalidation does not revoke an already-issued URL. The revocation regression simulates a fresh gateway denial; it does not claim immediate server revocation of cached bearer URLs.

## 2. Original worktree preservation and exact release scope

The original tree already had 64 tracked dirty entries and extensive untracked work. A pre-edit SHA-256 inventory of 4126 non-ignored original files was compared after preparation, excluding private environment files. Exactly two original files changed in this task:

- `src/lib/lydo-connect-supabase.ts`: narrow resolver correction inside existing Storage integration.
- `src/lib/admin-storage-resolver.integration.test.ts`: focused regression expansion.

All other inventoried originals, including the dirty generated root `build/`, were preserved. No reset, stash, clean, indiscriminate staging, branch change or commit was performed. New local packaging/evidence files are separate.

The final isolated source is `.agent/admin-storage-release-20261012T021000Z/candidate-complete`, reconstructed from the verified deployed commit, with **5 runtime changes, 11 QA changes, 557 files and no base-source deletions**. It is a content-addressed source directory, not a newly created Git commit.

Source revision: `sha256:ffe95e19a23eb8f9db43bf6c6199de787b88a8106ec157e57192b468fd082e0c`.

| Runtime file | Final isolated SHA-256 |
|---|---|
| `src/lib/admin-storage-access.ts` | `c7b5eee5076ad8a4095ed0afbeefc5f42c85ba462200dc14cae8b8c08e198fdb` |
| `src/lib/lydo-connect-store.tsx` | `0e25a810735f13daccc1d5733c44894dc81b2a1f21a390fd1f99e40728d60e8c` |
| `src/lib/lydo-connect-supabase.ts` | `4add5f7330483335a6b6a34fe6bc70da8f46906540d52ca1a1d318a48f35814f` |
| `src/lib/query-client.ts` | `1c4a0e885e83172550fa4a1ef0a47278eaeb19c7aa23b12ea9a51a62a7422b63` |
| `src/lib/signed-storage-url-cache.ts` | `961d9786467553ef0f7b14972db12523f6ac9609b07d610978f734d7d992f883` |

The shared service contains only six selected hunks, at original base lines **57, 5124, 5146, 5165, 6128, 6345**. The first five retain the previously reviewed integration; the final hunk contains the corrected resolver/cache path. The patch and manifest record adjusted candidate positions and exact hunk hashes. Only private-query cleanup additions are included in the store/query files.

Excluded: unrelated lazy-loading/performance/Realtimes changes, PWA download/offline fixes, dirty generated files, staging utilities, SQL/migrations, synthetic fixtures/reconciliation, production security evidence, operator scripts and credentials. Existing unrelated changes remain in the root tree.

The deployed base's unchanged npm postinstall script and Python worker dependencies are included so the archive preserves fresh-install and existing `/api/sync-run-once` imports. The worker still has its base dependencies on `requests` and `python-dotenv`; provider-side Python packaging/configuration remains to be verified. No server function was executed. The unchanged base legacy test UI is retained; production containment remains its server-side restriction and this release does not reenable it.

QA includes the isolated test environment/network guard and the existing `supabase/functions/admin-storage-access/control.ts` solely because a client test imports it. It is pinned to the reviewed gateway companion hash, excluded from browser assets, and is not an Edge Function deployment payload. No gateway entrypoint, config, deploy script or SQL is included. The only source env file is an inspected placeholder-only `src/test/env/.env.test`; no operator credentials are archived.

## 3. Isolated validation

| Test file | Passed | Failed |
|---|---:|---:|
| `src/lib/admin-storage-access.test.ts` | 19 | 0 |
| `src/lib/admin-storage-resolver.integration.test.ts` | 37 | 0 |
| `src/lib/private-query-cache.test.ts` | 2 | 0 |
| `src/lib/query-client.test.ts` | 3 | 0 |
| `src/lib/signed-storage-url-cache.test.ts` | 15 | 0 |
| `src/lib/signed-storage-url.integration.test.ts` | 9 | 0 |
| `src/test/production-supabase-network-guard.test.ts` | 4 | 0 |
| `src/admin/components/AdminRenewalDocumentPreview.test.tsx` | 2 | 0 |
| **Total** | **91** | **0** |

Resolver coverage includes absent Admin with an organization JWT; malformed, blank, missing and expired session fields; all seven valid gateway buckets; denial/retry; logout/account changes while pending; both route-transition directions; cached-hit races; expiry during signing; legitimate public/organization signing and public news rendering. Denied Admin-origin cases assert no direct Storage call and no returned unauthorized/stale URL. For an owner request already started before entering Admin, its earlier legitimate signing call is allowed to finish but its result is discarded; no new Admin direct-signing request is made.

Additional checks:

- **PASS:** isolated TypeScript `--noEmit`, exit 0.
- **PASS:** two final isolated Admin production builds, both exit 0. Existing >500 kB chunk warning remains; no unrelated bundle refactor was introduced.
- **PASS:** root `git diff --check`, exit 0. Isolated no-index check has zero diagnostics with CRLF recognized as line endings; its exit 1 denotes intentional differences.
- **PASS:** bounded generated-asset scan found no service-role JWT, `sb_secret_` key, literal custom Admin session token pattern or private operator variable names. Expected production origin, project-matching anon key, gateway name and fixed source version were found. This is not a universal proof against every possible secret encoding.
- **PASS:** build worker received an explicit clean environment containing only required Windows runtime variables and allowlisted public frontend values. `.env.foundation.local` was not opened; private operator variables were not passed. Public config values are not reproduced in evidence except the public project origin/identity.
- **NOT TESTED:** new live authenticated browser/production workflows. Local mock/jsdom tests are not a replacement for the already recorded real gateway acceptance or future authorized post-release smoke checks.
- **NOT TESTED:** full repository suite. Its prior 2,211 passing / 150 failing historical baseline is not reclassified or concealed; it was outside this focused change.

Node v22.14.0, Windows. Locked/installed versions match for Vite 5.4.19, TypeScript 5.8.3, Vitest 3.2.4, Supabase JS 2.99.0, React Query 5.83.0 and Radix Select 2.2.5. No dependency versions or lockfile changed.

## 4. Exact artifacts and reproducibility limits

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `admin-gateway-source-complete.zip` | 15416255 | `9c3f2747ccf9b5f3a6723decb3e3ec9f7ff7eff64a98957141578d57d95ca8e3` |
| `admin-gateway-build.zip` | 11957125 | `197daaaf91c3bc9f0817e9d469c4e950df2e48f94a0fa477e3058cc352c9614b` |

Both archives are under `.agent/admin-storage-release-20261012T021000Z/`. The static build has **53 files / 19519563 uncompressed bytes**. `artifact-inventory.json` records every path, size and SHA-256. Fixed embedded version: `1.0.0-admin-storage-rc+20261012021000.src-ffe95e19a23e`.

The second final build was made from a fresh archive extraction and matches every generated file byte for byte. It used the same Windows/Node installation and existing dependencies matching the unchanged lockfile. A clean npm install on a second machine was **NOT TESTED**. The postinstall script is now included for that future install.

The pinned `build-complete-admin.mjs` recipe uses Vite's build API, an empty env directory, explicit clean worker environment, fixed version define, production mode and manifest output. It checks the source before and after building. The ordinary base Vite config derives a current timestamp; **a default Vercel/npm build will not automatically reproduce this version/hash**. Verify and approve the provider build route/recipe separately before deployment.

The build ZIP is static output, **not** a complete Vercel Build Output API bundle; do not use it with `vercel --prebuilt` as if server functions were packaged. Source/hosting dependencies are preserved separately in the source ZIP. Do not deploy the full dirty root directory.

Preparation history is preserved: an initial local assembly stopped on CRLF/LF comparison before applying selected hunks. Logical-line matching corrected that packaging issue without rewriting source line endings. An intermediate archive omitted the base postinstall and worker files; it is superseded. Only the **complete** source archive and final build hashes above are the reviewed candidate. No failed local packaging attempt caused a live action.

## 5. Vercel target and required settings

Target only `toffs-projects-81b2ce10/lydorg`, domain `https://y-trace-admin.vercel.app`. Organization/public/PWA project `yorbms_user` / `https://ytrace.app` is excluded.

Prior live evidence at `docs/production-security/frontend-readiness/20261012T011835Z/` corroborates base commit `2f6e742` and embedded Admin version `1.0.0+20261008175317.2f6e742`. Operator-designated previous deployment: `3xkY2hTr9ght98vNXqrjZTtrEPCQ`, immutable host `lydorg-gdb25hm7m-toffs-projects-81b2ce10.vercel.app`. Provider alias assignment and rollback eligibility remain unverified.

A fresh read-only `vercel project inspect lydorg --scope toffs-projects-81b2ce10 --no-color` with CLI 49.2.0 returned **No existing credentials found**. No login, token extraction, linking, pull, deployment or configuration change was attempted.

Before authorizing deployment, independently confirm through authenticated provider access:

1. Exact team/project ID, production domain/alias and current immutable deployment.
2. Root directory points to the isolated release source, framework/Node/install/build command, output `build`, and the approved fixed build recipe or newly reviewed provider artifact identity.
3. Production-only public settings: `VITE_DEPLOY_SURFACE=admin`, `VITE_SUPABASE_URL=https://mqqaykksadotbrghbexz.supabase.co`, the reviewed project anon key and release version. The tested key class is legacy anon; no key-type change is certified here.
4. No private/operator/service-role credentials use `VITE_` names. Gateway server secrets stay on the Edge Function. Existing API server secrets/configuration must be preserved and not exposed in client assets.
5. Existing SPA/API rewrites, CSP/headers and Python API packaging remain compatible; no shared Git integration auto-releases `yorbms_user`.
6. Exact authorized release mechanism and retrievable, promotable rollback deployment.

The unchanged base `vercel.json` already permits the Supabase gateway origin; no new CSP permission is required. Provider settings were not guessed or modified.

## 6. Separate deployment, smoke and recovery plan

1. Complete the authenticated Vercel checks above and review the exact source/archive/build recipe. Resolve only actual provider differences; rehash any changed artifact before seeking approval.
2. Recheck the already installed foundation/gateway identities read-only under the separate release scope; do not reinstall them or rerun the completed one-time acceptance helper.
3. Obtain explicit authorization naming the Admin project, this isolated source revision, approved artifact/build route and smoke-test scope. No deployment authorization is requested or implied by this report.
4. Deploy only the isolated Admin candidate through the verified provider route. Keep all 15 Storage policies, database protections, gateway and organization/PWA release unchanged.
5. Verify effective Admin surface, served version and artifact identity. With separately authorized existing operator sessions/resources, test registration/renewal, budget/liquidation, YPOP and template previews/downloads; require gateway requests and no direct fallback on missing/denied/expired Admin context. Check public news and template behavior, console secrecy and account switching. Do not create sessions, upload/delete documents or modify records without specific authorization.
6. Retain approved compatible artifacts for recovery. Before a future restrictive cutover, the previous immutable frontend may be considered only after operator risk review: it contains the known resolver fallback and relying on still-permissive policies is a security regression. Prefer a reviewed forward correction or fail-closed pause rather than restoring the vulnerable path. Do not remove backend protections or broaden policies.
7. After a future restrictive-policy cutover, the old non-gateway client is not a compatible rollback. Retain a tested compatible build or use separately reviewed forward recovery. Client rollback/cache clearing does not revoke already-issued signed URLs.

## 7. Remaining limits

- **Deployment blocker:** missing authenticated Vercel project/configuration/rollback evidence. Candidate tests/builds passing does not remove this requirement.
- **Carry forward:** production permission-specific denial and independent expected content-hash comparison were unavailable in earlier acceptance. This task adds local cases, not that missing production evidence.
- **Separate Storage rollout:** historical unlinked/private/template access decisions, MOVE support and authorized private cleanup compatibility remain separate cutover work. This resolver correction does not make unknown paths authorized.
- **Separate PWA release/UAT:** previous installed-Chrome evidence and validated PWA fixes are preserved in the dirty root; they are intentionally not included in this Admin release candidate.

**Stop at preparation. Frontend release and restrictive policy cutover each require separate authorization.**
