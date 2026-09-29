import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetMonitoringSummaryCard } from "./BudgetMonitoringSummaryCard";

describe("BudgetMonitoringSummaryCard", () => {
  it("uses canonical labels and calculates Remaining Headroom from approved commitments", () => {
    render(
      <BudgetMonitoringSummaryCard
        fiscalYearLabel="FY 2026"
        annualAllocation={100}
        totalApproved={60}
        totalReleased={20}
        totalLiquidated={10}
        onManageRequests={vi.fn()}
      />,
    );

    expect(screen.getAllByText("FY Budget Allocation").length).toBeGreaterThan(0);
    expect(screen.getByText("Approved / Committed")).toBeInTheDocument();
    expect(screen.getByText("Released Budget")).toBeInTheDocument();
    expect(screen.getByText("Liquidated Budget")).toBeInTheDocument();
    expect(screen.getAllByText("Remaining Headroom").length).toBeGreaterThan(0);
    expect(screen.queryByText("Available")).toBeNull();
    expect(screen.getByText("Budget Execution Pipeline · FY 2026")).toBeInTheDocument();
    const track = screen.getByRole("img", { name: /Budget execution pipeline/ });
    const widths = Array.from(track.querySelectorAll<HTMLElement>("[data-budget-state]"), (segment) => parseFloat(segment.style.width));
    expect(widths).toEqual([20, 40, 40]);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
