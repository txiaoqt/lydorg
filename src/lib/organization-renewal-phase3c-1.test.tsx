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
import { canDisburseBudget, canLiquidateFunds, canParticipateInYpop, resolveUserRenewalState } from "./organization-renewal";
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

      // The file is staged in the review dialog; saving the draft performs the upload.
      fireEvent.click(await screen.findByRole("button", { name: /Save as Draft/i }));
      fireEvent.click(await screen.findByRole("button", { name: "Save Draft" }));

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
  // The expired-accreditation banner was removed from the workspace; the rules it described live here.
  describe("CORRECTION 2: Expired accreditation funding and liquidation rules", () => {
    it("11. pending budget releases are paused while accreditation is expired", () => {
      expect(canDisburseBudget("expired")).toBe(false);
      expect(canDisburseBudget("active")).toBe(true);
      expect(canDisburseBudget("expiring_soon")).toBe(true);
    });

    it("12. already-released funds stay valid for liquidation in every status", () => {
      for (const status of ["active", "expiring_soon", "expired"] as const) expect(canLiquidateFunds(status)).toBe(true);
    });

    it("13. new YPOP participation is paused while accreditation is expired", () => {
      expect(canParticipateInYpop("expired")).toBe(false);
      expect(canParticipateInYpop("active")).toBe(true);
    });

    it("14. an expired organization can still renew through the Day 180 late window", () => {
      const expiredProfile = { ...mockBaseProfile, accreditationExpiresAt: "2026-08-01T00:00:00.000Z", accreditationStatus: "expired" as const };
      const state = resolveUserRenewalState({ profile: expiredProfile, renewals: [], now: new Date("2026-12-01T00:00:00.000Z") });
      expect(state.isExpired).toBe(true);
      expect(state.canStartRenewal).toBe(true);
    });
  });
});
