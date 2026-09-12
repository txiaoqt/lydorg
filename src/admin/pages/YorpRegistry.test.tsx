import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YorpRegistryPage } from "@/admin/pages/YorpRegistry";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import { writeAdminSession } from "@/lib/admin-auth";

// Mock resize observer and scrollIntoView for jsdom
window.ResizeObserver =
  window.ResizeObserver ||
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

describe("YorpRegistry Page Export Action", () => {
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

  it("renders the Export button in the page header and opens the Export dialog", async () => {
    render(
      <LydoConnectProvider>
        <YorpRegistryPage />
      </LydoConnectProvider>,
    );

    // Verify page header is rendered
    expect(screen.getByText("YORP Registry")).toBeInTheDocument();

    // Verify Export button is rendered in the header action area
    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();

    // Click Export button
    fireEvent.click(exportButton);

    // Verify Export dialog opens with YORP Registry title
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Export YORP Registry" })).toBeInTheDocument();
    expect(screen.getByText(/Export all YORP records matching the current search and filters/i)).toBeInTheDocument();
  });
});
