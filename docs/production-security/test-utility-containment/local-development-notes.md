# Local test-development record

These iterations ran only against in-memory PGlite, without network clients, environment credentials or live writes. No historical application, staging, UAT or test evidence was changed.

| Iteration | Result | Explanation |
|---|---|---|
| Initial fixture run | 1 passed / 2 failed | Fixture lacked the production `budget_request_status` enum, so setup stopped before proposed SQL installation |
| Enum inventory parser run | 1 passed / 2 failed | Management SQL serialized PostgreSQL enum-label arrays as text; the local parser expected JavaScript arrays |
| First complete matrix run | 37 passed / 43 failed (including aggregate failure) | 42 leaf checks could not read the synthetic `storage.objects` snapshot under API roles; test-driver read permission was missing. Candidate install, owner denials, rollback, normal registration and deletion checks did run |
| [Run 04](local-test-run-04.tap) | 80 passed / 0 failed | Fixture snapshot permission fixed; initial containment matrix passed |
| [Run 05](local-test-run-05.tap) | 85 passed / 0 failed | Added terminal-renewal exception removal and four business-table seed-marker guards |
| [Run 06](local-test-run-06.tap) | 85 passed / 0 failed | Added ordinary non-marker edits on all four business tables |
| [Run 07](local-test-run-07.tap) | 85 passed / 0 failed | Final candidate includes exact original table ACLs in catalog gates |

The generator initially rejected the word `TRUNCATE` inside a table-ACL JSON value after table ACLs were added. The scope lint was corrected to inspect leading SQL statement keywords rather than arbitrary words inside evidence literals. The candidate contains no TRUNCATE statement. Artifact generation and the actual SQL transaction tests then passed.

The normally configured `git diff --check` passed. An additional diagnostic run that overrode `core.autocrlf=false` reported existing CRLF lines across unrelated dirty frontend/build files as whitespace. No existing line endings were rewritten. The normal check was rerun successfully, and all newly created containment text artifacts were checked independently for trailing whitespace and final newlines.

The final Node test total includes two aggregate parents and 83 leaf checks; the structured JSON records the leaf checks. PGlite uses one connection, so none of these runs is multi-session concurrency certification or live Auth/RLS/Storage authorization evidence.
