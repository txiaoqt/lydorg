import { describe, expect, it, vi } from "vitest";
import { loadYpopParticipationReport } from "./ypop-participation-report-data";

const api = vi.hoisted(() => ({
  fetchAdminYpopEntryReviewDetail: vi.fn(),
}));

vi.mock("./admin-auth", () => ({
  readAdminSession: () => ({ sessionToken: "token", expiresAt: new Date(Date.now() + 60_000).toISOString() }),
}));

vi.mock("./lydo-connect-supabase", () => ({
  fetchAdminYpopValidationPeriods: async () => [{ period: { id: "p1", semesterKey: "S2" } }],
  fetchAdminYpopPeriodSubmissionPage: async () => ({
    page: 0,
    pageSize: 50,
    totalCount: 3,
    rows: ["a", "b", "c"].map((id) => ({ id: `entry-${id}`, organizationId: id, organizationName: id, referenceId: id, majorClassification: "Youth Organization", status: "qualified" })),
  }),
  fetchAdminYpopEntryReviewDetail: api.fetchAdminYpopEntryReviewDetail.mockImplementation(async (entryId: string) => {
    const organizationId = entryId.replace("entry-", "");
    return {
      organizationProfiles: [{ id: organizationId }],
      ypopEntries: [{ id: entryId, organizationId, semester: "S2" }],
      ypopCityActivities: [],
      ypopEventParticipations: [],
      ypopOrgActivities: [],
    };
  }),
  fetchAdminYorpRegistryYpopDetail: vi.fn(),
  fetchAdminRegistrationDetail: vi.fn(),
}));

const filters = { classification: "all", status: "all", search: "" } as never;

describe("YPOP report export selection", () => {
  it("exports only the selected organizations", async () => {
    const data = await loadYpopParticipationReport("p1", filters, new Set(["a", "c"]));
    expect(data.sources.map((source) => source.organization.id)).toEqual(["a", "c"]);
  });

  it("exports every organization when nothing is selected", async () => {
    const data = await loadYpopParticipationReport("p1", filters, new Set());
    expect(data.sources.map((source) => source.organization.id)).toEqual(["a", "b", "c"]);
  });
});
