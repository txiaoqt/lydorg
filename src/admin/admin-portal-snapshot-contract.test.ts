import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminDashboardSummary,
  fetchAdminPortalListPage,
  fetchAdminYpopPeriodSubmissionPage,
  fetchAdminRecentNotifications,
  createAdminTemplateCategoryInSupabase,
  deleteAdminTemplateCategoryInSupabase,
  loadAdminPortalSectionState,
  mapDocumentFile,
} from "@/lib/lydo-connect-supabase";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

const setAdminSession = (sessionToken = "valid_admin_token_xyz") => {
  window.localStorage.setItem("lydo_admin_session_v1", JSON.stringify({
    id: "admin-1",
    username: "admin",
    email: "admin@ytrace.gov",
    displayName: "Admin",
    sessionToken,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  }));
};

describe("Admin Portal scoped data contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("maps document file rows without removed OCR fields", () => {
    const mapped = mapDocumentFile({
      id: "file-1",
      submission_id: "submission-1",
      document_type_id: "type-1",
      file_url: "https://storage.example/file.pdf",
      file_name: "file.pdf",
      file_type: "application/pdf",
      file_size: 1024,
      validation_status: "valid",
      admin_status: "approved",
      admin_remarks: null,
      uploaded_at: "2026-10-03T00:00:00.000Z",
      reviewed_at: null,
      created_at: "2026-10-03T00:00:00.000Z",
      updated_at: "2026-10-03T00:00:00.000Z",
      required_document_types: { id: "type-1", name: "Constitution" },
    });

    expect(mapped?.fileName).toBe("file.pdf");
    expect(mapped).not.toHaveProperty("ocrText");
    expect(mapped).not.toHaveProperty("ocrStatus");
    expect(mapped).not.toHaveProperty("ocrConfidence");
  });

  it("does not make an admin request before an admin session exists", async () => {
    const result = await loadAdminPortalSectionState("templates");

    expect(result).toBeNull();
    expect(supabase!.rpc).not.toHaveBeenCalled();
  });

  it("loads template catalog metadata from the page-scoped RPC without Storage access", async () => {
    setAdminSession();
    (supabase!.rpc as ReturnType<typeof vi.fn>).mockImplementation(async (name: string) => {
      if (name === "admin_get_template_categories") {
        return { data: [{ normalized_name: "youth_development" }], error: null };
      }
      return { data: {
        templates: [{
          id: "tpl-1",
          name: "Constitution and By-Laws",
          template_url: "storage://template-files/constitution.pdf",
          template_file_size: 2048,
          updated_at: "2026-10-03T00:00:00.000Z",
          is_active: true,
          is_required: true,
          sort_order: 1,
        }],
      }, error: null };
    });

    const result = await loadAdminPortalSectionState("templates");

    expect(supabase!.rpc).toHaveBeenCalledTimes(2);
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_portal_section_state", {
      _session_token: "valid_admin_token_xyz",
      _section: "templates",
    });
    expect(supabase!.from).not.toHaveBeenCalled();
    expect(result?.templates).toHaveLength(1);
    expect(result?.templates?.[0].templateFileSize).toBe(2048);
    expect(result?.templates?.[0].templateFileUrl).toBe("storage://template-files/constitution.pdf");
    expect(result?.customTemplateCategories).toEqual(["youth_development"]);
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_template_categories", {
      _session_token: "valid_admin_token_xyz",
    });
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("persists standalone category create/delete in the server registry across template reloads", async () => {
    setAdminSession();
    let serverCategories: string[] = [];
    (supabase!.rpc as ReturnType<typeof vi.fn>).mockImplementation(async (name: string, args: Record<string, string>) => {
      if (name === "admin_create_template_category") {
        serverCategories = [...new Set([...serverCategories, args._normalized_name])];
        return { data: args._normalized_name, error: null };
      }
      if (name === "admin_delete_template_category") {
        serverCategories = serverCategories.filter((category) => category !== args._normalized_name);
        return { data: null, error: null };
      }
      if (name === "admin_get_template_categories") {
        return { data: serverCategories.map((normalized_name) => ({ normalized_name })), error: null };
      }
      return { data: { templates: [] }, error: null };
    });

    await createAdminTemplateCategoryInSupabase("Youth Development");
    const afterCreate = await loadAdminPortalSectionState("templates");
    expect(afterCreate?.customTemplateCategories).toContain("youth_development");

    await deleteAdminTemplateCategoryInSupabase("Youth Development");
    const afterDelete = await loadAdminPortalSectionState("templates");
    expect(afterDelete?.customTemplateCategories).not.toContain("youth_development");
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it("keeps page-scoped registration loading bounded and filtered", async () => {
    setAdminSession();
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

    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_portal_list_page", expect.objectContaining({
      _session_token: "valid_admin_token_xyz",
      _resource: "registrations",
      _page: 2,
      _page_size: 10,
      _search: "Youth Leaders",
      _status: "pending_review",
    }));
    expect(result.totalCount).toBe(1);
    expect("profile" in result.rows[0]).toBe(true);
  });

  it("loads dashboard aggregates through the dashboard RPC", async () => {
    setAdminSession();
    (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { summary: { organizationsTotal: "84", pendingProfiles: "3" }, budgetTotals: null, needsAttention: [], recentActivity: [] },
      error: null,
    });

    const result = await fetchAdminDashboardSummary(2026);

    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_dashboard_summary", {
      _session_token: "valid_admin_token_xyz",
      _fiscal_year: 2026,
    });
    expect(result.summary.organizationsTotal).toBe(84);
  });

  it("loads notifications from their bounded RPC", async () => {
    setAdminSession();
    (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { unreadCount: 1, notifications: [] },
      error: null,
    });

    const result = await fetchAdminRecentNotifications();

    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_recent_notifications", {
      _session_token: "valid_admin_token_xyz",
      _limit: 25,
    });
    expect(result.unreadCount).toBe(1);
  });

  it("loads only the selected YPOP period page and keeps entry details out of list rows", async () => {
    setAdminSession();
    (supabase!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        rows: [{
          id: "entry-1",
          organization_id: "org-1",
          organization_name: "Youth Leaders Association",
          reference_id: "YORP-001",
          major_classification: "community_based",
          qualification_status: "pending_evaluation",
        }],
        totalCount: 23,
        page: 1,
        pageSize: 20,
        summary: { pending_evaluation: 23, qualified: 0, not_qualified: 0 },
      },
      error: null,
    });

    const result = await fetchAdminYpopPeriodSubmissionPage({
      periodId: "period-1", page: 1, pageSize: 20, search: "Youth", classification: "community_based", status: "pending_evaluation",
    });

    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_ypop_period_submissions_page", {
      _session_token: "valid_admin_token_xyz",
      _period_id: "period-1",
      _page: 1,
      _page_size: 20,
      _search: "Youth",
      _classification: "community_based",
      _qualification_status: "pending_evaluation",
    });
    expect(result).toMatchObject({ page: 1, pageSize: 20, totalCount: 23 });
    expect(result.rows[0]).toEqual({
      id: "entry-1",
      organizationId: "org-1",
      organizationName: "Youth Leaders Association",
      referenceId: "YORP-001",
      majorClassification: "community_based",
      status: "pending_evaluation",
    });
    expect(result.rows[0]).not.toHaveProperty("entry");
  });

  it("keeps YPOP revision history and attendance payloads out of the period-list RPC response", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const migration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20261005110000_targeted_portal_status_sync.sql"), "utf8");
    const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.admin_get_ypop_period_submissions_page(");
    const end = migration.indexOf("CREATE OR REPLACE FUNCTION public.admin_get_ypop_entry_review_detail(", start);
    const listRpc = migration.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(listRpc).toContain("LIMIT _safe_size OFFSET (_safe_page*_safe_size)");
    expect(listRpc).toContain("'totalCount'");
    expect(listRpc).not.toContain("'entry',CASE");
    expect(listRpc).not.toContain("'revision_history'");
    expect(listRpc).not.toContain("'city_led_attendance'");
  });

  it("logs a useful warning and leaves page state unchanged when a scoped RPC fails", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setAdminSession("some_token");
    (supabase!.rpc as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      data: null,
      error: { message: "function is not yet in schema cache" },
    }));

    const result = await loadAdminPortalSectionState("templates");

    expect(result).toBeNull();
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_portal_section_state", {
      _session_token: "some_token",
      _section: "templates",
    });
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_template_categories", {
      _session_token: "some_token",
    });
    expect(supabase!.rpc.mock.calls.some(([name]) => name === "get_admin_portal_snapshot")).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Admin section state RPC failed for templates:",
      "function is not yet in schema cache",
    );
    consoleWarnSpy.mockRestore();
  });
});
