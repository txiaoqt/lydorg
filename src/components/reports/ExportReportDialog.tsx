import { AdminExportDialog, type AdminExportOption, type AdminExportDialogProps } from "@/admin/components/AdminExportDialog";
import type { ExportFormat, PdfPageConfig, PdfPaperSize, PdfOrientation } from "@/lib/report-export";

export type ExportReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle?: string;
  title?: string;
  onExport: (format: ExportFormat, pageConfig?: PdfPageConfig) => Promise<void> | void;
  description?: string;
  options?: AdminExportOption[];
  initialPaperSize?: PdfPaperSize;
  initialOrientation?: PdfOrientation;
};

export function ExportReportDialog(props: ExportReportDialogProps) {
  return <AdminExportDialog {...props} />;
}

export type { AdminExportOption, AdminExportDialogProps };

