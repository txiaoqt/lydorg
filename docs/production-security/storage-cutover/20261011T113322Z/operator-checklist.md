# Controlled production Storage release checklist

**Preparation only. No step below was executed against a live project.**
Target: mqqaykksadotbrghbexz. Staging deployment is not an implicit substitute.

## Phase 1 — Records/access decisions

- Review historical-object-matrix.json and the restricted operator inventory.
- Prioritize the two current-owner files with missing parents.
- Record a disposition for all 215 private and 56 template objects: retain with unresolved access denied, or investigate an authoritative retained-reference requirement. Do not label objects unused from missing rows.
- A decision to retain in place with denied access can unblock rollout without deletion/relinking.
- If any object needs historical access, review the exact authoritative source/parent/owner/permission association first. Do not add bucket-wide access or trust editable path/profile fields.
- Do not modify approved metadata, original bytes, revision history, accreditation, or fixture records to make an access test pass.
- Assign records owner, decision date, object IDs/path hashes and approved access expectation. Retention decisions are business approvals, not automatically produced by this classifier.

## Phase 2 — Storage foundation (separate production authorization)

Prerequisites:

- Independently confirm the Supabase control-plane project ID and https://mqqaykksadotbrghbexz.supabase.co endpoint. Verify database identity postgres/postgres and trusted connection role.
- Use explicit project_id on supported control-plane tools or a separately verified direct connection. Never rely on the repository's implicit CLI link.
- Match file SHA-256 against foundation-artifact.json using Get-FileHash -Algorithm SHA256.
- Run compatibility-fingerprint-readonly.sql and compare compatibility_sha256 exactly. Require 164 migration records and the reviewed full-history fingerprint. Stop on drift; no automatic rebaselining.
- Compare stored object/reference inventory again. Review new/unmatched paths rather than applying stale decisions.
- Confirm the containment/document hotfix remains preserved through catalog fingerprints; do not reinstall either.
- Verify table/function/schema creation and trigger privileges, current default grants and service_role availability.
- Establish an exclusive low-traffic schema-change window and operator lock. No competing DDL, grants, role changes or repairs.
- Review the exact standalone candidate. It creates a private namespace, four RLS-protected internal tables, 14 functions and eight binding/cleanup triggers; binds existing canonical/current public assets and registers only the production origin. It does not rewrite historical business rows or remove Storage policies.

Authorized execution, if separately approved:

- Execute production_storage_foundation_review.sql exactly once as one transaction.
- Retain 1s lock and 30s per-statement timeouts.
- No db push, migration replay, appended SQL or reconciliation.
- This candidate intentionally has no database migration receipt. Preserve an external receipt; stop for a newly reviewed candidate if an in-database receipt is mandatory.

Postconditions:

- 14 function source/security/grant records match expected-foundation-functions.json.
- Inspect all eight trigger definitions, table bindings, enabled flags and guarded function identities, not only their count.
- Four internal tables have RLS enabled; anon/authenticated have no table DML rights.
- RPC EXECUTE denied to PUBLIC/anon/authenticated; allowed to service_role.
- Trusted origin registry contains only the exact production origin.
- Current canonical templates and production-origin HTTP news references resolve; no active/published Storage reference remains unresolved.
- Existing functions, markers, lifecycle guards, RLS policies, default grants and migration history remain unchanged. Storage policies are still the original 15 at this phase.
- Verify pre/post business/object fingerprints, external transaction receipt and exact commit outcome.

## Phase 3 — Admin gateway (separate authorization)

- Foundation must be installed and its postflight pass first.
- Review only supabase/functions/admin-storage-access/index.ts and control.ts at pinned hashes in file-hashes.json.
- Deploy admin-storage-access only to the explicit production project, with verify_jwt=false for the custom Admin-token design.
- Example future command, **not executed**:
  supabase functions deploy admin-storage-access --project-ref mqqaykksadotbrghbexz --no-verify-jwt
- Use a trusted server environment for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never copy that key into VITE_* variables, browser scripts, build arguments or logs.
- Verify the deployed function source/bundle identity, exact project URL, auth setting and server secret availability without printing values.
- Confirm POST input bounds, generic no-store failures, authoritative RPC grant binding and absence of client-path signing bypass.
- Confirm direct browser calls cannot invoke the service-only RPC.
- Keep signing lifetime at the verified 3600 seconds for this release. A shorter lifetime needs separate workflow validation.

## Phase 4 — Compatible frontend (separate application authorization)

- Review/isolate the existing gateway integration from the dirty tree; preserve unrelated performance, identity, PWA and report changes.
- Required files: src/lib/admin-storage-access.ts, lydo-connect-supabase.ts, signed-storage-url-cache.ts, admin-auth.ts and supabase.ts. Include their actual imports/dependencies and permission-gated existing UI.
- Private Admin preview/download goes through the gateway. Template/news upload uses server-issued unique paths, signed-upload tokens and existing metadata RPCs.
- Confirm gateway refusal never falls back to anonymous/private public-URL access.
- Preserve genuine owner-JWT Storage access, TUS, scoped queries, account-switch invalidation and selected-file-only signing.
- Pin the deployed frontend commit/build and run focused build checks before deployment. A local source hash does not prove the hosted application uses that code.
- Gateway must be available before this frontend becomes active: the existing candidate deliberately has no insecure legacy fallback.
- Drain/replace old frontend sessions in a controlled way and communicate reload requirements without silently erasing drafts. Old tabs with the old direct-signing implementation will fail after restrictive cutover.

## Phase 5 — Legitimate-access verification (separate authorization)

- Use authorized existing operators/users for scoped previews/downloads, or obtain explicit approval for a safe production verification fixture. Do not manufacture test accounts or use retired legacy credentials.
- Verify Admin registration/renewal/YORP, budget, liquidation and YPOP links through the deployed gateway.
- Verify role-specific refusals, invalid/revoked/expired custom sessions and unknown parent/path refusals using approved tests.
- Session validation updates last-used time; this task's read-only inspection does not authorize those calls.
- Verify actual permitted file hashes only with explicit access authorization. The current path hashes are not content hashes.
- Verify current public templates, template/news management by appropriate Admin permissions, and existing public news rendering.
- Read-only candidate helpers can project policy decisions before cutover, but old permissive policies mean live organization Storage tests before cutover do not prove post-cutover isolation.
- Reuse unchanged staging HTTP evidence and the production-metadata local projection; do not call that production HTTP coverage.
- Preserve the historical retention decisions and freeze the exact reviewed cutover scope.

## Phase 6 — Atomic restrictive-policy cutover (new explicit authorization)

Required before requesting execution:

- Records-owner dispositions recorded, including any accepted denial of historical access.
- Foundation, gateway, compatible frontend and access verification completed.
- Fresh read-only compatibility gates and object/reference difference review pass.
- Exact SQL SHA-256 from cutover-artifact.json verified.
- All 14 foundation functions/grants, trusted origin, eight triggers and four internal-table permissions verified.
- Original 15 Storage policies still match the exact expected manifest, with no extra permissive override.
- Exclusive low-traffic window and single execution lock.
- Review production_storage_policy_cutover_review.sql independently; it is a draft until these external dependencies pass.

Only then may the trusted operator attest app.storage_remediation_validated=on in the controlled connection and execute the exact candidate once. This setting documents completed testing; it is not an authentication control or permission substitute.

The transaction removes only the 12 targeted policies and creates six. It requires exactly nine final policies, preserves all other catalog fingerprints and leaves migration history at 164. Do not append a receipt or other migration.

## Phase 7 — Post-cutover verification

- Fresh catalog: six ytrace_* policies plus the three retained policies; no legacy or extra broad private override.
- Verify function/grant and trigger fingerprints, containment/lifecycle protections, bucket privacy/configuration and business/object fingerprints.
- With approved ordinary owner sessions, verify allowed reads and permitted lifecycle operations; cross-organization/anonymous denials using approved non-destructive scenarios.
- Approved records remain immutable; no negative overwrite/deletion experiments on preserved evidence.
- Authorized Admin signing works; insufficient permissions, invalid sessions and unknown resources fail closed.
- Templates/news management works through the gateway; current public catalog downloads and news rendering remain available.
- Verify cache/session isolation and absence of mass signing/binary downloads. Do not log URLs or tokens.
- Record actual HTTP results and whether they were freshly executed. Pause the affected workflow on unexpected successful access.

## Failure and recovery

Before COMMIT: bounded timeout/drift/postcondition failure must roll back the whole transaction. Reconcile exact catalog and data fingerprints read-only; retain evidence.

Uncertain response: stop, inspect namespace/policies/function hashes and transaction state read-only. Do not automatically retry.

After foundation: keep the foundation if gateway deployment is delayed; old policies are not yet removed. Restrictive cutover remains blocked.

After cutover: preserve restrictive policies and lifecycle/containment guards. Pause affected UI operations or gateway access if necessary, and prepare a narrowly reviewed forward correction. Do not restore broad bucket-only policies, grant anonymous writes, remove guards or edit historical rows as recovery.

Issued signed URLs remain bearer access until their server-defined expiry. Client cache invalidation/logout is not revocation. Historical issuance lifetimes outside the app are unknown; 3600 seconds is the current application/gateway issuance setting, not a universal drain guarantee. If urgent revocation is needed, coordinate supported Storage signing-key incident response with Supabase; do not assume Auth key rotation revokes Storage URLs.

Public news image HTTP serving bypasses private SELECT-policy protection because that bucket is public. Keep its intended public-read behavior; archiving a news row is not object revocation.

Official reference: [Storage bucket access fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage download and signed-URL behavior](https://supabase.com/docs/guides/storage/serving/downloads).

