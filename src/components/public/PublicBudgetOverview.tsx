import { useState, useEffect, useId, useMemo } from "react";
import { AlertCircle, AlertTriangle, Building2, Calendar, ChevronDown, Clock, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBudgetPurposeCategory, type PublicBudgetSummary } from "@/lib/lydo-connect-data";
import { getPublicBudgetSummaryFromSupabase } from "@/lib/lydo-connect-supabase";
import { getCategoryColor, isCanonicalPurposeCategory } from "@/lib/budget-category-colors";
import { deriveBudgetMonitoringMetrics, getBudgetExecutionSegmentWidths } from "@/lib/budget-monitoring-presentation";

export interface PublicBudgetOverviewProps {
  data?: PublicBudgetSummary | null;
  loading?: boolean;
  selectedFiscalYear?: number;
  onFiscalYearChange?: (fiscalYear: number) => void;
  onAvailableFiscalYearsChange?: (fiscalYears: number[]) => void;
  availableFiscalYears?: number[];
  showFiscalYearSelector?: boolean;
  className?: string;
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPesoAmount(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return pesoFormatter.format(Number(value));
}

export function formatCompactPeso(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  const abs = Math.abs(num);
  const prefix = num < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${prefix}₱${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}₱${(abs / 1_000).toFixed(1)}K`;
  return `${prefix}₱${Math.round(abs).toLocaleString()}`;
}

function formatLastUpdated(dateStr?: string | null): string {
  if (!dateStr) return "Official PCYDO Records";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}


export default function PublicBudgetOverview({
  data: propData,
  loading: propLoading,
  selectedFiscalYear: propSelectedFiscalYear,
  onFiscalYearChange: propOnFiscalYearChange,
  onAvailableFiscalYearsChange: propOnAvailableFiscalYearsChange,
  availableFiscalYears: propAvailableFiscalYears,
  showFiscalYearSelector = true,
  className,
}: PublicBudgetOverviewProps) {
  const currentYear = new Date().getFullYear();
  const [internalFY, setInternalFY] = useState<number>(propSelectedFiscalYear ?? currentYear);
  const [internalData, setInternalData] = useState<PublicBudgetSummary | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fySelectorId = useId();

  const isControlledData = propData !== undefined;
  const activeData = isControlledData ? propData : internalData;
  const isLoading = propLoading !== undefined ? propLoading : internalLoading;
  const activeFY = propSelectedFiscalYear ?? (isControlledData ? activeData?.fiscalYear : internalFY) ?? internalFY;

  // Derive available FYs from props, active data, or defaults
  const resolvedAvailableFYs = useMemo(() => (
    propAvailableFiscalYears && propAvailableFiscalYears.length > 0
      ? propAvailableFiscalYears
      : activeData?.availableFiscalYears && activeData.availableFiscalYears.length > 0
      ? activeData.availableFiscalYears
      : [currentYear]
  ).slice().sort((a, b) => b - a), [propAvailableFiscalYears, activeData?.availableFiscalYears, currentYear]);

  useEffect(() => {
    propOnAvailableFiscalYearsChange?.(resolvedAvailableFYs);
  }, [propOnAvailableFiscalYearsChange, resolvedAvailableFYs]);

  // Autonomous data loader when propData is not passed
  useEffect(() => {
    if (isControlledData) return;

    let isMounted = true;
    const loadSummary = async () => {
      setInternalLoading(true);
      setFetchError(null);
      try {
        const summary = await getPublicBudgetSummaryFromSupabase(activeFY);
        if (isMounted) {
          setInternalData(summary);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load public budget summary:", err);
          setFetchError(err instanceof Error ? err.message : "Unable to load public budget summary.");
        }
      } finally {
        if (isMounted) {
          setInternalLoading(false);
        }
      }
    };

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [activeFY, isControlledData]);

  const handleSelectFY = (newFY: number) => {
    setInternalFY(newFY);
    if (propOnFiscalYearChange) {
      propOnFiscalYearChange(newFY);
    }
  };

  // Safe destructuring of activeData
  const isConfigured = activeData?.isConfigured ?? false;
  const annualBudget = activeData?.annualBudget ?? null;
  const approvedBudget = activeData?.approvedBudget ?? 0;
  const releasedBudget = activeData?.releasedBudget ?? 0;
  const liquidatedBudget = activeData?.liquidatedBudget ?? 0;
  const { pendingDisbursement, remainingHeadroom, isDeficit, deficitAmount } = deriveBudgetMonitoringMetrics({
    allocation: isConfigured ? annualBudget : null,
    approved: approvedBudget,
    released: releasedBudget,
  });
  const rawPurposeCategories = activeData?.purposeCategories ?? [];
  const purposeCategories = rawPurposeCategories.filter((item) =>
    isCanonicalPurposeCategory(item.category),
  );
  const districtAllocations = (activeData?.districtAllocations ?? []).filter(
    (item) => item.district === "District I" || item.district === "District II",
  );
  const unmappedPurposeAmount = activeData?.unmappedPurposeAmount ?? Math.max(
    approvedBudget - purposeCategories.reduce((sum, item) => sum + item.amount, 0),
    0,
  );
  const unassignedDistrictAmount = activeData?.unassignedDistrictAmount ?? (activeData?.districtAllocations ?? [])
    .filter((item) => item.district !== "District I" && item.district !== "District II")
    .reduce((sum, item) => sum + item.amount, 0);
  const lastUpdatedText = formatLastUpdated(activeData?.lastUpdated);

  const percentOf = (part: number, whole: number | null) => {
    if (!whole || whole <= 0) return null;
    const pct = (part / whole) * 100;
    return pct >= 0.1 || pct === 0 ? pct.toFixed(1) : pct.toFixed(2);
  };
  const approvedPct = percentOf(approvedBudget, isConfigured ? annualBudget : null);
  const releasedPct = percentOf(releasedBudget, approvedBudget);
  const liquidatedPct = percentOf(liquidatedBudget, releasedBudget);

  const stageCards = [
    {
      key: "allocation",
      label: "1. FY Budget Allocation",
      info: "The total Local Youth Development Fund allocated by the city for the fiscal year.",
      value: isConfigured ? formatPesoAmount(annualBudget) : "—",
      valueClass: "text-slate-900",
      note: isConfigured ? "Annual statutory allocation" : "Pending appropriation",
    },
    {
      key: "approved",
      label: "2. Approved Budget",
      info: "Budget requests approved by PCYDO and committed against the allocation.",
      value: formatPesoAmount(approvedBudget),
      valueClass: "text-[#2F6FD1]",
      note: approvedPct === null ? "Approved budget commitments" : `${approvedPct}% of FY allocation approved`,
    },
    {
      key: "released",
      label: "3. Released Budget",
      info: "Approved budget that has been released to organizations.",
      value: formatPesoAmount(releasedBudget),
      valueClass: "text-[#C98A0B]",
      note: releasedPct === null ? "Released amount" : `${releasedPct}% of approved budget released`,
    },
    {
      key: "liquidated",
      label: "4. Liquidated Budget",
      info: "Released budget that organizations have accounted for through liquidation reports.",
      value: formatPesoAmount(liquidatedBudget),
      valueClass: "text-[#16956B]",
      note: liquidatedPct === null ? "Liquidated amount" : `${liquidatedPct}% of released budget liquidated`,
    },
  ];

  const trackWidths = getBudgetExecutionSegmentWidths({
    releasedAndLiquidated: releasedBudget,
    pendingDisbursement,
    remainingHeadroom,
    totalAllocation: isConfigured ? annualBudget : null,
  });
  const trackSegments = [
    { key: "releasedAndLiquidated" as const, label: "Released & Liquidated", amount: releasedBudget as number | null, color: "bg-[#16956B]" },
    { key: "pendingDisbursement" as const, label: "Pending Disbursement", amount: pendingDisbursement as number | null, color: "bg-[#D4960E]" },
    { key: "remainingHeadroom" as const, label: "Remaining Balance", amount: remainingHeadroom, color: "bg-slate-300" },
  ];

  return (
    <section
      aria-label="Public Youth Budget Overview"
      className={cn("public-budget-overview w-full max-w-7xl mx-auto space-y-6", className)}
    >
      {/* 1. Header */}
      <div className="public-budget-overview-header flex flex-col gap-4 border-b border-public-border-default pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="public-budget-record-context font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
            Official PCYDO Records
          </p>
          <h2 className="mt-2 font-tnr text-[28px] font-normal leading-[1.15] text-public-text-brand sm:text-[32px]">
            From Allocation to Liquidation
          </h2>
          <p className="mt-1.5 max-w-2xl font-inter text-sm text-slate-600">
            A summary of the Local Youth Development Fund's allocation, utilization, and remaining balance.
          </p>
        </div>

        <div className="public-budget-controls flex flex-wrap items-center gap-4 self-start md:self-auto">
          {showFiscalYearSelector && (
            <div className="flex items-center gap-2">
              <label htmlFor={fySelectorId} className="sr-only">
                Select Fiscal Year
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    id={fySelectorId}
                    type="button"
                    aria-label={`Select Fiscal Year. Currently FY ${activeFY}`}
                    className="group flex h-9 items-center gap-2 rounded-[2px] border border-[#C9D8EE] bg-[#EAF1FB] px-3 font-inter text-sm font-semibold text-public-text-brand transition-colors hover:border-public-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand focus-visible:ring-offset-2"
                  >
                    <Calendar className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span>FY {activeFY}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={4} className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[130px] rounded-[2px] border-public-border-default bg-white p-0 font-inter shadow-lg">
                  {resolvedAvailableFYs.map((fy) => (
                    <DropdownMenuItem
                      key={fy}
                      onClick={() => handleSelectFY(fy)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-none border-b border-l-2 border-public-border-default px-3 py-3 text-sm last:border-b-0 focus:bg-public-bg-section focus:text-public-text-brand",
                        fy === activeFY
                          ? "border-l-public-border-brand bg-public-bg-section font-semibold text-public-text-brand"
                          : "border-l-transparent text-public-text-neutral-default"
                      )}
                    >
                      <span>FY {fy}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <p className="public-budget-freshness flex items-center gap-1.5 font-inter text-xs text-public-text-secondary">
            <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Last updated: {lastUpdatedText}</span>
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-[2px] border border-public-border-default bg-white p-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm font-medium text-slate-600 font-inter">
            Retrieving official PCYDO financial records for FY {activeFY}...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && fetchError && (
        <div className="rounded-[2px] border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Unable to load budget summary</p>
              <p className="text-xs text-amber-700 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectFY(activeFY)}
            className="flex h-10 items-center gap-2 rounded-[2px] border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100/50"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Retry
          </button>
        </div>
      )}

      {!isLoading && !fetchError && (
        <>
          {isDeficit && (
            <div className="rounded-[2px] border border-rose-200 border-l-4 border-l-rose-600 bg-rose-50 p-5 flex items-start gap-3.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-950 font-inter">
                  Allocation Ceiling Reached
                </h3>
                <p className="text-xs sm:text-sm text-rose-800 font-inter leading-relaxed">
                  Approved youth project commitments exceed the current annual city allocation baseline by{" "}
                  <span className="font-cascadia font-bold underline">
                    {formatPesoAmount(deficitAmount)}
                  </span>
                  . Further grant approvals require supplemental city appropriation.
                </p>
              </div>
            </div>
          )}

          {!isConfigured && (
            <div className="rounded-[2px] border border-public-border-default bg-white p-6 text-center space-y-2">
              <Building2 className="h-8 w-8 text-slate-400 mx-auto" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-slate-800 font-inter">
                FY Budget Allocation Not Configured for FY {activeFY}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto font-inter">
                The City Government of Pasig has not published a statutory baseline allocation for this fiscal year yet. When approved, official allocations and grant distributions will appear here.
              </p>
            </div>
          )}

          {/* 2. Budget execution pipeline */}
          <div className="public-budget-pipeline space-y-5 rounded-[2px] border border-public-border-default bg-white p-5 sm:p-6">
            <div>
              <h3 className="sr-only">Budget Execution Pipeline &middot; FY {activeFY}</h3>
              <p className="font-inter text-xs text-slate-600">
                Current allocation status, including released funds, pending disbursements, and remaining available balance.
              </p>
            </div>

            <div className="public-budget-stages grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {stageCards.map((card) => (
                <div key={card.key} className="rounded-[2px] border border-public-border-default bg-public-bg-section p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-inter text-[11px] font-semibold uppercase tracking-wider text-slate-800">
                      {card.label}
                    </span>
                    <span title={card.info} aria-label={card.info} role="img" className="text-slate-400">
                      <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className={cn("text-xl font-bold tracking-tight font-cascadia sm:text-2xl", card.valueClass)}>
                      {card.value}
                    </div>
                    <div className="mt-1 font-inter text-xs text-slate-500">
                      {card.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="public-budget-execution-track space-y-3">
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
                {trackSegments.map((segment) => (
                  <li key={segment.key} className="flex items-center gap-2 font-inter text-xs text-slate-700">
                    <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", segment.color)} />
                    <span>{segment.label}</span>
                    <span className={cn("font-cascadia font-bold tabular-nums", segment.amount !== null && segment.amount < 0 ? "text-rose-700" : "text-slate-900")}>
                      {segment.amount === null ? "Unavailable" : formatPesoAmount(segment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                role="img"
                aria-label={`Budget execution pipeline. ${trackSegments.map((segment) => `${segment.label}: ${segment.amount === null ? "Unavailable" : formatPesoAmount(segment.amount)}`).join("; ")}.`}
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
              >
                {trackSegments.map((segment) => (
                  <div
                    key={segment.key}
                    aria-hidden="true"
                    data-budget-state={segment.key}
                    className={cn("h-full shrink-0", segment.color)}
                    style={{ width: `${trackWidths[segment.key]}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 3. Purpose and district distribution */}
          <div className="public-budget-distribution grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="public-budget-purpose space-y-4 rounded-[2px] border border-public-border-default bg-white p-5 sm:p-6 lg:col-span-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-inter text-base font-semibold text-public-text-brand">
                    Youth Budget Allocation by Purpose
                  </h3>
                  <p className="font-inter text-xs text-slate-500">
                    Approved allocations grouped by purpose and arranged by amount.
                  </p>
                </div>
                <span className="font-inter text-xs text-slate-500">
                  Total: <span className="font-cascadia font-bold text-slate-900">{formatCompactPeso(approvedBudget)}</span>
                </span>
              </div>

              {purposeCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-inter">
                  No approved youth grant allocations for FY {activeFY} yet.
                </div>
              ) : (
                <div
                  role="region"
                  aria-label={`Purpose allocations for FY ${activeFY}`}
                  tabIndex={0}
                  className="public-budget-purpose-list max-h-[320px] space-y-3 overflow-y-auto overscroll-contain pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin]"
                >
                  {purposeCategories.map((item) => {
                    const color = getCategoryColor(item.category);
                    return (
                      <div key={item.category} className="space-y-1.5">
                        <div className="public-budget-purpose-label flex items-start justify-between gap-3 font-inter text-xs">
                          <span className="flex min-w-0 flex-1 items-center gap-2 text-slate-700">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="min-w-0 break-words">{formatBudgetPurposeCategory(item.category)}</span>
                          </span>
                          <span className="shrink-0 text-right font-cascadia font-semibold text-slate-900">
                            {formatPesoAmount(item.amount)} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: color }}
                            className="h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {unmappedPurposeAmount > 0 && (
                <p className="rounded-[2px] bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                  {formatPesoAmount(unmappedPurposeAmount)} in approved records does not match a canonical Purpose / Category selected for its organization, so it is excluded from the category list.
                </p>
              )}
            </div>

            <div className="space-y-4 rounded-[2px] border border-public-border-default bg-white p-5 sm:p-6">
              <div>
                <h3 className="font-inter text-base font-semibold text-public-text-brand">
                  District Distribution
                </h3>
                <p className="font-inter text-xs text-slate-500">
                  Summary of budget allocations across Pasig City's two legislative districts.
                </p>
              </div>

              {districtAllocations.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-sm font-inter">
                  {unassignedDistrictAmount > 0 ? (
                    <>
                      <p>No approved allocations could be assigned to District I or District II for FY {activeFY}.</p>
                      <p className="mt-2 font-semibold text-slate-700">Unassigned: {formatPesoAmount(unassignedDistrictAmount)}</p>
                    </>
                  ) : (
                    <p>No approved district allocations for FY {activeFY}.</p>
                  )}
                </div>
              ) : (
                <div
                  role="region"
                  aria-label={`District allocations for FY ${activeFY}`}
                  className="space-y-3"
                >
                  {districtAllocations.map((dist) => (
                    <div
                      key={dist.district}
                      className="space-y-2 rounded-[4px] border border-public-border-default bg-public-bg-section p-4"
                    >
                      <div className="flex items-center justify-between font-inter text-xs">
                        <span className="font-semibold text-slate-800">{dist.district}</span>
                        <span className="font-cascadia font-bold text-slate-900">{dist.percentage}%</span>
                      </div>
                      <div className="font-cascadia text-xl font-bold text-public-text-brand">
                        {formatPesoAmount(dist.amount)}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          style={{ width: `${Math.min(dist.percentage, 100)}%` }}
                          className="h-full rounded-full bg-public-bg-brand transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {districtAllocations.length > 0 && unassignedDistrictAmount > 0 && (
                <p className="rounded-[2px] bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                  {formatPesoAmount(unassignedDistrictAmount)} in approved records could not be mapped from the organization’s headquarters Barangay to a Pasig district.
                </p>
              )}

              <div className="rounded-[4px] border border-[#C9D8EE] bg-[#EEF4FC] p-3 font-inter text-[11px] leading-relaxed text-public-text-neutral-default">
                <p className="font-semibold text-public-text-brand">Public Privacy Standard</p>
                <p className="mt-0.5">
                  Organization identities and individual grant applications are kept confidential in accordance with applicable data privacy laws and public disclosure requirements.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
