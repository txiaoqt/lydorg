import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, ExternalLink, FileText, Megaphone, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TemplateRecord } from "@/lib/lydo-connect-data";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { getTemplateFileFormat, formatFileSize } from "@/components/portal/UserPortalTemplatesWorkspaceView";

type TemplateFilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateRecord | null;
};

const canInlinePreviewFormat = (format: string) =>
  ["PDF", "PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG"].includes(format.toUpperCase());

export const TemplateFilePreviewDialog = ({ open, onOpenChange, template }: TemplateFilePreviewDialogProps) => {
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [resolvedSize, setResolvedSize] = useState<number | null>(null);

  const rawUrl = template ? template.templateFileUrl || template.templateUrl : "";

  useEffect(() => {
    if (!open || !rawUrl) {
      setResolvedUrl("");
      setResolvedSize(null);
      return;
    }
    let isActive = true;
    void resolveSupabaseFileUrl(rawUrl)
      .then((url) => {
        if (!isActive) return;
        setResolvedUrl(url || "");
        if (url && template?.templateFileSize == null) {
          fetch(url, { method: "HEAD" })
            .then((res) => {
              if (!isActive) return;
              const contentLength = res.headers.get("content-length");
              if (contentLength) setResolvedSize(parseInt(contentLength, 10));
            })
            .catch(() => {
              // Silently swallow CORS or HEAD failures
            });
        }
      })
      .catch(() => {
        if (isActive) setResolvedUrl("");
      });
    return () => {
      isActive = false;
    };
  }, [open, rawUrl, template?.templateFileSize]);

  if (!template) return null;

  const fileFormat = getTemplateFileFormat(rawUrl, template.templateFileName || template.name);
  const canInline = Boolean(rawUrl) && canInlinePreviewFormat(fileFormat);
  const updatedDate = template.templateUploadedAt ? format(new Date(template.templateUploadedAt), "d MMM yyyy") : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex w-[900px] sm:w-[900px] max-w-[calc(100vw-2rem)] h-auto sm:h-auto max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto gap-6 rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              <FileText className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-segoe text-lg font-semibold leading-none text-text-default">
                {template.name}
              </DialogTitle>
              <p className="font-cascadia text-[13px] font-normal leading-none text-slate-500">
                {fileFormat} · {formatFileSize(template.templateFileSize ?? resolvedSize)} · Updated {updatedDate}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default shadow-none transition-colors hover:bg-transparent hover:text-public-text-secondary"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        <div className="h-[609px] w-full">
          {canInline && resolvedUrl ? (
            <iframe
              src={resolvedUrl}
              title={template.name}
              className="h-full w-full rounded-md border border-slate-300"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-md p-2.5"
              style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
            >
              <Megaphone className="h-14 w-14 text-public-text-neutral-on-neutral" strokeWidth={1.5} />
              {rawUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="font-segoe text-sm text-public-text-neutral-on-neutral">
                    Preview not available in the browser
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={resolvedUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-3 py-2 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                      Open File
                    </a>
                    <a
                      href={resolvedUrl || undefined}
                      download
                      className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-public-bg-brand px-3 py-2 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                    >
                      <Download className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                      Download File
                    </a>
                  </div>
                </div>
              ) : (
                <p className="font-segoe text-sm text-public-text-neutral-on-neutral">No file uploaded yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <DialogClose asChild>
            <button
              type="button"
              className="h-11 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default shadow-none transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              Close
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
