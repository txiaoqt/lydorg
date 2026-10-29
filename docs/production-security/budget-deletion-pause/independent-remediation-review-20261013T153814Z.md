# Independent offline review: budget-deletion-pause remediation candidate

## Verdict

**CANDIDATE REVIEW BLOCKED**

Review started 2026-10-13T15:38:14Z. Offline review only; this verdict does not establish production readiness or authorize installation.

All supplied artifact identities match. The 77 focused tests passed independently. The two specific earlier defects are corrected: the worker no longer releases the lock, and actual pg resolution is now bound to the pinned driver tree. One remaining process-identity gap prevents satisfying the requested supervisor-ownership guarantee. No candidate or historical file was changed.

## Scope and artifact verification

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused

Candidate: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z

| Identity | Independent result |
| --- | --- |
| Bundle | PASS — 5667c2cf30ce651aa47f55a9703f9b801b5688c6676e4b743a68b4b8be24ed5b |
| Input manifest | PASS — 29420 bytes; cc7345fabf63262c082bc332ec7ee526d8cb9c9f2d9c6a8a0abd841c7fc16b11 |
| Complete inventory | PASS — 2003 bytes; 82520ef38e6f966cb611809f655112f0254ff66749daeb7976da77701061a1cb |
| Production SQL | PASS — 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated inventory verifier | PASS — 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Candidate file set | PASS — exactly 12 files; inventory covers 11 and deliberately excludes itself |
| Driver closure | PASS — 14 packages / 138 files; 08b98ef8f7b3bba88c947bebededda974e18940645a9f2b61f2de7a050dfd736 |

Hashes were recomputed independently using filesystem reads and SHA-256, not solely the candidate verifier. The bundle was reconstructed from the actual manifest hash and sorted five-file code identities. All eleven inputs matched. The dependency closure was independently traversed through package dependency/optional-dependency metadata, enumerated and hashed; its complete inventory matched with no added, missing or redirected files detected.

The saved four-file security-correction.patch reproduces the actual diff against the blocked candidate byte-for-byte when concatenated in its recorded alphabetical order: 63,132 bytes, SHA-256 81cf0c1e6187739c8e54a3bab507d821e30832af0733970ec484738557bfe7d5. An initial comparison used a different file order; aligning order produced an exact match without changing evidence. The ACL helper remains byte-identical to the earlier reviewed helper.

## Findings

### F1 — [P2] Worker liveness verification does not bind a PID to the original supervisor process

Evidence: [runner IPC cleanup](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/native-budget-pause-runner.mjs:338>), [lease acceptance](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/native-budget-pause-runner.mjs:344>), [PID existence helper](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/budget-runner-core.mjs:344>), [worker lease verification](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/budget-runner-core.mjs:362>).

The initial IPC handshake checks the actual parent PID and the scoped nonce-bearing claim. On acceptance, cleanup removes the disconnect listener and intentionally closes IPC. Subsequent worker verification tests only whether process.kill(claim.pid, 0) succeeds, whether the persisted claim is unchanged, and whether its ACL passes. The file nonce and createdAt are not checked against an unambiguous live process identity. A PID-existence result alone cannot establish that the original supervisor still occupies it.

If the original supervisor exits after the handshake and its PID is reused before the next worker check, an unchanged durable claim and secure ACL still satisfy this verifier. The worker can then pass the liveness gate before arming/submission without the original supervisor. The existing tests cover a PID becoming absent, changed claims, wrong parents and failed verification; they do not cover a different process occupying the same PID after lease acceptance.

An independent, read-only in-memory probe called the actual attachWorkerLock export with injected IO. It first modeled the original supervisor, then changed only the modeled process occupant while keeping the same live PID, persisted claim and ACL. Verification still succeeded. Expected under the requested identity guarantee: reject the stale supervisor identity. Actual: accepted. The probe source and result are included below. It created no file, lock or attempt marker, launched no database client and made no network call.

This is a source/contract finding and an in-memory reproduction. Real Windows PID recycling or disk-lock crash behavior was NOT TESTED. The finding does not demonstrate SQL duplication, premature lock deletion, privilege bypass or a production mutation. The durable lock/attempt marker remain retained, and no automatic retry path was found. It specifically leaves the requested ability to distinguish the active supervisor from another process unresolved.

Required separate correction: retain a process-specific parent-liveness channel through the critical worker checks, or use an equally reviewed process-incarnation binding; a closed one-time IPC handshake plus PID existence is insufficient. Add focused coverage for original-parent loss with a reused PID and unchanged claim. Loss or ambiguity must stop before submission, retain state after any possible submission, and never trigger retry or automatic state repair. No correction was made in this review.

## Earlier findings and control assessment

| Control | Assessment | Evidence / limit |
| --- | --- | --- |
| Earlier P1: lock released before supervisor verification | RESOLVED in source/unit model | Supervisor claims before spawn. Worker has verification-only lease and no release path. Independent durable receipt verification and exact ownership checks precede the supervisor's sole unlink. F1 above is a separate remaining liveness limitation. |
| Failures, malformed receipts, interruption, unknown results | PASS in source/unit model | No catch/finally release; stopped outcomes retain state; one worker launch and zero retries. No real disk crash test. |
| Strict success | PASS | Final COMMITTED_AND_VERIFIED requires terminal COMMIT, one submission, zero retries/rollback statements, full four-event journal, scoped marker/preflight/backend, exact receipt hashes, independent supervisor comparison and successful lock release. Zero exit by itself is insufficient. |
| Reconciliation | PASS in source/unit model | Preserved claim/marker/preflight bindings; recorded writer backend must be finished; two consistent raw catalog views and full function contracts determine presence. Unknown/conflicting evidence remains unresolved. No mutation SQL resubmission, automatic repair or state clearing. No reconciliation mode was invoked. |
| Earlier P2: actual pg resolution | RESOLVED in supported source route | Actual require.resolve results must equal the pinned entry and package metadata. Canonical realpaths, Windows case handling, file types, symlink/junction checks, package name/version, bytes and full closure are checked before loading or constructing a Client. |
| Repeated driver checks / all connection sites | PASS in source | Shared getPinnedPgClient repeats resolution and closure checks, rejects an already-loaded entry, then loads the verified absolute entry. Both generic read-only connection and installation worker use it. Worker process is fresh, with fixed executable/arguments; NODE_OPTIONS/native overrides are rejected. No pg Client was loaded or constructed by this review. |
| Module cache scope | Reviewed limitation | Guard explicitly checks the pg entry in require.cache; it is not a general attestation of every transitive cache object. No earlier transitive pg import was found in the supported fresh-worker startup path. Arbitrary preloaded programs are not a supported execution route. |
| UTC freshness | PASS in focused tests/source | Original ISO JSON, explicit offsets, future-proof rejection and maximum 300,000 ms. No PowerShell timezone-free timestamp conversion is used. |
| NODE_PG_FORCE_NATIVE | PASS in focused tests | Rejects a set variable including the empty string. Test process received a clean environment. |
| Fixed project/TLS and permissions | PASS in source only | Fixed direct host/port/database/user, required CA hash, rejectUnauthorized/SNI/default hostname verification, PostgreSQL identity and privileges. No live certificate or connection check occurred. |
| SQL / preservation gates | PASS in source/hash | Original single atomic SQL, 1-second lock timeout / 30-second statement timeout; original/paused OID, owner, ACL, full function contract, 57 inventories, foundation, 164 migrations and 15 Storage policies remain required. |
| ACL helper | PASS in source/hash only | Fixed-root Protect, approved-child Verify, canonical boundary, reparse/owner/DACL/ancestor protections unchanged. No helper action or protected-root access occurred. |
| Secret-safe output | PASS in inspected paths | Error-code whitelist, receipt scrubbing, bounded child stdout and no forwarded raw child stderr. Credential files/environment were not read or supplied to tests. |

The reviewed driver check rejects candidate/ancestor shadow resolutions and redirects. Existing same-user source mutation between verification and execution is not claimed to be solved by these offline hashes. This review found no shadow package or changed dependency.

## Independent focused execution

The focused test file, imports and two real child programs were inspected before execution. Fixtures for lock/marker/receipts and database query responses stay in memory. Neither child invokes a database, protected path, credential loader or adapter execution mode: one prints a stopped result, and one exchanges a synthetic IPC lease and exits. No historical suite was rerun.

Toolchain: Node v24.21.0 on Windows. Working directory: the candidate directory. Actual argument vector:

```json
[
  "C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\.agent\\admin-storage-vercel-20261012T035933Z\\toolchain\\extracted\\node-v24.21.0-win-x64\\node.exe",
  "--permission",
  "--allow-child-process",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\docs",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\scripts",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\node_modules",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\package.json",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\package-lock.json",
  "--test",
  "--test-reporter=tap",
  "budget-safety-controls.test.mjs"
]
```

Environment was constructed from OS-only essentials; USERPROFILE/HOME pointed to a nonexistent workspace test path. No YTRACE/PG secrets or private environment-file values were inherited. Filesystem access was read-only for the listed source/dependency paths, with no filesystem write grant. Node emitted PERM0002 for allow-child-process; the permission model is not presented as a sandbox for arbitrary untrusted child programs. Safety also rests on inspection of the two fixed harmless programs. No network/database action is present in the executed test paths.

- Independently reproduced: **77/77 PASS**, zero failed/skipped/cancelled; exit 0. All 77 case identities match the saved candidate TAP.
- Fresh TAP: 15,457 UTF-8 bytes; SHA-256 5284e17b73fb7b3117e594c1dd63031b1f1a4a00636c5e8c2ef5e07b76fd5391. Its exact text is retained in this report's appendix rather than a second output file. Timing differs from the historical run as expected.
- Original candidate TAP remains unchanged: 15,460 bytes; dc10a967e13a7ac0bd8bba3f9e4ecf823f04d58d9c206734a7c75201e04d3905.
- Four JavaScript syntax checks: PASS. PowerShell parser: zero errors; ACL script not executed.
- Four no-index diff whitespace checks: no output/errors; status 1 indicates differences, not whitespace findings.
- Additional in-memory identity probe: reproduced F1; this is not an added passing product assertion or a real OS process-reuse test.

## Preserved original and historical evidence

Independently matched 213 original/blocked artifact/reference pins, 51 entries from historical evidence manifests, and all three historical test logs. The original reviewed bundle remains 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25 (manifest 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb). The earlier blocked bundle remains 390afb8cfa01d68cc6ad74472730fc6096775a40e9f8a98c17f6b8b2fed1d865 (manifest 7099f8dce1a195aa7df8f6d279c45ba451b31ab46cd4e13114a2fea7b9bcfd1b).

The previous independent blocked review remains hash-matched: 524a140377d4d825a959369e1d6b33ca378c37a56bc3ca1e2ea3f6d2d94d283a.

The unsuccessful 20261013T151801Z revision remains a separate nine-file set, all inventory pins matched; inventory SHA-256 1c62dab4b66004aefd0b2ab469a91db9ee3ea1d23375b09ebfc6baaaf36cb859. Its TAP still reports 76/77, with test 76 failing NODE_RUNTIME_OVERRIDE_FORBIDDEN. The subsequent source uses an environment copy for child spawning and tests that parent NODE_OPTIONS is unchanged. The unsuccessful suite was not rerun or relabeled.

Historical tests retained, not rerun:

| Suite | Recorded result | Log SHA-256 |
| --- | --- | --- |
| Disposable SQL | 38/38 | 430bac73f2b0bf85b389b8f4fafb494c665ee4460affa81c248b7f3b23980383 |
| UI/client | 18/18 | 8d81fa82741f3727b71cdfb82da23a23b26bb9c524e1857c666e731fbbb273f0 |
| Original adapter | 39/39 | 5e60b1329e361cb626be67110489992bf80f954d2c346b1b6cb4bcb55c020f89 |

Historical preflight remains 37,159 bytes, SHA-256 6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81, with normalized approval fingerprint 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc. It is expired historical evidence, not fresh authorization or a binding for this candidate.

## Workspace preservation

| State | Before review | After report addition |
| --- | --- | --- |
| Branch | ui-refactor | ui-refactor |
| HEAD | 2f6e7427c553b7535f53860d1732b42df7c023e8 | same |
| Dirty tracked | 68 | 68 |
| Staged | 0 | 0 |
| Untracked | 3,754 | 3,755 |

Only this report was created, with exclusive create-new semantics. Before report creation, the status was still identical to the review-start snapshot. Removing only this report's status entry must reproduce status SHA-256 7f62fb30cf7d5caa55045d7ad6c1b06e72a8d00911f1528e06314e19aaa335f6 (UTF-8 porcelain lines joined with LF, no final LF). All reviewed artifacts are rehashed after report creation. No reset, checkout, cleanup, staging, commit or push occurred.

## Untested boundaries and next review gate

Protected-root ownership/effective ACLs, real disk-lock crash behavior, real PID reuse, TLS, current database state, current authorization/window and live reconciliation remain **NOT TESTED**. There were no Supabase/endpoint calls, secret reads, protected-state reads/writes, fresh proofs, preflight/install/reconcile mode executions, actual lock/attempt creation or production actions.

F1 requires a separately versioned correction and review. This report requests no installation action or execution window. Any eventual installation remains separately gated on fresh authorized verification, protected-root ACL verification, an exclusive drained window and exact artifact-bound human authorization. No runnable installation authorization was created.

## Appendix A — Complete candidate per-file verification

| File | Bytes | SHA-256 |
| --- | --- | --- |
| [budget-runner-core.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/budget-runner-core.mjs>) | 51801 | 4740e13bb9593c5135260f873fc7e9483d6a6135f97b0e37369b0df93d47a14a |
| [budget-safety-controls.test.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/budget-safety-controls.test.mjs>) | 29651 | c3f58a8cb349cb89f52ae8a275114b9b7b92d849092f5c8c3fbd136d4cada8e9 |
| [focused-tests-01.tap](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/focused-tests-01.tap>) | 15460 | dc10a967e13a7ac0bd8bba3f9e4ecf823f04d58d9c206734a7c75201e04d3905 |
| [local-check-results.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/local-check-results.json>) | 5708 | ddc52ef327cd00dde1fccb00ca92d1eaf524b2a2ff821960fc245b3b78dbdd2a |
| [native-budget-pause-runner.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/native-budget-pause-runner.mjs>) | 35726 | 784e29decd2e692436a6a980fa31182b3523ac39188bc0510332ea29b655171a |
| [native-budget-pause-supervisor.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/native-budget-pause-supervisor.mjs>) | 6811 | 234accc900f5e39f51b298994411be63a6efd833735ab5bc3d513ff652927aed |
| [operation-acl.ps1](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/operation-acl.ps1>) | 14463 | 4891d4c1c5a9d47ec91e01cb64c7951b6c5c3a3143f3f7ad1242820feb16f258 |
| [preservation-verification.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/preservation-verification.json>) | 74522 | 9b7bb8b5d6f8aef263d4e93403396f3d71f5e59b9029248e4f76dac60955f8ca |
| [remediation-review.md](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/remediation-review.md>) | 8352 | 2e55440cd35341a91baec555a24f9ed77075ef6b4b44e3e34be9a4ee1c41f58b |
| [reviewed-inputs.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/reviewed-inputs.json>) | 29420 | cc7345fabf63262c082bc332ec7ee526d8cb9c9f2d9c6a8a0abd841c7fc16b11 |
| [security-correction.patch](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/security-correction.patch>) | 63132 | 81cf0c1e6187739c8e54a3bab507d821e30832af0733970ec484738557bfe7d5 |
| candidate-artifact-inventory.json | 2003 | 82520ef38e6f966cb611809f655112f0254ff66749daeb7976da77701061a1cb |

## Appendix B — Eleven pinned inputs

| Input | Bytes | SHA-256 |
| --- | --- | --- |
| [verify-foundation-environment.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/scripts/security/verify-foundation-environment.mjs>) | 2466 | 4881f45e1ff8723d38b5f64f12e05d4d77fef7afd0d625ee58d8fe4b6c13320b |
| [runner-core.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/storage-cutover/native-runner-20261011T132539Z/runner-core.mjs>) | 14530 | 90b0d860823507f11893312643b33c683fe9cb75f03ea19361d7b81bdd81fdae |
| [independent-postflight.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json>) | 36906 | a549cf9bb3e8cd3c95d07ff71bf2d7417e9509f2d1ddcbd3e2f8572cf5c63b37 |
| [foundation-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/storage-cutover/final-readiness-20261012T160633Z/foundation-readonly.sql>) | 5923 | 61c81752a121232734465e9cd3f4f0078d6bd1457ea4cd4d5ed981096bde4639 |
| [budget-identity-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/budget-identity-readonly.sql>) | 2646 | c36f888e263ee0f14676416eca0ce586527dbd2ff580422cf52795161ab9f2e3 |
| [protected-data-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/storage-cutover/executions/20261011T122743Z/protected-data-readonly.sql>) | 13900 | ecf05439e94d078b63d7f5b4efc37f262425ed5a9ecc7904cd241efb5d4b249d |
| [package-lock.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/package-lock.json>) | 374412 | 0ef6b3d79ec9ba0d6120a30237d37fccbeff3a70fc541223a24000b686b306bb |
| [post-install-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/20261012T165000Z/post-install-readonly.sql>) | 5929 | 5f226308872e2e613b07a93a9c6fdebfb52392532dafd3b4d84987099f621465 |
| [pre-install-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/20261012T165000Z/pre-install-readonly.sql>) | 5927 | 0feb7b7510621ec3c06e2ee12e751bd1982ef9d5070d5a3be70aceaecba66384 |
| [budget-protected-data-readonly.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-20261013T050122Z/budget-protected-data-readonly.sql>) | 13902 | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| [budget_deletion_pause_production.sql](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql>) | 11945 | a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |

## Appendix C — In-memory probe

Source SHA-256: a5af9cbc518cdb7efb378433068f3a406761dd99b886e1e63c6c0eff484ae4e4. Executed from stdin with the same clean environment and read-only permissions, without child-process permission. No production state or actual OS PID was changed.

```javascript
import assert from 'node:assert/strict';
import { attachWorkerLock, TARGET, SQL_SHA } from './budget-runner-core.mjs';
const claim={recordType:'YTRACE_BUDGET_SUPERVISOR_LOCK',version:2,project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,runnerBundleSha256:'c'.repeat(64),pid:4242,nonce:'11111111-2222-4333-8444-555555555555',createdAt:'2026-10-13T13:00:00.000Z'};
let occupant='original-supervisor';let aliveChecks=0;let reads=0;let acls=0;
const io={async readJson(){reads++;return structuredClone(claim);},alive(pid){assert.equal(pid,4242);aliveChecks++;return occupant!==null;}};
const lease=await attachWorkerLock(':memory-only:',{claim,bundleSha256:claim.runnerBundleSha256,parentPid:4242,io});
await lease.verify(async()=>{acls++;});
occupant='unrelated-process-reusing-4242';
let accepted=false;await lease.verify(async()=>{acls++;});accepted=true;
assert.equal(accepted,true);
console.log(JSON.stringify({scenario:'MODELED_PID_REUSE',originalSupervisorAlive:false,replacementPid:4242,claimUnchanged:true,aclUnchanged:true,verificationAccepted:accepted,aliveChecks,reads,acls,actualProcessReuseTested:false,filesystemWrites:0,networkCalls:0}));
```

Observed result (exit 0 means the demonstration completed; it does not mean the identity guard passed):

```json
{"scenario":"MODELED_PID_REUSE","originalSupervisorAlive":false,"replacementPid":4242,"claimUnchanged":true,"aclUnchanged":true,"verificationAccepted":true,"aliveChecks":3,"reads":3,"acls":2,"actualProcessReuseTested":false,"filesystemWrites":0,"networkCalls":0}
```

## Appendix D — Fresh focused TAP

<details>
<summary>77 reproduced focused assertions; exact stdout</summary>

```text
TAP version 13
# (node:86688) [PERM0002] SecurityWarning: The flag --allow-child-process must be used with extreme caution. It could invalidate the permission model.
# (Use `node --trace-warnings ...` to show where the warning was created)
# Subtest: complete receipt proves terminal COMMIT, one attempt and all preservation bindings
ok 1 - complete receipt proves terminal COMMIT, one attempt and all preservation bindings
  ---
  duration_ms: 21.6548
  type: 'test'
  ...
# Subtest: stopped zero-exit UNRESOLVED cannot be accepted as installation success
ok 2 - stopped zero-exit UNRESOLVED cannot be accepted as installation success
  ---
  duration_ms: 5.4846
  type: 'test'
  ...
# Subtest: stopped zero-exit COMMITTED_POSTFLIGHT_FAILED cannot be accepted as installation success
ok 3 - stopped zero-exit COMMITTED_POSTFLIGHT_FAILED cannot be accepted as installation success
  ---
  duration_ms: 1.6485
  type: 'test'
  ...
# Subtest: stopped zero-exit COMMITTED_WITH_DRIFT cannot be accepted as installation success
ok 4 - stopped zero-exit COMMITTED_WITH_DRIFT cannot be accepted as installation success
  ---
  duration_ms: 2.6665
  type: 'test'
  ...
# Subtest: stopped zero-exit NOT_INSTALLED_VERIFIED cannot be accepted as installation success
ok 5 - stopped zero-exit NOT_INSTALLED_VERIFIED cannot be accepted as installation success
  ---
  duration_ms: 1.4788
  type: 'test'
  ...
# Subtest: stopped zero-exit INSTALLED_AND_PRESERVED cannot be accepted as installation success
ok 6 - stopped zero-exit INSTALLED_AND_PRESERVED cannot be accepted as installation success
  ---
  duration_ms: 1.4754
  type: 'test'
  ...
# Subtest: stopped zero-exit INSTALLED_WITH_DRIFT cannot be accepted as installation success
ok 7 - stopped zero-exit INSTALLED_WITH_DRIFT cannot be accepted as installation success
  ---
  duration_ms: 1.3195
  type: 'test'
  ...
# Subtest: stopped zero-exit PASS cannot be accepted as installation success
ok 8 - stopped zero-exit PASS cannot be accepted as installation success
  ---
  duration_ms: 1.2705
  type: 'test'
  ...
# Subtest: a real harmless child exiting zero with UNRESOLVED remains stopped
ok 9 - a real harmless child exiting zero with UNRESOLVED remains stopped
  ---
  duration_ms: 133.4015
  type: 'test'
  ...
# Subtest: success rejects inconsistent commitAcknowledged=false
ok 10 - success rejects inconsistent commitAcknowledged=false
  ---
  duration_ms: 2.504
  type: 'test'
  ...
# Subtest: success rejects inconsistent submissionCount=0
ok 11 - success rejects inconsistent submissionCount=0
  ---
  duration_ms: 0.9569
  type: 'test'
  ...
# Subtest: success rejects inconsistent submissionCount=2
ok 12 - success rejects inconsistent submissionCount=2
  ---
  duration_ms: 0.7932
  type: 'test'
  ...
# Subtest: success rejects inconsistent automaticRetries=1
ok 13 - success rejects inconsistent automaticRetries=1
  ---
  duration_ms: 0.7846
  type: 'test'
  ...
# Subtest: success rejects inconsistent rollbackStatementsSent=1
ok 14 - success rejects inconsistent rollbackStatementsSent=1
  ---
  duration_ms: 3.7048
  type: 'test'
  ...
# Subtest: success rejects inconsistent retainLock=false
ok 15 - success rejects inconsistent retainLock=false
  ---
  duration_ms: 0.8286
  type: 'test'
  ...
# Subtest: success rejects inconsistent retainAttemptMarker=false
ok 16 - success rejects inconsistent retainAttemptMarker=false
  ---
  duration_ms: 1.629
  type: 'test'
  ...
# Subtest: success rejects inconsistent stopForHumanReview=true
ok 17 - success rejects inconsistent stopForHumanReview=true
  ---
  duration_ms: 0.8066
  type: 'test'
  ...
# Subtest: receipt fails closed for missing event
ok 18 - receipt fails closed for missing event
  ---
  duration_ms: 0.8569
  type: 'test'
  ...
# Subtest: receipt fails closed for duplicate event
ok 19 - receipt fails closed for duplicate event
  ---
  duration_ms: 0.8156
  type: 'test'
  ...
# Subtest: receipt fails closed for wrong terminal tag
ok 20 - receipt fails closed for wrong terminal tag
  ---
  duration_ms: 0.8717
  type: 'test'
  ...
# Subtest: receipt fails closed for wrong function fingerprint
ok 21 - receipt fails closed for wrong function fingerprint
  ---
  duration_ms: 2.6691
  type: 'test'
  ...
# Subtest: receipt fails closed for wrong function owner
ok 22 - receipt fails closed for wrong function owner
  ---
  duration_ms: 2.742
  type: 'test'
  ...
# Subtest: receipt fails closed for changed inventories
ok 23 - receipt fails closed for changed inventories
  ---
  duration_ms: 5.3506
  type: 'test'
  ...
# Subtest: receipt fails closed for changed foundation
ok 24 - receipt fails closed for changed foundation
  ---
  duration_ms: 2.0995
  type: 'test'
  ...
# Subtest: receipt fails closed for changed migrations
ok 25 - receipt fails closed for changed migrations
  ---
  duration_ms: 2.3171
  type: 'test'
  ...
# Subtest: receipt fails closed for changed Storage count
ok 26 - receipt fails closed for changed Storage count
  ---
  duration_ms: 2.26
  type: 'test'
  ...
# Subtest: receipt fails closed for changed backend
ok 27 - receipt fails closed for changed backend
  ---
  duration_ms: 2.4574
  type: 'test'
  ...
# Subtest: receipt fails closed for mismatched marker hash
ok 28 - receipt fails closed for mismatched marker hash
  ---
  duration_ms: 1.2283
  type: 'test'
  ...
# Subtest: receipt fails closed for mismatched nonce
ok 29 - receipt fails closed for mismatched nonce
  ---
  duration_ms: 1.6018
  type: 'test'
  ...
# Subtest: receipt fails closed for different candidate bundle
ok 30 - receipt fails closed for different candidate bundle
  ---
  duration_ms: 1.2167
  type: 'test'
  ...
# Subtest: receipt fails closed for secret-shaped evidence
ok 31 - receipt fails closed for secret-shaped evidence
  ---
  duration_ms: 1.599
  type: 'test'
  ...
# Subtest: partial journal and timezone-free event timestamps fail closed
ok 32 - partial journal and timezone-free event timestamps fail closed
  ---
  duration_ms: 1.2904
  type: 'test'
  ...
# Subtest: supervisor independently verifies bytes and matching child receipt hashes
ok 33 - supervisor independently verifies bytes and matching child receipt hashes
  ---
  duration_ms: 4.5541
  type: 'test'
  ...
# Subtest: forged receipt PASS or changed durable bytes cannot pass supervisor
ok 34 - forged receipt PASS or changed durable bytes cannot pass supervisor
  ---
  duration_ms: 3.8296
  type: 'test'
  ...
# Subtest: ambiguous child exception has one launch and zero automatic retries
ok 35 - ambiguous child exception has one launch and zero automatic retries
  ---
  duration_ms: 1.37
  type: 'test'
  ...
# Subtest: nonzero exit, signal and malformed output are unresolved
ok 36 - nonzero exit, signal and malformed output are unresolved
  ---
  duration_ms: 3.3183
  type: 'test'
  ...
# Subtest: raw original fingerprints with preservation false determine presence independently
ok 37 - raw original fingerprints with preservation false determine presence independently
  ---
  duration_ms: 0.4356
  type: 'test'
  ...
# Subtest: raw original fingerprints with preservation true determine presence independently
ok 38 - raw original fingerprints with preservation true determine presence independently
  ---
  duration_ms: 0.1468
  type: 'test'
  ...
# Subtest: raw new fingerprints with preservation false determine presence independently
ok 39 - raw new fingerprints with preservation false determine presence independently
  ---
  duration_ms: 0.1411
  type: 'test'
  ...
# Subtest: raw new fingerprints with preservation true determine presence independently
ok 40 - raw new fingerprints with preservation true determine presence independently
  ---
  duration_ms: 0.1386
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for unknown catalog
ok 41 - reconciliation remains unresolved for unknown catalog
  ---
  duration_ms: 0.1941
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for unknown function
ok 42 - reconciliation remains unresolved for unknown function
  ---
  duration_ms: 0.1708
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for inconsistent views
ok 43 - reconciliation remains unresolved for inconsistent views
  ---
  duration_ms: 0.1821
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for wrong owner
ok 44 - reconciliation remains unresolved for wrong owner
  ---
  duration_ms: 0.1401
  type: 'test'
  ...
# Subtest: active backend, unknown preservation and missing raw views cannot infer installation
ok 45 - active backend, unknown preservation and missing raw views cannot infer installation
  ---
  duration_ms: 0.2118
  type: 'test'
  ...
# Subtest: UTC freshness parses original ISO JSON equally for explicit offsets
ok 46 - UTC freshness parses original ISO JSON equally for explicit offsets
  ---
  duration_ms: 0.3959
  type: 'test'
  ...
# Subtest: five-minute freshness cannot be removed or extended and future proofs fail
ok 47 - five-minute freshness cannot be removed or extended and future proofs fail
  ---
  duration_ms: 0.6924
  type: 'test'
  ...
# Subtest: forced native driver is denied even when the variable is an empty string
ok 48 - forced native driver is denied even when the variable is an empty string
  ---
  duration_ms: 0.2706
  type: 'test'
  ...
# Subtest: candidate pins unchanged SQL, eleven inputs and the same 138 dependency files
ok 49 - candidate pins unchanged SQL, eleven inputs and the same 138 dependency files
  ---
  duration_ms: 206.1249
  type: 'test'
  ...
# Subtest: worker never owns/releases the lock; supervisor verifies before its sole release
ok 50 - worker never owns/releases the lock; supervisor verifies before its sole release
  ---
  duration_ms: 1.9672
  type: 'test'
  ...
# Subtest: supervisor holds the actual claim continuously through worker exit and independent receipt verification
ok 51 - supervisor holds the actual claim continuously through worker exit and independent receipt verification
  ---
  duration_ms: 16.9527
  type: 'test'
  ...
# Subtest: lock and marker remain on read failure; no SQL/worker retry
ok 52 - lock and marker remain on read failure; no SQL/worker retry
  ---
  duration_ms: 3.0159
  type: 'test'
  ...
# Subtest: lock and marker remain on corrupt receipt; no SQL/worker retry
ok 53 - lock and marker remain on corrupt receipt; no SQL/worker retry
  ---
  duration_ms: 3.7192
  type: 'test'
  ...
# Subtest: lock and marker remain on child signal; no SQL/worker retry
ok 54 - lock and marker remain on child signal; no SQL/worker retry
  ---
  duration_ms: 0.88
  type: 'test'
  ...
# Subtest: lock and marker remain on child uncertain; no SQL/worker retry
ok 55 - lock and marker remain on child uncertain; no SQL/worker retry
  ---
  duration_ms: 0.9617
  type: 'test'
  ...
# Subtest: lock and marker remain on owner changed; no SQL/worker retry
ok 56 - lock and marker remain on owner changed; no SQL/worker retry
  ---
  duration_ms: 2.2845
  type: 'test'
  ...
# Subtest: lock and marker remain on supervisor interruption; no SQL/worker retry
ok 57 - lock and marker remain on supervisor interruption; no SQL/worker retry
  ---
  duration_ms: 2.6073
  type: 'test'
  ...
# Subtest: an independently mismatched child proof cannot release the actual claim
ok 58 - an independently mismatched child proof cannot release the actual claim
  ---
  duration_ms: 3.4017
  type: 'test'
  ...
# Subtest: release requires the exact owner and independently complete receipt proof
ok 59 - release requires the exact owner and independently complete receipt proof
  ---
  duration_ms: 3.0242
  type: 'test'
  ...
# Subtest: worker has only a verification lease and cannot unlink a live or dead supervisor lock
ok 60 - worker has only a verification lease and cannot unlink a live or dead supervisor lock
  ---
  duration_ms: 1.0778
  type: 'test'
  ...
# Subtest: worker rejects wrong parent, bundle or changed claim before arming
ok 61 - worker rejects wrong parent, bundle or changed claim before arming
  ---
  duration_ms: 0.9726
  type: 'test'
  ...
# Subtest: dead supervisor state permits only read-only classification after the recorded writer finishes
ok 62 - dead supervisor state permits only read-only classification after the recorded writer finishes
  ---
  duration_ms: 1.3646
  type: 'test'
  ...
# Subtest: real harmless IPC child receives one parent lease; lock persists through process exit
ok 63 - real harmless IPC child receives one parent lease; lock persists through process exit
  ---
  duration_ms: 98.2068
  type: 'test'
  ...
# Subtest: expected pinned pg resolution binds real entry/package paths and hashed identity
ok 64 - expected pinned pg resolution binds real entry/package paths and hashed identity
  ---
  duration_ms: 0.7618
  type: 'test'
  ...
# Subtest: rejects candidate shadow resolution before reading/loading driver bytes
ok 65 - rejects candidate shadow resolution before reading/loading driver bytes
  ---
  duration_ms: 0.405
  type: 'test'
  ...
# Subtest: rejects ancestor shadow resolution before reading/loading driver bytes
ok 66 - rejects ancestor shadow resolution before reading/loading driver bytes
  ---
  duration_ms: 0.1709
  type: 'test'
  ...
# Subtest: rejects outside root resolution before reading/loading driver bytes
ok 67 - rejects outside root resolution before reading/loading driver bytes
  ---
  duration_ms: 0.1983
  type: 'test'
  ...
# Subtest: rejects wrong entry resolution before reading/loading driver bytes
ok 68 - rejects wrong entry resolution before reading/loading driver bytes
  ---
  duration_ms: 0.1801
  type: 'test'
  ...
# Subtest: rejects symlink/junction at node_modules
ok 69 - rejects symlink/junction at node_modules
  ---
  duration_ms: 0.2386
  type: 'test'
  ...
# Subtest: rejects symlink/junction at node_modules/pg
ok 70 - rejects symlink/junction at node_modules/pg
  ---
  duration_ms: 0.2066
  type: 'test'
  ...
# Subtest: rejects symlink/junction at node_modules/pg/lib/index.js
ok 71 - rejects symlink/junction at node_modules/pg/lib/index.js
  ---
  duration_ms: 0.2243
  type: 'test'
  ...
# Subtest: rejects realpath escape even when lstat appears regular
ok 72 - rejects realpath escape even when lstat appears regular
  ---
  duration_ms: 0.3047
  type: 'test'
  ...
# Subtest: rejects package version mismatch even with synthetic matching byte pin
ok 73 - rejects package version mismatch even with synthetic matching byte pin
  ---
  duration_ms: 0.3892
  type: 'test'
  ...
# Subtest: rejects package name mismatch even with synthetic matching byte pin
ok 74 - rejects package name mismatch even with synthetic matching byte pin
  ---
  duration_ms: 0.2394
  type: 'test'
  ...
# Subtest: rejects absent pin or changed entry bytes
ok 75 - rejects absent pin or changed entry bytes
  ---
  duration_ms: 0.4675
  type: 'test'
  ...
# Subtest: actual Node metadata resolution matches the verified repository closure; no Client is constructed
ok 76 - actual Node metadata resolution matches the verified repository closure; no Client is constructed
  ---
  duration_ms: 190.5717
  type: 'test'
  ...
# Subtest: all connection sites load only the reverified absolute entry and closure
ok 77 - all connection sites load only the reverified absolute entry and closure
  ---
  duration_ms: 1.2932
  type: 'test'
  ...
1..77
# tests 77
# suites 0
# pass 77
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1005.88
```

</details>
