# Trusted-I/O boundary contract

**NON-RUNNABLE — NOT AUTHORIZED. Offline protocol model only.**

No real provider, CLI, continuation authorization, protected-state binding, or runnable preflight command is supplied. This document specifies requirements for a later independently reviewed implementation. It does not authorize a read, write, connection, or launch.

## Scope and fixed identity

The public facade fixes the previously reviewed wrapper; its internal test seam cannot be supplied through that facade. The fixed target is project `mqqaykksadotbrghbexz`, direct host `db.mqqaykksadotbrghbexz.supabase.co`, port 5432, database/user postgres, route `native-pg-direct-tls`. The only launch specification is the pinned Node v24.21.0 executable and unchanged native candidate in `--preflight` mode. Its existing environment-file argument is a constant specification; no private environment file is opened by this candidate or its tests.

The reviewed native bundle remains `f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84`; the corrected wrapper bundle remains `af8a4299c476969df5259889f69041ac855df528644fb54c0a37e15b72caceca`. The SQL is a pinned historical input only: 11,945 bytes, SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`. No integration change to these artifacts is required or permitted here.

## Required port implementations — all absent

Returned booleans are assertions at a trusted boundary, not proof that the corresponding real checks happened. A future implementation must establish each assertion independently and be reviewed before use.

| Port | Required implementation and bounded effects |
| --- | --- |
| verifyArtifacts | Recompute all wrapper/native bundle, manifest, inventory, SQL/verifier and transitive pinned-input identities. A supplied hash string alone is insufficient. Read local non-secret artifacts only. |
| verifyLocalSecurity | Verify the fixed protected root, owner/effective ACL, redirections and forbidden-state absence. Verify approved Node/driver, approved secure environment loader, privately available credentials, NODE_PG_FORCE_NATIVE absence even if empty, independently trusted CA provenance/hash/validity and required TLS/hostname settings. No Protect, ACL repair, credential disclosure, pooler or fallback. |
| inspectProof | Privately read only the specifically bound stale active proof; validate exact bytes/hash/five-field schema, metadata/ACL/root, and absent exact hash-named destination. No credential fields, secret output or writes. The second inspection is immediately before archival. |
| getProject | Use configured scoped Supabase MCP get_project for the exact project once per invocation. No broader credential or alternate API. Return exactly project, host, status, verifiedVia and original explicit-offset verifiedAt from the fresh observation. Timestamp receipt locally when the verified result is obtained, within the guarded call interval. No token inspection, copying or logging. |
| archiveProof | One same-directory, no-overwrite rename of exactly the bound stale proof to its exact hash-named leaf. Revalidate source and destination at the operation boundary; verify bytes, creation/last-write time, owner/ACL and no redirection afterward. Preserve OS-managed access time without resetting it. No replacement, restore, repair or retry. Atomic source/destination semantics require separate Windows review; not implemented. |
| createProof | One UTF-8/no-BOM five-field proof derived from that same observation, exclusive wx/create-new, sync and ACL verification. No overwritten proof or refreshed observation timestamp. Preserve any partial/complete output on failure. |
| readNewProof | Privately read back exact created bytes and verify root/file ACL and no redirection. No resetting timestamps or sanitizing a malformed proof into a valid one. |
| launchNative | Spawn the exact fixed executable/arguments/cwd once; no shell, argument/target substitution, reconnect or resubmission. Preserve reviewed secure loader, pinned pg driver and direct TLS controls. Preparation must finish before the final guarded spawn, or a separately reviewed recheck must guard the actual spawn boundary. Implement bounded child lifetime/cancellation and sanitized bounded output independently. A deadline label alone cannot stop a hung child. |
| readEvidence | Read only the exact generated safe evidence leaf under the fixed root; bounded regular-file bytes, no redirect. Two independently guarded reads must match. No enumeration, cleanup, copying to approved-preflight or writes. |
| verifyEvidenceAcl | Verify-only checks for that evidence file/root before and after its reads using unchanged reviewed ACL behavior and restricted child environment. No Protect, policy/ACL changes or alternative invocation. |

## Call sequence and time controls

1. Validate fresh human context, ordered explicit-UTC validity bounds and separately bound stale-proof metadata. Neither historical authorization reference is accepted as new authority.
2. Verify artifacts/local prerequisites and inspect stale proof/state.
3. Obtain one fresh scoped observation; require exact project/host, ACTIVE_HEALTHY, expected method and a nonfuture observation time within the call interval.
4. Immediately recheck the stale proof and destination; archive once.
5. Create one proof from the same still-fresh observation and verify exact readback/ACL.
6. Invoke the unchanged public wrapper, whose validator is fixed. Its guarded callbacks permit one fixed native launch, two matching evidence reads and two ACL verifications.
7. Independently require the complete reviewed result/evidence, then enforce the final deadlines before returning PASS.

All asynchronous ports have wall/monotonic checks immediately before and after awaiting them. Approval validity is enforced from the start. After the observation, its original timestamp governs the inclusive nonfuture 0–300-second proof age; the approved UTC end is an independent deadline. Regressing clocks, nonnumeric clocks, invalid explicit offsets and deadline crossings fail closed. Validation/read time counts toward completion. An asynchronous error stops rather than advancing or retrying. No actual cancellation implementation is included.

## Evidence acceptance and retention

The public facade uses the unchanged fixed evidence validator, not the synthetic test verifier. It requires a successful child result plus exact scope/bundle/proof/TLS identities, raw catalog and full function fingerprint, all 57 protected inventories against pinned references, foundation/document/containment protections, migration and Storage invariants, capture timing, two matching raw reads and ACL proofs. Exit zero or PASS alone is insufficient. Actual snapshots must match their applicable references; capturing data never approves drift.

The model returns sanitized stage/counters/codes on failure and retains evidence; it has no cleanup, rollback, rename-back, retry, rebaseline or repair port. Memory-copy zeroing is not evidence deletion. A partially completed archive/create/launch remains stopped and potentially uncertain. No automatically repeated observation, proof creation or launch is allowed.

## One-preflight boundary and residual gaps

One engine instance consumes its invocation even when blocked. A different object/process is not prevented by that memory guard. An exact hash-named no-overwrite archive might serve as a one-shot claim without an additional protected write, but the required real Windows atomicity has not been implemented or tested.

A two-instance in-memory CAS test permits one modeled preflight but two scoped observations. It proves neither Windows cross-process behavior nor a global single-observation boundary. Restart/crash/OS races remain untested. Review a real no-overwrite primitive and a controlled single-invocation design before use. If that cannot satisfy the scope, the integration remains BLOCKED; any additional durable lock/marker would require a separately reviewed design and additional protected-write authority. None is implemented or requested here.

A complete positive production-shaped test through the public fixed validator, real trusted providers, real child deadlines and Windows failure retention remain missing. No new continuation authorization should be prepared until the new candidate is independently reviewed and those design gaps are resolved.
