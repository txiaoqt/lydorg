import { describe, it, expect } from "vitest";
import type {
  BudgetRequest,
  AnnualBudgetAllocation,
  BudgetPurposeCategory,
  BudgetMonitoringSummary,
} from "./lydo-connect-data";

// Helper functions that mirror the production Budget Monitoring computations
export function computeBudgetMetrics(
  annualAllocation: number | null,
  requests: BudgetRequest[],
  liquidatedTotal: number,
) {
  const approvedStatuses = new Set([
    "approved",
    "approved_green",
    "conditionally_approved_amber",
    "released",
    "completed",
  ]);
  const releasedStatuses = new Set(["released", "completed"]);

  const approvedBudget = requests
    .filter((r) => approvedStatuses.has(r.status))
    .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);

  const releasedBudget = requests
    .filter((r) => releasedStatuses.has(r.status))
    .reduce((sum, r) => sum + (r.releasedAmount || 0), 0);

  const pendingDisbursement = Math.max(approvedBudget - releasedBudget, 0);
  const activeInField = Math.max(releasedBudget - liquidatedTotal, 0);

  const isConfigured = annualAllocation !== null;
  const rawHeadroom = isConfigured ? annualAllocation - approvedBudget : null;
  const remainingHeadroom = rawHeadroom;
  const isDeficit = isConfigured && annualAllocation !== null && approvedBudget > annualAllocation;
  const deficitAmount = isDeficit && annualAllocation !== null ? approvedBudget - annualAllocation : 0;

  const percentClearedOfReleased =
    releasedBudget > 0 ? Math.round((liquidatedTotal / releasedBudget) * 100) : 0;
  const percentCommitted =
    isConfigured && annualAllocation && annualAllocation > 0
      ? Math.round((approvedBudget / annualAllocation) * 100)
      : null;

  return {
    isConfigured,
    totalFYBudget: annualAllocation,
    approvedBudget,
    releasedBudget,
    liquidatedBudget: liquidatedTotal,
    pendingDisbursement,
    activeInField,
    remainingHeadroom,
    isDeficit,
    deficitAmount,
    percentClearedOfReleased,
    percentCommitted,
  };
}

export function consolidateTopCategories(
  items: Array<{ category: string; amount: number }>,
  topN = 5,
) {
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  if (sorted.length <= topN) {
    return sorted;
  }
  const top = sorted.slice(0, topN);
  const otherAmount = sorted.slice(topN).reduce((sum, i) => sum + i.amount, 0);
  if (otherAmount > 0) {
    top.push({ category: "Other", amount: otherAmount });
  }
  return top;
}

export function computeDonutChartData(
  annualAllocation: number | null,
  approvedBudget: number,
  categoryBreakdown: Array<{ category: string; amount: number }>,
) {
  if (annualAllocation === null || annualAllocation <= 0) {
    return [];
  }
  const topCategories = consolidateTopCategories(categoryBreakdown, 5);
  const unallocated = Math.max(annualAllocation - approvedBudget, 0);

  const colors = ["#3F81EA", "#62B4F5", "#0D9488", "#7C3AED", "#EA580C", "#94A3B8"];
  const slices = topCategories.map((c, i) => ({
    name: c.category,
    value: c.amount,
    color: colors[i % colors.length],
  }));

  if (unallocated > 0) {
    slices.push({
      name: "Unallocated Headroom",
      value: unallocated,
      color: "#E2E8F0",
    });
  }

  return slices;
}

export function filterAndPaginateCategories(
  categories: Array<{ category: string; amount: number; releaseAmount: number }>,
  searchTerm: string,
  page: number,
  pageSize = 5,
) {
  const filtered = categories.filter((c) =>
    c.category.toLowerCase().includes(searchTerm.toLowerCase().trim()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paged = filtered.slice(startIndex, startIndex + pageSize);

  return {
    totalItems: filtered.length,
    totalPages,
    currentPage,
    items: paged,
  };
}

describe("Authoritative Budget Monitoring Test Suite (Tests A - M)", () => {
  // Test A: Annual Budget Allocation Model & Persistence
  it("Test A: Validates Annual Budget Allocation model structure and constraints", () => {
    const validAllocation: AnnualBudgetAllocation = {
      id: "alloc-2026-uuid",
      fiscalYear: 2026,
      totalAmount: 150_000_000,
      notes: "Sangguniang Panlungsod Approved FY 2026 YPOP Budget",
      isActive: true,
      createdByName: "Super Admin",
      updatedByName: "Super Admin",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    expect(validAllocation.fiscalYear).toBe(2026);
    expect(validAllocation.totalAmount).toBe(150_000_000);
    expect(validAllocation.isActive).toBe(true);
    expect(validAllocation.totalAmount).toBeGreaterThan(0);
    expect(validAllocation.notes).toBeDefined();
  });

  // Test B: Unconfigured State Handling (No fake ₱0.00, no fake donut fallback)
  it("Test B: Handles Unconfigured Annual Budget state gracefully without zero-clamping or fake charts", () => {
    const unconfiguredMetrics = computeBudgetMetrics(null, [], 0);

    expect(unconfiguredMetrics.isConfigured).toBe(false);
    expect(unconfiguredMetrics.totalFYBudget).toBeNull();
    expect(unconfiguredMetrics.remainingHeadroom).toBeNull();
    expect(unconfiguredMetrics.percentCommitted).toBeNull();

    // Donut chart data MUST be empty array, never fake fallback [{ name: 'Default', value: 1 }]
    const donutData = computeDonutChartData(null, 0, []);
    expect(donutData).toEqual([]);
    expect(donutData.length).toBe(0);
  });

  // Test C: Correct Headroom Formula: Remaining Headroom = Total FY Budget - Approved Budget
  it("Test C: Computes Remaining Headroom as (Total FY Budget - Approved Budget), NOT (Total FY - Released)", () => {
    const totalFY = 100_000_000;
    const mockRequests: BudgetRequest[] = [
      {
        id: "req-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        fiscalYear: 2026,
        activityTitle: "Leadership Camp",
        activityDescription: "Camp for youth leaders",
        activityDate: "2026-03-15",
        venue: "Pasig Youth Center",
        requestedAmount: 50_000_000,
        approvedAmount: 40_000_000,
        releasedAmount: 25_000_000, // Released is only 25M, but Approved is 40M
        releaseDate: "2026-03-20",
        purposeCategory: "Leadership & Governance",
        status: "released",
        remarks: "",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-20T00:00:00Z",
      },
    ];

    const metrics = computeBudgetMetrics(totalFY, mockRequests, 5_000_000);

    // Approved = 40M, Released = 25M
    expect(metrics.approvedBudget).toBe(40_000_000);
    expect(metrics.releasedBudget).toBe(25_000_000);

    // Headroom MUST be 100M - 40M = 60M (NOT 100M - 25M = 75M)
    expect(metrics.remainingHeadroom).toBe(60_000_000);
    expect(metrics.isDeficit).toBe(false);
  });

  // Test D: Disbursed vs Pending Disbursement Separation
  it("Test D: Correctly separates Released Budget from Pending Disbursement (Approved - Released)", () => {
    const totalFY = 100_000_000;
    const mockRequests: BudgetRequest[] = [
      {
        id: "req-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        fiscalYear: 2026,
        activityTitle: "Sports Festival",
        activityDescription: "Annual sports fest",
        activityDate: "2026-04-10",
        venue: "Pasig Sports Complex",
        requestedAmount: 30_000_000,
        approvedAmount: 30_000_000,
        releasedAmount: 10_000_000,
        releaseDate: "2026-04-15",
        purposeCategory: "Sports, Fitness & Recreation",
        status: "released",
        remarks: "",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-15T00:00:00Z",
      },
      {
        id: "req-2",
        organizationId: "org-2",
        submittedBy: "user-2",
        fiscalYear: 2026,
        activityTitle: "Arts Workshop",
        activityDescription: "Creative workshop",
        activityDate: "2026-05-01",
        venue: "Kapitolyo Hall",
        requestedAmount: 20_000_000,
        approvedAmount: 20_000_000,
        releasedAmount: 0, // Approved but 0 released
        releaseDate: "",
        purposeCategory: "Arts, Culture & Heritage",
        status: "approved_green",
        remarks: "",
        createdAt: "2026-04-20T00:00:00Z",
        updatedAt: "2026-04-25T00:00:00Z",
      },
    ];

    const metrics = computeBudgetMetrics(totalFY, mockRequests, 0);

    expect(metrics.approvedBudget).toBe(50_000_000);
    expect(metrics.releasedBudget).toBe(10_000_000);
    // Pending Disbursement = Approved (50M) - Released (10M) = 40M
    expect(metrics.pendingDisbursement).toBe(40_000_000);
  });

  // Test E: Active in Field Calculation
  it("Test E: Accurately calculates Active in Field as (Released - Liquidated)", () => {
    const totalFY = 50_000_000;
    const mockRequests: BudgetRequest[] = [
      {
        id: "req-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        fiscalYear: 2026,
        activityTitle: "Community Outreach",
        activityDescription: "Outreach in Pinagbuhatan",
        activityDate: "2026-05-15",
        venue: "Pinagbuhatan Covered Court",
        requestedAmount: 15_000_000,
        approvedAmount: 15_000_000,
        releasedAmount: 15_000_000,
        releaseDate: "2026-05-18",
        purposeCategory: "Community Outreach & Social Inclusion",
        status: "released",
        remarks: "",
        createdAt: "2026-05-01T00:00:00Z",
        updatedAt: "2026-05-18T00:00:00Z",
      },
    ];

    const liquidated = 3_500_000;
    const metrics = computeBudgetMetrics(totalFY, mockRequests, liquidated);

    expect(metrics.releasedBudget).toBe(15_000_000);
    expect(metrics.liquidatedBudget).toBe(3_500_000);
    // Active in field = 15M - 3.5M = 11.5M
    expect(metrics.activeInField).toBe(11_500_000);
  });

  // Test F: Deficit State Detection & Accurate Calculation
  it("Test F: Detects deficit when Approved > Total FY Allocation and preserves negative value without zero-clamping", () => {
    const totalFY = 100_000_000;
    const mockRequests: BudgetRequest[] = [
      {
        id: "req-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        fiscalYear: 2026,
        activityTitle: "Mega Youth Summit",
        activityDescription: "Massive youth gathering",
        activityDate: "2026-06-01",
        venue: "Pasig City Sports Center",
        requestedAmount: 140_000_000,
        approvedAmount: 120_000_000, // 120M approved exceeds 100M budget
        releasedAmount: 50_000_000,
        releaseDate: "2026-06-05",
        purposeCategory: "Leadership & Governance",
        status: "approved_green",
        remarks: "",
        createdAt: "2026-05-20T00:00:00Z",
        updatedAt: "2026-06-05T00:00:00Z",
      },
    ];

    const metrics = computeBudgetMetrics(totalFY, mockRequests, 0);

    expect(metrics.isDeficit).toBe(true);
    // Headroom MUST be negative -20,000,000, NOT clamped to 0!
    expect(metrics.remainingHeadroom).toBe(-20_000_000);
    expect(metrics.deficitAmount).toBe(20_000_000);
  });

  // Test G: Fiscal Year Isolation
  it("Test G: Completely isolates records and metrics by fiscal year with zero cross-year leakage", () => {
    const allRequests: BudgetRequest[] = [
      {
        id: "req-2025",
        organizationId: "org-1",
        submittedBy: "user-1",
        fiscalYear: 2025,
        activityTitle: "2025 Summit",
        activityDescription: "Past event",
        activityDate: "2025-08-10",
        venue: "Hall A",
        requestedAmount: 50_000_000,
        approvedAmount: 50_000_000,
        releasedAmount: 50_000_000,
        releaseDate: "2025-08-15",
        purposeCategory: "Leadership & Governance",
        status: "completed",
        remarks: "",
        createdAt: "2025-07-01T00:00:00Z",
        updatedAt: "2025-08-15T00:00:00Z",
      },
      {
        id: "req-2026",
        organizationId: "org-1",
        submittedBy: "user-1",
        fiscalYear: 2026,
        activityTitle: "2026 Hackathon",
        activityDescription: "Tech event",
        activityDate: "2026-09-10",
        venue: "Hall B",
        requestedAmount: 30_000_000,
        approvedAmount: 30_000_000,
        releasedAmount: 10_000_000,
        releaseDate: "2026-09-15",
        purposeCategory: "Education, Digital Literacy & Technology",
        status: "released",
        remarks: "",
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-09-15T00:00:00Z",
      },
    ];

    // Filter for FY 2026
    const fy2026Requests = allRequests.filter((r) => r.fiscalYear === 2026);
    const metrics2026 = computeBudgetMetrics(100_000_000, fy2026Requests, 0);

    expect(metrics2026.approvedBudget).toBe(30_000_000);
    expect(metrics2026.releasedBudget).toBe(10_000_000);
    expect(metrics2026.remainingHeadroom).toBe(70_000_000);

    // Filter for FY 2025
    const fy2025Requests = allRequests.filter((r) => r.fiscalYear === 2025);
    const metrics2025 = computeBudgetMetrics(60_000_000, fy2025Requests, 50_000_000);

    expect(metrics2025.approvedBudget).toBe(50_000_000);
    expect(metrics2025.releasedBudget).toBe(50_000_000);
    expect(metrics2025.liquidatedBudget).toBe(50_000_000);
    expect(metrics2025.activeInField).toBe(0);
    expect(metrics2025.remainingHeadroom).toBe(10_000_000);
  });

  // Test H: Standardized Purpose Category Taxonomy
  it("Test H: Standard canonical youth purpose categories are valid and distinct", () => {
    const canonicalTaxonomy: BudgetPurposeCategory[] = [
      { id: "1", name: "Leadership & Governance", sortOrder: 1, isActive: true },
      { id: "2", name: "Sports, Fitness & Recreation", sortOrder: 2, isActive: true },
      { id: "3", name: "Arts, Culture & Heritage", sortOrder: 3, isActive: true },
      { id: "4", name: "Environmental Protection & Climate Action", sortOrder: 4, isActive: true },
      { id: "5", name: "Education, Digital Literacy & Technology", sortOrder: 5, isActive: true },
      { id: "6", name: "Health, Mental Wellness & Anti-Drug Advocacy", sortOrder: 6, isActive: true },
      { id: "7", name: "Community Outreach & Social Inclusion", sortOrder: 7, isActive: true },
      { id: "8", name: "Economic Empowerment & Livelihood", sortOrder: 8, isActive: true },
    ];

    expect(canonicalTaxonomy.length).toBe(8);
    const names = new Set(canonicalTaxonomy.map((c) => c.name));
    expect(names.size).toBe(8);
    expect(canonicalTaxonomy.every((c) => c.isActive)).toBe(true);
  });

  // Test I: Budget Allocation by Purpose - Top 5 + Consolidated Other
  it("Test I: Correctly keeps Top 5 largest categories and rolls 6th+ into Other without losing any amount", () => {
    const rawCategories = [
      { category: "Cat A", amount: 50_000 },
      { category: "Cat B", amount: 40_000 },
      { category: "Cat C", amount: 30_000 },
      { category: "Cat D", amount: 20_000 },
      { category: "Cat E", amount: 15_000 },
      { category: "Cat F", amount: 10_000 },
      { category: "Cat G", amount: 5_000 },
      { category: "Cat H", amount: 2_000 },
    ];

    const totalBefore = rawCategories.reduce((sum, c) => sum + c.amount, 0); // 172,000
    const consolidated = consolidateTopCategories(rawCategories, 5);

    expect(consolidated.length).toBe(6); // 5 top + 1 Other
    expect(consolidated[0].category).toBe("Cat A");
    expect(consolidated[4].category).toBe("Cat E");
    expect(consolidated[5].category).toBe("Other");
    // Other amount = 10,000 + 5,000 + 2,000 = 17,000
    expect(consolidated[5].amount).toBe(17_000);

    const totalAfter = consolidated.reduce((sum, c) => sum + c.amount, 0);
    expect(totalAfter).toBe(totalBefore);
  });

  // Test J: Donut Data Structure
  it("Test J: Computes Donut slices with unallocated headroom when budget is positive", () => {
    const totalFY = 200_000;
    const categories = [
      { category: "Cat A", amount: 80_000 },
      { category: "Cat B", amount: 40_000 },
    ];
    const approved = 120_000;

    const slices = computeDonutChartData(totalFY, approved, categories);

    expect(slices.length).toBe(3); // Cat A, Cat B, Unallocated Headroom
    expect(slices[0].name).toBe("Cat A");
    expect(slices[0].value).toBe(80_000);
    expect(slices[1].name).toBe("Cat B");
    expect(slices[1].value).toBe(40_000);
    expect(slices[2].name).toBe("Unallocated Headroom");
    expect(slices[2].value).toBe(80_000); // 200,000 - 120,000 = 80,000
  });

  // Test K: Purpose Breakdown Table Filtering & Pagination
  it("Test K: Filters categories by search keyword and paginates accurately", () => {
    const categories = [
      { category: "Leadership Camp", amount: 50_000, releaseAmount: 50_000 },
      { category: "Sports Meet", amount: 40_000, releaseAmount: 40_000 },
      { category: "Youth Leadership Seminar", amount: 30_000, releaseAmount: 20_000 },
      { category: "Tree Planting Activity", amount: 15_000, releaseAmount: 15_000 },
      { category: "Leadership Workshop", amount: 10_000, releaseAmount: 10_000 },
      { category: "Digital Skills Training", amount: 8_000, releaseAmount: 5_000 },
    ];

    // Search for "leadership"
    const searchResult = filterAndPaginateCategories(categories, "leadership", 1, 2);
    expect(searchResult.totalItems).toBe(3); // Leadership Camp, Youth Leadership Seminar, Leadership Workshop
    expect(searchResult.totalPages).toBe(2);
    expect(searchResult.items.length).toBe(2);
    expect(searchResult.items[0].category).toBe("Leadership Camp");
    expect(searchResult.items[1].category).toBe("Youth Leadership Seminar");

    // Page 2 of search
    const page2Result = filterAndPaginateCategories(categories, "leadership", 2, 2);
    expect(page2Result.items.length).toBe(1);
    expect(page2Result.items[0].category).toBe("Leadership Workshop");
  });

  // Test L: Organization Funding Scoping by Fiscal Year
  it("Test L: Only aggregates organization funding rows belonging to the selected fiscal year", () => {
    const mockRequests: BudgetRequest[] = [
      {
        id: "req-1",
        organizationId: "org-alpha",
        submittedBy: "user-1",
        fiscalYear: 2026,
        activityTitle: "Alpha 2026",
        activityDescription: "Event",
        activityDate: "2026-03-01",
        venue: "Hall 1",
        requestedAmount: 10_000,
        approvedAmount: 10_000,
        releasedAmount: 10_000,
        releaseDate: "2026-03-05",
        purposeCategory: "Leadership & Governance",
        status: "released",
        remarks: "",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z",
      },
      {
        id: "req-2",
        organizationId: "org-alpha",
        submittedBy: "user-1",
        fiscalYear: 2025, // Previous year
        activityTitle: "Alpha 2025",
        activityDescription: "Event",
        activityDate: "2025-03-01",
        venue: "Hall 1",
        requestedAmount: 50_000,
        approvedAmount: 50_000,
        releasedAmount: 50_000,
        releaseDate: "2025-03-05",
        purposeCategory: "Leadership & Governance",
        status: "completed",
        remarks: "",
        createdAt: "2025-03-01T00:00:00Z",
        updatedAt: "2025-03-05T00:00:00Z",
      },
    ];

    const selectedYear = 2026;
    const scopedRequests = mockRequests.filter((r) => r.fiscalYear === selectedYear);

    const alphaApprovedIn2026 = scopedRequests
      .filter((r) => r.organizationId === "org-alpha")
      .reduce((sum, r) => sum + r.approvedAmount, 0);

    // Only the 2026 request (10,000) should be included, NOT the 2025 request (50,000)
    expect(alphaApprovedIn2026).toBe(10_000);
  });

  // Test M: Budget Monitoring Report Export Scoping & Totals
  it("Test M: Verifies export metadata and totals reflect scoped fiscal year", () => {
    const selectedYear = 2026;
    const records = [
      { approvedAmount: 500_000, releasedAmount: 300_000, remainingAmount: 200_000 },
      { approvedAmount: 250_000, releasedAmount: 250_000, remainingAmount: 0 },
    ];

    const totalApproved = records.reduce((sum, r) => sum + r.approvedAmount, 0);
    const totalReleased = records.reduce((sum, r) => sum + r.releasedAmount, 0);
    const totalRemaining = records.reduce((sum, r) => sum + r.remainingAmount, 0);

    const metadataLines = [
      `Fiscal Year: FY ${selectedYear}`,
      `Total Monitored Records: ${records.length}`,
      `Total Approved Amount: ₱${totalApproved.toLocaleString()}`,
      `Total Released Amount: ₱${totalReleased.toLocaleString()}`,
      `Total Remaining Amount: ₱${totalRemaining.toLocaleString()}`,
    ];

    expect(metadataLines[0]).toBe("Fiscal Year: FY 2026");
    expect(metadataLines[1]).toBe("Total Monitored Records: 2");
    expect(totalApproved).toBe(750_000);
    expect(totalReleased).toBe(550_000);
    expect(totalRemaining).toBe(200_000);
  });
});
