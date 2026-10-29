# Production Admin Storage gateway readiness

Reviewed October 12, 2026 (Asia/Manila). **Preparation only; no deployment or live authorization request performed.**

**Decision: CONDITIONAL GO for one separately authorized gateway-only deployment.** Production foundation and source identity pass. Production runtime credentials and successful end-to-end signing remain acceptance gates after deployment. This decision does not authorize frontend deployment or restrictive Storage policies.

## Results

| Check | Status | Evidence |
|---|---|---|
| Exact production/staging identity | PASS | Fresh control-plane project IDs, names and endpoints in [control-plane evidence](control-plane-before.json) |
| Production foundation compatibility | PASS | [Native read-only verification](production-foundation-compatibility.json): PostgreSQL 17.6, verified TLS 1.3 chain/hostname, read-only transaction; all 14 functions, four tables and eight triggers exactly match the installed receipt |
| Production permissions and protective catalog | PASS | Service-only Admin authorization RPC; 15 unchanged Storage policies, 164 migrations; containment and document-security definitions/bindings preserved |
| Staging gateway identity | PASS | ACTIVE version 1, verify_jwt=false; deployed bundle and normalized source match prior review |
| Local source pins | PASS | Both files match [file-hashes.json](../20261011T113322Z/file-hashes.json) byte-for-byte; [comparison](source-comparison.json) |
| Server-side session/resource enforcement | PASS | Actual production function definitions plus unchanged handler reviewed; this is catalog/source evidence |
| Production gateway runtime environment | NOT TESTED | Gateway is absent; injected credential availability and validity cannot be certified from documented defaults |
| Production gateway HTTP signing/denials | NOT TESTED | No deployment authorized; valid-session validation can update last_used_at |
| Changes during this review | PASS | [Final inventory](final-control-plane-preservation.json): eight existing production functions unchanged, gateway absent; staging unchanged |

Branch: `ui-refactor`; HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty working tree preserved. Only readiness documents, source snapshots and the unsubmitted payload were added.

## Exact foundation fingerprints

Compared against [installed postflight](../native-executions/20261011T221428755Z/postflight.json), not the former foundation-absence baseline.

| Record | Fingerprint |
|---|---|
| Production compatibility SHA-256 | `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5` |
| Fourteen functions SHA-256 | `31c658a5d692e03262bf1952b1b493bce67e96f8d06da307da10e928a59af55a` |
| Four tables SHA-256 | `e8a99cced6798451a93d4aca4eac5ca1a209ef3869cd367ac454215ec32eb85f` |
| Eight triggers SHA-256 | `ab8eaa2be4f9dd4dfbb993f61cb42b99c41ad198c8af1345eb5ec5fc40b4416f` |
| Complete migration history MD5 | `1f5eca911f6e2057ae070a955eaca3dc` (164; latest `20261011230000`) |
| Admin authorization RPC definition SHA-256 | `3c84eba094d7a18ae2fd2d9bb66a5334b0a24a019075d063294d6e421e83209a` |

`admin_authorize_storage_operation(text,text,text,text,uuid,text)` is owned by postgres, SECURITY DEFINER, with fixed search_path. ACL is `{postgres=X/postgres,service_role=X/postgres}`; PUBLIC/anon/authenticated cannot execute it. Browser roles are not service_role members. The four internal tables retain RLS and no direct browser-role access. Selected read predicates intentionally have explicit browser-role EXECUTE; this does not expose the service-only Admin RPC.

Trusted origin is exactly `https://mqqaykksadotbrghbexz.supabase.co`. All 13 current template references and three published-news references resolve. The installation receipt established preservation of all 57 protected inventories and 378 objects; that full business-data comparison was not repeated for this catalog/source-only review. No database writes or mutation RPCs were issued.

## Gateway source and deployment identity

Only `admin-storage-access` in **production mqqaykksadotbrghbexz**; entrypoint `index.ts`, companion `control.ts`, `verify_jwt=false`, no import map.

| Exact submitted local file | Bytes | SHA-256 |
|---|---:|---|
| supabase/functions/admin-storage-access/index.ts | 1,479 | `97fba3f9c7a271860080b89f3f1c8710bdda3dccbe76961175d19d1154346248` |
| supabase/functions/admin-storage-access/control.ts | 4,182 | `e6f422e179ebf93a6f7a1d99e0b901fa4b44e16db6d82da87e9448ee47b79f21` |

Staging version 1 bundle: `564d0b5ceab9a63e8b81a824382fe565f045f1f794d3d9120b2fb5e9dc67fc8e`. Retrieved staging sources differ in raw bytes only by boundary whitespace/line endings; normalization is CRLF/CR to LF plus trim. Do not describe them as raw-byte identical.

[Prepared deployment payload](reviewed-deployment-payload.json): 6,048 UTF-8 bytes; SHA-256 `3fe07c6f768703c23a4ad2fe36884fb9832c23826ae6712b159f189ffcb129b0`. Source-package SHA-256: `cad8759f87965a10a83d927c335c1d01667ef4022099c1c1af0a560f8e3601be`. Exact serialization is recorded in the comparison. This file has not been submitted and is not an authorization record.

Use the supported Supabase deploy Edge Function API/tool with the explicit project, name, entrypoint, flag and two exact files. Do not use an implicit CLI project link or deploy other functions. Record the actual production version and compiled bundle after deployment; build metadata/dependency resolution can make its bundle hash differ from staging. SDK import is pinned to `@supabase/supabase-js@2.99.0` at esm.sh; no independent transitive build lock is supplied.

## Authorization review

- Each request first calls the service-only RPC, which validates the SHA-256-hashed custom Admin session against expiry/revocation and an active Admin account, then reads current database role permissions. Client caching does not replace this check; session expiry is not extended.
- Signing resolves authoritative metadata and parent ownership, checks the real Storage object/organization relationship and denies ambiguous ownership, unlinked files and unreviewable resources. Current and supported revision-history references are recognized. A path alone is insufficient.
- Registration/renewal, budget, liquidation and YPOP require their existing review permissions. MOVE requires Super Admin. Template/news operations require their applicable management permissions or Super Admin. Approved YORP documents also support the reviewed registry-read permission. No new permissions were invented.
- Signing derives its parent from bucket/path metadata. The optional resourceId is used for upload reservations, not as a signing-parent assertion. An irrelevant mismatched resourceId alone is not a reliable negative test; forged/unbound parent paths must be denied.
- Private organization buckets permit signing only through this gateway. Template/news uploads use a server-generated unique path, a bounded reservation and upsert=false. Their deletion is limited to eligible unreferenced assets/reservations. Existing referenced assets cannot be deleted through that operation.
- POST/OPTIONS only; 8 KiB streamed JSON limit; seven allowed buckets; bounded path/token/name lengths; traversal segments denied; one object per request; no arbitrary URLs or bulk signing. Every operation requires authorization before the service client is used.
- Errors are generic and handler code logs no tokens, signed URLs, paths or SDK responses. Responses use Cache-Control:no-store. CORS is not an authorization boundary.
- Existing frontend integration sends the custom token in JSON using the public client, rejects stale account-switch results and has no anonymous-signing fallback. No frontend change or deployment is included. Organization ownership, suspension and lifecycle rules remain unchanged.

### verify_jwt and server environment

Retain the staging-tested **verify_jwt=false** for this custom-session endpoint. The opaque Y-TRACE token is not a Supabase user JWT; platform header validation cannot establish Admin permission. Current [header documentation](https://supabase.com/docs/guides/functions/auth-headers) also permits API keys in headers, while [key migration guidance](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) recommends disabling JWT verification for newer key flows. Do not assume legacy JWT anon keys and modern publishable keys have identical behavior. Neither public-key acceptance nor this flag grants file access: mandatory server-side custom-session/resource validation does.

The unchanged entrypoint requires:
- `SUPABASE_URL=https://mqqaykksadotbrghbexz.supabase.co`
- An active, matching production `SUPABASE_SERVICE_ROLE_KEY`, exclusively in the hosted server runtime.
- Runtime network access to that project's PostgREST and Storage, and the pinned SDK dependency at build time.

Supabase documents these as [hosted default secrets](https://supabase.com/docs/guides/functions/secrets); documentation is not proof that the actual runtime key is available/valid. No values were fetched. SUPABASE_ names are reserved; do not copy staging keys, inject secrets into Vite, or silently change the reviewed code to a different key dictionary. Missing configuration fails closed; a broken credential must stop rollout. A local CLI help-only diagnostic failed on its telemetry-file permission before any remote secrets query; no CLI configuration was changed.

## Existing test evidence reused

No application source changed, so no completed staging lifecycle/UAT or broad automated suites were rerun.

- [Real staging identity-repair validation](../../../staging-validation/2026-10-10/identity-schema/repair-and-validation-report.md): 78 private-isolation assertions and 43 Admin gateway assertions passed; genuine owner JWTs/custom Admin sessions, actual HTTP denial and downloaded hashes. Primary evidence: identity-repair-private-02/org-isolation.json and admin-signing.json under that report's referenced real-storage-validation directory.
- The earlier run's mismatched optional signing resourceId expectation failed and remains recorded; the subsequent test correctly checked the forged parent/path. These overlapping runs are not added together.
- [Reviewed local validation summary](../20261011T113322Z/validation-summary.json): 48/48 Vitest, 8/8 classifier and four isolated SQL suites passed, including historical references and unknown-file denial. Synthetic SQL tests are not production HTTP tests. Previous local fixture failures remain documented.
- MOVE-specific live coverage and complete production gateway HTTP behavior are not established by the above four private workflow families.
- Current review: fresh production catalog/source/control-plane checks passed. Credential-safe artifact integrity and diff checks are recorded in the evidence manifest.

## Controlled deployment and acceptance sequence

1. Obtain separate explicit authorization using the [template](deployment-authorization-template.md). Confirm no competing gateway deploy and independently refresh production/staging identity.
2. Immediately recheck source/payload hashes, staging version/bundle, production foundation/ACL fingerprints, unchanged protections and gateway absence. Stop on drift.
3. Verify documented hosted production environment prerequisites without exposing values. Deploy exactly the reviewed two-file payload once to the fixed production project.
4. If submission is ambiguous, reconcile list/get function metadata and source read-only; do not resubmit automatically.
5. Fetch the deployed function; require ACTIVE, expected slug/project, verify_jwt=false, no import map and normalized source equality. Record actual version/bundle and unchanged other functions.
6. Exercise OPTIONS 204, unsupported GET 405, malformed/oversized input 400, invalid custom token 403, and rejected private upload/delete 403. These must disclose no credentials/URLs.
7. With separately permitted existing Admin-session/file access, sign one operator-designated metadata-linked file, verify returned origin/expiry privately and perform an authorized download/hash comparison where an approved expected hash exists. Session last_used_at may advance. Do not log the URL/token/content. If a session/resource/hash is unavailable, record the precise untested check; do not create users/sessions/fixtures.
8. Verify permission and bad-parent denials with safely available genuine test sessions/resources; do not fabricate expired/revoked tokens or revoke real accounts to manufacture tests. No upload, delete, reservation creation or metadata modification is included.
9. Confirm all foundation/protective catalog and 15 policies unchanged. Preserve a sanitized external deployment receipt. Stop before frontend or policy cutover.

## Recovery and remaining risks

On an uncertain deployment, stop and inspect the authoritative control plane. For a committed defective first deployment, keep policy cutover paused; prepare a separately authorized deny-all replacement or removal/disablement of only the new gateway. Do not remove foundation/containment/document guards, loosen policies, rotate project secrets, or assume verify_jwt=true disables every client.

Signed reads last 3,600 seconds. Logout/cache invalidation/session revocation do not revoke already-issued URLs; disclose only to authorized callers, avoid logging and allow expiry. This review does not authorize reducing lifetime or claim immediate revocation. Upload/delete capabilities need separately scoped live acceptance before their later frontend use; an empty delete response would not prove removal.

Existing broad Storage policies still expose files independently of the gateway; its deployment alone does not resolve that exposure. The 215 unlinked private objects and 56 inactive/unreferenced template objects remain denied by the new authorization design until reviewed compatibility decisions are made. Do not weaken checks or backfill silently. Historical inventory counts are prior evidence, not freshly reclassified in this task.

**Next-phase acceptance blockers:** unexpected source/catalog drift; unavailable/mismatched server credential; failed authorized signing or incorrect denials. **Broader cutover blockers:** compatible frontend/access verification, historical-object decisions and separately authorized restrictive-policy rollout. Rate/operational monitoring and reproducible dependency bundling remain documented limitations; no new infrastructure is proposed here.

Production gateway deployment is **CONDITIONAL GO pending authorization and runtime acceptance**. The broader Storage policy cutover remains **NO-GO for execution** at this release boundary. No production or staging changes were made.
