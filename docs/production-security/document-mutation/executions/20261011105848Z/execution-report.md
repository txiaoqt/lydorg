# Production document-mutation hotfix — execution report

## Outcome

**COMMITTED AND VERIFIED** in production `mqqaykksadotbrghbexz`. Exactly one execution; no retry or follow-up database mutation.

- Submission: 2026-10-11 11:00:12 UTC.
- Success acknowledgement: 2026-10-11 11:00:19 UTC (**19:00:19 Asia/Manila, 11 October 2026**). This is the acknowledgement time, not a separately recorded database commit timestamp.
- Independent installed-catalog capture: 2026-10-11T11:05:08.436678+00:00.
- Authorized SHA-256: `bd06efbc326146cabf00ef005401a5bb7aa4a060927d7bffb63eafcf0f35f567`; 170,636 bytes.
- Original BEGIN/COMMIT, 5-second lock timeout, 30-second per-statement timeout and catalog guard retained. The complete file was submitted unchanged through the explicitly pinned production control-plane connection.
- SQL returned success; subsequent independent read-only sessions observed all committed new/replaced functions and triggers.
- External receipt: [execution-receipt.json](./execution-receipt.json). No database migration receipt was inserted; this is the authorized candidate's expected behavior.
- Branch `ui-refactor`, HEAD `2f6e7427c553b7535f53860d1732b42df7c023e8`. Existing dirty work preserved; only this new evidence directory was written locally.

## Pre-installation evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Independent control-plane project | PASS | `lydo-org-focused`, exact production ref, ACTIVE_HEALTHY, host `db.mqqaykksadotbrghbexz.supabase.co` |
| Native database identity | PASS | database/current_user/session_user `postgres`; PostgreSQL 17.6; expected server address and port 5432 matched |
| Exact file hash | PASS | Node SHA-256 on every captured SQL segment plus independent PowerShell Get-FileHash |
| Reviewed immediate preflight | PASS | Exact complete catalog equality, owners, CREATE/TRIGGER privileges, four containment markers |
| History | PASS | All 164 records and full history fingerprint matched |
| New hotfix objects absent | PASS | Pinned manifest's namespace/trigger absence gates passed immediately before execution and inside the atomic SQL |
| Containment | PASS | Receipt 20261011230000, environment FALSE, 12 disabled mutation RPCs, four enabled fixture-marker triggers |
| Default privileges | PASS | Exact reviewed production defaults; no additions |
| Exclusive window | PASS | Human confirmation recorded; immediate checks found zero other active sessions, open transactions, DDL candidates or lock waiters |
| Protected data | PASS | 57 relation inventories matched earlier read-only baseline before installation |

See `preflight-before.json`, `immediate-safety-before.json`, `immediate-data-before.json`, and `transaction-acknowledgement.json`.

The connection was pinned by project ID and checked independently against control-plane host/version and native SQL identity. The SQL catalog comparison alone was not treated as project authentication.

## Post-installation results

| Check | Status | Actual result |
| --- | --- | --- |
| Nine new/replaced functions | PASS | Exact definition/source MD5, owner, definer mode and expected production ACLs |
| Three new security triggers | PASS | Correct tables, binding, enabled O, event masks 23/31, zero arguments, no WHEN or column restriction |
| Four containment marker triggers | PASS | Original bindings, masks, definitions and enabled state unchanged |
| Containment helper and API restrictions | PASS | Definition/owner/ACL/search path unchanged; API schema/execute denied |
| Twelve disabled test RPCs | PASS | Denial definitions unchanged and PUBLIC/anon/authenticated/service_role EXECUTE denied |
| Production environment guard | PASS | FALSE |
| Custom Admin review ACL | PASS | Exact original grants preserved; supported server-side custom session validation remains in the reviewed function body |
| Owner RPC grants | PASS | Four owner RPCs authenticated EXECUTE=true, anon/PUBLIC=false |
| New guard API exposure | PASS | anon/authenticated cannot EXECUTE helpers; private schema denies API roles USAGE/CREATE |
| Other functions | PASS (supplemental) | All 26 pinned entries match exactly; all-unrelated-function catalog digest also unchanged |
| RLS / Storage policies | PASS | All-policy digest unchanged; reviewed Storage policy digest unchanged |
| Table structures/grants and existing triggers | PASS | Exact before/after fingerprints; only three intended triggers added |
| Protected business/Storage data | PASS | 57/57 row counts and fingerprints unchanged |
| Migration history | PASS | 164, latest 20261011230000; both history fingerprints unchanged |
| Production mutation and concurrency tests | NOT TESTED | Explicitly excluded from this authorization |

**Verifier exception preserved:** the reviewed `post-install-verify-readonly.sql` returned `unchanged_catalog_functions_match=false`. Writes stopped and the discrepancy was investigated read-only. Production uses `en_US.UTF-8`: signature sorting places `admin_seed_yorp_sample_dataset_core(text,text)` before `admin_seed_yorp_sample_dataset(text,text)`, whereas the pinned array lists the base function first. All 26 JSON entries are otherwise identical, including ACLs, definition hashes, owners, volatility and definer modes.

The supplemental read-only verifier performs exact bidirectional set comparison, verifies both cardinalities are 26, compares arrays sorted with explicit C collation, and reports zero entry differences. It returns PASS while reproducing the original false aggregate comparison. The reviewed verifier and candidate were **not edited**, and no database correction was attempted.

See `reviewed-verifier-after.json`, `original-verifier-discrepancy.json`, `supplemental-catalog-verification.json` and the corresponding read-only SQL. Correct the verifier's collation handling separately before reuse; do not re-execute the installation.

## Exact installed function fingerprints

All nine owners are `postgres`; all are VOLATILE with the reviewed `pg_catalog, public, pg_temp` search path.

| Signature | PostgreSQL definition MD5 | Mode |
| --- | --- | --- |
| `guard_direct_document_mutation()` | `7c87d7aab6ad2459b5eebaee7732efbd` | INVOKER |
| `guard_document_parent_mutation()` | `a5d0f37ccca047e22a9c1207e71600b5` | INVOKER |
| `replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)` | `b8f889a1617b35a3312d7c27a2ee8cde` | DEFINER |
| `update_admin_document_submission_file_review(text,uuid,document_submission_status,text)` | `855c8ad6cc7a9dd621f1921c52e9f18c` | DEFINER |
| `user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)` | `25c9ef7e37469b003690ce2787261312` | DEFINER |
| `user_resubmit_renewal(uuid)` | `925e2cd4a1bc58959cd5520e834bbf3a` | DEFINER |
| `user_submit_renewal(uuid)` | `3dd14266cc03c6aa541a4ac81065494b` | DEFINER |
| `ytrace_document_mutation.guard_file()` | `b2082c8898b0bdc45caf61490f0d7a7e` | DEFINER |
| `ytrace_document_mutation.lock_replacement(uuid)` | `ae3cfaf97e7ff4985dfde25e9fcf4627` | DEFINER |

Actual definition SHA-256, source MD5 and full ACLs are in [installed-function-trigger-fingerprints.json](./installed-function-trigger-fingerprints.json). All nine privilege comparisons passed in `function-privilege-comparison.json`.

Trusted `service_role` retains EXECUTE on the two new public trigger functions through the existing production default grants. These are trigger-returning functions, and anon/authenticated execution is revoked. The two private helpers retain only owner execution; private-schema access is denied to all three API roles. The existing Admin-review function's public/anon invocation grants remain unchanged to support custom Admin tokens; invocation still requires the reviewed server-side session checks.

## Exact new trigger fingerprints

MD5s below hash canonical `pg_get_triggerdef` output. Full SHA-256 and function binding hashes are in the JSON evidence.

| Table | Trigger | Enabled / event mask | Definition MD5 |
| --- | --- | --- | --- |
| `public.document_submission_files` | `a_document_mutation_guard` | O / 23 | `5e286b4414a9236846e912c7bb3cd7d8` |
| `public.document_submission_files` | `b_document_direct_guard` | O / 31 | `00a349eeb136a3719920003fd12cc1f6` |
| `public.document_submissions` | `a_document_parent_guard` | O / 31 | `8819c88ca9b8ab309123c496725be98f` |

## Preserved containment trigger fingerprints

All four retain `a_production_fixture_markers_guard` and `ytrace_production_containment.freeze_fixture_markers()`. Helper definition MD5 remains `3a551ad03eaa7d24ca136cf1cbecaba9`.

| Table | Enabled / event mask | Definition MD5 |
| --- | --- | --- |
| `public.budget_requests` | O / 23 | `ddeb9b8bdfb9b84283cc62218cddb0dd` |
| `public.document_submission_files` | O / 23 | `92a27452e528f2258b5258d27d8ccd98` |
| `public.document_submissions` | O / 23 | `d63f6ba65062908d7ca9d08bf79d6b77` |
| `public.liquidation_reports` | O / 23 | `fbd43967eb883fc24d2d6c83a2301348` |

## Data preservation

Every captured relation matched its immediate pre-install row count and content fingerprint. The 57 inventories include application data, Storage buckets/objects and sanitized Auth user/identity inventories. Auth inventories intentionally exclude credentials; no Auth API mutation was performed.

| Relation | Before = after rows | Content MD5 | Status |
| --- | --- | --- | --- |
| `public.document_submission_files` | 547 | `6c35d6ddc8da60d9852f22f95d453977` | PASS |
| `public.document_submissions` | 92 | `f87d27a80e429144f2c88a41d27aeb58` | PASS |
| `public.organization_accreditations` | 89 | `acaca3a360e0eee207b26e99f89d273a` | PASS |
| `public.organization_profiles` | 92 | `74635aef35af2f782effc2bec513a7f2` | PASS |
| `public.organization_renewals` | 0 | `d41d8cd98f00b204e9800998ecf8427e` | PASS |
| `storage.buckets` | 10 | `acc282dfda329140a4a6d68e5bc10d8a` | PASS |
| `storage.objects` | 378 | `f7998fec5fa18463de4fee1b6205385f` | PASS |

The full comparisons are in `immediate-data-before.json` and `protected-data-after.json`. Storage checks verify database metadata; binary file contents were not downloaded or rewritten during this production installation.

Other preserved fingerprints:

- Migration version/name MD5: `2d1ea52795f2d3c97c71e229819d9a7c`.
- Complete migration-history MD5 (canonical ordered JSON-array method): `1f5eca911f6e2057ae070a955eaca3dc`.
- Reviewed Storage policy MD5: `c5debe81f16c612c63a6b83ffdb90531`.
- All RLS policies MD5: `dcd94dd5098884fdf36e086a281a4825`.
- All unrelated functions MD5, excluding the exact nine authorized signatures: `4d907c217217a7cbdfe654c10b9b57f5`.
- Existing triggers MD5, excluding the exact three new triggers: `49ec58979964fc37520f88b9f1a41f4c`.
- Table structure/security MD5: `4bec8f408bb97952615161df762e9e9b`.
- Existing schema grants MD5: `bf20f44d6ac1985675351dae9be6bee3`.

## Residual risks and recovery

1. The original post-install verifier has the documented collation-dependent comparison defect. Its failed result is retained; supplemental exact comparisons establish no catalog drift. No vulnerable function was restored.
2. No production business mutation or native multi-session approval/replacement race was executed. Prior isolated and real staging validation remains historical evidence, not a new production workflow test.
3. The broader private-Storage policy/Admin gateway cutover remains separately pending. This hotfix protects document lifecycle metadata; it does not remedy bucket-wide read access or revoke issued signed URLs/JWTs.
4. This standalone installation has an external receipt only. Future migration replay must account for the installed object state and avoid broad replay from the checkout.
5. A post-commit defect requires a separately reviewed forward correction or fail-closed pause. Never restore vulnerable RPCs or remove containment as a shortcut.

No Auth change, Storage policy change, gateway deployment, frontend release, fixture reconciliation/creation, historical rewrite, Git push or staging write was performed. The exclusive schema-change window can be released after this report.

**Final deployment status:** the authorized document-mutation security hotfix is installed and independently verified. No automatic progression to the Storage security rollout.

