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
}

export interface PortalDrawerDocumentSectionProps {
  file: DrawerAttachedFile | null;
  previewUrl: string;
  isDownloading?: boolean;
  onDownloadFile: (url: string, fileName: string, fileId: string) => Promise<void> | void;
  formatDateTimeLabel?: (date: string | Date) => string;
  sectionTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onUploadClick?: () => void;
  uploadButtonLabel?: string;
  className?: string;
}

/**
 * Shared canonical document preview section used across Y-TRACE drawers.
 * Uses the Liquidation Reports document viewer as the authoritative source of truth.
 */
export const PortalDrawerDocumentSection: React.FC<PortalDrawerDocumentSectionProps> = ({
  file,
  previewUrl,
  isDownloading = false,
  onDownloadFile,
  formatDateTimeLabel,
  sectionTitle = "Document Preview",
  emptyTitle = "No document attached",
  emptyDescription = "No file has been attached to this record.",
  onUploadClick,
  uploadButtonLabel = "Upload File",
  className,
}) => {
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
                  const targetUrl = previewUrl || file.fileUrl;
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
                onClick={() => void onDownloadFile(previewUrl || file.fileUrl, file.fileName, file.id)}
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
              previewUrl={previewUrl || file.fileUrl}
              previewTitle={file.fileName}
              previewCanInline={true}
              className="h-[360px] sm:h-[440px] overflow-y-auto p-3 sm:p-4"
              onDownloadFile={async (url, name) => {
                await onDownloadFile(url, name, file.id);
              }}
            />
          </div>
        </div>
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
              className="h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 cursor-pointer gap-1.5"
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
