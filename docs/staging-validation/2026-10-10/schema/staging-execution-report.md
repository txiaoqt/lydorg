# Y-TRACE isolated staging schema reconstruction

**Date:** 10 October 2026
**Result:** **PARTIAL — public schema reconstructed; Storage workflow validation remains blocked**
**Repository:** branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`

## Project isolation

| Project | Ref | Use | Actions |
| --- | --- | --- | --- |
| `lydo-org-focused` | `mqqaykksadotbrghbexz` | Production source | Read-only catalog and approved non-sensitive reference-configuration reads |
| `ytrace-staging` | `zroudsvpswqsjlyttkjf` | Isolated destination | 53 staging-only migrations and read-only validation |

The staging ref, project name, region, PostgreSQL version, and healthy status were checked before writes. Production was never an apply target. No production migration history was copied.

## Schema inventory and parity

Read-only production inventory found:

- 53 public application tables and 632 visible columns
- 21 public enums, 179 constraints, and 161 indexes
- 240 application routines
- 67 public RLS policies; 52 of 53 public tables have RLS enabled
- 76 application-owned public triggers
- 17 public tables in `supabase_realtime`
- No public views or materialized views

Staging catalog counts match those values. Normalized catalog hashes showed no differences for visible column definitions, enum labels, constraints, indexes, table/type/function ACLs, RLS flags, public policy definitions, triggers, or Realtime membership. Routine signatures and security metadata match all 240 routines; nine routine-body differences are the intentional staging sanitizations below.

PostgreSQL production has historical gaps in internal column attribute numbers where columns were previously dropped. The staging tables reproduce all visible column names, types, defaults, generated expressions, nullability, and collations, but visible columns receive compact attribute numbers. This is an expected physical metadata difference with no effect on application-visible schema.

No application views were found in production, so none were invented.

## Applied staging baseline

53 actual staging-only migration records were created:

- Compatible extensions and public structure
- 34 bounded routine batches
- Public RLS state and ten privilege batches
- Public policies, triggers, application-owned Auth hook, and Realtime membership
- Reviewed non-sensitive reference configuration
- The user-approved legacy Storage policy phase, limited to isolated staging

The combined public security SQL is retained as a reference artifact; bounded phase files are the executed source. The baseline represents the current catalog snapshot, not a replay of the 163 historical production migration records.

## Contact-data sanitization

A scan of production routine definitions identified seven renewal/YORP test seed/setup functions with embedded contact details. Staging has same-signature, same-security-metadata fail-closed stubs for those functions. The original bodies and contacts are not present in the staging SQL artifacts.

Two lifecycle trigger functions used hardcoded email matches as test-account exceptions. Staging removes those email branches while preserving the explicit `is_renewal_test_account` flag handling and the remaining lifecycle enforcement.

The schema-artifact scan found no email or phone literals. It does not scan pre-existing user work outside this task’s schema artifact directory.

## Staging data

Only non-sensitive configuration needed for later validation was inserted:

- 4 role/permission definitions
- 8 budget purpose labels
- 13 required document metadata rows, with no production template URLs or file metadata
- 1 synthetic draft YPOP period

All other public application tables are empty. Staging Auth has 0 users. Storage has 0 buckets and 0 objects; the 15 legacy object policies are installed for the isolated drift-gate baseline. No organization, admin, financial, document, or audit rows were copied.

## Storage policy baseline applied; file workflow validation remains blocked

The first attempt to install the 15 legacy bucket-wide Storage policies was rejected by safety review. The user later explicitly authorized installing those exact policies on the isolated staging project for drift-gate testing. The staging-only migration `staging_legacy_storage_policies_20261010` (version `20261009185026`) succeeded. A read-only catalog query verified the 15 expected policy names and commands. All are permissive policies; their broad authorization behavior remains intentionally vulnerable.

Production `mqqaykksadotbrghbexz` was not modified. Staging has 0 buckets and 0 objects, so no documents are present or exposed now. The user must manually sign into the staging dashboard before supported bucket setup; authentication was not automated. Because the legacy policies could expose any data in subsequently created matching buckets, do not create buckets or upload files until the secure Storage policy/gateway cutover is applied, except within a separately controlled drift test using synthetic data only.

Storage bucket parity and actual Storage authorization workflows remain **BLOCKED**. The previously prepared secure Storage foundation/cutover migrations and separate performance RLS migration remain unapplied.

## Validation

| Check | Status | Evidence |
| --- | --- | --- |
| Target project separation | PASS | Explicit refs checked; all writes targeted `zroudsvpswqsjlyttkjf` |
| Public schema counts | PASS | Production/staging counts match across 53 tables, 632 columns, 21 enums, 179 constraints, 161 indexes, 240 routines |
| Public catalog hashes | PASS | 1,188 comparable metadata items matched; no extras or mismatches |
| Security metadata | PASS | 213 policy/RLS/trigger/Realtime fingerprints matched; routine ACLs compared semantically after normalizing ACL order |
| Staging data isolation | PASS | Only the 26 documented reference rows exist; no Auth users, buckets, objects, or other business rows. Fifteen legacy Storage policies are installed but have no bucket/object data to apply to yet. |
| PII in new schema artifacts | PASS | Email/phone literal scan clean |
| Authenticated Org/Admin workflows | NOT TESTED | No staging Auth users or custom Admin accounts |
| Storage policy migration record | PASS | Staging-only migration `staging_legacy_storage_policies_20261010`; 15 expected policy names and commands visible in `pg_policies` |
| Storage bucket/policy workflows | BLOCKED | Dashboard sign-in required; zero buckets/objects; legacy policies must be replaced before normal file setup |
| Cross-organization Storage isolation | BLOCKED | No buckets, synthetic files, or staging identities; policy authorization remains intentionally unsafe |
| `npx tsc --noEmit` | PASS | Exit code 0 |
| `npm run build` | PASS | Vite transformed 4,102 modules; build completed. Existing warnings: stale Browserslist data and large chunks |
| `git diff --check` | PASS | Exit code 0; Git emitted existing fsmonitor/line-ending notices |
| Vitest/database integration suites | NOT TESTED | No schema-specific fixture suite was executed |

The frontend checks cover the preserved working tree as it stood during this task; they do not validate authenticated staging workflows or Storage authorization.

## Staging Security Advisor snapshot

The read-only Security Advisor query after the policy migration returned 6 `RLS enabled, no policy` findings, 11 mutable `search_path` warnings, 1 extension-in-public warning (`citext`), 199 anon-executable and 203 authenticated-executable `SECURITY DEFINER` function warnings. No Storage-specific lint was returned. These are current staging findings, not proven regressions from the last migration: no before/after Advisor snapshot was captured. Some Admin RPCs intentionally accept custom session tokens, but the linter does not verify their internal authorization checks. Review these findings separately before exposing staging or treating its schema as production-ready. This task did not modify functions, grants, or public RLS to suppress the warnings.

## Preserved work and files

The initial branch, commit, source changes, and untracked prior-work artifacts were preserved. This task changed only new schema-validation artifacts under `docs/staging-validation/2026-10-10/schema/`; it made no application source, migration-series, deployment, or GitHub changes.

Key artifacts:

- `schema-manifest.json` — production inventory plus actual staging state and intentional differences
- `reviewed-public-structure.sql` — schema-only structure phase
- `reviewed-public-routines-safe-01.sql` through `-34.sql` — sanitized staging routine phases
- `reviewed-public-privileges-01.sql` through `-10.sql`, `reviewed-public-rls.sql`, `reviewed-public-policies.sql`, `reviewed-public-triggers.sql`, and `reviewed-public-realtime.sql` — applied public security phases
- `reviewed-synthetic-reference-config.sql` — applied safe configuration seed
- `reviewed-storage-policies.sql` — legacy Storage policy source, applied to staging only after explicit user authorization; intentionally vulnerable and not suitable for production
- `execution-order.md` — recorded staging-only migration order and blockers

## Recommendation

The public application schema is ready for isolated staging workflow setup, with the nine documented routine substitutions. The 15-policy legacy baseline is now installed on staging only, but full validation is not complete: Storage buckets, secure cutover, and authenticated identities are missing. Keep the staging project unadvertised and synthetic-only.

The next task is to deploy and validate the secure Storage gateway/cutover in staging, then create only synthetic test buckets/files and run authorization tests with Organization A/B, anonymous, authorized Admin, and unauthorized Admin identities. The dashboard still requires manual user sign-in for supported bucket setup. Do not apply the separate performance RLS migration or any Storage migration to production.
