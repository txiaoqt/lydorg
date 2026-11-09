import { format } from "date-fns";
import {
  getRepresentativeDisplayName, getAdviserDisplayName, getOrganizationAddressDisplay,
  formatSubClassificationLabel, YPOP_CITY_LED_CATEGORY_LABELS, YPOP_CITY_LED_CATEGORY_POINTS, YPOP_SCORE_THRESHOLD, statusLabelMap,
  type SubmissionFile, type TemplateRecord, type YPOPCityActivityCategory, type YPOPPeriod, type YPOPEntry,
} from "./lydo-connect-data";
import { buildRegistryYpopDetail } from "./yorp-registry-detail";
import type { ReportGenerationContext } from "./report-export";
import { buildAdminReportHeading } from "./admin-report-heading";
import {
  bold, centerOfYouthParticipationRank, createOfficialReport, drawOfficialHeading, drawOfficialTable, drawSectionTitle,
  formatCenterOfYouthParticipation, OFFICIAL_REPORT_COLORS,
  type OfficialReport,
} from "./official-report-pdf";
import type { YorpRegistryEntry } from "../admin/components/YorpRegistryTable";

const label = (value?: string) => value?.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Not available";
const value = (input?: string | null) => input?.trim() || "Not provided";
const date = (input?: string | Date | null) => {
  const parsed = input ? new Date(input) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? format(parsed, "d MMM yyyy") : "Not available";
};
const filenameSegment = (input: string, separator: "_" | "-") => {
  const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const safe = separator === "_"
    ? normalized.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    : normalized.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return safe.slice(0, 100);
};

/** Official YORP registration requirements, in the order the PCYDO report lists them. */
const YORP_REQUIREMENTS: Array<{ name: string; match: RegExp }> = [
  { name: "Pasig City YORP Registration Form (Form A)", match: /form\s*a\b|pasig city yorp/i },
  { name: "NYC YORP Registration Form (Form B)", match: /form\s*b\b|\bnyc\b/i },
  { name: "Endorsement Letter", match: /endorsement/i },
  { name: "List of Officers and Advisers", match: /officer/i },
  { name: "List of Members in Good Standing", match: /member/i },
  { name: "Constitution and By-Laws", match: /constitution|by-?laws/i },
];

export type OrganizationRequirementRow = { requirement: string; submissionDate: string; reviewStatus: string; approvedDate: string };

export type OrganizationYpopReport =
  | { hasParticipation: false; semester: string; summary: string }
  | {
    hasParticipation: true;
    semester: string;
    qualificationStatus: string;
    threshold: string;
    totalScore: string;
    cityLedPointsEarned: string;
    cityLedScore: string;
    orgLedActivityCount: string;
    orgLedBonus: string;
    cityLedBreakdown: Array<{ category: string; verified: number; pointsPerParticipation: number; pointsEarned: number }>;
    cityLedActivities: Array<{ name: string; category: string; date: string; status: string }>;
    orgLedActivities: Array<{ name: string; centers: string; date: string; status: string }>;
  };

export type OrganizationReport = {
  organizationName: string;
  urn: string;
  filename: string;
  profile: {
    organizationName: string; urn: string; verificationDate: string;
    majorClassification: string; subClassification: string; centersOfYouthParticipation: string; organizationalLevel: string;
    head: string; adviser: string;
    district: string; barangay: string; fullAddress: string;
    primaryEmail: string; additionalEmails: string; primaryContact: string; additionalContacts: string; facebookPage: string;
  };
  accreditation: { status: string; startDate: string; expirationDate: string; term: string };
  requirements: OrganizationRequirementRow[];
  ypop: OrganizationYpopReport;
};

const buildRequirementRows = (files: SubmissionFile[], templates: TemplateRecord[]): OrganizationRequirementRow[] => {
  const latestByType = new Map<string, { name: string; file: SubmissionFile }>();
  for (const file of files.filter(f => f.adminStatus !== "draft")) {
    const template = templates.find(t => t.id === file.documentTypeId || t.databaseId === file.documentTypeId);
    const name = file.documentTypeName || template?.name || label(file.documentTypeId);
    const key = YORP_REQUIREMENTS.find(item => item.match.test(name))?.name ?? name;
    const current = latestByType.get(key);
    const uploaded = file.uploadedAt || file.createdAt || "";
    if (!current || uploaded > (current.file.uploadedAt || current.file.createdAt || "")) latestByType.set(key, { name: key, file });
  }
  const row = (requirement: string): OrganizationRequirementRow => {
    const file = latestByType.get(requirement)?.file;
    if (!file) return { requirement, submissionDate: "—", reviewStatus: "Not submitted", approvedDate: "—" };
    return {
      requirement,
      submissionDate: date(file.uploadedAt || file.createdAt),
      reviewStatus: statusLabelMap[file.adminStatus] || "Not available",
      approvedDate: file.adminStatus === "approved_green" ? date(file.reviewedAt || file.updatedAt) : "—",
    };
  };
  const canonical = YORP_REQUIREMENTS.map(item => row(item.name));
  const extras = [...latestByType.keys()].filter(key => !YORP_REQUIREMENTS.some(item => item.name === key)).sort().map(row);
  return [...canonical, ...extras];
};

/** Project approved scoped metadata into printable cells; never retain Storage URLs. */
export function buildOrganizationReport(
  entry: YorpRegistryEntry,
  period: YPOPPeriod | null,
  ypopEntry: YPOPEntry | null,
  ypop: ReturnType<typeof buildRegistryYpopDetail>,
  files: SubmissionFile[],
  templates: TemplateRecord[],
): OrganizationReport {
  const org = entry.org;
  const semester = period?.semesterLabel || period?.semesterKey || "No open period";
  const hasParticipation = Boolean(ypop && (ypopEntry || ypop.joinedActivities.length || ypop.orgActivities.length));
  const threshold = `${ypopEntry?.pointsRequired ?? YPOP_SCORE_THRESHOLD}%`;

  let ypopReport: OrganizationYpopReport = {
    hasParticipation: false,
    semester,
    summary: period ? "No YPOP participation data is available for this semester." : "No open YPOP period.",
  };
  if (ypop && hasParticipation) {
    const categories: YPOPCityActivityCategory[] = ["mandatory", "invitational", "partnership"];
    ypopReport = {
      hasParticipation: true,
      semester,
      qualificationStatus: ypop.isQualified ? "Qualified" : "Not Qualified",
      threshold,
      totalScore: `${ypop.totalScore}%`,
      cityLedPointsEarned: `${ypop.cityLedEarned} / ${ypop.cityLedMax}`,
      cityLedScore: `${ypop.cityLedPercent}%`,
      orgLedActivityCount: String(ypop.approvedOrgActivityCount),
      orgLedBonus: `${ypop.orgLedBonus}%`,
      cityLedBreakdown: categories.map(category => {
        const item = ypop.categoryBreakdown.find(entry => entry.category === category);
        return {
          category: YPOP_CITY_LED_CATEGORY_LABELS[category],
          verified: item?.attendedCount ?? 0,
          pointsPerParticipation: YPOP_CITY_LED_CATEGORY_POINTS[category],
          pointsEarned: item?.earnedPts ?? 0,
        };
      }),
      cityLedActivities: ypop.joinedActivities.map(activity => ({
        name: value(activity.participation.activityName),
        category: YPOP_CITY_LED_CATEGORY_LABELS[activity.category],
        date: date(activity.activityDate || activity.participation.activityDate),
        status: label(activity.participation.status),
      })),
      orgLedActivities: ypop.orgActivities.map(activity => ({
        name: value(activity.activityName),
        centers: "—",
        date: date(activity.activityDate),
        status: label(activity.status),
      })),
    };
  }

  const organizationFilename = filenameSegment(org.organizationName, "_") || "Organization";
  const urnFilename = filenameSegment(org.urn || org.id, "-") || "Unknown_URN";
  return {
    organizationName: org.organizationName,
    urn: value(org.urn),
    filename: `YORP_Organization_Report_${organizationFilename}_${urnFilename}.pdf`,
    profile: {
      organizationName: value(org.organizationName),
      urn: value(org.urn),
      verificationDate: date(org.verifiedAt),
      majorClassification: value(org.majorClassification),
      subClassification: value(formatSubClassificationLabel(org.subClassification)),
      centersOfYouthParticipation: [...(org.advocacies ?? [])]
        .sort((a, b) => centerOfYouthParticipationRank(a) - centerOfYouthParticipationRank(b))
        .map(formatCenterOfYouthParticipation).join(", ") || "Not provided",
      organizationalLevel: "City/Municipal",
      head: value(getRepresentativeDisplayName(org)),
      adviser: value(getAdviserDisplayName(org)),
      district: value(org.district),
      barangay: value(org.barangay),
      fullAddress: value(getOrganizationAddressDisplay(org)),
      primaryEmail: value(org.organizationEmail),
      additionalEmails: org.additionalEmails?.filter(Boolean).join("\n") || "None",
      primaryContact: value(org.contactNumber),
      additionalContacts: org.additionalContactNumbers?.filter(Boolean).join("\n") || "None",
      facebookPage: value(org.facebookPageUrl),
    },
    accreditation: {
      status: label(entry.yorpStatus),
      startDate: date(entry.registrationDate),
      expirationDate: date(entry.expiryDate),
      term: `${date(entry.registrationDate)} – ${date(entry.expiryDate)}`,
    },
    requirements: buildRequirementRows(files, templates),
    ypop: ypopReport,
  };
}

// Column grids measured from the reference (451pt content width at 1" margins).
const quarterColumns = (r: OfficialReport) => {
  const w = r.width / 4;
  return { 0: { cellWidth: w }, 1: { cellWidth: w }, 2: { cellWidth: w }, 3: { cellWidth: w } };
};
const pairColumns = (r: OfficialReport) => ({ 0: { cellWidth: 163 }, 1: { cellWidth: r.width - 163 } });

const fieldGrid = (r: OfficialReport, title: string, rows: Array<Array<[string, string]>>) => {
  drawOfficialTable(r, {
    title,
    fontSize: 10,
    border: "soft",
    columnCount: 4,
    columnStyles: quarterColumns(r),
    body: rows.map(pairs => pairs.length === 1
      ? [bold(r, pairs[0][0]), { content: pairs[0][1], colSpan: 3 }]
      : pairs.flatMap(([key, val]) => [bold(r, key), val])),
    gapAfter: 16,
  });
};

const fieldList = (r: OfficialReport, title: string, rows: Array<[string, string]>) => {
  drawOfficialTable(r, {
    title, fontSize: 10, border: "soft", columnCount: 2, columnStyles: pairColumns(r),
    body: rows.map(([key, val]) => [bold(r, key), val]), gapAfter: 16,
  });
};

export async function generateOrganizationReportPdf(report: OrganizationReport, context: ReportGenerationContext = {}) {
  const r = await createOfficialReport();
  const { doc } = r;
  const heading = buildAdminReportHeading({ program: "yorp", title: "Organization Report", ...context });
  drawOfficialHeading(r, {
    heading: { ...heading, reportingLines: [] },
    metrics: [{ label: "Organization", value: report.organizationName }, { label: "Unique Registration Number (URN)", value: report.urn }],
  });

  const p = report.profile;
  drawSectionTitle(r, "A.  Organization Profile");
  fieldGrid(r, "1. Organization Profile", [
    [["Organization Name", p.organizationName]],
    [["Unique Registration Number (URN)", p.urn], ["Verification Date", p.verificationDate]],
  ]);
  fieldGrid(r, "2. Organization Classification", [
    [["Major Classification", p.majorClassification], ["Sub-Classification", p.subClassification]],
    [["Centers of Youth Participation", p.centersOfYouthParticipation], ["Organizational Level", p.organizationalLevel]],
  ]);
  fieldList(r, "3. Organization Leadership", [["Head of Organization", p.head], ["Adviser of Organization", p.adviser]]);
  fieldGrid(r, "4. Organization Location", [
    [["District", p.district], ["Barangay", p.barangay]],
    [["Full Address", p.fullAddress]],
  ]);
  fieldGrid(r, "5. Contact Information", [
    [["Primary Email Address", p.primaryEmail], ["Primary Contact Number", p.primaryContact]],
    [["Additional Email Addresses", p.additionalEmails], ["Additional Contact Numbers", p.additionalContacts]],
    [["Facebook Page", p.facebookPage]],
  ]);

  const a = report.accreditation;
  drawSectionTitle(r, "B.  Youth Organization Registration Program");
  fieldGrid(r, "1. YORP Accreditation", [
    [["Accreditation Status", a.status], ["Accreditation Start Date", a.startDate]],
    [["Accreditation Expiration Date", a.expirationDate], ["Accreditation Term", a.term]],
  ]);
  drawOfficialTable(r, {
    title: "2. YORP Requirements", fontSize: 10, border: "soft",
    head: ["Requirement", "Submission Date", "Review Status", "Approved Date"],
    columnStyles: { 0: { cellWidth: 193 }, 1: { cellWidth: 87 }, 2: { cellWidth: 86 }, 3: { cellWidth: r.width - 366 } },
    body: report.requirements.map(row => [row.requirement, row.submissionDate, row.reviewStatus, row.approvedDate]),
  });

  drawSectionTitle(r, "C.  Youth Participation Organization Passport");
  const y = report.ypop;
  if ("summary" in y) {
    fieldList(r, "1. Participation Summary", [["Semester", y.semester], ["Participation Summary", y.summary]]);
  } else {
    fieldGrid(r, "1. Participation Summary", [
      [["Semester", y.semester], ["Qualification Status", y.qualificationStatus]],
      [["Qualification Threshold", y.threshold], ["Total YPOP Score", y.totalScore]],
      [["City-led Points Earned", y.cityLedPointsEarned], ["City-Led Score", y.cityLedScore]],
      [["Total Organization-led Activities", y.orgLedActivityCount], ["Organization-led Bonus", y.orgLedBonus]],
    ]);
    const right = { halign: "right" as const };
    drawOfficialTable(r, {
      title: "2.1 City-led Points Breakdown", fontSize: 10, border: "soft",
      head: ["Category", "Verified Participations", "Points per Participation", "Points Earned"],
      columnStyles: quarterColumns(r),
      body: [
        ...y.cityLedBreakdown.map(row => [row.category, String(row.verified), bold(r, row.pointsPerParticipation, right), String(row.pointsEarned)]),
        [bold(r, "Total"), bold(r, y.cityLedBreakdown.reduce((sum, row) => sum + row.verified, 0)), "",
          bold(r, y.cityLedBreakdown.reduce((sum, row) => sum + row.pointsEarned, 0))],
      ],
    });
    const activityColumns = { 0: { cellWidth: 32, halign: "center" as const }, 1: { cellWidth: 135 }, 2: { cellWidth: 98 }, 3: { cellWidth: 98 }, 4: { cellWidth: r.width - 363 } };
    drawOfficialTable(r, {
      title: "2.2  City-led Activities Attended", fontSize: 10, border: "soft",
      head: ["No.", "Activity Name", "Category", "Activity Date", "Status"], columnStyles: activityColumns,
      body: y.cityLedActivities.length
        ? y.cityLedActivities.map((row, index) => [String(index + 1), row.name, row.category, row.date, row.status])
        : [[{ content: "No city-led activities attended this semester.", colSpan: 5, styles: { textColor: OFFICIAL_REPORT_COLORS.muted } }]],
    });
    drawOfficialTable(r, {
      title: "3. Organization-led Activities Conducted", fontSize: 10, border: "soft",
      head: ["No.", "Activity Name", "Centers of Youth Participation", "Activity Date", "Status"],
      columnStyles: { 0: { cellWidth: 32, halign: "center" as const }, 1: { cellWidth: 135 }, 2: { cellWidth: 135 }, 3: { cellWidth: 78 }, 4: { cellWidth: r.width - 380 } },
      body: [
        ...(y.orgLedActivities.length
          ? y.orgLedActivities.map((row, index) => [String(index + 1), row.name, row.centers, row.date, row.status])
          : [[{ content: "No approved organization-led activities this semester.", colSpan: 5, styles: { textColor: OFFICIAL_REPORT_COLORS.muted } }]]),
        ["", bold(r, "Total"), bold(r, y.orgLedActivities.length), "", ""],
      ],
    });
    drawOfficialTable(r, {
      title: "4. Total YPOP Score Breakdown", fontSize: 10, border: "soft",
      head: ["Component", { content: "Value", styles: { ...bold(r, "").styles, halign: "right" } }],
      columnStyles: { 0: { cellWidth: r.width * 0.5 }, 1: { cellWidth: r.width * 0.5, halign: "right" } },
      body: [
        ["City-Led Score", y.cityLedScore],
        ["Organization-Led Bonus", y.orgLedBonus],
        [bold(r, "Total YPOP Score"), y.totalScore],
        ["Qualification Threshold", y.threshold],
        ["Qualification Result", y.qualificationStatus],
      ],
    });
  }
  return doc;
}
