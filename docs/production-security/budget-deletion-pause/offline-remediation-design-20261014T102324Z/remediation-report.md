# Offline remediation design and F4/F5 evidence

**NON-RUNNABLE — NOT AUTHORIZED. Offline remediation evidence only.**

## Outcome

A separate design/test candidate was prepared. No continuation authorization, production-capable I/O provider, consumption write or execution route is provided.

| Finding | Status in this package |
| --- | --- |
| F1 | Design options and recommendation prepared; no durable guard implemented or authorized |
| F2 | Real-provider/Windows archive remediation plan prepared; implementation and real OS guarantees remain BLOCKED |
| F3 | Fixed child/deadline/output/lifetime/stop plan prepared; actual child boundary remains BLOCKED |
| F4 | Complete generated input passes the unchanged pure fixed validator; 143 positive/negative cases pass. Public wrapper/coordinator end-to-end path remains unexecuted |
| F5 | New coordinator copy enforces a closed safe-code boundary at provider and final catches; 87 synthetic cases pass. Independent review still required |

Live continuation and production readiness remain BLOCKED. A passing synthetic suite is not authority to dispatch an observation, access protected state, connect to a database or install SQL.

## Inputs and preservation

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused  
Branch/HEAD: ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8

All 210 existing input files were independently hash/size checked: the preceding candidate's nine artifacts, its 200 preservation references, and the independent review report. All match. Existing candidates, review/evidence files, SQL and dirty worktree files were preserved.

- Original trusted-I/O bundle: a52dd7ebdfa1b99bcbc5915992025e2f906fe59fe22febd80e40b681b15aa47a.
- Original manifest: c4dcd431e0eba49ff0df4014902c4cb3a3451d50b4eedca36f1351ebef2c567f.
- Original inventory: 104ec2876054a533a4500754ed70f99ed99811912347a5b14d427cff66dfc1bc.
- Original candidate report: 0217be6dd5527ef72122ebb0042cc7a985033c1ab962211bda4760c6ef033cae.
- Independent BLOCKED review: 23,836 bytes; 725a45d24c13a76af46e2fc757e549ce95ff501dacb2eb851948bac3583ed44f.
- Unchanged fixed validator: 8,186 bytes; 6c1e7581a05975fc9c82d1f2987959272fb85410c7ec01912501bf6398ba9e97.
- Unchanged SQL reference: 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a.
- Unchanged dedicated inventory verifier: 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34.

The native runner, wrapper, validator and SQL were not edited, imported as executable modes or invoked. New code is limited to F4/F5 in this isolated candidate.

## F1 design resolution

Read f1-design-options.md for the full comparison and failure matrix.

The old later archive CAS cannot enforce one earlier get_project observation. The race intentionally still demonstrates two observations in the preserved protocol tests; this known limitation was not “fixed” by changing a test expectation.

The recommended review design is a permanent, atomically created **authorization-bound consumption record before observation**, on one pinned trusted host/root/volume. Its unique key must be tied to canonical authorization reference plus fixed purpose/project; varying a bundle, nonce, stale-proof hash or timestamp must not produce a fresh allowance. The payload separately binds all approved artifact/proof/window identities. Only the original live claimant may proceed after verified durability; an existing, malformed, partial or conflicting record never authorizes resume.

This yields at most one attempted observation, not exactly one successful response after every crash. Crash before dispatch can burn the allowance with zero observations. Uncertain dispatch/response burns it without retry. The record is retained on both success and failure.

This design requires:
- An additional protected-state write and its read/ACL/durability admission.
- A changed operation order, placing that write before the fresh control-plane observation.
- Separate review of the exception to the earlier fresh-identity-before-write sequence and explicit additional authority.
- A pinned single-host scope, or a separately reviewed shared ledger for multiple hosts.
- Evidence about MCP transport retry/dispatch semantics; one callback alone cannot prove one upstream request.

None of those operations is implemented or authorized here. Installation lock/attempt/authorization files are not reused.

Compared alternatives:
- In-memory counters fail across processes/restarts.
- A named mutex/live supervisor can exclude simultaneous owners but cannot alone establish consumed state after a crash.
- The existing archive CAS is too late.
- A central broker with durable atomic consumption is viable for multi-host operation but adds a trusted service/write/route and is disproportionate here.
- Manual instructions are operational controls, not technical durable enforcement.

If local durability/ownership assumptions cannot establish the agreed crash model, keep F1 BLOCKED or review a stronger ledger; do not claim power-loss guarantees from writeFile/sync or a Map test.

## F2/F3 blockers and proposed review

Read provider-remediation-plan.md for exact per-provider requirements and missing acceptance evidence.

F2 needs actual scoped MCP, file/root/ancestor/ACL, archive/create-new, private loader/CA and bounded evidence readers. A receipt that says noOverwrite/noRedirect/synced is not proof of a Windows operation. Review the real no-replace same-directory primitive, source/destination identity at the protected boundary, competing destination creation, reparse/junction/alternate-stream defenses, owner/effective DACL and metadata preservation. No copy/delete fallback, force, timestamp repair, restore or automatic retry.

F3 needs a real fixed Node/arguments/cwd/environment binding, deadline checks at actual physical spawn, bounded stdout/stderr collection, owned process/job lifetime handling and stop/retention after uncertainty. A Promise rejection or child.kill alone is not verified process-tree termination. The plan proposes limits for separate review only: child lifetime at most 180 seconds shortened by both actual deadlines, stdout at most 16,384 UTF-8 bytes and stderr at most 4,096 bytes. These settings are not implemented or approved.

Any future child must use only the reviewed direct TLS route and native --preflight mode, preserve strict explicit-offset/UTC and monotonic gates, and retain all partial/complete evidence. No grace period, alternate endpoint, pooler, reconnect/relaunch or rebaseline is permitted.

## F4 changes and evidence scope

Files: validator-synthetic-fixtures.mjs and validator-fixed.test.mjs.

The fixture builder generates fictional 2031 capture/backend identities, opaque proof binding and synthetic TLS peer metadata, complete child result and snapshot structure entirely in memory. The unchanged validator requires its exact four existing pinned reference buffers; these historical redacted inventory/foundation references supply the required opaque baseline fingerprints and catalog structure. They are not new observations, proof contents, credentials, CA bytes or current production assertions.

The test harness reads only those four fixed, hash/size/type/realpath-checked repository artifacts. It does not copy their contents into a new artifact or read protected state. No generated proof/snapshot/evidence file is written; the safe-looking evidence filename is only a synthetic string.

Actual tested path:
synthetic fixture → complete encoded result/snapshot → unchanged parseReviewedResult → unchanged validateReviewedPreflightEvidence → full preservation flags and evidence hash.

Coverage includes:
- Full positive input, inclusive capture bounds and explicit offset.
- Scope/bundle/SQL/proof-binding/capture/TLS/CA/native-version/privilege/read-only/activity negatives.
- Function definition, owner and grant drift; containment/migration/policy/object/business-count drift.
- Each of 57 inventory rows changed with self-consistent digest/result/fingerprint recomputation, all rejected against the pinned baseline.
- Each of 14 foundation function owners, four table RLS settings and eight trigger states changed with internally consistent rehashing, all rejected.
- Pinned reference substitution, incomplete/mismatched result, malformed/oversized JSON/UTF-8 and synthetic secret-field rejection.

There are 143 F4 cases. This closes the missing pure-validator positive unit evidence. It does **not** claim complete public-wrapper/coordinator execution, real durable file reads/ACL behavior, actual TLS, current 57-inventory preservation or a live preflight. Those paths were expressly not run.

## F5 exact correction

Files: safe-error-codes.mjs, integration-engine.mjs and safe-error-codes.test.mjs. The public facade is copied unchanged.

The new helper contains a literal frozen allowlist of 68 safe codes from the inspected guard vocabulary, with an internal unexported Set. It accepts only an own data-descriptor string on the expected WrapperFailure type that exactly matches the list. Unknown/oversized/dynamic/non-string/inherited/accessor/foreign codes return the fixed TRUSTED_IO_FAILED fallback. It reads no message, stack, arbitrary value conversion or environment. Descriptor/proxy failure cannot escape the helper.

Changes to the coordinator copy are only:
1. Import safeErrorCode.
2. Convert provider exceptions to WrapperFailure(safeErrorCode(error)) before crossing a callback boundary, preventing the unchanged wrapper from receiving arbitrary typed codes from those callbacks.
3. Use safeErrorCode in the final coordinator catch.

One-use/call limits, targets, deadlines, archive/create flow, preservation/evidence conditions and fixed wrapper binding are unchanged. The original coordinator, reviewed wrapper and native bundle are preserved. This is a new identity, not a relabeling of the old bundle.

The 87 F5 cases cover all 68 admitted constants, arbitrary typed canaries, signed-URL-like synthetic strings, newline/oversize/non-string values, ordinary/foreign errors, accessor/inherited/proxy failures, absence of coercion, allowlist immutability, corrected coordinator provider catches, final catch and no relaunch. The original typed-canary pattern now returns TRUSTED_IO_FAILED with one modeled callback and zero launches.

The direct old wrapper API itself is unchanged; this is not a claim that every standalone upstream API was patched. Future providers must use the reviewed integrated boundary. No real provider is supplied.

## Validation performed

Seven new/copied .mjs files passed syntax checking. Windows Node v24.21.0 was independently confirmed with --version. The inspected test/import graph has no executable native-wrapper/runner/helper mode, network/database call or private environment access. Imported core filesystem helpers remain unused definitions.

| Suite | Asia/Manila | UTC |
| --- | ---: | ---: |
| Copied protocol regression for the changed coordinator | 56 / 56 | 56 / 56 |
| F4 unchanged fixed-validator unit cases | 143 / 143 | 143 / 143 |
| F5 safe-code/coordinator cases | 87 / 87 | 87 / 87 |
| Total | **286 / 286** | **286 / 286** |

Both runs exited 0, with zero failed/skipped/cancelled/todo cases and empty stderr. These are current candidate regressions; historical SQL, Admin/frontend and native suites were not rerun.

Exact executable:
C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe

Exact arguments:
--test-concurrency=1 --test-reporter=tap --test followed by the three absolute files in this new candidate: protocol-synthetic.test.mjs, safe-error-codes.test.mjs, validator-fixed.test.mjs.

cwd was the repository root; shell=false, windowsHide=true, timeout=30,000 ms, maxBuffer=1,048,576. Each child received literal SystemRoot/WINDIR plus TZ only, without inherited credentials or an env-file argument. The .tap logs contain actual TAP output and are hash-pinned. No production environment, credential, proof or CA file was opened.

## New artifact identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| f1-design-options.md | 10744 | af6a47eada2db5dc637ce3b1845cdbc8c7ee78a50412400dc4b657b1ed78f5bf |
| safe-error-codes.mjs | 2761 | 36a345dad73590ae03a59b2ba3467b46fcdc9a9be1180c695e11c2ad74cc15b1 |
| integration-engine.mjs | 15755 | 8638de4638c4b66c1cc2ad4f8f1cbbe79a7c267dd2818cbfffc7546c4c70b7a8 |
| trusted-io-integration.mjs | 1004 | 3cf14f82c5e393b340758abc090c8e74db10869253696fa73126d72f08b3f19c |
| protocol-synthetic.test.mjs | 23246 | a1739d35e8328dabfb3c46accd0bc849778fb352d26877cc4bb7c5d402c53044 |
| safe-error-codes.test.mjs | 4781 | 9a2022215b2d13b14f8990c7a7c4c88fd337c329af29d6c63aabb7d029de29af |
| validator-synthetic-fixtures.mjs | 5080 | 4ba43452ea8ee1561edb3e337ad1a0b40bcf0bf899d348be999ec72b566d55b7 |
| validator-fixed.test.mjs | 10008 | f7662a464e0307aebb3bac1984eea8bc18db1e3c8e89497dad200354d3633092 |
| focused-tests-asia-manila.tap | 51329 | cd4a7f50439fb7310ed9568ca3dfbf7286ee608d7189781d9e7da987df334461 |
| focused-tests-utc.tap | 51309 | 3d3a4c6d8f02938b941a345ed661c40bbbe4be61b7c6f4e12f330f6f048ff8be |
| provider-remediation-plan.md | 10421 | a229de4217ef17e3908ba33e71e92198b81dc1e41373fc59bad11856df64137a |
| reviewed-inputs.json | 48259 | 0f911de82cf1daa3dffeceb63a75745e934769cae37b27b5494920f4f65d3749 |

New offline bundle SHA-256: 2dee359e3029a4cca9cc59bc9aafa26f52af90005d599bbffa20e400354e0159  
New manifest SHA-256: 0f911de82cf1daa3dffeceb63a75745e934769cae37b27b5494920f4f65d3749

The new bundle derives from SHA256 UTF-8 JSON.stringify({manifestSha256,codeHashes}), using the exact seven codeIdentities in manifest order. The manifest pins all 210 existing preservation inputs and the four reference-loader identities. Its installedOrExecuted=false denotes no production/native installation/execution; the permitted offline test executions are explicitly recorded in its tests section.

The final inventory includes this report and all other candidate artifacts, excludes itself and has no circular self-hash. Report/inventory hashes are returned externally. No old review hash is presented as the identity of this candidate.

## Worktree accounting

| Checkpoint | Dirty tracked | Staged | Untracked |
| --- | ---: | ---: | ---: |
| Task start | 68 | 0 | 3,837 |
| Measured before final report/inventory | 68 | 0 | 3,849 |
| Closing target, verified in final response | 68 | 0 | 3,851 |

All 14 new files are confined to offline-remediation-design-20261014T102324Z: seven source/test files, three design/report documents, two TAP logs, one manifest and one inventory. They are create-new outputs; no existing file was edited, deleted, renamed, staged or reset. Filtering this new directory reproduces the original Git porcelain SHA-256 032f603f8887a89f0140f211928157412c7424134363d3cd7cfc7f37a3f2a881. Branch/HEAD remain unchanged. Finalization rechecks every existing pin and this status.

## Recommended next review sequence

1. Independently decide whether the F1 recommended single-host durable before-observation consumption design and amended scope/order are acceptable, including crash/durability and transport semantics. This is a design decision, not write authority.
2. Independently review this F4/F5 code, tests and identities, keeping pure-validator coverage distinct from the unexecuted public wrapper path.
3. Separately scope implementation/testing of real F2/F3 providers and any F1 primitive with disposable offline state; no actual protected write or native/live path follows from this package.
4. Review/pin the resulting full integration and any additional authority needs. Only after those gates can consideration of a new bounded continuation proposal begin.

No continuation authorization, approval fields or runnable protected-state bindings are prepared. The old authorization window/proof and historical state fingerprints are not current authority. Decision B and SQL installation remain separate and unapproved.

## Boundary statement

This task performed local source/reference reads, new isolated F4/F5 code and documentation, and inspected offline tests only. It made no Supabase/network/TLS/PostgreSQL/database call; read no credential, CA, active proof or protected-state file; ran no real wrapper/runner/helper/preflight/install/reconciliation mode; created no authorization/proof/lock/attempt/preflight-evidence file; and changed no pagination, frontend, gateway, Auth, Storage policy, production state or Git staging/commit/push/deployment state.

**This is offline remediation evidence only.**
