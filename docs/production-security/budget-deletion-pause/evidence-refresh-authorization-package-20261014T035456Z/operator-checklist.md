# NON-RUNNABLE — NOT APPROVED

## Future operator checklist: evidence refresh and one read-only preflight

Prepared 2026-10-14T03:54:56.672Z. Every checkbox is intentionally unchecked. This document contains no execution commands and performs or authorizes no live or protected-state operation. Blank approval fields are in the [proposal](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T035456Z/authorization-proposal.md>). Use its exact bindings and the [identity sheet](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T035456Z/evidence-identities.md>).

## Authority and immediate local checks

- [ ] Obtain a new explicit evidence-refresh and one-read-only-preflight authorization covering each proposed operation. Do not reuse YTRACE-BDP-READONLY-20261014-01 as protected-write authority. Keep Decision B, installation authorization and installation window blank; no installation window is needed for this verification.
- [ ] Recheck branch/HEAD and preserve the dirty worktree. Verify candidate bundle/manifest/inventory, all five code files, eleven pinned inputs, 138 dependency files, unchanged SQL and dedicated verifier against the exact identity sheet. Stop on drift.
- [ ] Privately recheck the fixed state root, secure ancestors, no links/reparse redirection, owner/effective ACLs and actual artifact presence using only the reviewed Verify behavior. Protect, SelfTest, ACL resets and policy changes remain excluded. The earlier one successful root Verify is historical, not a current child-file verification.
- [ ] Require no authorization.json, approved-preflight.json, budget-deletion-pause.operation.lock.json or budget-deletion-pause.attempt.json. Stop on unexpected state and preserve it; never clear or repurpose it.
- [ ] Read/hash only the active proof as authorized: 197 bytes, SHA-256 fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7; exact sanitized schema and matching stored production identity. Record its actual creation/last-write time and secure ownership/ACL before handling. Reveal no contents, credentials or token values.
- [ ] Require control-plane-proof-history-fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7.json absent in the same directory. Revalidate absence immediately before the rename, and use no-overwrite semantics that reject a destination appearing concurrently. Existing history/preflight evidence must remain intact.

## Exact evidence handling after approval

- [ ] Rename only the verified active proof to the exact hash-named destination in the same directory. No force/overwrite or copy/delete fallback. Verify bytes/hash, owner/ACL, creation time and last-write time afterward. Accept ordinary OS-managed last-access changes without timestamp reset. Stop after any failed or uncertain assertion; do not repeat or reverse the rename.
- [ ] Obtain one fresh scoped get_project response for the exact production project through the configured Supabase MCP. Require ACTIVE_HEALTHY and exact direct hostname; no credential inspection or alternate API/credential route. Discard the earlier stale observation as execution evidence.
- [ ] Create one fresh active control-plane-proof.json exclusively, UTF-8 without BOM, with only the five reviewed fields. Bind its actual observation time and reviewed verification method. Privately verify schema/hash/ACL. Preserve any partial file on failure; no overwrite, repair or refresh loop.
- [ ] Calculate age from the original explicit-offset ISO JSON timestamp with Node. Require nonfuture age no greater than 300 seconds before launch and completion within that window. The candidate's load-time check is not a completion-time check. Stop and retain evidence if freshness expires.

## One native read-only attempt

- [ ] Use only the reviewed private environment loader, without displaying its values. Verify independent CA trust/provenance and supplied fingerprint, exact hostname/SNI, certificate chain, rejectUnauthorized and encrypted socket. Reject pooler, alternate endpoint/SQL route, insecure TLS, preload/connection overrides and NODE_PG_FORCE_NATIVE including an empty value.
- [ ] Invoke exactly one reviewed --preflight attempt over db.mqqaykksadotbrghbexz.supabase.co:5432, database/user postgres. Execute only the pinned read-only verifier contracts; never submit the pause SQL or run supervisor/install/reconcile/business modes. A failed attempt consumes this proposed one-attempt allowance; no automatic retry.
- [ ] Permit only its single dynamic protected preflight JSON output with wx creation, write/sync/size validation and ACL Verify. Do not create authorization, approved-preflight, lock or attempt files or extra receipts.
- [ ] Require actual PostgreSQL 17.6, native identity/privileges/read-only enforcement and the original unpaused RPC/full catalog fingerprints. Require the reviewed foundation/document/containment protections, 164 migrations/full history and 15 policies.
- [ ] Compare every one of the 57 relation row counts and content fingerprints with the reviewed preservation reference; compare full protection/policy fingerprints and require all 378 Storage objects preserved. Capturing the rows is not approval of their match. Stop on every unexplained difference or missing evidence; do not omit, weaken or rebaseline a check.
- [ ] Review actual successful command status and generated evidence identity/ACL together with all independent comparisons. A snapshot's embedded PASS label or process exit zero alone is insufficient. Never use the older normalized whole-state fingerprint as the expected current-candidate fingerprint.

## Stop, retention and reporting

- [ ] On failure, ambiguity, expiry or drift, stop and record which steps completed. Retain every partial/complete new proof/preflight and all historical evidence. No cleanup, repeat rename, second get_project/preflight, automatic repair, rollback or baseline adoption. Any future action needs new bounded authority.
- [ ] Return a sanitized report with actual project/native/TLS results, per-entry preservation comparisons, evidence hashes and exact retained state. Do not disclose proof contents, credentials, certificate contents, private records or connection strings.
- [ ] Stop after read-only reporting. Do not create installation bindings, authorize Decision B, populate an installation window, deploy anything or begin the Storage cutover.
