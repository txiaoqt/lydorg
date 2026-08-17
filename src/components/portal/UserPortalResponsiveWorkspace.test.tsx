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
import { PortalDocumentPreviewModal } from "./PortalDocumentPreviewModal";

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
  const mockActivities = [
    {
      id: "act-1",
      title: "Pasig Youth Leadership Summit",
      date: "2026-08-20T00:00:00Z",
      venue: "Pasig City Hall",
      points: 15,
      description: "Leadership development workshop for youth organization officers.",
    },
  ];

  const defaultYpopProps: any = {
    ypopWorkflowEligibility: { canEditParticipation: true },
    currentProfile: { id: "org-1", organizationName: "Tadz Youth Group" },
    ypopEntries: [
      {
        id: "entry-1",
        organizationId: "org-1",
        pointsEarned: 75,
        cityLedPoints: 75,
        orgBonusPoints: 0,
      },
    ],
    ypopCityActivities: mockActivities,
    ypopEventParticipations: [
      {
        id: "part-1",
        activityId: "act-1",
        title: "City-Led Event Attended",
        description: "Organized by PCYDO Pasig City",
        date: "2026-08-20T00:00:00Z",
      },
    ],
    ypopEventFiles: [],
    ypopFiles: [],
    ypopOrgActivityFiles: [],
    activeEntry: {
      id: "entry-1",
      organizationId: "org-1",
      pointsEarned: 75,
      cityLedPoints: 75,
      orgBonusPoints: 0,
    },
    navigate: vi.fn(),
    userRouteMap: { "budget-request": "/financial-grant", ypop: "/ypop" },
    openFile: vi.fn(),
    formatDateTimeLabel: () => "Aug 20, 2026",
    formatShortPortalDate: () => "Aug 20, 2026",
    setYpopOrgActivityModalOpen: vi.fn(),
  };

  it("renders desktop layout with sticky sidebar and mobile layout with single global summary", () => {
    const { container } = render(<UserPortalYPOPWorkspaceView {...defaultYpopProps} />);

    // Verify desktop layout element exists with responsive class hidden lg:block
    const desktopLayout = container.querySelector(".desktop-layout");
    expect(desktopLayout).toBeInTheDocument();
    expect(desktopLayout?.className).toContain("hidden lg:block");

    // Verify mobile layout element exists with responsive class block lg:hidden
    const mobileLayout = container.querySelector(".mobile-layout");
    expect(mobileLayout).toBeInTheDocument();
    expect(mobileLayout?.className).toContain("block lg:hidden");

    // Verify Log PPA Activity buttons exist
    const logPpaButtons = screen.getAllByRole("button", { name: /Log PPA Activity/i });
    expect(logPpaButtons.length).toBeGreaterThan(0);

    // Verify Submit Budget Request buttons exist
    const submitBudgetButtons = screen.getAllByRole("button", { name: /Submit Budget Request →/i });
    expect(submitBudgetButtons.length).toBeGreaterThan(0);

    // Verify activities are listed
    expect(screen.getAllByText("Pasig Youth Leadership Summit").length).toBeGreaterThan(0);
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

    // Find the mobile section header toggle
    const toggleButton = mobileScope.getByRole("button", { name: /Toggle required templates section/i });
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
});



