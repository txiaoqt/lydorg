# Existing-URN accreditation and staging renewal validation

10 October 2026 · Asia/Manila · staging `zroudsvpswqsjlyttkjf`

## Result

**BLOCKED: complete real renewal document validation.** The investigation found no supported workflow that can make the retained synthetic actors legitimately eligible today under the requested constraints. No term was invented, backdated, imported, edited or revoked. No actor was recreated or converted into a designated test account.

**PASS: eight real staging prerequisite/authorization checks**, six isolated PostgreSQL contract tests, and **97 focused Vitest assertions**. A concrete preview inconsistency was reproduced locally using extracted live definitions; a narrow SQL proposal is supplied for review only.

Production was accessed only for function/catalog definitions. No production rows or documents were read or modified. No migrations, policies, deployments, bootstrap, push or business-record writes were performed in this task. Existing evidence remains intact.

## 1. Baseline and preservation

Branch `ui-refactor`; HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Extensive pre-existing modified/untracked work was preserved. Inventories are in `tmp/renewal-review-initial-status.txt` and `tmp/renewal-review-final-status.txt`.

The [previous identity repair/report](../identity-schema/repair-and-validation-report.md) and its SQL were read, not modified. Existing actors, journal, private files, public assets, role assignments, ten buckets and Storage policies remain in place. Credentials are loaded explicitly from the ignored staging env file; the production `.env` is not loaded. Script HTTP requests are restricted to the exact staging HTTPS origin, with redirects rejected. Service-role credentials are not used for organization assertions.

Fresh final inventory is in [final-staging-state.json](final-staging-state.json):

| Item | Before | After |
|---|---:|---:|
| Auth users / identities | 4 / 4 | 4 / 4 |
| Organizations | 3 | 3 |
| Custom Admin accounts | 2 | 2 |
| Buckets / objects | 10 / 16 | 10 / 16 |
| Accreditation terms | 1 | 1 |
| Renewal records | 0 | 0 |
| Active Admin test sessions | 0 | 0 |

Only ordinary test Auth login/sign-out sessions were created and closed. No Admin login was needed for the new prerequisite checks. No files were uploaded, overwritten or deleted.

## 2. Production/staging definition comparison

[Routine comparison](routine-comparison.json) records signatures, source equality, security modes, configuration, owner and normalized grants for ten relevant functions. Nine function definitions are byte-identical, including URN review, initial accreditation generation, projection, eligibility calculation, draft initialization, document review and renewal approval.

`enforce_accreditation_immutability()` has the previously reviewed staging sanitization: the production designated-test-email alternative is absent; the flagged-test-account guard remains. Its normal immutability rules are retained. This task did not edit that function or activate the exception. Raw ACL text has different entry ordering on several routines; sorted privilege sets are equivalent, not authorization drift.

Snapshots: [staging routines](staging-routines.json), [nine matching production routines](matching-production-routines.json). The production immutability body is not copied into the report because it contains the designated test email; the sanitized difference is documented instead.

## 3. Existing-URN verification is not ledger creation

The actual `review_organization_urn` function:

1. Validates the custom Admin session and existing-URN review transition.
2. Compares the submitted normalized URN and checks verified-URN uniqueness.
3. Sets URN review status, profile verification status, verification method `urn`, reviewer and current verification timestamp.
4. Appends URN review history.

It does **not** insert `organization_accreditations`, establish certificate start/end dates, or set a current accreditation pointer. Its active profile/URN triggers do not provide an alternative ledger-creation path.

B therefore has `profile_status=verified`, `verification_method=urn`, zero accreditation terms, no current term and no expiration projection. This is the observed implementation contract; it is not proof that product requirements intended to omit historical certificate onboarding.

An existing identifier's year segment is not treated as evidence of a certificate's effective dates. B's synthetic `08-23-901` does not justify inventing a 2023 term or an expiry in 2026.

## 4. How accreditation is legitimately created

### Initial document approval

`update_admin_document_submission_file_review` invokes `evaluate_and_apply_automatic_registration_verification` when a non-renewal registration packet reaches approved status. The evaluator resolves dynamic required registration types and checks every required type has an approved file. For a not-yet-verified eligible profile, it creates term 1 at the actual approval date, ending three years later, preserving/issuing the URN and logging the decision.

Crucially, it **returns early when the profile is already verified**. Approving B's remaining documents therefore cannot be assumed to repair its missing term. Temporarily downgrading B's profile to evade that guard would be a workflow bypass and was not attempted. Even if a new term were legitimately issued today, it would expire in three years and would not establish current renewal eligibility.

A followed normal document approval and has the retained authoritative term:

| Start | End | Renewal opens | Late cutoff |
|---|---|---|---|
| 10 Oct 2026 | 10 Oct 2029 | **12 Jul 2029** | 8 Apr 2030 |

### Projection and immutability

`sync_organization_accreditation_projection` derives the profile current pointer/start/expiry from ledger INSERT/UPDATE events. The projection is not an independent authority to issue a term. Historical dates, URN, term number and approval provenance are immutable under the normal trigger rules. Revoked terms cannot be reactivated and superseded terms cannot ordinarily be restored.

### Renewal approval

`admin_approve_renewal` can create the next term for an existing valid renewal. It is not an initial accreditation import route. Draft creation first requires the organization's authoritative current term, verified status, ownership and the 90-day early / 180-day late window. A cycle already approved or rejected also blocks a new draft.

### Legacy migration

`20260907140000_phase1_accreditation_renewal_schema.sql` contains a one-time migration block for verified organizations present at that historical migration. It uses confirmed verification timestamps, or explicitly marked year-only inference; it skips cases without usable history. It is not a callable current Admin onboarding workflow and does not run when a later URN is verified. Replaying it now would misinterpret the current URN-review timestamp as historical accreditation evidence and would expand the authorized task. It was not replayed.

### Dedicated test tooling

The repository has `admin_prepare_renewal_test_scenario`, but the actual staging function is an explicit fail-closed stub: synthetic fixtures must be reviewed before it is enabled. The legacy implementation adjusts expiry or creates test history under a designated test flag/GUC. Using it would conflict with this task's prohibition on fabricated/backdated history. It was not invoked, enabled or rewritten.

## 5. Business requirements and decision required

The repository's locked policy constants and renewal implementation preserve three-year terms, a 90-calendar-day early window, a 180-calendar-day late cutoff and immutable historical terms. The identity implementation also states that confirming an existing identity after the cutoff does not itself create active accreditation. No discovered requirement authorizes treating URN verification alone as a fresh three-year accreditation grant.

The official [NYC YORP resolutions index](https://nyc.gov.ph/yorp-resolutions) was checked, but its retrieved page did not expose the underlying resolution text. The official Pasig 2026–2029 YORP announcement was discoverable but direct retrieval failed. External requirements could not settle the application's historical-certificate onboarding decision; no new policy is inferred from those incomplete sources.

**Required product decision:** define whether and how an existing-URN applicant's independently verified certificate establishes an accreditation ledger term, including required documentary evidence, exact effective dates, approver, audit provenance, legacy-inference rules, handling expired/revoked certificates and organizations already marked verified without a term. Such an import must not silently issue a new term from today's URN review timestamp or the identifier's year.

**Fixture consequence:** none of the preserved actors has a legitimately expiring term today. Completing the requested real staging lifecycle now requires a separately reviewed test strategy that changes the current constraints—for example, explicitly authorized synthetic time/scenario simulation in a fully isolated environment. That would be test evidence, not real historical accreditation. This report does not request or assume permission to backdate staging records. Alternatively, the existing A fixture can follow its genuine window when it opens in 2029.

The dependent renewal lifecycle was stopped here as instructed; no unsupported fixture initialization was attempted.

## 6. Actual staging HTTP checks

New script: `scripts/staging/test-renewal-prerequisites.mjs`. Evidence: [renewal-prerequisites.json](../real-storage-validation/renewal-prerequisites-01/renewal-prerequisites.json).

| Check | Status | Real evidence |
|---|---|---|
| A owner eligibility preview | PASS | HTTP 200; canDraft=false / canSubmit=false; too early |
| B owner eligibility preview | PASS | HTTP 200; canDraft=false / canSubmit=false; no ledger or projection |
| B owner draft initialization | PASS: denied | HTTP 400 / P0001; no authoritative term |
| A owner draft initialization | PASS: denied | HTTP 400 / P0001; renewal window not yet open |
| A creating B renewal | PASS: denied | HTTP 400 / P0001; caller does not own organization |
| B creating A renewal | PASS: denied | HTTP 400 / P0001; caller does not own organization |
| Anonymous draft initialization | PASS: denied | HTTP 400 / P0001; authentication required |
| Suspended organization draft | PASS: denied | HTTP 400 / P0001; verified profile required |

All three genuine organization Auth test sessions were signed out. Cleanup is reported separately and not counted as additional authorization assertions. No renewal rows were created. Denied RPC calls were not retried automatically.

## 7. Eligibility-preview inconsistency

**Confirmed locally using the actual extracted PostgreSQL function bodies; not reproduced by modifying staging records.**

Current `calculate_organization_renewal_eligibility` searches the latest active term, but falls back to the profile expiration field if no active ledger term is found. A projected expiry within the window can return `canDraft=true` even though `user_start_or_get_renewal_draft` rejects the missing ledger. Revoked current terms and suspended profiles can likewise receive an allowed time-only preview while creation rejects them.

B's actual current state has no projection either, so its real preview is correctly false. The local counterexamples do not establish that production currently has affected rows; no production data scan was performed.

User-facing impact: a misleading renewal-ready indication or Start Renewal affordance followed by a server error. The server's creation authorization and ledger requirements remain enforced; the discrepancy is not evidence that an invalid renewal was successfully created.

Static frontend tracing found a related fallback: `getOrganizationRenewalCountdown` uses `verifiedAt + 3 years` when the projection is missing. Browser and PWA state resolution consume this countdown. URN-review time can therefore appear to represent accreditation expiry even without a term. No authenticated browser reproduction or frontend behavioral change was performed in this task.

### Narrow proposed correction — not deployed

[proposed-eligibility-alignment.sql](proposed-eligibility-alignment.sql) is **review-only SQL outside the migration series**. It mirrors draft initialization's owned-current-pointer/latest-active fallback, requires an actual ledger term, and returns unavailable for unverified/suspended or revoked prerequisites. It removes the profile-only expiration fallback while preserving existing JSON keys, dates/window calculations, security mode and search path. It does not grant access, issue terms or weaken draft guards. Existing grants would remain unchanged under CREATE OR REPLACE.

The proposal is deliberately not a complete guarantee that draft creation will succeed: terminal-cycle checks, caller ownership and concurrent changes remain creation-RPC responsibilities. A local test explicitly preserves that limitation. Before deployment review, decide whether the preview should remain an internal time/prerequisite helper or become a caller-authorized full readiness endpoint; the current helper has public EXECUTE grants and no caller/ownership guard. That existing information-disclosure concern is documented separately, not silently changed in a temporal fix.

Frontend follow-up proposal: distinguish a legacy estimate from authoritative ledger dates and keep Start Renewal unavailable when no valid term is established. Any removal of the tested legacy UI fallback needs a separately reviewed compatibility plan, not an arbitrary new expiration value.

## 8. Renewal document authorization coverage

| Requested phase | Status | Explanation |
|---|---|---|
| Eligibility and denied initialization | PASS | Real HTTP evidence above |
| Successful eligible draft | BLOCKED | No legitimate currently eligible fixture |
| Required renewal document uploads/hashes | BLOCKED | No valid renewal parent |
| Renewal private own/cross/anonymous downloads | BLOCKED | No renewal objects to test |
| Renewal Admin review / Needs Revision | BLOCKED | No valid submitted renewal |
| Corrected upload / resubmission | BLOCKED | Dependent phase unavailable |
| Renewal Admin gateway signing | BLOCKED | No authoritative renewal file relationship |
| Approved/terminal renewal Storage locks | BLOCKED | No terminal renewal fixture |

The earlier **78 private Storage isolation, 43 gateway and eight registration-revision checks** remain preserved evidence for their actual registration/financial/YPOP fixtures. They were not rerun because neither those records nor the policies/gateway changed. They are **not** relabeled as renewal coverage. No new private binary downloads or signed URLs were needed in this task.

## 9. Tests, changes and rollout recommendation

- **PASS:** six isolated PGlite tests using actual current SQL and synthetic local tables/Auth function: missing-ledger mismatch, actual B-shaped denial, revoked/suspended mismatch, proposed correction, exact +90/-180 boundaries, and terminal/ownership limits. [Results](local-contract-tests.txt). Synthetic local table contents are not staging accreditation history and not Storage integration tests.
- **PASS:** 97 Vitest assertions across five existing renewal/URN suites. [Results](vitest-focused.json).
- **PASS:** script syntax check and `git -c core.fsmonitor=false diff --check`.
- No newly failing assertions in the executed suites. Full Vitest, TypeScript and Vite build were not rerun in this proposal-only task. The preceding completed run's 2,211 pass / 150 fail remains historical evidence, not a new clean run; all 150 remain unresolved.
- Added two staging/local test scripts and this review/evidence/proposal directory. No application source, live routine, identity repair, role, permission, Storage policy or production migration was modified.

**Production renewal security sign-off remains BLOCKED.** Resolve existing-URN historical certificate onboarding policy and approve an honest isolated eligibility-test strategy, then execute the real renewal upload/review/revision/resubmission/signing/terminal matrix. Also retain the prior browser/PWA/slow-network and regression-review blockers. No deployment or production repair is recommended on the basis of these prerequisite tests alone.
