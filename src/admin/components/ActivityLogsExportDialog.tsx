import { AdminExportDialog, type AdminExportOption, type AdminExportDialogProps } from "@/admin/components/AdminExportDialog";
import type { ExportFormat } from "@/lib/report-export";

export type ActivityLogsExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle?: string;
  title?: string;
  onExport: (format: ExportFormat) => Promise<void>;
  description?: string;
  options?: AdminExportOption[];
};

export function ActivityLogsExportDialog(props: ActivityLogsExportDialogProps) {
  return <AdminExportDialog {...props} />;
}

export type { AdminExportOption, AdminExportDialogProps };
