# Preserved unsuccessful F2-A revision

**OFFLINE FIXTURES ONLY — NOT AUTHORIZED FOR PRODUCTION.**

This first revision is unsuccessful and is not relabeled as the corrected revision. Its code, test launcher, stdout/stderr, command receipt and synthetic fixture bytes remain intact.

Actual run: 2026-10-14T14:50:10.3475479Z to 14:50:13.7364640Z, Windows 10.0.26300 / x64 / NTFS / PowerShell 7.6.5. Child exit 1; no timeout; one suite launch, no automatic retry.

The emitted 25 assertions contain 3 PASS and 22 FAIL. The rename smoke case returned Win32 87 (ERROR_INVALID_PARAMETER); the other rename-dependent assertions failed. Their assertion names are not proof of overwrite: the retained files must determine their actual state. Junction setup then failed with “Access is denied” before the junction, hardlink and crash cases ran. Those cases are NOT TESTED in this revision. The reason for junction-creation denial is not established.

The x64 buffer supplied a non-null RootDirectory and leaf name to the Win32 FileRenameInfo API. A separate subsequent source revision will test the same API with a null RootDirectory and an absolute destination, while retaining the held ancestor/source handles and ReplaceIfExists=FALSE. This is a code revision with fresh fixtures, not a runtime fallback or resubmission against these files. No copy/delete fallback exists.

No fixture cleanup, restore, path repair, retries, protected-state access, credentials, network, production runner, SQL or authorization occurred. No full F2 claim is made.
