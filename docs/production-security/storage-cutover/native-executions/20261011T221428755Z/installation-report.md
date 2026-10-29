# Production Storage foundation installation — PASS

**Foundation installed and independently verified. No subsequent rollout phase was executed.**

- Project: `mqqaykksadotbrghbexz`.
- Native direct TLS host: `db.mqqaykksadotbrghbexz.supabase.co`. Route: `native-pg-direct-tls`.
- Branch: `ui-refactor`. HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty working tree preserved.
- COMMIT acknowledged and runner postflight completed: **12 October 2026 at 06:14:30 Asia/Manila (UTC+08:00)** (`2026-10-11T22:14:30.691Z`).
- Independent read-only verification: 12 October 2026 at 06:15:50 Asia/Manila (UTC+08:00) (`2026-10-11T22:15:50.198Z`).
- Exactly **one SQL submission; zero automatic retries**. Original atomic BEGIN/COMMIT, 1-second lock timeout and 30-second per-statement timeout retained.
- Exclusive window was explicitly confirmed by the human user before the immediate preflight and submission. Local operation lock was acquired by the runner and released after verification. The durable attempt marker is retained; it must not be cleared to repeat this attempt.

## Authorized artifacts

| Artifact | Verified value |
| --- | --- |
| SQL length | 47,407 bytes |
| SQL SHA-256 | `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2` |
| Reviewed runner bundle SHA-256 | `481a2f5372bf28dd9b8bc04d8691aa5555ca9c5454cf07346012aaf065700fd9` |
| Reviewed preservation baseline SHA-256 | `60a25f959aa2e45ab384cb41702f5eb13b93bdfe9ef71049b99eeceb5bde5d9a` |
| External execution receipt SHA-256 | `eb76652902c04eaf1b19de003622fc9fd8271ec507f71f0d0c78856bb8916e55` |

SQL: ../../20261011T113322Z/production_storage_foundation_review.sql. Runner: ../../native-runner-20261011T132539Z/native-foundation-runner.mjs. The runner loaded the exact pinned artifact bytes; no SQL, runner source or manifest edits were made in this execution.

## Preflight and transaction evidence

- Fresh authenticated Supabase control-plane lookup matched the production project, direct database host and ACTIVE_HEALTHY status.
- PostgreSQL 17.6 (170006), database/current user/session user postgres, port 5432; native TLS 1.3 with certificate-chain and hostname verification. Configured CA hash and certificate bytes independently matched the official Supabase production CA over verified HTTPS.
- Required roles, function ownership, CREATE/TRIGGER privileges, exact catalog fingerprint, default grants and migration history matched. Foundation was absent; relevant database operation/lock checks were clear.
- Immediate targeted Windows inspection classified all 12 Node processes; zero foundation runners and zero unavailable command lines. No raw arguments were printed.
- All 57 protected inventories matched the newly authorized baseline. No inventory was omitted or silently refreshed.
- The existing runner reran the full read-only preflight on the same single pg.Client before submitting the unchanged SQL.
- `COMMITTED_AND_VERIFIED` requires the driver result sequence to end in COMMIT and all internal postflight verifiers to succeed. Independent verification used a new read-only TLS connection, not the installation connection.

## Independent verification results

| Check | Result | Evidence |
| --- | --- | --- |
| Foundation internal tables | PASS | Four expected tables; RLS enabled; owner postgres; reviewed owner ACL; no direct public/anon/authenticated/service_role table privileges |
| Foundation functions | PASS | 14 exact definitions, owners, security modes, volatility, search paths, ACLs and effective grants match the reviewed expected-functions file |
| Foundation triggers | PASS | Eight exact bindings/definitions; all enabled O |
| Admin authorization RPC | PASS | SECURITY DEFINER; owner postgres; public/anon/authenticated EXECUTE denied; service_role EXECUTE allowed |
| Trusted Storage origin | PASS | Exactly https://mqqaykksadotbrghbexz.supabase.co |
| Templates | PASS | 13/13 current active templates resolve and all 13 objects exist |
| Published news images | PASS | 3/3 published references resolve and all three objects exist |
| Existing Storage policies | PASS | All 15 remain unchanged; no restrictive cutover was executed |
| Containment protections | PASS | Four marker triggers unchanged/enabled; exact retained function catalog includes all 12 disabled test-mutation RPCs; environment guard FALSE |
| Document lifecycle hotfix | PASS | Three security triggers and existing function definitions/privileges unchanged |
| Protected records/Storage metadata | PASS | All 57 inventories match immediate preflight AND authorized preservation baseline |
| Migration history | PASS | 164 records; latest 20261011230000; full history MD5 `1f5eca911f6e2057ae070a955eaca3dc` |
| Local attempt controls | PASS | Durable marker retained; operation lock released; credential/approval/marker paths ignored and untracked with operator/SYSTEM-only ACLs |

No production business mutation or test-mutation RPC was invoked to demonstrate denial. Containment and document-guard preservation was verified by exact current catalog fingerprints and enabled trigger bindings.

## Exact catalog and permission fingerprints

| Scope | SHA-256 |
| --- | --- |
| `existingCatalogSha256` | `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5` |
| `foundationFunctionsSha256` | `31c658a5d692e03262bf1952b1b493bce67e96f8d06da307da10e928a59af55a` |
| `foundationTablesSha256` | `e8a99cced6798451a93d4aca4eac5ca1a209ef3869cd367ac454215ec32eb85f` |
| `foundationTriggersSha256` | `ab8eaa2be4f9dd4dfbb993f61cb42b99c41ad198c8af1345eb5ec5fc40b4416f` |
| `storagePoliciesSha256` | `7e1b100bafecd97a5d7ae26cf2416999c5f0940a60acc1499bc970a94e975ee6` |
| `containmentTriggersSha256` | `134c036655c997919a9cc0b873ae7f521419b746ef4521858e4dd3a8b7be4b38` |
| `documentSecurityTriggersSha256` | `7c6ac12418623c36145f617917db808b65565ed2ea68c81352504a8b92961abf` |
| `protectedInventoriesSha256` | `a290322cf0424220b21954ae3bbac934f0552534336e64cd75c6362f88e519c3` |

The following function definitions and ACLs were compared individually against the reviewed expected-functions artifact, not only counted:

| Function signature | Definition SHA-256 | Owner / mode / volatility | Effective EXECUTE roles excluding owner |
| --- | --- | --- | --- |
| `admin_authorize_storage_operation(text,text,text,text,uuid,text)` | `3c84eba094d7a18ae2fd2d9bb66a5334b0a24a019075d063294d6e421e83209a` | postgres / DEFINER / VOLATILE | service_role |
| `ytrace_storage_private.asset_reference_audit()` | `9d0acd4433346b21242aaef4e839bf829e85648436090b7225ea8aa18be95c49` | postgres / DEFINER / STABLE | service_role |
| `ytrace_storage_private.backfill_asset_bindings()` | `c407045ee2ed682a74731e8fc843824cb49b26e4cbfd54a586058666b96f8532` | postgres / DEFINER / VOLATILE | none |
| `ytrace_storage_private.is_active_template(text)` | `2475a9f11ebc1d35490513e17e2199b5da80c4e0887b990c70a8af34a0a44c5b` | postgres / DEFINER / STABLE | anon, authenticated |
| `ytrace_storage_private.is_public_avatar(text,text,text,text)` | `06781cd38bd5af95339eb45f474eec1db1d23dfa05dd90ddb9b08c1595c3f657` | postgres / DEFINER / STABLE | anon, authenticated |
| `ytrace_storage_private.is_published_news_image(text)` | `5dcd413150b580a341cd332182b66a4804a179714f462b01dcbc98e2dccb03de` | postgres / DEFINER / STABLE | anon, authenticated |
| `ytrace_storage_private.organization_object_access(text,text,text)` | `e50cbd92531495a7fc97a2c8334a88d9dd27ae2c4a3a851ed01ebc4a9e3c9934` | postgres / DEFINER / STABLE | authenticated |
| `ytrace_storage_private.parent_context(text,text)` | `1fd6c58c2694a6fd5d9821617b3750fdd53b3701a11928de72578262ed9180e3` | postgres / DEFINER / STABLE | none |
| `ytrace_storage_private.public_asset_reference(text,text)` | `02bee275e0b179abd322e113f5aeee34bd113c6c20c4f0a135be5d73a2105d0b` | postgres / DEFINER / STABLE | none |
| `ytrace_storage_private.register_trusted_storage_origin(text,text)` | `e938ed7a6092b298aacc039b1928684ed15ea7cb078d5652d01b389c9a9c30e0` | postgres / DEFINER / VOLATILE | service_role |
| `ytrace_storage_private.remember_asset_binding()` | `49ca5266716f9ca335c95644886e2ef07f2b766b999c0321364303b563d9caaa` | postgres / DEFINER / VOLATILE | none |
| `ytrace_storage_private.remember_draft_cleanup()` | `630438e720668bcc8d552ac067d538b67d7a0c69e52ff919df35c61c719c53d4` | postgres / DEFINER / VOLATILE | none |
| `ytrace_storage_private.resource_references(text,text)` | `62f68a7628befabc92aa6a036209202d2d30f30153a68822031746ecbbddc438` | postgres / DEFINER / STABLE | none |
| `ytrace_storage_private.url_decode(text)` | `7ba530325fb6c01686130f6aaaa1e4a2ea309ca043b4ba0ef7b66b38c1ba7143` | postgres / INVOKER / IMMUTABLE | none |

PUBLIC EXECUTE is false for all 14. Deliberately granted predicate helpers are distinct from private mutation/authorization routines; the service-only Admin gateway RPC is `admin_authorize_storage_operation(text,text,text,text,uuid,text)`. Complete ACL strings, search paths and source/definition MD5 values are retained in independent-postflight.json.

### Internal tables

| Table | RLS | Owner | Direct public/anon/authenticated/service_role access |
| --- | --- | --- | --- |
| `ytrace_storage_private.admin_asset_uploads` | true | postgres | denied |
| `ytrace_storage_private.asset_bindings` | true | postgres | denied |
| `ytrace_storage_private.cleanup_receipts` | true | postgres | denied |
| `ytrace_storage_private.trusted_storage_origins` | true | postgres | denied |

### Trigger bindings

| Trigger | Table | Enabled | Definition SHA-256 |
| --- | --- | --- | --- |
| `ytrace_activity_cleanup` | `public.ypop_org_activities` | O | `39b3a064aa141df05c40872c9647ed0cf0290345b71bed50b498aaf19fc636ab` |
| `ytrace_budget_cleanup` | `public.budget_requests` | O | `43cc855d01fa59991abc67dd3d6bb45194e6e3d7fc8f154b4b159d54cc035ff0` |
| `ytrace_event_cleanup` | `public.ypop_event_participations` | O | `7c0375e8e537e7f17db7718c55212d87fbcfd146af8ec827d5bc020b2b445ede` |
| `ytrace_liquidation_cleanup` | `public.liquidation_reports` | O | `157b643a351d61faba6c08fca31355cc4c35c43c369236d67ee3e3c72301a07a` |
| `ytrace_move_cleanup` | `public.move_applications` | O | `3043c1771d3b18a28696813a90084f84175ff2e224215881943b5783d8b1d0ae` |
| `ytrace_remember_news_asset` | `public.news_releases` | O | `3d25b746b741985db814eb839849c028bcc537f8cc14bcda02f22804bfc7c27c` |
| `ytrace_remember_template_asset` | `public.required_document_types` | O | `9fb0c11cb8db265f69bd6f5c476ef1d91e6081515c55134a58738fe5278ab786` |
| `ytrace_ypop_cleanup` | `public.ypop_entries` | O | `f648644600005d1134cc67a74580a399ca62a444ed0c22f99341b933e403e6d8` |

## Preserved production inventory

| Relation | Rows before → after | Content fingerprint |
| --- | --- | --- |
| `public.admin_accounts` | 2 → 2 | `6667025b4e95390384c3e8d21ebd86b9` |
| `public.document_submission_files` | 547 → 547 | `86e23905698f1463ca8324b2f2fdee29` |
| `public.document_submissions` | 92 → 92 | `cc28a4388e2ed0a521c1a57f6ee6f54d` |
| `public.organization_accreditations` | 89 → 89 | `61c8deb3bf9495fde59e613cc4f9b7f4` |
| `public.organization_profiles` | 92 → 92 | `52f00b0d86d0c583a56143629fd7409a` |
| `public.organization_renewals` | 0 → 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `storage.buckets` | 10 → 10 | `832ce1466eb597a15f1082c9544eb540` |
| `storage.objects` | 378 → 378 | `67284160e3ab4a273194aad042e84e40` |

All other protected inventories also match exactly. No historical organization, accreditation, renewal, business document, Auth, Admin-session or Storage-object data covered by the 57 inventories was rewritten. Only the expressly reviewed new foundation internal state was initialized. Physical object content was not downloaded or changed in this installation.

## Receipts and execution controls

- [preflight.json](preflight.json): 10258 bytes; SHA-256 `e2c43a5bd4540b12963b71db092c95a8335832efcb5c18b60cbb40a6b2dfec66`.
- [execution-receipt.json](execution-receipt.json): 303 bytes; SHA-256 `eb76652902c04eaf1b19de003622fc9fd8271ec507f71f0d0c78856bb8916e55`.
- [postflight.json](postflight.json): 32592 bytes; SHA-256 `c9c36078f3ff41f05b0f72740bf7e711c374d5dceb40b3e493072fdefba27bc5`.
- [independent-postflight.json](independent-postflight.json): 36906 bytes; SHA-256 `a549cf9bb3e8cd3c95d07ff71bf2d7417e9509f2d1ddcbd3e2f8572cf5c63b37`.
- [evidence-manifest.json](evidence-manifest.json) binds the external receipt and verification artifacts.
- Pre-execution evidence and the human-window confirmation are preserved at `docs/production-security/storage-cutover/native-executions/preflight-20261011T155454084Z`. An earlier local evidence-capture error and sandbox-only process-inspection denial were retained; supported verification subsequently passed before the first database write. Neither was a foundation SQL submission.
- Attempt marker: `.agent/security/production-storage-review/native-foundation-attempt-started.json`; attempt 1, started `2026-10-11T22:14:28.761Z`. Kept at its ignored, restricted path.

## Remaining scope and risks

- This installation is **PASS for the Storage authorization foundation only**. It does not establish that the production Storage authorization cutover is complete.
- Existing permissive Storage policies remain active and unchanged. Their previously documented exposure remains until the separately approved gateway/frontend dependencies and restrictive cutover are completed.
- Admin gateway deployment, compatible frontend deployment, historical-object compatibility decisions and restrictive-policy cutover remain separate releases requiring their own review, fresh preflight and explicit authorization.
- No Auth operations, object deletion/relocation/relinking, staging changes, unrelated migrations, application deployment or Git push occurred.
- If a post-install defect appears, preserve containment/document guards and use a separately reviewed forward correction or fail-closed pause. Do not reinstall this attempt or restore vulnerable definitions.

**Verification is complete. The exclusive execution window may end. Stop here; no Admin gateway deployment or other rollout action is initiated.**
