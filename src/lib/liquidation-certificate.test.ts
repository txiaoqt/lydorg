import { describe, expect, it } from "vitest";
import { buildLiquidationCertificate } from "./liquidation-certificate";
import { certificateInput } from "@/test/fixtures/liquidation-certificate";
import type { LiquidationStatus } from "./lydo-connect-data";

describe("budget liquidation certificate metadata", () => {
  it("projects matching final metadata without inventing expenses or remaining balance", () => {
    const result = buildLiquidationCertificate(certificateInput());
    expect(result.available).toBe(true);
    if (!result.available) throw Error("Expected certificate");
    expect(result.certificate).toEqual({
      organizationName: "Example Youth Organization", representativeName: "Andrea Dela Peña",
      activityTitle: "Youth Leadership Workshop", budgetReference: "BR-2026-EXAMPLE-001",
      certificateReference: "BLC-example-liquidation-1", approvedAmount: 15000, releasedAmount: 12500,
      completedAt: "2026-10-17T17:30:00Z",
      filename: "budget-liquidation-certificate-example-youth-organization-example-liquidation-1.pdf",
    });
    expect(JSON.stringify(result)).not.toContain("private-fixture");
    expect(result.certificate).not.toHaveProperty("remainingBalance");
    expect(result.certificate).not.toHaveProperty("amountUtilized");
  });

  it.each<LiquidationStatus>([
    "pending_activity_completion", "not_started", "draft", "submitted", "under_review", "needs_revision",
    "approved_for_ftf_green", "rejected_red", "hard_copy_submitted", "overdue",
  ])("does not issue a certificate for %s", status => {
    const input = certificateInput();
    input.report.status = status;
    expect(buildLiquidationCertificate(input).available).toBe(false);
  });

  it("rejects another organization's report or mismatched budget parent", () => {
    const input = certificateInput();
    expect(buildLiquidationCertificate({ ...input, organization: { ...input.organization!, id: "another-org" } }).available).toBe(false);
    expect(buildLiquidationCertificate({ ...input, budget: { ...input.budget!, id: "another-budget" } }).available).toBe(false);
    expect(buildLiquidationCertificate({ ...input, budget: { ...input.budget!, organizationId: "another-org" } }).available).toBe(false);
    expect(buildLiquidationCertificate({ ...input, organization: null }).available).toBe(false);
    expect(buildLiquidationCertificate({ ...input, budget: null }).available).toBe(false);
  });

  it("accepts the scoped parent projection and uses its real ID when no display reference is recorded", () => {
    const input = certificateInput();
    delete input.budget!.organizationId;
    delete input.budget!.publicRecordCode;
    const result = buildLiquidationCertificate(input);
    expect(result.available && result.certificate.budgetReference).toBe("example-budget-1");
  });

  it.each(["", "not-a-date"])("does not substitute today's date for an invalid completion date (%s)", completedAt => {
    const input = certificateInput();
    input.report.completedAt = completedAt;
    expect(buildLiquidationCertificate(input).available).toBe(false);
  });

  it.each([[0, 15000], [-1, 15000], [NaN, 15000], [12500, 0], [12500, Infinity], [16000, 15000]])(
    "rejects unverified released/approved amounts: %s / %s", (releasedAmount, approvedAmount) => {
      const input = certificateInput();
      Object.assign(input.budget!, { releasedAmount, approvedAmount });
      expect(buildLiquidationCertificate(input).available).toBe(false);
    },
  );

  it("requires the recorded names and cleans control characters without losing Unicode names", () => {
    const input = certificateInput();
    input.organization!.organizationName = "  Example\u0000\nYouth \u202eOrganization  ";
    const result = buildLiquidationCertificate(input);
    expect(result.available && result.certificate.organizationName).toBe("Example Youth Organization");
    input.organization!.representativeFirstName = "";
    input.organization!.representativeLastName = "";
    expect(buildLiquidationCertificate(input).available).toBe(false);
  });
});
