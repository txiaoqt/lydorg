# Final production Storage cutover readiness review

Review date: 13 October 2026, Asia/Manila. Fresh evidence was collected from 12 October 2026 at 16:06 UTC; individual snapshots retain their capture timestamps. Target: `mqqaykksadotbrghbexz`, independently confirmed as `lydo-org-focused`, database host `db.mqqaykksadotbrghbexz.supabase.co`.

## Decision

**CONDITIONAL GO for preparing a separately authorized cutover; NO-GO for executing it now.** The retained SQL matches the current catalog and installed foundation. Historical-access dispositions and the Admin budget-deletion mitigation still require explicit operator decisions. No policy, database record, object, account, gateway, frontend, or provider setting was changed during this review.

The confirmed budget-deletion permission omission is a separate defect in the existing destructive RPC. The Storage cutover does not repair database deletion authorization. Pause that operation before relying on a retention-only operating plan. Validation is proportionate to the pre-production capstone with developer-owned accounts: this review does not require repeating the accepted frontend/PWA releases or creating new production test sessions.

## 1. Historical-object decisions

All 271 unmatched object identities, path hashes, sizes, metadata fingerprints, and owner-organization associations still match the preserved reconciliation inventory. None gained a supported reference or a valid upload parent. No object was established as verified unused. “Deny” below means the intended result **after** restrictive cutover; the existing broad policies remain installed today.

| Category | Count | Evidence and uncertainty | Recommended disposition |
| --- | ---: | --- | --- |
| Legacy test-owner objects | 128 | Preserved protected test-owner association; no supported current/history reference. Account retirement is already complete. A test marker does not prove deletion eligibility. | **2 — Retain; deny ordinary application access.** Preserve audits and objects. No relinking or access grant. |
| No surviving owner-organization association | 85 | No surviving organization association, supported reference, or valid parent. This does not prove the bytes are disposable. | **2 — Retain; deny ordinary access.** Keep ownership unresolved. Investigate separately only when evidence establishes a need. |
| Current-owner budget/liquidation objects | 2 | Real surviving owner; former parent IDs appear in owner-consistent audit records, but the parents and file metadata no longer exist. See below. | **2 now; flag for 3 if access is required.** Retain as potential financial history; deny ordinary access. Evidence-based remediation needs a separate decision and authoritative parent evidence. |
| Unreferenced template versions | 56 | No current template reference. Twenty-five share a current type prefix; thirty-one do not. Neither proves publication history or non-use. | **2 — Retain; deny ordinary access.** Restore a version only through a separately approved authoritative template workflow. |
| Existing supported references, outside the 271 | 84 objects | 71 private objects, including two exact revision-history objects, plus 13 current templates. | **1 — Retain existing supported access**, subject to ownership, suspension, lifecycle, and permission checks. No additional grants. |

The 271-row redacted inventory remains in the previous `20261011T113322Z/historical-object-matrix.json`. Its restricted operator inventory remains in the ignored `.agent/security/production-storage-review/20261011T113322Z/` directory. This report does not reproduce private paths, filenames, personal information, or file contents.

### Priority objects

| Reference | Storage object ID | Fresh investigation | Decision |
| --- | --- | --- | --- |
| CURRENT-BUDGET-01 | `59b986c9-4292-4f60-b3f9-ce6245bced5f` | Existing Auth owner and one organization association, unchanged. No current/history/other Storage reference and no surviving budget parent. Its path prefix matches six budget audit events for that owner, including approval, cash release, and `deleted_budget_request` on 4 October. No audit contains its exact file URI/path. | Preserve. Historical parent activity supports retention, but does not authorize a current parent/file relationship. Deny ordinary access pending any separately approved remediation. |
| CURRENT-LIQUIDATION-01 | `4530c287-76ed-4ae3-8bf2-db54e6f38660` | Same surviving owner association. No current/history/other Storage reference and no surviving liquidation parent. Its path prefix matches seven owner-consistent liquidation audit events, including approval and completion on 3 October. No exact file URI/path audit or surviving budget-to-liquidation relationship establishes a current link. | Preserve. Do not infer that this liquidation belongs to the budget above merely because owner and timing coincide. Deny ordinary access; require authoritative evidence for remediation. |

Both objects were created on 3 October and retain their original Storage metadata fingerprints. The audit correlations are stronger than an owner match alone, but are **not** a basis for automatically rebuilding financial parents, fabricating metadata, deleting files, or authorizing arbitrary paths. No private content was downloaded.

## 2. Admin budget deletion: confirmed compatibility and permission defects

Reviewed the source associated with the actual promoted Admin release, rather than the dirty root implementation:

- `src/lib/lydo-connect-supabase.ts`, `deleteAdminBudgetRequestsInSupabase`, starting at line 9369 in the isolated promoted source.
- `src/admin/AdminPortal.tsx`, deletion handler at line 4143 and confirmation text around lines 11040–11046.
- Actual production `public.admin_bulk_delete_budget_requests(text,uuid[])`, source MD5 `eb7b756964fd31efebfb39749f5c9e5b`.
- Production session validator and relevant deletion triggers, inspected without invoking the validator or any mutation RPC.

**Actual current behavior:** the production RPC validates a non-revoked, unexpired session for an active Admin, deletes database records, and returns `success`, `deleted_count`, and `deleted_ids`. It does **not** return `budget_file_paths`, `liquidation_file_paths`, or the client's `deleted_request_ids` field. The client's two cleanup arrays therefore default to empty against this production definition. The UI nevertheless promises deletion from secure Storage and reports a successful budget deletion without an explicit physical-retention warning. Audit creation is conditional on the deletion logging setting; the UI's unconditional immutable-audit promise is also stronger than the RPC contract.

There is also a latent incompatibility in the existing client cleanup branch: when paths are returned, it calls browser Storage `remove()` after database deletion and treats `error:null, data:[]` as cleanup success. Under restrictive policies, a custom Admin session does not supply an organization Auth JWT or an owner cleanup receipt. The existing gateway does not support arbitrary private-file deletion. Once parent metadata is deleted, its signing authorization cannot recover an unsupported reference. An empty DELETE response is never proof of physical deletion.

**Confirmed server authorization omission:** the production deletion RPC checks for a valid active Admin session but performs no budget role/resource permission check. EXECUTE is granted to PUBLIC/anon/authenticated/service_role. The validator checks token validity and account activity, not budget permissions. Marker triggers apply to INSERT/UPDATE; the relevant DELETE triggers perform owner cleanup or version tracking, not a budget permission check. Thus the source admits a valid Admin session without requiring budget-review/deletion permission. Anonymous callers without a valid Admin token are rejected. No exploitation or production denial/mutation request was performed in this review.

### Recommended smallest separate correction

**Option A — pause budget deletion (recommended):** a narrow server-side pause of this exact RPC before any DELETE, plus disabling the Admin action and rejecting its client entry point before RPC submission. Preserve signature, owner, grants, normal review/release workflows, and all records. A UI-only pause does not close the direct-RPC permission gap. An operator instruction is useful immediately, but is not a technical authorization boundary.

**Option B — retain physical files explicitly:** if deletion of database records is essential, first define and enforce server-side deletion authorization (Super Admin only is the safest temporary restriction pending a business-approved deletion permission). Remove browser physical cleanup, align the response contract, preserve bounded parent/file retention evidence before cascades, and make confirmation/result messages explicitly say that physical files are retained and are not available through ordinary application access. Any later cleanup requires a separately approved server-bound retention process. This is more work than A and must not claim “files deleted.”

No implementation was applied. The decision belongs to the operator. Any server RPC change will alter the exact catalog fingerprint; only then should the affected cutover compatibility gate be rebaselined and reviewed. Do not remove that gate to accommodate the correction.

Focused acceptance criteria for the separate correction:

1. Paused calls never submit a destructive RPC from the UI/client, and direct RPC calls cannot delete records.
2. Any enabled deletion path rejects missing, expired, revoked, inactive, and zero-permission Admin sessions server-side; validates the explicitly approved deletion role/scope.
3. Normal authorized document review and signing remain unaffected.
4. No browser private Storage DELETE, upload, overwrite, or fallback is introduced.
5. The actual production response shape is tested, including absent path arrays and `deleted_ids`.
6. `error:null, data:[]` is not asserted to prove deletion; retention reporting remains accurate.
7. If B is selected, cascade effects and retained-file evidence are verified on a separately authorized disposable staging state. Never use preserved approved documents for destructive acceptance.

## 3. Exact current versus proposed policies

Current manifest matches the retained SQL's exact 15-policy prerequisite, including roles, commands, predicates, and WITH CHECK expressions.

| Existing policy group | Count | Current behavior | Proposed action |
| --- | ---: | --- | --- |
| `organization_documents_read_portal`, `budget_request_files_read_portal`, `liquidation_report_files_read_portal`, `ypop_files_read_portal`, `move_files_read_portal` | 5 | SELECT TO public with only a bucket condition; no owner/parent check. | Drop all five. |
| Matching five `*_manage_own` policies | 5 | ALL TO public; bucket plus `current_user_is_admin() OR owner=auth.uid()`; no document-parent/lifecycle condition. | Drop all five. |
| `template_files_admin_manage`, `news_release_images_admin_manage` | 2 | ALL TO public with bucket-only conditions; policy names do not enforce Admin authorization. | Drop both. |
| Two `transparency_attachments_*` policies and `yorp_sample_seed_assets_read` | 3 | Existing public transparency/sample behavior and transparency Admin condition. | Retain byte-for-byte. |

Add exactly six:

- `ytrace_private_organization_read`, `ytrace_private_organization_insert`, `ytrace_private_organization_delete`: authenticated role only; five private buckets; stored owner equals real `auth.uid()`; installed parent/organization/lifecycle predicate. No private UPDATE policy.
- `ytrace_published_profile_avatar_read`: anon/authenticated; exact published profile reference, verified consent/status, real owner, and image MIME. Does not publish private PDFs.
- `ytrace_active_templates_read`: anon/authenticated; exact active template metadata.
- `ytrace_news_images_read`: anon/authenticated; exact published news metadata.

**15 − 12 + 6 = 9 final policies.** Full expressions are preserved in `policy-manifest.json` and the unchanged SQL. Admin requests continue through the service-only gateway and its custom session/resource/permission validation, rather than broad client policies.

### Catalog and artifact gates

Retained candidate: `docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql`.

- Bytes: **37,926**.
- SHA-256: **`3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c`**.
- Current compatibility SHA-256: **`eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`** — exact match.
- Migration history: **164**, latest **20261011230000**, complete MD5 **`1f5eca911f6e2057ae070a955eaca3dc`**.
- Four foundation tables, 14 function definitions/owners/security modes/configurations/ACLs, schema grants, eight enabled triggers, and trusted production origin exactly match the independent installation receipt.
- Four containment marker triggers, three document-security triggers, and the FALSE production environment guard are unchanged. Existing function fingerprints include the retained disabled test routines.
- `admin_authorize_storage_operation` remains service_role-only; PUBLIC, anon, and authenticated cannot execute it. Ordinary roles cannot directly read/write foundation internal tables. Intended policy predicates have their reviewed restricted EXECUTE grants.

**No SQL change or stale catalog-gate correction is justified against today's catalog.** The candidate retains one atomic BEGIN/COMMIT boundary, 1-second lock timeout, 30-second per-statement timeout, exact prerequisites/postconditions, and no migration receipt. Its `app.storage_remediation_validated` setting is an operator attestation, not authentication. It was not set or used to authorize a cutover in this review.

The SQL does not embed a complete business-data preservation snapshot. Separate immediate pre/post read-only inventories and a reviewed single-attempt execution procedure remain required. Do not repurpose the hard-pinned foundation installer for arbitrary SQL.

## 4. Legitimate-access projection and preservation

Fresh metadata review found 579 current file rows: 69 private references and 510 references to six existing public sample PDFs. Every current private reference resolves to supported parent metadata; all 510 sample references satisfy the retained six-name allowlist. All are canonical references. No current existing private reference depends on a legacy HTTP path that the installed gateway cannot resolve.

There are 71 distinct supported private objects, including two exact revision-history objects. Seventy satisfy the intended owner-read conditions. The one denial is an owner-consistent registration file whose organization is `suspended_inactive`; it is an intended restriction, not an ownership mismatch. No currently stored profile avatar resolves to a private object in the inspected exact canonical/public URL forms. Thirteen active templates and all three published news images resolve to existing objects. No supported non-suspended owner-read loss was found in this metadata projection.

This is **not** a new live Auth/Storage authorization assertion. No production login, session validation call, signing request, private-file download, upload, DELETE, or business mutation was executed. Future upload/revision/TUS behavior relies on the unchanged reviewed implementation and prior focused staging evidence, with bounded post-cutover smoke checks requiring separate authorization.

All 378 Storage object records and ten bucket records match the preserved fingerprints:

- Objects MD5: `67284160e3ab4a273194aad042e84e40`.
- Buckets MD5: `832ce1466eb597a15f1082c9544eb540`.

Twenty of 21 relevant business/Storage inventories match the foundation-era snapshot, including documents, budgets, liquidations, YPOP/MOVE, templates/news, accreditation, and renewal history. Organization profiles changed from 92 to 93; old fingerprint `52f00b0d86d0c583a56143629fd7409a`, current `a3d0cedda53960f18b94f97f59779489`. This review does not attribute that difference to a specific identity, silently replace the old baseline, or approve a changed preservation baseline. Previously reported operator Google/profile activity is context, not independent record attribution. Review the profile delta and establish the immediate execution baseline in the exclusive window. All relevant file-owner associations remained unchanged.

Metadata preservation is not a new cryptographic verification of physical file contents. No file bytes were read in this task.

## 5. Frontend/gateway identity and recovery

Fresh authenticated provider GETs confirm:

| Component | Current target | Status |
| --- | --- | --- |
| `y-trace-admin.vercel.app` / `lydorg` | `dpl_AZ287kU35oFTVqyTEQRf749qncAA` | READY; approved target unchanged |
| `ytrace.app` / `yorbms_user` | `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ` | READY; approved target unchanged |
| Supabase `admin-storage-access` | ACTIVE v1, function ID `8ea84d1d-ab6b-40b3-8cc4-d78262fb182f` | Reviewed bundle identity unchanged |

Gateway compiled bundle SHA-256 remains `88e6e86352cdb3718e5687c1287b0bc73717a48f21b8c65aa97310744ab260e2`, matching the independent deployment receipt. Nine Edge Functions remain present. `verify_jwt=false` and custom server-side session authorization remain unchanged.

Approved release provenance is retained through those same immutable deployment IDs and earlier accepted artifact evidence:

- Admin source `0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324`; static inventory `1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d`.
- Organization source `0e3f313a4ca9c4a96242ab539767a5d2ad9a5e906483031c101e906f179d01dd`; static inventory `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94`.

No broad 53-asset acceptance, build, installed-PWA test, or one-time gateway acceptance was repeated. The previously accepted Organization 73/73 frontend, 1/1 SQL compatibility, and 8/8 classification results remain historical evidence, not new production-policy proof. The existing 651 TypeScript errors, avatar-retention defect, and Realtime limitations were not reclassified as passing.

Both Vercel projects still track `txiaoqt/lydorg`, production branch `main`. A shared-main push can replace both promoted releases. Keep a release freeze on shared-main pushes and competing promotions; use explicitly targeted isolated artifacts for any separately approved frontend change. No Git or provider settings were modified here.

Recovery requirements:

1. Before submission, obtain separate authorization naming exact target, SQL hash, native TLS execution route, historical dispositions, cleanup mitigation, and exclusive window. Refresh identity, full compatibility, foundation/trigger/grant evidence, release aliases, and preservation inventories. Do not waive drift or silently regenerate a baseline.
2. Submit the exact reviewed transaction once with an exclusive operation lock, durable attempt marker, and sanitized external receipt. Preserve its existing timeouts and history behavior. No `db push`, migration replay, alternate MCP submission, or appended reconciliation SQL.
3. Known pre-commit failure: verify atomic rollback and original 15-policy state read-only. Ambiguous result: retain marker/lock/evidence, reconcile authoritative state read-only, stop without resubmission.
4. After commit, verify the exact nine policies, untouched functions/triggers/grants, all 378 object records, protected business inventories, release aliases, and gateway. Any postflight mismatch stops further rollout.
5. Post-commit access failure: pause the affected operation, preserve restrictive authorization and all objects, and prepare an exact separately reviewed forward correction based on genuine ownership/parent evidence. Never restore bucket-only policies, broad DELETE/UPDATE, arbitrary-path signing, or older incompatible frontends.
6. Existing signed URLs may remain usable until their expiry. The gateway's normal one-hour duration is not proof of a universal maximum for historical URLs. Public news/sample/transparency buckets remain public by design; SELECT policy changes do not revoke direct public object serving. No bucket privacy or signed-URL lifetime was changed.

## 6. Evidence and remaining decisions

Fresh results:

- **PASS:** 20/20 local comparisons of current production read-only catalog/foundation/policies/object evidence against retained artifacts.
- **PASS:** six authenticated provider identity/alias checks; gateway ACTIVE v1 and receipt bundle match.
- **PASS:** metadata projection and current/public reference resolution described above.
- **FAIL:** existing Admin budget deletion permission/reporting contract, established by source/catalog inspection; no destructive proof attempted.
- **BLOCKED:** cutover execution pending operator dispositions, deletion mitigation, profile-delta/preservation review, fresh exclusive window, and separate authorization.
- **NOT TESTED:** new live production restrictive-policy authorization, production mutation/cleanup, private file hashes, and browser UAT in this task.

The first local comparison output (`comparison.json`) is preserved. It reported two false failures because the comparison helper keyed four marker triggers by a shared name instead of table+name, and assumed DROP POLICY used IF EXISTS. Correcting those parser mistakes produced `comparison-reviewed.json` with all 20 checks passing. No catalog gate, policy, or expected production value was relaxed; no production operation was retried.

Operator decisions are listed in `operator-decisions.md`. Stop here. This review is not cutover authorization.
