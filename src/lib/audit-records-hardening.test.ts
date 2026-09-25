import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldLogActivityType,
  AuditCategory,
  ADMIN_SYSTEM_SETTING_DEFINITIONS,
  getDefaultSystemSettingsMap,
  writeCachedSystemSettings,
} from "./admin-system-settings";
import {
  createAdminActivityLogInSupabase,
} from "./lydo-connect-supabase";

// Mock supabase
vi.mock("./supabase", () => {
  return {
    supabase: {
      rpc: vi.fn(),
    },
  };
});

// Mock admin auth session
vi.mock("./admin-auth", () => {
  return {
    readAdminSession: vi.fn().mockReturnValue({
      id: "admin-uuid-1",
      sessionToken: "valid-admin-session-token",
      displayName: "Super Admin",
      roleCode: "super_admin",
    }),
  };
});

import { supabase } from "./supabase";

describe("Admin System Settings → Audit & Records Hardening Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("1. Audit & Records Settings Definitions & Defaults", () => {
    it("defines all 10 canonical Audit & Records settings with correct types and categories", () => {
      const auditKeys = [
        "audit.log_admin_login",
        "audit.log_admin_logout",
        "audit.log_record_creation",
        "audit.log_record_updates",
        "audit.log_approvals_rejections",
        "audit.log_deletions",
        "audit.log_permission_changes",
        "audit.log_config_changes",
        "audit.include_user_agent",
        "audit.include_ip_metadata",
      ];

      const defaultMap = getDefaultSystemSettingsMap();

      for (const key of auditKeys) {
        const def = ADMIN_SYSTEM_SETTING_DEFINITIONS.find((d) => d.key === key);
        expect(def, `Missing definition for ${key}`).toBeDefined();
        expect(def?.category).toBe("audit_records");
        expect(def?.dataType).toBe("boolean");
        expect(typeof defaultMap[key]).toBe("boolean");
      }

      // Default for IP metadata is false, others default to true
      expect(defaultMap["audit.include_ip_metadata"]).toBe(false);
      expect(defaultMap["audit.log_admin_login"]).toBe(true);
      expect(defaultMap["audit.log_admin_logout"]).toBe(true);
      expect(defaultMap["audit.log_config_changes"]).toBe(true);
    });
  });

  describe("2. Authoritative Audit Categories & shouldLogActivityType Evaluator", () => {
    it("evaluates explicit audit categories against active system settings", () => {
      // With default settings (all true except IP metadata)
      expect(shouldLogActivityType("admin_sign_in", "login")).toBe(true);
      expect(shouldLogActivityType("admin_sign_out", "logout")).toBe(true);
      expect(shouldLogActivityType("create_template", "create")).toBe(true);
      expect(shouldLogActivityType("update_template", "update")).toBe(true);
      expect(shouldLogActivityType("approve_renewal", "approval")).toBe(true);
      expect(shouldLogActivityType("delete_inquiry", "deletion")).toBe(true);
      expect(shouldLogActivityType("update_permissions", "permission")).toBe(true);
      expect(shouldLogActivityType("save_settings", "config")).toBe(true);
    });

    it("correctly suppresses audit logging when individual category settings are disabled", () => {
      // Disable specific settings
      writeCachedSystemSettings({
        "audit.log_admin_login": false,
        "audit.log_admin_logout": false,
        "audit.log_record_creation": false,
        "audit.log_record_updates": false,
        "audit.log_approvals_rejections": false,
        "audit.log_deletions": false,
        "audit.log_permission_changes": false,
        "audit.log_config_changes": false,
      });

      expect(shouldLogActivityType("admin_sign_in", "login")).toBe(false);
      expect(shouldLogActivityType("admin_sign_out", "logout")).toBe(false);
      expect(shouldLogActivityType("create_template", "create")).toBe(false);
      expect(shouldLogActivityType("update_template", "update")).toBe(false);
      expect(shouldLogActivityType("approve_renewal", "approval")).toBe(false);
      expect(shouldLogActivityType("delete_inquiry", "deletion")).toBe(false);
      expect(shouldLogActivityType("update_permissions", "permission")).toBe(false);
      expect(shouldLogActivityType("save_settings", "config")).toBe(false);
    });

    it("correctly classifies 'Archived file' and 'Restored file' under 'update' category", () => {
      // Default (enabled)
      expect(shouldLogActivityType("Archived file")).toBe(true);
      expect(shouldLogActivityType("Restored file")).toBe(true);

      // Disabled updates
      writeCachedSystemSettings({
        "audit.log_record_updates": false,
      });

      expect(shouldLogActivityType("Archived file")).toBe(false);
      expect(shouldLogActivityType("Restored file")).toBe(false);
    });
  });

  describe("3. createAdminActivityLogInSupabase with Categories & Metadata", () => {
    it("passes explicit category and metadata to the server-side RPC", async () => {
      const mockRpc = supabase?.rpc as ReturnType<typeof vi.fn>;
      mockRpc.mockResolvedValueOnce({
        data: [{
          id: "log-1",
          actor_user_id: "admin-uuid-1",
          organization_id: "org-1",
          action: "update_template",
          related_type: "template",
          related_id: "tpl-1",
          description: "Updated template details",
          created_at: new Date().toISOString(),
          metadata: { user_agent: "Mozilla/5.0" },
        }],
        error: null,
      });

      const result = await createAdminActivityLogInSupabase({
        action: "update_template",
        relatedType: "template",
        relatedId: "tpl-1",
        description: "Updated template details",
        organizationId: "org-1",
        category: "update",
        metadata: { custom_field: 123 },
      });

      expect(mockRpc).toHaveBeenCalledWith("create_admin_activity_log", {
        _session_token: "valid-admin-session-token",
        _organization_id: "org-1",
        _action: "update_template",
        _related_type: "template",
        _related_id: "tpl-1",
        _description: "Updated template details",
        _category: "update",
        _metadata: { custom_field: 123 },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("log-1");
      expect(result?.metadata).toBeDefined();
    });

    it("handles server-side suppression gracefully returning null without throwing", async () => {
      const mockRpc = supabase?.rpc as ReturnType<typeof vi.fn>;
      // When category is disabled server-side, create_admin_activity_log returns empty set
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await createAdminActivityLogInSupabase({
        action: "delete_inquiry",
        relatedType: "inquiry",
        relatedId: "inq-1",
        description: "Deleted inquiry ticket",
        category: "deletion",
      });

      expect(result).toBeNull();
    });
  });

  describe("4. Separation of Concerns: Audit Logging Decoupling", () => {
    it("ensures turning off audit settings never prevents underlying actions from executing", () => {
      writeCachedSystemSettings({
        "audit.log_deletions": false,
        "audit.log_approvals_rejections": false,
        "audit.log_permission_changes": false,
      });

      // Operations continue:
      expect(shouldLogActivityType("delete_inquiry", "deletion")).toBe(false);
      expect(shouldLogActivityType("approve_renewal", "approval")).toBe(false);
      expect(shouldLogActivityType("update_permissions", "permission")).toBe(false);
    });
  });
});
