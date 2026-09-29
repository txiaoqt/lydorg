import { describe, expect, it } from "vitest";
import { advocacyOptions, formatAdvocacyLabel } from "@/lib/lydo-connect-data";
import {
  CANONICAL_CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  OTHER_CATEGORY_COLOR,
  createCategoryColorResolver,
  getCategoryColor,
  isCanonicalPurposeCategory,
  isOtherCategory,
} from "./budget-category-colors";

describe("canonical budget purpose colors", () => {
  it("defines exactly one visually distinct color for every CYP category", () => {
    const mappedCategories = Object.keys(CANONICAL_CATEGORY_COLORS).sort();
    expect(mappedCategories).toEqual([...advocacyOptions].sort());

    const colors = advocacyOptions.map((category) => getCategoryColor(category));
    expect(new Set(colors).size).toBe(advocacyOptions.length);
  });

  it("keeps labels and colors tied to the canonical CYP definition", () => {
    advocacyOptions.forEach((category) => {
      const label = formatAdvocacyLabel(category);
      expect(isCanonicalPurposeCategory(label)).toBe(true);
      expect(getCategoryColor(label)).toBe(CANONICAL_CATEGORY_COLORS[category]);
    });
  });

  it("preserves the same colors across filtered, reordered, and paginated data", () => {
    const resolver = createCategoryColorResolver(advocacyOptions);
    for (const category of advocacyOptions) {
      const expected = getCategoryColor(category);
      expect(resolver(category)).toBe(expected);
      expect(createCategoryColorResolver([category])(category)).toBe(expected);
      expect(createCategoryColorResolver([...advocacyOptions].reverse())(category)).toBe(expected);
    }
  });

  it("normalizes case and whitespace without changing canonical assignments", () => {
    expect(getCategoryColor("  PEACE   BUILDING AND SECURITY ")).toBe(
      getCategoryColor("peace building and security"),
    );
    expect(getCategoryColor("Education")).toBe(getCategoryColor("education"));
  });

  it("does not invent purpose colors for arbitrary or legacy categories", () => {
    expect(isCanonicalPurposeCategory("Youth Leadership Initiative")).toBe(false);
    expect(getCategoryColor("Youth Leadership Initiative")).toBe(DEFAULT_CATEGORY_COLOR);
    expect(getCategoryColor("Arts & Culture")).toBe(DEFAULT_CATEGORY_COLOR);
    expect(getCategoryColor("General / Uncategorized")).toBe(DEFAULT_CATEGORY_COLOR);
  });

  it("keeps synthetic Other aggregates neutral", () => {
    expect(isOtherCategory("Other Categories")).toBe(true);
    expect(getCategoryColor("Other Categories")).toBe(OTHER_CATEGORY_COLOR);
    expect(getCategoryColor("Other Programs")).toBe(OTHER_CATEGORY_COLOR);
    expect(OTHER_CATEGORY_COLOR).toBe(DEFAULT_CATEGORY_COLOR);
  });
});
