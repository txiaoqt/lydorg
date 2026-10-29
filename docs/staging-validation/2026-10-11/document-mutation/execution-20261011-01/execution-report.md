# Controlled staging patch execution — stopped before database writes

Project: `zroudsvpswqsjlyttkjf`. HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
Existing dirty working tree preserved. Production was not accessed during this execution.

## Results

| Check | Status | Actual evidence |
|---|---|---|
| Exact control-plane target | PASS | Supabase get_project returned ytrace-staging, expected ref, ACTIVE_HEALTHY |
| Fixture-operation lock acquired | PASS | Exclusive file creation, PID 29924; process subsequently exited unexpectedly |
| Existing journal/identity/ownership | PASS | Official getUserById, exact email, trusted app marker, one identity; six files and recorded relationship |
| Exact damaged target matches reviewed row | PASS | Fresh complete metadata comparison with reviewed forensic snapshot |
| Approved renewal, parent, five peer documents | PASS | Approved cycle, approved_green parent, five approved_green peers |
| Existing A/B/suspended profiles | PASS | Fresh selected profile fields equal preserved journal snapshot |
| Original PDF actual bytes | PASS | 673 bytes; SHA-256 6e71339ae9f1ed382362a22da0ad7ae6f272a39e3ee565de51beb16f3e35103f |
| Corrected PDF actual bytes | PASS | 674 bytes; SHA-256 67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d |
| Reviewed source SQL hashes | PASS | Both exact hashes match validation-summary.json |
| Combined SQL prepared | PASS | SHA-256 3ff3e637c9883da22b288bb1dc424e4792aa36f31717c24c5f5e47adcf8a012c; exact locally tested composition |
| Lock holder remains alive | FAIL | Noninteractive execution input closed; Node exited code 1 with unsettled top-level await |
| Complete catalog/policy/admin inventory gate | NOT TESTED | Execution stopped before this remaining pre-write gate |
| Atomic reconciliation and guard installation | NOT TESTED | No apply_migration or mutation SQL submitted |
| Patched real HTTP security assertions | BLOCKED | Patch not installed |
| Separate positive revision workflow | NOT TESTED | No fixture mutation attempted |
| Multi-session PostgreSQL contention | NOT TESTED | No concurrency run attempted |
| Browser/PWA/interruptions | NOT TESTED | No browser run attempted |

The service-role forensic downloads above prove file contents only; they do not prove organization authorization. Fresh sanitized HTTP timings/statuses and record snapshots are retained in preflight.json. No keys, tokens, passwords or signed URLs were written to the report.

## Confirmed final state

A fresh staging control-plane SELECT after the stop returned:

```json
{"patch_installed":false,"target_status":"submitted","renewal_status":"approved","reconciliation_audits":0}
```

The process was verified absent. Only its own exact PID/project/phase-matched stale lock was removed. No Auth login/session creation, fixture modification, reconciliation, DDL, file write/delete, production operation or deployment occurred. Existing evidence and reviewed SQL are preserved. The authorization was not automatically retried.

## Narrow local runner correction

The new preflight helper now refuses noninteractive terminal launches before acquiring a lock, resumes terminal input, holds an explicit keep-alive, and rejects an input-close/error through its cleanup path. A future separately authorized run must launch with an allocated interactive terminal. This is an execution transport correction, not a change to reviewed SQL. It has not been rerun against staging.

## Readiness

**Capstone UAT: BLOCKED for release sign-off.** The known approved-document mutation vulnerability remains deployed, and the damaged metadata remains unreconciled. Completed renewal history remains approved and preserved.

**Production Storage security rollout: BLOCKED.** Requires successful staging atomic installation, post-patch genuine-session HTTP assertions, eligible positive revision validation, contention evidence and authenticated browser/PWA checks, plus previously documented production compatibility review. No production rollout is authorized.

## Continuation

Fresh authorization is required following this unexpected execution error under the user's explicit stop/no-automatic-retry condition. The next controlled attempt must use the corrected interactive lock holder, a new report directory, fresh full catalog/policy/actor/term gates, and the same reviewed source SQL hashes. Do not reuse this preflight as a substitute for immediate checks or restore the vulnerable RPC as rollback.
