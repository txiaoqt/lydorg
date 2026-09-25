import React from "react";
import { FileText, ExternalLink, Download, Loader2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";

export interface DrawerAttachedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadedAt?: string | Date | null;
  rawFile?: File | Blob | null;
}

export interface PortalDrawerDocumentSectionProps {
  file: DrawerAttachedFile | null;
  previewUrl: string;
  previewFile?: File | Blob | null;
  isDownloading?: boolean;
  onDownloadFile: (url: string, fileName: string, fileId: string) => Promise<void> | void;
  formatDateTimeLabel?: (date: string | Date) => string;
  sectionTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onUploadClick?: () => void;
  uploadButtonLabel?: string;
  className?: string;
  isMobile?: boolean;
}

/**
 * Shared canonical document preview section used across Y-TRACE drawers.
 * Uses the Liquidation Reports document viewer as the authoritative source of truth.
 */
export const PortalDrawerDocumentSection: React.FC<PortalDrawerDocumentSectionProps> = ({
  file,
  previewUrl,
  previewFile,
  isDownloading = false,
  onDownloadFile,
  formatDateTimeLabel,
  sectionTitle = "Document Preview",
  emptyTitle = "No document attached",
  emptyDescription = "No file has been attached to this record.",
  onUploadClick,
  uploadButtonLabel = "Upload File",
  className,
  isMobile = false,
}) => {
  const effectivePreviewFile = previewFile || file?.rawFile || null;
  const safePreviewUrl = previewUrl || (file?.fileUrl && !file.fileUrl.startsWith("storage://") ? file.fileUrl : "");

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{sectionTitle}</p>
        {file && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {file.fileSize ? `${Math.max(1, Math.round(file.fileSize / 1024))} KB` : "PDF"}
          </span>
        )}
      </div>

      {file ? (
        isMobile ? (
          /* MOBILE / TABLET OPTIMIZED DOCUMENT REVIEW BLOCK (< 1024px) */
          <div className="space-y-3">
            {/* 1. Mobile Document File Card */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card/80 shadow-2xs min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-foreground truncate" title={file.fileName}>
                  {file.fileName}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  <span className="font-semibold text-foreground/70">PDF</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{file.fileSize ? `${Math.max(1, Math.round(file.fileSize / 1024))} KB` : "Attached"}</span>
                  {file.uploadedAt && formatDateTimeLabel && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="truncate max-w-[160px] sm:max-w-[220px]">
                        Uploaded {formatDateTimeLabel(file.uploadedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Mobile Action Buttons: Balanced 2-column grid with comfortable 40px touch targets */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const targetUrl = safePreviewUrl || file?.fileUrl || "";
                  if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
                }}
                className="h-10 px-2.5 sm:px-3 rounded-xl border border-border/80 bg-background hover:bg-muted/60 active:bg-muted/80 text-foreground/80 hover:text-foreground text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all duration-150 active:scale-[0.98] truncate focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Open in New Tab</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isDownloading}
                onClick={() => void onDownloadFile(safePreviewUrl || file.fileUrl, file.fileName, file.id)}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/95 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all duration-150 active:scale-[0.98] truncate focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {isDownloading ? (
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

            {/* 3. Canonical PDF Canvas Viewer */}
            <div className="rounded-xl border border-border/80 overflow-hidden bg-slate-100/70 dark:bg-slate-900/60 shadow-inner">
              <PortalDocumentViewer
                previewUrl={safePreviewUrl}
                previewFile={effectivePreviewFile}
                previewTitle={file.fileName}
                previewCanInline={true}
                className="h-[360px] sm:h-[420px] overflow-y-auto p-2.5 sm:p-3"
                onDownloadFile={async (url, name) => {
                  await onDownloadFile(url, name, file.id);
                }}
              />
            </div>
          </div>
        ) : (
          /* DESKTOP DOCUMENT REVIEW BLOCK (100% Preserved) */
          <div className="space-y-2.5">
            {/* File Header Bar & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border border-border/70 bg-card/70 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-[280px]" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    PDF • {file.fileSize ? `${Math.max(1, Math.round(file.fileSize / 1024))} KB` : "Attached"}
                    {file.uploadedAt && formatDateTimeLabel ? ` • Uploaded ${formatDateTimeLabel(file.uploadedAt)}` : ""}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const targetUrl = safePreviewUrl || file?.fileUrl || "";
                    if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border-border/80 gap-1.5 cursor-pointer hover:bg-accent text-foreground transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
                  <span>Open in New Tab</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isDownloading}
                  onClick={() => void onDownloadFile(safePreviewUrl || file.fileUrl, file.fileName, file.id)}
                  className="h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      <span>Download File</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Canonical PDF Canvas Viewer */}
            <div className="rounded-xl border border-border/80 overflow-hidden bg-slate-100/70 dark:bg-slate-900/60 shadow-inner">
              <PortalDocumentViewer
                previewUrl={safePreviewUrl}
                previewFile={effectivePreviewFile}
                previewTitle={file.fileName}
                previewCanInline={true}
                className="h-[360px] sm:h-[440px] overflow-y-auto p-3 sm:p-4"
                onDownloadFile={async (url, name) => {
                  await onDownloadFile(url, name, file.id);
                }}
              />
            </div>
          </div>
        )
      ) : (
        <div className="border border-dashed border-border/80 p-6 rounded-xl text-center space-y-3 bg-muted/10">
          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">{emptyTitle}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {emptyDescription}
            </p>
          </div>
          {onUploadClick && (
            <Button
              type="button"
              onClick={onUploadClick}
              className={cn(
                "rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 cursor-pointer gap-1.5 transition-all active:scale-[0.98]",
                isMobile ? "h-10" : "h-8.5"
              )}
            >
              <FileUp className="h-3.5 w-3.5 shrink-0" />
              <span>{uploadButtonLabel}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
