# Production Admin Storage gateway — execution report

**Project:** mqqaykksadotbrghbexz. **Gateway:** admin-storage-access. **Deployed:** October 12, 2026, 06:57:07 Asia/Manila (2026-10-11T22:57:07.880Z).

**Installation: PASS.** One supported explicit-project deployment was acknowledged; independent control-plane reads confirm ACTIVE version 1 and the approved normalized source. **HTTP boundary acceptance: 13 PASS / 0 FAIL.** Successful authorized signing/download and permission-specific resource checks are **BLOCKED**, so this is not complete functional acceptance or Storage cutover sign-off.

[Initial deployment receipt](deployment-receipt.json) records the actual acknowledgement. [Completion receipt](completion-receipt.json) records acceptance and remaining blockers. No automatic deployment retry, replacement or disablement occurred.

## Exact artifact and deployed identity

| Item | Verified value |
|---|---|
| Approved payload | 6,048 UTF-8 bytes; SHA-256 `3fe07c6f768703c23a4ad2fe36884fb9832c23826ae6712b159f189ffcb129b0` |
| index.ts | SHA-256 `97fba3f9c7a271860080b89f3f1c8710bdda3dccbe76961175d19d1154346248` |
| control.ts | SHA-256 `e6f422e179ebf93a6f7a1d99e0b901fa4b44e16db6d82da87e9448ee47b79f21` |
| Production function ID | `8ea84d1d-ab6b-40b3-8cc4-d78262fb182f` |
| Version/status | 1 / ACTIVE |
| Entrypoint/configuration | index.ts; control.ts companion; verify_jwt=false; no import map |
| Actual production compiled-bundle fingerprint | `88e6e86352cdb3718e5687c1287b0bc73717a48f21b8c65aa97310744ab260e2` |
| Staging bundle, unchanged version 1 | `564d0b5ceab9a63e8b81a824382fe565f045f1f794d3d9120b2fb5e9dc67fc8e` |

The production bundle fingerprint agrees across deployment acknowledgement, independent list/get and final inventory. It differs from staging, as permitted. Compiled binary bytes were not downloaded or independently rebuilt. [Retrieved production source](deployed-source.json) matches both approved source files after CRLF/CR-to-LF normalization and boundary trim; no raw-byte equality claim is made. Local source and approved payload hashes remain unchanged.

## Immediate preflight and exclusivity

- Fresh production/staging identities matched their exact control-plane projects. Production had eight existing functions and no gateway; staging was ACTIVE version 1 with unchanged reviewed source/bundle.
- Native PostgreSQL 17.6, verified TLS 1.3 chain/hostname and read-only transactions passed. Four foundation tables, fourteen functions/ACLs and eight triggers exactly matched the installation receipt.
- Compatibility SHA-256: `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5`. Migration count 164, latest 20261011230000; complete history MD5 `1f5eca911f6e2057ae070a955eaca3dc`.
- All 15 Storage policies and containment/document-security protections matched. A fresh snapshot of all 57 protected inventories was captured for before/after comparison.
- Sanitized Windows process inspection found no competing gateway deploy command. The live local operation lock was owned by PID 50872; the exclusive durable attempt marker was created immediately before submission. Local controls cannot exclude a future action by another machine; repeated control-plane reads detected no competing deployment.
- An initial sandboxed lock/artifact probe failed before submission. Trusted-context read-only inspection verified the same live owner and approved payload; no production request was repeated as a result. The lock remained alive through deployment and verification and was released through its exact nonce-checked owner path. The single-attempt marker remains retained.

Evidence: [preflight artifacts](artifact-preflight.json), [immediate control plane](immediate-control-plane.json), [database preflight](database-preflight.json), [deployed identity](deployed-identity-verification.json).

## Hosted server configuration

**PASS — metadata and runtime denial path.** Official authenticated CLI secret listing returned names/digests, not secret values. Required SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY were present; the URL digest matched the exact verified production origin. No hosted secret values were retrieved by the operator process, manually substituted, set or copied to a client.

The unchanged entrypoint used hosted server configuration. Three bounded requests reached the service-only production authorization RPC and its intended invalid-session branch, providing runtime evidence beyond secret-name presence. The custom Admin token still requires server validation; verify_jwt=false does not grant access.

[Configuration metadata](hosted-configuration-metadata.json) preserves the initial observation; [runtime authorization evidence](runtime-authorization-evidence.json) records subsequent verification. No valid Admin authorization or successful Storage signing/download is inferred from these denials.

## Actual bounded HTTP acceptance

All requests targeted only the new production gateway, with no genuine Admin token, private path or file content supplied. Each check ran once; execution would stop on its first unexpected response.

| Test | Actual HTTP | Result |
|---|---:|---|
| OPTIONS preflight | 204 | PASS |
| Unsupported GET | 405 | PASS |
| Unsupported PUT | 405 | PASS |
| Malformed JSON | 400 | PASS |
| Payload over 8 KiB | 400 | PASS |
| Missing custom Admin session | 400 | PASS |
| Invalid Admin token signing | 403 | PASS |
| Unauthorized private upload | 403 | PASS |
| Unauthorized private delete | 403 | PASS |
| Unknown bucket | 400 | PASS |
| Traversal path | 400 | PASS |
| Unauthenticated forged budget parent/path | 403 | PASS |
| Unauthenticated forged renewal parent/path | 403 | PASS |

All responses had Cache-Control:no-store, matched expected generic errors where applicable and contained no signed URL/token payload. No upload reservation, binary upload, deletion, metadata write or valid-session refresh was requested. [HTTP evidence](http-acceptance.json) records timings, byte counts and response hashes; [append-only journal](http-acceptance.jsonl) preserves each result without sensitive bodies.

### Runtime evidence clarification

The initial aggregate PostgreSQL SQLSTATE 42501 observation was insufficient to distinguish an ACL failure from deliberate denial. Read-only structured log context established that **all three errors were raised at line 7 inside admin_authorize_storage_operation**. The exact reviewed line is the invalid/expired Admin-session exception, deliberately using SQLSTATE 42501. This is **expected rejection, not a discovered permission defect**.

The same bounded window contains three PostgREST RPC HTTP 403 responses. Aggregate pg_stat_statements counters did not advance and were inconclusive; no historical count was treated as a current request rate. Two optional diagnostic queries (unsupported DESCRIBE and an unsupported guessed body-column query) failed and changed nothing. Subsequent diagnosis used known parsed.context fields and returned only aggregate counts/line numbers, without queries, tokens or raw messages.

## Blocked acceptance

| Check | Status | Exact blocker |
|---|---|---|
| One authorized signing, download and expected SHA-256 comparison | BLOCKED | No securely supplied existing genuine Admin session and operator-designated metadata-linked file/expected hash |
| Valid Admin denied an unauthorized resource or forged parent/path | BLOCKED | Genuine designated session unavailable; invalid-session path denials above do not prove this branch |
| Production permission-specific, expired or revoked genuine-session checks | NOT TESTED | No suitable existing operator-designated sessions; none were created, altered or fabricated |
| Template/news upload reservations or deletion | NOT TESTED | Excluded from this authorization |
| Frontend/PWA production compatibility | NOT TESTED | No frontend deployment authorized |

No existing browser session or database token hash was harvested to bypass the operator designation requirement. No account, session or fixture was created.

## Preservation after deployment and HTTP checks

**PASS:** [final database verification](database-acceptance-postflight.json) matches the immediate preflight for **57/57 protected inventories**, with zero differences, including 378 Storage objects, ten buckets, historical documents, accreditation/renewal records, Auth inventories and Admin sessions.

| Preserved foundation catalog | SHA-256 |
|---|---|
| Fourteen functions/owners/ACLs | `31c658a5d692e03262bf1952b1b493bce67e96f8d06da307da10e928a59af55a` |
| Four internal tables/RLS/grants | `e8a99cced6798451a93d4aca4eac5ca1a209ef3869cd367ac454215ec32eb85f` |
| Eight enabled triggers | `ab8eaa2be4f9dd4dfbb993f61cb42b99c41ad198c8af1345eb5ec5fc40b4416f` |

All 15 Storage policies, 164 migration records, four containment marker triggers, three document-security guards and existing function privileges remain unchanged. The Admin authorization RPC remains owner postgres / SECURITY DEFINER with service-role-only executable access. All previous eight production functions and staging's function are unchanged in [final inventories](final-function-inventories.json).

Branch remains ui-refactor, HEAD 2f6e7427c553b7535f53860d1732b42df7c023e8. The existing 64 tracked working-tree changes were preserved. No application or gateway source was edited. Local readiness/execution evidence and read-only/acceptance helpers were added. git diff --check passed; existing line-ending warnings remain recorded. No broad build/Vitest suite was repeated because the approved application source did not change.

## Next phase and recovery

**CONDITIONAL GO for separately authorized frontend preparation.** Before authorizing a production frontend that depends on the gateway, complete the blocked positive gateway signing/download check using an existing operator-approved genuine session/resource. Evaluate later template/news write acceptance separately without modifying preserved production evidence. Frontend deployment still requires separate authorization.

**Restrictive Storage cutover: NO-GO for execution under this release.** The existing permissive policies are unchanged, so the broader private-file exposure is not resolved by deploying this gateway. Historical compatibility decisions for previously classified unlinked private/inactive template objects remain separate prerequisites.

The deployed gateway remains ACTIVE. No correction, removal or disablement was performed or is indicated by the expected invalid-session errors. If a real defect is found during subsequent authorized acceptance, pause further rollout and prepare a separately reviewed forward correction or gateway-only fail-closed replacement/removal. Do not loosen grants/policies or restore vulnerable access. A future deployment with an ambiguous response must be reconciled read-only, never automatically retried.

Signed-read lifetime remains 3,600 seconds. Logout or cache invalidation does not revoke an already-issued URL. No signed URL was issued by this run.

**Stopped after gateway deployment, scoped verification and reporting. No frontend, policy cutover, migration, Auth/account change, historical-object edit, other-function deploy or Git push occurred.**
