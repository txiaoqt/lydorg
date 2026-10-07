import { AdminReportingPeriodSelector } from "./AdminReportingPeriodSelector";
import { fromBudgetMonitoringPeriod, toBudgetMonitoringPeriod, getAdminReportPeriodLabel, getAdminReportPeriodError, type AdminReportPeriod } from "@/lib/admin-report-period";
import { useEffect, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BudgetMonitoringFilters } from "@/lib/budget-monitoring-filters";
import { BudgetMonitoringFilterPopover, type BudgetMonitoringFilterOptions } from "./BudgetMonitoringFilterPopover";

const FIRST_AVAILABLE_DATE = "2024-01-01";

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type Props = {
  filters: BudgetMonitoringFilters;
  availableFiscalYears: number[];
  filterOptions: BudgetMonitoringFilterOptions;
  onChangeFilters: (filters: BudgetMonitoringFilters) => void;
  onResetFilters: () => void;
};

export const BudgetMonitoringPageControls = ({ filters, availableFiscalYears, filterOptions, onChangeFilters, onResetFilters }: Props) => {
  const [periodOpen, setPeriodOpen] = useState(false);
  const period = filters.fiscalPeriod;
  const [draftPeriod, setDraftPeriod] = useState<AdminReportPeriod>(fromBudgetMonitoringPeriod(period));
  useEffect(() => { setDraftPeriod(fromBudgetMonitoringPeriod(period)); }, [period, periodOpen]);
  const today = toDateInputValue(new Date());
  const invalid = getAdminReportPeriodError(draftPeriod)
    || (draftPeriod.mode === "custom" && (draftPeriod.startDate < FIRST_AVAILABLE_DATE || draftPeriod.endDate > today)
      ? "Choose custom dates from January 2024 through today." : null);
  const label = period.mode === "all" ? "All Year · All Periods" : period.mode === "fiscal_year" ? `FY ${period.fiscalYear} · All Periods` : getAdminReportPeriodLabel(fromBudgetMonitoringPeriod(period));
  const applyPeriod = () => {
    if (invalid) return;
    onChangeFilters({ ...filters, fiscalPeriod: toBudgetMonitoringPeriod(draftPeriod, period.fiscalYear) });
    setPeriodOpen(false);
  };

  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-admin-surface px-4 py-3 shadow-sm">
    <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Select fiscal period" className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-text-default shadow-sm hover:bg-slate-50">
          <Calendar className="h-4 w-4 text-public-text-brand" />{label}<ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,380px)] space-y-3 border-slate-300 bg-white p-4 shadow-lg">
        <AdminReportingPeriodSelector compact value={draftPeriod} years={availableFiscalYears.filter(year => year >= 2024 && year <= 2026)} onChange={setDraftPeriod} />
        <p className="text-xs text-text-secondary">Uses activity date, falling back to release date. All Year combines records across years. Custom dates are available from January 2024 through today.</p>
        {invalid && <p role="alert" className="text-xs text-red-600">{invalid}</p>}
        <div className="flex justify-end"><button type="button" disabled={Boolean(invalid)} onClick={applyPeriod} className="rounded-md bg-public-bg-brand px-3 py-2 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-public-bg-brand disabled:opacity-40">Apply period</button></div>
      </PopoverContent>
    </Popover>
    <BudgetMonitoringFilterPopover filters={filters} onChangeFilters={onChangeFilters} onResetFilters={onResetFilters} options={filterOptions} />
  </div>;
};
