import { useState, useEffect, useId, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Coins,
  FileCheck,
  Globe,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicBudgetSummary } from "@/lib/lydo-connect-data";
import { getPublicBudgetSummaryFromSupabase } from "@/lib/lydo-connect-supabase";
import { getCategoryColor } from "@/lib/budget-category-colors";

export interface PublicBudgetOverviewProps {
  data?: PublicBudgetSummary | null;
  loading?: boolean;
  selectedFiscalYear?: number;
  onFiscalYearChange?: (fiscalYear: number) => void;
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
  if (!dateStr) return "Official LYDO Records";
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
  const activeFY = propSelectedFiscalYear ?? activeData?.fiscalYear ?? internalFY;

  // Derive available FYs from props, active data, or defaults
  const resolvedAvailableFYs = (
    propAvailableFiscalYears && propAvailableFiscalYears.length > 0
      ? propAvailableFiscalYears
      : activeData?.availableFiscalYears && activeData.availableFiscalYears.length > 0
      ? activeData.availableFiscalYears
      : [currentYear]
  ).slice().sort((a, b) => b - a);

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
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load public budget summary:", err);
          setFetchError(err?.message || "Unable to load public budget summary.");
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
  const remainingHeadroom = activeData?.remainingHeadroom ?? null;
  const isDeficit = activeData?.isDeficit ?? false;
  const deficitAmount = activeData?.deficitAmount ?? 0;
  const percentCommitted = activeData?.percentCommitted ?? null;
  const percentReleased = activeData?.percentReleased ?? null;
  const percentLiquidated = activeData?.percentLiquidated ?? null;
  const purposeCategories = activeData?.purposeCategories ?? [];
  const districtAllocations = activeData?.districtAllocations ?? [];
  const lastUpdatedText = formatLastUpdated(activeData?.lastUpdated);

  const auditedPctDisplay = useMemo(() => {
    if (!releasedBudget || releasedBudget <= 0 || !liquidatedBudget || liquidatedBudget <= 0) {
      return "0% of disbursed";
    }
    const pct = (liquidatedBudget / releasedBudget) * 100;
    if (pct >= 100) return "100% of disbursed";
    if (pct >= 10) return `${pct.toFixed(1).replace(/\.0$/, "")}% of disbursed`;
    if (pct >= 0.1) return `${pct.toFixed(1).replace(/\.0$/, "")}% of disbursed`;
    return `${pct.toFixed(2)}% of disbursed`;
  }, [liquidatedBudget, releasedBudget]);

  const committedPctDisplay = useMemo(() => {
    if (!annualBudget || annualBudget <= 0) return "Active commitments";
    const pct = (approvedBudget / annualBudget) * 100;
    if (pct >= 10) return `${pct.toFixed(1).replace(/\.0$/, "")}% committed`;
    if (pct >= 0.1) return `${pct.toFixed(1).replace(/\.0$/, "")}% committed`;
    return `${pct.toFixed(2)}% committed`;
  }, [approvedBudget, annualBudget]);

  const disbursedPctDisplay = useMemo(() => {
    if (!approvedBudget || approvedBudget <= 0) return "Cash released";
    const pct = (releasedBudget / approvedBudget) * 100;
    if (pct >= 100) return "100% of approved";
    if (pct >= 10) return `${pct.toFixed(1).replace(/\.0$/, "")}% of approved`;
    if (pct >= 0.1) return `${pct.toFixed(1).replace(/\.0$/, "")}% of approved`;
    return `${pct.toFixed(2)}% of approved`;
  }, [releasedBudget, approvedBudget]);

  return (
    <section
      aria-label="Public Youth Budget Overview"
      className={cn("w-full max-w-7xl mx-auto space-y-6 sm:space-y-8", className)}
    >
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-public-text-brand mb-1">
            <span>Pasig City Youth Development</span>
            <span className="text-slate-300">•</span>
            <span>Official LYDO Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-segoe">
            Budget Transparency
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl font-segoe">
            Official financial snapshot of the Local Youth Development Fund.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Interactive FY Selector */}
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
                    className="flex h-11 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500 shrink-0" strokeWidth={1.75} />
                      <span>FY {activeFY}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={1.75} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg border-slate-200 bg-white p-1 shadow-lg">
                  {resolvedAvailableFYs.map((fy) => (
                    <DropdownMenuItem
                      key={fy}
                      onClick={() => handleSelectFY(fy)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
                        fy === activeFY
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span>FY {fy}</span>
                      {fy === activeFY && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Freshness Badge */}
          <div className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 text-xs text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-segoe">Last updated: {lastUpdatedText}</span>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm font-medium text-slate-600 font-segoe">
            Retrieving official LYDO financial records for FY {activeFY}...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && fetchError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            className="flex h-10 items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100/50"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Retry
          </button>
        </div>
      )}

      {!isLoading && !fetchError && (
        <>
          {/* Deficit Alert Banner if Commitments Exceed Annual Baseline */}
          {isDeficit && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-5 flex items-start gap-3.5 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-rose-950 font-segoe">
                  Allocation Ceiling Reached
                </h2>
                <p className="text-xs sm:text-sm text-rose-800 font-segoe leading-relaxed">
                  Approved youth project commitments exceed the current annual city allocation baseline by{" "}
                  <span className="font-cascadia font-bold underline">
                    {formatPesoAmount(deficitAmount)}
                  </span>
                  . Further grant approvals require supplemental city appropriation.
                </p>
              </div>
            </div>
          )}

          {/* Unconfigured FY Graceful Notice */}
          {!isConfigured && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-6 text-center space-y-2">
              <Building2 className="h-8 w-8 text-slate-400 mx-auto" strokeWidth={1.5} />
              <h2 className="text-base font-semibold text-slate-800 font-segoe">
                Annual Budget Not Configured for FY {activeFY}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto font-segoe">
                The City Government of Pasig has not published a statutory baseline allocation for this fiscal year yet. When approved, official allocations and grant distributions will appear here.
              </p>
            </div>
          )}

          {/* 2. Financial Execution Progression — Single Visual Source of Truth */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-segoe">
                  Financial Execution Progression
                </h2>
                <p className="text-xs text-slate-500 font-segoe mt-0.5">
                  Official stage-by-stage progression from statutory allocation to verified audit.
                </p>
              </div>

              {/* Available for New Grants — Concise Supporting Metric */}
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs shadow-2xs self-start sm:self-auto",
                  isDeficit
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                <Sparkles
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isDeficit ? "text-rose-600" : "text-emerald-600"
                  )}
                  strokeWidth={1.75}
                />
                <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 font-segoe">
                  Available for New Grants:
                </span>
                <span
                  className={cn(
                    "font-cascadia font-bold text-sm",
                    isDeficit ? "text-rose-700" : isConfigured ? "text-emerald-700" : "text-slate-400"
                  )}
                >
                  {isConfigured ? formatPesoAmount(remainingHeadroom) : "—"}
                </span>
                {isDeficit && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    Deficit: ceiling reached
                  </span>
                )}
              </div>
            </div>

            {/* Stepped Linear 4-Stage Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Stage 1: Annual Budget */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 shadow-2xs transition-colors hover:border-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-segoe">
                    1. Annual Budget
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Coins className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 font-cascadia tracking-tight">
                    {isConfigured ? formatCompactPeso(annualBudget) : "—"}
                  </div>
                  <div className="text-xs text-slate-500 font-segoe mt-1">
                    {isConfigured ? "Statutory Baseline" : "Pending appropriation"}
                  </div>
                </div>
              </div>

              {/* Stage 2: Approved Grants */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 shadow-2xs transition-colors hover:border-blue-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 font-segoe">
                    2. Approved Grants
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                    <FileCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-bold text-blue-900 font-cascadia tracking-tight">
                    {formatCompactPeso(approvedBudget)}
                  </div>
                  <div className="text-xs text-blue-700 font-segoe mt-1 font-medium">
                    {committedPctDisplay}
                  </div>
                </div>
              </div>

              {/* Stage 3: Disbursed */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 shadow-2xs transition-colors hover:border-emerald-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 font-segoe">
                    3. Disbursed
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <Banknote className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-bold text-emerald-900 font-cascadia tracking-tight">
                    {formatCompactPeso(releasedBudget)}
                  </div>
                  <div className="text-xs text-emerald-700 font-segoe mt-1 font-medium">
                    {disbursedPctDisplay}
                  </div>
                </div>
              </div>

              {/* Stage 4: Audited & Cleared */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 shadow-2xs transition-colors hover:border-teal-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 font-segoe">
                    4. Audited & Cleared
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-bold text-teal-900 font-cascadia tracking-tight">
                    {formatCompactPeso(liquidatedBudget)}
                  </div>
                  <div className="text-xs text-teal-700 font-segoe mt-1 font-medium">
                    {auditedPctDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Proportional Track Bar */}
            {approvedBudget > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 font-segoe">
                  <span className="font-medium text-slate-600">Fund Utilization Flow</span>
                  <span>
                    {auditedPctDisplay.replace(" of disbursed", "")} Audited
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  {/* Audited portion */}
                  <div
                    aria-label={`Audited: ${formatPesoAmount(liquidatedBudget)}`}
                    style={{
                      width: `${Math.min(
                        (liquidatedBudget / Math.max(approvedBudget, annualBudget || approvedBudget)) * 100,
                        100
                      )}%`,
                    }}
                    className="h-full bg-teal-600 transition-all duration-500"
                    title={`Audited: ${formatPesoAmount(liquidatedBudget)}`}
                  />
                  {/* Released unliquidated portion */}
                  <div
                    aria-label={`Disbursed active: ${formatPesoAmount(Math.max(releasedBudget - liquidatedBudget, 0))}`}
                    style={{
                      width: `${Math.min(
                        (Math.max(releasedBudget - liquidatedBudget, 0) /
                          Math.max(approvedBudget, annualBudget || approvedBudget)) *
                          100,
                        100
                      )}%`,
                    }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                    title={`Disbursed: ${formatPesoAmount(Math.max(releasedBudget - liquidatedBudget, 0))}`}
                  />
                  {/* Approved unreleased portion */}
                  <div
                    aria-label={`Pending release: ${formatPesoAmount(Math.max(approvedBudget - releasedBudget, 0))}`}
                    style={{
                      width: `${Math.min(
                        (Math.max(approvedBudget - releasedBudget, 0) /
                          Math.max(approvedBudget, annualBudget || approvedBudget)) *
                          100,
                        100
                      )}%`,
                    }}
                    className="h-full bg-blue-300 transition-all duration-500"
                    title={`Approved (Scheduled): ${formatPesoAmount(Math.max(approvedBudget - releasedBudget, 0))}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    <span>Audited & Cleared</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Disbursed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-300" />
                    <span>Approved (Scheduled)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Purpose Categories: Where the Youth Budget Goes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-segoe">
                    Where the Youth Budget Goes
                  </h2>
                  <p className="text-xs text-slate-500 font-segoe">
                    Top 5 purpose categories and community funding areas.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 font-cascadia">
                  Total: {formatCompactPeso(approvedBudget)}
                </span>
              </div>

              {purposeCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-segoe">
                  No approved youth grant allocations for FY {activeFY} yet.
                </div>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {purposeCategories.map((item) => {
                    const color = getCategoryColor(item.category);
                    return (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                          <span className="text-slate-800 truncate font-segoe flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span>{item.category}</span>
                          </span>
                          <span className="text-slate-900 font-cascadia shrink-0">
                            {formatPesoAmount(item.amount)}
                            <span className="text-slate-400 font-normal ml-1.5">
                              ({item.percentage}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min(item.percentage, 100)}%`,
                              backgroundColor: color,
                            }}
                            className="h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Geographic Transparency: District Allocations */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 font-segoe">
                  District Distribution
                </h2>
                <p className="text-xs text-slate-500 font-segoe">
                  Aggregated distribution across Pasig legislative districts.
                </p>
              </div>

              {districtAllocations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-segoe">
                  District allocation data is not available for FY {activeFY}.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {districtAllocations.map((dist) => (
                    <div
                      key={dist.district}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-public-text-brand shrink-0" />
                          <span>{dist.district}</span>
                        </span>
                        <span className="font-bold text-slate-900 font-cascadia">
                          {dist.percentage}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-cascadia">
                        {formatPesoAmount(dist.amount)}
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(dist.percentage, 100)}%` }}
                          className="h-full bg-public-bg-brand rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-[11px] text-blue-900 leading-relaxed font-segoe">
                <span className="font-bold">Public Privacy Standard:</span> Organization identities and specific grant applications remain confidential in accordance with public transparency standards.
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
