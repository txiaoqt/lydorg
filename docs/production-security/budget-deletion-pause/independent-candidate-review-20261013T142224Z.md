# Independent offline review: budget-deletion-pause candidate

## Verdict

**CANDIDATE REVIEW BLOCKED**

Review start: 2026-10-13T14:22:24Z. This is an offline source/evidence review. It does not assert production readiness or grant installation permission.

All artifact identities match. The focused suite passed 50/50 under an isolated, read-restricted environment. Two unresolved implementation gaps prevent a candidate review pass. No existing file was modified and no production connection or protected-state access occurred.

## Scope and exact identities

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused

Candidate: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z

| Artifact | Verified identity |
| --- | --- |
| Bundle SHA-256 | 390afb8cfa01d68cc6ad74472730fc6096775a40e9f8a98c17f6b8b2fed1d865 |
| Input manifest | 29,420 bytes; 7099f8dce1a195aa7df8f6d279c45ba451b31ab46cd4e13114a2fea7b9bcfd1b |
| Complete inventory | 2,145 bytes; 636768c7703091a0588bf345bc466577b6808d9a3490bf8124874012c2414f6f |
| Production SQL | 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Dedicated inventory verifier | 13,902 bytes; 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |

The complete candidate tree has exactly 13 files. All five code files, eleven pinned inputs and 138 dependency files match. Inputs and driver inventory match the original reviewed adapter. The saved patch reproduces the actual original/candidate source diff. The copied ACL helper is byte-identical. Original manifest and four code identities remain intact.

## Findings

### F1 — [P1] Child lock release precedes supervisor acceptance; recovery requires that released lock

Evidence: [runner:381](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:381>), [runner:396](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:396>), [supervisor:25](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-supervisor.mjs:25>), [reconciliation entry:401](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:401>).

The child sets retainLock=false after its own receipt verification and releases its owned operation lock in finally. The supervisor's spawnSync returns only after the child has exited. The supervisor then independently checks ACLs, reads the receipt and compares its hashes. A failure at this later stage reports UNRESOLVED after the lock is already gone.

The consumed marker remains and prevents a second installation attempt. No duplicate mutation or privilege bypass was demonstrated. However, outer acceptance failures are outside the promised lock-retention boundary. The reviewed native reconciliation entry requires the lock file before opening its read-only connection, so it cannot handle this missing-lock failure class through the documented route.

An in-memory call to the actual supervisor export modeled the source-confirmed child release ordering and a synthetic EACCES receipt read. Result: UNRESOLVED, one launch, zero retries, modeled lock absent, modeled marker retained. Static inspection confirms reconciliation requires the lock. No actual lock, marker, database or state file was involved.

Required separate correction: place independent acceptance within one reviewed lock-ownership boundary, or explicitly redesign and review released-lock completion/recovery semantics. Preserve the consumed marker and require finished-backend plus raw catalog/function evidence. Never automatically recreate/delete a lock or resubmit SQL. Add tests for supervisor ACL/read/hash/output failure after inner verified completion. The current suite checks release ordering inside the child only.

### F2 — [P2] Runtime pg resolution is not bound to the dependency tree being attested

Evidence: [closure:89](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:89>), [package lookup:144](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:144>), [Client lookup:215](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:215>), [installation Client lookup:320](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z/native-budget-pause-runner.mjs:320>).

The hashed closure starts from repository-root node_modules. Package/Client loading uses createRequire(import.meta.url) from the candidate directory. Node searches nearer candidate and docs-parent node_modules directories first. The resolved package's version is checked, but its resolved directory/entrypoint is not required to belong to the pinned tree.

A same-version nearer pg copy could be selected while the root tree and reviewed code hashes remain unchanged. That code would later receive the native connection configuration. This is an inherited integrity-gate gap, not evidence of present tampering: both actual resolution probes currently select repository-root node_modules/pg/lib/index.js, all pinned bytes match, and no extra candidate files exist. No shadow package was created or loaded.

Required separate correction: bind package and Client loading to a verified canonical require base and realpaths, or attest the exact runtime-resolved dependency closure. Reject shadow paths before credentials or a Client are used. Add a safe offline same-version-shadow regression. A version comparison/root-tree hash alone does not attest the loaded module.

## Source control assessment

| Control | Result | Evidence and limitation |
| --- | --- | --- |
| Exact single SQL submission, no retry | PASS (source) | One client.query(sql) in runOneShot; original SQL bytes; marker before submission; one supervisor launch; no reconnect/resubmit branch. |
| Verified success and receipt matching | PASS (source/unit) | Explicit COMMITTED_AND_VERIFIED, terminal COMMIT, one submission, zero retries/rollback statements, exact four-event sequence and bound marker/preflight/backend/nonces/hashes. |
| Whole-boundary lock retention/recovery | BLOCKED | F1; inner failures retain state, outer failures can occur after release. |
| Reconciliation classification | PASS (source/unit) | Both raw catalog views and full function contracts must agree; unknown/conflicting/active-backend cases unresolved; every reconciliation outcome stops. F1 separately limits recovery entry. |
| UTC freshness | PASS | Raw ISO JSON requires explicit offsets; maximum 300,000 ms; expired/future/missing-offset proof tests passed. |
| Forced native driver | PASS | NODE_PG_FORCE_NATIVE rejected even when empty. |
| Fixed endpoint/TLS | PASS (static) | Production host, CA hash, rejectUnauthorized, SNI and socket checks fixed; no live identity or TLS test performed. F2 limits driver attestation assurance. |
| Data/catalog preservation | PASS (static) | Function OID/owner/grants/contract, 57 inventories, foundation, migrations/policies/counts and original timeouts preserved. No fresh production-state claim. |
| Actual loaded driver binding | BLOCKED | F2; current resolution is canonical, but the code does not enforce that binding. |
| ACL helper | PASS (source/hash) | Exact fixed-root Protect, approved child Verify, canonical/reparse/owner/DACL/ancestor guards retained. Helper not invoked and protected root not inspected. |
| Secret-safe reporting | PASS (source) | Error-code whitelist, receipt scrubbing and no raw child stderr forwarding. Test credentials excluded. No secret file accessed. |

Production SQL remains the original bounded atomic transaction and unconditional PT409 pause. No SQL, grants, trigger, policy, Auth, frontend, pagination, UAT or deployment change occurred.

## Focused test safety and execution

The test file and imported helper entry guards were inspected first. Receipts/markers are in-memory fixtures. No test constructs a database client, reads .env files, invokes ACL operations or runs native preflight/install/reconcile modes. The only real test child executes the literal Node expression that prints a synthetic UNRESOLVED result.

Toolchain: Node v24.21.0 on Windows. Environment contains OS essentials only; no YTRACE/PG/credential/NODE override variables are forwarded. USERPROFILE/HOME point to a nonexistent workspace path. Read permissions allow only docs, scripts, node_modules, package-lock.json and package.json; filesystem writes are not granted. The actual protected state and private root .env files are excluded.

Two preliminary permission-restricted launches from the repository root exited 1 before reporting TAP cases. The diagnostic launch reported that it could not find the absolute test path. The same allowlist with candidate cwd and the test basename succeeded. No permissions were broadened. These discovery failures are recorded separately from assertions; no Windows/Node root cause is invented.

Successful argv; cwd is the candidate directory:

```json
[
  "C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\.agent\\admin-storage-vercel-20261012T035933Z\\toolchain\\extracted\\node-v24.21.0-win-x64\\node.exe",
  "--permission",
  "--allow-child-process",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\docs",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\scripts",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\node_modules",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\package-lock.json",
  "--allow-fs-read=C:\\Users\\Christopher x Angel\\Documents\\lydo-connect-org-focused\\package.json",
  "--test",
  "--test-reporter=tap",
  "budget-safety-controls.test.mjs"
]
```

Result: exit 0; **50 tests, 50 passed, 0 failed**. Fresh TAP SHA-256: 8d4dceb0bbcdb13e4150c5cc22127dddbb6f6751ddbfe082b072acdf4bdbee12. TAP output was held in memory; the candidate's saved log was not replaced.

Node emitted its expected --allow-child-process security warning. This is not claimed as a sandbox for arbitrary child code: the actual child is the inspected literal expression, inherits the stripped environment and reads no application files. No external-network test or production authorization test is claimed.

The 50 tests do not exercise F1's full child/supervisor/recovery lifecycle or F2's same-version shadow resolution. Their success does not resolve those findings. Historical 38/38 SQL, 18/18 UI/client and 39/39 adapter suites were not rerun.

## Worktree and evidence preservation

| State | Before review | After report creation |
| --- | --- | --- |
| Branch | ui-refactor | ui-refactor |
| HEAD | 2f6e7427c553b7535f53860d1732b42df7c023e8 | 2f6e7427c553b7535f53860d1732b42df7c023e8 |
| Dirty tracked | 68 | 68 |
| Untracked | 3,732 | 3,733 |
| Staged | 0 | 0 |

Before/status excluding this report SHA-256: c5bf90d43f17179153376aa5f8e35f7f9222d730ec4644e1796108de10d0960c.

The only Git-status delta is this create-new report. Candidate files and inventory are rehashed after review. Historical evidence/test logs are independently hash-checked without rerunning suites. No protected-state file is inspected; previous presence results are not treated as current evidence.

A local report-generator quoting error was detected at parse time before any file creation. The corrected generator uses literal JSON encoding and create-new semantics; it does not alter candidate or evidence files.

## Separate future gates

A corrected versioned candidate and independent review are needed to close F1/F2. No fix is applied here. Any future installation still requires separately authorized fresh control-plane/native verification, trusted CA/TLS/catalog/preservation checks, protected-root ownership/ACL verification, a new exclusive drained window and explicit installation authorization. Historical proofs or ready-to-request text grant no permission. No fresh proof, preflight, binding, authorization record, lock, marker or runnable installation authorization was created.

**CANDIDATE REVIEW BLOCKED**
