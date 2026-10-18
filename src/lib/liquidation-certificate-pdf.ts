import { jsPDF } from "jspdf";
import { PCYDO_A4_TEMPLATE_DATA_URL } from "./report-letterhead-assets";
import { ensurePdfFonts } from "./report-export";
import type { LiquidationCertificate } from "./liquidation-certificate";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric",
});
const moneyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

/** Render the supplied certificate template using recorded metadata, without reading or uploading private files. */
export async function generateLiquidationCertificatePdf(certificate: LiquidationCertificate): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  await ensurePdfFonts(doc);
  if (!doc.getFontList().SegoeUI || !doc.getFontList().SegoeUIBold) {
    throw new Error("CERTIFICATE_FONT_UNAVAILABLE");
  }

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  // This existing background matches the attached PCYDO letterhead, watermark and footer.
  doc.addImage(PCYDO_A4_TEMPLATE_DATA_URL, "JPEG", 0, 0, width, height);
  doc.setProperties({ title: "Certification of Budget Liquidation", author: "Pasig City Youth Development Office" });
  doc.setCreationDate(new Date(certificate.completedAt));
  doc.setTextColor(24, 32, 44);
  doc.setFont("SegoeUIBold", "bold");
  doc.setFontSize(17);
  doc.text("CERTIFICATION OF BUDGET LIQUIDATION", width / 2, 132, { align: "center" });

  const left = 72;
  const bodyWidth = width - left * 2;
  const completedDate = dateFormatter.format(new Date(certificate.completedAt));
  const paragraphs = [
    `This is to certify that ${certificate.organizationName}, represented by ${certificate.representativeName}, has submitted the liquidation documents for the approved budget allocated to ${certificate.activityTitle}, under Budget Request ${certificate.budgetReference}.`,
    `Based on the liquidation documents submitted to and reviewed by the Pasig City Youth Development Office, the organization has completed the liquidation requirements for released funding of ${moneyFormatter.format(certificate.releasedAmount)} from an approved budget of ${moneyFormatter.format(certificate.approvedAmount)}. Detailed utilization and any remaining balance are recorded in the reviewed liquidation report.`,
    `PCYDO finalized the liquidation on ${completedDate}. It is hereby certified as LIQUIDATED, subject to the applicable requirements and verification procedures of the office.`,
    `This certification is issued to the organization for its records and as proof of budget liquidation on ${completedDate}, in Pasig City, Philippines.`,
  ];

  doc.setFont("SegoeUI", "normal");
  doc.setFontSize(11);
  doc.text("TO WHOM IT MAY CONCERN:", left, 201);

  // Fit complete names and references; never truncate identity or financial details.
  let layout: { fontSize: number; paragraphs: string[][] } | undefined;
  for (const fontSize of [11, 10.5, 10, 9.5]) {
    doc.setFontSize(fontSize);
    const wrapped = paragraphs.map(paragraph => doc.splitTextToSize(paragraph, bodyWidth) as string[]);
    const totalHeight = wrapped.reduce((sum, lines) => sum + lines.length * fontSize * 1.45 + 12, 0);
    if (230 + totalHeight <= 580) {
      layout = { fontSize, paragraphs: wrapped };
      break;
    }
  }
  if (!layout) throw new Error("CERTIFICATE_TEXT_EXCEEDS_PAGE");
  doc.setFontSize(layout.fontSize);
  let y = 230;
  for (const lines of layout.paragraphs) {
    doc.text(lines, left, y, { maxWidth: bodyWidth, lineHeightFactor: 1.45, align: "justify" });
    y += lines.length * layout.fontSize * 1.45 + 12;
  }

  const signatureCenter = width - 173;
  doc.setFont("SegoeUIBold", "bold");
  doc.setFontSize(11);
  doc.text("Alyssa Marie Dela Cruz", signatureCenter, 640, { align: "center" });
  doc.setFont("SegoeUI", "normal");
  doc.setFontSize(10);
  doc.text("Head of PCYDO", signatureCenter, 657, { align: "center" });
  doc.setFontSize(9);
  doc.text("Pasig City Youth Development Office", signatureCenter, 674, { align: "center" });

  doc.setFontSize(8.5);
  doc.text(`Document Reference No.: ${certificate.certificateReference}`, left, 735, { maxWidth: bodyWidth });
  doc.text(`Date Issued: ${completedDate}`, left, 753);
  return doc;
}
