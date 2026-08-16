import React, { useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  FileUp,
  Eye,
  Search,
  Check,
  Filter,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatActivityActionLabel, formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";

import { FeatureGate } from "./FeatureGate";

export interface UserPortalDocumentWorkspaceViewProps {
  registrationPrerequisites?: any;
  currentProfile?: any;
  templateDocuments?: Array<any>;
  documentRequirements?: Array<any>;
  docFiles?: Record<string, any> | Map<string, any> | Array<any>;
  documentSubmissions?: Map<string, any>;
  templatesById?: Record<string, any>;
  submissionLogs?: Array<any>;
  isDocumentSubmissionLocked?: boolean;
  isDocumentSubmissionApproved?: boolean;
  downloadingAllTemplates?: boolean;
  handleDownloadAllTemplates?: () => Promise<void>;
  downloadAllTemplates?: () => void;
  openBatchUploadWorkspace?: () => void;
  openBulkUploadModal?: () => void;
  openPreview?: (fileUrl: string, fileName: string) => void;
  previewDocument?: (doc: any) => void;
  openFile?: (url: string, name: string) => void;
  openAttachedDocumentEditor?: (file: any, title?: string) => void;
  openDocumentRecentActivityModal?: () => void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  formatDateTimeLabel?: (dateStr: string) => string;
  formatShortPortalDate?: (dateStr: string) => string;
  getDocumentPrimaryFileTypeLabel?: (doc: any) => string;
  deriveOverallDocumentSubmissionStatus?: (profile: any) => string;
  formatStatusLabel?: (status: string) => string;
  resolveRegistrationDocumentAccess?: (doc: any) => any;
}

export const UserPortalDocumentWorkspaceView: React.FC<UserPortalDocumentWorkspaceViewProps> = ({
  registrationPrerequisites,
  templateDocuments,
  documentRequirements,
  docFiles,
  documentSubmissions,
  templatesById = {},
  submissionLogs,
  downloadingAllTemplates,
  handleDownloadAllTemplates,
  downloadAllTemplates,
  openBatchUploadWorkspace,
  openBulkUploadModal,
  openPreview,
  previewDocument,
  openFile,
  openAttachedDocumentEditor,
  openDocumentRecentActivityModal,
  navigate,
  userRouteMap,
  formatDateTimeLabel,
  formatShortPortalDate,
  getDocumentPrimaryFileTypeLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "review" | "revision">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "name" | "updated">("newest");

  // Safe Fallback Requirement List
  const docsList = templateDocuments || documentRequirements || [];
  
  // Authentic Backend Data Binding Lookup for Each Requirement
  const getSubmissionForDoc = (docId: string) => {
    if (Array.isArray(docFiles)) {
      return docFiles.find((entry: any) => entry.documentTypeId === docId || entry.id === docId) || null;
    }
    if (documentSubmissions && typeof documentSubmissions.get === "function") {
      return documentSubmissions.get(docId) || null;
    }
    if (docFiles && typeof (docFiles as any).get === "function") {
      return (docFiles as any).get(docId) || null;
    }
    if (docFiles && typeof docFiles === "object" && docFiles !== null) {
      return (docFiles as any)[docId] || null;
    }
    return null;
  };

  // Authentic Status Mapper matching Baseline UserPortal.tsx
  const getDocStatus = (doc: any) => {
    const sub = getSubmissionForDoc(doc.id);
    if (!sub) return null;
    if (sub.adminStatus) return sub.adminStatus;
    if (sub.status) return sub.status;
    if (sub.validationStatus === "correct") return "ready_for_review";
    if (sub.validationStatus === "needs_revision" || sub.validationStatus === "rejected") return "needs_revision";
    return "submitted";
  };

  const isApprovedStatus = (status: string | null) =>
    status === "approved" || status === "approved_green";

  const isReviewStatus = (status: string | null) =>
    status === "under_review" ||
    status === "under_admin_review" ||
    status === "submitted" ||
    status === "ready_for_review";

  const isRevisionStatus = (status: string | null) =>
    status === "needs_revision" || status === "rejected_red" || status === "rejected";

  const isDraftStatus = (status: string | null) =>
    status === "draft" || status === "draft_saved";

  const totalRequirements = docsList.length;

  // Accurate Backend Counts
  const approvedCount = docsList.filter((doc) => isApprovedStatus(getDocStatus(doc))).length;
  const underReviewCount = docsList.filter((doc) => isReviewStatus(getDocStatus(doc))).length;
  const needsRevisionCount = docsList.filter((doc) => isRevisionStatus(getDocStatus(doc))).length;

  const completionPercent =
    totalRequirements > 0 ? Math.round((approvedCount / totalRequirements) * 100) : 0;

  // Filter & Sort operating on Authentic Backend Data
  const filteredRequirements = docsList
    .filter((doc) => {
      const sub = getSubmissionForDoc(doc.id);
      const status = getDocStatus(doc);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        doc.title,
        doc.name,
        doc.description,
        status,
        sub?.fileName,
        sub?.originalName
      ].some((v) => v?.toLowerCase().includes(query));
    })
    .filter((doc) => {
      const status = getDocStatus(doc);
      if (statusFilter === "approved") return isApprovedStatus(status);
      if (statusFilter === "review") return isReviewStatus(status);
      if (statusFilter === "revision") return isRevisionStatus(status);
      return true;
    })
    .sort((a, b) => {
      const titleA = a.title || a.name || "";
      const titleB = b.title || b.name || "";
      if (sortOrder === "name") return titleA.localeCompare(titleB);
      const subA = getSubmissionForDoc(a.id);
      const subB = getSubmissionForDoc(b.id);
      if (sortOrder === "updated") {
        const dateA = new Date(subA?.updatedAt || subA?.uploadedAt || subA?.createdAt || 0).getTime();
        const dateB = new Date(subB?.updatedAt || subB?.uploadedAt || subB?.createdAt || 0).getTime();
        return dateB - dateA;
      }
      return 0;
    });

  const logsList = submissionLogs || [];

  const isDocumentEligible = Boolean(
    registrationPrerequisites ? registrationPrerequisites.canAccessDocuments : true
  );

  return (
    <FeatureGate
      canAccess={isDocumentEligible}
      title="Complete your profile first"
      description="Finish and save all required organization information before accessing document submission."
      requirements={
        registrationPrerequisites?.requirements || [
          {
            id: "profile",
            label: "Organization profile",
            met: Boolean(registrationPrerequisites?.profileComplete),
          },
        ]
      }
      actionLabel="Complete Profile"
      onAction={() => navigate(userRouteMap["organization-profile"])}
      heroSection={
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-[640px]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">Document Workspace</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                Document Submissions
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
                Complete your organization profile before starting the registration requirements.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-2 sm:py-2">
      {/* 1. Workspace Hero Header */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-[640px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Document Workspace</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">LYDO Pasig City</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Organization Requirements
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
              Complete all required compliance documents for organization verification.
            </p>
            
            {/* Metadata Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="font-semibold text-foreground">{totalRequirements} Requirements</span>
              <span>•</span>
              <span>Review ETA: 2–3 Days</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <Button
              type="button"
              onClick={() => {
                if (openBatchUploadWorkspace) openBatchUploadWorkspace();
                else if (openBulkUploadModal) openBulkUploadModal();
              }}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 h-9 px-4 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer justify-center"
            >
              <FileUp className="h-3.5 w-3.5" />
              Upload Multiple Documents
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (handleDownloadAllTemplates) void handleDownloadAllTemplates();
                else if (downloadAllTemplates) downloadAllTemplates();
              }}
              disabled={Boolean(downloadingAllTemplates)}
              className="rounded-full border-border/80 text-foreground hover:bg-accent h-9 px-4 text-xs font-semibold cursor-pointer justify-center"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download All Templates
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile-Only Submission Guidelines Section (block lg:hidden) */}
      <div className="block lg:hidden">
        <Card className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Info className="h-4 w-4 text-primary" /> Submission Guidelines
            </h3>
            <p className="text-xs text-muted-foreground pt-0.5">Follow requirements for fast approval.</p>
          </div>

          <div className="space-y-2.5 text-xs leading-relaxed text-muted-foreground pt-1">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span><strong>Accepted Formats:</strong> PDF files only.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span><strong>Max File Size:</strong> 10 MB per document.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span><strong>Review Process:</strong> Admin validation takes 2–3 business days.</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Progress Summary Card */}
      <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 sm:space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {approvedCount} of {totalRequirements} Documents Approved ({completionPercent}%)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All required registration documents are reviewed and verified by PCYDO admin.
            </p>
          </div>

          {/* Backend Data Bound Counters */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium pt-1 sm:pt-0">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {approvedCount} Approved
            </span>
            <span className={cn("flex items-center gap-1.5 font-semibold", underReviewCount === 0 ? "text-muted-foreground/50" : "text-primary")}>
              <Clock className="h-4 w-4 shrink-0" /> {underReviewCount} Review
            </span>
            <span className={cn("flex items-center gap-1.5 font-semibold", needsRevisionCount === 0 ? "text-muted-foreground/50" : "text-amber-600 dark:text-amber-400")}>
              <AlertTriangle className="h-4 w-4 shrink-0" /> {needsRevisionCount} Revision
            </span>
          </div>
        </div>

        {/* Subtle Modern Progress Bar */}
        <div className="h-2 w-full rounded-full bg-primary/15 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${completionPercent}%` }} />
        </div>
      </Card>

      {/* Main Grid: 8-Column Left Workspace & 4-Column Right Sidebar */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column (8 Columns Desktop): Filter Toolbar & Document Cards */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Smart Filter Toolbar + Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card border border-border/60 p-2 sm:p-2.5 px-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] touch-pan-x overscroll-x-contain pb-1 sm:pb-0 px-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                All ({totalRequirements})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("approved")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  statusFilter === "approved"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : approvedCount === 0
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                Approved ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("review")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  statusFilter === "review"
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
                onClick={() => setStatusFilter("revision")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  statusFilter === "revision"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : needsRevisionCount === 0
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                Needs Revision ({needsRevisionCount})
              </button>
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60 min-w-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search document requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl bg-background border-border/80 w-full"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl border-border text-xs font-medium gap-1 shrink-0 cursor-pointer">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Sort:</span> <span className="capitalize">{sortOrder}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 p-2 rounded-xl bg-card border-border/80 shadow-lg z-50">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")} className="text-xs font-medium cursor-pointer">Default Order</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("name")} className="text-xs font-medium cursor-pointer">Document Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("updated")} className="text-xs font-medium cursor-pointer">Recently Updated</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Document Cards Bound to Authentic Event Handlers & Data */}
          <div className="space-y-3.5">
            {filteredRequirements.map((doc) => {
              const submission = getSubmissionForDoc(doc.id);
              const status = getDocStatus(doc);
              const isApproved = isApprovedStatus(status);
              const isUnderReview = isReviewStatus(status);
              const isRevision = isRevisionStatus(status);
              const isDraft = isDraftStatus(status) || submission?.adminStatus === "draft";
              const isRejected = status === "rejected" || status === "rejected_red";
              const hasFile = Boolean(submission && (submission.fileUrl || submission.url || submission.storagePath || submission.filePath || submission.id));
              const docTitle = doc.title || doc.name || "Requirement";
              const fileTypeLabel = getDocumentPrimaryFileTypeLabel ? getDocumentPrimaryFileTypeLabel(doc) : "PDF";

              // Template file info for View Template button
              const template = templatesById ? templatesById[doc.id] : null;
              const templateFileUrl = template?.templateFileUrl ?? doc.templateFileUrl ?? doc.fileUrl ?? "";
              const templateFileName = template?.templateFileName || doc.templateFileName || docTitle;

              // Authentic Upload Information Metadata
              const uploadDateRaw = submission?.uploadedAt || submission?.createdAt || submission?.updatedAt || submission?.reviewedAt;
              const uploadDateText = uploadDateRaw
                ? formatDateTimeLabel
                  ? `Uploaded ${formatDateTimeLabel(uploadDateRaw)}`
                  : formatShortPortalDate
                  ? `Uploaded ${formatShortPortalDate(uploadDateRaw)}`
                  : `Uploaded ${new Date(uploadDateRaw).toLocaleDateString()}`
                : "Never uploaded";

              const renderStatusBadge = () => {
                if (isApproved) {
                  return (
                    <span className="inline-flex text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                      Approved
                    </span>
                  );
                }
                if (isUnderReview) {
                  return (
                    <span className="inline-flex text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 shrink-0">
                      Under Review
                    </span>
                  );
                }
                if (isDraft) {
                  return (
                    <span className="inline-flex text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 shrink-0">
                      Draft Saved
                    </span>
                  );
                }
                if (isRejected) {
                  return (
                    <span className="inline-flex text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 shrink-0">
                      Rejected
                    </span>
                  );
                }
                if (isRevision) {
                  return (
                    <span className="inline-flex text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                      Needs Revision
                    </span>
                  );
                }
                return (
                  <span className="inline-flex text-[10px] font-medium text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full border border-border/60 shrink-0">
                    Not Uploaded
                  </span>
                );
              };

              return (
                <Card
                  key={doc.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200"
                >
                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1 sm:space-y-0.5 min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                        {/* Desktop Inline Layout (sm:flex sm:items-center sm:gap-2) vs Mobile Stacked Layout (flex flex-col) */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <h3 className="text-sm font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere]">
                            {docTitle}
                          </h3>
                          {/* Desktop Inline Status Badge */}
                          <div className="hidden sm:inline-flex shrink-0">
                            {renderStatusBadge()}
                          </div>
                          {/* Mobile Dedicated Status Row (Below Title) */}
                          <div className="sm:hidden pt-0.5 shrink-0">
                            {renderStatusBadge()}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1 leading-relaxed pt-0.5 sm:pt-0">
                          {doc.description}
                        </p>
                      </div>
                    </div>

                    {/* Upload Information Metadata */}
                    <div className="text-[11px] text-muted-foreground text-left sm:text-right shrink-0 pl-12 sm:pl-0">
                      <span className="font-semibold text-foreground">{fileTypeLabel}</span>
                      <span className="mx-1">•</span>
                      <span>{uploadDateText}</span>
                    </div>
                  </div>

                  {/* Clean Bottom Action Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-2.5 border-t border-border/40 text-xs">
                    <div className="text-[11px] text-muted-foreground/70 font-medium min-w-0">
                      {isApproved ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Locked
                        </span>
                      ) : isDraft ? (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          Draft Saved • Ready for Submission
                        </span>
                      ) : submission?.adminRemarks?.trim() ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium break-words sm:truncate sm:max-w-[280px] inline-block">
                          Admin remark: {submission.adminRemarks.trim()}
                        </span>
                      ) : (
                        <span>Action required for submission</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (openPreview) {
                            void openPreview(templateFileUrl, templateFileName);
                          } else if (previewDocument) {
                            void previewDocument(templateFileUrl || doc);
                          } else if (openFile && templateFileUrl) {
                            void openFile(templateFileUrl, templateFileName);
                          }
                        }}
                        className="h-8 rounded-xl border-border text-xs font-medium hover:bg-accent cursor-pointer justify-center"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        <span>View Template</span>
                      </Button>

                      {/* 2. View Attached / Upload Document Button */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (submission) {
                            if (openAttachedDocumentEditor) {
                              void openAttachedDocumentEditor(submission, docTitle);
                            } else if (openFile && (submission.fileUrl || submission.url)) {
                              void openFile(submission.fileUrl || submission.url, submission.fileName || docTitle);
                            }
                          } else {
                            if (openBatchUploadWorkspace) {
                              openBatchUploadWorkspace();
                            } else if (openAttachedDocumentEditor) {
                              void openAttachedDocumentEditor(doc, docTitle);
                            }
                          }
                        }}
                        className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer justify-center shadow-2xs"
                      >
                        <span>{hasFile ? "View Attached →" : "Upload Document →"}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column (4 Columns Desktop): Sidebar Cards (Desktop Only: hidden lg:block) */}
        <div className="col-span-12 lg:col-span-4 space-y-5 hidden lg:block">
          {/* Submission Guidelines Card (Exact Desktop Layout from Historical Commit) */}
          <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" /> Submission Guidelines
              </h3>
              <p className="text-xs text-muted-foreground pt-0.5">Follow requirements for fast approval.</p>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed text-muted-foreground pt-1">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Accepted Formats:</strong> PDF files only.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Max File Size:</strong> 10 MB per document.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Review Process:</strong> Admin validation takes 2–3 business days.</span>
              </div>
            </div>
          </Card>

          {/* Recent Document Activity Card (Exact Desktop Layout from Historical Commit) */}
          <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
                <p className="text-xs text-muted-foreground pt-0.5">Document review updates.</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-border/60 pl-6 relative">
              {logsList.slice(0, 5).map((log, idx) => {
                const actionTitle = formatActivityActionLabel(log.action || log.description || log.title);
                const fullTime = formatFullActivityTimestamp(log.createdAt || log.timestamp);
                const isApproved = actionTitle.includes("Approved") || actionTitle.includes("Completed");
                const isRevision = actionTitle.includes("Revision") || actionTitle.includes("Rejected");

                return (
                  <div key={log.id || idx} className="relative space-y-1">
                    <div className={cn(
                      "absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : isRevision
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    )}>
                      {isApproved ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : isRevision ? (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-bold text-foreground leading-snug truncate">
                        {actionTitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {fullTime}
                      </p>
                    </div>
                  </div>
                );
              })}
              {logsList.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No recent submission activity recorded.</p>
              )}
            </div>

            {Boolean(openDocumentRecentActivityModal) && (
              <div className="pt-3 border-t border-border/40 text-right">
                <button
                  type="button"
                  onClick={openDocumentRecentActivityModal}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  View all →
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
    </FeatureGate>
  );
};
