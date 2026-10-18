import { useId, useState } from "react";
import { Download } from "lucide-react";
import { AdminExportDialog } from "./AdminExportDialog";
import { getCurrentAdminReportPeriod, type AdminReportPeriod } from "@/lib/admin-report-period";
import { advocacyOptions, formatAdvocacyLabel } from "@/lib/lydo-connect-data";
import { getBarangayOptionsForDistrict, pasigDistrictOptions, type PasigDistrict } from "@/lib/pasig-districts";
import { buildYpopParticipationReportOptions, YPOP_PARTICIPATION_STATUS_LABELS } from "@/lib/ypop-participation-report";
import { loadYpopParticipationReport } from "@/lib/ypop-participation-report-data";
import { buildYpopPointsQualificationReportOptions, YPOP_REPORT_CATEGORY_LABELS, type YpopReportCategory } from "@/lib/ypop-points-qualification-report";
import { exportReport } from "@/lib/report-export";
import { toast } from "@/hooks/use-toast";

type Props = {
  periodId: string;
  semesterLabel: string;
  classification: string;
  status: string;
  search: string;
  generatedBy?: string;
  reportKind?: "participation" | "points-qualification";
};

export function YpopParticipationReportExport({ periodId, semesterLabel, classification, status, search, generatedBy, reportKind = "participation" }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<AdminReportPeriod>(getCurrentAdminReportPeriod);
  const [district, setDistrict] = useState<"all" | PasigDistrict>("all");
  const [barangay, setBarangay] = useState("all");
  const [advocacy, setAdvocacy] = useState("all");
  const [category, setCategory] = useState<YpopReportCategory>("all");
  const [qualification, setQualification] = useState(status);
  const pointsReport = reportKind === "points-qualification";
  const reportTitle = pointsReport ? "YPOP Points and Qualification Report" : "YPOP Participation Report";
  const currentYear = getCurrentAdminReportPeriod().year;
  const selectClass = "h-10 w-full rounded-md border border-slate-300 bg-admin-surface px-3 font-segoe text-sm text-text-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-public-bg-brand disabled:opacity-50";
  return <>
    <button type="button" onClick={() => { setQualification(status); setOpen(true); }}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-bg-brand sm:w-fit sm:shrink-0 sm:whitespace-nowrap">
      <Download className="h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
      {pointsReport ? "Export Points and Qualification Report" : "Export Participation Report"}
    </button>
    <AdminExportDialog open={open} onOpenChange={setOpen} reportTitle={reportTitle}
      description={`Export ${semesterLabel}. ${pointsReport ? "Category and activity dates" : "Activity dates"} select rows; points and qualification reflect the complete semester.`}
      periodFilter={{ enabled: true, value: period, onChange: setPeriod, years: [currentYear, currentYear - 1, currentYear - 2] }}
      filterContent={<div className="space-y-3 font-segoe">
        {pointsReport && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-category`} className="space-y-1 text-xs font-medium text-text-secondary">Category
            <select id={`${id}-category`} value={category} className={selectClass} onChange={event => setCategory(event.target.value as YpopReportCategory)}>
              {Object.entries(YPOP_REPORT_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor={`${id}-qualification`} className="space-y-1 text-xs font-medium text-text-secondary">Qualification
            <select id={`${id}-qualification`} value={qualification} className={selectClass} onChange={event => setQualification(event.target.value)}>
              <option value="all">All qualifications</option>{Object.entries(YPOP_PARTICIPATION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-district`} className="space-y-1 text-xs font-medium text-text-secondary">District
            <select id={`${id}-district`} value={district} className={selectClass} onChange={event => { setDistrict(event.target.value as "all" | PasigDistrict); setBarangay("all"); }}>
              <option value="all">All districts</option>{pasigDistrictOptions.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label htmlFor={`${id}-barangay`} className="space-y-1 text-xs font-medium text-text-secondary">Barangay
            <select id={`${id}-barangay`} value={barangay} className={selectClass} onChange={event => setBarangay(event.target.value)}>
              <option value="all">All barangays</option>{getBarangayOptionsForDistrict(district).map(value => <option key={value.id} value={value.name}>{value.name}</option>)}
            </select>
          </label>
        </div>
        <label htmlFor={`${id}-advocacy`} className="block space-y-1 text-xs font-medium text-text-secondary">Advocacy
          <select id={`${id}-advocacy`} value={advocacy} className={selectClass} onChange={event => setAdvocacy(event.target.value)}>
            <option value="all">All advocacies</option>{advocacyOptions.map(value => <option key={value} value={value}>{formatAdvocacyLabel(value)}</option>)}
          </select>
        </label>
        <p className="text-xs text-text-secondary">Classification: {classification === "all" ? "All" : classification}
          {!pointsReport && ` · Status: ${status === "all" ? "All" : YPOP_PARTICIPATION_STATUS_LABELS[status as keyof typeof YPOP_PARTICIPATION_STATUS_LABELS]}`}
          {search.trim() ? ` · Search: ${search.trim()}` : ""}. Uses the current submission {pointsReport ? "classification and search" : "filters"}.</p>
      </div>}
      onExport={async (format, pageConfig) => {
        try {
          const filters = { period, district, barangay, advocacy, classification, status: pointsReport ? qualification : status, search };
          const data = await loadYpopParticipationReport(periodId, filters);
          const options = pointsReport
            ? buildYpopPointsQualificationReportOptions(data.sources, data.period, { ...filters, category }, generatedBy)
            : buildYpopParticipationReportOptions(data.sources, data.period, filters, generatedBy);
          if (!options.rows.length) {
            toast({ title: pointsReport ? "No matching qualification records" : "No matching participation records", description: "Choose another reporting period or adjust the filters." });
            return;
          }
          data.assertSession();
          await exportReport(format, options, pageConfig);
          toast({ title: "Export Ready", description: `The ${reportTitle} (${format.toUpperCase()}) has been downloaded.` });
        } catch (error) {
          toast({ title: pointsReport ? "Qualification export failed" : "Participation export failed", description: error instanceof Error ? error.message : "The report could not be completed. No partial report was downloaded.", variant: "destructive" });
        }
      }}
    />
  </>;
}
