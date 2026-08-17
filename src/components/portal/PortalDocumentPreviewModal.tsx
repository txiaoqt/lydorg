import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertTriangle,
  X
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface PdfPageCanvasProps {
  pdf: any;
  pageNumber: number;
  containerWidth: number;
}

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({ pdf, pageNumber, containerWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        // Cancel any pending render task on this canvas before starting a new one
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore cancellation exceptions
          }
          renderTaskRef.current = null;
        }

        const page = await pdf.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        // Get unscaled viewport with default page rotation from PDF metadata
        const unscaledViewport = page.getViewport({ scale: 1 });

        // Calculate appropriate display scale
        // For mobile/small containers: fit container width with padding
        // For desktop/large containers: cap reading width at 840px for optimal document readability
        const availableWidth = Math.max(containerWidth - 32, 280);
        const targetDisplayWidth = Math.min(availableWidth, 840);
        const displayScale = Math.max(targetDisplayWidth / unscaledViewport.width, 0.4);

        // Use devicePixelRatio for crisp rendering on HiDPI displays
        const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const renderScale = displayScale * pixelRatio;

        const viewport = page.getViewport({ scale: renderScale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        // Set buffer dimensions (scaled by pixel ratio)
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Set CSS display dimensions (logical CSS pixels)
        const cssWidth = Math.floor(viewport.width / pixelRatio);
        const cssHeight = Math.floor(viewport.height / pixelRatio);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        // Fill background with white before rendering page content
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        if (!isCancelled) {
          setRendered(true);
        }
      } catch (err: any) {
        if (!isCancelled && err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNumber}:`, err);
          setRenderError("Failed to render page");
        }
      }
    };

    void renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdf, pageNumber, containerWidth]);

  return (
    <div className="flex flex-col items-center my-3 relative w-full">
      <div className="bg-white rounded-lg shadow-md border border-border/70 overflow-hidden flex items-center justify-center relative transition-all mx-auto">
        <canvas ref={canvasRef} className="block mx-auto max-w-full" />
        {!rendered && !renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-xs min-h-[260px]">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        )}
        {renderError && (
          <div className="p-8 text-center text-xs text-muted-foreground min-h-[200px] flex items-center justify-center">
            <p>{renderError}</p>
          </div>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground/80 font-medium mt-2 px-3 py-0.5 rounded-full bg-accent/60 shadow-2xs">
        Page {pageNumber} of {pdf?.numPages || 1}
      </div>
    </div>
  );
};

export interface PortalDocumentViewerProps {
  previewUrl: string;
  previewTitle?: string;
  previewCanInline?: boolean;
  previewEmptyMessage?: string;
  onDownloadFile?: (url: string, title: string) => Promise<void>;
  className?: string;
}

export const PortalDocumentViewer: React.FC<PortalDocumentViewerProps> = ({
  previewUrl,
  previewTitle,
  previewCanInline = true,
  previewEmptyMessage,
  onDownloadFile,
  className,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, [previewUrl]);

  useEffect(() => {
    let isCancelled = false;

    if (!previewUrl || !previewCanInline) {
      setPdfDoc(null);
      setPdfLoading(false);
      setPdfError(null);
      return;
    }

    const loadPdfDocument = async () => {
      setPdfLoading(true);
      setPdfError(null);

      try {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to load document (HTTP ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const loadedDoc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(loadedDoc);
          setPdfLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("Client-side PDF parsing error:", err);
          setPdfError(err?.message || "Unable to display PDF preview.");
          setPdfLoading(false);
        }
      }
    };

    void loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [previewUrl, previewCanInline]);

  const handleOpenNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

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

  const isImageFile = Boolean(
    previewUrl && /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(previewUrl)
  );

  return (
    <div
      ref={scrollContainerRef}
      className={className || "flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#141E30] p-2.5 sm:p-4 rounded-xl border border-border/70 min-h-[260px]"}
    >
      {previewUrl && isImageFile ? (
        /* Direct Image Preview */
        <div className="flex items-center justify-center min-h-full p-2">
          <img
            src={previewUrl}
            alt={previewTitle || "Document Preview"}
            className="max-w-full max-h-[60vh] object-contain rounded-xl border border-border/60 shadow-sm bg-background"
          />
        </div>
      ) : previewUrl && previewCanInline ? (
        /* Multi-Page Canvas PDF Preview */
        pdfLoading ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-8 text-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-semibold tracking-wide">Loading document preview...</p>
          </div>
        ) : pdfDoc && pdfDoc.numPages > 0 ? (
          <div className="flex flex-col items-center gap-3.5 max-w-4xl mx-auto w-full pb-2">
            {Array.from({ length: pdfDoc.numPages }, (_, index) => (
              <PdfPageCanvas
                key={`pdf-page-${index + 1}`}
                pdf={pdfDoc}
                pageNumber={index + 1}
                containerWidth={containerWidth}
              />
            ))}
          </div>
        ) : (
          /* Fallback Error State */
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-6 text-center space-y-3 max-w-md mx-auto">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Unable to preview document</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pdfError || "This document could not be rendered inline. Use Open in New Tab or Download File to view it."}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenNewTab}
                className="h-8 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" /> Open in New Tab
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={downloading}
                onClick={() => void handleDownload()}
                className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" /> Download File
              </Button>
            </div>
          </div>
        )
      ) : previewUrl ? (
        /* Genuine Fallback Empty State (DOCX, ZIP, etc.) */
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-6 text-center space-y-3 max-w-md mx-auto">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Unable to preview document</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This file format cannot be displayed inline in the browser. Use Open in New Tab or Download File to view it.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-8 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" /> Open in New Tab
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" /> Download File
            </Button>
          </div>
        </div>
      ) : (
        /* No file uploaded empty state */
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-6 text-center space-y-2 text-muted-foreground">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-medium">{previewEmptyMessage || "No file available to preview."}</p>
        </div>
      )}
    </div>
  );
};

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
  hideTopCloseButton?: boolean;
  statusBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerStatusText?: string;
  footerActions?: React.ReactNode;
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
  hideTopCloseButton = false,
  statusBadge,
  headerActions,
  footerStatusText,
  footerActions,
}) => {
  const [downloading, setDownloading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={true}
        className="w-[94vw] sm:w-[92vw] max-w-[1400px] h-[84vh] sm:h-[90vh] max-h-[840px] sm:max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200"
      >
        <DialogDescription className="sr-only">
          Preview document inline for {previewTitle || "Document"}
        </DialogDescription>

        {/* DESKTOP HEADER BAR (hidden lg:flex) */}
        <div className="hidden lg:flex items-center justify-between gap-4 px-6 py-3.5 border-b border-border/70 bg-card shrink-0">
          {/* Left: Document Info (Icon, Title, Status, Metadata) */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <DialogTitle
                  className="text-base font-bold text-foreground leading-snug truncate"
                  title={previewTitle}
                >
                  {previewTitle || "Document Preview"}
                </DialogTitle>
                {statusBadge && (
                  <div className="shrink-0 flex items-center">
                    {statusBadge}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                <span className="font-semibold text-foreground/80">PDF Document</span>
                <span>•</span>
                <span className="truncate max-w-[280px]">
                  {fileSize || "Standard PDF"}
                </span>
                <span>•</span>
                <span>
                  Updated: {updatedAt || "Aug 7, 2026"}
                </span>
                {organizationName && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{organizationName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons + Close Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions ? (
              headerActions
            ) : previewUrl ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNewTab}
                  className="h-8 px-3 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer hover:bg-accent text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Open in New Tab</span>
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
            ) : null}

            {!hideTopCloseButton && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-full border border-border/60 hover:bg-accent hover:text-foreground text-muted-foreground flex items-center justify-center shrink-0 transition-colors cursor-pointer ml-1"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE HEADER BAR (block lg:hidden) - 100% PRESERVED */}
        <div className="block lg:hidden px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-border/70 bg-card flex flex-col gap-2.5 sm:gap-3 shrink-0">
          {/* Top Row: Icon + Main Info (Title, Status, Metadata) + Protected Close Button */}
          <div className="flex items-start justify-between gap-2.5 sm:gap-4 w-full">
            {/* Left: Icon & Main Content */}
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1 pr-1 sm:pr-2">
                {/* 1. Document Title - Clean 2-line max clamp on mobile */}
                <DialogTitle
                  className="text-sm sm:text-base font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere] line-clamp-2"
                  title={previewTitle}
                >
                  {previewTitle || "Document Preview"}
                </DialogTitle>

                {/* 2. Status Badge Row - OWN DEDICATED ROW */}
                {statusBadge ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    {statusBadge}
                  </div>
                ) : null}

                {/* 3. File Metadata */}
                <div className="text-[11px] sm:text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-0.5">
                  <span>PDF</span>
                  <span>•</span>
                  <span className="truncate max-w-[200px] sm:max-w-[340px] text-foreground/90 font-medium">
                    {fileSize || "PDF Document"}
                  </span>
                  <span>•</span>
                  <span className="text-foreground/80 font-semibold">
                    Updated: {updatedAt || "Aug 7, 2026"}
                  </span>
                  {organizationName && (
                    <>
                      <span>•</span>
                      <span>{organizationName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Dedicated Protected Close Button */}
            {!hideTopCloseButton && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-full border border-border/60 hover:bg-accent hover:text-foreground text-muted-foreground flex items-center justify-center shrink-0 transition-colors cursor-pointer self-start -mt-0.5"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Action Buttons Row on Mobile */}
          {headerActions ? (
            <div className="w-full pt-1 sm:pt-0">
              {headerActions}
            </div>
          ) : previewUrl ? (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenNewTab}
                className="h-8 px-2.5 sm:px-3 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer hover:bg-accent text-foreground justify-center truncate"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Open in New Tab</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={downloading}
                onClick={() => void handleDownload()}
                className="h-8 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer shadow-2xs justify-center truncate"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span className="truncate">Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Download File</span>
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>

        {/* REUSABLE PDF VIEWER AREA */}
        <PortalDocumentViewer
          previewUrl={previewUrl}
          previewTitle={previewTitle}
          previewCanInline={previewCanInline}
          previewEmptyMessage={previewEmptyMessage}
          onDownloadFile={onDownloadFile}
          className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#141E30] p-2.5 sm:p-4 border-0 rounded-none"
        />

        {/* SIMPLIFIED 56px FOOTER */}
        <div className="h-14 py-2.5 px-4 sm:px-6 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-medium truncate mr-2">
            {footerStatusText || "Y-TRACE Document Compliance"}
          </p>
          {footerActions || (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-4 rounded-xl text-xs font-semibold border-border hover:bg-accent cursor-pointer shrink-0"
            >
              Close Preview
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
