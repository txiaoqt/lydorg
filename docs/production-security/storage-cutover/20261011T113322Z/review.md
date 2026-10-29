# Production Storage cutover compatibility review

Date: 11 October 2026. Object observations: 11:25–11:55 UTC (19:25–19:55 Asia/Manila); catalog scope finalized at 12:11 UTC (20:11 Asia/Manila).
Branch: ui-refactor. HEAD: 2f6e7427c553b7535f53860d1732b42df7c023e8.
Production: mqqaykksadotbrghbexz. Staging: zroudsvpswqsjlyttkjf.

## Decision

**Restrictive production cutover: NO-GO now.**
**Foundation and gateway preparation: CONDITIONAL GO for separate review/authorization.**

The current application references are compatible with the proposed authorization model. No production document-path rewrite is justified by this inspection. The outstanding decision is how to retain and, if required, authorize access to unmatched historical objects. Deleting them is neither required nor recommended.

Proceed by retaining unknown objects in place with access denied, if the records owner explicitly accepts that disposition. Investigate the two parentless files associated with a current non-test organization first. If historical access is required, recover authoritative associations from verified records through a separately reviewed plan. A filename, path UUID, test marker or general reset audit is insufficient authorization evidence.

No database/Storage/Auth writes, deployments or Git push occurred. The completed containment, credential retirement and document hotfix were not repeated.

## 1. Historical compatibility matrix

The complete redacted per-object matrix is [historical-object-matrix.json](historical-object-matrix.json). It contains all 355 objects in the five private organization buckets and template-files, including all 271 unmatched objects. Each row records its object ID, bucket, path SHA-256, ownership aliases, current/history/reference evidence, contextual audit evidence and required decision. Path hashes identify names; they are **not file-content hashes**.

Exact paths, owner IDs, parent candidates and audit IDs are available locally in the Git-ignored, access-restricted operator inventory:

.agent/security/production-storage-review/20261011T113322Z/historical-object-operator-inventory.json

That directory has protected ACL inheritance with one current-operator access rule. It is untracked and ignored. Do not publish its files or private filenames.

| Bucket | Total objects | Supported current/history links | Unmatched | Expected cutover treatment of unmatched |
|---|---:|---:|---:|---|
| organization-documents | 189 | 39 | 150 | Deny unresolved access; preserve bytes |
| budget-request-files | 37 | 6 | 31 | Deny unresolved access; preserve bytes |
| liquidation-report-files | 21 | 5 | 16 | Deny unresolved access; preserve bytes |
| ypop-files | 38 | 21 | 17 | Deny unresolved access; preserve bytes |
| move-files | 1 | 0 | 1 | Deny unresolved access; preserve bytes |
| template-files | 69 | 13 | 56 | Current 13 remain readable; unknown versions are not signable |
| **Total** | **355** | **84** | **271** | No deletion, movement or relinking |

The 56 template objects are **unreferenced versions**, not 56 inactive template records. All 13 current template records are active.

Classification of the requested unmatched population:

| Classification | Private | Templates | Total |
|---|---:|---:|---:|
| Required historical evidence, established by exact supported history reference | 0 | 0 | 0 |
| Legitimately retained, established by authoritative retained reference | 0 | 0 | 0 |
| Verified unused | 0 | 0 | 0 |
| **Unresolved** | **215** | **56** | **271** |

Among the separate supported population, two objects have exact revision-history references and 82 are otherwise currently referenced. Both categories are preserved. None of the 271 unmatched objects was promoted to “unused” from negative evidence.

### Actionable decision groups

| Group | Objects | Evidence and required decision |
|---|---:|---|
| Legacy renewal-test owner | 128 | 121 registration/renewal-bucket objects, 3 budget, 4 liquidation. Server fixture marker identifies the retained owner. Reset/deletion audits are contextual, not object-level proof. Records owner decides test-evidence retention; default retain with unresolved access denied. |
| No surviving owner-organization association | 85 | 29 organization documents, 27 budget, 11 liquidation, 17 YPOP, 1 MOVE. No supported parent/history binding. Missing current Auth/organization evidence does not prove deletion was authorized or that retention is unnecessary. |
| Current non-test owner, missing parent | 2 | One budget file and one liquidation file. Obtain owner/records confirmation of historical purpose and authoritative parent; do not guess from path. |
| Unreferenced template versions | 56 | 25 prefixes match an existing template type; 31 do not. Prefix association does not establish current publication or retention. Approve retention with denied access, or review an explicit historical-version access requirement. |

The two priority objects are:

- Budget: 59b986c9-4292-4f60-b3f9-ce6245bced5f.
- Liquidation: 4530c287-76ed-4ae3-8bf2-db54e6f38660.

### Search coverage and limits

Read-only inspection traced current file tables, recursive registration/renewal revision history, profiles, parent chains, template/news metadata, other public-table Storage URI/HTTP references, Auth ownership existence and activity-log relationships. Generic retained/archived references did not add a supported link for any unmatched object.

There were no exact URI or full-path audit matches for the 271 unmatched objects. Contextual audit matches exist for 170 private and 50 template objects; 51 have no such correlation. Related organization IDs, parent prefixes, basenames and reset/deletion actions are recorded separately from exact references. They do not prove that a particular object can be deleted or signed.

All 215 unmatched private paths lack the necessary surviving supported context in the actual authorization-function projection. No binary object was retrieved or exposed. External backups, records held outside this database, and signed URLs held outside application metadata were not inspected; business retention/access decisions therefore remain unresolved.

## 2. Gateway readiness and exact blocked workflows

Production currently has neither ytrace_storage_private nor admin_authorize_storage_operation, and no admin-storage-access Edge Function. Removing broad policies now would interrupt custom Admin file access.

Staging's active version 1 gateway uses verify_jwt=false and bundle SHA-256 564d0b5ceab9a63e8b81a824382fe565f045f1f794d3d9120b2fb5e9dc67fc8e. Its two source files match the local candidate after newline/trailing-newline normalization; [gateway-source-comparison.json](gateway-source-comparison.json) records exact local byte hashes. All 14 foundation function bodies, security attributes and grants match the staging catalog in the isolated tests.

The custom Admin token is validated on the server by the existing session validator; active account, current role permissions, exact metadata-parent relationships, object owner and ambiguity checks are enforced before signing. The RPC is executable by service_role only. The deployed validator also touches session last-used time, so it was not invoked against live projects in this read-only task. The current permission-context implementation reads roles.permission_codes, matching the gateway; there is no account-specific permission override table in the inspected schema.

Service credentials stay in Edge server environment variables. React sends its ordinary public key and custom Admin token to the gateway; it does not receive service credentials. verify_jwt=false is required for this custom-token model and must not be mistaken for authorization: the server/RPC checks remain mandatory.

| Workflow | Compatibility / blocker |
|---|---|
| Registration, renewal, YORP document review and historical revision preview | Current canonical metadata resolves; custom Admin access requires foundation, gateway and compatible resolver deployment. Preserve completed lifecycle guards and marker triggers. |
| Budget and liquidation preview/download | Current links resolve with real parent/ownership checks. Two unmatched files with a surviving organization require a historical-access decision. |
| YPOP entry, city-led and organization-led files | Parent/redundant organization checks retained. Current 21 file objects resolve. Legacy 17 unknown objects must not acquire access from paths alone. |
| MOVE | No supported production file metadata/parent exists for the one object. Current model grants eligible MOVE signing only to Super Admin; no permission code is invented. Normal owner workflow tested synthetically; a live production MOVE workflow was not executed. |
| Template upload/replacement and cleanup | Must use gateway-issued unique signed upload, then existing permission-checked metadata RPC. forms_templates_management required for ordinary Admin writes. Unknown historical versions cannot be signed/deleted through arbitrary paths. |
| Public template download | All current 13 canonical links resolve; active-template SELECT policy preserves their signing. Old 56 versions are not current catalog items. |
| News upload/replacement/cleanup | Requires gateway and news_releases_management. Register the exact production origin before legacy HTTP references are bound. |
| Public news rendering | Existing bucket remains public. Object SELECT RLS is not a privacy boundary for public HTTP serving; archived/unreferenced public image URLs are not revoked by this cutover. |
| Legacy bookmarked/manual object access | Unknown paths will cease to receive new authorized signatures. An existing signed URL may remain valid to its server-defined expiry. |

The existing dirty frontend already contains the gateway client, session-scoped signed-URL cache, lazy resolver, template/news upload integration and safe cleanup. **No further application refactor or ownership bypass was needed.** Its production deployment/build identity has not been verified and remains a prerequisite. The file manifest pins the reviewed local dependencies without discarding or committing unrelated work.

## 3. Exact policy scope

Remove these five bucket-only SELECT policies:

- organization_documents_read_portal
- budget_request_files_read_portal
- liquidation_report_files_read_portal
- ypop_files_read_portal
- move_files_read_portal

Remove these five broader ALL policies, which currently use current_user_is_admin() OR owner=auth.uid() rather than lifecycle-linked checks:

- organization_documents_manage_own
- budget_request_files_manage_own
- liquidation_report_files_manage_own
- ypop_files_manage_own
- move_files_manage_own

Remove these two bucket-only ALL policies:

- template_files_admin_manage
- news_release_images_admin_manage

Install exactly six policies: ytrace_private_organization_read, ytrace_private_organization_insert, ytrace_private_organization_delete, ytrace_published_profile_avatar_read, ytrace_active_templates_read and ytrace_news_images_read.

Keep transparency_attachments_admin_manage, transparency_attachments_read_public and yorp_sample_seed_assets_read unchanged. Final Storage policy count: 9. No private UPDATE policy; replacements use new objects and authorized metadata workflows.

Owner access requires both stored object ownership and an actual owned parent. Insert/delete honor suspension, deadlines and lifecycle locks. Upload-before-metadata requires a real parent; a new not-yet-linked object under that parent may be read by its owner for normal upload/cleanup. Admin signing always requires an exact supported current/history reference. This distinction is tested; “unknown file denied” does not prohibit a legitimate owner's upload-before-metadata workflow.

## 4. Artifacts and fresh gates

Prepared outside broad migration replay:

- [production_storage_foundation_review.sql](production_storage_foundation_review.sql): atomic foundation, exact catalog guard, production-origin registration, grant/RLS/source postconditions; no restrictive policy switch.
- [production_storage_policy_cutover_review.sql](production_storage_policy_cutover_review.sql): separately reviewed draft, foundation/source checks, exact policy drift gate, readiness attestation and exact nine-policy postconditions.
- [operator-checklist.md](operator-checklist.md): phased dependencies, verification and recovery.
- [compatibility-fingerprint-readonly.sql](compatibility-fingerprint-readonly.sql), [production-catalog-final.json](production-catalog-final.json), artifact JSON files and file-hashes.json.

Foundation SQL SHA-256:
e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2

Cutover draft SQL SHA-256:
3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c

Original foundation/cutover source files remain unchanged. Original source hashes:
0d19f0c27305f645abb9a990d507d9856b5ec2aa8232539bc95a577ca72a5b0e
6a172c11f670f5f7379a1eb732d6305119509630160bac741212ae0da40112fe

Production baseline: 164 migrations, latest 20261011230000, full-history MD5 1f5eca911f6e2057ae070a955eaca3dc. Exact compatibility SHA-256:
eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5

The gate covers 296 existing functions with owners/grants/security attributes, 90 existing triggers, 82 policies, table structure/security, default privileges, bucket configuration, role permissions and full migration history. This explicitly includes ytrace_production_containment.freeze_fixture_markers(), called by the four installed marker triggers. New foundation objects are checked separately. Sorting uses explicit C collation; it does not reuse the earlier hotfix verifier's locale-sensitive ordering.

Final review corrected the initial fingerprint namespace to the actual ytrace_production_containment schema. The superseded SQL drafts, hashes and manifest are retained under superseded-draft-v1. Only the hashes above identify the final candidates; the original migration bodies remain unchanged.

The SQL cannot cryptographically identify its control-plane project. Independent fixed-project/endpoint verification is mandatory before executing the exact bytes. Both artifacts retain one BEGIN/COMMIT transaction, 1-second lock timeout and 30-second per-statement timeout. Neither inserts a migration receipt: external receipts are required, and history remains 164. If a database receipt is mandatory, stop and review a new candidate rather than appending SQL.

## 5. Validation and preservation

| Check | Result | Evidence scope |
|---|---|---|
| Offline classification regression | PASS: 8/8 | Synthetic Node tests; conservative classification and redaction |
| Focused gateway/cache/client Vitest | PASS: 48/48 | Mocks; gateway denial, session isolation, deduplication and client compatibility |
| Isolated SQL suite | PASS: 4/4 | Actual foundation/cutover SQL, synthetic Auth and minimal PostgreSQL schema |
| Production metadata projection | PASS | 378 metadata objects; 71 supported private references, 215 unmatched denied; 70 owners readable, one suspended owner denied; 13 current templates readable, 56 unknown versions denied |
| Wrapper drift/rollback and postconditions | PASS | In-memory synthetic catalog hash substitution only; production artifacts unchanged |
| Current Admin session-validator compatibility | PASS | Function body/security attributes and explicit production EXECUTE grants match in an isolated fixture; no live validation RPC called |
| TypeScript | PASS | npx tsc --noEmit |
| Diff check | PASS | git diff --check; existing Git fsmonitor/line-ending warnings |
| Fresh live production authorization/HTTP/binary tests | NOT TESTED | Not authorized; gateway/foundation absent |
| New browser/PWA/UAT or full repository suite | NOT TESTED | No frontend change or reason to repeat completed UAT; prior unrelated failures not reclassified |

The isolated engine is PostgreSQL 18/PGlite; the live production catalog reports PostgreSQL 17.6. Synthetic UID/digest fixtures do not validate real JWTs, native multi-session concurrency or Storage HTTP behavior. Those limits are separate from the unchanged historical staging HTTP evidence.

Earlier test-development failures are preserved in local SQL run evidence: a synthetic citext parameter cast, a missing synthetic storage.buckets table, and JavaScript replacement-string dollar escaping in fault injection. They were fixed in the new test harness, not by changing security/business logic. Final artifact results are in local-sql-final-v2; earlier partial/failing evidence and the initial final run remain.

The validator comparison initially reported a textual ACL mismatch because pg_get_functiondef omits grants and the fixture used implicit PUBLIC EXECUTE. Its body already matched production exactly. Replicating the production's explicit grants locally made the exact comparison pass; no live grant or authentication behavior changed. Both comparison records are retained. An initial PowerShell inline-script quoting error executed no validation; the check then ran from the saved local module.

Reuse unchanged real staging evidence: 78 private-Storage isolation assertions, 43 Admin-gateway assertions, registration/renewal/Org C revision and terminal-security reports. These are historical evidence, not newly executed HTTP tests. The exact helper/grant and gateway-source comparisons strengthen reuse without certifying a production deployment.

The final read-only comparison found **zero changes** to 378 object metadata rows, 579 file rows, 266 parent rows, 92 organization projections, 13 templates and 3 news references. The catalog fingerprint is unchanged. See [end-readonly-preservation.json](end-readonly-preservation.json). No passwords, API keys, JWTs, signed URLs or binary documents were read/logged by this task.

## 6. Remaining release decisions

| Scope | Decision | Required next action |
|---|---|---|
| Historical classification inventory | CONDITIONAL GO | Records owner reviews the two real-owner parentless files and accepts retention/access dispositions; unused status remains unproven |
| Storage foundation | CONDITIONAL GO | Independent artifact review, separate production authorization, fresh exact gates and exclusive low-traffic window |
| Admin gateway | CONDITIONAL GO | Foundation first, explicit production deployment authorization, server-only credentials, verify_jwt=false and real authorized/denied gateway checks |
| Compatible frontend | CONDITIONAL GO | Isolate/review the existing dirty changes, pin build identity and separately authorize deployment |
| Restrictive policy cutover | **NO-GO now** | Complete the above dependencies and legitimate-access verification; no blanket metadata backfill or weaker policy |
| Existing capstone UAT / installed PWA | No new assessment | Completed evidence is preserved; this task did not retest or change the PWA |

Expected egress: lazy per-file signing and in-context deduplication remain; no metadata preload, mass signing, binary proxying, HEAD loop or background polling is introduced. Each uncached Admin file request adds the small authorization RPC through the gateway before normal Storage signing. No egress percentage is claimed.

Residual risks include unresolved historical access needs, production deployment verification, public-bucket serving semantics, previously issued bearer URLs, and the absence of fresh authorized production HTTP tests. Recovery must preserve restrictive authorization and business evidence; never restore broad anonymous policies or vulnerable lifecycle/test utilities.

