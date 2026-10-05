# Y-TRACE manual backup engine (format 1)

This phase provides a server/CI backup engine and `.github/workflows/ytrace-backup.yml`.
There is no frontend, database migration, production restore, schedule, retention/deletion policy,
new permission, or trigger Edge Function. Existing application queries are unaffected.

## Architecture and manual execution

After the workflow has been published through a separately authorized Git change, open GitHub
**Actions → Y-TRACE manual backup → Run workflow**, select the reviewed revision and dispatch it.
`workflow_dispatch` is its only trigger. The workflow must exist on the default branch for GitHub
to expose dispatch. This implementation does not publish it or execute a production backup locally.

The job uses Ubuntu 24.04, Node 22, the lockfile-installed Supabase CLI, Docker, GNU tar/gzip,
sha256sum, and the runner's AWS CLI. Its timeout is 120 minutes. The concurrency group
`ytrace-production-backup` prevents overlapping runs within this GitHub repository, without
cancelling an active backup. This does not coordinate runs in a different GitHub repository;
designate one repository as the production backup runner. GitHub may replace a pending run when
another is queued; concurrency is not an unlimited job queue.

Workflow permissions are `contents: read`; checkout does not persist a GitHub token.
Dependencies and mocked tests run before any backup credentials are exposed to a step.

Required Actions secrets, by name only:

- `SUPABASE_DB_URL`: password-authenticated direct connection or **session pooler**, with TLS.
  Use the session pooler for IPv4-only hosted runners; transaction pooler port 6543 is rejected.
- `SUPABASE_URL`: project HTTPS origin.
- `SUPABASE_SECRET_KEY`: server-only secret/service-role key authorized to list/download all buckets.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: credentials scoped to the private backup bucket.
- `R2_ENDPOINT`: R2 S3-compatible HTTPS origin.
- `R2_BUCKET_NAME`: private destination bucket. Grant list, put and get/HEAD access; deletion is unused.

Database and Storage secrets must describe the same project. Standard Supabase project hostnames/pooler
usernames are checked for a mismatch; custom domains cannot be inferred automatically and require operator review.

Flow:

1. Validate secret presence/form without printing values; allocate a private runner temporary directory.
2. Inspect database version, migration history and Auth SELECT permissions using read-only SQL.
3. Create application/role dumps with the installed Supabase CLI; dump history separately.
4. Record managed policy/trigger catalog metadata and use matching-major PostgreSQL `pg_dump` in Docker for conditional Auth artifacts.
5. Copy repository migrations; discover current Storage buckets and recursively paginate all directories.
6. Stream authenticated binary downloads to their original bucket/path; hash bytes and validate sizes.
7. Repeat the Storage inventory and fail if bucket settings, object paths/IDs/sizes/timestamps/ETags changed.
8. Re-read payloads for SHA-256, detect configured credentials, require all DB/object files and write manifest/readme/checksums.
9. Check `SHA256SUMS`, tar with stable ordering/ownership/timestamps, gzip without timestamp headers and verify archive listing.
10. Reject an existing R2 prefix, upload archive and checksum sidecar, verify remote HEAD sizes/checksum metadata,
    download the uploaded archive and compare its actual SHA-256. Success requires all checks to pass.
11. Remove the temporary payload/archive/read-back on success or failure; the workflow also uses `always()` cleanup.

An abruptly terminated runner may prevent cleanup steps from executing; GitHub-hosted runners are ephemeral.
No raw backups are uploaded as GitHub Actions artifacts. No existing R2 objects are deleted.
A failed upload/verification can leave an incomplete prefix in R2; a failed job is never treated as a successful backup.

## Database coverage

Inspection of current migrations and `DESTINATION_RESTORE_REPORT.md` establishes `public` as the
application schema, managed Auth references and Storage RLS dependencies. The prior report's historical
bucket/row counts are **not** used as expected production counts. Unknown non-platform schemas fail
preflight instead of silently being omitted. Review the allowlist when adding another application schema.

Artifacts:

| Path under `database/` | Coverage |
| --- | --- |
| `roles.sql` | Supported Supabase role dump; login passwords are excluded and must be assigned anew |
| `schema.sql` | `public` tables, types, functions, triggers, indexes, constraints, grants and RLS |
| `data.sql` | `public` logical row data using COPY, including application relationships/file references |
| `migration-history-schema.sql` | `supabase_migrations` schema |
| `migration-history-data.sql` | Live Supabase migration history using COPY |
| `managed-customizations-reference.json` | Auth/Storage policies and managed-table triggers calling public functions from read-only catalogs; **not a restore script** |
| `auth-users-identities-schema-reference.sql` | Conditional users/identities table definitions, reference only |
| `auth-users-identities-data.sql` | Conditional `auth.users` and `auth.identities` data with explicit column INSERTs |

The CLI commands explicitly select `public` for application dumps, and `supabase_migrations` for history.
The normal Supabase schema dump excludes managed schemas; it is not a complete Auth backup.
`recovery/migrations/` preserves the SQL sources at `gitCommitSha`, including managed customizations.
Managed catalog inspection does not require SELECT/LOCK access to all Auth/Storage tables, allowing Auth
coverage to be omitted without blocking the required application backup. Arbitrary custom objects within
managed schemas still require review of preserved migration sources. Dump operations and database inspection
are read-only; no migration, SQL mutation or restore is run.

## Auth coverage and recovery limits

Standard PostgreSQL `pg_dump --data-only --column-inserts --table=auth.users --table=auth.identities`
is used as a separate artifact **only when both tables exist and the supplied DB role has SELECT/USAGE**.
The PostgreSQL major is discovered at runtime (supported range 15–18); the matching-major client runs
with read-only session options and TLS. If Auth read permission is unavailable, application/Storage
backup proceeds with `authCoverage: not-included` and explicit warnings in the manifest, readme and log.
If permissions are available but an Auth dump fails, the entire backup fails. Permissions are never changed.
Production permission compatibility has not been established by local mock tests; the first manual run
is the operational check.

Users/identities are not complete Auth service coverage. They contain sensitive account information,
password hashes and account recovery fields. Treat the entire archive as highly confidential.
Sessions/refresh-token tables, MFA/SSO tables, OAuth/SMTP settings, Auth service configuration,
JWT/encryption root keys and external providers are not included. This package does not guarantee
successful login after recovery. A matching destination Auth schema and a reviewed migration strategy
are required; managed DDL must never be blindly replayed. Encrypted database fields may depend on
project encryption keys that cannot be recovered from this package.

Database role passwords and supplied infrastructure credentials are not included. A streaming scan
rejects literal configured key/password values in payload files before uploading. That scan cannot
certify absence of every unknown secret stored by application users. Hashes needed for account recovery
are application data, not the workflow's connection credentials.

Public data can include admin password hashes and old hashed session records. Recovery must explicitly
invalidate old sessions and set fresh infrastructure credentials. No such recovery action is implemented here.
Project settings, deployed Edge Functions/secrets, Vault root keys, Realtime publication enablement and
external services require separate reviewed reconstruction.

## Storage coverage and integrity

All dynamically discovered standard file buckets are included, public and private, including empty buckets.
Bucket pagination and each nested directory's pagination use stable name sorting and explicit offsets.
Folder markers are traversed; each object is downloaded from the authenticated Storage endpoint using
server credentials, never a public or signed URL. Original bucket and object paths are retained under
`storage/<bucket>/<original path>`; bucket visibility, limits and allowed MIME types are preserved as metadata.
Unexpected vector/analytics bucket types fail rather than being silently skipped. They require separate future support.

The manifest records object ID/path, bucket, original size when available, actual byte size, MIME type,
timestamp/ETag when available and downloaded SHA-256. Downloads are sequential streams; full binary objects
are not buffered in RAM. Inventory metadata is kept in memory, so very large object counts may need a future
disk-backed inventory. Unsafe/ambiguous paths, traversal, control characters, backslashes, drive-like paths,
duplicate entries, stalled pagination, missing/truncated downloads and checksum mismatches fail the backup.

This is not an atomic database/Storage snapshot or point-in-time recovery. Separate DB dumps each take their
own snapshot; the second Storage inventory detects common concurrent changes but not all same-size changes
without metadata updates, nor transient delete/recreate races. For a disaster-recovery-consistent package,
run during a controlled quiet/write-quiesced window. Zero objects is valid only after successful API enumeration.
Storage owner/access associations are recorded through application/Auth rows and object metadata IDs; recreating
owner assignments, bucket settings and policies requires a reviewed recovery plan. Storage SQL metadata does
not substitute for physical bytes; the package includes physical bytes but is not an automated Storage restore.

## Archive and R2 layout

Backup identity: UTC timestamp plus GitHub run ID and attempt, e.g. `YYYY-MM-DDTHHMMSSZ-<run-id>-<attempt>`.
Each archive has a new prefix:

```text
manual/YYYY/MM/DD/<backup-id>/
  ytrace-backup-<backup-id>.tar.gz
  ytrace-backup-<backup-id>.tar.gz.sha256
```

Archive contents:

```text
manifest.json
SHA256SUMS
RECOVERY_README.txt
database-coverage.json
storage-inventory.json
database/*.sql
database/managed-customizations-reference.json
recovery/migrations/*.sql
storage/<bucket>/<original object paths>
```

`backupFormatVersion` is 1. The manifest includes UTC timing, trigger, Git revision, DB coverage/checksums,
bucket/object metadata, counts/bytes and warnings. `SHA256SUMS` covers every payload file plus the manifest;
it cannot hash itself. The manifest does not contain its own checksum (avoids a circular digest).
The archive sidecar hashes the compressed archive. R2 HEAD verifies stored length and SHA-256 metadata;
the additional full download checks actual remote bytes. Multipart ETags are not SHA-256.
Archive byte ordering/ownership/timestamps are deterministic; backup contents and database dump headers
naturally differ across runs. R2 bucket visibility is never changed.

## Local validation and future work

Run offline tests with `node --test scripts/backup/backup.test.mjs`. Tests use fake keys, mock APIs/tool calls
and temporary synthetic files. Scripts are plain Node ESM; they do not enter the browser or TypeScript build.
Syntax can be checked with `node --check scripts/backup/<script>.mjs`; parse the YAML with a YAML 1.2 parser
and use actionlint when available. Do not invoke `run-backup.mjs` against production just to test logic.

The first successful manual run and a separately authorized isolated recovery rehearsal must precede later
UI/restore automation. Future phases may add approved scheduling, monitoring, encryption/key custody,
retention/deletion controls, larger inventories and consistent snapshots. Restore remains deliberately unimplemented.

Tooling references: [Supabase backup/history guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[Supabase CLI dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump),
[authenticated Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads),
[Cloudflare R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/).

## Phase 2 — Admin control surface (local implementation)

The dedicated `/admin/backup-recovery` page is under **Administration → Backup & Recovery**,
separate from System Settings. `backup_recovery_view` allows history/status access;
`backup_recovery_manage` allows requesting a backup. Grant both for an operator who needs to
open the page and request backups. The existing super-admin bypass applies. The forward migration
appends these codes only to `super_admin`, preserving existing permissions without duplicates.

The browser sends its existing custom admin session token to `admin-backup-control`.
The Edge Function validates it with `validate_admin_session_token`, loads the active account/role
from the database, and enforces permissions server-side. Its platform JWT check is disabled because
custom session validation is authoritative. GitHub credentials and target configuration never reach
the browser. There are no direct browser GitHub API calls.

Architecture: Admin page → authorized Edge Function → GitHub Actions REST API → existing manual
Phase 1 workflow → private R2. GitHub workflow history supplies the latest 25 manual runs on the
configured branch; no backup registry table is added. The function validates workflow/repository/run
ownership and returns only display metadata. Success is labeled **Verified Backup** because Phase 1
requires checksums, R2 HEAD and a full remote SHA-256 verification before succeeding. Queued/running
requests are never labeled verified. Historical GitHub success is not a continuing R2 integrity scan.

### Server configuration and activation

Required Edge Function secrets/configuration, by name only:

- `GITHUB_BACKUP_TOKEN`
- `GITHUB_BACKUP_REPOSITORY`
- `GITHUB_BACKUP_WORKFLOW`
- `GITHUB_BACKUP_REF`
- `GITHUB_BACKUP_DISPATCH_ENABLED` (explicit `true` only after the first manual workflow validation)

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the server runtime.
Use a fine-grained GitHub token limited to this repository with **Actions: write**; Contents write
is not required. Missing/invalid GitHub configuration returns the same sanitized “Backup service is
not configured” message. No secret values, upstream exceptions, or raw API payloads are returned.
Dispatch is disabled by default even when history is configured. Do not create credential files or
paste tokens into chat/source. Configure secrets through the authorized deployment environment.

Before production activation, separately authorize applying the migration and deploying the function,
place the reviewed Phase 1 workflow on the default branch with `workflow_dispatch`, execute and verify
the first real manual workflow, then explicitly enable dispatch. This local implementation performs
none of those production actions. The existing workflow requires no Phase 2 changes.

### Dispatch, audit and refresh

Create Backup Now opens the existing confirmation dialog. View-only administrators cannot dispatch.
The function checks all active workflow states before dispatch. A service-role-only SQL guard uses
an advisory lock and a short-lived lease in the existing noneditable internal settings record
`backup.dispatch_lease` to prevent two simultaneous checks from both dispatching. This is coordination,
not backup history. The lease is cleared when an active GitHub run is observed, or expires after ten
minutes. Ambiguous dispatch outcomes retain the lease; requests are never automatically retried.
The unchanged workflow concurrency remains a second protection against overlapping backup execution.
Dispatches performed externally in GitHub are outside the Edge lease, so their check/dispatch race
cannot be made atomic through GitHub's API; workflow concurrency still prevents concurrent execution.

After GitHub accepts dispatch, the hardened activity RPC records `backup_requested`, related type
`system_backup`, category `config`, and only workflow/trigger/run identifiers. Failed dispatches do
not create success logs. If audit configuration disables logging, or logging fails after acceptance,
the UI reports that separately and never asks the operator to repeat an accepted request.

Normal history refresh is manual. While a run or visibility lease is pending/active, the page's scoped
TanStack Query refreshes every 12 seconds, pauses in the background, stops on completion/error, and
cleans up on unmount. No existing admin collection queries or pagination are broadened.

Restore remains disabled and has no backend behavior. No scheduling, retention/deletion, database
backup registry, or production restore controls are added. Local tests mock sessions, Supabase and
GitHub; they must never trigger a real backup. Run the new backup page/API/control tests with Vitest,
and retain the Phase 1 offline Node tests. Future work includes authorized production validation,
an isolated recovery rehearsal, and then explicitly approved restore/registry/automation phases.

GitHub references: [workflow dispatch and token permissions](https://docs.github.com/en/rest/actions/workflows),
[workflow run endpoints](https://docs.github.com/en/rest/actions/workflow-runs).
The control function uses API version `2026-03-10`, accepts the current dispatch run-ID response and
also handles older empty 204 responses safely.
