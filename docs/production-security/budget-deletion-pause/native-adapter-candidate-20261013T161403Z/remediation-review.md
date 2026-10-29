# Budget-deletion-pause supervisor identity remediation

**REMEDIATION CANDIDATE READY FOR INDEPENDENT REVIEW**

Prepared locally on 2026-10-14 in Asia/Manila; directory timestamps are UTC. This result covers local code and offline tests only. It does not establish production readiness or authorize installation. The next gate is an independent review of this exact new candidate.

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused

Candidate: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z

## Exact identities

| Artifact | Identity |
| --- | --- |
| Candidate bundle SHA-256 | f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84 |
| Input manifest SHA-256 | 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2 |
| Reviewed SQL | 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated inventory verifier | 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Driver closure | 138 pinned files; 08b98ef8f7b3bba88c947bebededda974e18940645a9f2b61f2de7a050dfd736 |
| Fresh focused TAP | 21126 bytes; e70955f7cb82f970f634a676d3648b1570098e6dc1028d99aedf6a2cc66694a5 |
| Four-file patch against prior candidate | 40863 bytes; 233bc8bc760340c31d406b0f836c658b5a90c95f673d254bb73e65cd6ce26568 |

[reviewed-inputs.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/reviewed-inputs.json>) pins five code files and the same eleven inputs and dependency closure. The complete [candidate-artifact-inventory.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/candidate-artifact-inventory.json>) records all other candidate files and excludes itself to avoid a circular hash. Its own hash is reported externally after creation. Bundle construction is SHA-256 of JSON containing the actual manifest SHA-256 and sorted actual code file identities; it was recomputed locally.

| Code file | Bytes | SHA-256 |
| --- | --- | --- |
| [budget-runner-core.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs>) | 56813 | 1a57f717e6aa0a9bf3fd6bc2115440f167760fab82b6fe690b897cade471cbe4 |
| [budget-safety-controls.test.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-safety-controls.test.mjs>) | 43117 | a16c7037c9c44200505e7b14c001e8b7eedfb0704aa3154f60bd26950ccb9789 |
| [native-budget-pause-runner.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs>) | 36455 | 30ac1e54902c1b6ae44f2aa1c9111fc36457d481dbc35b242ebc4a82f172d0a6 |
| [native-budget-pause-supervisor.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-supervisor.mjs>) | 7666 | 14b725b6891294f8658403cca451efafda031a9eaaceb4e162212488a39a8d35 |
| [operation-acl.ps1](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/operation-acl.ps1>) | 14463 | 4891d4c1c5a9d47ec91e01cb64c7951b6c5c3a3143f3f7ad1242820feb16f258 |

## Finding and correction

The preserved [independent review](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/independent-remediation-review-20261013T153814Z.md>) found that the prior worker closed its IPC channel after the first handshake. Later verification used PID existence and an unchanged durable claim. Those checks accepted the review's simulated replacement process occupying the same PID. The report remains unchanged, SHA-256 3d9202482bae001c13a45b24db3a7f3524b9d8ed664bf8f3ee9410e83180cc66.

The new worker keeps its original inherited IPC channel open from lease acceptance until it emits its terminal result. It does not rebind or reconnect to another channel. A new channel helper owns persistent disconnect/error listeners. Once the original channel is lost or an acknowledgment is invalid or late, the lease permanently fails. A later present PID, unchanged file, or connected flag cannot revive it.

Each challenge contains the fixed project, bundle hash, complete claim hash, operation nonce, original supervisor PID, worker PID, increasing sequence and fresh UUID challenge. The supervisor validates the complete message, checks its currently owned durable lock and ACL, and sends the exact scoped acknowledgment on the same inherited channel. Only one challenge can be pending. The production acknowledgment deadline is 2,000 ms and cannot be increased through this helper. Tests shorten it. Both a timer and monotonic elapsed time reject late responses; a delayed event-loop timer cannot make an old response valid.

[Worker channel](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs:374>) and [lease verification](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs:428>) require a fresh challenge response before and after asynchronous claim/ACL verification. There is no worker fallback to process.kill or PID existence. The initial parent-PID check remains a scope check bound to the inherited channel. The supervisor's existing own-process PID check remains; it is not used to establish worker trust in another PID occupant.

[Single submission boundary](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs:477>) checks the live lease immediately before the one query call. Its pending result races permanent channel failure. Fresh lease checks also follow the result, postflight and worker receipt verification, including a final check after database shutdown. The worker performs a final synchronous check before emitting its terminal result. The channel is closed only afterward.

Before submission, loss stops the worker without a query. After any possible submission, loss produces UNRESOLVED, keeps the durable lock and attempt marker, and cannot resubmit or automatically repair. Existing evidence is retained even if the database result might already have committed. The tested before-submission loss occurs after the synthetic marker is armed; the marker stays present and submission count stays zero. Loss before marker creation cannot preserve a nonexistent marker and does not fabricate one.

The supervisor remains the sole lock owner. Its [release call](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-supervisor.mjs:81>) still occurs only after independently rereading and validating durable receipt bytes, comparing the worker's proof with its own, and verifying current lock ownership. No worker release path was added. Stopped zero-exit results remain unsuccessful.

## Exact source scope

| File | Change |
| --- | --- |
| budget-runner-core.mjs | Permanent live-channel lease, scoped challenge/acknowledgment validation, monotonic deadline, last submission check and failure race. Added injectable state IO for synthetic tests; production defaults still use existing durable create-new operations. |
| native-budget-pause-runner.mjs | Keep original IPC open; pass channel to worker lease; verify after shutdown and before output; close only after terminal output; worker outer exceptions report unresolved with retained state. |
| native-budget-pause-supervisor.mjs | Validate and acknowledge fresh challenges on original child channel after verifying owned lock. One worker launch; existing receipt/release boundary retained. |
| budget-safety-controls.test.mjs | Adapt two existing lease cases and add 26 focused assertions, including real harmless IPC. |
| operation-acl.ps1 | Byte-identical copy; parsed only, never executed. |

The SQL, catalog gates, TLS configuration, absolute pinned-driver loading, default durable marker operations, receipt validation, success exit gates, preservation comparisons, raw reconciliation and timestamp/environment guards were retained. Textual section hashes for unchanged controls are in [preservation evidence](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/preservation-verification.json>). The manifest changes code identities only; all eleven input pins, the dependency tree, target and foundation reference remain the same.

The original SQL still contains its atomic BEGIN/COMMIT boundary, 1-second lock timeout and 30-second statement timeout. No SQL was executed. The test query function is an in-memory stub and only counts simulated calls; no pg Client was constructed or loaded.

## Focused offline validation

The test file, imports and child programs were inspected before execution. Synthetic lock, marker, receipt and query state stays in memory. The real children run fixed harmless Node programs: stopped-result output, an initial IPC exchange, and two fresh challenges using the actual channel helper and supervisor handler. They do not invoke adapter preflight/install/reconcile modes or touch protected state.

| Required regression | Actual local result |
| --- | --- |
| Original live channel and fresh operation acknowledgment | PASS |
| Original channel disconnects while PID remains present | PASS — rejected; existing state retained |
| Different modeled process reuses PID and original claim | PASS — permanent failure survives a connected flag being restored |
| PID/file evidence without original channel | PASS — rejected |
| Missing acknowledgment | PASS — bounded timeout, no new challenge retry |
| Stale/replayed acknowledgment | PASS — rejected |
| Malformed/wrong protocol, nonce, challenge, claim, bundle, parent, worker, sequence or extra field | PASS — permanent failure |
| Delayed acknowledgment after timeout | PASS — cannot revive lease |
| Delayed timer with expired monotonic deadline | PASS — rejected |
| Disconnect during acknowledgment or send failure | PASS — permanent failure |
| Supervisor challenge scope validation | PASS |
| Disconnect after marker, before submission | PASS — zero simulated submissions; lock/marker retained |
| Disconnect while simulated query is pending | PASS — unresolved; one call; no release/retry |
| Disconnect after simulated COMMIT or during postflight | PASS — unresolved; state retained; no release/retry |
| Live channel and one simulated submission | PASS — provisional worker status only; supervisor acceptance still required |
| Harmless real child with two fresh challenges | PASS — inherited parent/child IPC; lock/marker fixtures retained |
| Earlier receipt, UTC, driver, preservation and no-retry regressions | PASS |

Final suite: **103/103 PASS**, zero failed/skipped/cancelled. Node v24.21.0 on Windows. Four actual JavaScript syntax checks passed. The unchanged PowerShell script parsed with zero errors. Four no-index diff whitespace checks produced no output; status 1 means that source differences exist.

Working directory for the inspected command: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z

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

The test process received OS essentials only and a nonexistent dummy USERPROFILE/HOME. No private environment file or production credential was read or inherited. Read permissions covered the listed local sources/dependencies; no filesystem-write permission was granted. Node emitted PERM0002 for allow-child-process. This is not claimed as a sandbox for arbitrary child programs: the fixed child programs were inspected, and all executed paths are local and harmless. The final importing child also receives the same permission arguments explicitly to preserve Windows path handling.

## Preserved unsuccessful intermediate revision

C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T160851Z is retained as a separate ten-file set. Its source, manifest and first TAP were not edited or rerun.

- Bundle: e9441c48881962782fbc28f223a2d23e4d84bc2fb33b7ec67b2675ffe7d49c18.
- Manifest: d2b0263d0895a0871e1fdab224a29b48830407aeb8ad034cc3e144f0df7416dc.
- Inventory: 57fb9f313835bc578b7aeed8bd71e9e7e0fe23eeb788eacfe0f1ba556d6ea1d2.
- Actual first result: 102/103; TAP c92e84cc4cd801fe9b8d3970073655b6ef26d02870d552a22393c5d6befc9577.

The importing child exited 1 before the lease with ERR_ACCESS_DENIED for its local dynamic import under inherited Windows permission arguments. A separate in-memory diagnostic using explicit permission arguments completed two challenges. The final candidate changes only the test child argument forwarding relative to that intermediate revision; its production code is identical. The first result remains failed evidence and is not relabeled as passing. The underlying Node Windows path behavior is not claimed to have been fully diagnosed beyond the observed permission failure and successful explicit-argument diagnostic.

## Preservation

[preservation-verification.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/preservation-verification.json>) contains 247 checked file pins covering the reviewed original/blocked artifacts, historical evidence, current base candidate, independent review, earlier unsuccessful revision and this task's preserved intermediate revision. All eleven pinned inputs and 138 dependency files were rechecked. Earlier suites were not rerun.

The prior candidate remains exactly:

- Bundle: 5667c2cf30ce651aa47f55a9703f9b801b5688c6676e4b743a68b4b8be24ed5b.
- Manifest: cc7345fabf63262c082bc332ec7ee526d8cb9c9f2d9c6a8a0abd841c7fc16b11.
- Inventory: 82520ef38e6f966cb611809f655112f0254ff66749daeb7976da77701061a1cb.
- Its saved 77/77 TAP: dc10a967e13a7ac0bd8bba3f9e4ecf823f04d58d9c206734a7c75201e04d3905.
- Its independently reproduced 77/77 TAP, extracted from the unchanged review appendix: 15,457 bytes; 5284e17b73fb7b3117e594c1dd63031b1f1a4a00636c5e8c2ef5e07b76fd5391.

The new bundle and manifest supersede those identities only for this proposed candidate. Prior files remain historical evidence. No expired proof or old authorization is adopted for the new bundle.

## Workspace before and after

| State | Before | After |
| --- | --- | --- |
| Branch | ui-refactor | ui-refactor |
| HEAD | 2f6e7427c553b7535f53860d1732b42df7c023e8 | same |
| Dirty tracked | 68 | 68 |
| Staged | 0 | 0 |
| Untracked | 3,755 | 3,777 |

Every addition is inside a new candidate directory and was created with create-new semantics. The 22 new files comprise ten preserved unsuccessful-revision files and twelve final-candidate files. The final set contains five code files, manifest, TAP, local-check results, four-file patch, preservation evidence, this report and full inventory. The earlier set contains five code files, manifest, failed TAP, failure-check results, report and inventory.

Removing only these two directories' new status entries reproduces the original status SHA-256 af9ad40caa02a9fc81ed3b1ed5ba5f40487f4e5ec49b601f4934db60252d397e (porcelain lines joined with LF, no final LF). Final status and candidate hashes are checked after this report and inventory are created. All additions remain unstaged.

## Remaining limitations and review boundary

Actual Windows PID recycling was NOT TESTED and was not forced. Real disk-lock crash recovery, protected-root ownership/ACLs, live TLS/database state and production installation were NOT TESTED. The real child case establishes local inherited IPC behavior, not actual OS PID recycling or crash recovery.

An acknowledgment cannot make process liveness atomic with a later database COMMIT. Loss observed before submission stops it; loss during or after a possible submission is conservatively unresolved. An already submitted transaction may commit despite IPC loss. The code does not claim to recall that transaction, and it never automatically retries, repairs state, or infers presence from a status label. Future separately authorized reconciliation still requires a finished recorded backend plus matching raw catalog and full function fingerprints.

Independent review must assess this exact channel protocol, race/error handling, default durable state operations, final receipt/lock boundary and file identities. That is the next gate. Any eventual production work remains subject to separate fresh authorized verification, protected-root security checks, a drained exclusive window and exact installation authorization. None was prepared or requested here.

No Supabase tools, endpoint calls, database connection, proof/preflight, protected-state access, ACL change, authorization/operation-lock/attempt file creation, SQL execution, live reconciliation, migration, deployment, Git operation beyond reads, frontend/Storage/UAT/pagination edit or production action occurred.
