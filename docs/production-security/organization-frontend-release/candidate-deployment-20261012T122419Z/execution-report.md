# Organization/PWA candidate deployment — execution report

## Result

**PASS — one candidate deployment; READY. No production-domain promotion.**

- Deployment: `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ`.
- Immutable URL: [yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app](https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app).
- Team: `toffs-projects-81b2ce10` / `team_lrnDtn1fujS9WebCMQoWHmGR`.
- Project: `yorbms_user` / `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N`.
- Provider acknowledged the single submission at `2026-10-12T12:46:47.466Z`; READY was independently observed at `12:48:13.507Z`.

**CONDITIONAL GO for a subsequent promotion review**, after the outstanding operator-assisted hosted checks and owner acceptance. This is not authorization to promote now. Vercel Authentication blocks browser-served integrity/API/header evidence; those checks are **BLOCKED**, not application failures or assumed passes.

## Approved input and execution

| Item | Verified identity |
| --- | --- |
| Source revision | `0e3f313a4ca9c4a96242ab539767a5d2ad9a5e906483031c101e906f179d01dd` |
| Source ZIP SHA-256 | `e7d43c8aa7d0d0a2cc42130eafd34ad9b1b5147aeb416aba55349353f7fa33c8` |
| Source ZIP | 15,424,325 bytes; 562 entries |
| Expected generated inventory | `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94`; 53 files |
| Fixed application version | `1.0.0-org-storage-rc+20261012114439.vercel24` |
| Four-value public fingerprint | `cb861a63dc9a73eda9a295c21d659fabed8ea4dba15bf8722264b281e9c525bf` |

The fresh isolated extraction matched every source byte. The official Vercel CLI **63.1.2** dry inspection included 561 files and omitted only `.gitignore`; all upload SHA-1 values matched the SHA-256-verified source. The same exact 561 uploaded identities were independently checked against provider metadata after deployment, with no missing, extra or mismatching source files.

One CLI invocation used the reviewed `--prod --skip-domain --force --yes --json --no-wait` route with explicit Organization/team mapping. The ordinary static ZIP was not used as `--prebuilt`; the dirty repository was not uploaded. A durable attempt marker and external acknowledgement were retained. The local operation lock stayed owned by PID 75212 through submission, hosted checks and provider preservation verification, then was released through the ownership-checked path. **Deployment submissions: 1; automatic retries: 0; promotions: 0.**

## Actual hosted acceptance

| Check | Result | Evidence |
| --- | --- | --- |
| Authenticated team/project and live-alias preflight | **PASS** | Exact team/project, both live deployments and public configuration matched. No active competing deployment was observed. |
| Provider status / immutable identity | **PASS — READY** | Exact expected Organization project and owner; production target with custom domains skipped. |
| Hosted npm ci | **PASS** | Reviewed command invoked; 675 packages installed in 16 seconds. Actual hosted npm version was not recorded. |
| Hosted Node / build wrapper | **PASS** | Actual **Linux Node v24.21.0**, Organization surface, fixed version/fingerprint, private environment omitted. |
| Vite compilation | **PASS** | Reviewed wrapper success occurs after awaited Vite build; provider build-completion signal present. |
| Python function generation | **PASS — packaging evidence** | Python **3.12** detected, requirements dependency installation invoked, generated `out/api/sync-run-once` present; deployment READY. Exact installed dependency versions were not logged. |
| Python runtime imports / GET / OPTIONS | **BLOCKED** | Vercel Authentication intercepted both methods; no evidence of actual handler/module initialization yet. |
| Uploaded source identity | **PASS 561/561** | Provider SHA-1 upload metadata matches dry inventory; approved archive/source separately checked with SHA-256. This is not a served-static-byte comparison. |
| Browser-served static inventory | **BLOCKED, 0/53 compared** | Root request redirects to Vercel Authentication. Local 53/53 reproducibility evidence remains historical, not substituted for hosted HTTP evidence. |
| Hosted surface/configuration | **PASS — build evidence** | Exact user surface, version and public fingerprint in the successful isolated Linux wrapper. Browser delivery/rendering remains pending. |
| Hosted browser secret/canary scan | **BLOCKED** | Protected assets were not downloaded; local bounded scan passed previously. No hosted secret-exposure PASS is invented. |
| Root/deep-route SPA delivery | **BLOCKED** | Root GET HTTP **302** to `https://vercel.com`; deep app routes were not falsely treated as tested. |
| Application CSP/security headers | **BLOCKED** | Authentication redirect headers are not the application's delivered headers. |
| `/api/sync-run-once` GET | **BLOCKED** | HTTP **302** to Vercel Authentication; expected handler status 405 not reached. |
| `/api/sync-run-once` OPTIONS | **BLOCKED** | HTTP **302** to Vercel Authentication; expected handler status 204 not reached. |
| Owner authenticated workflows | **NOT TESTED** | Operator plan prepared; no accounts, sessions, private-file requests, upload/delete or business mutation performed. |
| Admin/Organization preservation | **PASS** | See exact assignments below. |
| Gateway preservation | **PASS** | ACTIVE v1, same bundle; all nine production Edge Function metadata fingerprints unchanged. |
| Dirty worktree/source preservation | **PASS** | 61 tracked dirty paths/deletions and approved source retained. Existing historical evidence/markers untouched. |

No external sync POST was sent. No Git push, provider setting mutation, Supabase schema/Auth/Storage operation or policy cutover occurred.

## Preserved live targets

| Live target | Post-deployment state |
| --- | --- |
| `y-trace-admin.vercel.app` | `dpl_AZ287kU35oFTVqyTEQRf749qncAA`, unchanged |
| `ytrace.app` | `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`, unchanged |
| `www.ytrace.app` | Verified Organization domain, unchanged **307 redirect to `ytrace.app`** |
| Production gateway | `admin-storage-access`, ACTIVE v1, bundle `88e6e86352cdb3718e5687c1287b0bc73717a48f21b8c65aa97310744ab260e2` |

The candidate's provider metadata lists its team-scoped Vercel alias `yorbmsuser-toffs-projects-81b2ce10.vercel.app`. Neither approved custom Organization domain nor the Admin production alias moved; both project production targets remained unchanged.

## Preserved limitations and intermediate evidence

- **TypeScript remains FAIL: 651 existing errors**, including runtime debt; no TypeScript suppression or new compiler run was performed in this deployment task. The prior review investigated the single changed diagnostic rendering and found no newly introduced type defect. Vite build success is not a typecheck PASS.
- Avatar cleanup reads a camel-case field from a raw snake-case profile row and can retain the old object. No avatar replacement/deletion compatibility is claimed. Existing Realtime callback typing and status-contract risks remain documented in the [local readiness report](../vercel24-20261012T114439Z/readiness.md).
- Separate installed-PWA/offline/download corrections are outside this approved seven-file subset; this candidate does not newly certify those workflows, device behavior or interrupted uploads.
- An initial provider GET preflight failed before any deployment attempt. Its exact cause was not established. All eight individually inspected reads then succeeded, and a fresh serialized full preflight passed without drift. The original stop/diagnostics remain saved. No failed deployment was resubmitted.
- Early diagnostic keyword flags matched text in successful provider JSON responses. Exit codes were zero with valid identities, so those keyword flags do not establish permission/404 failures. The resolution record preserves that distinction.
- A local postflight Python-evidence parser initially had a syntax error before issuing any request. It was corrected and syntax-checked; the resulting bounded read-only inspection is saved. No application code, deployed source or deployment attempt was changed.

## Outstanding acceptance and recovery

Use [operator-instructions.md](operator-instructions.md) and [operator-hosted-check.js](operator-hosted-check.js) on this exact READY URL through the operator's existing Vercel access. The checker performs same-origin GET/OPTIONS, hashes all 53 files and checks headers/API without inspecting/exporting credentials. It is prepared, **NOT EXECUTED**. Record service-worker bypass/provenance accurately.

Owner smoke checks are planned for existing developer-owned accounts/resources: login, dashboard/submission, existing document preview/download, registration/renewal access, account switching, avatar display/logout cleanup, templates and news. Fresh logins/logouts or account switching that changes sessions need a separately approved manual session window. No upload/deletion or workflow replay is part of acceptance.

Retain this immutable candidate and all source/build receipts. It is a potential compatible recovery artifact; final recovery eligibility still depends on served-asset and owner acceptance. If a defect appears, stop and prepare a reviewed forward correction. Do not automatically redeploy, promote, restore an older incompatible frontend or weaken Storage policies.

**Next step:** complete protected hosted/owner acceptance on this same candidate, then seek separate exact-deployment promotion authorization. The broader restrictive Storage cutover remains separately blocked by historical-access decisions, Admin cleanup mitigation and fresh catalog/policy authorization gates.
