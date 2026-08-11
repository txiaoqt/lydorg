import { describe, expect, it } from "vitest";
import { getPolicySections } from "@/lib/policy-content";
import {
  bundledPolicy,
  hasPublishablePolicyContent,
  resolveDisplayPolicy,
} from "./ytrace-policy";

describe("Y-TRACE policy content", () => {
  it("ships the complete user-facing Terms and Privacy sections", () => {
    expect(bundledPolicy.version).toBe("1.0");
    expect(bundledPolicy.effectiveDate).toBe("June 30, 2026");
    expect(bundledPolicy.privacy_content).toContain("## 19. Contact and Complaints");
    expect(bundledPolicy.terms_content).toContain("## 23. Contact");
    expect(bundledPolicy.privacy_content).toContain("lydo@pasigcity.gov.ph");
    expect(bundledPolicy.terms_content).not.toContain("Pre-Publication Checklist");
    expect(bundledPolicy.terms_content).not.toContain("Draft 1.0");
    expect(bundledPolicy.privacy_content).not.toContain("To be set after approval");
    expect(getPolicySections(bundledPolicy.privacy_content)).toHaveLength(20);
    expect(getPolicySections(bundledPolicy.terms_content)).toHaveLength(24);
  });

  it("does not treat the old placeholder row as publishable legal text", () => {
    expect(hasPublishablePolicyContent(
      "Terms of service placeholder for the organization portal.",
      "Privacy policy placeholder for the organization portal.",
    )).toBe(false);

    expect(resolveDisplayPolicy({
      title: "Placeholder",
      version: "2026-06",
      terms_content: "Terms of service placeholder for the organization portal.",
      privacy_content: "Privacy policy placeholder for the organization portal.",
    })).toEqual(bundledPolicy);
  });
});
