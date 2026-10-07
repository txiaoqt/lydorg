import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminExportDialog } from "./AdminExportDialog";
import { ActivityLogsExportDialog } from "./ActivityLogsExportDialog";
import { YorpRegistryExportDialog } from "./YorpRegistryExportDialog";
import { BudgetMonitoringPageControls } from "./BudgetMonitoringPageControls";
import { createDefaultBudgetMonitoringFilters, type BudgetMonitoringFilters } from "@/lib/budget-monitoring-filters";
import type { AdminReportPeriod } from "@/lib/admin-report-period";

afterEach(cleanup);
function ExportFixture({ generate, enabled = true }: { generate: ReturnType<typeof vi.fn>; enabled?: boolean }) {
  const [period, setPeriod] = useState<AdminReportPeriod>({ mode: "all" });
  return <AdminExportDialog open onOpenChange={vi.fn()} onExport={generate}
    periodFilter={{ enabled, value: period, onChange: setPeriod, years: [2026, 2025] }} />;
}
describe("report period export controls", () => {
  it("does not add reporting UI to disabled or ordinary Administrator exports", () => {
    render(<ExportFixture generate={vi.fn()} enabled={false} />);
    expect(screen.queryByText("Reporting Period")).not.toBeInTheDocument();
    cleanup();
    render(<ActivityLogsExportDialog open title="Export Administrators" onOpenChange={vi.fn()} onExport={vi.fn()} />);
    expect(screen.queryByText("Reporting Period")).not.toBeInTheDocument();
  });
  it.each([1, 2, 3, 4])("passes Q%i and selected year only when Generate is clicked", async quarter => {
    const generate = vi.fn(); render(<ExportFixture generate={generate} />);
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2025" } });
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: `q${quarter}` } });
    expect(generate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /generate export/i }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith("pdf", { paperSize: "a4", orientation: "portrait" }, { mode: "quarter", year: 2025, quarter }));
  });
  it("validates custom dates and preserves format and page setup", async () => {
    const generate = vi.fn(); render(<ExportFixture generate={generate} />);
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-04-30" } });
    expect(screen.getByRole("button", { name: /generate export/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: /generate export/i }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith("pdf", expect.any(Object), { mode: "custom", startDate: "2026-05-01", endDate: "2026-06-30" }));
  });
  it("retains YORP column selection and passes the period without prefetching", async () => {
    const generate = vi.fn();
    render(<YorpRegistryExportDialog open onOpenChange={vi.fn()} onExport={generate}
      periodFilter={{ enabled: true, value: { mode: "quarter", year: 2026, quarter: 1 }, years: [2026], onChange: vi.fn() }} />);
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    expect(generate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /generate export/i }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith("pdf", expect.any(Array), { paperSize: "a4", orientation: "landscape" }, { mode: "quarter", year: 2026, quarter: 1 }));
  });
  it("applies monitoring quarters through the existing inclusive period and keeps other filters", () => {
    const change = vi.fn();
    const filters: BudgetMonitoringFilters = { ...createDefaultBudgetMonitoringFilters(2026), district: "District I", purposeCategory: "education" };
    render(<BudgetMonitoringPageControls filters={filters} availableFiscalYears={[2026, 2025]} onChangeFilters={change} onResetFilters={vi.fn()}
      filterOptions={{ availableCategories: [], availableClassifications: [], availableDistricts: [], availableBarangays: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Select fiscal period" }));
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "q2" } });
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
    expect(change).toHaveBeenCalledWith({ ...filters, fiscalPeriod: { mode: "custom", fiscalYear: 2026, startDate: "2026-04-01", endDate: "2026-06-30" } });
  });
  it("keeps monitoring custom dates and All Year working", () => {
    const change = vi.fn(), filters = createDefaultBudgetMonitoringFilters(2026);
    const props = { filters, availableFiscalYears: [2026, 2025], onChangeFilters: change, onResetFilters: vi.fn(),
      filterOptions: { availableCategories: [], availableClassifications: [], availableDistricts: [], availableBarangays: [] } };
    render(<BudgetMonitoringPageControls {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Select fiscal period" }));
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-02-10" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-02-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
    expect(change).toHaveBeenLastCalledWith({ ...filters, fiscalPeriod: { mode: "custom", fiscalYear: 2026, startDate: "2026-02-10", endDate: "2026-02-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Select fiscal period" }));
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2025" } });
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "year" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
    expect(change).toHaveBeenLastCalledWith({ ...filters, fiscalPeriod: { mode: "fiscal_year", fiscalYear: 2025 } });
  });
});
