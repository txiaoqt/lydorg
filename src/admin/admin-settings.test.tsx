import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import {
  ADMIN_PERMISSION_GROUPS,
  ADMIN_NAV_PERMISSION_MAP,
  hasAdminNavPermission,
  hasAdminPermission,
} from "@/lib/admin-permissions";
import {
  ADMIN_SYSTEM_SETTING_DEFINITIONS,
  DEFAULT_SYSTEM_SETTINGS_VALUES,
  validateSystemSettingValue,
  getEffectiveSystemSettings,
  getEffectiveSystemSetting,
  shouldLogActivityType,
  shouldNotifyAdmin,
  readCachedSystemSettings,
  writeCachedSystemSettings,
  adminGetSystemSettingsFromSupabase,
  adminSaveSystemSettingsInSupabase,
} from "@/lib/admin-system-settings";
import { AdminSettingsPage } from "@/admin/components/AdminSettingsPage";
import * as authHook from "@/hooks/use-auth";
import * as adminAuth from "@/lib/admin-auth";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => false,
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("Admin System Settings - Permissions", () => {
  it("includes system_settings_view and system_settings_manage in administration permission group", () => {
    const adminGroup = ADMIN_PERMISSION_GROUPS.find(
      (g) => g.code === "administration" || g.label === "ADMINISTRATION",
    );
    expect(adminGroup).toBeDefined();

    const viewPerm = adminGroup?.items.find((p) => p.code === "system_settings_view");
    const managePerm = adminGroup?.items.find((p) => p.code === "system_settings_manage");

    expect(viewPerm).toBeDefined();
    expect(viewPerm?.label).toBe("System Settings View");

    expect(managePerm).toBeDefined();
    expect(managePerm?.label).toBe("System Settings Management");
  });

  it("maps settings navigation item to system_settings_view", () => {
    expect(ADMIN_NAV_PERMISSION_MAP.settings).toBe("system_settings_view");
  });

  it("checks navigation visibility based on system_settings_view permission", () => {
    expect(hasAdminNavPermission(["system_settings_view"], "settings")).toBe(true);
    expect(hasAdminNavPermission(["system_settings_view", "system_settings_manage"], "settings")).toBe(true);
    expect(hasAdminNavPermission(["user_accounts_view"], "settings")).toBe(false);
    expect(hasAdminNavPermission([], "settings")).toBe(false);
    expect(hasAdminNavPermission(undefined, "settings")).toBe(false);
  });

  it("checks granular permission checks for view vs manage", () => {
    const viewOnlyCodes = ["system_settings_view"];
    const fullCodes = ["system_settings_view", "system_settings_manage"];

    expect(hasAdminPermission(viewOnlyCodes, "system_settings_view")).toBe(true);
    expect(hasAdminPermission(viewOnlyCodes, "system_settings_manage")).toBe(false);

    expect(hasAdminPermission(fullCodes, "system_settings_view")).toBe(true);
    expect(hasAdminPermission(fullCodes, "system_settings_manage")).toBe(true);
  });
});

describe("Admin System Settings - Definitions and Defaults", () => {
  it("contains definitions for all 8 required categories", () => {
    const categories = new Set(ADMIN_SYSTEM_SETTING_DEFINITIONS.map((d) => d.category));
    expect(categories.has("general")).toBe(true);
    expect(categories.has("notifications")).toBe(true);
    expect(categories.has("workflow")).toBe(true);
    expect(categories.has("programs")).toBe(true);
    expect(categories.has("budget_finance")).toBe(true);
    expect(categories.has("security")).toBe(true);
    expect(categories.has("email")).toBe(true);
    expect(categories.has("audit_records")).toBe(true);
  });

  it("has valid defaults for general settings", () => {
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["general.system_name"]).toBe("Y-TRACE");
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["general.office_name"]).toBe("Pasig City Local Youth Development Office");
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["general.office_acronym"]).toBe("PCYDO / LYDO");
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["general.user_portal_url"]).toBe("https://ytrace.app");
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["general.admin_portal_url"]).toBe("https://y-trace-admin.vercel.app");
  });

  it("has valid defaults for security settings", () => {
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["security.admin_session_timeout_minutes"]).toBe(30);
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["security.reauth_delete_administrator"]).toBe(true);
  });

  it("has valid defaults for notification switches", () => {
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["notifications.new_registration.in_app"]).toBe(true);
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["notifications.new_registration.email"]).toBe(true);
    expect(DEFAULT_SYSTEM_SETTINGS_VALUES["notifications.budget_request.in_app"]).toBe(true);
  });
});

describe("Admin System Settings - Validation Rules", () => {
  it("validates email formats", () => {
    const valid = validateSystemSettingValue("general.support_email", "pydo@pasigcity.gov.ph");
    expect(valid.valid).toBe(true);

    const invalid = validateSystemSettingValue("general.support_email", "not-an-email");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toMatch(/valid email/i);
  });

  it("validates URL formats", () => {
    const valid = validateSystemSettingValue("general.user_portal_url", "https://ytrace.app");
    expect(valid.valid).toBe(true);

    const invalid = validateSystemSettingValue("general.user_portal_url", "ftp://invalid");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toMatch(/http:\/\/ or https:\/\//i);
  });

  it("validates session timeout bounds (5 to 480 minutes)", () => {
    expect(validateSystemSettingValue("security.admin_session_timeout_minutes", 30).valid).toBe(true);
    expect(validateSystemSettingValue("security.admin_session_timeout_minutes", 120).valid).toBe(true);
    expect(validateSystemSettingValue("security.admin_session_timeout_minutes", 480).valid).toBe(true);
    expect(validateSystemSettingValue("security.admin_session_timeout_minutes", 4).valid).toBe(false);
    expect(validateSystemSettingValue("security.admin_session_timeout_minutes", 500).valid).toBe(false);
  });

  it("validates fiscal year bounds", () => {
    expect(validateSystemSettingValue("budget.default_fiscal_year", 2026).valid).toBe(true);
    expect(validateSystemSettingValue("budget.default_fiscal_year", 1999).valid).toBe(false);
    expect(validateSystemSettingValue("budget.default_fiscal_year", 2101).valid).toBe(false);
  });

  it("validates positive day counts for reminders", () => {
    expect(validateSystemSettingValue("workflow.review_reminder_days", 3).valid).toBe(true);
    expect(validateSystemSettingValue("workflow.review_reminder_days", -1).valid).toBe(false);
  });

  it("validates string length limits", () => {
    const longName = "A".repeat(101);
    expect(validateSystemSettingValue("general.system_name", longName).valid).toBe(false);
    expect(validateSystemSettingValue("general.system_name", "Y-TRACE").valid).toBe(true);
  });
});

describe("Admin System Settings - Runtime Helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads effective system settings and individual keys", () => {
    const settings = getEffectiveSystemSettings();
    expect(settings["general.system_name"]).toBe("Y-TRACE");
    expect(getEffectiveSystemSetting("general.office_acronym")).toBe("PCYDO / LYDO");
  });

  it("evaluates shouldLogActivityType correctly", () => {
    expect(shouldLogActivityType("login")).toBe(true);
    expect(shouldLogActivityType("update")).toBe(true);
    expect(shouldLogActivityType("settings")).toBe(true);

    writeCachedSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS_VALUES,
      "audit.log_admin_login": false,
    });

    expect(shouldLogActivityType("login")).toBe(false);
    expect(shouldLogActivityType("update")).toBe(true);
  });

  it("evaluates shouldNotifyAdmin correctly", () => {
    expect(shouldNotifyAdmin("new_registration", "in_app")).toBe(true);
    expect(shouldNotifyAdmin("new_registration", "email")).toBe(true);

    writeCachedSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS_VALUES,
      "notifications.new_registration.email": false,
    });

    expect(shouldNotifyAdmin("new_registration", "in_app")).toBe(true);
    expect(shouldNotifyAdmin("new_registration", "email")).toBe(false);
  });
});

describe("Admin System Settings - Local Cache & Fallback Store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default settings when Supabase is not configured", async () => {
    const records = await adminGetSystemSettingsFromSupabase();
    expect(records.length).toBe(ADMIN_SYSTEM_SETTING_DEFINITIONS.length);
    const systemName = records.find((r) => r.settingKey === "general.system_name");
    expect(systemName?.value).toBe("Y-TRACE");
  });

  it("saves settings locally and updates cache when Supabase is not configured", async () => {
    const updates = [{ key: "general.system_name" as const, value: "Y-TRACE Custom" }];
    const saved = await adminSaveSystemSettingsInSupabase(updates);

    expect(saved.length).toBeGreaterThan(0);
    const cached = readCachedSystemSettings();
    expect(cached["general.system_name"]).toBe("Y-TRACE Custom");
  });

  it("rejects invalid setting updates during save", async () => {
    const invalidUpdates = [{ key: "general.support_email" as const, value: "not-an-email" }];
    await expect(adminSaveSystemSettingsInSupabase(invalidUpdates)).rejects.toThrow(/validation failed/i);
  });
});

describe("Admin System Settings - UI Component", () => {
  const mockSuperAdmin: adminAuth.SeededAdminUser = {
    id: "admin-1",
    username: "superadmin",
    email: "superadmin@pasigcity.gov.ph",
    displayName: "Super Administrator",
    sessionToken: "valid-super-token",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "super_admin",
    permissionCodes: ["system_settings_view", "system_settings_manage"],
  };

  const mockReadOnlyAdmin: adminAuth.SeededAdminUser = {
    id: "admin-2",
    username: "viewer",
    email: "viewer@pasigcity.gov.ph",
    displayName: "Settings Viewer",
    sessionToken: "valid-viewer-token",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "auditor",
    permissionCodes: ["system_settings_view"],
  };

  const mockUnauthorizedAdmin: adminAuth.SeededAdminUser = {
    id: "admin-3",
    username: "officer",
    email: "officer@pasigcity.gov.ph",
    displayName: "Desk Officer",
    sessionToken: "valid-officer-token",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "officer",
    permissionCodes: ["user_accounts_view"],
  };

  const createMockAuth = (user: adminAuth.SeededAdminUser | null): ReturnType<typeof authHook.useAuth> => ({
    user,
    profile: null,
    session: null,
    isAuthenticated: Boolean(user),
    isLoading: false,
    error: null,
    isInitializing: false,
    role: user?.roleCode || null,
    login: vi.fn(),
    logout: vi.fn(),
    signUp: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    refreshProfile: vi.fn(),
    clearError: vi.fn(),
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("renders access denied state for unauthorized admin lacking system_settings_view", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockUnauthorizedAdmin));

    render(
      <BrowserRouter>
        <AdminSettingsPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/You do not have the required permissions/i)).toBeInTheDocument();
  });

  it("renders read-only indicator for admin with view-only permission", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockReadOnlyAdmin));

    render(
      <BrowserRouter>
        <AdminSettingsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Read-Only Mode/i)).toBeInTheDocument();
    });

    const systemNameInput = screen.getByLabelText(/System Name/i) as HTMLInputElement;
    expect(systemNameInput).toBeDisabled();
  });

  it("renders full editable UI for super admin with view and manage permissions", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));

    render(
      <BrowserRouter>
        <AdminSettingsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /System Settings/i })).toBeInTheDocument();
    });

    // Verify all 8 tabs are present
    expect(screen.getByRole("tab", { name: /General/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Workflow/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Programs/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Budget & Finance/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Security/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Email/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Audit & Records/i })).toBeInTheDocument();

    const systemNameInput = screen.getByLabelText(/System Name/i) as HTMLInputElement;
    expect(systemNameInput).not.toBeDisabled();
    expect(systemNameInput.value).toBe("Y-TRACE");
  });

  it("tracks dirty state when fields are modified and allows saving", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));

    render(
      <BrowserRouter>
        <AdminSettingsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/System Name/i)).toBeInTheDocument();
    });

    const systemNameInput = screen.getByLabelText(/System Name/i);
    fireEvent.change(systemNameInput, { target: { value: "Y-TRACE 2026" } });

    // Should indicate unsaved changes
    expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText(/Unsaved changes/i)).not.toBeInTheDocument();
    });
  });

  it("renders specific tab content according to tab query param and active selection", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));

    render(
      <MemoryRouter initialEntries={["/admin/settings?tab=security"]}>
        <AdminSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Session Lifetime & Timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/Destructive Action Confirmation Guards/i)).toBeInTheDocument();
    });
  });

  it("does NOT render Portal Origins & Deployment Links in the UI", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));

    render(
      <MemoryRouter initialEntries={["/admin/settings?tab=general"]}>
        <AdminSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /System Settings/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Portal Origins & Deployment Links/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Admin Portal URL/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Youth Organization Portal URL/i)).not.toBeInTheDocument();
  });

  it("renders all notification matrix switches and binds to canonical keys", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));

    render(
      <MemoryRouter initialEntries={["/admin/settings?tab=notifications"]}>
        <AdminSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Administrator Event Alerts/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/In-App: New Registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: New Registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Renewal Application/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Renewal Application/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: YPOP Verification Proof/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: YPOP Verification Proof/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Budget Project Proposal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Budget Project Proposal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Liquidation Report Packet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Liquidation Report Packet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Helpdesk Citizen Inquiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Helpdesk Citizen Inquiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Document Resubmission/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Document Resubmission/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Accreditation Expiring Notice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Accreditation Expiring Notice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App: Overdue Liquidation Escalation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email: Overdue Liquidation Escalation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Daily Activity Digest/i)).toBeInTheDocument();
  });
});

describe("Admin System Settings - Complete Authoritative Inventory (66 Settings)", () => {
  it("contains exactly 66 registered system setting definitions", () => {
    expect(ADMIN_SYSTEM_SETTING_DEFINITIONS.length).toBe(66);
  });

  it("verifies all categories have expected counts", () => {
    const counts = ADMIN_SYSTEM_SETTING_DEFINITIONS.reduce((acc, def) => {
      acc[def.category] = (acc[def.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(counts.general).toBe(8);
    expect(counts.notifications).toBe(20);
    expect(counts.workflow).toBe(8);
    expect(counts.programs).toBe(3);
    expect(counts.budget_finance).toBe(5);
    expect(counts.security).toBe(8);
    expect(counts.email).toBe(4);
    expect(counts.audit_records).toBe(10);
  });

  it("preserves internal canonical portal URL definitions while removing from UI", () => {
    const userUrlDef = ADMIN_SYSTEM_SETTING_DEFINITIONS.find((d) => d.key === "general.user_portal_url");
    const adminUrlDef = ADMIN_SYSTEM_SETTING_DEFINITIONS.find((d) => d.key === "general.admin_portal_url");

    expect(userUrlDef).toBeDefined();
    expect(userUrlDef?.defaultValue).toBe("https://ytrace.app");
    expect(adminUrlDef).toBeDefined();
    expect(adminUrlDef?.defaultValue).toBe("https://y-trace-admin.vercel.app");
  });
});

describe("Admin System Settings - Runtime Consumers & Fail-Safe Fallbacks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("evaluates shouldNotifyAdmin for all event types and both channels", () => {
    const eventTypes = [
      "new_registration",
      "renewal_submitted",
      "ypop_submission",
      "budget_request",
      "liquidation_report",
      "new_inquiry",
      "overdue_liquidation",
      "accreditation_expiring",
    ] as const;

    for (const evt of eventTypes) {
      expect(shouldNotifyAdmin(evt, "in_app")).toBe(true);
      expect(shouldNotifyAdmin(evt, "email")).toBe(true);
    }
  });

  it("fails safely to default values when storage is corrupt or empty", () => {
    localStorage.setItem("lydo_admin_system_settings_cache_v1", "invalid-json{");
    const settings = readCachedSystemSettings();
    expect(settings["general.system_name"]).toBe("Y-TRACE");
    expect(settings["budget.default_fiscal_year"]).toBe(2026);
  });
});

describe("Admin System Settings - RPC Payload and Response Mapping", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("calls admin_save_system_settings RPC with proper parameters when Supabase is configured", async () => {
    const mockRpcResponse = [
      {
        id: "setting-1",
        setting_key: "general.office_acronym",
        category: "general",
        value_json: "PCYDO / LYDO PASIG",
        data_type: "string",
        description: "Official office acronyms used in headers and badges",
        is_sensitive: false,
        is_editable: true,
        updated_by: "admin-1",
        updated_at: "2026-09-25T00:00:00Z",
      },
    ];

    const supabaseModule = await import("@/lib/supabase");
    vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);
    (supabaseModule.supabase as any).rpc = vi.fn().mockResolvedValue({
      data: mockRpcResponse,
      error: null,
    });

    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue({
      id: "admin-1",
      username: "superadmin",
      email: "superadmin@pasigcity.gov.ph",
      displayName: "Super Administrator",
      sessionToken: "valid-session-token-xyz",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      roleCode: "super_admin",
      permissionCodes: ["system_settings_manage"],
    });

    const updates = [{ key: "general.office_acronym" as const, value: "PCYDO / LYDO PASIG" }];
    const result = await adminSaveSystemSettingsInSupabase(updates);

    expect(supabaseModule.supabase.rpc).toHaveBeenCalledWith("admin_save_system_settings", {
      _session_token: "valid-session-token-xyz",
      _settings: updates,
    });

    expect(result.length).toBe(1);
    expect(result[0].settingKey).toBe("general.office_acronym");
    expect(result[0].value).toBe("PCYDO / LYDO PASIG");
    expect(result[0].updatedBy).toBe("admin-1");
  });

  it("handles multiple settings save via RPC atomically", async () => {
    const mockRpcResponse = [
      {
        id: "setting-1",
        setting_key: "general.office_acronym",
        category: "general",
        value_json: "PCYDO / LYDO PASIG",
        data_type: "string",
        description: "Official office acronyms",
        is_sensitive: false,
        is_editable: true,
        updated_by: "admin-1",
        updated_at: "2026-09-25T00:00:00Z",
      },
      {
        id: "setting-2",
        setting_key: "security.admin_session_timeout_minutes",
        category: "security",
        value_json: 45,
        data_type: "number",
        description: "Session timeout",
        is_sensitive: false,
        is_editable: true,
        updated_by: "admin-1",
        updated_at: "2026-09-25T00:00:00Z",
      },
    ];

    const supabaseModule = await import("@/lib/supabase");
    vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);
    (supabaseModule.supabase as any).rpc = vi.fn().mockResolvedValue({
      data: mockRpcResponse,
      error: null,
    });

    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue({
      id: "admin-1",
      username: "superadmin",
      email: "superadmin@pasigcity.gov.ph",
      displayName: "Super Administrator",
      sessionToken: "valid-session-token-xyz",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      roleCode: "super_admin",
      permissionCodes: ["system_settings_manage"],
    });

    const updates = [
      { key: "general.office_acronym" as const, value: "PCYDO / LYDO PASIG" },
      { key: "security.admin_session_timeout_minutes" as const, value: 45 },
    ];
    const result = await adminSaveSystemSettingsInSupabase(updates);

    expect(result.length).toBe(2);
    expect(result.map((r) => r.settingKey)).toEqual([
      "general.office_acronym",
      "security.admin_session_timeout_minutes",
    ]);
  });
});


