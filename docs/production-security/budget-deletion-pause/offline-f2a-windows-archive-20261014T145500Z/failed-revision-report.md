# Preserved intermediate F2-A revision

**OFFLINE FIXTURES ONLY — NOT AUTHORIZED FOR PRODUCTION.**

One suite launch: 2026-10-14T14:54:14.7681077Z through 14:54:16.9249883Z; exit 1, no timeout or retry. Source/tests/launcher/logs/receipts and all synthetic fixtures are preserved byte-for-byte.

The actual Win32 rename with NULL RootDirectory and absolute destination succeeded. Preexisting file and directory destinations were rejected, and normal file identity/bytes/timestamps were preserved. Of 26 emitted assertions, 9 passed and 17 failed. Sixteen concurrency cases and the late-destination case failed with IOException. Static inspection found the test's File.ReadAllText reader used ordinary sharing while the native DELETE-capable source handle was still held; the tests also attempted DELETE-capable Capture while a prior exclusive rename handle remained held. These are harness-sharing defects, not evidence that the primitive overwrote a destination. Read-only inspection of the retained race-00 and race-01 fixtures showed one archive and one surviving contender each; the late-destination fixture retained both files. The failed assertions are retained and are not converted to PASS.

Hardlink creation then returned “Access is denied” before the hardlink, independent-process race and abrupt-exit cases executed. No alternate link-creation API, privilege escalation or retry was attempted. The earlier junction denial likewise remains BLOCKED.

A separate subsequent candidate will preserve the same rename logic, use a sharing-compatible read-only test reader and close race lease handles before opening new DELETE-capable snapshot handles. It will test fresh unique fixtures and omit denied link-creation attempts with explicit BLOCKED reporting. That is an offline test revision, not a retry or repair against this retained state.

No fixture cleanup, restore, deletion, protected-state access, credential/network/production I/O or authorization occurred.
