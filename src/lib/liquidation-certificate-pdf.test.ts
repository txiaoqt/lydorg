import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLiquidationCertificatePdf } from "./liquidation-certificate-pdf";
import { buildLiquidationCertificate } from "./liquidation-certificate";
import { certificateInput } from "@/test/fixtures/liquidation-certificate";

const certificate = () => {
  const result = buildLiquidationCertificate(certificateInput());
  if (!result.available) throw Error("Expected synthetic certificate");
  return result.certificate;
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (!["/fonts/segoeui.ttf", "/fonts/segoeuib.ttf"].includes(url)) throw Error("Unexpected fixture request");
    return new Response(new Uint8Array(readFileSync(`public${url}`)), { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("actual certificate PDF rendering", () => {
  it("creates a single A4 PDF with the letterhead, Unicode fonts and recorded completion date", async () => {
    const pdf = await generateLiquidationCertificatePdf(certificate());
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);
    expect(pdf.getFontList()).toHaveProperty("SegoeUI");
    expect(pdf.getCreationDate("jsDate")).toEqual(new Date("2026-10-17T17:30:00Z"));
    const bytes = new Uint8Array(pdf.output("arraybuffer"));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(100_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fits long genuine names on one page and rejects overflowing data instead of truncating it", async () => {
    const data = certificate();
    const pdf = await generateLiquidationCertificatePdf({
      ...data, organizationName: "Example Federation of Youth Organizations for Leadership and Community Development in Pasig City",
      activityTitle: "Community Leadership, Environmental Stewardship and Youth Participation Workshop for Organization Representatives",
      budgetReference: "00000000-0000-4000-8000-000000000001",
    });
    expect(pdf.getNumberOfPages()).toBe(1);
    await expect(generateLiquidationCertificatePdf({ ...data, activityTitle: "Very long activity name ".repeat(200) }))
      .rejects.toThrow("CERTIFICATE_TEXT_EXCEEDS_PAGE");
  });

  it("fails safely if the required printable Unicode fonts cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    await expect(generateLiquidationCertificatePdf(certificate())).rejects.toThrow("CERTIFICATE_FONT_UNAVAILABLE");
  });
});
