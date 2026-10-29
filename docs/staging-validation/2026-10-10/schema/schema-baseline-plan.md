# Staging schema baseline — 10 October 2026

## Scope and target

This is a schema-only reconstruction from read-only catalog inspection of production project `mqqaykksadotbrghbexz` to explicitly authorized staging project `zroudsvpswqsjlyttkjf`. Production was not written. PostgreSQL differs by minor release: 17.6 production, 17.11 staging. Platform-owned Auth and Storage schemas were left intact; 64 inspected Auth/Storage columns matched.

## Applied artifacts

- `reviewed-extensions.sql`: installed only missing production-used extensions (`citext` 1.6 and `pg_trgm` 1.6).
- `reviewed-public-structure.sql`: reconstructed 53 public tables / 632 visible columns, 21 enums, 179 constraints, 161 indexes, and declared identity defaults.
- `reviewed-public-routines-safe-01.sql` through `-34.sql`: 240 application routine signatures and security metadata. Seven contact-bearing renewal/YORP test seed/setup routines are fail-closed staging stubs. Two lifecycle guards preserve the explicit `is_renewal_test_account` branch while removing hardcoded contact-email exceptions. This is an intentional staging-only deviation; no embedded test emails or phone numbers were copied.
- `reviewed-public-rls.sql`, `reviewed-public-privileges-01.sql` through `-10.sql`, `reviewed-public-policies.sql`, `reviewed-public-triggers.sql`, and `reviewed-public-realtime.sql`: actual applied public security and publication phases.
- `reviewed-auth-hooks.sql`: the single application-owned `auth.users` trigger; no managed Auth table or trigger was replaced.
- `reviewed-synthetic-reference-config.sql`: 4 role/permission definitions, 8 budget purpose labels, 13 required document metadata rows with no file URLs, and one synthetic draft YPOP period. No admin accounts, Auth users, organizations, documents, or other business records were copied.
- `schema-manifest.json`: schema-only inventory and parity inputs; no production rows, passwords, user emails, file references, object bytes, sequence counters, tokens, audit entries, or financial submissions.
- `reviewed-public-security.sql`: combined reference snapshot only; do not apply it as one request.
- `reviewed-storage-policies.sql`: its 15 intentionally vulnerable legacy Storage policies were applied to isolated staging only after explicit user authorization (`staging_legacy_storage_policies_20261010`). Production was not touched. Staging still has no buckets or objects; do not create buckets or upload files before secure Storage cutover. Dashboard bucket setup requires the user to sign in manually.

Production routines `admin_update_org_yorp_fields(text,uuid,smallint,smallint)` and `is_urn_registered(text)` have no explicit function `search_path`; their metadata and definitions are preserved for parity. Do not expose this reconstructed database to users before separate security review.

## Actual execution and verification

There are 53 actual staging-only baseline migration records (extensions, structure, 34 bounded routine batches, RLS, ten privilege batches, public policies, public triggers, the application Auth hook, Realtime, reviewed reference configuration, and the explicitly approved legacy Storage policy phase). No production migration IDs or history rows were copied. Both projects were checked by explicit ref; production received read-only catalog queries only.

Production/staging catalog comparison matched visible column definitions (ignoring historical PostgreSQL dropped-column attribute-number gaps), enum labels, constraints, indexes, normalized table/type/function ACLs, RLS state, public policy definitions, trigger definitions, and Realtime table membership. All 240 routine signatures and security metadata match; nine bodies differ only as the staging overrides documented above. All 53 application tables are free of business records outside the listed synthetic reference configuration.

Keep these artifacts outside the default `supabase/migrations` series. The repository remains linked to production in `supabase/config.toml`; do not use an implicit target or blanket `supabase db push`.

## Excluded from this task

Do not apply `20261009114340_performance_auth_uid_initplans.sql`, `20261009145634_storage_authorization_remediation.sql`, or `20261009150110_storage_authorization_cutover.sql`. The legacy Storage policy baseline has already been installed on staging under explicit authorization; it is intentionally vulnerable and must be replaced before creating buckets or uploading files. Full Storage staging validation remains blocked until the secure Storage implementation is installed and tested. The dashboard still requires the user to sign in manually for supported bucket setup.

## Storage and external integration handling

Production Storage bucket inventory is captured as metadata only. No production bucket or object metadata/bytes, Auth configuration/users, Vault secrets, jobs, credentials, JWTs, financial data, or application rows were copied. No production outbound HTTP/net, cron, dblink, SMTP, server-file, credential, or project-origin behavior was found in the scanned routine set. Seed/test routines that embed static contact details are disabled in staging. Static public URL literals used for validation are not outbound calls.

## Expected staging state

- Public application schema, policies, triggers, Auth hook, and Realtime membership are installed.
- Only the reviewed reference configuration is seeded; all organization/admin/business tables have no records.
- Managed Auth/Storage objects remain platform-owned; there are no staging Auth users or Storage buckets/objects. Fifteen legacy policies exist on `storage.objects`.
- The secure Storage remediation and performance RLS migration were not applied. Keep staging unadvertised and synthetic-only; the legacy policies are unsafe if a bucket is added.
- Keep staging unadvertised and synthetic-only until Storage and authorization validation is completed.
