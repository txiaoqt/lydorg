import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YorpSampleDataSeedingPanel } from "./components/YorpSampleDataSeedingPanel";
import * as lydoConnectSupabase from "@/lib/lydo-connect-supabase";

vi.mock("@/lib/lydo-connect-supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/lydo-connect-supabase")>("@/lib/lydo-connect-supabase");
  return {
    ...actual,
    adminAuthorizeYorpSampleDatasetSeedInSupabase: vi.fn(),
    adminGetYorpSampleDatasetStatusInSupabase: vi.fn(),
    adminSeedYorpSampleDatasetInSupabase: vi.fn(),
    adminCleanupYorpSampleDatasetInSupabase: vi.fn(),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const mockDatasetStatus: lydoConnectSupabase.YorpSampleDatasetStatus = {
  is_development_or_test_environment: true,
  seed_batch: "PCYDO-YORP-2024-2026",
  total_seeded_organizations: 84,
  expected_total: 84,
  year_breakdown: {
    "2024": 31,
    "2025": 47,
    "2026": 6,
  },
  budget_breakdown: {
    awaiting_release: 30,
    budget_released: 25,
    completed: 29,
    liquidated_reports: 29,
  },
  registration_breakdown: {
    packets: 84,
    document_records: 504,
    required_documents_per_organization: 6,
    organizations_complete: 84,
    missing_requirements: 0,
    duplicate_requirements: 0,
    mapped_seed_assets: 6,
    asset_mapping_complete: true,
    renewal_test_organization_excluded: true,
  },
  last_seeded_at: "2026-09-29T15:00:00Z",
};

describe("YorpSampleDataSeedingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lydoConnectSupabase.adminAuthorizeYorpSampleDatasetSeedInSupabase).mockResolvedValue();
    vi.mocked(lydoConnectSupabase.adminGetYorpSampleDatasetStatusInSupabase).mockResolvedValue(mockDatasetStatus);
  });

  it("renders PCYDO YORP sample dataset panel with accurate counts and warning", async () => {
    render(<YorpSampleDataSeedingPanel />);

    expect(screen.getByText("PCYDO YORP Sample Dataset")).toBeInTheDocument();
    const disclosure = screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/TEST DATA ONLY/i)).not.toBeInTheDocument();
    fireEvent.click(disclosure);

    expect(screen.getByText(/PUP CCIS_Pasig City YORP Data 2024–2026/i)).toBeInTheDocument();
    expect(screen.getByText(/TEST DATA ONLY — THIS OPERATION IS DISABLED IN PRODUCTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Renewal Test Organization is explicitly excluded/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("84 / 84 Complete")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/2024:\s*31/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2025:\s*47/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2026:\s*6/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders zero counts only after a successful zero-status response", async () => {
    vi.mocked(lydoConnectSupabase.adminGetYorpSampleDatasetStatusInSupabase).mockResolvedValue({
      ...mockDatasetStatus,
      total_seeded_organizations: 0,
      budget_breakdown: {
        awaiting_release: 0,
        budget_released: 0,
        completed: 0,
        liquidated_reports: 0,
      },
      registration_breakdown: {
        ...mockDatasetStatus.registration_breakdown!,
        packets: 0,
        document_records: 0,
        organizations_complete: 0,
      },
    });

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));

    await waitFor(() => expect(screen.getByText("Not Seeded")).toBeInTheDocument());
    expect(screen.getByText((_, element) => element?.tagName === "DD" && element.textContent?.includes("seeded") === true)).toHaveTextContent("0 seeded");
    expect(screen.getByText("0 / 84 complete")).toBeInTheDocument();
    expect(screen.getByText("0 packets")).toBeInTheDocument();
    expect(screen.getByText("0 file records")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "DD" && element.textContent?.includes("requests") === true)).toHaveTextContent("0 requests");
    expect(screen.getByText(/0 awaiting/)).toBeInTheDocument();
    expect(screen.getByText(/0 released/)).toBeInTheDocument();
    expect(screen.getByText(/0 liquidated/)).toBeInTheDocument();
  });

  it("shows status unavailable and keeps destructive/reconstructive actions disabled on RPC failure", async () => {
    const rpcError = new Error("Admin account is not authorized.");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lydoConnectSupabase.adminGetYorpSampleDatasetStatusInSupabase).mockRejectedValue(rpcError);

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));

    expect(await screen.findByRole("button", { name: /Status unavailable/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to retrieve the current dataset status. Refresh to try again.");
    expect(screen.queryByText(/0 seeded/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 packets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 file records/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 requests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 liquidated/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seed Dataset" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cleanup Seeded Data/i })).toBeDisabled();
    expect(consoleError).toHaveBeenCalledWith("Failed to load YORP sample dataset status:", rpcError);

    consoleError.mockRestore();
  });

  it("retries the status RPC when Refresh is clicked after a failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lydoConnectSupabase.adminGetYorpSampleDatasetStatusInSupabase)
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(mockDatasetStatus);

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));

    expect(await screen.findByRole("button", { name: /Status unavailable/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(screen.getByText("84 / 84 Complete")).toBeInTheDocument());
    expect(lydoConnectSupabase.adminGetYorpSampleDatasetStatusInSupabase).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("verifies server-side Super Admin access before enabling Seed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lydoConnectSupabase.adminAuthorizeYorpSampleDatasetSeedInSupabase)
      .mockRejectedValueOnce(new Error("Only a Super Admin can seed the YORP sample dataset."));

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));

    await waitFor(() => {
      expect(lydoConnectSupabase.adminAuthorizeYorpSampleDatasetSeedInSupabase).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: /Reseed \/ Repair Dataset/i })).toBeDisabled();
    });
    expect(lydoConnectSupabase.adminSeedYorpSampleDatasetInSupabase).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("toggles the dataset preview table with search and filters", async () => {
    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));
    await waitFor(() => {
      expect(screen.getByText("84 / 84 Complete")).toBeInTheDocument();
    });

    const previewButton = screen.getByRole("button", { name: /Preview Dataset/i });
    fireEvent.click(previewButton);

    expect(screen.getByText(/Authoritative PCYDO YORP Sample Records/i)).toBeInTheDocument();
    expect(screen.getByText("SANTA CRUZ VOLLEYBALL CLUB")).toBeInTheDocument();

    const hideButton = screen.getByRole("button", { name: /Hide Preview/i });
    fireEvent.click(hideButton);

    expect(screen.queryByText(/Authoritative PCYDO YORP Sample Records/i)).not.toBeInTheDocument();
  });

  it("triggers seed RPC when clicking Seed / Reseed button", async () => {
    vi.mocked(lydoConnectSupabase.adminSeedYorpSampleDatasetInSupabase).mockResolvedValue({
      success: true,
      batch_name: "PCYDO-YORP-2024-2026",
      total_records: 84,
      created_count: 84,
      updated_count: 0,
      year_breakdown: { "2024": 31, "2025": 47, "2026": 6 },
      organizations: 84,
      registration_packets: 84,
      document_records: 504,
      organizations_document_complete: 84,
      missing_requirements: 0,
      duplicate_requirements: 0,
      budget_requests: 84,
      awaiting_release: 28,
      released: 56,
      liquidated: 28,
      renewal_test_organization_excluded: true,
      timestamp: "2026-09-29T15:00:00Z",
    });

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));

    await waitFor(() => {
      expect(screen.getByText("84 / 84 Complete")).toBeInTheDocument();
    });

    const seedButton = screen.getByRole("button", { name: /Reseed \/ Repair Dataset/i });
    fireEvent.click(seedButton);

    await waitFor(() => {
      expect(lydoConnectSupabase.adminSeedYorpSampleDatasetInSupabase).toHaveBeenCalledWith();
    });
  });

  it("requires confirmation before executing cleanup RPC", async () => {
    vi.mocked(lydoConnectSupabase.adminCleanupYorpSampleDatasetInSupabase).mockResolvedValue({
      success: true,
      batch_name: "PCYDO-YORP-2024-2026",
      deleted_organizations: 84,
      deleted_budget_requests: 84,
      deleted_liquidations: 29,
      deleted_users: 84,
      storage_seed_assets_deleted: 0,
      renewal_test_organization_excluded: true,
      timestamp: "2026-09-29T15:05:00Z",
    });

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Cleanup Seeded Data/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Cleanup Seeded Data/i }));

    expect(screen.getByText(/Remove generated PCYDO YORP sample data\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Historical audit and notification history is not restored/i)).toBeInTheDocument();
    expect(screen.getByText(/8170959f-2bb8-40ea-8ce8-31deb514de17/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Remove seeded records/i }));

    await waitFor(() => {
      expect(lydoConnectSupabase.adminCleanupYorpSampleDatasetInSupabase).toHaveBeenCalledWith();
    });
  });

  it("prevents cleanup until every active registration requirement has a mapped seed file", async () => {
    vi.mocked(lydoConnectSupabase.adminGetYorpSampleDatasetStatusInSupabase).mockResolvedValue({
      ...mockDatasetStatus,
      registration_breakdown: {
        ...mockDatasetStatus.registration_breakdown!,
        mapped_seed_assets: 5,
        asset_mapping_complete: false,
      },
    });

    render(<YorpSampleDataSeedingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /PCYDO YORP Sample Dataset/i }));
    await waitFor(() => expect(screen.getByText(/Reseed and cleanup are paused/i)).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Reseed \/ Repair Dataset/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cleanup Seeded Data/i })).toBeDisabled();
  });
});
