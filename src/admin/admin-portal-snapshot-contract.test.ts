import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapDocumentFile,
  loadAdminPortalSupabaseState,
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

    it("calls get_admin_portal_snapshot with valid session token and hydrates all snapshot sections", async () => {
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

      // Mock from() for supplementary admin templates query
      (supabase!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockSnapshotData.templates,
            error: null,
          }),
        }),
      });

      const result = await loadAdminPortalSupabaseState();

      expect(result).not.toBeNull();
      expect(supabase!.rpc).toHaveBeenCalledWith("get_admin_portal_snapshot", {
        _session_token: "valid_admin_token_xyz",
      });

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

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Admin portal snapshot RPC failed; loading inquiries only."),
        "column dsf.ocr_text does not exist",
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
