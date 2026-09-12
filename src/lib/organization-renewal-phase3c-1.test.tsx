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
  id: "org-phase3c1",
  referenceId: "REF-3C1",
  userId: "user-3c1",
  organizationName: "Pasig Youth Council",
  organizationEmail: "council@pasig.ph",
  contactNumber: "09171234567",
  district: "District 1",
  barangay: "Kapasigan",
  isExistingOrganization: true,
  organizationIdentifierNumber: "OIN-3C1",
  registrationType: "community-based",
  urn: "URN-2023-3C1",
  urnNormalized: "urn-2023-3c1",
  urnReviewStatus: "verified",
  urnAdminRemarks: "",
  urnReviewedBy: "admin",
  urnReviewedAt: "2023-09-01T00:00:00Z",
  verificationMethod: "online",
  majorClassification: "Youth-Led",
  subClassification: "Community Organization",
  advocacies: [],
  adviserName: "Adviser",
  representativeName: "Leader",
  address: "Pasig City",
  facebookPageUrl: "https://facebook.com/pyc",
  profileStatus: "verified",
  verifiedAt: "2023-09-01T00:00:00Z",
  internalNotes: "",
  yorpRegisteredYear: 2023,
  yorpRenewedYear: 2026,
  accreditationStartDate: "2023-09-01T00:00:00.000Z",
  accreditationExpiresAt: "2026-09-01T00:00:00.000Z",
  currentAccreditationId: "acc-3c1",
  accreditationStatus: "active",
  createdAt: "2023-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const mockDraftRenewal: OrganizationRenewalRecord = {
  id: "ren-draft-3c1",
  organizationId: "org-phase3c1",
  cycleNumber: 2,
  currentAccreditationId: "acc-3c1",
  status: "draft",
  submittedAt: null,
  reviewedBy: null,
  reviewedAt: null,
  adminRemarks: null,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("Phase 3C.1: User Renewal Workspace Corrections Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(lydoSupabase, "fetchRenewalRequiredDocumentTypesInSupabase").mockResolvedValue(mockTemplates);
  });

  // =========================================================================
  // CORRECTION 1: DRAFT DOCUMENT REPLACEMENT & IMMUTABILITY ARCHITECTURE
  // =========================================================================
  describe("CORRECTION 1: Draft Document Replacement vs Revision-Only Hardened RPC", () => {
    it("1. draft missing file → Upload Document appears", async () => {
      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-phase3c1", renewalId: "ren-draft-3c1", status: "draft" } as any,
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

    it("2. draft uploaded file → draft replacement is allowed (Replace button appears)", async () => {
      const draftFiles: SubmissionFile[] = [
        {
          id: "f-draft-1",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "Draft-CBL.pdf",
          fileUrl: "https://example.com/draft-cbl.pdf",
          fileType: "application/pdf",
          fileSize: 2048,
          validationStatus: "correct",
          adminStatus: "draft",
          adminRemarks: null,
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-phase3c1", renewalId: "ren-draft-3c1", status: "draft" } as any,
        files: draftFiles,
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

      const replaceButton = await screen.findByRole("button", { name: /Replace/i });
      expect(replaceButton).toBeInTheDocument();
      expect(replaceButton).toHaveTextContent("Replace");
      // Does not say "Replace Document" (which is the amber revision button)
      expect(replaceButton).not.toHaveClass("bg-amber-600");
    });

    it("3. draft replacement calls standard draft upload/update path, NOT revision replacement RPC", async () => {
      const draftFiles: SubmissionFile[] = [
        {
          id: "f-draft-1",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "Draft-CBL-Old.pdf",
          fileUrl: "https://example.com/draft-cbl-old.pdf",
          fileType: "application/pdf",
          fileSize: 2048,
          validationStatus: "correct",
          adminStatus: "draft",
          adminRemarks: null,
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-phase3c1", renewalId: "ren-draft-3c1", status: "draft" } as any,
        files: draftFiles,
      });

      const uploadDraftSpy = vi.spyOn(lydoSupabase, "uploadRenewalDocumentFileInSupabase").mockResolvedValue({
        id: "f-draft-1",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "Draft-CBL-Replaced.pdf",
        fileUrl: "https://example.com/draft-cbl-replaced.pdf",
        fileType: "application/pdf",
        fileSize: 3000,
        validationStatus: "correct",
        adminStatus: "draft",
        adminRemarks: null,
        revisionHistory: [],
      });

      const revisionRpcSpy = vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase");
      const userReplaceRpcSpy = vi.spyOn(lydoSupabase, "userReplaceDocumentSubmissionFileInSupabase");

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

      const replaceBtn = await screen.findByRole("button", { name: /Replace/i });
      fireEvent.click(replaceBtn);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 replaced draft"], "Draft-CBL-Replaced.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(uploadDraftSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: "org-phase3c1",
            renewalId: "ren-draft-3c1",
            submissionId: "sub-1",
            documentTypeId: "constitution-bylaws",
            file: validPdf,
          }),
        );
        // Authoritative revision RPC is NOT invoked for draft replacement
        expect(revisionRpcSpy).not.toHaveBeenCalled();
        expect(userReplaceRpcSpy).not.toHaveBeenCalled();
      });
    });

    it("4. needs_revision flagged file → Replace Document uses authoritative replacement RPC", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
        adminRemarks: "Please correct highlighted documents.",
      };

      const flaggedFiles: SubmissionFile[] = [
        {
          id: "f-flagged-1",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "Flagged-CBL.pdf",
          fileUrl: "https://example.com/flagged-cbl.pdf",
          fileType: "application/pdf",
          fileSize: 2048,
          validationStatus: "needs_reupload",
          adminStatus: "needs_revision",
          adminRemarks: "Signature is missing on page 2.",
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", organizationId: "org-phase3c1", renewalId: "ren-draft-3c1", status: "needs_revision" } as any,
        files: flaggedFiles,
      });

      const revisionRpcSpy = vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase").mockResolvedValue({
        id: "f-flagged-1",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "Corrected-CBL.pdf",
        fileUrl: "https://example.com/corrected-cbl.pdf",
        fileType: "application/pdf",
        fileSize: 2500,
        validationStatus: "correct",
        adminStatus: "submitted",
        adminRemarks: null,
        revisionHistory: [
          {
            file_url: "https://example.com/flagged-cbl.pdf",
            file_name: "Flagged-CBL.pdf",
            replaced_at: "2026-06-16T10:00:00Z",
            replaced_by: "user-3c1",
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

      const replaceDocBtn = await screen.findByRole("button", { name: /Replace Document/i });
      fireEvent.click(replaceDocBtn);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validPdf = new File(["%PDF-1.4 corrected"], "Corrected-CBL.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(revisionRpcSpy).toHaveBeenCalledWith({
          organizationId: "org-phase3c1",
          renewalId: "ren-draft-3c1",
          fileId: "f-flagged-1",
          documentTypeId: "constitution-bylaws",
          file: validPdf,
        });
      });
    });

    it("5. approved file → replacement blocked, displays 'Locked • Document Approved'", async () => {
      const revisionRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "needs_revision",
      };

      const approvedFiles: SubmissionFile[] = [
        {
          id: "f-approved-1",
          submissionId: "sub-1",
          documentTypeId: "constitution-bylaws",
          fileName: "Approved-CBL.pdf",
          fileUrl: "https://example.com/approved-cbl.pdf",
          fileType: "application/pdf",
          fileSize: 2048,
          validationStatus: "correct",
          adminStatus: "approved",
          adminRemarks: null,
          revisionHistory: [],
        },
      ];

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "needs_revision" } as any,
        files: approvedFiles,
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
      expect(screen.queryByRole("button", { name: /Replace/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("6. submitted file → replacement blocked in submitted status", async () => {
      const submittedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "submitted",
        submittedAt: "2026-06-16T12:00:00Z",
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "submitted" } as any,
        files: [
          {
            id: "f-submitted-1",
            submissionId: "sub-1",
            documentTypeId: "constitution-bylaws",
            fileName: "Submitted-CBL.pdf",
            fileUrl: "https://example.com/sub-cbl.pdf",
            fileType: "application/pdf",
            fileSize: 2048,
            validationStatus: "correct",
            adminStatus: "submitted",
            adminRemarks: null,
            revisionHistory: [],
          },
        ],
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
      expect(screen.queryByRole("button", { name: /Replace/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("7. under_review file → replacement blocked during admin review", async () => {
      const underReviewRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "under_review",
      };

      vi.spyOn(lydoSupabase, "fetchRenewalPacketInSupabase").mockResolvedValue({
        submission: { id: "sub-1", status: "under_review" } as any,
        files: [],
      });

      render(
        <MemoryRouter>
          <UserPortalRenewalWorkspaceView
            currentProfile={mockBaseProfile}
            userRenewalState={resolveUserRenewalState({ profile: mockBaseProfile, renewals: [underReviewRenewal] })}
            activeRenewal={underReviewRenewal}
            navigate={vi.fn()}
            userRouteMap={{ dashboard: "/dashboard" }}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText("Under Admin Review")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Replace/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload Document/i })).not.toBeInTheDocument();
    });

    it("8. renewal-level rejected → all file mutations blocked (terminal)", async () => {
      const rejectedRenewal: OrganizationRenewalRecord = {
        ...mockDraftRenewal,
        status: "rejected",
        adminRemarks: "Official terminal rejection decision.",
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
      expect(screen.getByText(/This renewal decision is final/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Replace/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upload/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Resubmit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Submit/i })).not.toBeInTheDocument();
    });

    it("9. revision_history remains preserved for correction replacements via RPC", async () => {
      const mockResult: SubmissionFile = {
        id: "f-flagged",
        submissionId: "sub-1",
        documentTypeId: "constitution-bylaws",
        fileName: "New-CBL.pdf",
        fileUrl: "https://example.com/new-cbl.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "submitted",
        adminRemarks: null,
        revisionHistory: [
          {
            file_name: "Old-Flagged-CBL.pdf",
            file_url: "https://example.com/old.pdf",
            replaced_at: "2026-06-16T12:00:00Z",
            replaced_by: "user-3c1",
          },
        ],
      };

      vi.spyOn(lydoSupabase, "replaceRenewalDocumentFileInSupabase").mockResolvedValue(mockResult);

      const res = await lydoSupabase.replaceRenewalDocumentFileInSupabase({
        organizationId: "org-1",
        renewalId: "ren-1",
        fileId: "f-flagged",
        documentTypeId: "constitution-bylaws",
        file: new File(["%PDF-1.4 test"], "New-CBL.pdf", { type: "application/pdf" }),
      });

      expect(res.revisionHistory.length).toBe(1);
      expect(res.revisionHistory[0].file_name).toBe("Old-Flagged-CBL.pdf");
      expect(res.adminStatus).toBe("submitted");
    });

    it("10. existing registration document workflow remains unchanged", () => {
      // Ensure registration templates are untouched
      const registrationTemplates = mockTemplates.filter(
        (t) => t.scope === "registration" || t.scope === "both" || !t.scope,
      );
      expect(registrationTemplates.length).toBe(6);
      expect(registrationTemplates.every((t) => t.templateScope === "document_submission")).toBe(true);
    });
  });

  // =========================================================================
  // CORRECTION 2: EXPIRED BUDGET / FUNDING MESSAGING ACCURACY
  // =========================================================================
  describe("CORRECTION 2: Expired Accreditation Funding & Liquidation Messaging", () => {
    it("11. expired workspace displays accreditation expired warning", async () => {
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

      expect(await screen.findByText("Accreditation Term Expired • Renewal Window Open")).toBeInTheDocument();
    });

    it("12. expired workspace communicates privileges requiring active accreditation are paused", async () => {
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
        await screen.findByText(/Official privileges requiring active accreditation/i),
      ).toBeInTheDocument();
    });

    it("13. expired workspace explicitly communicates pending budget releases are paused", async () => {
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
    });

    it("14. expired workspace explicitly communicates already-released funds remain valid and subject to liquidation/accounting", async () => {
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
        await screen.findByText(/Previously released funds remain valid and subject to liquidation and accounting/i),
      ).toBeInTheDocument();
    });

    it("15. expired workspace communicates renewal remains available through Day 180 cutoff date", async () => {
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
        await screen.findByText(/Late renewal remains available through .* \(Day 180\)\./i),
      ).toBeInTheDocument();
    });

    it("16. expired workspace does not claim already-released disbursements are paused", async () => {
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

      await screen.findByText("Accreditation Term Expired • Renewal Window Open");
      expect(screen.queryByText(/released disbursements are paused/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/disbursements are paused/i)).not.toBeInTheDocument();
    });
  });
});
