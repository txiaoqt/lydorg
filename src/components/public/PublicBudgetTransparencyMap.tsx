import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, ChevronDown, MapPin, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PasigBudgetMap, type PasigBudgetMapRow } from "@/admin/components/PasigBudgetMap";
import type { PublicBudgetBarangayAllocation } from "@/lib/lydo-connect-data";
import { getPublicBudgetBarangayAllocationsFromSupabase } from "@/lib/lydo-connect-supabase";
import { CANONICAL_PASIG_BARANGAYS } from "@/lib/pasig-districts";

const formatMoney = (amount: number) => new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);

export default function PublicBudgetTransparencyMap({
  fiscalYear,
  availableFiscalYears,
  onFiscalYearChange,
}: {
  fiscalYear: number;
  availableFiscalYears: number[];
  onFiscalYearChange: (fiscalYear: number) => void;
}) {
  const [allocations, setAllocations] = useState<PublicBudgetBarangayAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedBarangay, setSelectedBarangay] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setAllocations([]);
    getPublicBudgetBarangayAllocationsFromSupabase(fiscalYear)
      .then((rows) => { if (active) setAllocations(rows); })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load public barangay budget map:", err);
        setError("Barangay budget figures could not be loaded.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fiscalYear, retryKey]);

  const rows = useMemo<PasigBudgetMapRow[]>(
    () => allocations.map((allocation) => ({
      district: allocation.district,
      barangay: allocation.barangay,
      approvedAmount: allocation.approvedAmount,
      releasedAmount: allocation.releasedAmount,
      liquidatedAmount: allocation.liquidatedAmount,
      ...(typeof allocation.organizationCount === "number" ? { organizationCount: allocation.organizationCount } : {}),
      ...(typeof allocation.releasedBudgetCount === "number" ? { releasedBudgetCount: allocation.releasedBudgetCount } : {}),
    })),
    [allocations],
  );

  return (
    <section aria-label={`Public budget map for FY ${fiscalYear}`} className="space-y-3">
      <div className="public-budget-map__filters flex justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Select Fiscal Year. Currently FY ${fiscalYear}`}
              className="flex h-11 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-segoe text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                <span>FY {fiscalYear}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1000] w-44 rounded-lg border-slate-200 bg-white p-1 shadow-lg">
            {availableFiscalYears.map((year) => (
              <DropdownMenuItem
                key={year}
                onSelect={() => onFiscalYearChange(year)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                  year === fiscalYear ? "bg-primary/10 font-bold text-primary" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <span>FY {year}</span>
                {year === fiscalYear && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <label className="public-budget-map__barangay-filter inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 font-segoe text-sm font-semibold text-slate-800 focus-within:ring-2 focus-within:ring-blue-600">
          <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="sr-only">Filter by barangay</span>
          <select aria-label="Filter by barangay" value={selectedBarangay} onChange={(event) => setSelectedBarangay(event.target.value)} className="min-w-0 w-full bg-transparent outline-none">
            <option value="all">All barangays</option>
            {CANONICAL_PASIG_BARANGAYS.map(({ name }) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 sm:self-auto"><RefreshCw className="h-3.5 w-3.5" />Retry</button>
        </div>
      )}
      <PasigBudgetMap
        rows={rows}
        organizationRows={[]}
        formatPesoAmount={formatMoney}
        selectedDistrict="all"
        selectedBarangay={selectedBarangay}
        fiscalPeriodLabel={`FY ${fiscalYear}`}
        loadingData={loading || Boolean(error)}
        showOrganizations={false}
        mobileBrowseAsFilter
        onSelectedBarangayChange={(barangay) => setSelectedBarangay(barangay)}
      />
      {loading && <p className="sr-only" role="status">Loading public budget totals…</p>}
    </section>
  );
}
