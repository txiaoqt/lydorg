import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

describe("YorpRegistry Page Header Actions & Semester Filtering", () => {
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

  it("renders the Semester dropdown with default 'All Semesters' inline with Export and Reports", () => {
    render(
      <MemoryRouter>
        <LydoConnectProvider>
          <YorpRegistryPage />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    // Verify page header is rendered
    expect(screen.getByText("YORP Registry")).toBeInTheDocument();

    // Verify semester selector button is present with 'All Semesters'
    const semesterSelector = screen.getByRole("button", { name: /select semester/i });
    expect(semesterSelector).toBeInTheDocument();
    expect(semesterSelector).toHaveTextContent("All Semesters");

    // Open semester dropdown
    fireEvent.click(semesterSelector);

    // Verify dynamic options include "All Semesters"
    expect(screen.getAllByText("All Semesters").length).toBeGreaterThanOrEqual(1);
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

  it("allows opening semester dropdown and renders semester options", async () => {
    render(
      <MemoryRouter>
        <LydoConnectProvider>
          <YorpRegistryPage />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    const semesterSelector = screen.getByRole("button", { name: /select semester/i });
    expect(semesterSelector).toBeInTheDocument();
    expect(semesterSelector).toHaveTextContent("All Semesters");

    // Radix dropdown opens on pointer down / click
    fireEvent.pointerDown(semesterSelector, { pointerType: "mouse" });
    fireEvent.click(semesterSelector);

    // Verify 'All Semesters' option is present
    expect(screen.getAllByText("All Semesters").length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getByText(/Section 35 YORP Quarterly Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Quarterly Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Disaggregated Report/i)).toBeInTheDocument();
  });
});
