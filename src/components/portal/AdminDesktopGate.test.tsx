import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDesktopGate } from "./AdminDesktopGate";
import { ADMIN_DESKTOP_MIN_WIDTH } from "@/hooks/use-admin-desktop-viewport";

const mockSignOut = vi.fn();
let mockAuthValue = {
  isAuthenticated: true,
  isInitialized: true,
  isPasswordRecoverySession: false,
  role: "admin" as const,
  user: { id: "admin-1", displayName: "Admin User", email: "admin@ytrace.gov" },
  signOut: mockSignOut,
  signIn: vi.fn(),
  signUp: vi.fn(),
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthValue,
}));

describe("AdminDesktopGate Component", () => {
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
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("renders children on supported desktop viewport (1280px)", () => {
    setViewportWidth(1280);

    render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
  });

  it("renders children on exact threshold boundary (1024px)", () => {
    setViewportWidth(1024);

    render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
  });

  it("blocks Admin UI and renders warning screen on tablet viewport (768px)", () => {
    setViewportWidth(768);

    render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The Y-TRACE Admin Portal is designed for desktop and laptop computers to support detailed data tables/i,
      ),
    ).toBeInTheDocument();
  });

  it("blocks Admin UI and renders warning screen on mobile viewport (375px)", () => {
    setViewportWidth(375);

    render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
  });

  it("displays current viewport width in the status indicator", () => {
    setViewportWidth(768);

    render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Current Viewport:/i)).toHaveTextContent("768px");
    expect(screen.getByText(/Required: ≥ 1024px/i)).toBeInTheDocument();
  });

  it("switches dynamically from warning screen to Admin content on window resize (768px -> 1280px)", () => {
    setViewportWidth(768);

    const { rerender } = render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();

    act(() => {
      setViewportWidth(1280);
      window.dispatchEvent(new Event("resize"));
    });

    rerender(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.queryByText("Desktop Display Required")).not.toBeInTheDocument();
  });

  it("switches dynamically from Admin content to warning screen on window resize (1280px -> 800px)", () => {
    setViewportWidth(1280);

    const { rerender } = render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();

    act(() => {
      setViewportWidth(800);
      window.dispatchEvent(new Event("resize"));
    });

    rerender(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();
  });

  it("verifies the warning screen contains strictly no interactive action buttons, links, or controls (purely informational)", () => {
    setViewportWidth(768);

    render(
      <MemoryRouter>
        <AdminDesktopGate>
          <div data-testid="admin-content">Admin Dashboard Content</div>
        </AdminDesktopGate>
      </MemoryRouter>,
    );

    expect(screen.getByText("Desktop Display Required")).toBeInTheDocument();

    // Purely informational — strictly NO interactive action buttons, links, or navigation
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/back to home/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
  });
});
