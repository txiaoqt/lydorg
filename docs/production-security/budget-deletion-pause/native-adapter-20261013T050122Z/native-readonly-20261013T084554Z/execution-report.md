# Corrected native read-only preflight — response contract failure

**NO-GO for preparing production installation authorization.** The one native preflight attempt returned READ_ONLY_TERMINAL_TAG_MISMATCH. No installation SQL, authorization, lock or attempt marker was created, and no retry occurred.

## Completed checks

- Approved SQL (11,945 bytes), manifest, corrected bundle and all pinned helper/input identities: PASS.
- Archived proof: PASS. Its 200 bytes/SHA-256, original creation/last-write times, ownership and effective ACL remain intact. OS-managed last-access changes were accepted as authorized. No rename was repeated.
- Fresh Supabase Control Plane get_project: PASS, exact project/host and ACTIVE_HEALTHY.
- Fresh active proof: create-new and ACL/integrity checks PASS. SHA-256 2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf. It was only 6.8200504 seconds old when the attempt finished.
- Secure local environment and CA byte/fingerprint match: PASS, including comparison with the previously independently verified production CA fingerprint. No credentials or certificate contents were exposed.
- Native connection/TLS guard: reached successfully before result parsing failed. This is inferred from the unchanged runner call sequence; no complete TLS receipt containing the negotiated protocol or peer fingerprint was persisted.

## Confirmed local defect

The exact protected-data verifier begins BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY and ends COMMIT. The adapter verifierRow function requires ROLLBACK for every verifier. The inventory SQL is read-only, but its declared terminal contract is incompatible with the adapter. Identity, budget catalog and supplemental foundation input files end ROLLBACK.

The previous offline suite tested synthetic ROLLBACK result arrays but did not compare every actual pinned SQL terminal statement with its parser contract. That coverage gap was missed in the adapter review. The local files explain the returned error; the runner did not persist the actual failing result/stage, so partial database values are not independently reportable.

## Incomplete production evidence

PostgreSQL version/role/privileges, original RPC/catalog, exact current migration/policy/object counts and all 57 inventory comparisons have no completed preflight evidence artifact. The preceding identity/catalog guards exist in the call sequence, but their raw results were not retained. Supplemental foundation verification was not completed. No production drift finding or preservation-baseline approval is claimed.

The reference snapshot is docs/production-security/budget-deletion-pause/20261012T165000Z/protected-data-readonly.json (SHA-256 2575aaa3634b4acb4b4d2782689d84d6a46d1ab7494237aa6449ce4dc86a74cc). Its prior preservation proposal was not adopted as an installation baseline. No fresh inventory result was available to compare, and no baseline was changed.

## Preserved state and exact artifacts

The protected directory contains the original hash-named archive and the new active control-plane-proof.json only. Both ACL verifications pass. No completed preflight file, approved-preflight, authorization, operation lock or installation marker exists. Previous failures remain preserved.

- Bundle: 0b7b75d13cb113c790e6373d304ef4990fd8591c0ebd98e3b7f5ad9a7280a0d9.
- Manifest: 8e59054cdbea2497decfd0a47582960129db21cb0ffd0757e8865f5d0e89f7b8.
- Approved SQL: a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a; 11,945 bytes. Adapter, manifest and SQL implementation were not changed.
- Actual invocation: 2026-10-13T08:48:49.5752337Z to 2026-10-13T08:48:55.6670527Z, exit 2, once.
- native-preflight-output.json and preflight-invocation.json preserve the sanitized actual return. read-only-execution-receipt.json and local-evidence-manifest.json describe the scope and file hashes.

## Required before another attempt

Prepare and review a local correction only. Prefer a budget-specific copy of the inventory verifier with the same read-only query and an explicit ROLLBACK ending, preserving the original foundation verifier. Pin its new input path/hash and new bundle, and add regression coverage binding the actual SQL terminal statements to their expected driver tags. Do not globally accept either transaction tag or weaken read-only/catalog/data gates.

A new read-only authorization must name the corrected identities and permit a fresh proof refresh while preserving both existing proofs. The current active proof hash is 2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf; do not overwrite it or repeat the prior archival rename. A later installation still requires a complete reviewed preflight and an exclusive drained execution window.
