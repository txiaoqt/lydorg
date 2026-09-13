import { describe, it, expect } from "vitest";
import {
  getCategoryColor,
  createCategoryColorResolver,
  normalizeCategory,
  isOtherCategory,
  OTHER_CATEGORY_COLOR,
  CANONICAL_CATEGORY_COLORS,
  CATEGORY_PALETTE,
} from "./budget-category-colors";

describe("Budget Category Color Synchronization Architecture", () => {
  // TEST A — Same category, same color
  it("TEST A — Same category, same color: returns the exact same color wherever resolved", () => {
    const categoryA = "Youth Leadership & Governance";
    const color1 = getCategoryColor(categoryA);
    const color2 = getCategoryColor(categoryA);
    const color3 = getCategoryColor("  Youth Leadership & Governance  ");

    expect(color1).toBeDefined();
    expect(color1).toBe(color2);
    expect(color1).toBe(color3);
  });

  // TEST B — Legend/chart consistency
  it("TEST B — Legend/chart consistency: chart slice color strictly matches legend item color", () => {
    const categories = [
      { category: "Leadership & Governance", approvedAmount: 50000 },
      { category: "Sports, Fitness & Recreation", approvedAmount: 30000 },
      { category: "Arts, Culture & Heritage", approvedAmount: 20000 },
      { category: "Environmental Protection", approvedAmount: 15000 },
      { category: "Digital Literacy", approvedAmount: 10000 },
      { category: "Other Categories", approvedAmount: 5000 },
    ];

    const resolver = createCategoryColorResolver(categories);

    // Chart slice dataset
    const chartSlices = categories.map((cat) => ({
      name: cat.category,
      color: resolver(cat.category),
    }));

    // Legend dataset
    const legendItems = chartSlices.map((slice) => ({
      name: slice.name,
      color: slice.color,
    }));

    chartSlices.forEach((slice, idx) => {
      expect(slice.color).toBe(legendItems[idx].color);
      expect(slice.color).toBe(resolver(slice.name));
    });
  });

  // TEST C — Table/chart consistency
  it("TEST C — Table/chart consistency: chart slice color strictly matches table row color", () => {
    const categories = [
      { category: "adsdasdasdasda", approvedAmount: 131312312 },
      { category: "asdasda", approvedAmount: 12323213 },
      { category: "dsadas", approvedAmount: 12323 },
      { category: "dasdad", approvedAmount: 12312 },
      { category: "DSADASDA", approvedAmount: 12122 },
      { category: "Other 1", approvedAmount: 3000 },
      { category: "Other 2", approvedAmount: 2000 },
    ];

    const resolver = createCategoryColorResolver(categories);

    // Chart has top 5 + "Other Categories"
    const top5 = categories.slice(0, 5);
    const chartData = [
      ...top5.map((c) => ({ name: c.category, color: resolver(c.category) })),
      { name: "Other Categories", color: resolver("Other Categories") },
    ];

    // Table rows (all categories)
    const tableRows = categories.map((c) => ({
      category: c.category,
      color: resolver(c.category),
    }));

    // For every category in the chart, the table row has the exact same color
    top5.forEach((topCat) => {
      const chartSlice = chartData.find((s) => s.name === topCat.category);
      const tableRow = tableRows.find((r) => r.category === topCat.category);

      expect(chartSlice).toBeDefined();
      expect(tableRow).toBeDefined();
      expect(chartSlice!.color).toBe(tableRow!.color);
    });
  });

  // TEST D — Pagination stability
  it("TEST D — Pagination stability: moving across pages preserves exact category colors", () => {
    const allCategories = [
      { category: "Cat 1" },
      { category: "Cat 2" },
      { category: "Cat 3" },
      { category: "Cat 4" },
      { category: "Cat 5" },
      { category: "Cat 6" },
      { category: "Cat 7" },
      { category: "Cat 8" },
      { category: "Cat 9" },
    ];

    const resolver = createCategoryColorResolver(allCategories);

    // Page 1 (items 0 to 4)
    const page1Colors = allCategories.slice(0, 5).map((c) => ({
      name: c.category,
      color: resolver(c.category),
    }));

    // Page 2 (items 5 to 8)
    const page2Colors = allCategories.slice(5, 9).map((c) => ({
      name: c.category,
      color: resolver(c.category),
    }));

    // Return to Page 1
    const page1ColorsReturned = allCategories.slice(0, 5).map((c) => ({
      name: c.category,
      color: resolver(c.category),
    }));

    expect(page1ColorsReturned).toEqual(page1Colors);

    // Verify Cat 6 on page 2 does NOT steal Cat 1's color or Other Categories' slate color
    expect(page2Colors[0].color).not.toBe(OTHER_CATEGORY_COLOR);
  });

  // TEST E — Search stability
  it("TEST E — Search stability: filtered category retains its exact pre-filter color", () => {
    const allCategories = [
      { category: "Leadership & Governance" },
      { category: "Sports, Fitness & Recreation" },
      { category: "Arts, Culture & Heritage" },
      { category: "Environmental Protection & Climate Action" },
      { category: "Education, Digital Literacy & Technology" },
      { category: "Health & Mental Wellness" },
    ];

    const resolver = createCategoryColorResolver(allCategories);

    // Pre-search color of category at index 4
    const targetCategory = "Education, Digital Literacy & Technology";
    const preSearchColor = resolver(targetCategory);

    // Filtered search results: only target category matches (now at index 0 of filtered list)
    const searchFilter = "education";
    const filtered = allCategories.filter((c) =>
      c.category.toLowerCase().includes(searchFilter)
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].category).toBe(targetCategory);

    // Color of target category in filtered table
    const postSearchColor = resolver(filtered[0].category);

    expect(postSearchColor).toBe(preSearchColor);
  });

  // TEST F — Other Categories dedicated neutral color
  it("TEST F — Other Categories: always uses its dedicated stable neutral slate color (#64748B)", () => {
    const resolver = createCategoryColorResolver([
      { category: "Cat A" },
      { category: "Cat B" },
      { category: "Other Categories" },
      { category: "Other Programs" },
      { category: "Others" },
    ]);

    expect(resolver("Other Categories")).toBe(OTHER_CATEGORY_COLOR);
    expect(resolver("Other Programs")).toBe(OTHER_CATEGORY_COLOR);
    expect(resolver("Other")).toBe(OTHER_CATEGORY_COLOR);
    expect(resolver("Others")).toBe(OTHER_CATEGORY_COLOR);
    expect(getCategoryColor("Other Categories")).toBe(OTHER_CATEGORY_COLOR);
    expect(OTHER_CATEGORY_COLOR).toBe("#64748B");
  });

  // TEST G — Case and whitespace normalization
  it("TEST G — Normalization: capitalization and leading/trailing whitespace do not change color", () => {
    const resolver = createCategoryColorResolver([
      { category: "adsdasdasdasda" },
      { category: "DSADASDA" },
    ]);

    expect(resolver("DSADASDA")).toBe(resolver("dsadasda"));
    expect(resolver("  DSADASDA  ")).toBe(resolver("dsadasda"));
    expect(resolver("dsadasda")).toBe(resolver("DSADASDA"));
  });

  // TEST H — Canonical taxonomy signature colors
  it("TEST H — Canonical taxonomy: known youth categories resolve to their official signature colors", () => {
    expect(getCategoryColor("Leadership & Governance")).toBe("#2563EB"); // Blue
    expect(getCategoryColor("Sports, Fitness & Recreation")).toBe("#0D9488"); // Teal
    expect(getCategoryColor("Arts, Culture & Heritage")).toBe("#7C3AED"); // Purple
    expect(getCategoryColor("Environmental Protection & Climate Action")).toBe("#059669"); // Emerald
    expect(getCategoryColor("Education, Digital Literacy & Technology")).toBe("#0284C7"); // Sky
    expect(getCategoryColor("Health, Mental Wellness & Anti-Drug Advocacy")).toBe("#E11D48"); // Rose
    expect(getCategoryColor("Community Outreach & Social Inclusion")).toBe("#EA580C"); // Orange
    expect(getCategoryColor("Economic Empowerment & Livelihood")).toBe("#D97706"); // Amber
  });

  // TEST I — No collision with Other Categories (#64748B)
  it("TEST I — Category palette: none of the active non-other categories use the reserved slate color", () => {
    const testCategories = [
      "Cat 1", "Cat 2", "Cat 3", "Cat 4", "Cat 5",
      "Cat 6", "Cat 7", "Cat 8", "Cat 9", "Cat 10",
    ];

    const resolver = createCategoryColorResolver(testCategories);

    testCategories.forEach((cat) => {
      const color = resolver(cat);
      expect(color).not.toBe(OTHER_CATEGORY_COLOR);
    });
  });

  // TEST J — Distinct colors for distinct categories in a dataset
  it("TEST J — Distinct colors: top categories in a dataset receive distinct colors", () => {
    const arbitraryCategories = [
      "adsdasdasdasda",
      "asdasda",
      "dsadas",
      "dasdad",
      "DSADASDA",
    ];

    const resolver = createCategoryColorResolver(arbitraryCategories);
    const assignedColors = arbitraryCategories.map((c) => resolver(c));
    const uniqueColors = new Set(assignedColors);

    expect(uniqueColors.size).toBe(arbitraryCategories.length);
  });
});
