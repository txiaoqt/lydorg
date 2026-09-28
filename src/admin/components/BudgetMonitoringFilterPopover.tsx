import React, { useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BudgetMonitoringFilters,
  TimePeriodOption,
  SortByOption,
  ReleaseStatusFilter,
  LiquidationStatusFilter,
  TIME_PERIOD_LABELS,
  SORT_BY_LABELS,
  RELEASE_STATUS_LABELS,
  LIQUIDATION_STATUS_LABELS,
  getActiveFilterCount,
  DEFAULT_BUDGET_MONITORING_FILTERS,
} from "@/lib/budget-monitoring-filters";

export interface BudgetMonitoringFilterOptions {
  availableTimePeriods: TimePeriodOption[];
  availableCategories: string[];
  availableStatuses: { value: string; label: string }[];
  availableClassifications: string[];
  availableDistricts: string[];
  availableBarangays: string[];
}

interface BudgetMonitoringFilterPopoverProps {
  filters: BudgetMonitoringFilters;
  onChangeFilters: (next: BudgetMonitoringFilters) => void;
  onResetFilters: () => void;
  options: BudgetMonitoringFilterOptions;
  selectedFiscalYear: number;
}

export const BudgetMonitoringFilterPopover = ({
  filters,
  onChangeFilters,
  onResetFilters,
  options,
  selectedFiscalYear,
}: BudgetMonitoringFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = getActiveFilterCount(filters);

  const handleUpdate = <K extends keyof BudgetMonitoringFilters>(
    key: K,
    value: BudgetMonitoringFilters[K]
  ) => {
    const next = { ...filters, [key]: value };
    // If district changes, reset barangay if not applicable
    if (key === "district" && value !== filters.district) {
      next.barangay = "all";
    }
    onChangeFilters(next);
  };

  const isCustomDateInvalid =
    filters.timePeriod === "custom" &&
    filters.customStartDate &&
    filters.customEndDate &&
    filters.customStartDate > filters.customEndDate;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open Budget Filters"
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 font-segoe text-xs font-semibold shadow-xs transition-colors",
            activeCount > 0
              ? "border-public-bg-brand bg-public-bg-secondary-100 dark:bg-public-bg-secondary-900/30 text-public-text-brand hover:bg-public-bg-secondary-200"
              : "border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface text-text-default hover:bg-slate-50 dark:hover:bg-slate-850"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-public-bg-brand px-1 font-cascadia text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[340px] sm:w-[460px] p-0 rounded-lg border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface shadow-xl max-h-[85vh] overflow-y-auto"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-public-text-brand" />
            <h4 className="font-segoe text-sm font-bold text-text-default">
              Filters &amp; Sorting
            </h4>
            {activeCount > 0 && (
              <span className="rounded-full bg-public-bg-brand/10 px-2 py-0.5 font-segoe text-[10px] font-bold text-public-text-brand">
                {activeCount} active
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text-default transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Controls Body */}
        <div className="p-4 space-y-4 text-xs font-segoe">
          {/* 1. Time Period */}
          <div className="space-y-1.5">
            <label className="font-bold text-text-default flex items-center justify-between">
              <span>Time Period</span>
              {filters.timePeriod === "current_fy" && (
                <span className="text-[10px] text-slate-500 font-normal">
                  FY {selectedFiscalYear}
                </span>
              )}
            </label>
            <select
              value={filters.timePeriod}
              onChange={(e) => handleUpdate("timePeriod", e.target.value as TimePeriodOption)}
              className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none"
            >
              <option value="current_fy">Current Fiscal Year (FY {selectedFiscalYear})</option>
              <option value="previous_fy">Previous Fiscal Year (FY {selectedFiscalYear - 1})</option>
              <option value="ytd">Year to Date (YTD)</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="custom">Custom Date Range</option>
              <option value="all_time">All Time</option>
            </select>

            {/* Custom Date Range Picker */}
            {filters.timePeriod === "custom" && (
              <div className="mt-2.5 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">From (Start)</span>
                    <input
                      type="date"
                      value={filters.customStartDate || ""}
                      onChange={(e) => handleUpdate("customStartDate", e.target.value)}
                      className="h-8 w-full rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-2 text-[11px] text-text-default focus:border-public-bg-brand focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">To (End)</span>
                    <input
                      type="date"
                      value={filters.customEndDate || ""}
                      onChange={(e) => handleUpdate("customEndDate", e.target.value)}
                      className="h-8 w-full rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-2 text-[11px] text-text-default focus:border-public-bg-brand focus:outline-none"
                    />
                  </div>
                </div>
                {isCustomDateInvalid && (
                  <p className="text-[10px] text-red-600 font-semibold">
                    Start date must be before or equal to end date.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* 2. Purpose / Category */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">Purpose / Category</label>
              <select
                value={filters.purposeCategory}
                onChange={(e) => handleUpdate("purposeCategory", e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">All Categories</option>
                {options.availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Budget Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">Budget Status</label>
              <select
                value={filters.budgetStatus}
                onChange={(e) => handleUpdate("budgetStatus", e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">All Statuses</option>
                <option value="submitted_under_review">Submitted / Under Review</option>
                <option value="needs_revision">Needs Revision</option>
                <option value="awaiting_release">Awaiting Release</option>
                <option value="budget_released">Budget Released</option>
                <option value="completed">Completed</option>
                {options.availableStatuses
                  .filter(
                    (s) =>
                      ![
                        "submitted",
                        "under_review",
                        "needs_revision",
                        "awaiting_release",
                        "approved_for_ftf_green",
                        "hard_copy_submitted",
                        "budget_released",
                        "completed",
                      ].includes(s.value)
                  )
                  .map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* 4. Major Classification */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">Major Classification</label>
              <select
                value={filters.majorClassification}
                onChange={(e) => handleUpdate("majorClassification", e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">All Classifications</option>
                {options.availableClassifications.map((classification) => (
                  <option key={classification} value={classification}>
                    {classification}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. District */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">District</label>
              <select
                value={filters.district}
                onChange={(e) => handleUpdate("district", e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">All Districts</option>
                {options.availableDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Barangay (Narrowed by district) */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">Barangay</label>
              <select
                value={filters.barangay}
                onChange={(e) => handleUpdate("barangay", e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">
                  {filters.district !== "all"
                    ? `All Barangays in ${filters.district}`
                    : "All Barangays"}
                </option>
                {options.availableBarangays.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Release Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">Release Status</label>
              <select
                value={filters.releaseStatus}
                onChange={(e) => handleUpdate("releaseStatus", e.target.value as ReleaseStatusFilter)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">All Release Statuses</option>
                <option value="not_released">Not Released</option>
                <option value="partially_released">Partially Released</option>
                <option value="fully_released">Fully Released</option>
              </select>
            </div>

            {/* 8. Liquidation Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-text-default">Liquidation Status</label>
              <select
                value={filters.liquidationStatus}
                onChange={(e) => handleUpdate("liquidationStatus", e.target.value as LiquidationStatusFilter)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none truncate"
              >
                <option value="all">All Liquidation Statuses</option>
                <option value="not_liquidated">Not Liquidated</option>
                <option value="partially_liquidated">Partially Liquidated</option>
                <option value="fully_liquidated">Fully Liquidated</option>
              </select>
            </div>

            {/* 9. Sort By */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-text-default">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleUpdate("sortBy", e.target.value as SortByOption)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3 font-segoe text-xs text-text-default focus:border-public-bg-brand focus:outline-none"
              >
                <optgroup label="By Amount">
                  <option value="approved_desc">Approved Amount — Highest to Lowest</option>
                  <option value="approved_asc">Approved Amount — Lowest to Highest</option>
                  <option value="released_desc">Released Amount — Highest to Lowest</option>
                  <option value="released_asc">Released Amount — Lowest to Highest</option>
                  <option value="liquidated_desc">Liquidated Amount — Highest to Lowest</option>
                  <option value="liquidated_asc">Liquidated Amount — Lowest to Highest</option>
                  <option value="requested_desc">Requested Amount — Highest to Lowest</option>
                  <option value="requested_asc">Requested Amount — Lowest to Highest</option>
                </optgroup>
                <optgroup label="By Name">
                  <option value="category_asc">Purpose / Category — A to Z</option>
                  <option value="category_desc">Purpose / Category — Z to A</option>
                  <option value="org_asc">Organization Name — A to Z</option>
                  <option value="org_desc">Organization Name — Z to A</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Popover Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => {
              onResetFilters();
            }}
            disabled={activeCount === 0}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-segoe text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-text-default hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1.5 rounded-md bg-public-bg-brand px-3.5 py-1.5 font-segoe text-xs font-semibold text-white shadow-xs hover:bg-bg-brand-hover transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
