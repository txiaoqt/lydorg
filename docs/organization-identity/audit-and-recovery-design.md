# Organization identity audit — 8 October 2026 (Asia/Manila)

## Current boundaries

| Flow | Existing boundary | Required identity enforcement |
| --- | --- | --- |
| Email signup | Supabase Auth signup metadata, email OTP, then profile onboarding | Debounced generic candidate check; profile INSERT is authoritative |
| Google | Auth user then GoogleOnboarding profile upsert | Same check; same database profile trigger |
| Profile | upsertOrganizationProfileInSupabase uses user_id uniqueness and ownership RLS | INSERT/identity changes/privilege escalation triggers; never trust frontend metadata |
| Existing URN | is_urn_registered + normalized unique indexes + review_organization_urn | Reassess before verified transition; match official URN without auto-link |
| New registration | Required document approvals invoke evaluate_and_apply_automatic_registration_verification | Identity gate before profile becomes verified, including automatic calls |
| Manual approval | update_admin_organization_profile_review | Same verification trigger, regardless of writer |
| Renewal | 90-day early / 180-day late window, accreditation cycles per organization_id | Keep rules; re-registration process must keep original identity/history |
| Financial ownership | budget_requests / liquidation_reports reference organization_profiles.id | Never move records; pending/same-existing applicant cannot use a new ID for financial writes |
| Account deletion | Canonical RPC + Edge function remove Auth/storage/organization children | Retention review required before established identities can be permanently removed |

## Live read-only observations

Project mqqaykksadotbrghbexz: profile, budget, liquidation, accreditation and renewal RLS enabled. Unique user_id; unique normalized supplied URN, official URN and verified URN indexes. No name matching or identity review table. Zero exact case/whitespace-normalized repeated-name groups at audit time (not proof of no real duplicates). No production identities changed.

The owner-facing protect_urn_review_fields trigger runs only on UPDATE and uses a nullable setting comparison; INSERT privilege fields and unset setting semantics require hardening. The profile helper currently sends client profile_status, verified_at and internal_notes. Identity enforcement must also cover direct REST writes, not only this helper.

## Deletion consequences (documented BEFORE preparing any proposed guard)

The canonical deletion RPC explicitly removes accreditation, renewal, documents, budget requests, liquidations, YPOP, compliance and URN history. Activity logs lose their organization_id. Auth user deletion also cascades to the profile, and the profile cascades to these histories. Registration deletion checks existing accreditation, but delegates to this destructive canonical path. The Edge Function also deletes Storage/Auth resources. A check only on profile DELETE is too late if the canonical RPC already removed children.

No live deletion behavior is changed by this task. The proposed local guard runs inside the canonical RPC before child cleanup, keeps its function OID so dependent calls are guarded, and guards profile deletion/Auth cascades. Edge preflight fails closed before cleanup; the database rechecks under the profile lock. Reviewed identity holds are included to prevent deleting and recreating a profile to escape its canonical/review state. Permanently deleting retained official records or held applications requires stakeholder approval of lawful retention periods, privacy rights, archival, anonymization, access restrictions and storage cleanup. Do not use a caller-set custom GUC as a bypass.

## Recovery / transfer design — intentionally NOT implemented

The canonical identity remains the original organization_profiles.id and its URN/accreditation cycles. Confirm Existing Organization records an authorized audited relationship and keeps the applicant pending; it does not copy records or give the new account access to the old organization. Previous budgets and unresolved liquidations remain at the original ID.

The schema currently binds one organization to one Auth user and has ON DELETE CASCADE. Ownership recovery needs a reviewed transaction: validate official evidence; require authorized admin and explicit confirmation; preserve old user/session provenance; revoke old sessions; prevent concurrent recovery; atomically reassign access; retain original organization ID, all URNs/cycles/financial history; document retention and revocation. Do not create a second clean identity, automatically merge accounts, or change user_id from a submitted claim. A durable organization_memberships/account-access model and Auth deletion changes should be reviewed separately before implementing transfer.

## Matching and policy

Normalize NFKC, case, whitespace and punctuation; expand only org/assoc/inc. Exact normalized name is a candidate regardless of location. Same short name anchor + same headquarters barangay or >=0.82 trigram similarity in that barangay corroborates a modest name variation. URN conflicts are authoritative identifier conflicts, not proof that the claimant owns the organization. Representative, email, adviser and phone are never identity proof. Similar names require human review; per-candidate separation decisions are bound to the reviewed identity details and must be rechecked at verification. A bounded list at its 21-record sentinel remains pending rather than clearing an incomplete review.

No new liquidation-blocking policy or renewal deadline is introduced. Unresolved liquidation visibility follows the retained original organization ID. Public responses contain only outcome codes; no matched IDs, emails, contacts, notes or financial rows. Shared anonymous throttling deliberately returns CHECK_UNAVAILABLE when exhausted; server-side verification still checks the authoritative records.
