# Independent offline review — trusted-I/O integration candidate

## Verdict: BLOCKED

The supplied artifact identities and offline test counts are reproducible. The candidate accurately labels its real I/O integration as unimplemented and blocked. It is not ready for a continuation authorization: the one-observation scope is not enforced across invocations, Windows archival and native-child behaviors are unimplemented, and a full positive path through the fixed validator is missing. This review also reproduced a typed-error-code sanitization gap with synthetic data.

This is review evidence only. It grants no Decision A execution authority, Decision B authority, installation authority, protected-state authority or production-readiness claim. No fixes or new candidate were prepared.

## Scope, method and exact identities

Reviewed exact directory:
C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/

The source, complete focused test, boundary contract, candidate report, manifests/inventory, earlier authorization proposal, referenced wrapper/independent review and relevant native-runner/core/ACL/environment-loader source were inspected locally. The candidate report/logs were treated as claims. All 200 manifest preservation references and all nine candidate files were independently hashed; 209 unique existing files matched their recorded size/SHA-256. Paths were checked to remain in the repository; no protected-state, credential, proof, CA or private environment file was opened.

| Artifact | Bytes | Recomputed SHA-256 | Result |
| --- | ---: | --- | --- |
| Candidate bundle, derived from actual manifest and code identities | n/a | a52dd7ebdfa1b99bcbc5915992025e2f906fe59fe22febd80e40b681b15aa47a | PASS |
| reviewed-inputs.json | 42,928 | c4dcd431e0eba49ff0df4014902c4cb3a3451d50b4eedca36f1351ebef2c567f | PASS |
| candidate-artifact-inventory.json | 1,638 | 104ec2876054a533a4500754ed70f99ed99811912347a5b14d427cff66dfc1bc | PASS |
| integration-review.md | 17,355 | 0217be6dd5527ef72122ebb0042cc7a985033c1ab962211bda4760c6ef033cae | PASS |
| integration-engine.mjs | 15,646 | 6c9837931ff3fc37b380233feda261f7b65e698035a65e92d1d4539a2c2175e0 | PASS |
| trusted-io-integration.mjs | 1,004 | 3cf14f82c5e393b340758abc090c8e74db10869253696fa73126d72f08b3f19c | PASS |
| trusted-io-integration.test.mjs | 23,246 | a1739d35e8328dabfb3c46accd0bc849778fb352d26877cc4bb7c5d402c53044 | PASS |
| io-boundary-contract.md | 8,462 | 30e7690f624d288b6b325b6fb9b337c899885f376a07a23b5c27777bb7a5a94e | PASS |
| Original Asia/Manila log | 4,746 | ba86721ba7f3414b43df03543ed90075858c30094444ba48b13c0478be9a4384 | PASS |
| Original UTC log | 4,739 | b17c5c0581e824ab74ec96602da25faebf188b431095bfc0dc91354c420130db | PASS |
| Historical SQL, not executed | 11,945 | a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a | PASS |
| Dedicated inventory SQL, not executed | 13,902 | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 | PASS |

Bundle derivation was independently recomputed as SHA256 UTF-8 JSON.stringify({manifestSha256,codeHashes}), using the actual manifest bytes and actual code-file sizes/hashes in the recorded order. The inventory contains the other eight candidate artifacts and excludes itself; the directory contains exactly those nine files. All manifest code/review-artifact entries agree with the inventory.

The referenced wrapper bundle was independently derived as af8a4299c476969df5259889f69041ac855df528644fb54c0a37e15b72caceca and native bundle as f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84. The native manifest retains eleven pinned inputs and 138 driver files; the driver's inventory SHA-256 is 08b98ef8f7b3bba88c947bebededda974e18940645a9f2b61f2de7a050dfd736. Their individual local identities matched. The three Decision A package document hashes remain b8ef01fcba83505b9b98674c774a2938d073b115db01c743794122be41ef4de4, 298cbdee4f8d7605422a9a5b7b30152b1118a3df246e329d6980f288f50626a2 and ffd927475248fa88121c05def71bfc0e842d8454b58db107492b93ceb087d9c5.

## Source evidence key

Line numbers below refer to these exact hash-verified local files:

- E: [integration-engine.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/integration-engine.mjs>)
- T: [trusted-io-integration.test.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/trusted-io-integration.test.mjs>)
- F: [trusted-io-integration.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/trusted-io-integration.mjs>)
- D: [deadline-controls.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/outer-preflight-wrapper-candidate-20261014T054751Z/deadline-controls.mjs>)
- W: [preflight-wrapper-engine.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/outer-preflight-wrapper-candidate-20261014T054751Z/preflight-wrapper-engine.mjs>)
- V: [preflight-evidence.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/outer-preflight-wrapper-candidate-20261014T054751Z/preflight-evidence.mjs>)
- N: [native-budget-pause-runner.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs>)
- C: [budget-runner-core.mjs](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/budget-runner-core.mjs>)
- P: [authorization-proposal.md](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T044128Z/authorization-proposal.md>)

Severity ranks below concern prerequisites for a future continuation. They do not assert an existing production exploit or a live test failure.

## Findings ranked by severity

### F1 — High / continuation blocker: archive CAS does not enforce the one-observation authorization

Evidence: E:88–96, 141–159 and 175–176; T:90–105 and 336–354; P:52, 56, 58, 60 and 62.

The consumed flag and port counters exist only inside one engine object. Two distinct engine objects, processes or restarts have separate counters. Critically, getProject is dispatched at E:159 before the possible archive claim at E:176. T:343–354 deliberately places two invocations at an archive barrier and asserts two observations, one archive and one modeled preflight.

**Yes: those two observations conflict with the earlier one-observation scope if performed under the same human authorization.** A losing invocation returning BLOCKED does not undo its already completed observation. The modeled CAS constrains the later archive/preflight sequence for a shared exact stale-proof binding; it does not protect the whole operation, consume a human authorization before its first observation, or establish restart safety. The coordinator also receives approval strings and a stale-proof binding separately; no durable authorization-bound consumption record exists.

The candidate report discloses this limitation correctly. Do not convert the successful race test into compliance with the full one-operation scope.

Required resolution: separately review invocation ownership/consumption before the first observation, concurrent and restart/crash behavior, and binding of the entire operation to one authorization and proof identity. A durable guard created before the observation would add a protected write and change the earlier fresh-identity-before-write sequence; it would require separately reviewed amended scope/sequence and explicit additional authority. No such guard or authority is prepared here.

### F2 — High / continuation blocker: trusted providers and real Windows archive semantics are absent

Evidence: E:36–39, 57–76, 84–87 and 175–198; T:75–117; io-boundary-contract.md, “Required port implementations — all absent.”

The source receives callbacks. Its checks validate their claimed booleans/hashes/metadata; they do not perform Supabase MCP, filesystem, ACL, environment loading, CA validation or archive operations. The existing native runner contains reviewed connection/ACL/environment code, but no new integration binds all those real capabilities to this coordinator.

The only archive implementation exercised is a JavaScript Map compare-and-swap at T:96–105. No Windows rename primitive, concurrent destination creation, held-handle path identity, reparse/junction defense, owner/DACL enforcement, creation/last-write preservation or real partial-I/O failure is exercised. Claiming sameDirectory/noOverwrite/noRedirect/noTimestampReset in a receipt cannot establish any of those OS properties.

Required resolution: separately implement and review the real providers, including a genuine atomic same-directory no-overwrite primitive, source/destination identity checks at the operation boundary and afterward, safe root/ancestor/ACL verification, no copy/delete fallback, and preservation on partial/uncertain failures. Disposable Windows tests may establish those OS properties later; current in-memory tests do not.

### F3 — High / continuation blocker: fixed launch specification is not an implemented child-process boundary

Evidence: E:26–34, 141–148 and 200–206; T:118–131, 285–303 and 368–400; W:45–63.

The immutable launch specification pins Node v24.21.0, the fixed repository cwd, the unchanged candidate runner, the existing environment-file argument and --preflight. A changed wrapper mode/project/host is rejected, and a second native callback dispatch is blocked. This is valid offline binding evidence.

There is no native spawn provider in the candidate. The pre-callback deadline gate cannot establish when a future provider actually spawns after its own asynchronous preparation. No live-child output ceiling, process-tree handling, cancellation, kill/settlement behavior or hang deadline is implemented. T:285–293 throws plain Errors after a fake launch; those cases do not exercise a real timeout or cancellation. A never-settling callback would remain awaited rather than returning a bounded stopped outcome.

The wrapper caps parsed child-result text at 16,384 characters, but that is not a real producer/stdout/stderr memory limit. Real output collection remains unimplemented. The Node process used by the reviewer to execute tests was real; the candidate's native launch callback and all its child behaviors were stubs. No native runner child was started.

Required resolution: review the actual fixed spawn/environment binding, a final deadline check at the actual spawn boundary, bounded lifetime and output handling, deterministic stop/retention on timeout or ambiguity and no relaunch. Preserve the native direct-TLS/driver and endpoint gates.

### F4 — Medium / continuation blocker: complete positive acceptance does not reach the fixed validator in tests

Evidence: F:6–12; T:23–55, 142–145, 150–162 and 355–360; V:65–120; W:65–92.

Static wiring is correct: the public integration fixes createPreflightWrapper, whose public facade fixes validateReviewedPreflightEvidence. It does not accept a caller-supplied replacement through that public facade.

However, every successful protocol test constructs the internal engine with fakeReviewedWrapper. That fake validates a synthetic array of 57 integers and summary counts, then supplies success flags. The public-facade test checks rejection of replacement options; it never runs a full positive public path. Thus 56 passing tests do not demonstrate matching real-shaped child output, durable evidence structure, ACL receipts and raw function/catalog/preservation evidence through the unchanged fixed validator.

The actual validator statically retains strict checks: pinned reference bytes, proof/result/bundle/capture-time/TLS binding, raw function/catalog/owner/grants, exact 57 inventories, foundation structure/state and document/containment protections, migrations, policies and Storage count. The candidate report accurately discloses the positive coverage gap.

Required resolution: add a safely synthetic complete production-shaped positive case through the fixed validator plus targeted drift/incomplete/mismatched evidence negatives. This review does not run the real wrapper or invoke any live runner mode.

### F5 — Medium / additional finding: typed error codes are echoed without a safe-code boundary

Evidence: E:244–252, D:2–6; T:285–293; W:94–99. Independently reproduced with the memory-only probe below.

The catch path substitutes a stable reason for an ordinary Error, so the suite's plain-Error canary is suppressed. A WrapperFailure instead returns error.code directly. The class accepts an arbitrary code without validation; the coordinator does not require a bounded known-safe string or redact it. A synthetic trusted port throwing WrapperFailure('SYNTHETIC_TYPED_ERROR_CANARY') returns that exact value in the result.

This is not an observed credential disclosure: no real provider or secret was used. It means the claim of sanitized errors depends on all trusted providers placing only safe constants into that class. The current generic-error canary tests do not establish safety for typed errors, and the candidate documentation does not state or enforce a code allowlist.

Required resolution: separately review and enforce stable sanitized error codes at provider/coordinator boundaries, including typed errors, and cover those cases with synthetic canaries. Do not log dynamic provider errors under a trusted-code label.

## What is proven, modeled and untested

| Property | Independent review result |
| --- | --- |
| Supplied four identities, nine candidate files and 200 references | PASS — independently recomputed, including wrapper/native bundle derivations |
| Existing focused test claims | PASS — 56/56 reproduced in Asia/Manila and UTC |
| Strict explicit-offset parsing, UTC window ordering, nonfuture 0–300-second proof age | PASS offline source/model; no current proof or approval checked |
| Async deadline crossings and zero-exit/PASS-label rejection | PASS modeled cases; real child timing is untested |
| At most one launch/call budget in one engine instance | PASS modeled; not authority-wide or durable |
| Full one-operation scope across invocations | BLOCKED — two observations are explicitly reproduced by the race test |
| Archive/create sequencing and partial evidence retention | PASS in memory; Windows atomicity/ACL/metadata/durability untested |
| Fixed native mode/endpoint specification | PASS static; actual provider/spawn/secure environment unimplemented |
| Complete fixed evidence validator | PASS static wiring/guards; full positive integration untested |
| Error sanitization | Ordinary Error canary suppressed; typed-code echo reproduced |
| Fresh TLS/project/catalog/data preservation | NOT VERIFIED — prohibited live checks were not attempted |
| Decision A continuation / Decision B / installation | NOT AUTHORIZED |

No evidence in this review establishes current production PostgreSQL version, permissions, current 57 fingerprints, 164 migrations, 15 policies or 378 objects. Those numbers remain expected preservation gates in source and historical references.

## Independent test execution and reproducibility

The entire focused test source and import path were inspected before execution. It has no filesystem/process/environment/network provider implementation. Its state uses synthetic in-memory Maps and fixed 2031 timestamps. Transitive core modules import filesystem helpers as definitions, without import-time I/O; no such helper was called. The executable native runner, ACL helper, pg driver, real wrapper run method and any protected state were not invoked.

Toolchain: Windows Node v24.21.0, verified with --version.

Exact focused-test invocation:
- Executable: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe
- Arguments: --test-concurrency=1 --test C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/trusted-io-integration.test.mjs
- Working directory: the repository root.
- shell=false, windowsHide=true, timeout=30,000 ms, maxBuffer=262,144.
- Environment constructed from literal SystemRoot/WINDIR=C:\Windows plus TZ=Asia/Manila or UTC only; inherited credentials/private environment and environment files were not loaded.

| Review run | Exit | Tests/pass/fail | Skipped/cancelled | Stdout bytes | Stdout SHA-256 |
| --- | ---: | --- | --- | ---: | --- |
| Asia/Manila | 0 | 56 / 56 / 0 | 0 / 0 | 4,743 | 045f2d7ab0b264af0b7d2dc42261434583baea90006063a2160bd1ea663e9f00 |
| UTC | 0 | 56 / 56 / 0 | 0 / 0 | 4,739 | e308ddb1a70d4ed1f110d720f5ee5925da55a85fca72983a58fd22a5d2ffb528 |

Both stderr streams were empty. New raw outputs stayed in memory; no test-log artifact or prior log was overwritten. Exact output hashes differ from the original logs because durations vary; source/pinned identities and test outcomes reproduced. The existing .tap files actually contain Node spec output, as their report correctly notes. No historical suite or native test mode was rerun. Linux/real Windows native-child/protected-state/production coverage is not established.

### Additional memory-only typed-error probe

The inspected source below was supplied to the same Node executable with --input-type=module --eval, using the same minimal UTC environment. It imports definitions only, uses one synthetic failing callback, and does not construct or run the real wrapper. No fixture file or protected-state object was created.

```javascript
import assert from 'node:assert/strict';
import {createIntegrationEngine,PORT_NAMES} from "file:///C:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/trusted-io-integration-candidate-20261014T083531Z/integration-engine.mjs";
import {WrapperFailure} from "file:///C:/Users/Christopher%20x%20Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/outer-preflight-wrapper-candidate-20261014T054751Z/deadline-controls.mjs";
const instant=Date.parse('2031-03-01T00:00:00Z');
let calls=0;
const ports=Object.fromEntries(PORT_NAMES.map(name=>[name,async()=>{calls++;assert.equal(name,'verifyArtifacts');throw new WrapperFailure('SYNTHETIC_TYPED_ERROR_CANARY');}]));
const model=createIntegrationEngine({ports,makePreflight:()=>{throw Error('must remain unused');},now:()=>instant,monotonicNow:()=>0});
const result=await model.run({approval:{reference:'OFFLINE-INDEPENDENT-REVIEW',approver:'SYNTHETIC_REVIEWER',approvedAt:'2031-02-28T23:59:59Z',validityStartUtc:'2031-03-01T00:00:00Z',validityEndUtc:'2031-03-01T00:10:00Z'},expectedStale:{sha256:'a'.repeat(64),bytes:1,metadata:{createdAt:'2031-02-28T23:00:00Z',writtenAt:'2031-02-28T23:00:00Z',owner:'SYNTHETIC_OWNER',aclSha256:'b'.repeat(64)}},references:{}});
assert.equal(result.status,'BLOCKED');assert.equal(result.launches,0);assert.equal(calls,1);assert.equal(result.reason,'SYNTHETIC_TYPED_ERROR_CANARY');
process.stdout.write(JSON.stringify({typedCodeEchoReproduced:true,status:result.status,launches:result.launches,calls,syntheticOnly:true})+'\n');
```

Probe source: 1,601 UTF-8 bytes; SHA-256 5a8b2c33e079d14f7432ed7fa733e11c35e9ba9e5d1d22667306c0e2d6aa4727. Exit 0, empty stderr. Sanitized observed result: typedCodeEchoReproduced=true, status=BLOCKED, launches=0, calls=1, syntheticOnly=true. Stdout SHA-256: 5b1400a60c2516df65ed5970fd0ce5fcab1a653f06baab33c0daf4ade73864bf. This confirms F5 without any real secret or provider.

## Prerequisites before any continuation authorization could be proposed

1. Resolve F1 with a reviewed authorization-wide boundary before the observation, including concurrency, crash and restart behavior. Do not assume a later archive CAS can limit an earlier observation.
2. If the design requires a new protected-state write, change neither scope nor sequencing silently. Separately review the additional authority and amended operation order first. No such design is implemented or authorized here.
3. Implement/review exact scoped MCP, fixed-root filesystem/ACL, secure loader/CA and native-child providers; verify Windows semantics with disposable offline tests and retain uncertain/partial state.
4. Cover the complete positive fixed-validator path with production-shaped synthetic evidence and preservation-drift negatives; resolve the typed-error sanitization assumption.
5. Pin and independently review any resulting revised artifacts without overwriting or relabeling this candidate or historical evidence.
6. Only after the implementation/design gates are satisfied may a separate bounded continuation proposal name the exact then-current artifact identities, independently checked actual proof/archive binding, allowed evidence operations, original-observation freshness rules, UTC validity and one-attempt scope. The old window/proof and historical fingerprints are not fresh authority.
7. Fresh project/TLS/catalog/inventory verification would still need separately approved operations at execution time. Any unexplained drift must stop; no baseline adoption or retry is approved.

Decision B, SQL installation authorization/window, deployments, cleanup and broader changes remain entirely separate. This report creates no authorization template or bindings and requests no execution approval.

## Worktree and preservation

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused  
Branch: ui-refactor  
HEAD: 2f6e7427c553b7535f53860d1732b42df7c023e8

| Checkpoint | Dirty tracked | Staged | Untracked |
| --- | ---: | ---: | ---: |
| Review start | 68 | 0 | 3,836 |
| After hashing/source inspection/tests, before this report | 68 | 0 | 3,836 |
| Closing target, verified after this create-new report in the Codex response | 68 | 0 | 3,837 |

Before/after-test Git porcelain SHA-256 matched 801060a42c3df9fb4b8ff550e8a0155dac3aed227e7ca49c8febbc8b1aa87170 (UTF-8 lines joined LF, no terminal LF). Excluding this report alone must reproduce that digest at finalization. The sole addition is this timestamped Markdown independent review, created with exclusive wx semantics outside the candidate. No candidate, historical report/log, source, manifest, inventory, SQL, pagination, frontend or other existing file was edited, renamed or removed.

The report's own size/SHA-256 is returned externally to avoid self-hash circularity. All 209 inspected existing files are rechecked unchanged at completion.

## Boundary compliance

No protected-state access, proof/credential/CA/private environment read, Supabase/MCP/get_project, network/endpoint/TLS/PostgreSQL/database call, live wrapper/runner/helper/preflight/install/supervisor/reconciliation mode, SQL submission, ACL/policy change, authorization binding, proof/evidence/lock/attempt file, Git stage/commit/push, deployment or production operation occurred. Only local read-only inspection, inspected synthetic tests and this one create-new documentation file were performed.
