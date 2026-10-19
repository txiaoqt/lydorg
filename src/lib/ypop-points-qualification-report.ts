import { buildVerifiedYpopAttendance, resolveYpopCityLedCategory, type YPOPPeriod } from "./lydo-connect-data";
import { adminReportMetadata, matchesAdminReportPeriod, withAdminReportPeriod } from "./admin-report-period";
import { buildAdminReportHeading, reportFilterValue } from "./admin-report-heading";
import {
  buildYpopParticipationReportOptions,
  ypopParticipationExportConfig,
  type YpopParticipationFilters,
  type YpopParticipationSource,
} from "./ypop-participation-report";

export const YPOP_REPORT_CATEGORY_LABELS = {
  all: "All",
  mandatory: "Mandatory Participation",
  invitational: "Invitational Participation",
  partnership: "Partnership Participation",
  org_led: "Org-led Activities",
} as const;

export type YpopReportCategory = keyof typeof YPOP_REPORT_CATEGORY_LABELS;
export type YpopPointsQualificationFilters = YpopParticipationFilters & { category: YpopReportCategory };

/** Category selects organizations with a matching activity; it never changes semester scoring. */
function matchesCategory(source: YpopParticipationSource, semester: YPOPPeriod, filters: YpopPointsQualificationFilters) {
  if (filters.category === "all") return true;
  if (filters.category === "org_led") {
    return source.orgActivities.some(activity => activity.organizationId === source.organization.id
      && activity.ypopEntryId === source.entry?.id && activity.status !== "draft"
      && matchesAdminReportPeriod(activity.activityDate, filters.period));
  }
  const activities = source.cityActivities.filter(activity => activity.semesterKey === semester.semesterKey);
  const participations = source.participations.filter(item => item.organizationId === source.organization.id && item.status !== "draft");
  const attendance = buildVerifiedYpopAttendance(activities, participations, source.entry?.cityLedAttendance ?? []);
  return activities.some(activity => resolveYpopCityLedCategory(activity.category, activity.points) === filters.category
    && matchesAdminReportPeriod(activity.startDate || activity.date, filters.period)
    && (participations.some(item => item.activityId === activity.id) || attendance.some(item => item.activityId === activity.id && item.attended)));
}

export function buildYpopPointsQualificationReportOptions(sources: YpopParticipationSource[], semester: YPOPPeriod, filters: YpopPointsQualificationFilters, generatedBy?: string) {
  const base = buildYpopParticipationReportOptions(sources.filter(source => matchesCategory(source, semester, filters)), semester, filters, generatedBy);
  const rows = [...base.rows].sort((a, b) => b.totalPoints - a.totalPoints
    || a.organizationName.localeCompare(b.organizationName) || a.organizationId.localeCompare(b.organizationId));
  const qualified = rows.filter(row => row.status === "qualified").length;
  const notQualified = rows.filter(row => row.status === "not_qualified").length;
  const pending = rows.filter(row => row.status === "pending_evaluation").length;
  const metrics = [
    { label: "Total Organizations Evaluated", value: String(qualified + notQualified) },
    { label: "Qualified Organizations", value: String(qualified) },
    { label: "Not-Qualified Organizations", value: String(notQualified) },
  ];
  const filtersLine = [
    ...(base.pdfHeading?.filters ?? []).filter(line => !line.startsWith("Status:")),
    `Qualification: ${reportFilterValue(filters.status)}`,
  ];
  const category = `Category: ${YPOP_REPORT_CATEGORY_LABELS[filters.category]}`;
  const scope = `Semester: ${semester.semesterLabel} | Category and activity dates select rows; scores reflect the complete semester.`;
  return {
    ...base,
    config: withAdminReportPeriod({
      ...ypopParticipationExportConfig,
      title: "YPOP Points and Qualification Report",
      filenamePrefix: "YPOP_Qualification",
      xlsxSheetName: "YPOP Points & Qualification",
      footerText: "Pasig City Youth Development Office - YPOP Points and Qualification",
    }, filters.period),
    rows,
    pdfHeading: buildAdminReportHeading({
      program: "ypop", title: "Points and Qualification Report", period: filters.period, generatedBy,
      reportingLines: [[category, ...adminReportMetadata(filters.period)].join(" | ")],
      filters: filtersLine,
      sortedBy: "Total Points (Highest first), then Organization Name (A-Z)",
      contextLines: [scope, ...(pending ? [`Pending Evaluation: ${pending}; excluded from the evaluated total.`] : [])],
      summaryMetrics: metrics,
      summaryMetricsAlign: "center",
    }),
    filterSummaryLines: [category, ...filtersLine, ...adminReportMetadata(filters.period)],
    metadataLines: [scope, "Total Points = city-led participation percentage + org-led bonus.",
      ...metrics.map(metric => `${metric.label}: ${metric.value}`), `Pending Evaluation: ${pending} (excluded from the evaluated total)`],
  };
}
