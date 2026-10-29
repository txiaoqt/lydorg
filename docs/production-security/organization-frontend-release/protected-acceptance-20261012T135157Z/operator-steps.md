# Protected Organization candidate acceptance

Exact candidate: [dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ](https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app).

## Reviewed checker

Use the unchanged [operator-hosted-check.js](../candidate-deployment-20261012T122419Z/operator-hosted-check.js).

SHA-256: `02f37c21c749a846eca2fb96912641600204204b6802d41f80e7478de52bfde0`.

Source review and six offline mock checks passed. Its embedded 53-file inventory exactly matches the approved manifest, fingerprint `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94`; expected headers match the candidate's reviewed Vercel configuration. These are local review results, not hosted acceptance results.

The checker initiates at most 62 same-origin requests, only GET/OPTIONS, each with a 30-second deadline and a response-size bound. Redirects are not followed. It does not read cookies, local/session storage, IndexedDB, Auth sessions or private documents. Existing Vercel cookies accompany same-origin requests normally and are never inspected or exported. It fetches the versioned public sample PDF as a static build artifact. It does not execute fetched JavaScript, navigate the app, invoke sync POST or initiate business mutations. The already-running application's background activity is outside its counters.

## Run once in your existing authenticated browser

1. Open the exact immutable candidate above using your own existing Vercel Authentication. No Organization login is required for the checker.
2. Open Chrome DevTools with F12. In **Application → Service Workers**, note whether this page is controlled. If controlled, enable **Bypass for network** and leave DevTools open. This does not remove caches or unregister the worker. Do not disable deployment protection or export browser authentication.
3. Open **Sources → Snippets**. If hidden, use `»` or expand the Sources navigator. Choose **New snippet**, then paste the entire reviewed checker. Do not edit an extension content script.
4. With the candidate page active and the main page selected as the execution context, press **Ctrl+Enter**. Wait for `YTRACE_HOSTED_ACCEPTANCE_JSON` in Console.
5. Return only that JSON, plus **Bypass enabled / no worker controller / bypass not confirmed**. Do not send the rest of Console, Network request headers, cookies, signed URLs or tokens.

Expected: 53 matching files; correct root and six SPA routes; expected CSP and security headers; API GET **405** and OPTIONS **204**; no bounded secret/canary findings.

If `.vite/manifest.json` is deliberately not exposed, that item stays **BLOCKED**, not PASS. Actual asset/header/status mismatches are FAIL and require investigation. A Vercel protection or network interception remains BLOCKED. The script cannot independently attest that you enabled DevTools bypass: record this as an operator statement.

## Existing-account observations

Report only checks actually performed on this exact candidate. No agent login automation or browser-session extraction is used. Do not manufacture Realtime events by editing a record.

| Check | Operator result: PASS / FAIL / NOT TESTED |
| --- | --- |
| Existing-account login | Pending |
| Dashboard/navigation | Pending |
| Submission and registration/renewal status display | Pending |
| Existing private document preview | Pending |
| Existing private document download and filename | Pending |
| Registration/renewal page access; approved documents locked | Pending |
| Public active templates and published news | Pending |
| Account switching clears previous private data, previews and avatar | Pending |
| Realtime status refresh, only if a legitimate event was safely observable | Pending |

Use sanitized outcomes, not account names, filenames, contents, signed URLs or credentials. No uploads, deletion, replacement, resubmission or approval is permitted in this acceptance task.

## Existing risks retained for promotion review

- Actual app TypeScript remains **FAIL: 651** preserved baseline diagnostics. Prior source/compiler/declaration comparison explained the one formatting variation; no new diagnostic was established. No typecheck or build was rerun in this acceptance task.
- Avatar cleanup reads `profileImageUrl` from a raw row containing `profile_image_url`. Replacing/removing an avatar can leave the old physical object retained. This is a confirmed existing defect. Display/account-switch smoke checks do not establish physical cleanup. No destructive test or fix is authorized here.
- Six Realtime callback typing errors are not, by themselves, proof of a runtime failure. Live registration/renewal refresh remains unverified unless an operator actually observes a legitimate event. Manual reload is a temporary operational mitigation for stale status, not a claim that Realtime passed.
- Installed-PWA, physical-device, offline and interrupted-upload behavior are not certified by this candidate's static checker. Separate PWA download/offline changes are not part of its approved seven-file runtime subset.

Keep hosted checker results, operator smoke observations and independently authenticated provider metadata as separate evidence categories. Promotion requires separate authorization naming this exact existing deployment; broader Storage policy cutover remains a separate release.
