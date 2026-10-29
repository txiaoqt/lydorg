# Authenticated acceptance plan

## Environment and boundaries

True authenticated end-to-end validation is **BLOCKED**: this task has no authorized isolated Supabase environment or supplied test credentials. Do not use production organizations for writes, create users in production, or fabricate successful results. Browser fixtures intercept all non-local requests; they exercise frontend behavior only. Vitest mocks and local PostgreSQL policy fixtures are separately identified in the report.

Prepare an isolated database with the current schema, grants, helpers, triggers, Storage policies and synthetic records. Provide two independent organizations A/B, a suspended organization, a permitted Admin, a limited/unauthorized Admin, and expired/revoked sessions. Take a schema snapshot before testing. Keep service-role credentials on the server. Use fresh browser profiles, plus a second independent profile for cross-session events.

## Admin checks

Run each applicable workflow below with permitted and denied Admin roles:

| Area | Acceptance action |
|---|---|
| Login/session | Login, restore, refresh, revoke, expire, inactivity timeout, logout/account switch; distinguish temporary network failures from authoritative rejection |
| Dashboard | Match fixture counts; capture cold requests/bytes and duplicate request payloads without recording tokens |
| Registrations | Search, paginate, district/barangay/classification filters, identity/duplicate verification, select one document, approve/request revision |
| Document review | Submitted files locked; revision replacement allowed; no bulk signing/download; audit history intact |
| Renewals | Draft/submission isolation, review, revision, approval, expiration/suspension restrictions |
| Budget Requests | Year/period filter, matching three-card totals, pagination, review, release, revision resubmission |
| Liquidations | Creation-date year/quarter filtering, private drafts, review/revision, hardcopy and completion |
| YPOP City-led | Period selection, participation/status updates, one selected preview, batched event convergence |
| YPOP Organization-led | PPA pagination, selected entry/activity files, revision/approval, final event not lost |
| YORP Registry | Year/period filtering, accreditation state, independent organization details |
| Per-organization reports | Selected organization only; metadata-only export, no document PDF binaries; Verified Date and human status labels |
| Budget Monitoring | Matching filtered totals, allocation/map/export consistency; all-year behavior |
| Activity Logs | Bounded search/filter/page; audit records remain immutable |
| Notifications | Correct recipient, read action, navigation, no previous Admin's cached notices after account switch |
| Permissions | Denied UI and direct RPC operations; revoked permissions enforced by server even with stale UI |
| Settings | Permitted edits only; correct error/loading states; no session validity extension for caching |
| Backup & Recovery | Listing/preview with fixtures; restoration only in disposable environment with separate approval |

For each page record initial and navigation requests/bytes, slowest requests, duplicate method+path+body signatures, console errors, unhandled rejections, page/search bounds, and whether a file preview actually caused one sign. Inspect loading and error states. Never put tokens, signed URL queries or private record content in logs/evidence.

## Admin synchronization sequence

For registration, renewal, budget, liquidation, City-led and Org-led YPOP:

1. Admin A opens that resource; establish the initial version snapshot.
2. Leave versions unchanged for at least two 8-second cycles. Version RPCs may occur; business list/detail requests must not occur because of unchanged versions. Track independent authorized sidebar/session maintenance separately.
3. Organization B changes one synthetic record in another profile. Verify relevant version advances and a targeted refresh follows.
4. Change an unrelated resource. Verify no broad refresh of the current resource.
5. Send a burst spanning an in-flight request; verify final persisted state is eventually shown and refreshes are bounded.
6. Hide the tab for two cycles: no version checks. Restore visibility: immediate check and required refresh.
7. Navigate away/unmount/logout while a request is pending; ensure no stale account data is applied.

The local browser fixture currently exercises the actual Admin timer/visibility code for budgets with synthetic version responses. It does not prove that a live organization mutation advances a live counter. The remaining resource mappings have unit/source evidence and require the same isolated two-profile sequence.

## Organization website and PWA

Test login/restoration, dashboard, profile edits, documents/registration, renewal, budget, liquidation, both YPOP lanes, inquiries, notifications, templates, preview/download and status updates for A and B. Use normal UI and direct authenticated API/RPC calls. A must never see or change B's private records or resolve B's private Storage objects. Repeat for anonymous, suspended and invalid-session actors. The current Storage policy reproduction fails this requirement; see the security finding before attempting rollout.

Installed PWA acceptance requires a real supported device/browser profile: cold /app-start and /app routes, standalone detection, navigation and back behavior, saved and unsaved drafts, document manager replacement locks, previews/downloads, notification links, reconnect and cross-session status updates. Verify service-worker registration/update/restart without deleting drafts. The current worker fetches /assets/ from network; offline cold chunk availability is not guaranteed. Test offline cold and warm navigation explicitly. No worker/cache redesign was made here.

## Slow/unstable connection

Use a local/isolated browser with 200 ms latency and 200 KB/s download, then a slower mobile profile and intermittent offline transitions. Label these as simulations, not physical-device measurements. Exercise cold lazy chunks, failed chunk recovery/manual reload, query retry, preview error/retry, and session restoration without transient-error logout.

Upload synthetic PDFs using TUS slow mode. Interrupt after progress, reconnect/resume, allow one file to fail, retry failed files, and verify successful object IDs are not retransferred. Check progress, adaptive worker count, cleanup, partial-success state and duplicate-submit guards. Count actual transfer bytes and server objects. Existing transport tests use mocks; successful unit results do not certify a live TUS endpoint.

## RLS migration review gate

Do not apply the performance migration to production or shared staging. In an explicitly authorized isolated full-schema environment:

1. Match all 33 expected policy definitions, roles, commands, permissive flags, USING/WITH CHECK, grants and RLS flags.
2. Execute SELECT/INSERT/UPDATE/DELETE for all seven actor types before/after, including cross-owner writes and join relationships.
3. Retain actual Admin-token RPC validation, suspension/renewal/document-lock triggers and all overlapping policies.
4. Check query plans for scalar InitPlans; compare timings on representative synthetic data without production percentage claims.
5. Run Advisor there. Review lock timeout/transaction behavior and deployment rollback separately.

The local predicate-equivalence harness covers exact captured predicates using synthetic auth/admin helpers and tables. It does not model the complete production schema or suspension/session enforcement. The separate Storage reproduction uses exact captured Storage policies/grants and demonstrates existing authorization failures; it is not a migration change.
