import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthCallback from "@/pages/AuthCallback";

const mockGetSession = vi.fn();
const mockFetchOrganizationProfile = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/lydo-connect-supabase", () => ({
  fetchOrganizationProfileInSupabase: (...args: unknown[]) => mockFetchOrganizationProfile(...args),
}));

let mockAuthState = {
  isAuthenticated: false,
  isInitialized: true,
  isPasswordRecoverySession: false,
  role: "user",
  user: null as any,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthState,
}));

const createMockJwt = (method: string) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "user-123",
      email: "test@gmail.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }],
    }),
  );
  return `${header}.${payload}.mock-signature`;
};

describe("Deleted Admin Invitee Lifecycle & AuthCallback Routing Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      isAuthenticated: true,
      isInitialized: true,
      isPasswordRecoverySession: false,
      role: "user",
      user: {
        id: "user-123",
        email: "formeradmin@gmail.com",
        invited_at: "2026-09-20T10:00:00.000000Z",
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TEST 1: Deleted admin Gmail account signing in with normal OAuth does NOT redirect to /admin/create-password, and routes to /google-onboarding when no profile exists", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: createMockJwt("oauth"),
          user: {
            id: "user-123",
            email: "formeradmin@gmail.com",
            invited_at: "2026-09-20T10:00:00.000000Z",
          },
        },
      },
    });
    mockFetchOrganizationProfile.mockResolvedValue(null);

    let currentPath = "/auth/callback";
    const LocationTracker = ({ path }: { path: string }) => {
      currentPath = path;
      return <div data-testid="target-route">{path}</div>;
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/admin/create-password" element={<LocationTracker path="/admin/create-password" />} />
          <Route path="/google-onboarding" element={<LocationTracker path="/google-onboarding" />} />
          <Route path="/dashboard" element={<LocationTracker path="/dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(currentPath).toBe("/google-onboarding");
    });
    expect(currentPath).not.toBe("/admin/create-password");
  });

  it("TEST 2: Deleted admin Gmail account signing in with normal OAuth routes to /dashboard when profile is complete", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: createMockJwt("oauth"),
          user: {
            id: "user-123",
            email: "formeradmin@gmail.com",
            invited_at: "2026-09-20T10:00:00.000000Z",
          },
        },
      },
    });
    mockFetchOrganizationProfile.mockResolvedValue({
      id: "profile-1",
      userId: "user-123",
      organizationName: "Youth Org",
      organizationEmail: "formeradmin@gmail.com",
      contactNumber: "09171234567",
      district: "District 1",
      barangay: "Kapitolyo",
      majorClassification: "Community-Based",
      subClassification: "Youth Organization",
      advocacies: ["Education"],
      adviserName: "Adviser One",
      representativeName: "Leader One",
      address: "123 Pasig City",
      isExistingOrganization: false,
    });

    let currentPath = "/auth/callback";
    const LocationTracker = ({ path }: { path: string }) => {
      currentPath = path;
      return <div data-testid="target-route">{path}</div>;
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/admin/create-password" element={<LocationTracker path="/admin/create-password" />} />
          <Route path="/google-onboarding" element={<LocationTracker path="/google-onboarding" />} />
          <Route path="/dashboard" element={<LocationTracker path="/dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(currentPath).toBe("/dashboard");
    });
    expect(currentPath).not.toBe("/admin/create-password");
  });

  it("TEST 3: Genuine admin invitation link with explicit query param (type=invite) routes to /admin/create-password", async () => {
    let currentPath = "/auth/callback";
    const LocationTracker = ({ path }: { path: string }) => {
      currentPath = path;
      return <div data-testid="target-route">{path}</div>;
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback?type=invite&token=abc"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/admin/create-password" element={<LocationTracker path="/admin/create-password" />} />
          <Route path="/dashboard" element={<LocationTracker path="/dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(currentPath).toBe("/admin/create-password");
    });
  });

  it("TEST 4: Genuine admin invitation session with invite JWT routes to /admin/create-password", async () => {
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: false,
    };
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: createMockJwt("invite"),
          user: {
            id: "admin-shadow-id",
            email: "invitedadmin@gmail.com",
            invited_at: "2026-09-26T00:00:00.000000Z",
          },
        },
      },
    });

    let currentPath = "/auth/callback";
    const LocationTracker = ({ path }: { path: string }) => {
      currentPath = path;
      return <div data-testid="target-route">{path}</div>;
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/admin/create-password" element={<LocationTracker path="/admin/create-password" />} />
          <Route path="/dashboard" element={<LocationTracker path="/dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(currentPath).toBe("/admin/create-password");
    });
  });

  it("TEST 5: Password recovery session with type=recovery routes to /reset-password", async () => {
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: false,
      isPasswordRecoverySession: true,
    };

    let currentPath = "/auth/callback";
    const LocationTracker = ({ path }: { path: string }) => {
      currentPath = path;
      return <div data-testid="target-route">{path}</div>;
    };

    render(
      <MemoryRouter initialEntries={["/auth/callback?type=recovery"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<LocationTracker path="/reset-password" />} />
          <Route path="/admin/create-password" element={<LocationTracker path="/admin/create-password" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(currentPath).toBe("/reset-password");
    });
    expect(currentPath).not.toBe("/admin/create-password");
  });
});
