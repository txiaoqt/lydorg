# Failure model and regression obligations

**NON-RUNNABLE — NOT AUTHORIZED. Overall requirement remains BLOCKED.**

## State rules

| State or observation | Admission |
| --- | --- |
| Positive UNUSED enrollment in the authenticated current authoritative image, with matching context/checkpoint/epoch and no fence | Eligible for one atomic consume; not permission to dispatch from a read alone |
| SPENT | Terminal denial, regardless of whether the observation happened or a local receipt survives |
| Missing/partial/conflicting enrollment or checkpoint | Deny; never create UNUSED from absence |
| Uncertain commit, stale revision, inconsistent image or unresolved acceptance | Deny and keep a durable/independently enforced fence |
| Unavailable authority | No dispatch; no alternate store, root or credential |
| Lost local receipt/cache | Does not affect committed authority or create a permit |
| Journal rolled back while a non-rollback checkpoint survives | Reject the image and fence the namespace |
| All trusted authority rolled back coherently to an old UNUSED state | Not distinguishable without another trusted fact; strict requirement FAILS |

A diagnostic result or cached receipt is not an authoritative state. A SPENT row is also not a recoverable dispatch ticket.

## Failure-point decisions

| Point | Dispatches permitted | Required retained/authoritative condition |
| --- | ---: | --- |
| Invalid request or no positive enrollment | 0 | Denial; no implicit enrollment |
| Competing atomic consume loses | 0 | Existing terminal state remains authoritative |
| Before acceptance, authority unavailable | 0 | Namespace cannot reopen automatically; current trust/fence proof required |
| Commit known SPENT, acknowledgment lost | 0 from the stopped invocation | SPENT is permanent; no new process resumes |
| Commit unknown and no durable SPENT can be established | 0 | Independently enforced uncertainty fence; if unavailable, remain BLOCKED |
| Partial primary write | 0 | Inconsistent image rejected against the checkpoint |
| Commit succeeds, broker stops before dispatch | 0 | SPENT burns the allowance |
| Local evidence lost before dispatch | 0 from an uncertain/stopped invocation | SPENT/fence prevents another grant |
| One dispatch, response uncertain or local evidence lost | At most 1 | SPENT/fence remains terminal |
| New broker/process incarnation | 0 for SPENT or uncertain authorization | No permit recovery, rebind or serialized-ticket replay |
| Two caller roots/endpoints | 0 via those overrides | Inputs rejected; ordinary brokers use the same authoritative namespace |
| Primary history lost or restored stale | 0 until authoritative recovery | A surviving checkpoint detects mismatch; absence does not grant |
| All authoritative facts coherently lost/rolled back | Cannot establish the requirement | Requires non-rollback storage or separate surviving authority |

The strict at-most-one observation requirement is unchanged. A crash may produce zero observations, but uncertainty is never justification for a second one. Actual one-request transport semantics must also prevent hidden provider retries.

## What the synthetic code models

authoritative-model.mjs is an in-memory specification only:

- One fixture closure represents the trusted logical authority and its positive enrollment ledger.
- Public broker requests cannot select a root/store/endpoint/identity. Multiple broker objects share that closure.
- A synchronous state transition stands for a linearizable irreversible consume.
- A checkpoint object and sticky fence stand for independently persistent non-rollback authority.
- A private one-use permit stands for original live invocation ownership.
- A memory counter stands for one observation.
- A new broker object stands for restarted caller-local state; it is not an actual OS restart.
- The dispatch audit is a test oracle only and is never consulted by admission.
- Trusted test controls corrupt/drop/roll back model state. They are not caller operations or live recovery APIs.

None of those objects implements persistence, a service identity, cryptographic checkpoint authentication, Windows ACLs, process-incarnation fencing, a distributed commit, OS/storage crash behavior or actual upstream I/O. Creating another model fixture is a separate test universe, not a caller-admitted replacement authority. Real enforcement of that identity boundary is unimplemented.

The modeled unavailability/unknown-outcome fence assumes a surviving authority can preserve the closure. If no authority can persist it or enforce fail-closed boot across restart, the real implementation cannot meet the model contract. Setting a Boolean in this model does not close that blocker.

## Conditional regression coverage

conditional-regressions.test.mjs tests the protocol under the stated surviving-checkpoint/fence assumptions:

1. Positive unused enrollment is usable once; missing or conflicting inputs do not create enrollment.
2. Caller root A/root B, authority, endpoint and allowance-dimension overrides are rejected.
3. Two brokers and 50 interleaved broker requests share one atomic model consume.
4. Modeled broker restart and result replay cannot recover a spent permit.
5. Local evidence loss before and after dispatch does not recreate an allowance.
6. Commit uncertainty before/after modeled commit stays terminal.
7. Partial primary state and primary loss before dispatch deny.
8. Stops before and after dispatch and uncertain observation responses deny reuse.
9. Dropped primary rows, total primary loss, stale primary rollback and stale checkpoint rollback are rejected while independent checkpoint history survives.
10. Missing checkpoint, wrong identity/epoch, partial state and unavailable primary deny.
11. Making an availability flag healthy does not clear the modeled sticky fence.
12. A distinct positively enrolled authorization remains distinct.
13. No enrollment/reset/recovery/backend-selection method exists on the broker API.

These tests are logical specification checks, not Windows/distributed/durability proofs.

## Strict requirement regression: deliberately not weakened

required-total-loss.test.mjs performs one modeled successful dispatch, coherently restores the entire primary image and checkpoint/fence to the old UNUSED enrollment image, creates a new broker, and then asserts that total dispatches remain <=1.

The test FAILS: total dispatches are 2. The expected maximum remains 1. It is not changed to expect 2, skipped, suppressed, or counted as a passing requirement because the failure is anticipated. Its failed TAP evidence is retained.

This shows the exact missing guarantee: some trustworthy monotonic fact must survive outside the loss/rollback domain, or the authority must provide an irreversible commit/durability guarantee that excludes that history. Merely calling the model checkpoint authoritative does not establish it.

## Actual versus blocked evidence

| Property | This package |
| --- | --- |
| Logical one-authority admission, positive enrollment, no caller root selection | Conditional model tests only |
| One modeled commit/permit and terminal SPENT behavior | Conditional model tests only |
| Reject stale/lost primary evidence with a surviving checkpoint | Conditional model tests only |
| One dispatch after complete coherent authority rollback | FAIL / BLOCKED; strict regression retained |
| Actual authority identity and external trust pins | BLOCKED; no real provider/configuration |
| Irreversible journal/checkpoint/fence durability | BLOCKED |
| Real process restart and original process-incarnation ownership | BLOCKED |
| Windows atomicity, directory-entry persistence, reparse/path/ACL safety | BLOCKED |
| Real power/storage loss or administrative restore behavior | BLOCKED |
| One upstream request and transport no-retry semantics | BLOCKED; memory stub only |
| F2/F3 integration readiness | BLOCKED separately |

No actual filesystem fixture state, protected-state file, proof, credential or CA was accessed by the model tests. Each test creates only a disposable in-memory fixture. Only new package source/docs/manifests/TAP artifacts are written by preparation tooling.

