# Storage security review — production rollout blocker

## Evidence and scope

Live project `mqqaykksadotbrghbexz` was inspected using SELECT statements only. Exact policies, grants and RLS flags are in `live-schema.json`; local PostgreSQL reproduction results are in `storage-authorization-matrix.json`. No production objects, signed URLs or account records were fetched to demonstrate exposure. No live authorization changes were made.

## Findings

**High priority: cross-organization Storage reads.** Private buckets `organization-documents`, `budget-request-files`, `liquidation-report-files`, `ypop-files` and `move-files` each have a `*_read_portal` permissive SELECT policy targeted to `PUBLIC` with only `bucket_id = '<bucket>'`. Ownership-restricted ALL policies coexist, but permissive SELECT conditions are combined with OR. The broad read policy therefore permits the read independently of owner/admin conditions. A bucket being private does not repair its SELECT authorization predicate.

**High priority: template metadata writes.** `template_files_admin_manage` is an ALL policy for `PUBLIC` with only `bucket_id = 'template-files'` in both USING and WITH CHECK. It does not test Admin authorization. With captured Storage grants, local anonymous fixtures could SELECT/INSERT/UPDATE/DELETE metadata for that bucket. `news_release_images_admin_manage` has the same bucket-only ALL pattern and requires review too. This task did not mutate real Storage or test live binary upload/delete endpoints.

The isolated harness reproduces these predicates for seven actor fixtures. PostgreSQL policy evaluation and captured grants are actual; auth identity/admin membership and objects are synthetic. This is evidence of a policy-level isolation failure, not a claim that a real production account was exploited or that object paths were enumerated.

## Client fixes implemented separately

Signed URL caches now separate account/session contexts, clear on auth/admin/logout/cross-tab transitions, discard stale pending responses, bound pending requests to 30 seconds, and deduplicate same-context signing. Positive client reuse lasts at most one minute and no longer than the known session lifetime. Failures are not cached; no public fallback or raw signing-error logs remain. Known-project legacy signed HTTP references are reauthorized. No signed URL is persisted by the resolver.

The server still issues URLs with the existing 3,600-second expiry. A previously issued URL remains a bearer capability until its server expiry; clearing a client cache cannot revoke it. Permission changes/suspension that do not trigger an auth transition are not instantly visible to this cache. The next preview after the one-minute client freshness expires attempts signing again, but the broad server policies currently defeat ownership denial. Already-open previews/downloads are not revoked by these fixes.

## Separate remediation proposal; no DDL prepared or applied here

1. Inventory every private read path and the custom Admin-token model. Admin tokens are independent of Supabase Auth JWTs; replacing bucket-wide reads with JWT-only Admin checks could break legitimate Admin previews.
2. Define resource ownership through file metadata → parent record → organization ownership, including renewal and suspended-organization rules. Reject anonymous reads of private organization documents.
3. Provide a narrowly authorized server signing path for custom Admin sessions that validates token expiry/revocation, permission, target resource and organization scope before issuing a short-lived URL. Any elevated Storage credentials stay server-side.
4. Replace bucket-only SELECT/ALL policies only after a separately reviewed authorization design and isolated regression matrix prove Organization A/B isolation and Admin compatibility. Restrict template/news writes to authorized Admin operations.
5. Review issuance lifetime and incident response separately. Do not assume a client cache change revokes already issued URLs.

This requires security/migration review and controlled staging validation. It is deliberately outside the 33-policy auth.uid() performance migration, which preserves current authorization semantics and does not touch Storage.
