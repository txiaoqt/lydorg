# Two-session concurrency review gate

This gate has NOT been executed. PGlite tests are a single PostgreSQL WASM connection; Promise.all tests exercise serialized requests and stale versions, not two-session MVCC behavior. No local PostgreSQL server/Docker was available. Do not run these scenarios against the linked/live project.

## Isolated setup

Use a disposable **local-only** PostgreSQL/Supabase database with sanitized schema, synthetic Auth users and synthetic admin accounts. Apply the proposed migration only there after schema review. Preserve production RLS, unique URN indexes, existing triggers, automatic registration functions, and the custom admin-session contract. Obtain two independent connections. Confirm READ COMMITTED isolation; identity writes intentionally reject snapshot-retaining isolation levels. Never copy production credentials, email addresses, Storage files, or financial rows into fixtures.

## Required scenarios

1. **Exact normalized name, different owners/emails, URN omitted.** A begins a verified synthetic INSERT but keeps the transaction open. B attempts a verified INSERT with capitalization/punctuation/abbreviation differences. B must wait; after A commits, B must detect the candidate and fail. Repeat by rolling A back: B may continue if no actual candidate exists.
2. **Similar names in one barangay, different anchors.** Use `Riverside Youth Organization` and a trigram-similar spelling above 0.82 similarity with different first-token spelling. Same scenario: the shared barangay lock must serialize them even when name-anchor locks differ. Neither lookup may miss the committed candidate after waiting.
3. **Different barangays, identical normalized names.** The anchor lock must serialize exact-name candidates across areas; location differences must not automatically prove separation.
4. **Two admins, one expected version.** Both read the same packet version. A records a decision and commits; B submits the stale version. B must fail and must not create a second conflicting decision.
5. **Candidate changes while reviewed.** Change the candidate's location, official URN, status or verification timestamp between packet fetch and decision. The digest/version must change; stale evidence must not clear verification.
6. **Budget submission versus retained-history deletion.** Race submission against the canonical deletion RPC; verify profile locks/guards prevent loss of any committed official records. Auth cascade must not delete an established identity. A failed retention check must prevent Auth/Storage cleanup.
7. **Reciprocal/overlapping candidate reviews.** Repeat under concurrent updates and look for deadlocks. A transaction abort is safe; the UI must reload rather than retry an identity decision blindly. Never accept partial review/audit/financial ownership changes.
8. **Automatic verification.** Race final document approvals for two matching organizations using the real approval RPCs and triggers. Only a reviewed separate identity may gain verification. Confirm the existing organization's access stays intact.
9. **Existing confirmed canonical identity.** Concurrent rename/resubmission cannot clear its canonical reference, change user_id, move histories or create a new submitted budget through the applicant's ID.

## Acceptance record

Record server version, effective isolation level, exact synthetic fixture identifiers, start/end timestamps, blocking observations, both transaction results, final profile states, identity case versions, audit decisions, and retained Budget/Liquidation/accreditation/YPOP counts. Re-run frontend tests against the isolated service to cover real PostgREST role/GUC behavior and Edge preflight responses. This evidence is required before deployment readiness can be asserted.
