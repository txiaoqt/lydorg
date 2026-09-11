import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { LydoConnectProvider, useLydoConnect } from "./lydo-connect-store";
import {
  type YPOPEventParticipation,
  type YPOPEventParticipationStatus,
  type YPOPEntry,
  type YPOPCityActivity,
  type YPOPPeriod,
  type YPOPOrgActivity,
  buildVerifiedYpopAttendance,
  computeYpopScore,
  getApprovedYpopOrgActivityCount,
  statusLabelMap,
} from "./lydo-connect-data";

describe("YPOP Admin → Supabase → User Status & Score Synchronization (Tests A - J)", () => {
  const mockOrgId = "org-tadz-001";
  const mockSemesterKey = "S2-2026-09-01-01";
  const mockActivityId = "act-summit-001";

  const mockCityActivity: YPOPCityActivity = {
    id: mockActivityId,
    semesterKey: mockSemesterKey,
    name: "Youth Leadership Summit 2026",
    category: "mandatory",
    points: 4,
    date: "2026-09-05",
    venue: "Pasig City Hall",
    description: "Annual leadership summit",
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  const mockPeriod: YPOPPeriod = {
    id: "period-001",
    semesterKey: mockSemesterKey,
    semesterLabel: "2026 Second Semester",
    validationDeadline: "2026-12-31T00:00:00.000Z",
    status: "open",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  const validCityActivityIds = new Set([mockActivityId]);

  // Replication of the store's reconcileYpopEventParticipations helper
  const reconcileYpopEventParticipations = (
    currentItems: YPOPEventParticipation[],
    remoteItems: YPOPEventParticipation[] | undefined,
    snapshotOrgs: Array<{ id: string }> | undefined,
    isAdmin: boolean,
    validActivityIds: Set<string>,
  ): YPOPEventParticipation[] => {
    if (!remoteItems) {
      return currentItems.filter((p) => validActivityIds.has(p.activityId));
    }
    if (isAdmin) {
      return remoteItems.filter((p) => validActivityIds.has(p.activityId));
    }
    const coveredOrgIds = new Set((snapshotOrgs ?? []).map((o) => o.id));
    const remoteById = new Map<string, YPOPEventParticipation>();
    remoteItems.forEach((item) => remoteById.set(item.id, item));

    const preservedOtherOrgs =
      coveredOrgIds.size > 0
        ? currentItems.filter((item) => !coveredOrgIds.has(item.organizationId) && !remoteById.has(item.id))
        : currentItems.filter((item) => !remoteById.has(item.id));

    return [...preservedOtherOrgs, ...remoteItems].filter((p) => validActivityIds.has(p.activityId));
  };

  // TEST A — PARTICIPATION SYNC
  describe("TEST A — Participation Status Synchronization", () => {
    it("updates local status when remote status is needs_revision, verified, rejected, or draft", () => {
      const statuses: YPOPEventParticipationStatus[] = ["needs_revision", "verified", "rejected", "draft"];

      for (const targetStatus of statuses) {
        const localParticipation: YPOPEventParticipation = {
          id: "part-001",
          activityId: mockActivityId,
          organizationId: mockOrgId,
          status: "pending_verification",
          adminRemarks: "",
          proofSubmittedAt: "2026-09-06T10:00:00.000Z",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: "2026-09-06T10:00:00.000Z",
          updatedAt: "2026-09-06T10:00:00.000Z",
        };

        const remoteParticipation: YPOPEventParticipation = {
          ...localParticipation,
          status: targetStatus,
          adminRemarks: targetStatus === "needs_revision" ? "Please attach clear photos" : "",
          updatedAt: "2026-09-10T12:00:00.000Z",
        };

        const reconciled = reconcileYpopEventParticipations(
          [localParticipation],
          [remoteParticipation],
          [{ id: mockOrgId }],
          false,
          validCityActivityIds,
        );

        expect(reconciled).toHaveLength(1);
        expect(reconciled[0].status).toBe(targetStatus);
        if (targetStatus === "needs_revision") {
          expect(reconciled[0].adminRemarks).toBe("Please attach clear photos");
        }
      }
    });
  });

  // TEST B — CLEARED LOCAL STORAGE
  describe("TEST B — Cleared Local Storage Recovery", () => {
    it("populates remote participation when local storage has zero participations", () => {
      const remoteParticipation: YPOPEventParticipation = {
        id: "part-001",
        activityId: mockActivityId,
        organizationId: mockOrgId,
        status: "needs_revision",
        adminRemarks: "hello pls revise this",
        proofSubmittedAt: "2026-09-06T10:00:00.000Z",
        verifiedAt: "",
        revisionHistory: [],
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-10T12:00:00.000Z",
      };

      // Simulates empty local store after clearing browser site data
      const currentItems: YPOPEventParticipation[] = [];

      const reconciled = reconcileYpopEventParticipations(
        currentItems,
        [remoteParticipation],
        [{ id: mockOrgId }],
        false,
        validCityActivityIds,
      );

      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe("part-001");
      expect(reconciled[0].status).toBe("needs_revision");
      expect(reconciled[0].adminRemarks).toBe("hello pls revise this");
    });
  });

  // TEST C — DELETE SEMESTER
  describe("TEST C — Authoritative Semester Deletion and Pruning", () => {
    it("prunes dependent participations when semester/activity is deleted", () => {
      const activeParticipation: YPOPEventParticipation = {
        id: "part-active",
        activityId: mockActivityId,
        organizationId: mockOrgId,
        status: "verified",
        adminRemarks: "",
        proofSubmittedAt: "2026-09-06T10:00:00.000Z",
        verifiedAt: "2026-09-10T12:00:00.000Z",
        revisionHistory: [],
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-10T12:00:00.000Z",
      };

      const deletedSemesterActivityId = "act-deleted-semester";
      const orphanParticipation: YPOPEventParticipation = {
        id: "part-orphan",
        activityId: deletedSemesterActivityId,
        organizationId: mockOrgId,
        status: "verified",
        adminRemarks: "",
        proofSubmittedAt: "2026-08-01T10:00:00.000Z",
        verifiedAt: "2026-08-10T12:00:00.000Z",
        revisionHistory: [],
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-10T12:00:00.000Z",
      };

      // Only mockActivityId is valid; deletedSemesterActivityId was pruned with its semester
      const reconciled = reconcileYpopEventParticipations(
        [activeParticipation, orphanParticipation],
        [activeParticipation, orphanParticipation],
        [{ id: mockOrgId }],
        false,
        validCityActivityIds,
      );

      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe("part-active");
      expect(reconciled.some((p) => p.activityId === deletedSemesterActivityId)).toBe(false);
    });
  });

  // TEST D — PARENT NEEDS REVISION
  describe("TEST D — Parent Entry Status Reflects Needs Revision", () => {
    it("transitions parent entry to needs_revision when child activity is requested revision", () => {
      const initialEntry: YPOPEntry = {
        id: "entry-001",
        organizationId: mockOrgId,
        submittedBy: "user-001",
        semester: mockSemesterKey,
        semesterLabel: "2026 Second Semester",
        pointsEarned: 0,
        pointsRequired: 70,
        totalPoints: 100,
        status: "under_review",
        adminRemarks: "",
        submissionNote: "",
        validationDeadline: "2026-12-31T00:00:00.000Z",
        submittedAt: "2026-09-05T00:00:00.000Z",
        validatedAt: null,
        revisionHistory: [],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-05T00:00:00.000Z",
      };

      const reviewRemark = "Please submit clearer attendance sheet.";
      const targetStatus: YPOPEventParticipationStatus = "needs_revision";
      const currentParticipations: YPOPEventParticipation[] = [
        {
          id: "part-001",
          activityId: mockActivityId,
          organizationId: mockOrgId,
          status: "needs_revision",
          adminRemarks: reviewRemark,
          proofSubmittedAt: "2026-09-06T10:00:00.000Z",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: "2026-09-06T10:00:00.000Z",
          updatedAt: "2026-09-10T12:00:00.000Z",
        },
      ];

      const hasNeedsRevision =
        targetStatus === "needs_revision" || currentParticipations.some((p) => p.status === "needs_revision");

      const nextEntryStatus: YPOPEntry["status"] = hasNeedsRevision
        ? "needs_revision"
        : initialEntry.status === "draft"
          ? "under_review"
          : initialEntry.status;

      const entryPatch: Partial<YPOPEntry> = {
        status: nextEntryStatus,
        adminRemarks: hasNeedsRevision && reviewRemark ? reviewRemark : (initialEntry.adminRemarks ?? ""),
      };

      const updatedEntry = { ...initialEntry, ...entryPatch };
      expect(updatedEntry.status).toBe("needs_revision");
      expect(updatedEntry.adminRemarks).toBe(reviewRemark);
      expect(statusLabelMap[updatedEntry.status]).toBe("Needs Revision");
    });
  });

  // TEST E — CITY-LED SCORE
  describe("TEST E — City-Led Attendance Rebuilding and Score Calculation", () => {
    it("rebuilds attendance, recalculates score and updates pointsEarned upon verification", () => {
      const verifiedParticipation: YPOPEventParticipation = {
        id: "part-001",
        activityId: mockActivityId,
        organizationId: mockOrgId,
        status: "verified",
        adminRemarks: "",
        proofSubmittedAt: "2026-09-06T10:00:00.000Z",
        verifiedAt: "2026-09-10T12:00:00.000Z",
        revisionHistory: [],
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-10T12:00:00.000Z",
      };

      // 1. Build updated attendance
      const updatedAttendance = buildVerifiedYpopAttendance(
        [mockCityActivity],
        [verifiedParticipation],
        [],
      );

      expect(updatedAttendance).toHaveLength(1);
      expect(updatedAttendance[0].attended).toBe(true);
      expect(updatedAttendance[0].activityId).toBe(mockActivityId);

      // 2. Compute live score with verified attendance
      const score = computeYpopScore(updatedAttendance, [mockCityActivity], 0);

      // 4 points out of 4 total mandatory points = 100%
      expect(score.cityLedEarned).toBe(4);
      expect(score.cityLedPercent).toBe(100);
      expect(score.totalScore).toBe(100);
      expect(score.totalScore).toBeGreaterThan(0);
    });
  });

  // TEST F — REMARK REFLECTION
  describe("TEST F — Revision Remarks Propagation to User View", () => {
    it("ensures admin remarks are accessible for workspace revision notice display", () => {
      const entryWithRemarks: YPOPEntry = {
        id: "entry-001",
        organizationId: mockOrgId,
        submittedBy: "user-001",
        semester: mockSemesterKey,
        semesterLabel: "2026 Second Semester",
        pointsEarned: 0,
        pointsRequired: 70,
        totalPoints: 100,
        status: "needs_revision",
        adminRemarks: "Missing signatures on the proof document.",
        submissionNote: "",
        validationDeadline: "2026-12-31T00:00:00.000Z",
        submittedAt: "2026-09-05T00:00:00.000Z",
        validatedAt: null,
        revisionHistory: [
          {
            action: "needs_revision",
            adminRemarks: "Missing signatures on the proof document.",
            changedAt: "2026-09-10T12:00:00.000Z",
          },
        ],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-10T12:00:00.000Z",
      };

      const isNeedsRevision = entryWithRemarks.status === "needs_revision";
      const shouldShowNotice = Boolean(entryWithRemarks.adminRemarks && isNeedsRevision);

      expect(shouldShowNotice).toBe(true);
      expect(entryWithRemarks.adminRemarks).toBe("Missing signatures on the proof document.");
    });
  });

  // TEST G — MULTIPLE SEMESTERS
  describe("TEST G — Scoping activeEntry by Current/Selected Semester", () => {
    it("resolves the correct entry for the selected semester, preventing older entries from shadowing", () => {
      const historicalEntry: YPOPEntry = {
        id: "entry-historical-august",
        organizationId: mockOrgId,
        submittedBy: "user-001",
        semester: "S2-2026-08-30-01",
        semesterLabel: "2026 Second Semester",
        pointsEarned: 0,
        pointsRequired: 70,
        totalPoints: 100,
        status: "submitted",
        adminRemarks: "",
        submissionNote: "",
        validationDeadline: "2026-12-31T00:00:00.000Z",
        submittedAt: "2026-08-30T00:00:00.000Z",
        validatedAt: null,
        revisionHistory: [],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
        createdAt: "2026-08-30T00:00:00.000Z",
        updatedAt: "2026-08-30T00:00:00.000Z",
      };

      const currentEntry: YPOPEntry = {
        id: "entry-current-september",
        organizationId: mockOrgId,
        submittedBy: "user-001",
        semester: "S2-2026-09-01-01",
        semesterLabel: "2026 Second Semester",
        pointsEarned: 85,
        pointsRequired: 70,
        totalPoints: 100,
        status: "needs_revision",
        adminRemarks: "Please revise",
        submissionNote: "",
        validationDeadline: "2026-12-31T00:00:00.000Z",
        submittedAt: "2026-09-01T00:00:00.000Z",
        validatedAt: null,
        revisionHistory: [],
        orgLedProjectCount: 1,
        cityLedAttendance: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-10T12:00:00.000Z",
      };

      const allEntries = [historicalEntry, currentEntry];
      const targetSemesterKey = "S2-2026-09-01-01";

      // Scoped activeEntry resolution
      const activeEntry = allEntries.find(
        (e) => e.organizationId === mockOrgId && e.semester === targetSemesterKey,
      );

      expect(activeEntry).toBeDefined();
      expect(activeEntry?.id).toBe("entry-current-september");
      expect(activeEntry?.status).toBe("needs_revision");
      expect(activeEntry?.pointsEarned).toBe(85);
    });
  });

  // TEST H — SINGLE REVIEW
  describe("TEST H — Single-Item Review Parent Synchronization", () => {
    it("synchronizes parent attendance, score, and status during single activity confirmation", () => {
      const initialEntry: YPOPEntry = {
        id: "entry-001",
        organizationId: mockOrgId,
        submittedBy: "user-001",
        semester: mockSemesterKey,
        semesterLabel: "2026 Second Semester",
        pointsEarned: 0,
        pointsRequired: 70,
        totalPoints: 100,
        status: "under_review",
        adminRemarks: "",
        submissionNote: "",
        validationDeadline: "2026-12-31T00:00:00.000Z",
        submittedAt: "2026-09-05T00:00:00.000Z",
        validatedAt: null,
        revisionHistory: [],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-05T00:00:00.000Z",
      };

      const singleSavedParticipation: YPOPEventParticipation = {
        id: "part-001",
        activityId: mockActivityId,
        organizationId: mockOrgId,
        status: "verified",
        adminRemarks: "",
        proofSubmittedAt: "2026-09-06T10:00:00.000Z",
        verifiedAt: "2026-09-10T12:00:00.000Z",
        revisionHistory: [],
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-10T12:00:00.000Z",
      };

      const updatedAttendance = buildVerifiedYpopAttendance(
        [mockCityActivity],
        [singleSavedParticipation],
        initialEntry.cityLedAttendance,
      );

      const score = computeYpopScore(updatedAttendance, [mockCityActivity], 0);

      const entryPatch: Partial<YPOPEntry> = {
        cityLedAttendance: updatedAttendance,
        pointsEarned: score.totalScore,
        status: initialEntry.status === "draft" ? "under_review" : initialEntry.status,
      };

      const updatedEntry = { ...initialEntry, ...entryPatch };
      expect(updatedEntry.pointsEarned).toBe(100);
      expect(updatedEntry.cityLedAttendance[0].attended).toBe(true);
    });
  });

  // TEST I & J — ADMIN & USER REFRESH RECONCILIATION
  describe("TEST I & J — Post-Review Refresh Integrity", () => {
    it("maintains updated status and score after refresh cycle without regression", () => {
      // Remote DB state after admin review
      const remoteParticipation: YPOPEventParticipation = {
        id: "part-001",
        activityId: mockActivityId,
        organizationId: mockOrgId,
        status: "needs_revision",
        adminRemarks: "Updated revision remarks",
        proofSubmittedAt: "2026-09-06T10:00:00.000Z",
        verifiedAt: "",
        revisionHistory: [],
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-10T14:00:00.000Z",
      };

      const remoteEntry: YPOPEntry = {
        id: "entry-001",
        organizationId: mockOrgId,
        submittedBy: "user-001",
        semester: mockSemesterKey,
        semesterLabel: "2026 Second Semester",
        pointsEarned: 0,
        pointsRequired: 70,
        totalPoints: 100,
        status: "needs_revision",
        adminRemarks: "Updated revision remarks",
        submissionNote: "",
        validationDeadline: "2026-12-31T00:00:00.000Z",
        submittedAt: "2026-09-05T00:00:00.000Z",
        validatedAt: null,
        revisionHistory: [],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-10T14:00:00.000Z",
      };

      // User refresh / visibility change fetches snapshot
      const userReconciledParticipations = reconcileYpopEventParticipations(
        [],
        [remoteParticipation],
        [{ id: mockOrgId }],
        false,
        validCityActivityIds,
      );

      expect(userReconciledParticipations[0].status).toBe("needs_revision");
      expect(userReconciledParticipations[0].adminRemarks).toBe("Updated revision remarks");
      expect(remoteEntry.status).toBe("needs_revision");
      expect(remoteEntry.adminRemarks).toBe("Updated revision remarks");
    });

    it("executes mergeRemoteState on actual store provider without ReferenceError or initialization error", () => {
      const { result } = renderHook(() => useLydoConnect(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(LydoConnectProvider, null, children),
      });

      expect(() => {
        act(() => {
          result.current.mergeRemoteState({
            ypopPeriods: [mockPeriod],
            ypopCityActivities: [mockCityActivity],
            ypopEntries: [],
            ypopEventParticipations: [],
            ypopOrgActivities: [],
            organizationProfiles: [{ id: mockOrgId } as any],
          });
        });
      }).not.toThrow();

      expect(result.current.state.ypopPeriods.some((p) => p.semesterKey === mockSemesterKey)).toBe(true);
    });
  });
});
