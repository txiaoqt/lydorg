import { describe, expect, it } from "vitest";
import { parseAppVersion } from "./appVersion";

describe("parseAppVersion", () => {
  it("formats a generated UTC build timestamp", () => {
    expect(parseAppVersion("1.0.0+20260701011944")).toMatchObject({
      release: "1.0.0",
      buildTimestamp: "20260701011944",
      buildDateLabel: "Jul 1, 2026",
      commitSha: null,
      isLocalBuild: false,
    });
  });

  it("separates a commit SHA from the release and build date", () => {
    expect(parseAppVersion("1.0.0+20260701011944.a1b2c3d")).toMatchObject({
      release: "1.0.0",
      buildDateLabel: "Jul 1, 2026",
      commitSha: "a1b2c3d",
    });
  });

  it("recognizes local builds without exposing local as a date", () => {
    expect(parseAppVersion("1.0.0+local")).toMatchObject({
      release: "1.0.0",
      buildDateLabel: null,
      isLocalBuild: true,
    });
  });

  it("supports release-only versions without a Build row", () => {
    expect(parseAppVersion("1.0.0")).toMatchObject({
      release: "1.0.0",
      buildDateLabel: null,
      isLocalBuild: false,
    });
  });

  it.each([
    "1.0.0+not-a-timestamp",
    "1.0.0+20261301011944",
    "1.0.0+20260230011944",
  ])("handles malformed metadata safely: %s", (raw) => {
    const parsed = parseAppVersion(raw);
    expect(parsed.release).toBe("1.0.0");
    expect(parsed.buildDateLabel).toBeNull();
    expect(parsed.buildDateLabel).not.toBe("Invalid Date");
  });
});
