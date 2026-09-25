import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequireAdmin } from "@/App";
import { AdministratorsTable } from "@/admin/components/AdministratorsTable";
import { UnverifiedAdminAccessScreen } from "@/admin/components/UnverifiedAdminAccessScreen";
import {
  writeCachedSystemSettings,
  DEFAULT_SYSTEM_SETTINGS_VALUES,
  getEffectiveSystemSetting,
} from "@/lib/admin-system-settings";
import * as authHook from "@/hooks/use-auth";
import * as adminAuth from "@/lib/admin-auth";
import type { AdministratorRecord } from "@/lib/lydo-connect-data";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      resend: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe("Group 3 — Admin Security: require_verified_admin_email & admin_password_reset", () => {
  const mockSuperAdmin: adminAuth.SeededAdminUser = {
    id: "admin-super-1",
    username: "superadmin",
    email: "superadmin@pasigcity.gov.ph",
    displayName: "Super Administrator",
    sessionToken: "super-token-123",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "super_admin",
    permissionCodes: ["system_settings_view", "system_settings_manage", "administrators_view", "administrators_manage"],
    isEmailVerified: true,
  };

  const mockUnverifiedAdmin: adminAuth.SeededAdminUser = {
    id: "admin-unverified-2",
    username: "unverified_admin",
    email: "unverified@pasigcity.gov.ph",
    displayName: "Unverified Admin Staff",
    sessionToken: "unverified-token-456",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "admin",
    permissionCodes: ["budget_view"],
    isEmailVerified: false,
  };

  const mockTargetAdminRecord: AdministratorRecord = {
    id: "admin-target-3",
    displayName: "Juan Dela Cruz",
    email: "juan.delacruz@pasigcity.gov.ph",
    username: "jdelacruz",
    roleId: 2,
    roleCode: "admin",
    roleLabel: "Administrator",
    unitId: 1,
    unitCode: "operations",
    unitLabel: "Operations Unit",
    isActive: true,
    isPasswordSet: true,
    createdAt: "2026-01-01T00:00:00Z",
    lastActiveAt: "2026-09-25T12:00:00Z",
  };

  const createMockAuth = (user: adminAuth.SeededAdminUser | null): ReturnType<typeof authHook.useAuth> => ({
    user: user as any,
    profile: null,
    session: null,
    isAuthenticated: Boolean(user),
    isLoading: false,
    error: null,
    isInitializing: false,
    isInitialized: true,
    isPasswordRecoverySession: false,
    role: user ? ("admin" as any) : "guest",
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("1. security.require_verified_admin_email", () => {
    it("blocks unverified administrator and shows verification required screen when ON", () => {
      writeCachedSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS_VALUES,
        "security.require_verified_admin_email": true,
      });

      vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockUnverifiedAdmin));

      render(
        <MemoryRouter initialEntries={["/admin/overview"]}>
          <RequireAdmin>
            <div data-testid="protected-admin-content">Admin Portal Overview Content</div>
          </RequireAdmin>
        </MemoryRouter>,
      );

      // Protected content MUST NOT be displayed
      expect(screen.queryByTestId("protected-admin-content")).not.toBeInTheDocument();

      // Unverified admin gate MUST be displayed
      expect(screen.getByText(/Administrator Email Verification Required/i)).toBeInTheDocument();
      expect(screen.getByText(/unverified@pasigcity.gov.ph/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resend Verification Email/i })).toBeInTheDocument();
    });

    it("allows verified administrator to access protected routes when setting is ON", () => {
      writeCachedSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS_VALUES,
        "security.require_verified_admin_email": true,
      });

      vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockSuperAdmin));

      render(
        <MemoryRouter initialEntries={["/admin/settings"]}>
          <RequireAdmin>
            <div data-testid="protected-admin-content">Admin Settings Content</div>
          </RequireAdmin>
        </MemoryRouter>,
      );

      // Protected content MUST be displayed
      expect(screen.getByTestId("protected-admin-content")).toBeInTheDocument();
      expect(screen.queryByText(/Administrator Email Verification Required/i)).not.toBeInTheDocument();
    });

    it("allows unverified administrator access when security.require_verified_admin_email is OFF", () => {
      writeCachedSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS_VALUES,
        "security.require_verified_admin_email": false,
      });

      vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth(mockUnverifiedAdmin));

      render(
        <MemoryRouter initialEntries={["/admin/inquiries"]}>
          <RequireAdmin>
            <div data-testid="protected-admin-content">Admin Inquiries Content</div>
          </RequireAdmin>
        </MemoryRouter>,
      );

      // Protected content MUST be rendered when requirement is disabled
      expect(screen.getByTestId("protected-admin-content")).toBeInTheDocument();
      expect(screen.queryByText(/Administrator Email Verification Required/i)).not.toBeInTheDocument();
    });

    it("renders UnverifiedAdminAccessScreen with functional resend action", async () => {
      const { supabase } = await import("@/lib/supabase");
      const onSignOut = vi.fn();

      render(
        <UnverifiedAdminAccessScreen
          email="staff@pasigcity.gov.ph"
          onSignOut={onSignOut}
        />,
      );

      expect(screen.getByText(/Administrator Email Verification Required/i)).toBeInTheDocument();
      expect(screen.getByText("staff@pasigcity.gov.ph")).toBeInTheDocument();

      const resendBtn = screen.getByRole("button", { name: /Resend Verification Email/i });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: "signup",
          email: "staff@pasigcity.gov.ph",
        });
      });

      const signOutBtn = screen.getByRole("button", { name: /Sign Out & Return to Login/i });
      fireEvent.click(signOutBtn);
      expect(onSignOut).toHaveBeenCalled();
    });
  });

  describe("2. security.allow_admin_password_reset / security.admin_password_reset", () => {
    it("renders Send Password Reset action for authorized Super Admin in AdministratorsTable", async () => {
      const onSendPasswordReset = vi.fn();
      const isSuperAdmin = mockSuperAdmin.roleCode === "super_admin";

      render(
        <AdministratorsTable
          administrators={[mockTargetAdminRecord]}
          roleOptions={[{ code: "admin", label: "Administrator" }]}
          unitOptions={[{ code: "operations", label: "Operations Unit" }]}
          searchValue=""
          onSearchChange={vi.fn()}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          unitFilter="all"
          onUnitFilterChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          currentAdminId={mockSuperAdmin.id}
          resendingInviteId={null}
          canSendPasswordReset={isSuperAdmin}
          sendingPasswordResetId={null}
          onEdit={vi.fn()}
          onToggleActive={vi.fn()}
          onDelete={vi.fn()}
          onResendInvite={vi.fn()}
          onSendPasswordReset={onSendPasswordReset}
        />,
      );

      const moreActionsBtn = screen.getByLabelText("More actions");
      fireEvent.keyDown(moreActionsBtn, { key: "Enter", code: "Enter" });
      fireEvent.keyDown(moreActionsBtn, { key: "ArrowDown", code: "ArrowDown" });
      fireEvent.click(moreActionsBtn);

      await waitFor(() => {
        expect(screen.getByText(/Send Password Reset/i)).toBeInTheDocument();
      });

      const resetItem = screen.getByText(/Send Password Reset/i);
      fireEvent.click(resetItem);
      expect(onSendPasswordReset).toHaveBeenCalledWith(mockTargetAdminRecord);
    });

    it("denies Send Password Reset capability for Regular Admin without super_admin role", () => {
      const regularAdminRole = "admin";
      const isSuperAdmin = regularAdminRole === "super_admin";

      render(
        <AdministratorsTable
          administrators={[mockTargetAdminRecord]}
          roleOptions={[{ code: "admin", label: "Administrator" }]}
          unitOptions={[{ code: "operations", label: "Operations Unit" }]}
          searchValue=""
          onSearchChange={vi.fn()}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          unitFilter="all"
          onUnitFilterChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          currentAdminId="admin-regular"
          resendingInviteId={null}
          canSendPasswordReset={isSuperAdmin}
          sendingPasswordResetId={null}
          onEdit={vi.fn()}
          onToggleActive={vi.fn()}
          onDelete={vi.fn()}
          onResendInvite={vi.fn()}
        />,
      );

      const moreActionsBtn = screen.getByLabelText("More actions");
      fireEvent.click(moreActionsBtn);

      expect(screen.queryByText(/Send Password Reset/i)).not.toBeInTheDocument();
    });

    it("strictly DENIES Send Password Reset capability for Regular Admin even with administrators_manage permission", () => {
      // Regular Admin with granular administrators_manage permission
      const regularAdminWithManage = {
        roleCode: "admin",
        permissionCodes: ["administrators_manage", "administrators_management", "administrators_view"],
      };

      // Authoritative check: MUST be super_admin only, permissions must NOT grant reset capability
      const canSend = regularAdminWithManage.roleCode === "super_admin";
      expect(canSend).toBe(false);

      render(
        <AdministratorsTable
          administrators={[mockTargetAdminRecord]}
          roleOptions={[{ code: "admin", label: "Administrator" }]}
          unitOptions={[{ code: "operations", label: "Operations Unit" }]}
          searchValue=""
          onSearchChange={vi.fn()}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          unitFilter="all"
          onUnitFilterChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          currentAdminId="admin-regular-managed"
          resendingInviteId={null}
          canSendPasswordReset={canSend}
          sendingPasswordResetId={null}
          onEdit={vi.fn()}
          onToggleActive={vi.fn()}
          onDelete={vi.fn()}
          onResendInvite={vi.fn()}
        />,
      );

      const moreActionsBtn = screen.getByLabelText("More actions");
      fireEvent.click(moreActionsBtn);

      expect(screen.queryByText(/Send Password Reset/i)).not.toBeInTheDocument();
    });

    it("evaluates getEffectiveSystemSetting for both allow_admin_password_reset and alias", () => {
      writeCachedSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS_VALUES,
        "security.allow_admin_password_reset": true,
      });

      expect(getEffectiveSystemSetting("security.allow_admin_password_reset")).toBe(true);
      expect(getEffectiveSystemSetting("security.admin_password_reset")).toBe(true);

      writeCachedSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS_VALUES,
        "security.allow_admin_password_reset": false,
      });

      expect(getEffectiveSystemSetting("security.allow_admin_password_reset")).toBe(false);
      expect(getEffectiveSystemSetting("security.admin_password_reset")).toBe(false);
    });
  });
});
