import { describe, it, expect } from "vitest";
import {
  hasGenuineResubmission,
  isAwaitingResubmission,
  calculateRevisionDeadline,
  isSubmissionRevisionLocked,
  isRevisionAdminUnlocked,
} from "./revision-deadline";
import type {
  SubmissionFile,
  BudgetRequest,
  BudgetRequestFile,
  YPOPEventParticipation,
  YPOPOrgActivity,
} from "./lydo-connect-data";

describe("Revision → Resubmission → Review Decision Lifecycle Hardening", () => {
  describe("Core Resubmission Detection Logic", () => {
    it("returns true for hasGenuineResubmission when no revision has been requested", () => {
      const initialFile = {
        adminStatus: "submitted",
        uploadedAt: "2026-09-28T00:00:00.000Z",
        revisionRequestedAt: null,
      };
      expect(hasGenuineResubmission(initialFile)).toBe(true);
      expect(isAwaitingResubmission(initialFile)).toBe(false);
    });

    it("identifies unrevised files in needs_revision state as awaiting resubmission", () => {
      const requestedAt = "2026-09-28T02:00:00.000Z";
      const unrevisedFile = {
        adminStatus: "needs_revision",
        uploadedAt: "2026-09-28T01:00:00.000Z", // uploaded BEFORE revision request
        revisionRequestedAt: requestedAt,
      };
      expect(hasGenuineResubmission(unrevisedFile)).toBe(false);
      expect(isAwaitingResubmission(unrevisedFile)).toBe(true);
    });

    it("identifies replaced files in needs_revision state as having a genuine resubmission", () => {
      const requestedAt = "2026-09-28T02:00:00.000Z";
      const replacedFile = {
        adminStatus: "needs_revision",
        uploadedAt: "2026-09-28T03:00:00.000Z", // uploaded AFTER revision request
        revisionRequestedAt: requestedAt,
      };
      expect(hasGenuineResubmission(replacedFile)).toBe(true);
      expect(isAwaitingResubmission(replacedFile)).toBe(false);
    });

    it("checks nested files array for genuine replacements", () => {
      const requestedAt = "2026-09-28T02:00:00.000Z";
      const itemWithOldFiles = {
        status: "needs_revision",
        revisionRequestedAt: requestedAt,
        files: [
          { id: "f1", uploadedAt: "2026-09-28T01:00:00.000Z" },
          { id: "f2", uploadedAt: "2026-09-28T01:30:00.000Z" },
        ],
      };
      expect(hasGenuineResubmission(itemWithOldFiles)).toBe(false);
      expect(isAwaitingResubmission(itemWithOldFiles)).toBe(true);

      const itemWithNewFile = {
        status: "needs_revision",
        revisionRequestedAt: requestedAt,
        files: [
          { id: "f1", uploadedAt: "2026-09-28T01:00:00.000Z" },
          { id: "f2", uploadedAt: "2026-09-28T02:45:00.000Z" }, // newer file!
        ],
      };
      expect(hasGenuineResubmission(itemWithNewFile)).toBe(true);
      expect(isAwaitingResubmission(itemWithNewFile)).toBe(false);
    });
  });

  describe("YORP Registration & Renewal Document Review Lifecycle", () => {
    it("blocks approval of unrevised document files and allows after replacement", () => {
      const initialUploadTime = "2026-09-20T10:00:00.000Z";
      const revisionTime = "2026-09-21T14:00:00.000Z";

      const docFile: SubmissionFile = {
        id: "file-doc-1",
        name: "Constitution_and_Bylaws.pdf",
        type: "application/pdf",
        size: 102400,
        url: "https://example.com/cbl.pdf",
        uploadedAt: initialUploadTime,
        status: "needs_revision",
        adminStatus: "needs_revision",
        adminRemarks: "Please provide signed signatory page.",
        revisionRequestedAt: revisionTime,
      };

      // Unrevised: must be awaiting resubmission
      expect(isAwaitingResubmission({
        adminStatus: docFile.adminStatus,
        revisionRequestedAt: docFile.revisionRequestedAt,
        uploadedAt: docFile.uploadedAt,
      })).toBe(true);

      // Organization uploads replacement file
      const replacementUploadTime = "2026-09-22T09:30:00.000Z";
      const revisedDocFile: SubmissionFile = {
        ...docFile,
        uploadedAt: replacementUploadTime,
      };

      // Replaced: no longer awaiting resubmission, approval allowed
      expect(isAwaitingResubmission({
        adminStatus: revisedDocFile.adminStatus,
        revisionRequestedAt: revisedDocFile.revisionRequestedAt,
        uploadedAt: revisedDocFile.uploadedAt,
      })).toBe(false);
    });
  });

  describe("Budget Request Lifecycle Hardening", () => {
    it("blocks user portal resubmission and admin approval until budget file is replaced", () => {
      const initialBudgetUpload = "2026-09-15T08:00:00.000Z";
      const revisionRequestTime = "2026-09-16T11:00:00.000Z";

      const budgetRequest: BudgetRequest = {
        id: "req-1",
        organizationId: "org-1",
        submittedBy: "User 1",
        activityTitle: "Leadership Camp",
        activityDescription: "Annual camp",
        activityDate: "2026-10-01",
        venue: "City Gymnasium",
        requestedAmount: 50000,
        approvedAmount: 0,
        releasedAmount: 0,
        releaseDate: "",
        purposeCategory: "Leadership Development",
        status: "needs_revision",
        remarks: "",
        adminRemarks: "Itemized breakdown missing for venue rental.",
        goSignalAt: "",
        hardCopySubmittedAt: "",
        revisionRequestedAt: revisionRequestTime,
        createdAt: initialBudgetUpload,
        updatedAt: revisionRequestTime,
      };

      const budgetFile: BudgetRequestFile = {
        id: "bf-1",
        budgetRequestId: "req-1",
        fileName: "Budget_Proposal.xlsx",
        fileUrl: "https://example.com/bp.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSize: 50000,
        uploadedAt: initialBudgetUpload, // before revision
        createdAt: initialBudgetUpload,
        adminStatus: "needs_revision",
        adminRemarks: "Itemized breakdown missing for venue rental.",
      };

      // Both user portal and admin portal detect awaiting resubmission
      const isAwaiting = isAwaitingResubmission({
        adminStatus: budgetFile.adminStatus,
        status: budgetRequest.status,
        revisionRequestedAt: budgetRequest.revisionRequestedAt,
        uploadedAt: budgetFile.uploadedAt,
      });
      expect(isAwaiting).toBe(true);

      // Organization uploads revised proposal
      const revisedUploadTime = "2026-09-17T15:00:00.000Z";
      const revisedBudgetFile: BudgetRequestFile = {
        ...budgetFile,
        uploadedAt: revisedUploadTime,
      };

      const isAwaitingAfterUpload = isAwaitingResubmission({
        adminStatus: revisedBudgetFile.adminStatus,
        status: budgetRequest.status,
        revisionRequestedAt: budgetRequest.revisionRequestedAt,
        uploadedAt: revisedBudgetFile.uploadedAt,
      });
      expect(isAwaitingAfterUpload).toBe(false);
    });
  });

  describe("YPOP Validation Lifecycle Hardening", () => {
    it("enforces resubmission check for City-Led Event Participation proofs", () => {
      const eventProofUpload = "2026-09-10T12:00:00.000Z";
      const revisionRequestedTime = "2026-09-12T14:00:00.000Z";

      const participation: YPOPEventParticipation = {
        id: "part-1",
        organizationId: "org-1",
        activityId: "act-1",
        activityName: "Youth Assembly",
        status: "needs_revision",
        proofSubmittedAt: eventProofUpload,
        revisionRequestedAt: revisionRequestedTime,
        adminRemarks: "Attendance sheet is illegible.",
        createdAt: eventProofUpload,
        updatedAt: revisionRequestedTime,
      };

      const oldFiles = [
        { id: "pf-1", uploadedAt: eventProofUpload },
      ];

      // Awaiting resubmission
      expect(isAwaitingResubmission({
        status: participation.status,
        revisionRequestedAt: participation.revisionRequestedAt,
        proofSubmittedAt: participation.proofSubmittedAt,
        files: oldFiles,
      })).toBe(true);

      // Replacement file uploaded
      const newFiles = [
        { id: "pf-2", uploadedAt: "2026-09-13T10:00:00.000Z" },
      ];

      expect(isAwaitingResubmission({
        status: participation.status,
        revisionRequestedAt: participation.revisionRequestedAt,
        proofSubmittedAt: "2026-09-13T10:00:00.000Z",
        files: newFiles,
      })).toBe(false);
    });

    it("enforces resubmission check for Organization-Led PPAs", () => {
      const ppaSubmissionTime = "2026-09-10T12:00:00.000Z";
      const revisionRequestedTime = "2026-09-12T14:00:00.000Z";

      const ppaActivity: YPOPOrgActivity = {
        id: "ppa-1",
        organizationId: "org-1",
        activityName: "Tree Planting Initiative",
        status: "needs_revision",
        submittedAt: ppaSubmissionTime,
        revisionRequestedAt: revisionRequestedTime,
        adminRemarks: "Please attach geo-tagged photos and barangay certificate.",
        createdAt: ppaSubmissionTime,
        updatedAt: revisionRequestedTime,
      };

      const oldFiles = [
        { id: "ppa-f1", uploadedAt: ppaSubmissionTime },
      ];

      expect(isAwaitingResubmission({
        status: ppaActivity.status,
        revisionRequestedAt: ppaActivity.revisionRequestedAt,
        submittedAt: ppaActivity.submittedAt,
        files: oldFiles,
      })).toBe(true);

      // Replacement files uploaded
      const newFiles = [
        { id: "ppa-f1", uploadedAt: ppaSubmissionTime },
        { id: "ppa-f2", uploadedAt: "2026-09-14T09:00:00.000Z" },
      ];

      expect(isAwaitingResubmission({
        status: ppaActivity.status,
        revisionRequestedAt: ppaActivity.revisionRequestedAt,
        submittedAt: "2026-09-14T09:00:00.000Z",
        files: newFiles,
      })).toBe(false);
    });
  });

  describe("5-Day Deadline & Unlock Compatibility", () => {
    it("preserves locked status when deadline expired without admin unlock", () => {
      const requestedAt = "2026-09-20T00:00:00.000Z";
      const deadline = calculateRevisionDeadline(requestedAt);
      const afterDeadline = "2026-09-26T00:00:00.000Z"; // 6 days later

      const item = {
        status: "needs_revision",
        revisionRequestedAt: requestedAt,
        revisionDueAt: deadline.dueAt,
        revisionLocked: true,
      };

      expect(isSubmissionRevisionLocked(item, afterDeadline)).toBe(true);
      expect(isRevisionAdminUnlocked(item, afterDeadline)).toBe(false);
    });

    it("respects admin explicit unlock after deadline expired", () => {
      const requestedAt = "2026-09-20T00:00:00.000Z";
      const deadline = calculateRevisionDeadline(requestedAt);
      const afterDeadline = "2026-09-26T00:00:00.000Z";

      const unlockedItem = {
        status: "needs_revision",
        revisionRequestedAt: requestedAt,
        revisionDueAt: deadline.dueAt,
        revisionLocked: false,
        revisionUnlockedAt: "2026-09-26T01:00:00.000Z",
        revisionUnlockedBy: "admin-uuid",
      };

      expect(isSubmissionRevisionLocked(unlockedItem, afterDeadline)).toBe(false);
      expect(isRevisionAdminUnlocked(unlockedItem, afterDeadline)).toBe(true);
    });
  });
});
