import { describe, expect, it } from "vitest";
import {
  isInstalledUserPwaRoute,
  shouldUseInstalledUserPwa,
  type InstalledUserPwaDecision,
} from "./useInstalledUserPwa";

const eligible: InstalledUserPwaDecision = {
  enabled: true,
  adminSurface: false,
  userRoute: true,
  standalone: true,
  developmentPreview: false,
};

describe("shouldUseInstalledUserPwa", () => {
  it("enables the alternate UI for an eligible installed user route", () => {
    expect(shouldUseInstalledUserPwa(eligible)).toBe(true);
  });

  it.each([
    ["feature flag disabled", { enabled: false }],
    ["admin deployment", { adminSurface: true }],
    ["public or admin route", { userRoute: false }],
    ["ordinary browser", { standalone: false }],
  ])("keeps the existing website UI when %s", (_label, change) => {
    expect(shouldUseInstalledUserPwa({ ...eligible, ...change })).toBe(false);
  });

  it("keeps an installed PWA active above the former 768px boundary", () => {
    expect(shouldUseInstalledUserPwa(eligible)).toBe(true);
  });

  it("allows local development preview without standalone mode", () => {
    expect(
      shouldUseInstalledUserPwa({
        ...eligible,
        standalone: false,
        developmentPreview: true,
      }),
    ).toBe(true);
  });

  it("allows local development preview at any viewport width", () => {
    expect(shouldUseInstalledUserPwa({
      ...eligible,
      standalone: false,
      developmentPreview: true,
    })).toBe(true);
  });
});

describe("isInstalledUserPwaRoute", () => {
  it("treats the root path as a legacy installed-PWA launch route", () => {
    expect(isInstalledUserPwaRoute("/")).toBe(true);
  });

  it("does not treat ordinary public website pages as PWA routes", () => {
    expect(isInstalledUserPwaRoute("/about")).toBe(false);
  });
});
