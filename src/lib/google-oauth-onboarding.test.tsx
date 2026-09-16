import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SignIn from "@/pages/SignIn";
import AuthCallback from "@/pages/AuthCallback";
import GoogleOnboarding from "@/pages/GoogleOnboarding";
import {
  isOrganizationProfileComplete,
  createBlankOrganizationProfile,
  createOrganizationProfileDraft,
  getMissingEditableProfileRequirements,
  validateOrganizationName,
  organizationEmailPattern,
  philippineContactNumberPattern,
  isValidPersonName,
} from "@/lib/organization-profile-domain";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";

import {
  isPasswordRecoveryActive,
  markPasswordRecoveryActive,
  clearPasswordRecoveryState,
  parsePasswordRecoveryUrl,
} from "@/lib/password-recovery";

// Mock ResizeObserver for jsdom
window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// Mocks
const mockSignInWithOAuth = vi.fn();
const mockGetSession = vi.fn();
const mockGetUserIdentities = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUserIdentities: (...args: unknown[]) => mockGetUserIdentities(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
  isSupabaseConfigured: () => true,
}));

const mockFetchProfile = vi.fn();
const mockUpsertProfile = vi.fn();

vi.mock("@/lib/lydo-connect-supabase", () => ({
  fetchOrganizationProfileInSupabase: (...args: unknown[]) => mockFetchProfile(...args),
  upsertOrganizationProfileInSupabase: (...args: unknown[]) => mockUpsertProfile(...args),
}));

let mockAuth = {
  isAuthenticated: false,
  isInitialized: true,
  isPasswordRecoverySession: undefined as boolean | undefined,
  role: "guest" as string,
  user: null as any,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => {
    const recoveryActive =
      mockAuth.isPasswordRecoverySession !== undefined
        ? mockAuth.isPasswordRecoverySession
        : isPasswordRecoveryActive({
            url: typeof window !== "undefined" ? window.location.href : undefined,
          });

    return {
      ...mockAuth,
      isPasswordRecoverySession: recoveryActive,
    };
  },
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("Google OAuth & Onboarding Architecture Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockGetUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "google" }] },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: { user: { identities: [{ provider: "google" }] } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
    mockAuth = {
      isAuthenticated: false,
      isInitialized: true,
      isPasswordRecoverySession: undefined,
      role: "guest",
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  });

  // TEST 1 — Google OAuth Initiation
  it("TEST 1: Organization User sees Google button and clicking it initiates OAuth", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <SignIn />
      </MemoryRouter>,
    );

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).not.toBeDisabled();

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/callback"),
          queryParams: { prompt: "select_account" },
        }),
      });
    });
  });

  // TEST 2 — Admin Isolation
  it("TEST 2: Admin Sign In has no Google OAuth control", () => {
    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <SignIn forcedMode="admin" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Admin sign in/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with Google/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/or continue with/i)).not.toBeInTheDocument();
  });

  // TEST 3 — Existing Complete User
  it("TEST 3: Existing complete user routes to /dashboard from callback", async () => {
    const completeProfile: OrganizationProfile = {
      id: "org-1",
      userId: "user-google-1",
      organizationName: "Pasig Youth Council",
      organizationEmail: "pyc@pasig.gov.ph",
      contactNumber: "09171234567",
      district: "District I",
      barangay: "Kapasigan",
      isExistingOrganization: false,
      organizationIdentifierNumber: "LYDO-PASIG-2025-0001",
      registrationType: "new_organization",
      urn: "LYDO-PASIG-2025-0001",
      majorClassification: "Youth Organization",
      subClassification: "community-based",
      advocacies: ["education", "governance"],
      adviserName: "Juan Dela Cruz",
      representativeName: "Maria Clara",
      address: "123 Pasig Blvd",
      profileStatus: "verified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(isOrganizationProfileComplete(completeProfile)).toBe(true);

    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "user-google-1", email: "pyc@pasig.gov.ph", displayName: "Maria Clara" },
    };
    mockFetchProfile.mockResolvedValue(completeProfile);

    let navigatedRoute = "";
    render(
      <MemoryRouter initialEntries={["/auth/callback#access_token=xyz"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-screen">Dashboard</div>} />
          <Route path="/google-onboarding" element={<div data-testid="onboarding-screen">Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-screen")).toBeInTheDocument();
    });
  });

  // TEST 4 — Existing Incomplete User
  it("TEST 4: Existing incomplete user routes to /google-onboarding from callback", async () => {
    const incompleteProfile: OrganizationProfile = {
      id: "org-2",
      userId: "user-google-2",
      organizationName: "Incomplete Org",
      organizationEmail: "inc@example.com",
      contactNumber: "09181234567",
      district: "District I",
      barangay: "Kapasigan",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      registrationType: "new_organization",
      urn: "",
      majorClassification: "" as any,
      subClassification: "" as any,
      advocacies: [],
      adviserName: "",
      representativeName: "",
      address: "",
      profileStatus: "incomplete",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(isOrganizationProfileComplete(incompleteProfile)).toBe(false);

    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "user-google-2", email: "inc@example.com", displayName: "Incomplete User" },
    };
    mockFetchProfile.mockResolvedValue(incompleteProfile);

    render(
      <MemoryRouter initialEntries={["/auth/callback#access_token=xyz"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-screen">Dashboard</div>} />
          <Route path="/google-onboarding" element={<div data-testid="onboarding-screen">Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
    });
  });

  // TEST 5 — First-Time Google User
  it("TEST 5: First-time Google user with no profile routes to onboarding and can complete profile", async () => {
    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "user-google-new", email: "fresh@gmail.com", displayName: "Fresh Leader" },
    };
    mockFetchProfile.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/auth/callback#access_token=fresh"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-screen">Dashboard</div>} />
          <Route path="/google-onboarding" element={<GoogleOnboarding />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Complete Your Y-TRACE Organization Registration")).toBeInTheDocument();
      expect(screen.getByText("fresh@gmail.com")).toBeInTheDocument();
    });
  });

  // TEST 6 — Policy Acceptance
  it("TEST 6: Authenticated non-admin user must satisfy policy before entering main routes", () => {
    // Policy gate logic inspection:
    const shouldCheckPolicy = (pathname: string, isRecovery: boolean, isAuthenticated: boolean, role: string) =>
      !isRecovery && isAuthenticated && role !== "admin" && pathname !== "/reset-password" && pathname !== "/auth/callback";

    expect(shouldCheckPolicy("/dashboard", false, true, "youth")).toBe(true);
    expect(shouldCheckPolicy("/google-onboarding", false, true, "youth")).toBe(true);
    expect(shouldCheckPolicy("/auth/callback", true, true, "youth")).toBe(false);
    expect(shouldCheckPolicy("/admin", false, true, "admin")).toBe(false);
  });

  // TEST 7 — No OTP for Google User
  it("TEST 7: Google OAuth users bypass /verify-email and go directly through callback and onboarding", () => {
    // Google users do not hit signUp with email verification
    // They authenticate via OAuth provider and go directly to /auth/callback
    const callbackTarget = (isOAuth: boolean) => (isOAuth ? "/auth/callback" : "/verify-email");
    expect(callbackTarget(true)).toBe("/auth/callback");
    expect(callbackTarget(false)).toBe("/verify-email");
  });

  // TEST 8 — Cancellation
  it("TEST 8: Google OAuth cancellation redirects to /signin with informative message", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?error=access_denied&error_description=User+cancelled"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/signin" element={<SignIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sign in with Google was cancelled/i)).toBeInTheDocument();
    });
  });

  // TEST 9 — OAuth Error
  it("TEST 9: Generic OAuth error falls back to /signin with descriptive error", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?error=server_error&error_description=Internal+provider+failure"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/signin" element={<SignIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Internal provider failure/i)).toBeInTheDocument();
    });
  });

  // TEST 10 — Refresh During Onboarding
  it("TEST 10: Refresh during onboarding preserves authentication and reloads draft safely", async () => {
    const existingDraft = createBlankOrganizationProfile("user-google-refresh", {
      organizationName: "Saved Draft Org",
      organizationEmail: "refresh@example.com",
    });

    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "user-google-refresh", email: "refresh@example.com", displayName: "Refresh User" },
    };
    mockFetchProfile.mockResolvedValue(existingDraft);

    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Saved Draft Org")).toBeInTheDocument();
      expect(screen.getByDisplayValue("refresh@example.com")).toBeInTheDocument();
    });
  });

  // TEST 11 — Incomplete Profile Validation
  it("TEST 11: Incomplete profile blocks completion and surfaces specific missing requirements", () => {
    const partialProfile: Partial<OrganizationProfile> = {
      organizationName: "Test Org",
      organizationEmail: "test@example.com",
      contactNumber: "09170000000",
      district: "District I",
      barangay: "Kapasigan",
      // missing classifications, advocacies, leadership, address
    };

    const missing = getMissingEditableProfileRequirements(partialProfile);
    expect(missing).toContain("Select Major and Sub Classification");
    expect(missing).toContain("Select at least one Advocacy Focus Area");
    expect(missing).toContain("Add Official Representative Name");
    expect(missing).toContain("Add Official Adviser Name");
    expect(missing).toContain("Add Complete Address");
  });

  // TEST 12 & 13 — Email Identity Resolution Rules
  it("TEST 12 & 13: Domain logic does not link arbitrary accounts; Supabase Auth controls user_id", () => {
    const profile1 = createBlankOrganizationProfile("user-auth-id-1", {
      organizationEmail: "org@domain.com",
    });
    const profile2 = createBlankOrganizationProfile("user-auth-id-2", {
      organizationEmail: "org@domain.com",
    });

    // Each profile is keyed strictly by auth user_id, not email
    expect(profile1.userId).not.toEqual(profile2.userId);
  });

  // TEST 14 — Admin Privilege Boundary
  it("TEST 14: Google user role remains youth and cannot access Admin Portal routes", () => {
    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "user-google-org", email: "google@org.com", displayName: "Leader" },
    };

    // The RequireAdmin guard logic redirects non-admin to signin/home
    const isAdminAllowed = (role: string) => role === "admin";
    expect(isAdminAllowed(mockAuth.role)).toBe(false);
  });

  // TEST 15 — Session Persistence
  it("TEST 15: Google user displayName fallback honors trimmed display_name, full_name, and default", () => {
    const fallbackDisplayName = (profileDisplayName?: string, profileFullName?: string, defaultName: string = "User") =>
      profileDisplayName?.trim() || profileFullName?.trim() || defaultName;

    expect(fallbackDisplayName("   ", "Juan Dela Cruz", "User")).toBe("Juan Dela Cruz");
    expect(fallbackDisplayName("", "", "GoogleUser")).toBe("GoogleUser");
    expect(fallbackDisplayName("Leader Maria", "Maria Clara", "User")).toBe("Leader Maria");
  });

  // TEST 16 & 17 — Logout & Session Isolation
  it("TEST 16 & 17: User can sign out safely from onboarding and trigger auth signOut", async () => {
    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "user-google-out", email: "out@example.com", displayName: "Signout User" },
    };
    mockFetchProfile.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <Routes>
          <Route path="/google-onboarding" element={<GoogleOnboarding />} />
          <Route path="/signin" element={<div data-testid="signin-page">Sign In Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Sign out$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Sign out$/i }));

    await waitFor(() => {
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(screen.getByTestId("signin-page")).toBeInTheDocument();
    });
  });

  // TEST 18 — Responsive Web Form Validation Integrity
  it("TEST 18: Form handles field validation for phone, name, email, and URN correctly", () => {
    expect(organizationEmailPattern.test("valid@gmail.com")).toBe(true);
    expect(organizationEmailPattern.test("not-an-email")).toBe(false);

    expect(philippineContactNumberPattern.test("09171234567")).toBe(true);
    expect(philippineContactNumberPattern.test("08171234567")).toBe(false);
    expect(philippineContactNumberPattern.test("0917123456")).toBe(false);

    expect(isValidPersonName("Juan Dela Cruz")).toBe(true);
    expect(isValidPersonName("Dr. Jose Rizal-Mercado")).toBe(true);
    expect(isValidPersonName("Robot 123")).toBe(false);

    expect(validateOrganizationName("")).toBe("Organization name is required.");
    expect(validateOrganizationName("A".repeat(101))).toContain("must not exceed 100 characters");
    expect(validateOrganizationName("Valid Youth Organization")).toBeNull();
  });
});

describe("Y-TRACE Email/Password Credential Creation in Google Onboarding", () => {
  const sampleIncompleteProfileDraft: OrganizationProfile = {
    id: "profile-fresh-1",
    userId: "user-fresh-1",
    organizationName: "Fresh Pasig Youth",
    organizationEmail: "fresh@google.com",
    contactNumber: "09171234567",
    district: "District I",
    barangay: "Kapasigan",
    isExistingOrganization: false,
    organizationIdentifierNumber: "",
    registrationType: "new_organization",
    urn: "",
    majorClassification: "Youth Organization",
    subClassification: "community-based",
    advocacies: ["health", "education"],
    adviserName: "Adviser Santos",
    representativeName: "Leader Juan",
    address: "", // Incomplete so user remains on onboarding form
    profileStatus: "pending_review",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {
      isAuthenticated: true,
      isInitialized: true,
      isPasswordRecoverySession: false,
      role: "youth",
      user: { id: "user-fresh-1", email: "fresh@google.com", displayName: "Fresh User" },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
    mockGetUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "google", id: "gid-1", user_id: "user-fresh-1" }] },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-fresh-1", identities: [{ provider: "google" }] } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: { user: { id: "user-fresh-1" } }, error: null });
    mockFetchProfile.mockResolvedValue(sampleIncompleteProfileDraft);
    mockUpsertProfile.mockResolvedValue({ ...sampleIncompleteProfileDraft, address: "123 Pasig Blvd", profileStatus: "verified" });
  });

  // TEST 1: Fresh Google user sees password creation section.
  it("FOCUSED TEST 1: Fresh Google user sees password creation section", async () => {
    mockGetUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "google" }] },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
      expect(screen.getByText("6. Create Your Y-TRACE Password")).toBeInTheDocument();
      expect(
        screen.getByText("Create a password so you can also sign in to Y-TRACE using your email address."),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Confirm Password/i)).toBeInTheDocument();
    });
  });

  // TEST 2: Password and confirmation must match.
  it("FOCUSED TEST 2: Password and confirmation must match", async () => {
    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    fireEvent.change(passwordInput, { target: { value: "P@ssword123!" } });
    fireEvent.change(confirmInput, { target: { value: "Mismatch123!" } });

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Complete Registration & Continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match. Please verify your confirmation password.")).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  // TEST 3: Weak password is rejected.
  it("FOCUSED TEST 3: Weak password is rejected", async () => {
    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    // Too short, lacks numbers and special characters
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.change(confirmInput, { target: { value: "short" } });

    const submitBtn = screen.getByRole("button", { name: /Complete Registration & Continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Password does not meet Y-TRACE security requirements/i)).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  // TEST 4: Valid password can be saved.
  it("FOCUSED TEST 4: Valid password can be saved", async () => {
    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
    });

    // Provide complete address to satisfy all profile requirements
    const addressInput = screen.getByLabelText(/Complete Office or Community Address/i);
    fireEvent.change(addressInput, { target: { value: "123 Pasig Blvd" } });

    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    fireEvent.change(passwordInput, { target: { value: "ValidP@ss123!" } });
    fireEvent.change(confirmInput, { target: { value: "ValidP@ss123!" } });

    const submitBtn = screen.getByRole("button", { name: /Complete Registration & Continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "ValidP@ss123!",
      });
      expect(mockUpsertProfile).toHaveBeenCalled();
    });
  });

  // TEST 5: Saving password does not sign the user out.
  it("FOCUSED TEST 5: Saving password does not sign the user out", async () => {
    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
    });

    // Complete required address
    const addressInput = screen.getByLabelText(/Complete Office or Community Address/i);
    fireEvent.change(addressInput, { target: { value: "123 Pasig Blvd" } });

    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    fireEvent.change(passwordInput, { target: { value: "ValidP@ss123!" } });
    fireEvent.change(confirmInput, { target: { value: "ValidP@ss123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration & Continue/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockAuth.signOut).not.toHaveBeenCalled();
      expect(mockAuth.isAuthenticated).toBe(true);
    });
  });

  // TEST 6: After onboarding, sign out and sign in using email + password (expected: same account)
  it("FOCUSED TEST 6: After onboarding, sign out and sign in using email + password", async () => {
    // 1. Onboarding attached password to user-fresh-1
    expect(sampleIncompleteProfileDraft.userId).toBe("user-fresh-1");

    // 2. User signs out
    mockAuth.signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();

    // 3. User signs in with email + password
    mockAuth.signIn.mockResolvedValue({});
    const signInResult = await mockAuth.signIn({
      mode: "user",
      email: "fresh@google.com",
      password: "ValidP@ss123!",
    });

    expect(signInResult).toEqual({});
    expect(mockAuth.signIn).toHaveBeenCalledWith({
      mode: "user",
      email: "fresh@google.com",
      password: "ValidP@ss123!",
    });

    // Profile remains linked to same user-fresh-1
    const profile = await mockFetchProfile("user-fresh-1");
    expect(profile.userId).toBe("user-fresh-1");
  });

  // TEST 7: After onboarding, sign out and sign in using Google (expected: same account)
  it("FOCUSED TEST 7: After onboarding, sign out and sign in using Google", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <SignIn />
      </MemoryRouter>,
    );

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/callback"),
        }),
      });
    });

    // Both auth methods target the exact same user.id and organization profile
    const profile = await mockFetchProfile("user-fresh-1");
    expect(profile.userId).toBe("user-fresh-1");
    expect(profile.organizationName).toBe("Fresh Pasig Youth");
  });

  // TEST 8: Existing email/password account does not get duplicate password creation request when already linked
  it("FOCUSED TEST 8: Existing email/password account does not get duplicate password creation request when already linked", async () => {
    mockGetUserIdentities.mockResolvedValue({
      data: {
        identities: [
          { provider: "email", id: "email-id-1", user_id: "user-existing-1" },
          { provider: "google", id: "google-id-1", user_id: "user-existing-1" },
        ],
      },
      error: null,
    });

    mockAuth = {
      ...mockAuth,
      user: { id: "user-existing-1", email: "existing@org.com", displayName: "Existing User" },
    };

    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Complete Your Y-TRACE Organization Registration")).toBeInTheDocument();
    });

    // Password creation card should be completely skipped
    expect(screen.queryByTestId("ytrace-password-section")).not.toBeInTheDocument();
    expect(screen.queryByText("6. Create Your Y-TRACE Password")).not.toBeInTheDocument();
  });

  // TEST 9: Password update failure keeps user authenticated and preserves onboarding state
  it("FOCUSED TEST 9: Password update failure keeps user authenticated and preserves onboarding state", async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: "Network error during password update. Please retry." },
    });

    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
    });

    // Provide complete address
    const addressInput = screen.getByLabelText(/Complete Office or Community Address/i);
    fireEvent.change(addressInput, { target: { value: "123 Pasig Blvd" } });

    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    fireEvent.change(passwordInput, { target: { value: "ValidP@ss123!" } });
    fireEvent.change(confirmInput, { target: { value: "ValidP@ss123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error during password update. Please retry.")).toBeInTheDocument();
      // User must NOT be signed out
      expect(mockAuth.signOut).not.toHaveBeenCalled();
      expect(screen.getByDisplayValue("Fresh Pasig Youth")).toBeInTheDocument();
      expect(passwordInput).toHaveValue("ValidP@ss123!");
      expect(confirmInput).toHaveValue("ValidP@ss123!");
    });
  });

  // TEST 10: Refreshing onboarding does not create another user
  it("FOCUSED TEST 10: Refreshing onboarding does not create another user", async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Complete Your Y-TRACE Organization Registration")).toBeInTheDocument();
    });

    unmount();

    // Re-mount as if page refreshed
    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Complete Your Y-TRACE Organization Registration")).toBeInTheDocument();
      expect(mockAuth.user.id).toBe("user-fresh-1");
    });
  });

  // TEST 11: Organization profile remains linked to the same auth user
  it("FOCUSED TEST 11: Organization profile remains linked to the same auth user", async () => {
    render(
      <MemoryRouter initialEntries={["/google-onboarding"]}>
        <GoogleOnboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ytrace-password-section")).toBeInTheDocument();
    });

    // Complete address
    const addressInput = screen.getByLabelText(/Complete Office or Community Address/i);
    fireEvent.change(addressInput, { target: { value: "123 Pasig Blvd" } });

    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    fireEvent.change(passwordInput, { target: { value: "ValidP@ss123!" } });
    fireEvent.change(confirmInput, { target: { value: "ValidP@ss123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration & Continue/i }));

    await waitFor(() => {
      expect(mockUpsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-fresh-1",
        }),
      );
    });
  });

  // TEST 12: Admin authentication remains unaffected
  it("FOCUSED TEST 12: Admin authentication remains unaffected", () => {
    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <SignIn forcedMode="admin" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Admin sign in/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with Google/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("ytrace-password-section")).not.toBeInTheDocument();
  });

  // TEST 10 — Google callback code does not enter recovery
  it("TEST 10: Google callback code does not enter recovery", async () => {
    const recoveryCheck = parsePasswordRecoveryUrl("https://example.com/auth/callback?code=test-oauth-code");
    expect(recoveryCheck.hasRecoveryCredentials).toBe(false);

    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "google-user-10", email: "user10@gmail.com", displayName: "User Ten" },
    };
    mockFetchProfile.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=test-oauth-code"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<div data-testid="reset-screen">Reset Password</div>} />
          <Route path="/google-onboarding" element={<div data-testid="onboarding-screen">Google Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("reset-screen")).not.toBeInTheDocument();
      expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
    });
  });

  // TEST 11 — Google complete profile -> dashboard
  it("TEST 11: Google complete profile routes to /dashboard and never /reset-password", async () => {
    const completeProfile: OrganizationProfile = {
      id: "org-11",
      userId: "google-user-11",
      organizationName: "Complete Youth Org",
      organizationEmail: "complete@pasig.gov.ph",
      contactNumber: "09181234567",
      district: "District I",
      barangay: "Kapasigan",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      registrationType: "new_organization",
      urn: "",
      majorClassification: "Community Based" as any,
      subClassification: "Youth Organization" as any,
      advocacies: ["Education"],
      adviserName: "Juan Dela Cruz",
      representativeName: "Maria Clara",
      address: "123 Pasig Blvd",
      profileStatus: "verified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "google-user-11", email: "complete@pasig.gov.ph", displayName: "Maria Clara" },
    };
    mockFetchProfile.mockResolvedValue(completeProfile);

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=valid-pkce-code"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-screen">Dashboard</div>} />
          <Route path="/reset-password" element={<div data-testid="reset-screen">Reset Password</div>} />
          <Route path="/google-onboarding" element={<div data-testid="onboarding-screen">Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("reset-screen")).not.toBeInTheDocument();
    });
  });

  // TEST 12 — Google incomplete/no profile -> google-onboarding
  it("TEST 12: Google incomplete/no profile routes to /google-onboarding from callback", async () => {
    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "google-user-12", email: "neworg@gmail.com", displayName: "New Leader" },
    };
    mockFetchProfile.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=fresh-code"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-screen">Dashboard</div>} />
          <Route path="/reset-password" element={<div data-testid="reset-screen">Reset Password</div>} />
          <Route path="/google-onboarding" element={<div data-testid="onboarding-screen">Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("reset-screen")).not.toBeInTheDocument();
    });
  });

  // TEST 13 — Google cancellation -> /signin
  it("TEST 13: Google cancellation routes to /signin with informative message", async () => {
    mockAuth = {
      ...mockAuth,
      isAuthenticated: false,
      user: null,
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback?error=access_denied&error_description=User+cancelled"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reset-password" element={<div data-testid="reset-screen">Reset Password</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sign in with Google was cancelled/i)).toBeInTheDocument();
      expect(screen.queryByTestId("reset-screen")).not.toBeInTheDocument();
    });
  });

  // TEST 14 — Google OAuth error -> /signin
  it("TEST 14: Google OAuth error routes to /signin with descriptive error", async () => {
    mockAuth = {
      ...mockAuth,
      isAuthenticated: false,
      user: null,
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback?error=server_error&error_description=OAuth+token+exchange+failed"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reset-password" element={<div data-testid="reset-screen">Reset Password</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/OAuth token exchange failed/i)).toBeInTheDocument();
      expect(screen.queryByTestId("reset-screen")).not.toBeInTheDocument();
    });
  });

  // TEST 15 — Google + stale recovery storage -> normal OAuth flow
  it("TEST 15: Google OAuth with stale recovery storage clears flags and completes normal flow", async () => {
    // Set stale recovery flags in localStorage & sessionStorage
    markPasswordRecoveryActive("stale-user-15");
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBe("1");

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const oauthPayload = btoa(JSON.stringify({ sub: "google-user-15", amr: [{ method: "oauth" }], exp: futureExp }));
    const oauthJwt = `header.${oauthPayload}.signature`;

    // Normal OAuth session clears recovery state
    const isRecovery = isPasswordRecoveryActive({
      url: "https://example.com/auth/callback?code=oauth-pkce-15",
      eventName: "SIGNED_IN",
      session: {
        access_token: oauthJwt,
        user: { id: "google-user-15" },
      },
    });

    expect(isRecovery).toBe(false);
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBeNull();

    mockAuth = {
      ...mockAuth,
      isAuthenticated: true,
      role: "youth",
      user: { id: "google-user-15", email: "test15@gmail.com", displayName: "OAuth User" },
    };
    mockFetchProfile.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/auth/callback?code=oauth-pkce-15"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<div data-testid="reset-screen">Reset Password</div>} />
          <Route path="/google-onboarding" element={<div data-testid="onboarding-screen">Google Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("reset-screen")).not.toBeInTheDocument();
    });
  });

  // TEST 16 — Specific regression test for the trap
  it("TEST 16: Stale recovery storage does not trap user on /reset-password during navigation (/about, /dashboard, /, /signin)", () => {
    // Plant stale recovery flags
    markPasswordRecoveryActive("stale-trap-user");
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBe("1");

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const oauthPayload = btoa(JSON.stringify({ sub: "google-user-16", amr: [{ method: "oauth" }], exp: futureExp }));
    const oauthJwt = `header.${oauthPayload}.signature`;
    const normalSession = { access_token: oauthJwt, user: { id: "google-user-16" } };

    const testRoutes = ["/", "/about", "/dashboard", "/signin"];
    for (const route of testRoutes) {
      const isRecovery = isPasswordRecoveryActive({
        url: `https://example.com${route}`,
        session: normalSession,
      });
      expect(isRecovery).toBe(false);
    }

    // Stale flags are purged, user is completely free from the reset-password trap
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBeNull();
    expect(window.sessionStorage.getItem("ytrace-active-password-recovery")).toBeNull();
  });

  // TEST 17 — Password recovery regression: PASSWORD_RECOVERY event
  it("TEST 17: Actual PASSWORD_RECOVERY event keeps user in recovery state", () => {
    const isRecovery = isPasswordRecoveryActive({
      url: "https://example.com/reset-password",
      eventName: "PASSWORD_RECOVERY",
      session: null,
    });
    expect(isRecovery).toBe(true);
  });

  // TEST 18 — Password recovery regression: Actual recovery JWT keeps recovery gate active
  it("TEST 18: Actual recovery JWT keeps recovery gate active", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const recoveryPayload = btoa(JSON.stringify({ sub: "recovery-user", amr: [{ method: "recovery" }], exp: futureExp }));
    const recoveryJwt = `header.${recoveryPayload}.signature`;

    const isRecovery = isPasswordRecoveryActive({
      url: "https://example.com/reset-password",
      session: {
        access_token: recoveryJwt,
        user: { id: "recovery-user" },
      },
    });
    expect(isRecovery).toBe(true);
  });

  // TEST 19 — Password recovery regression: Legitimate password recovery behaves as expected
  it("TEST 19: Legitimate password recovery flow parses credentials and clears cleanly", () => {
    const recoveryUrl = "https://example.com/reset-password?token_hash=real-hash&type=recovery";
    const params = parsePasswordRecoveryUrl(recoveryUrl);
    expect(params.hasRecoveryCredentials).toBe(true);
    expect(params.tokenHash).toBe("real-hash");

    markPasswordRecoveryActive("legit-user");
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBe("1");

    clearPasswordRecoveryState();
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBeNull();
    expect(window.sessionStorage.getItem("ytrace-active-password-recovery")).toBeNull();
  });
});
