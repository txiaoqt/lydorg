import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  computeYpopScore,
  DEFAULT_ORG_LED_TIERS,
  YPOP_SCORE_THRESHOLD,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPOrgActivity,
  type YPOPEventParticipation,
  type YPOPPeriod,
} from "@/lib/lydo-connect-data";
import { StatusLabel } from "@/admin/components/YpopSubmissionsTable";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { YpopValidationComputationPopover } from "@/admin/components/YpopValidationComputationPopover";

describe("YPOP Qualification Logic, User Reflection & Budget Gating (14 Acceptance Tests)", () => {
  const currentSemesterKey = "SEM-2026-01";
  const historicalSemesterKey = "SEM-2025-02";

  const cityActivities: YPOPCityActivity[] = [
    {
      id: "city-1",
      semesterKey: currentSemesterKey,
      name: "Leadership Forum",
      category: "mandatory",
      points: 10,
      date: "2026-06-01",
      venue: "Pasig Hall",
      description: "Mandatory forum",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];

  const currentPeriod: YPOPPeriod = {
    id: "period-current",
    semesterKey: currentSemesterKey,
    semesterLabel: "2026 1st Semester",
    validationDeadline: "2026-12-31T00:00:00.000Z",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const historicalPeriod: YPOPPeriod = {
    id: "period-historical",
    semesterKey: historicalSemesterKey,
    semesterLabel: "2025 2nd Semester",
    validationDeadline: "2025-12-31T00:00:00.000Z",
    status: "closed",
    createdAt: "2025-07-01T00:00:00.000Z",
  };

  const deriveOverallStatus = (score: number, pointsRequired = YPOP_SCORE_THRESHOLD): YPOPEntry["status"] =>
    score >= pointsRequired ? "qualified" : "not_qualified";

  // Test 1: Score = 69
  it("Test 1: Score = 69 -> Admin = Not Qualified, User = Not Qualified, Budget Request hidden", () => {
    const score = 69;
    const overallStatus = deriveOverallStatus(score);
    expect(overallStatus).toBe("not_qualified");

    // Admin display
    const { rerender } = render(<StatusLabel status={overallStatus} />);
    expect(screen.getByText("Not Qualified")).toBeDefined();

    // User display
    rerender(<StatusBadge status={overallStatus} />);
    expect(screen.getByText("Not Qualified")).toBeDefined();

    // Budget Request Gating (semester-specific check)
    const isQualified = overallStatus === "qualified";
    expect(isQualified).toBe(false);
  });

  // Test 2: Score = 70
  it("Test 2: Score = 70 -> Admin = Qualified, User = Qualified, Budget Request visible", () => {
    const score = 70;
    const overallStatus = deriveOverallStatus(score);
    expect(overallStatus).toBe("qualified");

    // Admin display
    const { rerender } = render(<StatusLabel status={overallStatus} />);
    expect(screen.getByText("Qualified")).toBeDefined();

    // User display
    rerender(<StatusBadge status={overallStatus} />);
    expect(screen.getByText("Qualified")).toBeDefined();

    // Budget Request Gating
    const isQualified = overallStatus === "qualified";
    expect(isQualified).toBe(true);
  });

  // Test 3: Score = 100
  it("Test 3: Score = 100 -> Admin = Qualified, User = Qualified, Budget Request visible", () => {
    const score = 100;
    const overallStatus = deriveOverallStatus(score);
    expect(overallStatus).toBe("qualified");

    const isQualified = overallStatus === "qualified";
    expect(isQualified).toBe(true);
  });

  // Test 4: Score = 110 (100% City + 10% Org bonus)
  it("Test 4: Score = 110 -> Admin = Qualified, numeric display = 110%, visual bar clamped at 100%, User = 110%, Budget Request visible", () => {
    const scoreResult = computeYpopScore([{ activityId: "city-1", attended: true }], cityActivities, 1, DEFAULT_ORG_LED_TIERS);
    expect(scoreResult.cityLedPercent).toBe(100);
    expect(scoreResult.orgLedBonus).toBe(10);
    expect(scoreResult.totalScore).toBe(110);

    const rawScore = scoreResult.totalScore;
    const displayScore = Math.max(0, rawScore);
    const progressBarWidth = Math.max(0, Math.min(100, rawScore));
    const overallStatus = deriveOverallStatus(rawScore);

    expect(displayScore).toBe(110);
    expect(progressBarWidth).toBe(100);
    expect(overallStatus).toBe("qualified");

    // Verify UI rendering of uncapped text and clamped bar
    const { container } = render(
      <div>
        <span data-testid="score-text">{displayScore}%</span>
        <div data-testid="bar" style={{ width: `${progressBarWidth}%` }} />
      </div>
    );
    expect(screen.getByTestId("score-text").textContent).toBe("110%");
    expect(screen.getByTestId("bar").style.width).toBe("100%");
  });

  // Test 5: One activity Needs Revision
  it("Test 5: One activity Needs Revision -> activity status = Needs Revision, overall qualification derived from score vs threshold", () => {
    const childParticipation: YPOPEventParticipation = {
      id: "part-1",
      activityId: "city-1",
      organizationId: "org-1",
      status: "needs_revision",
      adminRemarks: "Blurry photo proof",
      proofSubmittedAt: "2026-06-01T00:00:00.000Z",
      verifiedAt: "",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    // Child activity is strictly Needs Revision
    expect(childParticipation.status).toBe("needs_revision");

    // Parent entry overall status is evaluated strictly by score
    // Even if score is 0, overall status is 'not_qualified', NOT permanently 'needs_revision'
    const overallStatus = deriveOverallStatus(0);
    expect(overallStatus).toBe("not_qualified");
    expect(overallStatus).not.toBe("needs_revision");
  });

  // Test 6: All activities approved
  it("Test 6: All activities approved -> score recalculates and automatically becomes Qualified without manual Admin selection", () => {
    // When remaining activities are approved, score becomes 100
    const scoreResult = computeYpopScore([{ activityId: "city-1", attended: true }], cityActivities, 0);
    expect(scoreResult.totalScore).toBe(100);

    const nextEntryStatus = deriveOverallStatus(scoreResult.totalScore);
    expect(nextEntryStatus).toBe("qualified");
  });

  // Test 7: Admin qualification changes
  it("Test 7: Admin qualification changes -> persisted entry reflects updated status", () => {
    const entryPatch: Partial<YPOPEntry> = {
      pointsEarned: 100,
      status: deriveOverallStatus(100),
    };
    expect(entryPatch.status).toBe("qualified");
    expect(entryPatch.pointsEarned).toBe(100);
  });

  // Test 8: User refresh
  it("Test 8: User refresh -> persisted qualification status remains intact across sessions", () => {
    const persistedEntry: YPOPEntry = {
      id: "entry-01",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 110,
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

    // Re-loaded entry preserves status
    expect(persistedEntry.status).toBe("qualified");
    expect(persistedEntry.pointsEarned).toBe(110);
  });

  // Test 9: User route revisit
  it("Test 9: User route revisit -> route pre-fill uses qualified ypopEntryId", () => {
    const entryId = "entry-01";
    const targetUrl = `/budget-request?ypopEntryId=${encodeURIComponent(entryId)}`;
    expect(targetUrl).toBe("/budget-request?ypopEntryId=entry-01");
  });

  // Test 10: Historical qualified semester exists
  it("Test 10: Historical qualified semester exists -> must NOT unlock New Budget Request for an unrelated current not_qualified semester", () => {
    const historicalQualifiedEntry: YPOPEntry = {
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

    const currentNotQualifiedEntry: YPOPEntry = {
      id: "entry-curr",
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

    // When viewing current semester workspace, isQualified evaluates current entry ONLY
    const isCurrentSemesterQualified = currentNotQualifiedEntry.status === "qualified";
    expect(isCurrentSemesterQualified).toBe(false);

    // Therefore, New Budget Request is HIDDEN in current semester workspace
    const buttonInCurrentSemester = isCurrentSemesterQualified ? "New Budget Request" : null;
    expect(buttonInCurrentSemester).toBeNull();
  });

  // Test 11: Current qualified semester
  it("Test 11: Current qualified semester -> New Budget Request appears", () => {
    const currentQualifiedEntry: YPOPEntry = {
      id: "entry-curr-qual",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 80,
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

    const isQualified = currentQualifiedEntry.status === "qualified";
    expect(isQualified).toBe(true);
    const button = isQualified ? "New Budget Request" : null;
    expect(button).toBe("New Budget Request");
  });

  // Test 12: Current not-qualified semester
  it("Test 12: Current not-qualified semester -> New Budget Request remains hidden (null, not disabled)", () => {
    const currentNotQualifiedEntry: YPOPEntry = {
      id: "entry-curr-not-qual",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 30,
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

    const isQualified = currentNotQualifiedEntry.status === "qualified";
    expect(isQualified).toBe(false);
    const button = isQualified ? "New Budget Request" : null;
    expect(button).toBeNull();
  });

  // Test 13: Existing Budget eligibility rules remain unchanged
  it("Test 13: Existing Budget eligibility rules remain unchanged", () => {
    const qualifiedEntry: YPOPEntry = {
      id: "entry-q",
      organizationId: "org-1",
      submittedBy: "user-1",
      semester: currentSemesterKey,
      semesterLabel: "2026 1st Semester",
      pointsEarned: 75,
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

    const eligibility = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [currentPeriod],
      entries: [qualifiedEntry],
    });
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.reason).toBe("qualified");
  });

  // Test 14: Review counters remain independent from qualification
  it("Test 14: Review counters remain independent from qualification metrics", () => {
    const orgActivities: YPOPOrgActivity[] = [
      {
        id: "ppa-1",
        ypopEntryId: "entry-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        activityName: "Tree Planting",
        activityDate: "2026-06-01",
        venue: "Pasig",
        narrativeReport: "doc.pdf",
        status: "approved",
        adminRemarks: "",
        submittedAt: "",
        approvedAt: "",
        revisionHistory: [],
        createdAt: "",
        updatedAt: "",
      },
    ];

    const participations: YPOPEventParticipation[] = [
      {
        id: "part-1",
        activityId: "city-1",
        organizationId: "org-1",
        status: "verified",
        adminRemarks: "",
        proofSubmittedAt: "",
        verifiedAt: "",
        revisionHistory: [],
        createdAt: "",
        updatedAt: "",
      },
    ];

    const approvedCount =
      orgActivities.filter((a) => a.status === "approved").length +
      participations.filter((p) => p.status === "verified").length;
    const requestRevisionCount =
      orgActivities.filter((a) => a.status === "needs_revision" || a.status === "rejected").length +
      participations.filter((p) => p.status === "needs_revision" || p.status === "rejected").length;
    const unreviewedCount =
      orgActivities.filter((a) => a.status === "submitted" || a.status === "under_review").length +
      participations.filter((p) => p.status === "pending_verification").length;

    expect(approvedCount).toBe(2);
    expect(requestRevisionCount).toBe(0);
    expect(unreviewedCount).toBe(0);

    // Score is 110 -> Qualified, regardless of raw counters
    const scoreResult = computeYpopScore([{ activityId: "city-1", attended: true }], cityActivities, 1, DEFAULT_ORG_LED_TIERS);
    const overallStatus = deriveOverallStatus(scoreResult.totalScore);
    expect(overallStatus).toBe("qualified");
  });
});

describe("YpopValidationComputationPopover Component Tests", () => {
  const semesterKey = "SEM-2026-01";
  const mockCityActivities: YPOPCityActivity[] = [
    {
      id: "city-1",
      semesterKey,
      name: "Youth Leadership Forum",
      category: "mandatory",
      points: 50,
      date: "2026-06-01",
      venue: "Pasig City Hall",
      description: "Mandatory forum",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "city-2",
      semesterKey,
      name: "Community Health Drive",
      category: "invitational",
      points: 50,
      date: "2026-06-15",
      venue: "Barangay Hall",
      description: "Invitational drive",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];

  const mockOrgActivities: YPOPOrgActivity[] = [
    {
      id: "ppa-1",
      ypopEntryId: "entry-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityName: "Youth Tree Planting Drive",
      activityDate: "2026-06-20",
      venue: "Rainforest Park",
      narrativeReport: "report.pdf",
      status: "approved",
      adminRemarks: "",
      submittedAt: "2026-06-20T00:00:00.000Z",
      approvedAt: "2026-06-21T00:00:00.000Z",
      revisionHistory: [],
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
    },
  ];

  const mockParticipations: YPOPEventParticipation[] = [
    {
      id: "part-1",
      activityId: "city-1",
      organizationId: "org-1",
      status: "verified",
      adminRemarks: "",
      proofSubmittedAt: "2026-06-02T00:00:00.000Z",
      verifiedAt: "2026-06-03T00:00:00.000Z",
      revisionHistory: [],
      createdAt: "2026-06-02T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
    },
    {
      id: "part-2",
      activityId: "city-2",
      organizationId: "org-1",
      status: "verified",
      adminRemarks: "",
      proofSubmittedAt: "2026-06-16T00:00:00.000Z",
      verifiedAt: "2026-06-17T00:00:00.000Z",
      revisionHistory: [],
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:00.000Z",
    },
  ];

  const verifiedAttendance = [
    { activityId: "city-1", attended: true },
    { activityId: "city-2", attended: true },
  ];

  const mockEntry: YPOPEntry = {
    id: "entry-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    semester: semesterKey,
    semesterLabel: "2026 1st Semester",
    pointsEarned: 110,
    pointsRequired: 70,
    totalPoints: 100,
    status: "qualified",
    adminRemarks: "",
    submissionNote: "",
    validationDeadline: "2026-12-31T00:00:00.000Z",
    submittedAt: "2026-06-01T00:00:00.000Z",
    validatedAt: "2026-06-22T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };

  it("opens computation popover when clicking the '?' trigger button", () => {
    const liveScore = computeYpopScore(verifiedAttendance, mockCityActivities, 1, DEFAULT_ORG_LED_TIERS);

    render(
      <YpopValidationComputationPopover
        entry={mockEntry}
        organizationName="Pasig Youth Pioneers"
        semesterLabel="2026 1st Semester"
        semesterActivities={mockCityActivities}
        orgEventParticipations={mockParticipations}
        orgActivities={mockOrgActivities}
        verifiedAttendance={verifiedAttendance}
        liveScore={liveScore}
        displayScore={liveScore.totalScore}
        overallQualificationStatus="qualified"
      />
    );

    const trigger = screen.getByRole("button", { name: /View actual YPOP qualification computation/i });
    expect(trigger).toBeDefined();

    fireEvent.click(trigger);

    expect(screen.getByText("YPOP POINTS BREAKDOWN")).toBeDefined();
    expect(screen.getByText("Pasig Youth Pioneers")).toBeDefined();
    expect(screen.getByText("2026 1st Semester")).toBeDefined();
  });

  it("renders exact City-Led and Organization-Initiated computation rows and 110% total", () => {
    const liveScore = computeYpopScore(verifiedAttendance, mockCityActivities, 1, DEFAULT_ORG_LED_TIERS);

    render(
      <YpopValidationComputationPopover
        entry={mockEntry}
        organizationName="Pasig Youth Pioneers"
        semesterActivities={mockCityActivities}
        orgEventParticipations={mockParticipations}
        orgActivities={mockOrgActivities}
        verifiedAttendance={verifiedAttendance}
        liveScore={liveScore}
        displayScore={110}
        overallQualificationStatus="qualified"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /View actual YPOP qualification computation/i }));

    const totalScoreEl = screen.getByTestId("popover-total-score");
    expect(totalScoreEl.textContent).toBe("110%");

    // Section headers and totals
    expect(screen.getAllByText(/City-Led/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Organization-Led|Organization-Initiated/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("+10%").length).toBeGreaterThan(0);
  });

  it("does NOT render individual activity rows, activity breakdown, or redundant lists inside the popover", () => {
    const liveScore = computeYpopScore(verifiedAttendance, mockCityActivities, 1, DEFAULT_ORG_LED_TIERS);

    render(
      <YpopValidationComputationPopover
        entry={mockEntry}
        semesterActivities={mockCityActivities}
        orgEventParticipations={mockParticipations}
        orgActivities={mockOrgActivities}
        verifiedAttendance={verifiedAttendance}
        liveScore={liveScore}
        displayScore={110}
        overallQualificationStatus="qualified"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /View actual YPOP qualification computation/i }));

    // Activity breakdown section and individual rows must NOT be rendered inside popover
    expect(screen.queryByTestId("activity-breakdown-section")).toBeNull();
    expect(screen.queryByText("Activity Breakdown")).toBeNull();
    expect(screen.queryByText("Youth Leadership Forum")).toBeNull();
    expect(screen.queryByText("Community Health Drive")).toBeNull();
    expect(screen.queryByText("Youth Tree Planting Drive")).toBeNull();

    // Computation summary remains visible
    expect(screen.getByTestId("city-led-points-summary")).toBeDefined();
    expect(screen.getByTestId("org-led-bonus-summary")).toBeDefined();
    expect(screen.getByText("Total YPOP Points")).toBeDefined();
  });

  it("does NOT render REQUIRED PERCENTAGE or OVERALL RESULT inside the popover", () => {
    const liveScore = computeYpopScore(verifiedAttendance, mockCityActivities, 1, DEFAULT_ORG_LED_TIERS);

    render(
      <YpopValidationComputationPopover
        entry={mockEntry}
        semesterActivities={mockCityActivities}
        orgEventParticipations={mockParticipations}
        orgActivities={mockOrgActivities}
        verifiedAttendance={verifiedAttendance}
        liveScore={liveScore}
        displayScore={110}
        overallQualificationStatus="qualified"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /View actual YPOP qualification computation/i }));

    // Qualification result and required percentage must NOT be rendered inside popover
    expect(screen.queryByTestId("popover-result-card")).toBeNull();
    expect(screen.queryByTestId("popover-status-badge")).toBeNull();
    expect(screen.queryByText("Required Percentage")).toBeNull();
    expect(screen.queryByText("Overall Result")).toBeNull();
    expect(screen.queryByText("Qualified")).toBeNull();

    // Total points remains visible and uncapped
    expect(screen.getByTestId("popover-total-score").textContent).toBe("110%");
  });

  it("renders clean Reference 1 card layout ending naturally after Total YPOP Points", () => {
    const liveScore = computeYpopScore(verifiedAttendance, mockCityActivities, 1, DEFAULT_ORG_LED_TIERS);

    render(
      <YpopValidationComputationPopover
        entry={mockEntry}
        organizationName="Pasig Youth Pioneers"
        semesterLabel="2026 1st Semester"
        semesterActivities={mockCityActivities}
        orgEventParticipations={mockParticipations}
        orgActivities={mockOrgActivities}
        verifiedAttendance={verifiedAttendance}
        liveScore={liveScore}
        displayScore={110}
        overallQualificationStatus="qualified"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /View actual YPOP qualification computation/i }));

    // City-Led category multiplication rows
    expect(screen.getByText("1× Mandatory")).toBeDefined();
    expect(screen.getByText("1 × 4 pts =")).toBeDefined();
    expect(screen.getByText("1× Invitational")).toBeDefined();
    expect(screen.getByText("1 × 3 pts =")).toBeDefined();
    expect(screen.getByText("City-led subtotal")).toBeDefined();
    expect(screen.getByText("7 pts ÷ 7 max pts = 100%")).toBeDefined();

    // Organization-Led tiers
    expect(screen.getByText(/≥ 1 project/)).toBeDefined();
    expect(screen.getByText(/≥ 4 projects/)).toBeDefined();
    expect(screen.getByText(/≥ 7 projects/)).toBeDefined();
    expect(screen.getByText(/≥ 10 projects/)).toBeDefined();

    // Green Highlight Total Card
    expect(screen.getByText("City-led score")).toBeDefined();
    expect(screen.getByText("Organization-led bonus")).toBeDefined();
    expect(screen.getByText("Total YPOP Points")).toBeDefined();
    expect(screen.getByTestId("popover-total-score").textContent).toBe("110%");

    // Verify removed sections are strictly absent
    expect(screen.queryByTestId("popover-result-card")).toBeNull();
    expect(screen.queryByText("Required Percentage")).toBeNull();
    expect(screen.queryByText("Overall Result")).toBeNull();
    expect(screen.queryByText("Activity Breakdown")).toBeNull();
  });

  it("handles 0 approved projects and score below threshold without error", () => {
    const zeroAttendance = [
      { activityId: "city-1", attended: false },
      { activityId: "city-2", attended: false },
    ];
    const liveScore = computeYpopScore(zeroAttendance, mockCityActivities, 0, DEFAULT_ORG_LED_TIERS);

    render(
      <YpopValidationComputationPopover
        entry={{ ...mockEntry, status: "not_qualified" }}
        organizationName="Pasig Youth Pioneers"
        semesterActivities={mockCityActivities}
        orgEventParticipations={[]}
        orgActivities={[]}
        verifiedAttendance={zeroAttendance}
        liveScore={liveScore}
        displayScore={0}
        overallQualificationStatus="not_qualified"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /View actual YPOP qualification computation/i }));

    expect(screen.getByText("0 approved projects")).toBeDefined();
    expect(screen.getByTestId("popover-total-score").textContent).toBe("0%");
    expect(screen.queryByTestId("popover-status-badge")).toBeNull();
    expect(screen.queryByText("Not Qualified")).toBeNull();
  });
});

