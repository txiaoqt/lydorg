import React, { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  adminCleanupYorpSampleDatasetInSupabase,
  adminGetYorpSampleDatasetStatusInSupabase,
  adminSeedYorpSampleDatasetInSupabase,
  type CleanupYorpSampleDatasetResult,
  type SeedYorpSampleDatasetResult,
  type YorpSampleDatasetStatus,
} from "@/lib/lydo-connect-supabase";
import {
  YORP_SAMPLE_DATASET_CATALOG,
  type YorpSampleDatasetRecord,
} from "@/lib/yorp-sample-dataset-catalog";

export interface YorpSampleDataSeedingPanelProps {
  className?: string;
  onRefreshGlobalData?: () => void;
}

export const YorpSampleDataSeedingPanel: React.FC<YorpSampleDataSeedingPanelProps> = ({
  className,
  onRefreshGlobalData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [status, setStatus] = useState<YorpSampleDatasetStatus | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const disclosureId = useId();

  // Preview filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");

  const isDevOrTestEnv = import.meta.env.DEV || import.meta.env.MODE !== "production";

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await adminGetYorpSampleDatasetStatusInSupabase();
      setStatus(data);
    } catch (err: any) {
      console.error("Failed to load YORP sample dataset status:", err);
      // Suppress noisy alert if server returns unauthorized or offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDevOrTestEnv) {
      void fetchStatus();
    }
  }, [isDevOrTestEnv]);

  const handleSeedDataset = async () => {
    try {
      setActionInProgress("seeding");
      const result: SeedYorpSampleDatasetResult = await adminSeedYorpSampleDatasetInSupabase();
      toast({
        title: "YORP Sample Fixture Reconstructed",
        description: `${result.organizations ?? result.total_records} organizations, ${result.registration_packets ?? 0} registration packets, ${result.document_records ?? 0} document records, and ${result.budget_requests ?? 0} budget requests validated.`,
      });
      await fetchStatus();
      if (onRefreshGlobalData) onRefreshGlobalData();
    } catch (err: any) {
      toast({
        title: "Seeding Failed",
        description: err?.message || "Failed to execute server-side YORP seeding.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCleanupDataset = async () => {
    try {
      setActionInProgress("cleaning");
      const result: CleanupYorpSampleDatasetResult = await adminCleanupYorpSampleDatasetInSupabase();
      toast({
        title: "Test Sample Data Cleaned Up",
        description: `Removed ${result.deleted_organizations} organizations, ${result.deleted_budget_requests} budgets, and ${result.deleted_users} test identities. Reusable Storage assets were kept; the Renewal Test Organization was excluded.`,
      });
      setShowCleanupConfirm(false);
      await fetchStatus();
      if (onRefreshGlobalData) onRefreshGlobalData();
    } catch (err: any) {
      toast({
        title: "Cleanup Failed",
        description: err?.message || "Failed to clean up seeded sample dataset.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredRecords = useMemo(() => {
    return YORP_SAMPLE_DATASET_CATALOG.filter((rec) => {
      if (selectedYear !== "all" && rec.source_year.toString() !== selectedYear) {
        return false;
      }
      if (selectedDistrict !== "all" && rec.district !== selectedDistrict) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = rec.organization_name.toLowerCase().includes(query);
        const matchBrgy = rec.barangay.toLowerCase().includes(query);
        const matchEmail = rec.organization_email.toLowerCase().includes(query);
        const matchCyp = rec.advocacies.some((c) => c.toLowerCase().includes(query));
        return matchName || matchBrgy || matchEmail || matchCyp;
      }
      return true;
    });
  }, [searchQuery, selectedYear, selectedDistrict]);

  if (!isDevOrTestEnv) {
    return null;
  }

  const isFullySeeded = Boolean(
    status &&
      status.total_seeded_organizations === 84 &&
      status.registration_breakdown?.packets === 84 &&
      status.registration_breakdown.organizations_complete === 84 &&
      status.registration_breakdown.document_records === 84 * status.registration_breakdown.required_documents_per_organization &&
      status.registration_breakdown.missing_requirements === 0 &&
      status.registration_breakdown.duplicate_requirements === 0 &&
      status.budget_breakdown.awaiting_release + status.budget_breakdown.budget_released + status.budget_breakdown.completed === 84
  );
  const canReconstructDocuments = status?.registration_breakdown?.asset_mapping_complete === true;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-amber-200/80 bg-card dark:border-amber-900/40",
        className
      )}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={disclosureId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-amber-500/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">PCYDO YORP Sample Dataset</span>
            <Badge
              variant="outline"
              className={cn(
                "px-1.5 py-0 font-mono text-[10px] font-semibold uppercase tracking-wide",
                isFullySeeded
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : (status?.total_seeded_organizations ?? 0) > 0
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  : "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {loading
                ? "Checking…"
                : isFullySeeded
                ? "84 / 84 Complete"
                : (status?.total_seeded_organizations ?? 0) > 0
                ? `${status?.total_seeded_organizations} / 84 Organizations`
                : "Not Seeded"}
            </Badge>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            PCYDO YORP 2024–2026 · {YORP_SAMPLE_DATASET_CATALOG.length} authoritative organizations
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", isExpanded && "rotate-180")} aria-hidden="true" />
      </button>

      <div id={disclosureId} hidden={!isExpanded}>
      {isExpanded && <div className="space-y-4 border-t border-amber-100 p-4 dark:border-amber-900/30 sm:p-5">
        {/* TEST DATA ONLY warning stays above destructive and seed controls. */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wide">
              TEST DATA ONLY — THIS OPERATION IS DISABLED IN PRODUCTION.
            </span>
            Reconstructs and repairs only the designated sample dataset through server-side RPCs. The Renewal Test Organization is explicitly excluded. Seeded test accounts use synthetic identities; never use this reset against live data.
          </div>
        </div>

        {status && !canReconstructDocuments && (
          <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <strong className="font-semibold">Reseed and cleanup are paused.</strong>{" "}
            Map every active YORP registration requirement to an existing object in registration-seed-file before resetting data. This protects the fixture from being removed when it cannot yet be reconstructed.
            {status.registration_breakdown && (
              <span className="mt-1 block text-muted-foreground">
                Mapped assets: {status.registration_breakdown.mapped_seed_assets} / {status.registration_breakdown.required_documents_per_organization} required files.
              </span>
            )}
          </div>
        )}

        {/* Dataset Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 gap-1.5 text-xs text-slate-700 hover:text-slate-900 dark:text-slate-200"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Preview Dataset (84)
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading || actionInProgress !== null}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSeedDataset}
            disabled={actionInProgress !== null || !canReconstructDocuments}
            className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
          >
            {actionInProgress === "seeding" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isFullySeeded ? "Reseed / Repair Dataset" : "Seed Dataset"}
          </Button>

          {(status?.total_seeded_organizations ?? 0) > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCleanupConfirm(true)}
              disabled={actionInProgress !== null || !canReconstructDocuments}
              className="h-8 gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cleanup Seeded Data
            </Button>
          )}
        </div>

      {/* Dataset identity, database counts, and lifecycle summary */}
      <dl className="grid gap-4 divide-y divide-slate-200 rounded-lg border border-slate-200 px-4 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0">
        {/* Source Breakdown */}
        <div className="py-4 first:pt-0 sm:px-4 sm:first:pl-0 sm:py-4">
          <dt className="text-xs font-semibold text-slate-700 dark:text-slate-300">Authoritative source · PUP CCIS_Pasig City YORP Data 2024–2026</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {YORP_SAMPLE_DATASET_CATALOG.length} <span className="text-xs font-normal text-slate-500">organizations</span>
          </dd>
          <dd className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">2024: 31</span>
            <span>•</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">2025: 47</span>
            <span>•</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">2026: 6</span>
          </dd>
        </div>

        {/* Database Live State */}
        <div className="py-4 sm:px-4 sm:py-4">
          <dt className="flex flex-wrap items-center justify-between gap-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Database status</span>
            <span className="text-[10px] font-normal text-slate-400">Batch: PCYDO-YORP-2024-2026</span>
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {status?.total_seeded_organizations ?? 0} <span className="text-xs font-normal text-slate-500">seeded</span>
          </dd>
          <dd className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300">
            <span>2024: {status?.year_breakdown?.["2024"] ?? 0}</span>
            <span>•</span>
            <span>2025: {status?.year_breakdown?.["2025"] ?? 0}</span>
            <span>•</span>
            <span>2026: {status?.year_breakdown?.["2026"] ?? 0}</span>
          </dd>
        </div>

        {/* Database completeness is read from the live requirement set, not a fixed display value. */}
        <div className="py-4 sm:px-4 sm:py-4">
          <dt className="text-xs font-semibold text-slate-700 dark:text-slate-300">Registration documents</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {status?.registration_breakdown?.organizations_complete ?? 0} / 84 complete
          </dd>
          <dd className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300">
            <span>{status?.registration_breakdown?.packets ?? 0} packets</span>
            <span>•</span>
            <span>{status?.registration_breakdown?.document_records ?? 0} file records</span>
            <span>•</span>
            <span>{status?.registration_breakdown?.missing_requirements ?? 0} missing</span>
            <span>•</span>
            <span>{status?.registration_breakdown?.duplicate_requirements ?? 0} duplicate</span>
          </dd>
        </div>

        {/* Budget Requests Distribution */}
        <div className="py-4 sm:px-4 sm:py-4">
          <dt className="flex flex-wrap items-center justify-between gap-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Budget request lifecycle</span>
            <span className="text-[10px] font-normal text-slate-400">Sample records</span>
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {(status?.budget_breakdown?.awaiting_release ?? 0) +
              (status?.budget_breakdown?.budget_released ?? 0)}{" "}
            <span className="text-xs font-normal text-slate-500">requests</span>
          </dd>
          <dd className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300">
            <span title="Awaiting Release">⏳ {status?.budget_breakdown?.awaiting_release ?? 0} awaiting</span>
            <span>•</span>
            <span title="Budget Released">💸 {status?.budget_breakdown?.budget_released ?? 0} released</span>
            <span>•</span>
            <span title="Liquidation reports completed">✅ {status?.budget_breakdown?.liquidated_reports ?? 0} liquidated</span>
          </dd>
        </div>
      </dl>

      <AlertDialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove generated PCYDO YORP sample data?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left leading-relaxed">
              <span className="block">
                This test-only cleanup removes the organizations in batch PCYDO-YORP-2024-2026 and their generated registration packets, document records, accreditations, budgets, liquidations, notifications, and test Auth identities.
              </span>
              <span className="block font-medium text-foreground">
                It explicitly excludes the Renewal Test Organization ({"8170959f-2bb8-40ea-8ce8-31deb514de17"}) and every organization marked as a renewal test account.
              </span>
              <span className="block">
                Cleanup stops if it finds YPOP, renewal, inquiry, or compliance records outside the generated fixture, so those records are not lost through deletion cascades.
              </span>
              <span className="block">
                Reusable files in registration-seed-file are kept. Test Auth identities may receive new IDs after reseeding. Historical audit and notification history is not restored.
              </span>
              <span className="block font-semibold text-destructive">
                This reconstructs generated test data; it does not restore deleted history.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionInProgress !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleCleanupDataset();
              }}
              disabled={actionInProgress !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionInProgress === "cleaning" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove seeded records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dataset Preview Drawer / Expandable Table */}
      {showPreview && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-amber-600" />
                Authoritative PCYDO YORP Sample Records ({filteredRecords.length} / 84)
              </h4>
              <p className="text-xs text-slate-500">
                Extracted verbatim from PCYDO YORP Database CY 2024–2026 PDF with zero PDF emails reused.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search name, brgy, CYP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-44 sm:w-56 pl-8 text-xs"
                />
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Years (84)</option>
                <option value="2024">CY 2024 (31)</option>
                <option value="2025">CY 2025 (47)</option>
                <option value="2026">CY 2026 (6)</option>
              </select>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Districts</option>
                <option value="District I">District I</option>
                <option value="District II">District II</option>
              </select>
            </div>
          </div>

          {/* Records Table */}
          <div className="mt-3 max-h-96 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200/70 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold dark:bg-slate-800 dark:text-slate-300 z-10">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Year</th>
                  <th className="py-2.5 px-3">Organization Name</th>
                  <th className="py-2.5 px-3">Barangay & District</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Centers of Participation</th>
                  <th className="py-2.5 px-3">Synthetic Email</th>
                  <th className="py-2.5 px-3">Budget & Lifecycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No records match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr
                      key={rec.source_record_number}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                        {rec.source_record_number}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-mono h-4 px-1.5",
                            rec.source_year === 2024 && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                            rec.source_year === 2025 && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                            rec.source_year === 2026 && "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          )}
                        >
                          {rec.source_year}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={rec.organization_name}>
                        {rec.organization_name}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{rec.barangay}</div>
                        <div className="text-[10px] text-slate-400">{rec.district}</div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-[11px]">{rec.major_classification}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{rec.sub_classification}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {rec.advocacies.map((cyp) => (
                            <span
                              key={cyp}
                              className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize whitespace-nowrap"
                            >
                              {cyp}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={rec.organization_email}>
                        {rec.organization_email}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          ₱{rec.budget_amount.toLocaleString()}
                        </div>
                        <div className="text-[10px]">
                          <span
                            className={cn(
                              "font-medium",
                              rec.budget_status === "awaiting_release" && "text-amber-600 dark:text-amber-400",
                              rec.budget_status === "budget_released" && "text-blue-600 dark:text-blue-400",
                              rec.is_liquidated && "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {rec.is_liquidated ? "Budget Released · Liquidated" : rec.budget_status.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>}
      </div>
    </section>
  );
};

export default YorpSampleDataSeedingPanel;
