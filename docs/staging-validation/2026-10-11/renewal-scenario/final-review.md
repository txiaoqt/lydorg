# Final staging Renewal Test Scenario review

11 October 2026 · Asia/Manila. Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`.

## Decision

**PASS for a controlled staging deployment review using the current, verified legacy anon-key configuration.** This is permission to request approval, not evidence of deployed authorization or a completed renewal. No SQL, fixtures, Auth/session writes, Storage writes, production access or Git push occurred in this review. Preserve the existing dirty tree; its initial inventory is `tmp/renewal-final-review-initial-status.txt`.

The previous report remains the architecture/lifecycle reference. This document supersedes its catalog-gate, permit-volatility and final-validation sections. The separate eligibility-alignment proposal remains unapplied and outside the deployment request.

## Actual Admin-client authentication

`src/lib/supabase.ts` constructs the shared SDK client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The existing Settings services in `src/lib/lydo-connect-supabase.ts` put the custom Admin session in the RPC's `p_session_token` argument. Admin login does not exchange that token for a Supabase Auth session. The installed SDK's `fetchWithAuth` uses an existing Supabase Auth access token, or otherwise the configured API key, as its bearer credential. Custom Admin authorization is therefore separate from PostgREST JWT verification.

The staging-only, read-only probe `scripts/staging/verify-renewal-admin-transport.mjs` used the official SDK and the existing disabled RPC, without creating an Admin session:

| Test | Status | Actual evidence |
|---|---|---|
| Current legacy staging anon JWT reaches existing Settings RPC | PASS | HTTP 400, expected disabled-function error; SDK bearer equals configured key. |
| Tampered project claim with original signature | PASS | HTTP 401. Decoding a JWT alone is explicitly not signature verification. |
| New scenario Super Admin validation over live PostgREST | BLOCKED | New SQL not installed; no authenticated scenario operation executed. |
| Existing same-project organization JWT issuer branch | PASS | Local SQL test, not a real authenticated browser test. |
| Modern publishable key | NOT TESTED | Not the configured credential; no claim of compatibility. |

The proposed `assert_project` accepts only a cryptographically verified exact staging `ref`, or exact staging Auth issuer. An anonymous publishable-key request whose gateway claims lack either is deliberately denied. Publishable keys are not JWTs; they cannot be assumed equivalent to legacy anon keys. See [Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

**Rollout prerequisite:** use the already verified staging legacy anon key in the staging frontend, with the exact staging URL and explicit scenario flag. Do not rotate to a publishable key during this rollout. Supporting an opaque-key request without project-bearing claims requires a separately reviewed server-controlled deployment-identity design; neither client headers nor decoded unverified claims are an acceptable substitute. Super Admin validation remains mandatory under either approach.

## Exact corrections

1. `mutation_allowed` is now **VOLATILE**, so its query observes permits written earlier in the calling transaction. The permit still requires the private singleton, exact organization/term, current backend PID, current transaction ID, exact synthetic email and trusted Auth app marker. It additionally verifies the current profile owner, name, verified state and email. Cleared, stale-transaction, different-backend and unrelated-resource permits fail.
2. Fixture checks lock the bound Auth row `FOR SHARE` and profile `FOR UPDATE` before checking trusted ownership. Binding locks the same rows, requires exactly one active term, term number 1, and a matching authoritative current-term projection. Auth metadata changes cannot race a prepared mutation after that lock is acquired.
3. Both scenario application and account reads select the active term with `INTO STRICT`. Zero/multiple active terms or a mismatched profile pointer fail closed. The live unique partial active-term index is also captured in the exact catalog manifest.
4. The trigger's date-only exception additionally requires the old term to be active. Every non-date column must remain identical. No delete, ownership, provenance, revocation, reactivation or arbitrary-organization exception was added. Client-settable flags/GUCs remain insufficient.
5. Installation now checks a known synthetic staging Admin anchor and the `postgres` execution owner before comparing the **complete captured manifest**: 11 relevant function definitions/owners/ACLs; 209 columns; 23 constraints; accreditation indexes and four triggers; roles; nine Storage policies; table grants/RLS states. Any mismatch aborts before DDL. The private schema is created once; an existing installation is not silently overwritten.
6. Added a staging-only control-plane installer, defaulting to read-only review. It hard-checks environment URL/ref, the fixed project endpoint, returned project ID/name/database host/health, and exact catalog equality. Applying requires an explicit flag and the reviewed SQL SHA256. SQL repeats its catalog gate inside the transaction. No repository production env/CLI link is loaded.
7. Disable now checks the staging anchor/installation and replaces the permit with a VOLATILE constant false. Local tests run the actual disable SQL twice: all six RPCs refuse, date mutation refuses, baselines, terms, renewals and audit evidence remain. No automatic re-enable or historical rollback is provided.

No frontend application code was changed in this final review. Existing panel actions and null password response are preserved. The prepared trigger extract matches the actual final replacement.

## Security and concurrency results

The private schema/table/functions are inaccessible to anon, authenticated and service_role callers. Public scenario RPCs remain callable by the existing custom Admin transport but authorize a valid active `super_admin` session server-side. They accept no arbitrary organization ID. The internal binding function accepts one only after authorization and exact independent Auth-marker/profile/term checks, and is not exposed through PostgREST.

Profile locking serializes the scenario with the existing draft initializer, whose captured implementation also locks that profile. The singleton lock serializes scenario requests. PostgreSQL transaction failure, lock timeout or deadlock aborts the operation; no automatic retry is introduced. This review tested transaction/backend isolation, **not simultaneous live multi-connection contention**. The normal approval path locks a renewal before its profile: scenario operations reject all in-progress renewal states without locking those renewal rows, rather than acquiring an opposite renewal/profile lock sequence.

Audit insertion is in the mutation transaction. Injected audit failure rolls back dates, baseline/permit changes and projection updates. Repeating reset preserves the same date/baseline state but records each invocation in the audit trail. Restore is idempotent when unprepared; it refuses restoration when the original term is referenced by a renewal or a completed lifecycle has replaced it. After approval creates the next active term, reset can archive the previous baseline and capture the new term's original dates; it does not delete the approved renewal or superseded term. Do not reset that new term automatically during evidence preservation.

The test exception remains confined to one independently marked fixture. Normal three-year terms, 90-day early window, 180-day late cutoff and normal accreditation immutability are unchanged. The dedicated fixture intentionally records simulated dates as synthetic evidence, not historical accreditation claims.

## Installation and evidence

The exact catalog/anchor gate was executed successfully against staging in a **READ ONLY transaction ending in ROLLBACK**. That validates the current real catalog and gate syntax; it does not install or execute the new functions. Fresh inventory remains: **4 Auth users/4 identities, 3 organizations, 2 Admins, 1 term, 0 renewals, 10 buckets, 16 objects**; the adaptation schema is absent.

All SQL is under `docs/staging-validation/2026-10-11/renewal-scenario/`, outside `supabase/migrations`. It is not part of production migration replay. The installer contacts only the fixed staging control-plane project. The database anchor is defense in depth, not a claim that row contents cryptographically identify a database; verified connection identity is mandatory.

Storage policies, grants, buckets and files are not altered. `.env.staging.local` and `.ytrace-staging-fixtures.local` are ignored and untracked; their contents were not printed. Credential storage remains local and must retain appropriate OS access controls.

| Validation | Status | Evidence / limitation |
|---|---|---|
| Local SQL and installer safety | PASS | 35 tests; PGlite actual proposed SQL/triggers with a synthetic schema/mock Admin validator, plus mocked management API. Actual gate rejects missing anchor/drift; positive local install substitutes only the expected catalog fixture. |
| Focused renewal panel/environment/upload/Storage cache/gateway client tests | PASS | 102 passed, 0 failed across nine files. |
| Known failing suites rerun | FAIL | 47 passed, 4 failed; all four assertion identities match saved baseline; zero new failure identities. |
| TypeScript | PASS | `npx tsc --noEmit`, exit 0. |
| Production build | PASS | `npm run build -- --outDir tmp/renewal-final-review-build`, exit 0; existing tracked build preserved. Large-chunk and old Browserslist-data warnings remain. |
| Whitespace check | PASS | `git -c core.fsmonitor=false diff --check`, exit 0. Existing CRLF warnings remain. |
| Real staging catalog/install preconditions | PASS | Exact catalog gate in read-only transaction, verified staging project and unchanged inventory. |
| Real renewal lifecycle / gateway authorization for renewal files | BLOCKED | Deployment and dedicated fixture approval required. Earlier Storage results do not substitute for renewal coverage. |
| Authenticated browser/PWA and slow/interrupted uploads | BLOCKED | Eligible fixture/new SQL not active. |
| Full repository test suite | NOT TESTED | Intentionally not rerun for this focused review. |

The four reproduced failures are the same two Admin inactivity expectations and two phase3e six-document expectations. Prior source review found client activity intentionally does not extend server session expiry, and the canonical PCYDO data-request form is registration-only. No session rules or document requirements were changed to satisfy these tests. Confirm live required document types and actual expiry behavior during the controlled lifecycle/browser pass; these failures are not blanket production clearance.

Validation details/hashes: `final-review-validation.json`. HTTP evidence: `admin-transport-final-review.json`. SQL and build logs: `final-review-local-tests.txt`, `final-review-build.txt`.

## Exact fixture scope and controlled order — approval required

1. Verify one operator, staging-only credentials/host, current manifest and unchanged A/B/suspended/file inventory. Confirm email isolation and no real recipient/external notification delivery before any account creation. Stop if outbound isolation is unverified.
2. Through official Auth Admin `createUser` with email already confirmed, create **exactly one** new identity `ytrace-renewal-synthetic@example.invalid`, trusted app marker `ytrace_renewal_fixture=zroudsvpswqsjlyttkjf-v1`. Generate a distinct secret locally; save only in the ignored fixture journal, never in SQL, panel or logs. No invite/signup/reset email APIs. First inspect for an existing matching identity and stop on ambiguity.
3. Use its genuine normal Auth login/JWT and application registration/identity workflows to create `SYNTHETIC Y-TRACE Renewal Scenario`. Upload small labeled synthetic PDFs; complete normal authorized Admin registration approval to produce term 1. No direct ledger insertion/backdating, service-role impersonation, A/B/suspended changes or duplicate bootstrap.
4. Rerun the exact catalog gate, then install only the reviewed SQL atomically through the fixed staging connection. Current manifest excludes new fixture row values, so normal fixture creation does not invalidate it; any schema/ACL/policy drift still stops deployment. Use the existing verified legacy anon-key client, exact staging URL and explicit scenario flag in a local frontend. No hosted frontend deployment is requested.
5. Log in normally as the existing Super Admin. First existing Settings account read binds only the reviewed dedicated organization. Check ordinary/unauthorized/expired/revoked denials. Apply **30 Days Ahead**, confirm OPEN eligibility, audited synthetic dates, correct current term and unchanged other fixtures.
6. Execute one genuine owner renewal: draft → required PDF uploads → submit → Admin Needs Revision → corrected upload → resubmit → authorized approval. Verify old-term supersession, new three-year term, terminal locks, genuine Storage access/signing/denials and actual content hashes. Preserve synthetic successful/denied evidence and all existing fixtures.
7. Run focused authenticated browser/PWA, account-switch, preview/download, expiry and interrupted-upload checks where available. Report unavailable cases BLOCKED. Do not infer deletion from an empty success response. Stop failed operations without bypassing constraints or automatic retries.
8. Preserve the completed lifecycle and files. Do not automatically reset/restore the new term. No unrelated 33-policy RLS migration, schema replay, production access/write, push or deployment.

The exact reviewed install/disable SHA256 values are in `final-review-validation.json`. The controlled installer command after approval is:

```powershell
node --env-file=.env.staging.local scripts/staging/install-reviewed-renewal-scenario.mjs --apply-reviewed --sha256=b84b3b80c9045c11ca4e58c14c52c73018916b01235a71b829c8c66ef2029245
```

It additionally requires an authorized control-plane `SUPABASE_ACCESS_TOKEN` held securely server-side. Never paste it into chat. The existing authorized project-specific management connector is an alternative verified connection; do not use the production CLI link. This installer was tested with mocks, not executed against the live management API.

## Disable and recovery

Stop scenario operators and let in-flight operations finish; inspect active work before disabling. Re-verify the fixed staging connection and reviewed disable hash. Run `disable-scenario.sql` through the same guarded installer using `--disable --apply-reviewed` and its reviewed hash. It reinstates six fail-closed stubs and makes all mutation permits false, preserving the stricter trigger, private binding/baselines, accounts, terms, audits and files. It is idempotent; no destructive cleanup occurs. Local SQL tests cover this twice, including its actual staging-anchor gate.

Failed installation rolls back atomically. After a scenario failure, retain evidence and investigate. Before any renewal references the term, the reviewed restore RPC can restore its exact original dates. After a completed renewal, do not revert authoritative history or delete the new term. Disabling does not retroactively undo committed simulation or revoke previously issued signed URLs. Re-enable requires another explicit review; a fresh install will refuse an existing private schema.

## Remaining risks and readiness

- Current legacy-key compatibility is established; modern publishable-key compatibility is explicitly not certified.
- Live new-function permission checks, full renewal approval/Storage authorization and browser/PWA behavior await the authorized execution. Local mocks are insufficient for production security sign-off.
- Live concurrent contention, hosted deployment routing and existing production historical file paths were not tested here.
- Prior failing coverage remains visible. Real email isolation must be rechecked before the next write.
- Control-plane permissions and execution ownership must satisfy the installer gates; failure stops rollout rather than relaxing them.

**Capstone renewal UAT: BLOCKED until the controlled lifecycle/browser checks pass. Production Storage rollout: BLOCKED. Narrow staging deployment and synthetic lifecycle: ready for explicit authorization, with the preconditions and stop rules above.**

## Files changed by this final review

- SQL: `staging-adaptation.sql`, `immutability-replacement.sql`, `disable-scenario.sql`, `catalog-drift-check.sql`.
- New captured catalog/evidence: `final-catalog-query.sql`, `final-catalog-manifest.json`, `admin-transport-final-review.json`, final validation/logs and this report.
- Scripts: `scripts/staging/verify-renewal-admin-transport.mjs`, `scripts/staging/install-reviewed-renewal-scenario.mjs`, its `.test.mjs`, and extended `scripts/staging/renewal-scenario.local.test.mjs`.
- Existing frontend/performance/identity/Storage work preserved. No applied migration edited.
