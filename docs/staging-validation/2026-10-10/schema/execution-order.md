# Staging schema baseline — execution record

Target: `ytrace-staging` / `zroudsvpswqsjlyttkjf`, checked `ACTIVE_HEALTHY` before writes. Production project `mqqaykksadotbrghbexz` was queried read-only and never modified.

## Applied phases

1. `reviewed-extensions.sql` — `staging_schema_extensions_20261010`.
2. `reviewed-public-structure.sql` — `staging_public_structure_20261010`.
3. Safe routines, applied in numeric order:
   - `reviewed-public-routines-safe-01.sql`
   - `reviewed-public-routines-safe-02.sql`
   - `reviewed-public-routines-safe-03.sql`
   - `reviewed-public-routines-safe-04.sql`
   - `reviewed-public-routines-safe-05.sql`
   - `reviewed-public-routines-safe-06.sql`
   - `reviewed-public-routines-safe-07.sql`
   - `reviewed-public-routines-safe-08.sql`
   - `reviewed-public-routines-safe-09.sql`
   - `reviewed-public-routines-safe-10.sql`
   - `reviewed-public-routines-safe-11.sql`
   - `reviewed-public-routines-safe-12.sql`
   - `reviewed-public-routines-safe-13.sql`
   - `reviewed-public-routines-safe-14.sql`
   - `reviewed-public-routines-safe-15.sql`
   - `reviewed-public-routines-safe-16.sql`
   - `reviewed-public-routines-safe-17.sql`
   - `reviewed-public-routines-safe-18.sql`
   - `reviewed-public-routines-safe-19.sql`
   - `reviewed-public-routines-safe-20.sql`
   - `reviewed-public-routines-safe-21.sql`
   - `reviewed-public-routines-safe-22.sql`
   - `reviewed-public-routines-safe-23.sql`
   - `reviewed-public-routines-safe-24.sql`
   - `reviewed-public-routines-safe-25.sql`
   - `reviewed-public-routines-safe-26.sql`
   - `reviewed-public-routines-safe-27.sql`
   - `reviewed-public-routines-safe-28.sql`
   - `reviewed-public-routines-safe-29.sql`
   - `reviewed-public-routines-safe-30.sql`
   - `reviewed-public-routines-safe-31.sql`
   - `reviewed-public-routines-safe-32.sql`
   - `reviewed-public-routines-safe-33.sql`
   - `reviewed-public-routines-safe-34.sql`
   Each has a corresponding `staging_public_routines_NN_20261010` history row. Seven contact-bearing seed/test setup routines are fail-closed staging stubs. Two lifecycle guards retain the explicit `is_renewal_test_account` branch but omit address-based exceptions.
4. `reviewed-public-rls.sql` — `staging_public_rls_20261010`; fail-closed RLS state was set before user-facing grants.
5. Public grants and revokes:
   - `reviewed-public-privileges-01.sql`
   - `reviewed-public-privileges-02.sql`
   - `reviewed-public-privileges-03.sql`
   - `reviewed-public-privileges-04.sql`
   - `reviewed-public-privileges-05.sql`
   - `reviewed-public-privileges-06.sql`
   - `reviewed-public-privileges-07.sql`
   - `reviewed-public-privileges-08.sql`
   - `reviewed-public-privileges-09.sql`
   - `reviewed-public-privileges-10.sql`
   Each has a corresponding `staging_public_privileges_NN_20261010` history row.
6. `reviewed-public-policies.sql` — `staging_public_policies_20261010`.
7. `reviewed-public-triggers.sql` — `staging_public_triggers_20261010`.
8. `reviewed-auth-hooks.sql` — `staging_auth_app_hook_20261010`.
9. `reviewed-public-realtime.sql` — `staging_public_realtime_20261010`.
10. `reviewed-synthetic-reference-config.sql` — `staging_synthetic_reference_config_20261010`; seeds only 4 roles/permission maps, 8 budget purpose labels, 13 required document-type metadata rows without template URLs, and one synthetic draft YPOP period.

`reviewed-public-security.sql` is a combined reference snapshot; apply only the bounded phases above.

## Legacy Storage policy phase — staging only

`reviewed-storage-policies.sql` contains 15 intentionally vulnerable legacy policies, including bucket-wide access rules that permit anonymous and cross-organization access. The initial apply attempt was rejected by safety review. After the user explicitly authorized the exact policy install on isolated staging only, it was applied as `staging_legacy_storage_policies_20261010` (history version `20261009185026`). Read-only verification found all 15 expected policy names and commands in `storage.objects`.

This authorization did not include production. Production project `mqqaykksadotbrghbexz` remains read-only and unchanged. Staging still has zero Storage buckets and zero objects, so no files are currently exposed. Keep the staging project unadvertised and synthetic-only; do not create buckets or upload files until the secure Storage policy/gateway cutover is ready, unless a separately controlled drift test requires it. Do not manipulate `storage.buckets` or `storage.objects` directly.

The original monolithic schema apply was rejected as too large; an early routine batch failed syntax validation before execution. Both left no migration rows. The initial policy apply rejection also left no migration row; only the later explicitly authorized apply is recorded.

## Verified state

Staging has 53 public tables, 632 visible columns, 21 enums, 179 constraints, 161 indexes, 240 application functions, 52 RLS-enabled public tables, 67 public policies, 76 public triggers, and 17 Realtime tables. Catalog hashes match production for visible column definitions (ignoring PostgreSQL's historical dropped-column attribute-number gaps), enum labels, constraints, indexes, normalized ACLs, public policies, RLS flags, triggers, and Realtime membership. Routine signatures/security metadata match; only nine documented routine bodies differ.

The four reference tables above contain the 26 reviewed configuration rows; every other public application table is empty. Staging `auth.users`, `storage.buckets`, and `storage.objects` are empty. Staging has 53 actual baseline history entries, including the explicitly authorized legacy Storage policy phase. Production migration history was not copied.
