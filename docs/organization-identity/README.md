# Duplicate organization identity — local implementation report

8 October 2026 · Asia/Manila · project `mqqaykksadotbrghbexz`

**Update: the user authorized migration application on 9 October 2026. `organization_identity_review` is applied to project `mqqaykksadotbrghbexz`, recorded as version `20261008174154` (9 October 2026, 1:41:54 AM Asia/Manila). Frontend and Edge changes remain undeployed. No identities or financial rows were merged, reassigned, or backfilled. Existing uncommitted upload/export work was preserved.**

## 1. Existing protections

The read-only audit found ownership RLS on organization profiles and financial/accreditation/renewal tables; one profile per Auth user; unique normalized supplied URNs, official URNs and verified URNs; custom admin session tokens; document approval/URN verification boundaries; and per-organization accreditation/renewal cycles. Auth metadata creates ordinary applicant/youth access, not admin privileges. Profile RLS permits the owner or the existing server-side admin role check; no anonymous profile-read policy was added.

See [audit and recovery design](audit-and-recovery-design.md) for the ten-flow map. Both case/whitespace matching and the proposed NFKC/punctuation/abbreviation normalization found **0 exact candidate groups / 0 affected records** in the live read-only count. This does not certify that all real-world or fuzzy duplicates are absent; no identities were automatically reconciled.

## 2. Remaining bypass paths and limits

Before this feature, another email/Google account could submit a new profile and omit its URN; unique identifiers alone did not detect an organization-name variation. Client profile upserts sent verification timestamps/notes, and an UPDATE-only URN trigger used a nullable custom setting comparison.

The proposed guards cover direct INSERT/UPDATE, metadata/GUC privilege attempts, automatic/manual/URN verified transitions, and new submitted budgets. A confirmed existing/rejected/more-information case cannot escape its hold through rename, profile removal, Auth cascade, or a new budget on the applicant ID. Existing organizations are not interrupted merely because a later applicant reuses their name.

A completely unrelated new name/location/URN omission under another Auth account cannot be proven to be the same real organization from available signals. Manual official-document verification remains necessary. Names are never identity proof. Trusted database owners/service code can administer the database; this feature is not protection against a compromised database owner. Candidate lists are bounded at 21 and fail closed at that limit; unusually broad groups need a scoped investigation before clearing. No automatic merge or global organization preload was introduced.

## 3. Matching strategy

Shared JavaScript and SQL normalization: NFKC Unicode, lowercase, whitespace collapse, punctuation separation; conservative `org`, `assoc`, `inc` aliases. Exact normalized name is a candidate across barangays. Same first-two-word anchor plus same barangay, or trigram similarity >=0.82 in the same barangay, produces candidates. District and verified status/official URN are review signals. Email, representative, adviser and telephone are not identity proof.

GIN trigram and exact/anchor indexes support bounded server lookups. Public checks return exactly a generic outcome, not candidate records. Exact supplied URN conflicts are checked independently of candidate limits. Anonymous traffic shares a 30/minute bucket; authenticated users have their own 30/minute bucket; a global 120/minute bucket bounds workload. Exhaustion/failure gives CHECK_UNAVAILABLE. Shared anonymous throttling can reduce availability during a burst and needs traffic tuning; it is not a replacement for edge/WAF abuse protection.

## 4. Signup and Google onboarding

Both screens use a 650ms debounce, cancel stale results, and display neutral generic notices. Google/onboarding headquarters details strengthen the lookup. Exact URN conflict prevents claiming the identifier; possible matches/unavailable checks do not imply verified privileges. The database profile trigger rechecks authoritative details regardless of provider or frontend state.

The profile persistence helper now uses scoped UPDATE for an existing profile and INSERT for a new one, preserving reviewed identifiers and verified status and omitting client-written review timestamps/internal notes. This avoids INSERT ... ON CONFLICT invoking INSERT guards on legitimate verified profile edits. Concurrent first-time creation still relies on the unique user_id constraint; a losing request may need to reload. Direct verified-profile REST upserts are intentionally unsupported; use authorized UPDATE/server review boundaries.

The old URN availability fallback that queried private organization profiles on RPC failure was removed; an unavailable service now reports an error.

## 5. Admin review

Integrated into existing Registrations, including the Existing URN branch. Fetch occurs only when the reviewer clicks the selected organization's identity check. Result state is scoped to organization/user/role/permissions, preventing late responses from another selection/session being displayed.

Four actions: Confirm Different, Confirm Existing, Request More Information, Reject Unsupported Claim. Every RPC validates the custom session and active admin account, requires `registrations_management` or super_admin, and records reviewer ID, timestamp, decision, reason and official evidence reference. Candidate/profile details and current candidate fingerprints determine a version; stale decisions fail. Separation applies only to that reviewed pair/details. Multiple candidates each require resolution. Decisions do not approve documents/accreditation. Additional evidence collection uses existing PCYDO communications; no new messaging transport or notification is sent by these actions.

## 6. Canonical identity and recovery

Confirm Existing stores an audited canonical reference to the original verified/retained official organization, including an expired historical identity. When both attempts are pending, an explicit admin evidence decision may retain the earlier original registration; it remains pending and must still pass document/URN approval. Later pending applicants cannot replace that original identity or form link chains. Client timestamps are server-assigned/immutable so an applicant cannot forge an earlier registration. Confirmed aliases are excluded as new duplicate candidates for their own canonical root only after that authorized same-identity decision; their IDs remain in the related-history view. This never changes user_id, merges rows, resets debts, copies histories, or grants another applicant access. Confirmed canonical links cannot be unlinked through this review action.

Ownership changes are explicitly blocked pending the [reviewed recovery design](audit-and-recovery-design.md). The current one-user-per-organization/Auth cascade schema needs a separately reviewed access/membership model, identity proof, authorization, session revocation, concurrency handling and lawful retention/anonymization before ownership transfer is implemented. Authorized packets/UI also expose a bounded list of related confirmed registrations, scoped to the canonical identity, so previous IDs remain traceable after name changes. Any future eligibility policy must aggregate the original and retained confirmed-related IDs; it must not assume only one ID has historical records.

## 7. Obligations and renewal continuity

Budgets, liquidations, accreditation cycles, renewal records, document submissions and YPOP records retain their original organization_id; owner reassignment is rejected. The original identity and its retained records remain accessible to authorized administrators. Pending/confirmed-existing applicants cannot submit a clean new budget on their new profile. Existing budget workflows continue; this feature adds no liquidation-blocking status.

The 90-day early and 180-day late renewal rules were not edited. Re-registration is a process attached to the historical identity, not authority to create a fresh identity with no obligations. Confirm Existing after the cutoff does not create active accreditation. New-account recovery after a cutoff follows the separate recovery design.

## 8. Deletion findings and proposed safeguards

The existing canonical RPC deletes financial/accreditation/renewal/document/YPOP/compliance/URN children before deleting the profile. Auth deletion cascades to profiles and their histories. Edge cleanup order is database -> Auth -> Storage; a profile-only deletion guard would be too late for explicit child cleanup.

Consequences were documented before proposing local changes. The migration adds a pre-cleanup retention check inside the existing canonical function, preserving its OID/dependent calls and existing cleanup/protection/audit logic. It fails migration review if the audited insertion marker changed. A profile DELETE guard covers Auth cascades. Retained scope: established verification, accreditation/renewal history, submitted budgets, liquidations, canonical references and audited identity holds. Unestablished drafts without retained official records/holds keep the existing deletion route.

Edge preflight and cleanup fail closed when eligibility is unavailable, and the database rechecks under the profile lock. This is a **retention-review pause**, not an invented permanent retention period. Approval is needed for archival, lawful privacy erasure/anonymization, treatment of rejected/pending claims, retention durations, and evidence/audit retention. The approved migration now activates the database retention guards; the Edge preflight change remains undeployed.

## 9. Files changed for this task

Modified:
- `src/pages/SignUp.tsx`
- `src/pages/GoogleOnboarding.tsx`
- `src/admin/AdminPortal.tsx`
- `src/lib/urn-validation.ts`
- `src/lib/lydo-connect-supabase.ts` (targeted profile persistence change; prior upload work preserved)
- `supabase/functions/delete-organization-account/index.ts`

Added implementation:
- `src/lib/organization-identity.ts`
- `src/lib/organization-identity-api.ts`
- `src/hooks/use-organization-identity-check.ts`
- `src/components/portal/OrganizationIdentityNotice.tsx`
- `src/admin/components/OrganizationIdentityReviewPanel.tsx`
- `supabase/functions/_shared/organization-retention.ts`

Added focused tests:
- `src/lib/organization-identity.test.ts`
- `src/lib/organization-identity-api.test.ts`
- `src/lib/organization-identity-profile-write.test.ts`
- `src/lib/organization-retention.test.ts`
- `src/hooks/use-organization-identity-check.test.tsx`
- `src/pages/OrganizationIdentitySignup.test.tsx`
- `src/admin/components/OrganizationIdentityReviewPanel.test.tsx`
- `supabase/tests/organization_identity.local.test.mjs`

Documentation: this report, `audit-and-recovery-design.md`, `concurrency-review.md`.

## 10. Forward migration

`supabase/migrations/20261008174154_organization_identity_review.sql` — **applied**. The local filename was aligned with the version recorded by Supabase; the SQL contents were preserved.

Adds derived indexed name keys, pg_trgm, private RLS-protected cases/append-only application audit records/rate buckets, public generic check, authenticated custom-admin review/retention RPCs, profile privilege/verification and historical ownership guards, and proposed deletion safeguards. Helpers/private tables are inaccessible to anon/authenticated; exposed admin RPCs validate the actual custom session and permissions even though callers connect through anon/authenticated roles. Fixed search paths and SHA-256 detail fingerprints are used. Name/location advisory locks cover collisions; READ COMMITTED is required so checks refresh after waiting (confirmed live default is READ COMMITTED).

No applied migration SQL was edited and no database reset was run. Generated comparison columns do not merge or change official identity fields. Post-application catalog checks confirmed all 11 guards enabled, all three private tables protected by RLS without applicant read access, private helper execution revoked from anon/authenticated, and the canonical deletion guard installed. SQL normalization returned the expected result. Security advisors flag intentional private-table policy absence and exposed SECURITY DEFINER RPCs; the admin RPCs enforce custom-session authorization. Frontend/Edge deployment and real two-session integration verification remain separate work.

## 11. Validation

- Focused frontend/API/profile/retention tests: **52 passed**.
- Broader registration/Admin/URN/renewal/privacy tests: **125 passed**.
- Additional existing Google onboarding/suspension suites: **49 passed**.
- Actual migration executed against synthetic local PostgreSQL WASM fixtures: **21 passed**.
- Total: **247 passing tests**, with no live test writes.
- `npx tsc --noEmit`: passes the root configuration. The application-config comparison still has **649 existing baseline diagnostics, 0 new**; the project does not have a clean application-wide type baseline.
- `npm run build -- --outDir tmp/organization-identity-build`: passed; tracked build assets were preserved. Existing large-chunk/Browserslist warnings remain.
- `git diff --check`: passed.

Database coverage includes normalized/abbreviated/similar names, locations, different owners, omitted/conflicting identifiers, privilege/RLS/private-data boundaries, all admin decisions, false-positive separation, changed evidence/version, budget/liquidation/YPOP/history continuity, expired re-registration, deletion/Auth cascade, retention checks, official URN edits, overflow, throttling and stale snapshots. Frontend coverage includes both signup routes, exact-URN blocking, headquarters lookup, debounce/no polling/stale responses, admin evidence confirmation/session scope, and fail-closed Edge retention helper/order.

PGlite uses a synthetic subset/stub of surrounding schema, not the complete live trigger/RLS/Edge environment. The two-session MVCC/real PostgREST/full Edge integration gate in [concurrency review](concurrency-review.md) is **not executed**. Edge helper and ordering are tested; full Deno Edge runtime integration is not asserted. These limits must remain explicit.

## 12. Policy and security approvals

Before application/deployment, review: accepted identity documents and evidence references; who may classify separate/same identities; applicant appeals and additional-evidence communications; canonical recovery/access and session revocation design; lawful retention/archival/erasure for established and held applications; audit/evidence access/retention; shared anonymous traffic/abuse limits; oversized candidate investigation; and the real two-session/local Supabase integration evidence.

No new liquidation restriction, ownership transfer, automatic merge, financial rewrite, or active accreditation policy was introduced.

## 13. Readiness and manual reconciliation

**Ready for migration/code/policy review. Not ready to assert production deployment readiness until the above policy and real concurrency/integration gates are completed.** Migration application, deployment, account recovery, irreversible reconciliation and privacy erasure require separate authorization.

If future duplicate candidates appear: produce restricted/anonymized counts; review official identifiers/records and evidence with PCYDO; record Confirm Different for false positives; record Confirm Existing against the original retained ID for proven duplicates; preserve every historical owner and obligation; investigate any outstanding liquidations in that complete original history; route access recovery through the reviewed design. Never auto-merge, delete the original profile, move financial rows or create an active clean identity. Record the review/appeal trail and reassess after identifying details change.
