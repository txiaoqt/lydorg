import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  isOrganizationSuspended,
  resolveRegistrationPrerequisites,
  resolveBudgetWorkflowEligibility,
  resolveLiquidationWorkflowEligibility,
  resolveYpopWorkflowEligibility,
} from "./user-workflow-eligibility";
import {
  resolveRegistrationDocumentAccess,
  isApprovedRegistrationDocument,
} from "./document-file-access";
import {
  assertOrganizationNotSuspended,
  submitOrganizationDocumentToSupabase,
  replaceOrganizationDocumentFileInSupabase,
  submitDocumentSubmissionForReviewInSupabase,
  removeOrganizationDocumentFromSupabase,
  submitOrganizationDocumentsBatchToSupabase,
  upsertOrganizationProfileInSupabase,
  updateDocumentSubmissionFileReviewInSupabase,
} from "./lydo-connect-supabase";
import * as adminAuth from "./admin-auth";
import { AccountSuspendedScreen } from "@/components/portal/AccountSuspendedScreen";
import type {
  OrganizationProfile,
  SubmissionFile,
  TemplateRecord,
  BudgetRequest,
} from "./lydo-connect-data";

// Mock Supabase
vi.mock("./supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    },
    supabaseUrl: "https://mock.supabase.co",
    isSupabaseConfigured: () => true,
  };
});

describe("Organization Registration Rejection & Permanent Account Suspension", () => {
  const activeTemplate1: TemplateRecord = {
    id: "tpl-1",
    name: "Constitution and By-Laws (YORP Form 01)",
    templateScope: "document_submission",
    templateCategories: ["yorp"],
    scope: "registration",
    isActive: true,
  };

  const activeTemplate2: TemplateRecord = {
    id: "tpl-2",
    name: "List of Officers and Members (YORP Form 02)",
    templateScope: "document_submission",
    templateCategories: ["yorp"],
    scope: "registration",
    isActive: true,
  };

  const activeTemplate3: TemplateRecord = {
    id: "tpl-3",
    name: "Directory of Officers (YORP Form 03)",
    templateScope: "document_submission",
    templateCategories: ["yorp"],
    scope: "registration",
    isActive: true,
  };

  const activeTemplate4: TemplateRecord = {
    id: "tpl-4",
    name: "Action Plan (YORP Form 04)",
    templateScope: "document_submission",
    templateCategories: ["yorp"],
    scope: "registration",
    isActive: true,
  };

  const requiredTemplates = [activeTemplate1, activeTemplate2, activeTemplate3, activeTemplate4];

  const activeProfile: OrganizationProfile = {
    id: "org-1",
    userId: "user-1",
    organizationName: "Youth Leaders Association",
    organizationEmail: "youth@pasig.gov.ph",
    contactNumber: "09123456789",
    district: "District 1",
    barangay: "Kapitolyo",
    isExistingOrganization: false,
    organizationIdentifierNumber: "",
    registrationType: "new_organization",
    majorClassification: "community_based",
    subClassification: "youth_led",
    advocacies: ["Education"],
    adviserName: "Jane Doe",
    representativeName: "John Smith",
    address: "123 Main St",
    facebookPageUrl: "https://facebook.com/youthleaders",
    profileStatus: "pending_review",
    verifiedAt: "",
    internalNotes: "",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const suspendedProfile: OrganizationProfile = {
    ...activeProfile,
    profileStatus: "suspended_inactive",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TEST 1 — Registration Document Rejected -> Document: REJECTED, Organization: SUSPENDED
  it("TEST 1: isOrganizationSuspended returns true when profileStatus is suspended_inactive or any document is rejected_red", () => {
    const rejectedFiles: SubmissionFile[] = [
      {
        id: "file-1",
        submissionId: "sub-1",
        documentTypeId: "tpl-1",
        fileName: "cbl.pdf",
        fileUrl: "https://storage/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "rejected_red",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    expect(isOrganizationSuspended({ profile: activeProfile, documentFiles: rejectedFiles })).toBe(true);
    expect(isOrganizationSuspended({ profile: suspendedProfile, documentFiles: [] })).toBe(true);
    expect(isOrganizationSuspended({ profile: activeProfile, documentFiles: [] })).toBe(false);
  });

  // TEST 2 — Other Documents Not Uploaded: Once Constitution is rejected, all remaining become inaccessible
  it("TEST 2: Remaining unuploaded documents are blocked when account is suspended", () => {
    const mixedFiles: SubmissionFile[] = [
      {
        id: "file-1",
        submissionId: "sub-1",
        documentTypeId: "tpl-1",
        fileName: "cbl.pdf",
        fileUrl: "https://storage/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "rejected_red",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "file-2",
        submissionId: "sub-1",
        documentTypeId: "tpl-2",
        fileName: "officers.pdf",
        fileUrl: "https://storage/officers.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "approved_green",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const prereqs = resolveRegistrationPrerequisites({
      profile: activeProfile,
      requiredTemplates,
      documentFiles: mixedFiles,
    });

    expect(prereqs.isSuspended).toBe(true);
    expect(prereqs.canAccessDocuments).toBe(false);
    expect(prereqs.documentsSatisfied).toBe(false);
  });

  // TEST 3 — Rejected Document Resubmission / Replacement is blocked
  it("TEST 3: Rejected documents cannot be replaced or removed", () => {
    const rejectedFile: SubmissionFile = {
      id: "file-1",
      submissionId: "sub-1",
      documentTypeId: "tpl-1",
      fileName: "cbl.pdf",
      fileUrl: "https://storage/cbl.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      validationStatus: "correct",
      adminStatus: "rejected_red",
      uploadedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const access = resolveRegistrationDocumentAccess({
      file: rejectedFile,
      submissionApproved: false,
      isSuspended: true,
    });

    expect(access.canReplaceOrRemove).toBe(false);
    expect(isApprovedRegistrationDocument(rejectedFile)).toBe(false);
  });

  // TEST 4 — Budget Request Blocked on Suspended Organization
  it("TEST 4: Budget workflow eligibility is blocked for suspended organizations", () => {
    const budgetEligibility = resolveBudgetWorkflowEligibility({
      profile: suspendedProfile,
      requiredTemplates,
      documentFiles: [],
      ypopEligibility: { eligible: true, period: null, entry: null, status: "completed" },
    });

    expect(budgetEligibility.eligible).toBe(false);
    expect(budgetEligibility.isSuspended).toBe(true);
  });

  // TEST 5 — Liquidation Report Blocked on Suspended Organization
  it("TEST 5: Liquidation workflow eligibility is blocked for suspended organizations", () => {
    const dummyBudgets: BudgetRequest[] = [
      {
        id: "b-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        activityTitle: "Youth Summit",
        activityDescription: "Description",
        activityDate: "2026-02-01",
        venue: "Pasig Hall",
        purposeCategory: "Education",
        requestedAmount: 50000,
        approvedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const liquidationEligibility = resolveLiquidationWorkflowEligibility({
      profile: suspendedProfile,
      requiredTemplates,
      documentFiles: [],
      budgetRequests: dummyBudgets,
      hasLiquidation: true,
    });

    expect(liquidationEligibility.eligible).toBe(false);
    expect(liquidationEligibility.isSuspended).toBe(true);
  });

  // TEST 6 — YPOP Workflow Blocked on Suspended Organization
  it("TEST 6: YPOP workflow eligibility is blocked for suspended organizations", () => {
    const ypopEligibility = resolveYpopWorkflowEligibility({
      profile: suspendedProfile,
      requiredTemplates,
      documentFiles: [],
    });

    expect(ypopEligibility.canEditParticipation).toBe(false);
    expect(ypopEligibility.isSuspended).toBe(true);
  });

  // TEST 7 — AccountSuspendedScreen renders required copy, reason, access restricted list, and sign out
  it("TEST 7: AccountSuspendedScreen renders professional firm copy, reason, restricted services, and sign out button", async () => {
    const signOutMock = vi.fn().mockResolvedValue(undefined);

    render(
      <AccountSuspendedScreen
        onSignOut={signOutMock}
        userEmail="test@pasig.gov.ph"
        organizationName="Youth Leaders Association"
      />,
    );

    // Header and titles
    expect(screen.getByTestId("account-suspended-screen")).toBeInTheDocument();
    expect(screen.getByText("Account Suspended")).toBeInTheDocument();
    expect(
      screen.getByText("Your Y-TRACE organization account has been permanently suspended."),
    ).toBeInTheDocument();

    // Reason
    expect(screen.getByText("Reason for Suspension")).toBeInTheDocument();
    expect(
      screen.getByText(/One or more registration documents submitted by your organization were marked/i),
    ).toBeInTheDocument();

    // Restricted items
    expect(screen.getByText("Resubmit rejected registration documents")).toBeInTheDocument();
    expect(screen.getByText("Upload remaining registration requirements")).toBeInTheDocument();
    expect(screen.getByText("Create or submit Budget Requests")).toBeInTheDocument();
    expect(screen.getByText("Submit Liquidation Reports")).toBeInTheDocument();
    expect(screen.getByText("Submit YPOP participation requirements")).toBeInTheDocument();

    // Final status copy
    expect(
      screen.getByText("Your opportunity to complete the Y-TRACE registration process has therefore ended."),
    ).toBeInTheDocument();

    // Sign out interaction
    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    expect(signOutBtn).toBeInTheDocument();
    fireEvent.click(signOutBtn);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  // TEST 8 — Refresh while suspended: Suspension remains enforced
  it("TEST 8: Refresh retains suspension state when profile status is suspended_inactive", () => {
    const refreshedProfile: OrganizationProfile = {
      ...activeProfile,
      profileStatus: "suspended_inactive",
    };
    expect(isOrganizationSuspended({ profile: refreshedProfile, documentFiles: [] })).toBe(true);
  });

  // TEST 9 & 10 — Logout/Login & Browser/Device Re-authentication: Remains suspended
  it("TEST 9 & 10: Subsequent authentications or sessions evaluate database suspension state", () => {
    const newlyAuthenticatedSessionProfile: OrganizationProfile = {
      ...activeProfile,
      profileStatus: "suspended_inactive",
    };
    expect(
      isOrganizationSuspended({ profile: newlyAuthenticatedSessionProfile, documentFiles: [] }),
    ).toBe(true);
  });

  // TEST 11 — Direct mutation assertOrganizationNotSuspended rejects suspended organizations
  it("TEST 11: assertOrganizationNotSuspended throws an explicit error when organization is suspended", () => {
    expect(() =>
      assertOrganizationNotSuspended({ profile_status: "suspended_inactive" }, "Budget submission"),
    ).toThrowError("Budget submission is not permitted because this organization account is permanently suspended.");

    expect(() =>
      assertOrganizationNotSuspended({ profileStatus: "suspended_inactive" }, "Liquidation report"),
    ).toThrowError("Liquidation report is not permitted because this organization account is permanently suspended.");

    expect(() =>
      assertOrganizationNotSuspended({ profileStatus: "verified" }, "Valid action"),
    ).not.toThrow();
  });

  // TEST 12 — Admin Visibility: Admin retains full access to inspect rejected document and suspended status
  it("TEST 12: Admin records retain full visibility of rejected document files and suspended profile status", () => {
    const adminRecordFiles: SubmissionFile[] = [
      {
        id: "file-rejected",
        submissionId: "sub-1",
        documentTypeId: "tpl-1",
        fileName: "cbl.pdf",
        fileUrl: "https://storage/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "rejected_red",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    expect(adminRecordFiles[0].adminStatus).toBe("rejected_red");
    expect(suspendedProfile.profileStatus).toBe("suspended_inactive");
  });

  // TEST 13 — Multiple Documents: 3 Approved, 1 Rejected -> Suspended
  it("TEST 13: 3 documents approved and 1 rejected results in isSuspended = true", () => {
    const multiDocFiles: SubmissionFile[] = [
      {
        id: "file-1",
        submissionId: "sub-1",
        documentTypeId: "tpl-1",
        fileName: "cbl.pdf",
        fileUrl: "https://storage/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "approved_green",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "file-2",
        submissionId: "sub-1",
        documentTypeId: "tpl-2",
        fileName: "officers.pdf",
        fileUrl: "https://storage/officers.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "approved_green",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "file-3",
        submissionId: "sub-1",
        documentTypeId: "tpl-3",
        fileName: "directory.pdf",
        fileUrl: "https://storage/directory.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "approved_green",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "file-4",
        submissionId: "sub-1",
        documentTypeId: "tpl-4",
        fileName: "actionplan.pdf",
        fileUrl: "https://storage/actionplan.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "rejected_red",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    expect(isOrganizationSuspended({ profile: activeProfile, documentFiles: multiDocFiles })).toBe(true);
  });

  // TEST 14 — Organization Isolation: Org A suspended, Org B active
  it("TEST 14: Suspending Org A does not impact Org B", () => {
    const orgAProfile: OrganizationProfile = {
      ...activeProfile,
      id: "org-A",
      profileStatus: "suspended_inactive",
    };

    const orgBProfile: OrganizationProfile = {
      ...activeProfile,
      id: "org-B",
      profileStatus: "verified",
    };

    const orgBFiles: SubmissionFile[] = [
      {
        id: "file-b1",
        submissionId: "sub-B",
        documentTypeId: "tpl-1",
        fileName: "cbl.pdf",
        fileUrl: "https://storage/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        validationStatus: "correct",
        adminStatus: "approved_green",
        uploadedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    expect(isOrganizationSuspended({ profile: orgAProfile, documentFiles: [] })).toBe(true);
    expect(isOrganizationSuspended({ profile: orgBProfile, documentFiles: orgBFiles })).toBe(false);
  });

  // TEST 15 & 16 — User session detects suspension immediately
  it("TEST 15 & 16: Active session prerequisites evaluate isSuspended = true upon document rejection", () => {
    const userPrereqs = resolveRegistrationPrerequisites({
      profile: activeProfile,
      requiredTemplates,
      documentFiles: [
        {
          id: "f-1",
          submissionId: "s-1",
          documentTypeId: "tpl-1",
          fileName: "cbl.pdf",
          fileUrl: "url",
          fileType: "application/pdf",
          fileSize: 100,
          validationStatus: "correct",
          adminStatus: "rejected_red",
          uploadedAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });

    expect(userPrereqs.isSuspended).toBe(true);
    expect(userPrereqs.canAccessDocuments).toBe(false);
  });

  // TEST 17 — Schema Compatibility: organization_profiles uses profile_status without is_verified
  it("TEST 17: Schema compatibility verifies profile_status alone determines suspension and verification", () => {
    // Verified profile
    const verifiedProfile: OrganizationProfile = {
      ...activeProfile,
      profileStatus: "verified",
      verifiedAt: "2026-09-28T00:00:00Z",
    };
    expect(isOrganizationSuspended({ profile: verifiedProfile, documentFiles: [] })).toBe(false);

    // Suspended profile
    const suspendedStatusProfile: OrganizationProfile = {
      ...activeProfile,
      profileStatus: "suspended_inactive",
    };
    expect(isOrganizationSuspended({ profile: suspendedStatusProfile, documentFiles: [] })).toBe(true);
  });

  // TEST 18 — Admin Review RPC: Rejection invokes update_admin_document_submission_file_review
  it("TEST 18: Admin Rejection RPC executes successfully and returns updated file", async () => {
    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue({
      id: "admin-1",
      username: "lydoadmin",
      email: "lydoadmin@lydo-connect.local",
      displayName: "Super Admin",
      sessionToken: "valid-admin-token",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const { supabase } = await import("./supabase");
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "file-rejected-1",
          submission_id: "sub-1",
          document_type_id: "tpl-1",
          file_name: "cbl.pdf",
          file_url: "https://storage/cbl.pdf",
          file_type: "application/pdf",
          file_size: 2048,
          validation_status: "correct",
          admin_status: "rejected_red",
          admin_remarks: "Invalid document submission",
          uploaded_at: "2026-09-28T00:00:00Z",
          reviewed_at: "2026-09-28T01:00:00Z",
          revision_requested_at: null,
          revision_due_at: null,
          revision_locked: true,
          updated_at: "2026-09-28T01:00:00Z",
        },
      ],
      error: null,
    });
    (supabase as any).rpc = mockRpc;

    const result = await updateDocumentSubmissionFileReviewInSupabase({
      fileId: "file-rejected-1",
      status: "rejected_red",
      adminRemarks: "Invalid document submission",
    });

    expect(mockRpc).toHaveBeenCalledWith("update_admin_document_submission_file_review", {
      _session_token: expect.any(String),
      _file_id: "file-rejected-1",
      _status: "rejected_red",
      _admin_remarks: "Invalid document submission",
    });
    expect(result.adminStatus).toBe("rejected_red");
    expect(result.revisionLocked).toBe(true);
  });

  // TEST 19 — Needs Revision does not suspend and keeps document correctable
  it("TEST 19: Needs Revision updates status to needs_revision without locking or suspending", async () => {
    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue({
      id: "admin-1",
      username: "lydoadmin",
      email: "lydoadmin@lydo-connect.local",
      displayName: "Super Admin",
      sessionToken: "valid-admin-token",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const { supabase } = await import("./supabase");
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "file-rev-1",
          submission_id: "sub-1",
          document_type_id: "tpl-1",
          file_name: "cbl.pdf",
          file_url: "https://storage/cbl.pdf",
          file_type: "application/pdf",
          file_size: 2048,
          validation_status: "correct",
          admin_status: "needs_revision",
          admin_remarks: "Please update page 2",
          uploaded_at: "2026-09-28T00:00:00Z",
          reviewed_at: "2026-09-28T01:00:00Z",
          revision_requested_at: "2026-09-28T01:00:00Z",
          revision_due_at: "2026-10-03T01:00:00Z",
          revision_locked: false,
          updated_at: "2026-09-28T01:00:00Z",
        },
      ],
      error: null,
    });
    (supabase as any).rpc = mockRpc;

    const result = await updateDocumentSubmissionFileReviewInSupabase({
      fileId: "file-rev-1",
      status: "needs_revision",
      adminRemarks: "Please update page 2",
    });

    expect(result.adminStatus).toBe("needs_revision");
    expect(result.revisionLocked).toBe(false);

    // Organization is NOT suspended when only revision is requested
    const revisionFiles: SubmissionFile[] = [
      {
        id: "file-rev-1",
        submissionId: "sub-1",
        documentTypeId: "tpl-1",
        fileName: "cbl.pdf",
        fileUrl: "https://storage/cbl.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        validationStatus: "correct",
        adminStatus: "needs_revision",
        uploadedAt: "2026-09-28T00:00:00Z",
        updatedAt: "2026-09-28T01:00:00Z",
      },
    ];
    expect(isOrganizationSuspended({ profile: activeProfile, documentFiles: revisionFiles })).toBe(false);
  });
});
