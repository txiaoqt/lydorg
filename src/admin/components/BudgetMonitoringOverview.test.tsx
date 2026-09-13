import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BudgetMonitoringOverview,
  PurposeCategoryItem,
  formatPercentageDisplay,
} from "./BudgetMonitoringOverview";
import {
  OTHER_CATEGORY_COLOR,
  getCategoryColor,
  createCategoryColorResolver,
} from "@/lib/budget-category-colors";

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
    { category: "adsdasdasdasda", approvedAmount: 131312312, releasedAmount: 0, count: 1 },
    { category: "asdasda", approvedAmount: 12323213, releasedAmount: 0, count: 1 },
    { category: "dsadas", approvedAmount: 12323, releasedAmount: 0, count: 1 },
    { category: "dasdad", approvedAmount: 12312, releasedAmount: 0, count: 1 },
    { category: "DSADASDA", approvedAmount: 12122, releasedAmount: 0, count: 1 },
    { category: "Youth Livelihood Initiative", approvedAmount: 50000, releasedAmount: 0, count: 1 },
    { category: "Community Health Outreach", approvedAmount: 40000, releasedAmount: 0, count: 1 },
    { category: "Digital Skills Boot Camp", approvedAmount: 30000, releasedAmount: 0, count: 1 },
    { category: "Clean and Green Drive", approvedAmount: 20000, releasedAmount: 0, count: 1 },
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
    activeInField: 1000000,
    categoryBreakdown: sampleCategories,
    formatPesoAmount: (val?: number | null) =>
      val !== null && val !== undefined ? `₱${Number(val).toLocaleString()}` : "—",
    formatCompactPeso: (val: number) => `₱${val.toLocaleString()}`,
  };

  // ==========================================
  // PART 8 REQUIRED TESTS (TESTS A through F)
  // ==========================================

  it("TEST A — The <Pie> configuration includes minAngle = 4", () => {
    render(<BudgetMonitoringOverview {...defaultProps} />);
    expect(capturedPieProps).toBeDefined();
    expect(capturedPieProps.minAngle).toBe(4);
    expect(capturedPieProps.stroke).toBe("#ffffff");
    expect(capturedPieProps.strokeWidth).toBe(2);
  });

  it("TEST B — All non-zero donut categories retain their fill and color synchronization", () => {
    const { container } = render(<BudgetMonitoringOverview {...defaultProps} />);
    const resolver = createCategoryColorResolver(sampleCategories);

    expect(capturedPieProps).toBeDefined();
    const data = capturedPieProps.data;
    expect(data.length).toBe(6); // Top 5 + Other Categories

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

    // Slices at index 2, 3, 4 are the tiny categories: dsadas (₱12,323), dasdad (₱12,312), DSADASDA (₱12,122)
    const tinyCategory1 = data.find((d: any) => d.name === "dsadas");
    const tinyCategory2 = data.find((d: any) => d.name === "dasdad");
    const tinyCategory3 = data.find((d: any) => d.name === "DSADASDA");

    expect(tinyCategory1).toBeDefined();
    expect(tinyCategory1.value).toBe(12323);
    expect(tinyCategory1.pctDisplay).toBe("<1%");

    expect(tinyCategory2).toBeDefined();
    expect(tinyCategory2.value).toBe(12312);
    expect(tinyCategory2.pctDisplay).toBe("<1%");

    expect(tinyCategory3).toBeDefined();
    expect(tinyCategory3.value).toBe(12122);
    expect(tinyCategory3.pctDisplay).toBe("<1%");

    // Verify the legend displays "<1%" instead of misleading "0%"
    expect(screen.getByText(/dsadas \(<1%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/dasdad \(<1%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/DSADASDA \(<1%\)/i)).toBeInTheDocument();
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

  it("TEST E — Top 5 + Other remains dynamic across varying category counts", () => {
    // 1 Category: exactly 1 slice, 100%, no Other Categories
    const singleCategory: PurposeCategoryItem[] = [
      { category: "Single Focus", approvedAmount: 500000, releasedAmount: 0, count: 1 },
    ];
    const { unmount: unmount1 } = render(
      <BudgetMonitoringOverview
        {...defaultProps}
        categoryBreakdown={singleCategory}
        approvedBudget={500000}
      />
    );
    expect(capturedPieProps.data.length).toBe(1);
    expect(capturedPieProps.data[0].name).toBe("Single Focus");
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

    // 9 Categories: exactly 6 slices (Top 5 + consolidated Other Categories)
    render(<BudgetMonitoringOverview {...defaultProps} />);
    expect(capturedPieProps.data.length).toBe(6);
    const otherSlice = capturedPieProps.data.find((d: any) => d.name === "Other Categories");
    expect(otherSlice).toBeDefined();
    expect(otherSlice.color).toBe(OTHER_CATEGORY_COLOR);
    const expectedOtherSum = sampleCategories.slice(5).reduce((s, c) => s + c.approvedAmount, 0);
    expect(otherSlice.value).toBe(expectedOtherSum);
  });

  it("TEST F — FY/category changes do not break color mapping", () => {
    const fy2025Categories: PurposeCategoryItem[] = [
      { category: "Environment & Climate Action", approvedAmount: 800000, releasedAmount: 0, count: 2 },
      { category: "Arts & Culture", approvedAmount: 400000, releasedAmount: 0, count: 1 },
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
    expect(capturedPieProps.data[0].color).toBe(resolver2025("Environment & Climate Action"));
    expect(capturedPieProps.data[1].color).toBe(resolver2025("Arts & Culture"));

    // Switch back to FY 2026
    rerender(<BudgetMonitoringOverview {...defaultProps} />);
    expect(capturedPieProps.data.length).toBe(6);
    const resolver2026 = createCategoryColorResolver(sampleCategories);
    expect(capturedPieProps.data[0].color).toBe(resolver2026("adsdasdasdasda"));
  });

  // ==========================================
  // TABLE PAGINATION AND SEARCH TESTS
  // ==========================================

  it("Pagination: Page 2 preserves consistent colors and never collides with Other Categories", () => {
    const { container } = render(<BudgetMonitoringOverview {...defaultProps} />);
    const resolver = createCategoryColorResolver(sampleCategories);

    // Click Next Page button
    const nextButtons = screen.getAllByRole("button");
    const nextBtn = nextButtons.find((btn) => btn.querySelector("svg.lucide-chevron-right"));
    expect(nextBtn).toBeDefined();

    fireEvent.click(nextBtn!);

    // Now on Page 2 (categories at index 5, 6, 7, 8)
    const page2Categories = sampleCategories.slice(5, 9);
    const tableRows = container.querySelectorAll("tbody tr");
    expect(tableRows.length).toBe(4);

    page2Categories.forEach((item, idx) => {
      const row = tableRows[idx];
      const colorDot = row.querySelector("span.rounded-full") as HTMLElement;
      expect(colorDot).toBeInTheDocument();

      const expectedColorHex = resolver(item.category);
      const expectedRgb = hexToRgb(expectedColorHex);
      expect(colorDot.style.backgroundColor).toBe(expectedRgb);

      // Must NOT collide with Other Categories slate color
      expect(colorDot.style.backgroundColor).not.toBe(hexToRgb(OTHER_CATEGORY_COLOR));
    });

    // Return to Page 1
    const prevBtn = nextButtons.find((btn) => btn.querySelector("svg.lucide-chevron-left"));
    expect(prevBtn).toBeDefined();
    fireEvent.click(prevBtn!);

    // Page 1 colors are still exact
    const top5 = sampleCategories.slice(0, 5);
    const tableRowsP1 = container.querySelectorAll("tbody tr");
    top5.forEach((item, idx) => {
      const colorDot = tableRowsP1[idx].querySelector("span.rounded-full") as HTMLElement;
      const expectedRgb = hexToRgb(resolver(item.category));
      expect(colorDot.style.backgroundColor).toBe(expectedRgb);
    });
  });

  it("Search filtering: searching for a category retains its exact pre-search color", () => {
    const { container } = render(<BudgetMonitoringOverview {...defaultProps} />);
    const resolver = createCategoryColorResolver(sampleCategories);

    const targetCategory = sampleCategories[3]; // "dasdad"
    const targetExpectedColorHex = resolver(targetCategory.category);
    const targetExpectedRgb = hexToRgb(targetExpectedColorHex);

    const searchInput = screen.getByPlaceholderText(/Search purpose \/ category/i);
    fireEvent.change(searchInput, { target: { value: "dasdad" } });

    // Table now has 1 filtered row
    const filteredRows = container.querySelectorAll("tbody tr");
    expect(filteredRows.length).toBe(1);

    const colorDot = filteredRows[0].querySelector("span.rounded-full") as HTMLElement;
    expect(colorDot.style.backgroundColor).toBe(targetExpectedRgb);

    // Clear search and verify original colors are restored
    fireEvent.change(searchInput, { target: { value: "" } });
    const restoredRows = container.querySelectorAll("tbody tr");
    expect(restoredRows.length).toBe(5);

    sampleCategories.slice(0, 5).forEach((item, idx) => {
      const dot = restoredRows[idx].querySelector("span.rounded-full") as HTMLElement;
      expect(dot.style.backgroundColor).toBe(hexToRgb(resolver(item.category)));
    });
  });
});
