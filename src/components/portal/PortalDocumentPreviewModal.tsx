import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Eye,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface PortalDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  previewTitle: string;
  previewCanInline: boolean;
  previewEmptyMessage?: string;
  fileSize?: string;
  updatedAt?: string;
  organizationName?: string;
  onDownloadFile?: (url: string, title: string) => Promise<void>;
}

export const PortalDocumentPreviewModal: React.FC<PortalDocumentPreviewModalProps> = ({
  open,
  onOpenChange,
  previewUrl,
  previewTitle,
  previewCanInline,
  previewEmptyMessage,
  fileSize,
  updatedAt,
  organizationName,
  onDownloadFile,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [loadingIframe, setLoadingIframe] = useState(true);

  // Reset iframe loading state when previewUrl changes or modal opens
  useEffect(() => {
    if (open && previewUrl) {
      setLoadingIframe(true);
    }
  }, [open, previewUrl]);

  const handleDownload = async () => {
    if (!previewUrl || downloading) return;
    try {
      setDownloading(true);
      if (onDownloadFile) {
        await onDownloadFile(previewUrl, previewTitle || "document.pdf");
      } else {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = previewTitle || "document.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err) {
      console.error("Preview modal download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const subtitleMeta = [
    "PDF",
    fileSize || "PDF Document",
    `Updated ${updatedAt || "Aug 6, 2026"}`,
    organizationName || "PCYDO",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:w-[92vw] max-w-[1400px] h-[95vh] sm:h-[90vh] max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200">
        <DialogDescription className="sr-only">
          Preview document inline for {previewTitle || "Document"}
        </DialogDescription>
        {/* INFORMATION HEADER BAR */}
        <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border/70 bg-card flex items-center justify-between shrink-0 gap-2 sm:gap-4">
          {/* Left: Icon, Title, Subtitle */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-xs sm:text-base font-bold text-foreground leading-snug truncate max-w-[160px] sm:max-w-[500px]" title={previewTitle}>
                {previewTitle || "Document Preview"}
              </DialogTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">
                {subtitleMeta}
              </p>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {previewUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNewTab}
                  className="h-8 px-2 sm:px-3 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer hover:bg-accent"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={downloading}
                  onClick={() => void handleDownload()}
                  className="h-8 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Download File
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* PDF VIEWER AREA WITH SOFT GRAY BACKGROUND (#F8FAFC) */}
        <div className="flex-1 overflow-hidden relative bg-[#F8FAFC] dark:bg-slate-950 p-2.5 sm:p-3">
          <div className="w-full h-full rounded-xl overflow-hidden border border-border/60 bg-background relative shadow-inner">
            {previewUrl && previewCanInline ? (
              <>
                {loadingIframe && (
                  <div className="absolute inset-0 bg-background/90 backdrop-blur-xs z-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-xs font-semibold tracking-wide">Loading preview...</p>
                  </div>
                )}
                <iframe
                  src={previewUrl}
                  title={previewTitle || "Document Preview"}
                  onLoad={() => setLoadingIframe(false)}
                  className="w-full h-full border-0"
                />
              </>
            ) : previewUrl ? (
              /* Genuine Fallback Empty State (DOCX, ZIP, etc.) */
              <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-foreground">Unable to preview document</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This file format cannot be displayed inline in the browser. Use Open in New Tab or Download File to view it.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenNewTab}
                    className="h-8 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Open in New Tab
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={downloading}
                    onClick={() => void handleDownload()}
                    className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download File
                  </Button>
                </div>
              </div>
            ) : (
              /* No file uploaded empty state */
              <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-2 text-muted-foreground">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-medium">{previewEmptyMessage || "No file available to preview."}</p>
              </div>
            )}
          </div>
        </div>

        {/* SIMPLIFIED 56px FOOTER */}
        <div className="h-14 py-2.5 px-6 border-t border-border/70 bg-card flex items-center justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 rounded-xl text-xs font-semibold border-border hover:bg-accent cursor-pointer"
          >
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
