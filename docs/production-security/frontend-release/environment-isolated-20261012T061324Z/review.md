# Isolated Admin build environment correction

Prepared 2026-10-12T06:27:39.344Z. **CONDITIONAL GO for a new, separately authorized candidate-only deployment. No deployment was performed. Production-domain promotion remains NO-GO pending hosted acceptance and recovery.**

## Failure boundary and cause

Both earlier candidates failed in the input guard. The latest failure establishes that the corrected source was uploaded and that an extra process-level VITE_* input was rejected before Vite. Its exact name remains UNKNOWN; the observability name is not established as the second cause. The provider metadata inventory is incomplete for the hosted process. No new variable name was guessed.

The parent guard was stricter than necessary: the existing fresh worker already receives an explicitly constructed environment. Rejecting unknown parent variables in a verified provider context added a build availability failure without improving that worker boundary.

[Latest failed candidate report](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/candidate-deployment-20261012T054338Z/execution-report.md>)

## Exact correction and security boundary

Only [scripts/build-admin-release.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/candidate/scripts/build-admin-release.mjs>) and [scripts/build-admin-release.test.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/candidate/scripts/build-admin-release.test.mjs>) changed from the prior source revision. The complete patch is [packaging-changes.diff](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/environment-isolated-20261012T061324Z/packaging-changes.diff>).

| Input/boundary | Revised behavior |
|---|---|
| Hosted context | VERCEL=1, exact Admin project ID and VERCEL_ENV=production are required before extra public-prefixed inputs may be discarded. Wrong project, missing identity, preview, staging and development fail. |
| Four approved app variables | Require the same Admin surface, production Supabase origin, canonical Admin URL, production-bound anon key class and exact configuration fingerprint. Missing/changed values still fail. |
| Extra parent VITE_* inputs | In the verified context, discard them without forwarding or logging values. No wildcard prefix is allowed into the child. |
| Standalone/local builds | Continue rejecting every unexpected VITE_* name. |
| Known environment metadata | Existing conflicting VITE_VERCEL_ENV / VITE_VERCEL_TARGET_ENV checks remain. The 17-name exported list is regression coverage, not a child allowlist. |
| Vite worker | Only the four app variables plus PATH, SystemRoot, WINDIR, TEMP, TMP, TMPDIR, ComSpec, PATHEXT, LANG, LC_ALL where present; forced NODE_ENV=production and TZ=UTC. No parent spread. |
| Private/provider inputs | Service credentials, operator values, Admin sessions, PostgreSQL passwords, VERCEL_* and NODE_OPTIONS are omitted. Fresh worker revalidates inputs before importing Vite/plugins. |
| Environment files/version | Empty envDir remains enforced; fixed release version unchanged; parent VITE_APP_VERSION discarded in hosted mode and rejected in standalone mode. |

The fingerprint remains **27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a**. Configuration and source metadata are unchanged. The public JWT class inspection and provider-context checks are build-input safeguards, not cryptographic Admin authentication; application/server authorization is untouched.

Node supports explicit child environment replacement through spawnSync options.env; Vercel documents framework-prefixed build metadata. The correction relies on explicit projection of reviewed inputs rather than identifying every possible injected name. [Node 24 child process documentation](https://nodejs.org/docs/latest-v24.x/api/child_process.html), [Vercel framework environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables).

## Artifacts

Branch/base: **ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8**. No new Git commit. Isolated source identity: **sha256:0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324**, 561 files.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| [admin-gateway-vercel24-source.zip](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/admin-gateway-vercel24-source.zip>) | 15424104 | a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465 |
| [admin-gateway-vercel24-static-build.zip](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/admin-gateway-vercel24-static-build.zip>) | 11957132 | 56a44b576db1b7db0e47e6131e15770943be2ff9e0cf55b200709a14f91e2abe |

Static inventory: **1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d**. All 53 files match both independent fresh builds and the previous reviewed build byte-for-byte. The static ZIP has a new container timestamp/hash; compiled file identities are unchanged. It is ordinary Vite output, not Vercel Build Output API; do not use --prebuilt.

Fixed application identity remains **1.0.0-admin-storage-rc+20261012035933.vercel24** because only packaging changed. New source/archive hashes distinguish this variant. [Source/packaging manifest](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/environment-isolated-20261012T061324Z/source-manifest.json>); [Build inventory](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/environment-isolated-20261012T061324Z/build-inventory.json>).

## Actual local validation

| Check | Result |
|---|---|
| Existing frontend suites | PASS — 91/91 across 8 files |
| Packaging suite | PASS — 39/39; 13 additional tests |
| Existing Python packaging/behavior checks | PASS — 7/7, real network blocked; POST only mocked |
| TypeScript --noEmit | PASS |
| Fresh npm ci | PASS — two independent installations, no shared node_modules |
| Node 24 Admin builds | PASS — first verified provider-context canary build, second clean standalone build from the new ZIP |
| Generated asset comparison | PASS — all 53 exact matches to each other and previous reviewed output |
| Synthetic canary scan | PASS — 11 canaries absent in all 106 generated files checked across both builds |
| Bounded secret/origin scan | PASS — no service-role JWTs, secret API keys, literal Admin tokens, private operator variable names or staging origin findings |
| Diff/source preservation | PASS — root tracked status unchanged; only two packaging files differ |
| Linux/Vercel hosted build | NOT TESTED — this task is local preparation only |
| Hosted Python 3.12/function packaging | NOT TESTED — actual local Python is 3.14.3; only 3.12 grammar checked |

**137 tests passed, zero failed.** No full repository test suite rerun or reclassification of historical failures. Relevant assertions were not weakened; changed expectations specifically require verified-context omission of extra values and retain strict standalone/target/configuration rejection.

The actual first build included synthetic observability, unknown provider-prefixed and arbitrary public-prefixed values, a sensitive canary, a version override, and private server/operator/session canaries. Successful fresh-worker validation plus unchanged assets demonstrates that those inputs did not enter Vite. A separate real child-process check confirms the explicit environment boundary. No actual private key or session was supplied to the builds.

A preliminary report-generation check stopped before creating its output because it treated git diff --no-index exit 1 as a whitespace error. Isolated fixtures verified exit 0 for equal files, exit 1 with no diagnostics for changed clean files, and exit 3 with explicit diagnostics for trailing whitespace. The report tool now preserves the whitespace gate and handles content differences correctly. No product source or test expectation changed after packaging. [diff-exit-evidence.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/diff-exit-evidence.json>).

Toolchain: Windows x64, Node v24.21.0, npm 11.19.0. npm-ci.log: 671 packages, 42s; reproduction-npm-ci.log: 671 packages, 32s. Existing npm deprecation/install-script notices, stale Browserslist data and large-chunk warnings remain documented; no unrelated dependency changes were made.

Fresh read-only provider configuration checks occurred at 2026-10-12T06:19:41.323Z and 2026-10-12T06:22:04.429Z. Only the four explicitly public app values were retrieved in memory; no server-secret values or Supabase API calls. [build-public-parity.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/build-public-parity.json>); [reproduction-public-parity.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/reproduction-public-parity.json>).

[Validation summary](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/frontend-release/environment-isolated-20261012T061324Z/validation-summary.json>); [focused-tests.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/focused-tests.json>); [packaging-tests.log](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/packaging-tests.log>); [python-tests.log](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/python-tests.log>); [admin-build.log](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/admin-build.log>); [reproduction-build.log](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/reproduction-build.log>); [artifact-verification.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T061324Z/artifact-verification.json>).

## Preservation and release boundary

All 4126 original root snapshot entries preserve their current state; all 64 tracked dirty paths remain unchanged. 43 prior evidence/archive/attempt-marker entries match saved hashes, including both consumed attempts. Previous source/build archives remain intact. The original application/runtime, resolver, gateway client, caches, dependencies/lockfile, Python API/worker/requirements, Vite config, rewrites and CSP retain their prior identities.

No deployment, promotion, project setting change, Organization/PWA change, Git push, Supabase operation, account/session creation or business operation occurred. No installation/deployment authorization record or new deployment attempt marker was created. The old consumed markers must not be reused.

## Remaining hosted acceptance and recovery

1. Obtain fresh candidate-only authorization naming this source revision/archive hash, exact Admin team/project and --prod --skip-domain --force route. Recheck source identity, exact provider project, aliases, four-variable fingerprint, gateway prerequisite and competing operations immediately before any submission.
2. Extract the new ZIP into a fresh isolated directory. Use the reviewed explicit-project CLI route, a new durable single-attempt marker and operation lock. Never submit the dirty root, use --prebuilt, promote a domain or push the shared Git repository.
3. Require authoritative READY, hosted npm ci/Node 24/wrapper/Vite completion, actual child input fingerprint, source/upload identity, all generated output comparisons and no credential/canary findings. Investigate any difference rather than adopting replacement hashes.
4. Verify actual Python dependency/import packaging, harmless /api/sync-run-once GET and OPTIONS, root/deep Admin routes and security headers. No external sync POST. Authenticated private-file checks require separately approved genuine sessions/resources; do not rerun the consumed acceptance helper.
5. Confirm both production aliases remain unchanged. An ERROR candidate is not a recovery artifact. Require a verified compatible immutable deployment and a security-preserving recovery plan before separate promotion approval.

On another build failure or ambiguous submission, retain evidence and stop without automatic retry. Keep domains unchanged. Do not restore the vulnerable resolver or broaden Storage policies; prepare a separately reviewed forward packaging correction. Any later fail-closed pause or promotion is a separately approved production action.

## Decision

| Scope | Decision |
|---|---|
| Local isolated correction and artifact preparation | GO — complete |
| New Admin candidate-only deployment | CONDITIONAL GO — fresh authorization and immediate preflight required |
| Production-domain promotion | NO-GO — hosted acceptance/recovery not yet demonstrated |
| Broader Storage cutover / Organization-PWA release | Outside this task; not authorized |

Suggested authorization: “Authorize ONE new candidate-only deployment of source revision sha256:0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324, ZIP SHA-256 a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465, 15424104 bytes, to toffs-projects-81b2ce10 / lydorg (prj_J36xqAUQELX8NttCaFFInsxcCEaI; team_lrnDtn1fujS9WebCMQoWHmGR), using the reviewed --prod --skip-domain --force route and bounded hosted acceptance. No promotion, project settings, shared Git push, Supabase changes or business mutations. Stop on drift, failure or ambiguous outcome; no automatic retry.”
