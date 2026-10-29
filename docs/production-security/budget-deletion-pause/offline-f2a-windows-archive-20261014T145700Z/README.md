# F2-A: one Windows archive primitive

**NON-RUNNABLE FOR PRODUCTION — NOT AUTHORIZED. Offline fixture harness only.**

This package supplies no trusted-I/O provider, production entrypoint, protected-root binding, preflight integration, continuation authorization, or F1 durable authority. The only admitted filesystem tree is this candidate's hard-coded fixtures directory. The test entrypoint is executable only for those synthetic local fixtures; it is not a runnable Decision A package.

## Implemented property and limits

The library holds non-reparse directory handles from the local drive through the fixture directory, plus an identity/content-bound source handle. Directory and source sharing denies competing write/delete opens while the operation runs. It performs one Win32 SetFileInformationByHandle call using FileRenameInfo (3), ReplaceIfExists=FALSE, NULL RootDirectory and an absolute destination in that same held directory. The destination leaf is validated. There is no copy/delete fallback, alternate primitive, rename-back, cleanup, or retry. Dispose closes handles only.

Expected parent/source file IDs, SHA-256, size, creation time and last-write time are checked before submission. Success additionally requires the same file ID at the new destination, unchanged data/times through the held handle, and source-name absence. A preexisting destination is rejected by the actual no-replace kernel call, including one created after preparation. Unknown failures and post-submission verification failures remain unresolved.

This is finite real-filesystem evidence on local Windows x64/NTFS. It does not prove every Windows race, filesystem, reparse mechanism, security descriptor or durability behavior. Junction and hardlink fixture creation were denied in earlier preserved runs, so those guards have no direct redirect/hardlink acceptance evidence here. No permission escalation or alternative link API was attempted.

## Actual test process

The reviewed command was the following argument array, invoked through System.Diagnostics.ProcessStartInfo with UseShellExecute=false, not through a shell command string:

- Executable: C:\Users\Christopher x Angel\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe
- Arguments: -NoLogo, -NoProfile, -NonInteractive, -File, C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused\docs\production-security\budget-deletion-pause\offline-f2a-windows-archive-20261014T145700Z\invoke-fixture-tests.ps1
- Cwd: C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused
- Child environment cleared, then only SystemRoot/WINDIR=C:\Windows and TEMP/TMP=this candidate's compiler-temp directory.
- Outer timeout: 45 seconds; one suite launch; no relaunch/retry.
- Child race invocations use the exact same executable/script with -RaceFixtureOnly A or B, clean environment and fixed fixture paths.
- Abrupt-exit invocation adds -CrashFixtureOnly and exits 73 after a successful kernel rename, before producing a verified receipt.
- No execution-policy flags, ACL changes, credentials, CA reads, network or production imports.

Do not blindly rerun this command: retained session-01 fixtures intentionally make repeated suite execution stop. This document is test traceability, not production or repeated-test authority.

## Results

28/28 executed assertions passed, including sixteen paired-thread races and one two-independent-process race. Every race had exactly one successful archive and one Win32 183 collision rejection; each source was submitted once. Actual late/existing destination rejection, source/directory identity substitutions, content changes and held-handle interference were checked. Normal rename preserved file ID, bytes, creation and last-write times.

The real abrupt-exit case retained the archive and was explicitly classified UNRESOLVED_NO_VERIFIED_RECEIPT. No retry, source recreation, rollback or fixture cleanup followed. All synthetic fixtures from all three revisions remain intact. A passing assertion verifies retention and classification; it does not turn the abrupt-exit operation into verified success.

Two link-related properties remain BLOCKED: junction/redirection and hardlink fixtures. ACL/owner preservation, power-loss/directory-entry durability, other Windows boundary guarantees, trusted scoped control-plane providers, F1 authoritative consumption and F3 real preflight-child boundaries remain separate blockers.

## Prior evidence

The original trusted-io-integration-candidate-20261014T083531Z remains unchanged; its archive was only a Map model. This package does not patch or wire it.

Two unsuccessful new fixture revisions remain separately preserved:

1. offline-f2a-windows-archive-20261014T144500Z: native error 87 with non-null RootDirectory/leaf layout; 3 PASS / 22 FAIL, followed by junction-creation Access is denied.
2. offline-f2a-windows-archive-20261014T145500Z: corrected native rename, but sharing-incompatible assertion readers caused 17 failures (9 PASS); hardlink creation then returned Access is denied.

The final revision uses the same corrected rename logic as revision two, changing only its fixed synthetic path. The test reader shares DELETE, and race handles close before taking new DELETE-capable snapshots. Existing files were never edited or retried. Added-file and inter-revision patches preserve the exact changes.

## Evidence map

- windows-archive-fixture.cs: actual kernel primitive, fixture-bound only.
- windows-archive-fixture.tests.cs and invoke-fixture-tests.ps1: inspected actual-filesystem tests and fixed child harness.
- actual-tests.stdout.tap / actual-tests.stderr.log: raw process streams (stderr empty).
- test-command-and-result.json: exact executable/arguments, times, exit and environment names.
- source-additions.patch: exact added source/test/launcher diff.
- revision-01-to-02.patch and revision-02-to-03.patch: exact source-level revisions; prior files untouched.
- reviewed-inputs-preservation.json: 367 verified prior/reference/failure-artifact identities.
- reviewed-inputs.json: this candidate's source/evidence pins and bundle derivation.
- candidate-artifact-inventory.json: complete file inventory including retained synthetic bytes; excludes itself, its SHA-256 is reported externally.
