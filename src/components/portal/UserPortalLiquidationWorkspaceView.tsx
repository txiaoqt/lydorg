import React, { useState, useEffect } from "react";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileUp,
  Eye,
  Search,
  Check,
  ChevronRight,
  FileText,
  Filter,
  Info,
  Calendar,
  ArrowRight,
  Download,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalStatusBadge } from "@/components/portal/portal-ui";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { cn } from "@/lib/utils";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

import { computeLiquidationWorkflowMetrics } from "@/lib/workflow-metrics";
import { WebsiteWorkflowNotice } from "./WebsiteWorkflowNotice";
import { FeatureGate } from "./FeatureGate";

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

export const UserPortalLiquidationWorkspaceView: React.FC<UserPortalLiquidationWorkspaceViewProps> = ({
  liquidationWorkflowEligibility,
  budgetWorkflowEligibility,
  liquidationReports,
  budgetRequests,
  liquidationFilesByReportId,
  liquidationNotesByReportId,
  setLiquidationNotesByReportId,
  submittingLiquidationId,
  liquidationFileInputRef,
  liquidationUploadTargetId,
  setLiquidationUploadTargetId,
  handleLiquidationFileUpload,
  handleSubmitLiquidation,
  handleDeleteLiquidationFile,
  openPreview,
  openFile,
  navigate,
  searchParams = new URLSearchParams(),
  userRouteMap,
  buildPublicRecordCode,
  formatCurrency,
  formatShortPortalDate,
  formatDateTimeLabel,
  formatStatusLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "review" | "completed" | "revision">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "deadline">("newest");
  
  // Automatic Preview Resolution State for Selected Drawer Report
  const [resolvedDrawerPreviewUrl, setResolvedDrawerPreviewUrl] = useState<string>("");
  const [isResolvingPreview, setIsResolvingPreview] = useState<boolean>(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const liquidationRoutePath = userRouteMap["liquidation-reporting"] || "/liquidation-reporting";
  const selectedReportId = searchParams.get("reportId");
  const selectedReport = selectedReportId
    ? liquidationReports.find((r) => r.id === selectedReportId) ?? null
    : null;

  // Extract primitive file URL string for stable useEffect dependencies (prevents continuous reloads)
  const primaryFileObj = selectedReport ? (liquidationFilesByReportId.get(selectedReport.id)?.[0] ?? null) : null;
  const primaryFileUrl = primaryFileObj?.fileUrl || "";

  // Automatically initialize attached document preview URL ONCE per selected report/file
  useEffect(() => {
    let isMounted = true;
    if (!selectedReportId || !primaryFileUrl) {
      setResolvedDrawerPreviewUrl("");
      setIsResolvingPreview(false);
      return;
    }

    setIsResolvingPreview(true);
    resolveSupabaseFileUrl(primaryFileUrl)
      .then((url) => {
        if (isMounted) {
          setResolvedDrawerPreviewUrl(url || primaryFileUrl);
          setIsResolvingPreview(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedDrawerPreviewUrl(primaryFileUrl);
          setIsResolvingPreview(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedReportId, primaryFileUrl]);

  // Authentic Blob-Fetch Direct File Download Handler (Does not navigate or open new browser tab)
  const handleDownloadLiquidationFile = async (fileUrl: string, fileName: string, fileId?: string) => {
    if (!fileUrl) return;
    try {
      if (fileId) setDownloadingFileId(fileId);
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
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

  const isPreviewableFileType = (fileName?: string, fileUrl?: string) => {
    const target = (fileName || fileUrl || "").toLowerCase();
    return (
      target.endsWith(".pdf") ||
      target.endsWith(".png") ||
      target.endsWith(".jpg") ||
      target.endsWith(".jpeg") ||
      target.endsWith(".webp") ||
      target.includes("pdf") ||
      target.startsWith("http")
    );
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
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">Liquidation Workspace</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Liquidation Reports
          </h1>
          <p className="text-sm text-muted-foreground max-w-[720px]">
            Track deadlines, upload post-activity reports, and monitor liquidation approvals in a rich data table.
          </p>
        </div>
      }
    >
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-2">
      {/* Hidden File Input for Direct Uploads */}
      <input
        ref={liquidationFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={async (event) => {
          const targetReport = liquidationReports.find((item) => item.id === liquidationUploadTargetId) ?? null;
          if (targetReport) {
            await handleLiquidationFileUpload(targetReport, event.target.files);
          }
          event.currentTarget.value = "";
          setLiquidationUploadTargetId(null);
        }}
      />

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">Liquidation Workspace</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Liquidation Reports
        </h1>
        <p className="text-sm text-muted-foreground max-w-[720px]">
          Track deadlines, upload post-activity reports, and monitor liquidation approvals in a rich data table.
        </p>
      </div>

      {/* Progress Bar Summary Card */}
      <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {completedCount} of {totalReports} Reports Liquidated ({completionPercent}%)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Overview of all post-activity liquidation reports submitted for organization activities.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> {completedCount} Liquidated
            </span>
            <span className={cn("flex items-center gap-1.5 font-semibold", underReviewCount === 0 ? "text-muted-foreground/50" : "text-indigo-600 dark:text-indigo-400")}>
              <Clock className="h-4 w-4" /> {underReviewCount} Review
            </span>
            <span className={cn("flex items-center gap-1.5 font-semibold", needsRevisionCount === 0 ? "text-muted-foreground/50" : "text-amber-600 dark:text-amber-400")}>
              <AlertTriangle className="h-4 w-4" /> {needsRevisionCount} Revision
            </span>
          </div>
        </div>

        <Progress value={completionPercent} className="h-2 bg-muted" />
      </Card>

      {/* Smart Filter Toolbar + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scroll-tabs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer min-h-[44px]",
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
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer min-h-[44px]",
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
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer min-h-[44px]",
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
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer min-h-[44px]",
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
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search activity, code, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 sm:h-8 pl-8 text-xs rounded-xl bg-background border-border/80"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-11 sm:h-8 rounded-xl border-border text-xs font-medium gap-1 shrink-0">
                <Filter className="h-3.5 w-3.5" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-2 rounded-xl bg-card border-border/80">
              <DropdownMenuItem onClick={() => setSortOrder("newest")} className="text-xs font-medium min-h-[44px]">Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="text-xs font-medium min-h-[44px]">Oldest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("deadline")} className="text-xs font-medium min-h-[44px]">Deadline</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Card Alternative */}
      <div className="mobile-cards space-y-4">
        {filteredReports.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs space-y-1 rounded-2xl border border-border/60 bg-card">
            <p className="font-bold text-foreground">No liquidation reports found</p>
            <p className="text-xs">Try adjusting your search or status filter.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const relatedBudget = budgetRequests.find((req) => req.id === report.budgetRequestId) ?? null;
            const files = liquidationFilesByReportId.get(report.id) ?? [];
            const primaryFile = files[0] ?? null;
            const remainingDaysText = getRemainingDaysLabel(report.deadlineAt);

            return (
              <div 
                key={report.id} 
                className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-xs"
                onClick={() => openLiquidationDetail(report.id)}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {relatedBudget?.activityTitle || "Approved Activity"}
                  </p>
                  <PortalStatusBadge status={report.status} />
                </div>
                
                <div className="text-xs">
                  <span className="text-muted-foreground">Due: </span>
                  <span className={cn("font-semibold", remainingDaysText.includes("overdue") ? "text-destructive" : "text-foreground")}>
                    {report.deadlineAt ? formatShortPortalDate(report.deadlineAt) : "Pending"}
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                  {primaryFile ? (
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-xs font-semibold text-foreground truncate max-w-[140px]" title={primaryFile.fileName}>
                          {primaryFile.fileName}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openPreview) {
                            void openPreview(primaryFile.fileUrl, primaryFile.fileName);
                          } else if (openFile) {
                            void openFile(primaryFile.fileUrl, primaryFile.fileName);
                          }
                        }}
                        className="h-11 px-3 text-xs font-semibold text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                      >
                        View
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLiquidationUploadTargetId(report.id);
                        liquidationFileInputRef.current?.click();
                      }}
                      className="h-11 w-full text-xs rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-semibold px-4 cursor-pointer"
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Report
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLiquidationDetail(report.id);
                    }}
                    className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-xs font-semibold px-4 hover:bg-primary/90 transition-all shadow-2xs cursor-pointer"
                  >
                    Open Report →
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rich Modern SaaS Data Table */}
      <Card className="desktop-table rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
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

                      {/* Column 5: Report File (Table View Button) */}
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openPreview) {
                                  void openPreview(primaryFile.fileUrl, primaryFile.fileName);
                                } else if (openFile) {
                                  void openFile(primaryFile.fileUrl, primaryFile.fileName);
                                }
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground/60 italic">No file uploaded</span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setLiquidationUploadTargetId(report.id);
                                liquidationFileInputRef.current?.click();
                              }}
                              className="h-7 text-[11px] rounded-lg bg-primary text-primary-foreground font-semibold px-2.5 shrink-0 cursor-pointer"
                            >
                              Upload
                            </Button>
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

      {/* Sleek Drawer with Stable Single-Render Embedded Preview */}
      <Sheet open={Boolean(selectedReport)} onOpenChange={(open) => { if (!open) closeLiquidationDetail(); }}>
        <SheetContent side="right" className="w-[min(38rem,95vw)] sm:w-[520px] overflow-y-auto bg-card border-border p-6 sm:p-7 space-y-6">
          {selectedReport && (() => {
            const selectedBudget = budgetRequests.find((req) => req.id === selectedReport.budgetRequestId) ?? null;
            const selectedFiles = liquidationFilesByReportId.get(selectedReport.id) ?? [];
            const primaryFile = selectedFiles[0] ?? null;
            const recordCode = buildPublicRecordCode("LR", selectedReport, liquidationReports);
            
            // Stable resolved URL or fallback URL
            const activePreviewUrl = resolvedDrawerPreviewUrl || primaryFile?.fileUrl || "";
            const canPreviewInline = primaryFile && isPreviewableFileType(primaryFile.fileName, activePreviewUrl);

            return (
              <div className="space-y-6">
                <SheetHeader className="space-y-2 border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                      {recordCode}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      {formatCurrency(selectedBudget?.releasedAmount || selectedBudget?.approvedAmount || 0)}
                    </span>
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

                {/* Attached File Viewer & Stable Automatic Embedded Preview */}
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

                        {/* Direct Blob-Fetch Download File Button (No browser tab navigation) */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={downloadingFileId === primaryFile.id}
                          onClick={() => void handleDownloadLiquidationFile(activePreviewUrl, primaryFile.fileName, primaryFile.id)}
                          className="h-8 text-xs font-medium rounded-xl border-border shrink-0 cursor-pointer gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingFileId === primaryFile.id ? "Downloading..." : "Download File"}
                        </Button>
                      </div>

                      {/* Stable Single-Render Embedded Preview Area */}
                      {isResolvingPreview ? (
                        <div className="h-[340px] rounded-xl border border-border/70 bg-muted/10 flex flex-col items-center justify-center p-4 text-center space-y-2.5">
                          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-muted-foreground font-medium">Loading document preview...</p>
                        </div>
                      ) : canPreviewInline && activePreviewUrl ? (
                        <div className="h-[340px] rounded-xl border border-border/70 overflow-hidden bg-muted/10 relative">
                          <iframe
                            src={activePreviewUrl}
                            title={primaryFile.fileName}
                            className="h-full w-full border-0 rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="h-[180px] rounded-xl border border-border/70 bg-muted/20 flex flex-col items-center justify-center p-4 text-center space-y-2.5">
                          <FileText className="h-8 w-8 text-muted-foreground/60" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Preview not available for this file type.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={downloadingFileId === primaryFile.id}
                            onClick={() => void handleDownloadLiquidationFile(activePreviewUrl, primaryFile.fileName, primaryFile.id)}
                            className="h-8 text-xs font-semibold rounded-xl border-border gap-1.5 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadingFileId === primaryFile.id ? "Downloading..." : "Download File"}
                          </Button>
                        </div>
                      )}
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
    </div>
    </FeatureGate>
  );
};
