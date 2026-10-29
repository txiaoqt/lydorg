# Same-candidate operator acceptance

Candidate: **[Organization/PWA READY candidate](https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app)**  
Deployment: `dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ`.

Anonymous root and API GET/OPTIONS requests returned **302 to Vercel Authentication**. Deployment protection was preserved. No protected browser credentials were collected or exported.

## Hosted static/API checker

1. Open the immutable candidate using your own already authenticated Vercel account. This checker does not require an Organization login. Do not disable Vercel protection or provide cookies, tokens or bypass secrets.
2. Open Chrome DevTools. Under **Application → Service Workers**, enable **Bypass for network** for this check if a worker controls the page. Keep DevTools open. This does not delete caches or unregister the worker. Record whether bypass was enabled; `cache:no-store` alone cannot prove service-worker bypass.
3. Open **Sources → Snippets** (under the `»` menu if hidden), choose **New snippet**, and paste the complete [operator-hosted-check.js](operator-hosted-check.js). Do not edit an extension's `content-script.js`.
4. Keep the candidate page active and run the snippet with **Ctrl+Enter**. It stops if the origin differs from the exact immutable candidate.
5. Copy only the JSON printed after `YTRACE_HOSTED_ACCEPTANCE_JSON`. It contains public asset paths/hashes and HTTP/header results, not cookies, tokens, file contents or private document URLs. Include whether network bypass was enabled and any visible failure code. Do not paste the rest of the Console or Network headers.

The checker was prepared and syntax-checked locally; **it has not been executed in your browser**. It reuses the earlier accepted Admin same-origin checker, adapted to this Organization deployment and the approved 53-file inventory. Its identity is recorded in `operator-checker-identity.json`.

Expected results:

- 53/53 matching generated assets, no secret/canary findings.
- Root, `/dashboard`, `/app`, `/document-submission`, `/organization-renewal`, `/app/documents`, `/app/renewals` return the approved SPA shell and expected security headers. This checks delivery, not authenticated page behavior.
- `/api/sync-run-once`: GET **405**, OPTIONS **204**. No POST or external synchronization.
- If `.vite/manifest.json` is deliberately not served, the checker reports that build-metadata check **BLOCKED**. Do not count it as a matching browser artifact or silently discard it.
- Protection/network failures remain BLOCKED; actual content/status/header mismatches remain FAIL. Stop and report any failure; do not modify settings or redeploy.

Requests are same-origin GET/OPTIONS only, with bounded response sizes. The helper does not read local/session storage, cookies or Auth sessions; it does not call Supabase/private Storage. Browser authentication cookies accompany same-origin requests normally and are never inspected. Its request counters cover the helper, not unrelated background activity of the running app.

## Planned owner smoke checks — NOT EXECUTED

Use existing developer-owned accounts and designated existing documents. This task did not create or refresh Organization sessions. A fresh login/logout or same-context account-switch test requires a separately approved manual session window; do not send session tokens to the agent.

| Check | Expected observation |
| --- | --- |
| Normal Organization login | Existing normal login UI reaches the Organization surface; record only outcome/errors. |
| Dashboard and submission | Existing organization, current registration/renewal status and submission visible; no edits/submission actions. |
| Existing document preview/download | Authorized owner sees its existing file with the correct filename; no signed URLs in evidence. Compare content hash only when a trusted expected hash is available. |
| Registration/renewal access | Existing supported files resolve under the current owner; approved documents remain locked. Do not reopen or replace them. |
| Account switching | Previous organization's previews, avatars, private queries and signed references disappear; the next account sees only its own data. |
| Avatar and logout UI cleanup | Existing avatar display and in-memory cleanup behave correctly. Do not upload, remove or replace the avatar. |
| Public templates/news | Existing active templates and published news render; no deletion/relinking of historical objects. |
| Realtime/status refresh | Relevant status displays remain current where safely observable. No workflow mutation is authorized to manufacture an event. |

The existing camel-case/raw-row avatar cleanup defect can leave the old physical object retained. Display/logout smoke results do **not** prove avatar replacement/deletion cleanup. Keep that defect and existing Realtime typing risks visible in the promotion review. Installed-PWA/offline, interrupted uploads, device testing and the separate PWA download fixes are not certified by these checks.

## After evidence

Return the sanitized checker JSON and owner observations for this exact candidate. Any actual mismatch requires investigation. Production-domain promotion still requires separate exact-deployment authorization; no new deployment is needed merely to complete these checks.
