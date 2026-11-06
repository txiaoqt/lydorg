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

// Both map filters share one look: the site's light-blue filter chip and a flat bordered menu.
const filterTriggerClass = "group flex h-9 shrink-0 items-center whitespace-nowrap justify-between gap-2 rounded-[2px] border border-[#C9D8EE] bg-[#EAF1FB] px-3 font-inter text-sm font-semibold text-public-text-brand transition-colors hover:border-public-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand focus-visible:ring-offset-2";
const filterChevronClass = "h-4 w-4 shrink-0 text-public-text-brand transition-transform group-data-[state=open]:rotate-180";
const filterMenuClass = "z-[1000] w-[var(--radix-dropdown-menu-trigger-width)] rounded-[2px] border-public-border-default bg-white p-0 font-inter shadow-lg";
const filterItemClass = (active: boolean) => cn(
  "flex cursor-pointer items-center rounded-none border-b border-l-2 border-public-border-default px-3 py-3 text-sm last:border-b-0 focus:bg-public-bg-section focus:text-public-text-brand",
  active ? "border-l-public-border-brand bg-public-bg-section font-semibold text-public-text-brand" : "border-l-transparent text-public-text-neutral-default",
);

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
    <section aria-label={`Public budget map for FY ${fiscalYear}`} className="public-budget-map space-y-5">
      <div className="flex flex-col gap-4 border-b border-public-border-default pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">Official PCYDO Records</p>
          <h2 className="mt-2 font-tnr text-[28px] font-normal leading-[1.15] text-public-text-brand sm:text-[32px]">Budget by Barangay</h2>
          <p className="mt-1.5 max-w-2xl font-inter text-sm text-slate-600">
            An overview of the Local Youth Development Fund's allocation and utilization across Pasig City's barangays.
          </p>
        </div>
      <div className="public-budget-map__filters flex justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Select Fiscal Year. Currently FY ${fiscalYear}`} className={filterTriggerClass}>
              <span className="flex min-w-0 items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.75} aria-hidden="true" />
                <span>FY {fiscalYear}</span>
              </span>
              <ChevronDown className={filterChevronClass} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} className={cn(filterMenuClass, "min-w-[130px]")}>
            {availableFiscalYears.map((year) => (
              <DropdownMenuItem key={year} onSelect={() => onFiscalYearChange(year)} className={filterItemClass(year === fiscalYear)}>
                FY {year}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Filter by barangay. Currently ${selectedBarangay === "all" ? "Pasig City" : selectedBarangay}`}
              className={cn(filterTriggerClass, "min-w-[180px]")}
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{selectedBarangay === "all" ? "Pasig City" : selectedBarangay}</span>
              </span>
              <ChevronDown className={filterChevronClass} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} className={cn(filterMenuClass, "max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] min-w-[200px] overflow-y-auto")}>
            {[{ value: "all", label: "Pasig City" }, ...CANONICAL_PASIG_BARANGAYS.map(({ name }) => ({ value: name, label: name }))].map(({ value, label }) => (
              <DropdownMenuItem key={value} onSelect={() => setSelectedBarangay(value)} className={filterItemClass(value === selectedBarangay)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
      <p className="font-inter text-[11px] leading-relaxed text-slate-500">
        Barangay boundaries are based on a publicly available Philippine administrative boundary dataset. The red outline is provided for visualization purposes only and should not be used as an official boundary reference. For official boundary information, consult Pasig City's authorized GIS records.
      </p>
      {loading && <p className="sr-only" role="status">Loading public budget totals…</p>}
    </section>
  );
}
