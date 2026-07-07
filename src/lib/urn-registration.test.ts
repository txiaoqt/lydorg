import { describe, expect, it } from "vitest";
import { normalizeUrn, validateUrn } from "./urn-registration";

describe("URN registration", () => {
  it("normalizes case and accidental spacing without removing separators", () => {
    expect(normalizeUrn("  pcydo-2025-00123  ")).toBe("PCYDO-2025-00123");
    expect(normalizeUrn("pcYdo  2025 / 12")).toBe("PCYDO 2025 / 12");
  });

  it("rejects empty, control-character, HTML-like, and unreasonable values", () => {
    expect(validateUrn("  ")).toMatch(/Enter your/);
    expect(validateUrn("A\n123")).not.toBeNull();
    expect(validateUrn("<b>1234</b>")).not.toBeNull();
    expect(validateUrn("abc")).not.toBeNull();
  });

  it("accepts a plausible claim without asserting official validity", () => {
    expect(validateUrn("PCYDO-2025-00123")).toBeNull();
  });
});

