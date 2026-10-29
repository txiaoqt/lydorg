# Y-TRACE Storage authorization remediation — local review candidate

Date: October 9, 2026 (Asia/Manila). Project: `mqqaykksadotbrghbexz`.

## Recommendation

**Ready for controlled isolated staging validation; NOT cleared for production deployment.** No migrations, functions, frontend, Storage objects or authentication settings were deployed/changed in production. The live vulnerabilities remain until an approved rollout. The separate `20261009114340_performance_auth_uid_initplans.sql` remains unchanged and unapplied.

Read first: the previous [production-readiness report](../../readiness/2026-10-09/report.md) and [storage security review](../../readiness/2026-10-09/storage-security-review.md). Current branch is `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Initial tree already contained the performance/readiness source changes, tests, evidence, scripts and InitPlan migration listed in that report. They were preserved; no reset, checkout, fetch, commit or push was performed. New work is incremental.

## 1. Vulnerability and current live inventory

Read-only catalog queries reconfirmed five bucket-only private SELECT policies and two bucket-only asset ALL policies. PostgreSQL permissive policies combine with OR: the private owner-management policies cannot constrain a second bucket-only SELECT policy. Bucket privacy alone does not prevent signing/reading when SELECT is permitted. Template/news ALL predicates permit unauthorized writes through the captured grants.

| Bucket | Public flag | Current objects | Access and proposed handling |
|---|---|---:|---|
| organization-documents | false | 189 | Registration, renewal and profile images; parent + object ownership, lifecycle locks; exact published-avatar exception |
| budget-request-files | false | 37 | Budget parent ownership and editable state; custom Admin permission required for signing |
| liquidation-report-files | false | 21 | Liquidation → budget organization consistency; parent ownership/state; custom Admin signer |
| ypop-files | false | 38 | Entry, city participation and org activity parent chains; ownership/state/period checks |
| move-files | false | 1 | No current file metadata rows or active frontend upload implementation found; orphan is not signable |
| template-files | false | 69 | Only current active template references publicly signable; Admin-only authorized uploads/cleanup |
| news-release-images | true | 15 | Published metadata read; Admin-only authorized uploads/cleanup; existing public image serving retained |
| brand-logo | true | 1 | Existing public serving unchanged; no object policy in captured inventory |
| registration-seed-file | true | 6 | Existing six-name SELECT allowlist and public sample files unchanged |
| transparency-attachments | true | 1 | Existing public-read and JWT-admin write policies unchanged |

All buckets currently have null file-size/MIME bucket limits. No live bucket configuration was changed. Full current policies and grants are in [live-inventory.json](live-inventory.json); the earlier [live schema](../../readiness/2026-10-09/live-schema.json) supplies table RLS and helper definitions. All 15 Storage policies were inventoried. The three non-target policies remain unchanged. Public bucket HTTP serving bypasses object SELECT RLS; restricting news metadata does **not** make an archived image URL private.

Aggregate checks, without retrieving private paths or binaries:

- All 37 canonical private registration/renewal references, 6 budget references, 5 liquidation references, 17 event-proof references and 4 org-activity references match their expected parent prefix: **69/69**.
- All 69 referenced private objects exist and their legacy owner equals the parent organization's user. All private objects have both current `owner_id` and legacy `owner`, with zero disagreements in this capture.
- The remaining 510 registration file references are not private organization-document URIs; the existing sample bucket path is preserved. No HTTP file references appeared in these seven metadata collections.
- MOVE has one non-UUID-prefixed object and zero file metadata rows. It is deliberately not treated as an authorized arbitrary path.
- Object totals include old/unreferenced objects; their existence does not prove a current valid submission. No orphan was deleted.

## 2. Authoritative relationships and write rules

| Workflow | Authoritative relationship | Object layout / authorization |
|---|---|---|
| Registration | file → document_submissions → organization_profiles.user_id | organization/type/unique filename; per-requirement status and submission revision locks |
| Renewal | same file/submission tables + renewal_id → organization_renewals with matching org | organization/renewal/renewal ID/type/unique filename; renewal terminal/review/revision locks also checked |
| Profile image | organization_profiles.profile_image_url | organization/profile/unique filename; owning account; directory publication has additional conditions |
| Budget | budget_request_files → budget_requests.organization_id → profile user | budget ID/unique filename; review/approved states cannot be overwritten |
| Liquidation | liquidation_report_files → liquidation_reports → same-org budget | report ID/unique filename; existing editable statuses and revision deadlines |
| YPOP entry | ypop_files → ypop_entries, redundant organization must match | entry ID/unique filename; editable state and open semester |
| City proof | ypop_event_files → ypop_event_participations, redundant org must match | participation ID/unique filename; draft/confirmed/revision upload states |
| Org activity | activity file → activity → same-org entry | activity ID/unique filename; editable state and open semester |
| MOVE | move_files → move_applications, org must match | candidate parent-ID layout; draft/revision operations only; complete phase semantics are a validation gate |
| Templates | required_document_types.template_url | server selects template ID + random UUID + sanitized basename |
| News | news_releases.preview_image_url | server selects news-releases/random UUID + sanitized basename |

Paths are lookup identifiers, not sufficient ownership evidence. Private operations also require Storage object ownership and a real authoritative parent owned by the current principal. The object-owner condition prevents a different account from recreating a deleted parent UUID and reading old bytes. Both `owner_id` and legacy `owner` are supported; mismatches fail closed to the current owner_id.

Uploads precede metadata persistence in the existing app. The policy therefore checks the **existing parent** before allowing a new unique object, rather than requiring a not-yet-created file row. It does not trust the client to claim another org through a folder name. Parentless/foreign/suspended uploads are denied. UPDATE has no policy: reviewed bytes cannot be overwritten or renamed. Shared uploads and renewal paths now use UUIDs and `upsert:false`; registration TUS transport already uses unique insert-only objects and is unchanged.

Registration/renewal documents under review or approved cannot be removed/overwritten. An unlocked requested revision can upload a new object; the reviewed requirement cannot be deleted. Other editable workflows keep their allowed attachment removal rules. Existing metadata triggers/RPCs remain authoritative for final submission transitions and validation; no identity or lifecycle guard was removed.

Draft-parent deletion currently occurs before binary cleanup. A new BEFORE DELETE helper records only an already-authorized cleanup reference, bound to user + organization + exact object, for 15 minutes. It cannot authorize INSERT/UPDATE. Expired receipts deny cleanup; no ownership is inferred from a deleted parent's path. Account-deletion/YPOP administrative Edge workflows keep their existing trusted service-side cleanup.

## 3. Custom Admin gateway

New server-only function: `supabase/functions/admin-storage-access/`.

The Edge handler calls `admin_authorize_storage_operation` using server credentials. The RPC is executable **only by service_role**; anon/authenticated cannot call it directly. It independently calls the existing token validator and verifies active Admin, expiry/revocation, current role/permissions, authoritative file metadata, parent/org consistency, Storage object ownership and workflow reviewability. A known draft path is insufficient, including for Super Admin. No frontend service credential or arbitrary bucket signer was added.

Permissions: registration management; renewal management/registration management; budget review; liquidation review; YPOP validation. YORP-view access is limited to approved registration documents of verified organizations. Profile references use registration/registry permissions. MOVE has no dedicated current permission, so the candidate permits only Super Admin signing of reviewable metadata; broader MOVE permissions are deliberately not invented.

Signing returns an exact verified object. Unreferenced paths, ambiguous cross-org references and wrong permissions fail closed. Downloads/previews remain lazy and use the existing session-scoped cache. Admin signing is selected on `/admin` routes; a stored Admin session does not hijack Organization/public file access. Admin context reads do not require an unrelated Organization JWT refresh.

Asset uploads use server-generated unique paths and path-specific signed upload tokens. Browser upload goes directly to Storage and does not stream binaries through the Edge function. Asset deletes are limited to unattached server reservations or server-recorded historical asset bindings; a currently referenced asset is not deleted by this cleanup endpoint. Bindings preserve safe cleanup of legacy news images after metadata replacement. Existing metadata publication/archive/delete RPCs and activity logging remain intact.

Request bodies are bounded to 8 KB before JSON parsing. Errors do not expose database messages, tokens, private paths or signed URLs. Responses use `Cache-Control:no-store`. Dependencies are pinned for the new Edge entry. No endpoint was deployed.

## 4. Exact policy and migration proposal

1. **Foundation:** `20261009145634_storage_authorization_remediation.sql` creates the private schema, three restricted metadata tables, seven guarded/helper functions and eight lifecycle/binding triggers. It does not replace live Storage policies. Grants are explicit; helper defaults are revoked. No existing business-table RLS/grants or authentication helpers are replaced.
2. **Cutover:** `20261009150110_storage_authorization_cutover.sql` removes the following 12 unsafe policies:
   - organization_documents_read_portal / organization_documents_manage_own
   - budget_request_files_read_portal / budget_request_files_manage_own
   - liquidation_report_files_read_portal / liquidation_report_files_manage_own
   - ypop_files_read_portal / ypop_files_manage_own
   - move_files_read_portal / move_files_manage_own
   - template_files_admin_manage
   - news_release_images_admin_manage
3. Adds six policies: private organization SELECT, INSERT, DELETE; exact published profile-avatar SELECT; active referenced template SELECT; published referenced news-image SELECT. No anonymous asset write or ordinary JWT Admin bypass is added. No private UPDATE policy exists.

The avatar exception requires a verified, directory-visible organization, exact registered organization/profile path, matching object owner and image MIME metadata. It cannot publish a registration requirement through profile_image_url. MIME metadata is not a binary-content scan; existing client image validation still applies. Publication consent and signed-link expiry limitations remain relevant.

Cutover has an explicit `app.storage_remediation_validated` transaction gate and exact drift comparison against all 15 captured Storage object policies. Unexpected policies or changed predicates abort. Both files use short lock/statement timeouts and must be applied transactionally through a separately approved rollout. Neither is applied. Do not run blanket `db push`: the independent 33-policy performance proposal remains pending and must not be silently included or marked applied.

## 5. Frontend compatibility and cache security

- New lazy `src/lib/admin-storage-access.ts` brokers Admin signing/assets and rejects late account-switch results without fallback.
- `lydo-connect-supabase.ts` keeps the existing SignedStorageUrlCache, removes no scoped loaders, and uses the gateway only for selected Admin files. New upload paths are unique and insert-only.
- PWA avatar had a second bucket/path cache with **50-minute freshness**. Removed it; all signing/deduplication now goes through the shared session cache. Displayed avatars clear and stale responses are rejected on authorization-context events.
- No global polling, whole-portal preload, mass PDF signing, binary report downloads, extra HEAD requests or new subscriptions were introduced. Registration TUS/progress/retry/partial-success transport was not redesigned.

## 6. Authorization evidence and its limits

[authorization-matrix.json](authorization-matrix.json) is generated by the isolated PostgreSQL harness. It executes the proposed functions/policies and captured token-validator body with synthetic tables/records, auth.uid settings and a **noncryptographic digest fixture**. It is real PostgreSQL RLS execution, but not a full Supabase Storage HTTP/JWT deployment or full-schema authorization certification.

| Actor | Private SELECT | INSERT | UPDATE | DELETE | New Admin signing |
|---|---|---|---|---|---|
| Anonymous | denied | denied | denied | denied | denied |
| Organization A/B | own objects + real parent only | own editable parent only | denied | own editable object only | RPC execute denied |
| Suspended organization | denied for private files | denied | denied | denied | RPC execute denied |
| Ordinary unauthorized Admin JWT | denied | denied | denied | denied | RPC execute denied |
| Authorized custom Admin | no anonymous private-table grant | private gateway writes not exposed | denied by gateway | private gateway deletion not exposed | verified reviewable metadata + permission |
| Wrong permission | no grant | no grant | no grant | no grant | denied |
| Expired/revoked/inactive/invalid custom Admin | no grant | no grant | no grant | no grant | denied |

An explicitly published directory avatar is intentionally readable beyond its owner; it is not a private submitted document. Public templates/news are read-only to ordinary callers. Tests also cover lock/expiry/unlock behavior, draft protection, modern/deprecated ownership, reused parent IDs, cleanup receipt expiry, bounded requests, exact grant matching, upload reservations, anonymous asset write denial and account-switch races.

**BLOCKED:** actual Storage SELECT/sign/upload/TUS/update/delete endpoints, real JWT A/B isolation, binary iframe/download, custom Admin Edge integration, installed PWA, suspension/revocation propagation and complete MOVE phases. No authorized isolated Supabase deployment/test accounts, Docker or Deno runtime was available. Production document exploitation was not attempted. Unit test labels for expired/revoked permissions do not replace the SQL tests, and SQL fixtures do not certify the HTTP server.

## 7. Regression and performance results

Final focused Vitest run: **179 passed, 0 failed, 14 files**. Includes gateway/resolver, signed cache, PWA avatar, account isolation, registration transport/bulk upload, renewal Realtime, Admin lifecycle, YPOP persistence/submission synchronization and reports/Section 35. Final follow-up after the Admin context refinement: **34 passed, 0 failed, 4 files**, including an assertion that custom Admin signing does not request an unrelated Organization session. Exact results are in [validation.json](validation.json).

Isolated PostgreSQL authorization harness: **1 aggregate test passed**, containing the matrix and additional assertions. This is not counted as one test per operation or a live authorization pass.

TypeScript and production build passed; final validation evidence records the exact final run. `git diff --check` passed. Full repository Vitest was not rerun for this focused task. The prior readiness run had 151 baseline assertion failures; this task does not claim to resolve or recertify that full suite. None failed in the selected regression run. Existing large-chunk build warnings remain. The normal build output was restored to its initially clean tracked state after validation; final measured artifacts remain under tmp/storage-remediation-build.

Build artifact comparison is in [bundle-sizes.json](bundle-sizes.json). Initial static JS: 1,243,519 → 1,244,289 bytes (+770); gzip 334,592 → 334,862 bytes (+270). Chunk count 39 → 40, with the Admin gateway client deferred. These are static JS bytes/gzip, not network latency or production egress measurements. No real authenticated network measurement was performed. The gateway adds one small authorization RPC and one Storage signing request per Admin cache miss; concurrent requests still share one resolution. Private bytes are downloaded only on preview/download. Asset binaries bypass Edge. Removing the unsafe avatar cache can increase signing after the shared 60-second client freshness, a deliberate authorization tradeoff. Expired cleanup/reservation rows are pruned during the next matching user's operation; expiry is enforced even before physical pruning. Retention at very large scale should be operationally reviewed without adding frontend polling.

## 8. Controlled staging acceptance and deployment order

No step below has been executed on production.

1. Create an authorized isolated full-schema Supabase environment with synthetic org A/B, a suspended org, Super Admin, a limited reviewer, wrong-permission/expired/revoked/inactive Admin sessions. Do not copy real private documents or credentials.
2. Review/execute the foundation migration transactionally there; verify function ownership, grants and existing identity/lifecycle triggers. Deploy the gateway there with its server-only credentials and custom-token validation.
3. Deploy the compatible frontend to that environment. Confirm submitted registration/renewal/budget/liquidation/YPOP files preview/download through the gateway, drafts do not, and public templates/news/opted-in avatars render. Verify payloads/logs never persist tokens or signed URLs.
4. Inventory every legacy reference, revision-history reference and object-owner disagreement. Unknown/unowned/unreferenced objects fail closed. Resolve legitimate service-owned legacy files through an audited immutable binding design rather than relaxing ownership globally.
5. Explicitly decide/test MOVE pre/post-activity requirement phases and applicable Admin permission. Current source lacks the active workflow and a dedicated permission. Alternatives: retain candidate draft/revision uploads + Super Admin signing if that is the approved scope; or add a separately reviewed phase-specific resource authorization adapter and permission. Do not broaden the generic status allowlist to guess completion behavior.
6. Apply the cutover transactionally in isolation only after setting its validation gate in that approved transaction. Drift guards must pass. Reproduce anonymous/A/B/suspended matrix through actual Storage and direct PostgREST calls, including owner_id-only objects, guessed/reused parent IDs, mismatched metadata and attempts to overwrite reviewed bytes.
7. Exercise each upload/replacement/delete/review transition. Interrupt TUS on mobile throttling, Retry Failed, verify successful files are not retransferred, and test cleanup after parent/file deletion. Measure transfer counts and signing deduplication, not cumulative pg_stat_statements counters.
8. Run installed PWA/account switching, cold lazy routes, document iframe/download over the proposed expiry interval, Realtime status changes, all filtered exports and per-org metadata-only reports. Test duplicate identity/URN checks and session expiry/revocation without destructive production actions.
9. Obtain the full authorization evidence and approval. For a later controlled production rollout: approved foundation first, gateway second, compatible frontend third, then restrictive cutover. Keep the interval short; foundation alone does not remediate the live policies. Avoid mixing the unapplied performance migration into this rollout.

## 9. Rollback and incident response

- Execute each migration in a transaction. Drift/gate/lock/statement failures require transaction rollback, leaving preceding policy state intact; never continue after a failed statement in a partial migration.
- Before cutover, a frontend rollback can stop use of the new gateway; foundation can remain inert. Preserve its binding/receipt metadata. No destructive drop script is supplied.
- After restrictive cutover, keep the secure gateway and compatible client active. **Do not restore the vulnerable bucket-only policies or anonymous SDK fallback.** Disable the affected operation temporarily and apply a reviewed forward correction. An older frontend using anonymous signing is not a safe post-cutover rollback.
- Keep schema/policy evidence, inspect security logs without copying signed URLs/tokens, stop issuance and revoke the compromised account/session through the approved incident procedure. These actions prevent new authorized issuance, not use of previously issued bearer links.
- Download URLs remain **3,600 seconds** as before; shortening them has not been justified by real iframe/download-duration testing. Client freshness stays at most 60 seconds and session-bound. Cache invalidation, logout, suspension and policy rollback do **not** revoke issued URLs. Public news URLs remain public while the object is publicly served.
- Supabase signed upload URLs remain valid for **two hours** and require no further auth once issued. Reservation expiration/cleanup does not revoke the signed token. A staged revocation test must explicitly include this capability window. Emergency provider-assisted revocation or object quarantine is a separately approved operational decision with availability/data consequences; nothing here performs it.

References: [Storage ownership / owner_id](https://supabase.com/docs/guides/storage/security/ownership), [signed upload lifetime](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Changelog Markdown retrieval was unsupported; the official HTML changelog and current docs were inspected.

## 10. Files changed in this remediation

Existing: `src/lib/lydo-connect-supabase.ts`, `src/user/pwa/PwaOrganizationAvatar.tsx`, `supabase/config.toml`.

New: `src/lib/admin-storage-access.ts`, `admin-storage-access.test.ts`, `admin-storage-resolver.integration.test.ts`; `src/user/pwa/PwaOrganizationAvatar.storage.test.tsx`; `supabase/functions/admin-storage-access/control.ts`, `index.ts`; the two new migrations; `supabase/tests/storage_remediation.local.test.mjs`; this report and evidence directory.

No already-applied migration was edited. Prior performance, identity, authentication, export, Realtime and resumable transport changes remain preserved.

## 11. Readiness gates

| Area | Status | Evidence / blocker |
|---|---|---|
| Local gateway, cache and upload compatibility tests | PASS | 179 focused tests; 34 final follow-up tests |
| Isolated PostgreSQL policy/function matrix | PASS | Synthetic real PostgreSQL execution; scope limited as documented |
| TypeScript / production build / diff check | PASS | validation.json |
| Actual Storage API, custom Edge and A/B JWT isolation | BLOCKED | No authorized isolated full Supabase test environment |
| Installed PWA / slow-network resumable workflow | BLOCKED | No isolated deployment and authorized synthetic accounts |
| MOVE complete business authorization | BLOCKED | Phase semantics and dedicated permission require confirmation |
| Production rollout | BLOCKED | Full staging authorization evidence and separate approval required |

The locally implemented frontend, gateway and foundation form one staging candidate; they are not independently approved for production. Both Storage migrations require review, and the restrictive cutover must follow the replacement gateway/client. The separate 33-policy performance migration is outside this rollout.
