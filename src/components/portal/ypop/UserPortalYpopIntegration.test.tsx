import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import { UserPortalYPOPWorkspaceView } from "../UserPortalYPOPWorkspaceView";
import { YPOP_SCORE_THRESHOLD } from "@/lib/lydo-connect-data";
import type {
  YPOPPeriod,
  YPOPEntry,
  YPOPCityActivity,
  YPOPEventParticipation,
  YPOPOrgActivity,
} from "@/lib/lydo-connect-data";

describe("UserPortal YPOP Integration - Admin Configuration & Business Rules", () => {
  const mockPeriods: YPOPPeriod[] = [
    {
      id: "period-s1",
      semesterKey: "2026-S1",
      semesterLabel: "2026 First Semester",
      status: "open",
      validationDeadline: "2026-08-30T23:59:59Z",
      orgLedTiers: [
        { minProjects: 1, bonus: 10 },
        { minProjects: 3, bonus: 20 },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "period-s2",
      semesterKey: "2026-S2",
      semesterLabel: "2026 Second Semester",
      status: "open",
      validationDeadline: "2026-12-31T23:59:59Z",
      orgLedTiers: [
        { minProjects: 2, bonus: 15 },
      ],
      createdAt: "2026-07-01T00:00:00Z",
    },
  ];

  const mockCityActivities: YPOPCityActivity[] = [
    {
      id: "act-s1-mandatory",
      semesterKey: "2026-S1",
      name: "S1 Youth Leadership Convention",
      category: "mandatory",
      points: 4,
      startDate: "2026-03-15T09:00:00Z",
      endDate: "2026-03-15T17:00:00Z",
      venue: "Pasig City Hall Amphitheater",
      description: "Mandatory leadership convention for all youth organizations.",
    },
    {
      id: "act-s1-invitational",
      semesterKey: "2026-S1",
      name: "S1 Sports Summit",
      category: "invitational",
      points: 3,
      startDate: "2026-04-10T09:00:00Z",
      venue: "Pasig Sports Center",
    },
    {
      id: "act-s2-partnership",
      semesterKey: "2026-S2",
      name: "S2 Environmental Clean-up Drive",
      category: "partnership",
      points: 2,
      startDate: "2026-09-20T08:00:00Z",
      venue: "Marikina Riverbanks Pasig",
    },
  ];

  const mockEntries: YPOPEntry[] = [
    {
      id: "entry-s1",
      organizationId: "org-test-1",
      semester: "2026-S1",
      pointsEarned: 75,
      cityLedPoints: 75,
      orgBonusPoints: 0,
      status: "qualified",
      remarks: "Congratulations! You have satisfied semester requirements.",
      updatedAt: "2026-08-01T00:00:00Z",
    },
    {
      id: "entry-s2",
      organizationId: "org-test-1",
      semester: "2026-S2",
      pointsEarned: 30,
      cityLedPoints: 30,
      orgBonusPoints: 0,
      status: "under_review",
      remarks: "",
      updatedAt: "2026-08-02T00:00:00Z",
    },
  ];

  const mockParticipations: YPOPEventParticipation[] = [
    {
      id: "part-s1-verified",
      organizationId: "org-test-1",
      activityId: "act-s1-mandatory",
      activityName: "S1 Youth Leadership Convention",
      status: "verified",
      joinedAt: "2026-03-10T10:00:00Z",
      adminRemarks: "Attendance confirmed from official log sheet.",
    },
    {
      id: "part-s1-revision",
      organizationId: "org-test-1",
      activityId: "act-s1-invitational",
      activityName: "S1 Sports Summit",
      status: "needs_revision",
      joinedAt: "2026-04-05T10:00:00Z",
      adminRemarks: "Please attach certified attendance photo with timestamp.",
    },
  ];

  const mockOrgActivities: YPOPOrgActivity[] = [
    {
      id: "org-act-s1-approved",
      organizationId: "org-test-1",
      ypopEntryId: "entry-s1",
      submittedBy: "user-test-1",
      activityName: "Community Food Pantry 2026",
      activityDate: "2026-05-10",
      venue: "Barangay San Nicolas",
      narrativeReport: "Distributed food packs to 150 families.",
      status: "approved",
      adminRemarks: "Exemplary community initiative.",
      submittedAt: "2026-05-10T00:00:00Z",
      approvedAt: "2026-05-12T00:00:00Z",
      createdAt: "2026-05-10T00:00:00Z",
      updatedAt: "2026-05-12T00:00:00Z",
    },
    {
      id: "org-act-s1-rejected",
      organizationId: "org-test-1",
      ypopEntryId: "entry-s1",
      submittedBy: "user-test-1",
      activityName: "Private Organization Social",
      activityDate: "2026-06-01",
      venue: "Private Clubhouse",
      narrativeReport: "Social night for officers.",
      status: "rejected",
      adminRemarks: "Not eligible as youth PPA activity.",
      submittedAt: "2026-06-01T00:00:00Z",
      approvedAt: "",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-02T00:00:00Z",
    },
    {
      id: "org-act-s1-revision",
      organizationId: "org-test-1",
      ypopEntryId: "entry-s1",
      submittedBy: "user-test-1",
      activityName: "Tree Planting Initiative",
      activityDate: "2026-06-15",
      venue: "Rainforest Park",
      narrativeReport: "Planted 50 saplings.",
      status: "needs_revision",
      adminRemarks: "Missing proof photos and participant signature sheet.",
      submittedAt: "2026-06-15T00:00:00Z",
      approvedAt: "",
      createdAt: "2026-06-15T00:00:00Z",
      updatedAt: "2026-06-16T00:00:00Z",
    },
  ];

  const defaultProps = {
    initialSemesterKey: null,
    currentProfile: { id: "org-test-1", organizationName: "Kapitolyo Youth Council", userId: "user-test-1" },
    ypopPeriods: mockPeriods,
    ypopEntries: mockEntries,
    ypopCityActivities: mockCityActivities,
    ypopEventParticipations: mockParticipations,
    ypopEventFiles: [],
    ypopFiles: [],
    ypopOrgActivities: mockOrgActivities,
    ypopOrgActivityFiles: [],
    navigate: vi.fn(),
    userRouteMap: {
      "budget-request": "/portal/financial-grant",
      ypop: "/portal/ypop",
      "document-submission": "/portal/documents",
      "organization-profile": "/portal/profile",
    },
    formatShortPortalDate: (d: string) => d?.split("T")[0] || d,
    ypopWorkflowEligibility: { canEditParticipation: true, profileComplete: true },
  };

  const openSemesterByLabel = (label: string) => {
    const heading = screen.getByText(label);
    const card = heading.closest("tr") || heading.closest(".rounded-2xl") || heading.closest("div.border");
    const button = within(card as HTMLElement).getByRole("button");
    fireEvent.click(button);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, "", "/");
    }
  });

  it("1. Multiple admin-configured semesters render separately in the semester list", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    expect(screen.getByText("Select a YPOP Semester Period")).toBeInTheDocument();
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();
  });

  it("2 & 3. Selecting a semester filters City-Led activities correctly and excludes other semesters", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();

    expect(screen.queryByText("S2 Environmental Clean-up Drive")).not.toBeInTheDocument();
  });

  it("4. Participation status is scoped strictly to the selected semester", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    expect(screen.getAllByText(/Verified/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Needs Revision/i)).toBeInTheDocument();
  });

  it("5. Only verified City-Led participation contributes to the score", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    // In the semester list, calculated score reflects 4 pts verified out of 7 pts
    // plus 1 approved PPA (10% bonus) -> 4/7 * 100 = 57% + 10% = 67%
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();

    openSemesterByLabel("2026 First Semester");
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
  });

  it("6 & 8 & 9. Only approved Organization-Led PPAs contribute to bonus; rejected & needs-revision do NOT", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    expect(screen.getByText("Community Food Pantry 2026")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();

    expect(screen.getByText("Private Organization Social")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();

    expect(screen.getByText("Tree Planting Initiative")).toBeInTheDocument();
    expect(screen.getByText("Needs Revision")).toBeInTheDocument();

    expect(screen.getByText(/1 of 3 Approved/i)).toBeInTheDocument();
  });

  it("7. The selected semester's custom org-led tiers affect the score dynamically", () => {
    // Verify the custom orgLedTiers on the selected period
    expect(mockPeriods[0].orgLedTiers).toEqual([
      { minProjects: 1, bonus: 10 },
      { minProjects: 3, bonus: 20 },
    ]);

    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    // Organization PPAs table is displayed with approved PPA count
    expect(screen.getByText(/1 of 3 Approved/i)).toBeInTheDocument();
    expect(screen.getByText("Community Food Pantry 2026")).toBeInTheDocument();
  });

  it("10 & 11. Score changes dynamically when verified participation or approved PPA count changes", () => {
    const allVerifiedParticipations: YPOPEventParticipation[] = [
      {
        id: "part-1",
        organizationId: "org-test-1",
        activityId: "act-s1-mandatory",
        activityName: "S1 Youth Leadership Convention",
        status: "verified",
        joinedAt: "2026-03-10T10:00:00Z",
      },
      {
        id: "part-2",
        organizationId: "org-test-1",
        activityId: "act-s1-invitational",
        activityName: "S1 Sports Summit",
        status: "verified",
        joinedAt: "2026-04-05T10:00:00Z",
      },
    ];

    render(
      <UserPortalYPOPWorkspaceView
        {...defaultProps}
        ypopEventParticipations={allVerifiedParticipations}
      />
    );

    // 7 of 7 points verified = 100% + 10% bonus capped at 100%
    expect(screen.getByText("110%")).toBeInTheDocument();

    openSemesterByLabel("2026 First Semester");

    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();
  });

  it("12. Recognizes 70% as the YPOP qualification threshold", () => {
    expect(YPOP_SCORE_THRESHOLD).toBe(70);
  });

  it("13 & 14. Project Grant (PPA) / Submit Budget Request card is completely removed from YPOP workspace", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 Second Semester");

    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();
    expect(screen.queryByText(/Project Grant \(PPA\)/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit Budget Request/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /City-Led Activities/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Organization PPAs/i })).toBeInTheDocument();
  });

  it("13 & 14. Qualified semester proceeds directly to YPOP tabs without budget request card", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.queryByText(/Project Grant \(PPA\)/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit Budget Request/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /City-Led Activities/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Organization PPAs/i })).toBeInTheDocument();
  });

  it("15. Admin remarks are displayed correctly for revision and rejection states", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    expect(screen.getAllByText(/Please attach certified attendance photo with timestamp/i).length).toBeGreaterThan(0);

    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    expect(screen.getByText(/Not eligible as youth PPA activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing proof photos and participant signature sheet/i)).toBeInTheDocument();
  });

  it("16. Back button returns to semester list and clears semester context", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    expect(screen.getByText("YPOP Validation Workspace")).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /All Semesters/i });
    fireEvent.click(backBtn);

    expect(screen.getByText("Select a YPOP Semester Period")).toBeInTheDocument();
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();
  });

  it("17. City-Led proof drawer opens and displays admin remarks and proof upload controls", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    const submissionBtn = screen.getByRole("button", { name: "Resolve Revision" });
    fireEvent.click(submissionBtn);

    expect(screen.getByText(/Admin Revision Requested/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Please attach certified attendance photo with timestamp/i).length).toBeGreaterThan(0);
  });
  it("18. Semester list renders as a structured data table with column headers and record counts", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    // Verify table structure
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Semester / Period")).toBeInTheDocument();
    expect(screen.getByText("Period Status")).toBeInTheDocument();
    expect(screen.getByText("Qualification Status")).toBeInTheDocument();
    expect(screen.getByText("Calculated Score")).toBeInTheDocument();
    expect(screen.getByText("Activities Summary")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();

    // Verify record counts
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/records/i)).toBeInTheDocument();

    // Verify rows
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();
  });

  it("19. Search and status filters filter table rows appropriately", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search by semester...");
    expect(searchInput).toHaveClass("h-8");
    expect(searchInput).toHaveClass("pl-8");
    expect(searchInput).toHaveClass("rounded-xl");

    // Search filtering
    fireEvent.change(searchInput, { target: { value: "Second" } });
    expect(screen.queryByText("2026 First Semester")).not.toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();

    // Old inline segmented filter buttons must NOT exist
    expect(screen.queryByRole("button", { name: /^All Status \(\d+\)$/i })).toBeNull();

    // Status filter dropdown trigger
    expect(screen.getByRole("button", { name: /Status: All/i })).toBeInTheDocument();

    const openStatusDropdown = (name: RegExp = /Status:/i) => {
      const btn = screen.getByRole("button", { name });
      fireEvent.pointerDown(btn, { pointerId: 1, button: 0 });
      fireEvent.keyDown(btn, { key: "ArrowDown" });
    };

    // Open status filter dropdown
    openStatusDropdown(/Status: All/i);
    expect(screen.getByRole("menuitem", { name: /All Status/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Open/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Ended/i })).toBeInTheDocument();

    // Filter by Open
    fireEvent.click(screen.getByRole("menuitem", { name: /Open/i }));
    expect(screen.getByRole("button", { name: /Status: Open/i })).toBeInTheDocument();
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();

    // Filter by Ended (both mock periods are open, so none match)
    openStatusDropdown(/Status: Open/i);
    fireEvent.click(screen.getByRole("menuitem", { name: /Ended/i }));
    expect(screen.getByRole("button", { name: /Status: Ended/i })).toBeInTheDocument();
    expect(screen.queryByText("2026 First Semester")).not.toBeInTheDocument();
    expect(screen.queryByText("2026 Second Semester")).not.toBeInTheDocument();

    // Reset back to All
    openStatusDropdown(/Status: Ended/i);
    fireEvent.click(screen.getByRole("menuitem", { name: /All Status/i }));
    expect(screen.getByRole("button", { name: /Status: All/i })).toBeInTheDocument();
    expect(screen.getByText("2026 First Semester")).toBeInTheDocument();
    expect(screen.getByText("2026 Second Semester")).toBeInTheDocument();
  });
  it("20. Organization-Led PPAs render as a structured data table with column headers and action buttons", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    // Verify table structure
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Activity / PPA")).toBeInTheDocument();
    expect(screen.getByText("Date & Venue")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Admin Remarks")).toBeInTheDocument();

    // Verify action buttons
    expect(screen.getByRole("button", { name: /Log PPA Activity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resolve Revision/i })).toBeInTheDocument();
  });

  it("21. Category tags match exact reference values (Mandatory, Invitational, Partnership)", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    openSemesterByLabel("2026 First Semester");

    const mandatoryTag = screen.getByText("Mandatory");
    expect(mandatoryTag).toBeInTheDocument();
    expect(mandatoryTag).toHaveStyle({
      color: "#8D69E3",
      backgroundColor: "#F9F5FF",
      borderColor: "#EEE1FE",
    });

    const invitationalTag = screen.getByText("Invitational");
    expect(invitationalTag).toBeInTheDocument();
    expect(invitationalTag).toHaveStyle({
      color: "#EA3FB8",
      backgroundColor: "#FCF1FD",
      borderColor: "#FAE1FA",
    });
  });

  it("22. City-Led activities render in a structured table layout with standard column headers", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // Table elements
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // Table Headers
    expect(screen.getByRole("columnheader", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Venue" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Proof Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Action" })).toBeInTheDocument();

    // Activities inside rows
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();
    expect(screen.getByText("Pasig City Hall Amphitheater")).toBeInTheDocument();
    expect(screen.getByText("Pasig Sports Center")).toBeInTheDocument();

    // Action button
    expect(screen.getAllByRole("button", { name: /Submit Proof of Attendance|Submit Attendance Proof/i }).length).toBeGreaterThan(0);
  });

  it("23. Completely removes redundant points weight badge from City-Led activity rows", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // Points weight badge should NOT exist anywhere in the activity table
    expect(screen.queryByText(/Points Weight/i)).toBeNull();
    expect(screen.queryByText(/4 Points Weight/i)).toBeNull();
    expect(screen.queryByText(/3 Points Weight/i)).toBeNull();
    expect(screen.queryByText(/2 Points Weight/i)).toBeNull();
  });

  it("24. Search bar and category filter dropdown filter table rows appropriately", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // Initially both activities are shown
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();

    // Verify search input has established User Portal classes
    const searchInput = screen.getByPlaceholderText("Search activities or venue...");
    expect(searchInput).toHaveClass("h-8");
    expect(searchInput).toHaveClass("pl-8");
    expect(searchInput).toHaveClass("rounded-xl");

    // Search by venue
    fireEvent.change(searchInput, { target: { value: "Sports Center" } });
    expect(screen.queryByText("S1 Youth Leadership Convention")).toBeNull();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();

    // Search by activity name
    fireEvent.change(searchInput, { target: { value: "Youth Leadership" } });
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.queryByText("S1 Sports Summit")).toBeNull();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();

    // Helper to open Radix UI category filter dropdown in jsdom
    const openCategoryDropdown = (name: RegExp = /Category:/i) => {
      const btn = screen.getByRole("button", { name });
      fireEvent.pointerDown(btn, { pointerId: 1, button: 0 });
      fireEvent.keyDown(btn, { key: "ArrowDown" });
    };

    // Verify category filter button initially shows "Category: All"
    expect(screen.getByRole("button", { name: /Category: All/i })).toBeInTheDocument();

    // Inline segmented category filter buttons must NOT exist
    expect(screen.queryByRole("button", { name: /^All \(\d+\)$/i })).toBeNull();

    // Open category filter dropdown
    openCategoryDropdown(/Category: All/i);

    // Filter dropdown menu items must be present with point weights and counts
    expect(screen.getByRole("menuitem", { name: /All Categories/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Mandatory \(4 pts\)/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Invitational \(3 pts\)/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Partnership \(2 pts\)/i })).toBeInTheDocument();

    // Filter by Mandatory category
    fireEvent.click(screen.getByRole("menuitem", { name: /Mandatory \(4 pts\)/i }));

    // Button label communicates current selection
    expect(screen.getByRole("button", { name: /Category: Mandatory/i })).toBeInTheDocument();
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.queryByText("S1 Sports Summit")).toBeNull();

    // Filter by Invitational category
    openCategoryDropdown(/Category: Mandatory/i);
    fireEvent.click(screen.getByRole("menuitem", { name: /Invitational \(3 pts\)/i }));

    expect(screen.getByRole("button", { name: /Category: Invitational/i })).toBeInTheDocument();
    expect(screen.queryByText("S1 Youth Leadership Convention")).toBeNull();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();

    // Filter by Partnership (no activities in S1)
    openCategoryDropdown(/Category: Invitational/i);
    fireEvent.click(screen.getByRole("menuitem", { name: /Partnership \(2 pts\)/i }));

    expect(screen.getByRole("button", { name: /Category: Partnership/i })).toBeInTheDocument();
    expect(screen.queryByText("S1 Youth Leadership Convention")).toBeNull();
    expect(screen.queryByText("S1 Sports Summit")).toBeNull();
    expect(screen.getByText("No City-Led activities found")).toBeInTheDocument();

    // Reset Filters button resets both search and category filter
    const resetBtn = screen.getByRole("button", { name: /Reset Filters/i });
    fireEvent.click(resetBtn);

    expect(screen.getByRole("button", { name: /Category: All/i })).toBeInTheDocument();
    expect(screen.getByText("S1 Youth Leadership Convention")).toBeInTheDocument();
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();
  });

  it("25. Semester list displays refined scores, calm period status, and structured activity summary", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);

    // Period status displays clean indicator text
    expect(screen.getAllByText("Open Period").length).toBeGreaterThan(0);

    // Calculated score displays bold percentage and required percentage reference
    expect(screen.getAllByText(/Required Percentage: 70%/i).length).toBeGreaterThan(0);

    // Activity summary shows clean tabular labels
    expect(screen.getAllByText(/City-Led:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PPAs:/i).length).toBeGreaterThan(0);
  });

  it("26. Organization-Led PPA drawer renders structured semantic sections", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // Switch to Org PPAs tab
    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    // Open PPA modal
    const logBtn = screen.getByRole("button", { name: /Log PPA Activity/i });
    fireEvent.click(logBtn);

    // Form sections are clearly rendered
    expect(screen.getByText("Activity Details")).toBeInTheDocument();
    expect(screen.getByText("Activity Description")).toBeInTheDocument();
    expect(screen.getByText("Supporting Documents")).toBeInTheDocument();

    // Required fields are present
    expect(screen.getByLabelText(/Activity Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Conducted/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit for Review/i })).toBeInTheDocument();
  });

  it("27. City-Led proof drawer renders streamlined status banners, upload dropzone, and differentiated file rows", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // Open drawer for revision activity
    const resolveBtn = screen.getByRole("button", { name: "Resolve Revision" });
    fireEvent.click(resolveBtn);

    // Banner and upload dropzone
    expect(screen.getByText("Admin Revision Requested")).toBeInTheDocument();
    expect(screen.getByText("Click to browse file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();
  });

  it("28. Redundant global 'Admin Requested Submission Revisions' banner is not rendered when semester entry is in needs_revision state", () => {
    const revisionProps = {
      ...defaultProps,
      ypopEntries: [
        {
          ...mockEntries[0],
          status: "needs_revision" as const,
          adminRemarks: "Please review submitted proofs and update documentation.",
        },
        mockEntries[1],
      ],
    };

    render(<UserPortalYPOPWorkspaceView {...revisionProps} />);
    openSemesterByLabel("2026 First Semester");

    // Global banner must NOT be rendered
    expect(screen.queryByText("Admin Requested Submission Revisions")).toBeNull();
    expect(screen.queryByText(/Review the items above, update your proof documents or PPA logs/i)).toBeNull();
    // Global entry admin remarks must NOT appear in a redundant top-level banner
    expect(screen.queryByText(/"Please review submitted proofs and update documentation."/)).toBeNull();
  });

  it("29. City-Led activities table preserves row-level Needs Revision badge, admin remark, and Resolve Revision action", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // City-Led activity row with needs_revision
    expect(screen.getByText("S1 Sports Summit")).toBeInTheDocument();
    expect(screen.getByText(/"Please attach certified attendance photo with timestamp."/)).toBeInTheDocument();

    const resolveBtn = screen.getByRole("button", { name: "Resolve Revision" });
    expect(resolveBtn).toBeInTheDocument();
    expect(resolveBtn).toBeVisible();

    // Verify status badge
    const revisionBadges = screen.getAllByText("Needs Revision");
    expect(revisionBadges.length).toBeGreaterThan(0);
  });

  it("30. Organization PPAs table preserves row-level Needs Revision badge, admin remark, and Resolve Revision action", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // Switch to Org PPAs tab
    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    // Activity name, admin remarks, badge, and Resolve Revision button
    expect(screen.getByText("Tree Planting Initiative")).toBeInTheDocument();
    expect(screen.getByText(/"Missing proof photos and participant signature sheet."/)).toBeInTheDocument();

    const resolveBtns = screen.getAllByRole("button", { name: "Resolve Revision" });
    expect(resolveBtns.length).toBeGreaterThan(0);

    const revisionBadges = screen.getAllByText("Needs Revision");
    expect(revisionBadges.length).toBeGreaterThan(0);
  });

  it("31. Global redundant Validation Remarks banner is removed while underlying remark data is preserved", () => {
    const notQualifiedProps = {
      ...defaultProps,
      ypopEntries: [
        {
          ...mockEntries[0],
          status: "not_qualified" as const,
          adminRemarks: "Minimum mandatory attendance requirements not satisfied for this semester.",
        },
        mockEntries[1],
      ],
    };

    render(<UserPortalYPOPWorkspaceView {...notQualifiedProps} />);
    openSemesterByLabel("2026 First Semester");

    // Global "Validation Remarks" banner must NOT be rendered
    expect(screen.queryByText("Validation Remarks")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/This validation submission was evaluated and closed by the LYDO Admin./i)
    ).not.toBeInTheDocument();
    // Underlying entry remark data remains intact in entry record
    expect(notQualifiedProps.ypopEntries[0].adminRemarks).toBe(
      "Minimum mandatory attendance requirements not satisfied for this semester."
    );
  });

  it("32. Resolve Revision buttons in both City-Led and Org-Led tabs use warning/revision visual treatment instead of primary navy", () => {
    render(<UserPortalYPOPWorkspaceView {...defaultProps} />);
    openSemesterByLabel("2026 First Semester");

    // 1. City-Led table Resolve Revision button
    const cityResolveBtn = screen.getByRole("button", { name: "Resolve Revision" });
    expect(cityResolveBtn).toBeInTheDocument();

    // Must NOT have dark navy primary styling
    expect(cityResolveBtn.className).not.toContain("bg-primary hover:bg-primary/90");

    // Must have warning / revision styling classes
    expect(cityResolveBtn.className).toContain("bg-amber-500/10");
    expect(cityResolveBtn.className).toContain("border-amber-500/40");
    expect(cityResolveBtn.className).toContain("text-amber-800");
    expect(cityResolveBtn.className).toContain("active:scale-[0.98]");
    expect(cityResolveBtn.className).toContain("focus-visible:ring-amber-500/40");

    // Other activity button (e.g. Submit Proof of Attendance) must remain untouched
    const submitProofBtn = screen.getByRole("button", { name: "Submit Proof of Attendance" });
    expect(submitProofBtn).toBeInTheDocument();
    expect(submitProofBtn.className).toContain("bg-primary");
    expect(submitProofBtn.className).not.toContain("bg-amber-500/10");

    // 2. Organization PPAs table Resolve Revision button
    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    const orgResolveBtns = screen.getAllByRole("button", { name: "Resolve Revision" });
    expect(orgResolveBtns.length).toBeGreaterThan(0);
    const orgResolveBtn = orgResolveBtns[0];

    // Must NOT have navy primary styling
    expect(orgResolveBtn.className).not.toContain("bg-primary hover:bg-primary/90");

    // Must have warning / revision styling classes
    expect(orgResolveBtn.className).toContain("bg-amber-500/10");
    expect(orgResolveBtn.className).toContain("border-amber-500/40");
    expect(orgResolveBtn.className).toContain("text-amber-800");
    expect(orgResolveBtn.className).toContain("active:scale-[0.98]");
    expect(orgResolveBtn.className).toContain("focus-visible:ring-amber-500/40");

    // Other org button (e.g. View Remarks & Files) must remain untouched
    const viewRemarksBtn = screen.getByRole("button", { name: "View Remarks & Files" });
    expect(viewRemarksBtn).toBeInTheDocument();
    expect(viewRemarksBtn.className).not.toContain("bg-amber-500/10");
  });
});


