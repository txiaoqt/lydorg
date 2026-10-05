import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PWA UI Form Control Consistency", () => {
  const cssPath = path.resolve(process.cwd(), "src/user/pwa/styles/pwa-app.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("contains standardized PWA blue focus ring treatment for all inputs, textareas, selects, and comboboxes", () => {
    expect(cssContent).toContain("border-color: var(--pwa-blue, #2460a7) !important;");
    expect(cssContent).toContain("box-shadow: 0 0 0 3px color-mix(in srgb, var(--pwa-blue, #2460a7) 30%, transparent) !important;");
    expect(cssContent).toContain("outline: none !important;");
  });

  it("applies standardized input styling for native, profile, template, directory, and auth form controls", () => {
    expect(cssContent).toContain("border: 1px solid #cbd8e8;");
    expect(cssContent).toContain("border-radius: 0.7rem;");
    expect(cssContent).toContain("background-color: #ffffff;");
    expect(cssContent).toContain("color: #64748b !important;");
  });

  it("prevents focus outline clipping on profile editor sections", () => {
    expect(cssContent).toContain("overflow: visible;");
  });

  it("enforces mobile-first PWA typography scale (22 / 17 / 15 / 14 / 12) with 16px form controls", () => {
    // 22px — page titles
    expect(cssContent).toContain("--pwa-type-title: 1.375rem;");
    // 17px — section headings
    expect(cssContent).toContain("--pwa-type-section: 1.0625rem;");
    // 15px — body text
    expect(cssContent).toContain("--pwa-type-body: .9375rem;");
    // 16px — inputs/selects/textareas
    expect(cssContent).toContain("--pwa-type-input: 1rem;");
    // 14px — buttons, labels, nav items
    expect(cssContent).toContain("--pwa-type-label: .875rem;");
    // 12px / 13px — helper text, timestamps, metadata
    expect(cssContent).toContain("--pwa-type-meta: .75rem;");
    expect(cssContent).toContain("--pwa-type-meta-md: .8125rem;");

    // Standardized inputs, textareas, and selects maintain 16px to prevent mobile viewport auto-zoom
    expect(cssContent).toContain("font-size: var(--pwa-type-input);");
  });
});
