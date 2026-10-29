# Independent Admin frontend release plan

Prepared locally; no Vercel operation or Git push occurred.

## Exact base and scope

Base: approved Admin deployment `dpl_AZ287kU35oFTVqyTEQRf749qncAA`, source revision `0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324`.

The approved archive SHA-256 `a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465` and all 561 source identities were verified. The runtime overlay is in `admin-release-overlay/`; exact old/new hashes are in `frontend-overlay-identities.json`.

Four runtime files:

- `src/lib/admin-budget-deletion-pause.ts`: one typed pause error and shared user-facing message.
- `src/lib/lydo-connect-supabase.ts`: the budget-deletion API always throws before session lookup, RPC or Storage calls; its existing public TypeScript signature remains.
- `src/admin/components/BudgetRequestsTable.tsx`: disabled deletion button with accessible explanation; selection, clear selection, filters and review remain.
- `src/admin/AdminPortal.tsx`: remove the destructive handler, associated temporary state and misleading confirmation. Other deletion/review workflows are untouched.

The two updated regression test files are source/test inputs, not runtime changes. Historical tests and original dirty files are preserved under `original-local/`. Assertions that previously permitted deletion are replaced because the operator explicitly changed the requirement to an unconditional pause. The old shipped client is separately exercised against the deterministic server error.

## Validation already performed

- 46/46 focused workspace Vitest tests, including real component rendering, budget lifecycle/monitoring and an isolated execution of the actual previously shipped deletion client against a mocked PT409 response. No live API mutation.
- Isolated Windows Node 24.21.0 production compilation: PASS; 53 generated files.
- 558 existing source identities outside the three replaced runtime files remain byte-identical; one new module is added.
- Actual app TypeScript: FAIL, 647 diagnostics versus 651 in the immutable base; zero new diagnostic identities, four removed. 61 existing diagnostics remain in runtime-scope files. Do not call this a TypeScript PASS or assume all technical debt is harmless.
- No private environment files are loaded. The existing public anon key is extracted only in memory from the previously approved public build and checked against the approved four-setting configuration fingerprint `27f1d9985bcbd49ba2d930f46577548e93e8c023be093b3a18f9261ddc81843a`. No value is logged.

The local compilation intentionally retains the old build recipe/version for compatibility checking. Its output is **not a deployment-authorized artifact**. It does not establish Linux/Vercel execution or hosted/browser acceptance.

## Required before a later candidate deployment

1. Install/verify the server pause under separate authorization. A disabled button alone cannot contain stale clients.
2. Package from the exact approved isolated base plus this overlay and updated tests, never the dirty root. Give the release a distinct fixed version in its reviewed packaging config; preserve Node 24, clean environment projection, routes/CSP and Python API packaging.
3. Run the focused tests within that isolated package. Retain the old shipped-client characterization as a local immutable fixture/test input; do not depend on a developer-specific `.agent` path in a portable test bundle.
4. Produce/review a complete source inventory, source ZIP hash/size, static inventory/archive hashes and bounded browser-secret scan. Review the known TypeScript debt against this precise candidate rather than suppressing it.
5. Independently verify Vercel team `team_lrnDtn1fujS9WebCMQoWHmGR`, Admin project `prj_J36xqAUQELX8NttCaFFInsxcCEaI` / `lydorg` and current aliases. Obtain a separate candidate-only authorization (`--prod --skip-domain --force`, explicit project/team, one attempt). No project-setting change or shared-main push.
6. Verify hosted source/assets, Node build, Python GET 405/OPTIONS 204, CSP and routes. An authorized operator should see the disabled deletion action for existing selected records, no destructive confirmation, and continued authorized review/download behavior. Do not delete/upload files or create sessions for acceptance without separate scope.
7. Promote only after a separate reviewed promotion authorization. Preserve the Organization/PWA deployment `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ` and `ytrace.app`.

## Recovery and release decision

Retain the new disabled-action candidate as the preferred compatible recovery artifact. The current live Admin deployment is gateway compatible and, after the server pause, safely stops on the deterministic RPC error; it can be a temporary recovery target only while the server pause remains installed. It still displays misleading delete UI, so prefer a forward UI correction. Do not restore the older missing-session-fallback frontend.

Both Vercel projects track the shared GitHub main branch. A shared-main push could replace either successful release. Use separately authorized isolated deployment/promotion operations only.

**CONDITIONAL GO for isolated Admin release preparation.** No candidate deployment or promotion is authorized. Remaining work is release identity/packaging, known TypeScript-risk review and bounded hosted acceptance, followed by separate deployment and promotion approvals.
