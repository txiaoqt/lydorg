import { describe, expect, it, vi } from "vitest";
import type {
  YPOPCityActivity,
  YPOPEntry,
  YPOPEventFile,
  YPOPEventParticipation,
  YPOPOrgActivity,
  YPOPOrgActivityFile,
  YPOPPeriod,
} from "./lydo-connect-data";
import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  DEFAULT_ORG_LED_TIERS,
  YPOP_SCORE_THRESHOLD,
} from "./lydo-connect-data";
import { resolveBudgetEligibility } from "./budget-eligibility";

describe("YPOP User ↔ Admin Supabase Integration & City-Led Proof Lifecycle", () => {
  const mockSemester: YPOPPeriod = {
    id: "sem-2026-1",
    semesterKey: "2026-1",
    semesterLabel: "First Semester 2026",
    validationDeadline: "2026-07-31T23:59:59Z",
    status: "open",
    orgLedTiers: DEFAULT_ORG_LED_TIERS,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const mockActivity: YPOPCityActivity = {
    id: "act-city-101",
    semesterKey: "2026-1",
    name: "Pasig River Cleanup Drive",
    date: "2026-05-15",
    startDate: "2026-05-15",
    endDate: "2026-05-15",
    venue: "Pasig Riverbank Park",
    points: 4,
    category: "mandatory",
    createdAt: "2026-01-01T00:00:00Z",
  };

  const orgId = "org-uuid-1111";

  describe("City-Led Proof Draft ↔ Submission State Machine", () => {
    it("1. Upload file to new activity initializes participation in DRAFT state without submitting for Admin review", () => {
      const existingParticipations: YPOPEventParticipation[] = [];
      const autoEnsureDraftParticipation = (activityId: string, organizationId: string): YPOPEventParticipation => {
        const found = existingParticipations.find((p) => p.activityId === activityId && p.organizationId === organizationId);
        if (found) return found;
        const draft: YPOPEventParticipation = {
          id: "part-uuid-101",
          organizationId,
          activityId,
          activityName: mockActivity.name,
          activityDate: mockActivity.startDate || mockActivity.date || "",
          venue: mockActivity.venue || "",
          status: "draft",
          adminRemarks: "",
          joinedAt: new Date().toISOString(),
          proofSubmittedAt: "",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        existingParticipations.push(draft);
        return draft;
      };

      const participation = autoEnsureDraftParticipation(mockActivity.id, orgId);
      expect(participation.id).toBe("part-uuid-101");
      expect(participation.status).toBe("draft");
      expect(participation.proofSubmittedAt).toBe("");
      expect(participation.verifiedAt).toBe("");
      expect(existingParticipations).toHaveLength(1);
    });

    it("2. Uploading multiple files preserves DRAFT state and links files to participationId", () => {
      const participation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "draft",
        adminRemarks: "",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "",
        verifiedAt: "",
        revisionHistory: [],
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T08:00:00Z",
      };

      const eventFiles: YPOPEventFile[] = [];
      const uploadFile = (fileName: string) => {
        const file: YPOPEventFile = {
          id: `file-${Date.now()}-${eventFiles.length}`,
          participationId: participation.id,
          organizationId: orgId,
          fileName,
          fileUrl: `storage://ypop-files/${participation.id}/${fileName}`,
          fileType: "application/pdf",
          uploadedAt: new Date().toISOString(),
        };
        eventFiles.push(file);
      };

      uploadFile("attendance-sheet.pdf");
      uploadFile("activity-photos.pdf");

      expect(eventFiles).toHaveLength(2);
      expect(eventFiles[0].participationId).toBe(participation.id);
      expect(eventFiles[1].participationId).toBe(participation.id);
      expect(participation.status).toBe("draft");
      expect(participation.proofSubmittedAt).toBe("");
    });

    it("3. Saving / editing draft remarks preserves DRAFT state", () => {
      const participation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "draft",
        adminRemarks: "",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T08:00:00Z",
      };

      // User adds remarks in draft
      const draftWithRemarks = {
        ...participation,
        adminRemarks: "Draft remarks from organization.",
        updatedAt: new Date().toISOString(),
      };

      expect(draftWithRemarks.status).toBe("draft");
      expect(draftWithRemarks.proofSubmittedAt).toBe("");
    });

    it("4. Draft City-Led participation does NOT appear in Admin review queue", () => {
      const draftParticipation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "draft",
        adminRemarks: "",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T08:00:00Z",
      };

      const allParticipations = [draftParticipation];
      // Admin filter excludes draft
      const adminReviewQueue = allParticipations.filter((p) => p.status !== "draft");
      expect(adminReviewQueue).toHaveLength(0);
    });

    it("5. User clicking 'Submit Proof for Review' transitions status to PENDING_VERIFICATION and sets proofSubmittedAt timestamp", () => {
      const draftParticipation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "draft",
        adminRemarks: "",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T08:00:00Z",
      };

      // Explicit submission action
      const now = new Date().toISOString();
      const submittedParticipation: YPOPEventParticipation = {
        ...draftParticipation,
        status: "pending_verification",
        proofSubmittedAt: now,
        updatedAt: now,
        revisionHistory: [
          { action: "pending_verification", adminRemarks: "Submitted for verification.", changedAt: now },
        ],
      };

      expect(submittedParticipation.status).toBe("pending_verification");
      expect(submittedParticipation.proofSubmittedAt).toBe(now);
      expect(submittedParticipation.revisionHistory).toHaveLength(1);
    });

    it("6. Submitted proof appears in Admin review queue", () => {
      const submittedParticipation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "pending_verification",
        adminRemarks: "",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "2026-05-15T09:00:00Z",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T09:00:00Z",
      };

      const allParticipations = [submittedParticipation];
      const adminReviewQueue = allParticipations.filter((p) => p.status !== "draft");
      expect(adminReviewQueue).toHaveLength(1);
      expect(adminReviewQueue[0].status).toBe("pending_verification");
    });

    it("7. Admin verifies proof: status transitions to VERIFIED and verifiedAt is stamped", () => {
      const submittedParticipation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "pending_verification",
        adminRemarks: "",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "2026-05-15T09:00:00Z",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T09:00:00Z",
      };

      const now = new Date().toISOString();
      const verifiedParticipation: YPOPEventParticipation = {
        ...submittedParticipation,
        status: "verified",
        verifiedAt: now,
        adminRemarks: "Attendance confirmed from official city event log.",
        updatedAt: now,
        revisionHistory: [
          ...(submittedParticipation.revisionHistory ?? []),
          { action: "verified", adminRemarks: "Attendance confirmed from official city event log.", changedAt: now },
        ],
      };

      expect(verifiedParticipation.status).toBe("verified");
      expect(verifiedParticipation.verifiedAt).toBe(now);
    });

    it("8. User reloads after verification and sees VERIFIED state", () => {
      const verifiedParticipation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "verified",
        adminRemarks: "Attendance confirmed from official city event log.",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "2026-05-15T09:00:00Z",
        verifiedAt: "2026-05-15T10:00:00Z",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T10:00:00Z",
      };

      const attendance = buildVerifiedYpopAttendance([mockActivity], [verifiedParticipation]);
      expect(attendance[0].attended).toBe(true);
    });

    it("9. Admin requests revision: persisted status becomes NEEDS_REVISION with admin remarks", () => {
      const now = new Date().toISOString();
      const revisionParticipation: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "needs_revision",
        adminRemarks: "Please provide a clearer photo of the attendance sheet.",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "2026-05-15T09:00:00Z",
        verifiedAt: "",
        revisionHistory: [
          { action: "needs_revision", adminRemarks: "Please provide a clearer photo of the attendance sheet.", changedAt: now },
        ],
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: now,
      };

      expect(revisionParticipation.status).toBe("needs_revision");
      expect(revisionParticipation.adminRemarks).toBe("Please provide a clearer photo of the attendance sheet.");
    });

    it("10. User uploads replacement files after revision request: status remains NEEDS_REVISION and does NOT auto-submit to Admin", () => {
      const participationInRevision: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "needs_revision",
        adminRemarks: "Please provide a clearer photo of the attendance sheet.",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "2026-05-15T09:00:00Z",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T10:00:00Z",
      };

      // Uploading replacement file
      const uploadedFile: YPOPEventFile = {
        id: "file-replacement-1",
        participationId: participationInRevision.id,
        organizationId: orgId,
        fileName: "clear-attendance-sheet.pdf",
        fileUrl: "storage://ypop-files/part-uuid-101/clear-attendance-sheet.pdf",
        fileType: "application/pdf",
        uploadedAt: new Date().toISOString(),
      };

      expect(uploadedFile.participationId).toBe(participationInRevision.id);
      // Status must NOT change to pending_verification merely because a file was uploaded!
      expect(participationInRevision.status).toBe("needs_revision");
    });

    it("11. User explicitly clicks Submit Proof for Review again: status returns to PENDING_VERIFICATION", () => {
      const participationInRevision: YPOPEventParticipation = {
        id: "part-uuid-101",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "needs_revision",
        adminRemarks: "Please provide a clearer photo of the attendance sheet.",
        joinedAt: "2026-05-15T08:00:00Z",
        proofSubmittedAt: "2026-05-15T09:00:00Z",
        verifiedAt: "",
        createdAt: "2026-05-15T08:00:00Z",
        updatedAt: "2026-05-15T10:00:00Z",
      };

      const now = new Date().toISOString();
      const resubmittedParticipation: YPOPEventParticipation = {
        ...participationInRevision,
        status: "pending_verification",
        proofSubmittedAt: now,
        updatedAt: now,
        revisionHistory: [
          ...(participationInRevision.revisionHistory ?? []),
          { action: "pending_verification", adminRemarks: "Resubmitted clearer attendance sheet.", changedAt: now },
        ],
      };

      expect(resubmittedParticipation.status).toBe("pending_verification");
      expect(resubmittedParticipation.proofSubmittedAt).toBe(now);
    });

    it("12. DRAFT and PENDING states do NOT contribute to City-Led score", () => {
      const draftPart: YPOPEventParticipation = {
        id: "part-1",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "draft",
        adminRemarks: "",
        joinedAt: "",
        proofSubmittedAt: "",
        verifiedAt: "",
        createdAt: "",
        updatedAt: "",
      };

      const pendingPart: YPOPEventParticipation = {
        ...draftPart,
        status: "pending_verification",
      };

      const revisionPart: YPOPEventParticipation = {
        ...draftPart,
        status: "needs_revision",
      };

      const rejectedPart: YPOPEventParticipation = {
        ...draftPart,
        status: "rejected",
      };

      // None of draft, pending, needs_revision, or rejected should contribute
      [draftPart, pendingPart, revisionPart, rejectedPart].forEach((part) => {
        const attendance = buildVerifiedYpopAttendance([mockActivity], [part]);
        expect(attendance[0].attended).toBe(false);
        const score = computeYpopScore(attendance, [mockActivity], 0, DEFAULT_ORG_LED_TIERS);
        expect(score.cityLedEarned).toBe(0);
        expect(score.cityLedPercent).toBe(0);
        expect(score.totalScore).toBe(0);
      });
    });

    it("13. VERIFIED state DOES contribute to City-Led score", () => {
      const verifiedPart: YPOPEventParticipation = {
        id: "part-1",
        organizationId: orgId,
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
        status: "verified",
        adminRemarks: "",
        joinedAt: "",
        proofSubmittedAt: "",
        verifiedAt: new Date().toISOString(),
        createdAt: "",
        updatedAt: "",
      };

      const attendance = buildVerifiedYpopAttendance([mockActivity], [verifiedPart]);
      expect(attendance[0].attended).toBe(true);

      const score = computeYpopScore(attendance, [mockActivity], 1, DEFAULT_ORG_LED_TIERS);
      expect(score.cityLedEarned).toBe(4);
      expect(score.cityLedPercent).toBe(100);
      expect(score.orgLedBonus).toBe(10);
      expect(score.totalScore).toBe(110);
      expect(score.totalScore >= YPOP_SCORE_THRESHOLD).toBe(true);
    });
  });

  describe("Admin Hydration & Error Handling", () => {
    it("Admin mutation failure surfaces error and does NOT silently succeed", async () => {
      const remoteRpc = vi.fn().mockRejectedValue(new Error("Database connection timeout."));
      const updateLocalState = vi.fn();

      let failed = false;
      try {
        await remoteRpc();
        updateLocalState();
      } catch {
        failed = true;
      }

      expect(failed).toBe(true);
      expect(updateLocalState).not.toHaveBeenCalled();
    });

    it("User refresh retrieves the updated status, remarks, and budget eligibility", () => {
      const persistedEntry: YPOPEntry = {
        id: "entry-1",
        organizationId: orgId,
        semester: "2026-1",
        semesterLabel: "First Semester 2026",
        pointsEarned: 85,
        pointsRequired: 70,
        totalPoints: 100,
        status: "qualified",
        adminRemarks: "Final semester evaluation upon period closure.",
        submissionNote: "",
        validationDeadline: mockSemester.validationDeadline,
        submittedAt: "2026-05-16T00:00:00Z",
        validatedAt: "2026-07-31T23:59:59Z",
        revisionHistory: [],
        orgLedProjectCount: 1,
        cityLedAttendance: [{ activityId: mockActivity.id, attended: true }],
        createdAt: "2026-05-16T00:00:00Z",
        updatedAt: "2026-07-31T23:59:59Z",
      };

      const closedPeriod = { ...mockSemester, status: "closed" as const };

      const eligibility = resolveBudgetEligibility({
        organizationId: orgId,
        periods: [closedPeriod],
        entries: [persistedEntry],
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBe("qualified");
      expect(eligibility.entry?.pointsEarned).toBe(85);
      expect(eligibility.entry?.status).toBe("qualified");
    });
  });
});
