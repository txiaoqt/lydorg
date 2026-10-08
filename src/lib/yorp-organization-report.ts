import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { PCYDO_HEADER_DATA_URL, PCYDO_FOOTER_DATA_URL } from "./report-letterhead-assets";
import {
  getRepresentativeDisplayName, getAdviserDisplayName, getOrganizationAddressDisplay,
  formatSubClassificationLabel, YPOP_CITY_LED_CATEGORY_LABELS, YPOP_SCORE_THRESHOLD, statusLabelMap,
  type SubmissionFile, type TemplateRecord, type YPOPPeriod, type YPOPEntry,
} from "./lydo-connect-data";
import { buildRegistryYpopDetail } from "./yorp-registry-detail";
import {
  applyOfficialTemplateBackground, buildPdfHeaderLayout, renderPdfPageDecoration,
  ensurePdfFonts, PDF_COLORS,
} from "./report-export";
import type { YorpRegistryEntry } from "../admin/components/YorpRegistryTable";

const label = (value?: string) => value?.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Not available";
const value = (input?: string | null) => input?.trim() || "Not provided";
const date = (input?: string | Date) => {
  const parsed = input ? new Date(input) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? format(parsed, "d MMM yyyy") : "Not available";
};
const slug = (input: string) => input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "organization";
export type OrganizationReportSection = { title: string; columns?: string[]; rows: string[][] };
export type OrganizationReport = { organizationName: string; urn: string; filename: string; sections: OrganizationReportSection[] };

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
  const sections: OrganizationReportSection[] = [
    { title: "1. Organization Information", rows: [
      ["Organization Name", value(org.organizationName)], ["URN", value(org.urn)],
      ["Verified Date", date(org.verifiedAt)],
    ] },
    { title: "2. Accreditation", rows: [
      ["Status", label(entry.yorpStatus)], ["Registration / Accreditation Start", date(entry.registrationDate)],
      ["Expiration Date", date(entry.expiryDate)],
      ["Accreditation Term", `${date(entry.registrationDate)} – ${date(entry.expiryDate)}`],
    ] },
    { title: "3. Classification", rows: [
      ["Major Classification", value(org.majorClassification)],
      ["Sub-classification", value(formatSubClassificationLabel(org.subClassification))],
      ["Centers of Youth Participation / Advocacies", org.advocacies?.map(a => a.replace(/\b\w/g, c => c.toUpperCase())).join(", ") || "Not provided"],
      ["Level", "City/Municipal"],
    ] },
    { title: "4. Leadership", rows: [
      ["Head / Representative", value(getRepresentativeDisplayName(org))],
      ["Adviser", value(getAdviserDisplayName(org))],
    ] },
    { title: "5. Location", rows: [
      ["District", value(org.district)], ["Barangay", value(org.barangay)],
      ["Full Address", value(getOrganizationAddressDisplay(org))],
    ] },
    { title: "6. Contact Information", rows: [
      ["Primary Email", value(org.organizationEmail)], ["Additional Emails", org.additionalEmails?.filter(Boolean).join("\n") || "None"],
      ["Primary Contact Number", value(org.contactNumber)],
      ["Additional Contact Numbers", org.additionalContactNumbers?.filter(Boolean).join("\n") || "None"],
      ["Facebook Page", value(org.facebookPageUrl)],
    ] },
  ];
  const hasParticipation = ypop && (ypopEntry || ypop.joinedActivities.length || ypop.orgActivities.length);
  sections.push({ title: "7. YPOP Participation", rows: hasParticipation ? [
    ["Period / Semester", period?.semesterLabel || period?.semesterKey || "Not available"],
    ["Qualification", ypop.isQualified ? "Qualified" : "Not Qualified"],
    ["Total Score", `${ypop.totalScore}%`], ["Points Required", `${ypopEntry?.pointsRequired ?? YPOP_SCORE_THRESHOLD}%`],
    ["City-led Score", `${ypop.cityLedPercent}%`], ["City-led Earned / Maximum", `${ypop.cityLedEarned} / ${ypop.cityLedMax}`],
    ["Organization-led Bonus", `${ypop.orgLedBonus}%`], ["Approved Organization-led Projects", `${ypop.approvedOrgActivityCount}`],
  ] : [["Participation", "No YPOP participation data is available for the current period."],
    ["Period / Semester", period?.semesterLabel || period?.semesterKey || "No open period"]] });
  if (hasParticipation) {
    sections.push({ title: "7. YPOP — City-led Points Breakdown",
      columns: ["Category", "Applicable", "Verified", "Points / Activity", "Earned", "Maximum"],
      rows: ypop.categoryBreakdown.map(c => [YPOP_CITY_LED_CATEGORY_LABELS[c.category], `${c.count}`, `${c.attendedCount}`, `${c.pointsPerActivity}`, `${c.earnedPts}`, `${c.maxPts}`]),
    }, { title: "7. YPOP — Joined City-led Activities",
      columns: ["Activity", "Date", "Category", "Points", "Review Status"],
      rows: ypop.joinedActivities.map(a => [value(a.participation.activityName), date(a.activityDate), YPOP_CITY_LED_CATEGORY_LABELS[a.category], `${a.points}`, label(a.participation.status)]),
    }, { title: "7. YPOP — Approved Organization-led Activities",
      columns: ["Activity / Project", "Activity Date", "Status"],
      rows: ypop.orgActivities.map(a => [value(a.activityName), date(a.activityDate), label(a.status)]),
    });
  }
  sections.push({ title: "8. Submitted Documents", columns: ["Document Type", "File Name", "Size", "Uploaded / Submitted", "Review Status"],
    rows: files.filter(f => f.adminStatus !== "draft").map(f => {
      const template = templates.find(t => t.id === f.documentTypeId || t.databaseId === f.documentTypeId);
      const bytes = f.fileSize;
      return [value(f.documentTypeName || template?.name || label(f.documentTypeId)), value(f.fileName),
        bytes > 0 ? bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB` : "Not available",
        date(f.uploadedAt || f.createdAt), statusLabelMap[f.adminStatus] || "Not available"];
    }),
  });
  return { organizationName: org.organizationName, urn: value(org.urn),
    filename: `yorp-organization-report-${slug(org.organizationName)}-${slug(org.urn || org.id)}.pdf`, sections };
}

export async function generateOrganizationReportPdf(report: OrganizationReport) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  applyOfficialTemplateBackground(doc);
  await ensurePdfFonts(doc);
  const unicode = Boolean((doc as jsPDF & { __yTraceSegoeFontLoaded?: boolean }).__yTraceSegoeFontLoaded);
  (doc as jsPDF & { __yTraceUseUnicodeFont?: boolean }).__yTraceUseUnicodeFont = unicode;
  const font = unicode ? "SegoeUI" : "helvetica";
  const boldFont = unicode ? "SegoeUIBold" : "helvetica";
  doc.setFont(font, "normal");
  const layout = await buildPdfHeaderLayout(doc, {
    config: { title: "YORP Organization Report", filenamePrefix: "yorp-organization-report", columns: [] }, rows: [],
    metadataLines: [`Organization: ${report.organizationName}`, `URN: ${report.urn}`, "Generated by: Administrator"],
  }, 30, 30);
  let y = layout.startY;
  const bottom = layout.pageHeight - layout.footerHeight - 20;
  for (const section of report.sections) {
    const columns = section.columns?.length || 2;
    if (y + 85 > bottom) { doc.addPage(); y = layout.continuationTop; }
    const titleCell = { content: section.title, colSpan: columns, styles: { font: boldFont, fontStyle: "bold" as const, fillColor: [...PDF_COLORS.darkBlue] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } };
    autoTable(doc, {
      startY: y,
      margin: { left: 30, right: 30, top: layout.continuationTop, bottom: layout.footerHeight + 20 },
      head: section.columns ? [[titleCell], section.columns] : [[titleCell]],
      body: section.rows.length ? section.rows : [[{ content: section.title.startsWith("8.") ? "No submitted registration documents are available." : "No activities are available for this period.", colSpan: columns }]],
      theme: "grid", rowPageBreak: "avoid", showHead: "everyPage",
      styles: { font, fontStyle: "normal", fontSize: 8.5, cellPadding: 6, overflow: "linebreak", lineColor: [...PDF_COLORS.border] as [number, number, number], lineWidth: 0.4, textColor: [...PDF_COLORS.text] as [number, number, number] },
      headStyles: { font: boldFont, fontStyle: "bold", fillColor: [...PDF_COLORS.lightBlue] as [number, number, number], textColor: [...PDF_COLORS.text] as [number, number, number] },
      alternateRowStyles: { fillColor: [...PDF_COLORS.zebra] as [number, number, number] },
      columnStyles: section.title.startsWith("8.") ? {
        0: { cellWidth: 115 }, 1: { cellWidth: 170 }, 2: { cellWidth: 45 },
        3: { cellWidth: 100 }, 4: { cellWidth: 105.28 },
      } : section.columns ? {} : { 0: { cellWidth: 165 } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    // Explicit branding also keeps continuation pages consistent across PDF renderers.
    doc.addImage(PCYDO_HEADER_DATA_URL, "PNG", 0, 0, layout.pageWidth, layout.headerHeight);
    doc.addImage(PCYDO_FOOTER_DATA_URL, "PNG", 0, layout.pageHeight - layout.footerHeight, layout.pageWidth, layout.footerHeight);
    renderPdfPageDecoration(doc, layout, page, pages);
  }
  return doc;
}
