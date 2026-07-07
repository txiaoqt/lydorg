import { describe, expect, it } from "vitest";
import {
  ORGANIZATION_DELETION_CATEGORIES,
  getOrganizationDeletionServiceError,
  normalizeOrganizationDeletionConfirmation,
  organizationDeletionConfirmationMatches,
} from "./admin-organization-deletion";

describe("organization deletion explanation", () => {
  it("uses the fixed category list without server-derived counts", () => {
    expect(ORGANIZATION_DELETION_CATEGORIES).toEqual([
      "Account and organization profile",
      "Compliance documents and uploaded files",
      "Budget requests and attachments",
      "Liquidation reports and attachments",
      "YPOP participation, activities, and supporting files",
      "Inquiries, notifications, and related organization records",
    ]);
  });
});

describe("organization deletion confirmation", () => {
  it("trims edges and normalizes repeated whitespace", () => {
    expect(normalizeOrganizationDeletionConfirmation("  Tadz   Youth\nCouncil  "))
      .toBe("Tadz Youth Council");
  });

  it("requires the complete normalized organization name", () => {
    expect(organizationDeletionConfirmationMatches("Tadz Youth Council", "Tadz Youth Council")).toBe(true);
    expect(organizationDeletionConfirmationMatches(" Tadz   Youth Council ", "Tadz Youth Council")).toBe(true);
    expect(organizationDeletionConfirmationMatches("Tadz", "Tadz Youth Council")).toBe(false);
    expect(organizationDeletionConfirmationMatches("tadz youth council", "Tadz Youth Council")).toBe(false);
  });
});

describe("organization deletion service errors", () => {
  it("explains when the required Edge Function is not deployed", () => {
    expect(getOrganizationDeletionServiceError(404, null, "Fallback"))
      .toBe("The account deletion service is not deployed. Deploy the delete-organization-account server function, then retry.");
  });

  it("preserves safe server-provided errors", () => {
    expect(getOrganizationDeletionServiceError(
      403,
      { error: "You are not authorized to delete organization accounts." },
      "Fallback",
    )).toBe("You are not authorized to delete organization accounts.");
  });
});
