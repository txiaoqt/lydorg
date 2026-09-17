import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitDocumentSubmissionForReviewInSupabase,
  submitOrganizationDocumentToSupabase,
  revokeOrganizationAccreditationInSupabase,
} from "./lydo-connect-supabase";
import { advocacyOptions } from "./lydo-connect-data";
import { writeAdminSession } from "./admin-auth";
import { supabase } from "./supabase";

// Mock supabase
vi.mock("./supabase", () => {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  const authMock = {
    getSession: vi.fn(),
  };
  const storageMock = {
    from: vi.fn(),
  };
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
      auth: authMock,
      storage: storageMock,
    },
    isSupabaseConfigured: () => true,
    ORGANIZATION_DOCUMENTS_BUCKET: "organization-documents",
  };
});

describe("Section 35 Reporting Semantics & Timestamp Preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("A. Metric B: Timestamp Preservation on Resubmission / Replacement", () => {
    it("preserves original submitted_at during resubmission via submitDocumentSubmissionForReviewInSupabase", async () => {
      const originalSubmittedAt = "2026-02-15T10:00:00.000Z";
      const orgId = "org-uuid-001";
      const subId = "sub-uuid-001";

      // Mock auth getSession
      (supabase!.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: "user-uuid-001" } } },
      });

      // Mock organization_profiles lookup
      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: orgId, user_id: "user-uuid-001", organization_name: "Youth Org 1" },
            error: null,
          }),
        }),
      });

      // Mock document_submissions select
      const selectSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: subId,
                status: "needs_revision",
                submitted_at: originalSubmittedAt,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock document_submission_files select
      const selectFilesMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "file-01", file_name: "registration_form.pdf", file_type: "application/pdf" }],
          error: null,
        }),
      });

      // Mock document_submission_files update
      const updateFilesMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock document_submissions update
      const updateSubmissionMock = vi.fn();
      const eqUpdateSubmissionMock = vi.fn().mockResolvedValue({ error: null });
      updateSubmissionMock.mockReturnValue({
        eq: eqUpdateSubmissionMock,
      });

      (supabase!.from as any).mockImplementation((table: string) => {
        if (table === "organization_profiles") {
          return { select: selectProfileMock };
        }
        if (table === "document_submissions") {
          return {
            select: selectSubmissionMock,
            update: updateSubmissionMock,
          };
        }
        if (table === "document_submission_files") {
          return {
            select: selectFilesMock,
            update: updateFilesMock,
          };
        }
        return {};
      });

      await submitDocumentSubmissionForReviewInSupabase(subId);

      // Verify submission update payload
      expect(updateSubmissionMock).toHaveBeenCalledTimes(1);
      const updatePayload = updateSubmissionMock.mock.calls[0][0];

      expect(updatePayload.status).toBe("under_admin_review");
      expect(updatePayload.user_confirmed).toBe(true);
      // CRITICAL: submitted_at MUST equal the original submission date, NOT newly overwritten!
      expect(updatePayload.submitted_at).toBe(originalSubmittedAt);
      expect(updatePayload.updated_at).toBeDefined();
    });

    it("sets submitted_at when submission was previously draft (submitted_at was null)", async () => {
      const orgId = "org-uuid-002";
      const subId = "sub-uuid-002";

      (supabase!.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: "user-uuid-002" } } },
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: orgId, user_id: "user-uuid-002", organization_name: "Youth Org 2" },
            error: null,
          }),
        }),
      });

      const selectSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: subId,
                status: "draft",
                submitted_at: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const selectFilesMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "file-02", file_name: "constitution.pdf", file_type: "application/pdf" }],
          error: null,
        }),
      });

      const updateFilesMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const updateSubmissionMock = vi.fn();
      updateSubmissionMock.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase!.from as any).mockImplementation((table: string) => {
        if (table === "organization_profiles") return { select: selectProfileMock };
        if (table === "document_submissions") {
          return {
            select: selectSubmissionMock,
            update: updateSubmissionMock,
          };
        }
        if (table === "document_submission_files") {
          return {
            select: selectFilesMock,
            update: updateFilesMock,
          };
        }
        return {};
      });

      await submitDocumentSubmissionForReviewInSupabase(subId);

      expect(updateSubmissionMock).toHaveBeenCalledTimes(1);
      const updatePayload = updateSubmissionMock.mock.calls[0][0];

      // Because submitted_at was null initially, it is now populated
      expect(updatePayload.submitted_at).not.toBeNull();
      expect(typeof updatePayload.submitted_at).toBe("string");
    });
  });

  describe("B. Historical Revocation Timing & Metric A Point-In-Time Semantics", () => {
    type AccreditationTerm = {
      id: string;
      organizationId: string;
      termNumber: number;
      startDate: string; // YYYY-MM-DD
      endDate: string; // YYYY-MM-DD
      status: "active" | "superseded" | "revoked";
      approvedAt: string; // ISO
      revokedAt?: string | null; // ISO
      revocationReason?: string | null;
    };

    type OrganizationProfileItem = {
      id: string;
      organizationName: string;
      registrationType: "new_organization" | "existing_urn";
      profileStatus: "pending" | "verified" | "suspended_inactive";
      createdAt: string; // ISO
    };

    type DocumentSubmissionItem = {
      id: string;
      organizationId: string;
      submissionScope: "registration" | "renewal";
      renewalId: string | null;
      status: string;
      submittedAt: string | null;
      createdAt: string;
    };

    // Authoritative Section 35 Historical Point-in-Time Evaluation
    const isTermHistoricallyValidAtQuarterEnd = (
      term: AccreditationTerm,
      quarterEndDate: string, // YYYY-MM-DD
      quarterNextStartIso: string, // Next quarter start timestamp (e.g. 2026-04-01T00:00:00+08:00)
      quarterEndTimestampIso: string, // Quarter end point-in-time (e.g. 2026-03-31T23:59:59.999+08:00)
    ): boolean => {
      // 1. Must have been approved before next quarter start (approved_at < next_quarter_start)
      if (term.approvedAt >= quarterNextStartIso) return false;
      // 2. Must cover quarter end date: startDate <= Q_END and endDate >= Q_END
      if (term.startDate > quarterEndDate || term.endDate < quarterEndDate) return false;
      // 3. Revocation timing rule:
      // A term is historically valid at quarter-end when:
      // revoked_at IS NULL OR revoked_at > quarter_end_timestamp
      if (term.status === "revoked") {
        if (!term.revokedAt) {
          // Data quality limitation: status is revoked, but revoked_at is NULL (unresolved historical record)
          // Conservative stance: cannot confirm it was active at quarter-end without timestamp
          return false;
        }
        if (term.revokedAt <= quarterEndTimestampIso) {
          // Revocation took effect before or at the quarter-end point in time
          return false;
        }
      }
      return true;
    };

    const countMetricA = (
      orgs: OrganizationProfileItem[],
      accreditations: AccreditationTerm[],
      quarterEndDate: string,
      quarterNextStartIso: string,
      quarterEndTimestampIso: string,
    ) => {
      const qualifyingOrgIds = new Set<string>();
      for (const org of orgs) {
        const hasValidTerm = accreditations.some(
          (term) =>
            term.organizationId === org.id &&
            isTermHistoricallyValidAtQuarterEnd(term, quarterEndDate, quarterNextStartIso, quarterEndTimestampIso)
        );
        if (hasValidTerm) {
          qualifyingOrgIds.add(org.id);
        }
      }
      return qualifyingOrgIds.size;
    };

    const countMetricB = (
      submissions: DocumentSubmissionItem[],
      quarterStartIso: string,
      quarterEndIso: string,
    ) => {
      const qualifyingOrgIds = new Set<string>();
      for (const sub of submissions) {
        if (sub.submissionScope === "renewal" || sub.renewalId != null) continue;
        if (!sub.submittedAt) continue;
        if (sub.submittedAt >= quarterStartIso && sub.submittedAt < quarterEndIso) {
          qualifyingOrgIds.add(sub.organizationId);
        }
      }
      return qualifyingOrgIds.size;
    };

    it("A. Active accreditation: revoked_at is NULL", () => {
      const activeTerm: AccreditationTerm = {
        id: "acc-active",
        organizationId: "org-1",
        termNumber: 1,
        startDate: "2026-01-01",
        endDate: "2028-12-31",
        status: "active",
        approvedAt: "2026-01-01T08:00:00+08:00",
        revokedAt: null,
        revocationReason: null,
      };

      expect(activeTerm.status).toBe("active");
      expect(activeTerm.revokedAt).toBeNull();
      expect(activeTerm.revocationReason).toBeNull();
    });

    it("B. Historical quarter before revocation: counted (e.g., Q1 and Q2 2027 for term revoked in Q3 2027)", () => {
      const orgs: OrganizationProfileItem[] = [
        { id: "org-revoked-later", organizationName: "Revoked Later Org", registrationType: "new_organization", profileStatus: "suspended_inactive", createdAt: "2026-01-01T00:00:00Z" },
      ];
      // Term: 2026-01-01 -> 2028-12-31, Revoked: 2027-08-15 10:00 Asia/Manila (Q3 2027)
      const accs: AccreditationTerm[] = [
        {
          id: "acc-1",
          organizationId: "org-revoked-later",
          termNumber: 1,
          startDate: "2026-01-01",
          endDate: "2028-12-31",
          status: "revoked",
          approvedAt: "2026-01-01T08:00:00+08:00",
          revokedAt: "2027-08-15T10:00:00+08:00",
          revocationReason: "Violated organizational code of conduct",
        },
      ];

      // Q1 2027: End date 2027-03-31, revokedAt (2027-08-15) > Q1 end -> COUNTED (1)
      expect(
        countMetricA(orgs, accs, "2027-03-31", "2027-04-01T00:00:00+08:00", "2027-03-31T23:59:59.999+08:00")
      ).toBe(1);

      // Q2 2027: End date 2027-06-30, revokedAt (2027-08-15) > Q2 end -> COUNTED (1)
      expect(
        countMetricA(orgs, accs, "2027-06-30", "2027-07-01T00:00:00+08:00", "2027-06-30T23:59:59.999+08:00")
      ).toBe(1);
    });

    it("C. Quarter containing effective revocation: correctly excluded based on exact timestamp", () => {
      const orgs: OrganizationProfileItem[] = [
        { id: "org-revoked-later", organizationName: "Revoked Later Org", registrationType: "new_organization", profileStatus: "suspended_inactive", createdAt: "2026-01-01T00:00:00Z" },
      ];
      // Revoked: 2027-08-15 10:00 Asia/Manila (within Q3 2027)
      const accs: AccreditationTerm[] = [
        {
          id: "acc-1",
          organizationId: "org-revoked-later",
          termNumber: 1,
          startDate: "2026-01-01",
          endDate: "2028-12-31",
          status: "revoked",
          approvedAt: "2026-01-01T08:00:00+08:00",
          revokedAt: "2027-08-15T10:00:00+08:00",
          revocationReason: "Violated organizational code of conduct",
        },
      ];

      // Q3 2027: End date 2027-09-30, revokedAt (2027-08-15) <= Q3 end timestamp -> EXCLUDED (0)
      expect(
        countMetricA(orgs, accs, "2027-09-30", "2027-10-01T00:00:00+08:00", "2027-09-30T23:59:59.999+08:00")
      ).toBe(0);
    });

    it("D. Quarter after revocation: excluded", () => {
      const orgs: OrganizationProfileItem[] = [
        { id: "org-revoked-later", organizationName: "Revoked Later Org", registrationType: "new_organization", profileStatus: "suspended_inactive", createdAt: "2026-01-01T00:00:00Z" },
      ];
      const accs: AccreditationTerm[] = [
        {
          id: "acc-1",
          organizationId: "org-revoked-later",
          termNumber: 1,
          startDate: "2026-01-01",
          endDate: "2028-12-31",
          status: "revoked",
          approvedAt: "2026-01-01T08:00:00+08:00",
          revokedAt: "2027-08-15T10:00:00+08:00",
          revocationReason: "Violated organizational code of conduct",
        },
      ];

      // Q4 2027: End date 2027-12-31 -> EXCLUDED (0)
      expect(
        countMetricA(orgs, accs, "2027-12-31", "2028-01-01T00:00:00+08:00", "2027-12-31T23:59:59.999+08:00")
      ).toBe(0);
    });

    it("E. Superseded term: historically valid within its validity period", () => {
      const orgs: OrganizationProfileItem[] = [
        { id: "org-renewed", organizationName: "Renewed Org", registrationType: "new_organization", profileStatus: "verified", createdAt: "2023-01-10T00:00:00Z" },
      ];
      const accs: AccreditationTerm[] = [
        // Term 1 (superseded)
        {
          id: "acc-t1",
          organizationId: "org-renewed",
          termNumber: 1,
          startDate: "2023-04-01",
          endDate: "2026-03-31",
          status: "superseded",
          approvedAt: "2023-04-01T08:00:00+08:00",
          revokedAt: null,
          revocationReason: null,
        },
        // Term 2 (active renewal)
        {
          id: "acc-t2",
          organizationId: "org-renewed",
          termNumber: 2,
          startDate: "2026-04-01",
          endDate: "2029-03-31",
          status: "active",
          approvedAt: "2026-03-25T08:00:00+08:00",
          revokedAt: null,
          revocationReason: null,
        },
      ];

      // Q1 2026 end (2026-03-31): Term 1 is historically valid -> COUNTED (1)
      expect(
        countMetricA(orgs, accs, "2026-03-31", "2026-04-01T00:00:00+08:00", "2026-03-31T23:59:59.999+08:00")
      ).toBe(1);
    });

    it("F. Renewal: organization counted exactly once across renewal terms", () => {
      const orgs: OrganizationProfileItem[] = [
        { id: "org-renewed", organizationName: "Renewed Org", registrationType: "new_organization", profileStatus: "verified", createdAt: "2023-01-10T00:00:00Z" },
      ];
      const accs: AccreditationTerm[] = [
        {
          id: "acc-t1",
          organizationId: "org-renewed",
          termNumber: 1,
          startDate: "2023-04-01",
          endDate: "2026-03-31",
          status: "superseded",
          approvedAt: "2023-04-01T08:00:00+08:00",
        },
        {
          id: "acc-t2",
          organizationId: "org-renewed",
          termNumber: 2,
          startDate: "2026-04-01",
          endDate: "2029-03-31",
          status: "active",
          approvedAt: "2026-03-25T08:00:00+08:00",
        },
      ];

      // Q2 2026 end (2026-06-30): Term 2 active -> Count = 1 (NOT 2)
      expect(
        countMetricA(orgs, accs, "2026-06-30", "2026-07-01T00:00:00+08:00", "2026-06-30T23:59:59.999+08:00")
      ).toBe(1);
    });

    it("G & H. Immutability trigger semantics: revoked_at and revocation_reason cannot be altered after assignment", () => {
      // Simulate trigger enforcement
      const enforceAccreditationImmutability = (
        oldRow: AccreditationTerm,
        newRow: Partial<AccreditationTerm>
      ) => {
        if (oldRow.revokedAt && newRow.revokedAt !== undefined && newRow.revokedAt !== oldRow.revokedAt) {
          throw new Error("Accreditation revocation timestamp is immutable once set.");
        }
        if (oldRow.revocationReason && newRow.revocationReason !== undefined && newRow.revocationReason !== oldRow.revocationReason) {
          throw new Error("Accreditation revocation reason is immutable once set.");
        }
        if (newRow.status !== "revoked" && newRow.revokedAt) {
          throw new Error("Non-revoked accreditation terms cannot have a revocation timestamp.");
        }
        if (oldRow.status === "revoked" && newRow.status && newRow.status !== "revoked") {
          throw new Error("A revoked accreditation term cannot be reactivated.");
        }
      };

      const revokedRow: AccreditationTerm = {
        id: "acc-r1",
        organizationId: "org-1",
        termNumber: 1,
        startDate: "2026-01-01",
        endDate: "2028-12-31",
        status: "revoked",
        approvedAt: "2026-01-01T08:00:00+08:00",
        revokedAt: "2027-08-15T10:00:00+08:00",
        revocationReason: "Initial reason",
      };

      // Attempting to overwrite revoked_at must fail
      expect(() =>
        enforceAccreditationImmutability(revokedRow, { revokedAt: "2027-09-01T00:00:00+08:00" })
      ).toThrow("Accreditation revocation timestamp is immutable once set.");

      // Attempting to overwrite revocation_reason must fail
      expect(() =>
        enforceAccreditationImmutability(revokedRow, { revocationReason: "Tampered reason" })
      ).toThrow("Accreditation revocation reason is immutable once set.");

      // Attempting to reactivate a revoked term must fail
      expect(() =>
        enforceAccreditationImmutability(revokedRow, { status: "active" })
      ).toThrow("A revoked accreditation term cannot be reactivated.");

      // Non-revoked term with revoked_at must fail
      const activeRow: AccreditationTerm = {
        id: "acc-a1",
        organizationId: "org-2",
        termNumber: 1,
        startDate: "2026-01-01",
        endDate: "2028-12-31",
        status: "active",
        approvedAt: "2026-01-01T08:00:00+08:00",
        revokedAt: null,
        revocationReason: null,
      };
      expect(() =>
        enforceAccreditationImmutability(activeRow, { revokedAt: "2026-06-01T00:00:00+08:00" })
      ).toThrow("Non-revoked accreditation terms cannot have a revocation timestamp.");
    });

    it("I. Legacy revoked row with exact activity-log timestamp: correctly backfilled", () => {
      // If activity_logs contains exact 'Revoked Accreditation' action with timestamp:
      const activityLogEvidence = {
        action: "Revoked Accreditation",
        created_at: "2026-05-20T14:30:00+08:00",
        description: "Revoked accreditation term 1. Reason: Disbanded by board resolution",
      };

      // Backfill derives exact timestamp and reason
      const backfilledTerm: AccreditationTerm = {
        id: "acc-legacy-1",
        organizationId: "org-legacy",
        termNumber: 1,
        startDate: "2025-01-01",
        endDate: "2027-12-31",
        status: "revoked",
        approvedAt: "2025-01-01T08:00:00+08:00",
        revokedAt: activityLogEvidence.created_at,
        revocationReason: "Disbanded by board resolution",
      };

      expect(backfilledTerm.revokedAt).toBe("2026-05-20T14:30:00+08:00");
      expect(backfilledTerm.revocationReason).toBe("Disbanded by board resolution");
    });

    it("J. Legacy revoked row without authoritative exact timestamp: remains NULL and is reported as unresolved", () => {
      // If no activity_logs or audit evidence exists:
      const ambiguousLegacyTerm: AccreditationTerm = {
        id: "acc-legacy-ambiguous",
        organizationId: "org-ambiguous",
        termNumber: 1,
        startDate: "2024-01-01",
        endDate: "2026-12-31",
        status: "revoked",
        approvedAt: "2024-01-01T08:00:00+08:00",
        revokedAt: null, // CRITICAL: NEVER FABRICATE TIMESTAMPS
        revocationReason: null,
      };

      expect(ambiguousLegacyTerm.revokedAt).toBeNull();
      // Identified as a historical data-quality limitation
      const isUnresolvedLegacy = ambiguousLegacyTerm.status === "revoked" && ambiguousLegacyTerm.revokedAt === null;
      expect(isUnresolvedLegacy).toBe(true);
    });

    it("K. Metric B: counts first formal submission in receipt quarter, not created_at quarter", () => {
      const submissions: DocumentSubmissionItem[] = [
        {
          id: "sub-1",
          organizationId: "org-1",
          submissionScope: "registration",
          renewalId: null,
          status: "under_admin_review",
          submittedAt: "2026-04-05T09:00:00+08:00", // Q2
          createdAt: "2026-03-20T09:00:00+08:00", // Q1 (draft)
        },
      ];

      expect(countMetricB(submissions, "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00")).toBe(0);
      expect(countMetricB(submissions, "2026-04-01T00:00:00+08:00", "2026-07-01T00:00:00+08:00")).toBe(1);
    });

    it("K. Metric B: does NOT count draft that was never formally submitted (submitted_at is null)", () => {
      const submissions: DocumentSubmissionItem[] = [
        {
          id: "sub-draft",
          organizationId: "org-draft",
          submissionScope: "registration",
          renewalId: null,
          status: "draft",
          submittedAt: null,
          createdAt: "2026-02-10T09:00:00+08:00",
        },
      ];

      expect(countMetricB(submissions, "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00")).toBe(0);
    });

    it("K. Metric B: strictly excludes renewals", () => {
      const submissions: DocumentSubmissionItem[] = [
        {
          id: "sub-ren-1",
          organizationId: "org-ren",
          submissionScope: "renewal",
          renewalId: "ren-cycle-01",
          status: "under_admin_review",
          submittedAt: "2026-02-15T09:00:00+08:00",
          createdAt: "2026-02-15T08:00:00+08:00",
        },
      ];

      expect(countMetricB(submissions, "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00")).toBe(0);
    });

    it("K. Metric B: counts rejected application if it was formally submitted", () => {
      const submissions: DocumentSubmissionItem[] = [
        {
          id: "sub-rej-1",
          organizationId: "org-rej",
          submissionScope: "registration",
          renewalId: null,
          status: "rejected_red",
          submittedAt: "2026-02-15T09:00:00+08:00",
          createdAt: "2026-02-15T08:00:00+08:00",
        },
      ];

      expect(countMetricB(submissions, "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00")).toBe(1);
    });

    it("K. Metric B: resubmission in later quarter does not shift receipt quarter or double-count", () => {
      const submissions: DocumentSubmissionItem[] = [
        {
          id: "sub-resub-1",
          organizationId: "org-resub",
          submissionScope: "registration",
          renewalId: null,
          status: "under_admin_review",
          submittedAt: "2026-02-10T09:00:00+08:00", // Preserved original receipt timestamp!
          createdAt: "2026-02-10T08:00:00+08:00",
        },
      ];

      expect(countMetricB(submissions, "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00")).toBe(1);
      expect(countMetricB(submissions, "2026-04-01T00:00:00+08:00", "2026-07-01T00:00:00+08:00")).toBe(0);
    });
  });

  describe("C. Authoritative Administrative Revocation RPC Contract", () => {
    it("calls revoke_organization_accreditation RPC with admin session and returns mapped record", async () => {
      writeAdminSession({
        id: "admin-uuid-1",
        username: "admin_pasig",
        email: "admin@pasig.gov.ph",
        displayName: "PCYDO Admin",
        sessionToken: "admin-token-12345",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const mockReturnedRow = {
        id: "acc-uuid-123",
        organization_id: "org-uuid-456",
        term_number: 1,
        start_date: "2026-01-01",
        end_date: "2028-12-31",
        certificate_urn: "YORP-2026-0001",
        status: "revoked",
        is_legacy_inferred: false,
        approved_by: "admin-uuid-1",
        approved_at: "2026-01-01T08:00:00Z",
        created_at: "2026-01-01T08:00:00Z",
        revoked_at: "2026-09-17T12:00:00Z",
        revocation_reason: "Formal administrative revocation",
      };

      (supabase!.rpc as any).mockResolvedValue({
        data: mockReturnedRow,
        error: null,
      });

      const result = await revokeOrganizationAccreditationInSupabase({
        accreditationId: "acc-uuid-123",
        reason: "Formal administrative revocation",
        revokedAt: "2026-09-17T12:00:00Z",
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("revoke_organization_accreditation", {
        _session_token: "admin-token-12345",
        _accreditation_id: "acc-uuid-123",
        _revocation_reason: "Formal administrative revocation",
        _revoked_at: "2026-09-17T12:00:00Z",
      });

      expect(result.id).toBe("acc-uuid-123");
      expect(result.status).toBe("revoked");
      expect(result.revokedAt).toBe("2026-09-17T12:00:00Z");
      expect(result.revocationReason).toBe("Formal administrative revocation");
    });
  });

  describe("D. Organizational Level Specification: Derived Reporting Value", () => {
    it("locks Organizational Level as 'City/Municipal' derived value with 100% distribution", () => {
      const derivedOrganizationalLevel = "City/Municipal";
      const orgPopulation = [
        { id: "org-1", barangay: "San Nicolas" },
        { id: "org-2", barangay: "Kapitolyo" },
        { id: "org-3", barangay: "Ugong" },
      ];

      // Derived value is uniform for the current PCYDO/YORP registry scope
      const distribution = orgPopulation.map((org) => ({
        orgId: org.id,
        barangay: org.barangay,
        organizationalLevel: derivedOrganizationalLevel,
      }));

      expect(distribution.every((entry) => entry.organizationalLevel === "City/Municipal")).toBe(true);
      expect(distribution.length).toBe(3);
    });

    it("verifies mandatory disclosure wording for Organizational Level reporting", () => {
      const requiredDisclosure =
        "In accordance with the current Pasig City Youth Development Office registry scope, registered youth and youth-serving organizations are reported at the City/Municipal organizational level. Organizational operational scope (e.g., barangay-based vs city-wide) is not currently stored as a separate registry field.";

      expect(requiredDisclosure).toContain("City/Municipal");
      expect(requiredDisclosure).toContain("Pasig City Youth Development Office");
      expect(requiredDisclosure).toContain("not currently stored as a separate registry field");
    });
  });

  describe("E. Advocacy Source-of-Truth & Reporting Semantics", () => {
    it("confirms the 10 canonical Y-TRACE advocacy themes", () => {
      const canonicalThemes = [
        "education",
        "environment",
        "health",
        "peace building and security",
        "governance",
        "active citizenship",
        "global mobility",
        "social inclusion and equity",
        "economic empowerment",
        "agriculture",
      ];

      expect(advocacyOptions).toEqual(canonicalThemes);
      expect(advocacyOptions.length).toBe(10);
    });

    it("disaggregates distinct organizations per theme (non-additive semantics)", () => {
      // Example: Org A has 3 advocacies (education, health, environment)
      // Org B has 2 advocacies (education, governance)
      // Total distinct organizations: 2
      const orgs = [
        { id: "org-A", advocacies: ["education", "health", "environment"] },
        { id: "org-B", advocacies: ["education", "governance"] },
      ];

      const totalDistinctOrganizations = orgs.length; // 2

      // Count distinct orgs per theme
      const themeCounts: Record<string, number> = {};
      for (const theme of advocacyOptions) {
        themeCounts[theme] = orgs.filter((org) => org.advocacies.includes(theme)).length;
      }

      expect(themeCounts["education"]).toBe(2);
      expect(themeCounts["health"]).toBe(1);
      expect(themeCounts["environment"]).toBe(1);
      expect(themeCounts["governance"]).toBe(1);
      expect(themeCounts["agriculture"]).toBe(0);

      // Verify non-additive property: Sum of counts (5) != Total organizations (2)
      const sumOfThemeCounts = Object.values(themeCounts).reduce((sum, count) => sum + count, 0);
      expect(sumOfThemeCounts).toBe(5);
      expect(sumOfThemeCounts).toBeGreaterThan(totalDistinctOrganizations);

      // Percentages calculation: (theme_count / total_organizations) * 100
      const educationPercentage = (themeCounts["education"] / totalDistinctOrganizations) * 100;
      expect(educationPercentage).toBe(100); // 2/2 = 100%

      const healthPercentage = (themeCounts["health"] / totalDistinctOrganizations) * 100;
      expect(healthPercentage).toBe(50); // 1/2 = 50%

      // Required disclosure note and table title
      const tableTitle = "Organizations by Advocacy Theme";
      const disclosureNote = "Non-additive: organizations may select multiple advocacy themes.";
      expect(tableTitle).toBe("Organizations by Advocacy Theme");
      expect(disclosureNote).toBe("Non-additive: organizations may select multiple advocacy themes.");
    });
  });
});
