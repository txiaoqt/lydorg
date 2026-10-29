# Independent offline review: supervisor identity remediation

**CANDIDATE REVIEW PASS**

Review start: 2026-10-13T16:28:51Z (2026-10-14 in Asia/Manila). Review completed locally. This verdict establishes only that the exact candidate passed this offline review. It does not establish production readiness or authorize installation.

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused

Candidate: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z

## Identities and scope

| Artifact | Independently verified identity |
| --- | --- |
| Bundle SHA-256 | f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84 |
| Manifest | 29420 bytes; 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2 |
| Complete inventory | 2004 bytes; e852913544468bd34724e22b9bc132bcf9c5d8a060a0cf4eaba3d8a89bf5d362 |
| Production SQL | 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated inventory verifier | 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Driver closure | 14 packages, 138 files; 08b98ef8f7b3bba88c947bebededda974e18940645a9f2b61f2de7a050dfd736 |
| Remediation report | 39ff615c385a3319d53df8c54c041b1258c9c3726092ba572024430d2b1125ce |

All supplied identities match. Exactly twelve candidate files exist; the inventory lists eleven and deliberately excludes itself. Every per-file size/hash, all eleven pinned inputs and all dependency pins were recomputed with independent filesystem reads and SHA-256. The bundle was independently reconstructed from actual manifest bytes and sorted actual code identities. The dependency closure was separately traversed and enumerated from package dependency/optional-dependency metadata, with no extra/missing file or link detected.

The four-file patch reproduces the actual diff from the 20261013T152100Z candidate byte-for-byte: 40,863 bytes; 233bc8bc760340c31d406b0f836c658b5a90c95f673d254bb73e65cd6ce26568. No whitespace findings were emitted by the four no-index checks; exit 1 records differences. Four actual JavaScript parser checks passed. The unchanged PowerShell helper was inspected as source and hash evidence only; it was not invoked.

## Finding resolution

The prior [independent review](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/independent-remediation-review-20261013T153814Z.md>) remains unchanged: SHA-256 3d9202482bae001c13a45b24db3a7f3524b9d8ed664bf8f3ee9410e83180cc66. Its F1 is resolved within this offline review scope. No new blocking implementation finding was identified.

The former worker accepted a one-time IPC claim, closed that channel and later checked PID existence plus the persisted file. The current [lease acceptance](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs:335>) leaves the inherited channel open and installs persistent failure listeners before removing the temporary handshake listeners. There is no close/reconnect branch that can attach to a replacement supervisor. The channel closes only after terminal worker output.

The [channel helper](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs:374>) binds each acknowledgment to the fixed project, bundle, complete claim hash (which also binds SQL/route/creation time), operation nonce, original supervisor PID, worker PID, increasing sequence and fresh challenge UUID. Full-message equality rejects missing, extra or changed fields. The [supervisor handler](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-supervisor.mjs:47>) validates the challenge and verifies its current durable lock ownership and ACL before acknowledging on the same child IPC channel.

The worker treats disconnect, IPC error, invalid/replayed acknowledgment, overlapping verification, send failure and timeout as permanent failure. Restoring a connected flag or keeping the same PID/file does not clear that state. Only one challenge can be pending. The deadline is capped at 2,000 ms and checked with monotonic elapsed time as well as a timer, so delayed timer dispatch cannot accept an expired acknowledgment.

The [worker lease](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs:428>) obtains a fresh acknowledgment before and after asynchronous file/ACL verification. The [submission boundary](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs:477>) then performs a synchronous live-state check immediately before the sole query call; there is no intervening await at that boundary. Pending query/postflight completion races permanent channel failure and is checked again afterward. The worker checks again after receipt verification/database shutdown and immediately before terminal output.

If failure has already latched, the final synchronous check throws before the call. A disconnect observed while a query may already be in flight yields unresolved state and cannot trigger another query submission. This is not a guarantee that parent-process liveness can be atomic with a later database COMMIT. An already submitted transaction may still commit; the implementation and report correctly retain state and require separately authorized read-only determination of the actual outcome.

## Control assessment and evidence

| Control | Result | Evidence and limit |
| --- | --- | --- |
| Retain original inherited channel | PASS, source/real child | Temporary handshake cleanup does not disconnect; permanent helper listeners stay active through critical worker checks. |
| Permanent failure and stale-PID rejection | PASS, source/unit model | No recovery/reset of failed state; present/restored PID or connected flag cannot revive it. Actual OS PID recycling was not attempted. |
| Complete operation/peer binding | PASS, source/unit | Full scoped message comparison, fresh UUID and strictly increasing sequence; claim hash covers the complete scoped lock. |
| Bounded acknowledgment / event-loop delay | PASS, source/unit | One pending request, maximum 2,000 ms; monotonic check rejects a late response even before its delayed timer runs. |
| Supervisor ownership/ACL before acknowledgment | PASS, source | Actual CLI passes the fixed ACL Verify callback to lock.verify before every acknowledgment. No protected-root ACL check was executed here. |
| Before/after asynchronous gates | PASS, source/unit | Fresh acknowledgments surround file/ACL checks; final synchronous pre-query check; query and postflight guarded; final check after database shutdown. |
| Loss before possible submission | PASS, unit model | Late pre-submit loss produces zero simulated calls; any existing/armed marker and lock remain. Failure earlier than marker creation does not manufacture a marker. |
| Loss during/after possible submission | PASS, unit model | Unresolved result, retained state, one call maximum, zero retry or automatic repair. No real SQL was executed. |
| Sole supervisor lock owner/release | PASS, source/unit | Worker has verification-only lease and no unlink/release. Supervisor independently rereads receipt bytes, compares proofs and verifies ownership before its sole release. |
| Stopped zero-exit / exact success receipt | PASS, unchanged source/unit | Final COMMITTED_AND_VERIFIED, terminal COMMIT, one submission, zero retries/rollback statements, exact four events, matching durable hashes and supervisor verification/release flags all required. |
| Pinned pg resolution | PASS, unchanged source/hash/unit | Canonical absolute entry/package, bytes/version, links and full closure checked before Client construction, repeated at connection sites. Actual metadata resolution selects the pinned root package. No driver module or Client was loaded by this review. |
| Raw reconciliation | PASS, unchanged source/unit | Recorded writer must be finished; consistent raw catalog/full function fingerprints determine presence. Unknown/conflicting evidence remains unresolved; no resubmission/automatic repair/state clearing. Mode was not invoked. |
| TLS, catalog/data and environment guards | PASS, source/hash only | Fixed route/CA/hostname checks, original SQL/timeouts, function owner/grants, 57 inventories, foundation/history/policy gates, explicit-offset five-minute proof freshness and native-driver override rejection retained. No fresh live evidence. |
| Secret-safe reporting | PASS, inspected source | Whitelisted error codes, scrubbed/bounded evidence and suppressed raw child stderr; no production credential file/environment supplied to tests. |

The existing process.kill(pid, 0) helper remains only in the supervisor-owned lock verification. It is not used to establish worker trust in another PID occupant. The running supervisor's own PID cannot simultaneously belong to a replacement process. Worker admission requires the original channel, not a live PID lookup.

Queued or duplicate acknowledgments with no matching pending challenge invalidate the lease. If a valid response is followed by failure before an await continuation, assertLive rejects; if failure is observed later, the next gate or active guard rejects. A send error arriving after a valid response also latches permanent failure. A restored connected flag is not a reconnect mechanism. These properties were checked from source and the additional probes below.

The in-memory PID-reuse model plus real inherited-channel challenge test adequately verify removal of the former PID-only trust path for this candidate review. They do not establish real OS crash/recycling coverage or all scheduling behavior. The physical disk-lock and process-crash limitations remain explicit.

## Independent execution

Before running tests, the complete test file, imports and all three real child programs were inspected. The suite uses in-memory claim/marker/receipt state and query stubs. The children print a synthetic stopped result, exchange a synthetic initial lease, or perform two fresh scoped challenges. They do not execute the adapter CLI modes, construct pg clients, load credentials, invoke ACL operations, or access protected state. Mock query calls only count/return synthetic results; they do not execute SQL.

Actual result: **103/103 PASS**, zero failed/skipped/cancelled, exit 0. All 103 case names/results match the saved candidate TAP. The fresh run occurred from 2026-10-13T16:31:28.481Z to 2026-10-13T16:31:29.556Z. Fresh stdout: 21,117 UTF-8 bytes; SHA-256 882918e84fd572833234b1aa8157155e18aa904f9b422262eea71b15e36029b7. Its exact text is retained in Appendix D. The saved candidate TAP remains e70955f7cb82f970f634a676d3648b1570098e6dc1028d99aedf6a2cc66694a5; timing differences between runs are expected.

Node v24.21.0 on Windows; cwd C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z:

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

The environment was explicitly constructed from OS essentials. USERPROFILE/HOME pointed to a nonexistent workspace test path; no production keys, PG settings, private environment file or operator token was inherited. Filesystem permission flags allow reads only for the listed local sources/dependencies and grant no write access. Node emitted PERM0002 for allow-child-process. This is not claimed to sandbox arbitrary untrusted child programs; the fixed programs and their execution paths were inspected. No network/database path was executed.

Six additional independent in-memory ordering probes passed, using the actual helper exports: duplicate idle acknowledgment, overlapping challenges, IPC error, send error after synchronous valid acknowledgment, disconnect during ACL verification despite a restored connected flag, and attempted revival after deliberate close. They used a synthetic EventEmitter transport and claim; no actual process PID, file, operation lock or marker was changed. The source and output are retained in Appendix C.

No historical suite was rerun.

## Preservation and previous evidence

All 247 preservation pins matched independently, alongside all current candidate files/inputs/dependencies. The original reviewed adapter remains bundle 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25 and manifest 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb; its bundle was independently recomputed.

All four previous candidate file sets and bundles were independently recomputed, including exact file sets:

| Candidate UTC suffix | Files | Saved result, not rerun | Inventory SHA-256 |
| --- | --- | --- | --- |
| 20261013T133312Z | 13 | 50/50 | 636768c7703091a0588bf345bc466577b6808d9a3490bf8124874012c2414f6f |
| 20261013T151801Z | 9 | 76/77, failure retained | 1c62dab4b66004aefd0b2ab469a91db9ee3ea1d23375b09ebfc6baaaf36cb859 |
| 20261013T152100Z | 12 | 77/77 | 82520ef38e6f966cb611809f655112f0254ff66749daeb7976da77701061a1cb |
| 20261013T160851Z | 10 | 102/103, failure retained | 57fb9f313835bc578b7aeed8bd71e9e7e0fe23eeb788eacfe0f1ba556d6ea1d2 |

The preserved failed 102/103 revision remains distinct from this passing candidate. Its importing child failed before the lease with the recorded local filesystem permission denial. The final candidate forwards permission arguments explicitly; the real-child case passed independently. Neither historical failure was overwritten, rerun or relabeled.

The prior independent 77/77 TAP was extracted from its unchanged review: 15,457 bytes; 5284e17b73fb7b3117e594c1dd63031b1f1a4a00636c5e8c2ef5e07b76fd5391. Earlier 38/38 SQL, 18/18 UI/client and 39/39 adapter logs remain hash-matched historical evidence. The old preflight/proof remains historical and expired; no fresh proof or authorization was created or adopted.

The lock-owner/release section, receipt/success gates, pg binding/loading and native reconciliation mode were compared directly with the prior candidate and remain byte-identical. Section hashes are included in Appendix B. Production SQL, ACL helper, original artifacts and independent reviews remain unchanged.

## Workspace preservation and limits

| State | Before review | After report addition |
| --- | --- | --- |
| Branch | ui-refactor | ui-refactor |
| HEAD | 2f6e7427c553b7535f53860d1732b42df7c023e8 | same |
| Dirty tracked | 68 | 68 |
| Staged | 0 | 0 |
| Untracked | 3,777 | 3,778 |

Only this timestamped report was added, with exclusive create-new semantics. The status remained exactly unchanged after testing and before report creation. Excluding this report's entry reproduces the original status SHA-256 a101252fd2cfd3c4faa577af168cf79e39766dde6c0c32705fed6003bed3136a (UTF-8 porcelain lines joined with LF, no final LF). Final status and all candidate/preservation hashes are rechecked after report creation. No existing file was repaired or modified.

Real Windows PID recycling, disk-lock crash recovery, protected-root ownership/effective ACLs, live TLS, fresh database/catalog/data state and installation were NOT TESTED. No Supabase tool, endpoint call, fresh proof/preflight, protected-state access, ACL action, authorization/operation-lock/attempt file creation, SQL execution, live reconciliation, migration, deployment, push or frontend/Storage/UAT/pagination change occurred.

Future production activity remains separately gated on fresh authorized verification, protected-root security verification, an exclusive drained window and exact human installation authorization. None is requested or prepared by this review.

## Appendix A — Complete candidate file verification

| File | Bytes | SHA-256 |
| --- | --- | --- |
| [budget-runner-core.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs>) | 56813 | 1a57f717e6aa0a9bf3fd6bc2115440f167760fab82b6fe690b897cade471cbe4 |
| [budget-safety-controls.test.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-safety-controls.test.mjs>) | 43117 | a16c7037c9c44200505e7b14c001e8b7eedfb0704aa3154f60bd26950ccb9789 |
| [focused-tests-01.tap](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/focused-tests-01.tap>) | 21126 | e70955f7cb82f970f634a676d3648b1570098e6dc1028d99aedf6a2cc66694a5 |
| [local-check-results.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/local-check-results.json>) | 4368 | 8dc65dd76290c046a653fcd9aad2372199e2e6916e079da32d624e2699bc8a2e |
| [native-budget-pause-runner.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs>) | 36455 | 30ac1e54902c1b6ae44f2aa1c9111fc36457d481dbc35b242ebc4a82f172d0a6 |
| [native-budget-pause-supervisor.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-supervisor.mjs>) | 7666 | 14b725b6891294f8658403cca451efafda031a9eaaceb4e162212488a39a8d35 |
| [operation-acl.ps1](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/operation-acl.ps1>) | 14463 | 4891d4c1c5a9d47ec91e01cb64c7951b6c5c3a3143f3f7ad1242820feb16f258 |
| [preservation-verification.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/preservation-verification.json>) | 69411 | 25cfad2904932aa6b3e9791c4595c996bf68a5129046386e31952319f74b8c24 |
| [remediation-review.md](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/remediation-review.md>) | 18740 | 39ff615c385a3319d53df8c54c041b1258c9c3726092ba572024430d2b1125ce |
| [reviewed-inputs.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/reviewed-inputs.json>) | 29420 | 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2 |
| [security-correction.patch](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/security-correction.patch>) | 40863 | 233bc8bc760340c31d406b0f836c658b5a90c95f673d254bb73e65cd6ce26568 |
| [candidate-artifact-inventory.json](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/candidate-artifact-inventory.json>) | 2004 | e852913544468bd34724e22b9bc132bcf9c5d8a060a0cf4eaba3d8a89bf5d362 |

| Pinned input | Bytes | SHA-256 |
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

## Appendix B — Unchanged security sections

```json
[
  {
    "name": "lock ownership",
    "sha256": "86c42a1f884fc0a44a175fc0b1bc687bc6849ab66f8478c33aba651d9e52b444"
  },
  {
    "name": "driver binding",
    "sha256": "e2bfe4c666e350302848a8e4dee14029b51161b76e18e2191823b95228d5205e"
  },
  {
    "name": "receipt/success gates",
    "sha256": "a1195a1cf4cd0611827c22e538dba3d9cf9984551b3ed22eb2dfb475e18a6534"
  },
  {
    "name": "driver loading",
    "sha256": "1407ce5f77b4d3f4c07e02a7ad5f3bc883f26b19021e0eaedf7917b34ab01c90"
  },
  {
    "name": "reconciliation mode",
    "sha256": "809b24065a3f4912f9cc691a0ab02666cfbcc4fd3e3bfbd4ff6ca5196b1a4a29"
  }
]
```

## Appendix C — Additional independent ordering probes

Source SHA-256: 77942068b829c2f7a721696ca0f61db0fe4ad23d604d1d50a28ed3f5ff593634. Executed from stdin under the same clean environment and read-only allowlist, without child-process permission. No disk fixtures were created.

```javascript
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {TARGET,SQL_SHA,createWorkerSupervisorChannel,attachWorkerLock,verifySupervisorChallenge} from './budget-runner-core.mjs';
const bundle='c'.repeat(64),claim={recordType:'YTRACE_BUDGET_SUPERVISOR_LOCK',version:2,project:TARGET.project,route:TARGET.route,sqlSha256:SQL_SHA,runnerBundleSha256:bundle,pid:4242,nonce:'11111111-2222-4333-8444-555555555555',createdAt:'2026-10-13T16:00:00.000Z'};
function peer(){
 const transport=new EventEmitter();transport.connected=true;let sequence=0,last;const requests=[];
 const ack=request=>verifySupervisorChallenge(request,{claim,workerPid:77,lastSequence:sequence++});
 transport.disconnect=()=>{transport.connected=false;transport.emit('disconnect');};
 transport.send=(request,callback)=>{requests.push(request);last=ack(request);callback?.(null);queueMicrotask(()=>transport.emit('message',last));};
 const channel=createWorkerSupervisorChannel({claim,bundleSha256:bundle,transport,workerPid:77,parentPid:4242,timeoutMs:100});
 return {transport,channel,requests,ack,last:()=>last};
}
const results=[];
{
 const p=peer();await p.channel.verify();p.transport.emit('message',p.last());
 await assert.rejects(p.channel.verify(),/SUPERVISOR_ACK_INVALID/);assert.equal(p.requests.length,1);p.channel.close();results.push('duplicate ACK while idle permanently fails');
}
{
 const p=peer();p.transport.send=request=>p.requests.push(request);
 const first=p.channel.verify(),second=p.channel.verify();const settled=await Promise.allSettled([first,second]);
 assert.equal(settled.every(r=>r.status==='rejected'&&/SUPERVISOR_ACK_OVERLAP/.test(r.reason.message)),true);assert.equal(p.requests.length,1);p.channel.close();results.push('overlapping challenges both fail; no second send');
}
{
 const p=peer();p.transport.send=(_,callback)=>{callback(null);queueMicrotask(()=>p.transport.emit('error',Error('synthetic IPC failure')));};
 await assert.rejects(p.channel.verify(),/SUPERVISOR_CHANNEL_ERROR/);await assert.rejects(p.channel.verify(),/SUPERVISOR_CHANNEL_ERROR/);p.channel.close();results.push('IPC error permanently fails without retry');
}
{
 const p=peer();p.transport.send=(request,callback)=>{p.transport.emit('message',p.ack(request));callback(Error('synthetic late send callback'));};
 await assert.rejects(p.channel.verify(),/SUPERVISOR_CHANNEL_SEND_FAILED/);p.channel.close();results.push('send error after synchronous valid ACK still fails');
}
{
 const p=peer();const lease=await attachWorkerLock(':in-memory-only:',{claim,bundleSha256:bundle,supervisorChannel:p.channel,parentPid:4242,io:{async readJson(){return structuredClone(claim);}}});
 await assert.rejects(lease.verify(async()=>{p.transport.disconnect();p.transport.connected=true;}),/SUPERVISOR_CHANNEL_DISCONNECTED/);
 assert.equal(p.channel.isLive(),false);p.channel.close();results.push('disconnect during ACL check rejected despite restored connected flag');
}
{
 const p=peer();await p.channel.verify();p.channel.close();p.transport.connected=true;
 await assert.rejects(p.channel.verify(),/SUPERVISOR_CHANNEL_CLOSED/);assert.equal(p.requests.length,1);p.transport.connected=false;results.push('intentional close cannot reconnect or revive lease');
}
console.log(JSON.stringify({status:'PASS',checks:results.length,results,actualOsPidReuse:false,networkCalls:0,filesystemWrites:0}));
```

```json
{"status":"PASS","checks":6,"results":["duplicate ACK while idle permanently fails","overlapping challenges both fail; no second send","IPC error permanently fails without retry","send error after synchronous valid ACK still fails","disconnect during ACL check rejected despite restored connected flag","intentional close cannot reconnect or revive lease"],"actualOsPidReuse":false,"networkCalls":0,"filesystemWrites":0}
```

## Appendix D — Exact fresh focused TAP

<details>
<summary>103 independently reproduced focused assertions</summary>

```text
TAP version 13
# (node:32700) [PERM0002] SecurityWarning: The flag --allow-child-process must be used with extreme caution. It could invalidate the permission model.
# (Use `node --trace-warnings ...` to show where the warning was created)
# Subtest: complete receipt proves terminal COMMIT, one attempt and all preservation bindings
ok 1 - complete receipt proves terminal COMMIT, one attempt and all preservation bindings
  ---
  duration_ms: 9.8563
  type: 'test'
  ...
# Subtest: stopped zero-exit UNRESOLVED cannot be accepted as installation success
ok 2 - stopped zero-exit UNRESOLVED cannot be accepted as installation success
  ---
  duration_ms: 1.9216
  type: 'test'
  ...
# Subtest: stopped zero-exit COMMITTED_POSTFLIGHT_FAILED cannot be accepted as installation success
ok 3 - stopped zero-exit COMMITTED_POSTFLIGHT_FAILED cannot be accepted as installation success
  ---
  duration_ms: 0.7776
  type: 'test'
  ...
# Subtest: stopped zero-exit COMMITTED_WITH_DRIFT cannot be accepted as installation success
ok 4 - stopped zero-exit COMMITTED_WITH_DRIFT cannot be accepted as installation success
  ---
  duration_ms: 0.8191
  type: 'test'
  ...
# Subtest: stopped zero-exit NOT_INSTALLED_VERIFIED cannot be accepted as installation success
ok 5 - stopped zero-exit NOT_INSTALLED_VERIFIED cannot be accepted as installation success
  ---
  duration_ms: 0.7605
  type: 'test'
  ...
# Subtest: stopped zero-exit INSTALLED_AND_PRESERVED cannot be accepted as installation success
ok 6 - stopped zero-exit INSTALLED_AND_PRESERVED cannot be accepted as installation success
  ---
  duration_ms: 0.7256
  type: 'test'
  ...
# Subtest: stopped zero-exit INSTALLED_WITH_DRIFT cannot be accepted as installation success
ok 7 - stopped zero-exit INSTALLED_WITH_DRIFT cannot be accepted as installation success
  ---
  duration_ms: 0.7282
  type: 'test'
  ...
# Subtest: stopped zero-exit PASS cannot be accepted as installation success
ok 8 - stopped zero-exit PASS cannot be accepted as installation success
  ---
  duration_ms: 0.712
  type: 'test'
  ...
# Subtest: a real harmless child exiting zero with UNRESOLVED remains stopped
ok 9 - a real harmless child exiting zero with UNRESOLVED remains stopped
  ---
  duration_ms: 81.4506
  type: 'test'
  ...
# Subtest: success rejects inconsistent commitAcknowledged=false
ok 10 - success rejects inconsistent commitAcknowledged=false
  ---
  duration_ms: 1.6839
  type: 'test'
  ...
# Subtest: success rejects inconsistent submissionCount=0
ok 11 - success rejects inconsistent submissionCount=0
  ---
  duration_ms: 0.8195
  type: 'test'
  ...
# Subtest: success rejects inconsistent submissionCount=2
ok 12 - success rejects inconsistent submissionCount=2
  ---
  duration_ms: 0.7287
  type: 'test'
  ...
# Subtest: success rejects inconsistent automaticRetries=1
ok 13 - success rejects inconsistent automaticRetries=1
  ---
  duration_ms: 0.7149
  type: 'test'
  ...
# Subtest: success rejects inconsistent rollbackStatementsSent=1
ok 14 - success rejects inconsistent rollbackStatementsSent=1
  ---
  duration_ms: 0.9916
  type: 'test'
  ...
# Subtest: success rejects inconsistent retainLock=false
ok 15 - success rejects inconsistent retainLock=false
  ---
  duration_ms: 1.8509
  type: 'test'
  ...
# Subtest: success rejects inconsistent retainAttemptMarker=false
ok 16 - success rejects inconsistent retainAttemptMarker=false
  ---
  duration_ms: 0.9706
  type: 'test'
  ...
# Subtest: success rejects inconsistent stopForHumanReview=true
ok 17 - success rejects inconsistent stopForHumanReview=true
  ---
  duration_ms: 0.9745
  type: 'test'
  ...
# Subtest: receipt fails closed for missing event
ok 18 - receipt fails closed for missing event
  ---
  duration_ms: 1.1308
  type: 'test'
  ...
# Subtest: receipt fails closed for duplicate event
ok 19 - receipt fails closed for duplicate event
  ---
  duration_ms: 0.8557
  type: 'test'
  ...
# Subtest: receipt fails closed for wrong terminal tag
ok 20 - receipt fails closed for wrong terminal tag
  ---
  duration_ms: 0.9389
  type: 'test'
  ...
# Subtest: receipt fails closed for wrong function fingerprint
ok 21 - receipt fails closed for wrong function fingerprint
  ---
  duration_ms: 2.5471
  type: 'test'
  ...
# Subtest: receipt fails closed for wrong function owner
ok 22 - receipt fails closed for wrong function owner
  ---
  duration_ms: 2.184
  type: 'test'
  ...
# Subtest: receipt fails closed for changed inventories
ok 23 - receipt fails closed for changed inventories
  ---
  duration_ms: 2.1996
  type: 'test'
  ...
# Subtest: receipt fails closed for changed foundation
ok 24 - receipt fails closed for changed foundation
  ---
  duration_ms: 1.921
  type: 'test'
  ...
# Subtest: receipt fails closed for changed migrations
ok 25 - receipt fails closed for changed migrations
  ---
  duration_ms: 2.7049
  type: 'test'
  ...
# Subtest: receipt fails closed for changed Storage count
ok 26 - receipt fails closed for changed Storage count
  ---
  duration_ms: 2.4804
  type: 'test'
  ...
# Subtest: receipt fails closed for changed backend
ok 27 - receipt fails closed for changed backend
  ---
  duration_ms: 2.1247
  type: 'test'
  ...
# Subtest: receipt fails closed for mismatched marker hash
ok 28 - receipt fails closed for mismatched marker hash
  ---
  duration_ms: 1.3778
  type: 'test'
  ...
# Subtest: receipt fails closed for mismatched nonce
ok 29 - receipt fails closed for mismatched nonce
  ---
  duration_ms: 1.7605
  type: 'test'
  ...
# Subtest: receipt fails closed for different candidate bundle
ok 30 - receipt fails closed for different candidate bundle
  ---
  duration_ms: 0.8135
  type: 'test'
  ...
# Subtest: receipt fails closed for secret-shaped evidence
ok 31 - receipt fails closed for secret-shaped evidence
  ---
  duration_ms: 0.8843
  type: 'test'
  ...
# Subtest: partial journal and timezone-free event timestamps fail closed
ok 32 - partial journal and timezone-free event timestamps fail closed
  ---
  duration_ms: 1.1585
  type: 'test'
  ...
# Subtest: supervisor independently verifies bytes and matching child receipt hashes
ok 33 - supervisor independently verifies bytes and matching child receipt hashes
  ---
  duration_ms: 3.7622
  type: 'test'
  ...
# Subtest: forged receipt PASS or changed durable bytes cannot pass supervisor
ok 34 - forged receipt PASS or changed durable bytes cannot pass supervisor
  ---
  duration_ms: 4.3372
  type: 'test'
  ...
# Subtest: ambiguous child exception has one launch and zero automatic retries
ok 35 - ambiguous child exception has one launch and zero automatic retries
  ---
  duration_ms: 0.7298
  type: 'test'
  ...
# Subtest: nonzero exit, signal and malformed output are unresolved
ok 36 - nonzero exit, signal and malformed output are unresolved
  ---
  duration_ms: 2.3559
  type: 'test'
  ...
# Subtest: raw original fingerprints with preservation false determine presence independently
ok 37 - raw original fingerprints with preservation false determine presence independently
  ---
  duration_ms: 0.4368
  type: 'test'
  ...
# Subtest: raw original fingerprints with preservation true determine presence independently
ok 38 - raw original fingerprints with preservation true determine presence independently
  ---
  duration_ms: 0.149
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
  duration_ms: 0.138
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for unknown catalog
ok 41 - reconciliation remains unresolved for unknown catalog
  ---
  duration_ms: 0.1885
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for unknown function
ok 42 - reconciliation remains unresolved for unknown function
  ---
  duration_ms: 0.1782
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for inconsistent views
ok 43 - reconciliation remains unresolved for inconsistent views
  ---
  duration_ms: 0.1888
  type: 'test'
  ...
# Subtest: reconciliation remains unresolved for wrong owner
ok 44 - reconciliation remains unresolved for wrong owner
  ---
  duration_ms: 0.1404
  type: 'test'
  ...
# Subtest: active backend, unknown preservation and missing raw views cannot infer installation
ok 45 - active backend, unknown preservation and missing raw views cannot infer installation
  ---
  duration_ms: 0.206
  type: 'test'
  ...
# Subtest: UTC freshness parses original ISO JSON equally for explicit offsets
ok 46 - UTC freshness parses original ISO JSON equally for explicit offsets
  ---
  duration_ms: 0.3529
  type: 'test'
  ...
# Subtest: five-minute freshness cannot be removed or extended and future proofs fail
ok 47 - five-minute freshness cannot be removed or extended and future proofs fail
  ---
  duration_ms: 0.4342
  type: 'test'
  ...
# Subtest: forced native driver is denied even when the variable is an empty string
ok 48 - forced native driver is denied even when the variable is an empty string
  ---
  duration_ms: 0.2697
  type: 'test'
  ...
# Subtest: candidate pins unchanged SQL, eleven inputs and the same 138 dependency files
ok 49 - candidate pins unchanged SQL, eleven inputs and the same 138 dependency files
  ---
  duration_ms: 185.1697
  type: 'test'
  ...
# Subtest: worker never owns/releases the lock; supervisor verifies before its sole release
ok 50 - worker never owns/releases the lock; supervisor verifies before its sole release
  ---
  duration_ms: 1.5433
  type: 'test'
  ...
# Subtest: supervisor holds the actual claim continuously through worker exit and independent receipt verification
ok 51 - supervisor holds the actual claim continuously through worker exit and independent receipt verification
  ---
  duration_ms: 7.4599
  type: 'test'
  ...
# Subtest: lock and marker remain on read failure; no SQL/worker retry
ok 52 - lock and marker remain on read failure; no SQL/worker retry
  ---
  duration_ms: 3.0356
  type: 'test'
  ...
# Subtest: lock and marker remain on corrupt receipt; no SQL/worker retry
ok 53 - lock and marker remain on corrupt receipt; no SQL/worker retry
  ---
  duration_ms: 3.0776
  type: 'test'
  ...
# Subtest: lock and marker remain on child signal; no SQL/worker retry
ok 54 - lock and marker remain on child signal; no SQL/worker retry
  ---
  duration_ms: 0.8948
  type: 'test'
  ...
# Subtest: lock and marker remain on child uncertain; no SQL/worker retry
ok 55 - lock and marker remain on child uncertain; no SQL/worker retry
  ---
  duration_ms: 1.2503
  type: 'test'
  ...
# Subtest: lock and marker remain on owner changed; no SQL/worker retry
ok 56 - lock and marker remain on owner changed; no SQL/worker retry
  ---
  duration_ms: 2.1271
  type: 'test'
  ...
# Subtest: lock and marker remain on supervisor interruption; no SQL/worker retry
ok 57 - lock and marker remain on supervisor interruption; no SQL/worker retry
  ---
  duration_ms: 2.0734
  type: 'test'
  ...
# Subtest: an independently mismatched child proof cannot release the actual claim
ok 58 - an independently mismatched child proof cannot release the actual claim
  ---
  duration_ms: 4.1621
  type: 'test'
  ...
# Subtest: release requires the exact owner and independently complete receipt proof
ok 59 - release requires the exact owner and independently complete receipt proof
  ---
  duration_ms: 2.0208
  type: 'test'
  ...
# Subtest: worker has only a verification lease and cannot unlink a disconnected supervisor lock
ok 60 - worker has only a verification lease and cannot unlink a disconnected supervisor lock
  ---
  duration_ms: 2.9528
  type: 'test'
  ...
# Subtest: worker rejects wrong parent, bundle or changed claim before arming
ok 61 - worker rejects wrong parent, bundle or changed claim before arming
  ---
  duration_ms: 0.9863
  type: 'test'
  ...
# Subtest: dead supervisor state permits only read-only classification after the recorded writer finishes
ok 62 - dead supervisor state permits only read-only classification after the recorded writer finishes
  ---
  duration_ms: 1.5675
  type: 'test'
  ...
# Subtest: real harmless IPC child receives one parent lease; lock persists through process exit
ok 63 - real harmless IPC child receives one parent lease; lock persists through process exit
  ---
  duration_ms: 81.888
  type: 'test'
  ...
# Subtest: expected pinned pg resolution binds real entry/package paths and hashed identity
ok 64 - expected pinned pg resolution binds real entry/package paths and hashed identity
  ---
  duration_ms: 0.862
  type: 'test'
  ...
# Subtest: rejects candidate shadow resolution before reading/loading driver bytes
ok 65 - rejects candidate shadow resolution before reading/loading driver bytes
  ---
  duration_ms: 0.282
  type: 'test'
  ...
# Subtest: rejects ancestor shadow resolution before reading/loading driver bytes
ok 66 - rejects ancestor shadow resolution before reading/loading driver bytes
  ---
  duration_ms: 0.1527
  type: 'test'
  ...
# Subtest: rejects outside root resolution before reading/loading driver bytes
ok 67 - rejects outside root resolution before reading/loading driver bytes
  ---
  duration_ms: 0.1465
  type: 'test'
  ...
# Subtest: rejects wrong entry resolution before reading/loading driver bytes
ok 68 - rejects wrong entry resolution before reading/loading driver bytes
  ---
  duration_ms: 0.165
  type: 'test'
  ...
# Subtest: rejects symlink/junction at node_modules
ok 69 - rejects symlink/junction at node_modules
  ---
  duration_ms: 0.2187
  type: 'test'
  ...
# Subtest: rejects symlink/junction at node_modules/pg
ok 70 - rejects symlink/junction at node_modules/pg
  ---
  duration_ms: 0.1752
  type: 'test'
  ...
# Subtest: rejects symlink/junction at node_modules/pg/lib/index.js
ok 71 - rejects symlink/junction at node_modules/pg/lib/index.js
  ---
  duration_ms: 0.2097
  type: 'test'
  ...
# Subtest: rejects realpath escape even when lstat appears regular
ok 72 - rejects realpath escape even when lstat appears regular
  ---
  duration_ms: 0.2691
  type: 'test'
  ...
# Subtest: rejects package version mismatch even with synthetic matching byte pin
ok 73 - rejects package version mismatch even with synthetic matching byte pin
  ---
  duration_ms: 0.324
  type: 'test'
  ...
# Subtest: rejects package name mismatch even with synthetic matching byte pin
ok 74 - rejects package name mismatch even with synthetic matching byte pin
  ---
  duration_ms: 0.2313
  type: 'test'
  ...
# Subtest: rejects absent pin or changed entry bytes
ok 75 - rejects absent pin or changed entry bytes
  ---
  duration_ms: 0.4106
  type: 'test'
  ...
# Subtest: actual Node metadata resolution matches the verified repository closure; no Client is constructed
ok 76 - actual Node metadata resolution matches the verified repository closure; no Client is constructed
  ---
  duration_ms: 163.0917
  type: 'test'
  ...
# Subtest: all connection sites load only the reverified absolute entry and closure
ok 77 - all connection sites load only the reverified absolute entry and closure
  ---
  duration_ms: 0.8519
  type: 'test'
  ...
# Subtest: live original IPC channel supplies fresh operation-specific acknowledgments
ok 78 - live original IPC channel supplies fresh operation-specific acknowledgments
  ---
  duration_ms: 1.4502
  type: 'test'
  ...
# Subtest: original channel loss is fatal while the original PID still appears present
ok 79 - original channel loss is fatal while the original PID still appears present
  ---
  duration_ms: 1.1394
  type: 'test'
  ...
# Subtest: a different process reusing the PID cannot revive the lost original channel or unchanged claim
ok 80 - a different process reusing the PID cannot revive the lost original channel or unchanged claim
  ---
  duration_ms: 3.0358
  type: 'test'
  ...
# Subtest: PID/file evidence without an original live channel is rejected
ok 81 - PID/file evidence without an original live channel is rejected
  ---
  duration_ms: 0.8835
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong nonce
ok 82 - invalid acknowledgment permanently fails closed: wrong nonce
  ---
  duration_ms: 0.8892
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong challenge
ok 83 - invalid acknowledgment permanently fails closed: wrong challenge
  ---
  duration_ms: 0.7805
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong claim hash
ok 84 - invalid acknowledgment permanently fails closed: wrong claim hash
  ---
  duration_ms: 0.7516
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong bundle
ok 85 - invalid acknowledgment permanently fails closed: wrong bundle
  ---
  duration_ms: 0.7857
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong parent
ok 86 - invalid acknowledgment permanently fails closed: wrong parent
  ---
  duration_ms: 0.7781
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong worker
ok 87 - invalid acknowledgment permanently fails closed: wrong worker
  ---
  duration_ms: 0.748
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: wrong sequence
ok 88 - invalid acknowledgment permanently fails closed: wrong sequence
  ---
  duration_ms: 0.7835
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: malformed protocol
ok 89 - invalid acknowledgment permanently fails closed: malformed protocol
  ---
  duration_ms: 0.8145
  type: 'test'
  ...
# Subtest: invalid acknowledgment permanently fails closed: extra field
ok 90 - invalid acknowledgment permanently fails closed: extra field
  ---
  duration_ms: 0.7868
  type: 'test'
  ...
# Subtest: missing acknowledgment expires and cannot be retried on the same lease
ok 91 - missing acknowledgment expires and cannot be retried on the same lease
  ---
  duration_ms: 22.467
  type: 'test'
  ...
# Subtest: replayed stale acknowledgment is rejected for the next fresh challenge
ok 92 - replayed stale acknowledgment is rejected for the next fresh challenge
  ---
  duration_ms: 1.4197
  type: 'test'
  ...
# Subtest: delayed valid acknowledgment after timeout cannot restore the lease
ok 93 - delayed valid acknowledgment after timeout cannot restore the lease
  ---
  duration_ms: 20.7086
  type: 'test'
  ...
# Subtest: monotonic deadline rejects a late acknowledgment even before its delayed timer runs
ok 94 - monotonic deadline rejects a late acknowledgment even before its delayed timer runs
  ---
  duration_ms: 31.2577
  type: 'test'
  ...
# Subtest: disconnect during pending acknowledgment and send failure both latch failure
ok 95 - disconnect during pending acknowledgment and send failure both latch failure
  ---
  duration_ms: 1.6679
  type: 'test'
  ...
# Subtest: supervisor rejects wrong claim, worker and sequence before acknowledging
ok 96 - supervisor rejects wrong claim, worker and sequence before acknowledging
  ---
  duration_ms: 0.9014
  type: 'test'
  ...
# Subtest: channel loss before-submission stops unresolved, retains lock/marker and never resubmits
ok 97 - channel loss before-submission stops unresolved, retains lock/marker and never resubmits
  ---
  duration_ms: 3.7012
  type: 'test'
  ...
# Subtest: channel loss during-query stops unresolved, retains lock/marker and never resubmits
ok 98 - channel loss during-query stops unresolved, retains lock/marker and never resubmits
  ---
  duration_ms: 2.0832
  type: 'test'
  ...
# Subtest: channel loss after-commit stops unresolved, retains lock/marker and never resubmits
ok 99 - channel loss after-commit stops unresolved, retains lock/marker and never resubmits
  ---
  duration_ms: 2.1148
  type: 'test'
  ...
# Subtest: channel loss during-postflight stops unresolved, retains lock/marker and never resubmits
ok 100 - channel loss during-postflight stops unresolved, retains lock/marker and never resubmits
  ---
  duration_ms: 2.3234
  type: 'test'
  ...
# Subtest: live channel allows one simulated submission with provisional receipt status only
ok 101 - live channel allows one simulated submission with provisional receipt status only
  ---
  duration_ms: 2.9377
  type: 'test'
  ...
# Subtest: real harmless child verifies two fresh challenges over its original inherited IPC channel
ok 102 - real harmless child verifies two fresh challenges over its original inherited IPC channel
  ---
  duration_ms: 108.3142
  type: 'test'
  ...
# Subtest: worker keeps IPC through final result; no reconnect/PID fallback and sole supervisor release remain
ok 103 - worker keeps IPC through final result; no reconnect/PID fallback and sole supervisor release remain
  ---
  duration_ms: 2.166
  type: 'test'
  ...
1..103
# tests 103
# suites 0
# pass 103
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 969.996
```

</details>
