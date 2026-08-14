import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertTriangle
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

interface PdfPageCanvasProps {
  pdf: any;
  pageNumber: number;
  containerWidth: number;
}

const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({ pdf, pageNumber, containerWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [pageError, setPageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        const baseViewport = page.getViewport({ scale: 1 });
        // Responsive scaling based on container width with padding consideration
        const availableWidth = Math.max(containerWidth - 36, 260);
        const scaleFactor = Math.min(availableWidth / baseViewport.width, 2.0);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scaleFactor * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(baseViewport.width * scaleFactor)}px`;
        canvas.style.height = `${Math.floor(baseViewport.height * scaleFactor)}px`;

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
        }

        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`PDF rendering error on page ${pageNumber}:`, err);
          if (isMounted) setPageError(true);
        }
      }
    };

    void renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdf, pageNumber, containerWidth]);

  if (pageError) {
    return (
      <div className="w-full py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
        Page {pageNumber} could not be rendered.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-card rounded-xl p-2 sm:p-3 shadow-xs border border-border/70 max-w-full">
      <div className="w-full flex items-center justify-between pb-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
        <span>Page {pageNumber} of {pdf.numPages}</span>
      </div>
      <div className="overflow-hidden rounded-lg bg-white shadow-inner flex items-center justify-center max-w-full">
        <canvas ref={canvasRef} className="block max-w-full h-auto" />
      </div>
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
}) => {
  const [downloading, setDownloading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // ResizeObserver to track container width and dynamically scale rendered PDF pages
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
  }, [open]);

  // Asynchronously load PDF using PDF.js
  useEffect(() => {
    let isCancelled = false;

    if (!open || !previewUrl || !previewCanInline) {
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
  }, [open, previewUrl, previewCanInline]);

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

  const isImageFile = Boolean(
    previewUrl && /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(previewUrl)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton={hideTopCloseButton} className="w-[94vw] sm:w-[92vw] max-w-[1400px] h-[82vh] sm:h-[90vh] max-h-[820px] sm:max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200">
        <DialogDescription className="sr-only">
          Preview document inline for {previewTitle || "Document"}
        </DialogDescription>

        {/* INFORMATION HEADER BAR */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-border/70 bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-2.5 sm:gap-4">
          {/* Left: Icon, Title, Metadata */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-xs sm:text-base font-bold text-foreground leading-snug break-words" title={previewTitle}>
                {previewTitle || "Document Preview"}
              </DialogTitle>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span>PDF</span>
                <span>•</span>
                <span>{fileSize || "PDF Document"}</span>
                <span>•</span>
                <span className="text-foreground/80 font-semibold">Updated: {updatedAt || "Aug 7, 2026"}</span>
                {organizationName && (
                  <>
                    <span>•</span>
                    <span>{organizationName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons: Open in New Tab + Download File */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {previewUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNewTab}
                  className="h-8 flex-1 sm:flex-initial px-2.5 sm:px-3 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer hover:bg-accent text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Open in New Tab</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={downloading}
                  onClick={() => void handleDownload()}
                  className="h-8 flex-1 sm:flex-initial px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
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

        {/* PDF VIEWER AREA WITH SOFT GRAY BACKGROUND (#F8FAFC) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-2.5 sm:p-4"
        >
          {previewUrl && isImageFile ? (
            /* Direct Image Preview */
            <div className="flex items-center justify-center min-h-full p-2">
              <img
                src={previewUrl}
                alt={previewTitle || "Document Preview"}
                className="max-w-full max-h-[65vh] object-contain rounded-xl border border-border/60 shadow-sm bg-background"
              />
            </div>
          ) : previewUrl && previewCanInline ? (
            /* Multi-Page Canvas PDF Preview */
            pdfLoading ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-semibold tracking-wide">Loading document preview...</p>
              </div>
            ) : pdfDoc && pdfDoc.numPages > 0 ? (
              <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto w-full pb-4">
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
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-foreground">Unable to preview document</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pdfError || "This document could not be rendered inline. Use Open in New Tab or Download File to view it."}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
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
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
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
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-2 text-muted-foreground">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-medium">{previewEmptyMessage || "No file available to preview."}</p>
            </div>
          )}
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

