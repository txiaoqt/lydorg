import { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  BarChart3,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import type { YorpQuarterlyReport } from "@/lib/lydo-connect-data";
import { fetchYorpQuarterlyReportInSupabase } from "@/lib/lydo-connect-supabase";
import {
  exportYorpQuarterlySummary,
  exportYorpDisaggregatedReport,
  getQuarterPeriodLabel,
} from "@/lib/report-section35-export";

type ReportType = "summary" | "disaggregated";
type ReportFormat = "pdf" | "xlsx";

type YorpQuarterlyReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028];
const QUARTERS = [
  { value: 1, label: "Q1 (Jan 1 – Mar 31)" },
  { value: 2, label: "Q2 (Apr 1 – Jun 30)" },
  { value: 3, label: "Q3 (Jul 1 – Sep 30)" },
  { value: 4, label: "Q4 (Oct 1 – Dec 31)" },
];

export function YorpQuarterlyReportDialog({
  open,
  onOpenChange,
}: YorpQuarterlyReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [year, setYear] = useState<number>(2026);
  const [quarter, setQuarter] = useState<number>(3);
  const [format, setFormat] = useState<ReportFormat>("pdf");

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<YorpQuarterlyReport | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch report data for preview whenever year/quarter changes or dialog opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoadingPreview(true);
    setFetchError(null);

    fetchYorpQuarterlyReportInSupabase(year, quarter)
      .then((data) => {
        if (isMounted) {
          setReportData(data);
          setLoadingPreview(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load quarterly report preview:", err);
          setFetchError("Unable to load report data");
          setLoadingPreview(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, year, quarter]);

  const handleGenerate = async () => {
    if (!reportData || generating) return;
    setGenerating(true);
    try {
      if (reportType === "summary") {
        await exportYorpQuarterlySummary(reportData, format);
        toast({
          title: "Report Exported",
          description: "Quarterly Summary exported successfully.",
        });
      } else {
        await exportYorpDisaggregatedReport(reportData, format);
        toast({
          title: "Report Exported",
          description: "Disaggregated Report exported successfully.",
        });
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to generate report:", err);
      toast({
        title: "Export Failed",
        description: err instanceof Error ? err.message : "Could not generate official report.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const periodLabel = useMemo(() => getQuarterPeriodLabel(year, quarter), [year, quarter]);

  // Derived disaggregated scope values
  const disaggScope = useMemo(() => {
    if (!reportData) return null;
    const youthOrgs =
      reportData.disaggregation.major_classification.find((c) =>
        c.label.toLowerCase().includes("youth organization"),
      )?.count ?? 0;
    const youthServingOrgs =
      reportData.disaggregation.major_classification.find((c) =>
        c.label.toLowerCase().includes("youth-serving"),
      )?.count ?? 0;
    const dist1 =
      reportData.disaggregation.geography.districts.find(
        (d) => d.district.includes("I") && !d.district.includes("II"),
      )?.count ?? 0;
    const dist2 =
      reportData.disaggregation.geography.districts.find((d) =>
        d.district.includes("II"),
      )?.count ?? 0;

    return {
      youthOrgs,
      youthServingOrgs,
      dist1,
      dist2,
      totalOrgs: reportData.metrics.registered_verified_at_quarter_end,
      advocacyCount: reportData.disaggregation.advocacy_themes.length,
      barangayCount: reportData.disaggregation.geography.barangays.length,
    };
  }, [reportData]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !generating && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto font-segoe">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle className="flex items-center gap-2 text-public-fs-title-base sm:text-public-fs-title-lg font-bold text-slate-900">
            <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.8} />
            YORP Reports
          </DialogTitle>
          <DialogDescription className="text-public-fs-body-sm text-muted-foreground">
            Generate an official YORP report for the selected reporting period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 text-public-fs-body-sm">
          {/* 1. Report Type Selection */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-public-fs-caption text-muted-foreground uppercase tracking-wider">
              Report Type
            </Label>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Report Type"
            >
              <button
                type="button"
                role="radio"
                aria-checked={reportType === "summary"}
                onClick={() => setReportType("summary")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  reportType === "summary"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-slate-200 bg-admin-surface hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Quarterly Summary
                </span>
                <span className="text-public-fs-caption text-muted-foreground mt-0.5">
                  Core quarterly registration metrics
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={reportType === "disaggregated"}
                onClick={() => setReportType("disaggregated")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  reportType === "disaggregated"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-slate-200 bg-admin-surface hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  Disaggregated Report
                </span>
                <span className="text-public-fs-caption text-muted-foreground mt-0.5">
                  Classification, advocacy, and geography breakdown
                </span>
              </button>
            </div>
          </div>

          {/* 2. Reporting Period (Year & Quarter in one row on desktop) */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-public-fs-caption text-muted-foreground uppercase tracking-wider">
              Reporting Period
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="report-year" className="text-public-fs-caption text-slate-600 font-medium">
                  Year
                </Label>
                <Select
                  value={String(year)}
                  onValueChange={(val) => setYear(Number(val))}
                  disabled={generating}
                >
                  <SelectTrigger id="report-year" className="h-10 border-slate-200 bg-admin-surface">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="report-quarter" className="text-public-fs-caption text-slate-600 font-medium">
                  Quarter
                </Label>
                <Select
                  value={String(quarter)}
                  onValueChange={(val) => setQuarter(Number(val))}
                  disabled={generating}
                >
                  <SelectTrigger id="report-quarter" className="h-10 border-slate-200 bg-admin-surface">
                    <SelectValue placeholder="Select Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map((q) => (
                      <SelectItem key={q.value} value={String(q.value)}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 3. Export Format */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-public-fs-caption text-muted-foreground uppercase tracking-wider">
              Export Format
            </Label>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Export Format"
            >
              <button
                type="button"
                role="radio"
                aria-checked={format === "pdf"}
                onClick={() => setFormat("pdf")}
                disabled={generating}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  format === "pdf"
                    ? "border-primary bg-primary/5 ring-1 ring-primary text-primary font-semibold"
                    : "border-slate-200 bg-admin-surface text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <div className="text-left">
                  <div className="text-public-fs-body-sm font-semibold text-slate-900">Official PDF</div>
                  <div className="text-public-fs-caption font-normal text-muted-foreground">A4 Portrait with PCYDO Letterhead</div>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={format === "xlsx"}
                onClick={() => setFormat("xlsx")}
                disabled={generating}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  format === "xlsx"
                    ? "border-primary bg-primary/5 ring-1 ring-primary text-primary font-semibold"
                    : "border-slate-200 bg-admin-surface text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" />
                <div className="text-left">
                  <div className="text-public-fs-body-sm font-semibold text-slate-900">Excel Workbook (.xlsx)</div>
                  <div className="text-public-fs-caption font-normal text-muted-foreground">Multi-sheet styled workbook</div>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Report Preview */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-public-fs-caption text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Report Preview
                {loadingPreview && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary ml-1" />
                )}
              </span>
              <span className="text-public-fs-caption text-muted-foreground">
                Q{quarter} {year} &middot; {periodLabel}
              </span>
            </div>

            {fetchError ? (
              <div className="flex items-start gap-2.5 p-3 text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-public-fs-body-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-public-fs-body-sm">Unable to load report data</p>
                  <p className="text-public-fs-caption text-muted-foreground mt-0.5">Please try again.</p>
                </div>
              </div>
            ) : loadingPreview && !reportData ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-public-fs-body-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading report preview...</span>
              </div>
            ) : reportData ? (
              <div
                className={`space-y-3 transition-opacity duration-150 ${
                  loadingPreview ? "opacity-60" : "opacity-100"
                }`}
              >
                {/* 3 Core Statutory Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-admin-surface p-2.5 rounded-md border border-slate-200 shadow-sm text-center">
                    <div className="text-public-fs-caption uppercase font-bold text-slate-500 tracking-wider">
                      Metric A
                    </div>
                    <div className="text-public-fs-title-lg font-bold text-primary mt-0.5">
                      {reportData.metrics.registered_verified_at_quarter_end}
                    </div>
                    <div className="text-public-fs-caption text-muted-foreground mt-0.5 line-clamp-1">
                      Quarter-end population
                    </div>
                  </div>

                  <div className="bg-admin-surface p-2.5 rounded-md border border-slate-200 shadow-sm text-center">
                    <div className="text-public-fs-caption uppercase font-bold text-slate-500 tracking-wider">
                      Metric B
                    </div>
                    <div className="text-public-fs-title-lg font-bold text-slate-800 mt-0.5">
                      {reportData.metrics.applications_received}
                    </div>
                    <div className="text-public-fs-caption text-muted-foreground mt-0.5 line-clamp-1">
                      Applications received
                    </div>
                  </div>

                  <div className="bg-admin-surface p-2.5 rounded-md border border-slate-200 shadow-sm text-center">
                    <div className="text-public-fs-caption uppercase font-bold text-slate-500 tracking-wider">
                      Metric C
                    </div>
                    <div className="text-public-fs-title-lg font-bold text-emerald-600 mt-0.5">
                      {reportData.metrics.applications_approved}
                    </div>
                    <div className="text-public-fs-caption text-muted-foreground mt-0.5 line-clamp-1">
                      Applications approved
                    </div>
                  </div>
                </div>

                {/* Additional Preview Details */}
                <div className="text-public-fs-caption text-slate-700 bg-admin-surface p-2.5 rounded-md border border-slate-200 space-y-1.5">
                  {reportType === "disaggregated" && disaggScope ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                        <span className="text-muted-foreground">Organizations (Metric A Base):</span>
                        <span className="font-semibold text-slate-800">{disaggScope.totalOrgs} accredited</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                        <span className="text-muted-foreground">Major Classifications:</span>
                        <span>
                          Youth Orgs: <strong className="text-slate-800">{disaggScope.youthOrgs}</strong>
                          {" · "}
                          Youth-Serving: <strong className="text-slate-800">{disaggScope.youthServingOrgs}</strong>
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                        <span className="text-muted-foreground">Advocacy Themes:</span>
                        <span className="font-medium text-slate-800">{disaggScope.advocacyCount} canonical themes evaluated</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                        <span className="text-muted-foreground">Districts:</span>
                        <span>
                          District I: <strong className="text-slate-800">{disaggScope.dist1}</strong>
                          {" · "}
                          District II: <strong className="text-slate-800">{disaggScope.dist2}</strong>
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted-foreground">Barangays:</span>
                        <span className="font-medium text-slate-800">{disaggScope.barangayCount} canonical barangays evaluated</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-public-fs-caption text-slate-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Quarter-end point-in-time date: <strong>{reportData.quarter_end_date}</strong> (Asia/Manila)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={generating}
            onClick={() => onOpenChange(false)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={generating || loadingPreview || !reportData || Boolean(fetchError)}
            onClick={handleGenerate}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px]"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                {format === "pdf" ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
