# Budget native adapter ACL correction

**Decision: CONDITIONAL GO for a separately authorized read-only preflight. No installation readiness is claimed.** The corrected implementation passed 33/33 offline tests and its offline review. Live TLS/catalog/inventory checks remain NOT TESTED.

## Root cause and correction

The old PowerShell CLI applied its exact-root guard to both Protect and Verify. The runner verifies child evidence files, so the original CLI rejected its control-plane proof before any database connection.

The corrected helper keeps Protect restricted to the exact profile-root location and allows Verify only for the root and explicitly named direct child artifacts. It canonicalizes local absolute Windows paths with OrdinalIgnoreCase comparisons, rejects traversal, sibling/nested paths, relative/device/UNC paths, alternate streams, ambiguous trailing dots/spaces, unknown filenames and directories masquerading as evidence files. Existing reparse, ancestor, ownership and DACL checks remain active.

A second relevant defect was corrected: the previous array/pipeline expression could filter the root out of the ACL-rule loop. The helper now explicitly checks the root and then the child. Protect also checks for reparse points before directory creation.

The only runtime implementation changed is `operation-acl.ps1`. The native runner and budget core remain byte-identical. The approved SQL, ten verifier/input pins and all 138 pg runtime files remain unchanged. No root override or generic SQL capability was added.

## Final identities

- Adapter bundle SHA-256: `0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9`.
- Input manifest SHA-256: `8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8`.
- Approved SQL SHA-256: `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`; 11,945 bytes.
- Previous bundle `01b42ba7f4ff814cfbd6aa622504ffb5da03c27cbe2f2c102212f46763b5559f` is historical and does not identify the corrected adapter.

## Actual validation

- **PASS: 33/33 focused tests, zero skips**, in `focused-tests.tap` and `acl-correction-20261013T080046Z/focused-tests-final.tap`.
- **PASS: exact shipped PowerShell CLI** verified the existing state root and proof read-only. The runner's actual `invokeAcl` integration also accepted the proof.
- **PASS: disposable CLI fixtures** exercised Protect root-only behavior, all permitted child families (including locks, markers and evidence), outside/sibling/traversal denial, case/slash normalization, missing files, unknown targets, unsafe file/root DACLs, directory masquerading, and root/child junction denial.
- To avoid changing real operator state, positive Protect and unsafe-permission/junction cases used copies with exactly one trusted-root assignment substituted. All remaining script bytes and documented CLI arguments were identical. The shipped script has no override parameter. This distinction is intentional and recorded.
- **PASS: existing one-shot/marker/authorization tests**, including absent authorization, consumed markers, no mutation retry, lost responses, receipt failures, and read-only reconciliation. No install mode was invoked; malformed-argument coverage uses offline review.
- **PASS: three Node syntax checks, PowerShell parser and source whitespace/diff checks**.
- **PASS: offline --review**, with `connectionAttempted:false` and `installationActivated:false`, preserved in `offline-review.json`.

The initial and second correction runs each passed 31/33 because one root-ACL test setup failed, also failing its parent test. The second run captured SeSecurityPrivilege from PowerShell Set-Acl. The disposable setup was changed to a DACL-only Windows API; the complete suite then passed. Both failures are preserved. A later final run also tested the bounded proof-history name and passed 33/33.

## Operator evidence preservation

The before/after state snapshots are byte-identical, SHA-256 `d39f410abbe9b5ac702a63c9da9a7346e8f4cbf2c509451cdb8e1a0ee6cb9e9b`. The proof remains at its original path with unchanged bytes, ownership, ACL and last-write time. No operator lock, attempt marker, authorization or approved preflight was created. All disposable ACL fixture directories were removed.

A local comparison command initially reparsed ISO timestamps through PowerShell and reported a mismatch; the saved files themselves were byte-identical. Raw snapshot SHA-256 comparison resolved it. Another wrapper initially treated git diff --no-index's normal difference exit code as a whitespace failure; the corrected output-aware check passed. No operator repair was attempted.

Original sources, manifest, 22-test evidence, procedures and failure report are preserved under `acl-correction-20261013T080046Z/prior-artifacts/`. The old CLI failure was reproduced read-only and saved as `old-cli-failure.json`.

## Remaining conditions

The preserved control-plane proof is stale. A future authorization must expressly permit its byte-preserving archival rename and a fresh create-new active proof, as described in `operator-procedure.md`. Neither step was performed here.

Future native preflight must independently establish project identity, CA trust, TLS hostname/chain, PostgreSQL identity/privileges and current catalog/inventory compatibility. Any data drift remains a stop condition and is never silently adopted. An exclusive low-traffic drained window remains mandatory for any later installation.

No production PostgreSQL connection, preflight/install execution, business/Auth/Storage mutation, push or deployment occurred. The installation authorization template remains deliberately invalid. The new draft authorizes read-only preflight only if separately approved.
