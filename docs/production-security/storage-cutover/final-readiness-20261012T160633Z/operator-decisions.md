# Operator decisions before Storage cutover preparation is finalized

No decision has been applied. No object is approved for deletion, relinking, metadata reconstruction, or an access grant.

## 1. Historical retention and access

Recommended decision: retain all 271 unmatched objects and accept ordinary application access denial after cutover:

- 128 legacy test-owner objects: retain, deny.
- 85 objects without a surviving owner-organization association: retain, deny; ownership remains unresolved.
- Two current-owner financial objects: retain, deny. Flag CURRENT-BUDGET-01 and CURRENT-LIQUIDATION-01 for separate evidence-based remediation only if current application access is required. Owner-consistent historical parent audits do not create surviving parent metadata.
- 56 unreferenced template versions: retain, deny. The 13 current templates retain supported public access.

Alternative: withhold acceptance of denied access for specific objects and authorize a separate evidence investigation/remediation proposal. This requires genuine parent/version evidence and business retention decisions; it does not permit broader path rules or automatic relinking. Cutover remains blocked for a required-access object until a supported approach is separately approved.

## 2. Admin budget deletion

**A — Pause the entire destructive operation (recommended, smallest safe mitigation).** Separately review a server-side pause of `admin_bulk_delete_budget_requests(text,uuid[])` before any deletion, with a matching disabled UI/client action. A UI-only pause leaves direct RPC access available to active Admin sessions without budget permission. Ordinary budget review, release and document viewing remain available. No physical deletion is added.

**B — Continue authorized metadata deletion with explicit physical retention.** Requires a separately reviewed server-side deletion permission, accurate retained-file evidence and reporting, aligned response keys, removal of browser cleanup, and focused disposable-state tests. It must not promise Storage deletion or grant broad DELETE. More work than A.

Neither option was implemented. A server change will require rechecking the exact cutover catalog gate after that change; retain the current SQL and evidence unchanged.

## 3. Preservation delta

The foundation-era profile snapshot contains 92 rows; the current snapshot contains 93. File-owner associations, document history, accreditation, renewal history, and Storage inventories are unchanged. Confirm/review the profile delta through the trusted operator process, then establish a separately reviewed immediate pre/post preservation baseline. Do not delete the profile or accept an unexplained delta solely to make a verifier pass.

## 4. Future execution boundary

After the above decisions/corrections, a new authorization must identify:

- Exact production project `mqqaykksadotbrghbexz` and direct verified PostgreSQL TLS endpoint.
- The reviewed cutover file and its then-approved SHA-256. Current unchanged SQL SHA-256: `3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c`.
- Any separately reviewed, necessary gate-only rebaseline caused by an approved deletion mitigation; no weakened predicates.
- Accepted retention/denial decisions, technical deletion mitigation, fresh preservation baseline, and exclusive low-traffic schema/data window.
- A single-attempt transaction procedure, durable marker/lock, external receipt, bounded postflight, and forward-only restrictive recovery.

Do not push shared GitHub main or promote another frontend while this release is held. Both Vercel projects still track that branch. No provider setting changes are authorized by this document.

**Current decision: CONDITIONAL GO for preparation; NO-GO for execution.** Choose the retention disposition and A or B for budget deletion before further implementation or cutover approval.
