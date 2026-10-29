# Offline F1 consumption prototype — implementation and evidence

**NON-RUNNABLE — NOT AUTHORIZED. Offline implementation evidence only.**

## Result and scope

An isolated synthetic prototype was prepared for independent offline review. Focused validation passed with the explicitly stated fixture/durability limits below. This is not an independent review of the new candidate and does not establish production readiness or authority for Decision A, Decision B or any protected-state operation.

The only observation implementation is a hard-coded in-memory stub. There are no Supabase/network imports, external provider callbacks, real project identities accepted by the prototype, native-runner/wrapper imports or live CLI modes. The IPC-only child is a harmless test fixture. No production runner, ACL helper, preflight, SQL, installation or reconciliation mode was run.

## Reference admission and preservation

Before relying on the inputs, their actual bytes were read and verified. The prior bundle was recomputed from the exact manifest bytes and actual seven code identities in manifest order. The prior inventory/report and all referenced candidate files matched; 226 unique existing files, including the previous identity-gate and renewed review reports, are pinned for preservation.

| Reference | Verified identity |
| --- | --- |
| offline-remediation-design-20261014T102324Z bundle | 2dee359e3029a4cca9cc59bc9aafa26f52af90005d599bbffa20e400354e0159 |
| Its reviewed-inputs.json | 0f911de82cf1daa3dffeceb63a75745e934769cae37b27b5494920f4f65d3749 |
| Its candidate-artifact-inventory.json | 18cf7b444d6b9982616ddf986562fda37fa8bbe9fdc8e4be4d4ce950732fbd02 |
| Its remediation-report.md | e9b1ef2533777c020b4242a7808b021b00470fd2a6e17d9ef5863e5c1d79bc39 |
| Its f1-design-options.md | af6a47eada2db5dc637ce3b1845cdbc8c7ee78a50412400dc4b657b1ed78f5bf |
| independent-renewed-remediation-review-20261014T111000Z.md | eac7ae7b1fd94f95bfa5d38f7184a9553178dbd1377745d87207b437714b4018 |
| Prior identity-gate report, independent-remediation-review-20261014T105254Z.md | 37b17ee9fe5ed6cf3f5dbf0344872d0db77af3b5346e914621422cecd73fdb30 |
| Unchanged historical SQL, 11,945 bytes | a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Unchanged dedicated inventory verifier | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |

All prior candidates, review reports, SQL, manifests, historical test evidence and the dirty worktree remain unchanged. No previous identity is relabeled or superseded as a live reviewed adapter. This new package has its own offline-only identities.

## Prototype design

The stable key is SHA-256 of a fixed-order encoding of canonical synthetic authorization reference, project and purpose. The context digest separately includes nonce, opaque proof hash, bundle and timestamps. Changing those mutable inputs cannot select a second filename. A different actual synthetic authorization reference selects a different grant; case/whitespace aliases and alternate project/purpose are denied.

Each invocation becomes one-use before any file operation. It admits only a newly created disposable fixture, then opens consumed-<key>.f1 with wx. Any existing entry denies access without parsing contents into permission. It writes the minimal synthetic consumption record, waits for file sync, closes once, rechecks the fixture and verifies file identity/size/bytes. Only successful completion of that sequence can reach the one memory observation call.

Empty creation, partial write, write/sync/close/readback uncertainty, unsuccessful observation and success retain the consumption entry. The operation has no record deletion, overwrite, rename, retry, repair or resume path. The test harness alone tears down its own disposable directories after assertions and child termination; this is not operational failure recovery.

The prototype does not perform real human-approval validation or production freshness/UTC-window enforcement. Its fictional 2031 timestamps are exact schema and digest-binding inputs, not real authority. No authorization fields are populated for production.

## Source identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| synthetic-f1-core.mjs | 3555 | e124bdc8a9774d5b2a2b0b87e25b8464a30907b743210c360fd844db1ca90f8e |
| fixture-harness.mjs | 4745 | 1db68e1dd61b8eec26e65bed2b6fa4d68e3e10a040d62e1da40c1690409aa134 |
| disposable-ledger.mjs | 5062 | 2e1c0d442cc46ea026e12bfc29ac7dcc8ec1c0546fc9a5ff1bf70e08d8e0d63c |
| synthetic-child.mjs | 1410 | a098d179bb21c17a5d9b078f099ad4be3afabf9222b8820204f6d6ee0466cc03 |
| synthetic-f1.test.mjs | 12982 | 8122cb542b5f127c3a69d576ea1b40a9548b30fbfd7d9aef374934f06d38f4c8 |

The input manifest pins these code files, test logs, accompanying design documents and all 226 prior preservation references. The complete inventory lists every package file except itself; its own hash is returned externally. No circular self-hash is used.

New bundle SHA-256: 3f29f3740e67de4bb0b8b407421fb12a8a80fcda083e96f79e6c54bdc37181c7  
New input manifest SHA-256: de9c9591433d6f687d0db6985061d98065fc164799a95b43b9c060d381c988be

The bundle is SHA256 of UTF-8 JSON.stringify({manifestSha256,codeHashes}), using the actual code identities in manifest order. The report and inventory identities are recorded externally and in the inventory where non-circular.

## Focused validation actually executed

Imports and test execution paths were inspected before execution. Only Node standard modules and these five local synthetic files are imported. No private environment is read or inherited. The test process receives literal SystemRoot/WINDIR, selected TZ and an explicitly selected disposable TEMP/TMP parent. The harmless children receive fixed system variables and that synthetic temporary parent only; they do not inherit credentials or Node/PG/TLS overrides. Parent TZ was tested in Asia/Manila and UTC; child TZ is the OS default, not a separately tested timezone matrix.

Toolchain: Windows Node v24.21.0, verified with --version. Five source files passed --check. Exact test arguments were --test-concurrency=1 --test-reporter=tap --test followed by this candidate's absolute synthetic-f1.test.mjs path. cwd was the repository root; shell=false, windowsHide=true, timeout=30,000 ms, maxBuffer=1,048,576.

| Validation | Asia/Manila | UTC |
| --- | ---: | ---: |
| Initial default-user-Temp run | 12 passed / 35 failed | 12 passed / 35 failed |
| Workspace-disposable-Temp run, identical code | 47/47 PASS | 47/47 PASS |

Both initial runs failed at mkdtemp with EPERM before fixture creation, consumption or observation. No permission/ACL setting was changed and no elevation was attempted. The same source was rerun using a newly created disposable temporary parent inside the authorized workspace. Both initial failed TAP outputs are preserved separately; no failure was hidden or overwritten.

Both passing runs exited zero with empty stderr and zero failed/cancelled/skipped/todo cases. Their explicit status/assertions, not exit zero alone, established the synthetic test results. No historical SQL, frontend, wrapper or native suites were rerun. No Linux compatibility is claimed.

Coverage actually reached:

- Strict synthetic scope/context schema and timestamp encoding; canonical stable-key/different-context binding.
- No dispatch before complete file-sync/readback admission; one-use object behavior.
- Forty concurrent invocation objects and six real Windows child processes racing one key: one stub call.
- Existing empty, partial, malformed, conflicting and forged-not-sent entries: zero calls, unchanged bytes.
- Eight deterministic failure points after create/write/sync/close/readback: retained entry, zero calls, no object/fresh-object retry.
- Two uncertain transport outcomes: one memory call, retained entry, no subsequent object dispatch.
- Fresh process after success; fresh process after uncertain transport; nonce/proof/bundle/time changes from fresh processes.
- Actual child termination after empty creation, partial write, acknowledged sync, verified readback, stub-call entry and stub acknowledgment. Each restart denied reuse of the surviving record. Termination before dispatch burned the allowance with zero observations.

Across each passing timezone run, 29 harmless child processes were used, including six intentionally terminated checkpoint children. No actual Windows PID reuse, original-process incarnation proof or real network observation was attempted.

### Exact test evidence

| Log | Bytes | SHA-256 |
| --- | ---: | --- |
| focused-tests-initial-temp-blocked-asia-manila.tap | 54868 | 129c98bf5b7db9f761d469fc50b1de0c568a341a3fca5500d8c09998cd972019 |
| focused-tests-initial-temp-blocked-utc.tap | 54868 | c318afe459c1c959e6b726cab330e8ad4aad9f74fc565e90fc96d1a1ed453b6a |
| focused-tests-asia-manila.tap | 9568 | 1308e2ee0e2875e72aeb4ef79599932024387e22d201ceb82090b1d6a67cbbee |
| focused-tests-utc.tap | 9570 | 78e69c51c6d53a3538803d91b0c26bdadc20493e331cc5f477eae9b44f9a7a37 |

## Limitations / blocked guarantees

See prototype-contract.md for the full evidence matrix. These are actual remaining limits, not completed security properties:

1. The cross-process claim is demonstrated only for surviving entries on the tested local Windows fixture filesystem. General Windows namespace atomicity, hostile path/ancestor/reparse/sharing races and alternate filesystems remain BLOCKED pending suitable adversarial primitive tests.
2. File sync acknowledgment and process termination/restart are not power/storage-loss durability. Directory-entry persistence and record survival after dispatch remain BLOCKED pending stronger filesystem/ledger evidence.
3. An uncertain creation outcome with no surviving record cannot be distinguished from first use by this file-only prototype. A fresh open can succeed when no entry exists. Permanent burn across that missing-evidence scenario is therefore BLOCKED; it requires a stronger reviewed ledger or admission/recovery mechanism. This limitation is not permission to retry a stopped live operation. No automatic retry or recovery is implemented here.
4. Effective ACLs, trusted ownership and hostile-operator safety remain BLOCKED; no ACL change or ownership-security test occurred. Fixture descriptors and path checks are not substitutes for a protected Windows trust root.
5. Original-process incarnation ownership remains BLOCKED. Cooperative child handles and one-use closures do not prove security against PID reuse or an adversarial process.
6. One upstream request remains BLOCKED because only an in-memory callback exists. Real MCP transport retry/dispatch semantics were neither accessed nor assumed. Multi-host uniqueness also remains BLOCKED.
7. F2 real provider/Windows archive guarantees and F3 actual fixed native-child/deadline/output/lifetime boundaries remain separate unresolved work. The original validator, native runner, TLS/CA/freshness/catalog/preservation guards were not modified or invoked.

The future real design would add a protected consumption write before the observation and amend the previous operation order. That change still needs separate design review and additional authority; this package creates no such authority and no continuation proposal.

## Disposable state and worktree preservation

All test state was newly created under .agent/f1-synthetic-scratch-20261014T112126Z/ in unique ytrace-f1-synthetic-* children. The operation files were synthetic consumed-<hash>.f1 entries and .fixture-scope descriptors only. No authorization.json, proof, approved-preflight, operation lock, installation attempt or preflight-evidence file was created.

The fixture teardown checked each exact owned disposable root and allowed regular filename before unlinking only those synthetic files. No recursive delete was used. After tests, the scratch base was verified empty and was removed non-recursively after absolute workspace-boundary and non-redirect checks. Prior evidence was never cleaned up.

| Checkpoint | Branch / HEAD | Dirty tracked | Staged | Untracked |
| --- | --- | ---: | ---: | ---: |
| Start | ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8 | 68 | 0 | 3,853 |
| New package outputs created | same | 68 | 0 | 3,867 |

The only additions are the 14 files in this new candidate directory. Excluding that prefix reproduces the exact starting Git porcelain SHA-256: 01483357577780cff172cec245e6d786f9e771f309653cd3bfc52a6d5ffb1948 (UTF-8 lines joined LF, no terminal LF). Existing reference inputs were hash-checked again after the tests; final preservation/complete-inventory checks are returned with the external report hash. No existing candidate, report, SQL, historical log, pagination, frontend, Storage or unrelated source was edited, staged, reset, moved or removed.

## Boundary confirmation

No Supabase/MCP/network/PostgreSQL/TLS request, protected-state/proof/credential/CA/private-environment access, ACL-helper/production wrapper/native runner/preflight/install/reconciliation mode, production write, authorization binding, migration, deployment, Git stage/commit/push or Decision B preparation occurred.

**Offline prototype evidence only. Independent review is still required. Live guarantees and execution remain BLOCKED / NOT AUTHORIZED.**
