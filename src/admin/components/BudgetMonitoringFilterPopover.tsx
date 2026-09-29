import { useEffect, useState } from "react";
import { Check, ChevronDown, Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BudgetMonitoringFilters,
  SortByOption,
  ReleaseStatusFilter,
  LiquidationStatusFilter,
  SORT_BY_LABELS,
  getActiveFilterCount,
  createDefaultBudgetMonitoringFilters,
} from "@/lib/budget-monitoring-filters";
import { formatBudgetPurposeCategory } from "@/lib/lydo-connect-data";

export interface BudgetMonitoringFilterOptions {
  availableCategories: string[];
  availableClassifications: string[];
  availableDistricts: string[];
  availableBarangays: string[];
}

interface Props {
  filters: BudgetMonitoringFilters;
  onChangeFilters: (next: BudgetMonitoringFilters) => void;
  onResetFilters: () => void;
  options: BudgetMonitoringFilterOptions;
}

const groups: { label: string; options: SortByOption[] }[] = [
  { label: "Amount", options: ["approved_desc", "approved_asc", "released_desc", "released_asc", "liquidated_desc", "liquidated_asc", "requested_desc", "requested_asc"] },
  { label: "Name", options: ["org_asc", "org_desc"] },
  { label: "Category", options: ["category_asc", "category_desc"] },
];

export const BudgetMonitoringFilterPopover = ({ filters, onChangeFilters, onResetFilters, options }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const activeCount = getActiveFilterCount(filters);

  useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [filters, isOpen]);

  const update = <K extends keyof BudgetMonitoringFilters>(key: K, value: BudgetMonitoringFilters[K]) => {
    setDraft(current => ({ ...current, [key]: value, ...(key === "district" ? { barangay: "all" } : {}) }));
  };

  const selectClass = "h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-text-default focus:border-public-bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand/30 dark:border-slate-700 dark:bg-admin-surface";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open Budget Filters"
          className={cn(
            "flex h-10 items-center gap-2 rounded-md border px-3 font-segoe text-xs font-semibold transition-colors",
            activeCount
              ? "border-public-bg-brand bg-public-bg-secondary-100 text-public-text-brand"
              : "border-slate-300 bg-white text-text-default hover:bg-slate-50",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-public-bg-brand px-1 text-[10px] text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex max-h-[calc(100dvh-24px)] w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border-slate-300 bg-white p-0 text-text-default shadow-xl dark:border-slate-700 dark:bg-admin-surface"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-700 dark:bg-admin-background/60">
          <div className="flex min-w-0 items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-public-text-brand" />
            <h4 className="text-sm font-bold">Filters &amp; Sorting</h4>
            {activeCount > 0 && (
              <span className="shrink-0 rounded-full bg-public-bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-public-text-brand">
                {activeCount} active
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setIsOpen(false)}
            className="ml-2 rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 p-3.5 text-xs">
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              Purpose / Category
              <select className={selectClass} value={draft.purposeCategory} onChange={e => update("purposeCategory", e.target.value)}>
                <option value="all">All Categories</option>
                {options.availableCategories.map(value => (
                  <option key={value} value={value}>{formatBudgetPurposeCategory(value)}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              Budget Status
              <select className={selectClass} value={draft.budgetStatus} onChange={e => update("budgetStatus", e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="submitted_under_review">Submitted / Under Review</option>
                <option value="needs_revision">Needs Revision</option>
                <option value="awaiting_release">Awaiting Release</option>
                <option value="budget_released">Budget Released</option>
                <option value="rejected_red">Rejected</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              Major Classification
              <select className={selectClass} value={draft.majorClassification} onChange={e => update("majorClassification", e.target.value)}>
                <option value="all">All Classifications</option>
                {options.availableClassifications.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              District
              <select className={selectClass} value={draft.district} onChange={e => update("district", e.target.value)}>
                <option value="all">All Districts</option>
                {options.availableDistricts.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              Barangay
              <select className={selectClass} value={draft.barangay} onChange={e => update("barangay", e.target.value)}>
                <option value="all">{draft.district === "all" ? "All Barangays" : `All Barangays in ${draft.district}`}</option>
                {options.availableBarangays.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              Release Status
              <select className={selectClass} value={draft.releaseStatus} onChange={e => update("releaseStatus", e.target.value as ReleaseStatusFilter)}>
                <option value="all">All Release Statuses</option>
                <option value="not_released">Not Released</option>
                <option value="fully_released">Fully Released</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 font-semibold">
              Liquidation Status
              <select className={selectClass} value={draft.liquidationStatus} onChange={e => update("liquidationStatus", e.target.value as LiquidationStatusFilter)}>
                <option value="all">All Liquidation Statuses</option>
                <option value="not_liquidated">Not Liquidated</option>
                <option value="fully_liquidated">Fully Liquidated</option>
              </select>
            </label>
          </div>

          <fieldset className="mx-3.5 space-y-1.5 border-t border-slate-200 py-2.5 text-xs dark:border-slate-700">
            <legend className="px-1 font-semibold">Sort By</legend>
            <select
              aria-label="Sort By"
              className={selectClass}
              value={draft.sortBy}
              onChange={e => update("sortBy", e.target.value as SortByOption)}
            >
              {groups.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(value => (
                    <option key={value} value={value}>{SORT_BY_LABELS[value]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </fieldset>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50/70 px-3.5 py-2 dark:border-slate-700 dark:bg-admin-background/60">
          <button
            type="button"
            onClick={() => {
              const defaults = createDefaultBudgetMonitoringFilters(filters.fiscalPeriod.fiscalYear);
              setDraft(defaults);
              onResetFilters();
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeFilters(draft);
              setIsOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-md bg-public-bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
