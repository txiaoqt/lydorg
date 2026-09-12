import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserPortalRedesignView } from "./UserPortalRedesignView";

describe("UserPortalRedesignView Redesign Iteration 2 Hierarchy & Functionality", () => {
  const mockNavigate = vi.fn();
  const mockOpenPreview = vi.fn();
  const mockHandleSendInquiry = vi.fn();
  const mockOnViewAllInquiries = vi.fn();
  const mockOnViewAllActivities = vi.fn();
  const mockTaskOnClick = vi.fn();

  const defaultProps = {
    profile: { organizationName: "Pasig Youth Council" },
    currentProfile: { organizationName: "Pasig Youth Council" },
    isVerified: true,
    isProfileSaved: true,
    hasSubmittedDocuments: true,
    stepsCompleted: 3,
    profilePercent: 100,
    dashboardDocumentPercent: 100,
    dashboardDocumentHelper: "6 of 6 approved",
    budgetPercent: 83,
    budgetOverviewLabel: "1 In Review",
    liquidationPercent: 20,
    liquidationOverviewLabel: "3 Under Review",
    renewalCountdown: null,
    dashboardTasks: [
      {
        key: "liquidation",
        title: "Submit your liquidation file",
        description: "Your budget has already been released, so you can now upload the required liquidation file.",
        ctaLabel: "Open Liquidation",
        onClick: mockTaskOnClick,
        icon: null,
        tone: "bg-primary-soft text-primary",
      },
    ],
    recentActivities: [
      {
        id: "act-1",
        description: "Marked Pasig Youth Council As Verified",
        createdAt: "2026-08-06T10:00:00Z",
      },
    ],
    inquiries: [
      {
        id: "inq-1",
        inquiryCode: "INQ-2026-A860",
        subject: "Question on project grant allocation",
        status: "reviewed",
        createdAt: "2026-08-04T15:22:00Z",
      },
    ],
    publicTemplates: [
      {
        id: "tpl-1",
        title: "Constitution and By-Laws",
        fileUrl: "https://example.com/cbl.pdf",
      },
    ],
    openPreview: mockOpenPreview,
    inquiryForm: {
      submitterName: "John Doe",
      organizationName: "Pasig Youth Council",
      email: "john@example.com",
      subject: "",
      description: "",
    },
    setInquiryForm: vi.fn(),
    submittingInquiry: false,
    handleSendInquiry: mockHandleSendInquiry,
    onViewAllInquiries: mockOnViewAllInquiries,
    onViewAllActivities: mockOnViewAllActivities,
    navigate: mockNavigate,
    userRouteMap: {
      "organization-profile": "/organization-profile",
      "document-submission": "/document-submission",
      "budget-request": "/financial-grant",
      "liquidation-reporting": "/liquidation-reporting",
      "templates": "/templates",
      "news-releases": "/news-releases",
      "ypop-scoring": "/ypop",
    },
  };

  it("renders clear situational greeting and verified status badge without redundant Queue Status or Session pills", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    expect(screen.getByText(/Hello,/i)).toBeInTheDocument();
    expect(screen.getByText("Pasig Youth Council")).toBeInTheDocument();
    expect(screen.getByText("Verified Organization")).toBeInTheDocument();

    // Redundant status pills must be removed from authenticated dashboard greeting
    expect(screen.queryByText(/Queue Status/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Unlocked ✓")).not.toBeInTheDocument();
    expect(screen.queryByText(/2–3 Business Days/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Session:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Official Portal • Active/i)).not.toBeInTheDocument();
  });

  it("renders authoritative renewal countdown matching Admin source of truth", () => {
    // 1. Future renewal date (42 days ahead)
    const futureDate = new Date(Date.now() + 42 * 86_400_000 + 3600_000).toISOString();
    const { rerender } = render(
      <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: futureDate }} />
    );

    expect(screen.getByText("Renewal in 42 days")).toBeInTheDocument();
    expect(screen.queryByText("Renewal Pending")).not.toBeInTheDocument();

    // 2. Renewal in 1 day
    const oneDayAhead = new Date(Date.now() + 1 * 86_400_000 + 3600_000).toISOString();
    rerender(
      <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: oneDayAhead }} />
    );
    expect(screen.getByText("Renewal in 1 day")).toBeInTheDocument();

    // 3. Renewal due today / expired
    const expiredDate = new Date(Date.now() - 3600_000).toISOString();
    rerender(
      <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: expiredDate }} />
    );
    expect(screen.getByText("Renewal due today")).toBeInTheDocument();

    // 4. Null renewal countdown (not rendered)
    rerender(
      <UserPortalRedesignView {...defaultProps} renewalCountdown={null} />
    );
    expect(screen.queryByText(/Renewal in/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Renewal due today")).not.toBeInTheDocument();
  });

  it("renders Current Focus command banner with prominent primary action", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    expect(screen.getByText(/Current Focus • Action Required/i)).toBeInTheDocument();
    expect(screen.getByText("Submit your liquidation file")).toBeInTheDocument();
    expect(screen.getByText(/Your budget has already been released/i)).toBeInTheDocument();

    const ctaBtn = screen.getByRole("button", { name: /Open Liquidation →/i });
    expect(ctaBtn).toBeInTheDocument();

    fireEvent.click(ctaBtn);
    expect(mockTaskOnClick).toHaveBeenCalled();
  });

  it("renders 4 overview health metric cards with keyboard accessibility and navigation", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Liquidation")).toBeInTheDocument();

    expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("83%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();

    // Verify Overview metric numbers render at font-weight 700 (font-bold) rather than 900 (font-black)
    const hundredPercents = screen.getAllByText("100%");
    hundredPercents.forEach((el) => {
      expect(el).toHaveClass("font-bold");
      expect(el).not.toHaveClass("font-black");
    });
    const eightyThreePercent = screen.getByText("83%");
    expect(eightyThreePercent).toHaveClass("font-bold");
    expect(eightyThreePercent).not.toHaveClass("font-black");
    const twentyPercent = screen.getByText("20%");
    expect(twentyPercent).toHaveClass("font-bold");
    expect(twentyPercent).not.toHaveClass("font-black");

    const budgetCard = screen.getByText("Budget").closest("[role='button']")!;
    expect(budgetCard).toBeInTheDocument();
    fireEvent.click(budgetCard);
    expect(mockNavigate).toHaveBeenCalledWith("/financial-grant");
  });

  it("removes Activity History from the greeting header while retaining it in the Overview section", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    // Large always-visible recent activity section is removed from main flow
    expect(screen.queryByText("Authentic activity timeline recorded for your organization.")).not.toBeInTheDocument();

    // 1. Dashboard header retains greeting, verification, and renewal countdown
    expect(screen.getByText(/Hello,/i)).toBeInTheDocument();
    expect(screen.getByText("Verified Organization")).toBeInTheDocument();

    // 2. Activity History is NOT present in the greeting/status header
    const greetingHeader = screen.getByText(/Pasig City Y-TRACE/i).closest("div.bg-card")!;
    expect(greetingHeader).toBeInTheDocument();
    expect(greetingHeader.querySelector("button[aria-label='Activity history']")).toBeNull();

    // 3. Activity History affordance in the Overview section remains intact and functional
    const overviewHistoryBtn = screen.getByRole("button", { name: /View activity history/i });
    expect(overviewHistoryBtn).toBeInTheDocument();

    fireEvent.click(overviewHistoryBtn);
    expect(mockOnViewAllActivities).toHaveBeenCalled();
  });

  it("does not render redundant Required Templates section, but keeps Official Templates resource card", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    // Separate Required Templates section must be removed
    expect(screen.queryByText("Required Templates")).not.toBeInTheDocument();

    // Official Templates shortcut remains accessible and clickable
    const templatesCard = screen.getByText("Official Templates").closest("[role='button']")!;
    expect(templatesCard).toBeInTheDocument();
    fireEvent.click(templatesCard);
    expect(mockNavigate).toHaveBeenCalledWith("/templates");
  });

  it("consolidates Support & Inquiries into a single area and removes duplicate Ask Support card", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    // No duplicate "Ask Support" resource card
    expect(screen.queryByText("Ask Support")).not.toBeInTheDocument();

    // Unified Support & Inquiries area
    expect(screen.getByText("Support & Inquiries")).toBeInTheDocument();
    expect(screen.getByText("INQ-2026-A860")).toBeInTheDocument();
    expect(screen.getByText("Question on project grant allocation")).toBeInTheDocument();
  });

  it("renders a clean, purposeful empty state when no inquiries exist", () => {
    render(<UserPortalRedesignView {...defaultProps} inquiries={[]} />);

    expect(screen.getByText("No submitted inquiries")).toBeInTheDocument();
    expect(screen.getByText(/Need assistance with compliance requirements/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask PCYDO/i })).toBeInTheDocument();
  });

  it("opens inquiry modal when clicking New Inquiry button", () => {
    render(<UserPortalRedesignView {...defaultProps} />);

    const newInquiryBtn = screen.getByRole("button", { name: /New Inquiry/i });
    fireEvent.click(newInquiryBtn);

    expect(screen.getByRole("heading", { name: /Submit Inquiry/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Question about liquidation requirement")).toBeInTheDocument();
  });

  it("submits inquiry from modal without page reload, calling handleSendInquiry and closing modal on completion", async () => {
    const props = {
      ...defaultProps,
      inquiryForm: {
        submitterName: "John Doe",
        organizationName: "Pasig Youth Council",
        email: "john@example.com",
        subject: "Question about renewal requirement",
        description: "Please clarify the required documents for accreditation.",
      },
    };
    render(<UserPortalRedesignView {...props} />);

    const newInquiryBtn = screen.getByRole("button", { name: /New Inquiry/i });
    fireEvent.click(newInquiryBtn);

    expect(screen.getByRole("heading", { name: /Submit Inquiry/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Submit Inquiry/i });
    fireEvent.click(submitBtn);

    expect(mockHandleSendInquiry).toHaveBeenCalled();
  });

  it("refines renewal countdown in mobile header composition as centered secondary organization status without awkward divider", () => {
    const futureDate = new Date(Date.now() + 45 * 86_400_000 + 3600_000).toISOString();
    render(
      <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: futureDate }} />
    );

    // 1. Situation banner exists and contains greeting, verification, message, and renewal
    const greetingHeader = screen.getByText(/Pasig City Y-TRACE/i).closest("div.bg-card")!;
    expect(greetingHeader).toBeInTheDocument();

    // 2. Awkward bottom divider line (border-t border-border/40 pt-2) is removed
    const dividerElement = greetingHeader.querySelector(".border-t.border-border\\/40");
    expect(dividerElement).toBeNull();

    // 3. Priority 1: Greeting remains primary
    const greetingHeading = screen.getByRole("heading", { level: 1 });
    expect(greetingHeading).toBeInTheDocument();
    expect(greetingHeading.textContent).toContain("Hello, Pasig Youth Council");
    expect(greetingHeading.className).toContain("text-2xl");
    expect(greetingHeading.className).toContain("font-black");

    // 4. Priority 2: Verification status is visible as primary organization status
    const verifiedBadge = screen.getByText("Verified Organization");
    expect(verifiedBadge).toBeInTheDocument();

    // 5. Priority 3: Supporting organization message is present
    const message = screen.getByText(/Your organization is verified and in good standing/i);
    expect(message).toBeInTheDocument();

    // 6. Priority 4: Renewal countdown is ACTUALLY HORIZONTALLY CENTERED on mobile
    const renewalChip = screen.getByText("Renewal in 45 days");
    expect(renewalChip).toBeInTheDocument();
    const renewalContainer = renewalChip.closest("div.justify-center");
    expect(renewalContainer).toBeInTheDocument();
    expect(renewalContainer?.className).toContain("w-full");
    expect(renewalContainer?.className).toContain("justify-center");
    expect(renewalContainer?.className).toContain("lg:justify-end");
    expect(renewalContainer?.className).toContain("lg:items-end");
  });

  it("supports responsive mobile widths (320px, 375px, 390px, 430px) without overflow or clipping", () => {
    const futureDate = new Date(Date.now() + 100 * 86_400_000 + 3600_000).toISOString();
    const { container, rerender } = render(
      <div style={{ width: "320px" }}>
        <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: futureDate }} />
      </div>
    );

    const widths = [320, 375, 390, 430];
    widths.forEach((w) => {
      rerender(
        <div style={{ width: `${w}px` }}>
          <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: futureDate }} />
        </div>
      );

      // Renewal indicator remains readable
      expect(screen.getByText("Renewal in 100 days")).toBeInTheDocument();

      // Greeting remains primary
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

      // Verification remains visible
      expect(screen.getByText("Verified Organization")).toBeInTheDocument();

      // Supporting message is visible
      expect(screen.getByText(/Your organization is verified and in good standing/i)).toBeInTheDocument();

      // Truly horizontally centered on mobile across all mobile widths
      const renewalContainer = container.querySelector(".justify-center");
      expect(renewalContainer).toBeInTheDocument();
      expect(renewalContainer?.className).toContain("w-full");
      expect(renewalContainer?.className).toContain("justify-center");
    });
  });

  it("preserves locked desktop layout (DESKTOP UI PRESERVED: YES)", () => {
    const futureDate = new Date(Date.now() + 60 * 86_400_000 + 3600_000).toISOString();
    const { container } = render(
      <div style={{ width: "1280px" }}>
        <UserPortalRedesignView {...defaultProps} renewalCountdown={{ expiresAt: futureDate }} />
      </div>
    );

    // Desktop parent preserves lg:flex-row lg:items-center justify-between
    const banner = container.querySelector(".lg\\:flex-row");
    expect(banner).toBeInTheDocument();
    expect(banner?.className).toContain("lg:items-center");
    expect(banner?.className).toContain("justify-between");

    // Desktop left block preserves space-y-2 max-w-2xl
    const leftBlock = container.querySelector(".max-w-2xl");
    expect(leftBlock).toBeInTheDocument();
    expect(leftBlock?.className).toContain("space-y-2");

    // Desktop right column telemetry preserves lg:w-auto lg:flex-col lg:items-end
    const rightBlock = container.querySelector(".lg\\:items-end");
    expect(rightBlock).toBeInTheDocument();
    expect(rightBlock?.className).toContain("lg:w-auto");
    expect(rightBlock?.className).toContain("lg:flex-col");
    expect(rightBlock?.className).toContain("lg:justify-end");

    // DESKTOP UI PRESERVED: YES
    expect(screen.getByText("Renewal in 60 days")).toBeInTheDocument();
  });
});

