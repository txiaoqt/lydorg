# Admin budget deletion pause — final local validation

October 13, 2026, Asia/Manila. **Preparation only; no production or staging mutations.** No deployment/promotion, Git push, Auth change, Storage operation or live deletion RPC was performed.

## Decisions

- **GO for separate server-pause authorization.** Exact existing SQL candidate preserved; fresh read-only catalog and contract match.
- **CONDITIONAL GO for isolated Admin frontend release preparation.** Existing four-file patch preserved. Packaging/version, technical-debt review and separate candidate/promotion approvals remain.
- **NO-GO for Storage cutover execution now.** Pause deployment, actual post-pause gate validation, preservation review and separate cutover authorization are prerequisites.

## Exact proposed SQL

`../20261012T165000Z/budget_deletion_pause_production.sql`

SHA-256 **`a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`**, **11,945 bytes**. No SQL regeneration or modification occurred.

Only `public.admin_bulk_delete_budget_requests(_session_token text,_request_ids uuid[]) RETURNS jsonb` is replaced. The body raises SQLSTATE `PT409`, fixed message `BUDGET_DELETION_PAUSED: Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.` It raises before session validation and before any destructive operation. No parameter values are included in the error. PostgREST's intended HTTP response is 409; no live HTTP denial assertion is claimed.

Original OID, postgres owner, exact grants, SECURITY DEFINER, VOLATILE/non-strict/parallel-unsafe characteristics, cost and search_path remain. No broad DELETE grant, policy, trigger or unrelated function is changed. Transaction checks preserve eight protected relations and require the exact projected post-catalog; the future operator separately compares all 57 immediate before/after inventories.

## Current read-only production compatibility

**PASS**, recorded in `production-readonly-preflight.json`:

- Exact production binding, database/current user/session user postgres, PostgreSQL 17.6.
- Original deletion function OID 32925; definition MD5 `f6c36316ba941c9e0f76674754ac44ba`, source MD5 `eb7b756964fd31efebfb39749f5c9e5b`; exact contract and ACL match.
- Full catalog SHA-256 `eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5` unchanged.
- 164 migrations, latest `20261011230000`, history MD5 `1f5eca911f6e2057ae070a955eaca3dc`.
- 15 Storage policies, 378 objects, 93 profiles; containment environment guard FALSE.

This was read-only control-plane SQL inspection, **not a new native TLS probe or installation**. Independent native endpoint/CA verification and fresh preflight remain mandatory immediately before a separately authorized write. Current frontend IDs are retained as the approved release bases, not newly re-audited provider assignments: Admin `dpl_AZ287kU35oFTVqyTEQRf749qncAA`; Organization/PWA `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ`.

## Validation matrix

| Item | Result | Evidence and limits |
| --- | --- | --- |
| Previous artifacts and prepared runtime identity | **PASS** | 58 previous artifacts and seven workspace/overlay identities match their receipt |
| Updated disposable database tests | **PASS 38/38** | `sql-tests.tap`, `sql-test-evidence.json`; adds explicit normal budget approval before release and denial after approval |
| Valid/invalid/expired/revoked/inactive/null sessions and Admin role differences | **PASS** | Four database roles × eight synthetic session states, unconditional PT409 |
| Budgets, liquidation/files, notifications, audits, Admin session timestamps and Storage object metadata | **PASS** | Full synthetic row equality after denial; no partial deletion |
| Signature, OID, owner, relevant grants/settings | **PASS** | Exact contract comparison before/after local installation |
| Normal viewing, file review, approval and release | **PASS** | Actual captured production SQL definitions execute on disposable rows; unrelated definitions unchanged |
| Drift rejection and atomic rollback | **PASS** | Synthetic origin/contract/catalog drift and injected pre-COMMIT failure; no production rollback |
| Focused UI/client regression | **PASS 18/18** | `frontend-tests.log`; current component rendering, no client RPC/Storage call, actual older client safely handles mocked server error |
| Prior broader focused frontend checks | **PASS 46/46 — historical** | Preserved evidence; unchanged runtime hashes reverified, unrelated checks not repeated |
| Isolated Windows Node 24 Admin build | **PASS — historical** | Preserved 53-file build; no rebuild needed for unchanged runtime patch; not hosted/Linux evidence |
| Actual app TypeScript | **FAIL — historical, applicable unchanged source** | 647 diagnostics versus 651 in the approved base, zero new identities, four removed; 61 existing errors in runtime-scope files |
| Full diff check | **PASS** | `diff-check.log` |
| Live installed pause / production rejection tests | **NOT TESTED** | Pause is not installed; production mutation RPCs prohibited |
| Hosted/browser validation of disabled UI | **NOT TESTED** | No frontend deployment; DOM/component tests are separate evidence |
| Operator identity attribution | **BLOCKED** | Minimum additional private identity evidence described below |

Disposable SQL execution uses the existing **PostgreSQL 18.3 / PGlite 0.5.8** runtime. Only two whole-catalog constants and the major-version guard are adapted for its synthetic schema; function body, exact contract/data checks and transaction are unchanged. The original production SQL rejects the unmodified local environment. No native PostgreSQL 17, concurrency, live Auth/JWT or Storage HTTP coverage is claimed.

This task modified **only the SQL test harness** to add explicit approval coverage and write future test evidence to distinct, exclusive files. Original harness bytes are saved in `original-sql-test-harness.mjs.txt`. The server SQL and four-file frontend runtime patch remained unchanged. All prior failed-run evidence and the previous receipt remain intact.

## Admin patch and separate frontend release

Existing isolated overlay: `../20261012T165000Z/admin-release-overlay/`.

- `src/lib/admin-budget-deletion-pause.ts`: typed fixed pause error and shared accurate message.
- `src/lib/lydo-connect-supabase.ts`: budget-deletion helper always rejects before session access, RPC or Storage cleanup.
- `src/admin/components/BudgetRequestsTable.tsx`: disabled deletion control and accessible explanation; selection/filter/review preserved.
- `src/admin/AdminPortal.tsx`: destructive handler/state/confirmation removed, including physical Storage deletion claims.

The actual older shipped deletion client throws on the prepared fixed server error before its cleanup path. New UI does not call the RPC at all. These are mocked/DOM client assertions, not production mutations. Normal unrelated Admin workflows remain in the source and passed the relevant local SQL/lifecycle evidence.

Use `../20261012T165000Z/admin-frontend-release-plan.md`: package from the exact approved isolated Admin base plus the overlay and updated tests, with a distinct fixed version and new archive/static inventories. Do not deploy the validation build with the reused base version. Review the TypeScript FAIL honestly. Obtain separate candidate-only deployment, hosted acceptance and promotion authorization. Preserve Organization/PWA and the gateway. No shared-main push; both frontends can be affected by their common repository integration.

## Profile reconciliation

**Confirmed preservation PASS:** fresh original-92 comparison reproduces full-row MD5 `52f00b0d86d0c583a56143629fd7409a`; no existing profile was changed, deleted or reassigned. There is still exactly one additional profile, created October 12 at **22:25:31.999995 Asia/Manila**, status `pending_review`, with an existing Google identity, authenticated Auth role, youth application role and no linked Admin account.

**Attribution BLOCKED:** this is consistent with normal profile completion and the operator's UAT account-switching report; it does not independently prove who owns that Google identity. No private names/email/token data were collected. `profile-attribution-procedure.md` supplies the minimum additional evidence: the operator privately identifies their own existing Google Auth UUID in the trusted dashboard, runs a local in-memory hash comparison and reports only MATCH plus own-account/profile-completion attestation. No fresh login or credential is required. That operator check is **NOT TESTED** here.

No profile or baseline was changed. The earlier preservation proposal remains conditional and unadopted; resolving this match alone does not approve all other mutable-inventory differences.

## Retention and exact cutover impact

The approved **128 legacy + 85 no surviving owner + 2 current-owner financial + 56 template versions = 271** retain-and-deny decisions remain recorded in `../20261012T165000Z/retention-decisions.md`. Preserve all objects and 13 current templates; no deletion, relinking, reconstruction or access grant is proposed. Both financial objects remain available only for a separate evidence-based access investigation if needed.

Original cutover SQL remains byte-identical, SHA-256 **`3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c`**.

The pause is projected to change the whole-catalog hash to **`e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f`**. Existing `future-cutover-gates-proposal.sql` changes only two hash literals; SHA-256 **`f77ceae769301affc2b8150db1bf922fbbaf3ee4db6f20a65939d95495ab5f8c`**. Reversing those two literals exactly reproduces the original. Authorization predicates and the 15-to-9 policy transition are unchanged. Actual post-pause production validation and separate review are required before using that proposal.

## Remaining prerequisites and authorization

1. Separate authorization of the exact server SQL, exclusive drained execution window and reviewed fixed native TLS execution mechanism; see `authorization-proposal.md` and the prior `operator-checklist.md`.
2. Private operator identity evidence if the profile attribution is to be closed; then independently review any preservation-baseline adoption.
3. Separate Admin package/candidate/hosted/promotion approvals, with known TypeScript debt visible.
4. Fresh actual post-pause catalog/preservation review and independent Storage cutover authorization.

No authorization is inferred from this preparation. Stop here. Do not restore the permissive RPC as rollback; use a separately reviewed forward/fail-closed correction if required.
