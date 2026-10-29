# Offline F1 authoritative-store remediation design — evidence report

**NON-RUNNABLE — NOT AUTHORIZED. Verdict: BLOCKED.**

## Decision and exact missing guarantee

The proposed design uses one logical grant authority, positive enrollment, terminal consumption, and a required independently trustworthy non-rollback checkpoint/fencing authority. Callers cannot select another store/root or infer permission from absence.

The complete one-dispatch requirement is not established under these offline constraints. If all trusted ledger/checkpoint/fence history is coherently rolled back to an old UNUSED image, the model admits a second dispatch. The strict requirement test fails and is retained.

The missing guarantee is an authenticated irreversible/monotonic authority fact outside that rollback domain, or a storage/ledger durability guarantee strong enough to exclude loss of committed consumption. No such actual provider or guarantee is selected, configured, tested or authorized here. A model object, status flag, successful unit test, file-sync acknowledgment or assumed checkpoint is not that guarantee.

## Verified source references

Reference identities passed before package creation or reliance. The old bundle was recomputed from actual manifest bytes and actual code hashes in manifest order. All 14 old candidate files, its 226 preservation references and the independent review matched: 241 unique existing files.

| Reference | SHA-256 |
| --- | --- |
| Reviewed offline-f1-consumption-candidate-20261014T112126Z bundle | 3f29f3740e67de4bb0b8b407421fb12a8a80fcda083e96f79e6c54bdc37181c7 |
| Its input manifest | de9c9591433d6f687d0db6985061d98065fc164799a95b43b9c060d381c988be |
| Its complete inventory | ac45620b7ebb78e26181cdbdfcc795183d1ce4a1aea8507d2e18e543960c87b7 |
| Its remediation report | ea11802996f61c4005ee1387bb8f6cc4b6e847bf9686f3bf8b1160feff7bbf1b |
| independent-f1-consumption-review-20261014T124628Z.md | 42b9c9efeebe9a982648aa0ca87302211bd0127fa60e9b0cf4dd0a3f8a7f5e79 |

The exact old SQL, native adapters, wrappers, ACL helpers, frontend files, historical test logs, earlier packages and reviews remain unchanged. No former identity is relabeled as this design, and no production artifact is superseded.

## Design contents

Read design-decision.md and failure-model.md for the complete identity, commit, durability, access and failure contract.

Key decisions:

- One sole logical F1 Authority. The journal replicas/checkpoint are consistency components, not caller-selectable alternative grant roots.
- Trusted configuration outside requests binds authenticated service/namespace, issuer, fixed project/purpose, epoch/checkpoint, broker release/principal and physical store identity. A synthetic constant models that boundary; no real binding is claimed.
- Only positive current UNUSED enrollment is eligible for one atomic consume. Missing/partial/stale/unverifiable records never create enrollment.
- The key remains authorization identifier plus fixed purpose/project. Nonce, proof/bundle revision, epoch or root cannot become a caller-changeable second allowance.
- One server-side UNUSED-to-SPENT commit precedes a positive original-invocation permit. SPENT is terminal even if no observation occurs.
- Original live permits are one-use, non-transferable and unrecoverable after restart or uncertainty. A SPENT row/result/receipt is not permission to resume.
- Unknown commits and unavailable storage require durable or independently enforced closure. If such closure cannot be persisted/enforced, the namespace remains BLOCKED; a healthy flag cannot clear it.
- Primary loss or rollback is detected only if a trustworthy non-rollback checkpoint survives. A coherent rollback of all authority cannot be detected from that same erased state.
- Future broker access is claim/dispatch only. Enrollment, reset, delete/unspend, initialization and epoch replacement are separate authority functions, not invocation permissions.

The design does not hide the stronger checkpoint/issuer/storage requirement behind the phrase “authoritative store.” The checkpoint is explicitly a further trust guarantee that must be established; it is not implemented by the model's object assignments.

## Why absence differs from genuinely unused authority

The old file prototype treated a successful create-new after absence as first use. This design requires a positively enrolled record authenticated against current independently trustworthy authority state.

Lost local receipts therefore do not alter grant state. Lost primary rows or stale UNUSED rollback fail checkpoint verification and close admission. Unknown state cannot choose another root or initialize an empty authority.

However, a complete coherent rollback makes two histories indistinguishable: genuinely unused U, and consumed/dispatched then rolled back to exactly U. Without a surviving monotonic fact, any usable policy admitting the first also admits the second. Denying all requests forever is not presented as a usable solution. Rotating roots/epochs or reenrolling the same identifier is not permitted as a shortcut.

## Synthetic code and its limits

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| authoritative-model.mjs | 9999 | 8076201eac31ee614c2410ffc3c29dbda12d8b43bc14105a5779f2bb51ffd454 |
| conditional-regressions.test.mjs | 8075 | 9867084c58a80bb43ad03da4109334f65787f3c21163b866c7b6c9b63f033fab |
| required-total-loss.test.mjs | 902 | 67c28a740e7198902566e77bfdc0dac9a8ad8a0317f5c268af3fbce0c5428dd8 |

All fixtures are disposable in-memory objects. The model imports only Node crypto; tests import only Node test/assert and the local model. There is no filesystem state store, network callback, private environment read, credential/CA/proof input, protected path, native runner/wrapper/ACL helper import, SQL or live CLI mode.

A fixed fixture closure models one authority; creating another fixture is a different test universe and proves no deployed global binding. The synchronous transition models atomic commit; the checkpoint/fence object models non-rollback authority; a new broker object models caller-local restart; private permits model original invocation ownership. None is real persistence, distributed serialization, OS restart or process-incarnation evidence.

The test oracle retains dispatch counts solely to observe violations. Admission never consults it. Coherent rollback can therefore produce an actual logical counterexample rather than silently using a hidden safety oracle.

## Regression results actually executed

Toolchain: Windows Node v24.21.0, verified. All three .mjs files passed syntax checks.

Imports, source identities and test paths were inspected before execution. Tests used --test-concurrency=1 --test-reporter=tap --test with each exact new test file. Each child received only literal SystemRoot/WINDIR and the selected TZ, with no inherited private environment. cwd was the repository, shell=false, windowsHide=true, timeout=30,000 ms, maxBuffer=1,048,576 bytes; the outer launcher used a bounded 45-second wait.

| Suite | Asia/Manila | UTC | Meaning |
| --- | --- | --- | --- |
| Conditional specification regressions | 40/40 PASS, exit 0 | 40/40 PASS, exit 0 | Assumes a surviving trustworthy checkpoint/fence |
| Strict complete-authority-loss requirement | 0/1 PASS; 1 FAIL, exit 1 | 0/1 PASS; 1 FAIL, exit 1 | At-most-one requirement NOT met |
| Syntax | 3/3 PASS | Same checked code | Parsing only |

All test processes had empty stderr and zero skipped/cancelled/todo cases. The test harness successfully captured results; its completion is not a PASS for the failed requirement. No assertion was changed to accept two, no failing test was skipped, and no all-green readiness result is claimed.

The independent boundary check observed:
firstStatus=MODEL_PASS, secondStatus=MODEL_PASS,
totalDispatches=2, requiredMaximum=1, satisfied=false.

The strict test still asserts total dispatches <=1 after a modeled coherent rollback. Both failed TAP logs are preserved. This is the exact unsatisfied requirement, not a flaky or historical unrelated test.

### Conditional coverage

The 40 conditional cases cover positive enrollment versus absence; context mismatch; two roots/backend/identity overrides; two brokers and 50 interleaved callers; modeled restart and permit replay; lost evidence before/after dispatch; committed and noncommitted uncertainty; partial state; stops before/after dispatch; observation uncertainty; primary row/all-primary loss; stale primary/checkpoint rollback; missing checkpoint; wrong identity/epoch; unavailable store and sticky fencing; distinct grants; narrow broker API; and accessor rejection.

These cases establish only logical consequences within the stated assumed authority model. They do not prove Windows atomicity, durable fencing during total unavailability, power-loss survival, actual distributed commit, real process ownership, trusted identity binding or one upstream request.

### Test log identities

| Log | Bytes | SHA-256 |
| --- | ---: | --- |
| conditional-regressions-asia-manila.tap | 8781 | b55f29becbe03fcde8f7ec18b9235114a48ba676e059137106bd352e01e2a2a3 |
| required-total-loss-asia-manila.tap | 1175 | ce93109d5f9c11c4a8d6fdd8d6b1082c2323c9063d984cbf65e89f2ff29e307d |
| conditional-regressions-utc.tap | 8778 | eff0cdec49bf474f18678758c40feb54387f27b47eec8e3bf383e098a9917818 |
| required-total-loss-utc.tap | 1175 | 10f1066623ef7dda88165143f7276b9cb601f1cd1b26b4a645128288a4963724 |

Logs were created only with exclusive create-new semantics inside this new package. No previous log or evidence was overwritten. Historical suites were not rerun.

## Package identities

New design bundle SHA-256: ae6f04fc9927e527702540364e524f4815db0d6d862141f770a5f230231c0974  
New input manifest SHA-256: a8462f64bf40ed88f2f45f7d4a0064132dc978d709f2e23b4d1e624ff7541e4b  
Manifest bytes: 55719

Bundle calculation: SHA256 of UTF-8 JSON.stringify({manifestSha256,codeHashes}), using the actual three code-file identities in manifest order. The manifest pins source, design docs, all four test logs and all 241 prior preservation references. The final inventory lists every package file except itself; report/inventory hashes are returned externally without circular self-hash references.

## Remaining blockers and next offline decision

1. Establish an actual non-rollback committed-head/consumption/fence guarantee outside the complete coherent rollback domain, or explicitly reject that failure model with a justified stronger storage/ledger guarantee. Without it the strict regression cannot be satisfied.
2. Select and independently review a real sole-authority identity/admission mechanism outside caller inputs. The model closure is not that deployment.
3. Specify real unknown-commit/unavailable-store closure and boot admission. A Boolean assignment cannot prove persistent fencing when the storage needed to write it is unavailable.
4. Establish real access/owner/process-incarnation, Windows/path/ACL, restore/power-loss and upstream no-retry properties under an agreed fault model. They remain BLOCKED.
5. Keep F2 real providers/Windows archive guarantees and F3 actual native-child/deadline/lifetime boundaries separate and unresolved.

The next decision is a further offline review/selection of that external guarantee. No continuation authorization, installation approval, executable live procedure or Decision B is prepared.

## Preservation and worktree

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused  
Branch/HEAD: ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8

| Checkpoint | Dirty tracked | Staged | Untracked |
| --- | ---: | ---: | ---: |
| Start | 68 | 0 | 3,868 |
| New package complete | 68 | 0 | 3,881 |

The sole additions are 13 files in docs/production-security/budget-deletion-pause/offline-f1-authoritative-design-20261014T131947Z/. All files were created exclusively; no earlier artifact was edited, renamed, removed, repaired or relabeled. The starting Git porcelain SHA-256 is 219f2c8e092bcf16835c1426b9eb57a63ba4e30961aa05d2d9fbb78ccc2cf6fe (UTF-8 lines joined LF, no terminal LF). Excluding this package alone must reproduce it. All 241 prior preservation pins are checked again at finalization.

No protected-state access/write, proof/credential/CA/private-environment access, Supabase/MCP/network/PostgreSQL/TLS call, production wrapper/native runner/ACL helper/preflight/install/reconciliation mode, live authorization/proof/lock/attempt/preflight-evidence file, business mutation, Storage/frontend/pagination change, migration, deployment or Git stage/commit/push occurred.

**BLOCKED — offline design and regression evidence only. Execution remains unauthorized.**

