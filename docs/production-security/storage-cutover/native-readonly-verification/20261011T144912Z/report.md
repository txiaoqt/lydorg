# Native production PostgreSQL read-only verification

**Decision: NO-GO for Storage foundation installation. Native connectivity: PASS.**

Production: `mqqaykksadotbrghbexz`. Direct endpoint: `db.mqqaykksadotbrghbexz.supabase.co:5432`.
Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.
Read-only inventory captured **2026-10-11 14:48:17 UTC / 22:48:17 Asia/Manila**.

The existing probe and unchanged runner were each invoked once. The probe passed. The runner's `--preflight` stopped at `PROTECTED_DATA_OR_REFERENCE_DRIFT`. A separate read-only diagnostic confirmed actual changes in seven relation inventories. No installation, database write, Auth mutation, deployment, Git push, authorization record or installation attempt marker occurred.

## Results

| Check | Result | Actual evidence |
| --- | --- | --- |
| Private environment file | PASS | Exists, Git-ignored, untracked; all three required variables available through Node's supported `--env-file`. Contents and values were not printed. |
| Windows file protection | PASS | ACL inheritance disabled; exactly the current Windows user and SYSTEM have access; zero unexpected entries. |
| CA configuration and provenance | PASS | Configured local file matches its supplied SHA-256 and the exact certificate bytes fetched over verified HTTPS from Supabase's published production CA endpoint. No credentials were forwarded. |
| Reviewed artifacts | PASS | All eight input lengths/hashes match; runner bundle and SQL remain unchanged. |
| Independent control-plane identity | PASS | Fresh `get_project`: exact project/reference and direct host; `ACTIVE_HEALTHY`; platform version `17.6.1.127`. Local proof refreshed at `2026-10-11T14:46:21.031Z`; this is not an installation authorization. |
| Native authentication/TLS | PASS | Existing probe exited 0; certificate-chain/hostname verification enabled; TLS 1.3; database/current user/session user all `postgres`; explicit read-only transaction completed. |
| Native PostgreSQL version | PASS | Reviewed identity guard and separate diagnostic verified `server_version_num=170006` (PostgreSQL 17.6). |
| Future installation privileges | PASS | Reviewed native identity/privilege guard passed, including required roles, ownership, CREATE and target-table SELECT/TRIGGER privileges. |
| Exact production catalog | PASS | Runner passed the exact compatibility gate before reaching its later data guard. Catalog SHA-256 `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`. |
| Migration history | PASS | 164 records; latest `20261011230000`; full-history MD5 `1f5eca911f6e2057ae070a955eaca3dc`, enforced by the unchanged runner. |
| Existing protections and policies | PASS | Exact catalog gate includes existing function definitions/ACLs, four enabled containment marker triggers, three enabled document-security triggers and 15 unchanged Storage policies. Existing disabled test RPC definitions remain covered by this exact fingerprint. |
| Foundation absence | PASS | Probe and reviewed absence guard passed: namespace/RPCs/triggers absent; no competing foundation transaction or relevant lock detected. Namespace absence also excludes its internal tables. |
| Protected-data inventories | FAIL | 50 of 57 match; seven have changed counts and content fingerprints. |
| Storage inventory | PASS | 10 buckets and 378 objects; both complete metadata fingerprints match the preserved baseline. No binary files were downloaded. |
| Foundation installation readiness | NO-GO | Existing preservation gate must remain enforced; changed data requires review and a separately reviewed baseline. |

The published certificate endpoint is configured in the [official Supabase Dashboard source](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json). The actual downloaded certificate matched the configured local certificate byte-for-byte. The first public fetch failed with sandbox DNS `ENOTFOUND`; the supported network-permission fetch succeeded. Native database connections used the pinned direct route and strict TLS throughout.

## Confirmed protected-data drift

Preserved baseline: **2026-10-11 12:35:21 UTC**. Diagnostic snapshot: **2026-10-11 14:48:17 UTC**.

| Relation | Baseline rows | Current rows | Content fingerprint |
| --- | ---: | ---: | --- |
| `auth.users_inventory` | 94 | 95 | Changed |
| `auth.identities_inventory` | 95 | 96 | Changed |
| `public.user_profiles` | 94 | 95 | Changed |
| `public.user_roles` | 94 | 95 | Changed |
| `public.user_policy_acceptance` | 8 | 9 | Changed |
| `public.activity_logs` | 3333 | 3334 | Changed |
| `public.admin_sessions` | 483 | 484 | Changed |

These are real count/content differences, not merely JSON property ordering. The observations may reflect ordinary application activity; their legitimacy and cause were **not established**. No private row contents, identities, tokens or credentials were retrieved into the report.

All remaining 50 relation fingerprints match, including organization profiles, accreditation terms, renewals, registration/renewal document metadata, budget/liquidation/YPOP files, settings, published news and Storage metadata. The full count/match comparison is in [evidence.json](evidence.json).

## Artifacts preserved

- SQL: `docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql`
- SQL size: **47,407 bytes**
- SQL SHA-256: `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2`
- Runner bundle SHA-256: `69b01be6d530fc0539a44e05fa38c2962fa1b6cae289e063f77076a5518c61af`
- Existing 28/28 runner offline tests were not repeated. The reviewed runner, input manifest, SQL, preservation baseline and earlier reports were not edited.
- Local writes were limited to the sanitized control-plane proof and this new report/evidence folder. The existing dirty working tree was preserved.

## Remaining prerequisites

1. Review the seven changed inventories as legitimate production activity; do not delete or reverse records to satisfy the old snapshot.
2. Prepare an independently reviewed fresh preservation baseline if those changes are accepted. This is a pinned runner input: updating it changes the manifest/bundle hash and requires explicit review. No automatic rebaseline was performed here.
3. Require a fresh successful native preflight, an exclusive low-traffic window covering relevant business/Storage writes and schema changes, and a separate single-attempt production installation authorization naming the exact SQL and reviewed native route/bundle.

**Stop state:** foundation remains uninstalled; installation authorization, attempt marker and operation lock are absent. No further live operation is authorized by this report.

