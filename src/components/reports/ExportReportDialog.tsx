import { AdminExportDialog, type AdminExportOption, type AdminExportDialogProps } from "@/admin/components/AdminExportDialog";
import type { PdfPaperSize, PdfOrientation } from "@/lib/report-export";

export type ExportReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle?: string;
  title?: string;
  onExport: NonNullable<AdminExportDialogProps["onExport"]>;
  description?: string;
  options?: AdminExportOption[];
  periodFilter?: AdminExportDialogProps["periodFilter"];
  initialPaperSize?: PdfPaperSize;
  initialOrientation?: PdfOrientation;
};

export function ExportReportDialog(props: ExportReportDialogProps) {
  return <AdminExportDialog {...props} />;
}

export type { AdminExportOption, AdminExportDialogProps };

