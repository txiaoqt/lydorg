# Production Admin Storage gateway — positive acceptance

**Result: PASS for the authorized positive acceptance scope.**

Production: `mqqaykksadotbrghbexz`. Gateway: `admin-storage-access`, ACTIVE version 1. Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty work was preserved.

## Execution

The authorized operator supplied their own existing custom Admin session through the hidden local prompt and explicitly approved DOC-01. The helper performed exactly one signing POST and one in-memory download GET. It did not create, refresh, revoke or extend a session. No retry or further file request was made during independent verification.

Execution started at `2026-10-12T01:06:02.982Z` and completed its local postflight at `2026-10-12T01:06:14.561Z` (09:06 Manila). Independent control-plane and native PostgreSQL read-only checks subsequently completed. See the timestamped JSON evidence in this directory.

| Check | Result | Evidence |
|---|---|---|
| Genuine existing Admin session and current file permission | PASS | Read-only token match and permission check; subsequent gateway HTTP 200 through server-side custom Admin authorization |
| Authorized signing | PASS | One POST, HTTP 200, 2,956 ms; no-store response; exact approved origin/object scope and 3,600-second lifetime checked privately |
| Authorized download | PASS | One GET, HTTP 200, 1,229 ms; 81,263 bytes matching authoritative metadata and PDF header |
| Independent content SHA-256 comparison | NOT TESTED | No independently trusted expected hash was provided; calculation in memory is not independent integrity validation |
| Permission-specific denial | BLOCKED | No genuine denial resource was designated/approved; no additional production resource was probed |
| Independent gateway/function identity | PASS | All nine deployed function identities match the prior verified inventory; gateway ACTIVE v1 with `verify_jwt=false` and reviewed bundle identity |
| Production preservation | PASS | Execution-time before/after checks described below, followed by independent current catalog, foundation, counts and DOC-01 metadata verification |

The helper parsed the signed URL's expiry as a consistency check; Storage verified its signature during the successful GET. The signed URL remains valid until server expiration. Discarding client memory does not revoke an issued URL.

## Preservation evidence

The execution receipt's immediate before/after comparison verified:

- All 56 non-session protected inventories unchanged, including business records and Storage metadata.
- Every other Admin session unchanged and total session count unchanged.
- Supplied session unchanged except its permitted `last_used_at`; expiry unchanged.
- DOC-01's metadata, authoritative parent, organization ownership and physical object metadata unchanged.
- Foundation functions, tables, triggers, grants and catalog unchanged.

The independent postcheck confirmed the exact catalog compatibility fingerprint, 164 migrations, 15 unchanged Storage policies and 378 Storage objects. Four foundation tables, fourteen authorization functions and eight enabled triggers match the installed receipt, including service-role-only authorization RPC privileges. Containment marker and document-security triggers remain intact. The independent later snapshot confirms current state; the full before/after business-data comparison comes from the execution receipt, not an invented second historical snapshot.

Foundation fingerprints:

- Functions: `31c658a5d692e03262bf1952b1b493bce67e96f8d06da307da10e928a59af55a`
- Tables: `e8a99cced6798451a93d4aca4eac5ca1a209ef3869cd367ac454215ec32eb85f`
- Triggers: `ab8eaa2be4f9dd4dfbb993f61cb42b99c41ad198c8af1345eb5ec5fc40b4416f`
- Catalog: `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`
- Gateway compiled bundle: `88e6e86352cdb3718e5687c1287b0bc73717a48f21b8c65aa97310744ab260e2`

Verification used the pinned production native PostgreSQL route, PostgreSQL 17.6, verified TLS certificate chain/hostname and enforced read-only transactions. No credentials, token/hash, private file contents, filenames, paths or signed URLs were logged or saved in this evidence.

## Historical input failure

An earlier operator run stopped at the combined session validity/expiry guard before submission. No marker/receipt or gateway request was created by that run. A bounded read-only diagnostic found zero sessions with the earlier copied expiry. The client can refresh expiry during normal user activity, so the operator supplied current session data for the successful run. Timestamp parsing was not the demonstrated defect. Local diagnostics now separate inactive, revoked, expired and mismatched-expiry conditions; all guards remain enforced.

Local checks: fourteen synthetic URL-scope/expiry/buffer checks and seven session-state checks passed. JavaScript syntax, PowerShell parser and diff checks passed. These checks are supporting helper validation, not substitutes for the actual HTTP evidence above.

## Evidence and retention

- `operator-execution-receipt.json`: sanitized copy of the original operator receipt; original remains untouched in the Git-ignored, ACL-restricted local directory.
- `independent-control-plane.json`: fresh project and all nine function identities.
- `independent-production-postcheck.json`: independent native read-only verification.
- `completion-receipt.json`: final PASS, superseding the source receipt's pending independent postcheck status without rewriting that source evidence.
- `evidence-manifest.json`: SHA-256 evidence/helper identities.

The durable attempt marker is preserved and the operation lock is released. **Do not rerun the acceptance helper or delete the marker.** No private PDF, signed URL or supplied token was persisted. Managed secrets briefly existed in process memory; forensic zeroization of every managed copy is not claimed.

## Release decision

**Gateway positive acceptance: PASS. Next compatible frontend phase: CONDITIONAL GO**, subject to its separate reviewed deployment scope, preflight and explicit authorization. This positive test resolves the missing authorized-signing/download acceptance blocker; it does not certify every Admin permission or historical file path.

The independent hash comparison remains NOT TESTED by agreement. A permission-specific production denial remains BLOCKED; the earlier 13/13 boundary tests remain historical evidence. Broader restrictive Storage cutover and historical-object classification are separate release decisions. The 15 existing Storage policies remain in place; this test did not remediate or change them.

No gateway redeployment, frontend deployment, policy/schema/Auth change, upload/delete/reservation, business mutation, new account/session or Git push occurred. No further production phase is authorized or started.
