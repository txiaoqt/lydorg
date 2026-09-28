import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Navbar Component - Restored Mobile Hamburger Navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      signOut: vi.fn(),
      role: "user",
    });
  });

  it("renders brand logo with link to home", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const logo = screen.getByAltText("Y-TRACE");
    expect(logo).toBeInTheDocument();
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders hamburger toggle button with correct accessibility label", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    expect(hamburger).toBeInTheDocument();
  });

  it("opens mobile navigation panel when hamburger is clicked and renders all nav links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(hamburger);

    expect(screen.getByRole("button", { name: /Close navigation menu/i })).toBeInTheDocument();

    // Verify all 6 nav items exist inside mobile menu (Contacts removed)
    expect(screen.getAllByRole("link", { name: /Home/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /About/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Budget Transparency/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Forms & Templates/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /News Releases/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /FAQs/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("link", { name: /Contacts/i })).toBeNull();
  });

  it("renders authentication CTA buttons and Pasig City Youth Development Portal label in mobile menu", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(hamburger);

    const signInLinks = screen.getAllByRole("link", { name: /Sign In/i });
    const signUpLinks = screen.getAllByRole("link", { name: /Create an Account/i });

    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signUpLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pasig City Youth Development Portal")).toBeInTheDocument();
  });

  it("closes mobile menu when clicking close X button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(hamburger);

    const closeButton = screen.getByRole("button", { name: /Close navigation menu/i });
    fireEvent.click(closeButton);

    expect(screen.getByRole("button", { name: /Open navigation menu/i })).toBeInTheDocument();
  });

  it("closes mobile menu when pressing Escape key", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(hamburger);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /Open navigation menu/i })).toBeInTheDocument();
  });

  it("renders portal link and Sign Out in mobile menu when user is authenticated", () => {
    const mockSignOut = vi.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      signOut: mockSignOut,
      role: "admin",
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(hamburger);

    const portalLinks = screen.getAllByRole("link", { name: /Admin Portal/i });
    const signOutButtons = screen.getAllByRole("button", { name: /Sign Out/i });

    expect(portalLinks.length).toBeGreaterThanOrEqual(1);
    expect(signOutButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(signOutButtons[0]);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
