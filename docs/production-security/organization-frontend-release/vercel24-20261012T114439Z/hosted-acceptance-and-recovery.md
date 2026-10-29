# Candidate-only hosted acceptance and recovery

## Before a separately authorized submission

1. Obtain authorization for the exact source ZIP/hash/revision and `yorbms_user` project/team. Confirm the known TypeScript FAIL is accepted for candidate validation only.
2. Authenticate using the existing official Vercel CLI flow. Independently verify team `team_lrnDtn1fujS9WebCMQoWHmGR`, project `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N` and current aliases/settings. Do not modify provider settings implicitly.
3. Reconfirm live Organization `dpl_HGFE2BwongbW7ncM4kn6cQ48ffeV`, Admin `dpl_AZ287kU35oFTVqyTEQRf749qncAA` and production Admin gateway ACTIVE v1. Investigate drift before proceeding.
4. Establish no competing deployment/promotion/shared-main push. A read-only provider snapshot cannot prevent another operator from acting.
5. Verify all 562 source identities, the archive size/hash, four public settings/fingerprint, Node major and Python/API configuration. Extract to a fresh source-only directory; reject unexpected files. Create only the trusted exact Organization/team local project mapping needed by the reviewed CLI route.
6. Use the reviewed official Vercel CLI production-without-domain route (`--prod --skip-domain --force`) with explicit Organization project/team identity. Reverify CLI version/options at the future execution boundary. No `--prebuilt`, Git push or dirty-root upload.
7. Create an exclusive operation lock, new durable attempt marker and sanitized receipt. Submit once; if response is uncertain, reconcile provider state read-only and stop. No automatic retry or promotion.

## Hosted build and non-destructive HTTP checks

Record PASS / FAIL / BLOCKED / NOT TESTED individually:

- READY deployment ID, immutable URL, exact team/project/source and deployed runtime/configuration.
- Hosted `npm ci`, Radix postinstall, Node 24, wrapper and Vite completion. Confirm extra provider `VITE_*` inputs are excluded; no setting changes are made just to force a pass.
- Fetch all 53 browser-served files using authorized access. Compare path/size/hash to `static-manifest.json`; distinguish the internal Vite manifest from public client assets if provider serving rules differ. Investigate all differences, including OS/runtime effects.
- Verify fixed version, public production origin/key class/configuration fingerprint and bounded secret/canary patterns privately. Never print public key literals, private credentials, signed URLs or file contents.
- Verify root, `/dashboard`, `/app` and actual registration/renewal deep routes from the archived router. Use direct HTTP where possible to avoid service-worker provenance ambiguity.
- Verify preserved SPA rewrites, CSP/security headers and Python function packaging/imports. `/api/sync-run-once` GET must be 405 and OPTIONS 204. No external sync POST.
- Confirm Admin and Organization live aliases remain unchanged. Candidate READY does not authorize promotion.

Vercel Authentication protection may block anonymous automated HTTP. Use an operator-assisted in-browser, same-origin bounded inventory checker if needed, without exporting cookies/tokens or collecting bypass secrets. Keep operator-reported evidence distinct from independent automated evidence; do not label protected HTTP as a failed application test.

## Owner browser acceptance before promotion

Use only separately approved existing operator sessions/resources; do not harvest tokens, create sessions, mutate business records, upload/delete files or reopen approved documents under candidate-only permission.

- Login-state recovery and dashboard/registration/renewal status display; verify relevant Realtime refresh behavior where safely observable.
- Owner signing/preview/download through genuine Organization JWT and correct production backend, with other-account UI state cleared on switching. Validate hashes only with authorized designated evidence; do not invent integrity PASS.
- Registration/renewal/revision upload behavior has local mocked coverage. A real upload/resubmission requires a separately approved editable disposable state; mark it BLOCKED if unavailable.
- Avatar display/cache isolation; full upload/removal cleanup has existing camel-case/raw-row debt and is not certified here.
- Public templates and published news. Do not authorize unknown historical paths or delete unlinked files to make a smoke check pass.
- Mobile viewport checks are not physical-device or installed-PWA validation. Existing separate PWA download/offline changes are not in this candidate.

Existing baseline errors/known PWA limitations need explicit proportionate acceptance or separate fixes before claiming broader UAT completeness. Do not conceal errors behind the successful Vite build.

## Recovery

- Before domain promotion, a failed candidate leaves live aliases unchanged. Preserve its immutable ID, logs and consumed marker; prepare a reviewed forward fix. No automatic redeploy or rollback.
- Preserve a READY, acceptance-tested compatible candidate as a future recovery artifact. This local archive is not yet a verified hosted recovery deployment.
- Promotion requires separate exact-deployment authorization and enumeration of every affected alias, excluding Admin. Do not combine it with Storage cutover.
- If a promoted Organization build later misbehaves, prefer a separately reviewed forward correction or pause of the affected workflow. An earlier tested compatible deployment may be promoted only with separate authorization and current backend compatibility checks.
- The current old Organization frontend is not a generally safe recovery choice after restrictive policies because its upsert/cache behavior is incompatible. Never restore permissive policies or the old Admin missing-session fallback to bypass denials.
- Preserve all historical files, completed renewal evidence, containment/document guards and gateway configuration.

## Separate Storage-cutover blockers

The earlier inventory retains 215 unresolved private objects and 56 unreferenced template versions; none was declared unused. Operators must approve retention with known ordinary-access denial or a supported evidence-based remediation. The separate Admin budget-deletion cleanup needs mitigation. Fresh exact catalog/policy/data gates and separate cutover authorization are still required. No SQL, gateway or data change is part of this frontend candidate.
