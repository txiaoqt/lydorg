# Proposed installation and postflight checklist

**REVIEWED PROCEDURE ONLY. No execution window is active under this document. Separate explicit authorization is required.** No commands in this review create an approval record, lock or attempt marker.

## 1. Required human confirmations

- Approve exactly the single-function unconditional budget-deletion pause and the artifact identities in final-review.md.
- Approve a new low-traffic execution window with explicit UTC start/end (including the Z/offset), an accountable operator and a completion/stop notification. Do not reuse an earlier window confirmation. Installation authorization records may be valid for at most 30 minutes; control-plane proof validity is separately limited to five minutes.
- Confirm existing budget-deletion requests have finished, including open/idle-in-transaction writers and queued client Storage cleanup. No competing migrations, grants, repairs, protected-data writes, Auth/consent/Admin-session writes or Storage operations may begin until the result is reported.
- Coordinate known operators, application writers and background jobs. The local lock protects cooperating local installation runners; it does not prevent other database sessions or application requests. Database activity counts are an additional check, not an exclusive-window guarantee.
- Confirm the trusted existing local credential mechanism and independently reviewed CA remain available. Supply no values in chat, CLI arguments or receipts.
- Acknowledge that only terminal COMMIT plus COMMITTED_AND_VERIFIED and complete postflight evidence constitute normal success. Exit code zero and drift labels alone are insufficient.

## 2. Verify the exact route and bytes

Target only mqqaykksadotbrghbexz / db.mqqaykksadotbrghbexz.supabase.co:5432, database/user postgres, native-pg-direct-tls. Use the existing Node v24.21.0 toolchain and pg 8.23.0 runtime; verify all four code files, eleven pinned inputs and 138 runtime files against the manifest.

- SQL: docs/production-security/budget-deletion-pause/20261012T165000Z/budget_deletion_pause_production.sql; 11,945 bytes; a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a.
- Bundle: 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25.
- Manifest: 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb.
- Independently reviewed CA fingerprint: 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7; verify current CA bytes, trusted provenance and validity privately.

Use only the existing Node environment-file loader. Verify Git exclusion and Windows ACLs without printing values. Reject insecure TLS, connection-string, PG endpoint, runtime/preload and forced-native-driver overrides; require NODE_PG_FORCE_NATIVE unset. No pooler, MCP SQL, CLI db push, migration replay or alternative execution route.

## 3. Preserve the current four-file state

Before later authorized preparation, verify the exact fixed root and its ownership/effective ACLs. Require these four files and no unexpected state:

1. control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json.
2. control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json.
3. control-plane-proof.json, recorded SHA-256 79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1 (197 bytes).
4. preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json, SHA-256 6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81.

Authorization, approved-preflight, budget operation lock and budget attempt marker must be absent. An empty marker is still consumed; do not precreate one. Do not rerun Protect, reset ACLs/timestamps, clear state or repeat either previous archival rename.

Only if expressly included in the new authorization: archive the exact stale active 79a508… proof to control-plane-proof-history-79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1.json using one non-overwriting same-directory rename after requiring its destination absent. Preserve contents, creation/write times, ownership/ACLs and both older archives; accept only ordinary OS-managed last-access changes. Preserve the historical preflight.

Then obtain fresh independent Supabase control-plane get_project evidence, require exact healthy project/direct host, and create one new active proof with create-new semantics. Keep only the five approved sanitized metadata fields. No silent replacement, repeated refresh or automatic retry.

## 4. Fresh preflight and approval bindings

Under that later authorization and window, run one fresh native read-only preflight with the exact adapter. Require TLS chain/hostname/encrypted socket, PostgreSQL 17.6, expected identity/privileges, original unpaused RPC and exact catalog, 164 migrations, 15 policies, 378 objects, all 57 inventories and foundation/document/containment protections.

Require fresh normalized state fingerprint **8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc**, inventories **eabcb583b5a2417de666793aa86b26f53f6c32e4369d83e577f0fe70153f7429**, foundation structure **eb9bf6a418438358fc9b6e8e72208e4b3ade1d798ac04fe91c7eb58c2b5063d9** and full stable foundation **770d3d419386094aa7be2cce8e1a5a47056fe2c972e4a043c8949652cd67dea5**. Compare every inventory to the reviewed snapshot. Any change, including TLS peer/state changes, requires STOP and separate review; do not adopt a new baseline automatically.

The historical 6e5869… file proves the reviewed state; its old control-plane proof is expired. It cannot be paired with a new proof as the active approved baseline. Preserve it without editing. The fresh snapshot must itself contain the new proof SHA-256.

After explicit conditional authorization to prepare the local bindings, create approved-preflight.json as a byte-identical, create-new copy of the **fresh** successful snapshot. Create authorization.json only under that approval, with the exact twenty fields required by verifyAuthorization, bound to the fresh proof hash, fresh snapshot byte hash, unchanged approved normalized state, CA, SQL and bundle. Both records must have protected ACLs; no overwrite.

The fixed historical hashes are review anchors. Fresh proof/snapshot byte hashes are calculated from new immutable evidence only after the same-state checks; no placeholder may enter an active authorization. A fresh timestamp/backend makes the new snapshot byte hash different without approving changed protected data.

Use one immutable active proof for fresh preflight, approval bindings and installation. Refreshing it again invalidates the bindings. If it expires, STOP and preserve everything; do not patch a historical hash or automatically refresh/retry. Start the installation promptly with ample headroom in its five-minute window; the runner rechecks freshness before arming.

## 5. Invocation and outcome controls

Do not reuse the earlier timezone-unsafe outer calculation. Parse raw ISO JSON timestamps with the approved Node runtime, preserve the UTC marker/offset, reject invalid timestamps and compute age from Date.parse values. Do not cast a PowerShell DateTime to a timezone-free string and reparse it. Record explicit UTC times; retain the runner's native freshness checks.

Use the exact runner's existing installation mode only after authorization and all prerequisites pass. One pg.Client, one exact SQL byte payload, one submission. Preserve original BEGIN/COMMIT, 1-second lock timeout and 30-second per-statement timeout. These are per-statement limits, not a 30-second total transaction deadline. No splitting, parameters, appending, reordering, receipt INSERT, broad replay, reconnect-based resubmission or retry.

The runner creates/owns the exclusive lock, captures and matches immediate pre-install state, verifies quiescence, writes protected evidence and a durable attempt marker before the SQL call. Never create those runner-owned files manually. Keep the process alive through acknowledgement and postflight. Do not restart a disconnected/uncertain process.

Parse the sanitized JSON outcome. Normal PASS requires all of:

- status COMMITTED_AND_VERIFIED;
- commitAcknowledged true;
- submissionCount 1, automaticRetries 0 and rollbackStatementsSent 0;
- a COMMIT terminal command tag in the durable journal;
- POSTFLIGHT_EVIDENCE and POSTFLIGHT_VERIFIED events with expected fingerprints;
- verified journal integrity, protected ACLs and retained attempt marker.

Exit code zero is not sufficient: the current CLI also returns zero for UNRESOLVED and COMMITTED_POSTFLIGHT_FAILED. Every other status, malformed/missing output or incomplete receipt is STOP. No following release is authorized by a successful result.

## 6. Mandatory postflight

Verify the target has the same OID 32925, signature/arguments/result, postgres owner, exact ACL, SECURITY DEFINER, VOLATILE/non-strict/parallel-unsafe attributes and search_path. Require:

- Paused definition MD5 3da7c71f32e4f2a9164efbbac6cda448; source MD5 0e4e1f3cb102a26d08ab10161a23e682.
- Exact post-catalog SHA-256 e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f. This is the reviewed expected post-state; never relax it if production differs.
- All 57 before/after entries unchanged and matching the approved preservation state; same full stable foundation and security definitions/grants/triggers.
- Four foundation tables, fourteen functions, eight triggers; four containment marker triggers and three document-security triggers preserved by their fingerprints; twelve disabled test RPCs remain disabled; environment guard FALSE.
- 164 migration records, latest 20261011230000, full history MD5 1f5eca911f6e2057ae070a955eaca3dc; no new migration receipt.
- All fifteen Storage policies unchanged and all 378 Storage object metadata records preserved; no file API operations.
- No budget, liquidation, notification, audit, Admin-session, organization, accreditation, renewal or other protected-data rewrite.

Use read-only catalog/body verification and accepted local denial evidence. Do not invoke the destructive production RPC, even with null IDs, as a denial demonstration unless separately authorized. Live HTTP 409 and disabled frontend controls remain NOT TESTED under this installation scope.

The runner releases only its owned lock after verified success; the consumed marker and receipts remain. Verify the external receipt and exact committed state, report completion and stop. No gateway/frontend/Storage cutover follows automatically.

## 7. Uncertain outcome and forward recovery

For errors before COMMIT or missing/ambiguous acknowledgement: preserve journal, marker and lock; no second submission or explicit rollback query from the installer. A known SQL error aborts its atomic transaction; closing the client discards uncommitted work. Confirm the authoritative result read-only after the recorded writer backend finishes.

The existing reconciliation mode uses a new read-only client and the recorded backend PID, backend_start and unique application_name. If that backend or a matching application session remains, outcome is UNRESOLVED. Do not treat a stale-looking lock as permission to remove it.

| Catalog/function evidence after backend completion | Preservation | Operator conclusion |
| --- | --- | --- |
| Original eeda91… / f6c363… / eb7b75… | All 57/foundation match | Original state present; installation not present. Still no automatic retry. |
| Expected e189e6… / 3da7c7… / 0e4e1f… | All 57/foundation match | Reviewed pause present and preservation verified; record acknowledgement uncertainty honestly if none was received. |
| Either known catalog | Any protected drift | STOP; independently report whether the pause is present and that preservation failed. No repair/rebaseline. |
| Unknown catalog/function or writer still present | Any | UNRESOLVED; preserve state and escalate for review. |

Known reporting limitation: classifyReconciliation returns COMMITTED_WITH_DRIFT whenever preservation fails, even if the original catalog remains. That label is not proof of commit. Inspect its recorded raw catalog/function fingerprints and report installation presence separately. Never accept this label or the CLI exit code as success.

If COMMIT is acknowledged but postflight fails, classify as committed with verification failure and preserve the restrictive pause/security protections. Prepare a separately reviewed forward correction or continue the affected feature pause. Do not restore the permissive deletion function, undo unrelated records, clear history, grant broad DELETE, weaken Storage policies or roll back to older incompatible frontends.
