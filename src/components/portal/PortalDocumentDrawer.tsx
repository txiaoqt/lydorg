import React, { useState, useEffect } from "react";
import {
  FileText,
  ExternalLink,
  Download,
  Loader2,
  FileUp,
  Trash2,
  AlertCircle,
  X,
  FileCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";
import { isApprovedRegistrationDocument } from "@/lib/document-file-access";
import type { SubmissionFile } from "@/lib/lydo-connect-data";

export interface PortalDocumentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "attached" | "template";
  file?: SubmissionFile | null;
  documentTypeName?: string;
  previewUrl: string;
  previewCanInline?: boolean;
  previewEmptyMessage?: string;
  previewTitle?: string;
  templateTitle?: string;
  templateFileName?: string;
  organizationName?: string;
  badgeLabel?: string;
  saving?: boolean;
  downloading?: boolean;
  formatDateTimeLabel?: (dateStr: string | Date) => string;
  formatShortPortalDate?: (dateStr: string | Date) => string;
  onDownloadFile?: (url: string, fileName: string) => Promise<void> | void;
  onOpenInNewTab?: (url: string) => void;
  onSubmitForReview?: () => Promise<void> | void;
  onReplaceFile?: () => void;
  onDeleteDraft?: () => Promise<void> | void;
  footerStatusText?: string;
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

const formatFileBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTemplateDisplayName = (rawTitle?: string) => {
  if (!rawTitle) return "Official Template";
  let clean = rawTitle.replace(/^\d+[-_]/, "");
  clean = clean.replace(/\.pdf$/i, "");
  clean = clean.replace(/_/g, " ");
  clean = clean.replace(/-and-/gi, " and ");
  clean = clean.replace(/(\w)-(\w)/g, (match, p1, p2) => {
    if (match.toLowerCase() === "by-laws" || match.toLowerCase() === "by-law") {
      return match;
    }
    return `${p1} ${p2}`;
  });
  clean = clean.replace(/\bby\s+laws\b/gi, "By-Laws");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || rawTitle;
};

export const PortalDocumentDrawer: React.FC<PortalDocumentDrawerProps> = ({
  open,
  onOpenChange,
  mode = "attached",
  file = null,
  documentTypeName,
  previewUrl,
  previewCanInline = true,
  previewEmptyMessage,
  previewTitle,
  templateTitle,
  templateFileName,
  organizationName,
  badgeLabel,
  saving = false,
  downloading = false,
  formatDateTimeLabel,
  formatShortPortalDate,
  onDownloadFile,
  onOpenInNewTab,
  onSubmitForReview,
  onReplaceFile,
  onDeleteDraft,
  footerStatusText,
}) => {
  const isDesktop = useIsDesktop();
  const isTemplate = mode === "template" || (!file && Boolean(previewTitle || templateFileName));

  // Attached Document Status Details
  const isApproved = isApprovedRegistrationDocument(file);
  const adminStatus = file?.adminStatus;
  const isDraft = adminStatus === "draft";
  const isNeedsRevision = adminStatus === "needs_revision";
  const isRejected = adminStatus === "rejected" || adminStatus === "rejected_red";
  const isUnderReview =
    adminStatus === "submitted" ||
    adminStatus === "under_admin_review" ||
    adminStatus === "under_review";

  // Formatted Date
  const formattedDate = file?.uploadedAt
    ? formatShortPortalDate
      ? formatShortPortalDate(file.uploadedAt)
      : formatDateTimeLabel
      ? formatDateTimeLabel(file.uploadedAt)
      : new Date(file.uploadedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
    : null;

  const fileSizeLabel = formatFileBytes(file?.fileSize);

  // Resolved titles & labels for Template vs Attached
  const resolvedTemplateTitle = formatTemplateDisplayName(
    templateTitle || previewTitle || documentTypeName || "Official Template"
  );
  const rawTemplateFileName =
    templateFileName ||
    previewTitle ||
    (documentTypeName ? `${documentTypeName}.pdf` : "template.pdf");

  const resolvedDocumentTitle = isTemplate
    ? resolvedTemplateTitle
    : documentTypeName || file?.fileName || "Attached Document";

  const handleOpenNewTab = () => {
    if (onOpenInNewTab) {
      onOpenInNewTab(previewUrl || file?.fileUrl || "");
    } else if (previewUrl || file?.fileUrl) {
      window.open(previewUrl || file?.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async () => {
    const downloadFileName = isTemplate
      ? rawTemplateFileName
      : file?.fileName || `${resolvedDocumentTitle}.pdf`;

    if (onDownloadFile) {
      await onDownloadFile(previewUrl || file?.fileUrl || "", downloadFileName);
    } else if (previewUrl) {
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Status or Template Badge
  const renderBadge = () => {
    if (isTemplate) {
      return (
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <FileCheck className="h-3 w-3" />
          <span>{badgeLabel || "Official Template"}</span>
        </span>
      );
    }

    return (
      <span
        className={cn(
          "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1",
          isApproved
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            : isDraft
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            : isNeedsRevision
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            : isRejected
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        )}
      >
        {isApproved
          ? "Approved"
          : isDraft
          ? "Draft Saved"
          : isNeedsRevision
          ? "Needs Revision"
          : isRejected
          ? "Rejected"
          : "Under Review"}
      </span>
    );
  };

  // Resolved footer status
  const resolvedFooterStatus =
    footerStatusText ||
    (isTemplate
      ? "Official Template • Y-TRACE Document Compliance"
      : isApproved
      ? "Approved document • Locked from modification"
      : isDraft
      ? "Draft Saved • Ready for Submission"
      : isNeedsRevision
      ? "Needs Revision • Please review remarks and upload revisions"
      : isUnderReview
      ? "Waiting for Admin Review"
      : "Attached Document • Y-TRACE Compliance");

  // Header Content
  const renderHeader = (closeAction: React.ReactNode) => (
    <div className="p-4 sm:p-5 border-b border-border/70 bg-card shrink-0 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere]">
                {resolvedDocumentTitle}
              </h2>
              {renderBadge()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              {isTemplate ? (
                <>
                  <span
                    className="font-medium text-foreground/90 truncate max-w-[200px] sm:max-w-[320px]"
                    title={rawTemplateFileName}
                  >
                    {rawTemplateFileName}
                  </span>
                  <span>•</span>
                  <span>PDF Document</span>
                  <span>•</span>
                  <span>Reference Guide</span>
                </>
              ) : (
                <>
                  <span
                    className="font-medium text-foreground/90 truncate max-w-[200px] sm:max-w-[320px]"
                    title={file?.fileName}
                  >
                    {file?.fileName || "Attached Document"}
                  </span>
                  <span>•</span>
                  <span>PDF</span>
                  {fileSizeLabel && (
                    <>
                      <span>•</span>
                      <span>{fileSizeLabel}</span>
                    </>
                  )}
                  {formattedDate && (
                    <>
                      <span>•</span>
                      <span>Updated {formattedDate}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {closeAction}
      </div>

      {/* Admin Remarks Callout if Needs Revision or Rejected (Attached Mode Only) */}
      {!isTemplate && (isNeedsRevision || isRejected) && file?.adminRemarks && (
        <div
          className={cn(
            "rounded-xl border p-3 text-xs space-y-1",
            isNeedsRevision
              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
          )}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Admin Review Remarks</span>
          </div>
          <p className="text-[11px] leading-relaxed pl-5 font-normal italic">
            "{file.adminRemarks}"
          </p>
        </div>
      )}

      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-2.5">
        {isTemplate ? (
          /* Template Actions: Clean, Clear Hierarchy */
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Open in New Tab</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/95 text-primary-foreground text-xs font-bold gap-2 cursor-pointer shadow-xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span>Download File</span>
                </>
              )}
            </Button>
          </>
        ) : isDraft ? (
          /* Attached Draft Actions */
          <>
            {onSubmitForReview && (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void onSubmitForReview()}
                className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/95 text-primary-foreground text-xs font-bold gap-2 cursor-pointer shadow-xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <FileUp className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>Submit for Review</span>
              </Button>
            )}

            {onReplaceFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={onReplaceFile}
                className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <FileUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Replace File</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Open in New Tab</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <span>Download</span>
            </Button>

            {onDeleteDraft && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => void onDeleteDraft()}
                className="h-9 px-3 rounded-xl text-destructive hover:bg-destructive/10 text-xs font-semibold gap-1.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Delete Draft</span>
              </Button>
            )}
          </>
        ) : isNeedsRevision ? (
          /* Attached Needs Revision Actions */
          <>
            {onReplaceFile && (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={onReplaceFile}
                className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/95 text-primary-foreground text-xs font-bold gap-2 cursor-pointer shadow-xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <FileUp className="h-3.5 w-3.5 shrink-0" />
                <span>Upload Revised File</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Open in New Tab</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <span>Download File</span>
            </Button>
          </>
        ) : (
          /* Standard Attached Actions: Approved, Under Review, etc. */
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-9 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/90 hover:text-foreground text-xs font-semibold gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Open in New Tab</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/95 text-primary-foreground text-xs font-bold gap-2 cursor-pointer shadow-xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span>Download File</span>
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderDocumentPreview = () => (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/20">
      <div className="flex-1 min-h-[360px] rounded-xl border border-border/80 overflow-hidden bg-slate-100/70 dark:bg-slate-900/60 shadow-inner flex flex-col">
        <PortalDocumentViewer
          previewUrl={previewUrl}
          previewTitle={isTemplate ? rawTemplateFileName : file?.fileName || resolvedDocumentTitle}
          previewCanInline={previewCanInline}
          previewEmptyMessage={previewEmptyMessage}
          onDownloadFile={async (url, name) => {
            if (onDownloadFile) {
              await onDownloadFile(url, name);
            }
          }}
          className="flex-1 overflow-y-auto p-3 sm:p-5"
        />
      </div>
    </div>
  );

  const closeLabel = isTemplate ? "template" : "document";

  // DESKTOP: Right-side Drawer (Sheet)
  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 gap-0 overflow-hidden flex flex-col bg-card border-l border-border/80 shadow-2xl"
        >
          <SheetTitle className="sr-only">
            {resolvedDocumentTitle} Document Preview
          </SheetTitle>
          <SheetDescription className="sr-only">
            Preview {isTemplate ? "template" : "attached document"} for {resolvedDocumentTitle}
          </SheetDescription>

          {/* PINNED HEADER */}
          {renderHeader(
            <SheetClose asChild>
              <button
                type="button"
                aria-label={`Close ${closeLabel} drawer`}
                className="h-8.5 w-8.5 rounded-full border border-border/70 hover:border-border bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          )}

          {/* PRIMARY DOCUMENT PREVIEW */}
          {renderDocumentPreview()}

          {/* PINNED FOOTER */}
          <div className="h-14 py-2.5 px-5 sm:px-6 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground font-medium truncate mr-2">
              {resolvedFooterStatus}
            </p>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4.5 rounded-xl text-xs font-semibold border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/80 hover:text-foreground shadow-2xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Close Drawer
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // MOBILE / TABLET: Responsive Centered Modal (Dialog) matching Liquidation & Budget
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={true}
        className="w-[94vw] sm:w-[92vw] max-w-3xl h-[88vh] max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200"
      >
        <DialogTitle className="sr-only">
          {resolvedDocumentTitle} Document Preview
        </DialogTitle>
        <DialogDescription className="sr-only">
          Preview {isTemplate ? "template" : "attached document"} for {resolvedDocumentTitle}
        </DialogDescription>

        {/* PINNED HEADER */}
        {renderHeader(
          <button
            type="button"
            aria-label={`Close ${closeLabel} modal`}
            onClick={() => onOpenChange(false)}
            className="h-8.5 w-8.5 rounded-full border border-border/70 hover:border-border bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* PRIMARY DOCUMENT PREVIEW */}
        {renderDocumentPreview()}

        {/* PINNED FOOTER */}
        <div className="h-14 py-2.5 px-4 sm:px-6 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate mr-2">
            {resolvedFooterStatus}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4.5 rounded-xl text-xs font-semibold border border-border/80 bg-background hover:bg-muted/60 hover:border-border text-foreground/80 hover:text-foreground shadow-2xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
