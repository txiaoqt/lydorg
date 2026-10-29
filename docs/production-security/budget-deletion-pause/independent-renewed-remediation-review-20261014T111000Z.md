# Renewed independent offline review — remediation design package

## Verdict: PASS — offline review scope only

The corrected identity gate passes. The F1 proposed single-host algorithm is conditionally sound for at-most-one attempted observation if its stated durability, ownership and transport assumptions are established. It is not implemented enforcement. The F4 pure fixed-validator coverage and F5 actual coordinator safe-code correction are independently reproducible. No new blocking defect was found within those offline scopes.

**Live execution remains BLOCKED. F1 has no durable implementation; F2 real trusted providers/Windows archive guarantees and F3 actual child-process boundaries remain unresolved. This report establishes neither production readiness nor permission for Decision A or Decision B/installation.**

Reviewed at 2026-10-14T11:10:00.257Z. This is a new report; no prior report, hash or candidate was edited or relabeled.

## Scope and identity gate

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused  
Branch: ui-refactor  
HEAD: 2f6e7427c553b7535f53860d1732b42df7c023e8

Exact candidate: docs/production-security/budget-deletion-pause/offline-remediation-design-20261014T102324Z/

| Identity | Verified SHA-256 | Result |
| --- | --- | --- |
| Recomputed bundle | 2dee359e3029a4cca9cc59bc9aafa26f52af90005d599bbffa20e400354e0159 | PASS |
| reviewed-inputs.json, 48,259 bytes | 0f911de82cf1daa3dffeceb63a75745e934769cae37b27b5494920f4f65d3749 | PASS |
| candidate-artifact-inventory.json, 2,439 bytes | 18cf7b444d6b9982616ddf986562fda37fa8bbe9fdc8e4be4d4ce950732fbd02 | PASS |
| remediation-report.md, 16,724 bytes | e9b1ef2533777c020b4242a7808b021b00470fd2a6e17d9ef5863e5c1d79bc39 | PASS |
| Prior identity-gate report, 8,172 bytes | 37b17ee9fe5ed6cf3f5dbf0344872d0db77af3b5346e914621422cecd73fdb30 | PASS / preserved |

The prior identity-gate report is independent-remediation-review-20261014T105254Z.md under the budget-deletion-pause directory. Its prior BLOCKED verdict remains intact. The user explicitly supplied the c-containing hash for this renewed review; this review does not infer or repair the earlier a-containing expected value.

Bundle method: SHA256 over UTF-8 JSON.stringify({manifestSha256,codeHashes}), using the exact manifest bytes and independently calculated code-file hashes/lengths in the seven-entry manifest order. Listed hashes were not accepted in place of actual file reads. The inventory excludes its own hash; its supplied external hash is checked separately. All 14 candidate files match, with no unexpected candidate file. Regular-file, non-symlink and canonical in-workspace boundary checks passed.

### All candidate file identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| candidate-artifact-inventory.json | 2439 | 18cf7b444d6b9982616ddf986562fda37fa8bbe9fdc8e4be4d4ce950732fbd02 |
| f1-design-options.md | 10744 | af6a47eada2db5dc637ce3b1845cdbc8c7ee78a50412400dc4b657b1ed78f5bf |
| focused-tests-asia-manila.tap | 51329 | cd4a7f50439fb7310ed9568ca3dfbf7286ee608d7189781d9e7da987df334461 |
| focused-tests-utc.tap | 51309 | 3d3a4c6d8f02938b941a345ed661c40bbbe4be61b7c6f4e12f330f6f048ff8be |
| integration-engine.mjs | 15755 | 8638de4638c4b66c1cc2ad4f8f1cbbe79a7c267dd2818cbfffc7546c4c70b7a8 |
| protocol-synthetic.test.mjs | 23246 | a1739d35e8328dabfb3c46accd0bc849778fb352d26877cc4bb7c5d402c53044 |
| provider-remediation-plan.md | 10421 | a229de4217ef17e3908ba33e71e92198b81dc1e41373fc59bad11856df64137a |
| remediation-report.md | 16724 | e9b1ef2533777c020b4242a7808b021b00470fd2a6e17d9ef5863e5c1d79bc39 |
| reviewed-inputs.json | 48259 | 0f911de82cf1daa3dffeceb63a75745e934769cae37b27b5494920f4f65d3749 |
| safe-error-codes.mjs | 2761 | 36a345dad73590ae03a59b2ba3467b46fcdc9a9be1180c695e11c2ad74cc15b1 |
| safe-error-codes.test.mjs | 4781 | 9a2022215b2d13b14f8990c7a7c4c88fd337c329af29d6c63aabb7d029de29af |
| trusted-io-integration.mjs | 1004 | 3cf14f82c5e393b340758abc090c8e74db10869253696fa73126d72f08b3f19c |
| validator-fixed.test.mjs | 10008 | f7662a464e0307aebb3bac1984eea8bc18db1e3c8e89497dad200354d3633092 |
| validator-synthetic-fixtures.mjs | 5080 | 4ba43452ea8ee1561edb3e337ad1a0b40bcf0bf899d348be999ec72b566d55b7 |

All 210 manifest preservation references also match their actual sizes/hashes. Together with the 14 candidate files and the prior identity-gate report, 225 unique existing files were checked and rechecked. This includes the preceding trusted-I/O candidate/review, unchanged wrapper/native inputs and pinned dependency files. No credential, CA, active proof or protected-state content was read.

### Important unchanged references

| Reference | Bytes, when applicable | SHA-256 |
| --- | --- | --- |
| Historical production SQL, 20261012T165000Z/budget_deletion_pause_production.sql | 11,945 | a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated inventory verifier, native-adapter-20261013T050122Z/budget-protected-data-readonly.sql | 13,902 | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Fixed validator, outer-preflight-wrapper-candidate-20261014T054751Z/preflight-evidence.mjs | 8,186 | 6c1e7581a05975fc9c82d1f2987959272fb85410c7ec01912501bf6398ba9e97 |
| Fixed-wrapper bundle | derived identity | af8a4299c476969df5259889f69041ac855df528644fb54c0a37e15b72caceca |
| Native candidate bundle, native-adapter-candidate-20261013T161403Z | derived identity | f3f762ca25eed5b4bc701a1eff184fc7e99d0493b847e341588d2c737571db84 |
| Prior trusted-I/O bundle, trusted-io-integration-candidate-20261014T083531Z | derived identity | a52dd7ebdfa1b99bcbc5915992025e2f906fe59fe22febd80e40b681b15aa47a |
| Earlier substantive review, independent-trusted-io-review-20261014T090105Z.md | 23,836 | 725a45d24c13a76af46e2fc757e549ce95ff501dacb2eb851948bac3583ed44f |

These are historical/local artifact identities, not fresh production observations. No SQL or inventory verifier was executed.

## F1 — conditional design assessment; execution still blocked

Source: f1-design-options.md:7–9, 28–37, 41–47, 53–67.

The design correctly separates at-most-one attempted observation from exactly one successful response. A crash after durable consumption but before dispatch can burn the allowance with zero observations. A crash or uncertain response after dispatch must never permit another dispatch.

The proposed exclusion is logically sufficient on one pinned trusted host/root/volume if all of these prerequisites hold:

- A canonical authorization reference plus fixed purpose/project selects one permanent, atomically created unique record. Bundle, nonce, stale-proof hash or time changes cannot select another allowance. The payload binds the complete approved context; conflicting context denies access.
- No observation is sent before verified durable creation and identity/ACL admission. Competing creation loses. Any existing, partial, malformed or conflicting record denies resume; neither a PID nor an unchanged nonce file establishes original-process ownership.
- Only the original live claimant dispatches once. A live one-use guard supplements the durable record. Crashes/restarts cannot reclaim the grant. Success and every failure retain consumption permanently.
- The underlying transport cannot silently retry an upstream request beyond the agreed boundary. One application callback alone is insufficient proof of one upstream request.

The proposal explicitly adds a protected-state write before fresh get_project and changes the earlier operation order. It expressly requires separate review and additional authority, does not reuse installation state, and supplies no executable write, record path or approval. Those boundaries are appropriate and preserved.

This is not evidence of an actual durable implementation. The current integration engine still stores consumption only in memory. The unchanged protocol test at protocol-synthetic.test.mjs:343–354 still produces two modeled observations across two invocations, while allowing one later archive/preflight. That test does not validate the proposed F1 design. No real concurrency/restart/crash/Windows durability test was performed.

Remaining F1 prerequisites include selection and review of the atomic creation/durability mechanism, stable unique-key canonicalization, original-claimant ownership and path/ACL admission, failure retention under the agreed crash/power-loss model, and MCP dispatch/retry semantics. CREATE_NEW plus a generic sync claim does not by itself prove record survival after dispatch. Multi-host use requires a shared trusted ledger. A local-file design cannot claim protection against an administrator erasing its entire trust state. The proposal accurately states these limits.

**F1 result: PASS as a conditional design recommendation; NOT IMPLEMENTED / BLOCKED as execution enforcement. No protected write is authorized by this review.**

## F4 — actual unchanged fixed-validator unit path: PASS

Sources: validator-fixed.test.mjs:35–49, 56–67, 68–154; validator-synthetic-fixtures.mjs; unchanged preflight-evidence.mjs:65–120.

The tests import and call the actual unchanged parseReviewedResult and validateReviewedPreflightEvidence. The reference loader reads only four fixed repository artifacts after type, canonical-path, size and hash checks. These are historical redacted inventory/snapshot/foundation references; the current protected proof, credentials and CA contents are not opened. Fixture result/snapshot buffers, fictional 2031 identities and synthetic TLS peer data exist only in memory.

The complete positive reaches the fixed validator and returns its evidence digest and all required preservation flags. Capture-boundary and explicit-offset positives also reach that validator. No replacement validator or positive bypass was found in the F4 tests.

The 143 cases consist of two positives, 50 targeted rejection cases, 57 per-inventory drift cases, 14 function-owner cases, four table-RLS cases, eight trigger-state cases, four reference substitutions and four malformed-evidence cases. Per-inventory and foundation mutations recompute internally consistent hashes and result fingerprints, yet the real validator rejects them against the unchanged pinned baseline. Fixture setup/digest generation is outside the rejection assertion; a construction error cannot masquerade as an expected validator denial.

Covered negatives include exact project/host/route/bundle/SQL/proof/capture binding, TLS/CA/version/privileges/read-only/activity, function definition/owner/ACL, containment/migration/policy/object/business preservation, reference pins, malformed UTF-8/JSON/oversize evidence, incomplete results and synthetic secret fields.

**The full public-wrapper/coordinator positive path was not run.** The separate 56 protocol cases use a fakeReviewedWrapper and in-memory ports; the public-facade case tests override rejection only. Neither suite establishes real evidence-file creation/read stability, effective Windows ACLs, service identity, TLS, current inventories or live preflight success. F4 resolves the missing pure-validator positive unit evidence, not those separate integration gates.

## F5 — actual 68-code typed-error boundary: PASS

Sources: safe-error-codes.mjs:3–80; integration-engine.mjs:142–152 and 247–255; safe-error-codes.test.mjs:8–86.

The helper has 68 distinct literal codes, a frozen exported list and an unexported Set. It accepts only the expected WrapperFailure type with an own data-descriptor primitive string exactly in that set. Unknown, malformed, dynamic, oversized, non-string, foreign, missing/accessor or descriptor/proxy failures return the fixed TRUSTED_IO_FAILED fallback. It does not read message, stack, arbitrary conversions or environment values. A trusted code cannot cause provider message/stack/details to be copied into the result.

The actual coordinator step converts provider exceptions with safeErrorCode before they can cross into the unchanged wrapper callbacks. The final catch applies the same helper. Independent in-memory source comparison confirms the only engine changes are this import, provider conversion and final conversion. The public facade and copied protocol test are byte-identical to their original files (the old test was named trusted-io-integration.test.mjs).

The 87 tests import this actual helper and actual candidate engine. They are not a duplicate sanitizer model. They exercise all 68 admitted constants; typed dynamic canaries, URL-like/newline/oversized/non-string inputs; untyped/foreign errors; getter/descriptor traps; no coercion; list immutability; real coordinator provider error and final-catch behavior; and no repeated provider call. The permitted modeled engine runs never invoke a production provider or native runner.

One minor coverage limitation: the case named “inherited code” deletes the own code but does not install an actual inherited prototype code. The implementation's own-descriptor-only check still statically rejects inherited properties; the existing assertion directly proves absence rather than a genuine populated inherited-property case. This is not a reproduced disclosure or a blocking defect in the reviewed helper.

The old standalone wrapper API itself remains unchanged. This result is limited to the reviewed integrated candidate boundary; it is not a claim that all upstream APIs or future providers are sanitized automatically.

## Independently rerun offline validation

Imports, top-level evaluation and test execution paths were inspected before running. The transitive core modules contain filesystem/connection function definitions, but the tests invoke only pure validators and synthetic ports; those I/O helpers and executable native entrypoints are not called. The four allowed repository reference reads are the only fixture file reads.

Toolchain: Windows Node v24.21.0, verified using --version. Exact executable:
C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/node.exe

Seven candidate .mjs files passed --check. Test arguments: --test-concurrency=1 --test-reporter=tap --test followed by absolute paths to protocol-synthetic.test.mjs, safe-error-codes.test.mjs and validator-fixed.test.mjs in this exact candidate.

Each child used repository cwd, shell=false, windowsHide=true, timeout=30,000 ms and maxBuffer=1,048,576. Its literal environment contained only SystemRoot=C:\Windows, WINDIR=C:\Windows and the selected TZ. No private environment was read or inherited, and no env-file argument was supplied.

| Suite | Asia/Manila | UTC |
| --- | ---: | ---: |
| Protocol model regressions | 56/56 | 56/56 |
| F4 actual fixed-validator cases | 143/143 | 143/143 |
| F5 actual helper/coordinator cases | 87/87 | 87/87 |
| Total | 286/286 | 286/286 |

Both test processes exited 0 with zero failed, cancelled, skipped or todo cases and empty stderr. Syntax result: 7/7. No historical SQL, UI/client, native or unrelated suites were rerun. These Windows executions do not establish Linux or real Windows protected-state behavior.

Output was captured only in memory; no existing test log was overwritten and no new TAP log was written. The following hashes identify this renewed run's in-memory stdout, not the preserved historical log bytes. Timing output can differ between runs.

| Timezone | Stdout bytes | Stdout SHA-256 | Stderr bytes |
| --- | ---: | --- | ---: |
| Asia/Manila | 51315 | 346c5be64def7ec149342bad19d8f6cd7b4d71080dfa94157df2fb76071ad482 | 0 |
| UTC | 51325 | dcd5121286820767ce6e3318290ec73bc1c096833711cac34a7401dbff12ab08 | 0 |

## Preservation and worktree results

| Checkpoint | Branch / HEAD | Dirty tracked | Staged | Untracked |
| --- | --- | ---: | ---: | ---: |
| Start | ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8 | 68 | 0 | 3,852 |
| After offline checks, before new report | same | 68 | 0 | 3,852 |
| After this report's exclusive create-new operation | same | 68 | 0 | 3,853 |

All 225 identified existing files matched again after offline tests and before creating this report. All original candidate, inventory/manifest, source, SQL, historical TAP, review and referenced preservation evidence remained intact. The sole worktree addition is docs/production-security/budget-deletion-pause/independent-renewed-remediation-review-20261014T111000Z.md. It was opened with wx; no preexisting artifact was opened for writing.

Git porcelain SHA-256 before review and after checks: 553525247f24ad232d3a70708c533ed26175b1974e0231431d6552c77f5a634a (UTF-8 lines joined LF, no terminal LF). After create-new, excluding this report alone reproduces that exact digest. No prior file was reset, checked out, stashed, staged, renamed or deleted. This is a status/pinned-artifact preservation check, not a claim that every unrelated untracked file was opened or hashed. The report's own size/hash is returned externally to avoid a circular self-hash.

## Remaining prerequisites and authorization boundary

1. F1 still requires a separately reviewed actual durable mechanism and original-claimant/transport boundary, followed by disposable concurrency/restart/crash testing. Its new protected write and amended order need additional authority. No write, schema or continuation authorization is prepared here.
2. F2 remains BLOCKED: actual trusted scoped provider binding, secure Windows root/ancestor/file admission, no-replace archive primitive, race/durability/metadata/ACL guarantees and protected evidence I/O are absent. Boolean model receipts do not prove those properties.
3. F3 remains BLOCKED: actual fixed child spawn, environment binding, last-moment deadline admission, bounded output/lifetime, owned process-tree containment and uncertain-stop evidence are absent. A Promise rejection or PID check does not establish termination or ownership.
4. The full public-wrapper integration path remains untested. Any later preparation must preserve the unchanged validator and all fixed TLS/CA, catalog, RPC/function/owner/grant, 57-inventory, foundation/document/containment, migration, policy and object gates. Historical matching artifacts are not fresh production evidence.
5. No Decision A execution, protected-state operation or Decision B/installation is authorized by this PASS. No continuation authorization or runnable installation binding is included. Further production-capable preparation and any live operation remain separate decisions.

## Boundary compliance

Only local read-only artifact/code/evidence inspection, inspected synthetic tests/syntax checks and this one new Markdown report were performed. No network, Supabase/MCP/get_project, PostgreSQL/database/TLS call, protected-state/proof/credential/CA/private-environment access, real wrapper/runner/ACL-helper/preflight/install/reconciliation mode, authorization/proof/lock/attempt/preflight-evidence file, production mutation, pagination/frontend/Storage change, Git staging/commit/push or deployment occurred.

**PASS is offline remediation review evidence only. Execution and installation remain unauthorized.**
