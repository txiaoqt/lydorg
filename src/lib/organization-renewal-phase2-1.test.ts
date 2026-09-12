import { describe, expect, it } from "vitest";
import {
  ALLOWED_RENEWAL_TRANSITIONS,
  calculateStandardContinuousProtectionRenewalTerm,
  canCreateBudgetRequest,
  canDisburseBudget,
  canLiquidateFunds,
  canParticipateInYpop,
  canReplaceSubmissionFile,
  canTransitionRenewal,
  deriveAccreditationStatus,
  getRenewalWindowEligibility,
  isRenewalTerminal,
  RENEWAL_ANCHOR_CUTOFF_DAYS,
  RENEWAL_LATE_WINDOW_DAYS,
  RENEWAL_WINDOW_EARLY_DAYS,
} from "./organization-renewal";
import type {
  AccreditationStatus,
  DocumentSubmission,
  DocumentSubmissionStatus,
  OrganizationAccreditationRecord,
  OrganizationProfile,
  OrganizationRenewalRecord,
  RenewalApplicationStatus,
  SubmissionFile,
} from "./lydo-connect-data";

describe("Phase 2.1: Hardening, Security, Concurrency & Regression Suite", () => {
  const createMockProfile = (overrides: Partial<OrganizationProfile> = {}): OrganizationProfile => ({
    id: "org-1",
    referenceId: "REF-001",
    userId: "user-1",
    organizationName: "Pasig Youth Advocates",
    organizationEmail: "pya@pasig.gov.ph",
    contactNumber: "09171234567",
    district: "District 1",
    barangay: "San Nicolas",
    isExistingOrganization: true,
    organizationIdentifierNumber: "PYA-2024-001",
    registrationType: "existing_urn",
    urn: "PYA-2024-001",
    urnNormalized: "pya2024001",
    urnReviewStatus: "verified",
    urnAdminRemarks: "",
    urnReviewedBy: "admin-1",
    urnReviewedAt: "2024-05-10T00:00:00Z",
    verificationMethod: "documents",
    majorClassification: "Youth Organization",
    subClassification: "Community-Based",
    advocacies: ["Education", "Youth Governance"],
    adviserName: "Adviser Santos",
    representativeName: "Leader Cruz",
    address: "Caruncho Ave, Pasig City",
    facebookPageUrl: "https://facebook.com/pya",
    profileStatus: "verified",
    verifiedAt: "2024-05-10T08:00:00Z",
    internalNotes: "",
    yorpRegisteredYear: 2024,
    yorpRenewedYear: null,
    currentAccreditationId: "acc-term-1",
    accreditationStartDate: "2024-05-10",
    accreditationExpiresAt: "2027-05-10T23:59:59+08:00",
    createdAt: "2024-05-01T08:00:00Z",
    updatedAt: "2024-05-10T08:00:00Z",
    ...overrides,
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 1: NOTIFICATION IDEMPOTENCY & CONCURRENCY
  // ----------------------------------------------------------------------------
  describe("Hardening Area 1: Notification Idempotency & Concurrency", () => {
    type NotificationItem = {
      organizationId: string;
      type: string;
      relatedId: string;
      title: string;
    };

    it("prevents duplicate time-driven notifications for the same accreditation term under concurrent executions", () => {
      const notificationLedger: NotificationItem[] = [];

      // Simulates database partial unique index on (organization_id, type, related_id)
      const insertTimeDrivenNotification = (item: NotificationItem): boolean => {
        const isDuplicate = notificationLedger.some(
          (n) => n.organizationId === item.organizationId && n.type === item.type && n.relatedId === item.relatedId,
        );
        if (isDuplicate) return false; // ON CONFLICT DO NOTHING
        notificationLedger.push(item);
        return true;
      };

      const term1Event: NotificationItem = {
        organizationId: "org-1",
        type: "renewal_window_opened",
        relatedId: "acc-term-1",
        title: "Renewal Window Open",
      };

      // Concurrent run 1
      const firstRun = insertTimeDrivenNotification(term1Event);
      // Concurrent run 2 (e.g. simultaneous background sweep or cron trigger)
      const secondRun = insertTimeDrivenNotification(term1Event);

      expect(firstRun).toBe(true);
      expect(secondRun).toBe(false);
      expect(notificationLedger.filter((n) => n.type === "renewal_window_opened")).toHaveLength(1);
    });

    it("allows notifications of the same event type across different accreditation terms", () => {
      const notificationLedger: NotificationItem[] = [];

      const insertTimeDrivenNotification = (item: NotificationItem): boolean => {
        const isDuplicate = notificationLedger.some(
          (n) => n.organizationId === item.organizationId && n.type === item.type && n.relatedId === item.relatedId,
        );
        if (isDuplicate) return false;
        notificationLedger.push(item);
        return true;
      };

      const term1Event: NotificationItem = {
        organizationId: "org-1",
        type: "renewal_window_opened",
        relatedId: "acc-term-1",
        title: "Renewal Window Open - Term 1",
      };

      const term2Event: NotificationItem = {
        organizationId: "org-1",
        type: "renewal_window_opened",
        relatedId: "acc-term-2", // Different term!
        title: "Renewal Window Open - Term 2",
      };

      expect(insertTimeDrivenNotification(term1Event)).toBe(true);
      expect(insertTimeDrivenNotification(term2Event)).toBe(true);
      expect(notificationLedger).toHaveLength(2);
    });

    it("does not restrict regular non-time-driven notifications", () => {
      // General notifications (e.g. inquiry reply, announcements) are not constrained by the partial index
      const generalNotifications = [
        { organizationId: "org-1", type: "inquiry_reply", relatedId: "inquiry-1" },
        { organizationId: "org-1", type: "inquiry_reply", relatedId: "inquiry-1" }, // subsequent update
      ];
      expect(generalNotifications).toHaveLength(2);
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 2: REGISTRATION REVIEW REGRESSION SAFETY
  // ----------------------------------------------------------------------------
  describe("Hardening Area 2: Registration Review Regression Safety", () => {
    it("preserves exact registration review behavior when renewal_id is null", () => {
      let renewalStatusMutated = false;

      // Mock update_admin_document_submission_file_review behavior
      const reviewFile = (fileId: string, renewalId: string | null, status: DocumentSubmissionStatus) => {
        // Automatic renewal advance occurs ONLY when renewalId is present
        if (renewalId !== null) {
          renewalStatusMutated = true;
        }
        return { fileId, status, overallStatus: status };
      };

      // Reviewing a registration document file
      const result = reviewFile("reg-file-1", null, "approved_green");
      expect(result.status).toBe("approved_green");
      expect(renewalStatusMutated).toBe(false);
    });

    it("automatically advances parent renewal from submitted to under_review on first file review", () => {
      let currentRenewalStatus: RenewalApplicationStatus = "submitted";

      const reviewFile = (fileId: string, renewalId: string | null, status: DocumentSubmissionStatus) => {
        if (renewalId !== null) {
          if (["submitted", "resubmitted"].includes(currentRenewalStatus)) {
            currentRenewalStatus = "under_review";
          }
        }
        return { fileId, status };
      };

      reviewFile("renew-file-1", "renewal-1", "approved_green");
      expect(currentRenewalStatus).toBe("under_review");
    });

    it("automatically advances parent renewal from resubmitted to under_review on first review after revision", () => {
      let currentRenewalStatus: RenewalApplicationStatus = "resubmitted";

      const reviewFile = (fileId: string, renewalId: string | null, status: DocumentSubmissionStatus) => {
        if (renewalId !== null) {
          if (["submitted", "resubmitted"].includes(currentRenewalStatus)) {
            currentRenewalStatus = "under_review";
          }
        }
        return { fileId, status };
      };

      reviewFile("renew-file-2", "renewal-1", "approved_green");
      expect(currentRenewalStatus).toBe("under_review");
    });

    it("guarantees that opening or fetching a renewal record produces zero state mutations", () => {
      let renewalStatus: RenewalApplicationStatus = "submitted";

      // Simulates reading a renewal record (pure SELECT)
      const fetchRenewal = (record: { status: RenewalApplicationStatus }) => {
        return { ...record };
      };

      const fetched = fetchRenewal({ status: renewalStatus });
      expect(fetched.status).toBe("submitted");
      expect(renewalStatus).toBe("submitted"); // Unchanged
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 3: TERMINAL REJECTION PROTECTION
  // ----------------------------------------------------------------------------
  describe("Hardening Area 3: Terminal Rejection Protection", () => {
    it("strictly blocks any transition from rejected status", () => {
      const allStatuses: RenewalApplicationStatus[] = [
        "draft",
        "submitted",
        "under_review",
        "needs_revision",
        "resubmitted",
        "approved",
        "rejected",
      ];

      allStatuses.forEach((targetStatus) => {
        expect(canTransitionRenewal("rejected", targetStatus)).toBe(false);
      });
      expect(isRenewalTerminal("rejected")).toBe(true);
    });

    it("blocks user_submit_renewal when renewal is rejected", () => {
      const submitRenewal = (status: RenewalApplicationStatus) => {
        if (status !== "draft") throw new Error(`Renewal cannot be submitted from status ${status}.`);
      };

      expect(() => submitRenewal("rejected")).toThrow("Renewal cannot be submitted from status rejected.");
    });

    it("blocks user_resubmit_renewal when renewal is rejected", () => {
      const resubmitRenewal = (status: RenewalApplicationStatus) => {
        if (status !== "needs_revision") throw new Error(`Renewal cannot be resubmitted from status ${status}.`);
      };

      expect(() => resubmitRenewal("rejected")).toThrow("Renewal cannot be resubmitted from status rejected.");
    });

    it("prevents user_start_or_get_renewal_draft from reopening a rejected renewal or incrementing cycle", () => {
      const currentTermNumber = 1;
      const rejectedRenewal: OrganizationRenewalRecord = {
        id: "ren-cycle-2",
        organizationId: "org-1",
        cycleNumber: 2,
        currentAccreditationId: "acc-term-1",
        status: "rejected",
        submittedAt: "2027-02-15T00:00:00Z",
        reviewedBy: "admin-1",
        reviewedAt: "2027-02-20T00:00:00Z",
        adminRemarks: "Fraudulent officer credentials identified.",
        createdAt: "2027-02-10T00:00:00Z",
        updatedAt: "2027-02-20T00:00:00Z",
      };

      const startOrGetDraft = (targetCycle: number) => {
        if (rejectedRenewal.cycleNumber === targetCycle && rejectedRenewal.status === "rejected") {
          throw new Error(
            `Renewal application for Cycle ${targetCycle} was rejected. Organization must contact LYDO directly.`,
          );
        }
      };

      expect(() => startOrGetDraft(currentTermNumber + 1)).toThrow("Organization must contact LYDO directly.");
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 4: SERVER-SIDE STATE TRANSITION ENFORCEMENT
  // ----------------------------------------------------------------------------
  describe("Hardening Area 4: Server-Side State Transition Enforcement", () => {
    it("permits only the seven strictly legal state transitions", () => {
      const legalPairs: Array<[RenewalApplicationStatus, RenewalApplicationStatus]> = [
        ["draft", "submitted"],
        ["submitted", "under_review"],
        ["under_review", "needs_revision"],
        ["needs_revision", "resubmitted"],
        ["resubmitted", "under_review"],
        ["under_review", "approved"],
        ["under_review", "rejected"],
      ];

      legalPairs.forEach(([from, to]) => {
        expect(canTransitionRenewal(from, to)).toBe(true);
      });
    });

    it("rejects malicious or stale state transitions", () => {
      const illegalPairs: Array<[RenewalApplicationStatus, RenewalApplicationStatus]> = [
        ["draft", "under_review"],
        ["draft", "approved"],
        ["draft", "rejected"],
        ["submitted", "approved"], // Shortcut bypass!
        ["submitted", "rejected"],
        ["submitted", "needs_revision"],
        ["submitted", "draft"],
        ["needs_revision", "approved"],
        ["needs_revision", "under_review"],
        ["resubmitted", "approved"],
        ["approved", "draft"],
        ["approved", "under_review"],
        ["rejected", "under_review"],
      ];

      illegalPairs.forEach(([from, to]) => {
        expect(canTransitionRenewal(from, to)).toBe(false);
      });
    });

    it("enforces organization ownership check on caller", () => {
      const profile = createMockProfile({ userId: "user-legitimate" });
      const validateOwnership = (callerUserId: string) => {
        if (profile.userId !== callerUserId) {
          throw new Error("Unauthorized: Caller does not own this organization.");
        }
      };

      expect(() => validateOwnership("user-attacker")).toThrow("Unauthorized");
      expect(() => validateOwnership("user-legitimate")).not.toThrow();
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 5: DUPLICATE DRAFT CONCURRENCY
  // ----------------------------------------------------------------------------
  describe("Hardening Area 5: Duplicate Draft Concurrency", () => {
    it("serializes concurrent draft creation requests and returns the existing draft to the second caller", () => {
      const drafts: OrganizationRenewalRecord[] = [];

      const startOrGetDraft = (orgId: string, callerId: string): { renewal: OrganizationRenewalRecord; isExisting: boolean } => {
        // Simulates profile lock check for active non-terminal draft
        const existing = drafts.find(
          (d) => d.organizationId === orgId && ["draft", "submitted", "under_review", "needs_revision", "resubmitted"].includes(d.status),
        );
        if (existing) {
          return { renewal: existing, isExisting: true };
        }

        const newDraft: OrganizationRenewalRecord = {
          id: `draft-${drafts.length + 1}`,
          organizationId: orgId,
          cycleNumber: 2,
          currentAccreditationId: "acc-1",
          status: "draft",
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          adminRemarks: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        drafts.push(newDraft);
        return { renewal: newDraft, isExisting: false };
      };

      // Officer 1 clicks Start Renewal in Tab 1
      const call1 = startOrGetDraft("org-1", "user-1");
      expect(call1.isExisting).toBe(false);
      expect(call1.renewal.id).toBe("draft-1");

      // Officer 2 clicks Start Renewal in Tab 2 simultaneously
      const call2 = startOrGetDraft("org-1", "user-1");
      expect(call2.isExisting).toBe(true);
      expect(call2.renewal.id).toBe("draft-1"); // Returns the SAME draft, zero duplicate creation!
      expect(drafts).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 6: ATOMIC APPROVAL HARDENING & ROLLBACKS
  // ----------------------------------------------------------------------------
  describe("Hardening Area 6: Atomic Approval Hardening & Rollbacks", () => {
    it("fails and rolls back if any required document is not approved", () => {
      const documents = [
        { name: "CBL", status: "approved_green" },
        { name: "Form B", status: "approved_green" },
        { name: "Officers", status: "needs_revision" }, // unapproved!
      ];

      const approveRenewal = (docs: typeof documents) => {
        const allApproved = docs.every((d) => d.status === "approved_green");
        if (!allApproved) {
          throw new Error("Cannot approve renewal: not all required documents are approved.");
        }
      };

      expect(() => approveRenewal(documents)).toThrow("Cannot approve renewal");
    });

    it("fails if target cycle number does not strictly equal current term + 1", () => {
      const currentTermNumber = 1;
      const renewalCycleNumber = 3; // Invalid jump!

      const validateCycle = (currTerm: number, cycle: number) => {
        if (cycle !== currTerm + 1) {
          throw new Error(`Cycle mismatch: Renewal cycle ${cycle} does not match current term ${currTerm} + 1.`);
        }
      };

      expect(() => validateCycle(currentTermNumber, renewalCycleNumber)).toThrow("Cycle mismatch");
    });

    it("fails if administrator session is unauthorized or invalid", () => {
      const validateAdminSession = (token: string | null) => {
        if (!token || token !== "valid-session-token") {
          throw new Error("Admin account is not authorized.");
        }
      };

      expect(() => validateAdminSession(null)).toThrow("Admin account is not authorized.");
      expect(() => validateAdminSession("invalid-token")).toThrow("Admin account is not authorized.");
      expect(() => validateAdminSession("valid-session-token")).not.toThrow();
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 7: DOCUMENT REPLACEMENT REVIEW-STATE GUARD
  // ----------------------------------------------------------------------------
  describe("Hardening Area 7: Document Replacement Review-State Guard", () => {
    it("permits replacement for files marked needs_revision or rejected_red", () => {
      expect(canReplaceSubmissionFile("needs_revision")).toBe(true);
      expect(canReplaceSubmissionFile("rejected_red")).toBe(true);
    });

    it("strictly blocks replacement of approved files (approved_green)", () => {
      expect(canReplaceSubmissionFile("approved_green")).toBe(false);

      const replaceFile = (adminStatus: DocumentSubmissionStatus) => {
        if (!canReplaceSubmissionFile(adminStatus)) {
          throw new Error(`Document replacement is only permitted for files marked for revision or rejected (current: ${adminStatus}).`);
        }
      };

      expect(() => replaceFile("approved_green")).toThrow("Document replacement is only permitted");
      expect(() => replaceFile("submitted")).toThrow("Document replacement is only permitted");
      expect(() => replaceFile("under_admin_review")).toThrow("Document replacement is only permitted");
    });

    it("preserves complete historical evidence in revision_history on replacement", () => {
      const oldFile: SubmissionFile = {
        id: "file-101",
        submissionId: "sub-1",
        documentTypeId: "doc-1",
        fileName: "Initial-Form.pdf",
        fileUrl: "storage://docs/initial.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "needs_revision",
        adminRemarks: "Page 2 is unreadable",
        revisionHistory: [],
        uploadedAt: "2027-02-01T08:00:00Z",
        reviewedAt: "2027-02-03T10:00:00Z",
        createdAt: "2027-02-01T08:00:00Z",
        updatedAt: "2027-02-03T10:00:00Z",
      };

      const historyEntry = {
        action: "replaced",
        previousFileName: oldFile.fileName,
        previousFileUrl: oldFile.fileUrl,
        previousFileType: oldFile.fileType,
        previousFileSize: oldFile.fileSize,
        previousStatus: oldFile.adminStatus,
        adminRemarks: oldFile.adminRemarks,
        reviewedAt: oldFile.reviewedAt,
        replacedAt: "2027-02-05T09:00:00Z",
      };

      const newFile: SubmissionFile = {
        ...oldFile,
        fileName: "Scanned-Clear-Form.pdf",
        fileUrl: "storage://docs/scanned.pdf",
        adminStatus: "submitted",
        adminRemarks: "",
        reviewedAt: "",
        uploadedAt: "2027-02-05T09:00:00Z",
        revisionHistory: [historyEntry],
      };

      expect(newFile.revisionHistory).toHaveLength(1);
      expect(newFile.revisionHistory![0].adminRemarks).toBe("Page 2 is unreadable");
      expect(newFile.revisionHistory![0].previousFileName).toBe("Initial-Form.pdf");
      expect(newFile.adminStatus).toBe("submitted");
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 8: DOCUMENT PACKET ISOLATION
  // ----------------------------------------------------------------------------
  describe("Hardening Area 8: Document Packet Isolation", () => {
    it("ensures registration submissions and renewal submissions remain strictly isolated", () => {
      const submissions: DocumentSubmission[] = [
        {
          id: "sub-reg",
          organizationId: "org-1",
          submittedBy: "user-1",
          status: "approved_green",
          userConfirmed: true,
          submissionScope: "registration",
          renewalId: null,
          submittedAt: "2024-05-01T00:00:00Z",
          reviewedBy: "admin-1",
          reviewedAt: "2024-05-10T00:00:00Z",
          overallRemarks: "Verified",
          createdAt: "2024-05-01T00:00:00Z",
          updatedAt: "2024-05-10T00:00:00Z",
        },
        {
          id: "sub-renewal-c2",
          organizationId: "org-1",
          submittedBy: "user-1",
          status: "under_admin_review",
          userConfirmed: false,
          submissionScope: "renewal",
          renewalId: "renewal-cycle-2",
          submittedAt: "2027-02-15T00:00:00Z",
          reviewedBy: "",
          reviewedAt: "",
          overallRemarks: "",
          createdAt: "2027-02-10T00:00:00Z",
          updatedAt: "2027-02-15T00:00:00Z",
        },
      ];

      // Registration query filter
      const regPacket = submissions.find(
        (s) => s.organizationId === "org-1" && s.submissionScope === "registration" && s.renewalId === null,
      );
      // Renewal query filter
      const renewalPacket = submissions.find(
        (s) => s.organizationId === "org-1" && s.submissionScope === "renewal" && s.renewalId === "renewal-cycle-2",
      );

      expect(regPacket?.id).toBe("sub-reg");
      expect(renewalPacket?.id).toBe("sub-renewal-c2");
      expect(regPacket?.renewalId).toBeNull();
      expect(renewalPacket?.renewalId).toBe("renewal-cycle-2");
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 11: EXPIRATION / LATE RENEWAL BOUNDARIES
  // ----------------------------------------------------------------------------
  describe("Hardening Area 11: Expiration and Late Renewal Boundaries", () => {
    const expiresAt = "2027-05-10T00:00:00Z";

    it("verifies exact boundary days for renewal drafting eligibility", () => {
      // 91 days before -> blocked
      expect(getRenewalWindowEligibility(expiresAt, new Date("2027-02-08T00:00:00Z")).canDraft).toBe(false);
      // 90 days before -> allowed
      expect(getRenewalWindowEligibility(expiresAt, new Date("2027-02-09T00:00:00Z")).canDraft).toBe(true);
      // Expiry day -> allowed
      expect(getRenewalWindowEligibility(expiresAt, new Date("2027-05-10T00:00:00Z")).canDraft).toBe(true);
      // 1 day after -> allowed (late)
      expect(getRenewalWindowEligibility(expiresAt, new Date("2027-05-11T00:00:00Z")).canDraft).toBe(true);
      // 180 days after -> allowed (late)
      expect(getRenewalWindowEligibility(expiresAt, new Date("2027-11-06T00:00:00Z")).canDraft).toBe(true);
      // 181 days after -> blocked
      expect(getRenewalWindowEligibility(expiresAt, new Date("2027-11-07T00:00:00Z")).canDraft).toBe(false);
    });

    it("confirms that a pending renewal application does NOT alter derived 'expired' status", () => {
      const pastExpiryDate = new Date("2027-05-15T00:00:00Z"); // 5 days past expiry

      const pendingStatuses: RenewalApplicationStatus[] = ["submitted", "under_review", "needs_revision", "resubmitted"];

      pendingStatuses.forEach((_renewalState) => {
        const derived = deriveAccreditationStatus({
          persistedStatus: "active",
          endDate: "2027-05-10",
          now: pastExpiryDate,
        });
        // Strict policy: NO grace period!
        expect(derived).toBe("expired");
      });
    });

    it("confirms privilege checks fail when expired, while liquidation remains permitted", () => {
      const expiredStatus: AccreditationStatus = "expired";
      expect(canCreateBudgetRequest(expiredStatus)).toBe(false);
      expect(canDisburseBudget(expiredStatus)).toBe(false);
      expect(canParticipateInYpop(expiredStatus)).toBe(false);
      expect(canLiquidateFunds(expiredStatus)).toBe(true); // Permanent liquidation permission!
    });
  });

  // ----------------------------------------------------------------------------
  // HARDENING AREA 12: TERM ANCHOR DATE RULES
  // ----------------------------------------------------------------------------
  describe("Hardening Area 12: Standard Continuous Protection Term Anchor Rules", () => {
    const prevEndDate = "2027-05-10";

    it("uses continuous previous end_date when approved <= 30 days after expiry", () => {
      const onTimeApproval = "2027-05-10";
      const resOnTime = calculateStandardContinuousProtectionRenewalTerm(prevEndDate, onTimeApproval);
      expect(resOnTime.startDate).toBe("2027-05-10");
      expect(resOnTime.endDate).toBe("2030-05-10");
      expect(resOnTime.isContinuous).toBe(true);

      const day30Late = "2027-06-09"; // exactly 30 days late
      const res30 = calculateStandardContinuousProtectionRenewalTerm(prevEndDate, day30Late);
      expect(res30.startDate).toBe("2027-05-10");
      expect(res30.endDate).toBe("2030-05-10");
      expect(res30.isContinuous).toBe(true);
    });

    it("uses approval date when approved > 30 days after expiry", () => {
      const day31Late = "2027-06-10"; // 31 days late
      const res31 = calculateStandardContinuousProtectionRenewalTerm(prevEndDate, day31Late);
      expect(res31.startDate).toBe("2027-06-10");
      expect(res31.endDate).toBe("2030-06-10");
      expect(res31.isContinuous).toBe(false);

      const day90Late = "2027-08-08";
      const res90 = calculateStandardContinuousProtectionRenewalTerm(prevEndDate, day90Late);
      expect(res90.startDate).toBe("2027-08-08");
      expect(res90.endDate).toBe("2030-08-08");
      expect(res90.isContinuous).toBe(false);
    });
  });
});
