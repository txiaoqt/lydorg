# Production containment operator checklist

**Review only — no execution is authorized by this document.**

## Selected artifact

- SQL: [production_test_utility_containment.sql](production_test_utility_containment.sql).
- SHA-256: `abd2ea82587c9bbb0c18af68851faa7f83fd5a64bca113014c500b00abec8c65`.
- Production project: `mqqaykksadotbrghbexz`; database endpoint from verified control-plane metadata: `db.mqqaykksadotbrghbexz.supabase.co`.
- Forward receipt version: `20261011230000`; name: `production_test_utility_containment`.
- Source generator is offline-only. Nothing is added to `supabase/migrations` or deployed from the linked CLI.

## Before execution — all required

1. Obtain explicit approval for this exact SQL hash, production project and bounded installation window. Obtain independent approval for credential retirement; it is not part of the SQL transaction.
2. Use the authorized management control plane to select and verify the actual production project and database endpoint. Verify the matching TLS connection through the direct `postgres` installation identity. Do not use editable database settings, a client-supplied project ref, an Auth JWT claim, `.env` inference, or the implicit CLI link as identity proof. A cloned catalog could satisfy SQL fingerprints; **SQL alone cannot prove the project**.
3. Confirm `current_user` and `session_user` are both `postgres`. Required capabilities: ownership/ALTER of the 17 existing functions; CREATE schema/function in this database; TRIGGER and relevant ownership on the four business tables; function/schema grant administration; read access to the inspected catalogs and migration history; INSERT on `supabase_migrations.schema_migrations`. No Auth or Storage service-role key is needed by this SQL.
4. Run [catalog-manifest.sql](catalog-manifest.sql) read-only on the fixed connection. Compare the complete JSON with [expected-production-manifest.json](expected-production-manifest.json): 31 function fingerprints/owners/ACLs, 11 table ACL/structure/constraint/trigger fingerprints, role inheritance, policy fingerprint, and exact migration history. Verify helper/schema/trigger names are absent. Stop on any difference; do not edit a gate merely to pass it.
5. Confirm the database still has 163 migration records, latest `20261008174154`, with the recorded complete history fingerprint. Check version `20261011230000` is unused. This checkout has unrelated, unapplied migrations: do not use broad migration replay or `db push`.
6. Quiesce renewal-test/sample-seeding maintenance operations and verify no other operator is performing them. Review active-call state without copying raw query arguments or credentials into logs. The SQL checks visible active test calls and holds a transaction advisory lock against another installer, but neither check prevents a new RPC starting in the race window nor cancels a call already executing an old body. If quiescence cannot be established, defer installation; do not terminate unknown processes automatically.
7. Preserve a restricted catalog recovery snapshot and operator receipt. The credential-bearing original must remain server-redacted in ordinary evidence. Record original hash instead of the plaintext. Never plan restoration of the vulnerable definitions.

## One atomic installation — future approval only

Execute only the selected standalone file through the verified connection as one transaction. It sets five-second `lock_timeout`, 30-second `statement_timeout`, a transaction advisory lock, an exact catalog preflight, and postconditions. It replaces functions, creates four narrow marker triggers, and inserts one migration receipt. It does not touch Auth, business rows, fixture flags, accreditation history, documents, Storage policies/objects, settings, roles or live credentials.

New trigger creation requires table locks; schedule a low-traffic window. A busy table must cause a bounded failure rather than a long write outage. Timeouts are per statement, not an overall transaction deadline. The operator must monitor the transaction and connection. Do not repeat an uncertain request.

## After commit

- Authoritatively verify the single migration receipt, the 12 denial-only bodies and effective ACLs, false environment function, explicit active Super Admin status check, both immutability bodies, universal profile-marker protection, and the private helper plus four exact enabled triggers. Verify hashes against [candidate-metadata.json](candidate-metadata.json).
- Compare the old policy, table structure, constraint and original-trigger fingerprints. The only new triggers are `a_production_fixture_markers_guard` on `budget_requests`, `liquidation_reports`, `document_submissions` and `document_submission_files`. Original business function hashes and permissions must match.
- Recheck existing fixture flags/counts, retained accreditation and document references read-only. Do not create production test accounts or try production historical rewrites to prove denial.
- With separately approved request-only smoke checks, expect API permission denial for disabled RPCs and unchanged protected data. Retained status accepts only a valid active Super Admin custom session; legitimate anon/authenticated transport still works. Calling the validator/status may update Admin session usage, so these are not included in the current read-only audit.
- Complete the separately approved [credential-retirement plan](credential-retirement-plan.md). SQL containment alone does not retire the account's existing secret or tokens.
- Preserve deployment timestamp, transaction result, external project-verification receipt, SQL hash, before/after catalog fingerprints and sanitized results. No credential-bearing request/response logging.

## Failure and recovery

**Before COMMIT:** any catalog, ACL, body, marker-trigger, policy, history, permission or lock assertion failure aborts the complete transaction. Explicitly roll back and inspect read-only state. Local fault-injection tests verified this behavior.

**Uncertain response:** do not retry. Inspect migration receipt, exact function hashes/ACLs, namespace and all four triggers on the verified connection. All-old versus all-new must be consistent; otherwise hold further work for investigation. Preserve evidence.

**After COMMIT:** use only a separately reviewed forward correction. Keep test mutations disabled, the credential out of function definitions, and historical terms immutable. Never restore vulnerable bodies or broad grants. A false-positive normal write should be investigated and corrected narrowly while preserving marker immutability; do not introduce a general override. Do not drop historical records, clear fixture flags, or restore compromised passwords as recovery.

## Separate document-security hotfix dependency

The untouched document candidate still hashes to `86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785`. It is a separate release.

If containment is installed first, migration count becomes 164 and latest becomes `20261011230000`. The complete history fingerprint changes. Two additional document-table triggers also change the hotfix's combined trigger fingerprint. Its pinned gate must reject this new baseline. Obtain a fresh read-only compatibility review and a newly reviewed hotfix artifact/hash with the new exact history and trigger baseline; do not relax or skip its gate.

If the hotfix is installed first, this containment candidate's original function/catalog/history gate must likewise stop. Rebaseline and review containment independently. Neither ordering authorizes replay of staging reconciliation, test-scenario SQL, the Storage cutover, or the 33-policy performance migration.
