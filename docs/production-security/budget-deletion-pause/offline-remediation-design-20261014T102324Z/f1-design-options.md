# F1 — authorization-bound observation design

**NON-RUNNABLE — NOT AUTHORIZED. Design only. No consumption record, authorization, lock, proof or attempt file is created by this package.**

## Required guarantee and unavoidable limit

One authorization permits at most one attempted scoped get_project observation, one permitted proof archive/create sequence and one native read-only preflight. Consumption must precede the observation. “Exactly one successful observation despite any crash” is incompatible with a no-retry rule and a non-idempotent external response: a crash can occur between durable consumption and dispatch, or after dispatch before acknowledgment. Fail-closed behavior therefore permits zero completed observations and burns the authorization on uncertainty.

The existing sequence dispatches getProject before archiveProof. A claim at that later archive can never prevent duplicate earlier observations. Memory flags are per engine instance; a new object/process/restart resets them. Different stale-proof bindings must not create new allowances under the same authorization.

## Options

| Design | Concurrency | Restart/crash behavior | Additional write/order/authority | Assessment |
| --- | --- | --- | --- | --- |
| Per-object flag or process-global counter | Only one object/process | Resets after restart; separate processes bypass | None | Insufficient |
| Windows named mutex or single supervisor/channel, without durable consumption | Can exclude concurrent live invocations on one host if correctly implemented | Abandoned mutex/new supervisor cannot establish whether the observation was already sent; PID existence is insufficient | No protected file write; new process-control implementation/review | Useful secondary exclusion only; insufficient by itself for restart safety |
| Existing hash-named archive as CAS | Might constrain one later proof/preflight sequence for one exact binding | Surviving archive may prevent repeating that same archive; no observation consumption before the call | Existing archive write, in original position | Insufficient; the reviewed race already produces two observations. Moving the archive before identity violates the earlier sequence |
| **Dedicated durable create-new consumption record before observation** | One atomic unique claim per authorization/purpose/project on the pinned host | Presence, partial contents, mismatch, crash or uncertainty blocks every later invocation; no reopen/resume path | **One new protected write before fresh get_project, new state type/read requirements, amended order and explicit additional authority** | **Recommended narrow local design for separate review** |
| Trusted centralized broker/ledger with atomic authorization consumption | Can enforce a shared boundary across hosts | Can persist consumption; external response uncertainty still burns allowance unless the upstream operation has documented idempotency | New trusted service/ledger, credentials/permissions, network route and write authority; substantial implementation | Viable when multiple hosts are required; disproportionate for the current single-host task; not implemented |
| Manual operator ledger/no-restart instruction | Relies on everyone following instructions | Cannot technically distinguish a forgotten or uncertain attempt after a crash | Human procedure change | Useful operational control, not the requested durable guarantee |

A broker that merely proxies calls or retries an upstream read is not sufficient. Any alternative must establish the same before-dispatch consumption and no-resubmission properties; no undocumented Supabase/MCP idempotency is assumed.

## Recommended design for review: single pinned host, permanent consumption

This is a proposal for a future design review, not authorization wording or a runnable schema.

- Bind approval to one host/root/volume identity, exact project/purpose and immutable artifact/proof-reference/UTC-window identities. The host restriction is part of the future reviewed scope. A local record cannot enforce uniqueness on another independent host; multiple-host use needs a shared trusted ledger.
- Derive the unique claim key from the **canonical authorization reference plus fixed purpose/project**, not from an invocation nonce, bundle revision, stale-proof hash or timestamp. Otherwise callers could obtain a fresh allowance by changing an input.
- Validate the reference with a strict canonical format and no aliases. Bind the entire human-approved context in the claim payload digest. Existing same-key records with different context are conflicts, not fresh grants.
- Initial permitted read-only checks may validate artifacts, approval bounds, fixed target, root/ancestor/ACL/redirection state and stale-proof identity. No observation is dispatched yet.
- Atomically create the new claim with genuine CREATE_NEW/no-replace semantics, restrictive inherited/verified ACL and identity checks. Write the minimal context digest, sync, close/reopen safely or retain an original handle as the separately reviewed primitive requires, and verify durable identity before dispatch. Any failed/uncertain durability or ACL check stops **without observation**, retains the record and consumes the allowance.
- Only that original live claimant may dispatch one scoped get_project call. Existing-record inspection never yields permission to resume, even if the record says “not sent”, contains partial bytes or has a matching context. No PID/unchanged nonce-file claim substitutes for process-incarnation ownership.
- Keep a live one-use dispatch guard as a second layer. A child or reconnect may not obtain a second observation. Audit any MCP transport-level automatic retries; one application callback alone does not prove one upstream request. If supported no-retry semantics cannot be established, keep the design blocked and state exactly which boundary is assured.
- After a healthy exact observation, retain the original timestamp and perform the existing immediate stale-proof/destination recheck, one no-overwrite same-directory archive, one create-new proof and one preflight, with all deadlines and preservation gates unchanged.
- Retain the consumption record on every outcome, including success. Never delete, clear, expire, replace, rename away, treat an abandoned mutex as reclaimable, or resume the same authorization automatically.
- A separately approved new authorization after human investigation is a new operation, not retry permission implicit in a status field. No new authorization is prepared here.

## Proposed order and authority change

Current proposal: read-only initial checks → fresh observation → proof recheck/archive → proof creation → one preflight/evidence file.

Recommended future order: read-only initial checks → **new durable consumption write and verification** → one fresh observation → unchanged proof recheck/archive/create → one preflight/evidence file.

The new consumption step is an explicit exception to the earlier “no protected write before fresh identity” sequence. It does not modify the stale proof before identity, but is still a protected-state mutation. The earlier Decision A authority does not cover it. A separate review must approve the record type, fixed location, unique key, content/ACL/durability contract, permitted read/write operations and amended order before any execution package can be considered. Do not reuse installation authorization, approved-preflight, installation lock or attempt files for this purpose.

No record path, populated authorization fields or executable write implementation is provided in this package.

## Failure matrix

| Failure point | Observation allowance | Required behavior |
| --- | --- | --- |
| Initial read-only prerequisite fails | Not yet consumed | Stop; no observation; any future attempt requires the separately applicable human scope |
| Competing CREATE_NEW loses / record already exists | Already consumed or ambiguous | Stop; never parse existing contents into resume permission |
| Partial record write, sync/ACL/identity failure | Burned | Retain partial record, zero observations; no retry/repair |
| Crash after durable claim, before dispatch | Burned, possibly zero observations | Restart sees presence and stops |
| Crash/network uncertainty during/after dispatch | Burned, observation possibly sent | No second call, alternate credential/API or automatic refresh |
| Observation mismatched/unhealthy/stale | Burned | Stop before archive/create; preserve claim and original proof |
| Archive/create failure or deadline crossing | Burned | Retain archive/partial proof/evidence as applicable; no restore/cleanup |
| Child launch/result/evidence uncertainty | Burned | Retain all state; no relaunch or rebaseline |
| Success | Burned permanently | Retain claim and evidence; no same-authorization reuse |

## Durability and threat assumptions requiring review

CREATE_NEW alone addresses name collisions, not complete crash/power-loss durability, file replacement or hostile operators. The real Windows design must specify local trusted filesystem/volume behavior, file/parent identity, reparse/alternate-stream rejection, sharing/delete controls and verified ACL/ownership. No network share/cloud-synced/roaming path is silently accepted. A malicious administrator able to erase all trust records is outside a local-file guarantee; this assumption must be explicit.

Power/storage loss before the durable barrier must fail closed. If the selected Windows/filesystem primitive cannot guarantee record survival after dispatch under the agreed failure model, use a separately reviewed stronger durable ledger or mark the guarantee unavailable. Do not claim general power-loss safety from a Map test or writeFile plus sync alone.

## Review sequence

1. Independently review this F1 guarantee, scope/order change, canonical authorization binding, host restriction and failure matrix.
2. Select the durability/ownership mechanism and explicitly define MCP invocation versus upstream-request semantics. Do not implement protected writes under the current task.
3. Review the F2/F3 real-provider designs and F4/F5 offline evidence separately; implement future production-capable providers only under a separate scoped preparation task.
4. Exercise concurrency/restart/crash and Windows primitives only with disposable offline state in that later authorized scope; test two-observation denial at the first dispatch, not merely one later preflight.
5. Pin/review the resulting integration artifacts and revised documentary scope before any continuation authorization can be proposed.

**F1 status: design recommendation only; execution remains BLOCKED.**
