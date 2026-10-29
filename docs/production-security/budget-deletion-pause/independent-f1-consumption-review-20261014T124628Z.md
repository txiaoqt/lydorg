# Independent offline review — F1 consumption prototype

## Verdict: BLOCKED

Artifact identity and focused test reproducibility pass. The implementation provides useful one-root, surviving-record exclusion, but does not establish authorization-wide, durable at-most-one observation across all reviewed uncertainty/restart cases.

Two synthetic counterexamples were independently confirmed: a lost consumption entry permits a fresh process to dispatch; and a different admitted fixture root permits another dispatch for the same authorization while both records survive. These are offline prototype findings, not observed production exposure.

**This review is offline evidence only. Decision A execution, protected-state operations and Decision B/installation remain unauthorized. F2/F3 remain separate blockers.**

Review time: 2026-10-14T12:46:28.8733319Z

## Exact scope and identity gate

Repository: C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused  
Branch: ui-refactor  
HEAD: 2f6e7427c553b7535f53860d1732b42df7c023e8

Candidate:
docs/production-security/budget-deletion-pause/offline-f1-consumption-candidate-20261014T112126Z/

| Identity | Verified SHA-256 | Result |
| --- | --- | --- |
| Recomputed bundle | 3f29f3740e67de4bb0b8b407421fb12a8a80fcda083e96f79e6c54bdc37181c7 | PASS |
| reviewed-inputs.json | de9c9591433d6f687d0db6985061d98065fc164799a95b43b9c060d381c988be | PASS |
| candidate-artifact-inventory.json | ac45620b7ebb78e26181cdbdfcc795183d1ce4a1aea8507d2e18e543960c87b7 | PASS |
| remediation-report.md | ea11802996f61c4005ee1387bb8f6cc4b6e847bf9686f3bf8b1160feff7bbf1b | PASS |
| All candidate artifacts | 14 exact files; sizes/hashes and exact set match | PASS |
| Preservation references | All 226 exact sizes/hashes match | PASS |

Bundle calculation used the exact actual manifest bytes and independently hashed actual code bytes in manifest order: SHA256 of UTF-8 JSON.stringify({manifestSha256,codeHashes}). Listed hashes were not accepted as substitutes for file reads. Inventory self-exclusion was checked separately against its supplied external hash. Regular-file/non-symlink/canonical-boundary checks passed.

The 240 unique existing files checked are the 14 candidate artifacts plus 226 preservation references. Reference paths were restricted to the workspace and rejected credential/proof/CA-like targets. The previous review, remediation package, original SQL/verifier and historical test artifacts were preserved. No historical fingerprint was treated as fresh production evidence.

### Actual code identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| synthetic-f1-core.mjs | 3555 | e124bdc8a9774d5b2a2b0b87e25b8464a30907b743210c360fd844db1ca90f8e |
| fixture-harness.mjs | 4745 | 1db68e1dd61b8eec26e65bed2b6fa4d68e3e10a040d62e1da40c1690409aa134 |
| disposable-ledger.mjs | 5062 | 2e1c0d442cc46ea026e12bfc29ac7dcc8ec1c0546fc9a5ff1bf70e08d8e0d63c |
| synthetic-child.mjs | 1410 | a098d179bb21c17a5d9b078f099ad4be3afabf9222b8820204f6d6ee0466cc03 |
| synthetic-f1.test.mjs | 12982 | 8122cb542b5f127c3a69d576ea1b40a9548b30fbfd7d9aef374934f06d38f4c8 |

## Findings

### F1-A — High / unresolved: missing evidence is accepted as first use

Sources: disposable-ledger.mjs:25–55 and 72–85; synthetic-f1.test.mjs:151–157 and 186–195.

The ledger denies an existing key and its current object becomes one-use before I/O. That works while an entry survives. However, there is no authoritative history outside that entry. When no entry survives, open(...,'wx') can succeed in a fresh process and the observation stub can run again.

The supplied uncertainty tests deliberately retain a file. SYNC_UNCERTAIN is injected after the actual file sync has already returned. The crash tests terminate a process while retaining the operating system and filesystem state, then assert the file survives. These tests do not cover an absent consumption record after an uncertain/lost write.

Distinguish the failure timings:

- Before observation: consume() must complete before observeInMemory(), so a creation/sync stop in this code has zero original stub calls. If its record is later absent, a fresh process dispatches once. This does not demonstrate two observations, but it violates a requirement to keep that stopped authorization permanently burned without reuse.
- After observation: if an already-consumed entry is lost after the first stub call, a fresh process mistakes absence for first use and produces a second call. The at-most-one property is then lost.
- A surviving empty/partial/malformed/conflicting entry remains a reliable denial condition within the tested cooperative fixture model. No record content, including forged NOT_SENT, grants resume.

The package itself acknowledges the absent-entry limitation in prototype-contract.md:30–32 and remediation-report.md:99. This review confirms that limitation; a BLOCKED status/result flag alone is not a durable prohibition on a later independently started invocation.

### F1-B — High / additional boundary gap: the authoritative root is not pinned

Sources: synthetic-f1-core.mjs:49–53; disposable-ledger.mjs:12 and 25–27; fixture-harness.mjs:11–45.

The stable authorization key correctly excludes nonce, proof hash, bundle and timestamps. But it is a filename within the caller-supplied admitted fixture root. admitFixture validates a temporary-root shape and descriptor; it does not bind one authorization to one exclusive ledger root.

Two independently created valid fixture roots on the same host accept the exact same synthetic authorization/project/purpose/context. Each creates its own same-named consumption entry and dispatches once. Both entries can remain present; no loss or crash is needed. The existing 47 tests reuse one fixture root within each concurrency/restart assertion and do not reject alternate-root reuse.

This is a limitation of the prototype's admission boundary, not evidence that production state was accessed. Its guarantee must be described as per fixture root with a surviving record. The referenced design at offline-remediation-design-20261014T102324Z/f1-design-options.md:28 requires a pinned host/root/volume identity, which this synthetic provider does not enforce as authorization-wide uniqueness. Merely adding a caller-changeable root to the key would create another allowance rather than fix it.

### F1-C — Blocked durability and Windows security properties

FileHandle.sync() is called on the consumption file. The code does not demonstrate directory-entry persistence under power/storage loss and uses no reviewed parent-directory/Win32 durability primitive. A successful sync and readback show visibility to the tested live OS; they do not establish the required crash/storage durability model.

The independent tests reproduce finite create-new collision exclusion on this local Windows fixture filesystem and process termination/restart with surviving entries. They do not establish general Windows namespace atomicity across filesystems, hostile sharing/reparse/ancestor races, ACL or ownership security, malicious deletion/replacement, or power-loss survival.

The path checks are useful fixture admission checks: lexical shape, ordinary-file/directory tests and realpath comparisons. They are not atomic held-handle admission and do not inspect effective DACLs or authenticated ownership. The lstat/readback operations are separate path-based checks. No adversarial Windows path/ACL test was performed here.

Original-process incarnation ownership is also not established. The prototype has a one-use closure and cooperative IPC child handles, not a reviewed lease/incarnation authority. Actual PID recycling was not attempted. These limits are accurately marked BLOCKED in the package; this review does not close them.

### F1-D — Child and transport evidence is stub-only

Source: disposable-ledger.mjs:64–69; synthetic-child.mjs:9–25; synthetic-f1.test.mjs:32–73.

The observation is a hard-coded in-memory counter and synthetic outcome. No network callback or Supabase provider is supplied. The real child tests exercise process/IPC mechanics around that stub; their zero automaticRetries field and call counts do not prove one upstream request or the retry behavior of a real MCP transport.

The child exits zero after sending a result even when the synthetic result is BLOCKED. The tests correctly inspect the explicit result rather than treating exit zero alone as success. No upstream-request guarantee is falsely claimed in the package; it remains explicitly BLOCKED.

The fixture watchdog and child termination checks are not evidence for the actual native runner's child/backend lifetime, deadline or containment boundary. F3 remains separate.

## Independently executed synthetic counterexamples

The source/import paths of the inline probe were inspected before execution. The probe imported only the same unchanged prototype modules and Node standard modules. It used new disposable directories under a new workspace temporary parent, the fixed existing synthetic child, clean literal child environments and synthetic inputs. No probe source or result file was created; outputs stayed in memory.

For the logical-loss scenarios, the reviewer deliberately removed only the just-created disposable consumed-<key>.f1 after validating its owned temporary root, exact computed leaf, ordinary-file type and canonical path. This is explicit test fault injection, not prototype runtime recovery or permission to delete/repair live state. The next invocation ran in a fresh harmless process. No real power loss was attempted or inferred.

| Scenario | Original stub calls | Fresh process stub calls | Total | Finding |
| --- | ---: | ---: | ---: | --- |
| Stop after empty creation, then injected logical record loss | 0 | 1 | 1 | Stopped authorization can be reused when absence is accepted |
| Sync-uncertain result, then injected logical record loss | 0 | 1 | 1 | Burn/no-resume is not durable without the entry |
| Observation uncertainty, then injected logical record loss | 1 | 1 | 2 | At-most-one fails if consumed evidence is lost after dispatch |
| Same authorization, two admitted roots; both entries retained | 1 | 1 | 2 | Root-scoped exclusion is not authorization-wide exclusion |

All fresh-process results above were SYNTHETIC_PASS; real upstream requests were zero. The original three stop results were BLOCKED. Each synthetic fixture was torn down only after its assertions and child exit. Scratch parents were verified empty and removed non-recursively.

Probe source: 4814 UTF-8 bytes; SHA-256 f3bf5c29b037a733da996fbd8cc6849e1760488647baf6c9539dfa2fd6a5cbea.  
In-memory probe stdout: 899 bytes; SHA-256 efe630c0250bcb930fd0fb248ea6d2f3419d3e8c957ab710dce9e5b89fb4daa2.

These counterexamples were not in the candidate's original 47 assertions and do not alter their recorded pass count. They demonstrate why that passing suite is insufficient for an unconditional durable F1 claim.

## Independent focused tests and syntax checks

Imports and top-level/test paths were read before execution. No production module, credential loader, wrapper, native runner, ACL helper, preflight mode or database/network API is reachable through the inspected test paths. The child and fixture teardown operate only on their own synthetic state.

Windows Node v24.21.0 was verified. All five pinned .mjs files passed --check. Exact focused arguments were --test-concurrency=1 --test-reporter=tap --test followed by this candidate's absolute synthetic-f1.test.mjs path.

The launcher cleared its child environment and supplied literal SystemRoot/WINDIR; the test children additionally received a newly created workspace TEMP/TMP and selected parent TZ. No parent private environment values were read, dumped or forwarded. Tests used shell=false, windowsHide=true, a 30,000 ms execution limit and 1,048,576-byte capture bound. The outer launcher had a bounded 45-second wait. The harmless children retain the package's fixed clean environment and OS-default timezone, as the package discloses.

| Independent run | Tests | Passed | Failed/skipped/cancelled/todo | Exit | Stderr |
| --- | ---: | ---: | --- | ---: | ---: |
| Asia/Manila | 47 | 47 | 0/0/0/0 | 0 | 0 bytes |
| UTC | 47 | 47 | 0/0/0/0 | 0 | 0 bytes |

Syntax checks: 5/5 PASS. No historical SQL, UI/client, wrapper or native suite was rerun. No Linux or physical power-loss coverage is claimed.

In-memory stdout identities for the independent runs:

| Timezone | Bytes | SHA-256 |
| --- | ---: | --- |
| Asia/Manila | 9570 | ea42c9cba94a73b494e54b0d609dc13491c048e6daccd247f37b3ffdd921bfda |
| UTC | 9573 | 7800d74ec5835782897070b210dec9d85e307cb0f4e4d80e50072a8d4e305658 |

No existing TAP log was overwritten and no new TAP log was written. Timing-sensitive stdout hashes need not equal historical logs.

### Initial Temp EPERM evidence

All four original TAP files match their pinned hashes and their parsed summaries:

| Preserved log | Bytes | SHA-256 | Counts |
| --- | ---: | --- | --- |
| focused-tests-initial-temp-blocked-asia-manila.tap | 54868 | 129c98bf5b7db9f761d469fc50b1de0c568a341a3fca5500d8c09998cd972019 | 12 pass / 35 fail |
| focused-tests-initial-temp-blocked-utc.tap | 54868 | c318afe459c1c959e6b726cab330e8ad4aad9f74fc565e90fc96d1a1ed453b6a | 12 pass / 35 fail |
| focused-tests-asia-manila.tap | 9568 | 1308e2ee0e2875e72aeb4ef79599932024387e22d201ceb82090b1d6a67cbbee | 47 pass / 0 fail |
| focused-tests-utc.tap | 9570 | 78e69c51c6d53a3538803d91b0c26bdadc20493e331cc5f477eae9b44f9a7a37 | 47 pass / 0 fail |

Each initial failed log contains 35 EPERM failures at mkdtemp, matching 12 pass / 35 fail among 47 tests. They are preserved failure evidence, not successful filesystem coverage. The default-user-Temp run was not independently repeated and the original permission-denial cause/current permission state was not investigated. This review independently reproduced the subsequent workspace-temp 47/47 results only.

## Positive findings and honest limits

- Exact synthetic scope/schema and canonical reference validation prevent nonce/proof/bundle/time changes from selecting a different filename in one admitted root.
- Creation/write/file-sync/close/readback precede the sole stub call in the inspected code.
- Existing entries deny access without interpreting content as resume authority.
- Cooperative same-root concurrency and restart cases reproduce; stopped objects never retry themselves.
- No automatic runtime cleanup/resume exists; test-owner fixture teardown is separate.
- The package accurately labels missing-entry durability, ownership, upstream behavior and live integration as unresolved. The additional same-host alternate-root gap needs equally explicit scope treatment or enforcement.

## Exact remaining prerequisites

1. Define and independently review the required crash/storage/uncertainty model. Keep zero-observation burn distinct from duplicate-observation risk after dispatch.
2. Select an authoritative durable-consumption/admission mechanism that cannot treat unresolved absence as a fresh grant. Establish the necessary record/namespace survival semantics or use a stronger ledger. A result flag, another in-memory counter or an undocumented sync assumption is insufficient.
3. Bind one authorization to one trusted host/root/volume/store through enforced admission, not a caller-changeable fixture descriptor or a key dimension that creates another allowance. Add a denial test for two-root reuse on the same host.
4. Add regression requirements for lost/uncertain evidence before and after dispatch, plus the alternate-root case. Verify a corrected design fails closed without automatic retry, cleanup, rebaseline or implicit resume.
5. Before any production-capable integration, separately establish Windows path/handle/ACL/ownership/durability and original-claimant guarantees under the selected threat model, and actual upstream no-retry/dispatch semantics.
6. F2 real providers/Windows archive guarantees and F3 actual child-process boundaries remain separate blockers. No new live integration, protected write or continuation authority is prepared by this review.

The next decision is an offline remediation-design decision for these boundaries. An offline review PASS of particular unit behaviors would not authorize a real protected consumption write or amended operation order. This BLOCKED review provides no continuation authorization or installation wording.

## Preservation and worktree

| Checkpoint | Branch / HEAD | Dirty tracked | Staged | Untracked |
| --- | --- | ---: | ---: | ---: |
| Review start | ui-refactor / 2f6e7427c553b7535f53860d1732b42df7c023e8 | 68 | 0 | 3,867 |
| After tests/probes, before review report | same | 68 | 0 | 3,867 |
| After the sole create-new review report | same | 68 | 0 | 3,868 |

The original status SHA-256 is 3eb51dad50a29917056af316a467abee2cbfcee427bd6827f17e0a384604a109 (UTF-8 Git porcelain lines joined LF, no terminal LF). Excluding this new report alone must reproduce it. All 240 pinned existing files are rechecked at finalization. No candidate, manifest, inventory, SQL, existing report, historical log or unrelated work was edited, renamed, staged, reset or removed.

Only new owned synthetic test fixtures were created and torn down during validation. The only lasting addition is this timestamped documentation report, created with exclusive create-new semantics. Its own path/size/hash is returned externally to avoid a circular self-hash.

## Boundary compliance

No protected-state/proof/credential/CA/private-environment access, Supabase or MCP tool, network/PostgreSQL/TLS request, production wrapper/native runner/ACL helper/preflight/install/reconciliation mode, live authorization/proof/lock/attempt/preflight-evidence file, production mutation, pagination/frontend/Storage modification, Git stage/commit/push or deployment occurred.

**BLOCKED — offline review evidence only. Execution and installation remain unauthorized.**

