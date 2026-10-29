# Budget deletion pause: versioned local remediation candidate

## Verdict

READY TO REQUEST SUPERVISED AUTHORIZATION. This is a local candidate, not installation approval. No production connection or mutation was performed. No window, proof, preflight binding, authorization, lock or attempt marker was created.

## Exact candidate identities

Candidate directory: docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T133312Z

Bundle SHA-256: 390afb8cfa01d68cc6ad74472730fc6096775a40e9f8a98c17f6b8b2fed1d865

Input manifest SHA-256: 7099f8dce1a195aa7df8f6d279c45ba451b31ab46cd4e13114a2fea7b9bcfd1b

| Candidate code file | Bytes | SHA-256 |
| --- | --- | --- |
| budget-runner-core.mjs | 46357 | 6181be1317389ba5dd4ff801e0ffcfd0b85ffad4bae4524ae35ebb2ee44e6f9b |
| budget-safety-controls.test.mjs | 15120 | 679284536020375873e0e6e2735cfd398ead084ef9492390b85ed4e8632f0be5 |
| native-budget-pause-runner.mjs | 32972 | f0f13fff29fdee9d95ba84f9b5265c923ff917c088c743f86175a0ccc832b885 |
| native-budget-pause-supervisor.mjs | 4609 | 9ad5b0fb5cad52b7557f2a57289b544957283d8fab7ad4cc11190282313d19e3 |
| operation-acl.ps1 | 14463 | 4891d4c1c5a9d47ec91e01cb64c7951b6c5c3a3143f3f7ad1242820feb16f258 |

The five code files form the candidate bundle together with reviewed-inputs.json. All eleven pinned input identities and all 138 pg dependency identities remain unchanged. The copied operation-acl.ps1 is byte-identical to the original.

Production SQL remains at its original path, 11,945 bytes, SHA-256 a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a. Dedicated inventory verifier SHA-256 remains 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34. No SQL or preservation baseline was changed.

## Exact corrections

1. The candidate runner reads and validates the durable four-event journal, attempt-marker bytes and immediate preflight bytes before returning success or releasing its owned lock. It requires terminal COMMIT, one submission, zero retries/rollback statements, exact project/SQL/bundle/backend/nonces, all 57 preservation bindings, expected function contract, catalog, foundation, migration and Storage counts. An incomplete or mismatched receipt after acknowledgement produces COMMITTED_POSTFLIGHT_FAILED, retains the lock/marker and exits nonzero.
2. The new fixed-route supervisor starts the candidate runner at most once, rejects zero-exit stopped outcomes and independently revalidates the durable bytes and reported receipt hashes. It reports unresolved state rather than resubmitting after a child/process/evidence error. It does not log raw child stderr or untrusted stdout. Its default mode is offline review. No installation mode was invoked in this task.
3. Reconciliation requires completed writer-backend verification and consistent raw catalog plus full function fingerprints from both views. It distinguishes INSTALLED_AND_PRESERVED, INSTALLED_WITH_DRIFT, NOT_INSTALLED_VERIFIED and NOT_INSTALLED_WITH_DRIFT. Missing, conflicting or unknown evidence remains UNRESOLVED. No reconciliation status is treated as COMMIT acknowledgement or installation success; every reconciliation outcome stops and exits nonzero. The former COMMITTED_WITH_DRIFT label is never emitted by the candidate classifier.
4. Freshness parses original ISO JSON with Node, requires an explicit timezone and retains the maximum five-minute guard. Authorization timestamps also require explicit ISO offsets. NODE_PG_FORCE_NATIVE is rejected, including an empty value, before a native connection.

The original transaction bytes, 1-second lock timeout, 30-second per-statement timeout, fixed project/TLS route, privilege/catalog gates, lock ownership, durable attempt-before-submission order and one mutation query remain unchanged. See security-correction.patch for the source delta.

## Local evidence

Node v24.21.0: 50/50 new focused tests PASS; four JavaScript syntax checks PASS; two source diff/whitespace checks PASS. Tests include an actual harmless child exiting zero with a stopped result; valid receipt success; mismatched/incomplete journal, marker and fingerprint evidence; old/new/unknown reconciliation states; no retry after ambiguity; timezone offsets and the five-minute boundary. All marker and receipt fixtures were in memory. No SQL/database client or protected-state write was executed.

Historical 38/38 SQL, 18/18 UI/client and 39/39 adapter suites were hash-verified and not rerun. Original manifest, bundle, four code files, eleven inputs, dependencies and historical receipts remain intact; original-preservation-verification.json records 207 successful hash checks.

## Hash supersession and historical evidence

For this candidate only, the new bundle replaces 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25 and the new manifest replaces 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb. The originals were not overwritten, relabeled or removed. The original core and runner hashes are recorded in the original manifest; the candidate hashes above identify the changed copies. Original historical tests remain at their old locations; the candidate pins a separate focused test file.

Historical preflight SHA-256 6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81 and normalized state 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc are preserved. That state includes the old bundle identity and cannot be copied into candidate installation bindings. The preserved 57-inventory business baseline is unchanged. No new approved state fingerprint or binding was prepared. All saved production proofs are historical, not fresh installation evidence.

## Protected-state presence only

At the bounded read-only check, authorization.json, approved-preflight.json, budget-deletion-pause.operation.lock.json and budget-deletion-pause.attempt.json under C:/Users/Christopher x Angel/.ytrace-production-budget-deletion-pause/ were ABSENT. No contents, proof, certificate or credential file was read; no directory write or ACL change occurred. This presence check is not a current ACL/ownership verification.

## Remaining prerequisites

- Independently review and explicitly approve the candidate identities; neither the old bundle authorization nor historical evidence authorizes the new candidate.
- Separately authorize fresh control-plane and native read-only verification, including trusted CA/TLS, exact project/catalog/privileges, all 57 inventories and foundation/document/containment preservation. Do not adopt unexplained differences or a new business baseline.
- Require a new explicitly approved exclusive execution window with existing deletion calls drained and no competing protected-data, Storage, schema or permission writes. A local lock alone does not provide that exclusion.
- Verify protected-root ownership/ACLs, unchanged inputs and unused operation state immediately before later authorized preparation. Generate fresh proof and matching immutable authorization/preflight bindings only under that later authorization.
- A future installation must use the reviewed candidate supervisor and one exact SQL submission. Stop on any nonverified outcome; preserve receipts and the consumed marker. Reconcile uncertain state read-only under the appropriate authorization; never retry SQL automatically or restore the permissive function.

No frontend, pagination, Storage policy, UAT, gateway, Auth, migration, push, commit or deployment work is included.
