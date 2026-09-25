import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import ResetPassword, { computeInitialResetMode } from "./ResetPassword";
import * as authHook from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => {
  const getSessionMock = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
  const onAuthStateChangeMock = vi.fn((_callback) => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  const resetPasswordForEmailMock = vi.fn().mockResolvedValue({ data: {}, error: null });
  const updateUserMock = vi.fn().mockResolvedValue({ data: {}, error: null });
  const exchangeCodeForSessionMock = vi.fn().mockResolvedValue({ data: {}, error: null });
  const verifyOtpMock = vi.fn().mockResolvedValue({ data: {}, error: null });
  const setSessionMock = vi.fn().mockResolvedValue({ data: {}, error: null });

  return {
    isSupabaseConfigured: () => true,
    supabase: {
      auth: {
        getSession: getSessionMock,
        onAuthStateChange: onAuthStateChangeMock,
        resetPasswordForEmail: resetPasswordForEmailMock,
        updateUser: updateUserMock,
        exchangeCodeForSession: exchangeCodeForSessionMock,
        verifyOtp: verifyOtpMock,
        setSession: setSessionMock,
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
});

describe("ResetPassword Component & Recovery Flow Suite", () => {
  const createMockAuth = (overrides: Partial<ReturnType<typeof authHook.useAuth>> = {}) => ({
    user: null,
    profile: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isInitializing: false,
    role: "guest" as const,
    login: vi.fn(),
    logout: vi.fn(),
    signUp: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    refreshProfile: vi.fn(),
    clearError: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    isPasswordRecoverySession: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/reset-password");
  });

  it("Test 1: Recovery session already exists before mount -> fields appear immediately without delay", async () => {
    localStorage.setItem("ytrace-active-password-recovery", "1");
    vi.spyOn(authHook, "useAuth").mockReturnValue(
      createMockAuth({
        isPasswordRecoverySession: true,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    // Fields should appear immediately
    expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm new password$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Forgot your password\?/i)).not.toBeInTheDocument();
  });

  it("Test 2: Recovery event occurs after page mount -> fields transition to update immediately", async () => {
    let authCallback: ((event: string, session: unknown) => void) | null = null;
    vi.spyOn(supabase!.auth, "onAuthStateChange").mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth());

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Forgot your password\?/i)).toBeInTheDocument();

    // Trigger PASSWORD_RECOVERY event
    authCallback?.("PASSWORD_RECOVERY", {
      access_token: "rec-token",
      user: { id: "user-1" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    });
  });

  it("Test 3: Recovery URL with hash tokens parsed immediately on mount", () => {
    const mode = computeInitialResetMode(
      "https://example.com/reset-password#access_token=token&refresh_token=refresh&type=recovery",
    );
    expect(mode).toBe("update");
  });

  it("Test 4: INITIAL_SESSION event with valid session transitions to update mode", async () => {
    let authCallback: ((event: string, session: unknown) => void) | null = null;
    vi.spyOn(supabase!.auth, "onAuthStateChange").mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth());

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    authCallback?.("INITIAL_SESSION", {
      access_token: "init-token",
      user: { id: "user-123" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    });
  });

  it("Test 5: Invalid or missing recovery token displays clear unavailable error state", async () => {
    const expiredUrl =
      "/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth());

    render(
      <MemoryRouter initialEntries={[expiredUrl]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Reset link unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request New Link/i })).toBeInTheDocument();
  });

  it("Test 6: Expired recovery link allows requesting a new link", async () => {
    const expiredUrl =
      "/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth());

    render(
      <MemoryRouter initialEntries={[expiredUrl]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    const requestButton = screen.getByRole("button", { name: /Request New Link/i });
    fireEvent.click(requestButton);

    expect(screen.getByText(/Forgot your password\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
  });

  it("Test 7: Google-authenticated user visiting /reset-password directly sees password setup form immediately", async () => {
    const mockGoogleUser = {
      id: "google-user-1",
      email: "googleuser@gmail.com",
      displayName: "Google User",
    };

    vi.spyOn(authHook, "useAuth").mockReturnValue(
      createMockAuth({
        isAuthenticated: true,
        user: mockGoogleUser as any,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Set your account password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Confirm new password$/i)).toBeInTheDocument();
    });
  });

  it("Test 8: Unauthenticated user without tokens sees standard forgot password request form", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth());

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Forgot your password\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  it("Test 9: Successfully submits reset request with email validation", async () => {
    const resetSpy = vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockResolvedValue({
      data: {} as any,
      error: null,
    });

    vi.spyOn(authHook, "useAuth").mockReturnValue(createMockAuth());

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: "testorg@gmail.com" } });

    const submitButton = screen.getByRole("button", { name: /Send Reset Link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith("testorg@gmail.com", expect.any(Object));
      expect(screen.getByText(/Reset link requested/i)).toBeInTheDocument();
    });
  });

  it("Test 10: Validates password criteria before allowing submission", async () => {
    localStorage.setItem("ytrace-active-password-recovery", "1");
    vi.spyOn(authHook, "useAuth").mockReturnValue(
      createMockAuth({
        isPasswordRecoverySession: true,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    expect(submitBtn).toBeDisabled();

    const newPassInput = screen.getByLabelText(/^New password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm new password$/i);

    // Invalid password (too short)
    fireEvent.change(newPassInput, { target: { value: "Ab1!" } });
    fireEvent.change(confirmPassInput, { target: { value: "Ab1!" } });
    expect(submitBtn).toBeDisabled();

    // Valid password (8-16 chars, uppercase, lowercase, number, special)
    fireEvent.change(newPassInput, { target: { value: "P@ssword123" } });
    fireEvent.change(confirmPassInput, { target: { value: "P@ssword123" } });

    expect(submitBtn).not.toBeDisabled();
  });

  it("Test 11: Executes updateUser and shows password updated confirmation screen", async () => {
    localStorage.setItem("ytrace-active-password-recovery", "1");
    const updateSpy = vi.spyOn(supabase!.auth, "updateUser").mockResolvedValue({
      data: { user: { id: "user-1" } as any },
      error: null,
    });

    vi.spyOn(authHook, "useAuth").mockReturnValue(
      createMockAuth({
        isPasswordRecoverySession: true,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    const newPassInput = screen.getByLabelText(/^New password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm new password$/i);

    fireEvent.change(newPassInput, { target: { value: "SecurePass123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({ password: "SecurePass123!" });
      expect(screen.getByText(/Password updated/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Continue to Sign In/i })).toBeInTheDocument();
    });
  });

  it("Test 12: Displays inline error if updateUser fails without breaking the form", async () => {
    localStorage.setItem("ytrace-active-password-recovery", "1");
    vi.spyOn(supabase!.auth, "updateUser").mockResolvedValue({
      data: { user: null },
      error: new Error("Password must not be the same as old password"),
    });

    vi.spyOn(authHook, "useAuth").mockReturnValue(
      createMockAuth({
        isPasswordRecoverySession: true,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    const newPassInput = screen.getByLabelText(/^New password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm new password$/i);

    fireEvent.change(newPassInput, { target: { value: "SecurePass123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Password must not be the same as old password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    });
  });
});
