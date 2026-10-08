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
    expect(data.sections.find(s => s.title === "7. YPOP Participation")?.rows).toContainEqual(["Qualification", "Qualified"]);
    expect(data.sections.find(s => s.title.includes("Points Breakdown"))?.rows[0]).toEqual(["Mandatory", "1", "1", "4", "4", "4"]);
    const text = JSON.stringify(data);
    for (const name of ["1st Semester 2026", "Youth Summit", "10 Feb 2026", "Verified", "Community Garden", "10 Mar 2026", "Approved"]) expect(text).toContain(name);
    for (const name of ["Old Activity", "Private Other Org", "Unapproved"]) expect(text).not.toContain(name);
  });
  it("exports document metadata with actual review status and excludes URLs and drafts", () => {
    const text = JSON.stringify(report());
    for (const field of ["Constitution and By-Laws", "Constitution.pdf", "80 KB", "7 Jan 2026", "Needs Revision"]) expect(text).toContain(field);
    expect(text).not.toContain("storage://");
    expect(text).not.toContain("Draft.pdf");
  });
  it("uses safe unique organization filenames", () => {
    const data = buildOrganizationReport({ ...reportEntry, org: { ...reportEntry.org, organizationName: '../Youth: Ñ / Council?' } }, null, null, null, [], []);
    expect(data.filename).toBe("yorp-organization-report-youth-n-council-01-26-103.pdf");
  });
  it("supports an open period without participation, or no open period", () => {
    const empty = { ypopCityActivities: [], ypopEventParticipations: [], ypopOrgActivities: [] };
    const data = buildOrganizationReport(reportEntry, reportPeriod, null, buildRegistryYpopDetail(reportEntry.org, reportPeriod, null, empty, empty), [], []);
    expect(JSON.stringify(data)).toContain("No YPOP participation data is available");
    expect(data.sections.at(-1)?.rows).toEqual([]);
    expect(buildOrganizationReport(reportEntry, null, null, null, [], []).sections[6].rows).toContainEqual(["Period / Semester", "No open period"]);
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
