import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RectangleHorizontal,
  RectangleVertical,
  Table2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PDF_PAPER_SIZE_OPTIONS,
  type ExportFormat,
  type PdfOrientation,
  type PdfPaperSize,
  type PdfPageConfig,
} from "@/lib/report-export";

export interface AdminExportOption {
  format: ExportFormat | string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  onExport?: (pageConfig?: PdfPageConfig) => Promise<void> | void;
}

export interface AdminExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  reportTitle?: string;
  description?: string;
  options?: AdminExportOption[];
  onExport?: (format: ExportFormat, pageConfig?: PdfPageConfig) => Promise<void> | void;
  initialPaperSize?: PdfPaperSize;
  initialOrientation?: PdfOrientation;
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
  initialPaperSize = "a4",
  initialOrientation = "portrait",
}: AdminExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");
  const [paperSize, setPaperSize] = useState<PdfPaperSize>(initialPaperSize);
  const [orientation, setOrientation] = useState<PdfOrientation>(initialOrientation);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const initialFormat = options[0]?.format ?? "pdf";
      setSelectedFormat(initialFormat);
      setPaperSize(initialPaperSize);
      setOrientation(initialOrientation);
      setIsSubmitting(false);
    }
  }, [open, options, initialPaperSize, initialOrientation]);

  const resolvedTitle =
    title ??
    (reportTitle
      ? reportTitle.startsWith("Export")
        ? reportTitle
        : `Export ${reportTitle}`
      : "Export Data");

  const resolvedDescription =
    description ?? "Choose the file format and page configuration for this export.";

  const handleGenerate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const pageConfig: PdfPageConfig = { paperSize, orientation };
      const currentOption = options.find((opt) => opt.format === selectedFormat);

      if (currentOption?.onExport) {
        await currentOption.onExport(pageConfig);
      } else if (onExport) {
        await onExport(selectedFormat as ExportFormat, pageConfig);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPdf = selectedFormat === "pdf";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent
        hideCloseButton
        className="flex w-[460px] sm:w-[460px] max-w-[calc(100vw-2rem)] h-auto max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto gap-5 rounded-lg border border-slate-300 bg-admin-surface p-6 shadow-lg"
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
              disabled={isSubmitting}
              className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border-0 bg-transparent text-slate-400 shadow-none transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        {/* Format Selection Cards */}
        <div className="flex flex-col gap-2.5">
          <label className="font-segoe text-xs font-semibold uppercase tracking-wider text-slate-500">
            Export Format
          </label>
          <div className="flex flex-col gap-2">
            {options.map((option) => {
              const formatKey = option.format;
              const isSelected = selectedFormat === formatKey;
              const isDisabled = (isSubmitting && !isSelected) || option.disabled;
              const defaultConfig = DEFAULT_FORMAT_CONFIGS[formatKey as ExportFormat];
              const Icon = option.icon ?? (defaultConfig?.icon ?? FileText);
              const itemTitle = option.title ?? (defaultConfig?.title ?? `Export as ${formatKey.toUpperCase()}`);
              const itemDesc =
                option.description ??
                (defaultConfig?.description ?? `Export records as ${formatKey.toUpperCase()} file.`);

              return (
                <button
                  key={formatKey}
                  type="button"
                  disabled={isDisabled || isSubmitting}
                  onClick={() => setSelectedFormat(formatKey)}
                  className={cn(
                    "group relative flex min-h-[58px] w-full items-center gap-3.5 rounded-lg border px-4 py-2.5 text-left transition-all duration-150",
                    isSelected
                      ? "border-sky-600 bg-sky-50/60 ring-1 ring-sky-600/30"
                      : "border-slate-200 bg-admin-surface hover:border-slate-300 hover:bg-slate-50/80",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                      isSelected
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-slate-200/70 group-hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-segoe text-[13.5px] font-semibold leading-tight text-text-default">
                      {itemTitle}
                    </p>
                    <p className="font-segoe text-[11.5px] font-normal leading-normal text-slate-500">
                      {itemDesc}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-center pl-1">
                    {isSelected ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <ChevronRight
                        className="h-4 w-4 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PDF Page Setup Options (Visible only when PDF is selected) */}
        {isPdf && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/75 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-segoe text-xs font-semibold uppercase tracking-wider text-slate-600">
                Page Setup
              </span>
              <span className="font-segoe text-[11px] text-slate-400">PDF layout options</span>
            </div>

            {/* Paper Size Selector */}
            <div className="space-y-1.5">
              <label htmlFor="pdf-paper-size" className="font-segoe text-xs font-medium text-slate-700">
                Paper Size
              </label>
              <Select
                value={paperSize}
                onValueChange={(value) => setPaperSize(value as PdfPaperSize)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="pdf-paper-size" className="h-9 w-full border-slate-300 bg-admin-surface text-xs font-normal">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PDF_PAPER_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id} className="text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-800">{option.label}</span>
                        <span className="text-[11px] text-slate-400">({option.dimensions})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Orientation Selector */}
            <div className="space-y-1.5">
              <label className="font-segoe text-xs font-medium text-slate-700">Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setOrientation("portrait")}
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 rounded-md border text-xs font-medium transition-colors",
                    orientation === "portrait"
                      ? "border-sky-600 bg-sky-600 text-white shadow-xs"
                      : "border-slate-300 bg-admin-surface text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <RectangleVertical className="h-3.5 w-3.5" />
                  Portrait
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setOrientation("landscape")}
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 rounded-md border text-xs font-medium transition-colors",
                    orientation === "landscape"
                      ? "border-sky-600 bg-sky-600 text-white shadow-xs"
                      : "border-slate-300 bg-admin-surface text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <RectangleHorizontal className="h-3.5 w-3.5" />
                  Landscape
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-slate-100">
          <DialogClose asChild>
            <button
              type="button"
              disabled={isSubmitting}
              className="h-9 rounded-md border border-slate-300 bg-admin-surface px-4 font-segoe text-xs font-medium text-text-default shadow-none transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleGenerate()}
            className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-5 font-segoe text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Generate Export
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

