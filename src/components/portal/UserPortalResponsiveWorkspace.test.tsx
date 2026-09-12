import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { UserPortalLiquidationWorkspaceView } from "./UserPortalLiquidationWorkspaceView";
import { UserPortalDocumentWorkspaceView } from "./UserPortalDocumentWorkspaceView";
import { UserPortalBudgetWorkspaceView } from "./UserPortalBudgetWorkspaceView";
import { UserPortalYPOPWorkspaceView } from "./UserPortalYPOPWorkspaceView";
import { UserPortalTemplatesWorkspaceView } from "./UserPortalTemplatesWorkspaceView";
import { UserPortalNewsWorkspaceView } from "./UserPortalNewsWorkspaceView";
import { UserPortalShell } from "./UserPortalShell";
import { userNavigationGroups } from "@/lib/lydo-connect-data";
import { PortalDocumentPreviewModal } from "./PortalDocumentPreviewModal";
import { PortalAttachedDocumentDrawer } from "./PortalAttachedDocumentDrawer";
import { PortalDocumentDrawer } from "./PortalDocumentDrawer";

// Mock resize observer and matchMedia for tests
beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

describe("UserPortalLiquidationWorkspaceView Responsive Behavior", () => {
  const mockReport = {
    id: "rep-1",
    budgetRequestId: "br-1",
    status: "submitted",
    createdAt: "2026-08-10T00:00:00Z",
    deadlineAt: "2026-08-20T00:00:00Z",
  };

  const mockBudget = {
    id: "br-1",
    activityTitle: "Youth Leadership Summit 2026",
    purposeCategory: "Leadership",
    venue: "Pasig City Hall",
    releasedAmount: 25000,
  };

  const mockFilesMap = new Map([
    [
      "rep-1",
      [
        {
          id: "file-1",
          fileName: "summit-liquidation.pdf",
          fileUrl: "https://example.com/summit.pdf",
          fileSize: 102400,
          uploadedAt: "2026-08-11T00:00:00Z",
        },
      ],
    ],
  ]);

  const defaultProps: any = {
    liquidationWorkflowEligibility: { eligible: true },
    liquidationReports: [mockReport],
    budgetRequests: [mockBudget],
    liquidationFilesByReportId: mockFilesMap,
    liquidationNotesByReportId: {},
    setLiquidationNotesByReportId: vi.fn(),
    submittingLiquidationId: null,
    liquidationFileInputRef: { current: null },
    liquidationUploadTargetId: null,
    setLiquidationUploadTargetId: vi.fn(),
    handleLiquidationFileUpload: vi.fn(),
    openFile: vi.fn(),
    navigate: vi.fn(),
    searchParams: new URLSearchParams("reportId=rep-1"),
    userRouteMap: { "liquidation-reporting": "/liquidation-reporting" },
    buildPublicRecordCode: () => "LR-2026-001",
    formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
    formatShortPortalDate: () => "Aug 20, 2026",
    formatDateTimeLabel: () => "Aug 11, 2026",
    formatStatusLabel: (s: string) => s,
  };

  it("renders Desktop Sheet ONLY and NOT Mobile Dialog on desktop viewport (>= 1024px)", () => {
    // Set window innerWidth to 1280px (desktop)
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<UserPortalLiquidationWorkspaceView {...defaultProps} />);

    // On desktop, the Sheet's "Close Drawer" button must be in the document
    expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();

    // The mobile dialog's aria-label "Close modal" must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /Close modal/i })).not.toBeInTheDocument();
  });

  it("renders Mobile Dialog ONLY and NOT Desktop Sheet on mobile viewport (< 1024px)", () => {
    // Set window innerWidth to 375px (mobile)
    window.innerWidth = 375;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: !query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<UserPortalLiquidationWorkspaceView {...defaultProps} />);

    // On mobile, the Dialog's "Close modal" button must be in the document
    expect(screen.getByRole("button", { name: /Close modal/i })).toBeInTheDocument();

    // The desktop Sheet's "Close Drawer" button must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /Close Drawer/i })).not.toBeInTheDocument();

    // Mobile report action buttons must be present
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
  });
});

describe("UserPortalDocumentWorkspaceView Responsive Layout", () => {
  const mockDocs = [
    {
      id: "doc-1",
      title: "Constitution and By-Laws",
      description: "Upload the official CBL document.",
    },
  ];

  const defaultProps: any = {
    registrationPrerequisites: { canAccessDocuments: true, profileComplete: true },
    documentRequirements: mockDocs,
    docFiles: {},
    templatesById: {},
    navigate: vi.fn(),
    userRouteMap: { "document-submission": "/document-submission" },
    formatDateTimeLabel: () => "Aug 11, 2026",
    formatShortPortalDate: () => "Aug 11, 2026",
    getDocumentPrimaryFileTypeLabel: () => "PDF",
  };

  it("renders Submission Guidelines and document cards properly", () => {
    render(<UserPortalDocumentWorkspaceView {...defaultProps} />);

    // Verify Submission Guidelines text exists
    const guidelinesHeadings = screen.getAllByText(/Submission Guidelines/i);
    expect(guidelinesHeadings.length).toBeGreaterThan(0);

    // Verify Document card is rendered with title
    expect(screen.getByText("Constitution and By-Laws")).toBeInTheDocument();
    expect(screen.getByText("Upload the official CBL document.")).toBeInTheDocument();
  });
});

describe("UserPortalBudgetWorkspaceView Responsive Behavior", () => {
  const mockBudgetRequest = {
    id: "br-1",
    activityTitle: "Youth Leadership Seminar 2026",
    purposeCategory: "Capability Building",
    venue: "Pasig City Youth Center",
    requestedAmount: 50000,
    status: "submitted",
    createdAt: "2026-08-10T00:00:00Z",
    activityDate: "2026-08-25T00:00:00Z",
  };

  const mockFilesMap = new Map([
    [
      "br-1",
      [
        {
          id: "file-br-1",
          fileName: "leadership-proposal.pdf",
          fileUrl: "https://example.com/proposal.pdf",
          fileSize: 81920,
          uploadedAt: "2026-08-11T00:00:00Z",
        },
      ],
    ],
  ]);

  const defaultProps: any = {
    budgetWorkflowEligibility: { eligible: true },
    budgetRequests: [mockBudgetRequest],
    budgetFilesByRequestId: mockFilesMap,
    budgetNotesByRequestId: {},
    submittingBudgetId: null,
    showBudgetForm: false,
    setShowBudgetForm: vi.fn(),
    editingBudgetRequest: null,
    startEditingBudgetRequest: vi.fn(),
    handleDeleteBudgetRequest: vi.fn(),
    openFile: vi.fn(),
    navigate: vi.fn(),
    searchParams: new URLSearchParams("budgetRequestId=br-1"),
    userRouteMap: { "budget-request": "/budget-request" },
    buildPublicRecordCode: () => "BR-2026-001",
    formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
    formatShortPortalDate: () => "Aug 25, 2026",
    formatDateTimeLabel: () => "Aug 11, 2026",
    formatStatusLabel: (s: string) => s,
    newActivityTitle: "",
    setNewActivityTitle: vi.fn(),
    newActivityDescription: "",
    setNewActivityDescription: vi.fn(),
    newPurposeCategory: "",
    setNewPurposeCategory: vi.fn(),
    newActivityDate: "",
    setNewActivityDate: vi.fn(),
    newVenue: "",
    setNewVenue: vi.fn(),
    newRequestedAmount: "",
    setNewRequestedAmount: vi.fn(),
    newRemarks: "",
    setNewRemarks: vi.fn(),
    handleCreateOrUpdateBudgetRequest: vi.fn(),
  };

  it("renders Desktop Sheet ONLY and NOT Mobile Dialog on desktop viewport (>= 1024px)", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<UserPortalBudgetWorkspaceView {...defaultProps} />);

    // On desktop, the Sheet's "Close Drawer" button must be in the document
    expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();

    // The mobile dialog's aria-label "Close modal" must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /Close modal/i })).not.toBeInTheDocument();
  });

  it("renders Mobile Dialog ONLY and NOT Desktop Sheet on mobile viewport (< 1024px)", () => {
    window.innerWidth = 375;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: !query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<UserPortalBudgetWorkspaceView {...defaultProps} />);

    // On mobile, the Dialog's "Close modal" button must be in the document
    expect(screen.getByRole("button", { name: /Close modal/i })).toBeInTheDocument();

    // The desktop Sheet's "Close Drawer" button must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /Close Drawer/i })).not.toBeInTheDocument();

    // Mobile report action buttons must be present
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
  });
});

describe("UserPortalYPOPWorkspaceView Responsive Layout", () => {
  const mockPeriod = {
    id: "period-1",
    semesterKey: "2026-s2",
    semesterLabel: "2nd Semester 2026",
    submissionDeadline: "2026-08-30T00:00:00Z",
    validationDeadline: "2026-08-30T00:00:00Z",
    status: "open" as const,
    orgLedTiers: [],
    createdAt: "2026-01-01T00:00:00Z",
  };

  const mockActivities = [
    {
      id: "act-1",
      semesterKey: "2026-s2",
      name: "Pasig Youth Leadership Summit",
      title: "Pasig Youth Leadership Summit",
      date: "2026-08-20T00:00:00Z",
      startDate: "2026-08-20T00:00:00Z",
      endDate: "2026-08-20T00:00:00Z",
      venue: "Pasig City Hall",
      category: "institutionalized" as const,
      points: 15,
      description: "Leadership development workshop for youth organization officers.",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const defaultYpopProps: any = {
    initialSemesterKey: "2026-s2",
    ypopWorkflowEligibility: { canEditParticipation: true },
    currentProfile: { id: "org-1", organizationName: "Tadz Youth Group" },
    ypopPeriods: [mockPeriod],
    ypopEntries: [
      {
        id: "entry-1",
        organizationId: "org-1",
        semester: "2026-s2",
        pointsEarned: 75,
        pointsRequired: 70,
        totalPoints: 100,
        status: "qualified",
        cityLedAttendance: [],
        orgLedProjectCount: 0,
        validationDeadline: "2026-08-30T00:00:00Z",
      },
    ],
    ypopCityActivities: mockActivities,
    ypopEventParticipations: [
      {
        id: "part-1",
        organizationId: "org-1",
        activityId: "act-1",
        title: "City-Led Event Attended",
        description: "Organized by PCYDO Pasig City",
        date: "2026-08-20T00:00:00Z",
        status: "verified",
      },
    ],
    ypopEventFiles: [],
    ypopFiles: [],
    ypopOrgActivities: [],
    ypopOrgActivityFiles: [],
    activeEntry: {
      id: "entry-1",
      organizationId: "org-1",
      semester: "2026-s2",
      pointsEarned: 75,
      pointsRequired: 70,
      totalPoints: 100,
      status: "qualified",
    },
    navigate: vi.fn(),
    userRouteMap: { "budget-request": "/financial-grant", ypop: "/ypop" },
    openFile: vi.fn(),
    formatDateTimeLabel: () => "Aug 20, 2026",
    formatShortPortalDate: () => "Aug 20, 2026",
    setYpopOrgActivityModalOpen: vi.fn(),
  };

  it("renders semester workspace with responsive header, tabs, and activities", () => {
    const { container } = render(<UserPortalYPOPWorkspaceView {...defaultYpopProps} />);

    // Verify responsive header layout adapts with flex-col md:flex-row
    const headerBanner = container.querySelector(".md\\:flex-row");
    expect(headerBanner).toBeInTheDocument();

    // Verify responsive horizontal scroll on tab container
    const tabScrollContainer = container.querySelector(".overflow-x-auto");
    expect(tabScrollContainer).toBeInTheDocument();

    // Verify activities are listed
    expect(screen.getAllByText("Pasig Youth Leadership Summit").length).toBeGreaterThan(0);

    // Verify qualified organization sees active New Budget Request button
    const budgetBtn = screen.getByRole("button", { name: /New Budget Request/i });
    expect(budgetBtn).toBeInTheDocument();

    // Verify tab switching to Organization PPAs and logging action
    const orgTabBtn = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTabBtn);
    expect(screen.getByRole("button", { name: /Log PPA Activity/i })).toBeInTheDocument();
  });

  it("renders semester list with responsive table overflow container when no semester is selected", () => {
    const listProps = {
      ...defaultYpopProps,
      initialSemesterKey: null,
    };
    const { container } = render(<UserPortalYPOPWorkspaceView {...listProps} />);

    // Verify responsive table container provides horizontal scroll on narrow screens
    const tableWrapper = container.querySelector(".overflow-x-auto");
    expect(tableWrapper).toBeInTheDocument();
    expect(tableWrapper?.querySelector("table")).toBeInTheDocument();

    // Verify responsive thead and row grid/table layout classes
    const thead = tableWrapper?.querySelector("thead");
    expect(thead?.className).toContain("hidden md:table-header-group");

    const row = tableWrapper?.querySelector("tbody tr");
    expect(row?.className).toContain("grid");
    expect(row?.className).toContain("md:table-row");

    // Verify semester period row is rendered with all mobile priority elements
    expect(screen.getByText("2nd Semester 2026")).toBeInTheDocument();
    expect(screen.getByText(/Open Period/i)).toBeInTheDocument();
    expect(screen.getByText("Qualified")).toBeInTheDocument();
    expect(screen.getByText(/Required Percentage/i)).toBeInTheDocument();
    expect(screen.getByText(/City-Led:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View Evaluation Result/i })).toBeInTheDocument();
  });

  it("renders City-Led and Org-Led activities with responsive table row layout", () => {
    const { container } = render(<UserPortalYPOPWorkspaceView {...defaultYpopProps} />);

    // In City-Led tab, verify table has responsive row layout
    const cityTable = container.querySelector(".overflow-x-auto table");
    expect(cityTable).toBeInTheDocument();

    const cityThead = cityTable?.querySelector("thead");
    expect(cityThead?.className).toContain("hidden md:table-header-group");

    const cityRow = cityTable?.querySelector("tbody tr");
    expect(cityRow?.className).toContain("grid");
    expect(cityRow?.className).toContain("md:table-row");

    // Switch to Org-Led tab
    const orgTab = screen.getByRole("button", { name: /Organization PPAs/i });
    fireEvent.click(orgTab);

    // Verify Org-Led table has responsive row layout
    const orgTable = container.querySelector(".overflow-x-auto table");
    expect(orgTable).toBeInTheDocument();
    const orgThead = orgTable?.querySelector("thead");
    expect(orgThead?.className).toContain("hidden md:table-header-group");
  });
});

describe("UserPortalTemplatesWorkspaceView Responsive Layout", () => {
  const mockTemplates = [
    {
      id: "tpl-1",
      title: "Constitution and By-Laws",
      description: "Upload the signed constitution and by-laws.",
      fileUrl: "https://example.com/cbl.pdf",
      fileSize: 81612,
      category: "Registration Form",
      isRequired: true,
      updatedAt: "2026-08-07T13:50:00Z",
    },
    {
      id: "tpl-2",
      title: "Directory of Officers and Members",
      description: "Complete list of active members.",
      fileUrl: "https://example.com/directory.xlsx",
      fileSize: 45056,
      category: "Reference Guide",
      isRequired: false,
      updatedAt: "2026-08-08T10:00:00Z",
    },
  ];

  const defaultTemplateProps = {
    publicTemplates: mockTemplates,
    openPreview: vi.fn(),
    openFile: vi.fn(),
    formatShortPortalDate: () => "Aug 7, 2026",
  };

  it("renders desktop layout with table and mobile layout with structured cards", () => {
    const { container } = render(<UserPortalTemplatesWorkspaceView {...defaultTemplateProps} />);

    // Verify desktop layout element exists with responsive class hidden lg:block
    const desktopLayout = container.querySelector(".desktop-layout");
    expect(desktopLayout).toBeInTheDocument();
    expect(desktopLayout?.className).toContain("hidden lg:block");

    // Verify mobile layout element exists with responsive class block lg:hidden
    const mobileLayout = container.querySelector(".mobile-layout");
    expect(mobileLayout).toBeInTheDocument();
    expect(mobileLayout?.className).toContain("block lg:hidden");

    // Verify template titles are rendered in both layouts
    expect(screen.getAllByText("Constitution and By-Laws").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Directory of Officers and Members").length).toBeGreaterThanOrEqual(2);

    // Verify View and Download buttons exist
    const viewButtons = screen.getAllByRole("button", { name: /View/i });
    expect(viewButtons.length).toBeGreaterThan(0);

    const downloadButtons = screen.getAllByRole("button", { name: /Download/i });
    expect(downloadButtons.length).toBeGreaterThan(0);

    const zipButtons = screen.getAllByRole("button", { name: /ZIP/i });
    expect(zipButtons.length).toBeGreaterThan(0);
  });

  it("handles mobile section collapse independently from section ZIP download", () => {
    const { container } = render(<UserPortalTemplatesWorkspaceView {...defaultTemplateProps} />);
    const mobileLayout = container.querySelector(".mobile-layout") as HTMLElement;
    expect(mobileLayout).toBeInTheDocument();

    const mobileScope = within(mobileLayout);

    // Find the mobile section header toggle for Registration Form category
    const toggleButton = mobileScope.getByRole("button", { name: /Toggle Registration Form templates section/i });
    expect(toggleButton).toBeInTheDocument();

    // Verify template card is initially visible in mobile layout
    expect(mobileScope.getByText("Upload the signed constitution and by-laws.")).toBeInTheDocument();

    // Toggle collapse via chevron
    fireEvent.click(toggleButton);

    // Template cards list under required section should now be collapsed in mobile layout
    expect(mobileScope.queryByText("Upload the signed constitution and by-laws.")).not.toBeInTheDocument();

    // Toggle back open
    fireEvent.click(toggleButton);
    expect(mobileScope.getByText("Upload the signed constitution and by-laws.")).toBeInTheDocument();
  });
});

describe("UserPortalNewsWorkspaceView Responsive Layout", () => {
  const mockNews = [
    {
      id: "news-1",
      title: "Youth Organization Registration Program (YORP)",
      description: "Official announcement regarding registration schedules and guidelines.",
      category: "YORP",
      publishedAt: "2026-06-25T08:00:00Z",
      previewImageUrl: "https://example.com/yorp.png",
      facebookUrl: "https://facebook.com/post-1",
    },
    {
      id: "news-2",
      title: "Youth Participation Organization Passport (YPOP)",
      description: "Guidelines and point system for youth organization activities.",
      category: "YPOP",
      publishedAt: "2026-07-01T09:00:00Z",
      previewImageUrl: "https://example.com/ypop.png",
      facebookUrl: "https://facebook.com/post-2",
    },
  ];

  const defaultNewsProps = {
    newsReleases: mockNews,
    formatShortPortalDate: () => "Jun 25, 2026",
    LYDO_FACEBOOK_PAGE_URL: "https://facebook.com/pasiglydo",
  };

  it("renders desktop 3-column grid and mobile single-column feed with responsive isolation", () => {
    const { container } = render(<UserPortalNewsWorkspaceView {...defaultNewsProps} />);

    // Verify desktop layout element exists with responsive class hidden lg:block
    const desktopLayout = container.querySelector(".desktop-layout");
    expect(desktopLayout).toBeInTheDocument();
    expect(desktopLayout?.className).toContain("hidden lg:block");

    // Verify mobile layout element exists with responsive class block lg:hidden
    const mobileLayout = container.querySelector(".mobile-layout");
    expect(mobileLayout).toBeInTheDocument();
    expect(mobileLayout?.className).toContain("block lg:hidden");

    // Verify titles are rendered in both layouts
    expect(screen.getAllByText("Youth Organization Registration Program (YORP)").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Youth Participation Organization Passport (YPOP)").length).toBeGreaterThanOrEqual(2);

    // Verify Read Release action buttons exist
    const readReleaseButtons = screen.getAllByRole("button", { name: /Read Release/i });
    expect(readReleaseButtons.length).toBeGreaterThan(0);

    // Verify Visit Facebook Page buttons exist
    const fbLinks = screen.getAllByRole("link", { name: /Visit Facebook Page/i });
    expect(fbLinks.length).toBeGreaterThan(0);
  });
});

describe("UserPortalShell Notification Dropdown Responsive Behavior", () => {
  const mockNotifications = [
    {
      id: "notif-1",
      title: "Budget Released",
      message: "Your budget request of ₱25,000 has been successfully approved and released.",
      isRead: false,
      createdAt: "2026-08-06T10:00:00Z",
    },
    {
      id: "notif-2",
      title: "Document Verified",
      message: "Your constitution and bylaws have been marked compliant by LYDO admins.",
      isRead: true,
      createdAt: "2026-08-05T14:30:00Z",
    },
  ];

  const defaultShellProps = {
    title: "Organization Portal",
    subtitle: "Organization User",
    userDisplayName: "Pasig Youth Council",
    userEmail: "pyc@pasig.gov.ph",
    notifications: mockNotifications,
    onMarkAllRead: vi.fn(),
    groups: [
      {
        id: "main",
        label: "Main",
        items: [{ id: "dashboard", label: "Dashboard" }],
      },
    ],
    activeId: "dashboard",
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    children: <div>Dashboard Content</div>,
  };

  it("renders notification bell and opens compact dropdown with responsive bounds and actions", async () => {
    render(<UserPortalShell {...defaultShellProps} />);

    // Notification bell button exists
    const bellBtn = screen.getByRole("button", { name: /Notifications/i });
    expect(bellBtn).toBeInTheDocument();

    // Click or keydown on bell to open dropdown in Radix UI
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    // Verify dropdown header exists
    expect(screen.getByText("Notifications")).toBeInTheDocument();

    // Verify Mark all read button exists and triggers callback
    const markAllBtn = screen.getByRole("button", { name: /Mark all read/i });
    expect(markAllBtn).toBeInTheDocument();
    fireEvent.click(markAllBtn);
    expect(defaultShellProps.onMarkAllRead).toHaveBeenCalled();

    // Verify notification titles and messages rendered
    expect(screen.getByText("Budget Released")).toBeInTheDocument();
    expect(screen.getByText(/Your budget request of ₱25,000/i)).toBeInTheDocument();
    expect(screen.getByText("Document Verified")).toBeInTheDocument();

    // Verify View All Notifications button exists and navigates
    const viewAllBtn = screen.getByText(/View All Notifications →/i);
    expect(viewAllBtn).toBeInTheDocument();
    fireEvent.click(viewAllBtn);
    expect(defaultShellProps.onNavigate).toHaveBeenCalledWith("notifications");
  });
});

describe("UserPortalShell Mobile Sidebar Navigation (Notifications Removed & Preserved Structure)", () => {
  const mockNotifications = [
    {
      id: "notif-1",
      title: "Budget Released",
      message: "Your budget request of ₱25,000 has been successfully approved and released.",
      isRead: false,
      createdAt: "2026-08-06T10:00:00Z",
    },
    {
      id: "notif-2",
      title: "Document Verified",
      message: "Your constitution and bylaws have been marked compliant by LYDO admins.",
      isRead: true,
      createdAt: "2026-08-05T14:30:00Z",
    },
    {
      id: "notif-3",
      title: "New Announcement",
      message: "Quarterly coordination meeting scheduled.",
      isRead: false,
      createdAt: "2026-08-04T09:00:00Z",
    },
  ];

  const defaultShellProps = {
    title: "Y-TRACE",
    subtitle: "PASIG CITY",
    userDisplayName: "tadz",
    userEmail: "xxfaker4@gmail.com",
    notifications: mockNotifications,
    onMarkAllRead: vi.fn(),
    groups: userNavigationGroups,
    activeId: "dashboard",
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    children: <div>Dashboard Content</div>,
  };

  const phoneWidths = [320, 375, 390, 430];

  phoneWidths.forEach((width) => {
    it(`verifies mobile sidebar has NO redundant Notifications item and preserves all groups at ${width}px`, async () => {
      window.innerWidth = width;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width: 1023px") || !query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const onNavigateMock = vi.fn();
      render(<UserPortalShell {...defaultShellProps} onNavigate={onNavigateMock} />);

      // 1. Navbar notification bell remains visible and displays unread indicator
      const navbarBell = screen.getByRole("button", { name: /^Notifications$/i });
      expect(navbarBell).toBeInTheDocument();

      // 2. Open mobile sidebar navigation sheet
      const menuTrigger = screen.getByRole("button", { name: /Open navigation menu/i });
      expect(menuTrigger).toBeInTheDocument();
      fireEvent.click(menuTrigger);

      // 3. Mobile sidebar dialog/sheet is open
      const sheetDialog = screen.getByRole("dialog");
      expect(sheetDialog).toBeInTheDocument();

      // 4. Inside the mobile sidebar, there MUST NOT be any Notifications item/button
      const sheetWithin = within(sheetDialog);
      expect(sheetWithin.queryByRole("button", { name: /Notifications/i })).not.toBeInTheDocument();
      expect(sheetWithin.queryByText(/Notifications/i)).not.toBeInTheDocument();

      // 5. Account/user profile is present directly before navigation groups
      expect(sheetWithin.getByRole("button", { name: /Open My Profile/i })).toBeInTheDocument();
      expect(sheetWithin.getByText("tadz")).toBeInTheDocument();
      expect(sheetWithin.getByText("xxfaker4@gmail.com")).toBeInTheDocument();

      // 6. Navigation groups and exact items are intact in the sidebar:
      // HOME
      expect(sheetWithin.getByText("Home")).toBeInTheDocument();
      const dashboardBtn = sheetWithin.getByRole("button", { name: /Dashboard/i });
      expect(dashboardBtn).toBeInTheDocument();

      // COMPLIANCE
      expect(sheetWithin.getByText("Compliance")).toBeInTheDocument();
      expect(sheetWithin.getByRole("button", { name: /Document Submissions/i })).toBeInTheDocument();
      expect(sheetWithin.getByRole("button", { name: /Liquidation Reports/i })).toBeInTheDocument();

      // GRANTS & INCENTIVES
      expect(sheetWithin.getByText("Grants & Incentives")).toBeInTheDocument();
      expect(sheetWithin.getByRole("button", { name: /Budget Requests/i })).toBeInTheDocument();
      expect(sheetWithin.getByRole("button", { name: /YPOP Incentive/i })).toBeInTheDocument();

      // TEMPLATES
      expect(sheetWithin.getAllByText("Templates").length).toBe(2);
      expect(sheetWithin.getByRole("button", { name: /Templates/i })).toBeInTheDocument();

      // NEWS RELEASES
      expect(sheetWithin.getAllByText("News Releases").length).toBe(2);
      expect(sheetWithin.getByRole("button", { name: /News Releases/i })).toBeInTheDocument();

      // Sign Out
      expect(sheetWithin.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();

      // 7. Test interaction: click Dashboard navigates
      fireEvent.click(dashboardBtn);
      expect(onNavigateMock).toHaveBeenCalledWith("dashboard");
    });
  });

  it("DESKTOP NAVIGATION PRESERVED: YES (Desktop navigation pills and dropdowns remain intact at 1280px)", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<UserPortalShell {...defaultShellProps} />);

    // Desktop nav container exists
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
    const navWithin = within(nav);

    // Single item pill
    expect(navWithin.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    // Dropdown triggers for multi-item groups
    expect(navWithin.getByRole("button", { name: /Compliance/i })).toBeInTheDocument();
    expect(navWithin.getByRole("button", { name: /Grants & Incentives/i })).toBeInTheDocument();
    expect(navWithin.getByRole("button", { name: /News Releases/i })).toBeInTheDocument();

    // Desktop nav does NOT contain Notifications
    expect(navWithin.queryByText(/Notifications/i)).not.toBeInTheDocument();

    // Navbar notification bell exists
    const bellBtn = screen.getByRole("button", { name: /^Notifications$/i });
    expect(bellBtn).toBeInTheDocument();
  });
});

describe("PortalDocumentPreviewModal Responsive Layout & Header Isolation", () => {
  const defaultModalProps = {
    open: true,
    onOpenChange: vi.fn(),
    previewUrl: "https://example.com/sample-constitution.pdf",
    previewTitle: "Constitution and By-Laws Official Template",
    previewCanInline: true,
    fileSize: "1.4 MB",
    updatedAt: "Aug 12, 2026",
    organizationName: "Pasig Youth Alliance",
    onDownloadFile: vi.fn(),
  };

  it("renders Desktop single-row header and Mobile 2-row header with responsive isolation", () => {
    render(<PortalDocumentPreviewModal {...defaultModalProps} />);

    // Verify desktop header exists with responsive class hidden lg:flex
    const desktopHeader = document.querySelector(".hidden.lg\\:flex");
    expect(desktopHeader).toBeInTheDocument();

    // Verify mobile header exists with responsive class block lg:hidden
    const mobileHeader = document.querySelector(".block.lg\\:hidden");
    expect(mobileHeader).toBeInTheDocument();

    // Verify action buttons exist in both headers
    const openInTabButtons = screen.getAllByRole("button", { name: /Open in New Tab/i });
    expect(openInTabButtons.length).toBeGreaterThanOrEqual(2);

    const downloadButtons = screen.getAllByRole("button", { name: /Download File/i });
    expect(downloadButtons.length).toBeGreaterThanOrEqual(2);

    // Verify close buttons exist
    const closeButtons = screen.getAllByRole("button", { name: /Close dialog/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(2);

    // Verify Close Preview button in footer works
    const footerCloseBtn = screen.getByRole("button", { name: /Close Preview/i });
    expect(footerCloseBtn).toBeInTheDocument();
    fireEvent.click(footerCloseBtn);
    expect(defaultModalProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("PortalAttachedDocumentDrawer Responsive Behavior", () => {
  const mockFile: any = {
    id: "sub-file-1",
    submissionId: "sub-1",
    documentTypeId: "doc-1",
    fileName: "constitution-by-laws-signed.pdf",
    fileUrl: "https://example.com/constitution.pdf",
    fileType: "application/pdf",
    fileSize: 1048576,
    adminStatus: "approved_green",
    adminRemarks: "",
    uploadedAt: "2026-06-11T12:00:00Z",
  };

  const defaultDrawerProps = {
    open: true,
    onOpenChange: vi.fn(),
    file: mockFile,
    documentTypeName: "Constitution and By-Laws",
    previewUrl: "https://example.com/constitution.pdf",
    previewCanInline: true,
    onDownloadFile: vi.fn(),
    onOpenInNewTab: vi.fn(),
    onSubmitForReview: vi.fn(),
    onReplaceFile: vi.fn(),
    onDeleteDraft: vi.fn(),
  };

  it("renders Desktop Sheet ONLY on desktop viewport (>= 1024px)", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PortalAttachedDocumentDrawer {...defaultDrawerProps} />);

    // On desktop, the Sheet's "Close Drawer" button must be in the document
    expect(screen.getByRole("button", { name: /^Close Drawer$/i })).toBeInTheDocument();
    // Close drawer button in header
    expect(screen.getByRole("button", { name: /Close document drawer/i })).toBeInTheDocument();
    // Mobile close modal must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /Close document modal/i })).not.toBeInTheDocument();

    // Verify document identity and status
    expect(screen.getByText("Constitution and By-Laws")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("constitution-by-laws-signed.pdf")).toBeInTheDocument();

    // Verify actions
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
  });

  it("renders Mobile Dialog ONLY on mobile viewport (< 1024px)", () => {
    window.innerWidth = 800;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: !query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PortalAttachedDocumentDrawer {...defaultDrawerProps} />);

    // On mobile, the Dialog's "Close document modal" button must be in the document
    expect(screen.getByRole("button", { name: /Close document modal/i })).toBeInTheDocument();
    // Desktop "Close Drawer" must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /^Close Drawer$/i })).not.toBeInTheDocument();

    // Verify actions and footer
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Close$/i })).toBeInTheDocument();
  });

  it("renders draft workflow actions when file status is draft", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const draftFile = {
      ...mockFile,
      adminStatus: "draft",
    };

    render(<PortalAttachedDocumentDrawer {...defaultDrawerProps} file={draftFile} />);

    expect(screen.getByText("Draft Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit for Review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Replace File/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete Draft/i })).toBeInTheDocument();
  });

  it("renders revision remarks and revision actions when status is needs_revision", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const revisionFile = {
      ...mockFile,
      adminStatus: "needs_revision",
      adminRemarks: "Please provide the notarized signature page on page 3.",
    };

    render(<PortalAttachedDocumentDrawer {...defaultDrawerProps} file={revisionFile} />);

    expect(screen.getByText("Needs Revision")).toBeInTheDocument();
    expect(screen.getByText(/Please provide the notarized signature page on page 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload Revised File/i })).toBeInTheDocument();
  });
});

describe("PortalDocumentDrawer Template Mode Responsive Behavior", () => {
  const defaultTemplateProps = {
    open: true,
    onOpenChange: vi.fn(),
    mode: "template" as const,
    previewUrl: "https://example.com/1782457726429-Constitution-and-By-Laws.pdf",
    previewTitle: "1782457726429-Constitution-and-By-Laws.pdf",
    templateTitle: "1782457726429-Constitution-and-By-Laws.pdf",
    templateFileName: "1782457726429-Constitution-and-By-Laws.pdf",
    previewCanInline: true,
    onDownloadFile: vi.fn(),
    onOpenInNewTab: vi.fn(),
  };

  it("renders Desktop Sheet ONLY for View Template on desktop viewport (>= 1024px)", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PortalDocumentDrawer {...defaultTemplateProps} />);

    // On desktop, the Sheet's "Close Drawer" button must be in the document
    expect(screen.getByRole("button", { name: /^Close Drawer$/i })).toBeInTheDocument();
    // Close drawer button in header with template label
    expect(screen.getByRole("button", { name: /Close template drawer/i })).toBeInTheDocument();
    // Mobile close modal must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /Close template modal/i })).not.toBeInTheDocument();

    // Verify template document identity and Official Template badge
    expect(screen.getByText("Constitution and By-Laws")).toBeInTheDocument();
    expect(screen.getByText("Official Template")).toBeInTheDocument();
    expect(screen.getByText("1782457726429-Constitution-and-By-Laws.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF Document")).toBeInTheDocument();
    expect(screen.getByText("Reference Guide")).toBeInTheDocument();

    // Verify actions and footer
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
    expect(screen.getByText(/Official Template • Y-TRACE Document Compliance/i)).toBeInTheDocument();
  });

  it("renders Mobile Dialog ONLY for View Template on mobile viewport (< 1024px)", () => {
    window.innerWidth = 800;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: !query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PortalDocumentDrawer {...defaultTemplateProps} />);

    // On mobile, the Dialog's "Close template modal" button must be in the document
    expect(screen.getByRole("button", { name: /Close template modal/i })).toBeInTheDocument();
    // Desktop "Close Drawer" must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /^Close Drawer$/i })).not.toBeInTheDocument();

    // Verify actions and mobile Close button
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Close$/i })).toBeInTheDocument();
    expect(screen.getByText(/Official Template • Y-TRACE Document Compliance/i)).toBeInTheDocument();
  });

  it("triggers onOpenInNewTab and onDownloadFile handlers when clicked", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const mockOpenTab = vi.fn();
    const mockDownload = vi.fn();

    render(
      <PortalDocumentDrawer
        {...defaultTemplateProps}
        onOpenInNewTab={mockOpenTab}
        onDownloadFile={mockDownload}
      />
    );

    const openTabBtn = screen.getByRole("button", { name: /Open in New Tab/i });
    fireEvent.click(openTabBtn);
    expect(mockOpenTab).toHaveBeenCalledWith("https://example.com/1782457726429-Constitution-and-By-Laws.pdf");

    const downloadBtn = screen.getByRole("button", { name: /Download File/i });
    fireEvent.click(downloadBtn);
    expect(mockDownload).toHaveBeenCalledWith(
      "https://example.com/1782457726429-Constitution-and-By-Laws.pdf",
      "1782457726429-Constitution-and-By-Laws.pdf"
    );
  });

  it("maintains identical button heights, typography hierarchy, and geometry between View Template and View Attached", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Render Template Drawer
    const { unmount } = render(<PortalDocumentDrawer {...defaultTemplateProps} />);
    const templateOpenBtn = screen.getByRole("button", { name: /Open in New Tab/i });
    const templateDownloadBtn = screen.getByRole("button", { name: /Download File/i });
    const templateCloseDrawerBtn = screen.getByRole("button", { name: /^Close Drawer$/i });
    const templateCloseXBtn = screen.getByRole("button", { name: /Close template drawer/i });

    // Primary action: Download File (bold, h-9)
    expect(templateDownloadBtn.className).toContain("h-9");
    expect(templateDownloadBtn.className).toContain("font-bold");
    expect(templateDownloadBtn.className).toContain("bg-primary");

    // Secondary action: Open in New Tab (semibold, h-9)
    expect(templateOpenBtn.className).toContain("h-9");
    expect(templateOpenBtn.className).toContain("font-semibold");

    // Footer Close Drawer: (semibold, h-9)
    expect(templateCloseDrawerBtn.className).toContain("h-9");
    expect(templateCloseDrawerBtn.className).toContain("font-semibold");

    // Top-right X button: (h-8.5 w-8.5 rounded-full)
    expect(templateCloseXBtn.className).toContain("h-8.5");
    expect(templateCloseXBtn.className).toContain("w-8.5");
    expect(templateCloseXBtn.className).toContain("rounded-full");

    unmount();

    // Render Attached Drawer
    const mockFile: any = {
      id: "sub-file-1",
      submissionId: "sub-1",
      documentTypeId: "doc-1",
      fileName: "constitution-by-laws-signed.pdf",
      fileUrl: "https://example.com/constitution.pdf",
      fileType: "application/pdf",
      fileSize: 1048576,
      adminStatus: "approved_green",
      adminRemarks: "",
      uploadedAt: "2026-06-11T12:00:00Z",
    };

    render(
      <PortalDocumentDrawer
        mode="attached"
        open={true}
        onOpenChange={vi.fn()}
        file={mockFile}
        documentTypeName="Constitution and By-Laws"
        previewUrl="https://example.com/constitution.pdf"
        previewCanInline={true}
      />
    );

    const attachedOpenBtn = screen.getByRole("button", { name: /Open in New Tab/i });
    const attachedDownloadBtn = screen.getByRole("button", { name: /Download File/i });
    const attachedCloseDrawerBtn = screen.getByRole("button", { name: /^Close Drawer$/i });
    const attachedCloseXBtn = screen.getByRole("button", { name: /Close document drawer/i });

    // Both drawers must share the exact same button heights, typography hierarchy, and geometry
    expect(attachedDownloadBtn.className).toContain("h-9");
    expect(attachedDownloadBtn.className).toContain("font-bold");
    expect(attachedDownloadBtn.className).toContain("bg-primary");

    expect(attachedOpenBtn.className).toContain("h-9");
    expect(attachedOpenBtn.className).toContain("font-semibold");

    expect(attachedCloseDrawerBtn.className).toContain("h-9");
    expect(attachedCloseDrawerBtn.className).toContain("font-semibold");

    expect(attachedCloseXBtn.className).toContain("h-8.5");
    expect(attachedCloseXBtn.className).toContain("w-8.5");
    expect(attachedCloseXBtn.className).toContain("rounded-full");
  });

  it("maintains identical mobile 2-column action grid and geometry parity on mobile viewport (< 1024px)", () => {
    window.innerWidth = 390;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: !query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // 1. Render Mobile Template Drawer
    const { unmount: unmountTemplate } = render(<PortalDocumentDrawer {...defaultTemplateProps} />);
    const mobileTemplateOpenBtn = screen.getByRole("button", { name: /Open in New Tab/i });
    const mobileTemplateDownloadBtn = screen.getByRole("button", { name: /Download File/i });
    const mobileTemplateCloseXBtn = screen.getByRole("button", { name: /Close template modal/i });
    const mobileTemplateCloseFooterBtn = screen.getByRole("button", { name: /^Close$/i });

    // Verify touch targets, rounded-xl proportions, and deliberate hierarchy on mobile
    expect(mobileTemplateDownloadBtn.className).toContain("h-10");
    expect(mobileTemplateDownloadBtn.className).toContain("rounded-xl");
    expect(mobileTemplateDownloadBtn.className).toContain("font-semibold");
    expect(mobileTemplateDownloadBtn.className).toContain("bg-primary");

    expect(mobileTemplateOpenBtn.className).toContain("h-10");
    expect(mobileTemplateOpenBtn.className).toContain("rounded-xl");
    expect(mobileTemplateOpenBtn.className).toContain("font-medium");

    expect(mobileTemplateCloseFooterBtn.className).toContain("h-8.5");
    expect(mobileTemplateCloseXBtn.className).toContain("h-8.5");
    expect(mobileTemplateCloseXBtn.className).toContain("w-8.5");

    unmountTemplate();

    // 2. Render Mobile Attached Drawer
    const mockFile: any = {
      id: "sub-file-1",
      submissionId: "sub-1",
      documentTypeId: "doc-1",
      fileName: "constitution-by-laws-signed.pdf",
      fileUrl: "https://example.com/constitution.pdf",
      fileType: "application/pdf",
      fileSize: 1048576,
      adminStatus: "approved_green",
      adminRemarks: "",
      uploadedAt: "2026-06-11T12:00:00Z",
    };

    render(
      <PortalDocumentDrawer
        mode="attached"
        open={true}
        onOpenChange={vi.fn()}
        file={mockFile}
        documentTypeName="Constitution and By-Laws"
        previewUrl="https://example.com/constitution.pdf"
        previewCanInline={true}
      />
    );

    const mobileAttachedOpenBtn = screen.getByRole("button", { name: /Open in New Tab/i });
    const mobileAttachedDownloadBtn = screen.getByRole("button", { name: /Download File/i });
    const mobileAttachedCloseXBtn = screen.getByRole("button", { name: /Close document modal/i });
    const mobileAttachedCloseFooterBtn = screen.getByRole("button", { name: /^Close$/i });

    // Verify mobile attached drawer shares the exact same button heights, typography hierarchy, and geometry
    expect(mobileAttachedDownloadBtn.className).toContain("h-10");
    expect(mobileAttachedDownloadBtn.className).toContain("rounded-xl");
    expect(mobileAttachedDownloadBtn.className).toContain("font-semibold");
    expect(mobileAttachedDownloadBtn.className).toContain("bg-primary");

    expect(mobileAttachedOpenBtn.className).toContain("h-10");
    expect(mobileAttachedOpenBtn.className).toContain("rounded-xl");
    expect(mobileAttachedOpenBtn.className).toContain("font-medium");

    expect(mobileAttachedCloseFooterBtn.className).toContain("h-8.5");
    expect(mobileAttachedCloseXBtn.className).toContain("h-8.5");
    expect(mobileAttachedCloseXBtn.className).toContain("w-8.5");
  });

  it("verifies mobile action button row stability across 320px, 360px, 375px, 414px, and 430px viewports", () => {
    const viewports = [320, 360, 375, 414, 430];

    for (const width of viewports) {
      window.innerWidth = width;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: !query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { unmount } = render(<PortalDocumentDrawer {...defaultTemplateProps} />);
      const openBtn = screen.getByRole("button", { name: /Open in New Tab/i });
      const downloadBtn = screen.getByRole("button", { name: /Download File/i });

      expect(openBtn).toBeInTheDocument();
      expect(downloadBtn).toBeInTheDocument();
      expect(openBtn.className).toContain("h-10");
      expect(downloadBtn.className).toContain("h-10");

      unmount();
    }
  });
});

describe("DropdownMenu Layout Stability & Non-Modal Scrollbar Preservation", () => {
  it("opens sort and filter dropdowns without locking body scroll or shifting layout", () => {
    const defaultDocProps = {
      navigate: vi.fn(),
      userRouteMap: {},
      templateDocuments: [
        { id: "doc-1", title: "Constitution and By-Laws", description: "Official bylaws", templateFileName: "bylaws.pdf" },
      ],
    };

    render(<UserPortalDocumentWorkspaceView {...defaultDocProps} />);

    // Find the Sort: Newest button
    const sortButton = screen.getByRole("button", { name: /Sort:/i });
    expect(sortButton).toBeInTheDocument();

    // Trigger dropdown opening
    fireEvent.pointerDown(sortButton, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(sortButton, { key: "ArrowDown" });

    // Verify sort menu items appear
    expect(screen.getByText("Default Order")).toBeInTheDocument();
    expect(screen.getByText("Document Name")).toBeInTheDocument();
    expect(screen.getByText("Recently Updated")).toBeInTheDocument();

    // Verify body overflow is NOT locked to prevent layout shifts
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("renders desktop Sheet drawer and Dialog overlays with scrollbar stability", () => {
    const defaultLiquidationProps: any = {
      navigate: vi.fn(),
      userRouteMap: {},
      liquidationWorkflowEligibility: { eligible: true },
      liquidationReports: [
        {
          id: "rep-1",
          budgetRequestId: "br-1",
          status: "submitted",
          createdAt: "2026-08-10T00:00:00Z",
          deadlineAt: "2026-08-20T00:00:00Z",
        },
      ],
      budgetRequests: [
        {
          id: "br-1",
          activityTitle: "Youth Leadership Summit 2026",
          purposeCategory: "Leadership",
          venue: "Pasig City Hall",
          releasedAmount: 25000,
        },
      ],
      liquidationFilesByReportId: new Map(),
      liquidationNotesByReportId: {},
      setLiquidationNotesByReportId: vi.fn(),
      buildPublicRecordCode: () => "LR-2026-001",
      formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
      formatShortPortalDate: () => "Aug 20, 2026",
      formatDateTimeLabel: () => "Aug 11, 2026",
      formatStatusLabel: (s: string) => s,
      openCreateModal: false,
      setOpenCreateModal: vi.fn(),
    };

    render(<UserPortalLiquidationWorkspaceView {...defaultLiquidationProps} />);

    // Open report row on desktop
    const openReportBtns = screen.getAllByRole("button", { name: /Open Report/i });
    expect(openReportBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(openReportBtns[0]);

    // Verify Sheet drawer opened with detail content
    const titleElements = screen.getAllByText("Youth Leadership Summit 2026");
    expect(titleElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders tablet Dialog and Sheet overlays without scrollbar layout shifts (768px-1023px)", () => {
    // Set viewport to tablet width 768px
    window.innerWidth = 768;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const defaultLiquidationProps: any = {
      navigate: vi.fn(),
      userRouteMap: {},
      liquidationWorkflowEligibility: { eligible: true },
      liquidationReports: [
        {
          id: "rep-tab-1",
          budgetRequestId: "br-tab-1",
          status: "submitted",
          createdAt: "2026-08-10T00:00:00Z",
          deadlineAt: "2026-08-20T00:00:00Z",
        },
      ],
      budgetRequests: [
        {
          id: "br-tab-1",
          activityTitle: "Tablet Youth Summit 2026",
          purposeCategory: "Leadership",
          venue: "Pasig City Hall",
          releasedAmount: 25000,
        },
      ],
      liquidationFilesByReportId: new Map(),
      liquidationNotesByReportId: {},
      setLiquidationNotesByReportId: vi.fn(),
      buildPublicRecordCode: () => "LR-2026-TAB",
      formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
      formatShortPortalDate: () => "Aug 20, 2026",
      formatDateTimeLabel: () => "Aug 11, 2026",
      formatStatusLabel: (s: string) => s,
      openCreateModal: false,
      setOpenCreateModal: vi.fn(),
    };

    render(<UserPortalLiquidationWorkspaceView {...defaultLiquidationProps} />);

    const openReportBtns = screen.getAllByRole("button", { name: /Open Report/i });
    expect(openReportBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(openReportBtns[0]);

    // Modal/dialog content is displayed
    const titleElements = screen.getAllByText("Tablet Youth Summit 2026");
    expect(titleElements.length).toBeGreaterThanOrEqual(1);
  });
});

describe("UserPortalLiquidationWorkspaceView Mobile Preview Modal Polish", () => {
  const mockReport = {
    id: "rep-mob-1",
    budgetRequestId: "br-mob-1",
    status: "pending",
    createdAt: "2026-08-10T00:00:00Z",
    deadlineAt: "2026-08-20T00:00:00Z",
    goSignalAt: "2026-08-01T00:00:00Z",
  };

  const mockBudget = {
    id: "br-mob-1",
    activityTitle: "Mobile Polish Youth Summit 2026",
    purposeCategory: "Community Outreach",
    venue: "Pasig Mega Market",
    releasedAmount: 45000,
    approvedAmount: 45000,
  };

  const mockFilesMap = new Map([
    [
      "rep-mob-1",
      [
        {
          id: "file-mob-1",
          fileName: "summit-liquidation-report.pdf",
          fileUrl: "https://example.com/liquidation.pdf",
          fileSize: 81920,
          uploadedAt: "2026-08-11T03:30:00Z",
        },
      ],
    ],
  ]);

  const liquidationProps: any = {
    navigate: vi.fn(),
    userRouteMap: {},
    liquidationWorkflowEligibility: { eligible: true },
    liquidationReports: [mockReport],
    budgetRequests: [mockBudget],
    liquidationFilesByReportId: mockFilesMap,
    liquidationNotesByReportId: {},
    setLiquidationNotesByReportId: vi.fn(),
    buildPublicRecordCode: () => "LR-2026-08-10",
    searchParams: new URLSearchParams("reportId=rep-mob-1"),
    formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
    formatShortPortalDate: () => "Aug 20, 2026",
    formatDateTimeLabel: () => "Aug 11, 2026, 3:30 AM",
    formatStatusLabel: (s: string) => s,
    openCreateModal: false,
    setOpenCreateModal: vi.fn(),
  };

  const viewports = [320, 360, 375, 390, 414, 430];

  viewports.forEach((width) => {
    it(`renders polished mobile modal hierarchy, cards, and 2-column actions at ${width}px`, () => {
      window.innerWidth = width;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: !query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<UserPortalLiquidationWorkspaceView {...liquidationProps} />);

      // 1. Header verification: Identifier, amount, close button, title
      const recordCodes = screen.getAllByText("LR-2026-08-10");
      expect(recordCodes.length).toBeGreaterThanOrEqual(1);
      const amountPills = screen.getAllByText("PHP 45,000");
      expect(amountPills.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /Close modal/i })).toBeInTheDocument();
      const titleHeadings = screen.getAllByText("Mobile Polish Youth Summit 2026");
      expect(titleHeadings.length).toBeGreaterThanOrEqual(1);

      // 2. Activity Timeline Summary Card verification
      expect(screen.getByText("Activity Timeline")).toBeInTheDocument();
      expect(screen.getByText("Go Signal")).toBeInTheDocument();
      const deadlineLabels = screen.getAllByText("Deadline");
      expect(deadlineLabels.length).toBeGreaterThanOrEqual(1);

      // 3. Document section & file card verification
      expect(screen.getByText("Liquidation Document")).toBeInTheDocument();
      const fileNames = screen.getAllByText("summit-liquidation-report.pdf");
      expect(fileNames.length).toBeGreaterThanOrEqual(1);

      // 4. Action Buttons verification
      const openTabBtn = screen.getByRole("button", { name: /Open in New Tab/i });
      const downloadBtn = screen.getByRole("button", { name: /Download File/i });
      expect(openTabBtn).toBeInTheDocument();
      expect(downloadBtn).toBeInTheDocument();

      // Verify button layout classes (h-10, rounded-xl, 2-column parent)
      expect(openTabBtn.className).toContain("h-10");
      expect(openTabBtn.className).toContain("rounded-xl");
      expect(downloadBtn.className).toContain("h-10");
      expect(downloadBtn.className).toContain("rounded-xl");
      const buttonGrid = openTabBtn.parentElement;
      expect(buttonGrid?.className).toContain("grid-cols-2");

      // 5. Quiet Footer verification
      expect(screen.getByText(/Liquidation Report • LYDO Pasig City/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });
  });
});

describe("UserPortalBudgetWorkspaceView Mobile Preview Modal Polish", () => {
  const mockBudgetRequest = {
    id: "br-mob-spec-1",
    activityTitle: "Mobile Polish Leadership Summit",
    purposeCategory: "Leadership Development",
    venue: "Pasig City Hall Complex",
    requestedAmount: 28500,
    approvedAmount: 28500,
    status: "approved",
    activityDate: "2026-09-15T00:00:00Z",
    activityDescription: "Annual youth leadership summit for Pasig youth.",
  };

  const mockFile = {
    id: "file-br-mob-1",
    fileName: "leadership-proposal.pdf",
    fileUrl: "https://example.com/proposal.pdf",
    fileSize: 65536,
    uploadedAt: "2026-08-06T03:33:00Z",
  };

  const budgetFilesMap = new Map([["br-mob-spec-1", mockFile]]);

  const budgetProps: any = {
    navigate: vi.fn(),
    userRouteMap: {},
    searchParams: new URLSearchParams("budgetRequestId=br-mob-spec-1"),
    budgetRequests: [mockBudgetRequest],
    budgetFilesByRequestId: budgetFilesMap,
    buildPublicRecordCode: () => "BR-2026-08-06",
    formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
    formatShortPortalDate: () => "Sep 15, 2026",
    formatDateTimeLabel: () => "Aug 6, 2026, 3:33 AM",
    formatStatusLabel: (s: string) => s,
    openCreateModal: false,
    setOpenCreateModal: vi.fn(),
    downloadingFileId: null,
    handleDownloadBudgetFile: vi.fn(),
  };

  const viewports = [320, 360, 375, 390, 414, 430];

  viewports.forEach((width) => {
    it(`renders polished mobile modal hierarchy, financial overview, and 2-column actions at ${width}px`, () => {
      window.innerWidth = width;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: !query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<UserPortalBudgetWorkspaceView {...budgetProps} />);

      // 1. Header verification: Identifier, amount, close button, title
      const recordCodes = screen.getAllByText("BR-2026-08-06");
      expect(recordCodes.length).toBeGreaterThanOrEqual(1);
      const amountPills = screen.getAllByText("PHP 28,500");
      expect(amountPills.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /Close modal/i })).toBeInTheDocument();
      const titleHeadings = screen.getAllByText("Mobile Polish Leadership Summit");
      expect(titleHeadings.length).toBeGreaterThanOrEqual(1);

      // 2. Financial Overview Summary Card verification
      expect(screen.getByText("Financial Overview")).toBeInTheDocument();
      expect(screen.getByText("Requested Amount")).toBeInTheDocument();
      const approvedLabels = screen.getAllByText("Approved / Released");
      expect(approvedLabels.length).toBeGreaterThanOrEqual(1);

      // 3. Proposal Document section & file card verification
      expect(screen.getByText("Proposal Document")).toBeInTheDocument();
      const fileNames = screen.getAllByText("leadership-proposal.pdf");
      expect(fileNames.length).toBeGreaterThanOrEqual(1);

      // 4. Action Buttons verification
      const openTabBtn = screen.getByRole("button", { name: /Open in New Tab/i });
      const downloadBtn = screen.getByRole("button", { name: /Download File/i });
      expect(openTabBtn).toBeInTheDocument();
      expect(downloadBtn).toBeInTheDocument();

      // Verify button layout classes (h-10, rounded-xl, 2-column parent)
      expect(openTabBtn.className).toContain("h-10");
      expect(openTabBtn.className).toContain("rounded-xl");
      expect(downloadBtn.className).toContain("h-10");
      expect(downloadBtn.className).toContain("rounded-xl");
      const buttonGrid = openTabBtn.parentElement;
      expect(buttonGrid?.className).toContain("grid-cols-2");

      // 5. Quiet Footer verification
      expect(screen.getByText(/Budget Request • LYDO Pasig City/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });
  });
});

describe("UserPortalBudgetWorkspaceView Mobile Page Polish", () => {
  const mockRequests = [
    {
      id: "br-polish-1",
      activityTitle: "Youth Environmental Summit 2026",
      status: "approved",
      requestedAmount: 50000,
      approvedAmount: 50000,
      releasedAmount: 50000,
      activityDate: "2026-09-15T00:00:00Z",
      purposeCategory: "Environmental",
      venue: "Pasig Rainforest Park",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-05T00:00:00Z",
    },
    {
      id: "br-polish-2",
      activityTitle: "Very Long Activity Proposal Title To Test Word Wrapping And Truncation sdadasdasdasdasdasdasdsa",
      status: "submitted",
      requestedAmount: 25000,
      approvedAmount: null,
      releasedAmount: null,
      activityDate: "2026-10-01T00:00:00Z",
      purposeCategory: "Leadership",
      venue: "Pasig City Hall",
      createdAt: "2026-08-02T00:00:00Z",
      updatedAt: "2026-08-03T00:00:00Z",
    },
  ];

  const pageProps: any = {
    budgetWorkflowEligibility: { eligible: true, requirements: [] },
    budgetRequests: mockRequests,
    budgetFilesByRequestId: new Map(),
    budgetNotesByRequestId: {},
    submittingBudgetId: null,
    showBudgetForm: false,
    setShowBudgetForm: vi.fn(),
    editingBudgetRequest: null,
    startEditingBudgetRequest: vi.fn(),
    handleDeleteBudgetRequest: vi.fn(),
    openFile: vi.fn(),
    navigate: vi.fn(),
    searchParams: new URLSearchParams(),
    userRouteMap: {},
    buildPublicRecordCode: (_prefix: string, item: any) => `BR-${item.id === "br-polish-1" ? "001" : "002"}`,
    formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
    formatShortPortalDate: (d: string) => (d.includes("09-15") ? "Sep 15, 2026" : "Oct 1, 2026"),
    formatDateTimeLabel: (d: string) => d,
    formatStatusLabel: (s: string) => s,
    newActivityTitle: "",
    setNewActivityTitle: vi.fn(),
    newActivityDescription: "",
    setNewActivityDescription: vi.fn(),
    newPurposeCategory: "",
    setNewPurposeCategory: vi.fn(),
    newActivityDate: "",
    setNewActivityDate: vi.fn(),
    newVenue: "",
    setNewVenue: vi.fn(),
    newRequestedAmount: "",
    setNewRequestedAmount: vi.fn(),
    newRemarks: "",
    setNewRemarks: vi.fn(),
    handleCreateOrUpdateBudgetRequest: vi.fn(),
  };

  const mobileViewports = [320, 360, 375, 390, 414, 430];

  mobileViewports.forEach((width) => {
    it(`renders polished mobile page header, summary card, filter bar, and cards at ${width}px`, () => {
      window.innerWidth = width;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: !query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<UserPortalBudgetWorkspaceView {...pageProps} />);

      // 1. Page Header Verification
      expect(screen.getByText("Financial Workspace")).toBeInTheDocument();
      expect(screen.getByText("LYDO Pasig City")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Budget Requests" })).toBeInTheDocument();
      expect(
        screen.getByText("Submit financial grant proposals, track approval stages, and monitor released funds.")
      ).toBeInTheDocument();

      // 2. Mobile Summary Card Hierarchy
      const approvedHeadings = screen.getAllByText("1 of 2 Budget Requests Approved");
      expect(approvedHeadings.length).toBeGreaterThanOrEqual(1);
      const percentBadges = screen.getAllByText("50%");
      expect(percentBadges.length).toBeGreaterThanOrEqual(1);

      // Status breakdown
      const approvedCounts = screen.getAllByText("1 Approved");
      expect(approvedCounts.length).toBeGreaterThanOrEqual(1);
      const reviewCounts = screen.getAllByText("1 Review");
      expect(reviewCounts.length).toBeGreaterThanOrEqual(1);
      const revisionCounts = screen.getAllByText("0 Revision");
      expect(revisionCounts.length).toBeGreaterThanOrEqual(1);

      // Operational counts strip
      const totalReqLabels = screen.getAllByText("Total Requests");
      expect(totalReqLabels.length).toBeGreaterThanOrEqual(1);
      const pendingLabels = screen.getAllByText("Pending Review");
      expect(pendingLabels.length).toBeGreaterThanOrEqual(1);
      const approvedLabels = screen.getAllByText("Approved / Released");
      expect(approvedLabels.length).toBeGreaterThanOrEqual(1);

      // Dedicated Total Released Funds
      const releasedFundsLabels = screen.getAllByText("Total Released Funds");
      expect(releasedFundsLabels.length).toBeGreaterThanOrEqual(1);
      const releasedAmountPills = screen.getAllByText("PHP 50,000");
      expect(releasedAmountPills.length).toBeGreaterThanOrEqual(1);

      // 3. Filter Bar Verification
      expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Approved / Released (1)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Pending Review (1)" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search activity, category, venue...")).toBeInTheDocument();
      expect(screen.getByText(/newest/i)).toBeInTheDocument();

      // 4. Mobile Request Cards Verification
      const titles1 = screen.getAllByText("Youth Environmental Summit 2026");
      expect(titles1.length).toBeGreaterThanOrEqual(1);
      const titles2 = screen.getAllByText(/Very Long Activity Proposal Title/i);
      expect(titles2.length).toBeGreaterThanOrEqual(1);

      // Core metadata (Amount & Target Date)
      const amountPill2 = screen.getAllByText("PHP 25,000");
      expect(amountPill2.length).toBeGreaterThanOrEqual(1);
      const date1 = screen.getAllByText("Sep 15, 2026");
      expect(date1.length).toBeGreaterThanOrEqual(1);
      const date2 = screen.getAllByText("Oct 1, 2026");
      expect(date2.length).toBeGreaterThanOrEqual(1);

      // Record code and Action Button
      const br001 = screen.getAllByText("BR-001");
      expect(br001.length).toBeGreaterThanOrEqual(1);
      const br002 = screen.getAllByText("BR-002");
      expect(br002.length).toBeGreaterThanOrEqual(1);

      const openButtons = screen.getAllByRole("button", { name: /Open/i });
      expect(openButtons.length).toBeGreaterThanOrEqual(2);

      // Verify button layout & styling on mobile card
      const firstCardOpenBtn = openButtons.find((btn) => btn.textContent?.includes("Open"));
      expect(firstCardOpenBtn).toBeDefined();
      expect(firstCardOpenBtn?.className).toContain("h-9");
      expect(firstCardOpenBtn?.className).toContain("rounded-xl");
      expect(firstCardOpenBtn?.className).toContain("bg-primary");
    });
  });

  it("preserves desktop table and desktop operational overview on >= 1024px", () => {
    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<UserPortalBudgetWorkspaceView {...pageProps} />);

    // Desktop table must be present with hidden lg:block classes
    const desktopTable = container.querySelector(".desktop-table");
    expect(desktopTable).toBeInTheDocument();
    expect(desktopTable?.className).toContain("hidden");
    expect(desktopTable?.className).toContain("lg:block");

    // Mobile cards must have block lg:hidden classes
    const mobileCards = container.querySelector(".mobile-cards");
    expect(mobileCards).toBeInTheDocument();
    expect(mobileCards?.className).toContain("block");
    expect(mobileCards?.className).toContain("lg:hidden");
  });
});
