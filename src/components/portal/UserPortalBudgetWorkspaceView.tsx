import React, { useState, useEffect } from "react";
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Eye,
  Search,
  Check,
  ChevronRight,
  Filter,
  Info,
  Calendar,
  MapPin,
  FileUp,
  X,
  Sparkles,
  Trophy,
  ArrowRight,
  Download,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalStatusBadge } from "@/components/portal/portal-ui";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

import { computeBudgetWorkflowMetrics } from "@/lib/workflow-metrics";
import { WebsiteWorkflowNotice } from "./WebsiteWorkflowNotice";
import { FeatureGate } from "./FeatureGate";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";
import { PortalDrawerDocumentSection } from "./PortalDrawerDocumentSection";

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

export interface UserPortalBudgetWorkspaceViewProps {
  budgetWorkflowEligibility?: any;
  budgetRequests: Array<any>;
  budgetFilesByRequestId: Map<string, any[]>;
  budgetNotesByRequestId: Record<string, string>;
  submittingBudgetId: string | null;
  budgetFileInputRef?: React.RefObject<HTMLInputElement> | null;
  showBudgetForm: boolean;
  setShowBudgetForm: (show: boolean) => void;
  editingBudgetRequest: any | null;
  startEditingBudgetRequest: (request: any | null) => void;
  handleDeleteBudgetRequest: (request: any) => Promise<void>;
  openPreview?: (fileUrl: string, fileName: string) => void;
  openFile: (url: string, name: string) => void;
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
  userRouteMap: Record<string, string>;
  buildPublicRecordCode: (prefix: string, item: any, list: any[]) => string;
  formatCurrency: (amount: number) => string;
  formatShortPortalDate: (dateStr: string) => string;
  formatDateTimeLabel: (dateStr: string) => string;
  formatStatusLabel: (status: string) => string;
  // Form submission props
  newActivityTitle: string;
  setNewActivityTitle: (val: string) => void;
  newActivityDescription: string;
  setNewActivityDescription: (val: string) => void;
  newPurposeCategory: string;
  setNewPurposeCategory: (val: string) => void;
  newActivityDate: string;
  setNewActivityDate: (val: string) => void;
  newVenue: string;
  setNewVenue: (val: string) => void;
  newRequestedAmount: string;
  setNewRequestedAmount: (val: string) => void;
  newRemarks: string;
  setNewRemarks: (val: string) => void;
  handleCreateOrUpdateBudgetRequest: (event: React.FormEvent, isDraft?: boolean) => Promise<void>;
}

export const UserPortalBudgetWorkspaceView: React.FC<UserPortalBudgetWorkspaceViewProps> = ({
  budgetWorkflowEligibility,
  budgetRequests,
  budgetFilesByRequestId,
  budgetNotesByRequestId,
  submittingBudgetId,
  budgetFileInputRef,
  showBudgetForm,
  setShowBudgetForm,
  editingBudgetRequest,
  startEditingBudgetRequest,
  handleDeleteBudgetRequest,
  openPreview,
  openFile,
  navigate,
  searchParams,
  userRouteMap,
  buildPublicRecordCode,
  formatCurrency,
  formatShortPortalDate,
  formatDateTimeLabel,
  formatStatusLabel,
  newActivityTitle,
  setNewActivityTitle,
  newActivityDescription,
  setNewActivityDescription,
  newPurposeCategory,
  setNewPurposeCategory,
  newActivityDate,
  setNewActivityDate,
  newVenue,
  setNewVenue,
  newRequestedAmount,
  setNewRequestedAmount,
  newRemarks,
  setNewRemarks,
  handleCreateOrUpdateBudgetRequest,
}) => {
  const isDesktop = useIsDesktop();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "approved" | "review" | "revision">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount">("newest");
  const [activeFormStep, setActiveFormStep] = useState<number>(1);

  // Automatic Preview Resolution State for Selected Drawer Request
  const [resolvedDrawerPreviewUrl, setResolvedDrawerPreviewUrl] = useState<string>("");
  const [isResolvingPreview, setIsResolvingPreview] = useState<boolean>(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const budgetRoutePath = userRouteMap["budget-request"] || userRouteMap["financial-grant"] || "/financial-grant";
  const selectedRequestId = searchParams.get("budgetRequestId") || searchParams.get("requestId");
  const selectedRequest = selectedRequestId
    ? budgetRequests.find((r) => r.id === selectedRequestId) ?? null
    : null;

  // Extract primitive file URL string for stable useEffect dependencies (prevents continuous reloads)
  const rawDrawerFile = selectedRequest ? budgetFilesByRequestId.get(selectedRequest.id) : null;
  const primaryDrawerFile = Array.isArray(rawDrawerFile) ? rawDrawerFile[0] : rawDrawerFile;
  const primaryFileUrl = primaryDrawerFile?.fileUrl || "";

  // Automatically initialize attached proposal preview URL ONCE per selected request/file
  useEffect(() => {
    let isMounted = true;
    if (!selectedRequestId || !primaryFileUrl) {
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
  }, [selectedRequestId, primaryFileUrl]);

  // Authentic Blob-Fetch Direct File Download Handler (Does not navigate or open new browser tab)
  const handleDownloadBudgetFile = async (fileUrl: string, fileName: string, fileId?: string) => {
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
      link.download = fileName || "budget-proposal.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Direct blob download failed, attempting fallback link download:", err);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName || "budget-proposal.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      if (fileId) setDownloadingFileId(null);
    }
  };

  const openBudgetDetail = (requestId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("budgetRequestId", requestId);
    navigate(`${budgetRoutePath}?${nextParams.toString()}`);
  };

  const closeBudgetDetail = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("budgetRequestId");
    nextParams.delete("requestId");
    const nextQuery = nextParams.toString();
    navigate(nextQuery ? `${budgetRoutePath}?${nextQuery}` : budgetRoutePath);
  };

  // Workflow Status Mapping Helpers for Exact Synchronization Across Cards, Progress, Counters, and Filters
  const isBudgetApproved = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return (
      s === "approved" ||
      s === "approved_for_ftf_green" ||
      s === "budget_released" ||
      s === "completed" ||
      s === "approved_released" ||
      s === "budget_approved_green"
    );
  };

  const isBudgetPending = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return (
      s === "submitted" ||
      s === "pending_review" ||
      s === "under_review" ||
      s === "submitted_for_review" ||
      s === "under_admin_review" ||
      s === "processing"
    );
  };

  const isBudgetRevision = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return (
      s === "needs_revision" ||
      s === "needs_correction" ||
      s === "rejected" ||
      s === "rejected_red"
    );
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

  // Metrics (Derived 100% from shared workflow-metrics utility)
  const budgetMetrics = computeBudgetWorkflowMetrics(budgetRequests);
  const totalRequests = budgetMetrics.totalRequests;
  const underReviewCount = budgetMetrics.underReviewCount;
  const needsRevisionCount = budgetMetrics.needsRevisionCount;
  const approvedCount = budgetMetrics.approvedCount;
  const completionPercent = budgetMetrics.completionPercent;

  const totalReleasedAmount = budgetRequests.reduce((acc, r) => {
    if (isBudgetApproved(r.status)) {
      return acc + (Number(r.releasedAmount) || Number(r.approvedAmount) || Number(r.requestedAmount) || 0);
    }
    return acc;
  }, 0);

  // Filter & Sort
  const filteredRequests = budgetRequests
    .filter((req) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [req.activityTitle, req.purposeCategory, req.venue, req.id].some((v) =>
        v?.toLowerCase().includes(query)
      );
    })
    .filter((req) => {
      if (filterTab === "approved") return isBudgetApproved(req.status);
      if (filterTab === "review") return isBudgetPending(req.status);
      if (filterTab === "revision") return isBudgetRevision(req.status);
      return true;
    })
    .sort((left, right) => {
      if (sortOrder === "oldest") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
      if (sortOrder === "amount") {
        return (Number(right.requestedAmount) || 0) - (Number(left.requestedAmount) || 0);
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  const isBudgetEligible = Boolean(budgetWorkflowEligibility ? budgetWorkflowEligibility.eligible : true);

  const nextBudgetStepAction = !budgetWorkflowEligibility?.profileComplete
    ? "Complete Profile"
    : !budgetWorkflowEligibility?.registrationVerified || !budgetWorkflowEligibility?.documentsSatisfied
    ? "View Registration Status"
    : "Open YPOP Incentive";

  const nextBudgetStepRoute = !budgetWorkflowEligibility?.profileComplete
    ? userRouteMap["organization-profile"]
    : !budgetWorkflowEligibility?.registrationVerified || !budgetWorkflowEligibility?.documentsSatisfied
    ? userRouteMap["document-submission"]
    : userRouteMap.ypop;

  return (
    <FeatureGate
      canAccess={isBudgetEligible}
      title="Complete eligibility requirements first"
      description="Your organization must complete registration and qualify in an active YPOP period before creating an activity budget request."
      requirements={budgetWorkflowEligibility?.requirements || []}
      actionLabel={nextBudgetStepAction}
      onAction={() => navigate(nextBudgetStepRoute)}
      heroSection={
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">Financial Workspace</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Budget Requests
              </h1>
              <p className="text-sm text-muted-foreground">
                Submit financial grant proposals, track approval stages, and monitor released funds.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-2 sm:py-2">
      
      {/* ------------------------------------------------------------- */}
      {/* MODE A: SECTIONED FORM VIEW (If showBudgetForm is true)       */}
      {/* ------------------------------------------------------------- */}
      {showBudgetForm ? (
        <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
          {/* Form Hero Banner */}
          <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Budget Workspace</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">New Proposal</span>
            </div>
            <h1 className="text-2xl font-black text-foreground">
              {editingBudgetRequest ? "Edit Budget Request" : "Create Budget Request"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Complete the information below to submit your budget proposal for admin review.
            </p>
          </div>

          {/* Grant Qualification Summary Card */}
          <Card className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Active YPOP Qualification</h4>
                <p className="text-[11px] text-muted-foreground">
                  This request will be submitted under your organization's active Pasig City YPOP grant allocation.
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full shrink-0">
              Project Grant (PPA)
            </span>
          </Card>

          {/* Form Container */}
          <form onSubmit={(e) => void handleCreateOrUpdateBudgetRequest(e, false)} className="space-y-6 pb-20">
            {/* Section 1: Activity Details */}
            <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
              <div className="border-b border-border/40 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
                  Activity Details
                </h3>
                <p className="text-xs text-muted-foreground">Title, description, and purpose of your planned activity.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Activity Title <span className="text-red-500">*</span></label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Youth Leadership Seminar 2026"
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background border-border/80"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Purpose & Category</label>
                    <Input
                      type="text"
                      placeholder="e.g. Leadership & Capability Building"
                      value={newPurposeCategory}
                      onChange={(e) => setNewPurposeCategory(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background border-border/80"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Requested Budget Amount (₱) <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 50000"
                      value={newRequestedAmount}
                      onChange={(e) => setNewRequestedAmount(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background border-border/80 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Activity Description</label>
                  <Textarea
                    rows={3}
                    placeholder="Briefly describe the objectives, expected outcomes, and target participants..."
                    value={newActivityDescription}
                    onChange={(e) => setNewActivityDescription(e.target.value)}
                    className="text-xs rounded-xl bg-background border-border/80"
                  />
                </div>
              </div>
            </Card>

            {/* Section 2: Schedule & Venue */}
            <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
              <div className="border-b border-border/40 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
                  Schedule & Location
                </h3>
                <p className="text-xs text-muted-foreground">Target execution date and location details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Activity Date</label>
                  <Input
                    type="date"
                    value={newActivityDate}
                    onChange={(e) => setNewActivityDate(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Venue / Location</label>
                  <Input
                    type="text"
                    placeholder="e.g. Pasig City Youth Center, Oranbo"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background border-border/80"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Additional Remarks / Justification</label>
                <Textarea
                  rows={2}
                  placeholder="Any additional remarks for the reviewing officer..."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="text-xs rounded-xl bg-background border-border/80"
                />
              </div>
            </Card>

            {/* Form Actions Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBudgetForm(false);
                  startEditingBudgetRequest(null);
                }}
                className="w-full sm:w-auto h-10 rounded-xl border-border text-xs font-semibold px-5 cursor-pointer"
              >
                Cancel
              </Button>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => void handleCreateOrUpdateBudgetRequest(e, true)}
                  className="w-full sm:w-auto h-10 rounded-xl border-border text-xs font-semibold px-5 cursor-pointer"
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-6 shadow-2xs cursor-pointer"
                >
                  {editingBudgetRequest ? "Update Proposal" : "Submit Proposal →"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MODE B: RICH DATA TABLE WORKSPACE VIEW                       */
        /* ------------------------------------------------------------- */
        <div className="space-y-4 sm:space-y-6">
          {/* 1. Hero Header Banner (Refined Institutional Framing) */}
          <div className="bg-card p-5 sm:p-6 rounded-2xl border border-border/70 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">Financial Workspace</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground font-medium">LYDO Pasig City</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Budget Requests
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed max-w-2xl">
                  Submit financial grant proposals, track approval stages, and monitor released funds.
                </p>
              </div>
            </div>
          </div>

          {/* Workflow Notice Banner if Ineligible */}
          {budgetWorkflowEligibility && !budgetWorkflowEligibility.eligible && (
            <WebsiteWorkflowNotice
              title="Complete eligibility requirements first"
              description="Existing requests remain available below, but creating a new budget request requires completed registration and active YPOP qualification."
              requirements={budgetWorkflowEligibility.requirements || []}
              actionLabel={
                !budgetWorkflowEligibility.profileComplete
                  ? "Complete Profile"
                  : !budgetWorkflowEligibility.registrationVerified || !budgetWorkflowEligibility.documentsSatisfied
                  ? "View Registration Status"
                  : "Open YPOP Incentive"
              }
              onAction={() =>
                navigate(
                  !budgetWorkflowEligibility.profileComplete
                    ? userRouteMap["organization-profile"]
                    : !budgetWorkflowEligibility.registrationVerified || !budgetWorkflowEligibility.documentsSatisfied
                    ? userRouteMap["document-submission"]
                    : userRouteMap.ypop
                )
              }
            />
          )}

          {/* 2. Unified Operational Overview (Progress + High-Density Context Metrics) */}
          <Card className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
            {/* Top: Progress & Workflow Status Distribution */}
            <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {approvedCount} of {totalRequests} Budget Requests Approved
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary font-mono tabular-nums">
                      {completionPercent}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Overview of all financial grant proposals submitted for organization activities.
                  </p>
                </div>

                {/* Semantic Status Distribution */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{approvedCount} Approved</span>
                  </span>
                  <span className={cn("flex items-center gap-1.5 font-semibold", underReviewCount === 0 ? "text-muted-foreground/50" : "text-primary")}>
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{underReviewCount} Review</span>
                  </span>
                  <span className={cn("flex items-center gap-1.5 font-semibold", needsRevisionCount === 0 ? "text-muted-foreground/50" : "text-amber-600 dark:text-amber-400")}>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{needsRevisionCount} Revision</span>
                  </span>
                </div>
              </div>

              {/* Sleek Progress Indicator */}
              <div className="mt-3.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* Bottom: High-Density Context Metrics Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-card">
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Requests</span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-foreground tabular-nums tracking-tight">{totalRequests}</div>
                  <p className="text-[11px] text-muted-foreground truncate">Total proposals filed</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>

              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Pending Review</span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-primary tabular-nums tracking-tight">{underReviewCount}</div>
                  <p className="text-[11px] text-muted-foreground truncate">Awaiting admin validation</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
              </div>

              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Approved / Released</span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">{approvedCount}</div>
                  <p className="text-[11px] text-muted-foreground truncate">Approved grant requests</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>

              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Released Funds</span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight truncate">{formatCurrency(totalReleasedAmount)}</div>
                  <p className="text-[11px] text-muted-foreground truncate">Disbursed to organization</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Coherent Segmented Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card border border-border/70 p-2 sm:p-2.5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl overflow-x-auto [scrollbar-width:none] touch-pan-x">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap",
                  filterTab === "all"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                All ({totalRequests})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("approved")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap",
                  filterTab === "approved"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : approvedCount === 0
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                Approved / Released ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("review")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap",
                  filterTab === "review"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : underReviewCount === 0
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                Under Review ({underReviewCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("revision")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap",
                  filterTab === "revision"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : needsRevisionCount === 0
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                Needs Revision ({needsRevisionCount})
              </button>
            </div>

            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto lg:flex-1 lg:min-w-0 lg:justify-end">
              <div className="relative flex-1 sm:w-72 lg:w-full min-w-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search activity, category, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80 w-full focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl border-border/80 text-xs font-medium gap-1.5 shrink-0 hover:bg-muted cursor-pointer">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden xs:inline text-muted-foreground">Sort:</span>
                    <span className="font-semibold capitalize">{sortOrder}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 p-2 rounded-xl bg-card border-border/80 shadow-lg z-50">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")} className="text-xs font-medium cursor-pointer">Newest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="text-xs font-medium cursor-pointer">Oldest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("amount")} className="text-xs font-medium cursor-pointer">Highest Amount</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 4. Mobile Cards List (block lg:hidden) */}
          <div className="mobile-cards flex flex-col gap-3 block lg:hidden">
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs space-y-1.5 rounded-2xl border border-border/70 bg-card">
                <div className="h-10 w-10 rounded-xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="font-bold text-foreground">No budget requests found</p>
                <p className="text-xs">Try adjusting your search or status filter.</p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <Card
                  key={req.id}
                  onClick={() => openBudgetDetail(req.id)}
                  className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs flex flex-col hover:border-primary/40 transition-all cursor-pointer"
                >
                  {/* Top: Title & Status directly below */}
                  <div className="space-y-1.5 min-w-0">
                    <p className="font-bold text-sm text-foreground leading-snug break-words" title={req.activityTitle}>
                      {req.activityTitle || "Proposal Activity"}
                    </p>
                    <div className="pt-0.5">
                      <PortalStatusBadge status={req.status} />
                    </div>
                  </div>
                  
                  {/* Summary: Amount & Target Date in 2 columns */}
                  <div className="grid grid-cols-2 gap-3 text-xs py-2 px-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Amount</span>
                      <span className="font-bold font-mono text-foreground text-xs sm:text-sm truncate block">
                        {formatCurrency(req.requestedAmount || 0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Target Date</span>
                      <span className="font-semibold text-foreground text-xs sm:text-sm truncate block">
                        {req.activityDate ? formatShortPortalDate(req.activityDate) : "Not set"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Primary Action Button */}
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      type="button" 
                      onClick={() => openBudgetDetail(req.id)}
                      className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs cursor-pointer justify-center"
                    >
                      Open →
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* 5. Rich Modern SaaS Data Table (hidden lg:block - EXACT DESKTOP SOURCE OF TRUTH) */}
          <div className="desktop-table hidden lg:block">
            <Card className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Activity Proposal</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Requested / Approved Amount</th>
                      <th className="py-3 px-4">Schedule & Venue</th>
                      <th className="py-3 px-4">Attachment</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs space-y-1.5">
                          <div className="h-10 w-10 rounded-xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                          </div>
                          <p className="font-bold text-foreground">No budget requests found</p>
                          <p className="text-xs">Try adjusting your search or status filter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => {
                        const rawFile = budgetFilesByRequestId.get(req.id);
                        const primaryFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;
                        const recordCode = buildPublicRecordCode("BR", req, budgetRequests);
                        const isApproved = isBudgetApproved(req.status);
                        const isUnderReview = isBudgetPending(req.status);

                        return (
                          <tr
                            key={req.id}
                            onClick={() => openBudgetDetail(req.id)}
                            className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors duration-150 cursor-pointer group"
                          >
                            {/* Column 1: Activity Proposal */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  <DollarSign className="h-4.5 w-4.5" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <p className="text-sm font-bold text-foreground leading-snug truncate max-w-[250px]" title={req.activityTitle}>
                                    {req.activityTitle || "Proposal Activity"}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                      {recordCode}
                                    </span>
                                    <span className="text-muted-foreground/50">•</span>
                                    <span className="text-muted-foreground text-[11px] truncate max-w-[140px]">
                                      {req.purposeCategory || "General Purpose"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Status Badge */}
                            <td className="py-3.5 px-4">
                              <PortalStatusBadge status={req.status} />
                            </td>

                            {/* Column 3: Amounts */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5 text-xs">
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Requested: </span>
                                  <span className="font-bold font-mono text-foreground">{formatCurrency(req.requestedAmount || 0)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Approved: </span>
                                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                    {req.approvedAmount ? formatCurrency(req.approvedAmount) : req.releasedAmount ? formatCurrency(req.releasedAmount) : "—"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Column 4: Schedule & Venue */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5 text-xs">
                                <p className="font-semibold text-foreground">
                                  {req.activityDate ? formatShortPortalDate(req.activityDate) : "Not set"}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[140px]" title={req.venue}>
                                  {req.venue || "Pasig City"}
                                </p>
                              </div>
                            </td>

                            {/* Column 5: Attachment (Opens In-App Preview Modal) */}
                            <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                              {primaryFile ? (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate max-w-[130px]" title={primaryFile.fileName}>
                                      {primaryFile.fileName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">PDF Document</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (openPreview) {
                                        void openPreview(primaryFile.fileUrl, primaryFile.fileName);
                                      } else {
                                        void openFile(primaryFile.fileUrl, primaryFile.fileName);
                                      }
                                    }}
                                    className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-md shrink-0 cursor-pointer"
                                  >
                                    View
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/60 italic">No file attached</span>
                              )}
                            </td>

                            {/* Column 6: Last Activity */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5 text-xs">
                                <p className="font-semibold text-foreground">
                                  {isApproved ? "Budget Released" : isUnderReview ? "Awaiting Review" : "Updated"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatShortPortalDate(req.updatedAt || req.createdAt)}
                                </p>
                              </div>
                            </td>

                            {/* Column 7: Primary Action */}
                            <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openBudgetDetail(req.id)}
                                className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-3.5 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xs cursor-pointer"
                              >
                                Open →
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
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. Desktop Details Drawer (isDesktop ONLY - Canonical)        */}
      {/* ------------------------------------------------------------- */}
      {isDesktop && (
        <Sheet open={Boolean(selectedRequest)} onOpenChange={(open) => { if (!open) closeBudgetDetail(); }}>
          <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col bg-card border-l border-border/80 shadow-2xl">
            {selectedRequest && (() => {
              const rawDrawerFile = budgetFilesByRequestId?.get(selectedRequest.id);
              const primaryFile = Array.isArray(rawDrawerFile) ? rawDrawerFile[0] : rawDrawerFile;
              const recordCode = buildPublicRecordCode("BR", selectedRequest, budgetRequests);
              const activePreviewUrl = resolvedDrawerPreviewUrl || primaryFile?.fileUrl || "";

              return (
                <>
                  {/* PINNED HEADER */}
                  <div className="p-5 sm:p-6 border-b border-border/70 bg-card shrink-0 space-y-2">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                          {recordCode}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 tabular-nums">
                          {formatCurrency(selectedRequest.requestedAmount || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <SheetTitle className="text-xl font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere]" title={selectedRequest.activityTitle}>
                        {selectedRequest.activityTitle || "Budget Request"}
                      </SheetTitle>
                      <div className="flex items-center gap-2 pt-0.5">
                        <PortalStatusBadge status={selectedRequest.status} />
                      </div>
                      <SheetDescription className="text-xs text-muted-foreground font-medium pt-0.5">
                        {selectedRequest.purposeCategory || "General Purpose"} • {selectedRequest.venue || "Pasig City"}
                      </SheetDescription>
                    </div>
                  </div>

                  {/* SCROLLABLE BODY */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
                    {/* Key Summary: Financial Overview */}
                    <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 shadow-2xs space-y-2">
                      <p className="text-xs font-bold text-foreground">Financial Overview</p>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/40">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Requested Amount</span>
                          <span className="font-bold text-foreground text-sm tabular-nums">
                            {formatCurrency(selectedRequest.requestedAmount || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold tracking-wider">Approved / Released</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                            {selectedRequest.approvedAmount
                              ? formatCurrency(selectedRequest.approvedAmount)
                              : selectedRequest.releasedAmount
                              ? formatCurrency(selectedRequest.releasedAmount)
                              : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Document Section (Primary Content) */}
                    <PortalDrawerDocumentSection
                      file={primaryFile}
                      previewUrl={activePreviewUrl}
                      isDownloading={downloadingFileId === primaryFile?.id}
                      onDownloadFile={(url, name, id) => void handleDownloadBudgetFile(url, name, id)}
                      formatDateTimeLabel={formatDateTimeLabel}
                      sectionTitle="Proposal Document"
                      emptyTitle="No proposal file attached"
                      emptyDescription="This budget request does not have an attached proposal document."
                    />

                    {/* Secondary Details: Schedule & Location */}
                    <div className="rounded-xl border border-border/50 bg-card/70 p-3 sm:p-3.5 space-y-2">
                      <p className="text-xs font-bold text-foreground">Schedule & Location</p>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1.5 border-t border-border/40">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Target Date</span>
                          <span className="font-semibold text-foreground">
                            {selectedRequest.activityDate ? formatShortPortalDate(selectedRequest.activityDate) : "Not set"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Venue</span>
                          <span className="font-semibold text-foreground truncate block" title={selectedRequest.venue}>
                            {selectedRequest.venue || "Pasig City"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Details: Description & Remarks if any */}
                    {(selectedRequest.activityDescription || selectedRequest.remarks || selectedRequest.description) && (
                      <div className="rounded-xl border border-border/50 bg-card/70 p-3 sm:p-3.5 space-y-1.5 text-xs">
                        <p className="font-bold text-foreground">Activity Details & Remarks</p>
                        <div className="space-y-1 pt-1 border-t border-border/40 text-muted-foreground">
                          {selectedRequest.activityDescription && (
                            <p className="leading-relaxed">{selectedRequest.activityDescription}</p>
                          )}
                          {selectedRequest.remarks && (
                            <p className="leading-relaxed italic text-[11px] text-muted-foreground/90">
                              <span className="font-semibold not-italic">Remarks:</span> {selectedRequest.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PINNED FOOTER */}
                  <div className="h-14 py-2.5 px-5 sm:px-6 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
                    <p className="text-xs text-muted-foreground font-medium truncate mr-2">
                      Budget Request • LYDO Pasig City
                    </p>
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8.5 px-4 rounded-xl text-xs font-semibold border-border hover:bg-accent cursor-pointer shrink-0"
                      >
                        Close Drawer
                      </Button>
                    </SheetClose>
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. Mobile Budget Request Modal (!isDesktop ONLY)               */}
      {/* ------------------------------------------------------------- */}
      {!isDesktop && (
        <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => { if (!open) closeBudgetDetail(); }}>
          <DialogContent
            hideCloseButton={true}
            className="w-[94vw] sm:w-[92vw] max-w-3xl h-[88vh] max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200"
          >
            {selectedRequest && (() => {
              const rawDrawerFile = budgetFilesByRequestId?.get(selectedRequest.id);
              const primaryFile = Array.isArray(rawDrawerFile) ? rawDrawerFile[0] : rawDrawerFile;
              const recordCode = buildPublicRecordCode("BR", selectedRequest, budgetRequests);
              const activePreviewUrl = resolvedDrawerPreviewUrl || primaryFile?.fileUrl || "";

              return (
                <>
                  <DialogDescription className="sr-only">
                    Budget Request Details for {selectedRequest.activityTitle || "Request"}
                  </DialogDescription>

                  {/* PINNED HEADER */}
                  <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border/70 bg-card flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                          {recordCode}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 tabular-nums">
                          {formatCurrency(selectedRequest.requestedAmount || 0)}
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label="Close modal"
                        onClick={() => closeBudgetDetail()}
                        className="h-8 w-8 rounded-full border border-border/60 hover:bg-accent hover:text-foreground text-muted-foreground flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere] line-clamp-2">
                        {selectedRequest.activityTitle || "Budget Request"}
                      </DialogTitle>
                      <div className="flex items-center gap-2 pt-0.5">
                        <PortalStatusBadge status={selectedRequest.status} />
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground font-medium pt-0.5">
                        {selectedRequest.purposeCategory || "General Purpose"} • {selectedRequest.venue || "Pasig City"}
                      </p>
                    </div>
                  </div>

                  {/* SCROLLABLE BODY */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
                    {/* Key Summary: Financial Overview */}
                    <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 shadow-2xs space-y-2">
                      <p className="text-xs font-bold text-foreground">Financial Overview</p>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/40">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Requested Amount</span>
                          <span className="font-bold text-foreground text-sm tabular-nums">
                            {formatCurrency(selectedRequest.requestedAmount || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold tracking-wider">Approved / Released</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                            {selectedRequest.approvedAmount
                              ? formatCurrency(selectedRequest.approvedAmount)
                              : selectedRequest.releasedAmount
                              ? formatCurrency(selectedRequest.releasedAmount)
                              : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Document Section (Primary Content) */}
                    <PortalDrawerDocumentSection
                      file={primaryFile}
                      previewUrl={activePreviewUrl}
                      isDownloading={downloadingFileId === primaryFile?.id}
                      onDownloadFile={(url, name, id) => void handleDownloadBudgetFile(url, name, id)}
                      formatDateTimeLabel={formatDateTimeLabel}
                      sectionTitle="Proposal Document"
                      emptyTitle="No proposal file attached"
                      emptyDescription="This budget request does not have an attached proposal document."
                    />

                    {/* Secondary Details: Schedule & Location */}
                    <div className="rounded-xl border border-border/50 bg-card/70 p-3 sm:p-3.5 space-y-2">
                      <p className="text-xs font-bold text-foreground">Schedule & Location</p>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1.5 border-t border-border/40">
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Target Date</span>
                          <span className="font-semibold text-foreground">
                            {selectedRequest.activityDate ? formatShortPortalDate(selectedRequest.activityDate) : "Not set"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Venue</span>
                          <span className="font-semibold text-foreground truncate block" title={selectedRequest.venue}>
                            {selectedRequest.venue || "Pasig City"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Details: Description & Remarks if any */}
                    {(selectedRequest.activityDescription || selectedRequest.remarks || selectedRequest.description) && (
                      <div className="rounded-xl border border-border/50 bg-card/70 p-3 sm:p-3.5 space-y-1.5 text-xs">
                        <p className="font-bold text-foreground">Activity Details & Remarks</p>
                        <div className="space-y-1 pt-1 border-t border-border/40 text-muted-foreground">
                          {selectedRequest.activityDescription && (
                            <p className="leading-relaxed">{selectedRequest.activityDescription}</p>
                          )}
                          {selectedRequest.remarks && (
                            <p className="leading-relaxed italic text-[11px] text-muted-foreground/90">
                              <span className="font-semibold not-italic">Remarks:</span> {selectedRequest.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PINNED FOOTER */}
                  <div className="h-14 py-2.5 px-4 sm:px-6 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
                    <p className="text-xs text-muted-foreground font-medium truncate mr-2">
                      Budget Request • LYDO Pasig City
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => closeBudgetDetail()}
                      className="h-8.5 px-4 rounded-xl text-xs font-semibold border-border hover:bg-accent cursor-pointer shrink-0"
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
    </div>
    </FeatureGate>
  );
};
