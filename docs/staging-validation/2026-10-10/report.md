# Y-TRACE isolated staging discovery and validation status

Date: 10 October 2026, Asia/Manila. Branch: `ui-refactor`. HEAD: `2f6e7427c553b7535f53860d1732b42df7c023e8`.

## Decision

**BLOCKED — no explicitly authorized isolated Supabase target is available. Production deployment is not approved.** The pasted request explicitly requires stopping before new cloud resources or changes to a project not designated for testing. Discovery and a concrete setup procedure are complete; no environment was provisioned, linked, restored or deployed. Existing source, migrations and uncommitted improvements remain intact. Only this documentation/evidence/fixture directory was added during this task.

Read: [previous Storage remediation](../../storage-remediation/2026-10-09/report.md), [production readiness](../../readiness/2026-10-09/report.md), [Storage security review](../../readiness/2026-10-09/storage-security-review.md). These previous reports' mocks/PostgreSQL fixtures are not relabeled as actual Storage API evidence.

## Discovery

| Project / local resource | Status | Finding |
|---|---|---|
| Production `mqqaykksadotbrghbexz` / lydo-org-focused | PASS | Identified and excluded from writes; no development branches |
| `sisggjjhtqikwcljcwyi` / lydooo | BLOCKED | Inactive, not designated or authorized staging |
| `bvvzrrcyulbezzexlmav` / EHR-Capstone | BLOCKED | Unrelated project; not designated or authorized staging |
| Authorized staging identifier | BLOCKED | None supplied/discovered; no new cloud project created |
| Local Supabase stack | BLOCKED | Docker not found; local API port 54321 unreachable |
| Local tools | BLOCKED | Supabase CLI, psql and Deno not found on PATH; no executable found in inspected Docker/psql locations |
| Existing checkout configuration | PASS | CLI link and frontend host are production; neither was changed |

Environment-variable **names and frontend hostname only** were inspected; no credential values were printed or copied. A server-secret variable exists in the ignored root environment; it was not used for staging or copied into the frontend template. Remote discovery used list-projects/list-branches/list-migrations and a SELECT on migration history only. No private documents, signed links, account passwords or production sessions were retrieved.

## Compatibility findings and defects

1. **FAIL — news asset staging portability:** both unapplied Storage proposals hardcode the production news-image hostname. The foundation binding trigger/backfill/reference resolver and cutover published-image predicate do not recognize a staging-generated HTTP URL. A public image can still render while its management/signing metadata checks fail. Exact locations: foundation lines 38, 53–54 and 122; cutover line 203. Resolve through a reviewed trusted origin design or explicit staging rendering after the target is known; do not bypass checks or seed production URLs to mask it. No migration was edited in this task.
2. **BLOCKED — full schema bootstrap:** no versioned CREATE TABLE statements for organization_profiles, document_submissions, budget_requests or admin_accounts were found. The versioned set starts from existing application schema, with additional standalone repairs. It is not a proven empty-database bootstrap.
3. **BLOCKED — historical replay:** 166 local migrations versus 163 live history entries; 17 same-name/different-version comparisons and one same-version/different-name comparison. `20260905` names differ. Some same-name entries duplicate another historical name; these counts are comparisons, not proven distinct SQL changes. SQL-body equivalence has not been established. No migration history repair is authorized or performed.
4. **PASS — proposals still unapplied:** live history ends at `20261008174154_organization_identity_review`. Neither Storage migration nor `20261009114340_performance_auth_uid_initplans.sql` appears. All remain unapplied.
5. **BLOCKED — MOVE scope:** previous inspection found no active frontend upload workflow or dedicated current permission. Draft/revision candidate behavior and Super Admin signing are not a certification of all MOVE phases. Unsupported operations remain denied; no new state or permission was invented.

Full comparison: [migration-compatibility.json](migration-compatibility.json). Names/versions alone do not establish schema parity. Before staging writes, review a schema-only baseline, custom Auth hooks/Storage policies, grants, lifecycle/identity triggers and external side effects as described in [setup.md](setup.md).

## Actual authorization and workflow matrix

All rows below refer to **actual isolated Supabase APIs**, not mocks. No such calls were run because the target is absent.

| Validation area | Status | Missing evidence |
|---|---|---|
| Anonymous private SELECT/sign/download/write denial, all five buckets | BLOCKED | Isolated Storage endpoint + synthetic objects |
| Organization A own access / B denial and B own access / A denial | BLOCKED | Real staging Auth JWTs and parent/object fixtures |
| Suspended organization restrictions | BLOCKED | Actual profile restrictions + Storage requests |
| Authorized custom Admin registration/budget/liquidation/YPOP signing | BLOCKED | Deployed staging gateway + real custom sessions |
| Unauthorized, expired, revoked and inactive Admin denial | BLOCKED | Actual gateway and token-validation path |
| Wrong parent/org, orphan, guessed/reused IDs, owner mismatch, missing metadata | BLOCKED | Real API assertions and mutation/hash verification |
| Legacy/current ownership and reviewed-file overwrite denial | BLOCKED | Actual managed Storage schema and upload semantics |
| Active/inactive templates and authorized/unauthorized asset management | BLOCKED | Staging-origin compatibility fix and endpoint tests |
| Published news images and consented avatars; private PDF nonpublication | BLOCKED | Staging metadata + actual HTTP byte access |
| Registration bulk draft → review → revision → approved locks | BLOCKED | Complete isolated schema, JWTs and Admin gateway |
| Renewal-specific paths / terminal locks | BLOCKED | Real renewal lifecycle + Storage endpoint |
| Budget / liquidation linkage, review, revision and terminal locks | BLOCKED | Real workflow transitions and parent checks |
| YPOP entry/city proof/org activity/semester scope | BLOCKED | Real period config, lifecycle triggers and Storage |
| MOVE full lifecycle | BLOCKED | Supported phase/permission decision plus actual tests |
| Website/PWA login, routing, previews, download, account switching | BLOCKED | Isolated frontend target and synthetic identities |
| Physical installed PWA / slow network TUS interruption and recovery | BLOCKED | Authorized deployment/device; byte/transfer traces |
| Google OAuth | BLOCKED | Staging-specific approved OAuth/redirect configuration |
| Server-enforced 3,600-second download / two-hour upload token expiry | BLOCKED | Real issued staging capabilities and elapsed-time tests |
| Gateway latency / signing counts / upload/download response bytes | BLOCKED | Real staging traffic; no numbers invented |

## Local regression validation completed now

| Check | Status | Evidence level |
|---|---|---|
| Focused Vitest, 14 files | PASS | 179 passed, 0 failed; local mocks/contracts, no live Storage integration |
| `npx tsc --noEmit` | PASS | Current source |
| `npm.cmd run build -- --manifest --outDir tmp/staging-validation-build` | PASS | Production Vite build using synthetic invalid API host/public key |
| `git diff --check` | PASS | Existing line-ending warnings only |
| Full repository Vitest | NOT TESTED | Not rerun; prior 151 baseline failures remain unresolved |
| Isolated PostgreSQL authorization harness | NOT TESTED | Not rerun this task; previous aggregate PASS remains previous evidence |

Focused coverage includes gateway/session denial, same-account deduplication, account-switch races, PWA avatar invalidation, registration TUS/bulk reliability contracts, Admin lifecycle, renewal/YPOP synchronization, account isolation and exports/Section 35. The real Storage matrix is still BLOCKED regardless of these results.

Raw current test JSON: `tmp/staging-validation-focused.json`. Summary: [validation.json](validation.json). Static build sizes: [bundle-sizes.json](bundle-sizes.json). This build uses a different synthetic environment from the previous measured build, so byte differences are not attributed to a source optimization or regression. Build retains large-chunk and Browserslist-age warnings. The tracked normal build directory stayed unchanged. No authenticated egress/latency improvement is claimed.

## Prepared handoff and next authorization

- [Exact setup and acceptance procedure](setup.md): isolated workspace, reviewed schema baseline, synthetic actors, conditional staging-only commands, hostname fix, gateway/client/cutover order and actual API checks.
- [Frontend environment template](frontend.env.example): placeholders only, no private credentials; load only in the isolated frontend.
- `fixtures/synthetic-document.pdf` and `fixtures/synthetic-image.png`: generated test bytes without personal information; no real document copied.
- [Discovery evidence](discovery.json), [live migration history](live-migration-history.json), migration comparison and validation summaries.

**Required decision:** designate a project explicitly authorized for isolated testing, or authorize a new cloud project with organization/region/cost limit. A local alternative requires Docker/container support. Do not send passwords or service keys in chat; provide secrets through the approved secure mechanism after the target is selected.

## Production rollout and safe recovery

Not executed. Required later order is: **approved foundation → compatible Admin gateway → compatible frontend → final pre-cutover checks → restrictive Storage cutover → post-cutover authorization checks**. The unrelated 33-policy performance migration stays separate and unapplied.

Pause on policy drift, unowned/mismatched legacy objects, incorrect signing, denied legitimate workflows, unauthorized mutation, cache/account leakage or increased failures. Before cutover, roll back the candidate frontend if necessary while retaining inert foundation metadata. After cutover, keep the secure gateway/client, temporarily disable the affected operation and make a reviewed forward correction. Never restore known-vulnerable bucket-only policies as routine rollback. Apply migrations transactionally with failure rollback.

Cache clearing/logout/revocation cannot revoke already-issued bearer links. The current download/upload lifetimes remain unchanged; no shorter lifetime is recommended from unexecuted tests. Public news HTTP serving remains public independently of metadata policy restrictions.

**Production readiness recommendation: BLOCKED.** Complete target authorization, schema portability/equivalence and the real API/workflow matrix before production approval. Production data, policies, objects, Auth configuration and Edge Functions were left unchanged; nothing was pushed or deployed.
