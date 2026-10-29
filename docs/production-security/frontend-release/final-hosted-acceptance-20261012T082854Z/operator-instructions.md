# Minimal operator-assisted hosted check

This check uses the already signed-in browser. It does not read/export cookies, localStorage, session tokens, passwords or bypass credentials. It makes bounded **same-origin GET and OPTIONS** requests only. It does not log response bodies, invoke synchronization, access private files, or create an application session.

1. Open the existing immutable candidate in the same browser that passed your manual tests: <https://lydorg-7bb5w6yag-toffs-projects-81b2ce10.vercel.app>. Keep its existing Vercel access. Do not sign in to another Y-TRACE account for this check.
2. Open the adjacent `operator-hosted-check.js` file locally and review it. Open the candidate's browser developer tools, use **Sources > Snippets > New snippet**, paste the file, and run it with **Ctrl+Enter**. The script refuses any other origin. If your browser blocks execution or access, stop and report BLOCKED; do not disable protection or export a HAR/cookie/session file.
3. Copy only the final `YTRACE_HOSTED_ACCEPTANCE_JSON` JSON result back for review. It contains public paths, response statuses, byte counts, hashes, header-mismatch names and bounded secret-scan counts. No credential or response-body values are included.

The check may take around one minute depending on the connection; it reads 53 public build artifacts sequentially. A public sample PDF is part of the approved static inventory; no private production document is requested. No file is saved or downloaded by the helper.

Expected results:

- 53/53 asset byte lengths and SHA-256 hashes match the pinned inventory.
- Root and deep Admin routes return the same application shell and the six expected security headers, including CSP.
- `/api/sync-run-once` returns **GET 405** and **OPTIONS 204**. No POST is made.
- No service-role/secret-key/session literal or diagnostic canary pattern is detected in textual artifacts. This bounded scan is not an exhaustive secrets audit.

If `.vite/manifest.json` returns 404 or the application shell, the helper marks that **build-metadata file BLOCKED**, not passed. Preserve that evidence for compatibility review; do not alter the inventory. Any mismatched runtime asset, unexpected API response or header mismatch requires investigation. A service-worker controller, if present, is reported because HTTP cache bypass alone does not prove fresh edge provenance.

Prepared helper SHA-256: `688023bc5d94d16d54b7fd419dcaac48d7e97aab70519d02a443a01bd8583b81`.

The helper has been generated from the approved inventory and syntax-checked locally. It has **not been executed in your authenticated browser**. Its results remain pending; this document is not a PASS claim.
