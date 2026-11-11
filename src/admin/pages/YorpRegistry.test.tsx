import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { YorpRegistryPage } from "@/admin/pages/YorpRegistry";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import { writeAdminSession } from "@/lib/admin-auth";

// Header and semester tests do not exercise the authenticated detail drawer.
vi.mock("@/admin/components/YorpRegistryDetailDrawer", () => ({
  YorpRegistryDetailDrawer: () => null,
}));

// Mock resize observer and scrollIntoView for jsdom
window.ResizeObserver =
  window.ResizeObserver ||
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

describe("YorpRegistry Page Header Actions & Period Filtering", () => {
  beforeEach(() => {
    writeAdminSession({
      id: "admin-demo",
      username: "lydoadmin",
      email: "lydoadmin@lydoconnect.local",
      displayName: "Admin User",
      sessionToken: "demo-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  });

  afterEach(() => {
    writeAdminSession(null);
  });

  it("renders the Year and Period selector inline with Export and Reports, defaulting to the current quarter", () => {
    render(
      <MemoryRouter>
        <LydoConnectProvider>
          <YorpRegistryPage />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("YORP Registry")).toBeInTheDocument();
    const now = new Date();
    expect(screen.getByLabelText("Year")).toHaveValue(String(now.getFullYear()));
    expect(screen.getByLabelText("Period")).toHaveValue(`q${Math.floor(now.getMonth() / 3) + 1}`);
    expect(screen.getByRole("button", { name: /^export$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reports/i })).toBeInTheDocument();
  });

  it("keeps Export disabled when the current filtered result has no rows", () => {
    render(
      <MemoryRouter>
        <LydoConnectProvider>
          <YorpRegistryPage />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    // Verify Export button is rendered in the header action area
    const exportButton = screen.getByRole("button", { name: /^export$/i });
    expect(exportButton).toBeInTheDocument();
    // Empty exports are intentionally unavailable because there is no filtered data to include.
    expect(exportButton).toBeDisabled();

    fireEvent.click(exportButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets the admin widen the registry to all years", () => {
    render(
      <MemoryRouter>
        <LydoConnectProvider>
          <YorpRegistryPage />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    const year = screen.getByLabelText("Year");
    expect(screen.getByRole("option", { name: "All Year" })).toBeInTheDocument();
    fireEvent.change(year, { target: { value: "all" } });
    expect(year).toHaveValue("all");
  });

  it("renders the Reports button in the page header and opens the Section 35 Quarterly Reports dialog", async () => {
    render(
      <MemoryRouter>
        <LydoConnectProvider>
          <YorpRegistryPage />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    // Verify Reports button is rendered in the header action area
    const reportsButton = screen.getByRole("button", { name: /reports/i });
    expect(reportsButton).toBeInTheDocument();
    expect(reportsButton).not.toBeDisabled();

    // Click Reports button
    fireEvent.click(reportsButton);

    // Verify Section 35 Quarterly Reports dialog opens
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/^YORP Quarterly Reports$/i)).toBeInTheDocument();
    expect(screen.getByText(/Quarterly Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Disaggregated Report/i)).toBeInTheDocument();
  });
});
