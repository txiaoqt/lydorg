import type { LiquidationCertificateInput } from "@/lib/liquidation-certificate";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";

/** Synthetic metadata only. No accounts, endpoints, files or sessions are used. */
export function certificateInput(): LiquidationCertificateInput {
  return {
    organization: {
      id: "example-org-1", organizationName: "Example Youth Organization",
      representativeFirstName: "Andrea", representativeLastName: "Dela Peña",
      organizationEmail: "private-fixture@example.invalid",
    } as OrganizationProfile,
    report: {
      id: "example-liquidation-1", organizationId: "example-org-1", budgetRequestId: "example-budget-1",
      status: "completed_liquidated", completedAt: "2026-10-17T17:30:00Z",
    },
    budget: {
      id: "example-budget-1", organizationId: "example-org-1", activityTitle: "Youth Leadership Workshop",
      approvedAmount: 15000, releasedAmount: 12500, publicRecordCode: "BR-2026-EXAMPLE-001",
    },
  };
}
