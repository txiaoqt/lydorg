# OFFLINE CAPTURE CANDIDATE — NON-RUNNABLE — NOT AUTHORIZED

This is an unexecuted proposal for a future, separately authorized **local fixture-only** diagnostic. It authorizes no run, production/protected-state access, SQL, or operational action. Do not invoke it in this task. Prior candidates and Run 03 evidence remain separate.

## Fixed inputs

- Revision-2 `proof-file-fixtures.cs` copy SHA-256: `275e4f8e40b94d19ae1f275d73f652ee04be98715c2a98fa78914b34bcb89476`.
- Revision-2 `invoke-fixture-tests.ps1` copy SHA-256: `aa0b260aafeb763e0daa82e7a711317c2db2e4c81b8923e368cb4fa47d6bb33f`.
- Both copies are unchanged; the harness still has 22 cases and 39 textual `Assert-True` occurrences (38 calls plus declaration).

## Proposed capture boundary

`run-sanitized-capture.cmd` is the sole documented future entrypoint. It does not forward caller arguments, disables echo, launches the sibling PowerShell wrapper, and redirects the wrapper's stdout/stderr to `NUL`; it returns a numeric exit code only. Do not launch the `.ps1` directly. The script rejects arguments and derives source, harness, evidence, and fixture paths from `$PSScriptRoot`.

The wrapper pins and holds read-only handles on the source/harness, then rechecks their hashes after the child exits. It canonicalizes paths, checks existing path components for reparse points, and gives the child one GUID directory under this package's `test-fixtures` as both `TEMP` and `TMP`. `CreateDirectoryW` provides create-new behavior. There is one child start, no fallback/retry, and no recursive delete.

Child stdout and stderr are separately piped and drained with line, count, byte, and lifetime bounds. Stdout is held only in bounded memory; raw stderr is never retained. Only the 22 fixed TAP labels, plan, and numeric summary are kept. Skip reasons and failure details are replaced; every other line is omitted and counted. Parse/launch/filter/hash/path/cleanup ambiguity fails closed. The CMD launcher suppresses PowerShell output, including errors before the script can sanitize them.

After bounded capture, stable hashes, and safe empty-only fixture cleanup, the wrapper writes one create-new JSON record under `capture-evidence`. It contains only: `runId`, UTC start/end, numeric child exit, filtered TAP lines, stderr-present boolean, suppressed-line counts, and source/harness hashes before/after. It contains no paths, raw output, command line, executable/script names, environment values, usernames, or stack traces. Unrecognized lines are dropped and counted; a nonzero CMD result means failure even if a sanitized record exists. Evidence-write uncertainty is not retried; a partial sanitized JSON may remain.

The complete field list is the one above. Exit `0` is reserved for a complete valid capture, zero child exit, no stderr, unchanged inputs, successful cleanup, and verified evidence write. Any nonzero exit is failure, even if evidence exists. Exit meanings and artifact identities require independent review before future use.

## Cleanup and retention

Only the exact newly created GUID directory may be removed, once, non-recursively, after child/reader termination, fresh containment and reparse checks, and proof it is empty. Otherwise it is preserved and a fixed nonzero exit is returned. Timeout directories are always preserved. The fixture parent/evidence folder are never recursively removed.

## Evidence contract

The wrapper's launcher still relies on the process `SystemRoot` value to locate Windows PowerShell; the script checks the reported Windows directory, but that OS launch boundary has not been independently established. No raw streams, paths, machine/user identity, command line, environment value, credential, or private-state content belongs in evidence. Never retry a failed/uncertain run.

## Static-review limitations

No PowerShell parse, C# compilation, child launch, fixture creation, or execution was performed. Windows API/encoding behavior, process-tree termination, filesystem race resistance, ACL/owner guarantees, and machine-failure behavior are unverified. `CreateDirectoryW`, capture logic, CMD launcher, and host-executable selection need independent review plus disposable Windows validation before any separately authorized run. This is not a full security audit or production readiness result.
