# Environment-isolated Admin candidate deployment

## Decision

**Candidate deployment: PASS — READY. Promotion: NO-GO pending protected hosted acceptance.**

Exactly one authorized deployment was submitted. No promotion, retry, rollback, Organization/PWA deployment, project-setting change, Git push or Supabase mutation was performed.

- Deployment: `dpl_AZ287kU35oFTVqyTEQRf749qncAA`
- Immutable URL: <https://lydorg-7bb5w6yag-toffs-projects-81b2ce10.vercel.app>
- Team: `team_lrnDtn1fujS9WebCMQoWHmGR` / `toffs-projects-81b2ce10`
- Project: `prj_J36xqAUQELX8NttCaFFInsxcCEaI` / `lydorg`
- Submission acknowledged: 2026-10-12T06:47:54.177Z. READY observed: 2026-10-12T06:50:16.377Z; confirmed again during final preservation.
- Route: official Vercel CLI 63.1.2, isolated extracted source, explicit project/team, `--prod --skip-domain --force --yes --json --no-wait`.

## Approved identity and immediate preflight

| Check | Result | Evidence |
| --- | --- | --- |
| Source ZIP | PASS | 15,424,104 bytes; SHA-256 `a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465` |
| Extracted source | PASS | All 561 SHA-256 identities; revision `0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324` |
| Public configuration | PASS | Four approved values; fingerprint `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a`; Admin surface, exact production Supabase origin, approved public anon key class |
| Environment-isolation wrapper | PASS | Exact reviewed source; clean child environment containing only four approved frontend settings and reviewed OS/build settings |
| Gateway prerequisite | PASS | `admin-storage-access` ACTIVE v1 before and after deployment; nine production Edge Functions reported |
| Operation controls | PASS | Exclusive own operation lock, durable new single-attempt marker, no competing deployments, zero automatic retries |
| Earlier evidence | PASS | Both failed-attempt markers and 74 saved evidence/artifact hashes preserved |

The source was uploaded from `.agent/admin-candidate-deploy-20261012T064113Z/source`, never from the dirty repository root. Vercel excluded only `.gitignore`; every one of the 560 uploaded source digests matches the dry-run inventory. Hosted digests use SHA-1; the approved archive and all extracted source were independently checked with SHA-256.

## Hosted acceptance

| Check | Result | Actual evidence / limitation |
| --- | --- | --- |
| Authoritative provider result | PASS | READY; final project, owner and immutable URL match |
| Hosted clean installation | PASS | `npm ci --include=dev --no-audit --no-fund`; 675 packages installed in 22 seconds |
| Node/runtime and wrapper | PASS | Linux Node `v24.21.0`; wrapper PASS; fixed release `1.0.0-admin-storage-rc+20261012035933.vercel24` |
| Hosted npm version | NOT TESTED | Build output did not report the exact npm version; clean installation success was observed |
| Vite compilation | PASS | Reviewed wrapper emitted PASS only after awaited Vite compilation completed; provider Build Completed signal |
| Public settings and provider-variable isolation | PASS | Wrapper reported the approved fingerprint and `privateEnvironmentPassed: false`; exact uploaded projection and fresh strict worker validation match the reviewed code |
| Python function packaging | PASS | Hosted logs identify Python 3.12, uv, requirements and requests; control plane lists packaged `out/api/sync-run-once` lambda |
| Python runtime imports / GET / OPTIONS | BLOCKED | Requests cannot reach the function through deployment protection; GET 405 / OPTIONS 204 have not been established on this candidate |
| Generated static assets | BLOCKED | The expected 53-file inventory remains `1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d`; hosted asset bytes were inaccessible, so no hosted byte-parity claim |
| Hosted secret / canary scan | BLOCKED | No generated browser assets obtained. Environment isolation passed, but that is not a completed scan of served bundles |
| Root, deep routes, SPA rewrites and application headers | BLOCKED | Root returns Vercel Authentication redirect rather than application HTML |
| Authenticated Admin/private-file browser tests | NOT TESTED | No separately designated genuine session/resource supplied; consumed gateway acceptance helper was not rerun |

### Access blocker

The immutable URL returned **HTTP 302** to origin `https://vercel.com`, 263 bytes. The already assigned generic candidate alias `lydorg-toffs-projects-81b2ce10.vercel.app` was independently verified to map to this candidate and returned the same redirect. Neither redirect was followed.

Authenticated read-only project inspection confirms Vercel Authentication `deploymentType: all_except_custom_domains` and **zero existing automation-bypass entries**. The enabled computer-use surfaces contained no existing signed-in browser tab; native apps were not available through that tool. This does not imply Chrome/Edge is not installed.

No protection was disabled, share link or bypass secret created, cookie extracted, or Vercel login performed. `vercel curl` was deliberately not invoked: its documented behavior can create a project automation-bypass token when none exists, conflicting with this task's prohibition on project-setting changes. See [Vercel CLI curl: How it works](https://vercel.com/docs/cli/curl#how-it-works).

This is an access limitation, not evidence of a failed application build. The existing candidate can be tested without another deployment once an authorized operator provides normal Vercel-authenticated browser access, or separately approves a supported automation-access arrangement. No credentials should be pasted into chat.

## Preservation

- `y-trace-admin.vercel.app` remains on `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ`; its public HTML remains HTTP 200, 1,884 bytes, SHA-256 `fabd94e4fe69d9fa197088cfc97a24d6208ba3b862d14cdccbca460e8a88ae93`.
- `ytrace.app` remains on `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`; Organization project settings and deployment list are unchanged.
- Vercel automatically assigned the generic `lydorg-toffs-projects-81b2ce10.vercel.app` alias to the candidate. Neither custom production domain was reassigned and neither project's production target changed.
- All 4,126 existing worktree snapshot entries match the immediate preparation baseline. Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`, and all 64 tracked dirty paths remain unchanged. `git diff --check` passed.
- Approved source/static archives and all prior failed-run evidence are unchanged. The new durable attempt marker remains; the operation lock was released through its owner cleanup path.
- Gateway metadata remains unchanged and ACTIVE v1. No production/staging database, Auth or Storage operation was performed. This task did not repeat the 57 database preservation queries and does not claim a fresh 57-inventory check.
- Raw provider environment values and raw build logs were not persisted. No private-file or external sync POST request was sent.

## Promotion and compatible recovery proposal

1. Retain this READY immutable candidate and all pinned source/build artifacts. No rebuild or redeployment is needed to resolve the access blocker.
2. Obtain supported operator-assisted access to this exact candidate without changing application settings. Complete the prepared bounded checks: served 53-file SHA-256 parity; root and deep Admin routes; CSP/security headers; GET 405 and OPTIONS 204 for `/api/sync-run-once`; bounded secret/canary scan. Do not invoke sync POST or create application sessions to manufacture coverage.
3. Investigate any mismatched generated asset rather than silently changing the pinned inventory. Keep private-file tests explicitly separate where genuine sessions/resources are unavailable.
4. Only after essential hosted checks pass, seek a separate promotion authorization naming this deployment ID, team/project and custom Admin domain. Immediately before promotion, recheck current aliases and candidate identity. No Organization/PWA promotion is included.
5. After an authorized promotion, perform bounded public route/API checks and separately authorized existing-session file checks. Stop later Storage cutover phases if the compatible frontend is not verified.
6. This candidate is retained as a **potential compatible recovery artifact**, but runtime recovery readiness remains BLOCKED until hosted acceptance passes. Prefer a forward fix using a separately reviewed candidate. If a security defect appears after a future promotion, pause affected Admin document operations or further cutover under separate authorization; do not restore the older missing-session fallback as the routine recovery path.

The pre-production context permits deferring unrelated physical-device and exhaustive private-permission browser coverage with clear limitations. It does not justify promoting an artifact whose served assets and packaged Python function have not yet been checked. No promotion or other rollout phase is authorized or initiated here.

## Evidence

Same-directory JSON files contain source/preflight, submission acknowledgement, READY state, hosted source/build identity, both HTTP access attempts, protection metadata, gateway postflight and final preservation. `execution-receipt.json` and `evidence-manifest.json` pin this run. Earlier failures remain historical evidence and were not overwritten.
