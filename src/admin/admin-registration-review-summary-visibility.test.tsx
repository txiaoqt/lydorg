import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPortal from "./AdminPortal";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import type { OrganizationProfile, SubmissionFile, DocumentSubmission, TemplateRecord } from "@/lib/lydo-connect-data";
import { writeAdminSession } from "@/lib/admin-auth";

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isInitialized: true,
    isPasswordRecoverySession: false,
    role: "admin",
    user: {
      id: "admin-1",
      email: "admin@pasig.gov.ph",
      displayName: "Pasig Admin",
      roleCode: "super_admin",
      permissionCodes: [
        "registrations_management",
        "yorp_registry_view",
        "organizations_registration_review",
        "organizations_read",
      ],
    },
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockTemplate: TemplateRecord = {
  id: "doc-1",
  databaseId: "doc-1",
  name: "Directory of Officers",
  description: "Official Directory",
  templateScope: "document_submission",
  scope: "registration",
  templateCategories: ["yorp"],
  fileUrl: "https://example.com/template.pdf",
  fileName: "Directory_of_Officers.pdf",
  fileSize: 102400,
  fileType: "application/pdf",
  archived: false,
  isActive: true,
  templateActive: true,
  sortOrder: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const verifiedOrg: OrganizationProfile = {
  id: "org-verified-1",
  userId: "user-verified-1",
  organizationName: "Pasig Youth Council Verified",
  barangay: "San Nicolas",
  district: "District 1",
  majorClassification: "Community-Based Youth Organization",
  contactNumber: "09171234567",
  organizationEmail: "pyc_verified@pasig.gov.ph",
  profileStatus: "verified",
  referenceId: "REG-VERIFIED-01",
  urn: "URN-2026-0001",
  isExistingOrganization: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  verifiedAt: "2026-01-02T00:00:00.000Z",
};

const pendingOrg: OrganizationProfile = {
  id: "org-pending-1",
  userId: "user-pending-1",
  organizationName: "Pasig Youth Council Pending",
  barangay: "Kapitolyo",
  district: "District 1",
  majorClassification: "Community-Based Youth Organization",
  contactNumber: "09171234568",
  organizationEmail: "pyc_pending@pasig.gov.ph",
  profileStatus: "pending_review",
  referenceId: "REG-PENDING-01",
  urn: null,
  isExistingOrganization: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  verifiedAt: null,
};

const needsUpdateOrg: OrganizationProfile = {
  id: "org-needs-update-1",
  userId: "user-needs-update-1",
  organizationName: "Pasig Youth Council Needs Update",
  barangay: "Maybunga",
  district: "District 2",
  majorClassification: "Community-Based Youth Organization",
  contactNumber: "09171234569",
  organizationEmail: "pyc_needs_update@pasig.gov.ph",
  profileStatus: "needs_update",
  referenceId: "REG-UPDATE-01",
  urn: null,
  isExistingOrganization: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  verifiedAt: null,
};

const suspendedOrg: OrganizationProfile = {
  id: "org-suspended-1",
  userId: "user-suspended-1",
  organizationName: "Pasig Youth Council Suspended",
  barangay: "Ugong",
  district: "District 2",
  majorClassification: "Community-Based Youth Organization",
  contactNumber: "09171234570",
  organizationEmail: "pyc_suspended@pasig.gov.ph",
  profileStatus: "suspended_inactive",
  referenceId: "REG-SUSPENDED-01",
  urn: null,
  isExistingOrganization: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  verifiedAt: null,
};

const mockSubmissionVerified: DocumentSubmission = {
  id: "sub-verified-1",
  organizationId: "org-verified-1",
  status: "verified",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const mockSubmissionPending: DocumentSubmission = {
  id: "sub-pending-1",
  organizationId: "org-pending-1",
  status: "under_review",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockSubmissionNeedsUpdate: DocumentSubmission = {
  id: "sub-needs-update-1",
  organizationId: "org-needs-update-1",
  status: "needs_revision",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockSubmissionSuspended: DocumentSubmission = {
  id: "sub-suspended-1",
  organizationId: "org-suspended-1",
  status: "under_review",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockFiles: SubmissionFile[] = [
  {
    id: "file-v-1",
    submissionId: "sub-verified-1",
    documentTypeId: "doc-1",
    fileName: "Directory_of_Officers.pdf",
    fileUrl: "https://example.com/v1.pdf",
    fileSize: 102400,
    fileType: "application/pdf",
    adminStatus: "approved_green",
    uploadedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "file-p-1",
    submissionId: "sub-pending-1",
    documentTypeId: "doc-1",
    fileName: "Directory_of_Officers.pdf",
    fileUrl: "https://example.com/p1.pdf",
    fileSize: 102400,
    fileType: "application/pdf",
    adminStatus: "submitted",
    uploadedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "file-nu-1",
    submissionId: "sub-needs-update-1",
    documentTypeId: "doc-1",
    fileName: "Directory_of_Officers.pdf",
    fileUrl: "https://example.com/nu1.pdf",
    fileSize: 102400,
    fileType: "application/pdf",
    adminStatus: "needs_revision",
    adminRemarks: "Please sign page 2",
    uploadedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "file-s-1",
    submissionId: "sub-suspended-1",
    documentTypeId: "doc-1",
    fileName: "Directory_of_Officers.pdf",
    fileUrl: "https://example.com/s1.pdf",
    fileSize: 102400,
    fileType: "application/pdf",
    adminStatus: "submitted",
    uploadedAt: "2026-01-01T00:00:00.000Z",
  },
];

vi.mock("@/lib/lydo-connect-supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lydo-connect-supabase")>();
  return {
    ...actual,
    getAdminAccountsInSupabase: vi.fn().mockResolvedValue([]),
    getAdministratorsInSupabase: vi.fn().mockResolvedValue([]),
    getAdminRolesInSupabase: vi.fn().mockResolvedValue([]),
    getAdminUnitsInSupabase: vi.fn().mockResolvedValue([]),
    fetchAllOrganizationRenewalsInSupabase: vi.fn().mockResolvedValue([]),
    fetchAllOrganizationAccreditationsInSupabase: vi.fn().mockResolvedValue([]),
    fetchAdminPortalListPage: vi.fn().mockImplementation(async (filters: { resource: string; page: number; pageSize?: number }) => ({
      rows: filters.resource === "registrations"
        ? [verifiedOrg, pendingOrg, needsUpdateOrg, suspendedOrg].map((profile) => ({ profile, submittedDocumentCount: 1 }))
        : [],
      totalCount: filters.resource === "registrations" ? 4 : 0,
      page: filters.page,
      pageSize: filters.pageSize ?? 10,
      summary: { total: 4, verified: 1, pendingReview: 1, needsRevision: 1, suspended: 1 },
    })),
    fetchAdminRegistrationDetail: vi.fn().mockImplementation(async (organizationId: string) => {
      const profile = [verifiedOrg, pendingOrg, needsUpdateOrg, suspendedOrg].find((item) => item.id === organizationId);
      const submission = [mockSubmissionVerified, mockSubmissionPending, mockSubmissionNeedsUpdate, mockSubmissionSuspended]
        .find((item) => item.organizationId === organizationId);
      return {
        organizationProfiles: profile ? [profile] : [],
        documentSubmissions: submission ? [submission] : [],
        documentSubmissionFiles: mockFiles.filter((item) => item.submissionId === submission?.id),
        templates: [mockTemplate],
        activityLogs: [],
      };
    }),
    loadAdminPortalSupabaseState: vi.fn().mockImplementation(() =>
      Promise.resolve({
        templates: [mockTemplate],
        organizationProfiles: [verifiedOrg, pendingOrg, needsUpdateOrg, suspendedOrg],
        documentSubmissions: [
          mockSubmissionVerified,
          mockSubmissionPending,
          mockSubmissionNeedsUpdate,
          mockSubmissionSuspended,
        ],
        documentSubmissionFiles: mockFiles,
        activityLogs: [],
        administrators: [],
        adminRoles: [],
        adminUnits: [],
        adminAccounts: [],
      }),
    ),
    loadLydoConnectSupabaseState: vi.fn().mockImplementation(() =>
      Promise.resolve({
        templates: [mockTemplate],
        organizationProfiles: [verifiedOrg, pendingOrg, needsUpdateOrg, suspendedOrg],
        documentSubmissions: [
          mockSubmissionVerified,
          mockSubmissionPending,
          mockSubmissionNeedsUpdate,
          mockSubmissionSuspended,
        ],
        documentSubmissionFiles: mockFiles,
        activityLogs: [],
      }),
    ),
  };
});

describe("Registration Review Detail Review Summary Visibility", () => {
  beforeEach(() => {
    writeAdminSession({
      id: "admin-1",
      username: "admin",
      email: "admin@pasig.gov.ph",
      displayName: "Administrator",
      sessionToken: "valid-session-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const statePayload = JSON.stringify({
      templates: [mockTemplate],
      organizationProfiles: [verifiedOrg, pendingOrg, needsUpdateOrg, suspendedOrg],
      documentSubmissions: [
        mockSubmissionVerified,
        mockSubmissionPending,
        mockSubmissionNeedsUpdate,
        mockSubmissionSuspended,
      ],
      documentSubmissionFiles: mockFiles,
      activityLogs: [],
    });
    window.localStorage.setItem("lydo-connect-state-v1:admin:admin-1", statePayload);
    window.localStorage.setItem("lydo-connect-state-v1:admin:admin-1:valid-session-token", statePayload);
  });

  afterEach(() => {
    cleanup();
  });

  const renderPortalAndOpenReview = async (orgName: string) => {
    render(
      <MemoryRouter initialEntries={["/admin/registrations"]}>
        <LydoConnectProvider>
          <AdminPortal section="registrations" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    // Wait for the registrations table to load
    const orgNameElement = await screen.findByText(orgName);
    expect(orgNameElement).toBeInTheDocument();

    // Find the row containing this organization
    const orgRow = orgNameElement.closest(".border-b.border-slate-300.p-4") || orgNameElement.closest(".p-4");
    expect(orgRow).toBeDefined();

    // Click the "Review" button within this row
    const reviewButton = within(orgRow as HTMLElement).getByRole("button", { name: /^Review$/i });
    fireEvent.click(reviewButton);
  };

  it("1. VERIFIED Registration: Review Summary is completely REMOVED while top-level status and URN remain", async () => {
    await renderPortalAndOpenReview("Pasig Youth Council Verified");

    // Header and top-level indicators must be present
    expect(await screen.findByText("Back to Registrations Queue")).toBeInTheDocument();
    expect(screen.getByText("Pasig Youth Council Verified")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("URN: URN-2026-0001")).toBeInTheDocument();
    expect(screen.getByText(/1\/1 Documents Submitted/i)).toBeInTheDocument();

    // The entire Review Summary card MUST NOT be rendered
    expect(screen.queryByText("Review Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Review your decisions before submitting.")).not.toBeInTheDocument();
    expect(screen.queryByText("Organization Verified")).not.toBeInTheDocument();

    // Document queue and document preview must remain functional
    expect(screen.getByText("Document Queue")).toBeInTheDocument();
    expect(screen.getAllByText("Directory of Officers").length).toBeGreaterThanOrEqual(1);
  });

  it("2. PENDING REVIEW Registration: Review Summary remains VISIBLE with counters", async () => {
    await renderPortalAndOpenReview("Pasig Youth Council Pending");

    expect(await screen.findByText("Back to Registrations Queue")).toBeInTheDocument();
    expect(screen.getByText("Pasig Youth Council Pending")).toBeInTheDocument();

    // Review Summary card must be visible
    expect(screen.getByText("Review Summary")).toBeInTheDocument();
    expect(screen.getByText("Review your decisions before submitting.")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Request Revision")).toBeInTheDocument();
    expect(screen.getByText("Unreviewed")).toBeInTheDocument();

    // Review decision controls must be present
    expect(screen.getByText("Review Decision")).toBeInTheDocument();
  });

  it("3. NEEDS UPDATE / REVISION Registration: Review Summary remains VISIBLE", async () => {
    await renderPortalAndOpenReview("Pasig Youth Council Needs Update");

    expect(await screen.findByText("Back to Registrations Queue")).toBeInTheDocument();
    expect(screen.getByText("Pasig Youth Council Needs Update")).toBeInTheDocument();

    // Review Summary card must be visible
    expect(screen.getByText("Review Summary")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Request Revision")).toBeInTheDocument();
    expect(screen.getByText("Unreviewed")).toBeInTheDocument();
  });

  it("4. SUSPENDED Registration: Review decisions are disabled", async () => {
    await renderPortalAndOpenReview("Pasig Youth Council Suspended");

    expect(await screen.findByText("Back to Registrations Queue")).toBeInTheDocument();
    expect(screen.getByText("Pasig Youth Council Suspended")).toBeInTheDocument();

    // Review actions must be disabled and warning notice displayed
    expect(
      screen.getByText("Review actions are unavailable because this organization account is permanently suspended.")
    ).toBeInTheDocument();
  });
});
