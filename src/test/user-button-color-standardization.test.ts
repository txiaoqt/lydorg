import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { Button } from "../components/ui/button";

describe("User-Side Button Blue Standardization to #0E2F66", () => {
  const indexCss = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf8");

  it("1. Defines the standardized User-side button blue token #0E2F66 in body.public-shell", () => {
    // #0E2F66 corresponds to HSL(217.5, 75.86%, 22.75%)
    expect(indexCss).toContain("--user-btn-primary: 217.5 75.86% 22.75%;");
    expect(indexCss).toContain("--user-btn-primary-hover: 217.61 77.01% 17.06%;");
    expect(indexCss).toContain("--user-btn-primary-active: 217.02 77.05% 11.96%;");
  });

  it("2. Scopes --primary to #0E2F66 strictly on User-side buttons without modifying global/admin --primary", () => {
    // Verify selector is strictly scoped to body.public-shell:not(.dark):not(.admin-shell):not(.ytrace-pwa-active)
    expect(indexCss).toContain("body.public-shell:not(.dark):not(.admin-shell):not(.ytrace-pwa-active) button");
    expect(indexCss).toContain("body.public-shell:not(.dark):not(.admin-shell):not(.ytrace-pwa-active) [role=\"button\"]");
    expect(indexCss).toContain("body.public-shell:not(.dark):not(.admin-shell):not(.ytrace-pwa-active) a.inline-flex[class*=\"bg-primary\"]");
    expect(indexCss).toContain("body.public-shell:not(.dark):not(.admin-shell):not(.ytrace-pwa-active) a.inline-flex[class*=\"border-primary\"]");
    expect(indexCss).toContain("body.public-shell:not(.dark):not(.admin-shell):not(.ytrace-pwa-active) a.inline-flex[class*=\"text-primary\"]");
  });

  it("3. Admin shell preserves its original #2460A7 (--brand-mid-blue) palette", () => {
    // Admin uses :root or .admin-shell tokens which keep var(--brand-mid-blue)
    expect(indexCss).toContain("--brand-mid-blue: 212.52 64.53% 39.8%;");
    expect(indexCss).toContain("--admin-link: 212.52 64.53% 39.8%;");
    // :root defines --primary: var(--brand-mid-blue)
    expect(indexCss).toMatch(/:root\s*\{[^}]*--primary:\s*var\(--brand-mid-blue\);/s);
  });

  it("4. Explicit button background-color overrides resolve to exact #0E2F66 and hover to #0A234D", () => {
    expect(indexCss).toContain("background-color: #0E2F66;");
    expect(indexCss).toContain("background-color: #0A234D;");
    expect(indexCss).toContain("background-color: #071936;");
  });

  it("5. PWA is strictly protected with :not(.ytrace-pwa-active)", () => {
    expect(indexCss).toContain(":not(.ytrace-pwa-active)");
  });

  it("6. Non-button elements under body.public-shell retain their standard tokens", () => {
    // body.public-shell still maintains --primary: var(--brand-mid-blue) for cards, badges, icons, and non-button UI
    expect(indexCss).toMatch(/body\.public-shell\s*\{[^}]*--primary:\s*var\(--brand-mid-blue\);/s);
  });

  it("7. Confirms exact math: HSL(217.5, 75.86%, 22.75%) is mathematically #0E2F66", () => {
    function hslToHex(h: number, s: number, l: number) {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, "0");
      };
      return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    }

    expect(hslToHex(217.5, 75.86, 22.75)).toBe("#0E2F66");
    expect(hslToHex(217.61, 77.01, 17.06)).toBe("#0A234D");
    expect(hslToHex(217.02, 77.05, 11.96)).toBe("#071936");
  });

  it("8. Renders shared Button component with standard primary and outline variants", () => {
    const { getByRole, rerender } = render(React.createElement(Button, null, "Primary Button"));
    const btn = getByRole("button");
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("text-primary-foreground");

    rerender(React.createElement(Button, { variant: "outline" }, "Outline Button"));
    expect(btn.className).toContain("border-primary/55");
    expect(btn.className).toContain("text-primary");

    rerender(React.createElement(Button, { variant: "hero" }, "Hero Button"));
    expect(btn.className).toContain("bg-primary");

    rerender(React.createElement(Button, { variant: "heroOutline" }, "Hero Outline"));
    expect(btn.className).toContain("border-primary/45");
  });
});
