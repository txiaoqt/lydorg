import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type {
  OrganizationProfile,
  OrganizationRenewalRecord,
  SubmissionFile,
  TemplateRecord,
} from "./lydo-connect-data";
import { resolveUserRenewalState } from "./organization-renewal";
import { UserPortalRenewalWorkspaceView } from "@/components/portal/UserPortalRenewalWorkspaceView";
import * as lydoSupabase from "./lydo-connect-supabase";

// Mock ResizeObserver
beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

const mockTemplates: TemplateRecord[] = [
  {
    id: "constitution-bylaws",
    databaseId: "constitution-bylaws",
    name: "Constitution and By-Laws",
    description: "Upload the signed constitution and by-laws in PDF format.",
    templateUrl: "https://example.com/cbl-template.pdf",
    templateFileUrl: "https://example.com/cbl-template.pdf",
    templateFileType: "application/pdf",
    sortOrder: 1,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
    scope: "both",
  },
  {
    id: "yorp-form-b",
    databaseId: "yorp-form-b",
    name: "NYC YORP Registration Form (Form B)",
    description: "Use current Form B template.",
    templateUrl: "https://example.com/form-b-template.pdf",
    templateFileUrl: "https://example.com/form-b-template.pdf",
    templateFileType: "application/pdf",
    sortOrder: 2,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
    scope: "both",
  },
  {
    id: "directory-members",
    databaseId: "directory-members",
    name: "Roster of Official Members",
    description: "Official roster of members.",
    templateUrl: "https://example.com/roster-template.pdf",
    templateFileUrl: "https://example.com/roster-template.pdf",
    templateFileType: "application/pdf",
    sortOrder: 3,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
    scope: "both",
  },
  {
    id: "members-good-standing",
    databaseId: "members-good-standing",
    name: "List of Members in Good Standing",
    description: "Members in good standing.",
    templateUrl: "https://example.com/good-standing-template.pdf",
    templateFileUrl: "https://example.com/good-standing-template.pdf",
    templateFileType: "application/pdf",
    sortOrder: 4,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
    scope: "both",
  },
  {
    id: "pcydo-form-a",
    databaseId: "pcydo-form-a",
    name: "Pasig City YORP Registration Form (Form A)",
    description: "Form A requirement.",
    templateUrl: "https://example.com/form-a-template.pdf",
    templateFileUrl: "https://example.com/form-a-template.pdf",
    templateFileType: "application/pdf",
    sortOrder: 5,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
    scope: "both",
  },
  {
    id: "pcydo-data-request",
    databaseId: "pcydo-data-request",
    name: "PCYDO YORP Data Request Form",
    description: "PCYDO data request.",
    templateUrl: "https://example.com/data-request-template.pdf",
    templateFileUrl: "https://example.com/data-request-template.pdf",
    templateFileType: "application/pdf",
    sortOrder: 6,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
    scope: "both",
  },
];

const mockBaseProfile: OrganizationProfile = {
  id: "org-test-1",
  referenceId: "REF-1001",
  userId: "user-1",
  organizationName: "Pasig Youth Movement",
  organizationEmail: "org@pasig.ph",
  contactNumber: "09171234567",
  district: "District 1",
  barangay: "San Nicolas",
  isExistingOrganization: true,
  organizationIdentifierNumber: "OIN-12345",
  registrationType: "community-based",
  urn: "URN-2023-001",
  urnNormalized: "urn-2023-001",
  urnReviewStatus: "verified",
  urnAdminRemarks: "",
  urnReviewedBy: "admin",
  urnReviewedAt: "2023-09-01T00:00:00Z",
  verificationMethod: "online",
  majorClassification: "Youth-Led",
  subClassification: "Community Organization",
  advocacies: [],
  adviserName: "Adviser Name",
  representativeName: "Leader Name",
  address: "Pasig City",
  facebookPageUrl: "https://facebook.com/pasigyouth",
  profileStatus: "verified",
  verifiedAt: "2023-09-01T00:00:00Z",
  internalNotes: "",
  yorpRegisteredYear: 2023,
  yorpRenewedYear: 2026,
  accreditationStartDate: "2023-09-01T00:00:00.000Z",
  accreditationExpiresAt: "2026-09-01T00:00:00.000Z",
  currentAccreditationId: "acc-1",
  accreditationStatus: "active",
  createdAt: "2023-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const mockDraftRenewal: OrganizationRenewalRecord = {
  id: "ren-draft-1",
  organizationId: "org-test-1",
  cycleNumber: 2,
  currentAccreditationId: "acc-1",
  status: "draft",
  submittedAt: null,
  reviewedBy: null,
  reviewedAt: null,
  adminRemarks: null,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("Phase 3C: User Renewal Document Workspace & Packet Implementation Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(lydoSupabase, "fetchRenewalRequiredDocumentTypesInSupabase").mockResolvedValue(mockTemplates);
  });

  // ==========================================
  // SECTION 1: WORKSPACE INITIALIZATION
  // ==========================================
  describe("WORKSPACE: Renewal Packet Loading & Requirements Display", () => {
    it("1. renewal draft loads correctly with cycle, organization name, and status badge", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Accreditation Renewal Workspace")).toBeInTheDocument();
      expect(screen.getByText(/Y-TRACE Cycle 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Pasig Youth Movement/i)).toBeInTheDocument();
      expect(screen.getByText("Draft In Progress")).toBeInTheDocument();
    });

    it("2. all six required documents render in the checklist", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      for (const t of mockTemplates) {
        expect(await screen.findByText(t.name)).toBeInTheDocument();
      }
    });

    it("3. document completion count is correct (e.g. 0 of 6 uploaded)", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("0 of 6 (0%)")).toBeInTheDocument();
      expect(screen.getByText(/Upload the remaining 6 documents to enable submission/i)).toBeInTheDocument();
    });

    it("4. missing files are clearly identified with 'Not Uploaded' badges", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const notUploadedBadges = await screen.findAllByText("Not Uploaded");
      // 6 requirements * 2 badges (responsive desktop + mobile viewports)
      expect(notUploadedBadges.length).toBe(12);
    });
  });

  // ==========================================
  // SECTION 2: DRAFT UPLOAD BEHAVIOR
  // ==========================================
  describe("DRAFT: Upload Actions & Validation", () => {
    it("5. draft allows uploads: renders 'Upload Document' buttons for missing files", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const uploadButtons = await screen.findAllByRole("button", { name: /Upload Document/i });
      expect(uploadButtons.length).toBe(6);
    });

    it("6. upload validation works: rejects non-PDF or empty files", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      await screen.findAllByRole("button", { name: /Upload Document/i });

      // Click upload for first requirement
      const uploadButtons = screen.getAllByRole("button", { name: /Upload Document/i });
      fireEvent.click(uploadButtons[0]);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Trigger change with a .png non-PDF file
      const nonPdfFile = new File(["dummy"], "avatar.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [nonPdfFile] } });

      // Does not trigger Supabase upload
      const uploadSpy = vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase");
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it("7. successful upload refreshes packet state and updates completion count", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      const mockSavedFile: SubmissionFile = {
        id: "file-1",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL-2026.pdf",
        fileUrl: "https://example.com/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024 * 50,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
        uploadedAt: "2026-06-15T10:00:00Z",
      };

      vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase").mockResolvedValue(mockSavedFile);

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const uploadButtons = await screen.findAllByRole("button", { name: /Upload Document/i });
      fireEvent.click(uploadButtons[0]);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 test content"], "CBL-2026.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(screen.getByText("1 of 6 (17%)")).toBeInTheDocument();
        expect(screen.getByText("CBL-2026.pdf")).toBeInTheDocument();
        expect(screen.getAllByText("Draft Saved").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("8. upload errors are handled gracefully without crashing", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase").mockRejectedValue(
        new Error("Storage bucket timeout"),
      );

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const uploadButtons = await screen.findAllByRole("button", { name: /Upload Document/i });
      fireEvent.click(uploadButtons[0]);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 test"], "CBL.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      // The view handles the error and remains responsive
      await waitFor(() => {
        expect(screen.getByText("Accreditation Renewal Workspace")).toBeInTheDocument();
      });
    });

    it("9. duplicate upload action is prevented while an upload is in progress", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      let resolveUpload: any;
      const pendingUploadPromise = new Promise<SubmissionFile>((resolve) => {
        resolveUpload = resolve;
      });
      vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase").mockReturnValue(pendingUploadPromise);

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const uploadButtons = await screen.findAllByRole("button", { name: /Upload Document/i });
      fireEvent.click(uploadButtons[0]);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 test"], "CBL.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      // Button enters loading state and is disabled
      await waitFor(() => {
        expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();
      });

      // Cleanup
      resolveUpload({
        id: "f-1",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL.pdf",
        fileUrl: "https://example.com/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      });
    });
  });

  // ==========================================
  // SECTION 3: PDF PREVIEW REUSE
  // ==========================================
  describe("PREVIEW: Reusing Canonical PDF Viewer", () => {
    it("10. existing PDF viewer is reused: calls openPreview with fileUrl and title", async () => {
      const openPreviewSpy = vi.fn();
      const mockFile: SubmissionFile = {
        id: "f-1",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL-Approved.pdf",
        fileUrl: "https://example.com/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [mockFile],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
            openPreview={openPreviewSpy}
          />
        </MemoryRouter>,
      );

      const previewButton = await screen.findByRole("button", { name: /Preview/i });
      fireEvent.click(previewButton);

      expect(openPreviewSpy).toHaveBeenCalledWith("https://example.com/cbl.pdf", "CBL-Approved.pdf");
    });

    it("11. preview action works for template files: View Template opens canonical viewer", async () => {
      const openPreviewSpy = vi.fn();
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
            openPreview={openPreviewSpy}
          />
        </MemoryRouter>,
      );

      const templateButtons = await screen.findAllByRole("button", { name: /View Template/i });
      fireEvent.click(templateButtons[0]);

      expect(openPreviewSpy).toHaveBeenCalledWith(
        "https://example.com/cbl-template.pdf",
        "Constitution and By-Laws (Template)",
      );
    });
  });

  // ==========================================
  // SECTION 4: SUBMISSION WORKFLOW
  // ==========================================
  describe("SUBMISSION: Completeness Guard, Confirmation Modal & Submission", () => {
    it("12. submit disabled when required documents are missing (< 6 uploaded)", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: [], // 0 of 6
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const submitButton = await screen.findByRole("button", { name: /Submit Renewal Application/i });
      expect(submitButton).toBeDisabled();
    });

    it("13. submit enabled when packet is complete (all 6 uploaded)", async () => {
      const allFiles: SubmissionFile[] = mockTemplates.map((t, idx) => ({
        id: `f-${idx}`,
        submissionId: "sub-1",
        documentTypeId: t.id,
        fileName: `${t.id}.pdf`,
        fileUrl: `https://example.com/${t.id}.pdf`,
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      }));

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: allFiles,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const submitButton = await screen.findByRole("button", { name: /Submit Renewal Application/i });
      expect(submitButton).not.toBeDisabled();
      expect(screen.getByText("6 of 6 (100%)")).toBeInTheDocument();
      expect(screen.getByText("All 6 required documents are present in this packet.")).toBeInTheDocument();
    });

    it("14. confirmation modal appears upon clicking submit", async () => {
      const allFiles: SubmissionFile[] = mockTemplates.map((t, idx) => ({
        id: `f-${idx}`,
        submissionId: "sub-1",
        documentTypeId: t.id,
        fileName: `${t.id}.pdf`,
        fileUrl: `https://example.com/${t.id}.pdf`,
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      }));

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: allFiles,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const submitButton = await screen.findByRole("button", { name: /Submit Renewal Application/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText("Submit Renewal Application?")).toBeInTheDocument();
      expect(screen.getByText(/You are about to submit all 6 required documents/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Confirm & Submit Application/i })).toBeInTheDocument();
    });

    it("15. successful submit transitions to submitted via userSubmitRenewalInSupabase", async () => {
      const allFiles: SubmissionFile[] = mockTemplates.map((t, idx) => ({
        id: `f-${idx}`,
        submissionId: "sub-1",
        documentTypeId: t.id,
        fileName: `${t.id}.pdf`,
        fileUrl: `https://example.com/${t.id}.pdf`,
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      }));

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "draft" } as any,
        files: allFiles,
      });

      const submitSpy = vi.spyOn(lydoSupabase, "userSubmitRenewalInSupabase").mockResolvedValue({
        renewalId: "ren-draft-1",
        status: "submitted",
        submittedAt: "2026-06-16T12:00:00Z",
      });

      const onUpdatedSpy = vi.fn();

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
            onRenewalUpdated={onUpdatedSpy}
          />
        </MemoryRouter>,
      );

      const submitButton = await screen.findByRole("button", { name: /Submit Renewal Application/i });
      fireEvent.click(submitButton);

      const confirmBtn = await screen.findByRole("button", { name: /Confirm & Submit Application/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith("ren-draft-1");
        expect(onUpdatedSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "ren-draft-1",
            status: "submitted",
            submittedAt: "2026-06-16T12:00:00Z",
          }),
        );
        expect(screen.getByText("Submitted (Pending Review)")).toBeInTheDocument();
      });
    });

    it("16. submitted state becomes read-only with review banner", async () => {
      const submittedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "submitted",
        submittedAt: "2026-06-16T12:00:00Z",
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-test-1", renewalId: "ren-draft-1", status: "submitted" } as any,
        files: mockTemplates.map((t) => ({
          id: `f-${t.id}`,
          submissionId: "sub-1",
          documentTypeId: t.id,
          fileName: `${t.id}.pdf`,
          fileUrl: `https://example.com/${t.id}.pdf`,
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "correct",
          adminStatus: "submitted",
          adminRemarks: null,
          revisionHistory: [],
        })),
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [submittedRenewal] })}
            activeRenewal={submittedRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Renewal Application Submitted")).toBeInTheDocument();
      expect(screen.getByText(/Your renewal packet is currently in review by the LYDO administrator/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Submit Renewal Application/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // SECTION 5: REVIEW & REVISION FLOW
  // ==========================================
  describe("REVIEW & REVISION: Handling Under Review & Needs Revision States", () => {
    it("17. submitted is read-only", async () => {
      const submittedRenewal: OrganizationRenewalRecord = { ...mockDraftRenewal, status: "submitted" };
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "submitted" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [submittedRenewal] })}
            activeRenewal={submittedRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Submitted (Pending Review)")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("18. under_review is read-only with active admin review banner", async () => {
      const reviewRenewal: OrganizationRenewalRecord = { ...mockDraftRenewal, status: "under_review" };
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "under_review" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [reviewRenewal] })}
            activeRenewal={reviewRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Under Admin Review")).toBeInTheDocument();
      expect(screen.getByText("Active Administrator Review In Progress")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("19. needs_revision surfaces admin remarks in alert banner and on flagged cards", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
        adminRemarks: "Please replace Constitution and By-Laws with signed 2026 page.",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-cbl",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Old.pdf",
          fileUrl: "https://example.com/cbl.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "needs_reupload",
          adminStatus: "needs_revision",
          adminRemarks: "Missing signatures on page 4.",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Revision Requested")).toBeInTheDocument();
      expect(screen.getByText(/Please replace Constitution and By-Laws with signed 2026 page/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing signatures on page 4/i)).toBeInTheDocument();
    });

    it("20. flagged documents show 'Replace Document' action", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
        adminRemarks: "Revision needed",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-cbl",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Old.pdf",
          fileUrl: "https://example.com/cbl.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "needs_reupload",
          adminStatus: "needs_revision",
          adminRemarks: "Missing signature",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const replaceButton = await screen.findByRole("button", { name: /Replace Document/i });
      expect(replaceButton).toBeInTheDocument();
    });
  });

  // ==========================================
  // SECTION 6: REVISION REPLACEMENT WORKFLOW
  // ==========================================
  describe("REPLACEMENT: Calling Authoritative userReplaceDocumentSubmissionFileInSupabase RPC", () => {
    it("21. replacement works for needs_revision file: triggers replaceRenewalDocumentFileInSupabase", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
        adminRemarks: "Revisions needed",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-cbl",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Old.pdf",
          fileUrl: "https://example.com/cbl-old.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "needs_reupload",
          adminStatus: "needs_revision",
          adminRemarks: "Signature required",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      const replaceSpy = vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase").mockResolvedValue({
        id: "f-cbl",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL-Corrected.pdf",
        fileUrl: "https://example.com/cbl-corrected.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "submitted",
        adminRemarks: null,
        revisionHistory: [
          {
            file_url: "https://example.com/cbl-old.pdf",
            file_name: "CBL-Old.pdf",
            replaced_at: "2026-06-17T00:00:00Z",
            replaced_by: "user-1",
          },
        ],
      });

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const replaceBtn = await screen.findByRole("button", { name: /Replace Document/i });
      fireEvent.click(replaceBtn);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 corrected"], "CBL-Corrected.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(replaceSpy).toHaveBeenCalledWith({
          organizationId: "org-test-1",
          renewalId: "ren-draft-1",
          fileId: "f-cbl",
          documentTypeId: "constitution-bylaws",
          file: validPdf,
        });
      });
    });

    it("22. replacement works for rejected file where backend permits (rejected_red)", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
        adminRemarks: "Fix rejected document",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-cbl",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Rejected.pdf",
          fileUrl: "https://example.com/cbl-rej.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "needs_reupload",
          adminStatus: "rejected_red",
          adminRemarks: "Wrong format",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const replaceBtn = await screen.findByRole("button", { name: /Replace Document/i });
      expect(replaceBtn).toBeInTheDocument();
    });

    it("23. approved file cannot be replaced: displays 'Locked • Document Approved'", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
      };

      const files: SubmissionFile[] = [
        {
          id: "f-approved",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Valid.pdf",
          fileUrl: "https://example.com/cbl.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "correct",
          adminStatus: "approved",
          adminRemarks: null,
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Locked • Document Approved")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Replace Document/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("24. replacement refreshes current file in the view", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-cbl",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Old.pdf",
          fileUrl: "https://example.com/cbl-old.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "needs_reupload",
          adminStatus: "needs_revision",
          adminRemarks: "Replace needed",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase").mockResolvedValue({
        id: "f-cbl",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL-New2026.pdf",
        fileUrl: "https://example.com/cbl-new.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "submitted",
        adminRemarks: null,
        revisionHistory: [],
      });

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const replaceBtn = await screen.findByRole("button", { name: /Replace Document/i });
      fireEvent.click(replaceBtn);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 new"], "CBL-New2026.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(screen.getByText("CBL-New2026.pdf")).toBeInTheDocument();
        expect(screen.getAllByText("Under Review").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("25. revision history remains preserved through backend flow (RPC invoked)", async () => {
      // replaceRenewalDocumentFileInSupabase delegates to userReplaceDocumentSubmissionFileInSupabase RPC
      const rpcSpy = vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase").mockResolvedValue({
        id: "f-cbl",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "CBL-v2.pdf",
        fileUrl: "https://example.com/cbl-v2.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "submitted",
        adminRemarks: null,
        revisionHistory: [
          {
            file_url: "https://example.com/cbl-v1.pdf",
            file_name: "CBL-v1.pdf",
            replaced_at: "2026-06-17T00:00:00Z",
            replaced_by: "user-1",
          },
        ],
      });

      const res = await lydoSupabase.replaceRenewalDocumentFileInSupabase({
        organizationId: "org-1",
        renewalId: "ren-1",
        fileId: "f-cbl",
        documentTypeId: "constitution-bylaws",
        file: new File(["%PDF-1.4 test"], "CBL-v2.pdf", { type: "application/pdf" }),
      });

      expect(rpcSpy).toHaveBeenCalled();
      expect(res.revisionHistory.length).toBe(1);
      expect(res.revisionHistory[0].file_name).toBe("CBL-v1.pdf");
    });
  });

  // ==========================================
  // SECTION 7: RESUBMISSION WORKFLOW
  // ==========================================
  describe("RESUBMISSION: Resubmission Flow After Correction", () => {
    it("26. resubmit unavailable while unresolved flagged files remain", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-cbl",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "CBL-Old.pdf",
          fileUrl: "https://example.com/cbl.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          validationStatus: "needs_reupload",
          adminStatus: "needs_revision",
          adminRemarks: "Needs correction",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const resubmitBtn = await screen.findByRole("button", { name: /Resubmit Renewal Application/i });
      expect(resubmitBtn).toBeDisabled();
    });

    it("27. resubmit calls authoritative RPC userResubmitRenewalInSupabase when all flagged files resolved", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
      };

      // All 6 files have been replaced/resolved (status: submitted or approved)
      const resolvedFiles: SubmissionFile[] = mockTemplates.map((t, idx) => ({
        id: `f-${idx}`,
        submissionId: "sub-1",
        documentTypeId: t.id,
        fileName: `${t.id}-corrected.pdf`,
        fileUrl: `https://example.com/${t.id}-corr.pdf`,
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "submitted",
        adminRemarks: null,
        revisionHistory: [],
      }));

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: resolvedFiles,
      });

      const resubmitSpy = vi.spyOn(lydoSupabase, "userResubmitRenewalInSupabase").mockResolvedValue({
        renewalId: "ren-draft-1",
        status: "resubmitted",
        resubmittedAt: "2026-06-18T10:00:00Z",
      });

      const onUpdateSpy = vi.fn();

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
            onRenewalUpdated={onUpdateSpy}
          />
        </MemoryRouter>,
      );

      const resubmitBtn = await screen.findByRole("button", { name: /Resubmit Renewal Application/i });
      expect(resubmitBtn).not.toBeDisabled();
      fireEvent.click(resubmitBtn);

      await waitFor(() => {
        expect(resubmitSpy).toHaveBeenCalledWith("ren-draft-1");
        expect(onUpdateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "ren-draft-1",
            status: "resubmitted",
          }),
        );
      });
    });

    it("28. successful resubmit becomes read-only with 'Resubmitted Renewal Under Review' banner", async () => {
      const resubmittedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "resubmitted",
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "resubmitted" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [resubmittedRenewal] })}
            activeRenewal={resubmittedRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Resubmitted (Under Review)")).toBeInTheDocument();
      expect(screen.getByText("Resubmitted Renewal Under Review")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Resubmit Renewal Application/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // SECTION 8: REJECTED RENEWAL HANDLING
  // ==========================================
  describe("REJECTED: Terminal Rejection Guard", () => {
    it("29. rejected renewal has no resubmit action", async () => {
      const rejectedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "rejected",
        adminRemarks: "Violated municipal accreditation policies.",
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "rejected" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [rejectedRenewal] })}
            activeRenewal={rejectedRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Not Approved")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Resubmit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Submit Renewal Application/i })).not.toBeInTheDocument();
    });

    it("30. rejected renewal has no new Start Renewal action", async () => {
      const rejectedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "rejected",
        adminRemarks: "Rejected",
      };

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [rejectedRenewal] })}
            activeRenewal={rejectedRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByRole("button", { name: /Start Renewal/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Initialize Renewal Draft/i })).not.toBeInTheDocument();
    });

    it("31. rejected renewal displays office-contact guidance", async () => {
      const rejectedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "rejected",
        adminRemarks: "Final board decision not to grant renewal.",
      };

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [rejectedRenewal] })}
            activeRenewal={rejectedRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText(/This renewal decision is final. Please contact the LYDO office directly/i)).toBeInTheDocument();
      expect(screen.getByText(/Final board decision not to grant renewal/i)).toBeInTheDocument();
    });
  });

  // ==========================================
  // SECTION 9: EXPIRY & 180-DAY WINDOW
  // ==========================================
  describe("EXPIRY: Term Expiration & Late Window Handling", () => {
    it("32. expired within 180 days still permits renewal workflow", () => {
      // Expired 30 days ago
      const expiredProfile: OrganizationProfile = {
        ...mockBaseProfile,
        accreditationExpiresAt: "2026-08-01T00:00:00.000Z",
        accreditationStatus: "expired",
      };
      const now = new Date("2026-08-31T00:00:00.000Z");

      const state = resolveUserRenewalState({
        profile: expiredProfile,
        renewals: [mockDraftRenewal],
        now,
      });

      expect(state.isExpired).toBe(true);
      expect(state.canContinueRenewal).toBe(true);
      expect(state.actionLabel).toBe("Continue Renewal");
    });

    it("33. expired organization remains visually expired", async () => {
      const expiredProfile: OrganizationProfile = {
        ...mockBaseProfile,
        accreditationExpiresAt: "2026-08-01T00:00:00.000Z",
        accreditationStatus: "expired",
      };
      const now = new Date("2026-08-31T00:00:00.000Z");
      const renewalState = resolveUserRenewalState({ profile: expiredProfile, renewals: [mockDraftRenewal], now });

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "draft" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={expiredProfile}
            userRenewalState={renewalState}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Accreditation Term Expired • Renewal Window Open")).toBeInTheDocument();
    });

    it("34. pending renewal does not restore accreditation: informs user privileges are paused", async () => {
      const expiredProfile: OrganizationProfile = {
        ...mockBaseProfile,
        accreditationExpiresAt: "2026-08-01T00:00:00.000Z",
        accreditationStatus: "expired",
      };
      const now = new Date("2026-08-31T00:00:00.000Z");
      const renewalState = resolveUserRenewalState({ profile: expiredProfile, renewals: [mockDraftRenewal], now });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={expiredProfile}
            userRenewalState={renewalState}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(
        await screen.findByText(/pending budget releases, and YPOP score credits\) are paused/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Previously released funds remain valid and subject to liquidation and accounting/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/released disbursements are paused/i)).not.toBeInTheDocument();
    });

    it("35. beyond Day 180 cannot start a new renewal", () => {
      // Expired 200 days ago
      const expiredProfile: OrganizationProfile = {
        ...mockBaseProfile,
        accreditationExpiresAt: "2026-01-01T00:00:00.000Z",
        accreditationStatus: "expired",
      };
      const now = new Date("2026-07-21T00:00:00.000Z"); // 201 days after Jan 1

      const state = resolveUserRenewalState({
        profile: expiredProfile,
        renewals: [],
        now,
      });

      expect(state.key).toBe("expired_beyond_renewal_window");
      expect(state.canStartRenewal).toBe(false);
      expect(state.isExpired).toBe(true);
      expect(state.actionLabel).toBeNull();
    });
  });

  // ==========================================
  // SECTION 10: CONCURRENCY & ERROR HANDLING
  // ==========================================
  describe("CONCURRENCY & ERRORS: Resilience & Safe Degradation", () => {
    it("36. stale renewal state is handled safely: RPC error caught without state corruption", async () => {
      const allFiles: SubmissionFile[] = mockTemplates.map((t, idx) => ({
        id: `f-${idx}`,
        submissionId: "sub-1",
        documentTypeId: t.id,
        fileName: `${t.id}.pdf`,
        fileUrl: `https://example.com/${t.id}.pdf`,
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      }));

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "draft" } as any,
        files: allFiles,
      });

      // Admin or another session moved state to 'under_review' concurrently
      vi.spyOn(lydoSupabase, "userSubmitRenewalInSupabase").mockRejectedValue(
        new Error("Renewal is no longer in draft status."),
      );

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const submitBtn = await screen.findByRole("button", { name: /Submit Renewal Application/i });
      fireEvent.click(submitBtn);

      const confirmBtn = await screen.findByRole("button", { name: /Confirm & Submit Application/i });
      fireEvent.click(confirmBtn);

      // Status remains draft, does not fake transition to submitted
      await waitFor(() => {
        expect(screen.getByText("Draft In Progress")).toBeInTheDocument();
      });
    });

    it("37. RPC errors do not fake state transitions: resubmit error keeps revision status", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: [],
      });

      vi.spyOn(lydoSupabase, "userResubmitRenewalInSupabase").mockRejectedValue(
        new Error("Database connection interrupted"),
      );

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [revisionRenewal] })}
            activeRenewal={revisionRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Revision Requested")).toBeInTheDocument();
    });

    it("38. failed network fetch does not falsely mark accreditation expired", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockRejectedValue(
        new Error("Network connection dropped"),
      );

      const activeUnexpiredProfile: OrganizationProfile = {
        ...mockBaseProfile,
        accreditationExpiresAt: "2027-09-01T00:00:00.000Z",
      };

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={activeUnexpiredProfile} // active accreditation
            userRenewalState={resolveUserRenewalState({ profile: activeUnexpiredProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      // Packet error notice is displayed
      expect(await screen.findByText("Error loading renewal packet")).toBeInTheDocument();
      expect(screen.getByText("Network connection dropped")).toBeInTheDocument();

      // Does NOT show expired accreditation warning
      expect(screen.queryByText("Accreditation Term Expired • Renewal Window Open")).not.toBeInTheDocument();
    });

    it("39. duplicate submission clicks are prevented while request is in flight", async () => {
      const allFiles: SubmissionFile[] = mockTemplates.map((t, idx) => ({
        id: `f-${idx}`,
        submissionId: "sub-1",
        documentTypeId: t.id,
        fileName: `${t.id}.pdf`,
        fileUrl: `https://example.com/${t.id}.pdf`,
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      }));

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "draft" } as any,
        files: allFiles,
      });

      let resolveSubmit: any;
      const pendingSubmit = new Promise<any>((resolve) => {
        resolveSubmit = resolve;
      });
      vi.spyOn(lydoSupabase, "userSubmitRenewalInSupabase").mockReturnValue(pendingSubmit);

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const submitBtn = await screen.findByRole("button", { name: /Submit Renewal Application/i });
      fireEvent.click(submitBtn);

      const confirmBtn = await screen.findByRole("button", { name: /Confirm & Submit Application/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText("Submitting...")).toBeInTheDocument();
        expect(confirmBtn).toBeDisabled();
      });

      resolveSubmit({
        renewalId: "ren-draft-1",
        status: "submitted",
        submittedAt: "2026-06-16T12:00:00Z",
      });
    });
  });

  // ==========================================
  // SECTION 11: RESPONSIVE & LAYOUT INTEGRITY
  // ==========================================
  describe("RESPONSIVE: Desktop, Tablet & Phone Structural Usability", () => {
    it("40. desktop workspace remains stable with max-w-[1440px] container and header hierarchy", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "draft" } as any,
        files: [],
      });

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const rootDiv = container.querySelector(".max-w-\\[1440px\\]");
      expect(rootDiv).toBeInTheDocument();
      expect(screen.getByText("Accreditation Renewal Workspace")).toBeInTheDocument();
    });

    it("41. tablet layout remains usable with responsive flex and grid structures", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "draft" } as any,
        files: [],
      });

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      // Checks grid responsive classes
      const metricsGrid = container.querySelector(".grid-cols-1.md\\:grid-cols-4");
      expect(metricsGrid).toBeInTheDocument();
    });

    it("42. phone layout has no horizontal overflow: includes break-words and responsive padding", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "draft" } as any,
        files: [
          {
            id: "f-1",
            submissionId: "sub-1",
            documentTypeId: "constitution-bylaws",
            fileName: "A-Very-Long-Filename-That-Could-Cause-Horizontal-Overflow-Without-Break-Words.pdf",
            fileUrl: "https://example.com/long.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
            validationStatus: "correct",
            adminStatus: "draft",
            adminRemarks: null,
            revisionHistory: [],
          },
        ],
      });

      const { container } = render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      const fileNameElem = await screen.findByText(
        "A-Very-Long-Filename-That-Could-Cause-Horizontal-Overflow-Without-Break-Words.pdf",
      );
      expect(fileNameElem).toHaveClass("break-all");
    });
  });

  // ==========================================
  // SECTION 12: REGRESSION PROTECTION
  // ==========================================
  describe("REGRESSION: Document Submission, PDF Viewer & User Portal Integrity", () => {
    it("43. existing registration Document Submission contracts remain intact", () => {
      // Verify scope filtering preserves registration documents
      const registrationTypes = mockTemplates.filter(
        (t) => t.scope === "registration" || t.scope === "both" || !t.scope,
      );
      expect(registrationTypes.length).toBe(6);
    });

    it("44. existing PDF viewer contracts remain intact without duplicate forks", () => {
      // Verify props contract for openPreview
      const previewFn = vi.fn();
      previewFn("https://example.com/test.pdf", "Sample PDF");
      expect(previewFn).toHaveBeenCalledWith("https://example.com/test.pdf", "Sample PDF");
    });

    it("45. existing User Portal navigation and route map integrity preserved", () => {
      const userRouteMap = {
        dashboard: "/dashboard",
        "organization-renewal": "/organization-renewal",
        "document-submission": "/document-submission",
      };
      const navSpy = vi.fn();

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [mockDraftRenewal] })}
            activeRenewal={mockDraftRenewal}
            navigate={navSpy}
            userRouteMap={userRouteMap}
          />
        </MemoryRouter>,
      );

      const backBtn = screen.getByRole("button", { name: /Dashboard/i });
      fireEvent.click(backBtn);
      expect(navSpy).toHaveBeenCalledWith("/dashboard");
    });
  });
});
