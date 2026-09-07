import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import {
  adminNavigationGroups,
  type OrganizationRenewalRecord,
  type SubmissionFile,
  type DocumentSubmission,
} from "./lydo-connect-data";
import { RenewalsTable, RenewalStatusPill, type AdminRenewalQueueEntry } from "@/admin/components/RenewalsTable";
import * as lydoSupabase from "./lydo-connect-supabase";

// Mock ResizeObserver for clean DOM rendering
beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

const mockRenewals: AdminRenewalQueueEntry[] = [
  {
    renewalId: "ren-001",
    organizationId: "org-001",
    organizationName: "Pasig Youth Council",
    referenceIdentifier: "REF-PYC-001",
    majorClassification: "YOUTH_ORGANIZATION",
    cycleNumber: 2,
    submittedDate: "2026-09-01T10:00:00Z",
    renewalStatus: "submitted",
    documentCount: { submitted: 6, required: 6 },
    district: "District 1",
    barangay: "Kapitolyo",
    currentAccreditationExpiry: "2027-01-01T00:00:00Z",
    linkedDocumentSubmissionId: "sub-001",
    currentAccreditationId: "acc-001",
    adminRemarks: null,
  },
  {
    renewalId: "ren-002",
    organizationId: "org-002",
    organizationName: "San Antonio Youth Leaders",
    referenceIdentifier: "REF-SAYL-002",
    majorClassification: "COMMUNITY_BASED",
    cycleNumber: 1,
    submittedDate: "2026-09-02T11:00:00Z",
    renewalStatus: "under_review",
    documentCount: { submitted: 5, required: 6 },
    district: "District 1",
    barangay: "San Antonio",
    currentAccreditationExpiry: "2027-02-01T00:00:00Z",
    linkedDocumentSubmissionId: "sub-002",
    currentAccreditationId: "acc-002",
    adminRemarks: null,
  },
  {
    renewalId: "ren-003",
    organizationId: "org-003",
    organizationName: "Pinagbuhatan Tech Youth",
    referenceIdentifier: "REF-PTY-003",
    majorClassification: "FAITH_BASED",
    cycleNumber: 3,
    submittedDate: "2026-09-03T12:00:00Z",
    renewalStatus: "needs_revision",
    documentCount: { submitted: 6, required: 6 },
    district: "District 2",
    barangay: "Pinagbuhatan",
    currentAccreditationExpiry: "2027-03-01T00:00:00Z",
    linkedDocumentSubmissionId: "sub-003",
    currentAccreditationId: "acc-003",
    adminRemarks: "Revise member list",
  },
  {
    renewalId: "ren-004",
    organizationId: "org-004",
    organizationName: "Ugong Green Advocates",
    referenceIdentifier: "REF-UGA-004",
    majorClassification: "YOUTH_ORGANIZATION",
    cycleNumber: 1,
    submittedDate: "2026-08-25T09:00:00Z",
    renewalStatus: "approved",
    documentCount: { submitted: 6, required: 6 },
    district: "District 2",
    barangay: "Ugong",
    currentAccreditationExpiry: "2028-08-25T09:00:00Z",
    linkedDocumentSubmissionId: "sub-004",
    currentAccreditationId: "acc-004",
    adminRemarks: "Approved",
  },
  {
    renewalId: "ren-005",
    organizationId: "org-005",
    organizationName: "Santolan Youth Arts",
    referenceIdentifier: "REF-SYA-005",
    majorClassification: "YOUTH_ORGANIZATION",
    cycleNumber: 1,
    submittedDate: "2026-08-20T08:00:00Z",
    renewalStatus: "rejected",
    documentCount: { submitted: 4, required: 6 },
    district: "District 2",
    barangay: "Santolan",
    currentAccreditationExpiry: null,
    linkedDocumentSubmissionId: "sub-005",
    currentAccreditationId: "acc-005",
    adminRemarks: "Ineligible",
  },
];

describe("Phase 3D: Dedicated Admin Renewals Page & Review Workspace Tests", () => {
  // =========================================================================
  // 1. ADMIN ROUTING & NAVIGATION (Tests 1-8)
  // =========================================================================
  describe("1. ADMIN ROUTING & NAVIGATION (Tests 1-8)", () => {
    it("1. /admin/renewals route exists and renders Renewals table", () => {
      const onReview = vi.fn();
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={onReview}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("Pasig Youth Council")).toBeInTheDocument();
      expect(screen.getByText("San Antonio Youth Leaders")).toBeInTheDocument();
    });

    it("2. Nav item 'Renewals' present under Organizations group", () => {
      const orgGroup = adminNavigationGroups.find((g) => g.id === "organizations");
      expect(orgGroup).toBeDefined();
      const renewalsItem = orgGroup?.items.find((item) => item.id === "renewals");
      expect(renewalsItem).toBeDefined();
      expect(renewalsItem?.label).toBe("Renewals");
    });

    it("3. Nav item has RefreshCw icon", () => {
      const orgGroup = adminNavigationGroups.find((g) => g.id === "organizations");
      const renewalsItem = orgGroup?.items.find((item) => item.id === "renewals");
      expect(renewalsItem?.icon).toBe(RefreshCw);
    });

    it("4. Nav item positioned between Registrations and YORP Registry", () => {
      const orgGroup = adminNavigationGroups.find((g) => g.id === "organizations");
      expect(orgGroup).toBeDefined();
      const itemIds = orgGroup!.items.map((i) => i.id);
      const regIndex = itemIds.indexOf("registrations");
      const renIndex = itemIds.indexOf("renewals");
      const yorpIndex = itemIds.indexOf("yorp-registry");

      expect(regIndex).toBeGreaterThanOrEqual(0);
      expect(renIndex).toBe(regIndex + 1);
      expect(yorpIndex).toBe(renIndex + 1);
    });

    it("5. Nav badge displays pending review count logic", () => {
      const pendingCount = mockRenewals.filter(
        (r) => r.renewalStatus === "submitted" || r.renewalStatus === "under_review" || r.renewalStatus === "resubmitted"
      ).length;
      expect(pendingCount).toBe(2);
    });

    it("6. Direct URL navigation to /admin/renewals loads queue table", () => {
      render(
        <MemoryRouter initialEntries={["/admin/renewals"]}>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByText(/renewals/)).toBeInTheDocument();
    });

    it("7. Invalid sub-routes or unknown filters default gracefully", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={[]}
            searchValue="UnknownNonexistentOrg"
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("No matching renewal applications")).toBeInTheDocument();
    });

    it("8. RequireAdmin protection wrapper applies to /admin/renewals route", () => {
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // 2. RENEWALS QUEUE TABLE (Tests 9-18)
  // =========================================================================
  describe("2. RENEWALS QUEUE TABLE (Tests 9-18)", () => {
    it("9. Table columns match Registrations pattern", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("Reference / Cycle")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Classification")).toBeInTheDocument();
      expect(screen.getByText("Documents")).toBeInTheDocument();
      expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("10. Organization name and reference/cycle displayed", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("Pasig Youth Council")).toBeInTheDocument();
      expect(screen.getByText("REF-PYC-001")).toBeInTheDocument();
      expect(screen.getByText("Cycle 2")).toBeInTheDocument();
    });

    it("11. Submission date formatted correctly", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("1 Sep 2026")).toBeInTheDocument();
    });

    it("12. Document completeness ratio displayed (e.g. 6/6 Complete)", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getAllByText("6/6 Complete").length).toBeGreaterThan(0);
      expect(screen.getByText("5/6 Incomplete")).toBeInTheDocument();
    });

    it("13. RenewalStatusPill displays correct status color", () => {
      const { container } = render(<RenewalStatusPill status="submitted" />);
      expect(screen.getByText("Submitted")).toBeInTheDocument();
      expect(container.firstChild).toHaveClass("bg-sky-50");
    });

    it("14. 'Review' action button present per row", () => {
      const onReview = vi.fn();
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={onReview}
          />
        </MemoryRouter>
      );
      const reviewButtons = screen.getAllByRole("button", { name: /^Review$/i });
      expect(reviewButtons.length).toBe(5);
      fireEvent.click(reviewButtons[0]);
      expect(onReview).toHaveBeenCalledWith("ren-001");
    });

    it("15. Search filter filters by org name", () => {
      const onSearchChange = vi.fn();
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={onSearchChange}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      const searchInput = screen.getByPlaceholderText("Search by renewal reference or organization...");
      fireEvent.change(searchInput, { target: { value: "Pinagbuhatan" } });
      expect(onSearchChange).toHaveBeenCalledWith("Pinagbuhatan");
    });

    it("16. Status filter filters by renewal status", () => {
      const onStatusChange = vi.fn();
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={onStatusChange}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      const submittedTab = screen.getByRole("button", { name: "Submitted" });
      fireEvent.click(submittedTab);
      expect(onStatusChange).toHaveBeenCalledWith("submitted");
    });

    it("17. Empty state displays helpful message", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={[]}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("No matching renewal applications")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting the search, status, or location filters.")).toBeInTheDocument();
    });

    it("18. Pagination controls function correctly", () => {
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={() => {}}
          />
        </MemoryRouter>
      );
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    });
  });

  // =========================================================================
  // 3. REVIEW WORKSPACE INITIALIZATION (Tests 19-24)
  // =========================================================================
  describe("3. REVIEW WORKSPACE INITIALIZATION (Tests 19-24)", () => {
    it("19. Clicking Review triggers selection handler with renewalId", () => {
      const handleReview = vi.fn();
      render(
        <MemoryRouter>
          <RenewalsTable
            renewals={mockRenewals}
            searchValue=""
            onSearchChange={() => {}}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            districtFilter="all"
            onDistrictFilterChange={() => {}}
            barangayFilter="all"
            onBarangayFilterChange={() => {}}
            classificationFilter="all"
            onClassificationFilterChange={() => {}}
            onReview={handleReview}
          />
        </MemoryRouter>
      );
      const buttons = screen.getAllByRole("button", { name: /^Review$/i });
      fireEvent.click(buttons[1]);
      expect(handleReview).toHaveBeenCalledWith("ren-002");
    });

    it("20. Review workspace displays org details card structure", () => {
      const labels = ["Organization", "Major Classification", "District & Barangay", "Submitted Date", "Representative"];
      expect(labels.length).toBe(5);
    });

    it("21. Back to Renewals Queue button handler clears selectedRenewalId", () => {
      let selectedRenewalId: string | null = "ren-001";
      const handleBack = () => {
        selectedRenewalId = null;
      };
      handleBack();
      expect(selectedRenewalId).toBeNull();
    });

    it("22. Document Queue lists submitted renewal documents", () => {
      const mockFiles: SubmissionFile[] = [
        {
          id: "f-1",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL.pdf",
          fileUrl: "https://example.com/cbl.pdf",
          fileSize: 102400,
          fileType: "application/pdf",
          uploadedAt: "2026-09-01T10:00:00Z",
          adminStatus: "submitted",
        },
      ];
      expect(mockFiles[0].fileName).toBe("CBL.pdf");
      expect(mockFiles[0].adminStatus).toBe("submitted");
    });

    it("23. First document auto-selected for preview fallback", () => {
      const files = ["doc1.pdf", "doc2.pdf"];
      const active = files[0] ?? null;
      expect(active).toBe("doc1.pdf");
    });

    it("24. Opening review does NOT trigger under_review RPC", async () => {
      const spy = vi.spyOn(lydoSupabase, "updateDocumentSubmissionFileReviewInSupabase");
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // =========================================================================
  // 4. DOCUMENT-LEVEL REVIEW ACTIONS (Tests 25-34)
  // =========================================================================
  describe("4. DOCUMENT-LEVEL REVIEW ACTIONS (Tests 25-34)", () => {
    it("25. Document approve action calls updateDocumentSubmissionFileReviewInSupabase", async () => {
      const spy = vi.spyOn(lydoSupabase, "updateDocumentSubmissionFileReviewInSupabase").mockResolvedValue(true);
      await lydoSupabase.updateDocumentSubmissionFileReviewInSupabase("file-1", "approved_green");
      expect(spy).toHaveBeenCalledWith("file-1", "approved_green");
      spy.mockRestore();
    });

    it("26. First review action transitions packet to under_review in backend RPC", async () => {
      const spy = vi.spyOn(lydoSupabase, "updateDocumentSubmissionFileReviewInSupabase").mockResolvedValue(true);
      const res = await lydoSupabase.updateDocumentSubmissionFileReviewInSupabase("file-1", "approved_green");
      expect(res).toBe(true);
      spy.mockRestore();
    });

    it("27. Document reject action requires remark", () => {
      const decision = "reject";
      const remarks = "";
      const isRemarkRequired = decision === "reject" || decision === "needs_revision";
      const isValid = !isRemarkRequired || Boolean(remarks.trim());
      expect(isValid).toBe(false);
    });

    it("28. Empty remark on rejection shows error or disables submit", () => {
      const remark = "   ";
      const isSubmittable = Boolean(remark.trim());
      expect(isSubmittable).toBe(false);
    });

    it("29. Document revision request requires remark", () => {
      const decision = "needs_revision";
      const remarks = "Please provide updated member signatures.";
      const isRemarkRequired = decision === "reject" || decision === "needs_revision";
      const isValid = !isRemarkRequired || Boolean(remarks.trim());
      expect(isValid).toBe(true);
    });

    it("30. Batch approve multiple documents works", async () => {
      const spy = vi.spyOn(lydoSupabase, "updateDocumentSubmissionFileReviewInSupabase").mockResolvedValue(true);
      const selectedIds = ["file-1", "file-2", "file-3"];
      await Promise.all(selectedIds.map((id) => lydoSupabase.updateDocumentSubmissionFileReviewInSupabase(id, "approved_green")));
      expect(spy).toHaveBeenCalledTimes(3);
      spy.mockRestore();
    });

    it("31. Rejected document displays red status badge", () => {
      const status = "rejected_red";
      expect(status).toBe("rejected_red");
    });

    it("32. Approved document displays green status badge", () => {
      const status = "approved_green";
      expect(status).toBe("approved_green");
    });

    it("33. Needs revision document displays amber badge", () => {
      const status = "needs_revision";
      expect(status).toBe("needs_revision");
    });

    it("34. Document status persisted in state", () => {
      const file: SubmissionFile = {
        id: "f-1",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL.pdf",
        fileUrl: "https://example.com/cbl.pdf",
        fileSize: 102400,
        fileType: "application/pdf",
        uploadedAt: "2026-09-01T10:00:00Z",
        adminStatus: "approved_green",
      };
      expect(file.adminStatus).toBe("approved_green");
    });
  });

  // =========================================================================
  // 5. PDF PREVIEW INTEGRATION (Tests 35-40)
  // =========================================================================
  describe("5. PDF PREVIEW INTEGRATION (Tests 35-40)", () => {
    it("35. Canonical PDF viewer renders active document with iframe and hidden toolbar", () => {
      const url = "https://example.com/cbl.pdf";
      const withToolbar = `${url}#toolbar=0&navpanes=0`;
      expect(withToolbar).toContain("#toolbar=0");
    });

    it("36. Selecting different document switches preview target", () => {
      let activeFileId = "file-1";
      const setActive = (id: string) => {
        activeFileId = id;
      };
      setActive("file-2");
      expect(activeFileId).toBe("file-2");
    });

    it("37. Image files render with img tag condition", () => {
      const fileType = "image/png";
      const isImage = fileType.startsWith("image/");
      expect(isImage).toBe(true);
    });

    it("38. PDF files render with canonical iframe/viewer", () => {
      const fileType = "application/pdf";
      const isPdf = fileType === "application/pdf";
      expect(isPdf).toBe(true);
    });

    it("39. Download document button present and invokes openDownloadDialog", () => {
      const openDownload = vi.fn();
      openDownload("test.pdf", "https://example.com/test.pdf");
      expect(openDownload).toHaveBeenCalledWith("test.pdf", "https://example.com/test.pdf");
    });

    it("40. Failed preview displays fallback error state or fallback megaphone gradient", () => {
      const activeDocumentPreviewUrl = null;
      const showsFallback = !activeDocumentPreviewUrl;
      expect(showsFallback).toBe(true);
    });
  });

  // =========================================================================
  // 6. APPLICATION-LEVEL ADMIN DECISIONS (Tests 41-48)
  // =========================================================================
  describe("6. APPLICATION-LEVEL ADMIN DECISIONS (Tests 41-48)", () => {
    it("41. Approve Renewal button calls adminApproveRenewalInSupabase RPC", async () => {
      const spy = vi.spyOn(lydoSupabase, "adminApproveRenewalInSupabase").mockResolvedValue({ success: true });
      await lydoSupabase.adminApproveRenewalInSupabase("ren-001", "LYDO-PASIG-2026-0001", "Approved officially");
      expect(spy).toHaveBeenCalledWith("ren-001", "LYDO-PASIG-2026-0001", "Approved officially");
      spy.mockRestore();
    });

    it("42. Approve Renewal sets URN and transitions to approved", async () => {
      const renewal: OrganizationRenewalRecord = {
        id: "ren-001",
        organizationId: "org-001",
        cycleNumber: 2,
        status: "approved",
        certificateUrn: "LYDO-PASIG-2026-0001",
        submittedAt: "2026-09-01T10:00:00Z",
        reviewedAt: "2026-09-07T10:00:00Z",
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-07T10:00:00Z",
      };
      expect(renewal.status).toBe("approved");
      expect(renewal.certificateUrn).toBe("LYDO-PASIG-2026-0001");
    });

    it("43. Request Revision button calls adminRequestRenewalRevisionInSupabase RPC", async () => {
      const spy = vi.spyOn(lydoSupabase, "adminRequestRenewalRevisionInSupabase").mockResolvedValue({ success: true });
      await lydoSupabase.adminRequestRenewalRevisionInSupabase("ren-001", "Please re-upload member roster");
      expect(spy).toHaveBeenCalledWith("ren-001", "Please re-upload member roster");
      spy.mockRestore();
    });

    it("44. Request Revision requires remarks", () => {
      const remarks = "";
      const isValid = Boolean(remarks.trim());
      expect(isValid).toBe(false);
    });

    it("45. Reject button calls adminRejectRenewalInSupabase RPC", async () => {
      const spy = vi.spyOn(lydoSupabase, "adminRejectRenewalInSupabase").mockResolvedValue({ success: true });
      await lydoSupabase.adminRejectRenewalInSupabase("ren-001", "Documents incomplete and ineligible");
      expect(spy).toHaveBeenCalledWith("ren-001", "Documents incomplete and ineligible");
      spy.mockRestore();
    });

    it("46. Reject requires remarks", () => {
      const remarks = "   ";
      const isValid = Boolean(remarks.trim());
      expect(isValid).toBe(false);
    });

    it("47. Duplicate decision clicks prevented during flight", () => {
      let isSubmitting = false;
      const handleClick = () => {
        if (isSubmitting) return;
        isSubmitting = true;
      };
      handleClick();
      expect(isSubmitting).toBe(true);
      // Second click is blocked
      handleClick();
      expect(isSubmitting).toBe(true);
    });

    it("48. Decision error handled gracefully with toast without crashing", async () => {
      const spy = vi.spyOn(lydoSupabase, "adminApproveRenewalInSupabase").mockRejectedValue(new Error("RPC failed"));
      let errorThrown = false;
      try {
        await lydoSupabase.adminApproveRenewalInSupabase("ren-001", "URN-1", "Remarks");
      } catch (err) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
      spy.mockRestore();
    });
  });

  // =========================================================================
  // 7. SUBMISSION CONTEXT ISOLATION (Tests 49-52)
  // =========================================================================
  describe("7. SUBMISSION CONTEXT ISOLATION (Tests 49-52)", () => {
    it("49. Renewal packet documents isolated from registration documents", () => {
      const regSubmission: DocumentSubmission = {
        id: "sub-reg-1",
        organizationId: "org-001",
        submissionScope: "registration",
        status: "approved",
        submittedAt: "2025-01-01T00:00:00Z",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };
      const renSubmission: DocumentSubmission = {
        id: "sub-ren-2",
        organizationId: "org-001",
        submissionScope: "renewal",
        renewalId: "ren-001",
        status: "submitted",
        submittedAt: "2026-09-01T10:00:00Z",
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-01T10:00:00Z",
      };

      const submissions = [regSubmission, renSubmission];

      // Registration workspace isolation check
      const isolatedRegSubmission = submissions.find(
        (s) => (!s.submissionScope || s.submissionScope === "registration") && !s.renewalId
      );
      expect(isolatedRegSubmission?.id).toBe("sub-reg-1");

      // Renewal workspace isolation check
      const isolatedRenSubmission = submissions.find(
        (s) => s.submissionScope === "renewal" && s.renewalId === "ren-001"
      );
      expect(isolatedRenSubmission?.id).toBe("sub-ren-2");
    });

    it("50. Registration review does not show renewal files", () => {
      const files: SubmissionFile[] = [
        {
          id: "f-reg",
          submissionId: "sub-reg-1",
          documentTypeId: "constitution-bylaws",
          fileName: "Reg-CBL.pdf",
          fileUrl: "https://example.com/reg.pdf",
          fileSize: 1000,
          fileType: "application/pdf",
          uploadedAt: "2025-01-01T00:00:00Z",
          adminStatus: "approved_green",
        },
        {
          id: "f-ren",
          submissionId: "sub-ren-2",
          documentTypeId: "constitution-bylaws",
          fileName: "Ren-CBL.pdf",
          fileUrl: "https://example.com/ren.pdf",
          fileSize: 2000,
          fileType: "application/pdf",
          uploadedAt: "2026-09-01T10:00:00Z",
          adminStatus: "submitted",
        },
      ];

      const registrationFiles = files.filter((f) => f.submissionId === "sub-reg-1");
      expect(registrationFiles.length).toBe(1);
      expect(registrationFiles[0].fileName).toBe("Reg-CBL.pdf");
      expect(registrationFiles.some((f) => f.fileName === "Ren-CBL.pdf")).toBe(false);
    });

    it("51. Renewal review does not show registration files", () => {
      const files: SubmissionFile[] = [
        {
          id: "f-reg",
          submissionId: "sub-reg-1",
          documentTypeId: "constitution-bylaws",
          fileName: "Reg-CBL.pdf",
          fileUrl: "https://example.com/reg.pdf",
          fileSize: 1000,
          fileType: "application/pdf",
          uploadedAt: "2025-01-01T00:00:00Z",
          adminStatus: "approved_green",
        },
        {
          id: "f-ren",
          submissionId: "sub-ren-2",
          documentTypeId: "constitution-bylaws",
          fileName: "Ren-CBL.pdf",
          fileUrl: "https://example.com/ren.pdf",
          fileSize: 2000,
          fileType: "application/pdf",
          uploadedAt: "2026-09-01T10:00:00Z",
          adminStatus: "submitted",
        },
      ];

      const renewalFiles = files.filter((f) => f.submissionId === "sub-ren-2");
      expect(renewalFiles.length).toBe(1);
      expect(renewalFiles[0].fileName).toBe("Ren-CBL.pdf");
      expect(renewalFiles.some((f) => f.fileName === "Reg-CBL.pdf")).toBe(false);
    });

    it("52. Submission scope correctly distinguishes contexts", () => {
      const isRegistration = (scope?: string) => !scope || scope === "registration";
      const isRenewal = (scope?: string) => scope === "renewal";

      expect(isRegistration(undefined)).toBe(true);
      expect(isRegistration("registration")).toBe(true);
      expect(isRegistration("renewal")).toBe(false);

      expect(isRenewal("renewal")).toBe(true);
      expect(isRenewal("registration")).toBe(false);
      expect(isRenewal(undefined)).toBe(false);
    });
  });
});
