# Offline trusted-I/O integration review

**NON-RUNNABLE — NOT AUTHORIZED**

## Verdict

**BLOCKED for live integration or a continuation authorization.** The new offline protocol model passes its focused tests and is available for independent review. It does not implement the trusted I/O providers and does not establish production readiness or authorize Decision A execution, Decision B, SQL installation or any protected-state operation.

## Reviewed scope and preservation

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused  
Branch/HEAD: ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8

The actual corrected wrapper, its remediation report and independent review, the reviewed native candidate, Decision A proposal/checklist/identity sheet, pinned SQL/verifier, preservation references and driver inputs were inspected offline. 193 unique pre-existing reference files matched their recorded sizes/hashes. The seven artifacts of this task's preserved intermediate revision were subsequently added to the preservation ledger, for 200 verified references total.

| Reference | Exact verified identity |
| --- | --- |
| Corrected wrapper bundle | af8a4299c476969df5259889f69041ac855df528644fb54c0a37e15b72caceca |
| Wrapper manifest / inventory | b36df23ff72ce16b49bb13157a2500365ac8fe0ba2d7030f7377ae1365b10f43 / 268ad781656ac38dc93f31b4758aeaa3b4b2999d703572b9ce06a436eb5416e3 |
| Original inline snapshot | 1,885 bytes; d2a6a7f93cbb8a8a4190583db2a8a44535164cd3b58f802d53c8ee3e01fec99a |
| Wrapper remediation report / independent review | 2eb81a5022896bb18d4c358ae18ca68b48e5aa824bc332b2b7cc37288feee2b4 / c7a1928ae9a2e6c0d87fd462f70508d9d00b6c872aebb273116c5d171acf925b |
| Reviewed native bundle | f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84 |
| Native manifest / inventory | 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2 / e852913544468bd34724e22b9bc132bcf9c5d8a060a0cf4eaba3d8a89bf5d362 |
| Unchanged SQL, historical input only | 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated verifier | 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Decision A proposal | b8ef01fcba83505b9b98674c774a2938d073b115db01c743794122be41ef4de4 |
| Decision A checklist | 298cbdee4f8d7605422a9a5b7b30152b1118a3df246e329d6980f288f50626a2 |
| Decision A identity sheet | ffd927475248fa88121c05def71bfc0e842d8454b58db107492b93ceb087d9c5 |

Reference directories are unchanged: outer-preflight-wrapper-candidate-20261014T054751Z, native-adapter-candidate-20261013T161403Z and evidence-refresh-authorization-package-20261014T044128Z under docs/production-security/budget-deletion-pause. Their complete local file identities and every other preservation reference are pinned in the new reviewed-inputs.json.

The prior authorization window and proof are expired and historical only. Historical reports show the proposal's formerly active proof was already archived during the previous Decision A. This review did not inspect the current protected proof or state and does not bind a new active proof. Neither old authorization reference is accepted by the model as fresh authority. No approval fields in the old package were filled or changed.

## Findings and traced call path

The corrected wrapper itself has no real I/O implementation. It exports controls that expect trusted launch/read/ACL callbacks; treating it as a complete live continuation would omit essential bindings. This new candidate therefore adds a separate protocol coordinator, a public facade fixing the unchanged reviewed wrapper, focused synthetic tests and an explicit I/O boundary contract. It does not overwrite the reviewed wrapper or native candidate.

1. The coordinator validates exact context keys, separately bound stale-proof identity/metadata and a fresh human reference with explicit ordered UTC start/end. It checks artifacts and local security prerequisites before any observation.
2. Initial proof/state inspection requires exact private bytes/hash/schema, root/file ACL assertions, no redirection, absent forbidden state and absent exact hash-named destination. The proof must be stale; it is never reused as fresh evidence.
3. One scoped getProject request specifies only get_project and the exact production project. The returned five fields must match the production host, ACTIVE_HEALTHY and expected verification method. The explicit-offset observation time must lie inside that guarded call interval and be nonfuture.
4. Immediately after the observation the stale proof/destination are checked again. One same-directory no-overwrite archive is requested, with original bytes/creation/last-write/owner/ACL preservation and no timestamp reset.
5. One wx/create-new, synced proof is derived from that same observation. Exact readback/ACL is required. The observation timestamp is not replaced with a later proof-creation time.
6. The public facade binds the unchanged reviewed wrapper and fixed validator. Its only launch request resolves to pinned Node 24.21.0, the unchanged reviewed native runner and --preflight, with the fixed production direct-TLS target. There is no alternate endpoint, mode, SQL route, supervisor or retry.
7. Every awaited provider is guarded before/after. The approval interval and original observation's inclusive 0–300-second age must hold at actual launch, child exit, evidence reads/ACL checks, validation and immediately before PASS. Regressing wall/monotonic time, numeric coercion, malformed times and crossed deadlines stop the model.
8. The unchanged wrapper requires successful child exit/result plus two matching raw evidence reads, ACL verification and the complete pinned preservation validator. The coordinator independently checks wrapper result fields, evidence digest and actual callback counts. An exit-zero or PASS label alone cannot complete the protocol.
9. Exceptions/uncertainty return sanitized blocked stage/counters/codes and retention instructions. The capability set has no cleanup, retry, refresh, reset, repair, rollback or rebaseline port. It never releases or creates an installation lock/marker. Only owned memory buffers are cleared.

### Requirement results

PASS below means offline code/model evidence only; it is not a live verification result.

| Requirement | Result and evidence | Remaining live gap |
| --- | --- | --- |
| Exact reference identities preserved | PASS — 200 local reference hashes and sizes; original bundles unchanged | No fresh production catalog asserted |
| Single scoped project observation | PASS per invocation in model; wrong project/host/status/method/time rejected before archival | BLOCKED — scoped MCP provider absent; no live call |
| Correct archive/create-new order | PASS in memory, including immediate second inspection and failure retention | BLOCKED — actual Windows atomic no-overwrite/path/ACL behavior unimplemented and untested |
| Explicit-offset proof / UTC window | PASS — strict unchanged parser, nanosecond comparisons, separate age/window gates and monotonic checks | Fresh values are not supplied or approved |
| One fixed native preflight launch | PASS modeled callback/scope guard, including repeated launch denial before dispatch | BLOCKED — no real launch adapter or trusted environment binding |
| Deadlines at asynchronous/completion boundaries | PASS modeled crossings during all stages, after child and validation | BLOCKED — real bounded child lifetime, cancellation and actual spawn-boundary timing unimplemented |
| Complete matching child/evidence acceptance | PASS fixed public wiring and modeled rejection; exit zero/status alone fails | BLOCKED — full positive production-shaped case through the fixed validator remains untested |
| TLS/driver/catalog/preservation controls retained | PASS static unchanged native/wrapper contracts and pinned references | BLOCKED — no TLS, DB, 57-inventory or production-state observation in this task |
| Failure retains artifacts; no automatic retry | PASS synthetic partial proof/evidence retained; instance consumed | BLOCKED — real Windows/process failure retention not exercised |
| Durable one-preflight boundary without new write | BLOCKED — in-memory archive CAS allows one preflight but two observations across two modeled instances | Requires reviewed Windows primitive and controlled invocation/restart design; not a durable OS guarantee |

## Preservation and TLS requirements, not current observations

The native preflight still verifies the control-plane proof, root ACL and direct TLS connection, captures its read-only snapshot, creates one dynamically named evidence JSON with durable create-new behavior, verifies its ACL and returns a sanitized result. Its native source lines 293–308 show this path; lines 303–306 perform the single evidence-file creation and verification. No no-write preflight exists. These paths were inspected, not run.

The unchanged validator pins the inventory SQL, baseline data, historical snapshot and foundation receipt; it compares raw pre-RPC/catalog/function identity, owner/ACL, 57 inventories, foundation state/structure, document and containment protections, 164 migration history and 15 policies, with 378 Storage objects. It checks native identity/version/privileges, read-only status, trusted CA hash, TLS protocol, peer fingerprint and proof/capture/result bindings. Capturing inventories is insufficient unless all applicable reviewed references match.

Trusted CA public SHA-256 remains 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7 in pinned source. Native rejectUnauthorized, hostname/SNI, encrypted-socket and no-fallback controls are unchanged. No CA file, certificate contents, credential or private environment values were read; their current validity/availability is NOT VERIFIED. The model merely requires a future trusted provider to establish those assertions. It cannot replace those checks.

## One-attempt analysis and exact blockers

An invocation consumes its in-memory one-use guard before any work, even on a blocked outcome. Callback limits stop a second launch before dispatch and count only dispatched requests. This does not survive process restart or bind distinct instances.

The exact hash-named archive could potentially serve as a one-shot claim using an already proposed write rather than an extra protected marker. The modeled linearizable compare-and-swap race allowed one preflight and retained its archive. Both instances had already obtained an observation: the test explicitly asserts two observations, not one globally. This is not a Windows test, separate OS-process test, crash test or proof of durable behavior.

Before any continuation can be proposed, independently review:
- A real Windows no-overwrite same-directory primitive and source/destination identity/redirection/ACL preservation at the operation boundary.
- A controlled invocation design that excludes duplicate scoped observations and restarts using the same authorization; any extra durable marker/lock would expand protected-write scope and needs separate review/authority. None is implemented here.
- The actual scoped-MCP provider and fixed-root proof/evidence readers, approved loader/secret handling and verify-only ACL invocation.
- The real fixed native child adapter, deadline check at its actual spawn, bounded lifetime/cancellation, bounded sanitized stdout/stderr and retention on uncertain outcome.
- A safely synthetic complete positive case through the unchanged public fixed validator. Current tests use a strict synthetic verifier and do not establish that full path.

No current proof, new approval reference/window or installation bindings have been produced. Decision B remains unapproved and out of scope.

## New code and evidence identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| integration-engine.mjs | 15646 | 6c9837931ff3fc37b380233feda261f7b65e698035a65e92d1d4539a2c2175e0 |
| trusted-io-integration.mjs | 1004 | 3cf14f82c5e393b340758abc090c8e74db10869253696fa73126d72f08b3f19c |
| trusted-io-integration.test.mjs | 23246 | a1739d35e8328dabfb3c46accd0bc849778fb352d26877cc4bb7c5d402c53044 |
| focused-tests-asia-manila.tap | 4746 | ba86721ba7f3414b43df03543ed90075858c30094444ba48b13c0478be9a4384 |
| focused-tests-utc.tap | 4739 | b17c5c0581e824ab74ec96602da25faebf188b431095bfc0dc91354c420130db |
| io-boundary-contract.md | 8462 | 30e7690f624d288b6b325b6fb9b337c899885f376a07a23b5c27777bb7a5a94e |
| reviewed-inputs.json | 42928 | c4dcd431e0eba49ff0df4014902c4cb3a3451d50b4eedca36f1351ebef2c567f |

New bundle SHA-256: a52dd7ebdfa1b99bcbc5915992025e2f906fe59fe22febd80e40b681b15aa47a  
New manifest SHA-256: c4dcd431e0eba49ff0df4014902c4cb3a3451d50b4eedca36f1351ebef2c567f

Bundle derivation is SHA256 over UTF-8 JSON.stringify({manifestSha256,codeHashes}), with codeHashes equal to the exact manifest codeIdentities array. The inventory lists every other final-candidate artifact including this report; it excludes itself. This report and inventory's own hashes are reported externally to avoid circular identities.

## Focused validation

All new tests were inspected before execution. Syntax checks on the three new .mjs files passed 3/3. The focused suite passed 56/56 with exit 0, no skipped/cancelled cases, once in Asia/Manila and once in UTC, using Windows Node v24.21.0. No historical suite was rerun.

Exact executable:
C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe

Exact test arguments:
--test-concurrency=1 --test C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/trusted-io-integration.test.mjs

Each child was launched without a shell, with literal SystemRoot/WINDIR plus TZ only; no inherited credential environment or environment file was loaded. The two .tap files preserve raw Node default spec-reporter output; their extension does not mean TAP serialization. The logs show tests 56, pass 56, fail 0.

Tests cover explicit-offset/UTC validity boundaries, proof age, async deadline crossings, malformed/nonnumeric clocks, regression, wrong observation identity and source state, create/rename uncertainty, zero/nonzero child exit, signal/timeout/cancellation/launch-error fakes, incomplete/unstable evidence, retention, repeated/altered launch requests and one-use/race behavior. Timeout/cancellation are stubbed errors, not real child-process termination tests.

Only synthetic memory maps/clocks/receipts were used. The public facade's substitution rejection was exercised without invoking the real wrapper's run method. Imported native core modules contain unused filesystem helpers, but have no import-time I/O; tests did not invoke them. No executable native runner/ACL helper/driver/database path was run. Test success is not live identity, TLS, authorization, production evidence or OS concurrency coverage. Linux and physical runtime behavior are not established.

## Intermediate preservation and worktree accounting

The intermediate trusted-io-integration-candidate-20261014T070911Z remains separately preserved: three original source files and two original 51/51 test logs unchanged, plus a create-new note and inventory. Static review corrected an accounting issue in the later version: denied repeated callback requests no longer increment a dispatch counter. No provider dispatch was repeated in the earlier implementation. Five additional focused regression cases protect the correction and final-stage guards.

| Checkpoint | Dirty tracked | Staged | Untracked |
| --- | ---: | ---: | ---: |
| Before this offline integration task | 68 | 0 | 3,820 |
| Resumed after user continue, original five outputs verified | 68 | 0 | 3,825 |
| Measured before final report/inventory creation | 68 | 0 | 3,834 |
| Closing target, checked after finalization in Codex response | 68 | 0 | 3,836 |

All 16 task additions are isolated: seven intermediate files and nine final-candidate files (three modules, two test logs, boundary contract, review, manifest, inventory). No pre-existing file was edited or removed. Branch/HEAD remain as above. Filtering these two new directories from Git porcelain reproduces the original status SHA-256 a9691b3dab7f408830dc6dd5fcf5d92dae35d0b766e6d2a64e57c43f223acd7a. The final read-only hash/status check must confirm this before reporting completion.

## Scope compliance and next gate

No protected-state access/change, network/Supabase/get_project, TLS/CA/credential read, PostgreSQL/database connection, real runner/wrapper/helper mode, SQL, installation, production operation, ACL change, Git stage/commit/push or deployment occurred. Local read-only source/evidence checks and synthetic tests plus create-new review artifacts were the only work. No authorization/proof/lock/attempt/preflight file was created. Pagination, Storage policies, frontend and UAT were not changed or assigned any new status.

The next gate is independent offline review of this non-runnable candidate and its explicitly blocked real bindings. This report prepares no continuation authorization and does not infer one from a passing model result.
