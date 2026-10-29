**BLOCKED — offline correction review only.**

Independent reviewer: /root/offline_wrapper_review. Reviewed immutable candidate outer-preflight-wrapper-candidate-20261014T052849Z at ui-refactor HEAD 2f6e7427c553b7535f53860d1732b42df7c023e8. Reviewer modified no files and executed no tests.

## F1 — compare clocks with each preceding checkpoint

The completion gates compare wall time only with launch and monotonic time only with its starting sample. Later wall samples +100s, +200s, +150s can pass; monotonic samples can similarly regress while remaining above the starting sample. This contradicts the README regression guarantee. Track and compare both prior samples at every checkpoint; test both regressions and an increasing sequence. P2; deadline-controls.mjs:54–56 and preflight-wrapper-engine.mjs:52,66,77.

## F2 — reject malformed numeric evidence before normalization

preflight-evidence.mjs:77 converts quiescence counters with Number(), accepting null/false/empty string as zero. Imported unchanged verifyNativeIdentity also coerces backend PID, accepting malformed, zero or negative PIDs. normalizeProtectedData coerces inventory row_count, allowing malformed zero-equivalent counts to preserve the expected digest for zero-row baseline relations. Pinned identity/inventory SQL emits JSON numbers. Add strict safe-positive-integer backend PID, safe-integer-zero activity counters and safe-nonnegative-integer actual inventory row counts in the NEW outer validator before invoking unchanged core helpers. Add synthetic malformed-value tests. P2.

## Other review results

The other static controls support strict ISO/nanosecond time validation, inclusive nonfuture 300-second and UTC bounds, completion gates covering evidence work, one consumed launch opportunity, blocked zero-exit failures, retained evidence, fixed public validation and preservation comparisons. No trailing-terminator parser defect was established; that suspicion was retracted after the main agent's five-variant pinned-Node probe.

Declared limitations: no live transport/CLI, forced child cancellation, durable cross-process one-use enforcement or complete positive public-validator test. These are not extra findings and are not production-readiness claims.

## Reviewed identities

Manifest 7d9e36d702d72daee95e211acbcb70be9ac45c065f285011d0a7ce9ba7422e90
Deadline controls cf7c5a6a0542f219383159f02f34c3f7d5555ff80a5a8fe31ccdf8eba64600eb
Evidence validator 1d089ceb24e9d102b6c0d355dab07a073c52e2da428d18b0953a6144f2380557
Engine 1823bdbbbd4b211937cfc87896555e48830612a36bbcdc94c1a34e9345cd6a46

This preserved summary records the independent review; no authorization is granted. The first revision and its 78/78 test logs remain an unsuccessful intermediate candidate. No original source, manifest, log or historical evidence was overwritten.
