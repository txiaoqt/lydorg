# F1 authoritative-store design decision

**NON-RUNNABLE — NOT AUTHORIZED. Overall decision: BLOCKED.**

## Decision

Use one logical F1 Authority as the sole grant-admission and observation broker. It must be backed by an authenticated, linearizable, append-only grant ledger with an independently trustworthy non-rollback checkpoint/fencing authority. Callers cannot select a filesystem root, endpoint, namespace, replica, authority identity or fallback backend.

This is a conditional architecture for review, not an installed service or a claim that the required storage guarantee exists. No actual provider, trust key, ledger, Windows primitive, principal or protected-state location is selected or configured here. The only executable artifact is a pure synthetic model and tests.

Both counterexamples are handled only within the stated trust model:

- Loss of local receipts or primary rows never supplies permission. SPENT remains terminal, or a surviving independent checkpoint detects inconsistent/missing history and closes admission.
- All callers and broker incarnations use the same pinned logical authority. Caller-selected roots and separately admitted roots are not an API or a grant dimension.

If all authoritative history and the checkpoint can be rolled back coherently, this design cannot distinguish an old UNUSED image from genuinely unused authority. The strict regression fails on that case. A stronger irreversible ledger/storage guarantee or a separate surviving non-rollback authority is required. The one-dispatch requirement is not relaxed.

## One authority, not interchangeable roots

The F1 Authority is the only source that may admit a claim. Its journal replicas and required checkpoint witness are internal consistency components, not separate optional grant stores. Neither a caller's local receipt cache nor an arbitrary admitted directory is an authority. The checkpoint witness cannot issue grants by itself; missing primary history causes denial, not reconstruction of an unused grant.

Future trusted deployment configuration would bind all of these outside request input:

- Exact service/namespace identity and its authenticated trust anchor.
- Fixed project and purpose, issuer identity, active authority epoch and required checkpoint source.
- Broker principal and integrity-verified release identity.
- The sole store's host/root/volume identities where physical storage uses them.
- No fallback route, empty-store initialization, automatic namespace recreation or authority substitution.

Those pins must be protected by separately reviewed operator/server controls. A constant string, a caller's environment override or a factory argument is not authenticated binding. The synthetic model uses a fixed fixture closure to represent this boundary; creating another test fixture creates another model universe and proves no real global authority binding.

The caller API carries only an immutable authorization identifier and approved context digest. It does not accept root, URL, authority ID, replica, epoch, nonce, proof path, bundle selector or timestamp as a way to choose another allowance. The logical key is canonical authorization ID plus fixed project/purpose. Root, epoch, invocation nonce and artifact revision must not become caller-changeable key dimensions that create new allowances.

## Positive enrollment and the meaning of UNUSED

A genuinely unused authorization requires a positive enrollment record committed by a separately trusted issuer:

- Unique canonical identifier, fixed project/purpose, issuer and exact approved context digest.
- Approved artifact/manifest/verification identities and UTC validity bounds included in the context binding.
- Issuance revision and authority epoch validated against the current non-rollback authority.
- State UNUSED, with no unresolved acceptance or consumption transition.

Enrollment is not an upsert performed by an invocation. Missing records, missing checkpoints, copied old UNUSED records, malformed rows, conflicting context, unverifiable revisions and unavailable storage never mean unused. The claim interface cannot create enrollment, reissue identifiers, clear SPENT, choose a new root, restore history or recover a permit.

The synthetic fixture preinstalls fictional UNUSED records. It contains no real approval, active proof, credential, CA input or production context.

## Commit and dispatch contract

1. Validate trusted identity, current checkpoint/epoch, positive enrollment, exact context and existing temporal/security gates. This does not authorize a dispatch.
2. Perform one server-side conditional UNUSED-to-SPENT transition. Checking UNUSED and then separately writing a local file is insufficient.
3. The authority must make the transition irreversible under its reviewed fault model before returning a positive grant. A durability certificate must bind authority identity, epoch, authorization key, context, committed revision and original live invocation.
4. Only the original live broker invocation may use that positive response, exactly once. Permits are not serialized, transferred, reconstructed from SPENT, recovered after restart or treated as idempotent repeat permissions.
5. The broker marks its live permit used before one observation dispatch. A stopped, uncertain or completed dispatch never makes SPENT reusable. Response loss burns the allowance.
6. Retain journal/tombstone history and checkpoint evidence. No TTL deletion, backup restore, epoch change or new root may re-enroll the same authorization.

Linearizable comparison must operate in the one authoritative namespace across simultaneous brokers. At most one wins. Stale reads, duplicate responses or replayed operation IDs cannot confer another permit. Internal operation IDs are not a new authorization and are not an allowance key.

A broker crash after commit but before dispatch can burn the allowance with zero observations. A restart sees SPENT or unverifiable authority and cannot resume it. A real process-incarnation/channel boundary is required; a PID, unchanged nonce file or JavaScript Symbol alone is not that proof.

## Unknown commit and unavailable storage

Unknown outcomes produce no observation. The authorization or namespace must remain closed through a durable uncertainty fence or independently enforced authority-generation fence. If primary storage cannot persist that fence, a surviving independent authority must hold the closure; the design cannot assume a bit can be written during complete unavailability.

If neither a fence nor current authoritative state can be established, all new processes must remain unable to admit the authorization. A healthy connection, UNUSED-looking row, status flag or restarted process is not recovery. There is no automatic retry, refresh, rebaseline, permit recovery or clearing of ambiguity.

The model implements the fence as an object assignment to an assumed checkpoint authority. That is a specification assumption, not evidence of real persistence or unavailable-store behavior. Establishing the actual fence/boot/admission mechanism is a blocker.

## Required durability model

The ledger and checkpoint together must establish:

- Irreversible accepted consumption before any dispatch permission is released.
- Detection of stale, missing, partial or rolled-back journal state.
- Monotonic epoch/head/fence semantics across the agreed process, OS, storage, restore and administrative failure model.
- No split-brain authority or independently admitted replacement namespace using the same grant identities.
- Fail-closed boot and restore admission. No ordinary recovery path may turn old SPENT/uncertain identifiers into UNUSED.

An authenticated hash or signature from the same rolled-back state is not freshness or non-rollback proof. File sync/readback does not by itself establish directory-entry persistence or immunity to correlated restore/power loss. A checkpoint stored in the same rollback domain as the journal cannot resolve coherent rollback of both.

The checkpoint may require an independently durable monotonic ledger, protected monotonic counter or separate authority with reviewed semantics. No particular product or implementation is claimed here. If its committed state may also disappear or roll back undetectably, the requirement remains unsatisfied.

## Indistinguishability argument

Let U be the complete valid state in which an enrolled authorization is UNUSED. Compare:

- History A: the authorization genuinely has not dispatched and the observable authority is U.
- History B: it committed SPENT and dispatched, then every trusted fact was lost/rolled back to exactly U.

Without a surviving trusted fact outside U, a new process receives the same inputs and state in both histories. Any usable policy that admits A also admits B, causing a second dispatch. Always denying both would avoid duplicates but would not implement the intended usable genuinely-unused workflow. We do not claim that as a solution.

An external non-rollback fact, irreversible storage guarantee or separate authority is therefore necessary. Detectable complete loss can safely deny everything; coherent apparently valid rollback is the harder case. New authority epochs are not permission to reuse old IDs: retirement and reissuance require surviving trusted issuance/fencing history and separate authority.

## Access model

Future access separation must make the broker claim-only and dispatch-only. It may not enroll, delete, overwrite, unspend, initialize a store or rotate authority identity. The issuer may enroll a unique approved context but may not reset consumption. Checkpoint/epoch writers must have monotonic-only operations. Recovery operators cannot bypass SPENT/fences through routine application permissions.

Actual RBAC, Windows DACLs, ownership, authenticated transport, original-process identity, storage semantics and one-upstream-request behavior are not established by this package. They remain BLOCKED. No credentials or ACL configuration were accessed or changed.

## Scope and next decision

The model tests logical consequences under explicit assumptions. F2 real providers/Windows archive guarantees and F3 actual native-child/deadline/lifetime boundaries remain separate blockers. Existing runner, SQL, ACL helper, frontend, Storage, pagination and prior artifacts are unchanged.

The next decision is an offline selection/review of the required non-rollback and authoritative-admission mechanism. This package prepares no continuation authorization, live command, installation binding or Decision B. Any future real authority/write or changed operation order needs separate explicit authority.

