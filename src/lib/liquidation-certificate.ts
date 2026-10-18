import { getRepresentativeDisplayName } from "./lydo-connect-data";
import type { BudgetRequest, LiquidationReport, OrganizationProfile } from "./lydo-connect-data";

export type LiquidationCertificateBudget = Pick<BudgetRequest,
  "id" | "activityTitle" | "approvedAmount" | "releasedAmount"
> & Partial<Pick<BudgetRequest, "organizationId" | "publicRecordCode">>;

export type LiquidationCertificateInput = {
  organization: OrganizationProfile | null | undefined;
  report: Pick<LiquidationReport, "id" | "organizationId" | "budgetRequestId" | "status" | "completedAt">;
  budget: LiquidationCertificateBudget | null | undefined;
};

export type LiquidationCertificate = {
  organizationName: string;
  representativeName: string;
  activityTitle: string;
  budgetReference: string;
  certificateReference: string;
  approvedAmount: number;
  releasedAmount: number;
  completedAt: string;
  filename: string;
};

type CertificateResult =
  | { available: true; certificate: LiquidationCertificate }
  | { available: false; reason: string };

const cleanText = (value: string | null | undefined) => (value ?? "")
  .normalize("NFC")
  .replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const slug = (value: string, maxLength: number) => value.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, maxLength)
  .toLowerCase();

/** Use only the current organization's loaded report and its matching budget. No financial values are inferred. */
export function buildLiquidationCertificate(input: LiquidationCertificateInput): CertificateResult {
  const { organization, report, budget } = input;
  const unavailable = (reason: string): CertificateResult => ({ available: false, reason });
  if (report.status !== "completed_liquidated") {
    return unavailable("The certificate becomes available after PCYDO marks this report as Liquidated.");
  }
  if (!organization?.id || organization.id !== report.organizationId || !report.id) {
    return unavailable("The organization details could not be verified. Reopen this report and try again.");
  }
  // The scoped report loaders also return a parent budget projection without organizationId.
  if (!budget || budget.id !== report.budgetRequestId ||
      (budget.organizationId !== undefined && budget.organizationId !== organization.id)) {
    return unavailable("The linked budget details are unavailable. Reopen this report and try again.");
  }
  const organizationName = cleanText(organization.organizationName);
  const representativeName = cleanText(getRepresentativeDisplayName(organization, ""));
  const activityTitle = cleanText(budget.activityTitle);
  if (!organizationName || !representativeName || !activityTitle) {
    return unavailable("The certificate needs the organization, representative and activity names. Please contact PCYDO.");
  }
  if (!report.completedAt || !Number.isFinite(new Date(report.completedAt).getTime())) {
    return unavailable("The report's completion date is missing. Please contact PCYDO for your certificate.");
  }
  if (!Number.isFinite(budget.approvedAmount) || budget.approvedAmount <= 0 ||
      !Number.isFinite(budget.releasedAmount) || budget.releasedAmount <= 0 ||
      budget.releasedAmount > budget.approvedAmount) {
    return unavailable("The recorded budget amounts need verification. Please contact PCYDO for your certificate.");
  }
  return {
    available: true,
    certificate: {
      organizationName,
      representativeName,
      activityTitle,
      budgetReference: cleanText(budget.publicRecordCode) || cleanText(budget.id),
      certificateReference: `BLC-${cleanText(report.id)}`,
      approvedAmount: budget.approvedAmount,
      releasedAmount: budget.releasedAmount,
      completedAt: report.completedAt,
      filename: `budget-liquidation-certificate-${slug(organizationName, 70) || "organization"}-${slug(report.id, 70)}.pdf`,
    },
  };
}
