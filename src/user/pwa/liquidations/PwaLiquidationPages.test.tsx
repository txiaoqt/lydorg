import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PwaLiquidationDetail, PwaLiquidationEligibilityNotice, PwaLiquidationList } from "./PwaLiquidationPages";
import { certificateInput } from "@/test/fixtures/liquidation-certificate";
import { loadOrganizationLiquidationReportById, loadOrganizationLiquidationReportFiles } from "@/lib/lydo-connect-supabase";

const mockNavigate = vi.fn();

vi.mock("../hooks/usePwaNavigation", () => ({
  usePwaNavigation: () => ({
    go: mockNavigate,
  }),
}));

vi.mock("@/lib/lydo-connect-supabase", () => ({
  createLiquidationReportFileInSupabase: vi.fn(),
  deleteLiquidationReportFileInSupabase: vi.fn(),
  loadOrganizationLiquidationReportById: vi.fn(),
  loadOrganizationLiquidationReportFiles: vi.fn(),
  loadOrganizationLiquidationReportPage: vi.fn().mockResolvedValue({ rows: [], totalCount: 0, totalPages: 1 }),
  updateLiquidationReportInSupabase: vi.fn(),
}));

describe("PwaLiquidationPages - Amber Eligibility Notice Alignment", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const createMockData = (eligible: boolean, reports: any[] = []) => ({
    profile: { id: "org-1", profileStatus: "under_review" },
    budgetEligibility: { eligible: false, reason: "needs_verification" },
    liquidationReports: reports,
    budgetRequests: [],
    liquidationWorkflowEligibility: {
      eligible,
      releasedBudget: null,
      requirements: [
        { id: "profile", label: "Complete organization profile", met: false },
        { id: "registration", label: "Organization verified", met: false },
        { id: "budget_released", label: "Budget approved and released", met: false },
        { id: "liquidation", label: "Liquidation report available", met: false },
      ],
    },
  } as any);

  it("renders PwaLiquidationEligibilityNotice with amber pwa-eligibility-notice class and requirements when ineligible", () => {
    const data = createMockData(false);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PwaLiquidationEligibilityNotice data={data} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const noticeSection = document.querySelector(".pwa-eligibility-notice");
    expect(noticeSection).toBeInTheDocument();
    expect(noticeSection?.classList.contains("pwa-eligibility-notice")).toBe(true);

    expect(screen.getByText("No liquidation report is available yet")).toBeInTheDocument();
    expect(
      screen.getByText("Liquidation becomes available after an eligible budget is approved and released.")
    ).toBeInTheDocument();
    expect(screen.getByText("Complete organization profile")).toBeInTheDocument();
    expect(screen.getByText("Organization verified")).toBeInTheDocument();
    expect(screen.getByText("Budget approved and released")).toBeInTheDocument();
    expect(screen.getByText("Liquidation report available")).toBeInTheDocument();

    const actionBtn = screen.getByRole("button", { name: /View Registration Status/i });
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/app/profile");
  });

  it("renders PwaLiquidationList with amber notice and empty copy card aligned with budget list UI", () => {
    const data = createMockData(false);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PwaLiquidationList data={data} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify amber notice is present
    const noticeSection = document.querySelector(".pwa-eligibility-notice");
    expect(noticeSection).toBeInTheDocument();

    // Verify empty copy card is present
    expect(screen.getByText("No liquidation reports have been created yet.")).toBeInTheDocument();
    expect(document.querySelector(".pwa-empty-copy")).toBeInTheDocument();
  });

  it("does not render amber notice when liquidation is eligible", () => {
    const data = createMockData(true);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PwaLiquidationEligibilityNotice data={data} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(document.querySelector(".pwa-eligibility-notice")).toBeNull();
  });

  it("offers the same certificate in the completed PWA report detail", async () => {
    const input = certificateInput();
    const data = {
      ...createMockData(true), profile: input.organization,
      liquidationReports: [input.report], budgetRequests: [input.budget],
      store: { state: { liquidationReportFiles: [] } },
    } as any;
    vi.mocked(loadOrganizationLiquidationReportById).mockResolvedValue(input.report as any);
    vi.mocked(loadOrganizationLiquidationReportFiles).mockResolvedValue([]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/app/liquidations/${input.report.id}`]}>
        <Routes><Route path="/app/liquidations/:reportId" element={<PwaLiquidationDetail data={data} />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>);
    expect(await screen.findByRole("button", { name: "Download certificate of budget liquidation" })).toBeEnabled();
    expect(screen.getByText("Congratulations! Your budget has been successfully liquidated.")).toBeInTheDocument();
  });
});
