import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BudgetMonitoringOverview,
  PurposeCategoryItem,
  formatPercentageDisplay,
} from "./BudgetMonitoringOverview";
import {
  getCategoryColor,
  createCategoryColorResolver,
} from "@/lib/budget-category-colors";
import { DEFAULT_BUDGET_MONITORING_FILTERS } from "@/lib/budget-monitoring-filters";
import { BudgetMonitoringPageControls } from "./BudgetMonitoringPageControls";

// Variable to capture props passed to Recharts Pie
let capturedPieProps: any = null;

// Mock recharts for JSDOM and capture Pie props and rendered sectors
vi.mock("recharts", async () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 260 }}>{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <svg data-testid="recharts-pie-chart">{children}</svg>
    ),
    Pie: (props: any) => {
      capturedPieProps = props;
      return (
        <g data-testid="recharts-pie" data-min-angle={props.minAngle}>
          {props.data?.map((entry: any) => (
            <path
              key={entry.name}
              className="recharts-sector"
              data-name={entry.name}
              fill={entry.color}
            />
          ))}
          {props.children}
        </g>
      );
    },
    Cell: (props: any) => <circle data-testid="recharts-cell" fill={props.fill} />,
    Tooltip: () => null,
  };
});

// Helper to convert hex to browser/jsdom rgb() string
function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

describe("BudgetMonitoringOverview UI/UX Category Color Synchronization & Donut Visibility", () => {
  const sampleCategories: PurposeCategoryItem[] = [
    { category: "education", approvedAmount: 131312312, releasedAmount: 0, count: 1 },
    { category: "environment", approvedAmount: 12323213, releasedAmount: 0, count: 1 },
    { category: "health", approvedAmount: 12323, releasedAmount: 0, count: 1 },
    { category: "peace building and security", approvedAmount: 12312, releasedAmount: 0, count: 1 },
    { category: "governance", approvedAmount: 12122, releasedAmount: 0, count: 1 },
    { category: "active citizenship", approvedAmount: 50000, releasedAmount: 0, count: 1 },
    { category: "global mobility", approvedAmount: 40000, releasedAmount: 0, count: 1 },
    { category: "social inclusion and equity", approvedAmount: 30000, releasedAmount: 0, count: 1 },
    { category: "economic empowerment", approvedAmount: 20000, releasedAmount: 0, count: 1 },
    { category: "agriculture", approvedAmount: 10000, releasedAmount: 0, count: 1 },
  ];

  const totalApproved = sampleCategories.reduce((s, c) => s + c.approvedAmount, 0);

  const defaultProps = {
    selectedFiscalYear: 2026,
    onSelectFiscalYear: vi.fn(),
    availableFiscalYears: [2026, 2025],
    annualAllocation: {
      fiscalYear: 2026,
      totalAmount: 150000000,
      notes: "FY 2026 Annual Budget",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    onOpenConfigureModal: vi.fn(),
    approvedBudget: totalApproved,
    releasedBudget: 5000000,
    liquidatedBudget: 2000000,
    pendingDisbursement: 3000000,
    categoryBreakdown: sampleCategories,
    formatPesoAmount: (val?: number | null) =>
      val !== null && val !== undefined ? `₱${Number(val).toLocaleString()}` : "—",
    formatCompactPeso: (val: number) => `₱${val.toLocaleString()}`,
  };

  // ==========================================
  // PART 8 REQUIRED TESTS (TESTS A through F)
  // ==========================================

  it("TEST A — The <Pie> keeps value-proportional slices without imposing a minimum angle", () => {
    render(<BudgetMonitoringOverview {...defaultProps} />);
    expect(capturedPieProps).toBeDefined();
    expect(capturedPieProps.minAngle).toBeUndefined();
    expect(capturedPieProps.stroke).toBe("#ffffff");
    expect(capturedPieProps.strokeWidth).toBe(2);
  });

  it("TEST B — All non-zero donut categories retain their fill and color synchronization", () => {
    const { container } = render(<BudgetMonitoringOverview {...defaultProps} />);
    const resolver = createCategoryColorResolver(sampleCategories);

    expect(capturedPieProps).toBeDefined();
    const data = capturedPieProps.data;
    expect(data.length).toBe(sampleCategories.length);

    data.forEach((entry: any) => {
      expect(entry.value).toBeGreaterThan(0);
      const expectedColor = resolver(entry.name);
      expect(entry.color).toBe(expectedColor);
    });

    // Check that table dots match resolver colors
    const top5 = sampleCategories.slice(0, 5);
    const tableRows = container.querySelectorAll("tbody tr");
    expect(tableRows.length).toBe(5);

    top5.forEach((item, idx) => {
      const row = tableRows[idx];
      const colorDot = row.querySelector("span.rounded-full") as HTMLElement;
      expect(colorDot).toBeInTheDocument();
      const expectedRgb = hexToRgb(resolver(item.category));
      expect(colorDot.style.backgroundColor).toBe(expectedRgb);
    });
  });

  it("TEST C — Tiny categories are still present in the donut data and formatted with <1%", () => {
    render(<BudgetMonitoringOverview {...defaultProps} />);

    expect(capturedPieProps).toBeDefined();
    const data = capturedPieProps.data;

    // Slices at index 2, 3, 4 are canonical purposes with small allocations.
    const tinyCategory1 = data.find((d: any) => d.name === "Health");
    const tinyCategory2 = data.find((d: any) => d.name === "Peace Building And Security");
    const tinyCategory3 = data.find((d: any) => d.name === "Governance");

    expect(tinyCategory1).toBeDefined();
    expect(tinyCategory1.value).toBe(12323);
    expect(tinyCategory1.pctDisplay).toBe("<1%");

    expect(tinyCategory2).toBeDefined();
    expect(tinyCategory2.value).toBe(12312);
    expect(tinyCategory2.pctDisplay).toBe("<1%");

    expect(tinyCategory3).toBeDefined();
    expect(tinyCategory3.value).toBe(12122);
    expect(tinyCategory3.pctDisplay).toBe("<1%");

    // Every small category still gets its own external label.
    for (const slice of [tinyCategory1, tinyCategory2, tinyCategory3]) {
      const label = capturedPieProps.label({
        name: slice.name,
        midAngle: 20,
        cx: 200,
        cy: 150,
        outerRadius: 90,
      });
      expect(label.props["aria-label"]).toContain("<1%");
    }
  });

  it("TEST D — Percentage formatter correctly formats whole, sub-1%, and zero percentages", () => {
    // Direct percentage inputs
    expect(formatPercentageDisplay(91.39)).toBe("91%");
    expect(formatPercentageDisplay(8.58)).toBe("9%");
    expect(formatPercentageDisplay(0.008)).toBe("<1%");
    expect(formatPercentageDisplay(0)).toBe("0%");

    // Value + Total inputs
    const total = 143687070;
    expect(formatPercentageDisplay(131312312, total)).toBe("91%");
    expect(formatPercentageDisplay(12323213, total)).toBe("9%");
    expect(formatPercentageDisplay(12323, total)).toBe("<1%");
    expect(formatPercentageDisplay(0, total)).toBe("0%");
  });

  it("TEST E — Every real category gets its own donut segment with no catch-all", () => {
    // 1 Category: exactly 1 slice, 100%, no Other Categories
    const singleCategory: PurposeCategoryItem[] = [
      { category: "education", approvedAmount: 500000, releasedAmount: 0, count: 1 },
    ];
    const { unmount: unmount1 } = render(
      <BudgetMonitoringOverview
        {...defaultProps}
        categoryBreakdown={singleCategory}
        approvedBudget={500000}
      />
    );
    expect(capturedPieProps.data.length).toBe(1);
    expect(capturedPieProps.data[0].name).toBe("Education");
    expect(capturedPieProps.data[0].pctDisplay).toBe("100%");
    unmount1();

    // 2 Categories: exactly 2 slices, proportional
    const twoCategories: PurposeCategoryItem[] = [
      { category: "Education", approvedAmount: 600000, releasedAmount: 0, count: 1 },
      { category: "Health", approvedAmount: 400000, releasedAmount: 0, count: 1 },
    ];
    const { unmount: unmount2 } = render(
      <BudgetMonitoringOverview
        {...defaultProps}
        categoryBreakdown={twoCategories}
        approvedBudget={1000000}
      />
    );
    expect(capturedPieProps.data.length).toBe(2);
    expect(capturedPieProps.data[0].pctDisplay).toBe("60%");
    expect(capturedPieProps.data[1].pctDisplay).toBe("40%");
    unmount2();

    // 5 Categories: exactly 5 slices, no Other Categories
    const fiveCategories = sampleCategories.slice(0, 5);
    const fiveTotal = fiveCategories.reduce((s, c) => s + c.approvedAmount, 0);
    const { unmount: unmount3 } = render(
      <BudgetMonitoringOverview
        {...defaultProps}
        categoryBreakdown={fiveCategories}
        approvedBudget={fiveTotal}
      />
    );
    expect(capturedPieProps.data.length).toBe(5);
    expect(capturedPieProps.data.find((d: any) => d.name === "Other Categories")).toBeUndefined();
    unmount3();

    // Every current canonical category gets its own distinct slice.
    render(<BudgetMonitoringOverview {...defaultProps} />);
    expect(capturedPieProps.data.length).toBe(sampleCategories.length);
    expect(capturedPieProps.data.map((d: any) => d.name)).toEqual(sampleCategories.map((item) =>
      item.category.split(" ").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
    ));
    expect(capturedPieProps.data.map((d: any) => d.name)).not.toContain("Other Categories");
    expect(capturedPieProps.data.map((d: any) => d.name)).not.toContain("Other Programs");
    expect(capturedPieProps.data.reduce((sum: number, d: any) => sum + d.value, 0)).toBe(totalApproved);
    expect(new Set(capturedPieProps.data.map((d: any) => d.color)).size).toBe(sampleCategories.length);
    expect(typeof capturedPieProps.label).toBe("function");
    expect(capturedPieProps.labelLine).toBe(false);
    expect(capturedPieProps.minAngle).toBeUndefined();
    for (const slice of capturedPieProps.data) {
      const label = capturedPieProps.label({
        name: slice.name,
        midAngle: 20,
        cx: 200,
        cy: 150,
        outerRadius: 90,
      });
      expect(label).not.toBeNull();
      expect(label.props["aria-label"]).toContain(slice.name);
    }
  });

  it("TEST F — FY/category changes do not break color mapping", () => {
    const fy2025Categories: PurposeCategoryItem[] = [
      { category: "environment", approvedAmount: 800000, releasedAmount: 0, count: 2 },
      { category: "agriculture", approvedAmount: 400000, releasedAmount: 0, count: 1 },
    ];
    const fy2025Total = 1200000;

    const { rerender } = render(
      <BudgetMonitoringOverview
        {...defaultProps}
        selectedFiscalYear={2025}
        categoryBreakdown={fy2025Categories}
        approvedBudget={fy2025Total}
      />
    );

    expect(capturedPieProps.data.length).toBe(2);
    const resolver2025 = createCategoryColorResolver(fy2025Categories);
    expect(capturedPieProps.data[0].color).toBe(resolver2025("environment"));
    expect(capturedPieProps.data[1].color).toBe(resolver2025("agriculture"));

    // Switch back to FY 2026
    rerender(<BudgetMonitoringOverview {...defaultProps} />);
    expect(capturedPieProps.data.length).toBe(sampleCategories.length);
    const resolver2026 = createCategoryColorResolver(sampleCategories);
    expect(capturedPieProps.data[0].color).toBe(resolver2026("education"));
  });

  it.each([2024, 2025, 2026])("keeps the FY %i label and full filtered donut total synchronized", (year) => {
    const selected = sampleCategories.slice(0, year === 2024 ? 2 : year === 2025 ? 8 : 10);
    const selectedTotal = selected.reduce((sum, category) => sum + category.approvedAmount, 0);
    render(
      <BudgetMonitoringOverview
        {...defaultProps}
        selectedFiscalYear={year}
        categoryBreakdown={selected}
        approvedBudget={selectedTotal}
      />,
    );
    expect(capturedPieProps.data).toHaveLength(selected.length);
    expect(capturedPieProps.data.reduce((sum: number, slice: { value: number }) => sum + slice.value, 0)).toBe(selectedTotal);
    expect(screen.getByText(`FY ${year}`, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(defaultProps.formatCompactPeso(selectedTotal), { selector: "p.text-public-text-brand" })).toBeInTheDocument();
  });

  it("keeps four summary metrics and one proportional three-segment pipeline", () => {
    render(
      <BudgetMonitoringOverview
        {...defaultProps}
        annualAllocation={{ ...defaultProps.annualAllocation, totalAmount: 150_000 }}
        approvedBudget={44_656}
        releasedBudget={21_213}
        liquidatedBudget={10_000}
        pendingDisbursement={23_443}
      />,
    );

    expect(screen.getByText("FY Budget Allocation")).toBeInTheDocument();
    expect(screen.getByText("Approved / Committed")).toBeInTheDocument();
    expect(screen.getAllByText("Released Budget")).toHaveLength(2);
    expect(screen.getByText("Liquidated Budget")).toBeInTheDocument();
    expect(screen.queryByText("Active in Field")).toBeNull();
    expect(screen.getByText("Budget Execution Pipeline · FY 2026")).toBeInTheDocument();
    const track = screen.getByRole("img", { name: /Budget execution pipeline/ });
    const widths = Array.from(track.querySelectorAll<HTMLElement>("[data-budget-state]"), (segment) => parseFloat(segment.style.width));
    expect(widths).toHaveLength(3);
    expect(widths[0]).toBeCloseTo((21_213 / 150_000) * 100, 6);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 6);
    expect(track).toHaveAttribute("aria-label", expect.stringContaining("Released & Liquidated: ₱21,213"));
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  // ==========================================
  // TABLE PAGINATION AND FILTERING TESTS
  // ==========================================

  it("Pagination: Page 2 preserves the canonical color mapping", () => {
    const { container } = render(<BudgetMonitoringOverview {...defaultProps} />);
    const resolver = createCategoryColorResolver(sampleCategories);

    // Click Next Page button
    const nextBtn = screen.getByLabelText("Next page");
    expect(nextBtn).toBeDefined();
    fireEvent.click(nextBtn);

    // Now on Page 2 (the remaining canonical categories after the first five)
    const page2Categories = sampleCategories.slice(5, 10);
    const tableRows = container.querySelectorAll("tbody tr");
    expect(tableRows.length).toBe(page2Categories.length);

    page2Categories.forEach((item, idx) => {
      const row = tableRows[idx];
      const colorDot = row.querySelector("span.rounded-full") as HTMLElement;
      expect(colorDot).toBeInTheDocument();

      const expectedColorHex = resolver(item.category);
      const expectedRgb = hexToRgb(expectedColorHex);
      expect(colorDot.style.backgroundColor).toBe(expectedRgb);

      expect(colorDot.style.backgroundColor).toBe(hexToRgb(getCategoryColor(item.category)));
    });

    // Return to Page 1
    const prevBtn = screen.getByLabelText("Previous page");
    expect(prevBtn).toBeDefined();
    fireEvent.click(prevBtn);

    // Page 1 colors are still exact
    const top5 = sampleCategories.slice(0, 5);
    const tableRowsP1 = container.querySelectorAll("tbody tr");
    top5.forEach((item, idx) => {
      const colorDot = tableRowsP1[idx].querySelector("span.rounded-full") as HTMLElement;
      expect(colorDot.style.backgroundColor).toBe(hexToRgb(resolver(item.category)));
    });
  });

  it("Page controls keep the fiscal period separate from panel filters", () => {
    render(<BudgetMonitoringPageControls filters={DEFAULT_BUDGET_MONITORING_FILTERS} availableFiscalYears={[2026, 2025, 2024]} filterOptions={{ availableCategories: [], availableClassifications: [], availableDistricts: [], availableBarangays: [] }} onChangeFilters={vi.fn()} onResetFilters={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Select fiscal period/i })).toHaveTextContent(/FY/);
    expect(screen.getByRole("button", { name: /Open Budget Filters/i })).toHaveTextContent("Filters");
    fireEvent.click(screen.getByRole("button", { name: /Open Budget Filters/i }));
    expect(screen.queryByText("Time Period")).toBeNull();
  });

  it("Filter synchronization: Single category filter recalculates 100% of Total on Donut and Table", () => {
    const singleFilteredCategory: PurposeCategoryItem[] = [
      { category: "environment", approvedAmount: 20000, releasedAmount: 15000, count: 1 },
    ];
    render(
      <BudgetMonitoringOverview
        {...defaultProps}
        categoryBreakdown={singleFilteredCategory}
        approvedBudget={20000}
        releasedBudget={15000}
        filters={{
          ...DEFAULT_BUDGET_MONITORING_FILTERS,
          purposeCategory: "environment",
        }}
      />
    );

    expect(capturedPieProps.data.length).toBe(1);
    expect(capturedPieProps.data[0].name).toBe("Environment");
    expect(capturedPieProps.data[0].pctDisplay).toBe("100%");

    // Table displays 100.0% of total
    expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);
  });

  it("Empty State: Displays clear empty message when filters produce no results", () => {
    render(
      <BudgetMonitoringOverview
        {...defaultProps}
        categoryBreakdown={[]}
        approvedBudget={0}
        releasedBudget={0}
      />
    );

    expect(screen.getByText(/No Approved Budget Requests for FY 2026/i)).toBeInTheDocument();
  });
});
