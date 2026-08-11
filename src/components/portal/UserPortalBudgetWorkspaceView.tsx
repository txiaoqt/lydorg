import React, { useState, useEffect } from "react";
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
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
  Download
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
import { cn } from "@/lib/utils";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

import { computeBudgetWorkflowMetrics } from "@/lib/workflow-metrics";
import { WebsiteWorkflowNotice } from "./WebsiteWorkflowNotice";
import { FeatureGate } from "./FeatureGate";

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
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
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
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-2">
      
      {/* ------------------------------------------------------------- */}
      {/* MODE A: SECTIONED FORM VIEW (If showBudgetForm is true)       */}
      {/* ------------------------------------------------------------- */}
      {showBudgetForm ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Form Hero Banner */}
          <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-6 rounded-2xl border border-border/60 shadow-xs space-y-1">
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
        <div className="space-y-6">
          {/* Hero Header Banner */}
          <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
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

              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                <Button
                  type="button"
                  disabled={Boolean(budgetWorkflowEligibility && !budgetWorkflowEligibility.eligible)}
                  onClick={() => {
                    if (budgetWorkflowEligibility && !budgetWorkflowEligibility.eligible) {
                      return;
                    }
                    startEditingBudgetRequest(null);
                    setShowBudgetForm(true);
                  }}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 h-9 px-4 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Budget Request
                </Button>
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

          {/* Synchronized 4-Grid Modern SaaS Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Requests</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-2xl font-black text-foreground">{totalRequests}</h3>
                <p className="text-[11px] text-muted-foreground">Total financial proposals filed</p>
              </div>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Review</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{underReviewCount}</h3>
                <p className="text-[11px] text-muted-foreground">Awaiting admin validation</p>
              </div>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approved / Released</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</h3>
                <p className="text-[11px] text-muted-foreground">Successfully approved grant requests</p>
              </div>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Released Funds</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReleasedAmount)}</h3>
                <p className="text-[11px] text-muted-foreground">Disbursed to organization</p>
              </div>
            </Card>
          </div>

          {/* Synchronized Progress Bar Summary Card */}
          <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {approvedCount} of {totalRequests} Budget Requests Approved ({completionPercent}%)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Overview of all financial grant proposals submitted for organization activities.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> {approvedCount} Approved
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
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
                  filterTab === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                All ({totalRequests})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("approved")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
                  filterTab === "approved"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : approvedCount === 0
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                Approved / Released ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("review")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
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
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
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
                  placeholder="Search activity, category, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl border-border text-xs font-medium gap-1 shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 p-2 rounded-xl bg-card border-border/80">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")} className="text-xs font-medium">Newest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="text-xs font-medium">Oldest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("amount")} className="text-xs font-medium">Highest Amount</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Cards List */}
          <div className="mobile-cards flex flex-col gap-4">
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs space-y-1 rounded-2xl border border-border/60 bg-card">
                <p className="font-bold text-foreground">No budget requests found</p>
                <p className="text-xs">Try adjusting your search or status filter.</p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-xs flex flex-col">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm text-foreground line-clamp-2">{req.activityTitle || "Proposal Activity"}</p>
                    <div className="shrink-0">
                      <PortalStatusBadge status={req.status} />
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-1 pt-1 pb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Amount:</span>
                      <span className="font-bold text-foreground">{formatCurrency(req.requestedAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Target Date:</span>
                      <span className="font-semibold text-foreground">{req.activityDate ? formatShortPortalDate(req.activityDate) : "Not set"}</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button" 
                    onClick={() => openBudgetDetail(req.id)}
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open →
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Rich Modern SaaS Data Table */}
          <div className="desktop-table">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-5">Activity Proposal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requested / Approved Amount</th>
                    <th className="py-3 px-4">Schedule & Venue</th>
                    <th className="py-3 px-4">Attachment</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs space-y-1">
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
                          className="h-[88px] hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-150 cursor-pointer group"
                        >
                          {/* Column 1: Activity Proposal */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <DollarSign className="h-5 w-5" />
                              </div>
                              <div className="space-y-1 min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight truncate max-w-[240px]" title={req.activityTitle}>
                                  {req.activityTitle || "Proposal Activity"}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-mono font-semibold text-muted-foreground bg-accent px-2 py-0.5 rounded-md text-[10px]">
                                    {recordCode}
                                  </span>
                                  <span className="text-muted-foreground/60">•</span>
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
                                <span className="font-bold text-foreground">{formatCurrency(req.requestedAmount || 0)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Approved: </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
                                  className="h-7 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                                >
                                  View
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No file attached</span>
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
                              className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold px-4 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
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

      {/* Right Drawer for Budget Details (Consistent with Liquidation Reports Drawer) */}
      <Sheet open={Boolean(selectedRequest)} onOpenChange={(open) => { if (!open) closeBudgetDetail(); }}>
        <SheetContent side="right" className="w-[min(38rem,95vw)] sm:w-[520px] overflow-y-auto bg-card border-border p-6 sm:p-7 space-y-6">
          {selectedRequest && (() => {
            const rawDrawerFile = budgetFilesByRequestId?.get(selectedRequest.id);
            const primaryFile = Array.isArray(rawDrawerFile) ? rawDrawerFile[0] : rawDrawerFile;
            const recordCode = buildPublicRecordCode("BR", selectedRequest, budgetRequests);

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
                      {formatCurrency(selectedRequest.requestedAmount || 0)}
                    </span>
                  </div>
                  <SheetTitle className="text-xl font-bold text-foreground leading-snug truncate" title={selectedRequest.activityTitle}>
                    {selectedRequest.activityTitle || "Budget Request"}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    {selectedRequest.purposeCategory || "General Purpose"} • {selectedRequest.venue || "Pasig City"}
                  </SheetDescription>
                </SheetHeader>

                {/* Budget Summary Card */}
                <div className="bg-accent/30 p-4 rounded-2xl border border-border/60 space-y-3">
                  <p className="text-xs font-bold text-foreground">Financial Breakdown</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Requested Amount</span>
                      <span className="font-bold text-foreground">{formatCurrency(selectedRequest.requestedAmount || 0)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Approved Released</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedRequest.approvedAmount ? formatCurrency(selectedRequest.approvedAmount) : selectedRequest.releasedAmount ? formatCurrency(selectedRequest.releasedAmount) : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schedule & Location */}
                <div className="bg-background border border-border/60 p-4 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-foreground">Schedule & Location</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Target Date</span>
                      <span className="font-semibold text-foreground">
                        {selectedRequest.activityDate ? formatShortPortalDate(selectedRequest.activityDate) : "Not set"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Venue</span>
                      <span className="font-semibold text-foreground">{selectedRequest.venue || "Pasig City"}</span>
                    </div>
                  </div>
                </div>

                {/* Proposal Document Attached File Viewer & Automatic Embedded Preview */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">Proposal Document</p>
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
                              PDF • Proposal Document
                            </p>
                          </div>
                        </div>

                        {/* Direct Blob-Fetch Download File Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={downloadingFileId === primaryFile.id}
                          onClick={() => void handleDownloadBudgetFile(activePreviewUrl, primaryFile.fileName, primaryFile.id)}
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
                            onClick={() => void handleDownloadBudgetFile(activePreviewUrl, primaryFile.fileName, primaryFile.id)}
                            className="h-8 text-xs font-semibold rounded-xl border-border gap-1.5 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadingFileId === primaryFile.id ? "Downloading..." : "Download File"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border/80 p-6 rounded-2xl text-center space-y-2">
                      <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                      <p className="text-xs font-bold text-foreground">No proposal file attached</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/40">
                  <SheetClose asChild>
                    <Button type="button" variant="outline" className="w-full h-9 text-xs font-semibold rounded-xl cursor-pointer">
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
