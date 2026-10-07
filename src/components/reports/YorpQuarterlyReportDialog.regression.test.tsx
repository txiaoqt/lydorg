import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YorpQuarterlyReportDialog } from "./YorpQuarterlyReportDialog";
import { fetchYorpQuarterlyReportInSupabase } from "@/lib/lydo-connect-supabase";

vi.mock("@/lib/lydo-connect-supabase", () => ({ fetchYorpQuarterlyReportInSupabase: vi.fn().mockResolvedValue(null) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("official Section 35 workflow stays separate", () => {
  it("retains default year and quarter, both report types, and official year/quarter RPC arguments", async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    render(<YorpQuarterlyReportDialog open onOpenChange={vi.fn()} />);
    await waitFor(() => expect(fetchYorpQuarterlyReportInSupabase).toHaveBeenCalledWith(2026, 3));
    expect(screen.getByText("Quarterly Summary")).toBeInTheDocument();
    expect(screen.getByText("Disaggregated Report")).toBeInTheDocument();
    expect(screen.queryByLabelText("Period")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText("Year"), { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "2025" }));
    await waitFor(() => expect(fetchYorpQuarterlyReportInSupabase).toHaveBeenLastCalledWith(2025, 3));
    fireEvent.keyDown(screen.getByLabelText("Quarter"), { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Q1 (Jan 1 – Mar 31)" }));
    await waitFor(() => expect(fetchYorpQuarterlyReportInSupabase).toHaveBeenLastCalledWith(2025, 1));
  });
  it("does not fetch an official report while the dialog is closed", () => {
    render(<YorpQuarterlyReportDialog open={false} onOpenChange={vi.fn()} />);
    expect(fetchYorpQuarterlyReportInSupabase).not.toHaveBeenCalled();
  });
});
