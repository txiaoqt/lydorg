# Budget deletion pause native preflight — blocked before connection

Date: 2026-10-13 UTC. Scope: the authorized read-only production preflight for project `mqqaykksadotbrghbexz`. No native PostgreSQL connection or production SQL was attempted.

## Verified before the stop

- Supabase Control Plane `get_project` returned the exact project, `ACTIVE_HEALTHY`, and direct host `db.mqqaykksadotbrghbexz.supabase.co`.
- The approved SQL remained 11,945 bytes with SHA-256 `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`.
- The input manifest SHA-256 remained `cdd186cc57911774f8f1a67d7a4cdd78c928b761c9dacbec041841bf38ec32eb`; offline `--review` returned bundle SHA-256 `01b42ba7f4ff814cfbd6aa622504ffb5da03c27cbe2f2c102212f46763b5559f`, `connectionAttempted:false`, and `installationActivated:false`.
- The secure environment validator found all three required variables, verified the CA file exists, and matched its bytes to the supplied SHA-256. The supplied CA SHA-256 also matched the previously independently verified production CA fingerprint in the preserved Storage foundation preflight. No credential or certificate contents were printed.
- The fixed operation directory was absent at the start. The reviewed `Protect` and root `Verify` actions then passed with effective Windows ACL checks. The directory contains only a fresh sanitized `control-plane-proof.json` (SHA-256 `0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd`). Read-only inspection confirmed the root DACL is protected, root and proof owners match the current Windows user, and their access rules contain only that user, SYSTEM, and Administrators.

The first local `Protect` call returned `ACL_CHECK_FAILED` under the workspace filesystem sandbox and left no directory. After confirming absence and the exact fixed path, the same reviewed helper passed with the required filesystem escalation. This did not contact PostgreSQL.

## Blocking adapter defect

The reviewed `operation-acl.ps1` runs `Assert-TargetIsFixed` for both `Protect` and `Verify`. That function accepts only the operation directory itself. Its CLI `Verify` action therefore rejected the proof file with `ONLY_FIXED_BUDGET_STATE_PATH_ALLOWED`.

`native-budget-pause-runner.mjs` requires `Verify` on the proof file before opening its read-only database connection and also on later preflight evidence files. The current pinned adapter cannot complete `--preflight`. Its offline ACL self-test calls the internal path checker directly and did not cover this CLI path guard.

The directory and proof were preserved. No approved preflight, authorization file, operation lock, or installation attempt marker exists. `--preflight` and `--install` were not invoked. Native TLS, PostgreSQL identity, catalog, 57 inventories, foundation, migration and Storage checks remain **NOT TESTED** for this attempt.

## Required next review

Prepare a separate adapter correction that keeps `Protect` restricted to the one fixed root and permits `Verify` only for that root and safely bounded child artifacts, with reparse and effective ACL checks intact. Add a focused test that invokes the actual PowerShell CLI on a child file. Recalculate the manifest and bundle fingerprints, review the changed adapter, obtain fresh control-plane evidence, and request authorization for the new exact bundle before another native preflight. The existing proof has a five-minute freshness limit and must not be reused as fresh evidence.

Status: **BLOCKED / NO-GO** for a separate installation authorization. This record reports local preparation and the stop condition; it is not a production database preflight receipt.
