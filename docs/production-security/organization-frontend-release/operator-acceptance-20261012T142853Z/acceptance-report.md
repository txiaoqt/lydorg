# Organization/PWA candidate acceptance — operator results received

## Decision

**CONDITIONAL GO for separately authorized promotion of the exact existing READY deployment `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ`.** The protected hosted checks and reported owner smoke checks passed. Retain the existing TypeScript, avatar cleanup, Realtime and coverage limitations below as explicit conditions for this pre-production capstone release.

No rebuild, redeployment, promotion, rollback, Git push or agent-initiated production mutation was performed. This is acceptance evidence and a recommendation, not deployment authorization.

| Identity | Value |
| --- | --- |
| Immutable candidate | [yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app](https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app) |
| Deployment | `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ` |
| Project / team | `yorbms_user` / `toffs-projects-81b2ce10` |
| Project ID | `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N` |
| Team ID | `team_lrnDtn1fujS9WebCMQoWHmGR` |
| Source revision | `0e3f313a4ca9c4a96242ab539767a5d2ad9a5e906483031c101e906f179d01dd` |
| Static inventory SHA-256 | `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94` |
| Application version | `1.0.0-org-storage-rc+20261012114439.vercel24` |
| Operator checker recorded time | `2026-10-12T14:20:57.662Z` |
| Local comparison time | `2026-10-12T14:36:23.662Z` |
| Fresh provider preservation time | `2026-10-12T14:37:15.977Z` |

## Evidence attribution

The browser checker was run by the operator in their existing Vercel-authenticated browser. The agent did not control that browser, read its sessions or independently capture its responses. Supplied paths, byte counts and hashes were transcribed into an explicitly normalized evidence record and independently compared locally with the previously approved manifest. The original supplied JSON and follow-up statements remain in the conversation.

Fresh Vercel project/deployment/alias verification was independently performed through authenticated provider GETs. No environment-value decryption, Supabase request or business mutation was part of that verification.

The prior pending report remains preserved. This report supersedes its pending-input labels; it does not rewrite earlier failures or receipts.

## Protected hosted acceptance

All PASS entries in this section are **operator-executed browser evidence, checked for consistency locally**.

| Check | Result | Actual supplied evidence |
| --- | --- | --- |
| Exact candidate origin and release identity | **PASS** | Origin, deployment, source revision and fixed version match the approved candidate. Browser identity fields are checker constants; independently checked provider identity supports the target. |
| Static artifact integrity | **PASS 53/53** | All 53 actual path/byte/SHA-256 observations equal the approved manifest; 19,518,681 asset bytes. Observed inventory hash equals `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94`. Zero mismatches, missing files or extra files. |
| Vite manifest | **PASS** | `/.vite/manifest.json`: HTTP 200, 5,878 bytes, exact approved hash. The previously possible metadata-exposure blocker did not occur. |
| Root + six deep routes | **PASS 7/7** | `/`, `/dashboard`, `/app`, `/document-submission`, `/organization-renewal`, `/app/documents`, `/app/renewals`: HTTP 200, 1,923-byte approved HTML shell, SHA-256 `0ba2ce8b45700be3075be18e95d1910446e3ad623402968724bd7f1ed850dc1a`. These prove shell delivery, not each authenticated workflow. |
| CSP and reviewed security-header expectations | **PASS** | No reported header mismatches across nine root/route/API responses or the 53 assets. Expected header values were separately checked against reviewed `vercel.json`; no cookies/authorization headers were supplied. |
| Python API GET | **PASS** | `/api/sync-run-once`: HTTP 405, 55-byte JSON body, SHA-256 `22896991070817cae33008d58b74501edb9e1863044e18be144e686ad8791370`; matches the source handler's expected response bytes. |
| Python API OPTIONS | **PASS** | HTTP 204, zero bytes, empty-body SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. No POST or external sync invocation. |
| Bounded hosted secret/canary scan | **PASS** | 33 text-scan visits, zero findings. This is the reviewed literal/canary scan, not an exhaustive guarantee that every possible secret is absent. |
| Checker read-only scope | **PASS** | Nine route/API requests + 53 asset requests; no redirects followed. Reported private-file requests 0, POSTs 0, credential reads 0. This scope excludes unrelated activity of the already-running app. |
| Service-worker network bypass | **PASS — operator confirmed** | Worker controller was present. Operator explicitly confirmed DevTools **Bypass for network** enabled. The checker cannot independently attest that DevTools setting; preserve this provenance qualification. No rerun is needed solely because `controllerPresent` remains true. |

The expected headers are X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy, Cross-Origin-Resource-Policy and Permissions-Policy. The checks compare all six exact values. The Python results establish expected harmless handler behavior; they do not certify the excluded sync POST/external processing path or every dependency version.

The checker source remained unchanged, SHA-256 `02f37c21c749a846eca2fb96912641600204204b6802d41f80e7478de52bfde0`. Its prior source review and six offline safety checks remain separate local evidence and are not counted as additional hosted passes.

## Existing-account smoke observations

These are **operator-reported**, not agent-automated browser tests. No credentials, private URLs or document contents were collected.

| Workflow | Result | Qualification |
| --- | --- | --- |
| Google login | **PASS** | Operator reports successful login with their own account. No agent login or session extraction. Account creation/history and Auth-side deltas were not independently inspected. |
| Dashboard/navigation | **PASS** | Operator reports dashboard visible. |
| Submission/status display | **PASS** | Operator reports OK; no submission mutation requested. |
| Existing private-document preview | **PASS** | Operator reports OK; no private contents or signed URLs supplied. |
| Existing private-document download | **PASS** | Operator reports OK. Private-file hash comparison and exact filename verification are **NOT TESTED** in this acceptance evidence. Static asset hashing does not substitute for private-download integrity. |
| Registration access | **PASS, after profile completion** | Operator reports access after editing the ordinarily editable profile fields following Google sign-in. See manual-write disclosure below. |
| Authenticated renewal-page workflow | **NOT TESTED** | No separate owner renewal observation supplied. A 200 SPA response at `/app/renewals` is not authenticated workflow validation. Do not repeat approval or manufacture another renewal for this acceptance. |
| Public templates and published news | **PASS** | Operator reports both OK. |
| Account switching/private-data cleanup | **PASS** | Operator explicitly reports previous private data cleared, in response to the check covering documents, previews and avatar. Physical Storage cleanup and server-side session invalidation are not established by this UI observation. |
| Live Realtime status transition | **NOT TESTED** | No legitimate live change observation supplied; no event was manufactured. |

### Manual profile edit

The operator reported editing their own profile to pass the registration prerequisite. This was outside the read-only static checker, not requested or performed by the agent. The exact field list, before/after values and server audit delta were not supplied; personal values were not requested. No blanket claim that the full manual browser session caused zero production writes is made.

Focused source inspection confirms `PwaDocumentAccessGuard` checks `isOrganizationProfileComplete(data.profile)` and displays **Complete your profile first** / **Finish and save all required organization information before accessing Registration Requirements**. The desktop submission code likewise requires profile completion. Completing normally editable fields is therefore consistent with the designed prerequisite. This does not establish a privilege bypass or regression. Exact mutation scope remains unverified; no rollback, additional profile edit or record repair is authorized or attempted.

## Independently verified live preservation

Six fresh authenticated Vercel GETs passed. No deployment or promotion API was called.

| Target | Result | Authoritative provider state |
| --- | --- | --- |
| Candidate | **PASS** | Exact immutable deployment remains READY in the approved project/team. |
| Admin live alias and project production target | **PASS** | `y-trace-admin.vercel.app` remains `dpl_AZ287kU35oFTVqyTEQRf749qncAA`. |
| Organization live alias and project production target | **PASS** | `ytrace.app` remains `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`. |
| Organization www | **PASS** | `www.ytrace.app` remains verified with HTTP 307 redirect to `ytrace.app`. |

The earlier source-provider check passed 561/561 upload identities. No source change or build was performed afterward. Supabase/gateway/database inventories were not re-audited in this acceptance task; historical gateway evidence is not misrepresented as a new assertion. No agent Supabase/Auth/Storage request, file upload/deletion or sync POST occurred.

## Promotion conditions and remaining risks

1. **TypeScript remains FAIL: 651 preserved baseline diagnostics.** No rebuild/typecheck was repeated or assertion/compiler configuration weakened. Prior investigation established no newly introduced diagnostic, with the one rendering variant documented. Existing errors still include real runtime-adjacent debt: 22 in the shared service file and 45 in its local import closure. A policy requiring a type-clean release would be NO-GO until separately corrected.
2. **Avatar cleanup is a confirmed existing defect.** Cleanup reads camel-case `profileImageUrl` from a raw row exposing `profile_image_url`; replacing/removing an avatar can leave the old object retained. Current display/account-switch results do not prove deletion or resolve that retention defect. Track a separate narrow correction; do not certify avatar cleanup or automatically delete retained objects. This task does not demonstrate cross-account Storage isolation or change its policies.
3. **Realtime callback typing risks remain.** No live status-change test was performed. The typing mismatch is not itself evidence of runtime failure. Advise manual refresh if status appears stale pending a focused separate correction/verification; do not treat that mitigation as a passed Realtime test.
4. **Coverage is bounded.** Authenticated renewal workflow, private-download SHA-256/filename, session expiry/revocation, installed PWA, physical device, offline and interrupted-upload behavior are not newly certified here. The separate PWA download/offline fixes were not bundled into this seven-file Storage candidate.
5. **Manual browser activity is distinct from checker scope.** The reported profile edit and Google login may produce ordinary application/Auth side effects. Their exact database deltas were not audited. Do not reuse the helper's zero-write counters as a claim about those activities.
6. **Promotion and policy cutover remain independent.** This candidate is a compatible frontend/recovery artifact for the tested scope. It does not resolve the 215 historical private-object references, 56 template versions, separate Admin budget cleanup issue or future restrictive-policy gates. No broad Storage cutover is authorized or newly certified.

For the stated pre-production capstone with developer-owned accounts, no failed new hosted assertion or reported owner isolation defect was found. The remaining debt and untested cases can be accepted explicitly for this narrow compatible frontend promotion rather than automatically blocking every release. Any later artifact/backend mismatch, unexpected authorization success, stale cross-account private data or runtime regression requires stopping and a separate forward-correction review.

## Next authorized boundary and recovery

No further candidate deployment is needed. A future task must separately authorize promotion of **this exact deployment** and accept the documented conditions. Before that write, identify every alias affected by the provider promotion, verify project/team and source/static identity, recheck current live targets and exclude competing promotions. Stop on unexpected alias scope. Preserve the Admin release and existing www redirect configuration.

Retain the immutable accepted candidate, its archives and receipts as the compatible recovery artifact. Do not automatically restore an older Organization frontend that lacks the reviewed Storage integration. A newly discovered defect requires a separately reviewed forward correction or fail-closed pause; never weaken Storage authorization as a shortcut.

No new production action is authorized by this report. Existing deployment attempt markers and all prior reports remain preserved.

## Evidence files

- [Normalized operator-supplied observations](operator-observed-input.json).
- [Independent local comparison with the pinned manifest](operator-evidence-comparison.json).
- [Fresh authenticated provider preservation](provider-current-preservation.json).
- [Prior checker security review](../protected-acceptance-20261012T135157Z/checker-security-review.json).
- [Prior pending acceptance report, retained](../protected-acceptance-20261012T135157Z/acceptance-report.md).
- [TypeScript scope and candidate preparation](../vercel24-20261012T114439Z/readiness.md).

Application source, reviewed ZIPs, static inventory, historical evidence and dirty working-tree changes were preserved. Only new local acceptance/evidence documents and read-only verification helpers were added.
