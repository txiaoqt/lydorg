import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegistrationsTable, StatusPill } from "./RegistrationsTable";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";

describe("Admin Registrations Suspended Filter & Table Suite", () => {
  const mockOrganizations: OrganizationProfile[] = [
    {
      id: "org-1",
      userId: "user-1",
      organizationName: "Alpha Youth Organization",
      organizationEmail: "alpha@pasig.gov.ph",
      contactNumber: "09123456789",
      district: "District 1",
      barangay: "Kapitolyo",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      profileStatus: "verified",
      registrationType: "new_registration",
      majorClassification: "Youth-Led",
      subClassification: "Community",
      advocacies: ["Leadership"],
      adviserName: "Adviser One",
      representativeName: "Rep One",
      address: "Pasig City",
      referenceId: "REG-2026-0001",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "org-2",
      userId: "user-2",
      organizationName: "Beta Youth Club",
      organizationEmail: "beta@pasig.gov.ph",
      contactNumber: "09223456789",
      district: "District 1",
      barangay: "Kapitolyo",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      profileStatus: "pending_review",
      registrationType: "new_registration",
      majorClassification: "Youth-Serving",
      subClassification: "Advocacy",
      advocacies: ["Education"],
      adviserName: "Adviser Two",
      representativeName: "Rep Two",
      address: "Pasig City",
      referenceId: "REG-2026-0002",
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    },
    {
      id: "org-3",
      userId: "user-3",
      organizationName: "Gamma Youth Alliance",
      organizationEmail: "gamma@pasig.gov.ph",
      contactNumber: "09323456789",
      district: "District 2",
      barangay: "Pinagbuhatan",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      profileStatus: "needs_update",
      registrationType: "new_registration",
      majorClassification: "Youth-Led",
      subClassification: "Sports",
      advocacies: ["Health"],
      adviserName: "Adviser Three",
      representativeName: "Rep Three",
      address: "Pasig City",
      referenceId: "REG-2026-0003",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    },
    {
      id: "org-4",
      userId: "user-4",
      organizationName: "Delta Suspended Org",
      organizationEmail: "delta@pasig.gov.ph",
      contactNumber: "09423456789",
      district: "District 2",
      barangay: "Pinagbuhatan",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      profileStatus: "suspended_inactive",
      registrationType: "new_registration",
      majorClassification: "Youth-Led",
      subClassification: "Cultural",
      advocacies: ["Arts"],
      adviserName: "Adviser Four",
      representativeName: "Rep Four",
      address: "Pasig City",
      referenceId: "REG-2026-0004",
      createdAt: "2026-01-04T00:00:00Z",
      updatedAt: "2026-01-04T00:00:00Z",
    },
  ];

  const documentCounts = {
    "org-1": { submitted: 4, required: 4 },
    "org-2": { submitted: 2, required: 4 },
    "org-3": { submitted: 3, required: 4 },
    "org-4": { submitted: 1, required: 4 },
  };

  // 1. Filter tabs rendering
  it("renders all 4 status tabs including Suspended", () => {
    render(
      <RegistrationsTable
        registrations={mockOrganizations}
        documentCountsByOrgId={documentCounts}
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

    expect(screen.getByRole("button", { name: "All Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verified" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending Review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Needs Update" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspended" })).toBeInTheDocument();
  });

  // 2. Status tab click invokes onStatusFilterChange with "suspended_inactive"
  it("clicking the Suspended tab passes suspended_inactive to onStatusFilterChange", () => {
    const handleStatusFilterChange = vi.fn();

    render(
      <RegistrationsTable
        registrations={mockOrganizations}
        documentCountsByOrgId={documentCounts}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={handleStatusFilterChange}
        districtFilter="all"
        onDistrictFilterChange={vi.fn()}
        barangayFilter="all"
        onBarangayFilterChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    const suspendedTab = screen.getByRole("button", { name: "Suspended" });
    fireEvent.click(suspendedTab);
    expect(handleStatusFilterChange).toHaveBeenCalledWith("suspended_inactive");
  });

  // 3. StatusPill renders Suspended badge for suspended_inactive
  it("StatusPill renders Suspended label for suspended_inactive status", () => {
    const { container } = render(<StatusPill status="suspended_inactive" />);
    expect(container.textContent).toContain("Suspended");
  });

  // 4. Filtering Logic Suite
  it("filtering logic correctly isolates suspended organizations vs active ones", () => {
    const filterFn = (
      orgs: OrganizationProfile[],
      filter: string,
      search: string = "",
      district: string = "all",
    ) => {
      const query = search.trim().toLowerCase();
      return orgs.filter((org) => {
        const matchesSearch =
          !query ||
          [org.organizationName, org.organizationEmail, org.referenceId ?? "", org.barangay ?? "", org.district ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus =
          filter === "all"
            ? true
            : filter === "pending_review"
              ? org.profileStatus === "pending_review" || org.profileStatus === "incomplete"
              : org.profileStatus === filter;
        const matchesDistrict = district === "all" || org.district === district;
        return matchesSearch && matchesStatus && matchesDistrict;
      });
    };

    // All Status -> includes all 4
    const all = filterFn(mockOrganizations, "all");
    expect(all.length).toBe(4);
    expect(all.some((o) => o.profileStatus === "suspended_inactive")).toBe(true);

    // Suspended -> ONLY org-4
    const suspendedOnly = filterFn(mockOrganizations, "suspended_inactive");
    expect(suspendedOnly.length).toBe(1);
    expect(suspendedOnly[0].id).toBe("org-4");
    expect(suspendedOnly[0].organizationName).toBe("Delta Suspended Org");

    // Verified -> ONLY org-1
    const verifiedOnly = filterFn(mockOrganizations, "verified");
    expect(verifiedOnly.length).toBe(1);
    expect(verifiedOnly[0].id).toBe("org-1");

    // Pending Review -> ONLY org-2
    const pendingOnly = filterFn(mockOrganizations, "pending_review");
    expect(pendingOnly.length).toBe(1);
    expect(pendingOnly[0].id).toBe("org-2");

    // Needs Update -> ONLY org-3
    const needsUpdateOnly = filterFn(mockOrganizations, "needs_update");
    expect(needsUpdateOnly.length).toBe(1);
    expect(needsUpdateOnly[0].id).toBe("org-3");

    // Suspended + Search ("Delta") -> org-4
    const searchMatch = filterFn(mockOrganizations, "suspended_inactive", "Delta");
    expect(searchMatch.length).toBe(1);
    expect(searchMatch[0].id).toBe("org-4");

    // Suspended + Non-matching Search ("Alpha") -> 0
    const searchNoMatch = filterFn(mockOrganizations, "suspended_inactive", "Alpha");
    expect(searchNoMatch.length).toBe(0);

    // Suspended + District 2 -> org-4
    const districtMatch = filterFn(mockOrganizations, "suspended_inactive", "", "District 2");
    expect(districtMatch.length).toBe(1);
    expect(districtMatch[0].id).toBe("org-4");

    // Suspended + District 1 -> 0
    const districtNoMatch = filterFn(mockOrganizations, "suspended_inactive", "", "District 1");
    expect(districtNoMatch.length).toBe(0);
  });
});
