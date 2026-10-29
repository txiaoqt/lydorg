import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BudgetRequestsTable } from "./BudgetRequestsTable";
import type { BudgetRequest, OrganizationProfile } from "@/lib/lydo-connect-data";

describe("BudgetRequestsTable Selection & Bulk Actions UX Suite", () => {
  const mockOrg: OrganizationProfile = {
    id: "org-1",
    user_id: "user-1",
    organization_name: "SK San Isidro",
    organization_email: "sk@pasig.gov.ph",
    district: "District I",
    barangay: "San Isidro",
    profile_status: "verified",
    major_classification: "Youth Organization",
    sub_classification: "Community-Based",
    advocacies: ["Sports"],
    adviser_name: "Juan Dela Cruz",
    representative_name: "Maria Santos",
    address: "Pasig City",
    facebook_page_url: null,
    profile_image_url: null,
    directory_visibility: true,
    directory_show_representative: true,
    directory_show_adviser: true,
    verified_at: new Date().toISOString(),
    internal_notes: null,
    yorp_registered_year: 2024,
    yorp_renewed_year: 2026,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockRequests: BudgetRequest[] = [
    {
      id: "req-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Youth Basketball Cup",
      activityDescription: "Annual tournament",
      activityDate: "2026-08-15",
      venue: "San Isidro Court",
      requestedAmount: 50000,
      approvedAmount: 50000,
      releasedAmount: 0,
      releaseDate: null,
      purposeCategory: "Sports Development",
      fiscalYear: 2026,
      status: "submitted",
      remarks: null,
      adminRemarks: "",
      goSignalAt: null,
      hardCopySubmittedAt: null,
      userNote: "",
      revisionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "req-2",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Leadership Seminar",
      activityDescription: "Training officers",
      activityDate: "2026-09-01",
      venue: "Barangay Hall",
      requestedAmount: 35000,
      approvedAmount: 0,
      releasedAmount: 0,
      releaseDate: null,
      purposeCategory: "Leadership Development",
      fiscalYear: 2026,
      status: "under_review",
      remarks: null,
      adminRemarks: "",
      goSignalAt: null,
      hardCopySubmittedAt: null,
      userNote: "",
      revisionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "req-3",
      organizationId: "org-1",
      submittedBy: "user-1",
      activityTitle: "Music Festival",
      activityDescription: "Community concert",
      activityDate: "2026-10-10",
      venue: "Plaza",
      requestedAmount: 80000,
      approvedAmount: 80000,
      releasedAmount: 80000,
      releaseDate: "2026-10-01",
      purposeCategory: "Culture & Arts",
      fiscalYear: 2026,
      status: "budget_released",
      remarks: null,
      adminRemarks: "",
      goSignalAt: null,
      hardCopySubmittedAt: null,
      userNote: "",
      revisionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("TEST N1 — Row checkboxes are active and can be toggled", () => {
    const onSelectionChange = vi.fn();
    render(
      <BudgetRequestsTable
        requests={mockRequests}
        allRequests={mockRequests}
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
        selectedRequestIds={new Set()}
        onSelectedRequestIdsChange={onSelectionChange}
      />,
    );

    const firstRowCheckbox = screen.getByRole("checkbox", { name: /Select Youth Basketball Cup/i });
    expect(firstRowCheckbox).not.toBeDisabled();
    expect((firstRowCheckbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(firstRowCheckbox);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const updatedSet: Set<string> = onSelectionChange.mock.calls[0][0];
    expect(updatedSet.has("req-1")).toBe(true);
  });

  it("TEST N2 — When 1+ rows are selected, contextual selection toolbar appears with count", () => {
    const onDeleteSelected = vi.fn();
    render(
      <BudgetRequestsTable
        requests={mockRequests}
        allRequests={mockRequests}
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
        selectedRequestIds={new Set(["req-1", "req-2"])}
        onSelectedRequestIdsChange={vi.fn()}
        onDeleteSelected={onDeleteSelected}
      />,
    );

    expect(screen.getByText("2 requests selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear selection/i })).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /Delete selected/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it("TEST N3 — Clear selection button empties the selected IDs set", () => {
    const onSelectionChange = vi.fn();
    render(
      <BudgetRequestsTable
        requests={mockRequests}
        allRequests={mockRequests}
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
        selectedRequestIds={new Set(["req-1"])}
        onSelectedRequestIdsChange={onSelectionChange}
      />,
    );

    const clearBtn = screen.getByRole("button", { name: /Clear selection/i });
    fireEvent.click(clearBtn);

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("TEST O — Header checkbox selects ONLY visible page rows", () => {
    const onSelectionChange = vi.fn();
    render(
      <BudgetRequestsTable
        requests={mockRequests}
        allRequests={mockRequests}
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
        selectedRequestIds={new Set()}
        onSelectedRequestIdsChange={onSelectionChange}
      />,
    );

    const headerCheckbox = screen.getByRole("checkbox", { name: /Select all visible requests on current page/i });
    fireEvent.click(headerCheckbox);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const selected: Set<string> = onSelectionChange.mock.calls[0][0];
    expect(selected.size).toBe(3);
    expect(selected.has("req-1")).toBe(true);
    expect(selected.has("req-2")).toBe(true);
    expect(selected.has("req-3")).toBe(true);
  });

  it("TEST N4 — Header checkbox displays indeterminate state when subset is selected", () => {
    render(
      <BudgetRequestsTable
        requests={mockRequests}
        allRequests={mockRequests}
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
        selectedRequestIds={new Set(["req-1"])}
        onSelectedRequestIdsChange={vi.fn()}
      />,
    );

    const headerCheckbox = screen.getByRole("checkbox", { name: /Select all visible requests on current page/i }) as HTMLInputElement;
    expect(headerCheckbox.indeterminate).toBe(true);
    expect(headerCheckbox.checked).toBe(false);
  });
});
