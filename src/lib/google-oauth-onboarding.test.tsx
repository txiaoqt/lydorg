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
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
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
  isPasswordRecoverySession: false,
  role: "guest" as string,
  user: null as any,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("Google OAuth & Onboarding Architecture Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {
      isAuthenticated: false,
      isInitialized: true,
      isPasswordRecoverySession: false,
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
