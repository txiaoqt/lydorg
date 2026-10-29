# Admin candidate deployment — failed safely; no domain promotion

Date: 2026-10-12. Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.

**Candidate deployment: FAIL. Promotion/recovery eligibility: NO-GO.**

One authorized source deployment was acknowledged, then failed during the hosted build. There was no second submission, promotion, rollback, project-setting change, Git push, or Supabase mutation.

## Exact submitted identity

| Item | Actual evidence |
| --- | --- |
| Team | `toffs-projects-81b2ce10` / `team_lrnDtn1fujS9WebCMQoWHmGR` |
| Project | `lydorg` / `prj_J36xqAUQELX8NttCaFFInsxcCEaI` |
| Deployment | `dpl_645dxpV4ubKyVXast3rBHjy3mZhr` |
| Immutable candidate URL | https://lydorg-2nk97irag-toffs-projects-81b2ce10.vercel.app |
| Final provider state | `ERROR`; `BUILD_UTILS_SPAWN_1`; step `buildStep` |
| Provider error | `Command "npm run build" exited with 1` |
| Acknowledgement | 2026-10-12T04:55:06.082Z; official Vercel CLI 63.1.2 exited 0 after submission with `--no-wait` |
| Execution | `--prod --skip-domain --force --yes --json --no-wait`; explicit team/project process variables; fresh isolated source |
| Source revision | `sha256:e8ffe3241f7529f4440e8e4cc427254d2cd29da5e1bbcd0d689395431cd5aa8d` |
| Source ZIP | 15,422,338 bytes; SHA-256 `665e7d1f5969eb53cd65592043fbae8b6da21b1f7c83fbd9dfc1cc32f5aeaf6e` |
| Comparison static ZIP | SHA-256 `294632f506ea8762f6197622803043c6bd00a2e524753e608eb032b11a29c699`; never used as `--prebuilt` |

The durable attempt marker is retained at `.agent/admin-candidate-deploy-20261012T044600Z/deployment-attempt.json`. The operation lock was released through its ownership-checked cleanup path. The submitted candidate and all previous artifacts remain preserved.

## Actual validation results

| Check | Status | Evidence/limit |
| --- | --- | --- |
| Authenticated exact Vercel target | PASS | Provider project identity and team ownership matched before submission. |
| Source ZIP and extraction | PASS | Exact authorized ZIP length/hash; all 561 extracted files matched their SHA-256 manifest. |
| Actual uploaded source | PASS | All 560 provider source-file digests matched the CLI dry-run input digests. Only `.gitignore` was excluded by the CLI. No missing, extra or changed uploaded files. |
| Approved four public environment values | PASS | Privately verified configuration SHA-256 `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a`; Admin surface, canonical Admin URL, production Supabase origin, production-bound anon key class. No server secret values requested. |
| Hosted build environment compatibility | FAIL | Deployment metadata includes `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`, absent from the reviewed wrapper allowlist. Wrapper emitted `UNREVIEWED_PUBLIC_VARIABLE`. |
| `npm ci` and build wrapper invocation | PASS | Hosted logs show `npm ci --include=dev --no-audit --no-fund`, existing postinstall patch, and `node scripts/build-admin-release.mjs`. Installation progressed to the build step. |
| Hosted Vite build | FAIL | Wrapper stopped before compilation. No successful build-worker result or hosted artifact inventory exists. |
| Node runtime | PASS for required major; exact patch NOT TESTED | Provider selected `24.x`. The wrapper checks Node major 24 before the observed failure, so execution passing that check supports major 24; the exact hosted patch was not logged. |
| Exact hosted npm version | NOT TESTED | The install invocation is evidenced; no version probe was executed. |
| Python dependency installation/package/runtime | NOT TESTED | No Python packaging or runtime success was established before build failure. Local Python evidence is not hosted evidence. |
| Hosted browser assets versus local 53-file build | BLOCKED | Candidate never reached READY; no hosted successful build to compare. |
| Candidate root/deep routes, CSP, SPA and API GET/OPTIONS | BLOCKED | Stopped after the build error. Provider route metadata retains the six security headers and reviewed rewrites, but this is not HTTP/runtime validation. No API GET/OPTIONS or sync POST was sent. |
| Authenticated private-document access | NOT TESTED | Not authorized for this candidate; no Admin session created and no one-time gateway helper rerun. |
| Live Admin domain unchanged | PASS | `y-trace-admin.vercel.app` still targets `dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ`; public HTML still HTTP 200, 1,884 bytes, SHA-256 `fabd94e4fe69d9fa197088cfc97a24d6208ba3b862d14cdccbca460e8a88ae93`. |
| Organization/PWA unchanged | PASS | `ytrace.app` and project `yorbms_user` still target `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`; provider configuration/target matched the preflight. No deployment to that project. |
| Production Storage foundation/protective catalog | PASS | Native verified TLS read-only checks before and after: four tables, 14 functions, eight triggers, service-role-only authorization RPC, 164 migrations, 15 Storage policies, four containment and three document-security triggers. Exact installed receipt matched. |
| Production gateway prerequisite | PASS | Read-only control plane: `admin-storage-access` ACTIVE v1, `verify_jwt=false`, reviewed bundle SHA-256 `88e6e86352cdb3718e5687c1287b0bc73717a48f21b8c65aa97310744ab260e2`. No redeployment. |
| Worktree and pinned artifacts | PASS | Original 4,126 snapshot entries and prior documented changes preserved; zero root application edits in this task. Both approved ZIP hashes unchanged. `git diff --check` exited 0 with existing CRLF warnings. |
| Compatible recovery candidate | FAIL | ERROR deployment is not a verified executable recovery basis. The older live frontend lacks this release's gateway/fail-closed correction and is not a security-preserving rollback for a future restrictive cutover. |

No production business mutation, Auth/session creation, private-file download, Storage write, policy change or external sync request was issued. This task rechecked the protective catalog; it did not regenerate all 57 protected-data inventories or claim a fresh business-data hash comparison.

## Confirmed failure and narrow forward proposal

Configured production project metadata contains the four approved `VITE_*` application variables. The actual deployment additionally reports **`VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`**. That name is outside both the four application names and the wrapper's 16 exact provider metadata names, so the wrapper rejects it before creating the clean Vite worker.

Vercel documents a build-time observability client configuration for Analytics/Speed Insights. Its provider-injected origin is supported by that documentation and by its appearance in deployment metadata, rather than configured application variables. The exact prefixed name was independently observed; its value was neither requested nor saved. See [Vercel dynamic configuration](https://vercel.com/docs/analytics/package).

**Proposed change only; not implemented under this single-deployment authorization:**

1. In the isolated packaging wrapper, add only `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG` to the exact provider metadata-name list permitted when `VERCEL=1`, project ID matches the Admin project, and `VERCEL_ENV=production`.
2. Continue discarding it before the Vite worker. Do not parse, log, expose or pass its value into the frontend. Keep the four application-variable fingerprint unchanged.
3. Keep unknown `VITE_*` variables blocked; preserve standalone-context rejection, staging/other-project rejection and secret-variable scrubbing. Do not allow arbitrary `VITE_VERCEL_*` names or disable the guard.
4. Extend focused packaging tests to prove acceptance only in the verified context and absence from the child environment/bundle. Reproduce the static output and compare every file against the existing inventory; investigate any difference.
5. Prepare a separately reviewed source revision/archive and hash. A new candidate deployment requires fresh authorization naming that artifact. Do not reuse this consumed attempt marker or automatically resubmit.

No change to Vercel project settings or public configuration is proposed. Existing runtime/security fixes, API/Python sources, dependencies and lockfile should remain unchanged. No correction has been applied to the authorized ZIP or extracted source.

## Reconciliation and diagnostic evidence

- `deployment-acknowledgement.json`: one acknowledged submission, immutable candidate identity, sanitized output digests.
- `failure-reconciliation.json`: authoritative ERROR state, selected sanitized hosted build evidence, unchanged live aliases.
- `failure-environment-name-evidence.json`: names only; exact extra public-prefixed provider name; no values.
- `hosted-source-identity-corrected.json`: 560 matching source digests. Vercel wraps uploaded sources in a virtual top-level `src` directory. The first comparison treated that wrapper as a real source path; its historical apparent mismatches remain preserved in `hosted-source-identity.json`. Correcting this API tree interpretation yielded zero mismatches; no expected digests were changed.
- `backend-readonly-preflight.json` / `backend-readonly-postflight.json`: exact foundation/protective fingerprints unchanged, database read-only, TLS chain/hostname verified.
- `provider-preflight.json`, `immediate-deploy-preflight.json`, `public-configuration.json`, `source-preflight.json`, `dry-inspection.json`, `preservation.json`: guards and preservation evidence.

Before submission, two local read-only query-construction defects were diagnosed: Windows interpreted an ampersand in a query argument, and CLI GET fields were treated as a body. Final checks used a single supported query parameter and no GET body. These caused no deployment submission or provider configuration write. Earlier diagnostics are preserved.

Foundation postflight compatibility SHA-256: `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`.

Foundation function/table/trigger SHA-256 fingerprints respectively:

- `31c658a5d692e03262bf1952b1b493bce67e96f8d06da307da10e928a59af55a`
- `e8a99cced6798451a93d4aca4eac5ca1a209ef3869cd367ac454215ec32eb85f`
- `ab8eaa2be4f9dd4dfbb993f61cb42b99c41ad198c8af1345eb5ec5fc40b4416f`

## Release decision

**NO-GO for domain promotion and for using this failed candidate as compatible recovery.** Keep the current domains unchanged. Preserve the failed deployment and evidence. Review the exact-name packaging correction locally, then obtain separate authorization for a newly hashed candidate. Successful hosted compilation, artifact comparison, Python import/GET/OPTIONS checks and remaining bounded acceptance must precede any promotion decision. Authenticated file checks retain their separate session/resource authorization requirement.

The gateway-compatible frontend is not live, and the broader restrictive Storage policy cutover remains a separate, unapproved release. No automatic rollback or further rollout was attempted.
