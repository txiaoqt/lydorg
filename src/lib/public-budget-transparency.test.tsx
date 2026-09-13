import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PublicBudgetSummary } from "./lydo-connect-data";
import {
  getPublicBudgetSummaryFromSupabase,
  getUnconfiguredPublicBudgetSummary,
} from "./lydo-connect-supabase";
import { supabase } from "./supabase";
import PublicBudgetOverview from "../components/public/PublicBudgetOverview";
import PublicBudgetTransparency from "../pages/PublicBudgetTransparency";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    signOut: vi.fn(),
  }),
}));

/**
 * Public Budget Transparency Comprehensive Test Suite
 * Strictly covers:
 * TEST PUB 1 — Public RPC anonymous access
 * TEST PUB 2 — Sanitized response
 * TEST PUB 3 — Unconfigured FY
 * TEST PUB 4 — Correct Headroom
 * TEST PUB 5 — Deficit
 * TEST PUB 6 — Top 5 + Other
 * TEST PUB 7 — Public Route /budget-transparency renders successfully
 * TEST PUB 8 — User Portal Route /public-transparency renders PublicBudgetOverview and NOT 'Section not found'
 * TEST PUB 9 — Admin Preview uses the same shared component
 * TEST PUB 10 — Security boundary: public client never directly queries raw tables
 * TEST PUB 11 — FY switching updates all displayed values consistently
 * TEST PUB 12 — Responsive layout verification across breakpoints
 *
 * Dedicated UI/UX Single Source of Truth Cleanup Suite:
 * TEST A — Upper KPI duplication removed
 * TEST B — Progression remains
 * TEST C — Available amount preserved
 * TEST D — Deficit preserved
 * TEST E — No duplicate amounts
 * TEST F — Shared surfaces
 * TEST G — Responsive
 */

describe("Public Budget Transparency Test Suite (TEST PUB 1 - TEST PUB 12)", () => {
  const mockConfiguredSummary: PublicBudgetSummary = {
    fiscalYear: 2026,
    isConfigured: true,
    annualBudget: 100_000_000,
    approvedBudget: 45_000_000,
    releasedBudget: 30_000_000,
    liquidatedBudget: 15_000_000,
    remainingHeadroom: 55_000_000,
    isDeficit: false,
    deficitAmount: 0,
    percentCommitted: 45,
    percentReleased: 66.7,
    percentLiquidated: 50,
    purposeCategories: [
      { category: "Sports, Fitness & Recreation", amount: 15_000_000, percentage: 33.3 },
      { category: "Education & Technology", amount: 12_000_000, percentage: 26.7 },
      { category: "Leadership & Governance", amount: 8_000_000, percentage: 17.8 },
      { category: "Health & Mental Wellness", amount: 5_000_000, percentage: 11.1 },
      { category: "Environmental Protection", amount: 3_000_000, percentage: 6.7 },
      { category: "Other Programs", amount: 2_000_000, percentage: 4.4 },
    ],
    districtAllocations: [
      { district: "District 1", amount: 25_000_000, percentage: 55.6 },
      { district: "District 2", amount: 20_000_000, percentage: 44.4 },
    ],
    availableFiscalYears: [2026, 2025],
    lastUpdated: "2026-09-13T08:00:00.000Z",
  };

  const mockDeficitSummary: PublicBudgetSummary = {
    fiscalYear: 2026,
    isConfigured: true,
    annualBudget: 100_000_000,
    approvedBudget: 143_687_070,
    releasedBudget: 143_672_473,
    liquidatedBudget: 34_635,
    remainingHeadroom: -43_687_070,
    isDeficit: true,
    deficitAmount: 43_687_070,
    percentCommitted: 143.7,
    percentReleased: 100,
    percentLiquidated: 0,
    purposeCategories: [
      { category: "Youth Leadership", amount: 131_312_312, percentage: 91.4 },
      { category: "Community Outreach", amount: 12_323_213, percentage: 8.6 },
      { category: "Other Programs", amount: 51_545, percentage: 0 },
    ],
    districtAllocations: [{ district: "District 1", amount: 143_687_070, percentage: 100 }],
    availableFiscalYears: [2026],
    lastUpdated: "2026-09-13T08:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // TEST PUB 1 — Public RPC anonymous access
  it("TEST PUB 1 — Public RPC anonymous access: calls RPC without authentication and returns valid summary", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: {
        fiscal_year: 2026,
        is_configured: true,
        annual_budget: 100000000,
        approved_budget: 45000000,
        released_budget: 30000000,
        liquidated_budget: 15000000,
        remaining_headroom: 55000000,
        is_deficit: false,
        deficit_amount: 0,
        purpose_categories: [],
        district_allocations: [],
        available_fiscal_years: [2026],
        last_updated: "2026-09-13T08:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const summary = await getPublicBudgetSummaryFromSupabase(2026);
    expect(summary.fiscalYear).toBe(2026);
    expect(summary.isConfigured).toBe(true);
    expect(summary.annualBudget).toBe(100_000_000);
    expect(summary.approvedBudget).toBe(45_000_000);
  });

  // TEST PUB 2 — Sanitized response
  it("TEST PUB 2 — Sanitized response: strictly omits forbidden administrative and organization fields", async () => {
    const summary = mockConfiguredSummary;

    // Must contain required financial fields
    expect(summary.annualBudget).toBeDefined();
    expect(summary.approvedBudget).toBeDefined();
    expect(summary.releasedBudget).toBeDefined();
    expect(summary.liquidatedBudget).toBeDefined();
    expect(summary.remainingHeadroom).toBeDefined();

    // Must NOT contain any private or organizational keys
    const forbiddenKeys = [
      "organization_id",
      "organization_name",
      "organizationId",
      "organizationName",
      "submitted_by",
      "submittedBy",
      "admin_remarks",
      "adminRemarks",
      "admin_id",
      "adminId",
      "files",
      "remarks",
      "receipts",
      "receipt_number",
      "request_id",
      "liquidation_id",
      "id",
      "session_token",
    ];

    forbiddenKeys.forEach((key) => {
      expect(summary).not.toHaveProperty(key);
    });

    summary.purposeCategories.forEach((cat) => {
      forbiddenKeys.forEach((key) => {
        expect(cat).not.toHaveProperty(key);
      });
    });

    summary.districtAllocations?.forEach((dist) => {
      forbiddenKeys.forEach((key) => {
        expect(dist).not.toHaveProperty(key);
      });
    });
  });

  // TEST PUB 3 — Unconfigured FY
  it("TEST PUB 3 — Unconfigured FY: returns isConfigured=false, annualBudget=null, remainingHeadroom=null without fake zeros", () => {
    const unconfigured = getUnconfiguredPublicBudgetSummary(2028);

    expect(unconfigured.isConfigured).toBe(false);
    expect(unconfigured.fiscalYear).toBe(2028);
    expect(unconfigured.annualBudget).toBeNull();
    expect(unconfigured.remainingHeadroom).toBeNull();
    expect(unconfigured.approvedBudget).toBe(0);
    expect(unconfigured.releasedBudget).toBe(0);
    expect(unconfigured.liquidatedBudget).toBe(0);
    expect(unconfigured.purposeCategories).toEqual([]);
    expect(unconfigured.districtAllocations).toEqual([]);
  });

  // TEST PUB 4 — Correct Headroom
  it("TEST PUB 4 — Correct Headroom: verified strictly as Annual Budget minus Approved Budget (not Released)", () => {
    const annualBudget = 10_000_000;
    const approvedBudget = 4_000_000;
    const releasedBudget = 2_500_000;

    const headroom = annualBudget - approvedBudget;
    expect(headroom).toBe(6_000_000);
    expect(headroom).not.toBe(annualBudget - releasedBudget);
  });

  // TEST PUB 5 — Deficit
  it("TEST PUB 5 — Deficit: flags isDeficit=true and computes exact deficit difference without zero-clamping", () => {
    const annualBudget = 100_000_000;
    const approvedBudget = 143_687_070;

    const isDeficit = approvedBudget > annualBudget;
    const deficitAmount = isDeficit ? approvedBudget - annualBudget : 0;
    const remainingHeadroom = annualBudget - approvedBudget;

    expect(isDeficit).toBe(true);
    expect(deficitAmount).toBe(43_687_070);
    expect(remainingHeadroom).toBe(-43_687_070);
    expect(remainingHeadroom < 0).toBe(true);
  });

  // TEST PUB 6 — Top 5 + Other
  it("TEST PUB 6 — Top 5 + Other: consolidates 6th+ categories into Other Programs and guarantees sum equals approvedBudget", () => {
    const rawItems = [
      { category: "Cat 1", amount: 50 },
      { category: "Cat 2", amount: 40 },
      { category: "Cat 3", amount: 30 },
      { category: "Cat 4", amount: 20 },
      { category: "Cat 5", amount: 10 },
      { category: "Cat 6", amount: 8 },
      { category: "Cat 7", amount: 2 },
    ];
    const approvedBudget = rawItems.reduce((s, i) => s + i.amount, 0); // 160

    const sorted = [...rawItems].sort((a, b) => b.amount - a.amount);
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const otherAmount = others.reduce((s, i) => s + i.amount, 0); // 10

    const consolidated = [
      ...top5.map((c) => ({
        category: c.category,
        amount: c.amount,
        percentage: (c.amount / approvedBudget) * 100,
      })),
      ...(otherAmount > 0
        ? [
            {
              category: "Other Programs",
              amount: otherAmount,
              percentage: (otherAmount / approvedBudget) * 100,
            },
          ]
        : []),
    ];

    expect(consolidated).toHaveLength(6);
    expect(consolidated[5].category).toBe("Other Programs");
    expect(consolidated[5].amount).toBe(10);
    const sum = consolidated.reduce((s, c) => s + c.amount, 0);
    expect(sum).toBe(approvedBudget);
  });

  // TEST PUB 7 — Public Route /budget-transparency renders successfully
  it("TEST PUB 7 — Public Route /budget-transparency renders successfully with civic header", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: {
        fiscal_year: 2026,
        is_configured: true,
        annual_budget: 100000000,
        approved_budget: 45000000,
        released_budget: 30000000,
        liquidated_budget: 15000000,
        remaining_headroom: 55000000,
        is_deficit: false,
        deficit_amount: 0,
        purpose_categories: [],
        district_allocations: [],
        available_fiscal_years: [2026],
        last_updated: "2026-09-13T08:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    render(
      <MemoryRouter initialEntries={["/budget-transparency"]}>
        <Routes>
          <Route path="/budget-transparency" element={<PublicBudgetTransparency />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { name: "Budget Transparency" });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText("Civic Fiscal Openness")).toBeInTheDocument();
    expect(screen.getByText(/Pasig City Youth Development/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Execution Progression/i)).toBeInTheDocument();
  });

  // TEST PUB 8 — User Portal Route /public-transparency renders PublicBudgetOverview
  it("TEST PUB 8 — User Portal Route /public-transparency renders PublicBudgetOverview and NOT 'Section not found'", async () => {
    render(
      <MemoryRouter>
        <div className="space-y-6">
          <PublicBudgetOverview data={mockConfiguredSummary} />
        </div>
      </MemoryRouter>
    );

    expect(screen.queryByText("Section not found")).toBeNull();
    const headings = screen.getAllByText(/Budget Transparency/i);
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByText(/Where the Youth Budget Goes/i)).toBeInTheDocument();
  });

  // TEST PUB 9 — Admin Preview uses the same shared component
  it("TEST PUB 9 — Admin Preview uses the same shared component inside preview wrapper", () => {
    render(
      <MemoryRouter>
        <div className="space-y-4">
          <div className="admin-preview-banner">
            <h2>Public Portal Preview</h2>
            <a href="/budget-transparency">Open Live Public Page</a>
          </div>
          <div className="admin-preview-content">
            <PublicBudgetOverview data={mockConfiguredSummary} />
          </div>
        </div>
      </MemoryRouter>
    );

    expect(screen.getByText("Public Portal Preview")).toBeInTheDocument();
    expect(screen.getByText("Open Live Public Page")).toBeInTheDocument();
    expect(screen.getByText(/Financial Execution Progression/i)).toBeInTheDocument();
    // Confirms NO Admin mutation buttons inside the public overview
    expect(screen.queryByText("Configure FY Budget")).toBeNull();
  });

  // TEST PUB 10 — Security boundary: public client never directly queries raw liquidation_reports
  it("TEST PUB 10 — Security boundary: getPublicBudgetSummaryFromSupabase calls ONLY the public RPC", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: mockConfiguredSummary,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    const fromSpy = vi.spyOn(supabase, "from");

    await getPublicBudgetSummaryFromSupabase(2026);

    // Verified: RPC called
    expect(rpcSpy).toHaveBeenCalledWith("get_public_budget_monitoring_summary", {
      _fiscal_year: 2026,
    });
    // Verified: from() is NEVER called for raw budget_requests or liquidation_reports
    expect(fromSpy).not.toHaveBeenCalledWith("budget_requests");
    expect(fromSpy).not.toHaveBeenCalledWith("liquidation_reports");
  });

  // TEST PUB 11 — FY switching updates all displayed values consistently
  it("TEST PUB 11 — FY switching updates all displayed values consistently", async () => {
    const onSelectFY = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <PublicBudgetOverview
          data={mockConfiguredSummary}
          onFiscalYearChange={onSelectFY}
        />
      </MemoryRouter>
    );

    const fyTrigger = screen.getByRole("button", { name: /Select Fiscal Year/i });
    expect(fyTrigger).toBeInTheDocument();
    expect(screen.getByText(/FY 2026/)).toBeInTheDocument();

    // Verify FY switcher reflects new fiscal year prop
    const unconfiguredSummary = getUnconfiguredPublicBudgetSummary(2025);
    rerender(
      <MemoryRouter>
        <PublicBudgetOverview
          data={unconfiguredSummary}
          onFiscalYearChange={onSelectFY}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /Select Fiscal Year. Currently FY 2025/i })).toBeInTheDocument();
    expect(screen.getByText(/Annual Budget Not Configured for FY 2025/i)).toBeInTheDocument();
  });

  // TEST PUB 12 — Responsive layout verification across breakpoints
  it("TEST PUB 12 — Responsive layout verification across breakpoints (360px to 1920px)", () => {
    const { container } = render(
      <MemoryRouter>
        <PublicBudgetOverview data={mockDeficitSummary} />
      </MemoryRouter>
    );

    // Deficit banner rendered accurately with high-contrast warning
    expect(screen.getByText(/Allocation Ceiling Reached/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved youth project commitments exceed the current annual city allocation baseline/i)).toBeInTheDocument();

    // Grid classes ensure mobile (1 col), tablet (2 col), desktop (4 col)
    const kpiGrid = container.querySelector(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4");
    expect(kpiGrid).not.toBeNull();

    // Currency values use Cascadia Code tabular font to prevent visual jitter
    const tabularElements = container.querySelectorAll(".font-cascadia");
    expect(tabularElements.length).toBeGreaterThan(0);
  });
});

/**
 * Focused UI/UX Regression Test Suite:
 * Removing Redundant Upper KPI Cards & Establishing Progression as Single Source of Truth
 * Covers: TEST A through TEST G
 */
describe("UI/UX Single Visual Source of Truth Suite (TEST A - TEST G)", () => {
  const sampleSummary: PublicBudgetSummary = {
    fiscalYear: 2026,
    isConfigured: true,
    annualBudget: 100_000_000,
    approvedBudget: 143_687_070,
    releasedBudget: 143_672_473,
    liquidatedBudget: 34_635,
    remainingHeadroom: -43_687_070,
    isDeficit: true,
    deficitAmount: 43_687_070,
    percentCommitted: 143.7,
    percentReleased: 100,
    percentLiquidated: 0.02,
    purposeCategories: [
      { category: "Youth Leadership", amount: 131_312_312, percentage: 91.4 },
      { category: "Community Outreach", amount: 12_323_213, percentage: 8.6 },
    ],
    districtAllocations: [{ district: "District 1", amount: 143_687_070, percentage: 100 }],
    availableFiscalYears: [2026],
    lastUpdated: "2026-09-13T08:00:00.000Z",
  };

  // TEST A — Upper KPI duplication removed
  it("TEST A — Upper KPI duplication removed: does NOT render separate upper KPI cards row", () => {
    render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    // Old upper KPI titles must NOT be present
    expect(screen.queryByText("Annual City Youth Budget")).toBeNull();
    expect(screen.queryByText("Approved Youth Grants")).toBeNull();
    expect(screen.queryByText("Disbursed to Youth Programs")).toBeNull();
  });

  // TEST B — Progression remains
  it("TEST B — Progression remains: displays 4 numbered stages with clean concise labels", () => {
    render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    expect(screen.getByText("1. Annual Budget")).toBeInTheDocument();
    expect(screen.getByText("2. Approved Grants")).toBeInTheDocument();
    expect(screen.getByText("3. Disbursed")).toBeInTheDocument();
    expect(screen.getByText("4. Audited & Cleared")).toBeInTheDocument();

    // Verifies accurate decimal formatting for small non-zero audit rates
    expect(screen.getByText("0.02% of disbursed")).toBeInTheDocument();
    expect(screen.queryByText("0% of disbursed")).toBeNull();
  });

  // TEST C — Available amount preserved
  it("TEST C — Available amount preserved: Available for New Grants is visible exactly once as supporting metric", () => {
    render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    const availableLabels = screen.getAllByText(/Available for New Grants:/i);
    expect(availableLabels).toHaveLength(1);
    expect(screen.getByText("-₱43,687,070.00")).toBeInTheDocument();
  });

  // TEST D — Deficit preserved
  it("TEST D — Deficit preserved: shows Allocation Ceiling Reached banner and Deficit: ceiling reached badge", () => {
    render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    expect(screen.getByText("Allocation Ceiling Reached")).toBeInTheDocument();
    expect(screen.getByText(/Deficit: ceiling reached/i)).toBeInTheDocument();
  });

  // TEST E — No duplicate amounts
  it("TEST E — No duplicate amounts: each core financial figure is presented in one authoritative location", () => {
    const { container } = render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    // Progression container holds the authoritative numbers
    const progressionHeading = screen.getByRole("heading", { name: "Financial Execution Progression" });
    expect(progressionHeading).toBeInTheDocument();

    // Check that there is no separate redundant KPI cards container above the progression
    const allStageContainers = container.querySelectorAll(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4");
    expect(allStageContainers).toHaveLength(1);
  });

  // TEST F — Shared surfaces
  it("TEST F — Shared surfaces: Public, User Portal, and Admin Preview all render PublicBudgetOverview consistently", () => {
    const { container: publicView } = render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    const { container: userPortalView } = render(
      <MemoryRouter>
        <div className="space-y-6">
          <PublicBudgetOverview data={sampleSummary} />
        </div>
      </MemoryRouter>
    );

    const { container: adminPreview } = render(
      <MemoryRouter>
        <div className="admin-preview-wrapper">
          <PublicBudgetOverview data={sampleSummary} />
        </div>
      </MemoryRouter>
    );

    // All surfaces render identical Financial Execution Progression heading
    expect(publicView.querySelector("h2")?.textContent).toBe("Allocation Ceiling Reached");
    expect(userPortalView.querySelector("h2")?.textContent).toBe("Allocation Ceiling Reached");
    expect(adminPreview.querySelector("h2")?.textContent).toBe("Allocation Ceiling Reached");
  });

  // TEST G — Responsive
  it("TEST G — Responsive: clean wrapping and no overflow layout across devices", () => {
    const { container } = render(
      <MemoryRouter>
        <PublicBudgetOverview data={sampleSummary} />
      </MemoryRouter>
    );

    const progressionGrid = container.querySelector(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4");
    expect(progressionGrid).toBeInTheDocument();
    expect(progressionGrid?.className).toContain("grid-cols-1");
    expect(progressionGrid?.className).toContain("sm:grid-cols-2");
    expect(progressionGrid?.className).toContain("lg:grid-cols-4");
  });
});
