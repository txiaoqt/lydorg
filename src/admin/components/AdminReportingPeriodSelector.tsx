import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getCurrentAdminReportPeriod, getAdminReportPeriodError, type AdminReportPeriod, type ReportQuarter } from "@/lib/admin-report-period";

export type AdminPeriodFilter = {
  enabled: boolean;
  value: AdminReportPeriod;
  years: number[];
  onChange: (period: AdminReportPeriod) => void;
  allowAll?: boolean;
  showSelector?: boolean;
};

export function AdminReportingPeriodSelector({ value, years, onChange, allowAll = true, disabled = false, compact = false }: Omit<AdminPeriodFilter, "enabled"> & { disabled?: boolean; compact?: boolean }) {
  const id = useId();
  const [customYear, setCustomYear] = useState(() => getCurrentAdminReportPeriod().year);
  const year = "year" in value ? value.year : customYear;
  const options = [...new Set([year, ...years])].sort((a, b) => b - a);
  const controlClass = "h-10 w-full rounded-md border border-slate-300 bg-admin-surface px-2 text-sm text-text-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-public-bg-brand disabled:opacity-50 dark:border-slate-600";
  const selectClass = `${controlClass} peer appearance-none !pl-3 !pr-9`;
  const error = getAdminReportPeriodError(value);
  return <fieldset disabled={disabled} className={compact ? "w-full space-y-2 font-segoe sm:w-80" : "space-y-3 font-segoe"}>
    <legend className={compact ? "sr-only" : "mb-2 text-sm font-semibold text-text-default"}>Reporting Period</legend>
    <div className="grid grid-cols-2 gap-3">
      <label htmlFor={`${id}-year`} className="space-y-1 text-xs font-medium text-text-secondary">Year
        <span className="relative block">
        <select id={`${id}-year`} className={selectClass} value={compact && (value.mode === "all" || value.mode === "quarter_all_years") ? "all" : year} onChange={e => {
          if (compact && e.target.value === "all") {
            onChange(value.mode === "quarter" ? { mode: "quarter_all_years", quarter: value.quarter } : { mode: "all" });
            return;
          }
          const nextYear = Number(e.target.value); setCustomYear(nextYear);
          onChange(value.mode === "quarter" || value.mode === "quarter_all_years" ? { mode: "quarter", quarter: value.quarter, year: nextYear } : { mode: "year", year: nextYear });
        }}>{compact && allowAll && <option value="all">All Year</option>}{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary peer-disabled:opacity-50" />
        </span>
      </label>
      <label htmlFor={`${id}-period`} className="space-y-1 text-xs font-medium text-text-secondary">Period
        <span className="relative block">
        <select id={`${id}-period`} className={selectClass} value={value.mode === "quarter" || value.mode === "quarter_all_years" ? `q${value.quarter}` : compact && value.mode === "year" ? "all" : value.mode} onChange={e => {
          const mode = e.target.value;
          if (compact) {
            const allYears = value.mode === "all" || value.mode === "quarter_all_years";
            onChange(mode === "all" ? (allYears ? { mode: "all" } : { mode: "year", year })
              : mode === "custom" ? { mode: "custom", startDate: `${year}-01-01`, endDate: `${year}-12-31` }
              : allYears ? { mode: "quarter_all_years", quarter: Number(mode.slice(1)) as ReportQuarter }
              : { mode: "quarter", year, quarter: Number(mode.slice(1)) as ReportQuarter });
            return;
          }
          onChange(mode === "all" ? { mode: "all" } : mode === "year" ? { mode: "year", year }
            : mode === "custom" ? { mode: "custom", startDate: `${year}-01-01`, endDate: `${year}-12-31` }
            : { mode: "quarter", year, quarter: Number(mode.slice(1)) as ReportQuarter });
        }}>
          {allowAll && <option value="all">All Periods</option>}
          {!compact && <option value="year">All Year</option>}
          <option value="q1">Q1 · Jan–Mar</option><option value="q2">Q2 · Apr–Jun</option>
          <option value="q3">Q3 · Jul–Sep</option><option value="q4">Q4 · Oct–Dec</option>
          <option value="custom">Custom Date Range</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary peer-disabled:opacity-50" />
        </span>
      </label>
    </div>
    {value.mode === "custom" && <div className="grid grid-cols-2 gap-3">
      <label htmlFor={`${id}-start`} className="space-y-1 text-xs font-medium text-text-secondary">Start Date<input id={`${id}-start`} type="date" className={controlClass} value={value.startDate} onChange={e => onChange({ ...value, startDate: e.target.value })} /></label>
      <label htmlFor={`${id}-end`} className="space-y-1 text-xs font-medium text-text-secondary">End Date<input id={`${id}-end`} type="date" className={controlClass} value={value.endDate} onChange={e => onChange({ ...value, endDate: e.target.value })} /></label>
    </div>}
    {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
  </fieldset>;
}
