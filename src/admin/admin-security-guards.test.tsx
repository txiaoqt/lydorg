import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { AdminSettingsPage } from "@/admin/components/AdminSettingsPage";
import {
  writeCachedSystemSettings,
  DEFAULT_SYSTEM_SETTINGS_VALUES,
  getEffectiveSystemSetting,
} from "@/lib/admin-system-settings";
import * as authHook from "@/hooks/use-auth";
import * as adminAuth from "@/lib/admin-auth";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

describe("Admin System Settings - Group 2 Security Guards", () => {
  const mockSuperAdmin: adminAuth.SeededAdminUser = {
    id: "admin-super-1",
    username: "superadmin",
    email: "superadmin@pasigcity.gov.ph",
    displayName: "Super Administrator",
    sessionToken: "super-token-123",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "super_admin",
    permissionCodes: ["system_settings_view", "system_settings_manage"],
  };

  const createMockAuth = (user: adminAuth.SeededAdminUser | null): ReturnType<typeof authHook.useAuth> => ({
    user: user as any,
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
    vi.clearAllMocks();
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));
    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue(mockSuperAdmin);
  });

  it("saves settings directly without confirmation dialog when security.reauth_modify_system_settings is OFF", async () => {
    writeCachedSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS_VALUES,
      "security.reauth_modify_system_settings": false,
    });

    render(
      <MemoryRouter initialEntries={["/admin/settings?tab=general"]}>
        <AdminSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Office Name/i)).toBeInTheDocument();
    });

    const officeNameInput = screen.getByLabelText(/Office Name/i);
    fireEvent.change(officeNameInput, { target: { value: "Pasig City Youth Development Office (Direct)" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Dialog should NOT be displayed
    expect(screen.queryByText(/Save System Settings\?/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Unsaved changes/i)).not.toBeInTheDocument();
    });
  });

  it("opens confirmation dialog before saving when security.reauth_modify_system_settings is ON", async () => {
    writeCachedSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS_VALUES,
      "security.reauth_modify_system_settings": true,
    });

    render(
      <MemoryRouter initialEntries={["/admin/settings?tab=general"]}>
        <AdminSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Office Name/i)).toBeInTheDocument();
    });

    const officeNameInput = screen.getByLabelText(/Office Name/i);
    fireEvent.change(officeNameInput, { target: { value: "Pasig City Youth Development Office (Guarded)" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Dialog MUST be displayed
    await waitFor(() => {
      expect(screen.getByText(/Save System Settings\?/i)).toBeInTheDocument();
    });

    // Clicking cancel preserves draft settings and closes dialog
    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/Save System Settings\?/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });

    // Clicking Save again and confirming persists settings
    const saveButtonAgain = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveButtonAgain);
    await waitFor(() => {
      expect(screen.getByText(/Save System Settings\?/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText(/Unsaved changes/i)).not.toBeInTheDocument();
    });
  });

  it("verifies security.reauth_delete_inquiry and security.reauth_delete_organization setting resolution", () => {
    writeCachedSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS_VALUES,
      "security.reauth_delete_inquiry": false,
      "security.reauth_delete_organization": true,
    });

    expect(getEffectiveSystemSetting("security.reauth_delete_inquiry")).toBe(false);
    expect(getEffectiveSystemSetting("security.reauth_delete_organization")).toBe(true);

    writeCachedSystemSettings({
      ...DEFAULT_SYSTEM_SETTINGS_VALUES,
      "security.reauth_delete_inquiry": true,
      "security.reauth_delete_organization": false,
    });

    expect(getEffectiveSystemSetting("security.reauth_delete_inquiry")).toBe(true);
    expect(getEffectiveSystemSetting("security.reauth_delete_organization")).toBe(false);
  });
});
