# Production test-utility containment — execution report

## Outcome

**COMMITTED AND VERIFIED** on production `mqqaykksadotbrghbexz`.

One installation request was submitted. The exact reviewed SQL completed successfully as one transaction. A fresh connection then confirmed its receipt and complete installed state. There was no automatic retry, reconciliation repair, business-record mutation, or production test-mutation invocation.

- Branch / HEAD: `ui-refactor` / `2f6e7427c553b7535f53860d1732b42df7c023e8`.
- Existing dirty working tree preserved. Only this execution's evidence files were added locally.
- Authorized and submitted SHA-256: `abd2ea82587c9bbb0c18af68851faa7f83fd5a64bca113014c500b00abec8c65`.
- Submitted: `2026-10-11T06:53:18.631Z`.
- Successful control-plane response: `2026-10-11T06:53:25.397Z`.
- Authoritative post-installation inspection: `2026-10-11T06:54:41.784567+00:00` (11/10/2026, 14:54:41, Asia/Manila).
- Receipt: `20261011230000`, `production_test_utility_containment`.
- Timeouts: five-second lock timeout, 30-second per-statement timeout.
- Transaction advisory lock was released after commit.

## Pre-write safety evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Exact production control plane | PASS | Project ref/name/health and project-specific database host matched. |
| Database endpoint and identity | PASS | Host AAAA record matched `inet_server_addr()`; `current_user=session_user=postgres`; TLS 1.3. |
| Exact local SQL and submitted payload | PASS | Independent file hash and in-memory payload hash matched the authorized SHA-256. |
| Complete expected catalog | PASS | All 31 monitored function definitions/owners/ACLs, 11 tables, role memberships, policies and migration history matched. |
| Installation permissions | PASS | Ownership/grant authority for all 17 functions; schema/function creation; four table trigger privileges; migration receipt INSERT. |
| Receipt/object absence | PASS | Target receipt, private schema and four marker triggers were absent before installation. |
| Quiescence | PASS | User confirmed operations paused; immediate inspection found zero active test-utility calls, idle transactions, prepared transactions or competing installer lock. |
| Atomic gate | PASS | The unchanged reviewed SQL repeated its catalog/activity/identity checks and acquired its transaction advisory lock. |

The database DNS lookup required network permission outside the filesystem sandbox; that read-only lookup succeeded. It changed no configuration.

The fixed-project authenticated raw SQL control-plane connection submitted the standalone file without wrapping it in a migration API that would generate another receipt. The reviewed file contains its own exact receipt and transaction. No linked CLI, `db push`, migration replay, client Auth key, or service-role credential was used.

## Installed state

| Requirement | Result | Actual verification |
| --- | --- | --- |
| Single migration receipt | PASS | Exactly one target receipt; history grew from 163 to 164 records. |
| Existing migration history preserved | PASS | Excluding the new receipt, original count/latest/fingerprint remain 163 / `20261008174154` / `380c842e791bfbcf5c7a939371e24738`. |
| 12 test mutation RPCs disabled | PASS | All 12 have exact reviewed denial-only source hash `6d670f664473257d4bf0b98e127337d1`, invoker mode and SQLSTATE 42501 body. PUBLIC/anon/authenticated/service_role EXECUTE is absent. |
| Production environment guard | PASS | Read-only SELECT returned `FALSE`. |
| Retained sample-status authorization | PASS | Exact reviewed body requires an active Admin joined to existing `super_admin` role. Intended anon/authenticated/service-role transports remain; PUBLIC grant removed. |
| Accreditation/terminal exceptions removed | PASS | Both exact reviewed source fingerprints installed; former test-marker/GUC branches absent. |
| Organization fixture markers frozen | PASS | Exact profile privilege-guard body installed, including marker checks before privileged-role bypass. |
| Four narrow marker triggers | PASS | Exact enabled BEFORE INSERT OR UPDATE trigger on budget_requests, liquidation_reports, document_submissions and document_submission_files. |
| Private helper restricted | PASS | Exact reviewed invoker helper, postgres ownership, private search path and owner-only ACL; no API-role schema usage/create or execution. |
| Original catalog/permissions preserved | PASS | Original table column/constraint/trigger/ACL/RLS fingerprints unchanged after excluding only the four reviewed new triggers. Fourteen unchanged monitored functions and the full unrelated function fingerprint match. |
| Business records preserved | PASS | Full row-count/content fingerprints unchanged across all 53 public tables. |
| Storage preserved | PASS | All 10 buckets and 378 objects unchanged; all policy fingerprints unchanged. |
| Auth inventory preserved | PASS | Selected user/identity inventory fingerprints unchanged; no Auth API writes were made. |

Forty-eight post-installation comparisons passed, with zero failures; additional final history/schema/lock checks passed. The private schema contains exactly one function and zero relations.

Preserved business counts include 92 organization profiles, 89 accreditation terms, zero production renewal rows, 92 document submissions and 547 submission-file records. These are actual read-only counts at this execution, not staging counts or planner estimates.

All 57 saved data inventories matched before and after. Fingerprints were computed in PostgreSQL; no private row contents, passwords, JWTs, API keys, session tokens or signed URLs were exported into evidence.

## Verification limits

These are real production catalog/data inspections. **No disabled production mutation RPC was executed** to prove its denial. The retained status RPC and Admin session validator were not invoked: their validation path can update session usage. Super Admin enforcement was verified by the exact installed source fingerprint and grants, backed by the previously saved 85/85 local SQL safety suite; that historical suite was not rerun or described as live production HTTP coverage.

The reviewed installer contains no Auth, business-row or Storage DML. Its only row insertion is the migration receipt. No frontend, Storage cutover, document-mutation hotfix or separate performance migration was deployed.

## Remaining work and recovery boundary

1. **Credential retirement remains outstanding.** Existing legacy Auth credentials/sessions were not rotated, banned or revoked. This requires separate authorization. Containment does not invalidate previously known passwords or already-issued tokens.
2. **Document-mutation hotfix remains outstanding.** Its previous candidate SHA-256 `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785` is unchanged, but its old catalog gate must reject this new migration history and the two new document-table marker triggers. Prepare a fresh read-only compatibility review and independently approved artifact/hash before execution.
3. **Broader Storage remediation remains separate.** Storage policies and production gateway deployment were not changed by this run; existing cutover blockers remain.
4. Any subsequent defect requires a separately reviewed forward correction. Do not restore vulnerable functions, broad execution grants, test exceptions or hard-coded credentials.
5. The paused renewal-test/sample-seeding window can end now. Those production mutation utilities are intentionally disabled.

## Evidence

- [Preflight](preflight.json) and [immediate pre-write check](immediate-prewrite.json).
- [Single installation attempt](installation-attempt.json) and [committed result](installation-result.json).
- [Before catalog](catalog-before.json) and [normalized after catalog](catalog-after-normalized.json).
- [Actual installed functions, grants and triggers](installation-verification.json).
- [48 comparison assertions](post-installation-checks.json) and [final receipt/schema/lock verification](final-receipt-verification.json).
- [Data before](data-before.json) / [after](data-after.json).
- [Permissions before](permissions-before.json) / [after](permissions-after.json).

The original SQL and review artifacts remain unchanged, including their historical pre-installation labels, so their approved hashes and review evidence are preserved.

## Local evidence quality

The saved JSON evidence parsed successfully and both approved SQL hashes remained unchanged. The normal repository-configured `git diff --check` returned 0. A separate diagnostic using a command-local `core.autocrlf=false` override returned 1 because existing CRLF lines throughout the dirty checkout were treated as trailing whitespace. No existing file or Git configuration was changed to resolve those diagnostics. This had no effect on the production transaction. See [local quality details](local-evidence-quality.json).
