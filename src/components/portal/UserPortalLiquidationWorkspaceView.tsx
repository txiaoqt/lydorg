import React, { useState, useEffect } from "react";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  FileUp,
  Search,
  FileText,
  Filter,
  ExternalLink,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalStatusBadge } from "@/components/portal/portal-ui";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { computeLiquidationWorkflowMetrics } from "@/lib/workflow-metrics";
import { FeatureGate } from "./FeatureGate";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";

export interface UserPortalLiquidationWorkspaceViewProps {
  liquidationWorkflowEligibility?: any;
  budgetWorkflowEligibility?: any;
  liquidationReports: Array<any>;
  budgetRequests: Array<any>;
  liquidationFilesByReportId: Map<string, any[]>;
  liquidationNotesByReportId: Record<string, string>;
  setLiquidationNotesByReportId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingLiquidationId: string | null;
  liquidationFileInputRef: React.RefObject<HTMLInputElement>;
  liquidationUploadTargetId: string | null;
  setLiquidationUploadTargetId: (id: string | null) => void;
  handleLiquidationFileUpload: (report: any, files: FileList | null) => Promise<void>;
  handleSubmitLiquidation?: (report: any) => Promise<void>;
  handleDeleteLiquidationFile?: (file: any) => Promise<void>;
  handleLiquidationSubmit?: (reportId: string, noteValue?: string) => Promise<void>;
  handleLiquidationFileRemove?: (reportId: string, fileId: string) => Promise<void>;
  openPreview?: (fileUrl: string, fileName: string) => void;
  openFile: (url: string, name?: string) => void;
  navigate: (path: string) => void;
  searchParams?: URLSearchParams;
  userRouteMap: Record<string, string>;
  buildPublicRecordCode: (prefix: string, item: any, list: any[]) => string;
  formatCurrency: (amount: number) => string;
  formatShortPortalDate: (dateStr: string) => string;
  formatDateTimeLabel: (dateStr: string) => string;
  formatStatusLabel: (status: string) => string;
}

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
};

export const UserPortalLiquidationWorkspaceView: React.FC<UserPortalLiquidationWorkspaceViewProps> = ({
  liquidationWorkflowEligibility,
  budgetWorkflowEligibility,
  liquidationReports,
  budgetRequests,
  liquidationFilesByReportId,
  liquidationFileInputRef,
  liquidationUploadTargetId,
  setLiquidationUploadTargetId,
  handleLiquidationFileUpload,
  navigate,
  searchParams = new URLSearchParams(),
  userRouteMap,
  buildPublicRecordCode,
  formatCurrency,
  formatShortPortalDate,
  formatDateTimeLabel,
}) => {
  const isDesktop = useIsDesktop();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "review" | "completed" | "revision">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "deadline">("newest");
  
  // Direct Download State with Spinner Feedback
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Resolved Preview URL state for selected report
  const [resolvedModalPreviewUrl, setResolvedModalPreviewUrl] = useState<string>("");

  const liquidationRoutePath = userRouteMap["liquidation-reporting"] || "/liquidation-reporting";
  const selectedReportId = searchParams.get("reportId");
  const selectedReport = selectedReportId
    ? liquidationReports.find((r) => r.id === selectedReportId) ?? null
    : null;

  const selectedFiles = selectedReport ? (liquidationFilesByReportId.get(selectedReport.id) ?? []) : [];
  const primaryModalFile = selectedFiles[0] ?? null;
  const primaryFileUrl = primaryModalFile?.fileUrl || "";

  // Automatically resolve URL when report is opened
  useEffect(() => {
    let isMounted = true;
    if (!selectedReportId || !primaryFileUrl) {
      setResolvedModalPreviewUrl("");
      return;
    }

    resolveSupabaseFileUrl(primaryFileUrl)
      .then((url) => {
        if (isMounted) {
          setResolvedModalPreviewUrl(url || primaryFileUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedModalPreviewUrl(primaryFileUrl);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedReportId, primaryFileUrl]);

  // Authentic Direct File Download Handler with Spinner State
  const handleDownloadLiquidationFile = async (fileUrl: string, fileName: string, fileId?: string) => {
    if (!fileUrl) return;
    try {
      if (fileId) setDownloadingFileId(fileId);
      const resolvedUrl = (await resolveSupabaseFileUrl(fileUrl)) || fileUrl;
      if (!resolvedUrl) throw new Error("File URL not available");

      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Failed to fetch file for download");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "liquidation-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Direct blob download failed, attempting fallback link download:", err);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName || "liquidation-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      if (fileId) setDownloadingFileId(null);
    }
  };

  const openLiquidationDetail = (reportId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("reportId", reportId);
    navigate(`${liquidationRoutePath}?${nextParams.toString()}`);
  };

  const closeLiquidationDetail = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("reportId");
    const nextQuery = nextParams.toString();
    navigate(nextQuery ? `${liquidationRoutePath}?${nextQuery}` : liquidationRoutePath);
  };

  // Metrics (Derived 100% from shared workflow-metrics utility)
  const liquidationMetrics = computeLiquidationWorkflowMetrics(liquidationReports);
  const totalReports = liquidationMetrics.totalReports;
  const underReviewCount = liquidationMetrics.underReviewCount;
  const needsRevisionCount = liquidationMetrics.needsRevisionCount;
  const completedCount = liquidationMetrics.completedCount;
  const completionPercent = liquidationMetrics.completionPercent;

  // Filtering
  const filteredReports = liquidationReports
    .filter((report) => {
      const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        relatedBudget?.activityTitle,
        relatedBudget?.purposeCategory,
        relatedBudget?.venue,
        report.id,
      ].some((value) => value?.toLowerCase().includes(query));
    })
    .filter((report) => {
      if (filterTab === "review")
        return (
          report.status === "submitted" ||
          report.status === "hard_copy_submitted" ||
          report.status === "approved_for_ftf_green"
        );
      if (filterTab === "completed") return report.status === "completed_liquidated";
      if (filterTab === "revision")
        return (
          report.status === "needs_revision" ||
          report.status === "overdue" ||
          report.status === "rejected_red"
        );
      return true;
    })
    .sort((left, right) => {
      if (sortOrder === "oldest") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
      if (sortOrder === "deadline") {
        return new Date(left.deadlineAt || left.createdAt).getTime() - new Date(right.deadlineAt || right.createdAt).getTime();
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  const getRemainingDaysLabel = (deadlineAt?: string) => {
    if (!deadlineAt) return "No deadline set";
    const deadline = new Date(deadlineAt);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return "Due Today";
    return `${diffDays} days left`;
  };

  const isLiquidationEligible = Boolean(
    liquidationWorkflowEligibility
      ? liquidationWorkflowEligibility.eligible
      : true
  );

  const nextLiquidationStepAction = !liquidationWorkflowEligibility?.profileComplete
    ? "Complete Profile"
    : !liquidationWorkflowEligibility?.registrationVerified
    ? "View Registration Status"
    : !budgetWorkflowEligibility?.eligible
    ? "Open YPOP Incentive"
    : liquidationWorkflowEligibility?.releasedBudget
    ? "View Released Budget"
    : "View Budget Requests";

  const nextLiquidationStepRoute = !liquidationWorkflowEligibility?.profileComplete
    ? userRouteMap["organization-profile"]
    : !liquidationWorkflowEligibility?.registrationVerified
    ? userRouteMap["document-submission"]
    : !budgetWorkflowEligibility?.eligible
    ? userRouteMap.ypop
    : userRouteMap["budget-request"];

  return (
    <FeatureGate
      canAccess={isLiquidationEligible}
      title="No liquidation report is available yet"
      description="Liquidation becomes available after an eligible budget is approved and released."
      requirements={liquidationWorkflowEligibility?.requirements || []}
      actionLabel={nextLiquidationStepAction}
      onAction={() => navigate(nextLiquidationStepRoute)}
      heroSection={
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-2 sm:space-y-3">
          <div className="space-y-1 max-w-[640px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Liquidation Workspace</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Liquidation Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
              Track deadlines, upload post-activity reports, and monitor liquidation approvals.
            </p>
          </div>
        </div>
      }
    >
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-2 sm:py-2">
        {/* 1. Hero Header Banner */}
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-2 sm:space-y-3">
          <div className="space-y-1 max-w-[640px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Liquidation Workspace</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Liquidation Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
              Track deadlines, upload post-activity reports, and monitor liquidation approvals in a rich data table.
            </p>

            {/* Metadata Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="font-semibold text-foreground">{totalReports} Reports</span>
              <span>•</span>
              <span>Review ETA: 2–3 Days</span>
            </div>
          </div>
        </div>

        {/* 2. Progress Summary Card */}
        <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {completedCount} of {totalReports} Reports Liquidated ({completionPercent}%)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Overview of all post-activity liquidation reports submitted for organization activities.
              </p>
            </div>

            {/* Status Badges Counters */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium pt-1 sm:pt-0">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {completedCount} Liquidated
              </span>
              <span className={cn("flex items-center gap-1.5 font-semibold", underReviewCount === 0 ? "text-muted-foreground/50" : "text-primary")}>
                <Clock className="h-4 w-4 shrink-0" /> {underReviewCount} Review
              </span>
              <span className={cn("flex items-center gap-1.5 font-semibold", needsRevisionCount === 0 ? "text-muted-foreground/50" : "text-amber-600 dark:text-amber-400")}>
                <AlertTriangle className="h-4 w-4 shrink-0" /> {needsRevisionCount} Revision
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full rounded-full bg-primary/15 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${completionPercent}%` }} />
          </div>
        </Card>

        {/* 3. Smart Filter Toolbar + Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card border border-border/60 p-2 sm:p-2.5 rounded-2xl shadow-xs">
          {/* Scrollable Filter Tabs on Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] touch-pan-x overscroll-x-contain pb-1 sm:pb-0 px-0.5">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                filterTab === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              All ({totalReports})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("completed")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                filterTab === "completed"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : completedCount === 0
                  ? "text-muted-foreground/40 pointer-events-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Liquidated ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("review")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                filterTab === "review"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : underReviewCount === 0
                  ? "text-muted-foreground/40 pointer-events-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Under Review ({underReviewCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("revision")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                filterTab === "revision"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : needsRevisionCount === 0
                  ? "text-muted-foreground/40 pointer-events-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Needs Revision ({needsRevisionCount})
            </button>
          </div>

          {/* Search Input & Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto lg:flex-1 lg:min-w-0 lg:justify-end">
            <div className="relative flex-1 sm:w-60 lg:w-full min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search activity, code, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl bg-background border-border/80 w-full"
              />
            </div>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl border-border text-xs font-medium gap-1 shrink-0 cursor-pointer">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Sort:</span> <span className="capitalize">{sortOrder}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-2 rounded-xl bg-card border-border/80 shadow-lg z-50">
                <DropdownMenuItem onClick={() => setSortOrder("newest")} className="text-xs font-medium cursor-pointer">Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="text-xs font-medium cursor-pointer">Oldest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("deadline")} className="text-xs font-medium cursor-pointer">Deadline</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 4. Compact Mobile Report Cards (< lg) */}
        <div className="mobile-cards space-y-3 block lg:hidden">
          {filteredReports.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xs space-y-1 rounded-2xl border border-border/60 bg-card">
              <p className="font-bold text-foreground">No liquidation reports found</p>
              <p className="text-xs">Try adjusting your search or status filter.</p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const relatedBudget = budgetRequests.find((req) => req.id === report.budgetRequestId) ?? null;
              const recordCode = buildPublicRecordCode("LR", report, liquidationReports);
              const remainingDaysText = getRemainingDaysLabel(report.deadlineAt);

              return (
                <Card 
                  key={report.id} 
                  className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-pointer"
                  onClick={() => openLiquidationDetail(report.id)}
                >
                  {/* Top Header Row: Icon + Title + Status Badge Directly Below */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Receipt className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                      <h3 className="text-sm font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere]" title={relatedBudget?.activityTitle}>
                        {relatedBudget?.activityTitle || "Approved Activity"}
                      </h3>
                      {/* Status Badge in its own dedicated row directly below title */}
                      <div className="pt-0.5 shrink-0">
                        <PortalStatusBadge status={report.status} />
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Record Code + Purpose + Due Date */}
                  <div className="text-xs text-muted-foreground font-medium space-y-1 pl-12">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {recordCode}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{relatedBudget?.purposeCategory || "General Purpose"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-muted-foreground">Due:</span>
                      <span className={cn("font-semibold", remainingDaysText.includes("overdue") ? "text-destructive" : "text-foreground/90")}>
                        {report.deadlineAt ? formatShortPortalDate(report.deadlineAt) : "Pending"}
                      </span>
                      {remainingDaysText && (
                        <span className={cn("text-[11px]", remainingDaysText.includes("overdue") ? "text-destructive font-bold" : "text-muted-foreground/80")}>
                          ({remainingDaysText})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Released Amount + Primary Action */}
                  <div 
                    className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/40 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl text-xs shrink-0">
                      {formatCurrency(relatedBudget?.releasedAmount || relatedBudget?.approvedAmount || 0)}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openLiquidationDetail(report.id)}
                      className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-3.5 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xs cursor-pointer justify-center"
                    >
                      <span>Open Report →</span>
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* 5. Rich Modern SaaS Data Table (Exact Desktop Implementation from Commit 48e7dd3: hidden lg:block) */}
        <Card className="desktop-table rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-5">Activity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Released Budget</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Report File</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs space-y-1">
                      <p className="font-bold text-foreground">No liquidation reports found</p>
                      <p className="text-xs">Try adjusting your search or status filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const relatedBudget = budgetRequests.find((req) => req.id === report.budgetRequestId) ?? null;
                    const files = liquidationFilesByReportId.get(report.id) ?? [];
                    const primaryFile = files[0] ?? null;
                    const recordCode = buildPublicRecordCode("LR", report, liquidationReports);
                    const remainingDaysText = getRemainingDaysLabel(report.deadlineAt);

                    return (
                      <tr
                        key={report.id}
                        onClick={() => openLiquidationDetail(report.id)}
                        className="h-[88px] hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-150 cursor-pointer group"
                      >
                        {/* Column 1: Activity */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-bold text-foreground leading-tight truncate max-w-[240px]" title={relatedBudget?.activityTitle}>
                                {relatedBudget?.activityTitle || "Approved Activity"}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-semibold text-muted-foreground bg-accent px-2 py-0.5 rounded-md text-[10px]">
                                  {recordCode}
                                </span>
                                <span className="text-muted-foreground/60">•</span>
                                <span className="text-muted-foreground text-[11px] truncate max-w-[140px]">
                                  {relatedBudget?.venue || "Pasig City"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Status Badge */}
                        <td className="py-3.5 px-4">
                          <PortalStatusBadge status={report.status} />
                        </td>

                        {/* Column 3: Released Budget */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(relatedBudget?.releasedAmount || relatedBudget?.approvedAmount || 0)}
                          </div>
                        </td>

                        {/* Column 4: Deadline */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-foreground">
                              {report.deadlineAt ? formatShortPortalDate(report.deadlineAt) : "Pending"}
                            </p>
                            <p className={cn(
                              "text-[10px] font-semibold",
                              remainingDaysText.includes("overdue")
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}>
                              {remainingDaysText}
                            </p>
                          </div>
                        </td>

                        {/* Column 5: Report File */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          {primaryFile ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate max-w-[140px]" title={primaryFile.fileName}>
                                  {primaryFile.fileName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {primaryFile.uploadedAt ? formatShortPortalDate(primaryFile.uploadedAt) : "Uploaded"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground/60 italic">No file uploaded</span>
                            </div>
                          )}
                        </td>

                        {/* Column 6: Action Column */}
                        <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openLiquidationDetail(report.id)}
                            className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold px-4 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
                          >
                            Open Report →
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 6. Desktop Details Drawer (Exact Desktop Implementation from Commit 48e7dd3: isDesktop ONLY) */}
        {isDesktop && (
          <Sheet open={Boolean(selectedReport)} onOpenChange={(open) => { if (!open) closeLiquidationDetail(); }}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-border p-6 space-y-6">
              {selectedReport && (() => {
                const selectedBudget = budgetRequests.find((req) => req.id === selectedReport.budgetRequestId) ?? null;
                const files = liquidationFilesByReportId.get(selectedReport.id) ?? [];
                const primaryFile = files[0] ?? null;
                const recordCode = buildPublicRecordCode("LR", selectedReport, liquidationReports);

                return (
                  <div className="space-y-6">
                    <SheetHeader className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                          {recordCode}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            {formatCurrency(selectedBudget?.releasedAmount || selectedBudget?.approvedAmount || 0)}
                          </span>
                        </div>
                      </div>
                      <SheetTitle className="text-xl font-bold text-foreground leading-snug truncate" title={selectedBudget?.activityTitle}>
                        {selectedBudget?.activityTitle || "Liquidation Report"}
                      </SheetTitle>
                      <SheetDescription className="text-xs text-muted-foreground">
                        {selectedBudget?.purposeCategory || "General Purpose"} • {selectedBudget?.venue || "Pasig City"}
                      </SheetDescription>
                    </SheetHeader>

                    {/* Timeline Strip */}
                    <div className="bg-accent/30 p-4 rounded-2xl border border-border/60 space-y-2">
                      <p className="text-xs font-bold text-foreground">Activity Timeline</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Go Signal</span>
                          <span className="font-semibold text-foreground">
                            {selectedReport.goSignalAt ? formatShortPortalDate(selectedReport.goSignalAt) : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-destructive uppercase font-semibold">Deadline</span>
                          <span className="font-semibold text-destructive">
                            {selectedReport.deadlineAt ? formatShortPortalDate(selectedReport.deadlineAt) : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Attached File Viewer */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">Liquidation Document</p>
                        {primaryFile && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {primaryFile.fileSize ? `${Math.max(1, Math.round(primaryFile.fileSize / 1024))} KB` : "Attached"}
                          </span>
                        )}
                      </div>

                      {primaryFile ? (
                        <div className="bg-background border border-border/80 p-4 rounded-2xl space-y-4 shadow-2xs">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="h-5 w-5 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate max-w-[220px]" title={primaryFile.fileName}>
                                  {primaryFile.fileName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  PDF • {primaryFile.uploadedAt ? `Uploaded ${formatDateTimeLabel(primaryFile.uploadedAt)}` : "Uploaded recently"}
                                </p>
                              </div>
                            </div>

                            {/* Direct Blob-Fetch Download File Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={downloadingFileId === primaryFile.id}
                              onClick={() => void handleDownloadLiquidationFile(resolvedModalPreviewUrl || primaryFile.fileUrl, primaryFile.fileName, primaryFile.id)}
                              className="h-8 text-xs font-medium rounded-xl border-border shrink-0 cursor-pointer gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {downloadingFileId === primaryFile.id ? "Downloading..." : "Download File"}
                            </Button>
                          </div>

                          {/* Embedded Document Preview Area */}
                          <PortalDocumentViewer
                            previewUrl={resolvedModalPreviewUrl || primaryFile.fileUrl}
                            previewTitle={primaryFile.fileName}
                            previewCanInline={true}
                            onDownloadFile={async (url, name) => {
                              await handleDownloadLiquidationFile(url, name, primaryFile.id);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border/80 p-6 rounded-2xl text-center space-y-3">
                          <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-foreground">No liquidation file uploaded yet</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              Upload your signed post-activity liquidation PDF report for admin review.
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              setLiquidationUploadTargetId(selectedReport.id);
                              liquidationFileInputRef.current?.click();
                            }}
                            className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 cursor-pointer"
                          >
                            <FileUp className="mr-1.5 h-3.5 w-3.5" />
                            Upload Report File
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Spacing above Close Drawer Button */}
                    <div className="pt-4 border-t border-border/40">
                      <SheetClose asChild>
                        <Button type="button" variant="outline" className="w-full h-9.5 text-xs font-bold rounded-xl cursor-pointer">
                          Close Drawer
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                );
              })()}
            </SheetContent>
          </Sheet>
        )}

        {/* 7. Mobile Liquidation Report Modal (!isDesktop ONLY) */}
        {!isDesktop && (
          <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => { if (!open) closeLiquidationDetail(); }}>
            <DialogContent
              hideCloseButton={true}
              className="w-[94vw] sm:w-[92vw] max-w-3xl h-[86vh] sm:h-[88vh] max-h-[860px] sm:max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200"
            >
              {selectedReport && (() => {
                const selectedBudget = budgetRequests.find((req) => req.id === selectedReport.budgetRequestId) ?? null;
                const selectedFiles = liquidationFilesByReportId.get(selectedReport.id) ?? [];
                const primaryFile = selectedFiles[0] ?? null;
                const recordCode = buildPublicRecordCode("LR", selectedReport, liquidationReports);
                const remainingDaysText = getRemainingDaysLabel(selectedReport.deadlineAt);

                return (
                  <>
                    <DialogDescription className="sr-only">
                      Liquidation Report Details for {selectedBudget?.activityTitle || "Report"}
                    </DialogDescription>

                    {/* MODAL HEADER */}
                    <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border/70 bg-card flex flex-col gap-2 shrink-0">
                      {/* Top Row: Record Code + Amount + Protected Close Button */}
                      <div className="flex items-center justify-between gap-2.5 w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                            {recordCode}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20">
                            {formatCurrency(selectedBudget?.releasedAmount || selectedBudget?.approvedAmount || 0)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => closeLiquidationDetail()}
                          className="h-8 w-8 rounded-full border border-border/60 hover:bg-accent hover:text-foreground text-muted-foreground flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          aria-label="Close modal"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Main Title & Status & Metadata */}
                      <div className="space-y-1">
                        <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere] line-clamp-2">
                          {selectedBudget?.activityTitle || "Liquidation Report"}
                        </DialogTitle>
                        <div className="flex items-center gap-2 pt-0.5">
                          <PortalStatusBadge status={selectedReport.status} />
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium pt-0.5">
                          {selectedBudget?.purposeCategory || "General Purpose"} • {selectedBudget?.venue || "Pasig City"}
                        </p>
                      </div>
                    </div>

                    {/* MODAL SCROLLABLE BODY */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-background/50">
                      {/* Activity Timeline Card */}
                      <div className="bg-card p-3.5 sm:p-4 rounded-2xl border border-border/70 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">Activity Timeline</p>
                          <span className={cn("text-[11px] font-semibold", remainingDaysText.includes("overdue") ? "text-destructive font-bold" : "text-muted-foreground")}>
                            {remainingDaysText}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs pt-1.5 border-t border-border/40">
                          <div>
                            <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Go Signal</span>
                            <span className="font-semibold text-foreground">
                              {selectedReport.goSignalAt ? formatShortPortalDate(selectedReport.goSignalAt) : "Pending"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-destructive uppercase font-semibold">Deadline</span>
                            <span className="font-semibold text-destructive">
                              {selectedReport.deadlineAt ? formatShortPortalDate(selectedReport.deadlineAt) : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* REPORT ACTIONS ROW (Placed below Timeline and ABOVE Liquidation Document section) */}
                      {primaryFile && (
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const targetUrl = resolvedModalPreviewUrl || primaryFile.fileUrl;
                              if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="h-11 rounded-xl border-border/80 text-xs font-bold gap-2 cursor-pointer hover:bg-accent text-foreground justify-center truncate px-3 shadow-xs hover:border-primary/40 transition-all"
                          >
                            <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">Open in New Tab</span>
                          </Button>

                          <Button
                            type="button"
                            disabled={downloadingFileId === primaryFile.id}
                            onClick={() => void handleDownloadLiquidationFile(resolvedModalPreviewUrl || primaryFile.fileUrl, primaryFile.fileName, primaryFile.id)}
                            className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 cursor-pointer shadow-xs justify-center truncate px-3 hover:scale-[1.01] active:scale-[0.99] transition-all"
                          >
                            {downloadingFileId === primaryFile.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                <span className="truncate">Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 shrink-0" />
                                <span className="truncate">Download File</span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Liquidation Document Section */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">Liquidation Document</p>
                          {primaryFile && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {primaryFile.fileSize ? `${Math.max(1, Math.round(primaryFile.fileSize / 1024))} KB` : "PDF Document"}
                            </span>
                          )}
                        </div>

                        {primaryFile ? (
                          <div className="bg-card border border-border/80 p-3.5 sm:p-4 rounded-2xl space-y-3.5 shadow-2xs">
                            {/* File Info */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-xs font-bold text-foreground truncate max-w-[240px] sm:max-w-[400px]" title={primaryFile.fileName}>
                                  {primaryFile.fileName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  PDF • {primaryFile.uploadedAt ? `Uploaded ${formatDateTimeLabel(primaryFile.uploadedAt)}` : "Uploaded recently"}
                                </p>
                              </div>
                            </div>

                            {/* Reusable Embedded Document Renderer */}
                            <PortalDocumentViewer
                              previewUrl={resolvedModalPreviewUrl || primaryFile.fileUrl}
                              previewTitle={primaryFile.fileName}
                              previewCanInline={true}
                              onDownloadFile={async (url, name) => {
                                await handleDownloadLiquidationFile(url, name, primaryFile.id);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-border/80 p-6 rounded-2xl text-center space-y-3 bg-muted/10">
                            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-foreground">No liquidation file uploaded yet</p>
                              <p className="text-[11px] text-muted-foreground">
                                Upload your signed post-activity liquidation PDF report for admin review.
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                setLiquidationUploadTargetId(selectedReport.id);
                                liquidationFileInputRef.current?.click();
                              }}
                              className="h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 cursor-pointer gap-1.5"
                            >
                              <FileUp className="h-3.5 w-3.5 shrink-0" />
                              <span>Upload Report File</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="h-14 py-2.5 px-4 sm:px-6 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
                      <p className="text-xs text-muted-foreground font-medium truncate mr-2">
                        Liquidation Report • LYDO Pasig City
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => closeLiquidationDetail()}
                        className="h-8 px-4 rounded-xl text-xs font-semibold border-border hover:bg-accent cursor-pointer shrink-0"
                      >
                        Close
                      </Button>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}

        {/* Hidden File Input for Direct Uploads (Placed at bottom with aria-hidden) */}
        <input
          ref={liquidationFileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          aria-hidden="true"
          onChange={async (event) => {
            const targetReport = liquidationReports.find((item) => item.id === liquidationUploadTargetId) ?? null;
            if (targetReport) {
              await handleLiquidationFileUpload(targetReport, event.target.files);
            }
            event.currentTarget.value = "";
            setLiquidationUploadTargetId(null);
          }}
        />
      </div>
    </FeatureGate>
  );
};
