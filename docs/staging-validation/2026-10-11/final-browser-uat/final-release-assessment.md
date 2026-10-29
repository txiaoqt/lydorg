# Y-TRACE — Final browser UAT and security release assessment

11 October 2026, Asia/Manila. Browser execution: approximately 10:17–10:40 AM.

## Release decisions

| Scope | Decision | Conditions and evidence |
|---|---|---|
| Standalone production document-mutation hotfix | **GO for separately authorized, controlled deployment** | Exact candidate hash and current production catalog match; real staging terminal denials and post-patch positive registration revision already passed; desktop owner/Admin preview, downloads and session recovery now pass. This is a risk-based recommendation, not authorization, deployment, or certification of the whole system. Concurrency remains unmeasured. |
| Controlled capstone desktop/browser UAT | **GO with constraints** | Use isolated staging, synthetic accounts/data, supervised tasks and the tested desktop download flow. Record the limitations below. This does not authorize new fixture mutations or certify an unrelated deployed participant environment. |
| Complete PWA/download UAT sign-off | **NO-GO** | A real renewal Download File defect opens a nested preview and uses the signed URL query as its title. Fix and retest this flow before claiming PWA download readiness. Installed-device, interrupted-upload and service-worker coverage also remain incomplete. |
| Broader production Storage security rollout | **NO-GO for immediate cutover** | Production still has the five bucket-only private read policies and two bucket-only ALL asset policies. The document hotfix does not fix those exposures. Gateway/frontend compatibility, historical-path coverage and separately reviewed cutover remain necessary. |

Earlier reports marked all missing browser/concurrency coverage as blockers for the document hotfix. This report supersedes that blanket decision: the practical browser gap is substantially closed, the positive revision passed previously, and the remaining concurrency uncertainty can be explicitly accepted for an urgent, narrowly scoped mitigation. It remains a genuine residual risk, not a passed test.

## Repository, environment and preservation

- Branch `ui-refactor`; HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`, verified rather than assumed.
- The checkout was already extensively dirty, including application, performance, security, migration, test, report and generated build files. No reset, checkout, overwrite of prior evidence, push, application deployment, migration or database reconstruction occurred.
- Chrome 155.0.8059.39 and Edge 155.0.4283.45 are installed. Playwright successfully launched installed Chrome with the supported `channel: 'chrome'`; bundled Chromium was unnecessary. Edge was located, not separately exercised.
- Sandboxed loopback access failed. Launching local Vite and Playwright together in the supported elevated terminal solved it. No browser installation or hosted deployment was needed.
- Vite used an isolated ignored env directory with only the exact staging URL, staging anon key and UI flags. The preparation script now also verifies the legacy anon key's project reference. No service-role key entered the browser bundle.
- The browser context guards HTTP requests and WebSockets to localhost and `zroudsvpswqsjlyttkjf.supabase.co`, rejects production/foreign endpoints and business/email writes, and permits normal authentication, read RPCs and selected-file signing. Service workers were blocked so they could not bypass interception. Chrome's internal PDF resources were explicitly allowed; external fonts remained blocked.
- All three runs recorded **zero production-host attempts and zero whole-portal snapshot requests**. Supabase catalog access outside the browser was read-only and explicitly project-pinned.
- Staging postflight: 6 Auth users, 5 organizations, 2 Admin accounts, 10 buckets, 32 objects, 3 accreditation terms, one approved cycle 2 renewal. **Zero active Admin sessions** remain.
- Full-row fingerprints for profiles, document metadata, submissions, renewals and accreditation terms match the preflight. Storage-object fingerprints also match, excluding the read-access timestamp. Storage-policy fingerprint remains `cc25b6f3c44d3fd7550b24facaa52196`. No preserved document was uploaded, replaced, deleted, reopened or approved in this pass.
- Only genuine UI authentication/session creation, refresh, logout/revocation and their normal audit effects occurred. Existing successful Org C revision and renewal approval were not replayed.

## Actual authenticated browser results

These are real Playwright-controlled Chrome sessions against local application code and staging Auth/PostgREST/Storage. They are not mocked UI tests.

| Workflow | Status | Evidence and limit |
|---|---|---|
| Organization C login/dashboard/navigation | PASS | Normal sign-in form; correct synthetic identity and compliance dashboard. |
| Registration approved/under-review display | PASS | Corrected Constitution under review, Form B peer approved and locked; no mutation attempted. |
| Owner registration PDF previews | PASS | Corrected and approved-peer PDFs rendered; one-page preview inspected. |
| Owner registration downloads | PASS | Actual Playwright downloads and SHA-256 verified below. |
| Organization logout/protected route | PASS | Confirmation completed; local Auth cleared and website protected route returned to sign-in. |
| Website same-context account switching | PASS | C → renewal owner → B displayed the correct account data; prior accounts' document listings disappeared. This checks visible UI/cache behavior, not every possible API isolation attack. |
| Approved renewal display | PASS | Cycle 2, 6/6 approved, terminal locks and approval activity displayed; no approval replay. |
| Approved renewal owner preview/download | PASS | One-page PDF rendered and downloaded with matching bytes. |
| Organization reload/token refresh | PASS | Website session restoration; genuine Supabase refresh in PWA preview, followed by successful reload. |
| Mobile layout | PASS for sampled pages | Chrome viewport 390×844; measured document width 380px; registration, renewal and PDF modal inspected. This is viewport simulation, not a physical-device test. |
| Super Admin login/dashboard | PASS | Normal Admin login and correct synthetic records. |
| Admin registration/renewal review display | PASS | C packet and approved renewal review visible; review decisions untouched. |
| Admin secure preview/download | PASS | Gateway signing succeeded; native Chrome PDF visibly rendered after internal viewer resources were permitted. Original-quality C PDF downloaded with matching hash. |
| Zero-permission Admin | PASS for access denial | Registrations showed Access Restricted; renewal queue RPC returned HTTP 400 permission denial and exposed zero records. The renewal navigation entry remains visible because its frontend permission mapping is missing; this is a UI defect, not observed data access. |
| Admin expiry/recovery | PASS, simulated client expiry | Only the browser's stored expiry was moved into the past; protected UI redirected to sign-in. The genuine test session was revoked afterward. Normal Super Admin re-login worked. This is not a newly measured natural server-expiration test. |
| Genuine Admin revocation | PASS | Revoke RPC HTTP 204; validator HTTP 200 with empty result; reload cleared protected UI and local Admin state. |
| PWA component navigation/status/preview | PASS in development preview | Existing `pwaPreview=1` mechanism with standalone UI flag; approved cycle, dashboard, C registration and one-page corrected PDF rendered. |
| PWA logout/account switching | PASS | Public `/app-start` after logout, no local Auth/Admin state; C → B shows B and no C corrected file. |
| Simulated brief offline/online transition | PASS for session retention only | Connection disabled/re-enabled; local session retained and online reload recovered. No offline app-shell or upload-recovery claim. |
| PWA renewal Download File | **FAIL** | No browser download event; nested preview opened, with a signed query used as title and an unsupported-format error. See defect details below. |
| New upload/revision/interruption/retry | **BLOCKED** | No currently authorized editable disposable state. C is under review; completed renewal is approved. Reopening or creating another fixture was outside scope. Prior real API revision success is historical evidence, not this browser coverage. |
| Installed PWA, physical device, SW update/offline cache | **NOT TESTED** | Development preview only; service workers blocked by this test's fail-closed network boundary. |
| Organization natural session expiry/recovery email | **NOT TESTED** | Genuine refresh/login/logout were exercised; no session-expiry DB change, recovery email or OTP was invoked. |

### Download byte evidence

| File | Bytes | SHA-256 |
|---|---:|---|
| C corrected Constitution — owner and Admin downloads | 675 | `eff909582c12ba82bc1fcdbc8f88a8f8df3f12a1101be978d6ef7cacc19f13a5` |
| C approved Form B peer — owner download | 672 | `0ac59676f7aa8053c1fbabfcb5f466f763d6c959eba38ed6e680357ebe1cceb0` |
| Approved renewal corrected PDF — website owner download | 674 | `67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d` |

### Evidence accounting and failed checks

Preserved files: `browser-evidence.json`, `browser-evidence-02.json`, `browser-evidence-03.json`. They contain sanitized HTTP method/endpoint/status, check results, blocked destinations and error counts. No request bodies, passwords, keys, JWTs or signed URLs are saved in those JSON reports.

| Run | Staging HTTP responses | Recorded PASS | Recorded FAIL | Unhandled page exceptions | Console error / warning counts |
|---|---:|---:|---:|---:|---:|
| 1 | 305 | 17 | 0 | 0 | 41 / 10 |
| 2 | 153 | 9 | 3 | 0 | 23 / 1 |
| 3 | 115 | 10 | 0 | 0 | 13 / 6 |

These are whole multi-page-session counts, **not requests per page load or a performance comparison**. Checks overlap; 36 recorded passes do not mean 36 independent authorization scenarios.

Two of run 2's failures were incorrect harness expectations: actual permission text is Access Restricted, and normal PWA logout ends at `/app-start`, not `/signin`. Correct expectations passed while the historical failures remain intact. The third failure is the genuine PWA download defect. Locator timeouts while discovering confirmation/card controls were also observed; these do not establish product failures. Earlier guard versions blocked native PDF internals and Admin refresh; the final run allowed both correctly. Console counts include intentionally blocked fonts/resources, denied RPCs and warnings; not every warning was individually classified. Zero-console-error readiness is not claimed.

Revoked-session requests still in flight during logout returned HTTP 400 and did not disclose data. Permission-denied page requests likewise returned 400. The final corrected session/preview run had no HTTP failures.

## Confirmed PWA defect and lower-priority observations

**PWA renewal download: release-critical for that user task.** `src/user/pwa/renewals/PwaRenewalPage.tsx` routes `openFile` back to `requestPwaDocumentPreview`. The shared renewal workspace calls that callback for Download File and Open in New Tab. Its filename extraction splits the entire URL on `/`, `?` and `#`, so a signed URL's final query segment becomes the preview title. The result is a second modal instead of a download and bearer-token text in the UI.

Proposed focused correction: separate download/open actions from preview dispatch, retain the supplied authoritative filename, and derive any fallback name only from URL pathname with a safe default. Add a signed-URL filename regression and an actual PWA download/hash check. **No application correction or deployment was made in this validation-only pass.**

A diagnostic body dump reflected the synthetic token before evidence redaction was hardened. The reusable runner now redacts URL/token-shaped text before printing, with a regression test; no such value is in the saved browser JSON or screenshots. This was synthetic staging evidence, not a production credential. Already-issued signed URLs remain bearer capabilities until their server-defined expiry; logout/cache clearing does not revoke them.

Lower-priority findings: five approved renewal fixtures have null upload timestamps and display Never uploaded despite attached approved files; use an unavailable-date label rather than infer absence. Zero-permission Admins see a Renewals navigation entry and then receive server denial. Logout can leave a few in-flight denied reads. These do not justify changing lifecycle history or delaying the independent server hotfix.

## Concurrency feasibility and residual risk

**BLOCKED — real approval-versus-replacement race was not executed.** No PostgreSQL client/server or Docker executable/service was found, no isolated DB connection credentials were available, and there is no authorized disposable renewal in an editable state. C's registration is already under review; altering it into a race fixture would mutate preserved evidence. Two ordinary HTTP sessions do not provide deterministic transaction barriers, and racing operations against the approved renewal would violate the task boundary.

Static lock review supports the intended design: owner replacement locks renewal → organization → submission → file and rechecks linkage/status after waits. Admin approval locks the same renewal row before changing terminal state. At ordinary READ COMMITTED isolation, replacement waiting behind approval should see the committed terminal status and reject it; approval waiting behind a replacement should inspect the updated file state. The guard also protects direct file writes. Direct REST writes can acquire rows in a different order and deadlock; PostgreSQL aborting one transaction preserves atomicity, but deadlock/timeout handling remains unmeasured. This reasoning and the historical single-connection PGlite cases are **not concurrency certification**.

For the hotfix, accept this residual risk explicitly, deploy during low traffic with existing short lock/statement timeouts, monitor denied writes/deadlocks and preserve fail-closed recovery. Before full transactional sign-off, separately authorize an isolated disposable state and two independent PostgreSQL sessions to exercise both commit orders and rollback outcomes. No new infrastructure or organizations were created here.

## Production-only candidate compatibility

Reviewed file: `docs/production-security/document-mutation/document_mutation_lifecycle_guard_production.sql`.

Verified unchanged SHA-256:

`86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785`

Fresh read-only production catalog findings:

- 163 migration-history entries, latest `20261008174154`; production is behind the local migration set. Broad `db push`/replay remains unsafe.
- All 10 guarded function bodies, signatures, owners (`postgres`) and security-definer modes match the candidate. The relevant RPC ACL, trigger, table-policy and Storage-policy fingerprints also match.
- Relevant tables retain RLS; no new patch namespace or trigger-name collision. 140 relevant column definitions match staging exactly.
- 37 canonical private document-file references have zero missing Storage objects. The earlier broader 547-reference assessment remains historical evidence; it was not recounted across all metadata sources in this pass.
- Zero production renewals exist; no production renewal business operation was tested. No production private object was downloaded or signed.
- The candidate preserves custom Admin-token RPC authorization, restricts owner mutation execution to authenticated users, installs lifecycle guards and retains audit/workflow contracts. It contains no staging reconciliation, fixture identities, date simulation, credentials, Storage-policy changes or broad data rewrite.
- The artifact remains outside `supabase/migrations`; the SQL cannot itself prove its project host, so externally pinned connection verification is mandatory.

Fresh production Storage-policy inspection separately confirms five public-role bucket-only SELECT policies for organization/budget/liquidation/YPOP/MOVE private files and bucket-only ALL policies for templates/news assets. These are **critical unresolved production confidentiality/integrity exposures**. No unauthorized production access probe was performed. Deploying the document-mutation hotfix would reduce one vulnerability while leaving these separate exposures present.

### Essential conditions for the standalone hotfix

1. Separate production approval; independently verify exact production project and candidate hash immediately before execution.
2. Recheck all catalog/ACL/history/column gates and stop on drift. Select only this standalone forward change; exclude staging reconciliation, performance migration, test-scenario SQL and broader Storage cutover.
3. Use one atomic transaction in a low-traffic window. Existing limits are 5-second lock timeout and 30-second statement timeout. Any pre-commit error must roll back the whole change; uncertain response requires read-only reconciliation, not automatic retry.
4. Verify committed functions/triggers/grants and migration registration. Perform separately authorized narrow positive/negative smoke tests with appropriate approved data, then monitor document-write errors, deadlocks and audit records.
5. If a regression appears, retain terminal protection and use a reviewed forward correction or fail-closed pause of mutation entry points. Do not restore vulnerable RPCs or remove guards as a quick rollback.

Full PWA task completion, physical-device tests, performance work, staging scenario utilities and broad Storage migration are not prerequisites to this isolated backend mitigation. They remain prerequisites or risks for their own releases. Already-issued signed URLs are not revoked by the database hotfix.

## Local validation and baseline failures

| Check | Result |
|---|---|
| New browser network/redaction guard Node tests | PASS — 6/6 |
| Focused Vitest: document mutation SQL contracts, Admin permissions, signed-URL cache, installed-PWA decision hook | PASS — 36/36 across 4 files |
| `npx tsc --noEmit` | PASS — exit 0 |
| Production Vite compilation with explicit staging config, isolated temporary output | PASS — 4,103 modules, 31.72 seconds; existing large-chunk/stale Browserslist warnings |
| Initial `npm run build -- --outDir ...` invocation | FAIL — PowerShell/npm argument forwarding treated output path as root; corrected direct Vite invocation above passed. This was command invocation, not a code regression. |
| Script syntax and `git diff --check` | PASS — existing line-ending warnings only |
| Full repository suite / earlier 150 failures | NOT TESTED in this focused pass; no assertion was weakened and historical failures remain unresolved evidence |
| Existing 47 PGlite, 26 post-patch terminal HTTP, Org C positive revision, 78 private Storage and 43 gateway assertions | Historical PASS evidence reused where implementation is unchanged; not rerun or added to this turn's totals |

## Remaining manual UAT procedure

1. Use the explicitly staging-configured local app and synthetic credentials through the normal UI; verify organization name before each task.
2. On desktop, check C's under-review/approved pair, open and download each PDF, then confirm approved renewal cycle 2 remains locked. Sign out fully before switching to B and confirm previous private listings disappear.
3. As Super Admin, inspect C registration and approved renewal without changing review decisions; confirm zero-permission Admin cannot retrieve the records; log out and verify protected routes no longer load.
4. After the PWA download defect is corrected, test actual installed Chrome/Edge/Android behavior, Download/Open actions, logout/account switching, app update, offline shell and online recovery. Avoid capturing signed URLs in screenshots/logs.
5. Upload interruption/retry and concurrent approval/replacement require a separately authorized editable disposable state. Do not reopen C or cycle 2, upload extra evidence files, or approve a new record merely to complete a checklist.

## Critical versus deferred work

- **Critical for complete PWA UAT:** fix nested renewal download/token-title behavior and verify real download bytes. Until then, use tested desktop downloads and limit supervised staging UAT tasks accordingly.
- **Critical for broader production security:** remediate the live bucket-only policies through the separately reviewed gateway/frontend/Storage cutover; confirm historical data compatibility and recovery order. No general production security sign-off is justified while these remain.
- **Required execution controls for hotfix:** separate approval, exact project/hash, fresh drift gates, atomic deployment and post-commit verification. No production application is authorized by this report.
- **Deferred with explicit risk acceptance for narrow hotfix:** real two-session contention; physical-device/SW behavior; interrupted upload; UI date/navigation polish; remaining broad regression triage. A known security defect should not remain open solely because these unrelated checks are unavailable.

## Files added or adjusted in this pass

Local testing only: `scripts/staging/browser-uat-harness.mjs`, its Node tests, `scripts/staging/interactive-browser-uat.mjs`, and the existing `prepare-staging-browser-env.mjs` (PWA-preview flag and anon-project verification). Reports, sanitized catalog/postflight JSON and synthetic-only screenshots are under this directory. Application source, reviewed SQL, production, existing actors, business fixtures and historical reports were left unchanged.
