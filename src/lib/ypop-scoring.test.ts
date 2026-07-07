import { describe, expect, it } from "vitest";
import { getApprovedYpopOrgActivityCount, type YPOPOrgActivity } from "./lydo-connect-data";

const activity = (id: string, status: YPOPOrgActivity["status"]): YPOPOrgActivity => ({
  id,
  ypopEntryId: "entry-1",
  organizationId: "org-1",
  submittedBy: "user-1",
  activityName: id,
  activityDate: "2026-07-01",
  venue: "Pasig",
  narrativeReport: "report.pdf",
  status,
  adminRemarks: "",
  submittedAt: "",
  approvedAt: "",
  revisionHistory: [],
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
});

describe("approved YPOP organization activity count", () => {
  it("uses the persisted fallback only when no PPA records exist", () => {
    expect(getApprovedYpopOrgActivityCount([], "entry-1", 2)).toBe(2);
  });

  it("derives the count from current PPA decisions when records exist", () => {
    expect(getApprovedYpopOrgActivityCount([
      activity("approved", "approved"),
      activity("rejected", "rejected"),
    ], "entry-1", 5)).toBe(1);
    expect(getApprovedYpopOrgActivityCount([
      activity("rejected", "rejected"),
    ], "entry-1", 5)).toBe(0);
  });
});
