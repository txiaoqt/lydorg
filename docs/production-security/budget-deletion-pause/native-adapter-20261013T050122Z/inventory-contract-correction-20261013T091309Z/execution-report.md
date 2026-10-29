# Budget native preflight inventory contract correction

## Decision and execution boundary

**GO for a separately authorized read-only native preflight using the corrected identities. Installation remains NO-GO.** A fresh proof refresh must be separately authorized; the existing active and archived proofs were preserved. No PostgreSQL connection, preflight/install execution, production SQL submission, business/Auth/Storage change, deployment, or Git push occurred in this correction.

All results below are local/offline. The previous native failure does not establish completed current TLS, catalog, foundation or 57-inventory verification.

## Confirmed root causes

1. The original pinned foundation inventory starts a REPEATABLE READ, READ ONLY transaction, sets a 20-second statement timeout and terminates with COMMIT. The dedicated budget adapter expected ROLLBACK for every executable verifier. The previous native attempt stopped with READ_ONLY_TERMINAL_TAG_MISMATCH.
2. Inspection of the actual inventory SELECT revealed a second mismatch: its result has separate captured_at, read_only and preserved_data columns. The generic parser returned only the preserved_data array, while the inventory normalizer requires the entire row. A terminal-only correction would have failed at PROTECTED_DATA_RESULT_INVALID. The inventory-specific parser now retains that row; all other verifiers still extract their declared JSON column.

## Exact source changes

| File in this adapter directory | Change |
| --- | --- |
| budget-protected-data-readonly.sql | New budget-specific inventory copy. Only final COMMIT changes to ROLLBACK; all preceding bytes and trailing whitespace are preserved. |
| budget-runner-core.mjs | Explicit per-verifier terminal/timeout/result contracts; bounded static transaction/query validation; byte-exact original/copy comparison; inventory row-envelope handling; strict result-command sequence; manifest input set includes original reference. |
| native-budget-pause-runner.mjs | Uses the dedicated inventory, pins the original as a reference, validates contracts before connection, and selects parsers by input name in preflight/postflight/reconciliation. Offline review reports the contracts. |
| native-budget-pause.test.mjs | Six actual-input tests, mocked snapshot using real input bytes and row shapes, explicit duplicate-inventory rejection, and metadata-only operator-proof preservation checks. |
| reviewed-inputs.json | Eleven pinned inputs; updated code identities. The other nine existing input pins, foundation receipt/structure, package lock and 138 pg runtime files are unchanged. |
| operator-procedure.md; read-only-preflight-authorization-draft.md; readiness-report.md | Current corrected identities, preservation evidence, future fresh-proof requirements and read-only approval wording. No runnable installation approval created. |

operation-acl.ps1 and budget-identity-readonly.sql remain byte-identical. Lock, one-attempt marker, authorization, TLS/credential, reconciliation and no-retry controls are unchanged. Installation call sites use the same corrected verifier contracts but installation was never activated. The production pause SQL, predicates, catalog/data gates, BEGIN/COMMIT and 1-second/30-second installation timeouts remain unchanged.

## Actual pinned transaction contracts

Every read-only input has exactly four statements: BEGIN, SET LOCAL statement_timeout, one SELECT/WITH query, and its declared terminal statement.

| Input | Isolation/mode | Timeout | Terminal | Result handling |
| --- | --- | --- | --- | --- |
| identitySql | REPEATABLE READ / READ ONLY | 10s | ROLLBACK | native_identity JSON column |
| preSql | REPEATABLE READ / READ ONLY | 20s | ROLLBACK | verification JSON column |
| postSql | REPEATABLE READ / READ ONLY | 20s | ROLLBACK | verification JSON column |
| protectedDataSql | REPEATABLE READ / READ ONLY | 20s | ROLLBACK | Entire row, including read_only and 57-entry preserved_data |
| foundationSql | REPEATABLE READ / READ ONLY | 20s | ROLLBACK | foundation_verification JSON column |
| originalProtectedDataSql | REPEATABLE READ / READ ONLY | 20s | COMMIT | Preservation reference only; execution is rejected |

The approved installation SQL remains separately hash-verified with terminal COMMIT; it is rejected as a read-only verifier. The parser does not accept COMMIT and ROLLBACK interchangeably. Each executable result must have the exact BEGIN,SET,SELECT,ROLLBACK command sequence and exactly one row containing the declared result key.

The static checker rejects changed transaction modes, timeouts, terminal statements, query aliases, extra statements, DML/DDL/session-changing keywords and selected side-effect functions outside comments/literals. It rejects unsupported dollar-quoted forms. This is a bounded check for pinned files, not a universal SQL purity proof; exact file hashes and server READ ONLY enforcement remain required.

## Final artifact identities

| Artifact | Bytes | SHA-256 |
| --- | --- | --- |
| Corrected adapter bundle | Derived manifest/code identity | 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25 |
| Corrected reviewed-inputs.json | See artifact inventory | 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb |
| New budget inventory verifier | 13,902 | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Original foundation inventory verifier | 13,900 | ecf05439e94d078b63d7f5b4efc37f262425ed5a9ecc7904cd241efb5d4b249d |
| Unchanged production pause SQL | 11,945 | a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |

The original bundle 0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9 and manifest 8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8 identify historical artifacts only. Bundle calculation remains SHA-256 of the JSON object containing manifest SHA-256 and the sorted four code-file identities. The manifest pins both inventory files and every helper/runtime input. See corrected-identities.json and final-artifact-manifest.json for complete sizes/hashes.

## Actual validation

- **PASS — 39/39 focused tests, zero failures/skips**, Node v24.21.0 on Windows. Evidence: focused-tests-final.tap.
- **PASS — six actual-input contract tests** within that suite: original/copy byte preservation and all 57 ordered definitions; all six real verifier contracts; reproduction of the original terminal mismatch and row-envelope defect; rejection before a mock connection of mode/tag/timeout/DML/result drift; strict pg result handling; real runner snapshot pipeline with mocked PostgreSQL responses and actual pinned SQL.
- **PASS — missing, duplicate and unexpected inventories fail closed**, while existing RPC/catalog/foundation/data drift, absent authorization, consumed markers, uncertain-response/no-retry, TLS and reconciliation cases remain covered offline.
- **PASS — real PowerShell CLI regression cases** for fixed-root Protect, permitted child Verify, traversal/sibling/unknown target denial, unsafe ACLs and reparse points. Mutating ACL cases used disposable local fixtures with one substituted root binding; the shipped helper has no override. Existing operator evidence received Verify only.
- **PASS — Node syntax checks** for core, runner, tests and local repinning helper. PowerShell parser passed for the unchanged ACL helper.
- **PASS — offline runner --review**, connectionAttempted:false, installationActivated:false; 57 relation identities, six declared contracts and 138 driver files verified locally. Evidence: offline-review-final.json.
- **PASS — scoped source diff checks** and approved SQL/verifier/helper identity checks.
- **EXISTING OUT-OF-SCOPE FAILURE — full dirty-worktree whitespace check** reports src/lib/lydo-connect-supabase.ts:4535 (a whitespace-only line). That pre-existing modified file was not edited in this task. No application/typecheck/build reruns were required for this adapter-only change.

The initial new actual-input run passed 5/6: a test expected statement-count rejection when the installation SQL was instead correctly rejected earlier for unsupported dollar quoting. The expected code was corrected without changing the guard; the full suite then passed. Initial TAP and intermediate source/manifest identities remain in actual-input-tests.tap and initial-test-artifacts/. No failed evidence was suppressed.

Initial diff wrappers also misclassified Git CRLF advisories and then treated existing CRLF endings as whitespace. Those outputs are preserved. The final scoped checks explicitly recognize Windows CRLF and still enforce trailing-whitespace checks; the unrelated line-4535 failure remains reported.

## Operator evidence preservation

Both existing proofs remain in their original locations; the state still has exactly two files. No authorization, approved-preflight, operation lock or installation attempt marker was created. The shipped CLI verified the root and both proof ACLs successfully.

Metadata-only before/after comparison confirms unchanged proof sizes (200 bytes each), creation/write/access timestamps, ownership/security descriptors and attributes. The root's creation/write time and security descriptor are unchanged. Directory enumeration caused an ordinary OS-managed root last-access change, recorded in preservation-and-validation.json; no timestamps were set or repaired. No proof contents were opened or hashed during this correction, avoiding unnecessary NTFS access-time changes. Proof content hashes quoted here are inherited evidence from the prior receipts, not newly computed content verification.

- Original archive recorded SHA-256: 0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.
- Active proof recorded SHA-256: 2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.

Thirteen previous top-level artifacts were copied before editing and rechecked against their saved hashes. All previous failure receipts and evidence directories remain preserved. The original dirty working tree was retained. Disposable ACL/mock marker fixtures do not constitute operator installation state and were cleaned through their bounded test cleanup paths.

## Remaining native preflight conditions

1. Separate approval bound to this corrected bundle, manifest and unchanged production SQL.
2. Separately authorized refresh of the stale active proof: verify both existing proofs, archive ONLY active SHA-256 2c5c49… to its new hash-named history destination without overwrite, then create one fresh active proof from a new healthy exact-project control-plane result. Preserve the original archive. No refresh occurred here.
3. Secure existing credential loader, independently trusted CA provenance/hash, certificate-chain/hostname verification and fixed direct endpoint.
4. Fresh PostgreSQL 17.6 identity/privileges, original unpaused RPC, exact catalog/history, foundation/document/containment protections, 164 migrations, 15 policies and 378 objects.
5. Independent comparison of all 57 inventories to the applicable reviewed snapshot; unexplained drift remains a stop condition and cannot be silently adopted.

**GO to request the separately authorized read-only attempt. NO-GO for installation until that attempt succeeds, preservation is independently reviewed, and separate production installation approval plus an exclusive drained execution window are obtained.** See ../read-only-preflight-authorization-draft.md. No runnable installation authorization was prepared.
