import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

// Covers the current renewal workspace: requirement cards, the shared upload dialog
// (row upload, bulk upload, save draft, submit), and which documents stay locked.

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

const pdf = (name: string) => new File(["%PDF-1.4 test"], name, { type: "application/pdf" });

const fileFor = (documentTypeId: string, adminStatus: SubmissionFile["adminStatus"], extra: Partial<SubmissionFile> = {}): SubmissionFile => ({
  id: `f-${documentTypeId}`,
  submissionId: "sub-1",
  documentTypeId,
  fileName: `${documentTypeId}.pdf`,
  fileUrl: `storage://renewals/${documentTypeId}.pdf`,
  fileType: "application/pdf",
  fileSize: 2048,
  validationStatus: "correct",
  adminStatus,
  adminRemarks: "",
  uploadedAt: "2026-06-16T00:00:00.000Z",
  ...extra,
} as SubmissionFile);

const mockPacket = (renewal: OrganizationRenewalRecord, files: SubmissionFile[]) =>
  vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
    submission: { id: "sub-1", organizationId: "org-test-1", renewalId: renewal.id, status: renewal.status } as any,
    files,
  });

const renderWorkspace = (
  renewal: OrganizationRenewalRecord,
  props: Partial<React.ComponentProps<typeof UserPortalRenewalWorkspaceView>> = {},
) => render(
  <MemoryRouter>
    <UserPortalRenewalWorkspaceView
      currentProfile={mockBaseProfile}
      userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [renewal] })}
      activeRenewal={renewal}
      navigate={vi.fn()}
      userRouteMap={{ dashboard: "/dashboard", renewals: "/renewals" }}
      {...props}
    />
  </MemoryRouter>,
);

const withStatus = (status: OrganizationRenewalRecord["status"], extra: Record<string, unknown> = {}): OrganizationRenewalRecord =>
  ({ ...mockDraftRenewal, id: `ren-${status}`, status, ...extra }) as OrganizationRenewalRecord;

const openRevision = { revisionDueAt: "2099-01-01T00:00:00.000Z" };

/** Stages a PDF through the bulk dialog; the file name maps it to the matching requirement. */
const stageInBulkDialog = async (fileName: string) => {
  fireEvent.click(await screen.findByRole("button", { name: /Upload Multiple Documents/i }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Browse renewal PDF files"), { target: { files: [pdf(fileName)] } });
  await within(dialog).findByText(/Mapped to:/);
  return dialog;
};

const confirmIn = async (dialog: HTMLElement, action: RegExp, confirmLabel: string) => {
  fireEvent.click(within(dialog).getByRole("button", { name: action }));
  fireEvent.click(await screen.findByRole("button", { name: confirmLabel }));
};

describe("Renewal workspace (current UI)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(lydoSupabase, "fetchRenewalRequiredDocumentTypesInSupabase").mockResolvedValue(mockTemplates);
    vi.spyOn(lydoSupabase, "subscribeToRenewalSubmissionFileChangesInSupabase").mockReturnValue(() => undefined);
  });

  describe("Workspace overview", () => {
    it("shows the cycle, organization and requirement heading", async () => {
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal);
      expect(await screen.findByText("Renewal Workspace")).toBeInTheDocument();
      expect(screen.getByText(/Y-TRACE Cycle 2/i)).toBeInTheDocument();
      expect(screen.getByText("Pasig Youth Movement")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Renewal Requirements" })).toBeInTheDocument();
    });

    it("lists all six required documents", async () => {
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal);
      for (const template of mockTemplates) expect(await screen.findByText(template.name)).toBeInTheDocument();
    });

    it("summarizes approval progress", async () => {
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal);
      expect(await screen.findByText("0 of 6 Documents Approved (0%)")).toBeInTheDocument();
      expect(screen.getByText(/Upload the remaining 6 required documents/i)).toBeInTheDocument();
    });

    it("marks every missing file as Not Uploaded", async () => {
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal);
      // Each card renders the badge twice: desktop and phone layouts.
      expect(await screen.findAllByText("Not Uploaded")).toHaveLength(12);
    });

    it("shows a load error instead of guessing the packet state", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockRejectedValue(new Error("Network unavailable"));
      renderWorkspace(mockDraftRenewal);
      expect(await screen.findByText("Error loading renewal documents")).toBeInTheDocument();
      expect(screen.getByText("Network unavailable")).toBeInTheDocument();
    });
  });

  describe("Draft uploads", () => {
    it("offers an Upload Document action for each missing file", async () => {
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal);
      expect(await screen.findAllByRole("button", { name: /Upload Document/i })).toHaveLength(6);
    });

    it("rejects a non-PDF file without uploading it", async () => {
      mockPacket(mockDraftRenewal, []);
      const uploadSpy = vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase");
      const { container } = renderWorkspace(mockDraftRenewal);
      fireEvent.click((await screen.findAllByRole("button", { name: /Upload Document/i }))[0]);
      const input = container.querySelector('input[aria-label="Upload document file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(["x"], "avatar.png", { type: "image/png" })] } });
      expect(await screen.findByText("Only PDF files can be uploaded for this renewal submission.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeDisabled();
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it("stages a row upload in the review dialog and saves it only after confirmation", async () => {
      mockPacket(mockDraftRenewal, []);
      const uploadSpy = vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase")
        .mockResolvedValue(fileFor("constitution-bylaws", "draft", { fileName: "CBL-2026.pdf" }));
      const { container } = renderWorkspace(mockDraftRenewal);
      fireEvent.click((await screen.findAllByRole("button", { name: /Upload Document/i }))[0]);
      const input = container.querySelector('input[aria-label="Upload document file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [pdf("CBL-2026.pdf")] } });

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText(/Mapped to: Constitution and By-Laws/)).toBeInTheDocument();
      expect(uploadSpy).not.toHaveBeenCalled();

      await confirmIn(dialog, /Save as Draft/i, "Save Draft");
      await waitFor(() => expect(uploadSpy).toHaveBeenCalledWith(expect.objectContaining({
        renewalId: mockDraftRenewal.id, submissionId: "sub-1", documentTypeId: "constitution-bylaws",
      })));
      expect((await screen.findAllByText("Draft Saved")).length).toBeGreaterThan(0);
    });

    it("keeps the dialog open with the error when an upload fails", async () => {
      mockPacket(mockDraftRenewal, []);
      vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase").mockRejectedValue(new Error("Storage quota exceeded"));
      renderWorkspace(mockDraftRenewal);
      const dialog = await stageInBulkDialog("Constitution and By-Laws.pdf");
      await confirmIn(dialog, /Save as Draft/i, "Save Draft");
      expect(await within(dialog).findByText("Storage quota exceeded")).toBeInTheDocument();
      expect(screen.getByText("Renewal Workspace")).toBeInTheDocument();
    });
  });

  describe("Previews", () => {
    it("View Template opens the shared template viewer", async () => {
      const openPreview = vi.fn();
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal, { openPreview });
      fireEvent.click((await screen.findAllByRole("button", { name: /View Template/i }))[0]);
      expect(openPreview).toHaveBeenCalledWith("https://example.com/cbl-template.pdf", "Constitution and By-Laws (Template)");
    });

    it("View Attached opens the organization's uploaded file, not the template", async () => {
      const openPreview = vi.fn();
      const resolveSpy = vi.spyOn(lydoSupabase, "resolveSupabaseFileUrl").mockResolvedValue("https://signed.example.com/cbl.pdf");
      mockPacket(mockDraftRenewal, [fileFor("constitution-bylaws", "draft")]);
      renderWorkspace(mockDraftRenewal, { openPreview });
      fireEvent.click(await screen.findByRole("button", { name: /View Attached/i }));
      await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith("storage://renewals/constitution-bylaws.pdf"));
      expect(openPreview).not.toHaveBeenCalled();
    });
  });

  describe("Submitting a draft", () => {
    it("cannot submit until a file is staged", async () => {
      mockPacket(mockDraftRenewal, []);
      renderWorkspace(mockDraftRenewal);
      fireEvent.click(await screen.findByRole("button", { name: /Upload Multiple Documents/i }));
      expect(await screen.findByText("No files uploaded yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Submit Selected for Review/i })).toBeDisabled();
    });

    it("asks for confirmation, uploads, then submits the renewal", async () => {
      mockPacket(mockDraftRenewal, []);
      const onRenewalUpdated = vi.fn();
      const uploadSpy = vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase")
        .mockResolvedValue(fileFor("constitution-bylaws", "draft"));
      const submitSpy = vi.spyOn(lydoSupabase, "userSubmitRenewalInSupabase")
        .mockResolvedValue({ submittedAt: "2026-06-20T00:00:00.000Z" } as any);
      renderWorkspace(mockDraftRenewal, { onRenewalUpdated });
      const dialog = await stageInBulkDialog("Constitution and By-Laws.pdf");

      fireEvent.click(within(dialog).getByRole("button", { name: /Submit Selected for Review/i }));
      expect(await screen.findByText("Submit 1 selected document for admin review?")).toBeInTheDocument();
      expect(uploadSpy).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Submit for Review" }));
      await waitFor(() => expect(submitSpy).toHaveBeenCalledWith(mockDraftRenewal.id));
      expect(uploadSpy).toHaveBeenCalledTimes(1);
      expect(onRenewalUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "submitted" }));
    });

    it("does not report a submission when the submit request fails", async () => {
      mockPacket(mockDraftRenewal, []);
      const onRenewalUpdated = vi.fn();
      vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase").mockResolvedValue(fileFor("constitution-bylaws", "draft"));
      const submitSpy = vi.spyOn(lydoSupabase, "userSubmitRenewalInSupabase").mockRejectedValue(new Error("Renewal is no longer a draft"));
      renderWorkspace(mockDraftRenewal, { onRenewalUpdated });
      const dialog = await stageInBulkDialog("Constitution and By-Laws.pdf");
      await confirmIn(dialog, /Submit Selected for Review/i, "Submit for Review");
      await waitFor(() => expect(submitSpy).toHaveBeenCalled());
      expect(onRenewalUpdated).not.toHaveBeenCalledWith(expect.objectContaining({ status: "submitted" }));
    });
  });

  describe("Locked documents", () => {
    it("approved files are locked and offer no replace action", async () => {
      const renewal = withStatus("under_review");
      mockPacket(renewal, [fileFor("constitution-bylaws", "approved_green")]);
      renderWorkspace(renewal);
      expect(await screen.findByText("Locked from modification")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Replace$/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("files under review show Awaiting Review and cannot be re-uploaded", async () => {
      const renewal = withStatus("submitted");
      mockPacket(renewal, mockTemplates.map((template) => fileFor(template.id, "submitted")));
      renderWorkspace(renewal);
      expect(await screen.findAllByText("Awaiting Review")).toHaveLength(6);
      expect(screen.queryByRole("button", { name: /^Replace$/ })).not.toBeInTheDocument();
      // Every requirement is already with PCYDO, so nothing is left to upload.
      expect(screen.getByRole("button", { name: /Upload Multiple Documents/i })).toBeDisabled();
    });

    it("an approved renewal accepts no further uploads", async () => {
      const renewal = withStatus("approved");
      mockPacket(renewal, mockTemplates.map((template) => fileFor(template.id, "approved_green")));
      renderWorkspace(renewal);
      expect(await screen.findByText("6 of 6 Documents Approved (100%)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Upload Multiple Documents/i })).toBeDisabled();
    });

    it("a rejected renewal offers no way to start over from this page", async () => {
      const renewal = withStatus("rejected", { adminRemarks: "Rejected" });
      mockPacket(renewal, []);
      renderWorkspace(renewal);
      await screen.findByText("Renewal Workspace");
      expect(screen.queryByRole("button", { name: /Start Renewal/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Upload Multiple Documents/i })).toBeDisabled();
    });
  });

  describe("Revisions", () => {
    const flagged = (documentTypeId: string, adminRemarks: string) =>
      fileFor(documentTypeId, "needs_revision", { adminRemarks, ...openRevision });

    it("shows the admin feedback for each flagged file", async () => {
      const renewal = withStatus("needs_revision", openRevision);
      mockPacket(renewal, [flagged("constitution-bylaws", "Missing signatures on page 4")]);
      renderWorkspace(renewal);
      expect(await screen.findByText("Action required: revise your renewal documents")).toBeInTheDocument();
      expect(screen.getByText("Missing signatures on page 4")).toBeInTheDocument();
      expect(screen.getAllByText("Revision Requested").length).toBeGreaterThan(0);
    });

    it("replaces the flagged file and resubmits once every flagged file is corrected", async () => {
      const renewal = withStatus("needs_revision", openRevision);
      mockPacket(renewal, [flagged("constitution-bylaws", "Re-sign page 4")]);
      const onRenewalUpdated = vi.fn();
      const replaceSpy = vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase")
        .mockResolvedValue(fileFor("constitution-bylaws", "submitted"));
      const resubmitSpy = vi.spyOn(lydoSupabase, "userResubmitRenewalInSupabase")
        .mockResolvedValue({ resubmittedAt: "2026-06-21T00:00:00.000Z" } as any);
      renderWorkspace(renewal, { onRenewalUpdated });
      const dialog = await stageInBulkDialog("Constitution and By-Laws.pdf");

      await confirmIn(dialog, /Submit Selected for Review/i, "Submit Corrections");
      await waitFor(() => expect(resubmitSpy).toHaveBeenCalledWith(renewal.id, "sub-1"));
      expect(replaceSpy).toHaveBeenCalledWith(expect.objectContaining({
        fileId: "f-constitution-bylaws", documentTypeId: "constitution-bylaws", submitForReview: true,
      }));
      expect(onRenewalUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "resubmitted" }));
    });

    it("cannot resubmit while another flagged file is still uncorrected", async () => {
      const renewal = withStatus("needs_revision", openRevision);
      mockPacket(renewal, [flagged("constitution-bylaws", "Re-sign"), flagged("yorp-form-b", "Wrong form")]);
      renderWorkspace(renewal);
      const dialog = await stageInBulkDialog("Constitution and By-Laws.pdf");
      expect(within(dialog).getByRole("button", { name: /Submit Selected for Review/i })).toBeDisabled();
      expect(within(dialog).getByText("Replace every document marked for revision before resubmitting.")).toBeInTheDocument();
    });

    it("does not mark the renewal resubmitted when resubmission fails", async () => {
      const renewal = withStatus("needs_revision", openRevision);
      mockPacket(renewal, [flagged("constitution-bylaws", "Re-sign")]);
      const onRenewalUpdated = vi.fn();
      vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase").mockResolvedValue(fileFor("constitution-bylaws", "submitted"));
      const resubmitSpy = vi.spyOn(lydoSupabase, "userResubmitRenewalInSupabase").mockRejectedValue(new Error("Stale renewal state"));
      renderWorkspace(renewal, { onRenewalUpdated });
      const dialog = await stageInBulkDialog("Constitution and By-Laws.pdf");
      await confirmIn(dialog, /Submit Selected for Review/i, "Submit Corrections");
      await waitFor(() => expect(resubmitSpy).toHaveBeenCalled());
      expect(onRenewalUpdated).not.toHaveBeenCalledWith(expect.objectContaining({ status: "resubmitted" }));
    });

    it("a revision-locked renewal accepts no uploads", async () => {
      const locked = { revisionLocked: true, revisionDueAt: "2020-01-01T00:00:00.000Z" };
      const renewal = withStatus("needs_revision", locked);
      mockPacket(renewal, [fileFor("constitution-bylaws", "needs_revision", locked)]);
      renderWorkspace(renewal);
      await screen.findByText("Action required: revise your renewal documents");
      expect(screen.getByRole("button", { name: /Upload Multiple Documents/i })).toBeDisabled();
    });
  });

  describe("Expiry rules", () => {
    it("an organization expired within 180 days can still continue its renewal", () => {
      const expiredProfile: OrganizationProfile = { ...mockBaseProfile, accreditationExpiresAt: "2026-08-01T00:00:00.000Z", accreditationStatus: "expired" };
      const state = resolveUserRenewalState({ profile: expiredProfile, renewals: [mockDraftRenewal], now: new Date("2026-08-31T00:00:00.000Z") });
      expect(state.isExpired).toBe(true);
      expect(state.canContinueRenewal).toBe(true);
      expect(state.actionLabel).toBe("Continue Renewal");
    });

    it("beyond Day 180 a new renewal cannot be started", () => {
      const expiredProfile: OrganizationProfile = { ...mockBaseProfile, accreditationExpiresAt: "2026-01-01T00:00:00.000Z", accreditationStatus: "expired" };
      const state = resolveUserRenewalState({ profile: expiredProfile, renewals: [], now: new Date("2026-07-21T00:00:00.000Z") });
      expect(state.key).toBe("expired_beyond_renewal_window");
      expect(state.canStartRenewal).toBe(false);
      expect(state.actionLabel).toBeNull();
    });
  });
});
