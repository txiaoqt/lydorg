import { describe, expect, it, vi } from "vitest";
import { buildOrganizationReport, generateOrganizationReportPdf } from "./yorp-organization-report";
import { buildRegistryYpopDetail } from "./yorp-registry-detail";
import { reportEntry, reportPeriod, reportYpopEntry, reportDetail, reportFiles } from "./yorp-organization-report.fixtures";
const report = () => buildOrganizationReport(reportEntry, reportPeriod, reportYpopEntry,
  buildRegistryYpopDetail(reportEntry.org, reportPeriod, reportYpopEntry, reportDetail, reportDetail), reportFiles, []);

describe("organization dossier", () => {
  it("includes all overview fields and canonical person names", () => {
    const text = JSON.stringify(report());
    for (const expected of ["Pasig Youth Council", "01-26-103", "Active", "6 Jan 2026", "6 Jan 2029", "Youth Organization",
      "Community-Based", "Education", "City/Municipal", "Maria Santos", "Juan Cruz", "District I", "Palatiw", "primary@example.org",
      "second@example.org", "third@example.org", "09123456789", "09987654321", "facebook.com/pasigyouth"])
      expect(text).toContain(expected);
    expect(text).not.toContain("Legacy head");
    expect(text).not.toContain("countdown");
  });
  it("uses the same open-period summary, breakdown, participation and approved projects as the drawer", () => {
    const data = report();
    expect(data.ypop.hasParticipation).toBe(true);
    if (!data.ypop.hasParticipation) return;
    expect(data.ypop.qualificationStatus).toBe("Qualified");
    expect(data.ypop.threshold).toBe("70%");
    expect(data.ypop.cityLedBreakdown).toEqual([
      { category: "Mandatory", verified: 1, pointsPerParticipation: 4, pointsEarned: 4 },
      { category: "Invitational", verified: 0, pointsPerParticipation: 3, pointsEarned: 0 },
      { category: "Partnership", verified: 0, pointsPerParticipation: 2, pointsEarned: 0 },
    ]);
    const text = JSON.stringify(data);
    for (const name of ["1st Semester 2026", "Youth Summit", "10 Feb 2026", "Verified", "Community Garden", "10 Mar 2026", "Approved"]) expect(text).toContain(name);
    for (const name of ["Old Activity", "Private Other Org", "Unapproved"]) expect(text).not.toContain(name);
  });
  it("lists every official YORP requirement with its actual review status and excludes URLs and drafts", () => {
    const data = report();
    expect(data.requirements.map(row => row.requirement)).toEqual([
      "Pasig City YORP Registration Form (Form A)", "NYC YORP Registration Form (Form B)", "Endorsement Letter",
      "List of Officers and Advisers", "List of Members in Good Standing", "Constitution and By-Laws",
    ]);
    expect(data.requirements.at(-1)).toEqual({ requirement: "Constitution and By-Laws", submissionDate: "7 Jan 2026", reviewStatus: "Needs Revision", approvedDate: "—" });
    expect(data.requirements[0]).toMatchObject({ reviewStatus: "Not submitted", submissionDate: "—" });
    const text = JSON.stringify(data);
    expect(text).not.toContain("storage://");
    expect(text).not.toContain("Draft.pdf");
  });
  it("shows the review date as the approved date for approved requirements", () => {
    const approved = { ...reportFiles[0], id: "form-a", documentTypeId: "form-a", documentTypeName: "Pasig City YORP Registration Form (Form A)",
      adminStatus: "approved_green", uploadedAt: "2026-01-05", reviewedAt: "2026-01-09" } as typeof reportFiles[number];
    const data = buildOrganizationReport(reportEntry, null, null, null, [approved], []);
    expect(data.requirements[0]).toEqual({ requirement: "Pasig City YORP Registration Form (Form A)", submissionDate: "5 Jan 2026", reviewStatus: "Approved", approvedDate: "9 Jan 2026" });
  });
  it("uses safe unique organization filenames", () => {
    const data = buildOrganizationReport({ ...reportEntry, org: { ...reportEntry.org, organizationName: '../Youth: Ñ / Council?' } }, null, null, null, [], []);
    expect(data.filename).toBe("YORP_Organization_Report_Youth_N_Council_01-26-103.pdf");
  });
  it("supports an open period without participation, or no open period", () => {
    const empty = { ypopCityActivities: [], ypopEventParticipations: [], ypopOrgActivities: [] };
    const data = buildOrganizationReport(reportEntry, reportPeriod, null, buildRegistryYpopDetail(reportEntry.org, reportPeriod, null, empty, empty), [], []);
    expect(data.ypop).toEqual({ hasParticipation: false, semester: "1st Semester 2026", summary: "No YPOP participation data is available for this semester." });
    expect(data.requirements.every(row => row.reviewStatus === "Not submitted")).toBe(true);
    expect(buildOrganizationReport(reportEntry, null, null, null, [], []).ypop).toMatchObject({ hasParticipation: false, semester: "No open period" });
  });
  it("generates a valid multipage official PDF for empty data without document/network access", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No network"));
    try {
      const data = buildOrganizationReport(reportEntry, null, null, null, [], []);
      const pdf = await generateOrganizationReportPdf(data);
      expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
      expect(pdf.output()).toContain("%PDF-");
      // Only bundled public font assets are requested, never document storage/signing endpoints.
      expect(network.mock.calls.every(([url]) => String(url).startsWith("/fonts/"))).toBe(true);
    } finally { network.mockRestore(); }
  });
});
