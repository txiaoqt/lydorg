# Offline outer preflight wrapper remediation report

Verdict: OFFLINE CORRECTION REVIEW PASS — not production readiness or execution authority.

## Scope and exact origin

The rejected wrapper was an inline PowerShell command, not a workspace file. The repository search found no saved copy. Its submitted text is preserved as rejected-inline-wrapper.ps1.txt: 1,885 UTF-8/LF bytes, no trailing newline; SHA-256 d2a6a7f93cbb8a8a4190583db2a8a44535164cd3b58f802d53c8ee3e01fec99a. This hash identifies the new transcript snapshot; no earlier disk-file hash or signed control-plane receipt is invented. The historical command was rejected before process creation and was not executed in this task.

Original defect: completion freshness was printed but not enforced, followed by exit using the child's code. A zero-exit child could therefore remain successful after either deadline.

## New code

Strict original ISO/nanosecond parsing and ordered explicit-UTC validity gates operate immediately before the sole launch, immediately after child completion and through final evidence validation. Nonfuture age is inclusive from zero to 300 seconds; validity start/end are inclusive. Missing/malformed/ambiguous values, exceeded bounds, clock regression or monotonic elapsed crossing fail closed with BLOCKED and exitCode 2. The first call consumes the wrapper object; there is no retry/refresh/repair/cleanup/relaunch route.

The public facade fixes the reviewed in-memory evidence validator. It requires matching reviewed result/scope/bundle/proof/CA/TLS, stable reread evidence and Verify-only ACL confirmations, original RPC/catalog/privileges, all 57 pinned preservation entries, foundation/document/containment state, migration history, policies and 378 objects. Nothing is accepted solely for exit zero or an embedded PASS label. No historical whole-state fingerprint is treated as current.

| Source/test artifact | Bytes | SHA-256 |
| --- | --- | --- |
| deadline-controls.mjs | 3482 | cf7c5a6a0542f219383159f02f34c3f7d5555ff80a5a8fe31ccdf8eba64600eb |
| preflight-evidence.mjs | 8186 | 6c1e7581a05975fc9c82d1f2987959272fb85410c7ec01912501bf6398ba9e97 |
| preflight-wrapper-engine.mjs | 6218 | d55edc561c5cacd6bae3befbd295795ca26408d515545ead175e7d41fe463f21 |
| preflight-wrapper.mjs | 665 | bd2fcef383f36eafaa1703945d823c34b356690c8b6337f0201ce00a4f85d4ce |
| preflight-wrapper.test.mjs | 20051 | 60ce2bd057faa0c31247f725d9e748d4530a195e6c54e1cfafa1221f84be2597 |

Bundle: af8a4299c476969df5259889f69041ac855df528644fb54c0a37e15b72caceca

Manifest: b36df23ff72ce16b49bb13157a2500365ac8fe0ba2d7030f7377ae1365b10f43; 36796 bytes. Bundle derivation is UTF-8 JSON.stringify({manifestSha256,codeHashes}) with the exact manifest codeIdentities array. Full inventory excludes itself; its hash is reported externally to avoid circular references.

## Independent review and retained intermediate

The first version 052849Z is preserved with all 14 files, its 78/78 logs, probes, original manifest/bundle and BLOCKED independent review. Its two findings were fixed only in this separate 054751Z version: prior-checkpoint wall/monotonic tracking, and strict numeric native/inventory fields before unchanged core normalization. An initial trailing-terminator suspicion was disproven by five synthetic pinned-Node probes and retracted; no parser change was made for it.

Independent re-review of this exact corrected version is PASS. The reviewer rechecked the manifest/bundle and prior-artifact preservation and inspected both 84/84 test logs, without rerunning tests or accessing any live/private environment. See independent-review.md.

One local create-new preparation guard stopped before any source was written to the new directory because a reused REPL writer retained the earlier directory/map binding. The new directory was verified empty and a separate directory-specific writer then created each source once. No existing file was overwritten, removed or relabeled; this was not a preflight or production retry.

## Validation

- Five new module/test syntax checks: PASS using pinned Node v24.21.0.
- Focused synthetic suite: 84/84 PASS in Asia/Manila; 84/84 PASS in UTC. All fixtures are generated in-memory, with fake launch/evidence/ACL capabilities. No historical SQL/UI/adapter suites were rerun.
- Coverage: missing/malformed/future/expired timestamps; exact and exceeded five-minute and UTC-window bounds; deadline crossing despite zero exit; verification-time crossing; wall/monotonic clock regressions; stopped/malformed/unknown child outputs; ACL/evidence mismatch and retention; one launch/no retry; numeric native/inventory rejection.
- Public production validator rejects substituted/missing pins and overrides. Its complete positive production-evidence path is NOT TESTED; engine-positive tests use a strict synthetic validator and do not imply production success.

## Preservation and worktree

Before: ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8; 68 dirty tracked, zero staged, 3,793 untracked. Git porcelain status SHA-256 d8e0a12041afd3823eef3ccffec5b2004a26ea811fd0b533d1576aba338298e4.

After finalization: same branch/HEAD, 68 dirty tracked, zero staged, 3,820 untracked expected and checked in the final response. The only additions are 14 retained intermediate files and 13 final-candidate files. Filtering these two new directories must reproduce the original status digest exactly. All 180 pinned upstream/intermediate file identities are rechecked; no existing workspace file is written by this task.

Reviewed native candidate bundle remains f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84; its manifest remains 3600a83cc67202d1ebbef855900a2a9df018d33c9f6af10a2d19253c00247fd2. SQL remains exactly 11,945 bytes / a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a. Dedicated verifier remains 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34. These native identities are not superseded. Only the unsuccessful OUTER-wrapper bundle 69f3e47faa9945cfd4c9d7ee29bbeb49ed8fa7b0657ab88af64c870742836e9c and outer manifest 7d9e36d702d72daee95e211acbcb70be9ac45c065f285011d0a7ce9ba7422e90 are superseded by this separate version, with originals retained.

## Remaining limitations / stop boundary

No live CLI/process transport, private environment loader, protected-file reader or ACL invoker is supplied. This is an offline control candidate, not a runnable production preflight adapter. A separately reviewed trusted integration must bind the exact native --preflight child, secure evidence/ACL reads, authorization/artifact/CA/root checks and finite completion. The wrapper detects overrun when completion is observed; it does not forcibly cancel an in-flight PostgreSQL request. One-use enforcement is in memory, not cross-process durable state.

No protected-state/credential/CA/environment access, Supabase/control-plane/network/database/helper/native-mode call, SQL execution, evidence refresh, auth binding/lock/attempt/preflight-file creation, configuration change, deployment or Git mutation occurred. Only source/docs/test logs inside the two new workspace directories were created. The unchanged pure core modules were imported for definitions only; no filesystem/connection helper was invoked.

No authorization fields were populated. No new bounded continuation proposal is included. Decision B and installation remain unauthorized.
