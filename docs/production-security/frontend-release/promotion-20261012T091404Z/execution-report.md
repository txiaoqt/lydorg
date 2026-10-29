# Admin frontend promotion — PASS

**Completed October 12, 2026 (Asia/Manila). Promotion acknowledged at 5:23:17 PM. Final alias verification at 5:29:36 PM.**

## Actual release

- Live Admin domain: <https://y-trace-admin.vercel.app>
- Serving deployment: **`dpl_AZ287kU35oFTVqyTEQRf749qncAA`**, READY.
- Immutable deployment: <https://lydorg-7bb5w6yag-toffs-projects-81b2ce10.vercel.app>
- Team/project: `team_lrnDtn1fujS9WebCMQoWHmGR` / `prj_J36xqAUQELX8NttCaFFInsxcCEaI` (`toffs-projects-81b2ce10/lydorg`).
- Source revision: `0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324`.
- Source ZIP SHA-256: `a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465`.
- Static build ZIP SHA-256: `56a44b576db1b7db0e47e6131e15770943be2ff9e0cf55b200709a14f91e2abe`.
- Approved and directly observed static inventory SHA-256: `1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d`.
- Application version observed in served JavaScript: `1.0.0-admin-storage-rc+20261012035933.vercel24`.

## Single authorized mutation

Vercel acknowledged the supported promotion operation with **HTTP 201**. The local transport receipt records **one promotion fetch invocation, one dispatched promotion request and zero automatic retries**. No source rebuild, new deployment or Git push occurred.

Preflight identified exactly one configured production domain: **y-trace-admin.vercel.app**. It moved from `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ` to the approved deployment. The generic candidate alias `lydorg-toffs-projects-81b2ce10.vercel.app` already pointed to the candidate and remains bound to it. The Admin production target now names the approved deployment. No unexpected alias was added or moved.

The official Vercel CLI 63.1.2 implementation retries client requests by default. This invocation used a local, scoped preload guard that permits only the exact authorized promotion POST, sets `retry: { retries: 0 }`, rejects a second promotion or another mutation, and leaves normal CLI credential handling internal. Six local mock dry-run checks passed before execution; these are submission-control evidence, not hosted application tests. The actual successful HTTP 201 and independent alias/target verification are recorded separately. No installed CLI file, authentication setting or Vercel project setting was modified.

The mutation used the documented [Vercel production promotion endpoint](https://vercel.com/docs/rest-api/projects/point-production-traffic-to-a-given-deployment), which promotes an existing deployment without rebuilding it.

## Independent direct public postflight

| Check | Result | Actual evidence |
| --- | --- | --- |
| Production alias and target | PASS | Fresh authenticated control-plane reads map both to the exact approved deployment |
| Candidate identity | PASS | READY, same immutable URL, project/team, creation and build-ready timestamps |
| Generated static files | PASS | **53/53** HTTP 200; every byte length and SHA-256 equals the approved inventory, including build manifest |
| Root/deep Admin routes | PASS | Root, /admin, /admin/settings and /admin/renewals return the approved 1,923-byte application shell |
| CSP and security headers | PASS | All six configured headers match exactly on **59 responses** |
| Python GET | PASS | /api/sync-run-once returns **405** and expected 55-byte method-denial body fingerprint |
| Python OPTIONS | PASS | Same endpoint returns **204**, zero bytes; no sync POST |
| Public frontend configuration | PASS | Exact approved artifact parity; production Supabase origin, canonical Admin URL, gateway name, production anon-JWT project/class and fixed application version observed |
| Bounded secret/canary scan | PASS | **36** textual responses scanned; zero service-role JWT, secret-key literal, Admin-token literal, private operator-name or synthetic-canary findings |
| Service-worker-free checks | PASS | Direct Node public HTTP, no browser, cookies, authorization headers or service-worker interception |
| Organization/PWA | PASS | Project settings and deployment list unchanged; ytrace.app remains dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV |
| Gateway | PASS | ACTIVE v1; exact gateway ID/update metadata and nine-function count match preflight |
| Preservation | PASS | 64 tracked dirty paths unchanged; pinned archives and 38 historical report files preserved; own locks released and attempt marker retained |

The approved public-configuration fingerprint remains `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a`. It was not independently reconstructed from all four minified property literals; exact served-build identity and the listed public-origin/key/version checks establish compatibility with that reviewed build. No server credential values were fetched for scanning, logged or persisted.

The earlier operator browser result had an active service worker. This postflight closes that provenance gap for the public domain: assets and HTTP responses were fetched directly without a browser. The actual downloaded public buffers were discarded after hashing/scanning; no private file was requested.

## Remaining limitations and recovery boundary

- No new authenticated Admin login, business mutation or private-document test was run after promotion. The accepted operator-tested identical immutable candidate remains the functional browser evidence.
- This bounded scan is not exhaustive security certification. No full repository suite, unrelated UI regression or physical-device test was rerun.
- Storage policies, Supabase schema/data/Auth, historical files and the gateway were not changed. A full database-preservation audit was neither repeated nor claimed.
- Broader restrictive Storage policy cutover and Organization/PWA deployment still require separate authorization. The promoted Admin artifact alone is not a full production Storage security sign-off.

The promoted immutable candidate and pinned archives are retained as the compatible recovery basis. No rollback occurred. If a later fault appears, stop subsequent rollout and prepare a separately reviewed forward correction or fail-closed pause; do not automatically restore the older missing-session fallback or weaken Storage policies.

**Final Admin frontend release status: PASS — promoted and bounded public postflight verified. STOPPED after this release.**

## Evidence

Local files in this directory include exact scope discovery and locked preflight, local guard validation, transport and submission receipts, authoritative provider observations, full public HTTP hashes/headers and bounded scan, final alias/gateway checks, preservation and final promotion receipt. All previous reports and consumed deployment markers remain intact.
