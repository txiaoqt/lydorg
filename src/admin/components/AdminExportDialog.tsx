import { useEffect, useState } from "react";
import { ChevronRight, Download, FileSpreadsheet, FileText, Loader2, Table2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportFormat } from "@/lib/report-export";

export interface AdminExportOption {
  format: ExportFormat | string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  onExport?: () => Promise<void> | void;
}

export interface AdminExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  reportTitle?: string;
  description?: string;
  options?: AdminExportOption[];
  onExport?: (format: ExportFormat) => Promise<void> | void;
}

const DEFAULT_FORMAT_CONFIGS: Record<
  ExportFormat,
  {
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  pdf: {
    title: "Export as PDF",
    description: "Best for printing and official reports.",
    icon: FileText,
  },
  xlsx: {
    title: "Export as Excel",
    description: "Best for readable and editable spreadsheets.",
    icon: FileSpreadsheet,
  },
  csv: {
    title: "Export as CSV",
    description: "Best for raw data and system imports.",
    icon: Table2,
  },
};

const DEFAULT_OPTIONS: AdminExportOption[] = [
  { format: "pdf" },
  { format: "xlsx" },
  { format: "csv" },
];

export function AdminExportDialog({
  open,
  onOpenChange,
  title,
  reportTitle,
  description,
  options = DEFAULT_OPTIONS,
  onExport,
}: AdminExportDialogProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoadingFormat(null);
    }
  }, [open]);

  const resolvedTitle =
    title ??
    (reportTitle
      ? reportTitle.startsWith("Export")
        ? reportTitle
        : `Export ${reportTitle}`
      : "Export Data");

  const resolvedDescription =
    description ?? "Choose the file format for this export matching the current filters.";

  const handleSelect = async (option: AdminExportOption) => {
    if (loadingFormat) return;
    setLoadingFormat(option.format);
    try {
      if (option.onExport) {
        await option.onExport();
      } else if (onExport) {
        await onExport(option.format as ExportFormat);
      }
      onOpenChange(false);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loadingFormat && onOpenChange(nextOpen)}>
      <DialogContent
        hideCloseButton
        className="flex w-[440px] sm:w-[440px] max-w-[calc(100vw-2rem)] h-auto sm:h-auto max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto gap-5 rounded-lg border border-slate-300 bg-admin-surface p-6 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-public-bg-secondary-100 p-2">
              <Download className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="font-segoe text-base sm:text-lg font-semibold leading-tight text-text-default">
                {resolvedTitle}
              </DialogTitle>
              <DialogDescription className="font-segoe text-xs sm:text-sm font-normal leading-normal text-slate-500">
                {resolvedDescription}
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              disabled={loadingFormat !== null}
              className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border-0 bg-transparent text-slate-400 shadow-none transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        {/* Format Options */}
        <div className="flex flex-col gap-2.5">
          {options.map((option) => {
            const formatKey = option.format;
            const isLoading = loadingFormat === formatKey;
            const isDisabled = (loadingFormat !== null && !isLoading) || option.disabled;
            const defaultConfig = DEFAULT_FORMAT_CONFIGS[formatKey as ExportFormat];
            const Icon = option.icon ?? (defaultConfig?.icon ?? FileText);
            const itemTitle = option.title ?? (defaultConfig?.title ?? `Export as ${formatKey.toUpperCase()}`);
            const itemDesc = option.description ?? (defaultConfig?.description ?? `Export records as ${formatKey.toUpperCase()} file.`);

            return (
              <button
                key={formatKey}
                type="button"
                disabled={isDisabled || isLoading}
                onClick={() => void handleSelect(option)}
                className={cn(
                  "group relative flex min-h-[62px] w-full items-center gap-3.5 rounded-lg border border-slate-200 bg-admin-surface px-4 py-3 text-left transition-all duration-150",
                  "hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:bg-admin-surface disabled:active:scale-100"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-200/70 group-hover:text-slate-900 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="font-segoe text-[13.5px] font-semibold leading-tight text-text-default group-disabled:text-slate-400">
                    {isLoading ? "Exporting..." : itemTitle}
                  </p>
                  <p className="font-segoe text-[11.5px] font-normal leading-normal text-slate-500 group-disabled:text-slate-400">
                    {itemDesc}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-center pl-1">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-icon-info-secondary" strokeWidth={2} />
                  ) : (
                    <ChevronRight
                      className="h-4 w-4 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-700 group-disabled:text-slate-300 group-disabled:group-hover:translate-x-0"
                      strokeWidth={1.75}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <DialogClose asChild>
            <button
              type="button"
              disabled={loadingFormat !== null}
              className="h-10 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-sm font-medium text-text-default shadow-none transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
