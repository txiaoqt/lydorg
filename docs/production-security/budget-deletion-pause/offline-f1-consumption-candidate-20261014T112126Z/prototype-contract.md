# Synthetic F1 contract and limits

**NON-RUNNABLE — NOT AUTHORIZED. This document grants no authority.**

## Binding and dispatch order

The unique filename derives only from canonical authorizationReference, the fixed synthetic project and fixed purpose. All three are exact ASCII synthetic values. Input aliases, extra fields, getters, invalid hashes and ambiguous timestamp strings are rejected before fixture access. The entire context, including nonce/hash/bundle/timestamps, has a separate digest. Those mutable bindings never select a fresh key.

A new invocation is one-use in memory even if it stops. Its only observation is a hard-coded in-memory stub; callers cannot provide a network callback. The sequence is:

1. Validate synthetic scope and options; admit the disposable fixture descriptor/root.
2. Open one consumed-<key>.f1 using wx. Existing entries of any content fail closed. Existing contents are not parsed into recovery permission.
3. Write the complete synthetic consumption bytes; acknowledge file sync; close once; admit the fixture again; check ordinary-file type, identity/size and exact readback bytes.
4. Only then call the memory observation once. It may return synthetic success or throw a deliberately uncertain synthetic outcome.
5. Retain consumption on success or failure. No runtime unlink, rename, truncate, retry, resume, repair or alternate route exists.

The snapshot recordCreated flag means creation was acknowledged by this process. A false flag is not proof of authoritative absence. fileSyncAcknowledged means the file-sync call returned, not that directory entries or storage survive power loss.

## Failure behavior

| Point | Observation | Record behavior |
| --- | --- | --- |
| Invalid synthetic binding / unadmitted fixture | Zero | Stop; no grant or live authorization is inferred |
| Existing empty, partial, malformed, conflicting, matching or forged-not-sent entry | Zero | Preserve existing entry; no content can confer resume permission |
| Creation acknowledged, then write/sync/close/readback stops or is uncertain | Zero | Retain partial/complete entry; object cannot rerun; later processes deny the surviving key |
| Abrupt process termination after empty creation, partial write, sync or verification | Zero at the tested checkpoints | Surviving entry denies restart in the observed local fixture tests |
| Observation dispatched, response unavailable or uncertain | At most one stub call | Retain entry; fresh invocation/process denies another call |
| Abrupt termination at/after stub dispatch | One stub call at the tested checkpoints | Retain entry; fresh process denies reuse |
| Synthetic success | One stub call | Entry remains consumed permanently within the fixture lifecycle |
| Creation outcome uncertain with no surviving entry, or loss/replacement/deletion of consumption | Not established across recovery | BLOCKED; a standalone surviving-file test cannot establish permanent burn when the durable evidence is absent |

There is no automatic retry or recovery path for a stopped result. The protocol's tested cross-process exclusion depends on the entry surviving. A process-local flag cannot distinguish a first invocation from a restart after an uncertain write left no entry. This package does not solve that storage uncertainty by writing a second marker, retrying, silently accepting absence or preparing live authority. A stronger reviewed ledger, or proven storage semantics plus an independently reviewed admission/recovery rule, is needed before any general permanent-consumption claim.

## Actual fixtures and teardown

Tests use newly created ytrace-f1-synthetic-* directories under an explicitly selected temporary parent inside the authorized workspace. Their .fixture-scope is only a random disposable-fixture descriptor, not authorization. All operation files have the consumed-<hash>.f1 name; no authorization.json, proof, approved-preflight, operation lock, installation attempt or preflight-evidence file is created.

The synthetic child has one IPC command, no arbitrary executable/SQL/URL/project options, a bounded watchdog and an in-memory observation only. Parent tests collect IPC counters, wait for owned child handles to close and inspect their own synthetic records. No PID recycling is forced or claimed. The child’s closed protocol is not the production supervisor/native-child boundary.

The fixture harness exposes teardown to the test owner only. It first admits the exact disposable root/descriptor, checks an allowlist of regular file names, then unlinks those exact synthetic files and removes that root non-recursively. Teardown runs after assertions and after child termination; it is never invoked by the operation as recovery. Deliberately erasing fixture state outside that protocol is outside the cooperative test model, just as a hostile administrator erasing all trust state is outside a single-file guarantee.

## Evidence matrix

| Property | Status and evidence |
| --- | --- |
| Stable key across nonce/proof/bundle/time changes | PASS: pure binding and file/real-process denial tests |
| No dispatch before record creation/write/sync/readback | PASS: code order, checkpoint assertions and pre-dispatch termination tests |
| Concurrent create-new collision exclusion | PASS for observed fixtures: 40 invocation objects and six real Windows children per timezone run; one stub dispatch |
| Process restart/abrupt termination with surviving entry | PASS for observed local fixtures: six termination checkpoints and fresh child reuse denials |
| Partial/malformed/conflicting/uncertain-present state retention | PASS for tested seeded states and injected failure/transport outcomes |
| General Windows namespace atomicity, reparse/handle-sharing/ancestor race defenses | BLOCKED: no adversarial Windows primitive proof, alternate filesystem or hostile path tests |
| Power/storage-loss durability and uncertain-create/absent-entry permanent burn | BLOCKED: no power-loss test, directory-entry durability proof or stronger ledger |
| Effective ACLs, ownership and hostile-operator protection | BLOCKED: no ACL or ownership security test; no ACL settings were changed |
| Original process-incarnation ownership | BLOCKED: no lease/incarnation enforcement or PID-recycling test |
| One upstream MCP/service request | BLOCKED: no actual transport; the proven boundary is one in-memory callback, not upstream network behavior |
| Multi-host uniqueness | BLOCKED: a local disposable file is not a shared durable ledger |
| Production freshness/approval/TLS/catalog/inventory checks | NOT EXECUTED / out of scope: no live runner or wrapper integration |

## Relationship to earlier work

A future real consumption record would add a protected-state write before the scoped observation, changing the earlier operation order. This offline prototype authorizes neither that write nor any other protected-state operation. It leaves the reviewed candidate/native runner/SQL/fixed validator and the F2/F3 blockers unchanged. No continuation or Decision B authorization is prepared.
