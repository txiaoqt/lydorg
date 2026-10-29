# F2-A real Windows archive review and test evidence

**NON-RUNNABLE FOR PRODUCTION — NOT AUTHORIZED.**

## Result

The actual same-directory no-overwrite rename primitive is evidenced on this Windows x64/NTFS workstation. **28/28 executed assertions PASS. F2-A is incomplete / BLOCKED for direct redirection coverage, and full F2 remains BLOCKED.** This package authorizes no production, protected-state, Decision A, Decision B, preflight or installation operation.

The final isolated candidate is:
docs/production-security/budget-deletion-pause/offline-f2a-windows-archive-20261014T145700Z/

There are two additional separately preserved unsuccessful fixture revisions, ending 144500Z and 145500Z. No existing source, F1 package, prior F2 candidate, report, SQL, native runner or evidence was modified.

## Baseline inspected before editing

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused
Branch/HEAD: ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8
Baseline: 68 dirty tracked, 0 staged, 3,881 untracked.
Git porcelain SHA-256: 3f249a9b9aee63b16d12c0db02744b98fa45a3e362b1acc17af8efaca9b6d894
(UTF-8 lines joined LF, no terminal LF; GIT_OPTIONAL_LOCKS=0 and core.fsmonitor=false.)

Before editing, the actual original F2 engine/test sources, boundary contract and review were inspected. Its archive provider was an in-memory Map model. The original F2 identity was recomputed from exact manifest bytes and actual code identities, in manifest order:

| Original F2 artifact | Verified SHA-256 |
| --- | --- |
| Bundle | a52dd7ebdfa1b99bcbc5915992025e2f906fe59fe22febd80e40b681b15aa47a |
| reviewed-inputs.json | c4dcd431e0eba49ff0df4014902c4cb3a3451d50b4eedca36f1351ebef2c567f |
| candidate-artifact-inventory.json | 104ec2876054a533a4500754ed70f99ed99811912347a5b14d427cff66dfc1bc |
| io-boundary-contract.md | 30e7690f624d288b6b325b6fb9b337c899885f376a07a23b5c27777bb7a5a94e |
| integration-review.md | 0217be6dd5527ef72122ebb0042cc7a985033c1ab962211bda4760c6ef033cae |
| Independent trusted-I/O review | 725a45d24c13a76af46e2fc757e549ce95ff501dacb2eb851948bac3583ed44f |

The original 254 non-protected preservation references matched. Adding the complete two unsuccessful new fixture revisions yields 367 verified preserved references. Those hashes/sizes are pinned in reviewed-inputs-preservation.json. Reads were local and limited to those non-secret source/evidence files; no protected path, private environment, credentials, CA or proof was opened.

## Primitive and exact source scope

windows-archive-fixture.cs is a new fixture-bound C# library. Its hard-coded root is this candidate's fixtures tree. It has no executable production entrypoint or arbitrary external root option.

1. Validate canonical local path and plain source/destination leaves; reject traversal, alternate-stream syntax and same leaf.
2. Hold each directory from C:\ through the fixture parent with OPEN_REPARSE_POINT and share-read-only. Reject reparse attributes and mismatched final paths.
3. Open and hold the source with read/DELETE access and share-read-only. Verify parent/source file IDs, one hardlink count, size <=65,536 bytes, SHA-256, creation/last-write times.
4. Submit one actual SetFileInformationByHandle(FileRenameInfo=3) with ReplaceIfExists=FALSE, NULL RootDirectory and an absolute same-parent destination. No copy/delete flag, alternate primitive or fallback exists.
5. On success, verify the original handle now names the destination; the destination has the same file ID; bytes/times remain unchanged; the source name is absent.
6. Known destination collision is returned as rejection. Unknown native or post-submission verification state remains unresolved. Dispose only closes handles. No file deletion, copy, rename-back, retry or repair path exists.

The submission guard is per prepared fixture operation. This is **not** F1 authorization-wide durable consumption and cannot satisfy that separate guarantee.

Actual observed NTFS race behavior is evidence for this narrow operation; finite tests are not universal proof against all Windows actors or filesystem behaviors.

## Actual tests, commands and logs

Platform: Microsoft Windows NT 10.0.26300.0, x64, fixed local NTFS volume.
Runtime: PowerShell 7.6.5 / .NET 10.0.11.
The final PowerShell file passed parser inspection (0 parse errors). Add-Type compiled the actual two C# sources in the suite and three fixed test children. Source/test/child paths were inspected before execution.

The actual final process command was:

Executable:
C:\Users\Christopher x Angel\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe

Argument array:
-NoLogo
-NoProfile
-NonInteractive
-File
C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused\docs\production-security\budget-deletion-pause\offline-f2a-windows-archive-20261014T145700Z\invoke-fixture-tests.ps1

It was started through ProcessStartInfo (UseShellExecute=false), not an interpolated shell command. Environment inheritance was cleared; only literal SystemRoot/WINDIR plus candidate-local TEMP/TMP were set. No execution-policy bypass or ACL change was used. Cwd was the repository root. Outer bound was 45 seconds.

Final actual run: 2026-10-14T14:56:57.8593868Z through 2026-10-14T14:57:03.4607137Z.
Suite exit 0; no timeout; one suite launch, no automatic retry.
The two contenders used the same fixed child executable/script with -RaceFixtureOnly A/B. Each prepared its distinct source, signaled READY over stdout, waited for GO over stdin and submitted once. The abrupt-exit child used -CrashFixtureOnly and deliberately exited 73 after the actual rename and before verified acknowledgment.

| Required or related property | Actual result |
| --- | --- |
| Same-directory native rename preserves file ID/data/creation/last-write | PASS |
| 16 paired-thread races to one destination | PASS: exactly one winner per race, loser Win32 183, source bytes retained |
| Two actual independent child-process contenders | PASS: one winner; loser REJECTED_DESTINATION_EXISTS/183; no global test mutex serializing submission |
| Preexisting file or directory destination | PASS: rejected, existing destination and source preserved |
| Destination created after handle preparation | PASS: kernel rejects collision |
| Source pathname replaced after binding | PASS: real replacement rejected; displaced original and replacement bytes retained |
| Directory pathname replaced after binding | PASS: real replacement rejected; original and replacement source bytes retained |
| Existing source content changed | PASS: rejected before rename; current source data retained |
| Held parent/source tamper (move/write) | PASS: actual conflicting operations fail; admitted source remains usable |
| Traversal/root/alternate-stream/same-leaf input | PASS: rejected before rename |
| Second submission on same prepared object | PASS: rejected without second native call |
| Real abrupt child exit after possible/completed rename | PASS retention assertion: actual operation remains UNRESOLVED_NO_VERIFIED_RECEIPT; archive retained; no resubmit or cleanup |
| Source-parent junction/redirected destination | BLOCKED: actual fixture junction creation returned Access is denied in first preserved revision |
| Hardlink source | BLOCKED: actual fixture hardlink creation returned Access is denied in second preserved revision |

The 28 passing assertions exclude the two blocked link properties. No boolean receipt, Map, mock archive or callback substitute implements the rename. Synthetic content is written to actual local files; concurrency, kernel calls, file identities and state checks are real.

Raw stdout: actual-tests.stdout.tap, 3,290 bytes, SHA-256 a696737a5de0de4e6e4dd615b15bbd8ce650061ab185a4a67c2d94f263ce64ad.
Raw stderr: actual-tests.stderr.log, 0 bytes, SHA-256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.
Command/result: test-command-and-result.json, 935 bytes, SHA-256 99da9f23d094046042fcefa1430486dbd4a810f813fa3e2db3c3430f12839ef3.

## Preserved unsuccessful revisions

All code, logs, command receipts and fixtures in each earlier revision remain intact, with a separate failed-revision-report.md and complete inventory.

| Revision | Actual run result | Preservation |
| --- | --- | --- |
| 144500Z | 3 PASS / 22 FAIL, exit 1. Native error 87 with non-null RootDirectory/leaf layout. Junction creation then denied before later cases ran. | 56 files retained |
| 145500Z | 9 PASS / 17 FAIL, exit 1. Corrected native call succeeded; assertion readers used incompatible sharing while rename handles remained held. Hardlink creation then denied. | 57 files retained |
| 145700Z | 28 PASS / 0 FAIL, exit 0. Corrected fixture reader shares DELETE; race handles close before new snapshots. Link cases remain explicitly blocked. | Final source, logs and all 51 synthetic files retained |

Each revision used distinct new fixture paths. No failed or ambiguous fixture operation was retried, repaired, restored, cleaned up, or relabeled as successful. The later code revisions are independently named offline experiments, not a runtime fallback.

## Exact final identities and diff

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| windows-archive-fixture.cs | 15,437 | 86f5ec628164a2497be37b83fc9bf1ab64fc99d80ebe559220709655e71b3753 |
| windows-archive-fixture.tests.cs | 19,152 | 4d6e48eb6f3eb98878cd4e85e936b0ec826640911af76de8c786931a69edabca |
| invoke-fixture-tests.ps1 | 4,426 | 6cc37401f6217562313fe223af46b1fa45658fbe01824161b9961004bb768799 |
| reviewed-inputs.json | externally checked | a3a0fbb4c9bcb48adbb0afdc376907a06372c4ed1a1f68e21c30e37a74cb8c05 |
| reviewed-inputs-preservation.json | 84,946 | cef446488b7b391d66ef3bda5fc44778467fcbfc03645462a7de137594b7c6a0 |
| source-additions.patch | 40,889 | 861a0cff2e643aad0a76789cdf9252b8c284186e3b110bc82d79f3db300a9587 |
| revision-01-to-02.patch | 17,768 | 2da0edd7b7ec9733690ec52f372a80573a9cf49fdaa79ebfeb73749599f11a3f |
| revision-02-to-03.patch | 6,851 | 89ba923009af31d6f64ae97ff3bb41c3487ed5aa1cf14dceb2304a26c1db9e23 |

Bundle SHA-256:
d9b524028241677f1d332406a5bb8268002653769e1efedcbbcb3ab9e995159d

Derivation: SHA-256 of UTF-8 compact JSON {manifestSha256,codeHashes}; the exact manifest hash and actual code entries in codeIdentities order. Source additions are a new-files unified diff. Inter-revision patches show every source/test/launcher change. No patch changes the original F2, F1, SQL or native runner. Git issued CRLF-conversion warnings while reading diffs; the subsequent byte-hash preservation check must still match. No line endings were rewritten.

The complete final file inventory includes all 51 retained fixture files, source, logs and review artifacts, excluding only the inventory itself. Its SHA-256 and this report's SHA-256 are reported externally to avoid circular self-hashes.

## Worktree and scope preservation

Expected closing state after the two final create-new review artifacts:
branch/HEAD unchanged; 68 dirty tracked; 0 staged; 4,056 untracked.

Task additions: three uniquely named directories only, 178 total files:
56 first unsuccessful revision + 57 second unsuccessful revision + 65 final candidate.
Three retained stderr .log files are ignored by existing Git rules, so 175 additions appear as untracked. Empty compiler-temp directories have no Git entry. Every exact file is in its candidate's inventory; no bulk staging occurred.

The closing read-only check must verify those counts, all 367 preservation hashes, complete final inventory, and that excluding only these three new prefixes reproduces the baseline porcelain SHA-256 above. Actual checked results are returned in the Codex response.

No existing file was written, removed, renamed or repaired. No protected directory, credential, CA, proof, private environment, network, Supabase, PostgreSQL, ACL helper, preflight, production runner, authorization/lock/attempt state, SQL, migration, Git stage/commit/push, deployment, frontend, pagination or UAT operation occurred.

## Remaining F2 gaps and next review boundary

- Direct real junction/symlink/reparse and hardlink race evidence is BLOCKED by observed fixture-creation denial; its cause is not established. No alternate API or privilege workaround was attempted.
- Owner/effective ACL validation and preservation were not tested. A rename preserving file ID is insufficient evidence for those requirements.
- Power-loss survival, directory-entry durability, security against privileged actors, storage failure and filesystem/OS variants were not tested. Flush calls in synthetic file setup do not establish those guarantees.
- Alternate namespace/case-sensitive-directory/other Windows boundary guarantees remain unproven beyond the exact input and interference cases exercised.
- Real scoped get_project, protected-root proof archive/create/read and other trusted providers are not implemented or wired.
- F1 authoritative consumption and F3 actual fixed native-preflight child/deadline/output boundaries remain separate blockers.

Independent offline review of this narrow primitive/evidence is appropriate. This report prepares no continuation or installation authorization and does not establish production readiness or full F2 PASS.
