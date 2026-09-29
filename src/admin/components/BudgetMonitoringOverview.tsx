import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileSpreadsheet,
  FilterX,
  RotateCcw,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnnualBudgetAllocation } from "@/lib/lydo-connect-data";
import { createCategoryColorResolver } from "@/lib/budget-category-colors";
import { BUDGET_MONITORING_COLORS, BUDGET_MONITORING_LABELS, deriveBudgetMonitoringMetrics } from "@/lib/budget-monitoring-presentation";
import { BudgetExecutionPipeline } from "@/components/portal/BudgetExecutionPipeline";
import {
  BudgetMonitoringFilters,
  DEFAULT_BUDGET_MONITORING_FILTERS,
  getActiveFilterCount,
} from "@/lib/budget-monitoring-filters";
import {
  BudgetMonitoringFilterPopover,
  type BudgetMonitoringFilterOptions,
} from "./BudgetMonitoringFilterPopover";
import { BudgetMonitoringFilterSummary } from "./BudgetMonitoringFilterSummary";

export type PurposeCategoryItem = {
  category: string;
  approvedAmount: number;
  releasedAmount: number;
  count: number;
};

type BudgetMonitoringOverviewProps = {
  selectedFiscalYear: number;
  onSelectFiscalYear: (fiscalYear: number) => void;
  availableFiscalYears: number[];
  annualAllocation: AnnualBudgetAllocation | null;
  onOpenConfigureModal: () => void;
  approvedBudget: number;
  releasedBudget: number;
  liquidatedBudget: number;
  pendingDisbursement: number;
  categoryBreakdown: PurposeCategoryItem[];
  formatPesoAmount: (value?: number | null) => string;
  formatCompactPeso: (value: number) => string;
  // Dynamic filter state & options
  filters?: BudgetMonitoringFilters;
  onChangeFilters?: (next: BudgetMonitoringFilters) => void;
  onResetFilters?: () => void;
  filterOptions?: BudgetMonitoringFilterOptions;
};

const TABLE_PAGE_SIZE = 5;

/**
 * Formats percentage display for legend and category summaries.
 * - value === 0 -> 0%
 * - 0 < value < 1 -> <1%
 * - value >= 1 -> rounded whole percentage
 *
 * Supports both formatPercentageDisplay(percentageNumber)
 * and formatPercentageDisplay(value, total).
 */
export function formatPercentageDisplay(valueOrPct: number, total?: number): string {
  const pct = total !== undefined ? (total > 0 ? (valueOrPct / total) * 100 : 0) : valueOrPct;
  if (pct <= 0) return "0%";
  if (pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

export const BudgetMonitoringOverview = ({
  selectedFiscalYear,
  onSelectFiscalYear,
  availableFiscalYears,
  annualAllocation,
  onOpenConfigureModal,
  approvedBudget,
  releasedBudget,
  liquidatedBudget,
  pendingDisbursement,
  categoryBreakdown,
  formatPesoAmount,
  formatCompactPeso,
  filters: parentFilters,
  onChangeFilters: parentOnChangeFilters,
  onResetFilters: parentOnResetFilters,
  filterOptions,
}: BudgetMonitoringOverviewProps) => {
  // Local fallback filter state if not controlled externally
  const [localFilters, setLocalFilters] = useState<BudgetMonitoringFilters>(
    DEFAULT_BUDGET_MONITORING_FILTERS
  );
  const [tablePage, setTablePage] = useState(0);

  const activeFilters = parentFilters ?? localFilters;
  const handleFilterChange = parentOnChangeFilters ?? ((next: BudgetMonitoringFilters) => {
    setLocalFilters(next);
    setTablePage(0);
  });
  const handleResetFilters = parentOnResetFilters ?? (() => {
    setLocalFilters(DEFAULT_BUDGET_MONITORING_FILTERS);
    setTablePage(0);
  });

  const activeFilterCount = getActiveFilterCount(activeFilters);
  const isConfigured = annualAllocation !== null;
  const totalFYBudget = isConfigured ? annualAllocation.totalAmount : null;

  const { isDeficit, deficitAmount, remainingHeadroom } = deriveBudgetMonitoringMetrics({
    allocation: totalFYBudget,
    approved: approvedBudget,
    released: releasedBudget,
  });

  // Utilization progression percentages
  const percentClearedOfReleased =
    releasedBudget > 0 ? Math.round((liquidatedBudget / releasedBudget) * 100) : 0;

  const percentAvailable =
    totalFYBudget !== null && totalFYBudget > 0 && remainingHeadroom !== null
      ? ((Math.max(remainingHeadroom, 0) / totalFYBudget) * 100).toFixed(1)
      : null;

  // Single deterministic category -> color resolver for the master categoryBreakdown list
  const getCategoryColor = useMemo(
    () => createCategoryColorResolver(categoryBreakdown),
    [categoryBreakdown]
  );

  // Top 5 categories + Other consolidation for Donut Visualization (Part 15 & 16)
  // Coherent denominator: slices sum to approvedBudget, center value = approvedBudget
  const donutData = useMemo(() => {
    if (!categoryBreakdown.length || approvedBudget <= 0) return [];

    if (categoryBreakdown.length <= 5) {
      return categoryBreakdown.map((item) => {
        const pctDisplay = formatPercentageDisplay(item.approvedAmount, approvedBudget);
        return {
          name: item.category,
          value: item.approvedAmount,
          color: getCategoryColor(item.category),
          pct: Math.round((item.approvedAmount / approvedBudget) * 100),
          pctDisplay,
        };
      });
    }

    const top5 = categoryBreakdown.slice(0, 5);
    const others = categoryBreakdown.slice(5);
    const otherAmount = others.reduce((sum, item) => sum + item.approvedAmount, 0);

    const slices = top5.map((item) => {
      const pctDisplay = formatPercentageDisplay(item.approvedAmount, approvedBudget);
      return {
        name: item.category,
        value: item.approvedAmount,
        color: getCategoryColor(item.category),
        pct: Math.round((item.approvedAmount / approvedBudget) * 100),
        pctDisplay,
      };
    });

    if (otherAmount > 0) {
      const otherPctDisplay = formatPercentageDisplay(otherAmount, approvedBudget);
      slices.push({
        name: "Other Categories",
        value: otherAmount,
        color: getCategoryColor("Other Categories"),
        pct: Math.round((otherAmount / approvedBudget) * 100),
        pctDisplay: otherPctDisplay,
      });
    }

    return slices;
  }, [categoryBreakdown, approvedBudget, getCategoryColor]);

  // Derived filter options if not supplied externally
  const resolvedFilterOptions: BudgetMonitoringFilterOptions = useMemo(() => {
    if (filterOptions) return filterOptions;
    return {
      availableTimePeriods: [
        "current_fy",
        "previous_fy",
        "ytd",
        "last_30_days",
        "last_90_days",
        "last_6_months",
        "custom",
        "all_time",
      ],
      availableCategories: categoryBreakdown.map((c) => c.category),
      availableStatuses: [
        { value: "submitted_under_review", label: "Submitted / Under Review" },
        { value: "needs_revision", label: "Needs Revision" },
        { value: "awaiting_release", label: "Awaiting Release" },
        { value: "budget_released", label: "Budget Released" },
        { value: "completed", label: "Completed" },
      ],
      availableClassifications: [],
      availableDistricts: [],
      availableBarangays: [],
    };
  }, [filterOptions, categoryBreakdown]);

  const totalPages = Math.max(1, Math.ceil(categoryBreakdown.length / TABLE_PAGE_SIZE));
  const clampedPage = Math.min(tablePage, totalPages - 1);
  const pagedCategories = useMemo(() => {
    return categoryBreakdown.slice(
      clampedPage * TABLE_PAGE_SIZE,
      clampedPage * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE
    );
  }, [categoryBreakdown, clampedPage]);

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Title, Fiscal Year Selector & Budget Configuration Trigger */}
      <div className="rounded-md border border-slate-300 bg-admin-surface shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-segoe text-lg font-bold leading-none text-text-default">
              Budget Monitoring
            </h2>
            <p className="font-segoe text-xs text-slate-500">
              Track annual youth allocations, commitments, fund releases, and liquidation clearances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real Interactive Fiscal Year Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Select Fiscal Year"
                  className="flex h-10 items-center justify-between gap-2 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface px-3.5 py-2 font-segoe text-sm font-semibold text-text-default shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none"
                >
                  <Calendar className="h-4 w-4 text-public-text-brand" />
                  <span>FY {selectedFiscalYear}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-md border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface p-1 shadow-lg">
                {availableFiscalYears.map((fy) => (
                  <DropdownMenuItem
                    key={fy}
                    onClick={() => {
                      onSelectFiscalYear(fy);
                      setTablePage(0);
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 font-segoe text-xs cursor-pointer rounded-sm transition-colors",
                      fy === selectedFiscalYear
                        ? "bg-public-bg-secondary-100 dark:bg-public-bg-secondary-900/30 text-public-text-brand font-bold"
                        : "text-text-default hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>FY {fy}</span>
                    {fy === selectedFiscalYear && (
                      <span className="text-[10px] text-public-text-brand font-semibold">Active</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Admin Configuration Entry Point */}
            <button
              type="button"
              onClick={onOpenConfigureModal}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 font-segoe text-xs font-semibold shadow-sm transition-colors",
                isConfigured
                  ? "border border-slate-300 dark:border-slate-800 bg-white dark:bg-admin-surface text-text-default hover:bg-slate-50 dark:hover:bg-slate-850"
                  : "bg-public-bg-brand text-white hover:bg-bg-brand-hover"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isConfigured ? "Edit FY Allocation" : "Configure FY Budget"}
            </button>
          </div>
        </div>

        {/* 2. Unconfigured State Alert Banner */}
        {!isConfigured && (
          <div className="m-6 mb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50/80 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-segoe text-xs font-bold text-amber-900">
                  FY {selectedFiscalYear} Budget Allocation Not Configured
                </h3>
                <p className="font-segoe text-xs text-amber-800">
                  Budget Monitoring cannot calculate remaining headroom until the annual LYDO allocation is configured.
                  Execution metrics below reflect active workflow requests for FY {selectedFiscalYear}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenConfigureModal}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-amber-700 px-4 py-2 font-segoe text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-800"
            >
              <Coins className="h-4 w-4" />
              Configure FY Budget
            </button>
          </div>
        )}

        {/* 3. Deficit Warning Alert Banner */}
        {isDeficit && (
          <div className="m-6 mb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50/90 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-segoe text-xs font-bold text-red-900">
                  Budget Deficit Warning: -{formatPesoAmount(deficitAmount)}
                </h3>
                <p className="font-segoe text-xs text-red-800">
                  Approved budget requests (
                  <span className="font-cascadia font-semibold">{formatPesoAmount(approvedBudget)}</span>) exceed
                  the configured statutory baseline ceiling (
                  <span className="font-cascadia font-semibold">{formatPesoAmount(totalFYBudget)}</span>) for FY {selectedFiscalYear}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenConfigureModal}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-red-700 px-4 py-2 font-segoe text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-800"
            >
              <Settings className="h-3.5 w-3.5" />
              Adjust Baseline
            </button>
          </div>
        )}

        {/* 4. PRIMARY KPI HEADER */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: FY Budget Allocation (Global Statutory Baseline) */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {BUDGET_MONITORING_LABELS.allocation}
                  </p>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-segoe text-[10px] font-bold uppercase",
                      isConfigured
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    )}
                  >
                    {isConfigured ? "Baseline" : "Unset"}
                  </span>
                </div>
                <p className={cn("font-cascadia text-lg font-bold leading-tight", BUDGET_MONITORING_COLORS.allocation.value)}>
                  {isConfigured ? formatPesoAmount(totalFYBudget) : "Not Configured"}
                </p>
                  <p className="font-segoe text-xs text-slate-600">
                  {annualAllocation?.statutoryBaselineNotes || "Approved annual statutory ceiling"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-slate-500">{BUDGET_MONITORING_LABELS.remainingHeadroom}</span>
                <span
                  className={cn(
                    "font-cascadia text-[11px] font-bold",
                    !isConfigured
                      ? "text-slate-400"
                      : isDeficit
                      ? "text-red-600"
                      : BUDGET_MONITORING_COLORS.remainingHeadroom.value
                  )}
                >
                  {!isConfigured
                    ? "Unavailable"
                    : isDeficit
                    ? `-${formatPesoAmount(deficitAmount)}`
                    : formatPesoAmount(remainingHeadroom)}
                </span>
              </div>
            </div>

            {/* Card 2: Approved / Committed Budget */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                    {BUDGET_MONITORING_LABELS.committed}
                  </p>
                  <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-segoe text-[10px] font-bold text-blue-700 uppercase">
                    Committed
                  </span>
                </div>
                <p className={cn("font-cascadia text-lg font-bold leading-tight", BUDGET_MONITORING_COLORS.committed.value)}>
                  {formatPesoAmount(approvedBudget)}
                </p>
                <p className="font-segoe text-xs text-blue-800">Approved and committed by administrators</p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-blue-700">{BUDGET_MONITORING_LABELS.pendingDisbursement}</span>
                <span className={cn("font-cascadia text-[11px] font-bold", BUDGET_MONITORING_COLORS.pendingDisbursement.value)}>
                  {formatPesoAmount(pendingDisbursement)}
                </span>
              </div>
            </div>

            {/* Card 3: Released Budget */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-cyan-700">
                    {BUDGET_MONITORING_LABELS.released}
                  </p>
                    <span className="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 font-segoe text-[10px] font-bold text-cyan-700 uppercase">
                    Released Budget
                  </span>
                </div>
                <p className={cn("font-cascadia text-lg font-bold leading-tight", BUDGET_MONITORING_COLORS.released.value)}>
                  {formatPesoAmount(releasedBudget)}
                </p>
                <p className="font-segoe text-xs text-slate-500">Disbursed to youth organizations</p>
              </div>

            </div>

            {/* Card 4: Liquidated Budget */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    {BUDGET_MONITORING_LABELS.liquidated}
                  </p>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-segoe text-[10px] font-bold text-emerald-700 uppercase">
                    Audited
                  </span>
                </div>
                <p className="font-cascadia text-lg font-bold leading-tight text-emerald-700">
                  {formatPesoAmount(liquidatedBudget)}
                </p>
                <p className="font-segoe text-xs text-emerald-800">Released funds cleared through liquidation review</p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-emerald-800">Cleared of Released Budget</span>
                <span className="font-segoe text-[11px] font-bold text-emerald-700">
                  {percentClearedOfReleased}% Cleared
                </span>
              </div>
            </div>
          </div>

          {/* 5. UTILIZATION PIPELINE */}
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="font-segoe text-xs font-bold text-text-default">
                  Budget Execution Pipeline &middot; FY {selectedFiscalYear}
                </p>
                <span className="font-segoe text-[11px] text-slate-500">
                  Current allocation position across released funds, pending disbursement, and remaining headroom
                </span>
              </div>

              {isDeficit ? (
                <span className="rounded bg-red-100 px-2 py-0.5 font-segoe text-xs font-bold text-red-700">
                  Over-Budget Deficit
                </span>
              ) : percentAvailable !== null ? (
                <p className="font-segoe text-xs font-semibold text-slate-600">
                  <span className="font-cascadia font-bold text-slate-700">{percentAvailable}%</span> of FY Budget Allocation remains uncommitted
                </p>
              ) : (
                <span className="font-segoe text-xs text-amber-800">Configure the FY Budget Allocation to calculate headroom</span>
              )}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-4">
              <BudgetExecutionPipeline
                releasedAndLiquidated={releasedBudget}
                pendingDisbursement={pendingDisbursement}
                remainingHeadroom={remainingHeadroom}
                totalAllocation={totalFYBudget}
                formatAmount={formatPesoAmount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. BUDGET ALLOCATION BY PURPOSE WITH PROPER FILTERING AND SORTING */}
      <div className="rounded-md border border-slate-300 bg-admin-surface shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="font-segoe text-base font-bold leading-none text-text-default">
              Budget Allocation by Purpose
            </h3>
            <p className="mt-1 font-segoe text-xs text-slate-500">
              Committed and released budget distributions grouped by canonical youth purpose.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Drawer / Popover Component */}
            <BudgetMonitoringFilterPopover
              filters={activeFilters}
              onChangeFilters={handleFilterChange}
              onResetFilters={handleResetFilters}
              options={resolvedFilterOptions}
              selectedFiscalYear={selectedFiscalYear}
            />

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex h-9 items-center gap-1 rounded-md border border-slate-300 px-2.5 font-segoe text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        <div className="px-6 pt-4">
          <BudgetMonitoringFilterSummary
            filters={activeFilters}
            onChangeFilters={handleFilterChange}
            onResetFilters={handleResetFilters}
            selectedFiscalYear={selectedFiscalYear}
          />
        </div>

        <div className="p-6">
          {categoryBreakdown.length > 0 && approvedBudget > 0 ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Recharts Donut (Top 5 + Other) with coherent denominator */}
              <div className="flex flex-col items-center justify-center lg:col-span-5">
                <div className="relative h-[240px] w-[240px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={78}
                        outerRadius={112}
                        minAngle={4}
                        paddingAngle={donutData.length > 1 ? 2 : 0}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [formatPesoAmount(val), "Approved"]}
                        contentStyle={{
                          backgroundColor: "var(--yt-surface, #ffffff)",
                          borderColor: "var(--yt-border, #CBD5E1)",
                          color: "var(--yt-text, #172033)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontFamily: "Segoe UI",
                          boxShadow: "var(--yt-shadow-md)",
                        }}
                        itemStyle={{
                          color: "var(--yt-text, #172033)",
                        }}
                        labelStyle={{
                          color: "var(--yt-text, #172033)",
                          fontWeight: 600,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Coherent Center Label: Denominator matches slices! */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="font-cascadia text-xl font-bold leading-tight text-public-text-brand">
                      {formatCompactPeso(approvedBudget)}
                    </p>
                    <p className="mt-0.5 font-segoe text-[11px] font-medium text-slate-500">
                      Total Approved
                    </p>
                    <p className="font-segoe text-[10px] text-slate-400">
                      FY {selectedFiscalYear}
                    </p>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2 text-center">
                  {donutData.map((slice) => (
                    <div key={slice.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-segoe text-[11px] text-slate-600 truncate max-w-[140px]">
                        {slice.name} ({slice.pctDisplay || `${slice.pct}%`})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Scalable compact synchronized table */}
              <div className="flex flex-col lg:col-span-7">
                {/* Header count indicator */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-segoe text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Category Allocation Breakdown
                  </span>
                  <span className="font-segoe text-xs text-slate-500 dark:text-slate-400">
                    {categoryBreakdown.length} {categoryBreakdown.length === 1 ? "category" : "categories"}
                  </span>
                </div>

                {/* Compact Table */}
                <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-admin-surface">
                  <table className="w-full text-left font-segoe text-xs">
                    <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 font-semibold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2.5">Purpose / Category</th>
                        <th className="px-3 py-2.5 text-right">Approved</th>
                        <th className="px-3 py-2.5 text-right">Released</th>
                        <th className="px-3 py-2.5 text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {pagedCategories.length ? (
                        pagedCategories.map((item) => {
                          const color = getCategoryColor(item.category);
                          const pct = approvedBudget > 0 ? ((item.approvedAmount / approvedBudget) * 100).toFixed(1) : "0.0";
                          return (
                            <tr key={item.category} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="font-medium text-text-default truncate max-w-[200px]">
                                    {item.category}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-cascadia font-semibold text-text-default">
                                {formatPesoAmount(item.approvedAmount)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-cascadia text-slate-600 dark:text-slate-400">
                                {formatPesoAmount(item.releasedAmount)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-cascadia font-bold text-public-text-brand">
                                {pct}%
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            No categories match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-segoe text-[11px] text-slate-500 dark:text-slate-400">
                      Showing {clampedPage * TABLE_PAGE_SIZE + 1} &ndash;{" "}
                      {Math.min((clampedPage + 1) * TABLE_PAGE_SIZE, categoryBreakdown.length)} of{" "}
                      {categoryBreakdown.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={clampedPage === 0}
                        onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-admin-surface text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 font-segoe text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {clampedPage + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={clampedPage >= totalPages - 1}
                        onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-admin-surface text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeFilterCount > 0 ? (
            /* Clear Empty State for Active Filters */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <FilterX className="h-6 w-6" />
              </div>
              <h4 className="mt-3 font-segoe text-sm font-semibold text-text-default">
                No budget records match the selected filters.
              </h4>
              <p className="mt-1 max-w-sm font-segoe text-xs text-slate-500">
                Try broadening your time period, category, status, or location criteria to see budget allocations.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 flex items-center gap-1.5 rounded-md bg-public-bg-brand px-3.5 py-2 font-segoe text-xs font-semibold text-white shadow-xs hover:bg-bg-brand-hover transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            </div>
          ) : (
            /* Empty State when no approved requests exist for FY */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h4 className="mt-3 font-segoe text-sm font-semibold text-text-default">
                No Approved Budget Requests for FY {selectedFiscalYear}
              </h4>
              <p className="mt-1 max-w-sm font-segoe text-xs text-slate-500">
                As budget requests belonging to this fiscal year are reviewed and approved, their canonical purpose allocations will automatically appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
