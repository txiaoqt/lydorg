# Offline F1 authoritative-store remediation design

**NON-RUNNABLE — NOT AUTHORIZED. Verdict: BLOCKED.**

This package proposes one pinned logical F1 Authority with a positive-enrollment ledger and a required independently trustworthy non-rollback checkpoint/fencing authority. Missing evidence never creates permission, and caller-selected roots are not accepted.

The design is conditional. No actual authoritative provider, checkpoint, persistence mechanism, service identity, ACL, credential, connection or protected-state binding is implemented. The model uses disposable in-memory objects only.

## Read first

- design-decision.md: store identity, enrollment, commit, access/failure model and the indistinguishability limit.
- failure-model.md: failure-point decisions, synthetic coverage and blocked properties.
- remediation-report.md: actual identities, tests, preservation and worktree accounting.
- reviewed-inputs.json and candidate-artifact-inventory.json: byte/hash traceability only; not authority.

## Synthetic code

- authoritative-model.mjs: pure specification model with a modeled checkpoint/fence.
- conditional-regressions.test.mjs: conditional regressions under explicit surviving-authority assumptions.
- required-total-loss.test.mjs: strict at-most-one requirement under complete coherent authority rollback.

The strict regression fails, with two modeled dispatches where <=1 is required. This failure is retained and is not relabeled as PASS. It establishes the missing non-rollback guarantee; no assertion was weakened to make the model green.

The code imports only Node crypto/test/assert modules and local model code. There is no filesystem store, network callback, live CLI, native-runner/wrapper import, protected path, credentials, CA input, SQL or production I/O. No continuation or Decision B authorization is prepared.

Real Windows, ACL, power-loss, process-incarnation and upstream-request guarantees remain BLOCKED. F2/F3 remain separate. A future real protected consumption write or amended operation order requires separate authority; this package grants none.

