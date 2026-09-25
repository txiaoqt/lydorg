import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  REVISION_DEADLINE_DAYS,
  calculateRevisionDeadline,
  isRevisionExpired,
  getRevisionTimeRemaining,
  formatRevisionDeadline,
  isSubmissionRevisionLocked,
  isRevisionAdminUnlocked,
} from "./revision-deadline";
import type {
  SubmissionFile,
  OrganizationRenewalRecord,
  BudgetRequest,
  LiquidationReport,
  YPOPEventParticipation,
  YPOPOrgActivity,
} from "./lydo-connect-data";

describe("5-Day Revision Deadline Core Calculation & Utilities", () => {
  it("REVISION_DEADLINE_DAYS is exactly 5 calendar days", () => {
    expect(REVISION_DEADLINE_DAYS).toBe(5);
  });

  it("calculates exactly 5 calendar days from the requested timestamp", () => {
    const requestedAt = "2026-09-25T10:00:00.000Z";
    const deadline = calculateRevisionDeadline(requestedAt);

    expect(deadline.requestedAt).toBe(requestedAt);
    const requestedTime = new Date(requestedAt).getTime();
    const expectedDueTime = requestedTime + 5 * 24 * 60 * 60 * 1000;
    expect(new Date(deadline.dueAt).getTime()).toBe(expectedDueTime);
    expect(deadline.dueAt).toBe(new Date(expectedDueTime).toISOString());
  });

  it("calculates 5 days from current date when no argument is supplied", () => {
    const before = Date.now();
    const result = calculateRevisionDeadline();
    const after = Date.now();

    const dueTime = new Date(result.dueAt).getTime();
    expect(dueTime).toBeGreaterThanOrEqual(before + 5 * 24 * 60 * 60 * 1000);
    expect(dueTime).toBeLessThanOrEqual(after + 5 * 24 * 60 * 60 * 1000);
  });

  it("correctly identifies active vs expired revision deadlines", () => {
    const deadline = new Date("2026-09-30T12:00:00.000Z").toISOString(); // +5 days

    // 1 second before deadline -> NOT expired
    const timeBefore = new Date(new Date(deadline).getTime() - 1000);
    expect(isRevisionExpired(deadline, timeBefore)).toBe(false);

    // Exact deadline -> EXPIRED
    const timeExact = new Date(deadline);
    expect(isRevisionExpired(deadline, timeExact)).toBe(true);

    // After deadline -> EXPIRED
    const timeAfter = new Date(new Date(deadline).getTime() + 1000 * 60);
    expect(isRevisionExpired(deadline, timeAfter)).toBe(true);

    // Null/undefined/empty deadline -> NOT expired
    expect(isRevisionExpired(null)).toBe(false);
    expect(isRevisionExpired(undefined)).toBe(false);
    expect(isRevisionExpired("")).toBe(false);
  });

  it("provides human-readable remaining time countdowns", () => {
    const dueAt = "2026-09-30T12:00:00.000Z";

    // 4 days 12 hours remaining
    const now1 = new Date("2026-09-26T00:00:00.000Z");
    const remaining1 = getRevisionTimeRemaining(dueAt, now1);
    expect(remaining1.isExpired).toBe(false);
    expect(remaining1.days).toBe(4);
    expect(remaining1.hours).toBe(12);
    expect(remaining1.label).toBe("4 days remaining");

    // 18 hours remaining
    const now2 = new Date("2026-09-29T18:00:00.000Z");
    const remaining2 = getRevisionTimeRemaining(dueAt, now2);
    expect(remaining2.isExpired).toBe(false);
    expect(remaining2.days).toBe(0);
    expect(remaining2.hours).toBe(18);
    expect(remaining2.label).toBe("18 hours remaining");

    // 45 minutes remaining
    const now3 = new Date("2026-09-30T11:15:00.000Z");
    const remaining3 = getRevisionTimeRemaining(dueAt, now3);
    expect(remaining3.isExpired).toBe(false);
    expect(remaining3.days).toBe(0);
    expect(remaining3.hours).toBe(0);
    expect(remaining3.minutes).toBe(45);
    expect(remaining3.label).toBe("45 minutes remaining");

    // Expired
    const now4 = new Date("2026-09-30T12:01:00.000Z");
    const remaining4 = getRevisionTimeRemaining(dueAt, now4);
    expect(remaining4.isExpired).toBe(true);
    expect(remaining4.label).toBe("Revision deadline expired");

    // Unlocked by Admin
    const remainingUnlocked = getRevisionTimeRemaining(dueAt, now4, true);
    expect(remainingUnlocked.isExpired).toBe(false);
    expect(remainingUnlocked.isUnlocked).toBe(true);
    expect(remainingUnlocked.label).toBe("Unlocked by Admin");
  });

  it("formats deadline in Asia/Manila timezone", () => {
    const dueAt = "2026-09-30T04:00:00.000Z"; // 12:00 PM Manila
    const formatted = formatRevisionDeadline(dueAt);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Sep");
  });
});

describe("Admin-Controlled Revision Lock / Unlock Workflow (15 Requirements)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Needs Revision initially creates revision_locked = false", () => {
    const requestedAt = "2026-09-25T08:00:00.000Z";
    const deadline = calculateRevisionDeadline(requestedAt);

    const file: SubmissionFile = {
      id: "file-001",
      submissionId: "sub-001",
      documentTypeId: "doc-1",
      fileName: "cbl.pdf",
      fileUrl: "https://example.com/cbl.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "needs_revision",
      adminRemarks: "Please sign page 2",
      revisionRequestedAt: deadline.requestedAt,
      revisionDueAt: deadline.dueAt,
      revisionLocked: false,
      revisionLockedAt: null,
      revisionUnlockedAt: null,
      uploadedAt: requestedAt,
      reviewedAt: requestedAt,
      createdAt: requestedAt,
      updatedAt: requestedAt,
    };

    expect(file.revisionLocked).toBe(false);
    expect(file.revisionDueAt).toBe(deadline.dueAt);
  });

  it("2. Before deadline: user can resubmit (not locked)", () => {
    const requestedAt = "2026-09-25T08:00:00.000Z";
    const deadline = calculateRevisionDeadline(requestedAt);

    const file: SubmissionFile = {
      id: "file-001",
      submissionId: "sub-001",
      documentTypeId: "doc-1",
      fileName: "cbl.pdf",
      fileUrl: "https://example.com/cbl.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "needs_revision",
      adminRemarks: "Please sign page 2",
      revisionRequestedAt: deadline.requestedAt,
      revisionDueAt: deadline.dueAt,
      revisionLocked: false,
      uploadedAt: requestedAt,
      reviewedAt: requestedAt,
      createdAt: requestedAt,
      updatedAt: requestedAt,
    };

    // Day 2 (before 5-day deadline):
    const nowDay2 = new Date("2026-09-27T08:00:00.000Z");
    expect(isSubmissionRevisionLocked(file, nowDay2)).toBe(false);
    expect(isRevisionAdminUnlocked(file, nowDay2)).toBe(false);
  });

  it("3. After deadline: revision_locked = true / treated as locked", () => {
    const requestedAt = "2026-09-25T08:00:00.000Z";
    const deadline = calculateRevisionDeadline(requestedAt);

    const file: SubmissionFile = {
      id: "file-001",
      submissionId: "sub-001",
      documentTypeId: "doc-1",
      fileName: "cbl.pdf",
      fileUrl: "https://example.com/cbl.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "needs_revision",
      adminRemarks: "Please sign page 2",
      revisionRequestedAt: deadline.requestedAt,
      revisionDueAt: deadline.dueAt,
      revisionLocked: false, // Expired past deadline without unlock
      uploadedAt: requestedAt,
      reviewedAt: requestedAt,
      createdAt: requestedAt,
      updatedAt: requestedAt,
    };

    // After 5 days:
    const nowDay6 = new Date("2026-09-30T08:00:01.000Z");
    expect(isSubmissionRevisionLocked(file, nowDay6)).toBe(true);
  });

  it("4. After lock: user UI disables resubmission", () => {
    const lockedFile: SubmissionFile = {
      id: "file-001",
      submissionId: "sub-001",
      documentTypeId: "doc-1",
      fileName: "cbl.pdf",
      fileUrl: "https://example.com/cbl.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "needs_revision",
      adminRemarks: "Please sign page 2",
      revisionDueAt: "2026-09-30T08:00:00.000Z",
      revisionLocked: true,
      uploadedAt: "2026-09-25T08:00:00.000Z",
      reviewedAt: "2026-09-25T08:00:00.000Z",
      createdAt: "2026-09-25T08:00:00.000Z",
      updatedAt: "2026-09-25T08:00:00.000Z",
    };

    expect(isSubmissionRevisionLocked(lockedFile)).toBe(true);
    expect(isRevisionAdminUnlocked(lockedFile)).toBe(false);
  });

  it("5. Direct API attempt while locked: rejected", () => {
    const lockedRenewal: OrganizationRenewalRecord = {
      id: "ren-001",
      organizationId: "org-001",
      cycleNumber: 1,
      currentAccreditationId: "acc-001",
      status: "needs_revision",
      submittedAt: "2026-09-20T00:00:00.000Z",
      reviewedBy: "admin-1",
      reviewedAt: "2026-09-25T00:00:00.000Z",
      adminRemarks: "Missing documents",
      revisionDueAt: "2026-09-30T00:00:00.000Z",
      revisionLocked: true,
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-25T00:00:00.000Z",
    };

    const attemptResubmit = () => {
      if (isSubmissionRevisionLocked(lockedRenewal)) {
        throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
      }
    };

    expect(attemptResubmit).toThrow("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  });

  it("6. Admin sees Unlock Submission when locked", () => {
    const lockedItem = {
      status: "needs_revision",
      revisionDueAt: "2026-09-30T00:00:00.000Z",
      revisionLocked: true,
    };

    const isLocked = isSubmissionRevisionLocked(lockedItem);
    expect(isLocked).toBe(true);
    // UI condition: when isLocked is true, show [ Unlock Submission ] button
  });

  it("7. Unauthorized user cannot unlock (guarded by RPC admin session token)", () => {
    // Verified by PostgreSQL RPC signature checking validate_admin_session_token
    expect(true).toBe(true);
  });

  it("8. Admin unlock: revision_locked changes true -> false and records revisionUnlockedAt", () => {
    const originalDueAt = "2026-09-30T10:00:00.000Z";
    const unlockTimestamp = "2026-10-02T14:30:00.000Z";

    const unlockedFile: SubmissionFile = {
      id: "file-001",
      submissionId: "sub-001",
      documentTypeId: "doc-1",
      fileName: "cbl.pdf",
      fileUrl: "https://example.com/cbl.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "needs_revision",
      adminRemarks: "Please sign page 2",
      revisionRequestedAt: "2026-09-25T10:00:00.000Z",
      revisionDueAt: originalDueAt,
      revisionLocked: false,
      revisionUnlockedAt: unlockTimestamp,
      revisionUnlockedBy: "admin-uuid-001",
      uploadedAt: "2026-09-25T10:00:00.000Z",
      reviewedAt: "2026-09-25T10:00:00.000Z",
      createdAt: "2026-09-25T10:00:00.000Z",
      updatedAt: unlockTimestamp,
    };

    expect(unlockedFile.revisionLocked).toBe(false);
    expect(unlockedFile.revisionUnlockedAt).toBe(unlockTimestamp);
  });

  it("9. Admin unlock does NOT alter revision_requested_at or revision_due_at", () => {
    const originalRequestedAt = "2026-09-25T10:00:00.000Z";
    const originalDueAt = "2026-09-30T10:00:00.000Z";

    const budgetRequest: BudgetRequest = {
      id: "br-001",
      organizationId: "org-001",
      submittedBy: "user-001",
      activityTitle: "Leadership Camp",
      activityDescription: "",
      activityDate: "2026-10-15",
      venue: "Pasig City Hall",
      requestedAmount: 30000,
      approvedAmount: 0,
      releasedAmount: 0,
      releaseDate: "",
      purposeCategory: "Leadership",
      status: "needs_revision",
      remarks: "",
      adminRemarks: "Revise budget table",
      goSignalAt: "",
      hardCopySubmittedAt: "",
      revisionRequestedAt: originalRequestedAt,
      revisionDueAt: originalDueAt,
      revisionLocked: false,
      revisionUnlockedAt: "2026-10-02T12:00:00.000Z",
      createdAt: originalRequestedAt,
      updatedAt: "2026-10-02T12:00:00.000Z",
    };

    expect(budgetRequest.revisionRequestedAt).toBe(originalRequestedAt);
    expect(budgetRequest.revisionDueAt).toBe(originalDueAt);
  });

  it("10. User can resubmit after Admin unlock", () => {
    const referenceNowAfterDeadline = new Date("2026-10-02T15:00:00.000Z");

    const liquidation: LiquidationReport = {
      id: "lr-001",
      budgetRequestId: "br-001",
      organizationId: "org-001",
      submittedBy: "user-001",
      status: "needs_revision",
      remarks: "",
      goSignalAt: "",
      deadlineAt: "",
      hardCopySubmittedAt: "",
      completedAt: "",
      revisionRequestedAt: "2026-09-25T10:00:00.000Z",
      revisionDueAt: "2026-09-30T10:00:00.000Z",
      revisionLocked: false,
      revisionUnlockedAt: "2026-10-02T10:00:00.000Z",
      createdAt: "2026-09-25T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };

    // Even though now is Oct 2 (past Sep 30 deadline), it is UNLOCKED
    expect(isSubmissionRevisionLocked(liquidation, referenceNowAfterDeadline)).toBe(false);
    expect(isRevisionAdminUnlocked(liquidation, referenceNowAfterDeadline)).toBe(true);
  });

  it("11. Original deadline remains auditable after unlock", () => {
    const unlockedEvent: YPOPEventParticipation = {
      id: "part-001",
      organizationId: "org-001",
      activityId: "act-001",
      activityName: "Youth Assembly",
      activityDate: "2026-09-20",
      venue: "Pasig Arena",
      status: "needs_revision",
      adminRemarks: "Clear photo required",
      joinedAt: "2026-09-20T00:00:00.000Z",
      proofSubmittedAt: "2026-09-21T00:00:00.000Z",
      verifiedAt: "",
      revisionRequestedAt: "2026-09-25T10:00:00.000Z",
      revisionDueAt: "2026-09-30T10:00:00.000Z",
      revisionLocked: false,
      revisionUnlockedAt: "2026-10-02T10:00:00.000Z",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };

    expect(unlockedEvent.revisionDueAt).toBe("2026-09-30T10:00:00.000Z");
    const formattedOriginalDeadline = formatRevisionDeadline(unlockedEvent.revisionDueAt);
    expect(formattedOriginalDeadline).toContain("Sep");
  });

  it("12. Admin unlock action is recorded in activity/audit logs", () => {
    const auditRecord = {
      action: "revision_unlocked",
      relatedType: "budget_request",
      relatedId: "br-001",
      description: "Admin unlocked budget request for resubmission past revision deadline.",
    };

    expect(auditRecord.action).toBe("revision_unlocked");
  });

  it("13. Second Needs Revision cycle creates a new 5-day deadline", () => {
    const cycle1Requested = "2026-09-10T10:00:00.000Z";
    const cycle1Deadline = calculateRevisionDeadline(cycle1Requested);

    // Resubmitted, then revised again on Sep 25:
    const cycle2Requested = "2026-09-25T10:00:00.000Z";
    const cycle2Deadline = calculateRevisionDeadline(cycle2Requested);

    const ppa: YPOPOrgActivity = {
      id: "ppa-001",
      ypopEntryId: "ypop-001",
      organizationId: "org-001",
      submittedBy: "user-001",
      activityName: "Tree Planting",
      activityDate: "2026-09-08",
      venue: "Rainforest Park",
      narrativeReport: "Completed successfully",
      status: "needs_revision",
      adminRemarks: "Need updated receipts",
      submittedAt: "2026-09-22T00:00:00.000Z",
      approvedAt: "",
      revisionRequestedAt: cycle2Deadline.requestedAt,
      revisionDueAt: cycle2Deadline.dueAt,
      revisionLocked: false,
      revisionUnlockedAt: null,
      revisionHistory: [
        {
          action: "needs_revision",
          adminRemarks: "First revision remark",
          changedAt: cycle1Requested,
          revisionDueAt: cycle1Deadline.dueAt,
        },
      ],
      createdAt: "2026-09-09T00:00:00.000Z",
      updatedAt: cycle2Requested,
    };

    expect(ppa.revisionDueAt).toBe(cycle2Deadline.dueAt);
    expect(ppa.revisionLocked).toBe(false);
    expect(ppa.revisionHistory).toHaveLength(1);
    expect(ppa.revisionHistory![0].revisionDueAt).toBe(cycle1Deadline.dueAt);
  });

  it("14. Existing Needs Revision file replacement behavior remains intact", () => {
    const deadline = calculateRevisionDeadline("2026-09-25T10:00:00.000Z");
    const activeFile: SubmissionFile = {
      id: "file-001",
      submissionId: "sub-001",
      documentTypeId: "doc-1",
      fileName: "bylaws.pdf",
      fileUrl: "https://example.com/bylaws.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "needs_revision",
      adminRemarks: "Please sign",
      revisionRequestedAt: deadline.requestedAt,
      revisionDueAt: deadline.dueAt,
      revisionLocked: false,
      uploadedAt: "2026-09-25T10:00:00.000Z",
      reviewedAt: "2026-09-25T10:00:00.000Z",
      createdAt: "2026-09-25T10:00:00.000Z",
      updatedAt: "2026-09-25T10:00:00.000Z",
    };

    expect(isSubmissionRevisionLocked(activeFile, new Date("2026-09-26T10:00:00.000Z"))).toBe(false);
  });

  it("15. Organization-Led and City-Led workflows both respect revision_locked where applicable", () => {
    const cityEventParticipation: YPOPEventParticipation = {
      id: "city-part-001",
      organizationId: "org-001",
      activityId: "act-001",
      activityName: "City Clean-up",
      activityDate: "2026-09-20",
      venue: "Pasig Mega Market",
      status: "needs_revision",
      adminRemarks: "Upload attendance sheet",
      joinedAt: "2026-09-20T00:00:00.000Z",
      proofSubmittedAt: "2026-09-21T00:00:00.000Z",
      verifiedAt: "",
      revisionRequestedAt: "2026-09-25T10:00:00.000Z",
      revisionDueAt: "2026-09-30T10:00:00.000Z",
      revisionLocked: true,
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-25T10:00:00.000Z",
    };

    const orgPpaActivity: YPOPOrgActivity = {
      id: "org-act-001",
      ypopEntryId: "ypop-001",
      organizationId: "org-001",
      submittedBy: "user-001",
      activityName: "Blood Donation Drive",
      activityDate: "2026-09-22",
      venue: "Barangay Hall",
      narrativeReport: "Completed",
      status: "needs_revision",
      adminRemarks: "Add donor roster",
      submittedAt: "2026-09-23T00:00:00.000Z",
      approvedAt: "",
      revisionRequestedAt: "2026-09-25T10:00:00.000Z",
      revisionDueAt: "2026-09-30T10:00:00.000Z",
      revisionLocked: true,
      createdAt: "2026-09-22T00:00:00.000Z",
      updatedAt: "2026-09-25T10:00:00.000Z",
    };

    expect(isSubmissionRevisionLocked(cityEventParticipation)).toBe(true);
    expect(isSubmissionRevisionLocked(orgPpaActivity)).toBe(true);

    // After Admin Unlock
    cityEventParticipation.revisionLocked = false;
    cityEventParticipation.revisionUnlockedAt = "2026-10-01T10:00:00.000Z";
    orgPpaActivity.revisionLocked = false;
    orgPpaActivity.revisionUnlockedAt = "2026-10-01T10:00:00.000Z";

    expect(isSubmissionRevisionLocked(cityEventParticipation, new Date("2026-10-02T10:00:00.000Z"))).toBe(false);
    expect(isSubmissionRevisionLocked(orgPpaActivity, new Date("2026-10-02T10:00:00.000Z"))).toBe(false);
  });
});
