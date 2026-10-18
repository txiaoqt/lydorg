import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  getApprovedYpopOrgActivityCount,
  normalizeYpopCityLedPoints,
  resolveYpopCityLedCategory,
  type OrganizationProfile,
  type YPOPEntry,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPPeriod,
  type YPOPCityActivity,
  type YpopQualificationStatus,
} from "./lydo-connect-data";
import { adminReportMetadata, getManilaReportDate, matchesAdminReportPeriod, withAdminReportPeriod, type AdminReportPeriod } from "./admin-report-period";
import { buildAdminReportHeading, reportFilterValue } from "./admin-report-heading";
import { getPasigDistrictForBarangay, normalizePasigDistrict } from "./pasig-districts";
import type { ReportExportConfig, ReportExportOptions } from "./report-export";

export type YpopParticipationSource = {
  organization: OrganizationProfile;
  entry?: YPOPEntry;
  cityActivities: YPOPCityActivity[];
  participations: YPOPEventParticipation[];
  orgActivities: YPOPOrgActivity[];
  status: YpopQualificationStatus;
};

export type YpopParticipationFilters = {
  period: AdminReportPeriod;
  district: string;
  barangay: string;
  advocacy: string;
  classification: string;
  status: string;
  search: string;
};

export type YpopParticipationExportRow = {
  organizationId: string;
  organizationName: string;
  urn: string;
  mandatoryPoints: number;
  invitationalPoints: number;
  partnershipPoints: number;
  cityLedSubtotal: number;
  verifiedOrgLedActivities: number;
  orgLedBonus: number;
  totalPoints: number;
  status: YpopQualificationStatus;
  latestActivityDate: string;
};

export const YPOP_PARTICIPATION_STATUS_LABELS: Record<YpopQualificationStatus, string> = {
  pending_evaluation: "Pending Evaluation", qualified: "Qualified", not_qualified: "Not Qualified",
};

const numericColumn = (label: string, field: "mandatoryPoints" | "invitationalPoints" | "partnershipPoints" | "cityLedSubtotal" | "verifiedOrgLedActivities" | "orgLedBonus" | "totalPoints", width: number) => ({
  label, value: (row: YpopParticipationExportRow) => row[field], pdfWidth: width,
  pdfAlign: "center" as const, xlsxAlign: "center" as const, xlsxType: "integer" as const, xlsxWidth: 20, xlsxWrap: true,
});

export const ypopParticipationExportConfig: ReportExportConfig<YpopParticipationExportRow> = {
  title: "YPOP Participation Report", filenamePrefix: "ypop-participation", xlsxSheetName: "YPOP Participation",
  orientation: "portrait", paperSize: "a4", pdfUseUnicodeFont: true, pdfFontSize: 6.5, pdfCellPadding: 2.5,
  footerText: "Pasig City Youth Development Office - YPOP Participation",
  columns: [
    { label: "No.", value: (_row, index) => index + 1, pdfWidth: 23, pdfAlign: "center", xlsxWidth: 6, xlsxType: "integer" },
    { label: "Organization Name", value: row => row.organizationName, pdfWidth: 78, xlsxWidth: 30, xlsxWrap: true },
    { label: "URN", value: row => row.urn, pdfWidth: 52, xlsxWidth: 20, xlsxWrap: true, preserveSpreadsheetText: true },
    numericColumn("Mandatory Participation Points", "mandatoryPoints", 49),
    numericColumn("Invitational Participation Points", "invitationalPoints", 49),
    numericColumn("Partnership Participation Points", "partnershipPoints", 49),
    numericColumn("City-led Subtotal", "cityLedSubtotal", 45),
    numericColumn("Verified Org-led Activities", "verifiedOrgLedActivities", 55),
    numericColumn("Org-led Bonus", "orgLedBonus", 42),
    numericColumn("Total Points", "totalPoints", 44),
    { label: "Status", value: row => YPOP_PARTICIPATION_STATUS_LABELS[row.status], pdfWidth: 49, xlsxWidth: 22, xlsxWrap: true },
  ],
};

const normalized = (value: string) => value.trim().toLocaleLowerCase();
const cleanBarangay = (value: string) => normalized(value).replace(/^(barangay|brgy\.?)\s+/, "");

export function buildYpopParticipationRows(sources: YpopParticipationSource[], semester: YPOPPeriod, filters: YpopParticipationFilters): YpopParticipationExportRow[] {
  return sources.flatMap(source => {
    const { organization, entry } = source;
    const barangay = organization.addressBarangay || organization.barangay;
    const district = normalizePasigDistrict(organization.district) || getPasigDistrictForBarangay(barangay);
    if (filters.district !== "all" && district !== filters.district) return [];
    if (filters.barangay !== "all" && cleanBarangay(barangay) !== cleanBarangay(filters.barangay)) return [];
    if (filters.advocacy !== "all" && !organization.advocacies?.some(value => normalized(value) === normalized(filters.advocacy))) return [];
    if (filters.classification !== "all" && normalized(organization.majorClassification) !== normalized(filters.classification)) return [];
    if (filters.status !== "all" && source.status !== filters.status) return [];
    const search = normalized(filters.search);
    if (search && !normalized(`${organization.organizationName} ${organization.referenceId}`).includes(search)) return [];

    const activities = source.cityActivities.filter(activity => activity.semesterKey === semester.semesterKey);
    const activityIds = new Set(activities.map(activity => activity.id));
    const participations = source.participations.filter(item => item.organizationId === organization.id && activityIds.has(item.activityId) && item.status !== "draft");
    const orgActivities = source.orgActivities.filter(item => item.organizationId === organization.id && item.ypopEntryId === entry?.id && item.status !== "draft");
    const attendance = buildVerifiedYpopAttendance(activities, participations, entry?.cityLedAttendance ?? []);
    const approvedCount = entry ? getApprovedYpopOrgActivityCount(orgActivities, entry.id, entry.orgLedProjectCount ?? 0) : 0;
    const score = computeYpopScore(attendance, activities, approvedCount, semester.orgLedTiers);
    const attended = new Set(attendance.filter(item => item.attended).map(item => item.activityId));
    const submitted = new Set(participations.map(item => item.activityId));
    const dates = [
      ...activities.filter(activity => submitted.has(activity.id) || attended.has(activity.id)).map(activity => activity.startDate || activity.date),
      ...orgActivities.map(activity => activity.activityDate),
    ].map(getManilaReportDate).filter((date): date is string => Boolean(date))
      .filter(date => matchesAdminReportPeriod(date, filters.period)).sort();
    if (filters.period.mode !== "all" && !dates.length) return [];

    const points = { mandatory: 0, invitational: 0, partnership: 0 };
    for (const activity of activities) {
      if (attended.has(activity.id)) points[resolveYpopCityLedCategory(activity.category, activity.points)] += normalizeYpopCityLedPoints(activity.points, activity.category);
    }
    return [{
      organizationId: organization.id, organizationName: organization.organizationName, urn: organization.urn || "—",
      mandatoryPoints: points.mandatory, invitationalPoints: points.invitational, partnershipPoints: points.partnership,
      cityLedSubtotal: score.cityLedEarned, verifiedOrgLedActivities: approvedCount, orgLedBonus: score.orgLedBonus,
      totalPoints: score.totalScore, status: source.status, latestActivityDate: dates[dates.length - 1] ?? "",
    }];
  }).sort((a, b) => b.latestActivityDate.localeCompare(a.latestActivityDate) || a.organizationName.localeCompare(b.organizationName) || a.organizationId.localeCompare(b.organizationId));
}

export function buildYpopParticipationReportOptions(sources: YpopParticipationSource[], semester: YPOPPeriod, filters: YpopParticipationFilters, generatedBy?: string): ReportExportOptions<YpopParticipationExportRow> {
  const rows = buildYpopParticipationRows(sources, semester, filters);
  const metrics = [
    { label: "Total Participation Records", value: String(rows.length) },
    { label: "Total Participating Organizations", value: String(new Set(rows.map(row => row.organizationId)).size) },
    { label: "Approved Participation Records", value: String(rows.filter(row => row.status === "qualified").length) },
  ];
  const filterLines = [
    `District: ${reportFilterValue(filters.district)}`, `Barangay: ${reportFilterValue(filters.barangay)}`,
    `Advocacy: ${reportFilterValue(filters.advocacy)}`, `Classification: ${reportFilterValue(filters.classification)}`,
    ...(filters.status !== "all" ? [`Status: ${reportFilterValue(filters.status)}`] : []),
    ...(filters.search.trim() ? [`Search: ${filters.search.trim()}`] : []),
  ];
  const scope = `Semester: ${semester.semesterLabel} | Semester scores; rows filtered by activity date.`;
  return {
    config: withAdminReportPeriod(ypopParticipationExportConfig, filters.period), rows,
    pdfHeading: buildAdminReportHeading({ program: "ypop", title: "Participation Report", period: filters.period, generatedBy,
      filters: filterLines, sortedBy: "Activity Date (Newest first), then Organization Name (A-Z)", contextLines: [scope],
      summaryMetrics: metrics, summaryMetricsAlign: "center" }),
    filterSummaryLines: [...filterLines, ...adminReportMetadata(filters.period)],
    metadataLines: [scope, "Total Points = city-led participation percentage + org-led bonus. Approved records = qualified organizations.", ...metrics.map(metric => `${metric.label}: ${metric.value}`)],
  };
}
