import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegistrationsTable } from "./RegistrationsTable";
import { RenewalsTable } from "./RenewalsTable";
import { YorpRegistryTable } from "./YorpRegistryTable";
import { BudgetRequestsTable } from "./BudgetRequestsTable";
import { LiquidationReportsTable } from "./LiquidationReportsTable";

describe("Admin Filter & Layout Stability Across All 5 Pages", () => {
  it("RegistrationsTable preserves fixed trigger width and horizontal containment", async () => {
    const onDistrictChange = vi.fn();
    const { container } = render(
      <RegistrationsTable
        registrations={[]}
        documentCountsByOrgId={{}}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={onDistrictChange}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    // District trigger button has fixed width
    const districtBtn = screen.getByRole("button", { name: /all districts/i });
    expect(districtBtn.className).toContain("w-[156px]");
    expect(districtBtn.className).toContain("shrink-0");

    // Barangay trigger button has fixed width
    const barangayBtn = screen.getByRole("button", { name: /all barangays/i });
    expect(barangayBtn.className).toContain("w-[180px]");
    expect(barangayBtn.className).toContain("shrink-0");

    // Table body has horizontal containment wrapper
    const horizontalScroller = container.querySelector(".overflow-x-auto");
    expect(horizontalScroller).not.toBeNull();
  });

  it("RenewalsTable preserves fixed trigger width and horizontal containment", () => {
    const { container } = render(
      <RenewalsTable
        renewals={[]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    const districtBtn = screen.getByRole("button", { name: /all districts/i });
    expect(districtBtn.className).toContain("w-[156px]");
    expect(districtBtn.className).toContain("shrink-0");

    const horizontalScroller = container.querySelector(".overflow-x-auto");
    expect(horizontalScroller).not.toBeNull();
  });

  it("YorpRegistryTable preserves fixed trigger width and horizontal containment", () => {
    const { container } = render(
      <YorpRegistryTable
        entries={[]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onView={vi.fn()}
      />,
    );

    const districtBtn = screen.getByRole("button", { name: /all districts/i });
    expect(districtBtn.className).toContain("w-[156px]");
    expect(districtBtn.className).toContain("shrink-0");

    const horizontalScroller = container.querySelector(".overflow-x-auto");
    expect(horizontalScroller).not.toBeNull();
  });

  it("BudgetRequestsTable preserves fixed trigger width and horizontal containment", () => {
    const { container } = render(
      <BudgetRequestsTable
        requests={[]}
        allRequests={[]}
        organizationsById={{}}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    const districtBtn = screen.getByRole("button", { name: /all districts/i });
    expect(districtBtn.className).toContain("w-[156px]");
    expect(districtBtn.className).toContain("shrink-0");

    const horizontalScroller = container.querySelector(".overflow-x-auto");
    expect(horizontalScroller).not.toBeNull();
  });

  it("LiquidationReportsTable preserves fixed trigger width and horizontal containment", () => {
    const { container } = render(
      <LiquidationReportsTable
        reports={[]}
        allReports={[]}
        organizationsById={{}}
        budgetRequestsById={{}}
        allBudgetRequests={[]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
        onOpenLinkedRequest={vi.fn()}
      />,
    );

    const districtBtn = screen.getByRole("button", { name: /all districts/i });
    expect(districtBtn.className).toContain("w-[156px]");
    expect(districtBtn.className).toContain("shrink-0");

    const horizontalScroller = container.querySelector(".overflow-x-auto");
    expect(horizontalScroller).not.toBeNull();
  });

  it("LiquidationReportsTable renders rows with status label without runtime error", () => {
    const mockReport = {
      id: "rep-1",
      budgetRequestId: "br-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      status: "submitted" as const,
      remarks: "Sample remarks",
      goSignalAt: "2026-03-01T00:00:00Z",
      deadlineAt: "2026-12-01T00:00:00Z",
      hardCopySubmittedAt: "",
      completedAt: "",
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };

    const mockOrg = {
      id: "org-1",
      organizationName: "Test Youth Org",
      district: "District I" as const,
      barangay: "Bagong Ilog",
      classification: "Youth Organization",
    } as any;

    const mockBudget = {
      id: "br-1",
      activityTitle: "Community Clean-up",
      status: "budget_released" as const,
    } as any;

    render(
      <LiquidationReportsTable
        reports={[mockReport]}
        allReports={[mockReport]}
        organizationsById={{ "org-1": mockOrg }}
        budgetRequestsById={{ "br-1": mockBudget }}
        allBudgetRequests={[mockBudget]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
        onOpenLinkedRequest={vi.fn()}
      />,
    );

    expect(screen.getByText("Test Youth Org")).toBeInTheDocument();
    expect(screen.getByText("Community Clean-up")).toBeInTheDocument();
    expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(2);
  });

  it("BudgetRequestsTable renders rows with status label without runtime error", () => {
    const mockBudget = {
      id: "br-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Youth Leadership Summit",
      status: "hard_copy_submitted" as const,
      requestedAmount: 50000,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    } as any;

    const mockOrg = {
      id: "org-1",
      organizationName: "Test Youth Org",
      district: "District I" as const,
      barangay: "Bagong Ilog",
      classification: "Youth Organization",
    } as any;

    render(
      <BudgetRequestsTable
        requests={[mockBudget]}
        allRequests={[mockBudget]}
        organizationsById={{ "org-1": mockOrg }}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText("Youth Leadership Summit")).toBeInTheDocument();
    expect(screen.getAllByText("Hardcopy Submitted").length).toBeGreaterThanOrEqual(2);
  });

  it("RegistrationsTable renders rows with status label without runtime error", () => {
    const mockOrg = {
      id: "org-1",
      organizationName: "Alpha Youth Group",
      district: "District I" as const,
      barangay: "Bagong Ilog",
      classification: "Youth Organization",
      profileStatus: "verified" as const,
      submittedAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    } as any;

    render(
      <RegistrationsTable
        registrations={[mockOrg]}
        documentCountsByOrgId={{ "org-1": 5 }}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText("Alpha Youth Group")).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(2);
  });

  it("RenewalsTable renders rows with status label without runtime error", () => {
    const mockRenewal = {
      id: "ren-1",
      renewalId: "ren-1",
      organizationId: "org-1",
      organizationName: "Beta Youth Org",
      district: "District II" as const,
      barangay: "Pinagbuhatan",
      classification: "Youth Serving Organization",
      renewalStatus: "pending_review" as const,
      submittedAt: "2026-03-01T00:00:00Z",
      documentCount: { submitted: 4, total: 4 },
    } as any;

    render(
      <RenewalsTable
        renewals={[mockRenewal]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText("Beta Youth Org")).toBeInTheDocument();
    expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(2);
  });

  it("YorpRegistryTable renders rows with status label without runtime error", () => {
    const mockOrg = {
      id: "org-1",
      organizationName: "Gamma Youth Club",
      district: "District I" as const,
      barangay: "San Nicolas",
      classification: "Youth Organization",
      urn: "YORP-2026-001",
    } as any;

    const mockEntry = {
      org: mockOrg,
      registrationDate: "2026-01-01T00:00:00Z",
      expiryDate: "2027-01-01T00:00:00Z",
      yorpStatus: "active" as const,
    };

    render(
      <YorpRegistryTable
        entries={[mockEntry]}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onView={vi.fn()}
      />,
    );

    expect(screen.getByText("Gamma Youth Club")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
  });
});


