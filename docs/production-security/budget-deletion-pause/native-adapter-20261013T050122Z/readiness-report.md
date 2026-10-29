# Budget native adapter — inventory contract correction

**GO for a separately authorized read-only preflight; installation remains NO-GO.**

The dedicated inventory now ends with ROLLBACK. Its 57 definitions and all preceding bytes match the untouched foundation verifier. A second actual-input defect was corrected by retaining the inventory row's read_only field alongside preserved_data.

- Focused tests: **39/39 PASS**, including six actual-input tests and the real PowerShell CLI cases.
- Node syntax and PowerShell parser: PASS.
- Offline --review: PASS; no connection or installation activated.
- Scoped diff/integrity: PASS. Existing dirty-root trailing whitespace at src/lib/lydo-connect-supabase.ts:4535 is outside this change and remains untouched.
- Bundle SHA-256: `58aed13a1099907460f74e9730afa8c8f22a1a0f0ee07fd6e77d609ac80a0e25`.
- Manifest SHA-256: `562f0b078c3ee29f17050e465ff3c1a87f9be71fac05642cd3e9e3863f19a3bb`.
- Dedicated verifier SHA-256: `459a48ea2fdaf0393063f3fe796b4a0302bf0f440485f82d3dedaae1c5e07c34`.
- Production pause SQL unchanged: **11,945 bytes**, `a9a49410d0a034191bd65bba2109b5c93dfd63eb15f8101edf5b8fb83eb44c8a`.

Both operator proofs and their ACLs/metadata are preserved; no proof was refreshed or content-read. No production connection, --preflight, --install, deployment or Git push occurred. Live TLS/catalog/57-inventory verification remains pending.

Full report and actual evidence: [inventory contract correction report](inventory-contract-correction-20261013T091309Z/execution-report.md). Previous ACL report/artifacts are preserved in inventory-contract-correction-20261013T091309Z/prior-artifacts/ and acl-correction-20261013T080046Z/. The previous native failure remains in native-readonly-20261013T084554Z/.

A new read-only authorization must cover the corrected identities and a fresh, create-new control-plane proof after preserving the current stale active proof. See operator-procedure.md and read-only-preflight-authorization-draft.md. No installation approval is created by these documents.
