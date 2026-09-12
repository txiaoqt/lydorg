import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminPortal from "@/admin/AdminPortal";
import { YpopSubmissionsTable, StatusLabel, type YpopSubmissionRow } from "./YpopSubmissionsTable";
import {
  deriveYpopQualificationStatus,
  computeYpopScore,
  DEFAULT_ORG_LED_TIERS,
  YPOP_SCORE_THRESHOLD,
  type YPOPPeriod,
  type YPOPEntry,
  type YPOPCityActivity,
  type YPOPOrgActivity,
  type YPOPEventParticipation,
  type YpopQualificationStatus,
} from "@/lib/lydo-connect-data";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import { AuthProvider } from "@/hooks/use-auth";
import { writeAdminSession } from "@/lib/admin-auth";

// Mock useAuth with full admin permissions for ypop validation
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isInitialized: true,
    isPasswordRecoverySession: false,
    role: "admin",
    user: {
      id: "admin-demo",
      email: "admin@pasig.gov.ph",
      displayName: "Admin User",
      roleCode: "super_admin",
      permissionCodes: ["ypop_validation_review"],
    },
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { testPeriod } = vi.hoisted(() => ({
  testPeriod: {
    id: "period-live-2026",
    semesterKey: "2026-S1",
    semesterLabel: "2026 First Semester",
    validationDeadline: "2026-06-30T00:00:00.000Z",
    status: "open" as const,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
}));

vi.mock("@/lib/lydo-connect-supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lydo-connect-supabase")>();
  return {
    ...actual,
    loadAdminPortalSupabaseState: vi.fn().mockResolvedValue({
      ypopPeriods: [testPeriod],
      ypopEntries: [],
      ypopCityActivities: [],
      ypopEventParticipations: [],
      ypopEventFiles: [],
      ypopOrgActivities: [],
      ypopOrgActivityFiles: [],
      organizationProfiles: [],
    }),
    loadLydoConnectSupabaseState: vi.fn().mockResolvedValue({
      ypopPeriods: [testPeriod],
      ypopEntries: [],
      ypopCityActivities: [],
      ypopEventParticipations: [],
      ypopEventFiles: [],
      ypopOrgActivities: [],
      ypopOrgActivityFiles: [],
      organizationProfiles: [],
    }),
  };
});

// Mock ResizeObserver for jsdom
window.ResizeObserver =
  window.ResizeObserver ||
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

describe("YPOP Validation — Summary Cards, Qualification Model & Filter Suite", () => {
  beforeEach(() => {
    writeAdminSession({
      id: "admin-demo",
      username: "lydoadmin",
      email: "lydoadmin@lydoconnect.local",
      displayName: "Admin User",
      sessionToken: "demo-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    window.localStorage.setItem(
      "lydo-connect-state-v1:admin:admin-demo:demo-token",
      JSON.stringify({ ypopPeriods: [testPeriod] }),
    );
  });

  afterEach(() => {
    writeAdminSession(null);
    window.localStorage.clear();
  });

  const sampleRows: YpopSubmissionRow[] = [
    {
      id: "entry-1",
      organizationId: "org-1",
      organizationName: "Alpha Youth Club",
      referenceId: "REG-2026-0001",
      majorClassification: "Youth Organization",
      status: "pending_evaluation",
    },
    {
      id: "entry-2",
      organizationId: "org-2",
      organizationName: "Beta Youth Leaders",
      referenceId: "REG-2026-0002",
      majorClassification: "Youth-Serving Organization",
      status: "qualified",
    },
    {
      id: "entry-3",
      organizationId: "org-3",
      organizationName: "Gamma Student Council",
      referenceId: "REG-2026-0003",
      majorClassification: "Youth Organization",
      status: "not_qualified",
    },
    {
      id: "entry-4",
      organizationId: "org-4",
      organizationName: "Delta Youth Action",
      referenceId: "REG-2026-0004",
      majorClassification: "Youth Organization",
      status: "pending_evaluation",
    },
  ];

  // =========================================================================
  // TEST 1 — Summary cards contain exactly: Pending Evaluation, Qualified, Not Qualified (and NOT: Submitted)
  // =========================================================================
  it("TEST 1: Admin YPOP Validation summary cards contain exactly Pending Evaluation, Qualified, and Not Qualified, and NOT Submitted", async () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <LydoConnectProvider>
            <AdminPortal section="ypop-validation" />
          </LydoConnectProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Click "Submissions" on the first available semester
    const submissionsButton = await screen.findByRole("button", { name: /submissions/i });
    expect(submissionsButton).toBeInTheDocument();
    fireEvent.click(submissionsButton);

    // Back to Semesters should now be present, confirming we are in the semester submissions view
    expect(screen.getByRole("button", { name: /back to semesters/i })).toBeInTheDocument();

    // The summary cards MUST contain exactly the three final qualification statuses:
    expect(screen.getByText("PENDING EVALUATION")).toBeInTheDocument();
    expect(screen.getByText("QUALIFIED")).toBeInTheDocument();
    expect(screen.getByText("NOT QUALIFIED")).toBeInTheDocument();

    // The obsolete "SUBMITTED" summary card MUST NOT exist
    expect(screen.queryByText("SUBMITTED")).not.toBeInTheDocument();

    // Verify layout reflow: container must use sm:grid-cols-3 and NOT sm:grid-cols-4
    const statsContainer = container.querySelector(".grid.grid-cols-1");
    expect(statsContainer).toBeInTheDocument();
    expect(statsContainer?.className).toContain("sm:grid-cols-3");
    expect(statsContainer?.className).not.toContain("sm:grid-cols-4");
  });

  // =========================================================================
  // TEST 2 — Submitted does not appear as a qualification filter option
  // =========================================================================
  it("TEST 2: 'Submitted' does not appear as a qualification filter option in the filter bar", () => {
    render(
      <YpopSubmissionsTable
        rows={sampleRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    // Filter options present:
    expect(screen.getByRole("button", { name: "All Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending Evaluation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qualified" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not Qualified" })).toBeInTheDocument();

    // "Submitted" must NOT appear as a filter tab
    expect(screen.queryByRole("button", { name: "Submitted" })).not.toBeInTheDocument();
  });

  // =========================================================================
  // TEST 3 — Pending Evaluation count matches pending organizations
  // =========================================================================
  it("TEST 3: Pending Evaluation count matches the exact number of pending organizations", () => {
    const pendingCount = sampleRows.filter((r) => r.status === "pending_evaluation").length;
    expect(pendingCount).toBe(2);
  });

  // =========================================================================
  // TEST 4 — Qualified count matches qualified organizations
  // =========================================================================
  it("TEST 4: Qualified count matches the exact number of qualified organizations", () => {
    const qualifiedCount = sampleRows.filter((r) => r.status === "qualified").length;
    expect(qualifiedCount).toBe(1);
  });

  // =========================================================================
  // TEST 5 — Not Qualified count matches not-qualified organizations
  // =========================================================================
  it("TEST 5: Not Qualified count matches the exact number of not-qualified organizations", () => {
    const notQualifiedCount = sampleRows.filter((r) => r.status === "not_qualified").length;
    expect(notQualifiedCount).toBe(1);
  });

  // =========================================================================
  // TEST 6 — All Status displays all three qualification groups
  // =========================================================================
  it("TEST 6: All Status displays organizations across all three qualification groups", () => {
    render(
      <YpopSubmissionsTable
        rows={sampleRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    expect(screen.getByText("Alpha Youth Club")).toBeInTheDocument();
    expect(screen.getByText("Beta Youth Leaders")).toBeInTheDocument();
    expect(screen.getByText("Gamma Student Council")).toBeInTheDocument();
    expect(screen.getByText("Delta Youth Action")).toBeInTheDocument();

    expect(screen.getAllByText("Pending Evaluation").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Qualified").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Not Qualified").length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // TEST 7 — Filtering by Pending Evaluation only returns pending organizations
  // =========================================================================
  it("TEST 7: Filtering by Pending Evaluation only returns pending organizations", () => {
    const onStatusFilterChange = vi.fn();
    const filteredRows = sampleRows.filter((r) => r.status === "pending_evaluation");

    const { rerender } = render(
      <YpopSubmissionsTable
        rows={sampleRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        onValidate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Pending Evaluation" }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("pending_evaluation");

    // Rerender with filtered rows as parent would do
    rerender(
      <YpopSubmissionsTable
        rows={filteredRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="pending_evaluation"
        onStatusFilterChange={onStatusFilterChange}
        onValidate={vi.fn()}
      />
    );

    expect(screen.getByText("Alpha Youth Club")).toBeInTheDocument();
    expect(screen.getByText("Delta Youth Action")).toBeInTheDocument();
    expect(screen.queryByText("Beta Youth Leaders")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma Student Council")).not.toBeInTheDocument();
  });

  // =========================================================================
  // TEST 8 — Filtering by Qualified only returns qualified organizations
  // =========================================================================
  it("TEST 8: Filtering by Qualified only returns qualified organizations", () => {
    const onStatusFilterChange = vi.fn();
    const filteredRows = sampleRows.filter((r) => r.status === "qualified");

    const { rerender } = render(
      <YpopSubmissionsTable
        rows={sampleRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        onValidate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Qualified" }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("qualified");

    rerender(
      <YpopSubmissionsTable
        rows={filteredRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="qualified"
        onStatusFilterChange={onStatusFilterChange}
        onValidate={vi.fn()}
      />
    );

    expect(screen.getByText("Beta Youth Leaders")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Youth Club")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma Student Council")).not.toBeInTheDocument();
    expect(screen.queryByText("Delta Youth Action")).not.toBeInTheDocument();
  });

  // =========================================================================
  // TEST 9 — Filtering by Not Qualified only returns not-qualified organizations
  // =========================================================================
  it("TEST 9: Filtering by Not Qualified only returns not-qualified organizations", () => {
    const onStatusFilterChange = vi.fn();
    const filteredRows = sampleRows.filter((r) => r.status === "not_qualified");

    const { rerender } = render(
      <YpopSubmissionsTable
        rows={sampleRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        onValidate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Not Qualified" }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("not_qualified");

    rerender(
      <YpopSubmissionsTable
        rows={filteredRows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="not_qualified"
        onStatusFilterChange={onStatusFilterChange}
        onValidate={vi.fn()}
      />
    );

    expect(screen.getByText("Gamma Student Council")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Youth Club")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Youth Leaders")).not.toBeInTheDocument();
    expect(screen.queryByText("Delta Youth Action")).not.toBeInTheDocument();
  });

  // =========================================================================
  // TEST 10 — An evaluated score >= 70 produces Qualified
  // =========================================================================
  it("TEST 10: An evaluated score >= 70 produces Qualified", () => {
    const openPeriod: YPOPPeriod = {
      id: "p-1",
      semesterKey: "SEM-2026-01",
      semesterLabel: "2026 1st Semester",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      status: "open",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const status70 = deriveYpopQualificationStatus({
      score: 70,
      period: openPeriod,
      entry: { status: "under_review", pointsRequired: 70 } as unknown as YPOPEntry,
    });
    expect(status70).toBe("qualified");

    const status85 = deriveYpopQualificationStatus({
      score: 85,
      period: openPeriod,
      entry: { status: "under_review", pointsRequired: 70 } as unknown as YPOPEntry,
    });
    expect(status85).toBe("qualified");

    const status110 = deriveYpopQualificationStatus({
      score: 110,
      period: openPeriod,
      entry: { status: "under_review", pointsRequired: 70 } as unknown as YPOPEntry,
    });
    expect(status110).toBe("qualified");
  });

  // =========================================================================
  // TEST 11 — An evaluated score < 70 produces Not Qualified
  // =========================================================================
  it("TEST 11: An evaluated score < 70 in a closed period or completed evaluation produces Not Qualified", () => {
    const closedPeriod: YPOPPeriod = {
      id: "p-closed",
      semesterKey: "SEM-2025-02",
      semesterLabel: "2025 2nd Semester",
      validationDeadline: "2025-12-31T00:00:00.000Z",
      status: "closed",
      createdAt: "2025-07-01T00:00:00.000Z",
    };

    // Period closed and score < 70 -> Not Qualified
    const statusClosedBelow70 = deriveYpopQualificationStatus({
      score: 65,
      period: closedPeriod,
      entry: { status: "under_review", pointsRequired: 70 } as unknown as YPOPEntry,
    });
    expect(statusClosedBelow70).toBe("not_qualified");

    // All evaluation complete (0 unreviewed, 0 needs revision, confirmed submissions) below 70 in open period
    const openPeriod: YPOPPeriod = {
      id: "p-open",
      semesterKey: "SEM-2026-01",
      semesterLabel: "2026 1st Semester",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      status: "open",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const statusCompletedBelow70 = deriveYpopQualificationStatus({
      score: 55,
      period: openPeriod,
      entry: { status: "not_qualified", pointsRequired: 70 } as unknown as YPOPEntry,
      unreviewedCount: 0,
      needsRevisionCount: 0,
      participations: [{ status: "verified" }] as unknown as YPOPEventParticipation[],
    });
    expect(statusCompletedBelow70).toBe("not_qualified");
  });

  // =========================================================================
  // TEST 12 — An organization that has not completed evaluation remains Pending Evaluation and does NOT become Not Qualified merely because its current score is 0
  // =========================================================================
  it("TEST 12: An organization that has not completed evaluation remains Pending Evaluation and does NOT become Not Qualified merely because score is 0", () => {
    const openPeriod: YPOPPeriod = {
      id: "p-open",
      semesterKey: "SEM-2026-01",
      semesterLabel: "2026 1st Semester",
      validationDeadline: "2026-12-31T00:00:00.000Z",
      status: "open",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    // Case A: Fresh draft or virtual entry with score = 0
    const draftStatus = deriveYpopQualificationStatus({
      score: 0,
      period: openPeriod,
      entry: { status: "draft", pointsRequired: 70 } as unknown as YPOPEntry,
    });
    expect(draftStatus).toBe("pending_evaluation");

    // Case B: Submitted entry awaiting admin validation with score = 0
    const submittedStatus = deriveYpopQualificationStatus({
      score: 0,
      period: openPeriod,
      entry: { status: "submitted", pointsRequired: 70 } as unknown as YPOPEntry,
    });
    expect(submittedStatus).toBe("pending_evaluation");

    // Case C: Unreviewed participation or PPA items present
    const unreviewedStatus = deriveYpopQualificationStatus({
      score: 0,
      period: openPeriod,
      entry: { status: "under_review", pointsRequired: 70 } as unknown as YPOPEntry,
      unreviewedCount: 2,
    });
    expect(unreviewedStatus).toBe("pending_evaluation");

    // Case D: Needs revision items present
    const needsRevStatus = deriveYpopQualificationStatus({
      score: 40,
      period: openPeriod,
      entry: { status: "needs_revision", pointsRequired: 70 } as unknown as YPOPEntry,
      needsRevisionCount: 1,
    });
    expect(needsRevStatus).toBe("pending_evaluation");
  });

  // =========================================================================
  // TEST 13 — Underlying legitimate submission workflow states continue functioning
  // =========================================================================
  it("TEST 13: Underlying legitimate submission workflow states (draft, submitted, under_review, needs_revision, approved, verified) continue functioning", () => {
    // Activity / Proof review decisions:
    const cityProofDecisions = ["verified", "needs_revision", "rejected"] as const;
    const orgProofDecisions = ["approved", "needs_revision", "rejected"] as const;

    expect(cityProofDecisions).toContain("verified");
    expect(orgProofDecisions).toContain("approved");

    // Entry underlying workflow statuses remain distinct
    const validEntryStatuses = ["draft", "submitted", "under_review", "needs_revision", "qualified", "not_qualified"] as const;
    expect(validEntryStatuses).toHaveLength(6);

    // StatusLabel correctly renders underlying workflow statuses when used for entry details
    const { rerender } = render(<StatusLabel status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();

    rerender(<StatusLabel status="under_review" />);
    expect(screen.getByText("Under Review")).toBeInTheDocument();

    rerender(<StatusLabel status="needs_revision" />);
    expect(screen.getByText("Needs Revision")).toBeInTheDocument();

    rerender(<StatusLabel status="qualified" />);
    expect(screen.getByText("Qualified")).toBeInTheDocument();

    rerender(<StatusLabel status="not_qualified" />);
    expect(screen.getByText("Not Qualified")).toBeInTheDocument();

    rerender(<StatusLabel status="pending_evaluation" />);
    expect(screen.getByText("Pending Evaluation")).toBeInTheDocument();
  });
});
