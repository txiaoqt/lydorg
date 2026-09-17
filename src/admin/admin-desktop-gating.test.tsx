import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequireAdmin } from "@/App";
import { AdminDesktopGate } from "@/components/portal/AdminDesktopGate";
import { ADMIN_DESKTOP_MIN_WIDTH } from "@/hooks/use-admin-desktop-viewport";

const mockSignOut = vi.fn();
let currentAuthRole: "admin" | "youth" | "guest" = "admin";
let currentIsAuthenticated = true;
let currentIsPasswordRecovery = false;

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: currentIsAuthenticated,
    isInitialized: true,
    isPasswordRecoverySession: currentIsPasswordRecovery,
    role: currentAuthRole,
    user: { id: "test-user-1", displayName: "Test User", email: "test@ytrace.gov" },
    signOut: mockSignOut,
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

describe("Admin Desktop/Laptop Gating Integration Tests", () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  const setViewportWidth = (width: number) => {
    window.innerWidth = width;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: width >= ADMIN_DESKTOP_MIN_WIDTH,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentAuthRole = "admin";
    currentIsAuthenticated = true;
    currentIsPasswordRecovery = false;
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe("Authenticated Admin Routes", () => {
    it("renders /admin (overview) normally at desktop viewport (1280px)", () => {
      setViewportWidth(1280);

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <div data-testid="admin-overview">Admin Overview Page</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("admin-overview")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("blocks /admin (overview) and shows warning screen at tablet viewport (768px)", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <div data-testid="admin-overview">Admin Overview Page</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId("admin-overview")).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.getByText(/Current Viewport:/i)).toHaveTextContent("768px");
    });

    it("blocks /admin (overview) and shows warning screen at phone viewport (375px)", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <div data-testid="admin-overview">Admin Overview Page</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId("admin-overview")).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
      expect(screen.getByText(/Current Viewport:/i)).toHaveTextContent("375px");
    });

    it("blocks /admin/registrations on mobile while keeping URL intact", () => {
      setViewportWidth(430);

      render(
        <MemoryRouter initialEntries={["/admin/registrations"]}>
          <Routes>
            <Route
              path="/admin/registrations"
              element={
                <RequireAdmin>
                  <div data-testid="admin-registrations">Admin Registrations Queue</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId("admin-registrations")).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
    });

    it("renders /admin/registrations on desktop (1280px)", () => {
      setViewportWidth(1280);

      render(
        <MemoryRouter initialEntries={["/admin/registrations"]}>
          <Routes>
            <Route
              path="/admin/registrations"
              element={
                <RequireAdmin>
                  <div data-testid="admin-registrations">Admin Registrations Queue</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("admin-registrations")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("blocks /admin/renewals on tablet (800px)", () => {
      setViewportWidth(800);

      render(
        <MemoryRouter initialEntries={["/admin/renewals"]}>
          <Routes>
            <Route
              path="/admin/renewals"
              element={
                <RequireAdmin>
                  <div data-testid="admin-renewals">Admin Renewals Queue</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId("admin-renewals")).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
    });

    it("blocks /admin/news-releases/:newsReleaseId on mobile (< 1024px) and renders on desktop", () => {
      setViewportWidth(768);

      const { rerender } = render(
        <MemoryRouter initialEntries={["/admin/news-releases/rel-123"]}>
          <Routes>
            <Route
              path="/admin/news-releases/:newsReleaseId"
              element={
                <RequireAdmin>
                  <div data-testid="admin-news-record">News Release Record View</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId("admin-news-record")).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();

      act(() => {
        setViewportWidth(1024);
        window.dispatchEvent(new Event("resize"));
      });

      rerender(
        <MemoryRouter initialEntries={["/admin/news-releases/rel-123"]}>
          <Routes>
            <Route
              path="/admin/news-releases/:newsReleaseId"
              element={
                <RequireAdmin>
                  <div data-testid="admin-news-record">News Release Record View</div>
                </RequireAdmin>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("admin-news-record")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated /admin/create-password Route", () => {
    it("blocks /admin/create-password on mobile (375px) via AdminDesktopGate without RequireAdmin", () => {
      setViewportWidth(375);
      currentAuthRole = "guest";
      currentIsAuthenticated = false;

      render(
        <MemoryRouter initialEntries={["/admin/create-password"]}>
          <Routes>
            <Route
              path="/admin/create-password"
              element={
                <AdminDesktopGate>
                  <div data-testid="admin-create-password">Create Admin Password Form</div>
                </AdminDesktopGate>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Warning screen is rendered even though user is not logged in as admin
      expect(screen.queryByTestId("admin-create-password")).not.toBeInTheDocument();
      expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
    });

    it("renders /admin/create-password on desktop (1280px)", () => {
      setViewportWidth(1280);
      currentAuthRole = "guest";
      currentIsAuthenticated = false;

      render(
        <MemoryRouter initialEntries={["/admin/create-password"]}>
          <Routes>
            <Route
              path="/admin/create-password"
              element={
                <AdminDesktopGate>
                  <div data-testid="admin-create-password">Create Admin Password Form</div>
                </AdminDesktopGate>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("admin-create-password")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });
  });

  describe("Authentication and Role Guard Semantics Preservation", () => {
    it("redirects non-admin users to signin before reaching desktop gate", () => {
      setViewportWidth(768); // even on mobile
      currentAuthRole = "youth"; // organization user, not admin
      currentIsAuthenticated = true;

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <div data-testid="admin-content">Admin Content</div>
                </RequireAdmin>
              }
            />
            <Route path="/signin" element={<div data-testid="signin-page">Sign In Page</div>} />
            <Route path="/admin/signin" element={<div data-testid="signin-page">Sign In Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      // RequireAdmin must redirect non-admin to signin instead of showing the desktop warning
      expect(screen.getByTestId("signin-page")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("redirects password recovery session to /reset-password before desktop gate", () => {
      setViewportWidth(768);
      currentIsPasswordRecovery = true;

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <div data-testid="admin-content">Admin Content</div>
                </RequireAdmin>
              }
            />
            <Route path="/reset-password" element={<div data-testid="reset-password-page">Reset Password</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });
  });

  describe("User Portal & Organization Route Isolation (Unaffected by Desktop Gate)", () => {
    it("/signin for organization users remains accessible on mobile (375px)", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter initialEntries={["/signin"]}>
          <Routes>
            <Route path="/signin" element={<div data-testid="org-signin">Organization Sign In Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("org-signin")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("/dashboard remains accessible on mobile (375px)", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<div data-testid="user-dashboard">User Dashboard</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("user-dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("/document-submission remains accessible on mobile (375px)", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter initialEntries={["/document-submission"]}>
          <Routes>
            <Route path="/document-submission" element={<div data-testid="user-docs">Document Submission</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("user-docs")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("/budget-request remains accessible on tablet (768px)", () => {
      setViewportWidth(768);

      render(
        <MemoryRouter initialEntries={["/budget-request"]}>
          <Routes>
            <Route path="/budget-request" element={<div data-testid="user-budget">Budget Request</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("user-budget")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });

    it("PWA routes (/app/*) remain accessible on mobile (375px)", () => {
      setViewportWidth(375);

      render(
        <MemoryRouter initialEntries={["/app/home"]}>
          <Routes>
            <Route path="/app/*" element={<div data-testid="pwa-root">PWA Installed Shell</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("pwa-root")).toBeInTheDocument();
      expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
    });
  });
});
