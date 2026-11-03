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
    <section aria-label={`Public budget map for FY ${fiscalYear}`} className="public-budget-map space-y-3">
      <div className="public-budget-map__filters flex justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Select Fiscal Year. Currently FY ${fiscalYear}`}
              className="group flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-[2px] border border-public-border-default bg-white px-3 font-inter text-sm font-semibold text-public-text-brand transition-colors hover:border-public-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.75} aria-hidden="true" />
                <span>FY {fiscalYear}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-public-text-brand transition-transform group-data-[state=open]:rotate-180" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} className="z-[1000] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[130px] rounded-[2px] border-public-border-default bg-white p-0 font-inter shadow-lg">
            {availableFiscalYears.map((year) => (
              <DropdownMenuItem
                key={year}
                onSelect={() => onFiscalYearChange(year)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-none border-b border-l-2 border-public-border-default px-3 py-3 text-sm last:border-b-0 focus:bg-public-bg-section focus:text-public-text-brand",
                  year === fiscalYear ? "border-l-public-border-brand bg-public-bg-section font-semibold text-public-text-brand" : "border-l-transparent text-public-text-neutral-default",
                )}
              >
                <span>FY {year}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <label className="public-budget-map__barangay-filter inline-flex min-h-10 items-center gap-2 rounded-[2px] border border-public-border-default bg-white px-3 font-inter text-sm font-semibold text-public-text-brand focus-within:border-public-border-brand">
          <MapPin className="h-4 w-4 shrink-0 text-public-text-secondary" aria-hidden="true" />
          <span className="sr-only">Filter by barangay</span>
          <select aria-label="Filter by barangay" value={selectedBarangay} onChange={(event) => setSelectedBarangay(event.target.value)} className="min-w-0 w-full bg-transparent outline-none">
            <option value="all">All barangays</option>
            {CANONICAL_PASIG_BARANGAYS.map(({ name }) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-[2px] border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="inline-flex min-h-9 items-center gap-2 self-start rounded-[2px] border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 sm:self-auto"><RefreshCw className="h-3.5 w-3.5" />Retry</button>
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
