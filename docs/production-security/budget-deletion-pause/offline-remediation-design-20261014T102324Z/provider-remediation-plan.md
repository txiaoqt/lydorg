# F2/F3 remediation plan — trusted I/O and native-child boundary

**NON-RUNNABLE — NOT AUTHORIZED. No real provider, Win32 helper, protected-state access or child launch is implemented here.**

## Prerequisite: F1 and the amended scope

Read f1-design-options.md first. The recommended before-observation consumption record is a new protected write and changes the old sequence. It needs independent review and separately amended authority. This package implements no such record and creates no continuation authorization. Existing installation lock/attempt/authorization files must not be repurposed.

The current protocol still permits two observations across separate modeled invocations. A successful F4/F5 unit suite does not resolve that boundary.

## F2 provider contract and evidence

| Provider | Required implementation review | Acceptance evidence still missing |
| --- | --- | --- |
| Artifact admission | Actual fixed-root hashes/sizes, original wrapper/native bundles, transitive driver closure, SQL reference/verifier, all preservation inputs; reject redirects and drift | Fresh independently checked real-provider artifact set; no echo-only hash receipts |
| Scoped project observation | Configured scoped Supabase MCP get_project for the exact project, no broader credential/API fallback; sole dispatch after F1 consumption; characterize transport retries/uncertainty | Provider-level single dispatch and response provenance; no actual observation in this package |
| Root/state admission | Exact pinned root and ancestors, owner/effective DACL, prohibited state and unexpected entries, reparse/junction/alternate-stream/file-identity defenses; Verify only | Disposable Windows adversarial checks and independently verified real path binding |
| Existing stale proof inspection | Exact separately approved bytes/hash/schema and file identity/metadata; reject secret fields, ambiguous encoding, mismatch and archive collisions | Future specifically authorized private inspection; current proof not read |
| Archive | Same-directory atomic no-replace move, source/destination identity checks at the operation boundary and afterward; preserve creation/last-write/owner/ACL and contents; no access-time repair | Actual Windows primitive, concurrent destination creation, reparse and crash/failure tests |
| New proof | One create-new UTF-8/no-BOM file from the original still-fresh observation; sync and re-read/schema/hash/ACL verification | Real Windows create/durability/retention evidence; no overwrite/refresh/automatic retry |
| Credentials/CA/loader | Existing approved private mechanism, no CLI secrets or browser exposure; independently trusted CA fingerprint/provenance/validity and no insecure environment overrides | Future authorized availability/TLS checks; no credentials, CA or private environment read now |
| Generated evidence | Exact safe generated leaf under fixed root; bounded regular-file reads, two identical raw buffers and ACL verification before/after; no approval copying | Actual file-identity race/partial-file checks; no protected file created here |

All receipt fields are assertions until backed by a reviewed implementation. Tests returning rootVerified/noRedirect/synced=true do not establish Windows properties.

### Windows archive design requirements

1. Pin local root/volume and secure ancestors. Verify the source is the exact ordinary file and destination is the exact absent hash-named leaf. Reject device/UNC/network/alternate-stream/traversal/sibling/redirection paths.
2. Review a native handle-based rename operation with no destination replacement and no copy/delete fallback. The exact Win32 API, flags, OS support and filesystem semantics must be established separately; this package does not assert that a particular untested primitive is sufficient.
3. Hold suitable root/source handles and review sharing/delete/reparse behavior so an unchecked path swap cannot redirect the operation. A precheck followed by general fs.rename is not proof of no-overwrite or race safety.
4. Recheck exact source bytes/hash and identity immediately at the protected operation boundary. The rename itself must reject a destination created after the absence check.
5. Verify resulting archive identity, same-directory placement, contents/hash/size, owner/effective ACL, creation/last-write times and source absence. Do not repair OS-managed access time.
6. Retain state on every uncertain or partial outcome. A successful rename followed by verification failure cannot trigger restore, rename-back, copy, delete, force, repair or retry.

Future disposable tests must cover a competing destination creator, source replacement between checks, symlink/junction/reparse/ancestor changes, unsafe owner/DACL, missing files, alternate paths, success metadata preservation and failure after a successful rename. Use a test-only root that cannot name the production protected root. No Windows/ACL test of that kind was run here.

### Fixed validator and preservation contract

Keep the original validator, native runner, SQL and executable read-only verifier contracts unchanged. The provider must supply complete raw evidence for comparison to the applicable pinned references: original unpaused function definition/owner/grants/catalog, all 57 inventories, foundation/document/containment protections, 164 migrations, 15 policies and 378 objects. These are expected gates, not current observations.

Trusted public CA SHA-256 remains 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7 in reviewed source. That pin alone does not establish current CA provenance/validity, server certificate verification, TLS or identity. Future direct connections must retain rejectUnauthorized, hostname/SNI and encrypted authorized-socket verification; no pooler/alternate route/fallback.

## F3 fixed child design

No spawn implementation is provided. Future review must admit exactly the original Node v24.21.0 executable, repository cwd and runner arguments from the existing immutable NATIVE_LAUNCH specification. No shell, user-selected executable/SQL/project/URL/mode or prebuilt alternate route is accepted. The existing approved loader receives secrets privately; its environment-file argument does not make that file a frontend input. Do not inherit unsafe Node/PG/TLS overrides.

### Deadlines and actual spawn

- Preserve original explicit-offset observation time and explicit UTC approval bounds. Parse with the unchanged strict parser. Keep inclusive nonfuture age 0–300 seconds and the independent UTC interval.
- Calculate a conservative remaining budget from both wall time and monotonic elapsed time; retain previous samples to reject regressions.
- Complete all awaited preparation before the final guard, or return through a separately reviewed guard at the exact synchronous spawn boundary. There must be no unguarded awaited preparation between admission and physical spawn.
- Reject a launch with no usable remaining budget. Any proposed safety margin is stricter than the existing maximum, not an extension or grace period.
- Check after child exit, every awaited evidence/ACL step, validation and immediately before success. Zero exit or completed output arriving after either deadline remains unsuccessful.

### Proposed bounds for separate review, not approved settings

A bounded implementation needs explicit limits. A narrow starting proposal is a maximum child lifetime of 180,000 ms, always shortened to the remaining proof/approval/monotonic deadline; stdout at most 16,384 UTF-8 bytes and stderr at most 4,096 bytes. These values are design proposals, not implemented or authorized configuration. Review them against real expected runtime/output before use; never extend the five-minute proof or approval window.

Collect raw bounded bytes and reject malformed UTF-8, extra result objects, output overflow and unexpected stderr under a reviewed policy. The existing parser's character limit does not cap memory during collection. Never return or persist raw stdout/stderr/error messages in general logs; use the F5 fixed-code boundary. Complete evidence remains in its specifically authorized protected file, not stdout.

### Process lifetime and uncertainty

A rejected Promise or child.kill alone does not establish termination of the native process and its ACL-helper descendants. Review a Windows process-handle/job containment design, assignment timing and process-tree ownership; a PID-existence test or kill by a possibly reused PID is insufficient. A suspended-create/assign/resume approach is a candidate for separate Windows review, not an implementation or a supported-tool claim in this package.

If containment cannot be established with the approved tooling, keep F3 BLOCKED. Do not add an unreviewed executable or silently accept a child outside containment.

On cancellation, timeout, overflow, error or crossed deadline:
- Stop admission and request termination through the owned process/job handles only.
- Bound waiting for termination/settlement and report an unresolved outcome if termination cannot be verified.
- Retain the consumed authorization record, archive, proof and any partial/complete generated evidence.
- Never relaunch, reconnect/resubmit, fetch another observation, refresh proof, repair, cleanup or adopt a new baseline.
- Do not claim killing a client instantly proves all server work stopped. The original read-only database contracts and statement limits remain required; any further inspection needs separately authorized scope.

### Future child acceptance tests

Before production-capable review, use a harmless test child in a separate explicitly reviewed harness: normal completion, exact/exceeded deadlines, slow asynchronous preparation, no-output hang, output/stderr overflow, malformed/extra JSON, spawn failure, signal, cancellation, child/descendant persistence and crash after evidence creation. Verify one physical spawn, no retries, actual handle ownership and retained disposable evidence. Such real-child tests were not run here; current F4/F5 tests use no native child.

## Stop status

**F2: BLOCKED — real trusted providers and Windows primitive evidence absent.**  
**F3: BLOCKED — actual fixed spawn, lifetime/output/containment boundaries absent.**

No protected-state operation, Windows helper, TLS/network/database call or native mode was executed by this design package.
