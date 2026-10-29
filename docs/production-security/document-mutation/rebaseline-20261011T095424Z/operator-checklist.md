# Operator checklist — separate authorization required

Candidate: `document_mutation_lifecycle_guard_production_rebaselined.sql`

SHA-256: `bd06efbc326146cabf00ef005401a5bb7aa4a060927d7bffb63eafcf0f35f567`

Production: `mqqaykksadotbrghbexz` only. This document is preparation; it does not authorize execution.

## 1. Approval and execution boundary

- [ ] Obtain one explicit authorization naming the project, complete SQL filename/hash and standalone atomic installation.
- [ ] Confirm that authorization excludes fixture reconciliation, test-scenario utilities, Auth mutation, Storage changes, frontend deployment and unrelated migrations.
- [ ] Reserve a low-traffic window; no concurrent schema migration, privilege change or repair may run.
- [ ] Arrange a second operator/independent control-plane project and connection check.
- [ ] Do not invoke production mutation RPCs merely to demonstrate rejection. Any live positive/negative workflow mutation needs its own approved scope.

## 2. Verify the artifact and connection independently

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'docs/production-security/document-mutation/rebaseline-20261011T095424Z/document_mutation_lifecycle_guard_production_rebaselined.sql'
```

- [ ] Hash equals the value above; metadata and historical-body equality evidence agree.
- [ ] Artifact is outside broad migration replay. Do not use db push, the implicit CLI link, or the staging transaction.
- [ ] Verify control-plane project ID `mqqaykksadotbrghbexz`, active production project and database host `db.mqqaykksadotbrghbexz.supabase.co`.
- [ ] Use a project-pinned trusted control-plane connection or independently verified database endpoint/TLS identity. Do not place credentials in command-line arguments or evidence.
- [ ] Confirm database/current user/session user `postgres`, expected target owners and required DDL privileges.
- [ ] Match the baseline's effective catalog search path (public and extensions). Catalog type rendering can differ with another search path; investigate a mismatch read-only instead of changing expected fingerprints.
- [ ] Understand that catalog equality and current_database alone do not cryptographically identify a Supabase project.

## 3. Immediate read-only preflight — stop on any drift

- [ ] Run `preflight-verify-readonly.sql` through the explicitly selected production connection.
- [ ] Require exact_catalog_match=true, 164 migration records, all four containment markers and all prerequisite privilege/owner checks=true.
- [ ] History: latest `20261011230000`; version/name fingerprint `2d1ea52795f2d3c97c71e229819d9a7c`; complete fingerprint `1f5eca911f6e2057ae070a955eaca3dc`.
- [ ] Require patch namespace and new trigger names absent.
- [ ] Verify all 12 disabled mutation RPC grants/definitions, environment FALSE, private containment helper/schema and unchanged marker protections.
- [ ] Review current default privileges against `default-privileges-readonly.json`; stop on unexpected privilege additions.
- [ ] Capture fresh safe business-record and Storage inventories using the same read-only fingerprint procedure. Do not export private file contents, passwords or tokens.
- [ ] Save sanitized preflight time, project identity, hashes and role evidence. Never edit the gate to force a pass.

## 4. One atomic installation — ONLY after separate approval

- [ ] Submit exactly the reviewed standalone file, once, using the fixed production connection.
- [ ] Retain its BEGIN/COMMIT, lock_timeout=5s and statement_timeout=30s.
- [ ] Do not split statements, commit partial DDL, append a receipt, substitute a local-test catalog literal, or replay other migrations.
- [ ] Do not automatically retry errors/timeouts. A pre-commit error requires rollback and read-only reconciliation.
- [ ] If acknowledgement is uncertain, inspect the catalog before doing anything else. Mixed or unexpected state requires investigation and a new reviewed forward plan.

**Receipt expectation:** this exact file does not add a schema_migrations row. Expected count remains 164, containment remains latest. Record candidate hash and verified catalog outcome externally. If a new database receipt is mandatory, stop and review a separately hashed atomic candidate that explicitly includes it.

## 5. Post-installation read-only verification

- [ ] Run `post-install-verify-readonly.sql`; save the result.
- [ ] All nine changed/new function hashes, owners and definer modes match.
- [ ] Three new triggers have the correct tables, event masks, bindings, enabled state and no unexpected WHEN/column restriction.
- [ ] All four containment markers retain their original bindings/events/enabled state; private helper/schema unchanged.
- [ ] All 26 other catalog functions match the baseline, including containment denial functions and retained Super Admin status logic.
- [ ] Owner replacement/submit/resubmit: authenticated EXECUTE=true, anon/PUBLIC=false.
- [ ] Custom Admin review ACL remains exactly equivalent to the reviewed baseline.
- [ ] New guard helpers: anon/authenticated EXECUTE=false; private schema USAGE/CREATE=false for API roles. Review trusted service-role privileges separately.
- [ ] Table owners, columns, constraints, table grants, RLS and policies remain baseline-identical; only the three intended document triggers are added.
- [ ] Storage policy fingerprint remains `c5debe81f16c612c63a6b83ffdb90531`.
- [ ] History stays at 164 / latest 20261011230000 / complete fingerprint unchanged.
- [ ] Safe protected-data fingerprints and Storage inventories match preflight. Investigate any concurrent-business-activity difference before signing off.
- [ ] Save transaction acknowledgement plus independent read-only verification as the installation evidence. No synthetic reconciliation or account change may appear.

The post-install SQL was exercised in isolated PostgreSQL. Its local function ACL observations are not a replacement for production default-privilege checks.

## 6. Failure and forward recovery

- Before COMMIT: rollback the complete transaction. Verify original post-containment catalog and no new namespace/triggers.
- Unknown outcome: stop, retain evidence, and reconcile read-only. Never issue a second installation automatically.
- Confirmed commit with a defect: preserve guards, containment and business evidence. Prepare a separately approved fail-closed pause of affected mutation operations and a minimal forward correction.
- Do not restore the vulnerable mutation RPCs or weaken/remove triggers as a shortcut.
- Do not reset the database, delete documents, rewrite accreditation/renewal history, or import staging fixtures.
- Database/client cache changes do not revoke already-issued signed Storage URLs.

## Residual limits

The isolated engine is PostgreSQL 18.3/PGlite, while production is 17.6. The manifest query was verified natively read-only on production, and 39 captured function definitions round-tripped unchanged locally. The reviewed runtime body is unchanged from earlier actual staging validation. Native multi-session contention remains NOT TESTED and should be monitored during the controlled rollout.

The broader Storage policy/gateway cutover and frontend PWA release require independent review and authorization.

