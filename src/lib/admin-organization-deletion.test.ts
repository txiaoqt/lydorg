import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ORGANIZATION_DELETION_CATEGORIES,
  OrganizationDeletionError,
  bulkOrganizationDeletionConfirmationMatches,
  getOrganizationDeletionServiceError,
  normalizeOrganizationDeletionConfirmation,
  organizationDeletionConfirmationMatches,
  permanentlyDeleteBulkOrganizationAccounts,
  permanentlyDeleteOrganizationAccount,
  permanentlyDeleteRegistrationAccount,
  preflightBulkOrganizationDeletion,
  preflightRegistrationDeletion,
} from "./admin-organization-deletion";
import * as adminAuth from "./admin-auth";
import { supabase } from "./supabase";

vi.mock("./admin-auth", () => ({
  readAdminSession: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("organization deletion explanation", () => {
  it("uses the fixed category list without server-derived counts", () => {
    expect(ORGANIZATION_DELETION_CATEGORIES).toEqual([
      "Account and organization profile",
      "Compliance documents and uploaded files",
      "Budget requests and attachments",
      "Liquidation reports and attachments",
      "YPOP participation, activities, and supporting files",
      "Inquiries, notifications, and related organization records",
    ]);
  });
});

describe("organization deletion confirmation", () => {
  it("trims edges and normalizes repeated whitespace", () => {
    expect(normalizeOrganizationDeletionConfirmation("  Tadz   Youth\nCouncil  "))
      .toBe("Tadz Youth Council");
  });

  it("requires the complete normalized organization name", () => {
    expect(organizationDeletionConfirmationMatches("Tadz Youth Council", "Tadz Youth Council")).toBe(true);
    expect(organizationDeletionConfirmationMatches(" Tadz   Youth Council ", "Tadz Youth Council")).toBe(true);
    expect(organizationDeletionConfirmationMatches("Tadz", "Tadz Youth Council")).toBe(false);
    expect(organizationDeletionConfirmationMatches("tadz youth council", "Tadz Youth Council")).toBe(false);
  });

  it("requires exact uppercase phrase for bulk deletion", () => {
    expect(bulkOrganizationDeletionConfirmationMatches("DELETE SELECTED")).toBe(true);
    expect(bulkOrganizationDeletionConfirmationMatches("  delete   selected ")).toBe(true);
    expect(bulkOrganizationDeletionConfirmationMatches("DELETE")).toBe(false);
  });
});

describe("organization deletion service errors", () => {
  it("explains when the required Edge Function is not deployed", () => {
    expect(getOrganizationDeletionServiceError(404, null, "Fallback"))
      .toBe("The account deletion service is not deployed. Deploy the delete-organization-account server function, then retry.");
  });

  it("preserves safe server-provided errors", () => {
    expect(getOrganizationDeletionServiceError(
      403,
      { error: "You are not authorized to delete organization accounts." },
      "Fallback",
    )).toBe("You are not authorized to delete organization accounts.");
  });
});

describe("Registration deletion and YORP Registry deletion invocations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminSession: adminAuth.SeededAdminUser = {
    id: "admin-1",
    username: "superadmin",
    sessionToken: "admin-token-xyz",
    email: "admin@pasigcity.gov.ph",
    displayName: "Super Administrator",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    roleCode: "super_admin",
  };

  it("throws error when admin is not authorized", async () => {
    vi.mocked(adminAuth.readAdminSession).mockReturnValue(null);

    await expect(preflightRegistrationDeletion("org-123")).rejects.toThrow(
      "You are not authorized to delete organization accounts.",
    );
    await expect(permanentlyDeleteRegistrationAccount("org-123", "Org Name")).rejects.toThrow(
      "You are not authorized to delete organization accounts.",
    );
  });

  it("invokes registration_preflight with proper payload and session token", async () => {
    vi.mocked(adminAuth.readAdminSession).mockReturnValue(mockAdminSession);

    const mockResponse = {
      organization: { id: "org-reg-1", name: "Youth Org 1", urn: null },
      counts: {
        documentSubmissions: 3,
        documentFiles: 3,
        budgetRequests: 0,
        budgetFiles: 0,
        liquidationReports: 0,
        liquidationFiles: 0,
        ypopEntries: 0,
        ypopFiles: 0,
        ypopParticipations: 0,
        ypopActivities: 0,
        inquiries: 0,
        notifications: 0,
        complianceRemarks: 0,
        activityLogs: 2,
        storageObjects: 3,
      },
    };

    vi.mocked(supabase!.functions.invoke).mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const result = await preflightRegistrationDeletion("org-reg-1");
    expect(supabase!.functions.invoke).toHaveBeenCalledWith("delete-organization-account", {
      body: { action: "registration_preflight", organizationId: "org-reg-1" },
      headers: { "x-admin-session-token": "admin-token-xyz" },
    });
    expect(result).toEqual(mockResponse);
  });

  it("invokes registration_delete with exact confirmation name", async () => {
    vi.mocked(adminAuth.readAdminSession).mockReturnValue(mockAdminSession);

    const mockResult = {
      success: true,
      organizationId: "org-reg-1",
      organizationName: "Youth Org 1",
      status: "deleted",
      counts: {
        documentSubmissions: 3,
        documentFiles: 3,
        budgetRequests: 0,
        budgetFiles: 0,
        liquidationReports: 0,
        liquidationFiles: 0,
        ypopEntries: 0,
        ypopFiles: 0,
        ypopParticipations: 0,
        ypopActivities: 0,
        inquiries: 0,
        notifications: 0,
        complianceRemarks: 0,
        activityLogs: 2,
        storageObjects: 3,
      },
      auditRecorded: true,
    };

    vi.mocked(supabase!.functions.invoke).mockResolvedValue({
      data: mockResult,
      error: null,
    });

    const result = await permanentlyDeleteRegistrationAccount("org-reg-1", "Youth Org 1");
    expect(supabase!.functions.invoke).toHaveBeenCalledWith("delete-organization-account", {
      body: {
        action: "registration_delete",
        organizationId: "org-reg-1",
        confirmationName: "Youth Org 1",
      },
      headers: { "x-admin-session-token": "admin-token-xyz" },
    });
    expect(result).toEqual(mockResult);
  });

  it("preserves existing YORP registry deletion action 'delete'", async () => {
    vi.mocked(adminAuth.readAdminSession).mockReturnValue(mockAdminSession);

    vi.mocked(supabase!.functions.invoke).mockResolvedValue({
      data: { success: true, organizationId: "yorp-org-1", auditRecorded: true },
      error: null,
    });

    await permanentlyDeleteOrganizationAccount("yorp-org-1", "Accredited Org");
    expect(supabase!.functions.invoke).toHaveBeenCalledWith("delete-organization-account", {
      body: {
        action: "delete",
        organizationId: "yorp-org-1",
        confirmationName: "Accredited Org",
      },
      headers: { "x-admin-session-token": "admin-token-xyz" },
    });
  });

  it("preserves existing YORP registry bulk deletion actions", async () => {
    vi.mocked(adminAuth.readAdminSession).mockReturnValue(mockAdminSession);

    vi.mocked(supabase!.functions.invoke).mockResolvedValue({
      data: { valid: true, targets: [], totalCount: 2, allowedCount: 2, blockedCount: 0 },
      error: null,
    });

    await preflightBulkOrganizationDeletion(["org-1", "org-2"]);
    expect(supabase!.functions.invoke).toHaveBeenCalledWith("delete-organization-account", {
      body: { action: "bulk_preflight", organizationIds: ["org-1", "org-2"] },
      headers: { "x-admin-session-token": "admin-token-xyz" },
    });

    vi.mocked(supabase!.functions.invoke).mockResolvedValue({
      data: { success: true, total: 2, deletedCount: 2, blockedCount: 0, failedCount: 0, results: [] },
      error: null,
    });

    await permanentlyDeleteBulkOrganizationAccounts(["org-1", "org-2"], "DELETE SELECTED");
    expect(supabase!.functions.invoke).toHaveBeenCalledWith("delete-organization-account", {
      body: {
        action: "bulk_delete",
        organizationIds: ["org-1", "org-2"],
        confirmationPhrase: "DELETE SELECTED",
      },
      headers: { "x-admin-session-token": "admin-token-xyz" },
    });
  });
});

