import { jsPDF } from "jspdf";
import autoTable, { type CellDef, type CellHookData, type RowInput, type Styles } from "jspdf-autotable";
import { ensurePdfFonts } from "./report-export";
import {
  PCYDO_FOOTER_ASPECT_RATIO,
  PCYDO_FOOTER_DATA_URL,
  PCYDO_HEADER_ASPECT_RATIO,
  PCYDO_HEADER_DATA_URL,
} from "./report-letterhead-assets";
import type { OfficialSignatory } from "./admin-system-settings";
import {
  budgetItemTotal,
  compactProposalForm,
  formatImplementationTimeline,
  programmeRowTime,
  proposalBudgetTotal,
  PROPOSAL_TEAM_SIZE,
  type BudgetProposalForm,
} from "./budget-proposal";

type Rgb = [number, number, number];
const YELLOW: Rgb = [255, 255, 0];
const LABEL_BLUE: Rgb = [180, 199, 231];
const BLACK: Rgb = [0, 0, 0];
const MARGIN = 60;

const money = (value: number) => value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantity = (value: number) => value.toLocaleString("en-PH", { maximumFractionDigits: 2 });

export type ProposalPdfInput = {
  form: BudgetProposalForm;
  /** The selected Center of Youth Participation for this request. */
  centerOfParticipation: string;
  reviewers: OfficialSignatory[];
  approver: OfficialSignatory;
};

/** Builds the official PCYDO Project Proposal (template layout) from the org's answers. */
export async function generateBudgetProposalPdf({ form: rawForm, centerOfParticipation, reviewers, approver }: ProposalPdfInput): Promise<jsPDF> {
  const form = compactProposalForm(rawForm);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  await ensurePdfFonts(doc);
  const unicode = Boolean((doc as jsPDF & { __yTraceSegoeFontLoaded?: boolean }).__yTraceSegoeFontLoaded);
  const font = unicode ? "SegoeUI" : "helvetica";
  const boldFont = unicode ? "SegoeUIBold" : "helvetica";
  doc.setProperties({ title: `Project Proposal - ${form.projectTitle}`, author: form.organizationName });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerHeight = pageWidth / PCYDO_HEADER_ASPECT_RATIO;
  const footerHeight = pageWidth / PCYDO_FOOTER_ASPECT_RATIO;
  const top = headerHeight + 14;
  const bottom = pageHeight - footerHeight - 14;
  const width = pageWidth - MARGIN * 2;
  let y = top;

  const bold: Partial<Styles> = { font: boldFont, fontStyle: "bold" };
  const setText = (size: number, isBold = false) => {
    doc.setFont(isBold ? boldFont : font, isBold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...BLACK);
  };
  const centered = (text: string, size = 11) => {
    setText(size, true);
    doc.text(text, pageWidth / 2, y, { align: "center" });
    y += size + 10;
  };

  // Label cells hold a bold title over a lighter hint, like the template's blue column.
  type LabelRaw = CellDef & { label?: { title: string; hint?: string } };
  const label = (title: string, hint?: string, extra: Partial<Styles> = {}): LabelRaw => ({
    content: hint ? `${title}\n${hint}` : title,
    label: { title, hint },
    styles: { ...bold, fillColor: LABEL_BLUE, halign: "center", valign: "top", ...extra },
  });
  const blueHead = (content: string, extra: Partial<Styles> = {}): CellDef => ({ content, styles: { ...bold, fillColor: LABEL_BLUE, halign: "center", ...extra } });
  const yellowBar = (content: string, colSpan: number): CellDef => ({ content, colSpan, styles: { ...bold, fillColor: YELLOW, halign: "center" } });
  const answer = (content: string, extra: Partial<Styles> = {}): CellDef => ({ content, styles: { valign: "top", ...extra } });

  const table = (body: RowInput[], columnStyles: Record<number, Partial<Styles>>, head?: RowInput[], gapAfter = 18) => {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top, bottom: pageHeight - bottom },
      head,
      body,
      theme: "grid",
      showHead: "everyPage",
      tableWidth: width,
      styles: { font, fontSize: 9.5, textColor: BLACK, lineColor: BLACK, lineWidth: 0.75, cellPadding: 5, overflow: "linebreak", valign: "middle", fillColor: false },
      headStyles: { fillColor: false, textColor: BLACK },
      columnStyles,
      willDrawCell: (data: CellHookData) => {
        if ((data.cell.raw as LabelRaw)?.label) data.cell.text = [];
      },
      didDrawCell: (data: CellHookData) => {
        const raw = (data.cell.raw as LabelRaw)?.label;
        if (!raw) return;
        const center = data.cell.x + data.cell.width / 2;
        const innerWidth = data.cell.width - 8;
        let lineY = data.cell.y + 13;
        setText(9.5, true);
        for (const line of doc.splitTextToSize(raw.title, innerWidth) as string[]) {
          doc.text(line, center, lineY, { align: "center" });
          lineY += 11.5;
        }
        if (raw.hint) {
          setText(8.5);
          for (const line of doc.splitTextToSize(raw.hint, innerWidth) as string[]) {
            doc.text(line, center, lineY, { align: "center" });
            lineY += 10.5;
          }
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + gapAfter;
  };
  const newPage = () => {
    doc.addPage();
    y = top;
  };
  const ensureSpace = (height: number) => {
    if (y + height > bottom) newPage();
  };

  // Page 1 — Organization details.
  centered("PROJECT PROPOSAL", 11);
  const labelWidth = 92;
  const team = form.teamMembers.slice(0, PROPOSAL_TEAM_SIZE);
  const half = PROPOSAL_TEAM_SIZE / 2;
  // Three stacked tables so each part keeps the template's own column widths.
  const valueWidth = width - labelWidth;
  table(
    [
      [yellowBar("ORGANIZATION DETAILS", 4)],
      [label("Name of Organization"), answer(form.organizationName), label("Barangay:"), answer(form.barangay)],
      [label("Center of Participation"), { ...answer(centerOfParticipation), colSpan: 3 }],
      [label("Project Head"), { ...answer(form.projectHead), colSpan: 3 }],
      [label("Contact Number"), answer(form.contactNumber), label("E-mail Address"), answer(form.email)],
    ],
    { 0: { cellWidth: labelWidth }, 1: { cellWidth: valueWidth * 0.4 }, 2: { cellWidth: valueWidth * 0.2 } },
    undefined,
    0,
  );
  table(
    [
      [{ ...blueHead("Team Members"), colSpan: 4 }],
      [blueHead("NAME"), blueHead("ROLE"), blueHead("NAME"), blueHead("ROLE")],
      ...Array.from({ length: half }, (_, i) => [
        answer(`${i + 1}   ${team[i]?.name ?? ""}`),
        answer(team[i]?.role ?? ""),
        answer(`${i + half + 1}   ${team[i + half]?.name ?? ""}`),
        answer(team[i + half]?.role ?? ""),
      ]),
    ],
    { 0: { cellWidth: width * 0.32 }, 1: { cellWidth: width * 0.17 }, 2: { cellWidth: width * 0.34 } },
    undefined,
    0,
  );
  table(
    [[label("About the Organization:", "(Description of your organization)", { minCellHeight: 160 }), answer(form.aboutOrganization)]],
    { 0: { cellWidth: labelWidth } },
  );

  // Project proposal narrative.
  newPage();
  const narrativeLabel = 130;
  const section = (title: string, hint: string, value: string, minCellHeight = 70): RowInput =>
    [label(title, hint, { minCellHeight }), answer(value)];
  table(
    [
      [yellowBar("PROJECT PROPOSAL", 2)],
      section("Project Title", "(Think of a creative title or include the subtitle)", form.projectTitle, 50),
      section("Implementation Timeline", "(Date and Time of Implementation)", formatImplementationTimeline(form), 50),
      section("Project Overview", "(Provide a description of your project, what is it all about?)", form.projectOverview, 110),
      section("Rationale", "(You can include legal basis or existing successful projects in connection of your project)", form.rationale, 110),
      section("Target Participants", "(Who will benefit your project?)", form.targetParticipants),
      section("Methodology/Project Design", "(Steps/process of the activity in achieving your project; from planning to evaluation)", form.methodology, 110),
      section("Objectives", "(Describes what a participant is expected to know, understand, or demonstrate to prove that learning has taken place)", form.objectives, 110),
      section("Expected Output", "(What will be the output of the project? Tangible/Physical, a person or thing)", form.expectedOutput, 110),
    ],
    { 0: { cellWidth: narrativeLabel } },
  );

  // Programme.
  ensureSpace(110);
  centered("COURSE CONTENT AND SESSION FLOW", 10.5);
  centered("PROGRAMME", 10.5);
  table(
    form.programme.map(row => [answer(programmeRowTime(row)), answer(row.activity), answer(row.personAssigned)]),
    { 0: { cellWidth: 125 }, 2: { cellWidth: 120 } },
    [[blueHead("TIME"), blueHead("TOPIC/ACTIVITY"), blueHead("PERSON ASSIGNED")]],
  );

  // Budgetary requirements.
  ensureSpace(110);
  centered("BUDGETARY REQUIREMENTS: (MAXIMUM OF PHP 50,000.00)", 10.5);
  const right = { halign: "right" as const };
  table(
    [
      ...form.budgetItems.map(item => [
        answer(item.description),
        answer(quantity(item.quantity), { halign: "center" }),
        answer(item.units, { halign: "center" }),
        answer(money(item.unitCost), right),
        answer(money(budgetItemTotal(item)), right),
      ]),
      [{ content: "TOTAL:", colSpan: 4, styles: { ...bold, halign: "right" } }, { content: money(proposalBudgetTotal(form)), styles: { ...bold, ...right } }],
    ],
    { 0: { cellWidth: width * 0.3 }, 1: { cellWidth: width * 0.15 }, 2: { cellWidth: width * 0.13 }, 3: { cellWidth: width * 0.17 } },
    [[blueHead("DETAILS/ DESCRIPTION"), blueHead("QUANTITY"), blueHead("UNITS"), blueHead("UNIT COST"), blueHead("TOTAL")]],
  );

  // Sign-off page.
  newPage();
  const lineWidth = 170;
  const signLine = (name: string, caption: string) => {
    y += 30;
    setText(10, true);
    if (name) doc.text(name, MARGIN, y - 4, { maxWidth: lineWidth + 120 });
    doc.setLineWidth(0.75);
    doc.line(MARGIN, y, MARGIN + lineWidth, y);
    setText(10);
    doc.text(caption, MARGIN, y + 13);
    y += 18;
  };
  const block = (heading: string, name: string, role: string) => {
    setText(10, true);
    doc.text(heading, MARGIN, y);
    y += 6;
    signLine(name, role);
    signLine(form.organizationName, "(Name of the Organization)");
    y += 22;
  };
  block("PREPARED BY:", form.preparedBy, "Secretary");
  block("NOTED BY:", form.notedBy, "President");

  const officialSignatory = (signatory: OfficialSignatory, center: number, startY: number) => {
    setText(10, true);
    doc.text(signatory.name, center, startY, { align: "center" });
    setText(9.5);
    doc.text(signatory.position, center, startY + 13, { align: "center" });
    doc.text("Pasig City Youth Development Office", center, startY + 25, { align: "center" });
  };
  y += 10;
  centered("REVIEWED BY:", 10);
  y += 34;
  const columns = reviewers.length > 1 ? [pageWidth * 0.3, pageWidth * 0.7] : [pageWidth / 2];
  reviewers.forEach((signatory, index) => officialSignatory(signatory, columns[index] ?? pageWidth / 2, y));
  y += 70;
  centered("APPROVED BY:", 10);
  y += 34;
  officialSignatory(approver, pageWidth / 2, y);

  // Letterhead on every page, drawn last so tables never cover it.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.addImage(PCYDO_HEADER_DATA_URL, "JPEG", 0, 0, pageWidth, headerHeight);
    doc.addImage(PCYDO_FOOTER_DATA_URL, "JPEG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
  }
  return doc;
}

/** The generated proposal as an upload-ready PDF file. */
export async function buildBudgetProposalFile(input: ProposalPdfInput): Promise<File> {
  const doc = await generateBudgetProposalPdf(input);
  const safeTitle = input.form.projectTitle.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "Project";
  return new File([doc.output("blob")], `Project-Proposal-${safeTitle}.pdf`, { type: "application/pdf" });
}
