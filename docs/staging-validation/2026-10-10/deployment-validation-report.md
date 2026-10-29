# Y-TRACE Storage Remediation — Staging Deployment and Validation

**Date:** 10 October 2026 (Asia/Manila)  
**Repository:** `lydorg`, branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`  
**Staging:** `ytrace-staging`, ref `zroudsvpswqsjlyttkjf` (`ap-northeast-2`)  
**Production:** `lydo-org-focused`, ref `mqqaykksadotbrghbexz` (`ap-southeast-2`), read-only throughout

## Recommendation

**Not production-ready.** The staging foundation, trusted origin, custom Admin gateway, staging-configured frontend build, and restrictive Storage-policy cutover are in place. One real staging HTTP check confirmed that a dummy invalid Admin token is denied. Actual object-level authorization and document workflows remain blocked because this tool connection cannot create Storage buckets or Auth users. Per the task, bucket creation is stopped for manual Dashboard setup; no private test files or synthetic identities were created.

The existing 33-policy performance migration remains unapplied. No production migrations, policies, Auth settings, users, buckets, objects, Edge Functions, or Vercel/GitHub settings were changed.

## Staging changes and evidence

| Item | Result | Evidence |
|---|---|---|
| Foundation migration | **PASS** | Applied only to `zroudsvpswqsjlyttkjf` as `staging_storage_authorization_foundation_20261010`, version `20261009190941`. Four private-schema tables exist with RLS enabled and `postgres` ownership. Internal helper functions have fixed search paths; gateway authorization is `SECURITY DEFINER` and executable by `service_role`, not `anon` or `authenticated`. |
| Trusted origin | **PASS** | `https://zroudsvpswqsjlyttkjf.supabase.co` is the only registered origin. Production origin is absent. `anon` and `authenticated` cannot execute the registration function; `service_role` can. Untrusted host/suffix-host references did not resolve. Asset audit returned aggregate metadata only. |
| Admin gateway | **PASS** | Deployed `admin-storage-access`, version 1, `ACTIVE`, `verify_jwt=false` to staging only. This setting is required because Admin uses its own session token; the handler delegates to `admin_authorize_storage_operation` for session, expiry/revocation, active-account, current permission, resource, parent, and object checks before Storage operations. The service-role key is server-side. |
| Gateway invalid-token check | **PASS** | A real POST to the staging function using the staging anon key and a dummy invalid Admin token returned HTTP **403**. No object was signed or downloaded. The request contains no real user token or document path. |
| Staging frontend build | **PASS** | Build at `tmp/storage-sec-remed-staging-20261010-02`; 4,102 modules, 42 JavaScript chunks. The emitted bundle contains the staging Supabase host, no production Supabase host, and no `SUPABASE_SERVICE_ROLE_KEY` variable name. This is a local build only; it was not deployed. |
| Policy cutover | **PASS** | Applied only to staging as `staging_storage_authorization_cutover_20261010`, version `20261009191528`. The exact 15-policy pre-cutover drift snapshot matched. The transaction-scoped `app.storage_remediation_validated=on` flag was supplied only after the gateway check, staging build, origin registration, and zero-data/policy gates passed. |
| Final Storage policies | **PASS** | 9 policies remain: 6 `ytrace_*` restrictive policies plus the 3 unrelated transparency/YORP policies. All 12 legacy policies for the five private buckets and template/news bucket-only admin policies are gone. The private policies require `authenticated`, an owner match, and authoritative parent/resource checks; there is no private-object UPDATE policy. |
| Production bucket inventory | **PASS** | Fresh read-only query against production confirmed settings listed below. No production write was issued. |

The staging cutover gate found 0 buckets, 0 objects, 0 Auth users, 0 organizations, 0 Admin accounts, 0 unresolved active-template Storage references, and 0 unresolved published-news Storage references. Thirteen active staged document-type rows have no Storage URL; these are empty configuration placeholders, not unresolved object references. No buckets or objects were created after cutover.

### Final staging Storage policy set

- `ytrace_private_organization_read`
- `ytrace_private_organization_insert`
- `ytrace_private_organization_delete`
- `ytrace_published_profile_avatar_read`
- `ytrace_active_templates_read`
- `ytrace_news_images_read`
- `transparency_attachments_admin_manage` (retained, unrelated)
- `transparency_attachments_read_public` (retained, unrelated)
- `yorp_sample_seed_assets_read` (retained, unrelated)

### Production bucket settings (read-only snapshot)

All observed buckets had no explicit file-size limit and no explicit MIME allowlist.

| Bucket | Public |
|---|---:|
| `organization-documents` | No |
| `budget-request-files` | No |
| `liquidation-report-files` | No |
| `ypop-files` | No |
| `move-files` | No |
| `template-files` | No |
| `news-release-images` | Yes |
| `brand-logo` | Yes |
| `registration-seed-file` | Yes |
| `transparency-attachments` | Yes |

## Stopped manual setup

The available Supabase tools do not expose Storage bucket creation, Auth-user creation, or a function-invoke API. Shell HTTP access was blocked by the sandbox; one explicitly approved escalation was used for the invalid-token request and succeeded. The task says to stop if bucket creation requires Dashboard authorization, so no API bypass or direct inserts into `storage.buckets`/`storage.objects` were attempted.

To continue, sign into the **staging** Supabase Dashboard and select project `ytrace-staging` (`zroudsvpswqsjlyttkjf`). Under **Storage → Buckets**, create the ten buckets above. Set the six private buckets to **Private** and the four public buckets to **Public**, matching the table. Leave file-size and MIME restrictions unset to match the current production metadata. Do not copy production objects or use production credentials. The restrictive policy cutover is already active, so create no bucket under the old broad-policy baseline.

The tool connection also lacks Auth Admin provisioning. After buckets exist, create only synthetic staging identities through the Dashboard Auth controls or an authorized staging Auth Admin API: Organization A, Organization B, and a suspended organization, plus custom Admin test actors through the existing authorized Admin-account workflow. Do not write directly to `auth.users` or create arbitrary session tokens. Then create test records through valid staging workflows and run the real API matrix below. No synthetic identity has been created yet.

## Validation results

| Area | Status | Evidence / blocker |
|---|---|---|
| Staging project isolation and migration target | **PASS** | Before writes, project ref and `ACTIVE_HEALTHY` status were checked. Both applied migrations and the function deployment targeted `zroudsvpswqsjlyttkjf`. |
| Foundation grants, function search paths, tables, triggers | **PASS** | Read-only staging catalog verification after foundation. Four metadata tables have RLS and no direct anon/authenticated grants; gateway RPC execution is service-role-only. |
| Exact policy drift before cutover | **PASS** | 15 current `storage.objects` policies deeply matched the cutover's embedded expected definitions. |
| Cutover output | **PASS** | Read-only staging catalog query showed the exact 9-policy result; no legacy private-bucket policy names remain. |
| Invalid custom Admin token | **PASS** | Real staging Edge Function HTTP response 403. This tests rejection only, not authorized signing. |
| Anonymous private-file denial | **BLOCKED** | No staging buckets or objects exist, so an actual Storage request cannot exercise policy enforcement. |
| Organization A/B ownership isolation | **BLOCKED** | No Auth identities, organization rows, buckets, or synthetic files. |
| Suspended-organization behavior | **BLOCKED** | No synthetic suspended organization or file. The proposed migration is fail-closed; the production viewing behavior remains a product decision to review. |
| Authorized Admin signing and permission matrix | **BLOCKED** | No custom Admin test accounts or Storage objects. Only invalid-token denial was exercised over HTTP. |
| Registration/renewal/budget/liquidation/YPOP/MOVE file workflows | **BLOCKED** | No buckets, records, or synthetic files. Local tests do not certify Supabase Storage authorization. |
| Public template/news/avatar access | **BLOCKED** | No staging buckets or test assets. Production news metadata was not copied and the production origin was not registered in staging. |
| Signed URL validity/expiry/account-switch/revocation | **NOT TESTED** | No authorized signing occurred. Existing lifetimes remain unchanged: download URLs 3,600 seconds; upload grants up to two hours. Logout/cache invalidation does not revoke an already issued URL. |
| PWA/browser and slow-network end-to-end workflows | **NOT TESTED** | The staging build was not served in a browser; no synthetic accounts or uploads exist. |
| Storage/API latency, transfer bytes, idle traffic, signing deduplication | **NOT TESTED** | Only the invalid-token HTTP rejection was sent. Its end-to-end tool wall time is not a gateway latency measurement. No egress percentage is claimed. |
| TypeScript | **PASS** | `npx tsc --noEmit`, exit 0. |
| Staging-configured Vite build | **PASS** | `npm run build -- --mode=staging --outDir=tmp/storage-sec-remed-staging-20261010-02`, exit 0. Existing stale Browserslist and large-chunk warnings remain. |
| Focused UI/regression suite | **FAIL** | 17 files: 190 tests passed, 1 failed. `YpopPpaSubmissionWorkflow.test.tsx` expects “Close Drawer” on mobile at line 634; the current mobile close control uses a different label. This UI test/component was not changed for this task, so it is unrelated to the Storage changes, but no baseline rerun established when the mismatch began. |
| `git diff --check` | **PASS** | Exit 0; Git printed existing line-ending notices. |
| Full Vitest suite | **NOT TESTED** | Only the focused set was run. |
| Real Storage authorization matrix | **BLOCKED** | Manual bucket and Auth setup above is required. |

Previously generated local PGlite/fixture evidence remains in `docs/staging-validation/2026-10-10/admin-gateway-role-matrix.json`, `docs/staging-validation/2026-10-10/origin-portability-matrix.json`, and `docs/storage-remediation/2026-10-09/authorization-matrix.json`. Those tests exercise migration SQL and synthetic database fixtures; they are not live Supabase Storage/API tests and were not overwritten.

## Advisor snapshot and remaining findings

The staging Advisor result observed at `2026-10-09T19:16:33Z` was read after the cutover. It reports four `RLS enabled, no policy` INFO findings for the private metadata tables; this is intentional because direct table grants are revoked and the design uses narrow definer helpers. It reported no Storage-specific policy warning. Existing staging findings remain and were not changed here: 11 mutable `search_path` warnings, `citext` in `public`, 199 anon-executable and 203 authenticated-executable public `SECURITY DEFINER` functions, 33 `auth_rls_initplan` warnings, 95 multiple-permissive-policy warnings, and 34 unindexed foreign keys (including an INFO finding for `admin_asset_uploads.admin_id`). These need separate review; the 33-policy performance migration remains unapplied. Advisor counts are not proof of authorization correctness.

## Rollout and recovery

1. Finish synthetic staging setup and the real Storage/Auth/PWA/performance tests before calling the remediation production-ready.
2. Keep Admin signing behind the deployed custom-session gateway; keep the service-role key server-side.
3. For any later production proposal, use a separately reviewed order: provision/verify the gateway and origin handling, prepare the matching frontend, recheck production asset references and exact policy drift, then apply a separately approved restrictive policy migration. This task made no production changes.
4. If the staging behavior fails, keep the restrictive cutover in place and correct forward. Do not restore the broad bucket-only policies. No bucket/object rollback is needed because staging still has no buckets or objects. A previously issued signed URL may remain usable until its server expiration; policy or client-cache rollback cannot revoke it.

**Final status:** staging remediation is deployed through policy cutover and ready for manual synthetic-resource setup. **Full staging validation is blocked. Production rollout is not recommended until the blocked authorization and workflow tests pass and the unrelated Advisor/test findings are reviewed.**
