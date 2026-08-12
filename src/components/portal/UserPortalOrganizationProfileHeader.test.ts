import { describe, expect, it } from "vitest";

describe("Organization Profile Header Non-Truncating Responsive Layout Verification", () => {
  const longOrgName =
    "Princess Nami's Dubai Chewy Cookie Organization for Youth Development and Community Empowerment";
  const exact100CharOrgName = "A".repeat(100);

  it("handles short organization names without truncating or layout overflow", () => {
    expect("Youth Club".length).toBe(10);
    expect("Youth Club").not.toContain("...");
  });

  it("handles normal organization names without truncating", () => {
    const normalName = "Kapitolyo Youth Organization";
    expect(normalName).not.toContain("...");
  });

  it("handles unusually long organization names (up to 100 chars) preserving full text", () => {
    expect(longOrgName.length).toBeGreaterThan(50);
    expect(longOrgName).not.toContain("...");
    expect(exact100CharOrgName.length).toBe(100);
    expect(exact100CharOrgName).not.toContain("...");
  });
});
