# Offline outer preflight wrapper correction

LOCAL CANDIDATE — NOT APPROVED FOR LIVE EXECUTION. No new authorization is proposed.

## Exact rejected wrapper

The wrapper was an inline PowerShell command submitted to exec_command during Decision A. A repository search found no saved wrapper. rejected-inline-wrapper.ps1.txt preserves the submitted command text from the conversation, UTF-8/LF, without a trailing newline: 1,885 bytes; SHA-256 d2a6a7f93cbb8a8a4190583db2a8a44535164cd3b58f802d53c8ee3e01fec99a. This is a new historical transcript snapshot, not a recovered disk file or a signed provider receipt. It must never be executed. The recorded rejection happened before process creation; no native preflight ran.

The prelaunch script checked an explicit UTC interval and proof age. The completion script only printed withinFiveMinutes/withinApproval and the outer command returned the native child's exit code. Thus expiry at completion could leave a zero exit. Date.parse also lacked strict explicit-offset/calendar validation.

## Correction

- deadline-controls.mjs parses the original explicit-offset ISO proof value and explicit-UTC ordered validity bounds. No timezone-free PowerShell date text is used. Calendar normalization, -00:00, whitespace, invalid precision/components, missing values and noninteger clocks are rejected. Up to nine fractional digits are compared as integer nanoseconds.
- Proof age zero through 300 seconds and validity start/end are inclusive. Any exceeded boundary fails. The launch gate is adjacent to the sole launch site. Completion gates run immediately after the child and after evidence reads/verification; validation time counts. Wall-clock regression and monotonic elapsed deadline crossing fail closed.
- One wrapper object is consumed by its first call, including a blocked call. There is one launch site and no reconnect/retry/refresh/repair/cleanup/relaunch capability. A deadline-crossing or zero-exit stopped child yields BLOCKED/exitCode 2, never PASS.
- The public preflight-wrapper.mjs facade fixes the reviewed evidence validator; callers cannot replace it. preflight-wrapper-engine.mjs is an internal orchestration seam used with a strict synthetic verifier in offline tests. It is not a live launcher.
- The fixed validator requires the reviewed runner's PASS result and mode, matching stable reread evidence bytes, Verify-only root/file ACL confirmations, exact scope/proof/bundle/CA identities, PostgreSQL/read-only identity, original RPC/catalog, all 57 inventories against pinned baseline bytes, foundation/protection state, migrations, policies, object count and recalculated snapshot/result fingerprints. The historical whole-state fingerprint is not an expected current fingerprint.
- Proof JSON is restricted to the compact JSON serialization (with optional final LF) used by the reviewed fresh-proof creation path; this rejects duplicate/escaped-key ambiguity. This is an additional fail-closed formatting restriction to review.

## Offline test boundary

The test module uses only generated in-memory proof/evidence bytes, synthetic clocks, fake launch callbacks and memory maps. It never opens a file, launches a child, reads environment variables, runs an ACL helper or connects to a database. Imported old budget/core modules are pure at import; none of their filesystem/connection helpers is called. Syntax/test execution uses the pinned Node v24.21.0 executable with a literal minimal child environment containing SystemRoot, WINDIR and TZ only. No env-file is loaded.

The engine success tests use an explicitly synthetic verifier. The public fixed validator is tested to reject replacement and synthetic/missing pinned references; a complete positive production-evidence verification is NOT TESTED. No live success is claimed. Tests cannot replace required fresh preservation comparisons.

## Remaining integration/review gates

This package exports controls and deliberately supplies NO live CLI, environment loader, process transport, protected-file reader or ACL invoker. A separately reviewed trusted integration must bind the exact pinned Node/native --preflight invocation, independently verify authorization and artifact/CA/root security, provide the approved in-memory proof/reference bytes, and perform fixed-root read-only evidence rereads and Verify-only ACL checks. No arbitrary SQL, endpoint, mode or credential input is added. Review this entire integration before proposing a new bounded continuation authorization.

The wrapper rejects an overrun at completion; it does not forcibly cancel an already-running PostgreSQL request. No live transport is provided or exercised. If a hard wall-clock cancellation deadline is required, design/review that read-only child stop behavior separately, including possible partial evidence. A finite child completion is an integration prerequisite.

One-use enforcement is in memory, not durable across a new process/object; no authorization, lock or attempt file is created. Existing external single-attempt supervision/authorization remains necessary. Missing evidence, unsafe ACLs, drift, uncertain child outcomes or any expiry remain unsuccessful and retain all on-disk evidence; only owned memory copies are zeroed. No file write/delete capability exists in the corrected modules.

Decision B, SQL installation, evidence refresh, protected-state handling, control-plane access, production connectivity and any deployment remain outside this offline candidate. No approval fields are populated. Independent review is required before any continuation proposal.
