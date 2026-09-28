import { describe, it, expect } from "vitest";
import type {
  BudgetRequest,
  OrganizationProfile,
  LiquidationReport,
} from "./lydo-connect-data";
import {
  DEFAULT_BUDGET_MONITORING_FILTERS,
  filterBudgetRequests,
  aggregatePurposeCategories,
  aggregateOrganizationFundingRows,
  getActiveFilterCount,
  matchesTimePeriod,
  matchesReleaseStatus,
  matchesLiquidationStatus,
  matchesBudgetStatus,
  getBudgetRequestFiscalYear,
} from "./budget-monitoring-filters";

describe("Budget Monitoring Filtering and Sorting Engine Test Suite", () => {
  const mockOrganizations: OrganizationProfile[] = [
    {
      id: "org-1",
      userId: "user-1",
      organizationName: "Pasig Youth Environmental Alliance",
      urn: "PASIG-YORP-2026-001",
      majorClassification: "Youth Organization (YO)",
      district: "District 1",
      barangay: "Kapitolyo",
      profileStatus: "verified",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "org-2",
      userId: "user-2",
      organizationName: "San Joaquin Young Leaders",
      urn: "PASIG-YORP-2026-002",
      majorClassification: "Youth-Serving Organization (YSO)",
      district: "District 2",
      barangay: "Pinagbuhatan",
      profileStatus: "verified",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  const orgMap = new Map(mockOrganizations.map((o) => [o.id, o]));

  const mockLiquidationReports: LiquidationReport[] = [
    {
      id: "lr-1",
      budgetRequestId: "req-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      status: "completed_liquidated",
      totalAmountSpent: 50000,
      refundAmount: 0,
      remarks: "Fully audited and verified",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-10T00:00:00Z",
    },
    {
      id: "lr-2",
      budgetRequestId: "req-2",
      organizationId: "org-2",
      submittedBy: "user-2",
      status: "under_review",
      totalAmountSpent: 30000,
      refundAmount: 0,
      remarks: "Partial receipts submitted",
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-05T00:00:00Z",
    },
  ];

  const liquidationMap = new Map(mockLiquidationReports.map((lr) => [lr.budgetRequestId, lr]));

  const mockRequests: BudgetRequest[] = [
    {
      id: "req-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Tree Planting & Watershed Defense",
      activityDescription: "Environmental protection project",
      activityDate: "2026-03-15",
      venue: "Rainforest Park",
      requestedAmount: 60000,
      approvedAmount: 50000,
      releasedAmount: 50000,
      releaseDate: "2026-03-20",
      purposeCategory: "Environment & Climate Action",
      fiscalYear: 2026,
      status: "completed",
      remarks: "",
      adminRemarks: "",
      goSignalAt: "2026-03-10",
      hardCopySubmittedAt: "2026-03-12",
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-04-10T00:00:00Z",
    },
    {
      id: "req-2",
      organizationId: "org-2",
      submittedBy: "user-2",
      activityTitle: "Youth Health & Wellness Summit",
      activityDescription: "Medical & mental health awareness",
      activityDate: "2026-04-20",
      venue: "San Joaquin Sports Complex",
      requestedAmount: 100000,
      approvedAmount: 80000,
      releasedAmount: 40000, // Partially released
      releaseDate: "2026-04-25",
      purposeCategory: "Health & Well-Being",
      fiscalYear: 2026,
      status: "budget_released",
      remarks: "",
      adminRemarks: "",
      goSignalAt: "2026-04-10",
      hardCopySubmittedAt: "2026-04-15",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-05-05T00:00:00Z",
    },
    {
      id: "req-3",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Civic Leadership Academy",
      activityDescription: "Governance training for youth leaders",
      activityDate: "2026-06-10",
      venue: "Pasig City Hall",
      requestedAmount: 120000,
      approvedAmount: 100000,
      releasedAmount: 0, // Not released
      releaseDate: "",
      purposeCategory: "Leadership & Governance",
      fiscalYear: 2026,
      status: "awaiting_release",
      remarks: "",
      adminRemarks: "",
      goSignalAt: "2026-06-01",
      hardCopySubmittedAt: "2026-06-05",
      createdAt: "2026-05-15T00:00:00Z",
      updatedAt: "2026-06-05T00:00:00Z",
    },
    {
      id: "req-4",
      organizationId: "org-2",
      submittedBy: "user-2",
      activityTitle: "Robotics & Coding Camp",
      activityDescription: "Digital literacy for students",
      activityDate: "2025-11-20",
      venue: "Pinagbuhatan Tech Center",
      requestedAmount: 75000,
      approvedAmount: 70000,
      releasedAmount: 70000,
      releaseDate: "2025-11-25",
      purposeCategory: "Education & Skills Development",
      fiscalYear: 2025,
      status: "completed",
      remarks: "",
      adminRemarks: "",
      goSignalAt: "2025-11-10",
      hardCopySubmittedAt: "2025-11-15",
      createdAt: "2025-11-01T00:00:00Z",
      updatedAt: "2025-12-10T00:00:00Z",
    },
    {
      id: "req-5",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Initial Draft Project",
      activityDescription: "Needs revision",
      activityDate: "2026-07-01",
      venue: "Community Center",
      requestedAmount: 30000,
      approvedAmount: 0,
      releasedAmount: 0,
      releaseDate: "",
      purposeCategory: "Culture & Arts",
      fiscalYear: 2026,
      status: "needs_revision",
      remarks: "",
      adminRemarks: "Please adjust budget line items",
      goSignalAt: "",
      hardCopySubmittedAt: "",
      createdAt: "2026-06-20T00:00:00Z",
      updatedAt: "2026-06-21T00:00:00Z",
    },
  ];

  const refNow = new Date("2026-07-01T12:00:00Z");

  it("1. Default view: filters to Current Fiscal Year (FY 2026)", () => {
    const filtered = filterBudgetRequests(
      mockRequests,
      DEFAULT_BUDGET_MONITORING_FILTERS,
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    // 4 requests belong to FY 2026 (req-1, req-2, req-3, req-5)
    expect(filtered.length).toBe(4);
    expect(filtered.map((r) => r.id)).toEqual(["req-1", "req-2", "req-3", "req-5"]);
  });

  it("2. Time Period: Previous Fiscal Year filters to FY 2025 records", () => {
    const filtered = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, timePeriod: "previous_fy" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("req-4");
    expect(getBudgetRequestFiscalYear(filtered[0])).toBe(2025);
  });

  it("3. Time Period: All Time returns all records regardless of FY", () => {
    const filtered = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, timePeriod: "all_time" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    expect(filtered.length).toBe(5);
  });

  it("4. Time Period: Custom date range properly slices records within [start, end]", () => {
    const filtered = filterBudgetRequests(
      mockRequests,
      {
        ...DEFAULT_BUDGET_MONITORING_FILTERS,
        timePeriod: "custom",
        customStartDate: "2026-03-01",
        customEndDate: "2026-04-15",
      },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    // req-1 (2026-03-01) and req-2 (2026-04-01) match
    expect(filtered.length).toBe(2);
    expect(filtered.map((r) => r.id)).toEqual(["req-1", "req-2"]);
  });

  it("5. Purpose / Category filter: Dynamic and narrows results exclusively to matching category", () => {
    const filtered = filterBudgetRequests(
      mockRequests,
      {
        ...DEFAULT_BUDGET_MONITORING_FILTERS,
        purposeCategory: "Environment & Climate Action",
      },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].purposeCategory).toBe("Environment & Climate Action");

    // Aggregate category breakdown for this filtered set
    const categories = aggregatePurposeCategories(filtered, liquidationMap, "approved_desc");
    expect(categories.length).toBe(1);
    expect(categories[0].category).toBe("Environment & Climate Action");
    expect(categories[0].approvedAmount).toBe(50000);
  });

  it("6. Budget Status filter: Awaiting Release vs Budget Released distinct behavior", () => {
    // Awaiting Release
    const awaiting = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, budgetStatus: "awaiting_release" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );
    expect(awaiting.length).toBe(1);
    expect(awaiting[0].id).toBe("req-3");
    expect(awaiting[0].status).toBe("awaiting_release");

    // Budget Released
    const released = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, budgetStatus: "budget_released" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );
    expect(released.length).toBe(1);
    expect(released[0].id).toBe("req-2");
    expect(released[0].status).toBe("budget_released");
  });

  it("7. Major Classification filter: filters by organization classification", () => {
    const filteredYO = filterBudgetRequests(
      mockRequests,
      {
        ...DEFAULT_BUDGET_MONITORING_FILTERS,
        majorClassification: "Youth Organization (YO)",
      },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    // org-1 has req-1, req-3, req-5
    expect(filteredYO.length).toBe(3);
    filteredYO.forEach((r) => {
      expect(orgMap.get(r.organizationId)?.majorClassification).toBe("Youth Organization (YO)");
    });
  });

  it("8. Location filters: District and Barangay filtering", () => {
    const filteredDistrict1 = filterBudgetRequests(
      mockRequests,
      {
        ...DEFAULT_BUDGET_MONITORING_FILTERS,
        district: "District 1",
      },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    expect(filteredDistrict1.length).toBe(3);
    filteredDistrict1.forEach((r) => {
      expect(orgMap.get(r.organizationId)?.district).toBe("District 1");
    });

    const filteredBarangay = filterBudgetRequests(
      mockRequests,
      {
        ...DEFAULT_BUDGET_MONITORING_FILTERS,
        district: "District 1",
        barangay: "Kapitolyo",
      },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    expect(filteredBarangay.length).toBe(3);
  });

  it("9. Release Status filter: Not Released, Partially Released, Fully Released", () => {
    // Not Released
    const notReleased = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, releaseStatus: "not_released" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );
    expect(notReleased.map((r) => r.id)).toContain("req-3");
    expect(notReleased.map((r) => r.id)).toContain("req-5");

    // Partially Released (released < approved)
    const partiallyReleased = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, releaseStatus: "partially_released" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );
    expect(partiallyReleased.length).toBe(1);
    expect(partiallyReleased[0].id).toBe("req-2");

    // Fully Released
    const fullyReleased = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, releaseStatus: "fully_released" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );
    expect(fullyReleased.length).toBe(1);
    expect(fullyReleased[0].id).toBe("req-1");
  });

  it("10. Liquidation Status filter: Fully Liquidated vs Not Liquidated", () => {
    const fullyLiquidated = filterBudgetRequests(
      mockRequests,
      { ...DEFAULT_BUDGET_MONITORING_FILTERS, liquidationStatus: "fully_liquidated" },
      orgMap,
      liquidationMap,
      2026,
      refNow
    );
    expect(fullyLiquidated.length).toBe(1);
    expect(fullyLiquidated[0].id).toBe("req-1");
  });

  it("11. Sorting options: Amount Highest to Lowest and Lowest to Highest", () => {
    const fy2026Requests = filterBudgetRequests(
      mockRequests,
      DEFAULT_BUDGET_MONITORING_FILTERS,
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    // Sort by Approved descending
    const sortedDesc = aggregatePurposeCategories(fy2026Requests, liquidationMap, "approved_desc");
    expect(sortedDesc[0].approvedAmount).toBe(100000); // Leadership & Governance
    expect(sortedDesc[sortedDesc.length - 1].approvedAmount).toBe(0); // Culture & Arts (needs_revision)

    // Sort by Approved ascending
    const sortedAsc = aggregatePurposeCategories(fy2026Requests, liquidationMap, "approved_asc");
    expect(sortedAsc[0].approvedAmount).toBe(0);
    expect(sortedAsc[sortedAsc.length - 1].approvedAmount).toBe(100000);

    // Sort by Category Name A to Z
    const sortedAlpha = aggregatePurposeCategories(fy2026Requests, liquidationMap, "category_asc");
    expect(sortedAlpha[0].category).toBe("Culture & Arts");
  });

  it("12. Organization funding table synchronization", () => {
    const fy2026Requests = filterBudgetRequests(
      mockRequests,
      DEFAULT_BUDGET_MONITORING_FILTERS,
      orgMap,
      liquidationMap,
      2026,
      refNow
    );

    const orgRows = aggregateOrganizationFundingRows(
      fy2026Requests,
      mockOrganizations,
      liquidationMap,
      "approved_desc"
    );

    expect(orgRows.length).toBe(2);
    // Org 1 has req-1 (50k approved/50k released/50k liq), req-3 (100k approved/0 rel), req-5 (30k req) -> totalRequested = 210k
    const org1 = orgRows.find((o) => o.organizationId === "org-1");
    expect(org1?.totalRequested).toBe(210000);
    expect(org1?.totalReleased).toBe(50000);
    expect(org1?.totalLiquidated).toBe(50000);

    // Org 2 has req-2 (100k req/80k app/40k rel) -> totalRequested = 100k, totalReleased = 40k
    const org2 = orgRows.find((o) => o.organizationId === "org-2");
    expect(org2?.totalRequested).toBe(100000);
    expect(org2?.totalReleased).toBe(40000);
    expect(org2?.totalLiquidated).toBe(0);
  });

  it("13. Active filter counter accurately counts non-default filters", () => {
    expect(getActiveFilterCount(DEFAULT_BUDGET_MONITORING_FILTERS)).toBe(0);

    const withTwoFilters = {
      ...DEFAULT_BUDGET_MONITORING_FILTERS,
      purposeCategory: "Environment & Climate Action",
      district: "District 1",
    };
    expect(getActiveFilterCount(withTwoFilters)).toBe(2);
  });
});
