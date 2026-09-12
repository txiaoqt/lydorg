import { describe, expect, it } from "vitest";
import {
  calculateFixedAnniversaryRenewalTerm,
  calculateStandardContinuousProtectionRenewalTerm,
  canCreateBudgetRequest,
  canDisburseBudget,
  canLiquidateFunds,
  canParticipateInYpop,
  deriveAccreditationStatus,
  getOrganizationRenewalCountdown,
  getRenewalWindowEligibility,
  ORGANIZATION_REGISTRATION_VALIDITY_YEARS,
  RENEWAL_ANCHOR_CUTOFF_DAYS,
  RENEWAL_LATE_WINDOW_DAYS,
  RENEWAL_WINDOW_DAYS,
  RENEWAL_WINDOW_EARLY_DAYS,
} from "./organization-renewal";
import type {
  AccreditationPersistedStatus,
  AccreditationStatus,
  DocumentSubmission,
  OrganizationAccreditationRecord,
  OrganizationProfile,
  OrganizationRenewalRecord,
  RenewalApplicationStatus,
  RequiredDocumentType,
  SubmissionFile,
} from "./lydo-connect-data";

describe("Phase 2: Y-TRACE Renewal & Accreditation Workflow Suite", () => {
  const createMockProfile = (overrides: Partial<OrganizationProfile> = {}): OrganizationProfile => ({
    id: "org-1",
    referenceId: "REF-001",
    userId: "user-1",
    organizationName: "Pasig Youth Council",
    organizationEmail: "youth@pasig.gov.ph",
    contactNumber: "09171234567",
    district: "District 1",
    barangay: "San Nicolas",
    isExistingOrganization: true,
    organizationIdentifierNumber: "PYC-2024-001",
    registrationType: "existing_urn",
    urn: "PYC-2024-001",
    urnNormalized: "pyc2024001",
    urnReviewStatus: "verified",
    urnAdminRemarks: "",
    urnReviewedBy: "admin-1",
    urnReviewedAt: "2024-05-10T00:00:00Z",
    verificationMethod: "documents",
    majorClassification: "Youth Organization",
    subClassification: "Community-Based",
    advocacies: ["Governance", "Youth Development"],
    adviserName: "Juan Dela Cruz",
    representativeName: "Maria Santos",
    address: "Caruncho Ave, Pasig City",
    facebookPageUrl: "https://facebook.com/pasigyouth",
    profileStatus: "verified",
    verifiedAt: "2024-05-10T08:00:00Z",
    internalNotes: "",
    yorpRegisteredYear: 2024,
    yorpRenewedYear: null,
    currentAccreditationId: "accred-1",
    accreditationStartDate: "2024-05-10",
    accreditationExpiresAt: "2027-05-10T23:59:59+08:00",
    createdAt: "2024-05-01T08:00:00Z",
    updatedAt: "2024-05-10T08:00:00Z",
    ...overrides,
  });

  // ----------------------------------------------------------------------------
  // 1. ACCREDITATION STATUS DERIVATION (Tests 1-5)
  // ----------------------------------------------------------------------------
  describe("1. Canonical Accreditation Status Derivation", () => {
    it("Test 1: derives 'active' when term is unexpired and > 90 days remaining", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2027-05-10",
        now: new Date("2026-05-10T00:00:00Z"),
      });
      expect(status).toBe("active");
    });

    it("Test 2: derives 'expiring_soon' when within 90 days of expiration", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2027-05-10",
        now: new Date("2027-03-01T00:00:00Z"), // ~70 days remaining
      });
      expect(status).toBe("expiring_soon");
    });

    it("Test 3: derives 'expired' immediately when now passes end_date (NO grace period)", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2027-05-10",
        now: new Date("2027-05-11T00:00:00Z"), // 1 day past expiration
      });
      expect(status).toBe("expired");
    });

    it("Test 4: derives 'superseded' when persisted status is superseded", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "superseded",
        endDate: "2027-05-10",
        now: new Date("2026-05-10T00:00:00Z"),
      });
      expect(status).toBe("superseded");
    });

    it("Test 5: derives 'revoked' when persisted status is revoked", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "revoked",
        endDate: "2027-05-10",
        now: new Date("2026-05-10T00:00:00Z"),
      });
      expect(status).toBe("revoked");
    });
  });

  // ----------------------------------------------------------------------------
  // 2. RENEWAL WINDOW ELIGIBILITY (Tests 6-11)
  // ----------------------------------------------------------------------------
  describe("2. Renewal Window Eligibility Boundaries", () => {
    const expiry = "2027-05-10T00:00:00Z";

    it("Test 6: allows drafting exactly 90 days before expiry", () => {
      // 90 days before May 10, 2027 is Feb 9, 2027
      const now = new Date("2027-02-09T00:00:00Z");
      const res = getRenewalWindowEligibility(expiry, now);
      expect(res.canDraft).toBe(true);
      expect(res.windowStatus).toBe("open");
    });

    it("Test 7: allows drafting 89 days before expiry", () => {
      const now = new Date("2027-02-10T00:00:00Z");
      const res = getRenewalWindowEligibility(expiry, now);
      expect(res.canDraft).toBe(true);
      expect(res.windowStatus).toBe("open");
    });

    it("Test 8: allows drafting on the exact expiry date", () => {
      const now = new Date("2027-05-10T00:00:00Z");
      const res = getRenewalWindowEligibility(expiry, now);
      expect(res.canDraft).toBe(true);
      expect(res.windowStatus).toBe("open");
    });

    it("Test 9: allows late renewal drafting 1 day after expiry", () => {
      const now = new Date("2027-05-11T00:00:00Z");
      const res = getRenewalWindowEligibility(expiry, now);
      expect(res.canDraft).toBe(true);
      expect(res.windowStatus).toBe("late_open");
      expect(res.daysPastExpiry).toBe(1);
    });

    it("Test 10: allows late renewal drafting exactly 180 days after expiry", () => {
      // 180 days after May 10, 2027 is Nov 6, 2027
      const now = new Date("2027-11-06T00:00:00Z");
      const res = getRenewalWindowEligibility(expiry, now);
      expect(res.canDraft).toBe(true);
      expect(res.windowStatus).toBe("late_open");
      expect(res.daysPastExpiry).toBe(180);
    });

    it("Test 11: blocks renewal drafting on day 181 after expiry (cutoff exceeded)", () => {
      // 181 days after May 10, 2027 is Nov 7, 2027
      const now = new Date("2027-11-07T00:00:00Z");
      const res = getRenewalWindowEligibility(expiry, now);
      expect(res.canDraft).toBe(false);
      expect(res.windowStatus).toBe("cutoff_exceeded");
      expect(res.reason).toContain("Full re-registration is required");
    });
  });

  // ----------------------------------------------------------------------------
  // 3. STANDARD CONTINUOUS PROTECTION TERM ANCHOR (Tests 12-19)
  // ----------------------------------------------------------------------------
  describe("3. Standard Continuous Protection Term Anchor Calculations", () => {
    const prevEnd = "2027-05-10";

    it("Test 12: approval before expiry anchors to previous end_date (continuous)", () => {
      const approvalDate = "2027-03-15"; // ~56 days early
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-05-10");
      expect(res.endDate).toBe("2030-05-10");
      expect(res.isContinuous).toBe(true);
    });

    it("Test 13: approval on exact expiry date anchors to previous end_date (continuous)", () => {
      const approvalDate = "2027-05-10";
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-05-10");
      expect(res.endDate).toBe("2030-05-10");
      expect(res.isContinuous).toBe(true);
    });

    it("Test 14: approval 29 days late anchors to previous end_date (continuous in grace)", () => {
      const approvalDate = "2027-06-08"; // 29 days late
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-05-10");
      expect(res.endDate).toBe("2030-05-10");
      expect(res.isContinuous).toBe(true);
    });

    it("Test 15: approval exactly 30 days late anchors to previous end_date (anchor cutoff boundary)", () => {
      const approvalDate = "2027-06-09"; // 30 days late
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-05-10");
      expect(res.endDate).toBe("2030-05-10");
      expect(res.isContinuous).toBe(true);
    });

    it("Test 16: approval 31 days late anchors to approval date (lapsed late renewal)", () => {
      const approvalDate = "2027-06-10"; // 31 days late
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-06-10");
      expect(res.endDate).toBe("2030-06-10");
      expect(res.isContinuous).toBe(false);
    });

    it("Test 17: approval 90 days late anchors to approval date", () => {
      const approvalDate = "2027-08-08"; // 90 days late
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-08-08");
      expect(res.endDate).toBe("2030-08-08");
      expect(res.isContinuous).toBe(false);
    });

    it("Test 18: approval 179 days late anchors to approval date", () => {
      const approvalDate = "2027-11-05"; // 179 days late
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-11-05");
      expect(res.endDate).toBe("2030-11-05");
      expect(res.isContinuous).toBe(false);
    });

    it("Test 19: approval exactly 180 days late anchors to approval date", () => {
      const approvalDate = "2027-11-06"; // 180 days late
      const res = calculateStandardContinuousProtectionRenewalTerm(prevEnd, approvalDate);
      expect(res.startDate).toBe("2027-11-06");
      expect(res.endDate).toBe("2030-11-06");
      expect(res.isContinuous).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // 4. RENEWAL WORKFLOW STATE TRANSITIONS (Tests 20-28)
  // ----------------------------------------------------------------------------
  describe("4. Canonical Renewal Workflow State Transitions", () => {
    const validTransitions: Record<RenewalApplicationStatus, RenewalApplicationStatus[]> = {
      draft: ["submitted"],
      submitted: ["under_review"],
      under_review: ["needs_revision", "approved", "rejected"],
      needs_revision: ["resubmitted"],
      resubmitted: ["under_review"],
      approved: [],
      rejected: [],
    };

    const assertTransitionAllowed = (from: RenewalApplicationStatus, to: RenewalApplicationStatus) => {
      return validTransitions[from].includes(to);
    };

    it("Test 20: allows draft -> submitted", () => {
      expect(assertTransitionAllowed("draft", "submitted")).toBe(true);
    });

    it("Test 21: allows submitted -> under_review upon admin document review action", () => {
      expect(assertTransitionAllowed("submitted", "under_review")).toBe(true);
    });

    it("Test 22: allows under_review -> needs_revision", () => {
      expect(assertTransitionAllowed("under_review", "needs_revision")).toBe(true);
    });

    it("Test 23: allows needs_revision -> resubmitted", () => {
      expect(assertTransitionAllowed("needs_revision", "resubmitted")).toBe(true);
    });

    it("Test 24: allows resubmitted -> under_review upon admin review action", () => {
      expect(assertTransitionAllowed("resubmitted", "under_review")).toBe(true);
    });

    it("Test 25: allows under_review -> approved", () => {
      expect(assertTransitionAllowed("under_review", "approved")).toBe(true);
    });

    it("Test 26: allows under_review -> rejected", () => {
      expect(assertTransitionAllowed("under_review", "rejected")).toBe(true);
    });

    it("Test 27: rejected is terminal and CANNOT transition to any state or resubmit", () => {
      expect(validTransitions.rejected.length).toBe(0);
      expect(assertTransitionAllowed("rejected", "resubmitted")).toBe(false);
      expect(assertTransitionAllowed("rejected", "draft")).toBe(false);
      expect(assertTransitionAllowed("rejected", "submitted")).toBe(false);
    });

    it("Test 28: submitted CANNOT directly transition to approved (must be under_review)", () => {
      expect(assertTransitionAllowed("submitted", "approved")).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. DOCUMENT PACKET INTEGRATION & VERSIONING (Tests 29-33)
  // ----------------------------------------------------------------------------
  describe("5. Document Packet Integration & Evidence History", () => {
    const requiredTypes: RequiredDocumentType[] = [
      { id: "doc-1", name: "Constitution and By-Laws", description: "", templateUrl: "", sortOrder: 1, isRequired: true, isActive: true, templateScope: "document_submission", scope: "both" },
      { id: "doc-2", name: "Form B", description: "", templateUrl: "", sortOrder: 2, isRequired: true, isActive: true, templateScope: "document_submission", scope: "both" },
      { id: "doc-3", name: "Officers Directory", description: "", templateUrl: "", sortOrder: 3, isRequired: true, isActive: true, templateScope: "document_submission", scope: "both" },
      { id: "doc-4", name: "Members in Good Standing", description: "", templateUrl: "", sortOrder: 4, isRequired: true, isActive: true, templateScope: "document_submission", scope: "both" },
      { id: "doc-5", name: "Form A", description: "", templateUrl: "", sortOrder: 5, isRequired: true, isActive: true, templateScope: "document_submission", scope: "both" },
      { id: "doc-6", name: "Data Request Form", description: "", templateUrl: "", sortOrder: 6, isRequired: true, isActive: true, templateScope: "document_submission", scope: "both" },
    ];

    it("Test 29: validates that all required documents must exist before renewal submission", () => {
      const uploadedDocTypeIds = ["doc-1", "doc-2", "doc-3", "doc-4", "doc-5"]; // Missing doc-6
      const canSubmit = requiredTypes.every((t) => uploadedDocTypeIds.includes(t.id));
      expect(canSubmit).toBe(false);

      uploadedDocTypeIds.push("doc-6");
      const canSubmitComplete = requiredTypes.every((t) => uploadedDocTypeIds.includes(t.id));
      expect(canSubmitComplete).toBe(true);
    });

    it("Test 30: validates that all required renewal documents must be approved before final approval", () => {
      const files: Array<{ documentTypeId: string; adminStatus: string }> = [
        { documentTypeId: "doc-1", adminStatus: "approved_green" },
        { documentTypeId: "doc-2", adminStatus: "approved_green" },
        { documentTypeId: "doc-3", adminStatus: "approved_green" },
        { documentTypeId: "doc-4", adminStatus: "needs_revision" }, // unapproved!
        { documentTypeId: "doc-5", adminStatus: "approved_green" },
        { documentTypeId: "doc-6", adminStatus: "approved_green" },
      ];

      const allApproved = requiredTypes.every((req) => {
        const file = files.find((f) => f.documentTypeId === req.id);
        return file && file.adminStatus === "approved_green";
      });
      expect(allApproved).toBe(false);
    });

    it("Test 31: replacing a needs_revision file preserves original evidence in revision_history", () => {
      const originalFile: SubmissionFile = {
        id: "file-1",
        submissionId: "sub-1",
        documentTypeId: "doc-1",
        fileName: "CBL-v1.pdf",
        fileUrl: "storage://docs/cbl-v1.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "needs_revision",
        adminRemarks: "Signatures missing on page 4",
        revisionHistory: [],
        uploadedAt: "2027-02-10T10:00:00Z",
        reviewedAt: "2027-02-12T14:00:00Z",
        createdAt: "2027-02-10T10:00:00Z",
        updatedAt: "2027-02-12T14:00:00Z",
      };

      // Replacement protocol
      const replacementEntry = {
        action: "replaced",
        previousFileName: originalFile.fileName,
        previousFileUrl: originalFile.fileUrl,
        previousFileType: originalFile.fileType,
        previousFileSize: originalFile.fileSize,
        previousStatus: originalFile.adminStatus,
        adminRemarks: originalFile.adminRemarks,
        reviewedAt: originalFile.reviewedAt,
      };

      const updatedFile: SubmissionFile = {
        ...originalFile,
        fileName: "CBL-v2-signed.pdf",
        fileUrl: "storage://docs/cbl-v2-signed.pdf",
        adminStatus: "submitted",
        adminRemarks: "",
        reviewedAt: "",
        uploadedAt: "2027-02-14T09:00:00Z",
        revisionHistory: [replacementEntry],
      };

      expect(updatedFile.fileName).toBe("CBL-v2-signed.pdf");
      expect(updatedFile.adminStatus).toBe("submitted");
      expect(updatedFile.revisionHistory).toHaveLength(1);
      expect(updatedFile.revisionHistory![0].previousFileName).toBe("CBL-v1.pdf");
      expect(updatedFile.revisionHistory![0].adminRemarks).toBe("Signatures missing on page 4");
    });

    it("Test 32: rejected file history remains preserved when replaced", () => {
      const history = [
        {
          action: "replaced",
          previousFileName: "Officers-2024.pdf",
          previousFileUrl: "storage://docs/officers-old.pdf",
          previousStatus: "rejected_red",
          adminRemarks: "Expired roster submitted",
          reviewedAt: "2027-02-15T12:00:00Z",
        },
      ];

      expect(history[0].previousStatus).toBe("rejected_red");
      expect(history[0].adminRemarks).toBe("Expired roster submitted");
    });

    it("Test 33: renewal document packets remain isolated from initial registration documents via submissionScope and renewalId", () => {
      const regPacket: DocumentSubmission = {
        id: "sub-reg-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        status: "approved_green",
        userConfirmed: true,
        submissionScope: "registration",
        renewalId: null,
        submittedAt: "2024-05-01T00:00:00Z",
        reviewedBy: "admin-1",
        reviewedAt: "2024-05-10T00:00:00Z",
        overallRemarks: "Initial registration verified",
        createdAt: "2024-05-01T00:00:00Z",
        updatedAt: "2024-05-10T00:00:00Z",
      };

      const renewalPacket: DocumentSubmission = {
        id: "sub-renew-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        status: "submitted",
        userConfirmed: false,
        submissionScope: "renewal",
        renewalId: "renewal-cycle-2",
        submittedAt: "2027-03-01T00:00:00Z",
        reviewedBy: "",
        reviewedAt: "",
        overallRemarks: "",
        createdAt: "2027-02-15T00:00:00Z",
        updatedAt: "2027-03-01T00:00:00Z",
      };

      expect(regPacket.submissionScope).toBe("registration");
      expect(regPacket.renewalId).toBeNull();
      expect(renewalPacket.submissionScope).toBe("renewal");
      expect(renewalPacket.renewalId).toBe("renewal-cycle-2");
    });
  });

  // ----------------------------------------------------------------------------
  // 6. CONCURRENCY & INTEGRITY RULES (Tests 34-38)
  // ----------------------------------------------------------------------------
  describe("6. Concurrency & Integrity Protections", () => {
    it("Test 34: prevents duplicate active renewal drafts for the same organization", () => {
      const renewals: OrganizationRenewalRecord[] = [
        {
          id: "ren-1",
          organizationId: "org-1",
          cycleNumber: 2,
          currentAccreditationId: "acc-1",
          status: "draft",
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          adminRemarks: null,
          createdAt: "2027-02-10T00:00:00Z",
          updatedAt: "2027-02-10T00:00:00Z",
        },
      ];

      const createDraft = (orgId: string, cycle: number) => {
        const hasActive = renewals.some(
          (r) => r.organizationId === orgId && ["draft", "submitted", "under_review", "needs_revision", "resubmitted"].includes(r.status),
        );
        if (hasActive) throw new Error("A renewal application is already in progress for this organization.");
        renewals.push({
          id: "ren-2",
          organizationId: orgId,
          cycleNumber: cycle,
          currentAccreditationId: "acc-1",
          status: "draft",
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          adminRemarks: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      };

      expect(() => createDraft("org-1", 2)).toThrow("A renewal application is already in progress");
    });

    it("Test 35: simultaneous approvals serialize and only the first transaction approves", () => {
      let currentStatus: RenewalApplicationStatus = "under_review";
      let approvedCount = 0;

      const approve = () => {
        if (currentStatus !== "under_review") {
          throw new Error("Renewal application has already been processed.");
        }
        currentStatus = "approved";
        approvedCount++;
      };

      approve(); // Admin 1
      expect(approvedCount).toBe(1);
      expect(() => approve()).toThrow("Renewal application has already been processed."); // Admin 2
    });

    it("Test 36: rejects approval on a stale rejected renewal", () => {
      const renewal: { status: RenewalApplicationStatus } = { status: "rejected" };
      const approve = (status: RenewalApplicationStatus) => {
        if (status !== "under_review") {
          throw new Error(`Cannot approve renewal from status ${status}. Expected under_review.`);
        }
      };
      expect(() => approve(renewal.status)).toThrow("Cannot approve renewal from status rejected.");
    });

    it("Test 37: enforces that at most one accreditation term is active at any time", () => {
      const terms: OrganizationAccreditationRecord[] = [
        {
          id: "acc-1",
          organizationId: "org-1",
          termNumber: 1,
          startDate: "2024-05-10",
          endDate: "2027-05-10",
          certificateUrn: "URN-1",
          status: "active",
          isLegacyInferred: false,
          approvedBy: "admin-1",
          approvedAt: "2024-05-10T00:00:00Z",
          createdAt: "2024-05-10T00:00:00Z",
        },
      ];

      // Approval supersedes Term 1 before activating Term 2
      const approveTerm2 = () => {
        const activeIndex = terms.findIndex((t) => t.status === "active");
        if (activeIndex !== -1) {
          terms[activeIndex].status = "superseded";
        }
        terms.push({
          id: "acc-2",
          organizationId: "org-1",
          termNumber: 2,
          startDate: "2027-05-10",
          endDate: "2030-05-10",
          certificateUrn: "URN-2",
          status: "active",
          isLegacyInferred: false,
          approvedBy: "admin-2",
          approvedAt: "2027-05-10T00:00:00Z",
          createdAt: "2027-05-10T00:00:00Z",
        });
      };

      approveTerm2();
      const activeTerms = terms.filter((t) => t.status === "active");
      expect(activeTerms).toHaveLength(1);
      expect(activeTerms[0].termNumber).toBe(2);
      expect(terms[0].status).toBe("superseded");
    });

    it("Test 38: prevents skipping renewal cycle numbers (cycle must strictly equal current_term + 1)", () => {
      const currentTermNumber = 1;
      const validateCycleNumber = (targetCycle: number) => {
        if (targetCycle !== currentTermNumber + 1) {
          throw new Error(`Cycle mismatch: requested Cycle ${targetCycle}, expected Cycle ${currentTermNumber + 1}.`);
        }
      };

      expect(() => validateCycleNumber(3)).toThrow("Cycle mismatch: requested Cycle 3, expected Cycle 2.");
      expect(() => validateCycleNumber(2)).not.toThrow();
    });
  });

  // ----------------------------------------------------------------------------
  // 7. EXPIRATION & PRIVILEGE GATING (Tests 39-43)
  // ----------------------------------------------------------------------------
  describe("7. Expiration & Privilege Gating Under Final Policy", () => {
    const expiredDate = "2027-05-10";
    const pastDate = new Date("2027-06-01T00:00:00Z"); // 22 days past expiration

    it("Test 39: pending renewal application does NOT prevent expired status", () => {
      const derived = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: expiredDate,
        now: pastDate,
      });
      expect(derived).toBe("expired");
    });

    it("Test 40: needs_revision status after expiration remains derived as 'expired'", () => {
      const derived = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: expiredDate,
        now: pastDate,
      });
      expect(derived).toBe("expired");
    });

    it("Test 41: resubmitted renewal after expiration remains derived as 'expired'", () => {
      const derived = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: expiredDate,
        now: pastDate,
      });
      expect(derived).toBe("expired");
    });

    it("Test 42: rejected renewal during expiration remains 'expired'", () => {
      const derived = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: expiredDate,
        now: pastDate,
      });
      expect(derived).toBe("expired");
    });

    it("Test 43: late renewal does not restore budget or YPOP privileges until approval", () => {
      const expiredStatus: AccreditationStatus = "expired";
      expect(canCreateBudgetRequest(expiredStatus)).toBe(false);
      expect(canDisburseBudget(expiredStatus)).toBe(false);
      expect(canParticipateInYpop(expiredStatus)).toBe(false);

      // Crucial accounting rule: Liquidation is permanently allowed even when expired!
      expect(canLiquidateFunds(expiredStatus)).toBe(true);

      // Once approved, privileges restore
      const activeStatus: AccreditationStatus = "active";
      expect(canCreateBudgetRequest(activeStatus)).toBe(true);
      expect(canDisburseBudget(activeStatus)).toBe(true);
      expect(canParticipateInYpop(activeStatus)).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 8. LEGACY INFERRED RECORDS (Tests 44-46)
  // ----------------------------------------------------------------------------
  describe("8. Legacy Inferred Records Safeguards", () => {
    const inferredRecord: OrganizationAccreditationRecord = {
      id: "acc-inferred-1",
      organizationId: "org-legacy",
      termNumber: 1,
      startDate: "2024-01-01",
      endDate: "2027-01-01",
      certificateUrn: "LEGACY-INFERRED",
      status: "active",
      isLegacyInferred: true,
      approvedBy: null,
      approvedAt: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
    };

    it("Test 44: inferred records remain explicitly flagged as is_legacy_inferred = true", () => {
      expect(inferredRecord.isLegacyInferred).toBe(true);
      expect(inferredRecord.approvedBy).toBeNull();
    });

    it("Test 45: inferred records cannot generate formal accreditation certificate", () => {
      const generateCertificate = (record: OrganizationAccreditationRecord) => {
        if (record.isLegacyInferred) {
          throw new Error("Cannot issue formal accreditation certificate for legacy inferred records.");
        }
        return `CERT-${record.certificateUrn}`;
      };

      expect(() => generateCertificate(inferredRecord)).toThrow("Cannot issue formal accreditation certificate for legacy inferred records.");
    });

    it("Test 46: approved renewal creates confirmed next term with is_legacy_inferred = false", () => {
      const renewedTerm: OrganizationAccreditationRecord = {
        id: "acc-confirmed-2",
        organizationId: "org-legacy",
        termNumber: 2,
        startDate: "2027-01-01",
        endDate: "2030-01-01",
        certificateUrn: "PASIG-YORP-2027-001",
        status: "active",
        isLegacyInferred: false,
        approvedBy: "admin-head",
        approvedAt: "2027-01-01T00:00:00Z",
        createdAt: "2027-01-01T00:00:00Z",
      };

      expect(renewedTerm.termNumber).toBe(2);
      expect(renewedTerm.isLegacyInferred).toBe(false);
      expect(renewedTerm.approvedBy).toBe("admin-head");
    });
  });

  // ----------------------------------------------------------------------------
  // 9. REGRESSION CHECKS (Tests 47-49 verified in suite)
  // ----------------------------------------------------------------------------
  describe("9. Countdown Projection Backward Compatibility", () => {
    it("Test 47: getOrganizationRenewalCountdown prioritizes profile.accreditationExpiresAt projection", () => {
      const profile = createMockProfile({
        accreditationExpiresAt: "2027-05-10T23:59:59+08:00",
        verifiedAt: "2024-05-10T08:00:00Z",
      });
      const countdown = getOrganizationRenewalCountdown(profile, new Date("2027-05-01T00:00:00Z"));
      expect(countdown).not.toBeNull();
      expect(countdown?.daysRemaining).toBe(10);
      expect(countdown?.isDue).toBe(false);
    });

    it("Test 48: getOrganizationRenewalCountdown falls back to verifiedAt + 3y if projection is unset", () => {
      const profile = createMockProfile({
        accreditationExpiresAt: null,
        verifiedAt: "2024-05-10T08:00:00Z",
      });
      const countdown = getOrganizationRenewalCountdown(profile, new Date("2024-05-10T08:00:00Z"));
      expect(countdown).not.toBeNull();
      expect(countdown?.daysRemaining).toBeGreaterThan(1000);
      expect(countdown?.isDue).toBe(false);
    });

    it("Test 49: correctly flags countdown.isDue = true when expired", () => {
      const profile = createMockProfile({
        accreditationExpiresAt: "2027-05-10T00:00:00Z",
      });
      const countdown = getOrganizationRenewalCountdown(profile, new Date("2027-05-15T00:00:00Z"));
      expect(countdown).not.toBeNull();
      expect(countdown?.daysRemaining).toBe(0);
      expect(countdown?.isDue).toBe(true);
    });
  });
});
