import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, MapPin, RefreshCw } from "lucide-react";
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
        <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 font-segoe text-sm font-semibold text-slate-800 focus-within:ring-2 focus-within:ring-blue-600">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="sr-only">Select fiscal year</span>
          <select aria-label="Select fiscal year" value={fiscalYear} onChange={(event) => onFiscalYearChange(Number(event.target.value))} className="min-w-0 max-w-[130px] bg-transparent outline-none">
            {availableFiscalYears.map((year) => <option key={year} value={year}>FY {year}</option>)}
          </select>
        </label>
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
