# Organization/PWA production-domain promotion — PASS

Recorded: 2026-10-12T15:17:14.038Z

## Actual release

- Live domain: [ytrace.app](https://ytrace.app)
- Serving deployment: `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ` — **READY**
- Immutable deployment: [candidate](https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app)
- Project: `yorbms_user` / `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N`; team `team_lrnDtn1fujS9WebCMQoWHmGR`.
- Application version: `1.0.0-org-storage-rc+20261012114439.vercel24`.
- Promotion acknowledged at 2026-10-12T15:11:25.087Z: **HTTP 201**, exactly **one** request, **zero** automatic retries.
- No rebuild or new deployment. The existing immutable artifact was promoted.

## Approved identities

| Artifact | SHA-256 |
| --- | --- |
| Source revision | `0e3f313a4ca9c4a96242ab539767a5d2ad9a5e906483031c101e906f179d01dd` |
| Source archive | `e7d43c8aa7d0d0a2cc42130eafd34ad9b1b5147aeb416aba55349353f7fa33c8` |
| Approved and observed 53-file static inventory | `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94` |
| Public configuration | `cb861a63dc9a73eda9a295c21d659fabed8ea4dba15bf8722264b281e9c525bf` |
| Durable attempt marker | `dc7e526d1623250ddf408a45d030130121c0add8c56a52bfd4266be67053ae4f` |

All executed helper hashes still match the durable marker. The original source archive, isolated source, static inventory and historical reports are preserved.

## Actual verification

| Check | Result | Evidence |
| --- | --- | --- |
| Exact authenticated team/project | PASS | Immediate locked provider preflight. |
| Source/version/configuration | PASS | 562 isolated source entries; 561 uploaded source entries; reviewed public fingerprint. |
| Promotion scope | PASS | Provider promotion alias inventory contains only ytrace.app and www.ytrace.app; both jobs now completed. |
| Live production mapping | PASS | Project production target and ytrace.app alias point to the exact approved READY deployment. |
| Served asset integrity | PASS | **53/53**, 19,518,681 bytes; exact approved SHA-256 inventory. |
| Root/deep routes | PASS | Seven HTTP 200 responses with the approved 1,923-byte application shell. |
| CSP/security headers | PASS | All six configured security headers match on 62 route, API and asset responses. |
| Python API GET / OPTIONS | PASS | GET **405**, approved body hash; OPTIONS **204**, empty body. No POST. |
| Public Supabase configuration | PASS | Exact approved build parity, production origin and production anon-key class/project; no key values logged. Four-value fingerprint was not independently reconstructed from minified output. |
| Bounded secret/canary scan | PASS | 39 textual responses, zero findings; not an exhaustive secrets audit. |
| www redirect | PASS | Direct HTTP **307** to https://ytrace.app/; configuration unchanged. |
| Admin preservation | PASS | y-trace-admin.vercel.app remains on dpl_AZ287kU35oFTVqyTEQRf749qncAA; project/domain settings and deployment inventory unchanged. |
| Organization Git-branch alias | PASS | yorbmsuser-git-main-toffs-projects-81b2ce10.vercel.app remains on the prior dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV deployment. |
| Admin gateway | PASS | ACTIVE v1; all nine production Edge Function identities and bundle hashes unchanged. |
| Operation controls | PASS | Both owned locks released; consumed durable attempt marker retained; 13 local mocked transport checks passed. |

HTTP verification used Node directly: no browser service worker, cookies, authorization headers or new application sessions. It read only public application assets and the explicitly authorized harmless API methods. No Supabase data/schema/Auth/Storage mutation, private-document operation, external sync POST, Git push, settings change or restrictive policy cutover was performed. No new live database fingerprint audit was run because this release changes aliases only.

## Preserved stop evidence and resolution

1. Initial preflight stopped at an over-strict local assumption that every alias on the previous deployment was a production alias. Read-only inspection identified the existing Organization git-main alias and confirmed the provider promotion list includes only the two approved custom domains. The branch alias is preserved. No mutation had been submitted.
2. After the single HTTP 201 promotion, the local verifier stopped because it required optional lastAliasRequest metadata, which was absent. The original runner and stop receipt were preserved unchanged. Read-only reconciliation confirmed both exact alias jobs **completed**, candidate aliasAssigned=true, no alias error, exact production mapping, unchanged Admin/branch aliases and then completed all public HTTP checks. No promotion retry occurred.

See the preserved preflight-stop, promotion-stop, reconciliation and provider-authoritative-observation evidence.

## Accepted limitations

- TypeScript still has **651 existing baseline errors**; no new TypeScript/build run was needed or performed for this promotion.
- Existing avatar cleanup retention defect and Realtime callback typing risks remain.
- Authenticated renewal-page behavior and live Realtime updates were not independently tested on this candidate.
- Installed-PWA/offline/download and physical-device behavior are **NOT TESTED in this promotion**, not newly certified. Directly fetching sw.js verifies bytes only.
- Previous login/dashboard/document/template/news/account-switch results remain **operator-reported acceptance**. No authenticated browser smoke test or private-file operation was repeated.

## Release and recovery boundary

**Organization frontend release: COMPLETE / PASS for the authorized pre-production scope.** This is not full production security certification. Preserve this immutable compatible artifact. The older Organization frontend remains retrievable but must not be restored automatically ahead of restrictive policies. Any forward correction or fail-closed containment requires separate review and authorization.

**Restrictive Storage policy cutover: not executed and not authorized.** It remains a separate release with its own compatibility, preservation, access and recovery gates. No additional rollout has begun.
