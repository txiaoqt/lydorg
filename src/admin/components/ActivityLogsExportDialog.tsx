import { useEffect, useState } from "react";
import { ChevronRight, File, FileMinus, Layout, Loader, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import type { ExportFormat } from "@/lib/report-export";

type ActivityLogsExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  onExport: (format: ExportFormat) => Promise<void>;
  description?: string;
};

const FORMAT_OPTIONS: {
  format: ExportFormat;
  icon: typeof File;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}[] = [
  {
    format: "pdf",
    icon: File,
    iconBg: "bg-danger-subtle",
    iconColor: "text-icon-danger-secondary",
    title: "Export as PDF",
    description: "Best for printing and official reports.",
  },
  {
    format: "xlsx",
    icon: FileMinus,
    iconBg: "bg-bg-success-subtle",
    iconColor: "text-positive-secondary",
    title: "Export as Excel",
    description: "Best for readable and editable spreadsheets.",
  },
  {
    format: "csv",
    icon: Layout,
    iconBg: "bg-amber-50",
    iconColor: "text-text-warning-secondary",
    title: "Export as CSV",
    description: "Best for raw data and system imports.",
  },
];

export function ActivityLogsExportDialog({
  open,
  onOpenChange,
  reportTitle,
  onExport,
  description,
}: ActivityLogsExportDialogProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);

  useEffect(() => {
    if (!open) {
      setLoadingFormat(null);
    }
  }, [open]);

  const handleExport = async (format: ExportFormat) => {
    if (loadingFormat) return;
    setLoadingFormat(format);
    try {
      await onExport(format);
      onOpenChange(false);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loadingFormat && onOpenChange(nextOpen)}>
      <DialogContent
        hideCloseButton
        className="flex w-[420px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-auto sm:h-auto max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto gap-6 rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              <Upload className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-segoe text-lg font-semibold leading-none text-text-default">
                Export {reportTitle}
              </p>
              <p className="font-segoe text-sm font-normal leading-none text-slate-500">
                {description ?? "Choose the file format for this report export."}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              disabled={loadingFormat !== null}
              className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default shadow-none transition-colors hover:bg-transparent hover:text-public-text-secondary disabled:opacity-50"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-2">
          {FORMAT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isLoading = loadingFormat === option.format;
            return (
              <button
                key={option.format}
                type="button"
                disabled={loadingFormat !== null}
                onClick={() => void handleExport(option.format)}
                className="group flex h-[60px] w-full shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] p-2", option.iconBg)}>
                  <Icon className={cn("h-5 w-5", option.iconColor)} strokeWidth={1.6} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                    {option.title}
                  </p>
                  <p className="font-segoe text-[11px] font-normal leading-none text-slate-500">
                    {option.description}
                  </p>
                </div>
                {isLoading ? (
                  <Loader className="h-4 w-4 shrink-0 animate-spin text-icon-info-secondary" strokeWidth={1.6} />
                ) : (
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-text-disabled transition-colors group-hover:text-icon-info-secondary"
                    strokeWidth={1.6}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <DialogClose asChild>
            <button
              type="button"
              disabled={loadingFormat !== null}
              className="h-11 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default shadow-none transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
