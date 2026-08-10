import { useEffect, useState } from "react";
import { ChevronRight, FileSpreadsheet, FileText, Loader, Table2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportFormat } from "@/lib/report-export";

type ExportReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  onExport: (format: ExportFormat) => Promise<void>;
  description?: string;
};

const EXPORT_ITEMS: {
  format: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
  iconClass: string;
  bgClass: string;
  strokeWidth: number;
}[] = [
  {
    format: "pdf",
    label: "Export as PDF",
    description: "Best for printing and official reports.",
    icon: FileText,
    iconClass: "text-[#C00F0C]",
    bgClass: "bg-[#FEE9E7]",
    strokeWidth: 1.6,
  },
  {
    format: "xlsx",
    label: "Export as Excel",
    description: "Best for readable and editable spreadsheets.",
    icon: FileSpreadsheet,
    iconClass: "text-[#009951]",
    bgClass: "bg-[#EBFFEE]",
    strokeWidth: 1.6,
  },
  {
    format: "csv",
    label: "Export as CSV",
    description: "Best for raw data and system imports.",
    icon: Table2,
    iconClass: "text-[#975102]",
    bgClass: "bg-[#FFFBEB]",
    strokeWidth: 2,
  },
];

export function ExportReportDialog({
  open,
  onOpenChange,
  reportTitle,
  onExport,
  description,
}: ExportReportDialogProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);

  useEffect(() => {
    if (!open) setLoadingFormat(null);
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
    <Dialog open={open} onOpenChange={(next) => !loadingFormat && onOpenChange(next)}>
      <DialogContent
        hideCloseButton
        className="sm:w-[420px] gap-6 border-[#E5E7EB] bg-white p-6 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,0.10)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#CBD5E1] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#DCEFFD]">
              <Upload className="h-5 w-5 text-[#118DF0]" strokeWidth={1.6} />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-segoe text-[18px] font-semibold leading-[100%] text-[#1E1E1E]">
                Export {reportTitle}
              </DialogTitle>
              <p className="font-segoe text-[13px] font-normal leading-[100%] text-[#64748B]">
                {description ?? "Export all records matching the current filters."}
              </p>
            </div>
          </div>
          <DialogClose
            disabled={!!loadingFormat}
            className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none"
          >
            <X className="h-4 w-4 text-[#D9D9D9] transition-colors group-hover:text-[#757575]" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Export options */}
        <div className="flex flex-col gap-2">
          {EXPORT_ITEMS.map(({ format, label, description: itemDesc, icon: Icon, iconClass, bgClass, strokeWidth }) => (
            <button
              key={format}
              type="button"
              disabled={!!loadingFormat}
              onClick={() => void handleExport(format)}
              className="group flex w-full items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-3 transition-colors hover:bg-[#F5F7FA] disabled:opacity-50"
            >
              {/* Icon container */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] p-2 ${bgClass}`}>
                <Icon className={`h-5 w-5 ${iconClass}`} strokeWidth={strokeWidth} />
              </div>

              {/* Text */}
              <div className="flex flex-1 flex-col gap-1 text-left">
                <span className="font-segoe text-[13px] font-semibold leading-[100%] text-[#1E1E1E] transition-colors group-hover:text-[#2864C4]">
                  {label}
                </span>
                <span className="font-segoe text-[11px] font-normal leading-[100%] text-[#64748B]">
                  {itemDesc}
                </span>
              </div>

              {/* Right slot: spinner when loading, chevron otherwise */}
              {loadingFormat === format ? (
                <Loader className="h-4 w-4 shrink-0 animate-spin text-[#2864C4]" strokeWidth={1.6} />
              ) : (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[#B3B3B3] transition-colors group-hover:text-[#2864C4]"
                  strokeWidth={1.6}
                />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!!loadingFormat}
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-[#CBD5E1] bg-white px-4 font-segoe text-[14px] leading-[100%] text-[#1E1E1E] transition-colors hover:bg-[#F5F7FA] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
