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
  Info,
  Search,
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
  activeInField: number;
  categoryBreakdown: PurposeCategoryItem[];
  formatPesoAmount: (value?: number | null) => string;
  formatCompactPeso: (value: number) => string;
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
  activeInField,
  categoryBreakdown,
  formatPesoAmount,
  formatCompactPeso,
}: BudgetMonitoringOverviewProps) => {
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(0);

  const isConfigured = annualAllocation !== null;
  const totalFYBudget = isConfigured ? annualAllocation.totalAmount : null;

  // Authoritative financial calculations
  // Headroom = FY Budget - Approved (NOT FY Budget - Released)
  const rawHeadroom = totalFYBudget !== null ? totalFYBudget - approvedBudget : null;
  const isDeficit = rawHeadroom !== null && rawHeadroom < 0;
  const deficitAmount = isDeficit ? Math.abs(rawHeadroom) : 0;
  const remainingHeadroom = rawHeadroom;

  // Utilization progression percentages
  const percentClearedOfReleased =
    releasedBudget > 0 ? Math.round((liquidatedBudget / releasedBudget) * 100) : 0;

  const percentAvailable =
    totalFYBudget !== null && totalFYBudget > 0 && remainingHeadroom !== null
      ? ((Math.max(remainingHeadroom, 0) / totalFYBudget) * 100).toFixed(1)
      : null;

  // Pipeline proportions for the authoritative progression bar
  // Base is totalFYBudget if configured and not exceeded; if exceeded or unconfigured, base is approvedBudget or releasedBudget
  const pipelineBaseline = Math.max(totalFYBudget ?? 0, approvedBudget, releasedBudget, 1);
  const liquidatedBarPct = Math.min((liquidatedBudget / pipelineBaseline) * 100, 100);
  const activeInFieldBarPct = Math.min((activeInField / pipelineBaseline) * 100, 100 - liquidatedBarPct);
  const pendingDisbursementBarPct = Math.min(
    (pendingDisbursement / pipelineBaseline) * 100,
    100 - liquidatedBarPct - activeInFieldBarPct
  );
  const headroomBarPct =
    isConfigured && !isDeficit && remainingHeadroom !== null
      ? Math.max(100 - liquidatedBarPct - activeInFieldBarPct - pendingDisbursementBarPct, 0)
      : 0;

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

  // Search & pagination for the compact categories detail table
  const filteredCategories = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return categoryBreakdown;
    return categoryBreakdown.filter((c) => c.category.toLowerCase().includes(q));
  }, [categoryBreakdown, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / TABLE_PAGE_SIZE));
  const clampedPage = Math.min(tablePage, totalPages - 1);
  const pagedCategories = useMemo(() => {
    return filteredCategories.slice(
      clampedPage * TABLE_PAGE_SIZE,
      clampedPage * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE
    );
  }, [filteredCategories, clampedPage]);

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
            {/* Real Interactive Fiscal Year Selector (Part 4, 21) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Select Fiscal Year"
                  className="flex h-10 items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 font-segoe text-sm font-semibold text-text-default shadow-sm transition-colors hover:bg-slate-50 focus:outline-none"
                >
                  <Calendar className="h-4 w-4 text-public-text-brand" />
                  <span>FY {selectedFiscalYear}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-md border-slate-300 bg-white p-1 shadow-lg">
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
                        ? "bg-public-bg-secondary-100 text-public-text-brand font-bold"
                        : "text-text-default hover:bg-slate-100"
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

            {/* Admin Configuration Entry Point (Part 3, 22) */}
            <button
              type="button"
              onClick={onOpenConfigureModal}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 font-segoe text-xs font-semibold shadow-sm transition-colors",
                isConfigured
                  ? "border border-slate-300 bg-white text-text-default hover:bg-slate-50"
                  : "bg-public-bg-brand text-white hover:bg-bg-brand-hover"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isConfigured ? "Edit FY Allocation" : "Configure FY Budget"}
            </button>
          </div>
        </div>

        {/* 2. Unconfigured State Alert Banner (Part 9) */}
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

        {/* 3. Deficit Warning Alert Banner (Part 8) */}
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

        {/* 4. PRIMARY KPI HEADER (Part 12) */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: FY Budget Allocation */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    FY Budget Allocation
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
                <p className="font-cascadia text-lg font-bold leading-tight text-text-default">
                  {isConfigured ? formatPesoAmount(totalFYBudget) : "Not Configured"}
                </p>
                <p className="font-segoe text-xs text-slate-500">
                  {annualAllocation?.statutoryBaselineNotes || "Approved annual statutory ceiling"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-slate-500">Remaining Headroom</span>
                <span
                  className={cn(
                    "font-cascadia text-[11px] font-bold",
                    !isConfigured
                      ? "text-slate-400"
                      : isDeficit
                      ? "text-red-600"
                      : "text-emerald-700"
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
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Approved / Committed
                  </p>
                  <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-segoe text-[10px] font-bold text-blue-700 uppercase">
                    Committed
                  </span>
                </div>
                <p className="font-cascadia text-lg font-bold leading-tight text-blue-700">
                  {formatPesoAmount(approvedBudget)}
                </p>
                <p className="font-segoe text-xs text-slate-500">Approved by administrators</p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-slate-500">Pending Disbursement</span>
                <span className="font-cascadia text-[11px] font-bold text-text-default">
                  {formatPesoAmount(pendingDisbursement)}
                </span>
              </div>
            </div>

            {/* Card 3: Released Budget */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Released Budget
                  </p>
                  <span className="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 font-segoe text-[10px] font-bold text-cyan-700 uppercase">
                    Disbursed
                  </span>
                </div>
                <p className="font-cascadia text-lg font-bold leading-tight text-cyan-700">
                  {formatPesoAmount(releasedBudget)}
                </p>
                <p className="font-segoe text-xs text-slate-500">Disbursed to youth organizations</p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-slate-500">Active in Field</span>
                <span className="font-cascadia text-[11px] font-bold text-text-default">
                  {formatPesoAmount(activeInField)}
                </span>
              </div>
            </div>

            {/* Card 4: Liquidated Budget */}
            <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Liquidated Budget
                  </p>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-segoe text-[10px] font-bold text-emerald-700 uppercase">
                    Audited
                  </span>
                </div>
                <p className="font-cascadia text-lg font-bold leading-tight text-emerald-700">
                  {formatPesoAmount(liquidatedBudget)}
                </p>
                <p className="font-segoe text-xs text-slate-500">Audited with official receipts</p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="font-segoe text-[11px] text-slate-500">Cleared of Released</span>
                <span className="font-segoe text-[11px] font-bold text-emerald-700">
                  {percentClearedOfReleased}% Cleared
                </span>
              </div>
            </div>
          </div>

          {/* 5. UTILIZATION PIPELINE (Part 13) */}
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="font-segoe text-xs font-bold text-text-default">
                  Budget Execution Pipeline &middot; FY {selectedFiscalYear}
                </p>
                <span className="font-segoe text-[11px] text-slate-500">
                  (Progression: Allocation &rarr; Approved &rarr; Released &rarr; Liquidated)
                </span>
              </div>

              {percentAvailable !== null ? (
                <p className="font-segoe text-xs font-semibold text-slate-600">
                  <span className="font-cascadia text-emerald-700 font-bold">{percentAvailable}%</span> Available for New Grants
                </p>
              ) : isDeficit ? (
                <span className="rounded bg-red-100 px-2 py-0.5 font-segoe text-xs font-bold text-red-700">
                  Over-Budget Deficit
                </span>
              ) : (
                <span className="font-segoe text-xs text-amber-700">Baseline Required for Available %</span>
              )}
            </div>

            {/* Authoritative Single Progression Track */}
            <div className="mt-3 flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${liquidatedBarPct}%` }}
                title={`Liquidated: ${formatPesoAmount(liquidatedBudget)}`}
              />
              <div
                className="h-full bg-public-bg-brand transition-all duration-300"
                style={{ width: `${activeInFieldBarPct}%` }}
                title={`Active in Field: ${formatPesoAmount(activeInField)}`}
              />
              <div
                className="h-full bg-blue-300 transition-all duration-300"
                style={{ width: `${pendingDisbursementBarPct}%` }}
                title={`Pending Disbursement: ${formatPesoAmount(pendingDisbursement)}`}
              />
              {headroomBarPct > 0 && (
                <div
                  className="h-full bg-emerald-100 transition-all duration-300"
                  style={{ width: `${headroomBarPct}%` }}
                  title={`Remaining Headroom: ${formatPesoAmount(remainingHeadroom)}`}
                />
              )}
            </div>

            {/* Pipeline Chips Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium text-text-default">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
                  Liquidated &amp; Cleared:{" "}
                  <span className="font-cascadia font-bold text-emerald-700">
                    {formatPesoAmount(liquidatedBudget)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium text-text-default">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-public-bg-brand" />
                  Active in Field:{" "}
                  <span className="font-cascadia font-bold text-public-text-brand">
                    {formatPesoAmount(activeInField)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium text-text-default">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-300" />
                  Pending Disbursement:{" "}
                  <span className="font-cascadia font-bold text-text-default">
                    {formatPesoAmount(pendingDisbursement)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium text-text-default">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      !isConfigured ? "bg-slate-300" : isDeficit ? "bg-red-500" : "bg-emerald-100 border border-emerald-400"
                    )}
                  />
                  Remaining Headroom:{" "}
                  <span
                    className={cn(
                      "font-cascadia font-bold",
                      !isConfigured ? "text-slate-500" : isDeficit ? "text-red-600" : "text-emerald-700"
                    )}
                  >
                    {!isConfigured
                      ? "Unavailable"
                      : isDeficit
                      ? `-${formatPesoAmount(deficitAmount)}`
                      : formatPesoAmount(remainingHeadroom)}
                  </span>
                </span>
              </div>

              {isConfigured && (
                <div className="font-segoe text-[11px] text-slate-500">
                  Total Statutory Ceiling:{" "}
                  <span className="font-cascadia font-bold text-text-default">
                    {formatPesoAmount(totalFYBudget)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. BUDGET ALLOCATION BY PURPOSE (Parts 14, 15, 16) */}
      <div className="rounded-md border border-slate-300 bg-admin-surface shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-segoe text-base font-bold leading-none text-text-default">
            Budget Allocation by Purpose
          </h3>
          <p className="mt-1 font-segoe text-xs text-slate-500">
            Committed and released budget distributions grouped by canonical youth purpose for FY {selectedFiscalYear}.
          </p>
        </div>

        <div className="p-6">
          {categoryBreakdown.length > 0 && approvedBudget > 0 ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Recharts Donut (Top 5 + Other) with coherent denominator (Parts 15, 16) */}
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
                          backgroundColor: "#ffffff",
                          borderColor: "#CBD5E1",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontFamily: "Segoe UI",
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

              {/* Right Column: Scalable compact searchable/paginated table (Part 15) */}
              <div className="flex flex-col lg:col-span-7">
                {/* Search Bar */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search purpose / category..."
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setTablePage(0);
                      }}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 font-segoe text-xs text-text-default placeholder:text-slate-400 focus:border-public-bg-brand focus:outline-none"
                    />
                  </div>
                  <span className="font-segoe text-xs text-slate-500">
                    {filteredCategories.length} {filteredCategories.length === 1 ? "category" : "categories"}
                  </span>
                </div>

                {/* Compact Table */}
                <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                  <table className="w-full text-left font-segoe text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Purpose / Category</th>
                        <th className="px-3 py-2.5 text-right">Approved</th>
                        <th className="px-3 py-2.5 text-right">Released</th>
                        <th className="px-3 py-2.5 text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedCategories.length ? (
                        pagedCategories.map((item) => {
                          const color = getCategoryColor(item.category);
                          const pct = approvedBudget > 0 ? ((item.approvedAmount / approvedBudget) * 100).toFixed(1) : "0.0";
                          return (
                            <tr key={item.category} className="hover:bg-slate-50/60 transition-colors">
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
                              <td className="px-3 py-2.5 text-right font-cascadia text-slate-600">
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
                          <td colSpan={4} className="p-4 text-center text-xs text-slate-500">
                            No categories match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-segoe text-[11px] text-slate-500">
                      Showing {clampedPage * TABLE_PAGE_SIZE + 1} &ndash;{" "}
                      {Math.min((clampedPage + 1) * TABLE_PAGE_SIZE, filteredCategories.length)} of{" "}
                      {filteredCategories.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={clampedPage === 0}
                        onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 font-segoe text-xs font-semibold text-slate-700">
                        {clampedPage + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={clampedPage >= totalPages - 1}
                        onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
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
