# Corrected Admin candidate deployment — ERROR, stopped

Recorded 2026-10-12T06:03:55.603Z. **One authorized candidate was submitted. It failed. NO-GO for production-domain promotion or an automatic retry.**

## Actual result and immutable identity

- Team/project: `toffs-projects-81b2ce10 / lydorg`; team `team_lrnDtn1fujS9WebCMQoWHmGR`, project `prj_J36xqAUQELX8NttCaFFInsxcCEaI`.
- New deployment: **`dpl_23fmNmdVszfR79rsG1VmB7Nd9pAS`**.
- Immutable URL: [https://lydorg-1011y7luy-toffs-projects-81b2ce10.vercel.app](https://lydorg-1011y7luy-toffs-projects-81b2ce10.vercel.app). It is an ERROR deployment, not a working release or recovery candidate.
- Submission acknowledged at `2026-10-12T05:50:35.138Z`; final provider state `ERROR`, error `BUILD_UTILS_SPAWN_1`, step `buildStep`.
- Provider message: `Command "npm run build" exited with 1`.
- Hosted wrapper failure: **`UNREVIEWED_PUBLIC_VARIABLE`**.
- Route: official pinned Vercel CLI 63.1.2, explicit team/project process environment, `--prod --skip-domain --force --yes --json --no-wait`, freshly extracted isolated source. Exactly one submission, zero automatic retries, no promotion or Git push.
- [Deployment receipt](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/candidate-deployment-20261012T054338Z/deployment-acknowledgement.json>); [Retained new attempt marker](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-candidate-deploy-20261012T054338Z/deployment-attempt.json>). The previous failed deployment and its consumed marker remain intact.

## Approved artifact and preflight

| Check | Result | Actual evidence |
|---|---|---|
| Source ZIP | PASS | 15,422,629 bytes; SHA-256 `324ea22858359d71c4cd94f7da2ee7a658d98327a2bca4e9b7d9facfc10e7984` |
| Source revision | PASS | `sha256:51a18dbc3a799b39d074834edcfe6a9c88de1dd9d115277061e071f9f38c1959`; all 561 extracted files verified with SHA-256 |
| Local static inventory | PASS | 53 files; pinned inventory SHA-256 `1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d` |
| Corrected observability handling | PASS locally | Exact reviewed wrapper; known name accepted only for the verified Admin production context, stripped from clean child inputs; standalone context rejected |
| Public configuration | PASS | Fresh authenticated reads before submission; fingerprint `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a`; no server secret values requested |
| Vercel identity/aliases | PASS | Exact team/project; Admin and Organization production IDs/aliases matched the preflight baseline |
| Competing operations | PASS at checks | No active provider deployments; exclusive local lock acquired and ownership verified before submission. This cannot prevent an unrelated operator from initiating a later operation |
| Gateway prerequisite | PASS | Read-only Supabase control plane: admin-storage-access ACTIVE v1, verify_jwt=false, nine functions; unchanged in postflight |
| Upload/source identity | PASS | 560 uploaded file digests match; only .gitignore omitted by CLI. [Hosted source comparison](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/candidate-deployment-20261012T054338Z/hosted-source-identity-corrected.json>) |

No dependency, runtime, wrapper, configuration or source correction was made after this failure. The exact approved archive and extracted source remain unchanged. [Approved local review](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/vercel-aligned-20261012T052118Z/review.md>) contains the historical 124 passing focused tests and local reproducibility evidence; those tests were not rerun or represented as hosted acceptance in this task.

## Hosted acceptance

| Required check | Status | Actual finding |
|---|---|---|
| Deployment READY | FAIL | Authoritative ERROR state |
| npm ci | PASS | Reviewed npm ci command invoked; 675 packages installed in 21s; postinstall ran, then the build wrapper started |
| Node 24 selection | PASS with stated evidence | Deployment configuration selects 24.x. The reviewed major-version guard executes before the observed public-variable guard, so reaching this failure confirms major 24. Exact Node patch was not reported |
| Exact hosted npm version | NOT TESTED | Version not present in retained build events; npm ci execution/completion is verified |
| Deterministic wrapper invocation | PASS | Hosted log: node scripts/build-admin-release.mjs; uploaded wrapper identity matches |
| Observability accepted and discarded in a completed hosted build | BLOCKED | The allowed exact name is in deployment metadata, but an unknown public variable stopped the guard before successful Vite-worker initialization |
| Vite build completion | FAIL | Wrapper rejected build inputs; no wrapper PASS or compiled Vite artifact evidence |
| Hosted browser asset/hash comparison | BLOCKED | No READY deployment/artifact set; none of the expected 53 hosted outputs is claimed verified |
| Python dependencies/function packaging | BLOCKED | No Python runtime/dependency evidence in the 37 complete retrieved events; no executable function acceptance claimed |
| /api/sync-run-once GET/OPTIONS | BLOCKED | Not requested against the failed deployment; zero external sync POST requests |
| Root/deep Admin routes | BLOCKED | No candidate HTTP/browser checks after ERROR |
| CSP/security headers | BLOCKED for HTTP | Preserved in uploaded source and deployment route metadata; actual response enforcement not tested |
| Hosted bundle secret scan | BLOCKED | No compiled asset set. No token, server secret value, signed URL or private file was requested, printed or persisted by acceptance tools |
| Admin production alias | PASS | Still dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ |
| Organization/PWA project | PASS | Still dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV; deployment list and project settings unchanged |

[Sanitized failure reconciliation](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/candidate-deployment-20261012T054338Z/failure-reconciliation.json>) preserves sanitized hosted diagnostics. Raw logs and environment values were not saved. Existing npm deprecation/install-script warnings are recorded; the observed fatal condition is the wrapper input guard, not an established dependency defect.

## What is confirmed and what remains unknown

Confirmed: the corrected source was uploaded, including the 17-name metadata allowlist. The build reached the reviewed guard and rejected at least one unreviewed `VITE_*` process variable. The configured/public-value fingerprint passed before submission. Hosted deployment metadata lists only the four approved application names plus `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`; its outside-allowlist list is empty.

**The exact extra process-variable name is not established.** Deployment metadata does not enumerate every variable injected into the hosted process, and the sanitized wrapper error intentionally omits names/values. It would be inaccurate to blame the observability name again, claim a specific second name, claim a wrong artifact was deployed, or claim this build passed.

The smallest follow-up is a local review of provider-environment handling: retain exact target checks and the four-variable configuration fingerprint, construct the Vite child exclusively from those approved inputs, and evaluate whether provider-controlled metadata can be dropped before checking application-variable drift. Do not pass unknown values into Vite or remove server authorization. If an exact-name diagnosis is necessary, review a names-only diagnostic that cannot log values or credentials. This is a proposal; no guard was changed and no diagnostic deployment was submitted here. Any changed packaging requires newly reviewed artifact hashes and separate candidate authorization.

## Preservation and recovery

- [y-trace-admin.vercel.app](https://y-trace-admin.vercel.app) still resolves to `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ`. Public HTML is unchanged: HTTP 200, 1,884 bytes, SHA-256 `fabd94e4fe69d9fa197088cfc97a24d6208ba3b862d14cdccbca460e8a88ae93`.
- [ytrace.app](https://ytrace.app) remains on `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`; no Organization/PWA deployment was created. Relevant project settings remain unchanged.
- Supabase gateway metadata remains exactly unchanged, ACTIVE v1. No database/schema, policy, Storage, Auth, Admin-session or business operations were executed. This task did not regenerate the 57 database inventories or claim a fresh full database-data fingerprint check.
- Original 4,126 worktree snapshot entries and prior documented changes are preserved; all 64 tracked dirty paths are unchanged. 18 previous failed-deployment evidence files and 19 approved-review evidence files match their saved hashes. Root git diff --check passed with existing line-ending warnings.
- Both approved ZIPs are unchanged; the freshly extracted source had zero CLI content changes. The owned lock was released; both old and new attempt markers are retained. No other process lock was removed.

**Recovery decision:** this failed candidate is not a compatible recovery deployment. Keep the current domains unchanged and stop rollout. Do not retry the consumed attempt, promote the ERROR deployment, restore the vulnerable resolver as a recovery shortcut, broaden Storage policies or initiate restrictive cutover. After a local forward packaging correction is independently reviewed, obtain authorization for one newly hashed candidate. Require READY, hosted assets/Python/basic UI acceptance and a verified compatible recovery basis before promotion. If a later promoted release has a critical fault and no safe alternative exists, pause affected Admin document actions through separately approved fail-closed containment and prepare a forward correction; no automatic rollback is authorized.

## Final decision

**NO-GO for production-domain promotion. NO automatic retry.** The blocker is hosted build-input compatibility. Gateway/foundation reinstallation, business-fixture recreation and another staging infrastructure review are not indicated. No authenticated private-file test was attempted, and the consumed one-time gateway acceptance helper was not rerun.
