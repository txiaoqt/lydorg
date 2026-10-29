# Existing staging renewal completed — terminal document control failed

11 October 2026, Asia/Manila. Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Authorized target exclusively `zroudsvpswqsjlyttkjf`.

## Result

**The existing cycle 2 renewal was successfully resubmitted and approved through normal application RPCs. Its authoritative accreditation transition succeeded. Security validation did not pass overall:** the subsequent terminal-document replacement assertion received HTTP 200 and committed a metadata change that should have been denied. Execution stopped immediately, with no retry or automatic repair.

This is a real staging data-integrity defect, not the previous runner's duplicate transition or Auth inventory mistake. The affected existing RPC is `user_replace_document_submission_file`. Its inspected SECURITY DEFINER implementation verifies ownership but has no terminal parent/renewal/file-state check before updating the file reference and review status. This finding does not establish a cross-organization exploit; the tested caller was the legitimate owner. Current production behavior was not probed or modified.

## Scope and safety

- Exact staging control-plane identity verified. Nine inspectable local Node processes contained no competing fixture execution. Existing exclusive fixture-operation lock held across the run and released after cleanup.
- Immediate guards verified journal IDs, trusted Auth identity using `getUserById`, original actors, active Super Admin/zero-permission account, approved registration, authoritative initial term, exactly one needs_revision renewal/submission, six original files and one flag.
- All nine Storage policy definitions matched the preserved catalog both before and after execution.
- No new Auth user/organization, SQL installation, scenario date change, draft creation, original six-file upload replay, repeated revision request, broad cleanup or production contact occurred.
- One corrected small PDF was uploaded through a genuine owner JWT. Service role was used for inventory and shortening one newly created genuine test Admin session to exercise expiry; never to impersonate an organization.
- No invitation/confirmation-send/recovery/OTP/email endpoint, application deployment or Git push was invoked.
- Earlier failed reports were preserved. This execution used the unique report `recovery-http-evidence-authorized-20261011-02.json`.

## Actual HTTP lifecycle evidence

| Operation | Status | Evidence |
|---|---|---|
| Immediate read-only recovery guards | PASS | 23 successful GETs, HTTP 200. |
| Normal existing owner login | PASS | Auth password token HTTP 200. |
| Original six renewal downloads | PASS | Six HTTP 200 downloads; SHA-256 matched journal. |
| Exactly one corrected PDF upload | PASS | Storage HTTP 200; successful object journaled before metadata replacement. |
| Supported replacement of flagged document | PASS | `user_replace_document_submission_file` HTTP 200; exact corrected reference and `submitted` state verified. Five other references unchanged. |
| Original/corrected/five other byte integrity | PASS | Seven HTTP 200 downloads; all expected SHA-256 values matched. |
| Normal resubmission | PASS | `user_resubmit_renewal` HTTP 200. |
| Genuine Super Admin and scoped review | PASS | Normal login, permission context, review context all HTTP 200. |
| Six document approvals | PASS | Normal file-review RPCs HTTP 200; no privileged direct row updates. |
| Final cycle 2 approval | PASS | `admin_approve_renewal` HTTP 200, success response. |
| Authoritative term transition | PASS | Same cycle 2 approved; initial term superseded, new active term 2, normal three-year dates. |

Corrected synthetic PDF SHA-256:

`67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d`

The existing replacement RPC's actual contract sets the corrected file to `submitted`, not `under_admin_review`. The runner expectation was aligned with the inspected function before this run; normal Admin review accepts that submitted file. No business function was changed.

## Real renewal Storage/API matrix

These assertions used genuine staging organization JWTs or normally authenticated custom Admin sessions; they are not mocked checks.

| Assertion | Status | Actual HTTP/result |
|---|---|---|
| Owner private download | PASS | HTTP 200; corrected bytes match SHA-256. |
| Owner signing and signed download | PASS | Signing 200, download 200; hash matches. |
| Other organization private download denied | PASS | HTTP 400; no binary returned. |
| Other organization signing denied | PASS | HTTP 400; no signed URL returned. |
| Anonymous private download denied | PASS | HTTP 400. |
| Anonymous signing denied | PASS | HTTP 400; no signed URL returned. |
| Authorized Admin signing/download | PASS | Gateway 200 and signed download 200; hash matches. |
| Zero-permission Admin gateway denied | PASS | HTTP 403. |
| Revoked genuine Admin session denied | PASS | HTTP 403. |
| Expired genuine Admin session denied | PASS | HTTP 403. Only exact newly created test session was shortened. |
| Forged other-organization parent/path combination denied | PASS | HTTP 403. This does not certify a separate wrong-parent-only case using a valid path. |
| Approved terminal metadata replacement denied | **FAIL** | Existing owner RPC returned **200**, committed a reference/status change. |
| Locked Storage overwrite | BLOCKED | Not executed after failed terminal assertion. |
| Locked Storage DELETE and persisted existence | BLOCKED | No DELETE issued; no empty successful response treated as evidence. |
| Invalid parent alone, otherwise valid path | NOT TESTED | Combined forged parent/path was tested above. |

The execution recorded **28 PASS grouped checks, 1 FAIL, 1 BLOCKED stop marker, across 82 HTTP requests**, including preflight and session cleanup. These are grouped step counts, not 82 authorization assertions.

## Exact committed state after failure

The terminal test deliberately attempted replacement using the same flagged metadata ID and the already-preserved original synthetic PDF, expecting refusal. It unexpectedly succeeded:

- Renewal cycle 2 remains **approved**.
- Its submission remains **approved_green**.
- Five unflagged document records remain **approved_green**, with unchanged references.
- The tested document now has **admin_status=submitted** and points back to its **original** PDF.
- Its corrected PDF reference is retained in revision history; the history now has **two entries**.
- Original and corrected physical objects remain present. The test uploaded no additional bytes and deleted no object.
- The approved accrual/renewal history was not reset, restored, removed or replayed.

| Dedicated accreditation | Status | Dates |
|---|---|---|
| Term 1 | Superseded, preserved | 2023-11-09 – 2026-11-09 |
| Term 2 | Active | 2026-11-09 – 2029-11-09 |

Read-only post-stop verification confirms both terms, approval/resubmission audit actions, all 13 dedicated registration/renewal/correction objects at recorded paths/sizes, five unchanged approved file references and unchanged A/B/suspended profile identity/name/status fields. Uploaded binaries had already passed owner SHA-256 checks before the terminal test. No new authenticated binary request was made after the stop.

Final global staging inventory: **5 Auth users/identities, 4 organizations, 2 Admins, 3 accreditation terms, 1 renewal, 10 buckets, 29 objects**. This is exactly one additional object and one new term versus the prior state. No actor was recreated.

All four execution Admin sessions were revoked via supported RPCs (204). Both test organization Auth sessions were signed out locally (204). Fresh database inventory shows **zero active custom Admin sessions**. The local fixture lock is absent. Credentials, JWTs and signed URLs are not in reports.

## Browser/PWA and local validation

| Area | Status | Evidence/limitation |
|---|---|---|
| Focused recovery guard tests | PASS | 9 passed / 0 failed. |
| Whitespace | PASS | `git -c core.fsmonitor=false diff --check`; existing CRLF warnings only. |
| TypeScript/build/full repository Vitest | NOT TESTED | No frontend change; not rerun in this scoped continuation. Prior baseline results remain separate. |
| Authenticated browser renewal access/preview/download | BLOCKED | Mandatory security stop occurred before browser smoke tests. Browser documentation was loaded; no authenticated browser action performed. |
| Browser account switching/mobile layout | BLOCKED | Not executed after security failure. |
| Installed PWA/physical device | BLOCKED | Not tested. No device-level result inferred from SDK HTTP tests. |
| Interrupted/resumable upload | BLOCKED | Not executed. Successful SDK upload is not TUS interruption coverage. |

No claim is made that browser/frontend availability was established or that existing full-suite failures were resolved.

## Required repair review

The terminal replacement defect is a release-critical authorization/data-integrity blocker. A narrowly scoped follow-up should review the replacement RPC and every equivalent replacement path for server-side enforcement of authenticated ownership, organization restrictions, parent/renewal/file lifecycle state, authorized Storage-object relationships, and row locking against concurrent approval. SECURITY DEFINER functions cannot rely on frontend disabled buttons or ordinary table RLS to enforce these checks. Preserve legitimate needs_revision replacement and revision history.

Prepare a forward migration with actual local/integration regression coverage before requesting any staging installation. This execution did not apply such a repair. Do not silently reconcile the changed fixture or replay approval. Any reconciliation must be separately reviewed, keep both objects/history and avoid rewriting accreditation history.

No new cross-organization exposure was demonstrated. No production sign-off can be inferred from private Storage read isolation passing while this replacement RPC remains unsafe.

## Readiness decisions

**Capstone renewal UAT: BLOCKED.** The normal lifecycle reaches approval, but approved evidence is mutable through the tested API. Fix/retest this release-critical control, review fixture reconciliation and complete authenticated browser participant tasks before UAT clearance.

**Production Storage security rollout: BLOCKED.** Actual read/signing isolation and Admin gateway checks passed for the tested renewal file. Terminal replacement failed; overwrite/deletion, browser/PWA, interrupted upload and existing production historical-path compatibility still lack complete evidence. Production remains unchanged and no deployment is authorized.

## Files/evidence

- `recovery-http-evidence-authorized-20261011-02.json`: full sanitized executed HTTP statuses/timings, grouped assertions, failure and cleanup.
- `approved-renewal-post-stop-verification.json`: exact committed state and preserved-reference/history checks.
- `scripts/staging/resume-renewal-needs-revision.mjs`: added unique report label, actual RPC response-status handling and correct submitted-file contract before execution.
- Earlier execution/preflight failures and reviewed SQL remain unchanged. Existing dirty working tree/build artifacts preserved.
