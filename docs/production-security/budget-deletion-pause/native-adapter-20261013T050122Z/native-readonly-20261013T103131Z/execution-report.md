# Corrected budget-pause native read-only preflight

## Decision

**PASS — GO to prepare a separately authorized production installation.** The one native read-only attempt completed successfully, and all 57 inventories match the applicable reviewed snapshot. No installation SQL was submitted. No installation authorization, approved-preflight record, operation lock or installation attempt marker was created.

Any future installation still requires separate explicit authorization, an exclusive low-traffic drained window and fresh immediate project/catalog/data evidence. The proof was valid throughout this attempt and has since exceeded its five-minute validity window; it must not be treated as fresh evidence for a future write. No automatic refresh or second connection occurred.

## Actual completed checks

| Check | Result | Evidence |
| --- | --- | --- |
| Exact project/control plane | PASS | Fresh get_project: mqqaykksadotbrghbexz, ACTIVE_HEALTHY, direct host db.mqqaykksadotbrghbexz.supabase.co; platform version 17.6.1.127. |
| Approved artifacts | PASS | Corrected bundle/manifest, dedicated verifier, all helper/input/runtime pins and 11,945-byte production SQL matched before the attempt and were rechecked afterward. |
| Secure environment | PASS | Existing Node --env-file mechanism; private file exists, untracked, effectively ignored and owner/SYSTEM ACL restricted. No values were printed or saved. |
| CA trust | PASS | Configured CA bytes/fingerprint match the independently reviewed published Supabase production CA; CA self-signature and current validity verified locally. Actual native TLS then verified the presented chain and hostname. |
| Native endpoint/TLS | PASS | Fixed direct port 5432, no pooler/fallback. TLSv1.3, encrypted socket, chain and hostname checks passed. |
| PostgreSQL identity | PASS | Server 17.6 / server_version_num 170006; database, current_user and session_user all postgres. Default and transaction read-only settings verified on. |
| Privileges/quiescence | PASS | Required ownership, CONNECT, public CREATE/USAGE, language/type privileges, protected-relation SELECT and stats visibility matched. No active budget deletion or competing budget installation session was reported. |
| Original budget RPC/catalog | PASS | Original unpaused admin_bulk_delete_budget_requests(text,uuid[]) matched definition, source, owner, ACL and contract. Exact reviewed catalog SHA-256 matched. The RPC was not invoked. |
| Protected data | PASS | 57 captured, 57 matched, zero changed inventories; complete row envelope and read_only=on verified. No baseline adoption or rebaselining. |
| Supplemental foundation | PASS | Four tables, fourteen functions, eight triggers, owners/ACLs/security settings and complete stable foundation state match the reviewed receipt. |
| Existing protections | PASS | Exact catalog and foundation comparisons preserve the document/containment definitions, trigger dependencies and disabled test RPCs. Environment guard is FALSE. No mutation RPC denial test was executed. |
| Migration/Storage counts | PASS | 164 migrations; latest 20261011230000; 15 unchanged Storage policies; 378 objects. |
| Operator evidence | PASS | Both archives preserve bytes, creation/write timestamps, ownership and ACLs. Current root/files pass the shipped ACL verifier. Only the authorized fresh proof and one completed preflight artifact were added. |

Actual native invocation: 2026-10-13T10:42:22.7871082Z through 10:42:30.2550605Z; duration 7.4679523 seconds; exit code 0. **One native attempt, zero retries.** Each executable verifier uses its pinned REPEATABLE READ, READ ONLY transaction ending ROLLBACK. No install mode was invoked.

## Exact verification identities

| Item | SHA-256 / fingerprint |
| --- | --- |
| Corrected adapter bundle | 58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25 |
| Input manifest | 562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb |
| Dedicated ROLLBACK inventory | 459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34 |
| Unchanged production SQL, 11,945 bytes | a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a |
| Current exact catalog | eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5 |
| Original RPC definition/source MD5 | f6c36316ba941c9e0f76674754ac44ba / eb7b756964fd31efebfb39749f5c9e5b |
| Reviewed snapshot file | 2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc |
| Both reviewed/current normalized 57 inventories | eabcb583b5a2417de666793aa86b26f53f6c32e4369d83e577f0fe70153f7429 |
| Foundation structure | eb9bf6a418438358fc9b6e8e72208e4b3ade1d798ac04fe91c7eb58c2b5063d9 |
| Both reviewed/current full stable foundation | 770d3d419386094aa7be2cce8e1a5a47056fe2c972e4a043c8949652cd67dea5 |
| Complete migration history MD5 | 1f5eca911f6e2057ae070a955eaca3dc |
| Fresh control-plane proof | 79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1 |
| Completed preflight evidence bytes | 6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81 |
| Preflight state fingerprint | 8d8a45ca4a229d17b8cd79c33b914791e8b435774e5f615cae364b3d319c80fc |

The protected preflight artifact is `preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json` under the fixed operation root. Its exact sanitized bytes are preserved locally as native-preflight-evidence.json with the same SHA-256. It was not copied to approved-preflight.json.

## Evidence discrepancies and resolution

### Automatic approval review

The first archival command was rejected before process creation because automatic review interpreted it as repeating the original archived-proof rename. Fresh read-only state/scope evidence established that the source was the still-active proof with hash 2c5c49…, its new destination did not exist, and the original 0435d3… archive was never a rename source. The same command was then approved and executed once. No indirect execution workaround was used. See archival-scope-readonly-verification.json and archive-verification.json.

### Outer wrapper proof-age calculation

The original completion receipt reports 28836.2550605 seconds, which contradicts the explicit UTC timestamps. That receipt remains unchanged. A local reproduction confirmed PowerShell 7.6.5 ConvertFrom-Json produced System.DateTime (Utc); casting it to string removed its UTC marker and fractions, and DateTimeOffset.Parse interpreted it in UTC+08:00. This inflated the wrapper's age by eight hours.

Independent Node parsing of the raw ISO JSON proves the proof was **36.022 seconds old at completion**, within the 300-second requirement. The Windows PowerShell proof-creation verifier and pinned native adapter each independently checked actual freshness. This discrepancy is resolved in proof-freshness-independent.json and wrapper-timestamp-diagnosis.json; no database retry or alteration of the reviewed adapter occurred. A future outer invocation wrapper should preserve the explicit UTC value rather than reparse a timezone-free string.

There is no missing native TLS/catalog/inventory evidence for this completed attempt. This conclusion relies on the new complete saved snapshot, not inference from the earlier failed attempt. No production drift was detected.

## Protected local state

The root now contains exactly four permitted files:

1. Original 0435d3… hash-named archive, unchanged.
2. Newly archived 2c5c49… proof, created by one non-overwriting rename of the former active file.
3. New active control-plane-proof.json, create-new semantics, 197 bytes, SHA-256 79a508….
4. The one completed preflight evidence file named above.

Both archives have matching before/after bytes, creation and last-write times, security descriptor/ownership and effective ACLs. Ordinary OS-managed last-access changes were accepted as authorized and recorded. No timestamps or ACLs were repaired. No lock, marker or approval record was removed or cleared.

Eleven files from the previous failed native attempt were rechecked against its preserved evidence manifest. Prior receipts, tests, archives and correction artifacts remain untouched. The reviewed runner, manifest, production SQL and other pinned inputs remain unchanged. No completed offline tests or unrelated UAT workflows were rerun.

## Remaining installation prerequisites

- Separate human authorization for the exact production pause SQL, direct TLS route, corrected bundle/manifest and independently reviewed preflight evidence/state fingerprint.
- An exclusive low-traffic window that drains existing destructive budget calls and prevents competing migrations, privilege changes, repairs and protected-data writes.
- Fresh control-plane proof and immediate native catalog/data checks within the five-minute proof window. Existing proofs and this completed snapshot must be preserved; preparation must handle the current four-file state explicitly rather than replay older archival instructions.
- Installation-only approval bindings and durable one-attempt controls may be prepared only under that later authorization. No runnable installation authorization is created here.

**STOPPED after read-only verification and local reporting.** No production/staging data, Auth, Storage policies, gateway or frontend changes; no Git push, automatic retry, rollback or SQL installation.
