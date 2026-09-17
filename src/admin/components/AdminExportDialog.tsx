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
    description: "Best for official archival, printing, and formal submissions.",
    icon: FileText,
  },
  xlsx: {
    title: "Export as Excel",
    description: "Best for structured data analysis and formatted spreadsheets.",
    icon: FileSpreadsheet,
  },
  csv: {
    title: "Export as CSV",
    description: "Best for raw tabular records, migrations, and external systems.",
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
    description ?? "Select your preferred document format and page configuration.";

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
        className="flex w-[480px] sm:w-[480px] max-w-[calc(100vw-2rem)] h-auto max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto gap-4.5 rounded-lg border border-slate-300 bg-admin-surface p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-public-bg-secondary-100 p-2">
              <Download className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="font-segoe text-base sm:text-lg font-semibold leading-tight text-text-default">
                {resolvedTitle}
              </DialogTitle>
              <DialogDescription className="font-segoe text-xs sm:text-[13px] font-normal leading-normal text-slate-500">
                {resolvedDescription}
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              disabled={isSubmitting}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-slate-400 shadow-none transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        {/* Format Selection Cards */}
        <div className="flex flex-col gap-2">
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
                    "group relative flex min-h-[58px] w-full items-center gap-3.5 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-150 ease-out",
                    isSelected
                      ? "border-public-bg-brand bg-public-bg-brand/[0.04] ring-1 ring-public-bg-brand/30 shadow-2xs"
                      : "border-slate-200 bg-admin-surface hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                      isSelected
                        ? "bg-public-bg-brand text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70 group-hover:text-slate-800"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-segoe text-[13.5px] font-semibold leading-tight text-text-default">
                      {itemTitle}
                    </p>
                    <p className="font-segoe text-[12px] font-normal leading-normal text-slate-500">
                      {itemDesc}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-center pl-1">
                    {isSelected ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-public-bg-brand text-white shadow-2xs">
                        <Check className="h-3 w-3" strokeWidth={2.6} />
                      </div>
                    ) : (
                      <ChevronRight
                        className="h-4 w-4 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500"
                        strokeWidth={1.8}
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
          <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-4 space-y-3.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-segoe text-xs font-semibold uppercase tracking-wider text-slate-600">
                Page Setup
              </span>
              <span className="font-segoe text-[11px] font-normal text-slate-400">PDF layout options</span>
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
                <SelectTrigger id="pdf-paper-size" className="h-10 w-full border-slate-300 bg-admin-surface text-xs font-normal text-slate-800 transition-colors hover:border-slate-400 focus:ring-2 focus:ring-public-bg-brand focus:border-public-bg-brand">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-slate-300">
                  {PDF_PAPER_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id} className="text-xs cursor-pointer">
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
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setOrientation("portrait")}
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 py-2 font-segoe text-xs font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                    orientation === "portrait"
                      ? "border-public-bg-brand bg-public-bg-brand text-white shadow-xs"
                      : "border-slate-300 bg-admin-surface text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  <RectangleVertical className="h-4 w-4 shrink-0 text-current" strokeWidth={1.8} />
                  <span>Portrait</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setOrientation("landscape")}
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 py-2 font-segoe text-xs font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                    orientation === "landscape"
                      ? "border-public-bg-brand bg-public-bg-brand text-white shadow-xs"
                      : "border-slate-300 bg-admin-surface text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  <RectangleHorizontal className="h-4 w-4 shrink-0 text-current" strokeWidth={1.8} />
                  <span>Landscape</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200/80">
          <DialogClose asChild>
            <button
              type="button"
              disabled={isSubmitting}
              className="h-10 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-xs font-semibold text-text-default shadow-2xs transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleGenerate()}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-public-bg-brand px-5 py-2 font-segoe text-xs font-semibold text-white shadow-xs transition-all hover:bg-bg-brand-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-1 disabled:opacity-60"
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
