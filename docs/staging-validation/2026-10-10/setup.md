# Isolated staging setup procedure — approval boundary

10 October 2026, Asia/Manila. No commands below that create resources, restore schemas, deploy functions or apply migrations have been executed.

## 1. Choose and authorize the target

No discovered project is designated staging. `lydooo` is inactive and its name does not authorize reuse. `EHR-Capstone` is unrelated. Do not resume or modify either. Production `mqqaykksadotbrghbexz` has no development branches.

Provide either an explicitly authorized isolated project ID, or approve creation of a new project with its organization, region and billing/cost limit. A local alternative needs Docker Desktop/container support installed and running. Do not install or start a system service as a substitute for that decision.

Keep target configuration in a new scratch directory under `tmp/ytrace-storage-staging/`. Do not relink this checkout: both `supabase/.temp/project-ref` and `.env` currently point at production. Do not copy `.env`, `.temp`, production credentials, Auth users, sessions, documents, Storage objects or database data into staging.

After target approval, validate the assigned ID before every cloud operation:

```powershell
$stageRef = 'APPROVED_STAGING_PROJECT_REF'
if ($stageRef -notmatch '^[a-z]{20}$' -or $stageRef -eq 'mqqaykksadotbrghbexz') {
  throw 'An explicitly approved non-production project ID is required.'
}
# This format check is not authorization. Compare with the human-approved ID.
```

## 2. Prepare the isolated CLI workspace

Install/locate an approved Supabase CLI and PostgreSQL 17 client. Discover supported options with `supabase --help`, `supabase init --help`, `supabase db dump --help`, `supabase functions deploy --help` and `supabase functions serve --help`. CLI/Docker/psql were not available on PATH during discovery.

In the NEW directory, run `supabase init` to generate a complete local configuration. Give it a distinct local project_id. Keep its migrations and seed directories empty initially: do not copy the repository's full migration directory and automatically start/replay it. The independent 33-policy proposal must be excluded.

For local validation only, after Docker is available and the full config is generated, `supabase start` supplies isolated Auth, Storage, PostgreSQL and Edge Runtime. Keep the standard loopback endpoints; verify the target DB and API before any write. Deno is useful for static checking but the CLI serves functions through its own Edge Runtime.

For cloud staging use explicit `--project-ref $stageRef` on supported function commands. Do not use the existing production link. New cloud resources require the approval in step 1.

## 3. Establish an application-equivalent schema baseline

**Blocked prerequisite:** the repository does not provide a proven empty-database bootstrap. Its earliest versioned file alters an existing workflow; base organization/document/Admin tables are not created by the versioned migration set. There are additional standalone repair/setup SQL files with no established replay order.

The read-only comparison found 166 local versioned files and 163 live history rows, 17 same-name/different-version comparisons and one same-version/different-name comparison. See `migration-compatibility.json`. **Updated 10 Oct 2026:** `migration-reconciliation.json` compares the applied SQL bodies. All 16 renamed pairs are naming-only, and the `20260905` closure function was applied out-of-band with an identical body. The empty-database gap is still real: 37 of 53 live tables and 20 of 21 enums have no CREATE statement in the repository. Do not repair production history or replay files merely because their timestamp is absent.

Recommended baseline: a **reviewed schema-only snapshot** of the application-relevant current production schema, with custom Auth triggers and Storage policies separately captured. Use an authorized read-only database connection; no production database password was supplied and no dump was attempted. A default CLI dump excludes Supabase-managed Auth/Storage schemas, so it is insufficient by itself.

Prepare these artifacts before importing:

1. `reviewed-public-schema.sql`: types, extensions, tables, sequences, constraints/indexes, views, functions, grants/RLS, lifecycle/identity triggers and required Realtime publications. Include dependencies outside public where necessary. No table data or account/session values.
2. `reviewed-auth-hooks.sql`: only application-owned hooks on staging's existing Auth schema. Do not overwrite managed Auth tables or restore auth.users/auth.identities/auth.sessions.
3. `reviewed-storage-policies.sql`: captured application-owned policies/grants against staging's managed Storage schema. Preserve the exact 15 pre-cutover policies for the synthetic baseline/drift check. Do not copy managed Storage tables or production objects.
4. Synthetic configuration seeds: roles and permission codes, required document types/categories, open/closed YPOP periods, workflow settings. Recreate from reviewed definitions; do not bulk copy real configuration rows, emails or private contact details.
5. Create empty Storage buckets through the staging Storage API, preserving bucket names/public flags from the inventory. Object bytes are uploaded through Storage, never inserted directly into storage.objects.

Review function bodies for embedded secrets, production URLs and side effects. Disable external mail/webhooks/cron jobs in staging before exercising workflows; use a staging mail sink. Record these intentional environmental differences. No production SMTP/OAuth settings are changed.

One possible schema-only extraction command, **only after credentials/read-only connection are authorized**, is `supabase db dump --db-url <securely supplied read-only connection> --schema public -f reviewed-public-schema.sql`. Never put the password in a committed script or transcript; use protected credential handling. Do not run the data-only or role-only backup commands from generic full-backup tutorials.

Use psql against the explicitly verified staging connection to restore the reviewed files with `--single-transaction --set=ON_ERROR_STOP=1`. Compare table columns, grants, policies, function ownership/search paths, triggers, enums, indexes and references with the read-only inventory. A successful restore alone does not establish equivalence. Record a staging baseline manifest; do not fabricate historical migration entries or mark the performance proposal applied.

## 4. Register the environment's trusted Storage origin

**Updated 10 Oct 2026: portability FIXED locally.** Neither Storage migration embeds a hostname any more. Legacy HTTP asset URLs are honoured only for origins listed in `ytrace_storage_private.trusted_storage_origins`, which only the migration owner / `service_role` can change. See [final-report.md](final-report.md) §3.

Right after the foundation is applied in staging, register **only the staging origin**, in a separate reviewed transaction:

```sql
select ytrace_storage_private.register_trusted_storage_origin('https://APPROVED_STAGING_PROJECT_REF.supabase.co', 'staging');
select * from ytrace_storage_private.asset_reference_audit();   -- counts only
```

Do not register the production origin in staging. Production-shaped URLs in staging data are meant to stay unresolved (the cutover's legacy-reference gate will stop if any published/active row still uses one). Test canonical `storage://`, same-origin public URLs, replacement cleanup, archived assets and wrong-host rejection through the real API.

## 5. Synthetic actors and fixtures

Use staging Auth Admin API to create independent `org-a@example.invalid`, `org-b@example.invalid` and `org-suspended@example.invalid` identities with fresh generated passwords. Obtain JWTs through actual password sign-in. Create realistic independent profiles using staging RPCs/triggers and mark the third suspended through an authorized staging workflow.

Create custom Admin accounts/roles using the real application schema and login RPCs: Super Admin, registration reviewer, budget reviewer, liquidation reviewer, YPOP reviewer and limited/unauthorized Admin. Produce expired/revoked/inactive sessions in staging only. Keep all credentials and tokens in memory or ignored staging secret files; evidence must contain labels/status codes, not tokens.

Use the included `fixtures/synthetic-document.pdf` and `fixtures/synthetic-image.png`. They contain no personal information. Upload objects with the actor JWT to establish real owner_id; do not seed every private object with a service-role upload. Use service-role setup only for deliberate orphan/mismatched-owner negative cases, never as the actor performing the asserted authorization test.

## 6. Foundation, gateway and frontend

Apply only the reviewed environment-compatible foundation `20261009145634_storage_authorization_remediation.sql`, transactionally to staging, then do the origin registration in §4. Confirm its function owner, fixed search paths, service-role-only RPC EXECUTE, private-table RLS/grants, receipts, reservations and trigger compatibility. Verify ordinary workflows before cutover.

Copy only `supabase/functions/admin-storage-access/` into the isolated CLI workspace and add:

```toml
[functions.admin-storage-access]
verify_jwt = false
```

The custom token checks inside the gateway remain mandatory. For approved cloud staging: `supabase functions deploy admin-storage-access --project-ref $stageRef`. For local: `supabase functions serve admin-storage-access`. The platform supplies the target project's server credentials; do not set production secrets. Deploy no unrelated functions that send real email or mutate production.

Prepare a separate frontend directory from the current working source, including uncommitted improvements, public assets, package/lockfile and Vite/TypeScript/Tailwind/PostCSS configuration. Exclude `.env*`, `.git`, `.temp`, existing build outputs and credentials. Use `frontend.env.example` as `.env.staging.local` there, with only target public credentials. Run Vite in staging mode (`npm run dev -- --mode staging`) or build with `--mode staging`. Confirm DevTools shows only the assigned staging API/Storage/functions hosts before login or upload. Keep the original checkout's env/link intact.

Configure staging Auth site/redirect URLs for that isolated origin. Google OAuth remains BLOCKED until staging-specific authorized client/redirect configuration is supplied; do not reuse or alter production OAuth settings. Custom Admin login, password recovery and PWA routes must be tested separately from Supabase JWT login.

## 7. Restrictive cutover gate

Require baseline schema equivalence, reviewed hostname compatibility, working gateway, compatible frontend, synthetic test data and rollback review first. Compare all 15 existing Storage policies exactly against the cutover drift guard. Unexpected defaults/policies require investigation, not removal of the guard.

Using a verified staging psql connection, the explicit gated transaction is:

```text
psql <verified staging connection> --single-transaction --set=ON_ERROR_STOP=1
  --command="SET LOCAL app.storage_remediation_validated = 'on'"
  --file=<reviewed staging-compatible 20261009150110_storage_authorization_cutover.sql>
```

This is one logical command (line breaks above are for readability). The gate attests readiness to run the isolated validation; it does not itself prove security. Do not use db push, db reset, migration repair or include `20261009114340_performance_auth_uid_initplans.sql`.

## 8. Execute and record actual API/workflow validation

For each of five private buckets, use SDK/HTTP clients with real anon/A/B/suspended JWTs for list/select, createSignedUrl, direct authenticated download, new upload, upsert/update and delete. Verify bytes/hash on authorized preview/download; a 200 response with no matching rows is not a successful unauthorized read. For denied mutation verify object existence/hash/metadata did not change. Use unique fixture paths per test and bounded cleanup only in staging.

Assert both A→B and B→A denial; wrong parent/org, guessed/orphan/reused UUID, owner mismatch, missing metadata, modern/legacy ownership and reviewed overwrite cases. Test the gateway with all Admin roles, expiry/revocation/inactivity, arbitrary paths and each supported document category. Direct anon/authenticated calls to the authorization RPC must be denied. Never assert security using a service-role client for these actor requests.

Run full registration and renewal draft/submission/revision/approved-lock workflows; budget attachment/review/approved lock; liquidation budget linkage/revision/completion; YPOP entry/city proof/org activity/semester restrictions. MOVE remains blocked beyond confirmed draft/revision + Super Admin scope: identify and approve actual supported lifecycle semantics without inventing new permissions.

Verify active templates, inactive signing denial, Admin upload/replace/cleanup, unauthorized asset writes, published news HTTP rendering and consented avatars. Add the staging-origin regression checks in step 4.

Measure cold/warm/concurrent signing request counts, Storage downloads, transferred upload bytes, gateway latency and sanitized response sizes. Client cache hits must avoid extra signing; list navigation must not sign PDFs. Test unchanged Admin versions, targeted changes and Organization Realtime without global polling.

Run PWA/browser account switching, cold lazy chunks, logout, token refresh, draft retention, slow-network TUS interruption/Retry Failed/partial success and no retransmission of successful uploads. Physical installed-device results remain separate from browser emulation.

Test reopening after the 60-second client cache window and new-signing denial after revocation. Observe already-issued 3,600-second URLs and two-hour upload token expiry using real elapsed time and staging tokens; do not change token payloads/client clocks and call it server expiry evidence. No lifetime change is justified until these tests run.

## 9. Later production rollout and recovery — not executed

After all real authorization/workflow gates pass and production approval is obtained: (1) approved foundation; (2) compatible gateway; (3) compatible frontend; (4) pre-cutover permission/legacy-path/policy checks; (5) restrictive cutover; (6) post-cutover synthetic authorization checks.

Pause on policy drift, owner mismatches, unexpected grants, incorrect signing, denied legitimate access, byte changes on denied operations, account leakage, retry loops, elevated error/latency rates or broken review locks. Before cutover, stop/roll back the candidate frontend while retaining inert foundation metadata. After cutover keep the secure client/gateway, disable the affected operation and apply a reviewed forward correction. Do not restore vulnerable bucket-only policies. Failed migration transactions roll back atomically.

Logout, cache clearing, policy rollback and session revocation do not revoke already-issued bearer URLs. Stop new issuance and follow the approved incident procedure; quarantine/provider-assisted revocation may have availability consequences and needs separate approval.

References: [local development](https://supabase.com/docs/guides/local-development), [schema dump exclusions](https://supabase.com/docs/reference/cli/supabase-db-dump), [custom Auth/Storage restore considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Edge Runtime development](https://supabase.com/docs/guides/functions/development-environment).
