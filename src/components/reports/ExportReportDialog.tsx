import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Table2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ExportFormat } from "@/lib/report-export";

type ExportReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  onExport: (format: ExportFormat) => Promise<void>;
  description?: string;
};

export function ExportReportDialog({
  open,
  onOpenChange,
  reportTitle,
  onExport,
  description,
}: ExportReportDialogProps) {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export {reportTitle}</DialogTitle>
          <DialogDescription>
            {description ?? "Choose the file format for this report export."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-3"
            disabled={loadingFormat !== null}
            onClick={() => void handleExport("pdf")}
          >
            <FileText className="h-4 w-4" />
            <span className="flex flex-col items-start">
              <span>{loadingFormat === "pdf" ? "Generating PDF..." : "Export as PDF"}</span>
              <span className="text-xs text-muted-foreground">Best for printing and official reports</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-3"
            disabled={loadingFormat !== null}
            onClick={() => void handleExport("xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="flex flex-col items-start">
              <span>{loadingFormat === "xlsx" ? "Generating Excel..." : "Export as Excel (.xlsx)"}</span>
              <span className="text-xs text-muted-foreground">Best for readable and editable spreadsheets</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-3"
            disabled={loadingFormat !== null}
            onClick={() => void handleExport("csv")}
          >
            <Table2 className="h-4 w-4" />
            <span className="flex flex-col items-start">
              <span>{loadingFormat === "csv" ? "Generating CSV..." : "Export as CSV"}</span>
              <span className="text-xs text-muted-foreground">Best for raw data and system imports</span>
            </span>
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loadingFormat !== null}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
