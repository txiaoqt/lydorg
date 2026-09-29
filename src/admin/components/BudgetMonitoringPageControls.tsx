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
  const [customMode, setCustomMode] = useState(filters.fiscalPeriod.mode === "custom");
  const [startDate, setStartDate] = useState(filters.fiscalPeriod.mode === "custom" ? filters.fiscalPeriod.startDate : "");
  const [endDate, setEndDate] = useState(filters.fiscalPeriod.mode === "custom" ? filters.fiscalPeriod.endDate : "");
  const today = toDateInputValue(new Date());
  const availableThroughMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());
  const availableRangeLabel = `Jan 2024 – ${availableThroughMonth}`;
  const period = filters.fiscalPeriod;
  useEffect(() => {
    if (period.mode === "custom") {
      setCustomMode(true);
      setStartDate(period.startDate);
      setEndDate(period.endDate);
    } else if (!periodOpen) {
      setCustomMode(false);
    }
  }, [period, periodOpen]);

  const label = period.mode === "fiscal_year" ? `FY ${period.fiscalYear}` : `Custom: ${period.startDate} – ${period.endDate}`;
  const applyCustomRange = () => {
    if (
      !startDate ||
      !endDate ||
      startDate < FIRST_AVAILABLE_DATE ||
      startDate > today ||
      endDate < FIRST_AVAILABLE_DATE ||
      endDate > today ||
      startDate > endDate
    ) return;
    onChangeFilters({ ...filters, fiscalPeriod: { mode: "custom", fiscalYear: filters.fiscalPeriod.fiscalYear, startDate, endDate } });
    setPeriodOpen(false);
  };
  const isOutsideAvailableRange = Boolean(
    (startDate && (startDate < FIRST_AVAILABLE_DATE || startDate > today)) ||
    (endDate && (endDate < FIRST_AVAILABLE_DATE || endDate > today))
  );

  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-admin-surface px-4 py-3 shadow-sm">
    <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Select fiscal period" className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-text-default shadow-sm hover:bg-slate-50">
          <Calendar className="h-4 w-4 text-public-text-brand" />{label}<ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,380px)] space-y-3 border-slate-300 bg-white p-4 shadow-lg">
        {!customMode ? <div className="space-y-1">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Fiscal year</p>
          {availableFiscalYears.map(year => <button key={year} type="button" onClick={() => { onChangeFilters({ ...filters, fiscalPeriod: { mode: "fiscal_year", fiscalYear: year } }); setPeriodOpen(false); }} className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-slate-50 ${period.mode === "fiscal_year" && period.fiscalYear === year ? "font-semibold text-public-text-brand" : "text-text-default"}`}>FY {year}{period.mode === "fiscal_year" && period.fiscalYear === year && <span className="text-xs">Selected</span>}</button>)}
          <button type="button" onClick={() => setCustomMode(true)} className="mt-1 w-full rounded border-t border-slate-200 px-2 pt-3 text-left text-sm font-semibold text-public-text-brand hover:bg-slate-50">Custom date range</button>
        </div> : <div className="space-y-3">
          <div><button type="button" onClick={() => setCustomMode(false)} className="text-xs font-semibold text-public-text-brand">← Fiscal years</button><h3 className="mt-1 text-sm font-semibold">Custom date range</h3><p className="mt-1 text-xs text-slate-500">Uses activity date, falling back to release date.</p></div>
          <div role="group" aria-label="Available date range" className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
            <p className="text-[11px] font-semibold text-slate-500">Available date range</p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">{availableRangeLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs font-semibold">Start<input aria-label="Start date" type="date" min={FIRST_AVAILABLE_DATE} max={today} value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-full rounded border border-slate-300 px-2 font-normal" /></label><label className="space-y-1 text-xs font-semibold">End<input aria-label="End date" type="date" min={FIRST_AVAILABLE_DATE} max={today} value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-full rounded border border-slate-300 px-2 font-normal" /></label></div>
          {isOutsideAvailableRange && <p className="text-xs font-medium text-red-600">Choose dates within the available range.</p>}
          {startDate && endDate && startDate > endDate && <p className="text-xs font-medium text-red-600">Start date must be before or equal to end date.</p>}
          <div className="flex justify-end"><button type="button" disabled={!startDate || !endDate || Boolean(isOutsideAvailableRange) || startDate > endDate} onClick={applyCustomRange} className="rounded-md bg-public-bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Apply dates</button></div>
        </div>}
      </PopoverContent>
    </Popover>
    <BudgetMonitoringFilterPopover filters={filters} onChangeFilters={onChangeFilters} onResetFilters={onResetFilters} options={filterOptions} />
  </div>;
};
