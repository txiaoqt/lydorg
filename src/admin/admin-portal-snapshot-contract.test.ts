import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapDocumentFile,
  loadAdminPortalSupabaseState,
  fetchAdminPortalListPage,
  fetchAdminDashboardSummary,
  fetchAdminRecentNotifications,
} from "@/lib/lydo-connect-supabase";
import { supabase } from "@/lib/supabase";

// Mock supabase
vi.mock("@/lib/supabase", () => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  return {
    supabase: {
      rpc: rpcMock,
      from: fromMock,
    },
    isSupabaseConfigured: () => true,
  };
});

describe("Admin Portal Snapshot Contract & OCR Removal Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe("A. Document Submission File Contract (Legacy OCR Removed)", () => {
    it("maps document submission file row without legacy OCR fields", () => {
      const modernFileRow = {
        id: "file-uuid-001",
        submission_id: "sub-uuid-001",
        document_type_id: "tpl-uuid-001",
        file_url: "https://storage.ytrace.gov/docs/constitution.pdf",
        file_name: "constitution.pdf",
        file_type: "application/pdf",
        file_size: 2048576,
        validation_status: "valid" as const,
        admin_status: "approved" as const,
        admin_remarks: "All bylaws verified",
        uploaded_at: "2026-09-17T08:00:00.000Z",
        reviewed_at: "2026-09-17T09:00:00.000Z",
        created_at: "2026-09-17T08:00:00.000Z",
        updated_at: "2026-09-17T09:00:00.000Z",
        required_document_types: {
          id: "tpl-uuid-001",
          name: "Constitution and By-Laws",
        },
      };

      const mapped = mapDocumentFile(modernFileRow);

      expect(mapped).not.toBeNull();
      expect(mapped).toEqual({
        id: "file-uuid-001",
        submissionId: "sub-uuid-001",
        documentTypeId: "tpl-uuid-001",
        documentTypeName: "Constitution and By-Laws",
        fileName: "constitution.pdf",
        fileUrl: "https://storage.ytrace.gov/docs/constitution.pdf",
        fileType: "application/pdf",
        fileSize: 2048576,
        validationStatus: "valid",
        adminStatus: "approved",
        adminRemarks: "All bylaws verified",
        revisionHistory: [],
        uploadedAt: "2026-09-17T08:00:00.000Z",
        reviewedAt: "2026-09-17T09:00:00.000Z",
        revisionRequestedAt: null,
        revisionDueAt: null,
        revisionLocked: false,
        revisionUnlockedAt: null,
        revisionUnlockedBy: null,
        createdAt: "2026-09-17T08:00:00.000Z",
        updatedAt: "2026-09-17T09:00:00.000Z",
      });

      // Verify no OCR properties exist in mapped output
      const mappedRecord = mapped as Record<string, unknown>;
      expect(mappedRecord["ocrText"]).toBeUndefined();
      expect(mappedRecord["ocrStatus"]).toBeUndefined();
      expect(mappedRecord["ocrConfidence"]).toBeUndefined();
      expect(mappedRecord["ocrMetadata"]).toBeUndefined();
    });

    it("verifies expected file payload does NOT depend on ocr_text, ocr_status, ocr_confidence, or ocr_metadata", () => {
      // Input strictly conforming to post-migration 20260911200000 / 20260917120000 schema
      const rowWithoutOcr = {
        id: "file-100",
        submission_id: "sub-100",
        file_url: "https://example.com/file.pdf",
        file_name: "file.pdf",
        file_type: "application/pdf",
        file_size: 1024,
        validation_status: "pending" as const,
        admin_status: "under_review" as const,
        admin_remarks: null,
        uploaded_at: "2026-09-17T10:00:00Z",
        reviewed_at: null,
        created_at: "2026-09-17T10:00:00Z",
        updated_at: "2026-09-17T10:00:00Z",
        required_document_types: {
          id: "tpl-100",
          name: "Resolution",
        },
      };

      // Must succeed without error
      const mapped = mapDocumentFile(rowWithoutOcr);
      expect(mapped).toBeDefined();
      expect(mapped?.documentTypeId).toBe("tpl-100");
      expect(mapped?.fileName).toBe("file.pdf");
    });
  });

  describe("B. Snapshot Hydration and Auth Timing Guard", () => {
    it("does not call get_admin_portal_snapshot if no admin session exists", async () => {
      // Ensure no admin session in localStorage
      window.localStorage.removeItem("lydo_admin_session_v1");

      const result = await loadAdminPortalSupabaseState();

      expect(result).toBeNull();
      expect(supabase!.rpc).not.toHaveBeenCalledWith("get_admin_portal_snapshot", expect.anything());
    });

    it("loads snapshot sections once without duplicate inquiry, YPOP, template, or category requests", async () => {
      // Seed a valid admin session
      window.localStorage.setItem(
        "lydo_admin_session_v1",
        JSON.stringify({
          id: "admin-1",
          username: "lydoadmin",
          email: "admin@ytrace.gov",
          displayName: "Admin User",
          sessionToken: "valid_admin_token_xyz",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );

      const mockSnapshotData = {
        organization_profiles: [
          {
            id: "org-1",
            user_id: "user-1",
            organization_name: "Youth Leaders Association",
            acronym: "YLA",
            registration_status: "approved",
            created_at: "2026-09-17T00:00:00Z",
            updated_at: "2026-09-17T00:00:00Z",
          },
        ],
        document_submissions: [
          {
            id: "sub-1",
            organization_id: "org-1",
            submitted_by: "user-1",
            status: "submitted",
            created_at: "2026-09-17T00:00:00Z",
            updated_at: "2026-09-17T00:00:00Z",
          },
        ],
        document_submission_files: [
          {
            id: "file-1",
            submission_id: "sub-1",
            file_url: "https://example.com/f1.pdf",
            file_name: "f1.pdf",
            file_type: "application/pdf",
            file_size: 512,
            validation_status: "valid",
            admin_status: "approved",
            admin_remarks: null,
            uploaded_at: "2026-09-17T00:00:00Z",
            reviewed_at: "2026-09-17T01:00:00Z",
            created_at: "2026-09-17T00:00:00Z",
            updated_at: "2026-09-17T01:00:00Z",
            required_document_types: { id: "tpl-1", name: "Constitution" },
          },
        ],
        budget_requests: [],
        budget_request_files: [],
        liquidation_reports: [],
        liquidation_report_files: [],
        news_releases: [],
        transparency_posts: [],
        compliance_remarks: [],
        notifications: [],
        activity_logs: [],
        templates: [
          {
            id: "tpl-active-1",
            name: "Active Template",
            is_active: true,
            sort_order: 1,
            is_required: true,
            updated_at: "2026-09-17T00:00:00Z",
          },
          {
            id: "tpl-archived-1",
            name: "Archived Template",
            is_active: false,
            sort_order: 2,
            is_required: false,
            updated_at: "2026-09-17T00:00:00Z",
          },
        ],
      };

      (supabase!.rpc as ReturnType<typeof vi.fn>).mockImplementation((rpcName: string) => {
        if (rpcName === "get_admin_portal_snapshot") {
          return Promise.resolve({ data: mockSnapshotData, error: null });
        }
        if (rpcName === "get_admin_inquiries") {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const result = await loadAdminPortalSupabaseState();

      expect(result).not.toBeNull();
      expect(supabase!.rpc).toHaveBeenCalledWith("get_admin_portal_snapshot", {
        _session_token: "valid_admin_token_xyz",
      });
      expect(supabase!.rpc).toHaveBeenCalledTimes(1);
      expect(supabase!.from).not.toHaveBeenCalled();

      // Verify sections are hydrated
      expect(result!.organizationProfiles).toHaveLength(1);
      expect(result!.documentSubmissions).toHaveLength(1);
      expect(result!.documentSubmissionFiles).toHaveLength(1);
      expect(result!.documentSubmissionFiles![0].fileName).toBe("f1.pdf");

      // Verify both active and archived templates are received in snapshot
      expect(result!.templates).toHaveLength(2);
      const activeTpl = result!.templates!.find((t) => t.id === "tpl-active-1");
      const archivedTpl = result!.templates!.find((t) => t.id === "tpl-archived-1");
      expect(activeTpl?.isActive).toBe(true);
      expect(archivedTpl?.isActive).toBe(false);
    });

    it("loads registrations through one filtered, bounded admin RPC page", async () => {
      window.localStorage.setItem(
        "lydo_admin_session_v1",
        JSON.stringify({
          id: "admin-1",
          username: "lydoadmin",
          email: "admin@ytrace.gov",
          displayName: "Admin User",
          sessionToken: "valid_admin_token_xyz",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
      (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          rows: [{
            profile: {
              id: "org-1",
              reference_id: "YORP-001",
              user_id: "user-1",
              organization_name: "Youth Leaders Association",
              organization_email: "youth@example.gov",
              district: "District I",
              barangay: "San Antonio",
              is_existing_organization: false,
              organization_identifier_number: null,
              registration_type: "new_organization",
              urn: null,
              major_classification: "community_based",
              profile_status: "pending_review",
              created_at: "2026-10-01T00:00:00.000Z",
              updated_at: "2026-10-02T00:00:00.000Z",
            },
            submitted_document_count: 3,
          }],
          totalCount: 1,
          page: 2,
          pageSize: 10,
        },
        error: null,
      });

      const result = await fetchAdminPortalListPage({
        resource: "registrations",
        page: 2,
        pageSize: 10,
        search: "Youth Leaders",
        status: "pending_review",
        district: "District I",
        barangay: "San Antonio",
        classification: "community_based",
      });

      expect(supabase!.rpc).toHaveBeenCalledTimes(1);
      expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_portal_list_page", {
        _session_token: "valid_admin_token_xyz",
        _resource: "registrations",
        _page: 2,
        _page_size: 10,
        _search: "Youth Leaders",
        _status: "pending_review",
        _district: "District I",
        _barangay: "San Antonio",
        _classification: "community_based",
        _date_range: "all",
        _sort: "newest",
      });
      expect(supabase!.from).not.toHaveBeenCalled();
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(2);
      expect("profile" in result.rows[0]).toBe(true);
      if ("profile" in result.rows[0]) {
        expect(result.rows[0].profile.organizationName).toBe("Youth Leaders Association");
        expect(result.rows[0].profile.contactNumber).toBe("");
        expect(result.rows[0].submittedDocumentCount).toBe(3);
      }
    });

    it("loads only aggregate dashboard metrics and bounded recent records", async () => {
      window.localStorage.setItem(
        "lydo_admin_session_v1",
        JSON.stringify({
          id: "admin-1",
          username: "lydoadmin",
          email: "admin@ytrace.gov",
          displayName: "Admin User",
          sessionToken: "valid_admin_token_xyz",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
      (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          summary: { organizationsTotal: "84", pendingProfiles: "3", pendingYpop: "2" },
          budgetTotals: { approved: "1500", released: "1200", liquidated: "500" },
          needsAttention: [{
            id: "registration-org-1",
            kind: "registration",
            organizationName: "Youth Leaders Association",
            actionText: "Review registration",
            verb: "Submitted",
            timestamp: "2026-10-02T00:00:00.000Z",
          }],
          recentActivity: [{
            id: "log-1",
            action: "Approved document submission",
            description: "Approved constitution",
            createdAt: "2026-10-02T00:00:00.000Z",
          }],
        },
        error: null,
      });

      const result = await fetchAdminDashboardSummary(2026);

      expect(supabase!.rpc).toHaveBeenCalledTimes(1);
      expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_dashboard_summary", {
        _session_token: "valid_admin_token_xyz",
        _fiscal_year: 2026,
      });
      expect(result.summary.organizationsTotal).toBe(84);
      expect(result.budgetTotals).toEqual({ approved: 1500, released: 1200, liquidated: 500 });
      expect(result.needsAttention).toHaveLength(1);
      expect(result.recentActivity).toHaveLength(1);
      expect(supabase!.from).not.toHaveBeenCalled();
    });

    it("accepts a permission-scoped dashboard response for a limited administrator", async () => {
      window.localStorage.setItem(
        "lydo_admin_session_v1",
        JSON.stringify({
          id: "limited-admin-1",
          username: "limitedadmin",
          email: "limited-admin@ytrace.gov",
          displayName: "Limited Admin",
          sessionToken: "valid_limited_admin_token",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          roleCode: "admin",
          permissionCodes: ["registrations_management", "yorp_registry_view", "news_releases_management"],
        }),
      );
      (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          summary: { organizationsTotal: "84", pendingProfiles: "3" },
          budgetTotals: null,
          needsAttention: [],
          recentActivity: [],
        },
        error: null,
      });

      const result = await fetchAdminDashboardSummary(2026);

      expect(result.summary).toEqual({ organizationsTotal: 84, pendingProfiles: 3 });
      expect(result.summary).not.toHaveProperty("budgetRequestsTotal");
      expect(result.budgetTotals).toEqual({ approved: 0, released: 0, liquidated: 0 });
      expect(result.needsAttention).toEqual([]);
      expect(result.recentActivity).toEqual([]);
    });

    it("loads a bounded notification window and unread aggregate", async () => {
      window.localStorage.setItem(
        "lydo_admin_session_v1",
        JSON.stringify({
          id: "admin-1",
          username: "lydoadmin",
          email: "admin@ytrace.gov",
          displayName: "Admin User",
          sessionToken: "valid_admin_token_xyz",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
      (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          unreadCount: "2",
          notifications: [{
            id: "notification-1",
            user_id: "admin-1",
            organization_id: null,
            title: "Review completed",
            message: "A registration was approved.",
            type: "system",
            related_type: "registration",
            related_id: "org-1",
            is_read: false,
            created_at: "2026-10-02T00:00:00.000Z",
          }],
        },
        error: null,
      });

      const result = await fetchAdminRecentNotifications();

      expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_recent_notifications", {
        _session_token: "valid_admin_token_xyz",
        _limit: 25,
      });
      expect(result.unreadCount).toBe(2);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe("Review completed");
    });
  });

  describe("C. Error Handling and Snapshot Resilience", () => {
    it("surfaces snapshot RPC errors and logs meaningful warning without crashing", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      window.localStorage.setItem(
        "lydo_admin_session_v1",
        JSON.stringify({
          id: "admin-1",
          username: "lydoadmin",
          email: "admin@ytrace.gov",
          displayName: "Admin User",
          sessionToken: "some_token",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );

      (supabase!.rpc as ReturnType<typeof vi.fn>).mockImplementation((rpcName: string) => {
        if (rpcName === "get_admin_portal_snapshot") {
          return Promise.resolve({
            data: null,
            error: { message: "column dsf.ocr_text does not exist" },
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      (supabase!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await loadAdminPortalSupabaseState();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("get_admin_portal_snapshot RPC failed:"),
        "column dsf.ocr_text does not exist",
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
