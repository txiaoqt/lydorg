import { buildVerifiedYpopAttendance, resolveYpopCityLedCategory, type YPOPPeriod } from "./lydo-connect-data";
import {
  adminReportMetadata, getAdminReportPeriodLabel, getAdminReportRange, matchesAdminReportPeriod, withAdminReportPeriod,
  type AdminReportPeriod,
} from "./admin-report-period";
import { buildAdminReportHeading, reportFilterValue } from "./admin-report-heading";
import {
  buildYpopParticipationReportOptions,
  ypopParticipationExportConfig,
  type YpopParticipationExportRow,
  type YpopParticipationFilters,
  type YpopParticipationSource,
} from "./ypop-participation-report";
import type { PdfPageConfig, PdfReportHeading } from "./report-export";
import { normalizePasigBarangayName, pasigDistrictBarangays, pasigDistrictOptions } from "./pasig-districts";
import {
  bold, centerOfYouthParticipationRank, CENTERS_OF_YOUTH_PARTICIPATION, createOfficialReport, describeReportingPeriod,
  drawNote, drawNothingFollows, drawOfficialHeading, drawOfficialTable, drawReportingMethodology, drawSignatories,
  formatCenterOfYouthParticipation, groupRow, newPage, percentOf,
} from "./official-report-pdf";

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
  const officialHeading = buildAdminReportHeading({
    program: "ypop", title: "Qualification Report", period: filters.period, generatedBy,
    reportingLines: [[category, ...adminReportMetadata(filters.period)].join(" | ")],
    filters: filtersLine,
    sortedBy: "Total Points (Highest first), then Organization Name (A-Z)",
    contextLines: pending ? [`Pending Evaluation: ${pending}; excluded from the qualification rate.`] : [],
  });
  return {
    ...base,
    pdfRenderer: pageConfig => generateYpopQualificationReportPdf(rows, officialHeading, filters.period, pageConfig),
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

const SUB_CLASSIFICATION_ROWS: Array<{ value: string; label: string }> = [
  { value: "community-based", label: "Community-based" },
  { value: "faith-based", label: "Faith-based" },
  { value: "school-based", label: "School-based" },
  { value: "consortium/federation", label: "Consortium/Federation" },
];
const MAJOR_CLASSIFICATION_ROWS = ["Youth Organization", "Youth-Serving Organization"];
const key = (value: string) => value.trim().toLocaleLowerCase();

const tally = (rows: YpopParticipationExportRow[]) => {
  const qualified = rows.filter(row => row.status === "qualified").length;
  const notQualified = rows.filter(row => row.status === "not_qualified").length;
  return { participating: rows.length, qualified, notQualified, rate: percentOf(qualified, qualified + notQualified) };
};

/** Official YPOP Qualification Report: summary metrics plus qualification breakdowns (PCYDO reference layout). */
export async function generateYpopQualificationReportPdf(rows: YpopParticipationExportRow[], heading: PdfReportHeading, period: AdminReportPeriod, pageConfig?: PdfPageConfig) {
  const r = await createOfficialReport(pageConfig);
  const overall = tally(rows);
  drawOfficialHeading(r, {
    heading, generatedLabel: "Generated",
    metrics: [
      { label: "Participating Organizations", value: String(overall.participating) },
      { label: "Qualified Organizations", value: String(overall.qualified) },
      { label: "Not-Qualified Organizations", value: String(overall.notQualified) },
      { label: "Qualification Rate", value: overall.rate },
    ],
  });

  const head = ["Classification", "Participating Organizations", "Qualified", "Not Qualified", "Qualification Rate"];
  const columns = { 0: { cellWidth: 125 }, 1: { cellWidth: 81.5 }, 2: { cellWidth: 81.5 }, 3: { cellWidth: 81.5 }, 4: { cellWidth: r.width - 369.5 } };
  const cells = (label: string, subset: YpopParticipationExportRow[]) => {
    const t = tally(subset);
    return [label, String(t.participating), String(t.qualified), String(t.notQualified), t.rate];
  };
  const boldCells = (label: string, subset: YpopParticipationExportRow[]) => cells(label, subset).map(value => bold(r, value));
  const section = (title: string, firstColumn: string, body: ReturnType<typeof cells>[], total?: YpopParticipationExportRow[]) =>
    drawOfficialTable(r, { title, head: [firstColumn, ...head.slice(1)], columnStyles: columns,
      body: [...body, ...(total ? [boldCells("Total", total)] : [])] });

  section("1. Major Classification", "Classification",
    MAJOR_CLASSIFICATION_ROWS.map(label => cells(label, rows.filter(row => key(row.majorClassification) === key(label)))), rows);
  section("2. Sub-Classification", "Classification",
    SUB_CLASSIFICATION_ROWS.map(item => cells(item.label, rows.filter(row => key(row.subClassification) === item.value))), rows);

  const themes = [...CENTERS_OF_YOUTH_PARTICIPATION].sort((a, b) => centerOfYouthParticipationRank(a) - centerOfYouthParticipationRank(b));
  section("3. Centers of Youth Participation", "Theme",
    themes.map(theme => cells(formatCenterOfYouthParticipation(theme), rows.filter(row => row.advocacies.some(value => centerOfYouthParticipationRank(value) === centerOfYouthParticipationRank(theme))))),
    rows.filter(row => row.advocacies.length));
  drawNote(r, "Non-additive: An organization may have multiple advocacy themes, so it may appear under more than one theme. Consequently, the totals across themes may exceed the number of unique participating organizations.");

  const inDistrict = (district: string) => rows.filter(row => row.district === district);
  section("4.1 Geography —District Summary", "District", pasigDistrictOptions.map(district => cells(district, inDistrict(district))), rows);

  const barangayBody = pasigDistrictOptions.flatMap(district => [
    groupRow(r, district, 5),
    [bold(r, "Barangay"), ...head.slice(1).map(label => bold(r, label))],
    ...pasigDistrictBarangays[district].map(barangay => cells(barangay.name,
      inDistrict(district).filter(row => normalizePasigBarangayName(row.barangay) === normalizePasigBarangayName(barangay.name)))),
    boldCells(`${district} Subtotal`, inDistrict(district)),
  ]);
  drawOfficialTable(r, { title: "4.2 Geography —Barangay Summary", columnCount: 5, columnStyles: columns,
    body: [...barangayBody, boldCells("Total", rows)] });

  newPage(r);
  const range = getAdminReportRange(period);
  const endDate = range.endDateExclusive
    ? new Date(Date.parse(`${range.endDateExclusive}T00:00:00Z`) - 86400000).toISOString().slice(0, 10) : null;
  drawReportingMethodology(r, describeReportingPeriod({
    label: getAdminReportPeriodLabel(period), startDate: range.startDate, endDate,
    referenceDate: period.mode === "quarter" ? endDate : null,
  }));
  drawSignatories(r);
  drawNothingFollows(r);
  return r.doc;
}
