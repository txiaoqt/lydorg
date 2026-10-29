# Y-TRACE budget deletion pause — native adapter readiness

**Decision: CONDITIONAL GO for a separate future installation authorization; NO-GO for installation in this task.** The dedicated adapter and offline checks are ready for a later fresh read-only native preflight. Production installation was neither authorized nor attempted here.

## Scope and outcome

- Exact approved SQL stayed byte-identical: 11,945 bytes, SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`.
- The standalone adapter is in `native-adapter-20261013T050122Z/`; it has no arbitrary SQL, endpoint, project, database, role or fallback-route inputs.
- The adapter bundle is `01b42ba7f4ff814cfbd6aa622504ffb5da03c27cbe2f2c102212f46763b5559f`. The complete helper/input manifest is `reviewed-inputs.json`, SHA-256 `cdd186cc57911774f8f1a67d7a4cdd78c928b761c9dacbec041841bf38ec32eb`.
- The manifest pins all 10 SQL/receipt/runtime inputs, the 4 adapter source files, `package-lock.json`, and every file in the `pg` 8.23.0 runtime closure (138 files; closure SHA-256 `08b98ef8f7b3bba88c947bebededda974e18940645a9f2b61f2de7a050dfd736`). The installed foundation verifier/core and read-only receipt are identity-pinned; the foundation itself is preserved as a supplemental postflight invariant.
- The runner's offline `--review` passed. It reports `connectionAttempted:false` and `installationActivated:false` in `offline-review.json`.
- Focused adapter suite: **22/22 PASS**, preserved in `focused-tests.tap`. It covers fixed scope and hashes, all 57 inventory comparisons, supplemental foundation drift, ROLLBACK parsing, TLS configuration/hostname/chain-failure simulations, lock contention, one-shot marker behavior, no retries, uncertain outcomes, reconciliation, receipt sanitization and Windows ACL behavior.
- Earlier implementation iterations had local test failures while the transaction-boundary parser and ACL helper were being tightened. They were corrected; the final 22-test suite has zero failures. No prior SQL/UI acceptance tests were rerun.

## Safety boundaries

- The approved SQL submission would be one byte-verified `pg.Client.query()` call, preserving its transaction and timeouts. No automatic reconnect/retry, appended SQL, rollback statement, migration receipt or general-purpose SQL input exists.
- All read-only verifiers are pinned to their original `ROLLBACK` terminal tag. The installer requires a fresh project proof, current CA hash, fresh approved preflight, exact local authorization binding, drained budget-delete calls and an exclusive window.
- A lost response consumes the marker and retains the lock. A separate read-only connection checks the original backend PID/start/application identity is finished before comparing old/new catalog and preservation state. Every reconciliation result stops for human review; none authorizes retry.
- The Windows ACL self-test passed. Inspection found the repository-local parent ACL permits other local identities to modify/delete descendants, so the operation state path was moved outside the worktree to `%USERPROFILE%\.ytrace-production-budget-deletion-pause`. The helper pins that exact Windows profile path, protects its DACL, verifies current-user ownership of artifacts and rejects unsafe effective ancestor deletion/ownership rights. The actual operation directory, lock, marker, preflight, authorization and receipt were **not created**. A future operator must create/protect a new empty directory and rerun its ACL checks.
- The environment is passed only through Node's `--env-file=.env.foundation.local`; values are not logged. The helper does not inherit caller-controlled `PSModulePath`. CA trust still requires an independently verified fingerprint.

## Evidence and limits

- Adapter tests used mocked PostgreSQL/TLS outcomes, controlled files/processes and the disposable Windows ACL self-test. The local tests do not prove production TLS, production catalog compatibility, actual PostgreSQL 17.6 transaction behavior, a real production lock window or live inventory preservation.
- No native production connection or read-only preflight was attempted. Current CA availability/trust, current production drift, privileges, budget-call quiescence and operation-window coordination remain **BLOCKED / NOT TESTED** until a separately authorized read-only preflight.
- No control-plane proof, operator authorization, attempt marker, lock, production SQL, or installation receipt was created. No production or staging data was changed. No frontend/Storage/Auth change or Git push occurred.

## Required before a later installation authorization

1. Independently verify project `mqqaykksadotbrghbexz`, direct database identity and trusted CA fingerprint through the approved operator process.
2. Require native TLS chain/hostname verification, PostgreSQL 17.6, role/ownership privileges and the exact pinned original catalog/function contract.
3. Obtain a low-traffic exclusive window; drain active calls; exclude competing DDL, grants and protected business/Storage writes.
4. Run fresh `--preflight`; require 164 migrations, 15 policies, exact catalog/function, all 57 inventories and the installed foundation/document/containment protections.
5. Review the generated preflight and then issue a new explicit authorization binding this bundle, SQL hash/size, CA fingerprint, control-plane proof, preflight bytes/state, window and drained-call assertion.
6. Stop on any drift or missing authorization. Never rebaseline during execution or automatically retry an ambiguous result.

The complete command sequence, receipt structure and separate authorization wording are in `operator-procedure.md`. `authorization-draft.json` is explicitly marked not authorized, contains `approved:false`, has missing bindings and an extra draft-only field; it is not runnable and must not be copied into the protected operator state directory.
