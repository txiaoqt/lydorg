# Missing budget-specific native adapter — execution blocker

Review date: October 13, 2026, Asia/Manila. The operator confirmed **no separately prepared adapter exists**. This document is a specification, not executable code or installation authorization.

## Existing route reviewed

`storage-cutover/native-runner-20261011T132539Z/native-foundation-runner.mjs` and `runner-core.mjs` provide an existing native pg/TLS and durable single-attempt architecture. They must remain unchanged and must not be invoked in installation mode for this task.

They are incompatible with the budget pause:

- They pin the foundation SQL hash `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2` and 47,407 bytes, not the approved budget pause hash and 11,945 bytes.
- Their namespace-absence gate requires the Storage foundation to be absent; it is already installed.
- Their original preservation baseline predates the 93rd profile and related normal activity. It must not be silently replaced for this different operation.
- Their postflight verifies foundation installation, not the budget function contract.
- Their operator records, lock, consumed attempt marker and receipts are foundation-specific. Do not remove, repurpose or reuse them.
- Their `selectRow` helper requires a final COMMIT tag. The approved budget pre/post read-only verifiers finish with ROLLBACK. The future adapter must validate the declared terminal tag and read-only evidence for each pinned verifier; do not relax parsing indiscriminately or change the approved SQL.

## Smallest supported local preparation needed

Reuse the reviewed architecture and compatible pure TLS/connection/durable-write logic. Prepare a separate, narrowly bound adapter; no general SQL runner is needed.

1. Pin production project `mqqaykksadotbrghbexz`, host `db.mqqaykksadotbrghbexz.supabase.co`, port 5432, database/user postgres, route `native-pg-direct-tls`, the budget SQL's exact hash/bytes and input verifier hashes. No arbitrary project, SQL, endpoint or URL arguments.
2. Keep offline review as the default. Native preflight must enforce read-only transactions. Installation must require a new human authorization bound to the complete reviewed adapter bundle hash, SQL hash/size, independent CA fingerprint, fixed target and a short valid exclusive window. Do not create that authorization record during preparation.
3. Use one pinned-version `pg.Client` and one connect attempt for installation. No pool, route fallback or reconnect-driven mutation resubmission. Compatible existing TLS helpers may be reused only with their source identity pinned and their foundation-specific assumptions identified.
4. Use the existing secure environment loader; never read the populated private env file during code review. Reject conflicting PG route/SSL settings and disabled verification. No credentials in command arguments or receipts.
5. Verify TLS chain and exact hostname, actual authorized/encrypted socket, server TLS protocol and PostgreSQL 17.6 identity/privileges. Record only certificate fingerprints and non-secret identity metadata.
6. Pin a distinct budget operation-lock path and durable attempt-marker path under a protected local operator directory. Claim the lock exclusively; verify PID/nonce ownership before submission and through verification. Verify effective Windows ACLs; POSIX file mode 0600 alone is not a Windows ACL guarantee. Never remove another process's lock or clear a consumed marker automatically.
7. Establish the operator-confirmed exclusive window, drain existing deletion calls and exclude competing schema/protected-data writes. A local lock does not stop other machines/operators or an already-running old RPC.
8. Revalidate current control-plane proof, exact original RPC/catalog, privileges, artifact hash and pinned helper inputs. Capture all 57 protected inventories durably before consuming the attempt. No silent adoption of the older foundation baseline or unexplained drift.
9. The budget catalog excludes foundation-specific functions, its authorization RPC, eight foundation triggers and private table structures. Reuse the existing supplemental foundation read-only verifier and installed receipt for exact before/after preservation. This avoids repeating broad foundation testing while covering those exclusions.
10. Flush and verify the durable marker **before** the single SQL submission. Submit the reviewed SQL bytes once as an unmodified UTF-8 simple-query message, preserving BEGIN/COMMIT and timeouts. No appended receipt or migration SQL. The marker stays consumed after every possible submission outcome.
11. Require a genuine COMMIT acknowledgement. Postflight verifies the exact new function/catalog, original OID, grants/security settings, all 57 immediate inventory matches, unchanged supplemental foundation and Storage policies/history. Save durable sanitized evidence before releasing the verified own lock.
12. Stop after any unexpected error. No vulnerable-function rollback, automatic repair or mutation retry. Keep the lock and marker on uncertain/post-COMMIT verification failure.

## Uncertain-outcome reconciliation

Record the installation backend PID, backend start time and unique non-secret application name/nonce in the preflight receipt. After a lost response:

1. Preserve the consumed marker, lock and sanitized transport evidence. Do not submit the SQL again.
2. Use an independently verified **read-only** connection only for reconciliation. Never route that connection back into install mode.
3. Establish that the original backend/transaction has finished. An old catalog observed while that backend is still active cannot prove rollback; it could still commit. Inspect only matching backend/activity/lock metadata, never log full query text. Do not terminate a backend automatically.
4. Once completion is established, take a consistent read-only catalog/function/57-inventory snapshot and supplemental foundation verification.
5. Classify `COMMITTED_AND_VERIFIED` only for the exact expected new state and preserved rows; `NOT_INSTALLED_VERIFIED` only for the exact original state with preserved rows and no outstanding installation backend. Mixed state or unexplained differences remain `UNRESOLVED` / `COMMITTED_WITH_DRIFT` as supported by acknowledgement evidence.
6. Stop for human review in every reconciliation case. Even confirmed absence is not permission for an automatic second attempt.

## Required focused adapter validation

These tests are missing because the adapter does not exist. They are distinct from the already accepted 38 SQL and 18 UI tests:

- Wrong project/host/CA/hash/length/driver/input manifests fail before submission.
- TLS hostname/chain failure rejects; no insecure fallback.
- Two local processes cannot claim the same operation, lock ownership cannot be stolen, and Windows state paths have the intended ACL.
- Pre/post result parsing accepts only the pinned verifier's expected terminal tag and `read_only=on`.
- Duplicate marker and simulated crashes/lost COMMIT response never cause a second mutation call.
- Receipt-write/postflight failure preserves known commit state and the marker/lock.
- All 57 inventories and supplemental foundation fingerprints are compared, with drift rejected.
- Error/receipt fixtures do not emit passwords, connection strings, tokens, signed URLs or private rows.

No production action should be authorized until that concrete adapter and its bundle hash are reviewed. The approved SQL need not change to address these adapter gaps.
