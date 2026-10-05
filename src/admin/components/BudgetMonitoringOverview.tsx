import { useState, useMemo, useLayoutEffect, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileSpreadsheet,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { AnnualBudgetAllocation } from "@/lib/lydo-connect-data";
import { getCategoryColor, isCanonicalPurposeCategory } from "@/lib/budget-category-colors";
import { BUDGET_MONITORING_COLORS, BUDGET_MONITORING_LABELS, deriveBudgetMonitoringMetrics } from "@/lib/budget-monitoring-presentation";
import { BudgetExecutionPipeline } from "@/components/portal/BudgetExecutionPipeline";
import { formatBudgetPurposeCategory } from "@/lib/lydo-connect-data";
import { getDonutLabelLayout } from "./budget-donut-layout";

export type PurposeCategoryItem = {
  category: string;
  approvedAmount: number;
  releasedAmount: number;
  count: number;
};

type BudgetMonitoringOverviewProps = {
  selectedFiscalYear: number;
  annualAllocation: AnnualBudgetAllocation | null;
  onOpenConfigureModal: () => void;
  approvedBudget: number;
  releasedBudget: number;
  liquidatedBudget: number;
  pendingDisbursement: number;
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
  annualAllocation,
  onOpenConfigureModal,
  approvedBudget,
  releasedBudget,
  liquidatedBudget,
  pendingDisbursement,
  categoryBreakdown,
  formatPesoAmount,
  formatCompactPeso,
}: BudgetMonitoringOverviewProps) => {
  const [tablePage, setTablePage] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(520);
  useLayoutEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setChartWidth(Math.round(width));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
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

  const canonicalDonutCategories = useMemo(
    () => categoryBreakdown.filter((item) => item.approvedAmount > 0 && isCanonicalPurposeCategory(item.category)),
    [categoryBreakdown],
  );
  const donutTotal = useMemo(
    () => canonicalDonutCategories.reduce((sum, item) => sum + item.approvedAmount, 0),
    [canonicalDonutCategories],
  );

  // The donut always uses every real category in the current filtered dataset.
  // Its denominator is the sum of those same categories so the center reconciles.
  const donutData = useMemo(() => {
    if (donutTotal <= 0) return [];
    return canonicalDonutCategories.map((item) => ({
        name: formatBudgetPurposeCategory(item.category),
        value: item.approvedAmount,
        color: getCategoryColor(item.category),
        pctDisplay: formatPercentageDisplay(item.approvedAmount, donutTotal),
      }));
  }, [canonicalDonutCategories, donutTotal]);

  const donutLabelLayout = useMemo(() => getDonutLabelLayout(donutData, chartWidth), [donutData, chartWidth]);

  const renderDonutLabel = (props: Record<string, any>) => {
    const name = String(props.name ?? props.payload?.name ?? "");
    const layout = donutLabelLayout.positions.get(name);
    if (!layout) return null;

    const slice = donutData.find((s) => s.name === name);
    const pctDisplay = slice?.pctDisplay ?? "";

    // Adapt if Recharts provides a shifted cx/cy in specific viewport contexts
    const dx = props.cx !== undefined ? Number(props.cx) - donutLabelLayout.cx : 0;
    const dy = props.cy !== undefined ? Number(props.cy) - donutLabelLayout.cy : 0;
    const transform = dx !== 0 || dy !== 0 ? `translate(${dx}, ${dy})` : undefined;

    const textX = layout.textX;
    const textAnchor = layout.side === "right" ? "start" : "end";

    return (
      <g
        key={name}
        aria-label={`${name}, ${pctDisplay}`}
        transform={transform}
        className="pointer-events-none select-none"
      >
        {/* Two-stage leader line: slice arc -> elbow -> horizontal connector */}
        <path
          d={layout.leaderLine.pathD}
          fill="none"
          stroke="var(--yt-border-strong, #94a3b8)"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Crisp label block: category name with visual emphasis, percentage underneath */}
        <text
          x={textX}
          y={layout.top + 10}
          textAnchor={textAnchor}
          fill="var(--yt-text, #1e293b)"
          fontSize={11}
          fontWeight={600}
          fontFamily="Segoe UI, -apple-system, sans-serif"
        >
          {layout.lines.map((line, index) => (
            <tspan key={`${name}-${index}`} x={textX} dy={index === 0 ? 0 : 13}>
              {line}
            </tspan>
          ))}
          <tspan
            x={textX}
            dy={14}
            fill="var(--yt-text-muted, #64748b)"
            fontSize={10}
            fontWeight={500}
            fontFamily="Cascadia Code, Segoe UI, monospace"
          >
            {pctDisplay}
          </tspan>
        </text>
      </g>
    );
  };

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
                  Budget Monitoring cannot calculate remaining headroom until the annual PCYDO allocation is configured.
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

        </div>

        <div className="p-6">
          {categoryBreakdown.length > 0 && donutTotal > 0 ? (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-center">
              {/* Every filtered category gets its own slice and external label. */}
              <div className="flex min-w-0 flex-col items-center justify-center xl:col-span-6">
                <div ref={chartRef} className="relative h-auto w-full min-w-0 shrink-0">
                  <ResponsiveContainer width="100%" height={donutLabelLayout.chartHeight}>
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx={donutLabelLayout.cx}
                        cy={donutLabelLayout.cy}
                        innerRadius={donutLabelLayout.innerRadius}
                        outerRadius={donutLabelLayout.radius}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={donutData.length > 1 ? Math.min(1.5, 8 / donutData.length) : 0}
                        stroke="#ffffff"
                        strokeWidth={2}
                        label={donutLabelLayout.compact ? false : renderDonutLabel}
                        labelLine={false}
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
                      {formatCompactPeso(donutTotal)}
                    </p>
                    <p className="mt-0.5 font-segoe text-[11px] font-medium text-slate-500">
                      Total Approved
                    </p>
                    <p className="font-segoe text-[10px] text-slate-400">
                      FY {selectedFiscalYear}
                    </p>
                  </div>
                </div>
                {donutLabelLayout.compact && (
                  <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-2 px-1 pb-1 sm:grid-cols-2" aria-label="Budget allocation categories">
                    {donutData.map((slice) => (
                      <li key={slice.name} className="flex min-w-0 items-start gap-2 text-xs text-text-default">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 leading-snug">{slice.name}</span>
                        <span className="shrink-0 font-cascadia text-[11px] text-slate-500">{slice.pctDisplay}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Right Column: Scalable compact synchronized table */}
              <div className="flex flex-col xl:col-span-6">
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
                                    {formatBudgetPurposeCategory(item.category)}
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
