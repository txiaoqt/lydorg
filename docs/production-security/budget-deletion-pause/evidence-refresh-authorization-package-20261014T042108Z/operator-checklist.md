# NON-RUNNABLE — NOT APPROVED

## Future operator checklist: evidence refresh and one read-only preflight

Prepared 2026-10-14T04:21:08.267Z. Every checkbox is intentionally unchecked. This document contains no execution commands and performs or authorizes no live or protected-state operation. Blank approval fields are in the [proposal](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T042108Z/authorization-proposal.md>). Use its exact bindings and the [identity sheet](<C:/Users/Christopher x Angel/Documents/lydo-connect-org-focused/docs/production-security/budget-deletion-pause/evidence-refresh-authorization-package-20261014T042108Z/evidence-identities.md>).

## 1. Future initial prerequisite rechecks

These unchecked steps require separate future authorization. No candidate, approval, protected-state or live check is performed by preparing this document.

- [ ] Obtain a new explicit evidence-refresh and one-read-only-preflight authorization covering each proposed operation. Do not reuse YTRACE-BDP-READONLY-20261014-01 as protected-write authority. Keep Decision B, installation authorization and installation window blank; no installation window is needed for this verification.
- [ ] Require separately approved evidence-refresh validity start/end in UTC, a new authorization reference, approval identity and approval time. Parse original explicit-UTC ISO values; require start before end and actual actions/attempt/completion within the interval. These bounds are separate from the blank Decision B installation window. Stop on missing, ambiguous, not-yet-active or expired approval; no automatic extension.
- [ ] Recheck branch/HEAD and preserve the dirty worktree. Verify candidate bundle/manifest/inventory, all five code files, eleven pinned inputs, 138 dependency files, unchanged SQL and dedicated verifier against the exact identity sheet. Stop on drift.
- [ ] Privately recheck the fixed state root, secure ancestors, no links/reparse redirection, owner/effective ACLs and actual artifact presence using only the reviewed Verify behavior. Protect, SelfTest, ACL resets and policy changes remain excluded. The earlier one successful root Verify is historical, not a current child-file verification.
- [ ] Require no authorization.json, approved-preflight.json, budget-deletion-pause.operation.lock.json or budget-deletion-pause.attempt.json. Stop on unexpected state and preserve it; never clear or repurpose it.
- [ ] Read/hash only the active proof as authorized: 197 bytes, SHA-256 fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7; exact sanitized schema and matching stored production identity. Record its actual creation/last-write time and secure ownership/ACL before handling. Reveal no contents, credentials or token values.

## 2. Fresh scoped identity before any protected-file change

- [ ] Obtain exactly one fresh scoped get_project response for mqqaykksadotbrghbexz through the configured Supabase MCP. Validate ACTIVE_HEALTHY and exact direct host db.mqqaykksadotbrghbexz.supabase.co. Require a nonfuture observation age no greater than 300 seconds and current evidence-refresh approval validity.
- [ ] If access is unavailable or identity/status/host/freshness is unhealthy, stale, ambiguous or mismatched, stop before archiving or changing any protected file. No credential inspection or alternate API/credential/project/endpoint route. Keep only sanitized observation metadata in memory for the next steps. Do not reuse 2026-10-14T03:30:04.632Z or the expired proof, and do not fetch another observation automatically.

## 3. Immediate proof and destination recheck

- [ ] Immediately before archival, privately re-read and hash the active proof: exactly 197 bytes, SHA-256 fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7; exact sanitized schema and matching identity. Reconfirm its recorded creation/last-write time, owner/effective ACL and protected-path security. The initial check is insufficient by itself.
- [ ] Require control-plane-proof-history-fafda4fbc5d54e357208d322478f7db265697cbdec05c6d3a9493cfc7771d7c7.json absent in the same directory immediately before the rename. Require the same observation still fresh and approval still valid. If the proof or destination check fails, stop without changing the active proof. The rename must also reject a destination appearing concurrently.

## 4. One exact same-directory archival rename

- [ ] Rename only the verified active proof to the exact hash-named destination in the same directory. No force/overwrite or copy/delete fallback. Verify bytes/hash, owner/ACL, creation time and last-write time afterward. Accept ordinary OS-managed last-access changes without timestamp reset. Stop after any failed or uncertain assertion; do not repeat or reverse the rename.

## 5. Create one proof from the same still-fresh observation

- [ ] Create one fresh active control-plane-proof.json exclusively, UTF-8 without BOM, with only the five reviewed fields and restricted ACL, using the exact same observation obtained in step 2. Preserve its original verifiedAt observation timestamp and reviewed verification method; never use creation time to refresh age. Require current evidence-refresh validity bounds and nonfuture age no greater than 300 seconds before creation. Privately verify schema/hash/ACL.
- [ ] If creation is blocked, a partial/complete file remains or proof age exceeds five minutes before preflight, stop and retain the archive and every new evidence file. Do not restore the stale proof, fetch another observation, overwrite, repair, clean up, refresh or retry automatically.
- [ ] Calculate age from the original explicit-offset ISO JSON timestamp with Node. Require nonfuture age no greater than 300 seconds before launch and completion within that window. The candidate's load-time check is not a completion-time check. Stop and retain evidence if freshness expires.

## 6. One native read-only attempt and retained evidence

- [ ] Use only the reviewed private environment loader, without displaying its values. Require the configured CA fingerprint and actual CA file SHA-256 to equal 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7. Verify the provenance chain in the identity sheet, independent current certificate validity and safe file identity, then exact hostname/SNI, certificate chain, rejectUnauthorized and encrypted socket. Reject pooler, alternate endpoint/SQL route, insecure TLS, preload/connection overrides and NODE_PG_FORCE_NATIVE including an empty value.
- [ ] Invoke exactly one reviewed --preflight attempt over db.mqqaykksadotbrghbexz.supabase.co:5432, database/user postgres. Execute only the pinned read-only verifier contracts; never submit the pause SQL or run supervisor/install/reconcile/business modes. A failed attempt consumes this proposed one-attempt allowance; no automatic retry.
- [ ] Permit only its single dynamic protected preflight JSON output with wx creation, write/sync/size validation and ACL Verify. Do not create authorization, approved-preflight, lock or attempt files or extra receipts.
- [ ] Require actual PostgreSQL 17.6, native identity/privileges/read-only enforcement and the original unpaused RPC/full catalog fingerprints. Require the reviewed foundation/document/containment protections, 164 migrations/full history and 15 policies.
- [ ] Compare every one of the 57 relation row counts and content fingerprints with the reviewed preservation reference; compare full protection/policy fingerprints and require all 378 Storage objects preserved. Capturing the rows is not approval of their match. Stop on every unexplained difference or missing evidence; do not omit, weaken or rebaseline a check.
- [ ] Review actual successful command status and generated evidence identity/ACL together with all independent comparisons. Require captured CA SHA-256 to equal 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7 and completion within the separately approved evidence-refresh validity interval. A snapshot's embedded PASS label or process exit zero alone is insufficient. Never use the older normalized whole-state fingerprint as the expected current-candidate fingerprint.

## Stop, retention and reporting

- [ ] On failure, ambiguity, expiry or drift, stop and record which steps completed. Retain every partial/complete new proof/preflight and all historical evidence. No cleanup, repeat rename, second get_project/preflight, automatic repair, rollback or baseline adoption. Any future action needs new bounded authority.
- [ ] Return a sanitized report with actual project/native/TLS results, per-entry preservation comparisons, evidence hashes and exact retained state. Do not disclose proof contents, credentials, certificate contents, private records or connection strings.
- [ ] Stop after read-only reporting. Do not create installation bindings, authorize Decision B, populate an installation window, deploy anything or begin the Storage cutover.
