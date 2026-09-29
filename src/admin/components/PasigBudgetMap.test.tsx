import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CANONICAL_PASIG_BARANGAYS } from "@/lib/pasig-districts";
import { PasigBudgetMap } from "@/admin/components/PasigBudgetMap";

vi.mock("react-leaflet", () => ({
  GeoJSON: () => null,
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({ fitBounds: vi.fn(), getContainer: () => document.createElement("div"), invalidateSize: vi.fn(), eachLayer: vi.fn() }),
}));

const boundaryFixture = {
  type: "FeatureCollection",
  features: CANONICAL_PASIG_BARANGAYS.map(({ name }, index) => ({
    type: "Feature",
    properties: { barangay: name },
    geometry: { type: "Polygon", coordinates: [[[121 + index / 100, 14.5], [121 + index / 100 + 0.01, 14.5], [121 + index / 100 + 0.01, 14.51], [121 + index / 100, 14.5]]] },
  })),
};

const formatPesoAmount = (amount: number) => `₱${amount.toFixed(2)}`;

describe("PasigBudgetMap", () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("shows the approved and liquidation status totals and keeps barangays browseable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => boundaryFixture }));
    const onViewOrganization = vi.fn();
    render(
      <PasigBudgetMap
        rows={[{
          district: "District I",
          barangay: "Bagong Ilog",
          organizationCount: 2,
          releasedBudgetCount: 3,
          approvedAmount: 100000,
          releasedAmount: 90000,
          liquidatedAmount: 30000,
          overdueAmount: 20000,
        }]}
        organizationRows={[{
          organizationId: "org-1",
          urn: "URN-1",
          organizationName: "Y-TRACE Youth Organization",
          majorClassification: "Youth-Serving Organization",
          barangay: "Bagong Ilog",
          totalRequested: 100000,
          totalReleased: 90000,
          totalLiquidated: 30000,
        }]}
        formatPesoAmount={formatPesoAmount}
        selectedDistrict="all"
        selectedBarangay="all"
        fiscalPeriodLabel="FY 2026"
        onViewOrganization={onViewOrganization}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Browse by Barangay" })).toBeInTheDocument();
    const cityMapLink = screen.getByRole("link", { name: "View Pasig City boundaries on Google Maps (opens in a new tab)" });
    expect(cityMapLink).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Pasig%20City%20boundaries%2C%20Philippines");
    expect(cityMapLink).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Approved budget")).toBeInTheDocument();
    expect(screen.getAllByText("Liquidated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Released").length).toBeGreaterThan(0);
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Population · 2024" })).not.toBeInTheDocument();
    expect(screen.queryByText("Released per resident")).not.toBeInTheDocument();
    const transparentFillButton = screen.getByRole("button", { name: "Transparent fill for selected barangay" });
    expect(transparentFillButton).toBeDisabled();

    const barangayButton = within(await screen.findByRole("list")).getByRole("button", { name: /Bagong Ilog/ });
    fireEvent.click(barangayButton);

    expect(screen.getByRole("heading", { name: /^Organizations in Bagong Ilog/ })).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(barangayButton).toHaveAttribute("aria-pressed", "true");
    expect(transparentFillButton).toBeEnabled();
    fireEvent.click(transparentFillButton);
    expect(transparentFillButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(transparentFillButton);
    expect(transparentFillButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: /Y-TRACE Youth Organization/ }));
    expect(onViewOrganization).toHaveBeenCalledWith("org-1");

    fireEvent.click(barangayButton);
    expect(barangayButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: "Select a barangay" })).toBeInTheDocument();
  });

  it("does not draw partial boundaries when fewer than all canonical barangays are present", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...boundaryFixture, features: boundaryFixture.features.slice(0, 24) }),
    }));
    render(
      <PasigBudgetMap
        rows={[]}
        organizationRows={[]}
        formatPesoAmount={formatPesoAmount}
        selectedDistrict="all"
        selectedBarangay="all"
        fiscalPeriodLabel="FY 2026"
        onViewOrganization={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("24 of 30 canonical barangays"));
    expect(screen.getByRole("button", { name: "Retry map" })).toBeInTheDocument();
  });
});
