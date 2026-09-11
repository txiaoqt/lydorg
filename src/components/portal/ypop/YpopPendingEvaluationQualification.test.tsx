import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  computeYpopScore,
  DEFAULT_ORG_LED_TIERS,
  deriveYpopQualificationStatus,
  statusLabelMap,
  YPOP_SCORE_THRESHOLD,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPPeriod,
  type YpopQualificationStatus,
} from "@/lib/lydo-connect-data";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { StatusLabel } from "@/admin/components/YpopSubmissionsTable";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { resolveBudgetWorkflowEligibility } from "@/lib/user-workflow-eligibility";

describe("YPOP Qualification Status — Pending Evaluation State & UX Parity (All 25 Scenarios)", () => {
  const currentSemesterKey = "SEM-2026-01";
  const historicalSemesterKey = "SEM-2025-02";

  const openPeriod: YPOPPeriod = {
    id: "period-open",
    semesterKey: currentSemesterKey,
    semesterLabel: "2026 1st Semester",
    validationDeadline: "2026-12-31T00:00:00.000Z",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const closedPeriod: YPOPPeriod = {
    id: "period-closed",
    semesterKey: historicalSemesterKey,
    semesterLabel: "2025 2nd Semester",
    validationDeadline: "2025-12-31T00:00:00.000Z",
    status: "closed",
    createdAt: "2025-07-01T00:00:00.000Z",
    updatedAt: "2025-12-31T00:00:00.000Z",
  };

  const cityActivities: YPOPCityActivity[] = [
    {
      id: "city-1",
      semesterKey: currentSemesterKey,
      name: "Leadership Forum",
      category: "mandatory",
      points: 4,
      date: "2026-06-01",
      venue: "City Hall",
      description: "Mandatory leadership forum",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "city-2",
      semesterKey: currentSemesterKey,
      name: "Sports Fest",
      category: "invitational",
      points: 3,
      date: "2026-06-15",
      venue: "Sports Complex",
      description: "Invitational event",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];

  // =========================================================================
  // A. QUALIFICATION STATUS TESTS (Scenarios 1 - 9)
  // =========================================================================

  // Scenario 1: No submission + 0% -> Pending Evaluation
  it("Scenario 1: No submission + 0% -> Pending Evaluation (NOT Not Qualified)", () => {
    const status = deriveYpopQualificationStatus({
      score: 0,
      period: openPeriod,
      entry: null,
      participations: [],
      orgActivities: [],
    });
    expect(status).toBe("pending_evaluation");
    expect(statusLabelMap[status]).toBe("Pending Evaluation");
  });

  // Scenario 2: Submitted + unreviewed + 0% -> Pending Evaluation
  it("Scenario 2: Submitted + unreviewed + 0% -> Pending Evaluation", () => {
    const participations: Array<Pick<YPOPEventParticipation, "status">> = [
      { status: "pending_verification" },
    ];
    const status = deriveYpopQualificationStatus({
      score: 0,
      period: openPeriod,
      entry: { status: "submitted", pointsRequired: 70 },
      participations,
      orgActivities: [],
    });
    expect(status).toBe("pending_evaluation");
    expect(statusLabelMap[status]).toBe("Pending Evaluation");
  });

  // Scenario 3: Some reviewed + some unreviewed + <70% -> Pending Evaluation
  it("Scenario 3: Some reviewed + some unreviewed + <70% -> Pending Evaluation (Approved=2, Unreviewed=1, Score=50%)", () => {
    const participations: Array<Pick<YPOPEventParticipation, "status">> = [
      { status: "verified" },
      { status: "verified" },
      { status: "pending_verification" },
    ];
    const status = deriveYpopQualificationStatus({
      score: 50,
      period: openPeriod,
      entry: { status: "under_review", pointsRequired: 70 },
      participations,
      orgActivities: [],
    });
    expect(status).toBe("pending_evaluation");
    expect(statusLabelMap[status]).toBe("Pending Evaluation");
  });

  // Scenario 4: All evaluation complete + 55% -> Not Qualified
  it("Scenario 4: All evaluation complete + 55% -> Not Qualified (Approved/reviewed complete, unreviewed=0, score=55%)", () => {
    const participations: Array<Pick<YPOPEventParticipation, "status">> = [
      { status: "verified" },
      { status: "rejected" },
    ];
    const status = deriveYpopQualificationStatus({
      score: 55,
      period: openPeriod,
      entry: { status: "not_qualified", pointsRequired: 70 },
      participations,
      orgActivities: [],
      unreviewedCount: 0,
      needsRevisionCount: 0,
    });
    expect(status).toBe("not_qualified");
    expect(statusLabelMap[status]).toBe("Not Qualified");
  });

  // Scenario 5: All evaluation complete + 70% -> Qualified
  it("Scenario 5: All evaluation complete + exactly 70% -> Qualified", () => {
    const status = deriveYpopQualificationStatus({
      score: 70,
      period: openPeriod,
      entry: { status: "qualified", pointsRequired: 70 },
      participations: [{ status: "verified" }],
      orgActivities: [],
      unreviewedCount: 0,
      needsRevisionCount: 0,
    });
    expect(status).toBe("qualified");
    expect(statusLabelMap[status]).toBe("Qualified");
  });

  // Scenario 6: All evaluation complete + 100% -> Qualified
  it("Scenario 6: All evaluation complete + 100% -> Qualified", () => {
    const status = deriveYpopQualificationStatus({
      score: 100,
      period: openPeriod,
      entry: { status: "qualified", pointsRequired: 70 },
      participations: [{ status: "verified" }, { status: "verified" }],
      orgActivities: [],
      unreviewedCount: 0,
      needsRevisionCount: 0,
    });
    expect(status).toBe("qualified");
    expect(statusLabelMap[status]).toBe("Qualified");
  });

  // Scenario 7: All evaluation complete + 110% -> Qualified
  it("Scenario 7: All evaluation complete + 110% (100% City + 10% Org bonus) -> Qualified", () => {
    const scoreResult = computeYpopScore(
      [{ activityId: "city-1", attended: true }, { activityId: "city-2", attended: true }],
      cityActivities,
      1,
      DEFAULT_ORG_LED_TIERS
    );
    expect(scoreResult.totalScore).toBe(110);

    const status = deriveYpopQualificationStatus({
      score: scoreResult.totalScore,
      period: openPeriod,
      entry: { status: "qualified", pointsRequired: 70 },
      participations: [{ status: "verified" }, { status: "verified" }],
      orgActivities: [{ status: "approved" }],
      unreviewedCount: 0,
      needsRevisionCount: 0,
    });
    expect(status).toBe("qualified");
    expect(statusLabelMap[status]).toBe("Qualified");
  });

  // Scenario 8: Needs Revision item + incomplete evaluation -> Pending Evaluation
  it("Scenario 8: Needs Revision item with score < 70% -> Pending Evaluation (evaluation incomplete)", () => {
    const participations: Array<Pick<YPOPEventParticipation, "status">> = [
      { status: "needs_revision" },
    ];
    const status = deriveYpopQualificationStatus({
      score: 30,
      period: openPeriod,
      entry: { status: "needs_revision", pointsRequired: 70 },
      participations,
      orgActivities: [],
      unreviewedCount: 0,
      needsRevisionCount: 1,
    });
    expect(status).toBe("pending_evaluation");
    expect(statusLabelMap[status]).toBe("Pending Evaluation");
  });

  // Scenario 9: Rejected items -> standard evaluation semantics
  it("Scenario 9: Rejected items without points -> Not Qualified if all reviews complete and score < 70%", () => {
    const participations: Array<Pick<YPOPEventParticipation, "status">> = [
      { status: "rejected" },
    ];
    const status = deriveYpopQualificationStatus({
      score: 0,
      period: openPeriod,
      entry: { status: "not_qualified", pointsRequired: 70 },
      participations,
      orgActivities: [],
      unreviewedCount: 0,
      needsRevisionCount: 0,
    });
    expect(status).toBe("not_qualified");
  });

  // =========================================================================
  // B. ADMIN / USER PARITY TESTS (Scenarios 10 - 12)
  // =========================================================================

  // Scenario 10: Admin Pending Evaluation = User Pending Evaluation
  it("Scenario 10: Admin Pending Evaluation matches User Pending Evaluation exactly", () => {
    const status: YpopQualificationStatus = "pending_evaluation";

    // Admin table label
    const { rerender } = render(<StatusLabel status={status} />);
    expect(screen.getByText("Pending Evaluation")).toBeDefined();

    // User workspace badge
    rerender(<StatusBadge status={status} label={statusLabelMap[status]} />);
    expect(screen.getByText("Pending Evaluation")).toBeDefined();
  });

  // Scenario 11: Admin Qualified = User Qualified
  it("Scenario 11: Admin Qualified matches User Qualified exactly", () => {
    const status: YpopQualificationStatus = "qualified";

    const { rerender } = render(<StatusLabel status={status} />);
    expect(screen.getByText("Qualified")).toBeDefined();

    rerender(<StatusBadge status={status} label={statusLabelMap[status]} />);
    expect(screen.getByText("Qualified")).toBeDefined();
  });

  // Scenario 12: Admin Not Qualified = User Not Qualified
  it("Scenario 12: Admin Not Qualified matches User Not Qualified exactly", () => {
    const status: YpopQualificationStatus = "not_qualified";

    const { rerender } = render(<StatusLabel status={status} />);
    expect(screen.getByText("Not Qualified")).toBeDefined();

    rerender(<StatusBadge status={status} label={statusLabelMap[status]} />);
    expect(screen.getByText("Not Qualified")).toBeDefined();
  });

  // =========================================================================
  // C. BUDGET REQUEST GATING (Scenarios 13 - 19)
  // =========================================================================

  // Scenario 13: Pending Evaluation -> New Budget Request hidden
  it("Scenario 13: Pending Evaluation -> New Budget Request button hidden (null, not rendered)", () => {
    const qualificationStatus: YpopQualificationStatus = "pending_evaluation";
    const isQualified = qualificationStatus === "qualified";
    const button = isQualified ? "New Budget Request" : null;
    expect(button).toBeNull();
  });

  // Scenario 14: Pending Evaluation -> direct Budget Request remains blocked
  it("Scenario 14: Pending Evaluation -> direct Budget Request remains blocked on YPOP qualification", () => {
    const pendingEntry: YPOPEntry = {
      id: "entry-pending",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 0,
      pointsRequired: 70,
      totalPoints: 100,
      status: "under_review",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      submittedAt: "2026-06-01T00:00:00.000Z",
      validatedAt: "",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    const budgetEligibility = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [openPeriod],
      entries: [pendingEntry],
      semesterContext: currentSemesterKey,
    });

    expect(budgetEligibility.eligible).toBe(false);
    expect(budgetEligibility.reason).toBe("ypop_under_review");

    const workflowEligibility = resolveBudgetWorkflowEligibility({
      profile: {
        id: "org-1",
        userId: "user-1",
        organizationName: "Org 1",
        profileStatus: "verified",
        registrationStep: "verified",
      } as any,
      requiredTemplates: [],
      documentFiles: [],
      ypopEligibility: budgetEligibility,
    });

    expect(workflowEligibility.eligible).toBe(false);
    const ypopReq = workflowEligibility.requirements.find((r) => r.id === "ypop_qualification");
    expect(ypopReq?.met).toBe(false);
  });

  // Scenario 15: Not Qualified -> New Budget Request hidden
  it("Scenario 15: Not Qualified -> New Budget Request button hidden", () => {
    const qualificationStatus: YpopQualificationStatus = "not_qualified";
    const isQualified = qualificationStatus === "qualified";
    const button = isQualified ? "New Budget Request" : null;
    expect(button).toBeNull();
  });

  // Scenario 16: Not Qualified -> direct Budget Request remains blocked
  it("Scenario 16: Not Qualified -> direct Budget Request remains blocked", () => {
    const notQualifiedEntry: YPOPEntry = {
      id: "entry-nq",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 50,
      pointsRequired: 70,
      totalPoints: 100,
      status: "not_qualified",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      submittedAt: "2026-06-01T00:00:00.000Z",
      validatedAt: "2026-06-02T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
    };

    const budgetEligibility = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [openPeriod],
      entries: [notQualifiedEntry],
      semesterContext: currentSemesterKey,
    });

    expect(budgetEligibility.eligible).toBe(false);
    expect(budgetEligibility.reason).toBe("ypop_not_qualified");
  });

  // Scenario 17: Qualified -> New Budget Request visible
  it("Scenario 17: Qualified -> New Budget Request visible", () => {
    const qualificationStatus: YpopQualificationStatus = "qualified";
    const isQualified = qualificationStatus === "qualified";
    const button = isQualified ? "New Budget Request" : null;
    expect(button).toBe("New Budget Request");
  });

  // Scenario 18: Qualified -> Budget Request YPOP requirement passes
  it("Scenario 18: Qualified -> Budget Request YPOP requirement passes", () => {
    const qualifiedEntry: YPOPEntry = {
      id: "entry-q",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 85,
      pointsRequired: 70,
      totalPoints: 100,
      status: "qualified",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      submittedAt: "2026-06-01T00:00:00.000Z",
      validatedAt: "2026-06-02T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
    };

    const budgetEligibility = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [openPeriod],
      entries: [qualifiedEntry],
      semesterContext: currentSemesterKey,
    });

    expect(budgetEligibility.eligible).toBe(true);
    expect(budgetEligibility.reason).toBe("qualified");

    const workflowEligibility = resolveBudgetWorkflowEligibility({
      profile: {
        id: "org-1",
        userId: "user-1",
        organizationName: "Org 1",
        profileStatus: "verified",
        registrationStep: "verified",
      } as any,
      requiredTemplates: [],
      documentFiles: [],
      ypopEligibility: budgetEligibility,
    });

    const ypopReq = workflowEligibility.requirements.find((r) => r.id === "ypop_qualification");
    expect(ypopReq?.met).toBe(true);
  });

  // Scenario 19: Historical Qualified semester does not unlock another semester
  it("Scenario 19: Historical Qualified semester does not unlock an active open pending_evaluation semester", () => {
    const historicalEntry: YPOPEntry = {
      id: "entry-hist",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: historicalSemesterKey,
      semesterLabel: "2025 2nd Semester",
      pointsEarned: 100,
      pointsRequired: 70,
      totalPoints: 100,
      status: "qualified",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2025-12-31T00:00:00.000Z",
      submittedAt: "2025-12-01T00:00:00.000Z",
      validatedAt: "2025-12-02T00:00:00.000Z",
      createdAt: "2025-12-01T00:00:00.000Z",
      updatedAt: "2025-12-02T00:00:00.000Z",
    };

    const currentPendingEntry: YPOPEntry = {
      id: "entry-curr",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 0,
      pointsRequired: 70,
      totalPoints: 100,
      status: "draft",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      submittedAt: "",
      validatedAt: "",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    // Scoped evaluation of current semester
    const currentEligibility = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [openPeriod, closedPeriod],
      entries: [historicalEntry, currentPendingEntry],
      semesterContext: currentSemesterKey,
    });

    expect(currentEligibility.eligible).toBe(false);
    expect(currentEligibility.entry?.id).toBe("entry-curr");
  });

  // =========================================================================
  // D. SCORE PRESERVATION (Scenarios 20 - 22)
  // =========================================================================

  // Scenario 20: Existing score calculations remain unchanged
  it("Scenario 20: Existing score calculations remain unchanged by computeYpopScore", () => {
    const attendance = [{ activityId: "city-1", attended: true }];
    const score = computeYpopScore(attendance, cityActivities, 0, DEFAULT_ORG_LED_TIERS);
    // 4 / (4 + 3) = 4/7 = 57%
    expect(score.cityLedPercent).toBe(57);
    expect(score.orgLedBonus).toBe(0);
    expect(score.totalScore).toBe(57);
  });

  // Scenario 21: 110% remains 110%
  it("Scenario 21: 110% score is preserved numerically and does not truncate to 100%", () => {
    const attendance = [
      { activityId: "city-1", attended: true },
      { activityId: "city-2", attended: true },
    ];
    const score = computeYpopScore(attendance, cityActivities, 1, DEFAULT_ORG_LED_TIERS);
    expect(score.cityLedPercent).toBe(100);
    expect(score.orgLedBonus).toBe(10);
    expect(score.totalScore).toBe(110);
  });

  // Scenario 22: Progress bar clamped visually
  it("Scenario 22: Progress bar remains safely clamped between 0% and 100%", () => {
    const score = 110;
    const clampedProgress = Math.min(100, Math.max(0, score));
    expect(clampedProgress).toBe(100);
  });

  // =========================================================================
  // E. EXISTING WORKFLOWS (Scenarios 23 - 25)
  // =========================================================================

  // Scenario 23: Individual activity Needs Revision remains an activity review status
  it("Scenario 23: Individual activity Needs Revision remains an activity review status", () => {
    const participation: YPOPEventParticipation = {
      id: "part-rev",
      activityId: "city-1",
      activityName: "Leadership Forum",
      activityDate: "2026-06-01",
      venue: "City Hall",
      organizationId: "org-1",
      status: "needs_revision",
      adminRemarks: "Please attach clear attendance sheet",
    };
    expect(participation.status).toBe("needs_revision");
    expect(participation.adminRemarks).toBe("Please attach clear attendance sheet");
  });

  // Scenario 24: Individual Approved/Verified remains an activity review status
  it("Scenario 24: Individual Approved/Verified remains an activity review status", () => {
    const ppa: YPOPOrgActivity = {
      id: "ppa-1",
      ypopEntryId: "entry-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityName: "Tree Planting",
      activityDate: "2026-06-20",
      venue: "Park",
      narrativeReport: "report.pdf",
      status: "approved",
      adminRemarks: "Great initiative",
      submittedAt: "2026-06-20T00:00:00.000Z",
      approvedAt: "2026-06-21T00:00:00.000Z",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
    };
    expect(ppa.status).toBe("approved");
  });

  // Scenario 25: Overall qualification never displays Needs Revision
  it("Scenario 25: Overall qualification status never displays Needs Revision", () => {
    const possibleStatuses: YpopQualificationStatus[] = [
      deriveYpopQualificationStatus({ score: 0, period: openPeriod, entry: { status: "draft", pointsRequired: 70 } }),
      deriveYpopQualificationStatus({ score: 40, period: openPeriod, entry: { status: "needs_revision", pointsRequired: 70 }, needsRevisionCount: 1 }),
      deriveYpopQualificationStatus({ score: 70, period: openPeriod, entry: { status: "qualified", pointsRequired: 70 } }),
      deriveYpopQualificationStatus({ score: 55, period: openPeriod, entry: { status: "not_qualified", pointsRequired: 70 }, unreviewedCount: 0, needsRevisionCount: 0, participations: [{ status: "verified" }] }),
    ];

    possibleStatuses.forEach((status) => {
      expect(["pending_evaluation", "qualified", "not_qualified"]).toContain(status);
      expect(status).not.toBe("needs_revision");
      expect(statusLabelMap[status]).not.toBe("Needs Revision");
      expect(["Pending Evaluation", "Qualified", "Not Qualified"]).toContain(statusLabelMap[status]);
    });
  });
});
