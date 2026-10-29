# Offline F1 durable-consumption prototype

**NON-RUNNABLE — NOT AUTHORIZED. Offline implementation evidence only.**

There is no production-capable entrypoint, provider, approval, protected-state binding, Supabase transport or native-runner integration. The executable tests and IPC-only child are disposable synthetic fixtures, not a live execution route. Do not use this package for Decision A or Decision B.

## Scope

The prototype binds one synthetic authorization reference plus one fixed synthetic project and purpose to a create-new consumption key. It creates/writes/syncs/closes/verifies that record before a hard-coded in-memory observation stub can run. A surviving record of any content denies every new invocation, including matching, conflicting, empty, partial, malformed and forged-not-sent states. No existing record can authorize resume.

Only OFFLINE-PROJECT-ALPHA, OFFLINE-OBSERVATION-V1 and canonical SYNTHETIC-AUTH-* references are admitted. Nonce, proof-hash, bundle and timestamp changes affect the context digest but cannot create another allowance for the same key. The hashes are synthetic opaque values, not proof contents or authorization bindings. Synthetic timestamps are schema/binding inputs; this package does not implement real human-approval admission or the production freshness wrapper.

## Files

- synthetic-f1-core.mjs: pure synthetic binding and fixed diagnostic codes.
- disposable-ledger.mjs: disposable create-new/sync/readback and one-use in-memory observation.
- fixture-harness.mjs: isolated temporary-root admission, synthetic seeding/inspection and test-owner teardown.
- synthetic-child.mjs: one-message IPC-only harmless child; no CLI modes or external transport.
- synthetic-f1.test.mjs: focused offline binding, concurrency, restart, crash, partial-state and uncertainty tests.
- prototype-contract.md: exact guarantee, assumptions and unresolved properties.
- remediation-report.md: verified references, results, identities and preservation accounting.
- reviewed-inputs.json and candidate-artifact-inventory.json: byte/hash traceability; neither is authorization.

## Observed validation

Windows Node v24.21.0: five syntax checks passed. All 47 tests passed with Asia/Manila and UTC in the parent test processes. Real disposable children raced one key and were terminated at six checkpoints; fresh processes then denied reuse. Observations were memory counters only.

The initial runs failed at mkdtemp with EPERM in the default user Temp directory (12 passed, 35 failed per run). Both failed logs are preserved. With the same unchanged source, a new disposable temporary base under the authorized workspace was used; both subsequent 47/47 runs passed. No assertions were weakened. All test-owned fixture files were removed only by isolated teardown after their retention assertions; the empty scratch base was then removed non-recursively. No protected directory was accessed.

## Unresolved properties

The finite local Windows fixture results are not general Windows atomicity, adversarial path/reparse safety, ACL/ownership safety, power-loss durability, process-incarnation ownership or one-upstream-request evidence. Those guarantees remain BLOCKED. See prototype-contract.md for the uncertain-create/absent-entry limitation. The earlier F2/F3 integration blockers remain unchanged.

No continuation authorization, installation binding or live command is included. The next gate is independent offline review of this candidate and its stated limits, not execution approval.
