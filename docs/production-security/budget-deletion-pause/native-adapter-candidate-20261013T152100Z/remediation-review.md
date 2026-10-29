# Budget-deletion-pause remediation candidate

## Verdict

**REMEDIATION CANDIDATE READY FOR INDEPENDENT REVIEW**

This is local code and offline evidence only. It does not establish production readiness or authorize any production action. The next gate is an independent review of this exact new candidate.

## Identity

- Candidate: `docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T152100Z/`
- Bundle SHA-256: `5667c2cf30ce651aa47f55a9703f9b801b5688c6676e4b743a68b4b8be24ed5b`
- Input manifest SHA-256: `cc7345fabf63262c082bc332ec7ee526d8cb9c9f2d9c6a8a0abd841c7fc16b11`
- Five code identities, eleven unchanged pinned inputs, and 138 unchanged dependency files.
- SQL: 11,945 bytes; SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`.
- Complete candidate file sizes/hashes are in `candidate-artifact-inventory.json`; that inventory excludes itself to avoid a circular hash. Its independently calculated hash is reported separately.

## P1: continuous supervisor lock ownership

The supervisor validates existing operator records before exclusively creating a version-2 lock. It owns that same durable claim before spawning one worker, throughout worker completion, and through independent receipt verification. The claim binds the supervisor PID, nonce, SQL, project, route, and candidate bundle.

The worker receives one IPC lease bound to its actual parent PID. Its lock object exposes verification only. It has no release path, including on stopped, ambiguous, committed, or postflight-failed outcomes. Immediately before arming/submission it rechecks the live supervisor and exact persisted claim.

The worker can report only `COMMITTED_AWAITING_SUPERVISOR_VERIFICATION`, with lock retention. The supervisor rereads and verifies the durable journal, marker and preflight bytes; compares the child’s proof with its own; and checks current lock ownership. Only then can it remove its owned lock and report `COMMITTED_AND_VERIFIED`. Final success additionally requires terminal COMMIT acknowledgement, one submission, zero retries/rollback submissions, all receipt hashes, and supervisor/release evidence.

There is no release in a catch/finally. Supervisor interruption, receipt failure, ownership mismatch, stopped child, or uncertainty preserves any existing lock and attempt marker. Read-only reconciliation accepts the retained claim without requiring a live supervisor, but requires the recorded writer backend to be finished and consistent raw catalog/full function fingerprints. No status label, including `COMMITTED_WITH_DRIFT`, establishes presence. No reconciliation path resubmits SQL or clears state.

## P2: bind the actual PostgreSQL driver

Before loading `pg`, the adapter resolves Node’s actual entry and package metadata paths. Both must be the exact repository-pinned CommonJS entry/package; canonical realpaths, regular file/directory types, symlink/junction rejection, pinned bytes, package name/version, and the full 138-file closure are checked. This rejects same-version candidate/ancestor shadows and outside or redirected paths.

Immediately before each connection site it repeats binding and closure checks, rejects an already-loaded entry, then loads only the verified absolute entry. Client construction cannot occur before these checks. Fixed project, direct TLS route, certificate/hostname checks, SQL, timeouts, catalog/function/owner/grant checks, 57 preservation inventories, migration and policy gates remain unchanged. `NODE_PG_FORCE_NATIVE`, including an empty value, remains forbidden.

## Changes

| File | Change |
| --- | --- |
| budget-runner-core.mjs | Supervisor claim/lease, verified-release gate, driver binding, provisional versus final success |
| native-budget-pause-runner.mjs | IPC-only worker; no lock removal; verified absolute driver load; preserved-state recovery validation |
| native-budget-pause-supervisor.mjs | Own lock before one asynchronous IPC worker; independent durable receipt verification before release |
| budget-safety-controls.test.mjs | Existing receipt/freshness/classification cases adapted; lock/IPC/resolution regressions added |
| operation-acl.ps1 | Byte-identical copy; no ACL actions run |

`security-correction.patch` is the complete four-file change against the blocked candidate. Existing reviewed directories and SQL were not edited.

## Offline validation

- Focused suite: **77/77 PASS**, zero failed/skipped. Evidence: `focused-tests-01.tap`, SHA-256 `dc10a967e13a7ac0bd8bba3f9e4ecf823f04d58d9c206734a7c75201e04d3905`.
- Actual Node 24.21.0; all four JavaScript syntax checks passed. The unchanged PowerShell helper parsed with zero errors.
- Diff checks produced no whitespace findings. With `git diff --no-index --check`, status 1 records changed files; stdout/stderr were empty.
- Tests use in-memory lock/marker/receipt state and a synthetic read-only backend adapter. They cover continuous exclusion, verified release, failed verification, interrupted supervisor, dead-owner recovery gating, wrong owner, malformed results, raw catalog/function classification, five-minute explicit-offset freshness, and driver resolution/bytes/version/link rejection.
- Two inspected harmless Node children exercise zero-exit rejection and real IPC delivery; neither runs the production adapter, opens a database, loads credentials, or accesses protected state.
- Tests run with OS-only environment inputs, a nonexistent dummy USERPROFILE/HOME, read permissions only for reviewed workspace sources/dependencies, and no filesystem write permission. Node warns about `--allow-child-process`; the permission model is not claimed as a sandbox for arbitrary untrusted child programs.
- Real disk-lock crash testing, protected-root ACL checks, TLS/database verification, preflight and installation: **NOT TESTED** in this task, by scope. No live reconciliation ran.

### Preserved unsuccessful local revision

`native-adapter-candidate-20261013T151801Z/` remains intact with its original **76/77** TAP result. Its failure came from Node permission-mode child spawning mutating the shared environment object, causing a later safety rejection of NODE_OPTIONS. The new supervisor passes an environment copy; the IPC test asserts the parent environment remains unchanged. The failed revision was not overwritten, relabeled or rerun.

## Preservation and workspace

`preservation-verification.json` records 213 unchanged original/blocked artifacts and pinned references, 51 historical evidence-manifest entries, and three preserved test logs (38/38 SQL, 18/18 UI, 39/39 adapter). Those historical suites and the blocked candidate’s 50/50 suite were not rerun. The independent review report and blocked inventory remain hash-matched.

| State | Before | After |
| --- | --- | --- |
| Branch | ui-refactor | ui-refactor |
| HEAD | 2f6e7427c553b7535f53860d1732b42df7c023e8 | same |
| Dirty tracked | 68 | 68 |
| Staged | 0 | 0 |
| Untracked | 3,733 | 3,754 |

The 21 new files consist of nine in the preserved unsuccessful local candidate and twelve in this review candidate. All remain unstaged. Removing only these new status entries reproduces the original status SHA-256 `49fa3b1c78ea1a398ef794988d7194195ec1d8172af5c702a83a61d7d022e1d5`.

New evidence files explain every addition: code/manifest, patch, focused TAP, local check results, preservation verification, this report, and complete inventories; the earlier local revision also includes its failure summary.

## Review boundary

The new bundle/manifest supersede earlier candidate hashes for this proposed code only; the earlier artifacts remain historical evidence. No old proof or approval fingerprint is adopted for the new bundle.

After independent review, any later production step still requires separately authorized fresh verification, protected-root ACL/ownership verification, a new exclusive drained execution window, exact artifact-bound human authorization, and current matching catalog/data preservation evidence. None was created or performed here. No runnable installation authorization is provided.

No Supabase, PostgreSQL, endpoint or production calls; no protected-state access, ACL changes, real authorization/lock/attempt files, SQL submission, migrations, deployment, Git staging/commit/push, Storage/frontend/UAT/pagination changes.
