# Independent Organization/PWA release plan — preparation only

## Release boundary

Target only Vercel `yorbms_user` / `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N`, team `team_lrnDtn1fujS9WebCMQoWHmGR`. Desired production domain: `ytrace.app`. Preserve Admin `lydorg` and deployment `dpl_AZ287kU35oFTVqyTEQRf749qncAA` throughout.

Current Organization recovery/reference deployment: `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`. It is retrievable by provider metadata and still serves the old frontend; it is not certified as compatible with the later restrictive cutover.

No deployment/promotion command was executed in this review. Neither project setting nor shared Git branch was changed.

## A. Complete the isolated provider recipe locally

1. Use only the final source archive and manifest in `release-artifacts.json` / `source-manifest-release.json`; preserve the dirty repository and earlier candidate evidence. Never upload the repository root or superseded archives.
2. Prepare an independently reviewable Node 24 build recipe. Reuse the proven Admin environment-projection pattern, scoped to the Organization app. Do not copy the Admin deployment/project identity or mix in unrelated runtime changes.
3. Preserve the provider's framework/output and API/Python behavior. Pin lockfile installation and fixed version/build inputs. Avoid assuming provider `npm install` / `npm run build` equals the reviewed controlled local Vite invocation.
4. Explicit public values only:
   - `VITE_DEPLOY_SURFACE=user`
   - `VITE_ENABLE_STANDALONE_USER_PWA_UI=true`
   - `VITE_SUPABASE_URL=https://mqqaykksadotbrghbexz.supabase.co`
   - existing correct-project public **anon** key, supplied through approved provider configuration without printing it.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Exclude root/private env files and provider/operator secrets from Vite; do not forward arbitrary `VITE_*` values without review. The present four-value fingerprint is `cb861a63dc9a73eda9a295c21d659fabed8ea4dba15bf8722264b281e9c525bf`.
6. Re-run focused checks only as needed for the recipe change, document the 651 existing compiler errors and no-new-diagnostic comparison, and pin the resulting archive/source/static hashes. This review's archive is not silently promoted to an approved hosted payload.

## B. Separately authorized candidate-only deployment

1. Review the exact new source/archive/build identities and obtain explicit candidate deployment authorization naming the Organization project, team and hashes.
2. Establish a no-competing-deployment window. Recheck both project aliases, deployment statuses, exact project link and ACTIVE production gateway. A provider snapshot alone cannot prevent another operator or a Git push.
3. Use the supported authenticated explicit-project CLI route from a fresh isolated source directory. Candidate-only production-target semantics must retain `--prod --skip-domain --force`, with pinned team/project identity. Do not use `--prebuilt` on the plain static ZIP.
4. Create a durable one-attempt marker, exclusive local operation lock and sanitized receipt; submit once. On uncertain provider outcome, reconcile read-only and stop rather than resubmit.
5. No shared Git push: both projects currently track the same `main`. Do not replace the successful Admin release or modify Git deployment controls implicitly.

## C. Hosted acceptance before promotion

- Require READY and independently verify deployment identity, Node 24, installation, isolated environment wrapper, Vite and Python packaging.
- Compare all generated browser assets to the reviewed inventory, investigating any differences. Scan browser text for secrets/canaries without logging key material.
- GET root, `/dashboard`, `/app` and relevant deep owner routes; verify CSP/headers and harmless `/api/sync-run-once` GET/OPTIONS only. Do not invoke POST.
- Use separately approved existing operator sessions/resources for owner preview/download and account switching. Do not harvest tokens, create sessions or mutate locked records. If no trusted session is provided, mark those checks BLOCKED and obtain proportionate operator browser evidence.
- Verify owner Storage SDK requests stay on the exact production backend with current organization JWT; do not use the Admin gateway or service-role credentials to impersonate owners.
- Confirm active templates and published news resolve; keep unresolved historical objects denied unless genuine supported metadata/access is separately approved.
- Reconfirm Admin alias and Organization live alias remain unchanged during candidate-only acceptance.

## D. Separate production-domain promotion

Only after acceptance, obtain a separate authorization for the exact READY deployment. Enumerate every alias the provider promotion will affect; stop if Admin or an unintended domain is included. Promote once without rebuilding/pushing. Verify public direct HTTP artifact identity, routes, headers/API, unchanged Admin alias and gateway.

Retain the immutable compatible candidate and source/build evidence as the preferred future recovery reference. No automatic promotion or rollback is included in this plan.

## E. Storage cutover remains a separate release

Prerequisites:

1. Approved disposition/access decision for 215 unresolved private objects and 56 template versions. Retain objects; do not infer permission from seeded status or path alone. Prioritize the two current-owner budget/liquidation cases.
2. Separate Admin budget cleanup decision: pause affected destructive cleanup or deploy a reviewed resource-bound server solution. Empty successful DELETE output is not evidence of physical removal.
3. Organization candidate hosted/owner acceptance and separate domain promotion complete; Admin remains gateway-compatible.
4. Rebaseline immediate production catalog, policy, reference, privilege and protected-data fingerprints to the already-installed foundation, containment and document guards. The old standalone cutover's current hash does **not** prove its historical catalog gates still match current production.
5. Review any necessary compatibility-gate-only updates and obtain exact separate SQL authorization. Do not append unrelated migrations or replay foundation/hotfixes.

Existing reviewed artifacts retained unchanged:

| Artifact | SHA-256 | Scope |
| --- | --- | --- |
| `production_storage_foundation_review.sql` | `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2` | Already installed; no reinstallation |
| `production_storage_policy_cutover_review.sql` | `3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c` | Retained candidate; fresh exact gates and new approval still required |

The cutover replaces twelve permissive policies with six narrow owner/public-reference policies, preserving the other three (nine total). No private UPDATE grant is introduced. Verify exact pre/post definitions, ownership, bound resources, and retained objects when that separate release is approved.

## Recovery and stop rules

- Before any future submission: stop on changed project/alias/source/environment/catalog state; do not silently rebuild/rebaseline.
- Candidate deployment failure: preserve receipt and failed deployment; no automatic retry and no domain change.
- Promotion defect before cutover: prepare a reviewed forward correction or explicit temporary pause. Any return to the old Organization deployment needs a fresh assessment of known upsert/cache deficiencies and retained policies.
- After cutover: prefer the retained compatible deployment or a reviewed forward correction. Do not restore permissive policies or the old Admin frontend as a shortcut.
- Protect all historical objects and business records. Do not delete/relink data to satisfy an access test.
- Keep full PWA download/offline fixes independent; do not describe this storage-only release as the completed installed-PWA release.

## Readiness

**CONDITIONAL GO — local isolated release preparation.** Node 24 hosted recipe, candidate authorization/acceptance and promotion are pending. **NO-GO — restrictive Storage cutover now.** Historical-access decisions, Admin cleanup mitigation and new exact production gates/authorization remain pending. No broad staging reconstruction or completed UAT repetition is needed.
