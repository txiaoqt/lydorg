# Production gateway acceptance — operator inputs

Production: `mqqaykksadotbrghbexz`. Gateway: `admin-storage-access`.

## Current result

**Local preparation: READY. Actual positive acceptance: BLOCKED pending an existing operator-provided session and explicit resource approval.**

The branch remains `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty work was preserved. No gateway/application source, migration, policy or production record was changed.

The control plane identified the exact production project as ACTIVE_HEALTHY with the expected direct PostgreSQL endpoint. Bounded native read-only inspection used the existing credential loader and independently trusted CA settings. Verified PostgreSQL 17.6, TLS chain/hostname and read-only identity checks passed. The installed `resource_references` and `admin_authorize_storage_operation` source fingerprints matched the reviewed foundation definitions.

One optional control-plane catalog query returned HTTP 500. It made no writes. The necessary file selection completed over the previously verified native TLS read-only route. A local Windows PowerShell ACL child initially could not autoload its security module because it inherited PowerShell 7's module path. The helper now lets that ACL-only child discover its own system modules; ACL requirements were retained.

## Exact custom Admin session handling

- `src/hooks/use-auth.tsx` calls `authenticate_admin_account` during normal login, then stores its returned custom `session_token` as `sessionToken` through `writeAdminSession`.
- `src/lib/admin-auth.ts` uses localStorage key **`lydo_admin_session_v1`** on the **Admin Portal website origin**. Its record contains `sessionToken` and `expiresAt`. Client inactivity restrictions also apply; a future timestamp alone is not proof of a valid session.
- `src/lib/admin-storage-access.ts` sends that custom token in the JSON body field **`sessionToken`**. It is not an ordinary Supabase Auth JWT or a project API key.
- The deployed authorization RPC calls `validate_admin_session_token`, checks an active Admin and current server-side role/permissions, then resolves the authoritative metadata/ownership relationship.
- Read-only review of the validator confirmed that a valid invocation updates `last_used_at`, with no expiry extension. No validator or login was invoked by this preparation.
- The sign branch derives authorization from the exact bucket/path and authoritative references. `resourceId` is populated with the verified submission ID for this request, but is not an independent authorization boundary for signing in the deployed implementation.

### Supply your own existing session manually

1. Use **your own already signed-in production Y-TRACE Admin Portal tab**. Do not use another person's browser, the Supabase Dashboard, a staging tab or a demo session. Do not sign in again for this task.
2. Open Chrome/Edge DevTools → **Application** → **Local Storage** → the actual production Admin Portal website origin.
3. Select **`lydo_admin_session_v1`**. Inspect the record privately. Locate **`expiresAt`** and **`sessionToken`**. Do not paste the record into the Console, chat, screenshots, issues or reports.
4. In the repository's local PowerShell terminal, run the preparation command below. Enter `expiresAt` when prompted. Leave the independent expected SHA-256 empty unless you have a genuinely independent approved hash.
5. Manually copy **only your `sessionToken` value, without JSON quotes**, and paste it into the **hidden** token prompt. Do not supply a password, a Supabase JWT, an anon key or a service-role key. Clear your clipboard afterward; avoid clipboard-history/cloud synchronization for this secret.
6. Expect **`PREPARED_NOT_EXECUTED`**, with `gatewayRequests: 0`. This is local input validation, not proof of server authentication or authorization. The token is discarded when the preparation process ends and must be entered again for an independently authorized execution.

```powershell
# Run from the repository root. This command NEVER sends a gateway request.
& .\scripts\security\prepare-production-gateway-acceptance.ps1 -Candidate DOC-01
```

If the record is absent, expired, revoked, inactive or otherwise invalid, **stop**. A fresh normal login would create an Admin session and normal authentication/audit activity; it requires separate approval. Never obtain a replacement token from database hashes.

## Select one existing file

The metadata selection found these candidates without signing or downloading any content:

| Local label | Kind | State | Bytes | Required server permission |
|---|---|---|---:|---|
| DOC-01 | Registration PDF | approved_green | 81,263 | Super Admin, registrations_management, or yorp_registry_view |
| DOC-02 | Registration PDF | approved_green | 81,263 | Super Admin, registrations_management, or yorp_registry_view |
| DOC-03 | Registration PDF | approved_green | 81,562 | Super Admin, registrations_management, or yorp_registry_view |

These are **metadata-eligible candidates**, not a claim that the as-yet-unsupplied Admin session is authorized.

Privately open the local selection file to review the original filename and exact bucket/object, document, submission, organization and owner IDs:

```powershell
notepad.exe .\.agent\security\production-gateway-acceptance\candidates.local.json
```

Keep these details local. The containing directory has protected Windows ACLs allowing only the current Windows user and SYSTEM. The file inherits those two rules. Effective Git exclusion and absence from tracked files were verified. No credential is written to this file. Its initial SHA-256 is `66a333ef7ab4e77a86c0ca4ace0c01670cf503cd65187e67b7542fbf5534e400`.

Selection requires a current `document_submission_files` reference, a genuine submission/profile relationship, an existing private Storage object whose owner matches the organization Auth user, a reviewable reference, and no ambiguous cross-organization association. No guessed or unlinked historical path is used. Files are bounded to 20 MiB. Full paths, names and IDs are omitted from this report and helper output.

The read-only export is write-once and will refuse to overwrite this snapshot. Preparation rejects snapshots older than 24 hours. Actual execution must freshly verify the approved file and current Admin permissions; if state differs, stop rather than silently select another file.

## Local security and validation

- `prepare-production-gateway-acceptance.ps1` uses `Read-Host -AsSecureString`, passes the token only through a child process's stdin, clears the unmanaged buffer and drops managed references on exit. Managed strings necessarily exist briefly in process memory; immediate forensic zeroization of every managed copy is not claimed.
- No token appears in CLI arguments, environment variables, files or output. No `.env.gateway-acceptance.local` is needed or created. That optional filename is already effectively Git-ignored, but would require a separately restricted file ACL before use.
- The helper has **no execute mode**, no browser-storage access, and no login, signing or download request code. A misspelled/extra execution argument fails closed.
- The candidate-export mode is fixed to the existing exact production native TLS connection, enforces read-only identity and authorization-definition gates, verifies Git exclusion and restrictive Windows ACLs before retrieving metadata, and emits only redacted candidate summaries.
- JavaScript syntax and PowerShell parser checks passed. Ten local synthetic input/sanitization checks passed. An actual wrapper dry run with a synthetic token and selected metadata passed with zero gateway requests. These are not genuine Admin authentication tests.

### Windows PowerShell 5.1 correction

The first operator preparation stopped after hidden input because .NET Framework's `ProcessStartInfo` does not expose `StandardInputEncoding`. The initial dry run had used PowerShell 7 and did not cover that runtime difference. The reported session expiry was still in the future when investigated; expiration was not the demonstrated cause.

The wrapper now writes explicit UTF-8 through a `StreamWriter` over the redirected stdin pipe, supported by both runtimes. It also checks operator-reported expiry before requesting the token and emits allowlisted error codes with a local execution phase. Raw exceptions and secret inputs remain suppressed. No authorization, Git or ACL guard was removed.

An actual Windows PowerShell 5.1 synthetic wrapper run passed with `PREPARED_NOT_EXECUTED`, no token echo and zero gateway requests. An initial sandboxed test was prevented by the local security context; the same benign check passed in the trusted tool context without changing execution policy. No genuine Admin token was read or reused, and no production network request was made during this correction.

## Explicit confirmation required

After privately checking the file and confirming that your existing production Admin session remains valid, provide a non-secret confirmation such as:

> I approve my own existing production Admin session and DOC-01 for one gateway signing request and one in-memory download. An independently trusted expected hash is [available locally / unavailable].

Do not include the token, object path or private filename in that confirmation. Selecting a candidate in the preparation command alone does not execute or authorize a production request. No permission-denial resource has been designated; that optional test remains BLOCKED unless separately approved.

## Narrow next execution boundary

After explicit confirmation only: re-prompt for the same existing session; verify its current server validity/permission and approved metadata; send exactly one `sign` request to the fixed production gateway; privately verify HTTPS origin, exact object scope and the reviewed 3,600-second expiry; perform one bounded GET with redirects/retries disabled; hash bytes in protected process memory; compare only to an independently approved expected hash if supplied; discard bytes and signed URL. No HEAD, file persistence, upload/delete/reservation or alternative-path probing is included.

If no independent expected hash is supplied, record successful download separately and mark content-integrity comparison **NOT TESTED**. A locally calculated download hash alone is not an independent comparison. Optional permission denial requires a safely designated genuine resource and must stop on an unexpected grant.

Record sanitized HTTP status/timing/byte-count evidence only. Never persist request/response bodies, tokens or signed URLs. Verify session expiry remains unchanged and account for any permitted `last_used_at` change separately. Recheck production preservation without concealing unrelated concurrent activity. Do not retry an unexpected or ambiguous result.

No gateway signing or download request was made during this preparation. Production inspection was limited to read-only catalog and metadata checks. Positive signing/download remains BLOCKED; frontend deployment still requires completed acceptance and separate authorization. Previous gateway/preservation results remain historical evidence, not new test results from this task.

## Authorized single-attempt execution — October 12

The operator explicitly authorized their existing production Admin session and **DOC-01** for one signing request and one in-memory download, with no independent expected hash. No additional execution approval is needed for this scope. The preparation token was discarded, so it must be re-entered locally; it is not available to the agent.

```powershell
# Run promptly from the repository root, while the supplied existing session is valid.
& .\scripts\security\invoke-production-gateway-acceptance.ps1
```

Enter the actual existing `expiresAt`, then the same operator-owned `sessionToken` at the hidden prompt. Do not log in again, paste secrets in chat or place the token in a file. The helper cannot create a session. It uses Windows PowerShell 5.1-compatible UTF-8 stdin and the existing private native PostgreSQL environment loader. No credential is supplied through arguments or persisted.

The new `run-production-gateway-acceptance.mjs` is fixed to DOC-01 and the exact pinned candidate manifest. Before the sole gateway request it requires current native TLS/read-only identity, exact catalog/foundation definitions and grants, unchanged selected metadata/ownership, and the operator-supplied token's current server-side session and permission. Independent control-plane evidence is fresh for five minutes; expired evidence stops execution without sending a request and requires a read-only refresh. No gate is bypassed.

An exclusive local lock and a durable write-once attempt marker prevent concurrent/repeated execution. After submission, **do not rerun**, even if the response is uncertain. Preserve `.agent/security/production-gateway-acceptance/positive-attempt-started.local.json` and its sanitized `positive-acceptance-receipt.local.json`. These contain no token, URL, private filename, resource IDs or file content. Only the verified process's own lock is released.

The single POST must return HTTP 200 and a no-store response. The helper privately checks the signed URL's exact HTTPS origin, object scope and one-hour expiry, then makes one bounded GET without redirects or retries. Expiry-claim decoding is only a consistency check; Storage verifies the signature during GET. PDF bytes remain in memory, match the authoritative size/PDF header, are hashed and discarded. No private PDF is saved. A signed URL remains usable until its server expiry; discarding client memory does not revoke it.

Postflight compares the complete catalog/foundation excluding only capture timestamps, all 56 non-session protected inventories, the selected document/object, and every Admin session. The only allowed session change is the supplied session's `last_used_at`; its expiry, other fields and every other session must remain unchanged. Unrelated concurrent changes are reported as preservation failures rather than concealed. All nine Edge Function identities are checked against the deployed inventory; a final independent control-plane check remains required after the operator run.

Fresh read-only readiness passed: foundation receipt and exact catalog matched, all 57 inventories were captured, DOC-01 ownership/metadata were unchanged, and counts were 164 migrations / 15 Storage policies / 378 objects / nine Edge Functions. Fourteen local synthetic URL-scope/expiry/buffer/capture-time checks passed; JavaScript syntax and PowerShell parser checks passed. These checks did not make any signing or binary download request.

**Actual authorized signing/download: awaiting hidden operator input. Independent hash comparison: NOT TESTED by agreement. Permission-specific denial: BLOCKED because no denial resource was approved. Frontend deployment remains separately authorized.**

### Operator run stopped before signing — session timestamp input

The operator run returned `EXISTING_ADMIN_SESSION_INVALID_OR_EXPIRY_MISMATCH`. That code is reachable only after the voluntarily supplied token matched exactly one current database session; it precedes the signing marker and gateway request. Local inspection confirmed no attempt marker, receipt or remaining operation lock. No signing or download was attempted.

A bounded native TLS read-only diagnostic found **zero** sessions with the operator-supplied exact expiry timestamp. It returned only aggregate status counts, and retrieved no token, token hash, account details or private document. This proves that the timestamp no longer identifies a current session; without retaining the supplied token, it does not establish the selected session's current validity or the complete failure cause.

The current Admin client normally calls `admin_refresh_session` during eligible user activity and updates the stored `expiresAt`. That existing behavior can make an earlier copied timestamp stale; it was not invoked by the acceptance helper or diagnostic. No session was created, refreshed or revoked by this task. Timestamp parsing was also checked locally: the supplied ISO format and PostgreSQL text format map to the same milliseconds, so no parser discrepancy was demonstrated.

The helper now separately reports inactive account, revoked session, invalid server expiry, expired session or operator expiry mismatch. The exact equality and server validity guards remain enforced. Pre-submission output explicitly records zero signing/download requests and no attempt marker. The PowerShell wrapper no longer suggests that a nonexistent marker/receipt needs preservation in this specific pre-submission case.

Before a manual rerun within the existing unconsumed one-request authorization, privately re-read **both** `expiresAt` and `sessionToken` from the same current `lydo_admin_session_v1` record in the operator's already signed-in production portal. Do not reuse the timestamp from the transcript. Do not sign in again or change session state for this test. If the record is gone, expired, revoked or the account is inactive, stop; a fresh login requires separate approval. Fresh control-plane evidence and all normal immediate preflight guards are still required. No automatic retry is implemented.

## Final outcome — acceptance completed

**PASS. The authorized single signing/download execution completed on October 12 at 01:06 UTC, and the independent Edge Function and native catalog postchecks passed.** The preceding preparation and blocked-run sections are historical evidence.

Exactly one signing POST and one in-memory GET returned HTTP 200; downloaded size was 81,263 bytes. Production catalog, foundation, all nine Edge Functions and selected metadata remain unchanged. The execution receipt verified all 56 non-session inventories unchanged and only the permitted session `last_used_at` change, with no expiry extension. Independent hash comparison remains NOT TESTED and permission-specific denial remains BLOCKED as scoped.

See [final execution report](20261012T010649Z/execution-report.md) and the separate completion receipt. **Do not run the helper again or remove its durable attempt marker.** Frontend deployment and restrictive Storage cutover still require separate review and authorization.
